/* Isolated CPU: never run user ARM code on the editor's UI thread. */
"use strict";
// The existing Zehn loader also serves classic browser scripts.
globalThis.window=globalThis;
let machine=null,paused=false,started=false,lastFrame=0,lastHeartbeat=0,tickTimer=null,lastHash=null,unchanged=0,steps=0;
const send=(value,transfer=[])=>postMessage(value,transfer);
function failure(error){
  paused=true;clearTimeout(tickTimer);
  let pc=0;try{pc=machine.e.reg_read_i32(machine.uc.ARM_REG_PC)>>>0;}catch(_){}
  send({stage:"error",error:String(error.message||error),code:error.code||"NDLESS_ARM_ERROR",pc,syscall:error.syscall});
}
function tick(){
  tickTimer=null;
  if(paused||!machine)return;
  try{
    const state=NdlessArmRuntime.step(machine,{milliseconds:12,instructions:100000});
    steps++;
    if(state.dialog){send({stage:"dialog",dialog:state.dialog,logs:machine.kernel.logs.slice(-25)});return;}
    const now=performance.now();
    if(now-lastFrame>=40||state.exited){
      lastFrame=now;
      const frame=NdlessArmRuntime.currentFramebuffer(machine);
      if(frame){
        let hash=2166136261,lit=false;for(const value of frame.bytes){hash=Math.imul(hash^value,16777619)>>>0;if(value)lit=true;}
        unchanged=hash===lastHash&&lit?unchanged+1:0;
        if(hash!==lastHash||state.exited){lastHash=hash;machine.frames++;send({stage:state.exited?"exited":"running",frame:frame.bytes,pc:state.pc,frames:machine.frames,exitCode:state.exitCode,logs:machine.kernel.logs.slice(-25)},[frame.bytes.buffer]);}
      }
    }
    if(now-lastHeartbeat>500){lastHeartbeat=now;send({stage:state.exited?"exited":"running",pc:state.pc,frames:machine.frames,steps,syscalls:machine.syscallCount,logs:machine.kernel.logs.slice(-25)});}
    if(state.exited){paused=true;return;}
    // Static output can still mean expensive computation (Doom texture loading).
    // Coalesce identical frames, but do not throttle the guest based on pixels.
    tickTimer=setTimeout(tick,4);
  }catch(error){failure(error);}
}
onmessage=async({data})=>{
  try{
    if(data.type==="start"){
      if(started)throw new Error("A preview worker can start only one revision.");
      started=true;
      globalThis.NdlessUnicornAssets={wasm:data.wasm};
      importScripts(data.engine,"./ndless-zehn.js","./ndless-zehn-stream-fix.js","./ndless-arm-runtime-v2.js");
      const smoke=await NdlessArmRuntime.smokeTest();if(!smoke.ok)throw new Error("ARM CPU self-test failed.");
      for(const [name,value] of data.files||[]){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;if(bytes instanceof Uint8Array)NdlessArmRuntime.mountVirtualFile('/documents/'+name,bytes,{writable:false});}
      const args=data.args||["/documents/preview.tns"];
      NdlessArmRuntime.mountVirtualFile(args[0],data.bytes,{writable:false});
      machine=await NdlessArmRuntime.createMachine(data.bytes,{args});
      send({stage:"running",frames:0});tick();
    }else if(data.type==="pause"){
      const was=paused;paused=!!data.value;if(paused){clearTimeout(tickTimer);tickTimer=null;}else if(was)tick();
    }else if(data.type==="key"&&machine)NdlessArmRuntime.setKey(machine,data.code,!!data.down);
    else if(data.type==="dialog"&&machine){if(NdlessArmRuntime.respondDialog(machine,data.id,data.value)&&!paused)tick();}
    else if(data.type==="files"&&machine){const files=NdlessArmRuntime.listVirtualFiles().filter(f=>f.writable).map(f=>({path:f.path,bytes:NdlessArmRuntime.getVirtualFile(f.path).bytes}));send({type:"files",files});}
  }catch(error){failure(error);}
};
