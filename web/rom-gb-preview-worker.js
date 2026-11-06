/* Direct GB/GBC preview. The Ndless project remains a separate ARM build. */
let core=null,emulator=0,timer=null,paused=false,frames=0,joypad=0,lastSave=0,dirty=false;
const keys={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'start',Tab:'select',ControlLeft:'A',ControlRight:'A',ShiftLeft:'B',ShiftRight:'B'};
function save(force=false){
  if(!core||!emulator)return;
  dirty=core._emulator_was_ext_ram_updated(emulator)||dirty;
  if(!force&&(!dirty||Date.now()-lastSave<1000))return;
  const file=core._ext_ram_file_data_new(emulator),size=core._get_file_data_size(file);
  if(size&&core._emulator_write_ext_ram(emulator,file)===0){const bytes=core.HEAPU8.slice(core._get_file_data_ptr(file),core._get_file_data_ptr(file)+size);postMessage({type:'save',bytes},[bytes.buffer]);lastSave=Date.now();dirty=false;}
  core._file_data_delete(file);
}
function frame(){
  const ptr=core._get_frame_buffer_ptr(emulator),rgba=core.HEAPU8,out=new Uint8Array(153600);
  for(let y=0;y<240;y++){const sy=Math.floor(y*144/240);for(let x=0;x<266;x++){const at=ptr+(sy*160+Math.floor(x*160/266))*4,w=(rgba[at]>>3)<<11|(rgba[at+1]>>2)<<5|rgba[at+2]>>3,dest=(y*320+x+27)*2;out[dest]=w&255;out[dest+1]=w>>>8;}}
  postMessage({stage:'running',frame:out,frames},[out.buffer]);
}
function tick(){
  if(paused||!emulator)return;
  try{
    const until=core._emulator_get_ticks_f64(emulator)+70224;let event;
    do{event=core._emulator_run_until_f64(emulator,until);if(event&16)throw Error('GB/GBC invalid opcode');if(event&1){frames++;frame();}}while(!(event&4));
    save();timer=setTimeout(tick,16);
  }catch(error){postMessage({stage:'error',error:error.message});}
}
onmessage=async({data})=>{
  if(data.type==='start'){
    try{
      importScripts(data.engine);const wasmBinary=await(await fetch(data.wasm)).arrayBuffer();
      core=await Binjgb({wasmBinary,print:()=>{},printErr:()=>{}});
      const rom=new Uint8Array(data.bytes),ptr=core._malloc(rom.length);core.HEAPU8.set(rom,ptr);emulator=core._emulator_new_simple(ptr,rom.length,8000,256,0);if(!emulator)throw Error('Invalid GB/GBC cartridge');
      joypad=core._joypad_new();core._emulator_set_default_joypad_callback(emulator,joypad);
      if(data.save?.length){const file=core._ext_ram_file_data_new(emulator);if(core._get_file_data_size(file)===data.save.length){core.HEAPU8.set(data.save,core._get_file_data_ptr(file));core._emulator_read_ext_ram(emulator,file);postMessage({stage:'running',logs:['GB/GBC · Restored cartridge RAM']});}core._file_data_delete(file);}
      postMessage({stage:'running',logs:['GB/GBC · direct WebAssembly preview. Ndless project and TNS are compiled separately.']});tick();
    }catch(error){postMessage({stage:'error',error:error.message});}
  }else if(data.type==='key'&&core&&keys[data.code])core['_set_joyp_'+keys[data.code]](emulator,data.down?1:0);
  else if(data.type==='pause'){paused=!!data.value;clearTimeout(timer);if(!paused)tick();}
  else if(data.type==='save'){save(true);postMessage({type:'saved'});}
};
