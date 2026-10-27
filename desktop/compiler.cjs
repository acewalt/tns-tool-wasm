// Call the verified, bundled self-contained Ndless compiler directly.
// No shell, localhost build service, launcher, or download at runtime.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const MAX_ZIP = 32 * 1024 * 1024;
const MAX_RESULT = 64 * 1024 * 1024;
const COMPILER_NAME = 'TNS-Tool-Compiler-Windows-x64.exe';
const safeName = value => {
  const name=String(value || 'ndless-app').replace(/[^A-Za-z0-9._-]/g,'-').slice(0,80).replace(/^[-.]+/,'');
  return name || 'ndless-app';
};
function compilerPath(resourcesPath, override) {
  return override || path.join(resourcesPath,'compiler',COMPILER_NAME);
}
function run(exe,args,timeoutMs=180000) {
  return new Promise((resolve,reject)=>{
    const child=spawn(exe,args,{windowsHide:true,stdio:['ignore','pipe','pipe'],shell:false});
    let out='',err='',ended=false;
    const timer=setTimeout(()=>{ child.kill(); finish(new Error('Tiempo límite del compilador agotado.')); },timeoutMs);
    function finish(error,value) {
      if(ended)return;
      ended=true;clearTimeout(timer);
      if(error)reject(error);else resolve(value);
    }
    child.on('error',finish);
    for(const [stream,key] of [[child.stdout,'stdout'],[child.stderr,'stderr']]){
      stream.on('data',chunk=>{
        const data=chunk.toString('utf8');
        if(key==='stdout')out=(out+data).slice(-120000);
        else err=(err+data).slice(-120000);
      });
    }
    child.on('close',(code,signal)=>code===0?finish(null,{stdout:out,stderr:err}):
      finish(new Error((err || out || 'El compilador terminó con error')+' (código '+code+', señal '+signal+')')));
  });
}
async function status(exe) {
  try {
    await fs.access(exe);
    const {stdout}=await run(exe,['--status-json'],20000);
    const info=JSON.parse(stdout.trim());
    const manifest=await fs.readFile(path.join(path.dirname(exe),'runtime','sdk-manifest.json'),'utf8').then(JSON.parse).catch(()=>null);
    return { connected:true,compiler:true,protocol:2,platform:'windows',
      version:info.version || 'unknown',toolchainReady:info.toolchainReady===true,
      toolchain:manifest?'GNU ARM + official Ndless target libraries':info.toolchain || 'GNU ARM + Ndless',
      sdk:manifest,selfContained:true,transport:'native-ipc',
      missing:info.missing || [],desktop:true };
  } catch(error) {
    return { connected:false,toolchainReady:false,desktop:true,platform:'windows',protocol:2,
      missing:[error.message],message:'El compilador Ndless integrado no está disponible.' };
  }
}
function zehnInfo(bytes){
  if(bytes.length<32 || bytes.subarray(0,4).toString('ascii')!=='Zehn' || bytes.readUInt32LE(4)!==1)
    throw new Error('El resultado no tiene una cabecera Zehn v1 válida.');
  const fileSize=bytes.readUInt32LE(8),relocs=bytes.readUInt32LE(12),flags=bytes.readUInt32LE(16);
  const meta=32+4*(relocs+flags)+bytes.readUInt32LE(20),alloc=bytes.readUInt32LE(24);
  if(fileSize!==bytes.length || meta>fileSize || alloc<fileSize)
    throw new Error('El resultado Zehn está truncado o tiene tamaños incoherentes.');
  return {compressed:relocs>0 && (bytes.readUInt32LE(32)&255)===3};
}
function packagePrg(zehn,loader){
  zehnInfo(zehn);
  if(loader.length<8 || loader.length%4 || loader.length>=20*1024 ||
      !loader.subarray(0,4).equals(Buffer.from([80,82,71,0])))
    throw new Error('El cargador PRG oficial falta o no es válido.');
  return Buffer.concat([loader,zehn]);
}
async function build(exe,payload) {
  if(!payload || typeof payload !== 'object') throw new Error('Proyecto Ndless inválido.');
  const name=safeName(payload.name);
  const zip=Buffer.from(payload.zip || []);
  if(!zip.length || zip.length>MAX_ZIP || zip.subarray(0,2).toString()!=='PK')
    throw new Error('ZIP del proyecto inválido o superior a 32 MiB.');
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'tns-desktop-'));
  const input=path.join(temp,'project.zip'),output=path.join(temp,name+'.tns');
  try {
    await fs.writeFile(input,zip,{flag:'wx'});
    const result=await run(exe,['--build-zip',input,output,name],180000);
    const stat=await fs.stat(output);
    if(!stat.size || stat.size>MAX_RESULT) throw new Error('El compilador devolvió un archivo vacío o demasiado grande.');
    const zehn=await fs.readFile(output),info=zehnInfo(zehn);
    const loaderName=info.compressed?'zehn_loader_compressed.tns':'zehn_loader.tns';
    const loader=await fs.readFile(path.join(path.dirname(exe),'runtime','ndless','tools','zehn_loader',loaderName));
    const bytes=packagePrg(zehn,loader);
    return {ok:true,filename:name+'.tns',bytes:new Uint8Array(bytes),
      logs:[...result.stderr.split(/\r?\n/).filter(Boolean),'Packaged using official '+loaderName],
      toolchain:'GNU ARM + official Ndless target libraries',format:'prg-zehn',engine:'desktop'};
  } finally { await fs.rm(temp,{recursive:true,force:true}); }
}
module.exports={compilerPath,status,build,safeName,zehnInfo,packagePrg};
