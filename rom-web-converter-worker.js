/* All cartridge data stays inside this worker and is never uploaded. */
importScripts('./rom-data-web.js');
let manifestPromise;
const base=new URL('./assets/rom/',self.location.href);
const digest=async(algorithm,bytes)=>Array.from(new Uint8Array(await crypto.subtle.digest(algorithm,bytes)),n=>n.toString(16).padStart(2,'0')).join('');
async function asset(name){
 const manifest=await(manifestPromise||=fetch(new URL('manifest.json',base)).then(r=>{if(!r.ok)throw Error('No se pudo cargar el catálogo del conversor');return r.json();}));
 const expected=manifest.files[name];if(!expected)throw Error('Recurso no disponible: '+name);
 const response=await fetch(new URL(name,base));if(!response.ok)throw Error('No se pudo descargar '+name);
 const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==expected.bytes||await digest('SHA-256',bytes)!==expected.sha256)throw Error('Recurso incompleto: '+name);return bytes;
}
async function zipLibrary(){if(!self.JSZip){const bytes=await asset('jszip.min.js'),url=URL.createObjectURL(new Blob([bytes],{type:'application/javascript'}));try{importScripts(url);}finally{URL.revokeObjectURL(url);}}return self.JSZip;}
let session=null;
async function convert(payload){
 let bytes=new Uint8Array(payload.bytes),name=String(payload.name||'ROM');
 if(bytes.length>144*1024*1024)throw Error('Selecciona una ROM o ZIP individual de hasta 144 MiB.');
 const JSZip=await zipLibrary();
 if(bytes[0]===80&&bytes[1]===75){const zip=await JSZip.loadAsync(bytes),files=Object.values(zip.files).filter(f=>!f.dir&&/\.(nes|gb|gbc|gba|nds|sfc|smc|n64|z64|v64)$/i.test(f.name));if(files.length!==1)throw Error('Selecciona un ZIP con una sola ROM; extrae primero el juego de la colección.');if(files[0]._data?.uncompressedSize>128*1024*1024)throw Error('ROM descomprimida mayor de 128 MiB.');name=files[0].name.split('/').pop();bytes=await files[0].async('uint8array');}
 const info=TnsRomData.detect(bytes,{name,size:bytes.length});if(!info.convertible)throw Error(info.reason);
 const rom=new Uint8Array(info.id==='nes'?TnsRomData.normalizeNes(bytes):info.id==='snes'?TnsRomData.normalizeSnes(bytes):info.id==='n64'?TnsRomData.normalizeN64(bytes):bytes);
 info.sha1=await digest('SHA-1',rom);info.external=true;info.webPackage=true;
 const slug=info.title.replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,30)||'game';const projectName=info.id+'-'+slug+'-'+info.sha1.slice(0,8);
 const zip=await JSZip.loadAsync(await asset(info.id+'-project.zip')),meta=JSON.parse(await zip.file('.tnsproject.json').async('string'));
 meta.name=projectName;meta.settings.romConversion={profile:info.id,sha1:info.sha1,webPlayer:1};const resourceName=projectName+'.rom.tns',chunks=[];
 for(let offset=0;offset<rom.length;offset+=8*1024*1024){const file='rom-resource/chunk-'+chunks.length+'.b64',chunk=rom.subarray(offset,offset+8*1024*1024);let text='';for(let p=0;p<chunk.length;p+=32768)text+=String.fromCharCode(...chunk.subarray(p,p+32768));zip.file(file,btoa(text));chunks.push(file);}
 meta.settings.romResources=[{name:resourceName,size:rom.length,sha256:await digest('SHA-256',rom),chunks}];
 zip.file('embedded_rom.h','#define TNS_WEB_FIXED_FILENAME "'+resourceName+'"\n#include "web-rom.h"\n');zip.file('.tnsproject.json',JSON.stringify(meta,null,2));
 session={info,name:projectName,rom,resourceName,zip};
 return{ok:true,info,name:projectName,filename:projectName+'-Project.zip',previewRom:rom,sources:meta.settings.build.sources.length,zip:await zip.generateAsync({type:'uint8array',compression:'DEFLATE'})};
}
async function build(){
 if(!session)throw Error('Selecciona primero una ROM');const {info,name,rom,resourceName}=session,bytes=await asset(info.id+'-player.tns');
 if(String.fromCharCode(...bytes.subarray(0,4))!=='PRG\0')throw Error('Reproductor ARM inválido');
 const JSZip=await zipLibrary(),zip=new JSZip();zip.file(name+'.tns',bytes);zip.file(resourceName,rom);zip.file('LEEME.txt','Copia ambos archivos .tns en la misma carpeta de tu calculadora. Abre '+name+'.tns, no el cartucho .rom.tns. Ndless debe estar instalado y activo.\nPaquete preparado localmente en el navegador con un emulador ARM precompilado. No se recompila código C/C++ en la web.\nDS/N64 son experimentales; un paquete válido no garantiza compatibilidad del juego ni rendimiento.\n');
 return{ok:true,filename:name+'.tns',bytes,resources:[{name:resourceName,bytes:rom}],download:{filename:name+'-Calculator.zip',bytes:await zip.generateAsync({type:'uint8array',compression:'DEFLATE'})},engine:'web-prebuilt'};
}
let queue=Promise.resolve();self.onmessage=({data})=>{queue=queue.catch(()=>{}).then(async()=>{try{let result;if(data.method==='inspect')result=TnsRomData.detect(data.payload.bytes,{name:data.payload.name,size:data.payload.size});else if(data.method==='convert')result=await convert(data.payload);else if(data.method==='build')result=await build();else throw Error('Unknown ROM operation');self.postMessage({id:data.id,result});}catch(error){self.postMessage({id:data.id,error:error.message});}});};
