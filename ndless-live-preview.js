(() => {
  "use strict";
  const root=window;
  let current=null;
  const strings={
    es:{title:"Preview ARM · 320×240",auto:"Auto",pause:"Pausar / Continuar",stop:"Detener",restart:"Reiniciar",scheduled:"Código cambiado · esperando para compilar…",compiling:"Compilando la revisión actual con el SDK Ndless…",starting:"Iniciando CPU ARM aislada…",running:"Ejecutando el programa compilado",paused:"Preview en pausa",stopped:"Preview detenido",exited:"El programa terminó",error:"Error de ejecución",'compile-error':"Error de compilación",help:"C/C++ y ARM compilados; pantalla RGB565 y teclado. Haz clic en la pantalla para usar las teclas. Las APIs de SO no soportadas muestran un error. No emula todo el sistema TI-Nspire.",desktop:"El preview ejecutable requiere la versión de escritorio y su compilador Ndless.",timeout:"El motor ARM dejó de responder. Se detuvo sin bloquear el editor."},
    en:{title:"ARM Preview · 320×240",auto:"Auto",pause:"Pause / Resume",stop:"Stop",restart:"Restart",scheduled:"Code changed · waiting to compile…",compiling:"Compiling the current revision with the Ndless SDK…",starting:"Starting isolated ARM CPU…",running:"Running the compiled program",paused:"Preview paused",stopped:"Preview stopped",exited:"The program exited",error:"Runtime error",'compile-error':"Compilation error",help:"Compiled C/C++ and ARM; RGB565 screen and keyboard. Click the screen to use keys. Unsupported OS APIs report an error. Does not emulate the entire TI-Nspire OS.",desktop:"Executable preview requires the desktop version and its Ndless compiler.",timeout:"The ARM engine stopped responding. It was terminated without blocking the editor."},
    fr:{title:"Aperçu ARM · 320×240",auto:"Auto",pause:"Pause / Reprendre",stop:"Arrêter",restart:"Redémarrer",scheduled:"Code modifié · en attente de compilation…",compiling:"Compilation de la révision actuelle avec le SDK Ndless…",starting:"Démarrage du CPU ARM isolé…",running:"Exécution du programme compilé",paused:"Aperçu en pause",stopped:"Aperçu arrêté",exited:"Le programme est terminé",error:"Erreur d'exécution",'compile-error':"Erreur de compilation",help:"C/C++ et ARM compilés ; écran RGB565 et clavier. Cliquez sur l'écran pour utiliser les touches. Les API du système non prises en charge signalent une erreur. Ne simule pas tout le système TI-Nspire.",desktop:"L'aperçu exécutable nécessite la version de bureau et son compilateur Ndless.",timeout:"Le moteur ARM ne répond plus. Il a été arrêté sans bloquer l'éditeur."}
  };
  function tr(key){const lang=document.querySelector('#language-buttons [data-lang].active')?.dataset.lang||document.documentElement.lang;return(strings[lang]||strings.es)[key]||key;}
  function clear(canvas){canvas.width=320;canvas.height=240;const ctx=canvas.getContext("2d");ctx.fillStyle="#111827";ctx.fillRect(0,0,320,240);}
  function paint(canvas,bytes){if(bytes.length!==153600)throw new Error("Invalid RGB565 frame.");const ctx=canvas.getContext("2d"),img=ctx.createImageData(320,240);for(let i=0;i<76800;i++){const w=bytes[i*2]|bytes[i*2+1]<<8,p=i*4;img.data[p]=(w>>>11)*255/31;img.data[p+1]=((w>>>5)&63)*255/63;img.data[p+2]=(w&31)*255/31;img.data[p+3]=255;}ctx.putImageData(img,0,0);}
  function createRunner(artifact,onUpdate,files){
    const worker=new Worker(new URL('./ndless-arm-preview-worker.js',document.baseURI));
    let timer=null,ended=false,paused=false;
    const armWatchdog=(ms=5000)=>{clearTimeout(timer);timer=setTimeout(()=>{if(ended||paused)return;end();onUpdate({stage:"error",error:tr("timeout"),code:"NDLESS_ARM_TIMEOUT"});},ms);};
    function end(){if(ended)return;ended=true;clearTimeout(timer);worker.terminate();}
    worker.onmessage=({data})=>{if(ended)return;if(data.stage==="error"||data.stage==="exited")end();else if(!paused)armWatchdog();onUpdate(data);};
    worker.onerror=event=>{event.preventDefault();end();onUpdate({stage:"error",error:event.message||"Worker failed."});};
    armWatchdog(20000);
    const base=new URL('./__desktop/unicorn/',document.baseURI);
    worker.postMessage({type:"start",bytes:artifact.bytes,files,engine:new URL('unicorn.js',base).href,wasm:new URL('unicorn.wasm',base).href});
    return{stop:end,pause(value){if(ended)return;paused=value;clearTimeout(timer);worker.postMessage({type:"pause",value});if(!value)armWatchdog();},key(code,down){if(!ended)worker.postMessage({type:"key",code,down});}};
  }
  function mount(workspace,canvas,note){
    stop();
    workspace.querySelector('[data-arm-ui]')?.remove();
    const box=document.createElement('div');box.className='ndless-live-preview-controls';
    box.innerHTML='<div class="ndless-live-buttons"><label><input type="checkbox" data-live-auto checked> <span></span></label><button type="button" data-live-pause></button><button type="button" data-live-stop></button><button type="button" data-live-restart></button></div><div class="ndless-live-keys"></div><pre data-live-log hidden></pre>';
    box.querySelector('label span').textContent=tr('auto');
    for(const key of ['pause','stop','restart'])box.querySelector('[data-live-'+key+']').textContent=tr(key);
    const label=workspace.querySelector('[data-project-pane="preview"] h3');if(label)label.textContent=tr('title');
    note.after(box);canvas.tabIndex=0;canvas.setAttribute('aria-label',tr('title'));
    const auto=box.querySelector('[data-live-auto]'),log=box.querySelector('[data-live-log]');
    const item={workspace,canvas,note,box,session:null,auto,logs:[],stage:'scheduled',held:new Set()};current=item;
    item.session=root.NdlessLiveSession.create({
      async build(project){
        if(!root.TnsDesktop?.buildNdless)throw new Error(tr('desktop'));
        const bridge=root.NdlessLocalBridge;if(!bridge?.build)throw new Error('Ndless compiler is not ready.');
        return bridge.build({...project,target:'zehn-modern',files:{...project.files}});
      },
      run(artifact,update,project){return createRunner(artifact,update,Object.entries(project.files||{}));},
      onUpdate(info){
        if(current!==item||!canvas.isConnected)return;
        item.stage=info.stage;item.revision=info.revision;
        if(info.clear){clear(canvas);log.hidden=true;log.textContent='';}
        if(info.frame)paint(canvas,info.frame);
        if(info.logs?.length){log.hidden=false;log.textContent=info.logs.join('\n');}
        const detail=info.error?': '+info.error:info.frames?' · '+info.frames+' frames':'';
        note.textContent=tr(info.stage)+detail;note.dataset.previewStage=info.stage;
        note.title=tr('help');
        box.querySelector('[data-live-pause]').disabled=!['running','paused'].includes(info.stage);
      }
    });
    box.querySelector('[data-live-pause]').onclick=()=>item.session.pause();
    box.querySelector('[data-live-stop]').onclick=()=>{auto.checked=false;item.session.stop();};
    box.querySelector('[data-live-restart]').onclick=()=>render(root.NdlessProjectWorkspace.getProject(),{workspace,canvas,note,force:true});
    auto.onchange=()=>auto.checked?render(root.NdlessProjectWorkspace.getProject(),{workspace,canvas,note,force:true}):item.session.stop();
    const sendKey=(code,down)=>{if(down)item.held.add(code);else item.held.delete(code);item.session.key(code,down);};
    canvas.addEventListener('keydown',e=>{if(root.NdlessArmRuntime.KEYMAP[e.code]){e.preventDefault();e.stopPropagation();sendKey(e.code,true);}});
    canvas.addEventListener('keyup',e=>{if(root.NdlessArmRuntime.KEYMAP[e.code]){e.preventDefault();e.stopPropagation();sendKey(e.code,false);}});
    canvas.addEventListener('blur',()=>{for(const code of item.held)sendKey(code,false);});
    for(const [code,label] of [['ArrowLeft','←'],['ArrowUp','↑'],['ArrowDown','↓'],['ArrowRight','→'],['Enter','Enter'],['Space','Space'],['Escape','Esc']]){
      const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.previewKey=code;
      b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);sendKey(code,true);};
      b.onpointerup=b.onpointercancel=()=>sendKey(code,false);box.querySelector('.ndless-live-keys').append(b);
    }
    const help=document.createElement('p');help.textContent=tr('help');help.className='ndless-live-help';box.append(help);
    return item;
  }
  function render(project,{workspace,canvas,note,force=false}){
    if(!project||!canvas||!workspace)return;
    const item=current?.workspace===workspace?current:mount(workspace,canvas,note);
    if(item.auto.checked||force)item.session.update(project,{force});
  }
  function stop(){if(current){current.session?.stop();current.box.remove();current=null;}}
  root.NdlessLivePreview=Object.freeze({render,stop,get state(){return current?{...current.session.state,stage:current.stage}:null;}});
  const ws=document.querySelector('.ndless-project-workspace');if(ws){const p=root.NdlessProjectWorkspace?.getProject?.();render(p,{workspace:ws,canvas:ws.querySelector('[data-ndless-project-canvas]'),note:ws.querySelector('[data-preview-note]')});}
})();
