// Install the bundled SDK once into a short, versioned per-user cache.
// Only the compiler bridge calls this; opening the app does not unpack the SDK.
const fs=require('node:fs/promises');
const {createReadStream}=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createHash}=require('node:crypto');
const {createGunzip}=require('node:zlib');
const MAGIC=Buffer.from('TNS-SDK-1\n');
const jobs=new Map();
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
async function fileHash(filename){
  const digest=createHash('sha256');
  for await(const chunk of createReadStream(filename))digest.update(chunk);
  return digest.digest('hex');
}
function safeEntry(root,name){
  if(typeof name!=='string'||!name||/[\\:<>"|?*\x00-\x1f]/.test(name)||name.startsWith('/')||
      name.split('/').some(part=>!part||part==='.'||part==='..'||/[. ]$/.test(part)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(part)))
    throw Error('Ruta no válida en el SDK.');
  const target=path.resolve(root,...name.split('/'));
  if(!target.startsWith(root+path.sep))throw Error('Ruta fuera del SDK.');
  if(process.platform==='win32'&&target.length>245)throw Error('La ruta de caché del SDK es demasiado larga.');
  return target;
}
async function unpack(bundle,root,manifest){
  const input=createReadStream(bundle),stream=input.pipe(createGunzip());
  // Forward source errors to the async iterator as well as decompression errors.
  input.on('error',error=>stream.destroy(error));
  const iterator=stream[Symbol.asyncIterator]();let pending=Buffer.alloc(0);
  async function read(size){
    const chunks=[];let left=size;
    while(left){
      if(!pending.length){const next=await iterator.next();if(next.done)throw Error('SDK comprimido truncado.');pending=next.value;}
      const count=Math.min(left,pending.length);chunks.push(pending.subarray(0,count));
      pending=pending.subarray(count);left-=count;
    }
    return chunks.length===1?chunks[0]:Buffer.concat(chunks,size);
  }
  try{
    if(!(await read(MAGIC.length)).equals(MAGIC))throw Error('Formato de SDK no válido.');
    const length=(await read(4)).readUInt32LE();
    if(length>8*1024*1024)throw Error('Índice del SDK demasiado grande.');
    const entries=JSON.parse((await read(length)).toString('utf8'));
    if(!Array.isArray(entries)||entries.length!==manifest.files||entries.length>10000)throw Error('Índice del SDK no válido.');
    const seen=new Set();let total=0;
    // Validate every name and size before writing any payload.
    for(const entry of entries){
      safeEntry(root,entry.path);
      const key=entry.path.toLowerCase();
      if(seen.has(key)||!Number.isSafeInteger(entry.size)||entry.size<0||entry.size>128*1024*1024||!/^[a-f0-9]{64}$/.test(entry.sha256))
        throw Error('Entrada del SDK no válida.');
      seen.add(key);total+=entry.size;
    }
    if(total!==manifest.unpackedBytes||total>1024*1024*1024)throw Error('Tamaño del SDK no válido.');
    for(const entry of entries){
      const content=await read(entry.size);
      if(hash(content)!==entry.sha256)throw Error('Archivo del SDK dañado: '+entry.path);
      const target=safeEntry(root,entry.path);
      await fs.mkdir(path.dirname(target),{recursive:true});
      await fs.writeFile(target,content,{flag:'wx'});
    }
    if(pending.length||!(await iterator.next()).done)throw Error('Datos adicionales en el SDK.');
  }finally{stream.destroy();input.destroy();}
}
async function prepare(exe,cacheRoot){
  const source=path.dirname(exe),bundle=path.join(source,'sdk.bin.gz');
  // Developer/compiler overrides can still use an unpacked, verified runtime.
  try{await fs.access(bundle);}catch(error){if(error.code==='ENOENT')return exe;throw error;}
  const manifest=JSON.parse(await fs.readFile(path.join(source,'sdk.json'),'utf8'));
  if(manifest.format!==1||!['sha256','compilerSha256'].every(key=>/^[a-f0-9]{64}$/.test(manifest[key])))
    throw Error('Manifiesto del SDK no válido.');
  const base=path.resolve(cacheRoot||path.join(process.env.LOCALAPPDATA||os.tmpdir(),'TNS','sdk'));
  const id=hash(Buffer.from(manifest.sha256+manifest.compilerSha256)).slice(0,16);
  const destination=path.join(base,id),ready=path.join(destination,'ready.json');
  const cached=path.join(destination,path.basename(exe));
  const marker=JSON.stringify({bundle:manifest.sha256,compiler:manifest.compilerSha256});
  try{
    if(await fs.readFile(ready,'utf8')===marker){
      await fs.access(path.join(destination,'runtime','sdk-manifest.json'));
      if(await fileHash(cached)===manifest.compilerSha256)return cached;
      throw Error('El compilador en caché está dañado.');
    }
    throw Error('La caché del SDK no es válida.');
  }catch(error){if(error.code!=='ENOENT')throw error;}
  if(await fileHash(bundle)!==manifest.sha256||await fileHash(exe)!==manifest.compilerSha256)
    throw Error('La copia del SDK integrado está dañada. Vuelve a extraer el portable.');
  await fs.mkdir(base,{recursive:true});
  const stage=await fs.mkdtemp(path.join(base,id+'-'));
  try{
    await unpack(bundle,path.join(stage,'runtime'),manifest);
    await fs.copyFile(exe,path.join(stage,path.basename(exe)));
    await fs.writeFile(path.join(stage,'ready.json'),marker,{flag:'wx'});
    try{await fs.rename(stage,destination);}
    catch(error){
      // Another process may have finished the identical SDK in parallel.
      if(!['EEXIST','ENOTEMPTY','EPERM'].includes(error.code)||await fs.readFile(ready,'utf8').catch(()=>null)!==marker)throw error;
    }
    return cached;
  }finally{await fs.rm(stage,{recursive:true,force:true});}
}
function ensureRuntime(exe,cacheRoot){
  const key=path.resolve(exe)+'\0'+(cacheRoot||'');
  if(!jobs.has(key))jobs.set(key,prepare(exe,cacheRoot).catch(error=>{jobs.delete(key);throw error;}));
  return jobs.get(key);
}
module.exports={ensureRuntime,safeEntry,unpack};
