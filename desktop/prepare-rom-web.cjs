// Build ROM-free browser packages once with the real SDK. Never accepts a cartridge.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const systems=['nes','gb','snes','gba','nds','n64'];
async function template(system){
 const JSZip=await require('./rom-converter.cjs').zipLibrary(),zip=await JSZip.loadAsync(await fs.readFile(path.join(__dirname,'vendor/rom',system+'-template.zip')));
 zip.file('web-rom.c',await fs.readFile(path.join(__dirname,'rom/web-rom.c')));zip.file('web-rom.h',await fs.readFile(path.join(__dirname,'rom/web-rom.h')));zip.file('embedded_rom.h','#include "web-rom.h"\n');
 const meta=JSON.parse(await zip.file('.tnsproject.json').async('string'));meta.name='player-'+system;meta.settings.romConversion={profile:system,webPlayer:1};meta.settings.build.sources.push('web-rom.c');zip.file('.tnsproject.json',JSON.stringify(meta,null,2));
 async function patch(file,before,after){const source=await zip.file(file).async('string');if(!source.includes(before))throw Error('Web player patch missing: '+system+' '+file+' '+before.slice(0,80));zip.file(file,source.replace(before,after));}
 const entries={nes:'ndless/InfoNES_System_Ndless.cpp',gb:'main.c',snes:'main.cpp',gba:'main.c',nds:'main.cpp',n64:'Source/SysNDLESS/main.cpp'},entry=entries[system];
 let source=await zip.file(entry).async('string');
 if(system==='nes')source=source.replace(/static FILE \*tns_embedded_open[\s\S]*?#define fopen tns_embedded_open\r?\n/,'');
 const main=/int main\s*\([^)]*\)\s*\{/;if(!main.test(source))throw Error('Missing entrypoint '+entry);
 const max={nes:4,gb:8,snes:8,gba:32,nds:128,n64:64}[system];source=source.replace(main,'int main(int argc, char **argv) {\n if(tns_web_init(argc,argv,'+max+'u*1024*1024)) return 2;\n'+(system==='gba'?' strcpy(backup_filename,TNS_SAVE_FILENAME);\n':''));zip.file(entry,source);
 if(system==='gb')await patch(entry,'memcpy(init.rom.data, tns_rom_data, TNS_ROM_SIZE);','if(tns_web_read(init.rom.data,TNS_ROM_SIZE)) return 2;');
 if(system==='snes')await patch('pocketsnes/snes9x/memmap.cpp','memcpy(buffer,tns_rom_data,TNS_ROM_SIZE);','if(tns_web_read(buffer,TNS_ROM_SIZE)) return 0;');
 if(system==='gba'){
  source=await zip.file(entry).async('string');source=source.replace(/char backup_filename\[512\]\s*=\s*TNS_SAVE_FILENAME;/,'char backup_filename[512];').replace('fmemopen((void*)tns_rom_data,TNS_ROM_SIZE,"rb")','fopen(TNS_ROM_FILENAME,"rb")');zip.file(entry,source);
 }
 zip.file('WEB-PLAYER.txt','Generic emulator sources. The web packages a prebuilt ARM player and a separate cartridge. Recompile source changes in TNS Tool Portable. Keep program and cartridge together.\n');
 return new Uint8Array(await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
}
async function prepare({assetsOnly=false}={}){
 const out=path.resolve(__dirname,'../assets/rom');await fs.mkdir(out,{recursive:true});const manifest={version:1,files:{}};
 async function write(name,bytes){await fs.writeFile(path.join(out,name),bytes);manifest.files[name]={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}
 for(const system of systems){if(assetsOnly){for(const suffix of ['-project.zip','-player.tns'])await write(system+suffix,await fs.readFile(path.join(out,system+suffix)));continue;}const zip=await template(system);await write(system+'-project.zip',zip);const result=await require('./compiler.cjs').build(path.join(__dirname,'vendor/compiler/TNS-Tool-Compiler-Windows-x64.exe'),{name:'player-'+system,zip});await write(system+'-player.tns',result.bytes);console.log(JSON.stringify({system,bytes:result.bytes.length}));}
 for(const name of ['binjgb.js','binjgb.wasm',...['snes','gba','nds','n64'].flatMap(s=>[s+'-preview.js',s+'-preview.wasm'])])await write(name,await fs.readFile(path.join(__dirname,'vendor/rom',name)));
 await write('jszip.min.js',await fs.readFile(path.join(__dirname,'vendor/jszip/jszip.min.js')));
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
}
module.exports={prepare,template,systems};if(require.main===module)prepare({assetsOnly:process.argv.includes('--assets-only')}).catch(e=>{console.error(e);process.exitCode=1;});
