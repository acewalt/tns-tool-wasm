// Run the current edited executable through the same isolated ARM preview as projects.
(() => {
  const root=window;let active=null;
  function stop(){if(!active)return;active.observer.disconnect();active.controller?.stop();active=null;}
  function mount(editor,host){
    stop();if(!host)return;const language=(document.querySelector('#language-buttons [data-lang].active')?.dataset.lang||document.documentElement.lang||'es').slice(0,2);
    const text=language==='en'?['Executable preview','Runs the current TNS, including edits in this session. Restart applies the current working copy.','Continue in desktop','Preparing current TNS…']:language==='fr'?["Aperçu de l’exécutable","Exécute le TNS actuel avec les modifications. Redémarrer applique la copie de travail.",'Continuer sur le bureau','Préparation du TNS…']:['Previsualizar ejecutable','Ejecuta el TNS actual, incluidos los cambios de esta sesión. Reiniciar aplica la copia de trabajo actual.','Continuar en escritorio','Preparando el TNS actual…'];
    host.className='ndless-executable-preview';host.innerHTML='<h3></h3><p data-binary-help></p><p data-binary-name></p><div class="ndless-executable-screen"><canvas width="320" height="240" data-binary-canvas></canvas></div><p data-preview-note></p>';
    host.querySelector('h3').textContent=text[0];host.querySelector('[data-binary-help]').textContent=text[1];host.querySelector('[data-binary-name]').textContent=editor.result.file.name;
    if(!root.TnsDesktop){const button=document.createElement('button');button.type='button';button.textContent=text[2];button.onclick=()=>root.TnsNdlessDesktopRequired?.open();host.append(button);host.querySelector('[data-preview-note]').textContent=language==='en'?'ARM executable preview requires TNS Tool Portable.':'El preview ARM de ejecutables requiere TNS Tool Portable.';return;}
    root.NdlessLivePreview.stop();
    const name=String(editor.result.file.name||'program.tns').replace(/\.tns$/i,'').replace(/[\\/]/g,'_'),project={name,target:'zehn-modern',language:'c',files:{},settings:{}};
    const controller=root.NdlessLivePreview.createPanel({workspace:host,canvas:host.querySelector('canvas'),note:host.querySelector('[data-preview-note]'),binary:true,getProject:()=>project,build:async()=>{
      const built=await editor.adapter.build();if(!root.NdlessZehn.findZehn(built.bytes)?.valid)throw Error(language==='en'?'This executable format is not supported by the ARM preview. Zehn and PRG containing Zehn are supported.':'Este formato no es compatible con el preview ARM. Se admiten Zehn y PRG que contienen Zehn.');return built;
    }});
    const observer=new MutationObserver(()=>{if(!host.isConnected||!host.querySelector('canvas'))stop();});observer.observe(host.parentNode,{childList:true});observer.observe(document.body,{childList:true});active={host,controller,observer};controller.update(project,{force:true});
  }
  root.NdlessExecutablePreview=Object.freeze({mount,stop,get state(){return active?.controller.state||null;}});
})();
