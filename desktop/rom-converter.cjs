const fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm');
const {normalize,inspect,inspectRom,mio0}=require('./rom-data.cjs');
async function zipLibrary(){
 const context={module:{exports:{}},exports:{},Buffer,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,setImmediate,setTimeout};
 const code=await fs.readFile(path.join(process.resourcesPath||__dirname,'vendor/jszip/jszip.min.js'),'utf8').catch(()=>fs.readFile(path.join(__dirname,'vendor/jszip/jszip.min.js'),'utf8'));vm.runInNewContext(code,context);return context.module.exports;
}
const format=bytes=>Array.from(bytes,n=>'0x'+n.toString(16).toUpperCase()).join(',')+',';
async function convert(input,options={}){
 const JSZip=await zipLibrary();let bytes=Buffer.from(input),name=options.name||'ROM';
 if(bytes.length>16*1024*1024)throw Error('Selecciona una ROM o un ZIP individual de hasta 16 MiB.');
 if(bytes.subarray(0,2).toString()==='PK'){
  const archive=await JSZip.loadAsync(bytes),files=Object.values(archive.files).filter(f=>!f.dir&&/\.(?:nes|n64|z64|v64|gb|gbc|gba|sfc|smc)$/i.test(f.name));
  if(files.length!==1)throw Error('Selecciona un ZIP individual con una sola ROM. Para un paquete de juegos, extrae primero el cartucho que quieras convertir.');
  if(files[0]._data?.uncompressedSize>8*1024*1024)throw Error('ROM descomprimida demasiado grande.');
  name=files[0].name.split('/').pop();bytes=await files[0].async('nodebuffer');
 }
 const detected=require('./rom-data.cjs').detect(bytes,{name,size:bytes.length});if(!detected.convertible)throw Error(detected.reason);
 const info=inspectRom(bytes,name);
 if(info.id==='nes')return convertNes(bytes,info,JSZip,options);
 if(info.id==='gb')return convertGb(bytes,info,JSZip,options);
 const {bytes:rom}=normalize(bytes);
 const templatePath=options.template||path.join(process.resourcesPath||__dirname,'vendor/rom/sm64-eu-template.zip');
 const data=await fs.readFile(templatePath).catch(error=>{if(options.template)throw error;return fs.readFile(path.join(__dirname,'vendor/rom/sm64-eu-template.zip'));});
 const zip=await JSZip.loadAsync(data),recipe=JSON.parse(await zip.file('.tnsrom.recipe.json').async('string'));
 if(recipe.version!==1||!Array.isArray(recipe.recipes)||recipe.recipes.length>2000)throw Error('El perfil de conversión no es válido.');
 const blocks=new Map([[null,rom]]);let chunks=0;
 for(let i=0;i<recipe.recipes.length;i++){
  const item=recipe.recipes[i];require('./project-build.cjs').relative(item.file);let text=item.template||'';
  for(const chunk of item.chunks){
   if(chunk.block!==null&&!blocks.has(chunk.block))blocks.set(chunk.block,mio0(rom,chunk.block));
   const source=blocks.get(chunk.block);
   if(!Number.isInteger(chunk.start)||!Number.isInteger(chunk.length)||chunk.start<0||chunk.length<1||chunk.start+chunk.length>source.length)throw Error('Referencia de recurso inválida.');
   const encoded=format(source.subarray(chunk.start,chunk.start+chunk.length));
   if(item.whole)text=encoded+'\n';else{if(!text.includes(chunk.token))throw Error('Falta un marcador de recurso.');text=text.replace(chunk.token,encoded);}
   chunks++;
  }
  zip.file(item.file,text);
  if(i%16===0)await new Promise(resolve=>setImmediate(resolve));
 }
 zip.remove('.tnsrom.recipe.json');
 const metadata=JSON.parse(await zip.file('.tnsproject.json').async('string'));
 metadata.settings.romConversion={profile:info.id,sha1:info.sha1,source:recipe.source};zip.file('.tnsproject.json',JSON.stringify(metadata,null,2));
 const output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
 return{ok:true,info,name:metadata.name,filename:'Mario64-EU-Ndless-Project.zip',zip:new Uint8Array(output),sources:metadata.settings.build.sources.length,chunks};
}
async function convertNes(bytes,info,JSZip,options){
 const template=options.nesTemplate||path.join(process.resourcesPath||__dirname,'vendor/rom/nes-template.zip');
 const data=await fs.readFile(template).catch(e=>{if(options.nesTemplate)throw e;return fs.readFile(path.join(__dirname,'vendor/rom/nes-template.zip'));}),zip=await JSZip.loadAsync(data);
 const metadata=JSON.parse(await zip.file('.tnsproject.json').async('string'));
 const slug=info.title.replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,32)||'game';
 metadata.name='nes-'+slug+'-'+info.sha1.slice(0,8);metadata.settings.romConversion={profile:'nes',mapper:info.mapper,sha1:info.sha1,source:require('./rom/nes-profile.json').source};
 zip.file('.tnsproject.json',JSON.stringify(metadata,null,2));
 zip.file('embedded_rom.h','// Generated locally from the selected cartridge; compatible NES 2.0 headers are normalized to iNES.\n#define TNS_ROM_FILENAME "rom-'+info.sha1.slice(0,12)+'.nes.tns"\nstatic const unsigned char tns_rom_data[]={'+format(require('./rom-data.cjs').normalizeNes(bytes))+'};\n');
 const output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
 return{ok:true,info,name:metadata.name,filename:metadata.name+'-Project.zip',zip:new Uint8Array(output),sources:metadata.settings.build.sources.length,chunks:1};
}
async function convertGb(bytes,info,JSZip,options){
 const template=options.gbTemplate||path.join(process.resourcesPath||__dirname,'vendor/rom/gb-template.zip');
 const data=await fs.readFile(template).catch(e=>{if(options.gbTemplate)throw e;return fs.readFile(path.join(__dirname,'vendor/rom/gb-template.zip'));}),zip=await JSZip.loadAsync(data);
 const metadata=JSON.parse(await zip.file('.tnsproject.json').async('string')),slug=info.title.replace(/[^a-zA-Z0-9]+/g,'-').slice(0,32)||'game';
 metadata.name=info.system.toLowerCase()+'-'+slug+'-'+info.sha1.slice(0,8);metadata.settings.romConversion={profile:'gb',system:info.system,mapper:info.mapper,sha1:info.sha1,source:require('./rom/gb-profile.json').source};zip.file('.tnsproject.json',JSON.stringify(metadata,null,2));
 const words=[];for(let i=0;i<bytes.length;i+=4)words.push('0x'+bytes.readUInt32LE(i).toString(16));
 zip.file('embedded_rom.h','// Cartridge selected locally. Little-endian ARM words preserve the ROM bytes.\n#define TNS_ROM_SIZE '+bytes.length+'\n#define TNS_SAVE_FILENAME "gb-'+info.sha1.slice(0,12)+'.sav.tns"\nstatic const unsigned int tns_rom_data[]={'+words.join(',')+'};\n');
 const output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});return{ok:true,info,name:metadata.name,filename:metadata.name+'-Project.zip',zip:new Uint8Array(output),previewRom:new Uint8Array(bytes),sources:4,chunks:1};
}
module.exports={convert,inspect,inspectRom,normalize,zipLibrary};
