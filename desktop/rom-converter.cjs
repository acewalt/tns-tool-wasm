const fs=require('node:fs/promises'),path=require('node:path'),vm=require('node:vm');
const {normalize,inspect,inspectRom,mio0}=require('./rom-data.cjs');
async function zipLibrary(){
 const context={module:{exports:{}},exports:{},Buffer,Uint8Array,ArrayBuffer,TextEncoder,TextDecoder,setImmediate,setTimeout};
 const code=await fs.readFile(path.join(process.resourcesPath||__dirname,'vendor/jszip/jszip.min.js'),'utf8').catch(()=>fs.readFile(path.join(__dirname,'vendor/jszip/jszip.min.js'),'utf8'));vm.runInNewContext(code,context);return context.module.exports;
}
const format=bytes=>Array.from(bytes,n=>'0x'+n.toString(16).toUpperCase()).join(',')+',';
async function convert(input,options={}){
 const JSZip=await zipLibrary();let bytes=Buffer.from(input),name=options.name||'ROM';
 if(bytes.length>144*1024*1024)throw Error('Selecciona una ROM o un ZIP individual de hasta 144 MiB.');
 if(bytes.subarray(0,2).toString()==='PK'){
  const archive=await JSZip.loadAsync(bytes),files=Object.values(archive.files).filter(f=>!f.dir&&/\.(?:nes|n64|z64|v64|gb|gbc|gba|nds|sfc|smc)$/i.test(f.name));
  if(files.length!==1)throw Error('Selecciona un ZIP individual con una sola ROM. Para un paquete de juegos, extrae primero el cartucho que quieras convertir.');
  if(files[0]._data?.uncompressedSize>128*1024*1024)throw Error('ROM descomprimida mayor de 128 MiB.');
  name=files[0].name.split('/').pop();bytes=await files[0].async('nodebuffer');
 }
 const detected=require('./rom-data.cjs').detect(bytes,{name,size:bytes.length});if(!detected.convertible)throw Error(detected.reason);
 const info=inspectRom(bytes,name);
 if(info.id==='nes')return convertNes(bytes,info,JSZip,options);
 if(info.id==='gb')return convertGb(bytes,info,JSZip,options);
 if(['snes','gba','nds','n64'].includes(info.id))return convertCore(bytes,info,JSZip,options);
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
async function convertCore(bytes,info,JSZip,options){
 const template=options[info.id+'Template']||path.join(process.resourcesPath||__dirname,'vendor/rom/'+info.id+'-template.zip');
 const data=await fs.readFile(template).catch(e=>{if(options[info.id+'Template'])throw e;return fs.readFile(path.join(__dirname,'vendor/rom/'+info.id+'-template.zip'));}),zip=await JSZip.loadAsync(data);
 const metadata=JSON.parse(await zip.file('.tnsproject.json').async('string')),slug=info.title.replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30)||'game';
 metadata.name=info.id+'-'+slug+'-'+info.sha1.slice(0,8);metadata.settings.romConversion={profile:info.id,sha1:info.sha1,source:require('./rom/'+info.id+'-profile.json').source};
 const rom=info.id==='snes'?require('./rom-data.cjs').normalizeSnes(bytes):info.id==='n64'?require('./rom-data.cjs').normalizeN64(bytes):bytes;
 const external=(info.id==='nds'&&rom.length>4*1024*1024)||(info.id==='n64'&&rom.length>8*1024*1024),resourceName='rom-'+info.sha1.slice(0,12)+'.'+(info.id==='n64'?'z64':info.id)+'.tns';
 zip.file('embedded_rom.h','#pragma once\n#define TNS_ROM_SIZE '+rom.length+'\n#define TNS_ROM_FILENAME "'+resourceName+'"\n'+(external?'#define TNS_EXTERNAL_ROM 1\n':'')+'#define TNS_SAVE_FILENAME "'+info.id+'-'+info.sha1.slice(0,12)+'.sav.tns"\n#ifdef __cplusplus\nextern "C" {\n#endif\nextern const unsigned int tns_rom_data[];\n#ifdef __cplusplus\n}\n#endif\n');
 if(external){
  const chunks=[];for(let offset=0;offset<rom.length;offset+=8*1024*1024){const name='rom-resource/chunk-'+chunks.length+'.b64';zip.file(name,rom.subarray(offset,offset+8*1024*1024).toString('base64'));chunks.push(name);}
  metadata.settings.romResources=[{name:resourceName,size:rom.length,sha256:require('node:crypto').createHash('sha256').update(rom).digest('hex'),chunks}];
 }
 if(info.id==='n64'){
  const cache=await require('./rom-n64-cache.cjs').create(new Uint8Array(rom),path.join(path.dirname(template)));
  if(cache){zip.file('n64-hle-cache.h','#define TNS_HLE_CACHE_SIZE '+cache.length+'\n#define TNS_HLE_CACHE_FILENAME "/documents/SaveGames/Cache/'+resourceName.replace(/\.tns$/,'.hle.tns')+'"\nstatic const unsigned char tns_hle_cache[]={'+format(cache)+'};\n');metadata.settings.romConversion.hleCache=true;}
 }
 const includes=[];for(let offset=0;!external&&offset<rom.length;offset+=2*1024*1024){const chunk=rom.subarray(offset,Math.min(rom.length,offset+2*1024*1024)),words=[];for(let i=0;i<chunk.length;i+=4){let word=0;for(let j=0;j<4&&i+j<chunk.length;j++)word|=chunk[i+j]<<(j*8);words.push('0x'+(word>>>0).toString(16));}const name='rom-data/chunk-'+includes.length+'.inc';zip.file(name,words.join(',')+',\n');includes.push('#include "'+name+'"');}
 zip.file('rom-data.c','#include "embedded_rom.h"\nconst unsigned int tns_rom_data[]={\n'+(external?'0':includes.join('\n'))+'\n};\n');metadata.settings.build.sources.push('rom-data.c');zip.file('.tnsproject.json',JSON.stringify(metadata,null,2));
 zip.file('LEEME-ROM.txt','Proyecto '+info.system+' generado localmente. Abre el ZIP en Archivo > Abrir proyecto Ndless para editar y recompilar.\nLa ROM seleccionada se incorpora como datos; el TNS contiene un emulador real. No cambia el código de la consola por código C equivalente.\nFuente del núcleo: '+metadata.settings.romConversion.source.repository+'\n'+(info.experimental?info.system+' experimental: el rendimiento y la compatibilidad dependen del juego.\n':'')+(external?'Build TNS descarga un ZIP con el programa y el cartucho. Copia ambos .tns en la misma carpeta y abre el programa.\n':'')+(info.id==='nds'?'DS: Doc + flechas mueve el stylus; Doc + Ctrl toca. Esc guarda y sale. El preview permite tocar la pantalla inferior con el ratón.\n':''));
 const output=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}});
 return{ok:true,info:{...info,external},name:metadata.name,filename:metadata.name+'-Project.zip',zip:new Uint8Array(output),previewRom:new Uint8Array(rom),sources:metadata.settings.build.sources.length,chunks:includes.length};
}
module.exports={convert,inspect,inspectRom,normalize,zipLibrary};
