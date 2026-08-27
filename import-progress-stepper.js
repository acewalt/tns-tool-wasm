(() => {
  "use strict";

  const STYLE_ID = "tns-import-progress-style";
  const OVERLAY_ID = "tns-import-progress-overlay";
  const LOG_SELECTOR = "#xml-log";
  const BATCH_IMAGE_BUTTON_ID = "file-page-add-image";
  const PDF_BUTTON_IDS = new Set(["file-page-add-pdf", "add-pdf-widget"]);
  const SINGLE_IMAGE_BUTTON_ID = "add-image-widget";

  const state = {
    active: false,
    kind: "",
    total: 0,
    current: 0,
    created: 0,
    failed: 0,
    sourceName: "",
    lastItem: "",
    resultCount: 0,
    canClose: false,
    openGalleryOnClose: false,
    overlay: null,
    armedKind: "",
    armedAt: 0,
    lastLogText: "",
  };

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      html.tns-import-progress-lock,
      html.tns-import-progress-lock body { overflow: hidden !important; }
      .tns-import-progress-overlay { position:fixed; inset:0; z-index:2147482800; display:grid; place-items:center; padding:22px; background:rgba(2,8,18,.36); backdrop-filter:blur(0px) saturate(100%); -webkit-backdrop-filter:blur(0px) saturate(100%); opacity:0; transition:opacity 260ms ease,background 320ms ease,backdrop-filter 420ms ease,-webkit-backdrop-filter 420ms ease; }
      .tns-import-progress-overlay.visible { opacity:1; background:rgba(2,8,18,.58); backdrop-filter:blur(11px) saturate(118%); -webkit-backdrop-filter:blur(11px) saturate(118%); }
      .tns-import-progress-overlay.closing { opacity:0; background:rgba(2,8,18,0); backdrop-filter:blur(0px) saturate(100%); -webkit-backdrop-filter:blur(0px) saturate(100%); }
      .tns-import-progress-card { width:min(470px,calc(100vw - 34px)); max-height:min(720px,calc(100vh - 34px)); overflow:auto; padding:28px 30px 26px; border:1px solid rgba(133,164,207,.28); border-radius:22px; background:linear-gradient(180deg,rgba(18,30,50,.93),rgba(8,17,31,.94)),rgba(10,20,36,.92); box-shadow:0 34px 90px rgba(0,0,0,.46),0 0 0 1px rgba(255,255,255,.025) inset; color:#e9f2ff; transform:translateY(34px) scale(.9); opacity:0; will-change:transform,opacity; }
      .tns-import-progress-overlay.visible .tns-import-progress-card { animation:tnsImportBounceIn 560ms cubic-bezier(.16,1.25,.36,1) forwards; }
      .tns-import-progress-overlay.closing .tns-import-progress-card { animation:tnsImportOut 220ms ease forwards; }
      .tns-import-progress-head { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-bottom:24px; }
      .tns-import-progress-kicker { display:inline-flex; align-items:center; gap:7px; margin-bottom:7px; color:#a8ff4c; font-size:11px; font-weight:850; letter-spacing:.1em; text-transform:uppercase; }
      .tns-import-progress-kicker::before { content:""; width:7px; height:7px; border-radius:999px; background:#9df13a; box-shadow:0 0 16px rgba(157,241,58,.72); }
      .tns-import-progress-head h2 { margin:0; font-size:clamp(22px,4vw,28px); line-height:1.06; letter-spacing:-.025em; }
      .tns-import-progress-head p { margin:8px 0 0; max-width:350px; color:#93a7c2; font-size:13px; line-height:1.5; }
      .tns-import-progress-icon { flex:0 0 auto; width:48px; height:48px; display:grid; place-items:center; border-radius:15px; border:1px solid rgba(159,237,56,.26); background:rgba(159,237,56,.07); color:#adff51; font-size:22px; box-shadow:0 0 28px rgba(140,235,36,.09); }
      .tns-import-step { position:relative; display:grid; grid-template-columns:44px minmax(0,1fr); column-gap:15px; min-height:82px; }
      .tns-import-step:last-of-type { min-height:auto; }
      .tns-import-step-line { position:absolute; left:21px; top:43px; bottom:-1px; width:2px; overflow:hidden; border-radius:999px; background:rgba(111,139,176,.25); }
      .tns-import-step:last-of-type .tns-import-step-line { display:none; }
      .tns-import-step-line::after { content:""; position:absolute; inset:0; transform:scaleY(0); transform-origin:top; border-radius:inherit; background:linear-gradient(#9df13a,#5dd6ff); transition:transform 360ms ease; }
      .tns-import-step.completed .tns-import-step-line::after { transform:scaleY(1); }
      .tns-import-step-circle { position:relative; z-index:2; width:44px; height:44px; display:grid; place-items:center; border:2px solid rgba(116,144,180,.42); border-radius:999px; background:#0c1729; color:#71849d; font-size:15px; font-weight:850; transition:border-color 220ms ease,background 220ms ease,color 220ms ease,transform 220ms cubic-bezier(.2,1.3,.35,1),box-shadow 220ms ease; }
      .tns-import-step.active .tns-import-step-circle { border-color:#9df13a; color:#dfffb7; transform:scale(1.06); box-shadow:0 0 0 5px rgba(157,241,58,.08),0 0 26px rgba(157,241,58,.16); animation:tnsImportPulse 1.5s ease-in-out infinite; }
      .tns-import-step.completed .tns-import-step-circle { border-color:#9df13a; background:linear-gradient(145deg,#a9f84a,#6fd126); color:#0c1a09; transform:scale(1); box-shadow:0 7px 22px rgba(120,221,39,.24); animation:tnsImportCheckPop 330ms cubic-bezier(.16,1.5,.35,1); }
      .tns-import-step.error .tns-import-step-circle { border-color:#ff6767; background:rgba(126,29,29,.42); color:#ffd7d7; animation:none; }
      .tns-import-step-content { min-width:0; padding:1px 0 18px; }
      .tns-import-step-topline { display:flex; align-items:center; justify-content:space-between; gap:10px; }
      .tns-import-step-title { min-width:0; color:#dce8f8; font-size:15px; font-weight:800; }
      .tns-import-step.pending .tns-import-step-title { color:#70839d; }
      .tns-import-step-status { flex:0 0 auto; padding:3px 9px; border-radius:999px; background:rgba(112,131,157,.13); color:#8799b0; font-size:10px; font-weight:800; letter-spacing:.025em; }
      .tns-import-step.active .tns-import-step-status { background:rgba(71,140,255,.13); color:#80b2ff; }
      .tns-import-step.completed .tns-import-step-status { background:rgba(77,213,91,.13); color:#8bec95; }
      .tns-import-step.error .tns-import-step-status { background:rgba(255,103,103,.12); color:#ff9999; }
      .tns-import-step-detail { margin-top:6px; min-height:18px; overflow:hidden; color:#8fa3bd; font-size:12px; line-height:1.45; text-overflow:ellipsis; }
      .tns-import-progress-meter { display:none; height:5px; margin-top:10px; overflow:hidden; border-radius:999px; background:rgba(107,133,166,.18); }
      .tns-import-step.active[data-step="2"] .tns-import-progress-meter,.tns-import-step.completed[data-step="2"] .tns-import-progress-meter { display:block; }
      .tns-import-progress-meter > span { display:block; width:0%; height:100%; border-radius:inherit; background:linear-gradient(90deg,#87e82e,#79f0be,#60bfff); box-shadow:0 0 14px rgba(121,240,190,.32); transition:width 260ms ease; }
      .tns-import-progress-summary { margin-top:8px; padding:12px 13px; border:1px solid rgba(92,124,166,.23); border-radius:13px; background:rgba(5,12,23,.34); color:#8ea4bf; font-size:12px; line-height:1.45; }
      .tns-import-progress-summary strong { color:#dceaf8; }
      .tns-import-progress-actions { display:flex; justify-content:flex-end; margin-top:18px; min-height:39px; }
      .tns-import-progress-close { min-width:112px; min-height:39px; padding:9px 18px; border:1px solid rgba(174,255,81,.7); border-radius:999px; background:linear-gradient(135deg,#b9ff57,#8eea2f); color:#17310b; font:inherit; font-size:13px; font-weight:850; cursor:pointer; box-shadow:0 10px 28px rgba(127,224,40,.17); opacity:0; pointer-events:none; transform:translateY(7px) scale(.94); transition:filter 160ms ease,transform 160ms ease; }
      .tns-import-progress-close.visible { opacity:1; pointer-events:auto; animation:tnsImportButtonIn 380ms cubic-bezier(.16,1.4,.35,1) forwards; }
      .tns-import-progress-close:hover { filter:brightness(1.06); transform:translateY(-1px) scale(1.01); }
      .tns-import-progress-close:focus-visible { outline:2px solid #d9ff9b; outline-offset:3px; }
      @keyframes tnsImportBounceIn { 0%{opacity:0;transform:translateY(36px) scale(.89)} 62%{opacity:1;transform:translateY(-7px) scale(1.025)} 82%{transform:translateY(3px) scale(.992)} 100%{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes tnsImportOut { to{opacity:0;transform:translateY(18px) scale(.96)} }
      @keyframes tnsImportPulse { 0%,100%{box-shadow:0 0 0 4px rgba(157,241,58,.06),0 0 20px rgba(157,241,58,.12)} 50%{box-shadow:0 0 0 8px rgba(157,241,58,.025),0 0 30px rgba(157,241,58,.2)} }
      @keyframes tnsImportCheckPop { 0%{transform:scale(.72)} 68%{transform:scale(1.14)} 100%{transform:scale(1)} }
      @keyframes tnsImportButtonIn { 0%{opacity:0;transform:translateY(8px) scale(.92)} 68%{opacity:1;transform:translateY(-2px) scale(1.035)} 100%{opacity:1;transform:translateY(0) scale(1)} }
      @media (max-width:560px) { .tns-import-progress-overlay{padding:12px}.tns-import-progress-card{width:min(100%,440px);padding:23px 19px 21px;border-radius:18px}.tns-import-progress-head{margin-bottom:20px}.tns-import-progress-icon{width:43px;height:43px}.tns-import-step{grid-template-columns:40px minmax(0,1fr);column-gap:12px}.tns-import-step-circle{width:40px;height:40px}.tns-import-step-line{left:19px;top:39px}.tns-import-step-topline{align-items:flex-start;flex-direction:column;gap:5px} }
      @media (prefers-reduced-motion:reduce) { .tns-import-progress-overlay,.tns-import-progress-card,.tns-import-step-circle,.tns-import-progress-close,.tns-import-progress-meter > span{animation:none!important;transition-duration:.01ms!important} }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char])); }
  function stripTimestamp(line) { return String(line || "").replace(/^\s*\[[^\]]+\]\s*/, "").trim(); }
  function arm(kind) { state.armedKind = kind; state.armedAt = Date.now(); }
  function clearArm() { state.armedKind = ""; state.armedAt = 0; }
  function currentArm() { if (!state.armedKind) return ""; if (Date.now()-state.armedAt>60000){clearArm();return "";} return state.armedKind; }
  function checkMarkup() { return `<span aria-hidden="true">✓</span>`; }

  function createOverlay({kind,total=0,sourceName="",standalone=false}={}) {
    installStyles(); document.getElementById(OVERLAY_ID)?.remove();
    Object.assign(state,{active:true,kind:kind||"images",total:Number(total)||0,current:0,created:0,failed:0,sourceName:sourceName||"",lastItem:"",resultCount:0,canClose:false,openGalleryOnClose:!standalone});
    const isPdf=state.kind==="pdf", isSingle=state.kind==="single-image";
    const title=isPdf?"Importando PDF":isSingle?"Añadiendo imagen":"Importando imágenes";
    const subtitle=isPdf?"Cada página se convierte en una imagen y se añade como una card del documento.":"Las imágenes se preparan y se añaden al documento una por una.";
    const overlay=document.createElement("div"); overlay.id=OVERLAY_ID; overlay.className="tns-import-progress-overlay"; overlay.setAttribute("role","dialog"); overlay.setAttribute("aria-modal","true"); overlay.setAttribute("aria-label",title);
    overlay.innerHTML=`<section class="tns-import-progress-card"><div class="tns-import-progress-head"><div><div class="tns-import-progress-kicker">Procesando</div><h2>${title}</h2><p>${subtitle}</p></div><div class="tns-import-progress-icon" aria-hidden="true">${isPdf?"▤":"▧"}</div></div><div class="tns-import-step pending" data-step="1"><div class="tns-import-step-circle">1</div><div class="tns-import-step-line"></div><div class="tns-import-step-content"><div class="tns-import-step-topline"><div class="tns-import-step-title">Preparar contenido</div><div class="tns-import-step-status">Pendiente</div></div><div class="tns-import-step-detail">${sourceName?escapeHtml(sourceName):"Esperando los archivos seleccionados…"}</div></div></div><div class="tns-import-step pending" data-step="2"><div class="tns-import-step-circle">2</div><div class="tns-import-step-line"></div><div class="tns-import-step-content"><div class="tns-import-step-topline"><div class="tns-import-step-title">Crear cards</div><div class="tns-import-step-status">Pendiente</div></div><div class="tns-import-step-detail">Todavía no se ha creado contenido.</div><div class="tns-import-progress-meter"><span></span></div></div></div><div class="tns-import-step pending" data-step="3"><div class="tns-import-step-circle">3</div><div class="tns-import-step-content"><div class="tns-import-step-topline"><div class="tns-import-step-title">Actualizar documento</div><div class="tns-import-step-status">Pendiente</div></div><div class="tns-import-step-detail">El inspector se actualizará al finalizar.</div></div></div><div class="tns-import-progress-summary" aria-live="polite"><strong>Preparando la importación.</strong> Puedes seguir trabajando cuando termine este proceso.</div><div class="tns-import-progress-actions"><button type="button" class="tns-import-progress-close">Cerrar</button></div></section>`;
    document.body.appendChild(overlay); document.documentElement.classList.add("tns-import-progress-lock"); state.overlay=overlay;
    overlay.querySelector(".tns-import-progress-close")?.addEventListener("click",closeOverlay); overlay.addEventListener("click",e=>{if(e.target===overlay&&state.canClose)closeOverlay();}); requestAnimationFrame(()=>requestAnimationFrame(()=>overlay.classList.add("visible"))); setStep(1,"active",sourceName||(isPdf?"Leyendo el archivo PDF…":"Preparando archivos…")); return overlay;
  }
  function getStep(n){return state.overlay?.querySelector(`.tns-import-step[data-step="${n}"]`)||null;}
  function setStep(n,mode,detail=""){const step=getStep(n);if(!step)return;step.classList.remove("pending","active","completed","error");step.classList.add(mode);const circle=step.querySelector(".tns-import-step-circle"),status=step.querySelector(".tns-import-step-status"),detailEl=step.querySelector(".tns-import-step-detail");if(circle)circle.innerHTML=mode==="completed"?checkMarkup():mode==="error"?"!":String(n);if(status)status.textContent=mode==="completed"?"Completado":mode==="active"?"En progreso":mode==="error"?"Con error":"Pendiente";if(detail&&detailEl)detailEl.textContent=detail;}
  function setSummary(title,detail=""){const s=state.overlay?.querySelector(".tns-import-progress-summary");if(s)s.innerHTML=`<strong>${escapeHtml(title)}</strong>${detail?` ${escapeHtml(detail)}`:""}`;}
  function updateMeter(current=state.current,total=state.total){const m=state.overlay?.querySelector(".tns-import-progress-meter > span");if(!m)return;const t=Math.max(0,Number(total)||0),c=Math.max(0,Number(current)||0);m.style.width=`${Math.round(t?Math.min(1,c/t)*100:0)}%`;}
  function markPrepared(detail=""){if(!state.active)return;setStep(1,"completed",detail||state.sourceName||"Contenido preparado.");setStep(2,"active",`${state.total>0?`0 de ${state.total}`:"Procesando"} cards creadas.`);setStep(3,"pending","El documento se actualizará al terminar las cards.");setSummary("Creando contenido.",state.total>0?`0 de ${state.total} completado.`:"Procesando elementos…");}
  function updateCurrent(current,total,itemName=""){if(!state.active)return;if(Number(total)>0)state.total=Number(total);if(Number(current)>=0)state.current=Number(current);if(itemName)state.lastItem=itemName;const tt=state.total>0?`${state.current} de ${state.total}`:`${state.current}`,it=state.lastItem?` · ${state.lastItem}`:"";setStep(2,"active",`${tt}${it}`);setSummary("Importación en curso.",state.total>0?`${state.created} de ${state.total} cards listas.`:`${state.created} cards listas.`);updateMeter(state.created||state.current,state.total);}
  function cardCreated(){if(!state.active)return;state.created+=1;if(state.total>0)state.created=Math.min(state.created,state.total);updateMeter(state.created,state.total);const d=state.total>0?`${state.created} de ${state.total} cards creadas${state.lastItem?` · ${state.lastItem}`:""}`:`${state.created} card${state.created===1?"":"s"} creada${state.created===1?"":"s"}.`;setStep(2,"active",d);setSummary("Creando contenido.",d);if(state.total>0&&state.created>=state.total){setStep(2,"completed",`${state.created} de ${state.total} cards creadas.`);setStep(3,"active","Refrescando el documento y el inspector…");setSummary("Cards listas.","Actualizando la estructura final del documento…");}}
  function completeImport({added=state.created,total=state.total,failed=0,detail=""}={}){if(!state.active)return;state.failed=Math.max(0,Number(failed)||0);state.resultCount=Math.max(0,Number(added)||0);if(Number(total)>0)state.total=Number(total);setStep(1,"completed",state.sourceName||"Contenido preparado.");setStep(2,"completed",`${state.resultCount}${state.total?` de ${state.total}`:""} cards creadas${state.failed?` · ${state.failed} con error`:""}.`);setStep(3,"completed",detail||"Documento e inspector actualizados.");updateMeter(state.total||state.resultCount,state.total||state.resultCount||1);setSummary(state.failed?"Importación terminada con avisos.":"Importación completada.",state.failed?`${state.resultCount} elementos listos y ${state.failed} con error.`:`${state.resultCount} elemento${state.resultCount===1?"":"s"} listo${state.resultCount===1?"":"s"} para la vista calculadora.`);state.canClose=true;state.overlay?.querySelector(".tns-import-progress-close")?.classList.add("visible");}
  function cancelImport(detail="Importación cancelada."){if(!state.active)return;setStep(1,"completed",state.sourceName||"Archivo leído.");setStep(2,"error",detail);setStep(3,"pending","No se realizaron cambios finales.");setSummary("Importación cancelada.",detail);state.resultCount=0;state.openGalleryOnClose=false;state.canClose=true;state.overlay?.querySelector(".tns-import-progress-close")?.classList.add("visible");}
  function failImport(detail="No se pudo completar la importación."){if(!state.active)return;setStep(getStep(2)?.classList.contains("completed")?3:2,"error",detail);setSummary("La importación terminó con un error.",detail);state.openGalleryOnClose=false;state.canClose=true;state.overlay?.querySelector(".tns-import-progress-close")?.classList.add("visible");}
  async function openResultView(count){if(!count)return;const find=()=>{const c=Array.from(document.querySelectorAll(".tns-image-gallery-chip"));return c.length?c[c.length-1]:null;},click=()=>{const c=find();if(!c)return false;c.click();return true;};if(click())return;let open=null;try{open=typeof window.openDocumentInspector==="function"?window.openDocumentInspector:(0,eval)("typeof openDocumentInspector === 'function' ? openDocumentInspector : null");}catch{}if(typeof open==="function")try{await Promise.resolve(open());}catch(e){console.warn("No se pudo abrir el inspector después de la importación.",e);}for(let i=0;i<30;i++){if(click())return;await new Promise(r=>setTimeout(r,80));}}
  function resetState(){Object.assign(state,{active:false,kind:"",total:0,current:0,created:0,failed:0,sourceName:"",lastItem:"",resultCount:0,canClose:false,openGalleryOnClose:false,overlay:null});}
  function closeOverlay(){if(!state.active||!state.canClose||!state.overlay)return;const overlay=state.overlay,count=state.resultCount,open=state.openGalleryOnClose;overlay.classList.add("closing");document.documentElement.classList.remove("tns-import-progress-lock");setTimeout(()=>{overlay.remove();resetState();if(open&&count>0)setTimeout(()=>openResultView(count),80);},230);}
  function startImageBatch(total){clearArm();createOverlay({kind:"images",total});markPrepared(`${total} imagen${total===1?"":"es"} seleccionada${total===1?"":"s"}.`);}
  function startPdf(fileName=""){clearArm();createOverlay({kind:"pdf",sourceName:fileName});setStep(1,"active",fileName?`Leyendo ${fileName}…`:"Leyendo PDF…");setSummary("Leyendo PDF.","Preparando el documento para convertir sus páginas.");}

  function handleLogLine(rawLine){const line=stripTimestamp(rawLine);if(!line)return;let m=line.match(/^Carga múltiple de imágenes:\s*(\d+)\s+archivo\(s\)\./i);if(m){startImageBatch(Number(m[1]));return;}m=line.match(/^Imagen\s+(\d+)\/(\d+):\s*(.+)$/i);if(m&&state.active&&state.kind==="images"){updateCurrent(Number(m[1]),Number(m[2]),m[3]);return;}m=line.match(/^Carga múltiple terminada:\s*(\d+)(?:\/(\d+))?\s+imágenes agregadas(?:;\s*(\d+)\s+con error)?\./i);if(m&&state.active&&state.kind==="images"){completeImport({added:Number(m[1]),total:Number(m[2])||state.total,failed:Number(m[3])||0,detail:"Documento actualizado después de la carga múltiple."});return;}m=line.match(/^PDF:\s*abriendo\s+(.+?)\.\.\.$/i);if(m){startPdf(m[1]);return;}m=line.match(/^PDF\s+.+?:\s*(\d+)\s+página\(s\);\s*se importarán\s*(\d+)\./i);if(m&&state.active&&state.kind==="pdf"){state.total=Number(m[2]);markPrepared(`${state.sourceName||"PDF"} · ${state.total} página${state.total===1?"":"s"}.`);return;}m=line.match(/^PDF página\s+(\d+)\/(\d+):\s*renderizando\.\.\.$/i);if(m&&state.active&&state.kind==="pdf"){updateCurrent(Number(m[1]),Number(m[2]),`Página ${m[1]} de ${m[2]}`);return;}m=line.match(/^PDF terminado:\s*(\d+)(?:\/(\d+))?\s+páginas agregadas(?:\s+como cards)?(?:;\s*(\d+)\s+con error)?\./i);if(m&&state.active&&state.kind==="pdf"){completeImport({added:Number(m[1]),total:Number(m[2])||state.total,failed:Number(m[3])||0,detail:"PDF convertido y documento actualizado."});return;}if(/^PDF cancelado:/i.test(line)&&state.active&&state.kind==="pdf"){cancelImport("Se canceló la importación de este PDF.");return;}if(/^ERROR importando PDF:/i.test(line)&&state.active&&state.kind==="pdf"){failImport(line.replace(/^ERROR importando PDF:\s*/i,""));return;}if(/^ERROR carga múltiple de imágenes:/i.test(line)&&state.active&&state.kind==="images"){failImport(line.replace(/^ERROR carga múltiple de imágenes:\s*/i,""));return;}if(state.active&&/page\d+\.BMP\s*\|\s*ScriptApp API\s*2\.3/i.test(line))cardCreated();}

  function consumeLogChanges(logEl){
    const text=String(logEl.textContent||"");
    // Critical first-run fix: an empty baseline is a valid baseline. MutationObserver
    // may coalesce the priming newline and the first real import log into one callback;
    // never discard that callback just because lastLogText is empty.
    let delta="";
    if(state.lastLogText===""){
      delta=text;
    }else if(text.startsWith(state.lastLogText)){
      delta=text.slice(state.lastLogText.length);
    }else{
      const previousLines=state.lastLogText.split(/\r?\n/);const lastPrevious=previousLines[previousLines.length-1]||previousLines[previousLines.length-2]||"";const position=lastPrevious?text.lastIndexOf(lastPrevious):-1;delta=position>=0?text.slice(position+lastPrevious.length):text;
    }
    state.lastLogText=text;
    delta.split(/\r?\n/).forEach(handleLogLine);
  }

  function observeXmlLog(){const logEl=document.querySelector(LOG_SELECTOR);if(!logEl||logEl.dataset.tnsImportProgressObserved==="1")return false;logEl.dataset.tnsImportProgressObserved="1";state.lastLogText=String(logEl.textContent||"");const observer=new MutationObserver(()=>consumeLogChanges(logEl));observer.observe(logEl,{childList:true,subtree:true,characterData:true});return true;}
  function hookSingleImageImport(){const current=window.addImageWidgetToStage;if(typeof current!=="function")return false;if(current.__tnsImportProgressWrapped)return true;const original=current;const wrapped=async function(...args){const file=args[0],armed=currentArm();if(state.active||armed==="images"||armed==="pdf")return original.apply(this,args);createOverlay({kind:"single-image",total:1,sourceName:file?.name||"Imagen",standalone:false});markPrepared(file?.name?`Archivo preparado · ${file.name}`:"Imagen preparada.");updateCurrent(1,1,file?.name||"Imagen");try{const result=await original.apply(this,args);if(state.created<1)cardCreated();setStep(2,"completed",`1 de 1 card creada${file?.name?` · ${file.name}`:""}.`);setStep(3,"active","Actualizando el documento…");await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));completeImport({added:1,total:1,detail:"Imagen añadida al documento."});return result;}catch(error){failImport(error?.message||String(error));throw error;}};wrapped.__tnsImportProgressWrapped=true;wrapped.__tnsImportProgressOriginal=original;window.addImageWidgetToStage=wrapped;return true;}
  function installHooks(){installStyles();observeXmlLog();hookSingleImageImport();const retry=setInterval(()=>{observeXmlLog();const hooked=hookSingleImageImport();if(hooked&&document.querySelector(LOG_SELECTOR))clearInterval(retry);},120);setTimeout(()=>clearInterval(retry),20000);}
  window.addEventListener("click",event=>{const target=event.target instanceof Element?event.target.closest("button"):null;if(!target?.id)return;if(target.id===BATCH_IMAGE_BUTTON_ID){arm("images");return;}if(PDF_BUTTON_IDS.has(target.id)){arm("pdf");return;}if(target.id===SINGLE_IMAGE_BUTTON_ID)clearArm();},true);
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&state.active&&state.canClose){event.preventDefault();closeOverlay();}},true);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installHooks,{once:true});else installHooks();
})();
