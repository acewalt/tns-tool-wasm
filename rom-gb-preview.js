(() => {
 const browserStorage={
  async loadRomRam(hash){const text=localStorage.getItem('tns-rom-save:'+hash);return text?Uint8Array.from(atob(text),c=>c.charCodeAt(0)):null;},
  async saveRomRam({hash,bytes}){if(!/^[a-f0-9]{40}$/.test(hash)||bytes.length>1024*1024)throw Error('Invalid save');let text='';for(let p=0;p<bytes.length;p+=32768)text+=String.fromCharCode(...bytes.subarray(p,p+32768));localStorage.setItem('tns-rom-save:'+hash,btoa(text));}
 };
 const storage=()=>window.TnsDesktop||browserStorage;
 const pending=new Map(),stopping=new Map();
 function start(bytes,update,hash,system='gb',canvas=null){
  if(!['nes','gb','snes','gba','nds','n64'].includes(system))throw Error('Unsupported direct ROM core');
  const worker=new Worker(new URL((system==='gb'?'./rom-gb-preview-worker.js':'./rom-core-preview-worker.js')+'?v=20261029-usb-rom-v21',document.baseURI));let ended=false,timer=null,watchdog=null,paused=false,resolveStop=()=>{};
  const watch=(ms=10000)=>{clearTimeout(watchdog);if(ended||paused)return;watchdog=setTimeout(()=>{ended=true;worker.terminate();update({stage:'error',error:'El núcleo dejó de responder; reinicia el preview para volver a intentarlo.'});},ms);};watch(30000);
  const persist=data=>{const job=(pending.get(hash)||Promise.resolve()).catch(()=>{}).then(()=>storage().saveRomRam({hash,bytes:data}));pending.set(hash,job);job.catch(e=>update({stage:'running',logs:['Save error: '+e.message]}));};
  worker.onmessage=({data})=>{if(data.type==='save'){persist(data.bytes);return;}if(data.type==='saved'&&ended){clearTimeout(timer);worker.terminate();(pending.get(hash)||Promise.resolve()).catch(()=>{}).then(resolveStop);return;}if(!ended&&data.stage){if(data.stage==='error')clearTimeout(watchdog);else watch();update(data);}};
  worker.onerror=event=>{event.preventDefault();if(!ended)update({stage:'error',error:event.message});worker.terminate();};
  (async()=>{try{await stopping.get(hash);await pending.get(hash)?.catch(()=>{});const save=await storage().loadRomRam(hash);if(ended)return;const base=new URL(window.TnsDesktop?'./__desktop/rom/':'./assets/rom/',document.baseURI),asset=system==='gb'?'binjgb':system+'-preview';worker.postMessage({type:'start',bytes,save,system,engine:new URL(asset+'.js?v=20261029-usb-rom-v21',base).href,wasm:new URL(asset+'.wasm?v=20261029-usb-rom-v21',base).href});}catch(e){if(!ended)update({stage:'error',error:e.message});}})();
  const pointer=event=>{const box=canvas.getBoundingClientRect(),down=event.type==='pointerdown'||event.type==='pointermove'&&event.buttons===1;if(event.type==='pointerdown'&&event.isTrusted)canvas.setPointerCapture?.(event.pointerId);worker.postMessage({type:'touch',x:Math.floor((event.clientX-box.left)*320/box.width),y:Math.floor((event.clientY-box.top)*240/box.height),down});event.preventDefault();};
  if(system==='nds'&&canvas)for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])canvas.addEventListener(type,pointer);
  return{stop(){clearTimeout(watchdog);if(system==='nds'&&canvas)for(const type of ['pointerdown','pointermove','pointerup','pointercancel'])canvas.removeEventListener(type,pointer);if(ended)return;ended=true;stopping.set(hash,new Promise(resolve=>{resolveStop=resolve;}));worker.postMessage({type:'save'});timer=setTimeout(()=>{worker.terminate();resolveStop();},300);},pause(value){paused=value;clearTimeout(watchdog);worker.postMessage({type:'pause',value});if(!paused)watch();},key(code,down){if(!ended)worker.postMessage({type:'key',code,down});}};
 }
 window.TnsGbPreview=Object.freeze({start});
})();
