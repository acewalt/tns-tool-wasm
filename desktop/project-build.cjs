// Declarative SDK build profiles. Project archives never supply shell commands.
const fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm');
function relative(value,allowRoot=false){if(allowRoot&&value==='.')return value;if(typeof value!=='string'||!value||value.length>240||value.includes('\\')||value.startsWith('/')||value.includes(':')||value.split('/').some(p=>!p||p==='.'||p==='..'||/[ .]$/.test(p)||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))||/[\0\r\n]/.test(value))throw Error('Invalid project path: '+value);return value;}
function validate(profile){
 if(!profile||profile.version!==1||!Array.isArray(profile.sources)||!profile.sources.length||profile.sources.length>1200)throw Error('Invalid SDK build profile');
 const sources=[...new Set(profile.sources.map(p=>relative(p)))];if(sources.some(p=>! /\.(?:c|cpp|cc|cxx|S|s)$/.test(p)))throw Error('Unsupported source extension in SDK build profile');
 const includes=(profile.includeDirectories||['.']).map(p=>relative(p,true));if(includes.length>40)throw Error('Too many include directories');
 const defines=profile.defines||[];if(!Array.isArray(defines)||defines.length>80||defines.some(d=>typeof d!=='string'||! /^[A-Za-z_]\w*(?:=[A-Za-z0-9_+.-]+)?$/.test(d)))throw Error('Invalid SDK preprocessor definitions');
 const optimization=profile.optimization||'O2';if(!['O0','O1','O2','O3','Os'].includes(optimization))throw Error('Invalid SDK optimization');
 return{sources,includes,defines,optimization,fastMath:profile.fastMath===true,common:profile.common===true,gnuInline:profile.gnuInline===true};
}
async function readArchive(zip){
 const context={module:{exports:{}},exports:{},Buffer,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,setImmediate,setTimeout};
 const code=await fs.readFile(path.join(process.resourcesPath||__dirname,'vendor/jszip/jszip.min.js'),'utf8').catch(()=>fs.readFile(path.join(__dirname,'vendor/jszip/jszip.min.js'),'utf8'));vm.runInNewContext(code,context);
 const archive=await context.module.exports.loadAsync(zip);return archive;
}
async function profileFromArchive(zip,exe){
 const runtime=path.join(path.dirname(exe),'runtime'),archive=await readArchive(zip),meta=archive.file('.tnsproject.json');
 if(!meta)return null;const manifest=JSON.parse(await meta.async('string'));
 if(!manifest.settings?.build)return null;return{archive,profile:validate(manifest.settings.build),runtime};
}
async function buildProfile(info,folder,name,run){
 const {archive,profile,runtime}=info;let total=0,count=0;
 const seen=new Set();for(const [name,item] of Object.entries(archive.files)){
  if(item.dir)continue;relative(name);if(item.unsafeOriginalName&&item.unsafeOriginalName!==name)throw Error('Unsafe ZIP entry');if(seen.has(name.toLowerCase()))throw Error('Case-colliding project paths');seen.add(name.toLowerCase());
  if(++count>16000)throw Error('Too many project files');if(item._data?.uncompressedSize>32*1024*1024)throw Error('Project file exceeds 32 MiB');
  const bytes=await item.async('uint8array');if(bytes.length>32*1024*1024)throw Error('Project file exceeds 32 MiB');total+=bytes.length;if(total>160*1024*1024)throw Error('Expanded project exceeds 160 MiB');
  const dest=path.join(folder,...name.split('/'));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);
 }
 const tool=path.join(runtime,'toolchain/bin'),nd=path.join(runtime,'ndless'),objects=path.join(folder,'__tns_objects');await fs.mkdir(objects);
 // Preserve each translation unit's layout. Splitting every datum/function into
 // separate sections breaks ports with offset-based references into asset data.
 const includes=profile.includes.flatMap(p=>['-I',path.resolve(folder,p)]),defines=profile.defines.map(d=>'-D'+d),options=['-mcpu=arm926ej-s','-marm','-D_TINSPIRE','-'+profile.optimization,'-fno-strict-aliasing','-fwrapv','-I',path.join(nd,'include'),'-I',path.join(nd,'include/freetype2'),...includes,...defines];
 if(profile.fastMath)options.push('-ffast-math');if(profile.common)options.push('-fcommon');if(profile.gnuInline)options.push('-fgnu89-inline');
 const outputs=profile.sources.map((_,i)=>path.join(objects,i+'.o')),logs=[];let next=0,failure=null;
 await Promise.all(Array.from({length:4},async()=>{while(!failure&&next<profile.sources.length){const i=next++,src=path.join(folder,...profile.sources[i].split('/'));try{await fs.access(src);const cpp=/\.(?:cpp|cc|cxx)$/.test(src);const result=await run(path.join(tool,cpp?'arm-none-eabi-g++.exe':'arm-none-eabi-gcc.exe'),[...options,...(cpp?[]:['-Wno-error=implicit-function-declaration','-Wno-error=int-conversion','-Wno-error=incompatible-pointer-types']),'-c',src,'-o',outputs[i]],180000,{cwd:folder});if(result.stderr)logs.push(result.stderr.slice(-3000));}catch(error){failure=error;}}}));if(failure)throw failure;
 // A response file avoids Windows' command-line limit for large projects.
 const quote=p=>'"'+p.replace(/\\/g,'/')+'"',elf=path.join(folder,name+'.elf'),response=path.join(folder,'link.rsp');
 const args=['-mcpu=arm926ej-s','-marm','-nostdlib','-static','-Wl,--pic-veneer','-Wl,--emit-relocs','-Wl,--gc-sections','-Wl,-T,'+path.join(nd,'system/ldscript'),path.join(nd,'system/crt0.o'),path.join(nd,'system/crti.o'),...outputs,'-L'+path.join(nd,'lib'),'-Wl,--start-group','-lfreetype','-lz','-lSDL_gfx','-lSDL_image','-lSDL','-lnspireio','-lstdc++','-lndls','-lsyscalls','-lm','-lc','-Wl,--end-group','-lgcc',path.join(nd,'system/crtn.o'),'-o',elf];
 await fs.writeFile(response,args.map(quote).join('\n'));await run(path.join(tool,'arm-none-eabi-gcc.exe'),['@'+response],180000,{cwd:folder});
 const output=path.join(folder,name+'.tns');await run(path.join(runtime,'bin/genzehn.exe'),['--input',elf,'--output',output,'--name',name,'--uses-lcd-blit','1','--240x320-support','1','--color-support','1','--32MB-support','0','--compress'],120000,{cwd:folder});
 return{bytes:await fs.readFile(output),logs:['SDK profile: '+profile.sources.length+' translation units',...logs.slice(-12)]};
}
module.exports={validate,relative,profileFromArchive,buildProfile};
