import {createPrgmPreview,formatPrgmValue} from './src/prgm/runtime.js?v=20261027-prgm-layout-v2';

const COPY={
  es:{title:'Preview Prgm',note:'Simulación numérica TI-BASIC · entradas, menús y salida de texto.',run:'Ejecutar',pause:'Pausar',step:'Paso',stop:'Detener',restart:'Reiniciar / actualizar',expand:'Vista ampliada',normal:'Tamaño calculadora',close:'Cerrar',variables:'Variables',empty:'Todavía no hay valores.',copy:'Copiar salida',copied:'Salida copiada.',ok:'OK',cancel:'Cancelar',done:'Hecho',line:'Línea',ready:'Listo',waiting:'Esperando entrada',paused:'Pausado',running:'Ejecutando',stopped:'Detenido',error:'Error',support:'Cobertura del preview',help:'Prgm sin parámetros; Local, Disp, DispAt, Request/RequestStr, If/ElseIf, For, While, Loop, asignaciones, listas y matemáticas numéricas. ClrIO se omite para conservar el historial TI-Nspire. No reproduce CAS simbólico, unidades, gráficos ni funciones externas; las instrucciones no soportadas se indican con su línea.',keys:'Enter: aceptar · Esc: cancelar entrada · ↑/↓: desplazar salida',angle:'Ángulos (reinicia)',request:'Entrada del programa',viewLine:'Ver línea en editor'},
  en:{title:'Prgm Preview',note:'TI-BASIC numerical simulation · input, menus and text output.',run:'Run',pause:'Pause',step:'Step',stop:'Stop',restart:'Restart / refresh',expand:'Expanded view',normal:'Calculator size',close:'Close',variables:'Variables',empty:'No values yet.',copy:'Copy output',copied:'Output copied.',ok:'OK',cancel:'Cancel',done:'Done',line:'Line',ready:'Ready',waiting:'Waiting for input',paused:'Paused',running:'Running',stopped:'Stopped',error:'Error',support:'Preview coverage',help:'Prgm without parameters; Local, Disp, DispAt, Request/RequestStr, If/ElseIf, For, While, Loop, assignments, lists and numerical math. ClrIO is ignored to preserve TI-Nspire history. Symbolic CAS, units, graphics and external functions are not simulated; unsupported instructions report their line.',keys:'Enter: accept · Esc: cancel input · ↑/↓: scroll output',angle:'Angles (restarts)',request:'Program input',viewLine:'Show line in editor'},
  fr:{title:'Aperçu Prgm',note:'Simulation numérique TI-BASIC · saisie, menus et sortie texte.',run:'Exécuter',pause:'Pause',step:'Pas',stop:'Arrêter',restart:'Recommencer / actualiser',expand:'Vue agrandie',normal:'Taille calculatrice',close:'Fermer',variables:'Variables',empty:'Aucune valeur.',copy:'Copier la sortie',copied:'Sortie copiée.',ok:'OK',cancel:'Annuler',done:'Terminé',line:'Ligne',ready:'Prêt',waiting:'Saisie attendue',paused:'En pause',running:'En cours',stopped:'Arrêté',error:'Erreur',support:'Fonctions simulées',help:'Prgm sans paramètres ; Local, Disp, DispAt, Request/RequestStr, If/ElseIf, For, While, Loop, affectations, listes et calcul numérique. ClrIO est ignoré pour conserver l’historique TI-Nspire. Le CAS symbolique, les unités, les graphiques et les fonctions externes ne sont pas simulés ; les instructions non prises en charge indiquent leur ligne.',keys:'Entrée : valider · Échap : annuler · ↑/↓ : défiler',angle:'Angles (redémarre)',request:'Saisie du programme',viewLine:'Voir la ligne dans l’éditeur'}
};
let active=null;
function open(initial,options={}) {
  active?.close();
  const t=COPY[document.documentElement.lang?.slice(0,2)]||COPY.es;
  const previous=document.activeElement;
  const overlay=document.createElement('div');overlay.className='prgm-preview-overlay';
  // Only constant markup is parsed as HTML; source, prompts and output use textContent.
  overlay.innerHTML=`<section class="prgm-preview-modal" role="dialog" aria-modal="true" aria-labelledby="prgm-preview-title" tabindex="-1">
    <header class="prgm-preview-heading"><div><span class="prgm-preview-eyebrow">TI-NSPIRE · TI-BASIC</span><h2 id="prgm-preview-title"></h2><p data-note></p></div><div class="prgm-preview-top"><button data-expand class="green-tool-button" aria-pressed="false"></button><button data-close></button></div></header>
    <div class="prgm-preview-workspace">
      <aside class="prgm-preview-controls"><button data-run class="green-tool-button"></button><button data-step></button><button data-stop></button><button data-restart></button><div class="prgm-preview-pad"><button data-scroll="-1" aria-label="Scroll up">↑</button><button data-scroll="1" aria-label="Scroll down">↓</button><button data-enter>Enter</button><button data-escape>Esc</button></div><label class="prgm-preview-angle"><span data-angle-label></span><select data-angle><option>RAD</option><option>DEG</option></select></label><small data-keys></small></aside>
      <main class="prgm-preview-center"><div class="prgm-preview-size-label">320 × 240</div><div class="prgm-preview-screen-shell"><div class="prgm-preview-screen">
        <div class="prgm-preview-chrome"><span class="prgm-preview-tabs"><span>1.1</span><b>1.2</b></span><span data-document></span><span data-mode>RAD</span><span class="prgm-preview-battery" aria-hidden="true">▰</span><span aria-hidden="true">×</span></div>
        <div class="prgm-preview-history" tabindex="0" aria-label="Calculator output"><div class="prgm-preview-call" data-call></div><div data-output></div><div class="prgm-preview-finish" data-finish hidden></div></div>
        <form class="prgm-preview-request" role="group" data-request hidden><div class="prgm-preview-request-row"><label for="prgm-preview-input" data-prompt></label><input id="prgm-preview-input" data-input autocomplete="off" spellcheck="false" maxlength="2048"></div><div class="prgm-preview-request-buttons"><button type="submit" data-ok></button><button type="button" data-cancel></button></div></form>
      </div></div><div class="prgm-preview-status" role="status" data-status></div><div class="prgm-preview-error" role="alert" data-error hidden></div></main>
      <aside class="prgm-preview-inspector"><button data-copy></button><button data-line></button><h3 data-variables-title></h3><div class="prgm-preview-vars" data-variables></div></aside>
    </div><details class="prgm-preview-support"><summary data-support></summary><p data-help></p><ul data-warnings></ul></details>
  </section>`;
  const $=selector=>overlay.querySelector(selector), modal=$('.prgm-preview-modal');
  for(const [selector,value] of Object.entries({'#prgm-preview-title':t.title,'[data-note]':t.note,'[data-expand]':t.expand,'[data-close]':t.close,'[data-run]':t.run,'[data-step]':t.step,'[data-stop]':t.stop,'[data-restart]':t.restart,'[data-angle-label]':t.angle,'[data-keys]':t.keys,'[data-copy]':t.copy,'[data-line]':t.viewLine,'[data-variables-title]':t.variables,'[data-ok]':t.ok,'[data-cancel]':t.cancel,'[data-support]':t.support,'[data-help]':t.help}))$(selector).textContent=value;
  $('[data-request]').setAttribute('aria-label',t.request);
  document.body.append(overlay);const oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  let runtime=null, snapshot=null, timer=null, automatic=false, expanded=false, closed=false, requestToken='', renderedText='', data=initial;
  const history=$('.prgm-preview-history'), output=$('[data-output]'), shell=$('.prgm-preview-screen-shell');
  function layout(){
    const available=$('.prgm-preview-center').clientWidth;
    const width=Math.max(1,Math.min(expanded?800:320,available));
    const height=expanded?width*3/4:240;
    const bottom=history.scrollHeight-history.clientHeight-history.scrollTop<2;
    shell.style.width=width+'px';shell.style.height=height+'px';
    $('.prgm-preview-size-label').textContent=Math.round(width)+' × '+Math.round(height);
    if(bottom)history.scrollTop=history.scrollHeight;
  }
  const resize=new ResizeObserver(layout);resize.observe($('.prgm-preview-center'));window.addEventListener('resize',layout);
  function close(){if(closed)return;closed=true;clearTimeout(timer);runtime?.stop();resize.disconnect();window.removeEventListener('resize',layout);document.removeEventListener('keydown',keys,true);overlay.remove();document.body.style.overflow=oldOverflow;previous?.focus();if(active?.close===close)active=null;}
  function followOutput(){
    // Follow the latest result only when it is outside the viewport. Keeping
    // existing row nodes also preserves selection and avoids scroll anchoring jumps.
    const target=$('[data-finish]').hidden?output.lastElementChild:$('[data-finish]');
    if(!target)return;
    const edge=target.getBoundingClientRect().bottom-history.getBoundingClientRect().top+history.scrollTop;
    if(edge>history.scrollTop+history.clientHeight)history.scrollTop=edge-history.clientHeight;
  }
  function render(state,inputError=null){
    const changed=renderedText!==state.text||snapshot?.status!==state.status;
    snapshot=state;const request=state.pending;
    $('[data-document]').textContent=(data.documentName||data.name||'documento').replace(/\.tns$/i,'').slice(0,30);
    $('[data-mode]').textContent=state.angleMode;$('[data-call]').textContent=state.name+'()';
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
    if(changed)followOutput();
    const error=inputError||state.error;$('[data-error]').hidden=!error;$('[data-error]').textContent=error?`${t.line} ${error.line||state.line} · ${error.message}`:'';
    $('[data-request]').hidden=!request;
    if(request){$('[data-prompt]').textContent=request.prompt;const token=state.executed+':'+request.line;if(requestToken!==token){requestToken=token;$('[data-input]').value='';$('[data-input]').focus({preventScroll:true});}}
    else requestToken='';
    const status=automatic&&state.status==='paused'?'running':state.status;
    $('[data-status]').textContent=`${t[status]||status} · ${t.line} ${state.line||1}`;
    $('[data-run]').textContent=automatic?t.pause:t.run;$('[data-run]').disabled=['waiting','done','error','stopped'].includes(state.status);
    $('[data-step]').disabled=automatic||['waiting','done','error','stopped'].includes(state.status);$('[data-stop]').disabled=['done','error','stopped'].includes(state.status);
    $('[data-enter]').disabled=!request;$('[data-escape]').disabled=!request;
    $('[data-line]').disabled=!options.revealLine;
    const vars=$('[data-variables]');vars.replaceChildren();
    if(!Object.keys(state.variables).length){const empty=document.createElement('p');empty.textContent=t.empty;vars.append(empty);}
    for(const [name,value] of Object.entries(state.variables)){const row=document.createElement('div'),label=document.createElement('code'),result=document.createElement('span');label.textContent=name;result.textContent=formatPrgmValue(value);row.append(label,result);vars.append(row);}
    const warnings=$('[data-warnings]');warnings.replaceChildren();
    if(state.warnings.length){const row=document.createElement('li');row.textContent='ClrIO · '+state.warnings.map(w=>w.line).join(', ');warnings.append(row);}
    if(['waiting','done','error','stopped'].includes(state.status))automatic=false;
  }
  function tick(){if(closed||!automatic)return;const state=runtime.run(250);if(state.status!=='paused')automatic=false;render(state);if(automatic)timer=setTimeout(tick,0);}
  function run(){clearTimeout(timer);automatic=true;tick();}
  function restart(){clearTimeout(timer);automatic=false;data=options.readSource?.()||initial;renderedText='\0';requestToken='';runtime=createPrgmPreview(data.source,{name:data.name,angleMode:$('[data-angle]').value});render(runtime.snapshot());run();}
  function answer(cancel=false){if(!runtime?.pending)return;const state=runtime.answer($('[data-input]').value,{cancel});if(state.inputError){render(state,state.inputError);$('[data-input]').focus({preventScroll:true});return;}run();}
  function scroll(direction){$('.prgm-preview-history').scrollBy({top:direction*48,behavior:'smooth'});}
  function keys(event){
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
  $('[data-request]').onsubmit=e=>{e.preventDefault();e.stopPropagation();answer();};$('[data-cancel]').onclick=()=>answer(true);
  $('[data-enter]').onclick=()=>answer();$('[data-escape]').onclick=()=>answer(true);
  overlay.querySelectorAll('[data-scroll]').forEach(b=>b.onclick=()=>scroll(Number(b.dataset.scroll)));
  $('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(snapshot.text);$('[data-status]').textContent=t.copied;}catch(error){$('[data-error]').hidden=false;$('[data-error]').textContent=error.message;}};
  $('[data-line]').onclick=()=>options.revealLine?.(snapshot.error?.line||snapshot.pending?.line||snapshot.line);
  document.addEventListener('keydown',keys,true);modal.focus();active={close,getSnapshot:()=>runtime.snapshot()};layout();restart();return active;
}
window.TnsPrgmPreview=Object.freeze({open,close:()=>active?.close(),getSnapshot:()=>active?.getSnapshot()||null});
