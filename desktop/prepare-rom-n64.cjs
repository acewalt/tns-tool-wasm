const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
async function prepareN64(options={}){
 const p=require('./rom/n64-profile.json'),JSZip=await require('./prepare-rom.cjs').zipLibrary();
 const bytes=options.sourceZip?await fs.readFile(options.sourceZip):Buffer.from(await (await fetch(p.source.repository.replace('https://github.com/','https://codeload.github.com/')+'/zip/'+p.source.commit)).arrayBuffer());
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==p.source.zipSha256)throw Error('N64 source SHA256 mismatch');
 const archive=await JSZip.loadAsync(bytes),prefix='daedalus-nspire-'+p.source.commit+'/',zip=new JSZip();
 for(const [name,item]of Object.entries(archive.files)){
  if(item.dir||!name.startsWith(prefix+'Source/')||!/\.(?:h|hpp|c|cpp|S|inl|inc|def)$/.test(name))continue;
  const dest=name.slice(prefix.length);let text=await item.async('string');
  if(dest==='Source/Base/Types.h')text='#ifndef DAEDALUS_CONFIG_VERSION\n#define DAEDALUS_CONFIG_VERSION "TNS Tool"\n#endif\n'+text;
  if(dest==='Source/SysNDLESS/main.cpp'){
   text=text.replace('return UI::DrawRomSelector();','return "embedded.z64";').replace('CreateDirectories();','mkdir("/documents/SAVES",0700);\n\tmkdir("/documents/CONFIG",0700);\n\tCreateDirectories();');
   if(!text.includes('return "embedded.z64"'))throw Error('N64 auto-launch patch failed');
   text='#include "embedded_rom.h"\n#if __has_include("n64-hle-cache.h")\n#include "n64-hle-cache.h"\n#endif\n'+text.replace('return "embedded.z64";','return TNS_ROM_FILENAME;').replace('CPU_Run();','#ifdef TNS_HLE_CACHE_SIZE\n\t\t\tmkdir("/documents/SaveGames",0700);mkdir("/documents/SaveGames/Cache",0700);FILE *cache=fopen(TNS_HLE_CACHE_FILENAME,"rb");if(cache)fclose(cache);else{cache=fopen(TNS_HLE_CACHE_FILENAME,"wb");if(cache){fwrite(tns_hle_cache,1,TNS_HLE_CACHE_SIZE,cache);fclose(cache);}}\n#endif\n\t\t\tCPU_SelectCore();\n\t\t\tCPU_Run();\n\t\t\tshouldQuit=true;');
  }
  if(dest==='Source/Core/CPU.cpp')text=text.replace(/#ifdef DAEDALUS_ENABLE_DYNAREC\s+if \(gDynarecEnabled\)[\s\S]*?#endif\s+Inter_SelectCore\(\);/,'Inter_SelectCore();');
  if(dest==='Source/Core/Interpret.cpp')text='#include <libndls.h>\n'+text.replace('CPU_EXECUTE_OP< false >();','CPU_EXECUTE_OP< false >();\nstatic unsigned tns_poll=0;if((++tns_poll&16383)==0&&isKeyPressed(KEY_NSPIRE_ESC))CPU_Halt("User exit");');
  if(dest==='Source/Core/ROM.cpp')text='#include "tns-save-types.h"\n'+text.replace('g_ROM.settings = settings;','g_ROM.settings = settings;\n\tif(g_ROM.settings.SaveType==SAVE_TYPE_UNKNOWN)g_ROM.settings.SaveType=(ESaveType)tns_save_type(g_ROM.rh.CRC1,g_ROM.rh.CRC2,g_ROM.rh.CountryID);');
  if(dest==='Source/Input/NDLESS/InputManagerNDLESS.cpp')text=text.replace('// Controllers 2-4 not connected','if(isKeyPressed(KEY_NSPIRE_8)||isKeyPressed(KEY_NSPIRE_2)||isKeyPressed(KEY_NSPIRE_4)||isKeyPressed(KEY_NSPIRE_6)){pPad[0].stick_x=80*(isKeyPressed(KEY_NSPIRE_6)-isKeyPressed(KEY_NSPIRE_4));pPad[0].stick_y=80*(isKeyPressed(KEY_NSPIRE_8)-isKeyPressed(KEY_NSPIRE_2));if(pPad[0].stick_x&&pPad[0].stick_y){pPad[0].stick_x=pPad[0].stick_x*57/80;pPad[0].stick_y=pPad[0].stick_y*57/80;}}\n\t\t// Controllers 2-4 not connected');
  if(dest==='Source/RomFile/RomFileUncompressed.cpp')text=await fs.readFile(path.join(__dirname,'rom/n64-file.cpp'),'utf8');
  zip.file(dest,text);
 }
 const glmData=options.glmZip?await fs.readFile(options.glmZip):Buffer.from(await (await fetch('https://codeload.github.com/g-truc/glm/zip/0af55ccecd98d4e5a8d1fad7de25ba429d60e863')).arrayBuffer());
 if(crypto.createHash('sha256').update(glmData).digest('hex')!=='d53f8d8a3fd3f63a5da21c64701985ed933a93064620bb1a22dcb37ddb3795d1')throw Error('GLM source SHA256 mismatch');
 const glm=await JSZip.loadAsync(glmData),glmRoot='glm-0af55ccecd98d4e5a8d1fad7de25ba429d60e863/';
 for(const [name,item]of Object.entries(glm.files))if(!item.dir&&name.startsWith(glmRoot+'glm/'))zip.file('Source/'+name.slice(glmRoot.length),await item.async('nodebuffer'));
 zip.file('GLM-copying.txt',await glm.file(glmRoot+'copying.txt').async('nodebuffer'));
 zip.file('copying.txt',await archive.file(prefix+'copying.txt').async('nodebuffer'));
 zip.file('UPSTREAM-README.md',await archive.file(prefix+'README.md').async('nodebuffer'));
 const ini=await fs.readFile(path.join(__dirname,'rom/n64-roms.ini'),'utf8'),source=require('./rom/n64-roms-source.json');
 if(crypto.createHash('sha256').update(ini).digest('hex')!==source.sha256)throw Error('N64 save database SHA mismatch');
 const records=[];for(const match of ini.matchAll(/\{([\da-f]{8})([\da-f]{8})-([\da-f]{2})\}([\s\S]*?)(?=\{|$)/gi)){const type=/^SaveType=(\w+)/m.exec(match[4])?.[1],id={Eeprom4k:1,Eeprom16k:2,SRAM:3,FlashRam:4}[type];if(id)records.push('{0x'+match[1]+',0x'+match[2]+',0x'+match[3]+','+id+'}');}
 zip.file('tns-save-types.h','// GPL-2.0-or-later. Derived from '+source.url+'\n#pragma once\nstatic unsigned tns_save_type(unsigned a,unsigned b,unsigned c){static const unsigned entries[][4]={'+records.join(',')+'};for(const auto &e:entries)if(e[0]==a&&e[1]==b&&e[2]==c)return e[3];return 0;}\n');
 zip.file('N64-SAVE-DATABASE.txt',JSON.stringify(source,null,2));
 zip.file('.tnsproject.json',JSON.stringify({type:'tns-tool-ndless-project',version:1,name:'n64-game',language:'cpp',target:'zehn-modern',activeFile:'Source/SysNDLESS/main.cpp',settings:{build:{version:1,sources:p.sources,includeDirectories:['.','Source'],defines:['DAEDALUS_DEBUG_CONSOLE','DAEDALUS_ENABLE_OS_HOOKS','DAEDALUS_ENDIAN_LITTLE','DAEDALUS_NDLESS','DAEDALUS_SILENT','_USE_MATH_DEFINES','NDEBUG'],cppStandard:'gnu++23',wrapFree:true,optimization:'O2'}}},null,2));
 const dest=options.output||path.join(__dirname,'vendor/rom/n64-template.zip'),output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,output);return{path:dest,bytes:output.length,sources:p.sources.length};
}
module.exports={prepareN64};
if(require.main===module)prepareN64({sourceZip:process.env.TNS_N64_SOURCE_ZIP,glmZip:process.env.TNS_GLM_SOURCE_ZIP}).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e);process.exitCode=1;});
