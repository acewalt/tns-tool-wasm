const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{Worker}=require('node:worker_threads'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
function pack(files){const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'ti-calculator-zip.js'),'utf8'),{window,TextEncoder,Uint8Array,Uint32Array,DataView,Date,Array,Error});return window.TnsCalculatorZip.pack(Object.entries(files).map(([name,source])=>({path:name,data:typeof source==='string'?new TextEncoder().encode(source):source})));}
async function build(name,files){return require('../../desktop/compiler.cjs').build(process.env.TNS_DESKTOP_COMPILER,{name,zip:pack(files)});}
async function preview({bytes,files=[],args,timeoutMs=25000,observe}){
 const worker=new Worker(path.join(__dirname,'ndless-preview-worker.cjs'),{workerData:{bytes,files,args}});
 const stats={frames:0,hashes:new Set(),messages:0,logs:[],elapsedMs:0},started=performance.now();
 let timer;
 try{return await new Promise((resolve,reject)=>{
  timer=setTimeout(()=>reject(Error('Preview timed out: '+JSON.stringify({...stats,lastFrame:undefined,hashes:stats.hashes.size}))),timeoutMs);
  worker.on('error',reject);
  worker.on('message',message=>{
   try{
    stats.messages++;stats.elapsedMs=Math.round(performance.now()-started);if(message.logs?.length)stats.logs=message.logs;
    if(message.frame){stats.frames++;stats.lastFrame=message.frame;stats.hashes.add(crypto.createHash('sha256').update(message.frame).digest('hex'));}
    if(message.stage==='error')throw Error(message.code+': '+message.error);
    if(observe(message,{key:(code,down)=>worker.postMessage({type:'key',code,down}),requestFiles:()=>worker.postMessage({type:'files'}),stats}))resolve(stats);
   }catch(error){reject(error);}
  });
 });}finally{clearTimeout(timer);await worker.terminate();}
}
module.exports={root,pack,build,preview};
