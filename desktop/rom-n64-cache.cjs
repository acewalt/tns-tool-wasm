// Resolve the emulator's OS function signatures once on the PC. This cache is
// generated from the selected cartridge and stays in its exported project.
const {Worker,isMainThread,parentPort,workerData}=require('node:worker_threads');
if(!isMainThread)(async()=>{const c=await require('./rom-core.cjs').load('n64',{print:()=>{},printErr:()=>{}},workerData.vendor),b=workerData.bytes,p=c._malloc(b.length);c.HEAPU8.set(b,p);if(c._tns_load(p,b.length))return parentPort.postMessage(null);for(let i=0;i<1200;i++){c._tns_step(0);try{const bytes=c.FS.readFile('/documents/SaveGames/Cache/embedded.hle.tns');if(bytes.length&&bytes.length<65536){parentPort.postMessage(bytes);return;}}catch{}}parentPort.postMessage(null);})().catch(()=>parentPort.postMessage(null));
async function create(bytes,vendor){return new Promise(resolve=>{const worker=new Worker(__filename,{workerData:{bytes,vendor}});let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);worker.terminate();resolve(value);},timer=setTimeout(()=>finish(null),15000);worker.on('message',finish);worker.on('error',()=>finish(null));worker.on('exit',()=>finish(null));});}
module.exports={create};
