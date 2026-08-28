(() => {
  "use strict";

  const OVERLAY_ID = "tns-type-detection-progress-overlay";
  const XML_INPUT_ID = "xml-tns-file";
  const DECODE_INPUT_ID = "decode-file";
  const DECODE_BUTTON_ID = "decode-btn";
  let busy = false;

  const TEXT = {
    es:{kicker:"Analizando archivo",title:"Detectando tipo de TNS",subtitle:"La herramienta identifica primero el contenedor y abre el editor adecuado, sin forzar todos los .tns por el mismo decoder.",step1:"Leer archivo",step2:"Detectar contenedor",step3:"Abrir herramienta correcta",pending:"Pendiente",processing:"Procesando",ready:"Listo",fileReady:"Archivo cargado en memoria.",scanning:"Buscando documento TI-Nspire, ejecutable Ndless o contenido TNS estructurado…",detected:"TNS detectado",type:"Tipo",format:"Formato",document:"TI-Nspire Document",ndless:"Ndless",content:"Contenido TNS",documentDetail:"Documento TI-Nspire detectado. Se continuará con el decoder documental normal.",ndlessDetail:"Ejecutable nativo detectado. Se abrirá el Inspector Ndless.",contentDetail:"Contenedor TNS especializado detectado. Se abrirá su herramienta correspondiente.",unknownDetail:"Formato no reconocido; se conserva el fallback documental existente.",openingNdless:"Abriendo Inspector Ndless…",openingContent:"Abriendo herramienta del contenedor…",openingDocument:"Enviando al flujo documental…",failed:"No se pudo completar la detección.",malformed:"Inválido"},
    en:{kicker:"Analyzing file",title:"Detecting TNS type",subtitle:"The tool identifies the outer container first and opens the appropriate editor instead of forcing every .tns through one decoder.",step1:"Read file",step2:"Detect container",step3:"Open the correct tool",pending:"Pending",processing:"Processing",ready:"Ready",fileReady:"File loaded in memory.",scanning:"Looking for a TI-Nspire document, Ndless executable or structured TNS content…",detected:"TNS detected",type:"Type",format:"Format",document:"TI-Nspire Document",ndless:"Ndless",content:"TNS Content",documentDetail:"TI-Nspire document detected. The normal document decoder will continue.",ndlessDetail:"Native executable detected. Ndless Inspector will open.",contentDetail:"Specialized TNS container detected. Its registered tool will open.",unknownDetail:"Unknown format; keeping the existing document fallback.",openingNdless:"Opening Ndless Inspector…",openingContent:"Opening container tool…",openingDocument:"Sending to document flow…",failed:"TNS detection could not be completed.",malformed:"Invalid"},
    fr:{kicker:"Analyse du fichier",title:"Détection du type de TNS",subtitle:"L’outil identifie d’abord le conteneur externe et ouvre l’éditeur adapté.",step1:"Lire le fichier",step2:"Détecter le conteneur",step3:"Ouvrir le bon outil",pending:"En attente",processing:"Analyse",ready:"Prêt",fileReady:"Fichier chargé en mémoire.",scanning:"Recherche d’un document TI-Nspire, d’un exécutable Ndless ou d’un contenu TNS structuré…",detected:"TNS détecté",type:"Type",format:"Format",document:"TI-Nspire Document",ndless:"Ndless",content:"Contenu TNS",documentDetail:"Document TI-Nspire détecté. Le décodeur documentaire normal continue.",ndlessDetail:"Exécutable natif détecté. L’Inspecteur Ndless va s’ouvrir.",contentDetail:"Conteneur TNS spécialisé détecté. Son outil enregistré va s’ouvrir.",unknownDetail:"Format inconnu ; le fallback documentaire existant est conservé.",openingNdless:"Ouverture de l’Inspecteur Ndless…",openingContent:"Ouverture de l’outil du conteneur…",openingDocument:"Envoi vers le flux documentaire…",failed:"La détection TNS n’a pas pu être terminée.",malformed:"Invalide"}
  };

  function language(){
    const active=document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    const html=String(document.documentElement.lang||"es").slice(0,2).toLowerCase();
    return TEXT[active]?active:(TEXT[html]?html:"es");
  }
  const tr=k=>TEXT[language()]?.[k]||TEXT.es[k]||k;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const nextPaint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  function formatBytes(v){const n=Number(v)||0;return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;}

  function stepMarkup(number,title,detail){
    return `<div class="tns-type-progress-step pending" data-step="${number}"><div class="tns-type-progress-circle">${number}</div><div class="tns-type-progress-line"></div><div class="tns-type-progress-content"><div class="tns-type-progress-topline"><div class="tns-type-progress-title">${esc(title)}</div><div class="tns-type-progress-status">${esc(tr("pending"))}</div></div><div class="tns-type-progress-detail">${esc(detail)}</div></div></div>`;
  }
  function createOverlay(fileName){
    document.getElementById(OVERLAY_ID)?.remove();
    const overlay=document.createElement("div");
    overlay.id=OVERLAY_ID;
    overlay.className="tns-type-progress-overlay";
    overlay.innerHTML=`<section class="tns-type-progress-card"><div class="tns-type-progress-head"><div><div class="tns-type-progress-kicker">${esc(tr("kicker"))}</div><h2>${esc(tr("title"))}</h2><p>${esc(tr("subtitle"))}</p></div><div class="tns-type-progress-icon">TNS</div></div>${stepMarkup(1,tr("step1"),fileName||".tns")}${stepMarkup(2,tr("step2"),tr("scanning"))}${stepMarkup(3,tr("step3"),tr("pending"))}<div class="tns-type-progress-result" hidden><span>${esc(tr("detected"))}</span><div class="tns-type-progress-result-fields"><div><em>${esc(tr("type"))}</em><strong data-result-type>—</strong></div><div data-result-format-row><em>${esc(tr("format"))}</em><strong data-result-format>—</strong></div></div></div></section>`;
    document.body.appendChild(overlay);
    document.documentElement.classList.add("tns-import-progress-lock");
    requestAnimationFrame(()=>overlay.classList.add("visible"));
    return overlay;
  }
  function setStep(overlay,number,status,detail){
    const step=overlay?.querySelector(`[data-step="${number}"]`);if(!step)return;
    step.classList.remove("pending","active","completed","error");step.classList.add(status);
    const circle=step.querySelector(".tns-type-progress-circle"),label=step.querySelector(".tns-type-progress-status"),text=step.querySelector(".tns-type-progress-detail");
    if(circle&&status==="completed")circle.textContent="✓";if(circle&&status==="error")circle.textContent="!";
    if(label)label.textContent=status==="active"?tr("processing"):status==="completed"?tr("ready"):status==="error"?"Error":tr("pending");
    if(text&&detail)text.textContent=detail;
  }
  function showType(overlay,result){
    const box=overlay?.querySelector(".tns-type-progress-result"),type=overlay?.querySelector("[data-result-type]"),format=overlay?.querySelector("[data-result-format]"),formatRow=overlay?.querySelector("[data-result-format-row]");
    if(!box||!type||!format)return;box.hidden=false;box.classList.toggle("warning",Boolean(result?.valid===false&&result?.family!=="unknown"));
    if(result?.family==="document"){type.textContent=tr("document");formatRow.hidden=true;return;}
    formatRow.hidden=false;
    if(result?.family==="ndless"){type.textContent=result.typeLabel||tr("ndless");format.textContent=result.formatLabel||result.format||tr("malformed");return;}
    if(result?.family==="custom-container"){type.textContent=result.typeLabel||tr("content");format.textContent=result.formatLabel||result.format||"custom";return;}
    type.textContent="Unknown";format.textContent=result?.reason||"unknown";
  }
  async function closeOverlay(overlay){if(!overlay?.isConnected)return;overlay.classList.add("closing");document.documentElement.classList.remove("tns-import-progress-lock");await sleep(210);overlay.remove();}
  async function waitFor(getter,timeout=5000){const start=Date.now();while(Date.now()-start<timeout){const value=getter();if(value)return value;await sleep(30);}throw new Error("Required TNS tool is not available.");}
  function bypassXml(input){input.dataset.tnsTypeProgressBypass="1";input.dataset.ndlessInspectorBypass="1";input.dispatchEvent(new Event("change",{bubbles:true}));}
  function bypassDecode(button){button.dataset.tnsTypeProgressBypass="1";button.dataset.ndlessInspectorBypass="1";button.click();}

  async function openCustomContainer(result){
    const editorGlobal=result?.adapter?.editorGlobal;
    if(editorGlobal){
      const editor=await waitFor(()=>window[editorGlobal]?.open&&window[editorGlobal]);
      return editor.open(result);
    }
    const fallback=await waitFor(()=>window.TnsStructuredContentEditor?.open&&window.TnsStructuredContentEditor || window.TnsContentPackEditor?.open&&window.TnsContentPackEditor);
    return fallback.open(result);
  }

  async function analyzeAndRoute(file,normalRoute){
    if(busy||!file)return;busy=true;
    const overlay=createOverlay(file.name||"documento.tns"),started=performance.now();
    try{
      await nextPaint();setStep(overlay,1,"active",file.name||"documento.tns");await sleep(60);setStep(overlay,1,"completed",`${tr("fileReady")} ${formatBytes(file.size)}`);setStep(overlay,2,"active",tr("scanning"));
      const detector=await waitFor(()=>window.TnsUniversalDetector?.inspectFile&&window.TnsUniversalDetector);
      const result=await detector.inspectFile(file);showType(overlay,result);
      const ndless=result?.family==="ndless",custom=result?.family==="custom-container",document=result?.family==="document";
      if(ndless){setStep(overlay,2,"completed",result.valid===false?`${tr("malformed")} · ${result.reason||""}`:`${tr("ndlessDetail")} ${result.formatLabel||result.format}`);setStep(overlay,3,"active",tr("openingNdless"));}
      else if(custom){setStep(overlay,2,"completed",`${tr("contentDetail")} ${result.formatLabel||result.format}`);setStep(overlay,3,"active",tr("openingContent"));}
      else{setStep(overlay,2,"completed",document?tr("documentDetail"):tr("unknownDetail"));setStep(overlay,3,"active",tr("openingDocument"));}
      const elapsed=performance.now()-started;if(elapsed<620)await sleep(620-elapsed);setStep(overlay,3,"completed",custom?tr("openingContent"):ndless?tr("openingNdless"):tr("openingDocument"));await sleep(180);await closeOverlay(overlay);
      if(custom)await openCustomContainer(result);
      else if(ndless){const inspector=await waitFor(()=>window.TnsNdlessInspector?.showInspector&&window.TnsNdlessInspector);inspector.showInspector(result);}
      else normalRoute();
    }catch(error){console.warn("TNS type detection failed; using normal flow.",error);setStep(overlay,2,"error",error?.message||tr("failed"));await sleep(350);await closeOverlay(overlay);normalRoute();}
    finally{busy=false;}
  }

  window.TnsTypeRouter=Object.freeze({analyzeAndRoute,openCustomContainer});
  window.addEventListener("change",event=>{
    const input=event.target;if(!(input instanceof HTMLInputElement)||input.id!==XML_INPUT_ID)return;
    if(input.dataset.tnsTypeProgressBypass==="1"){delete input.dataset.tnsTypeProgressBypass;return;}
    const file=input.files?.[0];if(!file||!/\.tns$/i.test(file.name||""))return;
    event.preventDefault();event.stopImmediatePropagation();analyzeAndRoute(file,()=>bypassXml(input));
  },true);
  window.addEventListener("click",event=>{
    const button=event.target instanceof Element?event.target.closest(`#${DECODE_BUTTON_ID}`):null;if(!button)return;
    if(button.dataset.tnsTypeProgressBypass==="1"){delete button.dataset.tnsTypeProgressBypass;return;}
    const file=document.getElementById(DECODE_INPUT_ID)?.files?.[0];if(!file||!/\.tns$/i.test(file.name||""))return;
    event.preventDefault();event.stopImmediatePropagation();analyzeAndRoute(file,()=>bypassDecode(button));
  },true);
})();