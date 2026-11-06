import {createPrgmPreview,formatPrgmValue} from './src/prgm/runtime.js?v=20261105-sonar-runtime-v32';
import {renderPrgmGraphics} from './src/prgm/drawing.js?v=20261105-sonar-runtime-v32';

const COPY={
  es:{title:'Preview Prgm',note:'Simulación TI-BASIC · entradas, texto y dibujos CX II.',run:'Ejecutar',pause:'Pausar',step:'Paso',stop:'Detener',restart:'Reiniciar / actualizar',expand:'Vista ampliada',normal:'Tamaño calculadora',close:'Cerrar',variables:'Variables',empty:'Todavía no hay valores.',copy:'Copiar salida',copied:'Salida copiada.',ok:'OK',cancel:'Cancelar',done:'Hecho',line:'Línea',ready:'Listo',waiting:'Esperando entrada',paused:'Pausado',running:'Ejecutando',stopped:'Detenido',error:'Error',support:'Cobertura del preview',help:'Prgm sin parámetros; Local, Disp, DispAt, Request/RequestStr, If/ElseIf, For, While, Loop, asignaciones, listas y matemáticas numéricas. ClrIO se omite para conservar el historial TI-Nspire. Dibujo CX II: líneas, formas, texto, colores, ventana y buffer. El dibujo se abre sobre la calculadora; al terminar, una tecla vuelve al historial. No reproduce CAS simbólico, unidades ni funciones externas; las instrucciones no soportadas se indican con su línea.',keys:'Enter: aceptar · Esc: cancelar entrada · ↑/↓: desplazar salida',angle:'Ángulos (reinicia)',request:'Entrada del programa',viewLine:'Ver línea en editor'},
  en:{title:'Prgm Preview',note:'TI-BASIC simulation · input, text and CX II drawing.',run:'Run',pause:'Pause',step:'Step',stop:'Stop',restart:'Restart / refresh',expand:'Expanded view',normal:'Calculator size',close:'Close',variables:'Variables',empty:'No values yet.',copy:'Copy output',copied:'Output copied.',ok:'OK',cancel:'Cancel',done:'Done',line:'Line',ready:'Ready',waiting:'Waiting for input',paused:'Paused',running:'Running',stopped:'Stopped',error:'Error',support:'Preview coverage',help:'Prgm without parameters; Local, Disp, DispAt, Request/RequestStr, If/ElseIf, For, While, Loop, assignments, lists and numerical math. ClrIO is ignored to preserve TI-Nspire history. CX II drawing includes lines, shapes, text, colors, windows and buffers. Drawing opens above Calculator; after completion any key returns to its history. Symbolic CAS, units and external functions are not simulated; unsupported instructions report their line.',keys:'Enter: accept · Esc: cancel input · ↑/↓: scroll output',angle:'Angles (restarts)',request:'Program input',viewLine:'Show line in editor'},
  fr:{title:'Aperçu Prgm',note:'Simulation TI-BASIC · saisie, texte et dessins CX II.',run:'Exécuter',pause:'Pause',step:'Pas',stop:'Arrêter',restart:'Recommencer / actualiser',expand:'Vue agrandie',normal:'Taille calculatrice',close:'Fermer',variables:'Variables',empty:'Aucune valeur.',copy:'Copier la sortie',copied:'Sortie copiée.',ok:'OK',cancel:'Annuler',done:'Terminé',line:'Ligne',ready:'Prêt',waiting:'Saisie attendue',paused:'En pause',running:'En cours',stopped:'Arrêté',error:'Erreur',support:'Fonctions simulées',help:'Prgm sans paramètres ; Local, Disp, DispAt, Request/RequestStr, If/ElseIf, For, While, Loop, affectations, listes et calcul numérique. ClrIO est ignoré pour conserver l’historique TI-Nspire. Le dessin CX II comprend lignes, formes, texte, couleurs, fenêtres et tampons. Une touche revient aux résultats de Calculs après la fin. Le CAS symbolique, les unités et les fonctions externes ne sont pas simulés ; les instructions non prises en charge indiquent leur ligne.',keys:'Entrée : valider · Échap : annuler · ↑/↓ : défiler',angle:'Angles (redémarre)',request:'Saisie du programme',viewLine:'Voir la ligne dans l’éditeur'}
};
let active=null;
const HISTORY_COPY={es:'Limpiar historial',en:'Clear history',fr:'Effacer l’historique'};
const GRAPHICS_COPY={es:{show:'Ver dibujo',hint:'Pulsa una tecla para volver a la calculadora',running:'Ejecutando…',finished:'Terminado',stopped:'Detenido'},en:{show:'Show drawing',hint:'Press any key to return to Calculator',running:'Running…',finished:'Finished',stopped:'Stopped'},fr:{show:'Voir le dessin',hint:'Appuyez sur une touche pour revenir à Calculs',running:'En cours…',finished:'Terminé',stopped:'Arrêté'}};
const KEYBOARD_COPY={es:{title:'Teclado del programa',hint:'Usa tu teclado · T, números, Enter y Esc se envían al programa.',waiting:'Esperando tecla'},en:{title:'Program keyboard',hint:'Use your keyboard · T, digits, Enter and Esc are sent to the program.',waiting:'Waiting for a key'},fr:{title:'Clavier du programme',hint:'Utilisez le clavier · T, chiffres, Entrée et Échap sont transmis au programme.',waiting:'Touche attendue'}};
function open(initial,options={}) {
  active?.close();
  const language=document.documentElement.lang?.slice(0,2),t=COPY[language]||COPY.es,g=GRAPHICS_COPY[language]||GRAPHICS_COPY.es,k=KEYBOARD_COPY[language]||KEYBOARD_COPY.es;
  const previous=document.activeElement;
  const overlay=options.createBackdrop?.('prgm-preview-overlay')||document.createElement('div');overlay.classList.add('prgm-preview-overlay');
  // Only constant markup is parsed as HTML; source, prompts and output use textContent.
  overlay.innerHTML=`<section class="prgm-preview-modal" role="dialog" aria-modal="true" aria-labelledby="prgm-preview-title" tabindex="-1">
    <header class="prgm-preview-heading"><div><span class="prgm-preview-eyebrow">TI-NSPIRE · TI-BASIC</span><h2 id="prgm-preview-title"></h2><p data-note></p></div><div class="prgm-preview-top"><button data-expand class="green-tool-button" aria-pressed="false"></button><button data-close></button></div></header>
    <div class="prgm-preview-workspace">
      <aside class="prgm-preview-controls"><button data-run class="green-tool-button"></button><button data-step></button><button data-stop></button><button data-restart></button><button data-clear-history disabled></button><div class="prgm-preview-pad"><button data-scroll="-1" aria-label="Scroll up">↑</button><button data-scroll="1" aria-label="Scroll down">↓</button><button data-enter>Enter</button><button data-escape>Esc</button></div><label class="prgm-preview-angle"><span data-angle-label></span><select data-angle><option>RAD</option><option>DEG</option></select></label><small data-keys></small></aside>
      <main class="prgm-preview-center"><div class="prgm-preview-size-label">320 × 240</div><div class="prgm-preview-screen-shell"><div class="prgm-preview-screen">
        <div class="prgm-preview-chrome"></div>
        <div class="prgm-preview-history" tabindex="0" aria-label="Calculator output"><div data-previous-runs></div><div class="prgm-preview-entry" data-current-entry><div class="prgm-preview-call" data-call></div><div data-output></div><div class="prgm-preview-finish" data-finish hidden></div></div></div>
        <form class="prgm-preview-request" role="group" data-request hidden><div class="prgm-preview-request-row"><label for="prgm-preview-input" data-prompt></label><input id="prgm-preview-input" data-input autocomplete="off" spellcheck="false" maxlength="2048"></div><div class="prgm-preview-request-buttons"><button type="submit" data-ok></button><button type="button" data-cancel></button></div></form>
        <div class="prgm-preview-graphics" data-graphics hidden tabindex="0" role="img"><div class="prgm-preview-graphics-heading" data-graphics-heading></div><canvas width="318" height="212" data-graphics-canvas></canvas></div>
      </div></div><div class="prgm-preview-status" role="status" data-status></div><div class="prgm-preview-error" role="alert" data-error hidden></div></main>
      <aside class="prgm-preview-inspector"><button data-copy></button><button data-line></button><button data-show-graphics hidden></button><h3 data-variables-title></h3><div class="prgm-preview-vars" data-variables></div></aside>
    </div><details class="prgm-preview-support"><summary data-support></summary><p data-help></p><ul data-warnings></ul></details>
  </section>`;
  const $=selector=>overlay.querySelector(selector), modal=$('.prgm-preview-modal');
  for(const [selector,value] of Object.entries({'#prgm-preview-title':t.title,'[data-note]':t.note,'[data-expand]':t.expand,'[data-close]':t.close,'[data-run]':t.run,'[data-step]':t.step,'[data-stop]':t.stop,'[data-restart]':t.restart,'[data-angle-label]':t.angle,'[data-keys]':t.keys,'[data-copy]':t.copy,'[data-line]':t.viewLine,'[data-variables-title]':t.variables,'[data-ok]':t.ok,'[data-cancel]':t.cancel,'[data-support]':t.support,'[data-help]':t.help}))$(selector).textContent=value;
  $('[data-clear-history]').textContent=HISTORY_COPY[language]||HISTORY_COPY.es;
  const keyboard=document.createElement('div');keyboard.className='prgm-preview-keyboard';keyboard.dataset.keyboard='';keyboard.hidden=true;
  const keyboardTitle=document.createElement('strong');keyboardTitle.textContent=k.title;keyboard.append(keyboardTitle);
  const keyboardPad=document.createElement('div');keyboardPad.className='prgm-preview-key-grid';
  for(const value of ['7','8','9','4','5','6','1','2','3','t','0','del']){const button=document.createElement('button');button.type='button';button.dataset.programKey=value;button.textContent=value==='del'?'⌫':value.toUpperCase();button.onclick=()=>sendProgramKey(value);keyboardPad.append(button);}
  keyboard.append(keyboardPad);$('.prgm-preview-controls').append(keyboard);
  $('[data-show-graphics]').textContent=g.show;$('[data-graphics]').setAttribute('aria-label',g.hint);$('[data-graphics]').title=g.hint;
  $('[data-request]').setAttribute('aria-label',t.request);
  document.body.append(overlay);const oldOverflow=document.body.style.overflow;
  if(!overlay.__documentPreviewRestore)overlay.__documentPreviewRestore=()=>{document.body.style.overflow=oldOverflow;previous?.focus();};
  document.body.style.overflow='hidden';
  let runtime=null, snapshot=null, timer=null, automatic=false, expanded=Boolean(options.expanded), closed=false, requestToken='', renderedText='', inputResolved=false, data=initial,graphicsDismissed=false,graphicsRevision=-1;
  modal.classList.toggle('expanded', expanded);
  $('[data-expand]').textContent=expanded?t.normal:t.expand;
  $('[data-expand]').setAttribute('aria-pressed',String(expanded));
  const tabOptions={...(options.pageNavigation||{items:[{file:initial.file||'Problem1.xml',path:initial.path||'/prob/card[1]/wdgt',name:initial.name}],selected:0}),onSelect:next=>{if(closed)return;close({switching:true});options.pageNavigation?.onSelect(next,{expanded});}};
  window.TnsDocumentPreviewNavigation?.mountChrome($('.prgm-preview-chrome'),{...tabOptions,title:initial.documentName||initial.name||'documento',mode:'RAD',onClose:()=>close()});
  if(options.pageNavigation){
    const expandedTabs=window.TnsDocumentPreviewNavigation?.createTabs(tabOptions);
    if(expandedTabs){expandedTabs.classList.add('document-preview-expanded-tabs');$('.prgm-preview-top').prepend(expandedTabs);}
  }
  const history=$('.prgm-preview-history'), output=$('[data-output]'), shell=$('.prgm-preview-screen-shell'), previousRuns=$('[data-previous-runs]'), currentEntry=$('[data-current-entry]');
  function archiveRun(){
    if(!snapshot?.executed)return;
    const entry=document.createElement('div');entry.className='prgm-preview-entry prgm-preview-previous-entry';
    const call=document.createElement('div');call.className='prgm-preview-call';call.textContent=snapshot.name+'()';entry.append(call);
    for(const row of snapshot.output){const line=document.createElement('div');line.className='prgm-preview-output-row '+row.kind;line.textContent=row.text||'\u00a0';entry.append(line);}
    const finish=document.createElement('div');finish.className='prgm-preview-finish';finish.textContent=snapshot.error?.message||(snapshot.status==='done'?t.done:t.stopped);entry.append(finish);
    previousRuns.append(entry);
    let rows=[...previousRuns.children].reduce((sum,run)=>sum+run.childElementCount,0);
    while(previousRuns.children.length>20||rows>1000){const first=previousRuns.firstElementChild;rows-=first.childElementCount;first.remove();}
    $('[data-clear-history]').disabled=!previousRuns.childElementCount;
  }
  function layoutOutput(){
    // The calculator stages the first pending Request's output at the dialog's
    // left edge. Once that input is resolved, the transcript uses its usual
    // document margin, including at later Requests. Keep the same row nodes.
    const initialInput=Boolean(snapshot?.pending&&!inputResolved);
    const changed=history.classList.contains('prgm-preview-first-input')!==initialInput;
    history.classList.toggle('prgm-preview-first-input',initialInput);
    if(initialInput){
      const left=$('[data-request]').getBoundingClientRect().left-output.getBoundingClientRect().left;
      history.style.setProperty('--prgm-initial-output-left',Math.max(8,left)+'px');
    }else history.style.removeProperty('--prgm-initial-output-left');
    // Stage a short first-run entry at the bottom of the calculator viewport
    // even on an empty page. Prior output is optional, never a prerequisite
    // for placing the menu below Request. Expanded view keeps normal flow.
    currentEntry.style.paddingTop='0px';
    if(initialInput&&!expanded&&output.childElementCount){
      const style=getComputedStyle(history);
      const available=history.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
      currentEntry.style.paddingTop=Math.max(0,available-previousRuns.offsetHeight-currentEntry.offsetHeight)+'px';
    }
    return changed;
  }
  function layout(){
    const shared=window.TnsPreviewWindow?.geometry(modal);
    const available=shared?.width||$('.prgm-preview-center').clientWidth;
    const width=Math.max(1,Math.min(expanded?800:320,available));
    const height=shared?.height||(expanded?width*3/4:240);
    const bottom=history.scrollHeight-history.clientHeight-history.scrollTop<2;
    shell.style.width=width+'px';shell.style.height=height+'px';
    shell.style.setProperty('--prgm-graphics-scale',String(Math.min(width/320,height/240)));
    $('.prgm-preview-size-label').textContent=Math.round(width)+' × '+Math.round(height);
    layoutOutput();
    if(bottom)history.scrollTop=history.scrollHeight;
  }
  const resize=new ResizeObserver(layout);resize.observe($('.prgm-preview-center'));window.addEventListener('resize',layout);
  function close(state={}){if(closed)return;closed=true;overlay.__previewWindowCleanup?.();delete overlay.__previewWindowCleanup;clearTimeout(timer);runtime?.stop();resize.disconnect();window.removeEventListener('resize',layout);document.removeEventListener('keydown',keys,true);if(!state?.switching){overlay.remove();overlay.__documentPreviewRestore?.();delete overlay.__documentPreviewRestore;}if(active?.close===close)active=null;}
  function followOutput(){
    // Follow the latest result only when it is outside the viewport. Keeping
    // existing row nodes also preserves selection and avoids scroll anchoring jumps.
    const target=$('[data-finish]').hidden?(output.lastElementChild||$('[data-call]')):$('[data-finish]');
    if(!target)return;
    const edge=target.getBoundingClientRect().bottom-history.getBoundingClientRect().top+history.scrollTop+parseFloat(getComputedStyle(history).paddingBottom);
    if(edge>history.scrollTop+history.clientHeight)history.scrollTop=edge-history.clientHeight;
  }
  function render(state,inputError=null){
    const changed=renderedText!==state.text||snapshot?.status!==state.status;
    snapshot=state;const request=state.pending;
    const graphics=state.graphics,graphicsVisible=Boolean(graphics?.active&&!graphicsDismissed);
    $('[data-graphics]').hidden=!graphicsVisible;
    $('[data-show-graphics]').hidden=!graphics?.active;
    if(graphicsVisible){
      $('[data-graphics-heading]').textContent=['done','error'].includes(state.status)?g.finished:state.status==='stopped'?g.stopped:g.running;
      if(graphicsRevision!==graphics.revision){renderPrgmGraphics($('[data-graphics-canvas]').getContext('2d'),graphics);graphicsRevision=graphics.revision;}
    }
    window.TnsDocumentPreviewNavigation?.updateChrome($('.prgm-preview-chrome'),{title:data.documentName||data.name||'documento',mode:state.angleMode});$('[data-call]').textContent=state.name+'()';
    if(renderedText!==state.text){
      while(output.children.length>state.output.length)output.lastElementChild.remove();
      state.output.forEach((row,index)=>{
        let el=output.children[index];
        if(!el){el=document.createElement('div');output.append(el);}
        const text=row.text||'\u00a0', kind='prgm-preview-output-row '+row.kind;
        if(el.textContent!==text)el.textContent=text;
        if(el.className!==kind)el.className=kind;
      });
      renderedText=state.text;
    }
    $('[data-finish]').hidden=!['done','stopped','error'].includes(state.status);$('[data-finish]').textContent=state.error?state.error.message:state.status==='done'?t.done:t.stopped;
    const error=inputError||state.error;$('[data-error]').hidden=!error;$('[data-error]').textContent=error?`${t.line} ${error.line||state.line} · ${error.message}`:'';
    $('[data-request]').hidden=!request;
    if(request){$('[data-prompt]').textContent=request.prompt;const token=state.executed+':'+request.line;if(requestToken!==token){requestToken=token;$('[data-input]').value='';$('[data-input]').focus({preventScroll:true});}}
    else requestToken='';
    const layoutChanged=layoutOutput();
    if(changed||layoutChanged)followOutput();
    const status=automatic&&state.status==='paused'?'running':state.status;
    $('[data-status]').textContent=`${state.keyWaiting?k.waiting:t[status]||status} · ${t.line} ${state.line||1}`;
    $('[data-run]').textContent=automatic?t.pause:t.run;$('[data-run]').disabled=['waiting','done','error','stopped'].includes(state.status);
    $('[data-step]').disabled=automatic||['waiting','done','error','stopped'].includes(state.status);$('[data-stop]').disabled=['done','error','stopped'].includes(state.status);
    const programKeys=Boolean(state.keyPolling&&['paused','ready'].includes(state.status)&&!request);
    modal.classList.toggle('prgm-preview-interactive',programKeys);
    keyboard.hidden=!programKeys;$('[data-keys]').textContent=programKeys?k.hint:t.keys;
    $('[data-graphics]').title=programKeys?k.hint:g.hint;
    $('[data-enter]').disabled=!request&&!programKeys&&!(graphicsVisible&&['done','error','stopped'].includes(state.status));$('[data-escape]').disabled=$('[data-enter]').disabled;
    $('[data-line]').disabled=!options.revealLine;
    const vars=$('[data-variables]');vars.replaceChildren();
    if(!Object.keys(state.variables).length){const empty=document.createElement('p');empty.textContent=t.empty;vars.append(empty);}
    for(const [name,value] of Object.entries(state.variables)){const row=document.createElement('div'),label=document.createElement('code'),result=document.createElement('span');label.textContent=name;result.textContent=formatPrgmValue(value);row.append(label,result);vars.append(row);}
    const warnings=$('[data-warnings]');warnings.replaceChildren();
    if(state.warnings.length){const row=document.createElement('li');row.textContent='ClrIO · '+state.warnings.map(w=>w.line).join(', ');warnings.append(row);}
    if(['waiting','done','error','stopped'].includes(state.status))automatic=false;
  }
  function tick(){if(closed||!automatic)return;const state=runtime.run(250);if(state.status!=='paused')automatic=false;render(state);if(automatic)timer=setTimeout(tick,state.keyWaiting?100:state.waitRemainingMs?Math.min(50,state.waitRemainingMs):runtime.frameYield?16:0);}
  function run(){clearTimeout(timer);automatic=true;tick();}
  function rasterizeGraphics(state){const canvas=document.createElement('canvas');canvas.width=state.width;canvas.height=state.height;const context=canvas.getContext('2d');renderPrgmGraphics(context,state);return context.getImageData(0,0,state.width,state.height).data;}
  function restart(){clearTimeout(timer);automatic=false;archiveRun();data=options.readSource?.()||initial;renderedText='\0';requestToken='';inputResolved=false;graphicsDismissed=false;graphicsRevision=-1;runtime=createPrgmPreview(data.source,{name:data.name,parameters:data.parameters||'',angleMode:$('[data-angle]').value,interactive:true,maxDrawingOperations:1000,rasterizeGraphics});render(runtime.snapshot());run();}
  function sendProgramKey(name){if(!runtime?.sendKey||!snapshot?.keyPolling||!['paused','ready'].includes(snapshot.status)||runtime.pending)return false;const resume=automatic||snapshot.keyWaiting;render(runtime.sendKey(name));if(resume)run();return true;}
  function dismissGraphics(){if($('[data-graphics]').hidden||!['done','error','stopped'].includes(snapshot.status))return false;graphicsDismissed=true;render(runtime.snapshot());history.focus({preventScroll:true});return true;}
  function answer(cancel=false){if(!runtime?.pending)return;const state=runtime.answer($('[data-input]').value,{cancel});if(state.inputError){render(state,state.inputError);$('[data-input]').focus({preventScroll:true});return;}inputResolved=true;run();}
  function scroll(direction){$('.prgm-preview-history').scrollBy({top:direction*48,behavior:'smooth'});}
  function keys(event){
    if(!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.target.closest?.('input,select,textarea,summary')&&!(event.target.closest?.('button:not([data-program-key])')&&event.key==='Enter')){
      const name=({Escape:'esc',Enter:'enter',ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Backspace:'del',Delete:'del',' ':'space'})[event.key]||(event.key.length===1?event.key.toLowerCase():null);
      if(name&&sendProgramKey(name)){event.preventDefault();event.stopImmediatePropagation();return;}
    }
    if(event.key!=='Tab'&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.target.closest?.('button,select,summary')&&dismissGraphics()){event.preventDefault();event.stopImmediatePropagation();return;}
    if(event.key==='Escape'&&dismissGraphics()){event.preventDefault();event.stopImmediatePropagation();return;}
    if(event.key==='Tab'){const controls=[...modal.querySelectorAll('button:not(:disabled),input:not([hidden]),select,summary,[tabindex="0"]')].filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}return;}
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(runtime.pending)answer(true);else close();}
    else if(['ArrowUp','ArrowDown'].includes(event.key)&&!['INPUT','SELECT'].includes(event.target.tagName)){event.preventDefault();event.stopImmediatePropagation();scroll(event.key==='ArrowUp'?-1:1);}
    else if(event.key==='Enter'&&runtime.pending&&!['BUTTON','SELECT'].includes(event.target.tagName)){event.preventDefault();event.stopImmediatePropagation();answer();}
  }
  $('[data-close]').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close();};
  $('[data-expand]').onclick=()=>{expanded=!expanded;modal.classList.toggle('expanded',expanded);$('[data-expand]').textContent=expanded?t.normal:t.expand;$('[data-expand]').setAttribute('aria-pressed',String(expanded));layout();};
  $('[data-run]').onclick=()=>{if(automatic){automatic=false;clearTimeout(timer);render(runtime.snapshot());}else run();};
  $('[data-step]').onclick=()=>{automatic=false;clearTimeout(timer);render(runtime.step());};
  $('[data-stop]').onclick=()=>{automatic=false;clearTimeout(timer);render(runtime.stop());};
  $('[data-restart]').onclick=restart;$('[data-angle]').onchange=restart;
  $('[data-clear-history]').onclick=()=>{previousRuns.replaceChildren();$('[data-clear-history]').disabled=true;history.scrollTop=0;layoutOutput();followOutput();};
  $('[data-request]').onsubmit=e=>{e.preventDefault();e.stopPropagation();answer();};$('[data-cancel]').onclick=()=>answer(true);
  $('[data-enter]').onclick=()=>{if(!sendProgramKey('enter')&&!dismissGraphics())answer();};$('[data-escape]').onclick=()=>{if(!sendProgramKey('esc')&&!dismissGraphics())answer(true);};
  $('[data-show-graphics]').onclick=()=>{graphicsDismissed=false;graphicsRevision=-1;render(runtime.snapshot());$('[data-graphics]').focus({preventScroll:true});};
  overlay.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>{if(!sendProgramKey(Number(b.dataset.scroll)<0?'up':'down'))scroll(Number(b.dataset.scroll));});
  $('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(snapshot.text);$('[data-status]').textContent=t.copied;}catch(error){$('[data-error]').hidden=false;$('[data-error]').textContent=error.message;}};
  $('[data-line]').onclick=()=>options.revealLine?.(snapshot.error?.line||snapshot.pending?.line||snapshot.line);
  window.TnsPreviewWindow?.mount(overlay,{...options,pageNavigation:tabOptions,onResize:()=>layout()});
  document.addEventListener('keydown',keys,true);modal.focus();active={close,getSnapshot:()=>runtime.snapshot(),sendKey:sendProgramKey};layout();restart();return active;
}
window.TnsPrgmPreview=Object.freeze({open,close:()=>active?.close(),getSnapshot:()=>active?.getSnapshot()||null});
