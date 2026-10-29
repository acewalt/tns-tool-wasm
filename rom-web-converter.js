(()=>{
 let worker=null,id=0;const pending=new Map();
 function call(method,payload){if(!worker){worker=new Worker(new URL('./rom-web-converter-worker.js',document.baseURI));worker.onmessage=({data})=>{const job=pending.get(data.id);if(!job)return;pending.delete(data.id);data.error?job.reject(Error(data.error)):job.resolve(data.result);};worker.onerror=e=>{for(const job of pending.values())job.reject(Error(e.message||'ROM worker failed'));pending.clear();worker.terminate();worker=null;};}return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});worker.postMessage({id:key,method,payload});});}
 window.TnsRomWeb=Object.freeze({inspectRom:payload=>call('inspect',payload),convertRom:payload=>call('convert',payload),buildNdless:()=>call('build'),close(){worker?.terminate();worker=null;for(const job of pending.values())job.reject(Error('Conversor cerrado'));pending.clear();}});
})();
