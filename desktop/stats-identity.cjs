const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const validId=value=>typeof value==='string' && /^[A-Za-z0-9_-]{16,80}$/.test(value);

function persistentVisitorId(userData){
  let pending;
  return ()=>pending ||= (async()=>{
    const directory=path.join(userData,'tns-tool');
    const filename=path.join(directory,'stats-identity.json');
    await fs.mkdir(directory,{recursive:true});
    const read=async()=>{
      const data=JSON.parse(await fs.readFile(filename,'utf8'));
      if(!validId(data.visitorId))throw Error('Invalid persistent statistics identity');
      return data.visitorId;
    };
    try{return await read();}
    catch(error){if(error.code!=='ENOENT')throw error;}
    const visitorId=randomUUID();
    try{await fs.writeFile(filename,JSON.stringify({visitorId}),{flag:'wx',mode:0o600});}
    catch(error){if(error.code==='EEXIST')return read();throw error;}
    return visitorId;
  })();
}
module.exports={persistentVisitorId};
