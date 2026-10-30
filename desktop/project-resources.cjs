// Checked, portable cartridge resources. Base64 chunks survive the text editor
// and are decoded as companion files, never compiled into the ARM image.
const crypto=require('node:crypto');
async function read(archive,manifest){
 const entries=manifest?.settings?.romResources||[];
 if(!Array.isArray(entries)||entries.length>4)throw Error('Invalid project resource list');
 const output=[];let total=0;
 for(const item of entries){
  require('./project-build.cjs').relative(item.name);
  if(item.name.includes('/')||!item.name.endsWith('.tns')||!Number.isSafeInteger(item.size)||item.size<1||item.size>128*1024*1024||!Array.isArray(item.chunks)||!item.chunks.length||item.chunks.length>16||!/^[a-f0-9]{64}$/i.test(item.sha256))throw Error('Invalid project resource');
  const chunks=[];let size=0;
  for(const name of item.chunks){require('./project-build.cjs').relative(name);const file=archive.file(name);if(!file||file._data?.uncompressedSize>12*1024*1024)throw Error('Missing or oversized resource chunk');const text=await file.async('string');if(text.length>12*1024*1024||text.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw Error('Invalid base64 resource chunk');const bytes=Buffer.from(text,'base64');size+=bytes.length;if(size>item.size)throw Error('Resource size mismatch');chunks.push(bytes);}
  const bytes=Buffer.concat(chunks);total+=size;if(size!==item.size||total>128*1024*1024||crypto.createHash('sha256').update(bytes).digest('hex')!==item.sha256)throw Error('Resource integrity mismatch');
  output.push({name:item.name,bytes:new Uint8Array(bytes)});
 }
 return output;
}
module.exports={read};
