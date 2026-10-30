const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
function create(root){
 const directory=path.join(root,'rom-saves');
 const file=hash=>{if(!/^[a-f0-9]{40}$/.test(hash))throw Error('Invalid ROM save identity');return path.join(directory,hash+'.sav');};
 return{
  async load(hash){const target=file(hash);try{const stat=await fs.stat(target);if(stat.size>1024*1024)throw Error('ROM save exceeds 1 MiB');return new Uint8Array(await fs.readFile(target));}catch(error){if(error.code==='ENOENT')return null;throw error;}},
  async save({hash,bytes}){const target=file(hash);if(!(bytes instanceof Uint8Array)||bytes.length>1024*1024)throw Error('Invalid ROM save');await fs.mkdir(directory,{recursive:true});const temporary=path.join(directory,hash+'.'+crypto.randomUUID()+'.tmp');try{await fs.writeFile(temporary,bytes,{flag:'wx'});await fs.rename(temporary,target);}finally{await fs.rm(temporary,{force:true});}return{ok:true};}
 };
}
module.exports={create};
