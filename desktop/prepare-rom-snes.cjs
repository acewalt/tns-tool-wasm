const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
async function prepareSnes(options={}){
 const p=require('./rom/snes-profile.json'),JSZip=await require('./prepare-rom.cjs').zipLibrary();
 const bytes=options.sourceZip?await fs.readFile(options.sourceZip):Buffer.from(await (await fetch(p.source.repository.replace('https://github.com/','https://codeload.github.com/')+'/zip/'+p.source.commit)).arrayBuffer());
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==p.source.zipSha256)throw Error('SNES source SHA256 mismatch');
 const archive=await JSZip.loadAsync(bytes),prefix='pocketsnes-nspire-'+p.source.commit+'/',zip=new JSZip(),sources=['main.cpp'];
 for(const [name,item]of Object.entries(archive.files)){
  if(item.dir||!name.startsWith(prefix+'pocketsnes/')||!/\.(?:h|c|cpp|inc)$/.test(name))continue;
  const dest=name.slice(prefix.length);let text=await item.async('string');
  if(dest==='pocketsnes/snes9x/memmap.cpp'){
   text=text.replace(/#include "(?:\.\.\/)*frontend\/romzip\.h"/,'');
   // The selected, normalized image is copied into the core's writable ROM RAM.
   const start=text.indexOf('uint32 CMemory::FileLoader ('),end=text.indexOf('\n}',start);
   if(start<0||end<0)throw Error('SNES ROM loader patch did not apply');
   text=text.slice(0,start)+'#include "embedded_rom.h"\nuint32 CMemory::FileLoader(uint8 *buffer,const char *filename,int32 maxsize){if(TNS_ROM_SIZE>(unsigned)maxsize)return 0;memcpy(buffer,tns_rom_data,TNS_ROM_SIZE);HeaderCount=0;strcpy(ROMFilename,filename);return TNS_ROM_SIZE;}'+text.slice(end+2);
  }
  zip.file(dest,text);if(dest.startsWith('pocketsnes/snes9x/')&&dest.endsWith('.cpp'))sources.push(dest);
 }
 zip.file('main.cpp',await fs.readFile(path.join(__dirname,'rom/snes-main.cpp')));
 zip.file('UPSTREAM-README.md',await archive.file(prefix+'README.md').async('nodebuffer'));
 for(const name of Object.keys(archive.files).filter(n=>n.startsWith(prefix)&&/\/(?:LICENSE|COPYING|copyright)(?:\.|$)/i.test(n)&&!archive.files[n].dir))zip.file('licenses/'+name.slice(prefix.length),await archive.file(name).async('nodebuffer'));
 zip.file('.tnsproject.json',JSON.stringify({type:'tns-tool-ndless-project',version:1,name:'snes-game',language:'cpp',target:'zehn-modern',activeFile:'main.cpp',settings:{build:{version:1,sources,includeDirectories:['.','pocketsnes','pocketsnes/include','pocketsnes/linux','pocketsnes/snes9x'],defines:['RC_OPTIMIZED','__LINUX__','FOREVER_16_BIT','NO_ASM'],optimization:'O2'}}},null,2));
 const dest=options.output||path.join(__dirname,'vendor/rom/snes-template.zip'),output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,output);return{path:dest,bytes:output.length,sources:sources.length};
}
module.exports={prepareSnes};
if(require.main===module)prepareSnes({sourceZip:process.env.TNS_SNES_SOURCE_ZIP}).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e);process.exitCode=1;});
