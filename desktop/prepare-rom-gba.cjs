const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
async function prepareGba(options={}){
 const p=require('./rom/gba-profile.json'),JSZip=await require('./prepare-rom.cjs').zipLibrary();
 const bytes=options.sourceZip?await fs.readFile(options.sourceZip):Buffer.from(await (await fetch(p.source.repository.replace('https://github.com/','https://codeload.github.com/')+'/zip/'+p.source.commit)).arrayBuffer());
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==p.source.zipSha256)throw Error('GBA source SHA256 mismatch');
 const archive=await JSZip.loadAsync(bytes),prefix='lr-gpsp-nspire-'+p.source.commit+'/',zip=new JSZip();
 for(const [name,item]of Object.entries(archive.files)){
  if(item.dir||!name.startsWith(prefix)||!(/\.(?:h|c|cc|S|inc|def)$/.test(name)||/\/(?:COPYING|LICENSE)(?:\.|$)/i.test(name)))continue;
  const dest=name.slice(prefix.length);if(!dest.startsWith('libretro-gpsp/')&&!/^nspire_(?:stubs|gbz|zip|rom_load_diag)\.[ch]$/.test(dest)&&dest!=='nspire/nspire.h')continue;
  let text=await item.async('string');
  if(dest.endsWith('/vfs_implementation.c')){
   if(!text.includes('fopen_utf8(path, mode_str)'))throw Error('GBA file loader patch did not apply');
   text=text.replace('#include <compat/fopen_utf8.h>','#include <compat/fopen_utf8.h>\nextern FILE *tns_rom_open(const char*,const char*);').replace('fopen_utf8(path, mode_str)','tns_rom_open(path, mode_str)');
  }
  zip.file(dest,text);
 }
 const bios=await archive.file(prefix+'libretro-gpsp/bios/open_gba_bios.bin').async('nodebuffer'),words=[];for(let i=0;i<bios.length;i+=4)words.push('0x'+bios.readUInt32LE(i).toString(16));
 const biosSource=require('./rom/gba-bios-source.json'),biosBytes=options.biosZip||process.env.TNS_GBA_BIOS_SOURCE_ZIP?await fs.readFile(options.biosZip||process.env.TNS_GBA_BIOS_SOURCE_ZIP):Buffer.from(await(await fetch(biosSource.repository.replace('https://github.com/','https://codeload.github.com/')+'/zip/'+biosSource.commit)).arrayBuffer());
 if(crypto.createHash('sha256').update(biosBytes).digest('hex')!==biosSource.zipSha256||crypto.createHash('sha256').update(bios).digest('hex')!==biosSource.biosSha256)throw Error('Open BIOS source/binary SHA mismatch');
 const biosArchive=await JSZip.loadAsync(biosBytes),biosPrefix='ReGBA-'+biosSource.commit+'/bios/';
 for(const [name,file]of Object.entries(biosArchive.files))if(!file.dir&&(name.startsWith(biosPrefix+'source/')||name===biosPrefix+'Makefile'))zip.file('open-bios/'+name.slice(biosPrefix.length),await file.async('nodebuffer'));
 zip.file('open-bios/SOURCE.json',JSON.stringify(biosSource,null,2));
 zip.file('open-bios/README.txt',await archive.file(prefix+'libretro-gpsp/bios/README.md').async('nodebuffer'));
 zip.file('bios.c','const unsigned int open_gba_bios_rom[]={'+words.join(',')+'};\n');
 zip.file('main.c',await fs.readFile(path.join(__dirname,'rom/gba-main.c')));
 const core=['main.c','gba_memory.c','savestate.c','sound.c','cheats.c','memmap.c','serial.c','gbp.c','rfu.c','serial_proto.c','gba_cc_lut.c','cpu.cc','video.cc'].map(n=>'libretro-gpsp/'+n);
 const comm=['compat/compat_posix_string.c','compat/compat_strl.c','compat/fopen_utf8.c','encodings/encoding_utf.c','file/file_path.c','file/file_path_io.c','streams/file_stream.c','string/stdstring.c','time/rtime.c','vfs/vfs_implementation.c'].map(n=>'libretro-gpsp/libretro/libretro-common/'+n);
 const sources=['main.c','bios.c',...core,...comm,'nspire_stubs.c','nspire_gbz.c','nspire_zip.c'];
 zip.file('.tnsproject.json',JSON.stringify({type:'tns-tool-ndless-project',version:1,name:'gba-game',language:'cpp',target:'zehn-modern',activeFile:'main.c',settings:{build:{version:1,sources,includeDirectories:['.','libretro-gpsp','libretro-gpsp/libretro','libretro-gpsp/libretro/libretro-common/include','nspire'],defines:['NSPIRE_BUILD','NSPIRE_LIBRETRO','NSPIRE_NO_AUDIO','ARM_ARCH','ROM_BUFFER_SIZE=2','_GNU_SOURCE'],cppStandard:'gnu++14',unsignedChar:true,optimization:'O2'}}},null,2));
 zip.file('UPSTREAM-README.md',await archive.file(prefix+'README.md').async('nodebuffer'));
 const dest=options.output||path.join(__dirname,'vendor/rom/gba-template.zip'),output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'});await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,output);return{path:dest,bytes:output.length,sources:sources.length};
}
module.exports={prepareGba};
if(require.main===module)prepareGba({sourceZip:process.env.TNS_GBA_SOURCE_ZIP}).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e);process.exitCode=1;});
