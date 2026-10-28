const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const source={repository:'https://github.com/Hydr8gon/NooDS',commit:'4cb1439c330248b26cdf5f8dbcfa4e5ac53dcda0',zipSha256:'1f9e74724a7fefc862ab0e6e014fa62ad601acfd132c1a0f446d835e0216e15e'};
async function prepareNds(options={}){
 const JSZip=await require('./prepare-rom.cjs').zipLibrary(),bytes=options.sourceZip?await fs.readFile(options.sourceZip):Buffer.from(await(await fetch(source.repository.replace('https://github.com/','https://codeload.github.com/')+'/zip/'+source.commit)).arrayBuffer());
 if(crypto.createHash('sha256').update(bytes).digest('hex')!==source.zipSha256)throw Error('NDS source SHA256 mismatch');
 const archive=await JSZip.loadAsync(bytes),prefix='NooDS-'+source.commit+'/src/core/',zip=new JSZip(),sources=['main.cpp','single-thread-atomic.c'];
 for(const [name,item]of Object.entries(archive.files)){
  if(item.dir||!name.startsWith(prefix)||!/\.(?:h|cpp)$/.test(name))continue;
  const dest='core/'+name.slice(prefix.length);let text=await item.async('string');
  text='#include "single-thread.h"\n'+text.replace(/std::thread\b/g,'TnsSingleThread::thread').replace(/std::mutex\b/g,'TnsSingleThread::mutex').replace(/std::condition_variable\b/g,'TnsSingleThread::condition_variable').replace(/std::cv_status\b/g,'TnsSingleThread::cv_status').replace(/std::this_thread::/g,'TnsSingleThread::this_thread::');
  if(dest==='core/memory/memory.h')text=text.replace('uint8_t ram[0x1000000]','uint8_t ram[0x400000]');
  text=text.replace(/std::min\(/g,'tns_min(').replace(/std::max\(/g,'tns_max(');
  if(dest==='core/memory/cartridge.h')text=text.replace('int getSaveSize()','uint8_t *tnsSaveData(){return save;}\n    int getSaveSize()');
  if(dest==='core/memory/cartridge.cpp')text=text.replace('romFile = (romFd == -1) ? fopen(romPath.c_str(), "rb")','romFile = (romFd == -1) ? tns_nds_open(romPath.c_str(), "rb")').replace('std::string savePath = basePath', 'std::string savePath = basePath');
  if(dest==='core/memory/cartridge.cpp')text='#include <cstdio>\n#include "embedded_rom.h"\nextern "C" FILE *tns_nds_open(const char*,const char*);\n'+text.replace('this->savePath = savePath','this->savePath = TNS_SAVE_FILENAME');
  zip.file(dest,text);if(dest.endsWith('.cpp'))sources.push(dest);
 }
 zip.file('main.cpp',await fs.readFile(path.join(__dirname,'rom/nds-main.cpp')));zip.file('single-thread.h',await fs.readFile(path.join(__dirname,'rom/single-thread.h')));
 zip.file('single-thread-atomic.c',await fs.readFile(path.join(__dirname,'rom/single-thread-atomic.c')));
 zip.file('LICENSE',await archive.file('NooDS-'+source.commit+'/LICENSE').async('nodebuffer'));
 zip.file('.tnsproject.json',JSON.stringify({type:'tns-tool-ndless-project',version:1,name:'nds-game',language:'cpp',target:'zehn-modern',activeFile:'main.cpp',settings:{build:{version:1,sources,includeDirectories:['.','core'],defines:['NO_FDOPEN','LOG_LEVEL=0'],cppStandard:'gnu++17',optimization:'O2'}}},null,2));
 const output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}),dest=options.output||path.join(__dirname,'vendor/rom/nds-template.zip');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,output);return{path:dest,bytes:output.length,sources:sources.length};
}
module.exports={prepareNds,source};
if(require.main===module)prepareNds({sourceZip:process.env.TNS_NDS_SOURCE_ZIP}).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e);process.exitCode=1;});
