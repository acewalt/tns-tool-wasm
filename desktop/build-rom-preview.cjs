// Reproducible source-only WebAssembly preview build. Never accepts a ROM.
const fs=require('node:fs/promises'),path=require('node:path'),cp=require('node:child_process'),{promisify}=require('node:util');
const run=promisify(cp.execFile);
async function build(options={}){
 const system=options.system||'snes';if(!['snes','gba','nds','n64'].includes(system))throw Error('Unknown preview build');
 const sdk=path.resolve(options.sdk||process.env.TNS_EMSDK||''),python=options.python||process.env.PYTHON||'python';
 if(!options.sdk&&!process.env.TNS_EMSDK)throw Error('TNS_EMSDK must name the Emscripten 3.1.74 directory');
 const work=path.resolve(options.work||path.join(__dirname,'vendor/rom/build-'+system));await fs.mkdir(work,{recursive:true});
 const JSZip=await require('./prepare-rom.cjs').zipLibrary(),zip=await JSZip.loadAsync(await fs.readFile(path.join(__dirname,'vendor/rom/'+system+'-template.zip')));
 const profile=JSON.parse(await zip.file('.tnsproject.json').async('string')).settings.build;
 for(const [name,file]of Object.entries(zip.files))if(!file.dir){require('./project-build.cjs').relative(name);const dest=path.join(work,name);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,await file.async('nodebuffer'));}
 await fs.copyFile(path.join(__dirname,'rom/preview-os.h'),path.join(work,'preview-os.h'));
 await fs.writeFile(path.join(work,'os.h'),'#include "preview-os.h"\n');
 await fs.writeFile(path.join(work,'embedded_rom.h'),'extern unsigned TNS_ROM_SIZE;\nextern const unsigned char *tns_rom_data;\n#define TNS_SAVE_FILENAME "save.sav"\n#define TNS_ROM_FILENAME "embedded.z64"\n');
 if(system==='n64')await require('./build-rom-preview-n64.cjs').adapt(work,profile);
 const flags=['-O3','-fno-strict-aliasing','-fwrapv','-Wno-register','-DTNS_ROM_PREVIEW',...(['nds','n64'].includes(system)?['-fexceptions']:[]),...(profile.unsignedChar?['-funsigned-char']:[]),...profile.defines.filter(d=>d!=='ARM_ARCH').map(d=>'-D'+d),...profile.includeDirectories.flatMap(p=>['-I',p]),'-sUSE_ZLIB=1'];
 const env={...process.env,EM_CONFIG:path.join(sdk,'.emscripten'),EMSDK_PYTHON:python},outputs=[];
 // Compile separately so C keeps its language, linkage and implicit conversions.
 let next=0,failure=null;
 await Promise.all(Array.from({length:4},async()=>{while(!failure&&next<profile.sources.length){const i=next++;
  const source=profile.sources[i],cpp=/\.(?:cc|cpp)$/.test(source),out=path.join(work,'preview-'+i+'.o');
  try{const result=await run(python,[path.join(sdk,'upstream/emscripten',cpp?'em++.py':'emcc.py'),...flags,...(cpp?['-std='+(profile.cppStandard||'gnu++14')]:['-Wno-error=implicit-function-declaration']),'-c',source,'-o',out],{cwd:work,env,windowsHide:true,maxBuffer:2*1024*1024});
  outputs[i]=out;if(options.verbose&&result.stderr)process.stderr.write(result.stderr);}catch(error){failure=error;}
 }}));if(failure)throw failure;
 const output=path.resolve(options.output||path.join(__dirname,'vendor/rom/'+system+'-preview.js'));
 const exports=['_tns_load','_tns_step','_tns_pixels','_tns_save','_tns_save_size','_malloc','_free',...(system==='nds'?['_tns_touch','_tns_restore_save']:system==='n64'?['_tns_restore_save']:[])];
 await run(python,[path.join(sdk,'upstream/emscripten/em++.py'),...outputs,'-O3','-sUSE_ZLIB=1','-sMODULARIZE=1','-sEXPORT_NAME=TnsRomCore','-sENVIRONMENT=worker,node','-sALLOW_MEMORY_GROWTH=1','-sINITIAL_MEMORY=67108864','-sMAXIMUM_MEMORY=268435456','-sEXPORTED_FUNCTIONS='+JSON.stringify(exports),'-sEXPORTED_RUNTIME_METHODS=["FS"]','-sNO_EXIT_RUNTIME=1',...(system==='nds'?['-fexceptions','-sDISABLE_EXCEPTION_CATCHING=0']:[]),'-o',output],{cwd:work,env,windowsHide:true,maxBuffer:2*1024*1024});
 return{system,output,sources:outputs.length};
}
module.exports={build};
if(require.main===module)build({system:process.argv[2]}).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.stderr||e.stack);process.exitCode=1;});
