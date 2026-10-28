// Build a source-only conversion template from a pinned public port. No ROM input.
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),crypto=require('node:crypto'),cp=require('node:child_process');
const profile=require('./rom/sm64-eu-profile.json'),metadata=require('./rom/sm64-eu-project.json');
const {relative}=require('./project-build.cjs'),{convert}=require('./rom-text.cjs');
const sourceSha='28f90b6acd94a81ea087d522f0d435ff1d60989c9806cde409f7d38d832d3296';
async function zipLibrary(){const context={module:{exports:{}},exports:{},Buffer,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,setImmediate,setTimeout};vm.runInNewContext(await fs.readFile(path.join(__dirname,'vendor/jszip/jszip.min.js'),'utf8'),context);return context.module.exports;}
async function prepare(options={}){
 const JSZip=await zipLibrary();let source;
 if(options.sourceZip)source=await fs.readFile(options.sourceZip);
 else{const response=await fetch(profile.source.repository.replace('https://github.com/','https://codeload.github.com/')+'/zip/'+profile.source.commit);if(!response.ok)throw Error('Port source download failed: '+response.status);source=Buffer.from(await response.arrayBuffer());}
 if(crypto.createHash('sha256').update(source).digest('hex')!==sourceSha)throw Error('SM64 source SHA256 mismatch');
 const archive=await JSZip.loadAsync(source),prefix='sm64-nsp-'+profile.source.commit+'/';
 async function read(name){relative(name);const file=archive.file(prefix+name);if(!file)throw Error('Missing public source '+name);return file.async('nodebuffer');}
 const work=await fs.mkdtemp(path.join(os.tmpdir(),'tns-rom-template-')),output=new JSZip();
 const write=async(name,bytes)=>{relative(name);const dest=path.join(work,...name.split('/'));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);};
 try{
  for(const name of profile.sourceFiles){let bytes=await read(name);if(name==='src/pc/gfx/gfx_nsp.c')bytes=Buffer.from(bytes.toString('utf8').replace('nio_console *console;','nio_console console_storage;\n    nio_console *console = &console_storage;'));output.file(name,bytes);await write(name,bytes);}
  const extras=['tools/mario_anims_converter.py','levels/level_headers.h.in','text/define_text.inc.c','text/define_courses.inc.c'];
  for(const name of Object.keys(archive.files).filter(n=>n.startsWith(prefix+'assets/anims/')&&n.endsWith('.inc.c')).map(n=>n.slice(prefix.length)))extras.push(name);
  for(const lang of ['us','de','fr'])extras.push('text/'+lang+'/courses.h','text/'+lang+'/dialogs.h');
  for(const name of extras)await write(name,await read(name));
  const exe=options.compiler||path.join(__dirname,'vendor/compiler/TNS-Tool-Compiler-Windows-x64.exe');
  const resolved=await require('./sdk-runtime.cjs').ensureRuntime(exe),gcc=path.join(path.dirname(resolved),'runtime/toolchain/bin/arm-none-eabi-gcc.exe');
  const run=(file,args)=>cp.execFileSync(file,args,{cwd:work,windowsHide:true,encoding:'utf8',maxBuffer:16*1024*1024}).replace(/\r\n/g,'\n');
  const cpp=(name,include=[])=>run(gcc,['-E','-P','-x','c','-DVERSION_EU','-I','.',...include.flatMap(p=>['-I',p]),name]);
  output.file('build/eu_nsp/assets/mario_anim_data.c',run(options.python||process.env.PYTHON||'python',['tools/mario_anims_converter.py']));
  const levels=cpp('levels/level_headers.h.in');output.file('build/eu_nsp/include/level_headers.h',levels.split('\n').filter(s=>s.trim()).map(s=>'#include "'+s.trim()+'"').join('\n')+'\n');
  const charmap=(await read('charmap.txt')).toString('utf8');
  for(const lang of ['us','de','fr'])for(const kind of ['courses','text'])output.file('build/eu_nsp/text/'+lang+'/define_'+kind+'.inc.c',convert(cpp('text/define_'+kind+'.inc.c',['text/'+lang]),charmap));
  for(const [name,map]of [['text_strings','charmap.txt'],['text_menu_strings','charmap_menu.txt']])output.file('build/eu_nsp/include/'+name+'.h',convert((await read('include/'+name+'.h.in')).toString('utf8'),(await read(map)).toString('utf8')));
  output.file('.tnsproject.json',JSON.stringify(metadata,null,2));
  output.file('.tnsrom.recipe.json',JSON.stringify({version:1,source:profile.source,recipes:profile.recipes}));
  output.file('LEEME-ROM.txt','Proyecto nativo de Super Mario 64 para Ndless. Los recursos se generan desde la ROM seleccionada localmente.\nAbre el ZIP generado con Archivo > Abrir proyecto Ndless. Modifica C, previsualiza y usa Build TNS para compilar.\nEnter = Start; F1 = A; Delete = B; Home = Z; flechas = stick; 8/6/2/4 = botones C; Esc = salir.\nEl preview es lento y no certifica una partida completa ni compatibilidad física.\nFuente: '+profile.source.repository+'/tree/'+profile.source.commit+'\n');
  const bytes=await output.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}}),dest=options.output||path.join(__dirname,'vendor/rom/sm64-eu-template.zip');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,bytes);return{path:dest,bytes:bytes.length,sourceSha,sourceFiles:profile.sourceFiles.length,romChunks:profile.recipes.reduce((n,r)=>n+r.chunks.length,0)};
 }finally{
  if(path.dirname(work)!==path.resolve(os.tmpdir())||!path.basename(work).startsWith('tns-rom-template-'))throw Error('Unsafe template cleanup path');
  await fs.rm(work,{recursive:true,force:true});
 }
}
async function prepareNes(options={}){
 const p=require('./rom/nes-profile.json'),JSZip=await zipLibrary();let bytes;
 if(options.sourceZip)bytes=await fs.readFile(options.sourceZip);else{const r=await fetch(p.source.repository.replace('https://github.com/','https://codeload.github.com/')+'/zip/'+p.source.commit);if(!r.ok)throw Error('NES source download '+r.status);bytes=Buffer.from(await r.arrayBuffer());}
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==p.source.zipSha256)throw Error('NES source SHA256 mismatch');
 const archive=await JSZip.loadAsync(bytes),prefix='NesNspire-'+p.source.commit+'/',zip=new JSZip(),sources=[];
 for(const [name,item]of Object.entries(archive.files)){
  if(item.dir||!name.startsWith(prefix+'src/')||! /\.(?:c|cpp|h|hpp|inc)$/i.test(name))continue;
  let dest=name.slice((prefix+'src/').length),text=await item.async('string');relative(dest);
  if(dest.startsWith('mapper/')&&dest.endsWith('.cpp'))dest=dest.slice(0,-4)+'.inc';
  text=text.replace(/(mapper\/InfoNES_Mapper_\d+)\.cpp/g,'$1.inc');
  if(dest.endsWith('.cpp')){text='#include <strings.h>\n'+text;sources.push(dest);}
  if(dest==='ndless/InfoNES_System_Ndless.cpp'){
   const bridge='\n#include "../embedded_rom.h"\nstatic FILE *tns_embedded_open(const char *name,const char *mode){const char *base=strrchr(name,\'/\');base=base?base+1:name;if(!strcmp(base,TNS_ROM_FILENAME)&&mode[0]==\'r\')return fmemopen((void*)tns_rom_data,sizeof(tns_rom_data),"rb");return fopen(name,mode);}\n#define fopen tns_embedded_open\n';
   text=text.replace('// K6502 CPU registers',bridge+'\n// K6502 CPU registers');
   text=text.replace('int main(int argc, char *argv[]) {','int main(int argc, char *argv[]) {\n  char *tns_args[]={argc>0?argv[0]:(char*)"nes-game.tns",(char*)TNS_ROM_FILENAME,NULL};argc=2;argv=tns_args;');
   if(!text.includes('#define fopen tns_embedded_open')||!text.includes('argv=tns_args'))throw Error('NES embedding patch did not apply');
  }
  zip.file(dest,text);
 }
 zip.file('LICENSE',await archive.file(prefix+'LICENSE').async('nodebuffer'));
 zip.file('UPSTREAM-README.md',await archive.file(prefix+'README.md').async('nodebuffer'));
 zip.file('.tnsproject.json',JSON.stringify({type:'tns-tool-ndless-project',version:1,name:'nes-game',language:'cpp',target:'zehn-modern',activeFile:'ndless/InfoNES_System_Ndless.cpp',settings:{build:{version:1,sources,includeDirectories:['.'],optimization:'O2'}}},null,2));
 zip.file('LEEME-ROM.txt','Proyecto NES con NesNspire. El cartucho seleccionado se incorpora como datos C en embedded_rom.h, se lee en memoria y queda dentro del TNS.\nAbre este ZIP en Abrir proyecto Ndless para editar, previsualizar y recompilar.\nFlechas = mando; Enter = Start; Control = A; Shift = B; Esc = Select; Home/ON = salir.\nLa compatibilidad depende del mapper y del juego; no se garantiza cualquier cartucho.\nFuente: '+p.source.repository+'/tree/'+p.source.commit+'\n');
 const dest=options.output||path.join(__dirname,'vendor/rom/nes-template.zip'),output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,output);return{path:dest,bytes:output.length,sources:sources.length,romsBundled:0};
}
async function prepareGb(options={}){
 const p=require('./rom/gb-profile.json'),JSZip=await zipLibrary();let bytes;
 if(options.sourceZip)bytes=await fs.readFile(options.sourceZip);else{const r=await fetch(p.source.repository.replace('https://github.com/','https://codeload.github.com/')+'/zip/'+p.source.commit);if(!r.ok)throw Error('GB source download '+r.status);bytes=Buffer.from(await r.arrayBuffer());}
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==p.source.zipSha256)throw Error('GB source SHA256 mismatch');
 const archive=await JSZip.loadAsync(bytes),prefix='binjgb-'+p.source.commit+'/',zip=new JSZip();
 await fs.mkdir(path.join(__dirname,'vendor/rom'),{recursive:true});await fs.writeFile(path.join(__dirname,'vendor/rom/binjgb-LICENSE.txt'),await archive.file(prefix+'LICENSE').async('nodebuffer'));
 for(const [name,sha]of [['binjgb.js','a68e5854b5d68339a34c0aa0b6dbeacd615ed316657ee17b63dafa5e00561b09'],['binjgb.wasm','52c165069441a09180b4bd63464318aa7b861b1d36e0d05e8047b48619fd2f0b']]){
  const asset=await archive.file(prefix+'docs/'+name).async('nodebuffer');if(crypto.createHash('sha256').update(asset).digest('hex')!==sha)throw Error('GB preview asset SHA256 mismatch');const target=path.join(__dirname,'vendor/rom/'+name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,asset);
 }
 for(const name of ['emulator.c','emulator.h','common.c','common.h','memory.c','memory.h','builtin-palettes.def'])zip.file(name,await archive.file(prefix+'src/'+name).async('nodebuffer'));
 zip.file('LICENSE',await archive.file(prefix+'LICENSE').async('nodebuffer'));
 zip.file('main.c',await fs.readFile(path.join(__dirname,'rom/gb-main.c')));
 zip.file('.tnsproject.json',JSON.stringify({type:'tns-tool-ndless-project',version:1,name:'gb-game',language:'c',target:'zehn-modern',activeFile:'main.c',settings:{build:{version:1,sources:['main.c','emulator.c','common.c','memory.c'],includeDirectories:['.'],defines:['NDEBUG'],optimization:'O2'}}},null,2));
 zip.file('LEEME-ROM.txt','Proyecto GB/GBC con binjgb. El cartucho seleccionado se incorpora en embedded_rom.h y se compila dentro del TNS.\nFlechas = mando; Enter = Start; Tab = Select; Control = A; Shift = B; Esc = guardar y salir.\nEn la calculadora se guarda la RAM del cartucho en un archivo por juego. El preview usa un sistema de archivos temporal.\nNo incluye audio, enlace entre consolas ni accesorios especiales. La compatibilidad física y una partida completa requieren pruebas.\nFuente: '+p.source.repository+'/tree/'+p.source.commit+'\n');
 const dest=options.output||path.join(__dirname,'vendor/rom/gb-template.zip'),output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,output);return{path:dest,bytes:output.length,sources:4,romsBundled:0};
}
module.exports={prepare,prepareNes,prepareGb,zipLibrary};
if(require.main===module)(async()=>{console.log(JSON.stringify(await prepare({sourceZip:process.env.TNS_SM64_SOURCE_ZIP})));console.log(JSON.stringify(await prepareNes({sourceZip:process.env.TNS_NES_SOURCE_ZIP})));console.log(JSON.stringify(await prepareGb({sourceZip:process.env.TNS_GB_SOURCE_ZIP})));for(const [system,fn]of [['snes','prepareSnes'],['gba','prepareGba'],['n64','prepareN64'],['nds','prepareNds']])console.log(JSON.stringify(await require('./prepare-rom-'+system+'.cjs')[fn]({sourceZip:process.env['TNS_'+system.toUpperCase()+'_SOURCE_ZIP'],glmZip:process.env.TNS_GLM_SOURCE_ZIP})));console.log(JSON.stringify(await require('./prepare-rom-prebuilt.cjs').prepare()));})().catch(e=>{console.error(e);process.exitCode=1;});
