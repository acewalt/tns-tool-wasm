// DOM-free latest-revision coordinator. Also used by the stress suite.
(() => {
  const root=typeof window!=="undefined"?window:globalThis;
  function snapshot(project) {
    const copy=structuredClone(project);
    const files=Object.keys(copy.files||{}).sort().map(name=>[name,copy.files[name]]);
    const key=JSON.stringify([copy.name,copy.target,copy.language,copy.settings||{},files]);
    return {project:copy,key};
  }
  function create({build,run,onUpdate=()=>{},debounceMs=650,setTimer=setTimeout,clearTimer=clearTimeout}) {
    let revision=0,wanted=null,timer=null,building=false,runner=null,ready=false,paused=false;
    function emit(stage,extra={}){onUpdate({stage,revision,paused,...extra});}
    function discardRunner(){runner?.stop();runner=null;paused=false;}
    async function drain(){
      if(building||!ready||!wanted)return;
      const job=wanted,id=revision;building=true;ready=false;emit("compiling");
      try{
        const artifact=await build(job.project);
        if(id!==revision||wanted!==job)return;
        if(!artifact?.bytes?.length)throw new Error("The compiler returned no executable.");
        emit("starting");
        runner=run(artifact,message=>{
          if(id!==revision||wanted!==job)return;
          if(paused&&message.stage==="running")return;
          if(message.stage==="error"){discardRunner();emit("error",{...message,clear:true});}
          else emit(message.stage||"running",message);
        },job.project);
      }catch(error){if(id===revision)emit("compile-error",{error:String(error.message||error),clear:true});}
      finally{building=false;if(ready)void drain();}
    }
    function update(project,{force=false}={}){
      const next=snapshot(project);
      if(!force&&wanted?.key===next.key)return revision;
      revision++;wanted=next;ready=false;discardRunner();clearTimer(timer);
      emit("scheduled",{clear:true,queued:building});
      timer=setTimer(()=>{ready=true;void drain();},debounceMs);
      return revision;
    }
    function stop(){revision++;wanted=null;ready=false;clearTimer(timer);discardRunner();emit("stopped",{clear:true});}
    return Object.freeze({update,stop,pause(){if(!runner)return;paused=!paused;runner.pause(paused);emit(paused?"paused":"running");},key(code,down){runner?.key(code,down);},get state(){return{revision,building,paused,key:wanted?.key||null};}});
  }
  root.NdlessLiveSession=Object.freeze({create,snapshot});
})();
