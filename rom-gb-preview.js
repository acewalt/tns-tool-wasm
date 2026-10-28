(() => {
 const pending=new Map(),stopping=new Map();
 function start(bytes,update,hash){
  const worker=new Worker(new URL('./rom-gb-preview-worker.js',document.baseURI));let ended=false,timer=null,resolveStop=()=>{};
  const persist=data=>{if(!window.TnsDesktop?.saveRomRam)return;const job=(pending.get(hash)||Promise.resolve()).catch(()=>{}).then(()=>window.TnsDesktop.saveRomRam({hash,bytes:data}));pending.set(hash,job);job.catch(e=>update({stage:'running',logs:['Save error: '+e.message]}));};
  worker.onmessage=({data})=>{if(data.type==='save'){persist(data.bytes);return;}if(data.type==='saved'&&ended){clearTimeout(timer);worker.terminate();(pending.get(hash)||Promise.resolve()).catch(()=>{}).then(resolveStop);return;}if(!ended&&data.stage)update(data);};
  worker.onerror=event=>{event.preventDefault();if(!ended)update({stage:'error',error:event.message});worker.terminate();};
  (async()=>{try{await stopping.get(hash);await pending.get(hash)?.catch(()=>{});const save=await window.TnsDesktop?.loadRomRam?.(hash);if(ended)return;const base=new URL('./__desktop/rom/',document.baseURI);worker.postMessage({type:'start',bytes,save,engine:new URL('binjgb.js',base).href,wasm:new URL('binjgb.wasm',base).href});}catch(e){if(!ended)update({stage:'error',error:e.message});}})();
  return{stop(){if(ended)return;ended=true;stopping.set(hash,new Promise(resolve=>{resolveStop=resolve;}));worker.postMessage({type:'save'});timer=setTimeout(()=>{worker.terminate();resolveStop();},300);},pause(value){worker.postMessage({type:'pause',value});},key(code,down){if(!ended)worker.postMessage({type:'key',code,down});}};
 }
 window.TnsGbPreview=Object.freeze({start});
})();
