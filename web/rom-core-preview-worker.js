/* Direct SNES/GBA core runner. Source projects still preview their actual ARM build. */
let core=null,timer=null,paused=false,ready=false,frames=0,held=0,lastSave=0,previousSave=null;
const keys={ArrowUp:0,ArrowDown:1,ArrowLeft:2,ArrowRight:3,ControlLeft:4,ControlRight:4,ShiftLeft:5,ShiftRight:5,KeyX:6,Delete:7,Tab:8,KeyR:9,Enter:10,Minus:11,Digit8:16,Digit2:17,Digit4:18,Digit6:19};
keys.KeyI=20;keys.KeyK=21;keys.KeyJ=22;keys.KeyL=23;keys.Escape=8;
const pressed=new Set();
function save(force=false){
 if(!ready||!core)return;
 if(!force&&Date.now()-lastSave<1000)return;
 const size=core._tns_save_size(),ptr=core._tns_save();if(!size)return;if(size>1024*1024||!ptr)throw Error('Invalid cartridge save buffer');
 const bytes=core.HEAPU8.slice(ptr,ptr+size);lastSave=Date.now();
 if(previousSave&&previousSave.length===size&&bytes.every((n,i)=>n===previousSave[i]))return;
 previousSave=bytes.slice();postMessage({type:'save',bytes},[bytes.buffer]);
}
function tick(){
 if(paused||!ready)return;const start=performance.now();
 try{let count=core._tns_step(held),slices=1;while(Number.isFinite(count)&&count===frames&&slices++<32&&performance.now()-start<8)count=core._tns_step(held);frames=Number.isFinite(count)?count:frames+1;const ptr=core._tns_pixels(),out=core.HEAPU8.slice(ptr,ptr+153600);postMessage({stage:'running',frame:out,frames},[out.buffer]);save();timer=setTimeout(tick,Math.max(0,1000/60-(performance.now()-start)));}
 catch(error){ready=false;postMessage({stage:'error',error:error.message});}
}
onmessage=async({data})=>{
 if(data.type==='start'){
  try{
   if(!['nes','snes','gba','nds','n64'].includes(data.system))throw Error('Unsupported preview core');
   importScripts(data.engine);const wasmBinary=await(await fetch(data.wasm)).arrayBuffer();
   core=await TnsRomCore({wasmBinary,print:s=>postMessage({stage:'running',logs:[s]}),printErr:s=>postMessage({stage:'running',logs:[s]})});
   const rom=new Uint8Array(data.bytes),ptr=core._malloc(rom.length);if(!ptr)throw Error('Not enough preview memory');core.HEAPU8.set(rom,ptr);
   const result=core._tns_load(ptr,rom.length);if(result)throw Error('Cartridge initialization failed: '+result);ready=true;
   const size=core._tns_save_size();if(data.save?.length&&core._tns_restore_save){const ptr=core._malloc(data.save.length);core.HEAPU8.set(data.save,ptr);core._tns_restore_save(ptr,data.save.length);core._free(ptr);previousSave=new Uint8Array(data.save);}else if(data.save?.length===size&&size){core.HEAPU8.set(data.save,core._tns_save());previousSave=new Uint8Array(data.save);}
   postMessage({stage:'running',logs:[data.system.toUpperCase()+' · Direct cartridge preview. The editable Ndless project is compiled separately.']});tick();
  }catch(error){postMessage({stage:'error',error:error.message});}
 }else if(data.type==='key'&&Object.hasOwn(keys,data.code)){
  if(data.down)pressed.add(data.code);else pressed.delete(data.code);held=0;for(const code of pressed)held|=1<<keys[code];
 }else if(data.type==='pause'){paused=!!data.value;clearTimeout(timer);if(!paused)tick();}
 else if(data.type==='touch'&&ready&&core._tns_touch)core._tns_touch(data.x,data.y,data.down?1:0);
 else if(data.type==='save'){try{save(true);}finally{postMessage({type:'saved'});}}
};
