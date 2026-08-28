(() => {
  "use strict";

  const OVERLAY_ID = "tns-type-detection-progress-overlay";
  const XML_INPUT_ID = "xml-tns-file";
  const DECODE_INPUT_ID = "decode-file";
  const DECODE_BUTTON_ID = "decode-btn";
  let busy = false;

  const TEXT = {
    es: {
      kicker:"Analizando archivo", title:"Detectando tipo de TNS", subtitle:"La herramienta revisa primero el archivo para elegir el flujo correcto sin intentar decodificarlo con el formato equivocado.",
      step1:"Leer archivo", step2:"Detectar tipo de TNS", step3:"Abrir herramienta correcta", pending:"Pendiente", processing:"Procesando", ready:"Listo", fileReady:"Archivo cargado en memoria.",
      scanning:"Buscando documento TI-Nspire o contenedor Ndless (Zehn, bFLT, PRG)…", detected:"TNS detectado", type:"Tipo", format:"Formato", document:"TI-Nspire Document", ndless:"Ndless", legacy:"Ndless Legacy",
      documentDetail:"Documento TI-Nspire detectado. Se continuará con el decoder documental normal.", ndlessDetail:"Ejecutable nativo ARM detectado. Se abrirá el Inspector Ndless.", malformedDetail:"Se reconoció un formato Ndless, pero su estructura no supera la validación.", unknownDetail:"Formato no reconocido; se conserva el fallback documental existente.",
      openingNdless:"Abriendo Inspector Ndless…", openingDocument:"Enviando al flujo documental…", failed:"No se pudo completar la detección.", malformed:"Inválido",
    },
    en: {
      kicker:"Analyzing file", title:"Detecting TNS type", subtitle:"The tool checks the file first so it can select the correct flow without decoding it as the wrong format.",
      step1:"Read file", step2:"Detect TNS type", step3:"Open the correct tool", pending:"Pending", processing:"Processing", ready:"Ready", fileReady:"File loaded into memory.",
      scanning:"Looking for a TI-Nspire document or Ndless container (Zehn, bFLT, PRG)…", detected:"TNS detected", type:"Type", format:"Format", document:"TI-Nspire Document", ndless:"Ndless", legacy:"Ndless Legacy",
      documentDetail:"TI-Nspire document detected. The normal document decoder will continue.", ndlessDetail:"Native ARM executable detected. Ndless Inspector will open.", malformedDetail:"An Ndless format was recognized, but its structure failed validation.", unknownDetail:"Unknown format; keeping the existing document fallback.",
      openingNdless:"Opening Ndless Inspector…", openingDocument:"Sending to document flow…", failed:"TNS detection could not be completed.", malformed:"Invalid",
    },
    fr: {
      kicker:"Analyse du fichier", title:"Détection du type de TNS", subtitle:"L’outil vérifie d’abord le fichier afin de sélectionner le bon flux sans utiliser le mauvais décodeur.",
      step1:"Lire le fichier", step2:"Détecter le type de TNS", step3:"Ouvrir le bon outil", pending:"En attente", processing:"Analyse", ready:"Prêt", fileReady:"Fichier chargé en mémoire.",
      scanning:"Recherche d’un document TI-Nspire ou d’un conteneur Ndless (Zehn, bFLT, PRG)…", detected:"TNS détecté", type:"Type", format:"Format", document:"TI-Nspire Document", ndless:"Ndless", legacy:"Ndless Legacy",
      documentDetail:"Document TI-Nspire détecté. Le décodeur documentaire normal continue.", ndlessDetail:"Exécutable ARM natif détecté. L’Inspecteur Ndless va s’ouvrir.", malformedDetail:"Un format Ndless a été reconnu, mais sa structure est invalide.", unknownDetail:"Format inconnu ; le fallback documentaire existant est conservé.",
      openingNdless:"Ouverture de l’Inspecteur Ndless…", openingDocument:"Envoi vers le flux documentaire…", failed:"La détection TNS n’a pas pu être terminée.", malformed:"Invalide",
    },
  };

  function language(){const a=document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;const h=String(document.documentElement.lang||"es").slice(0,2).toLowerCase();return TEXT[a]?a:(TEXT[h]?h:"es");}
  const tr=k=>TEXT[language()]?.[k]||TEXT.es[k]||k;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const nextPaint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  function formatBytes(v){const n=Number(v)||0;if(n<1024)return`${n} B`;if(n<1048576)return`${(n/1024).toFixed(1)} KB`;return`${(n/1048576).toFixed(2)} MB`;}

  function stepMarkup(number,title,detail){return `<div class="tns-type-progress-step pending" data-step="${number}"><div class="tns-type-progress-circle">${number}</div><div class="tns-type-progress-line"></div><div class="tns-type-progress-content"><div class="tns-type-progress-topline"><div class="tns-type-progress-title">${esc(title)}</div><div class="tns-type-progress-status">${esc(tr("pending"))}</div></div><div class="tns-type-progress-detail">${esc(detail)}</div></div></div>`;}
  function createOverlay(fileName){document.getElementById(OVERLAY_ID)?.remove();const o=document.createElement("div");o.id=OVERLAY_ID;o.className="tns-type-progress-overlay";o.innerHTML=`<section class="tns-type-progress-card"><div class="tns-type-progress-head"><div><div class="tns-type-progress-kicker">${esc(tr("kicker"))}</div><h2>${esc(tr("title"))}</h2><p>${esc(tr("subtitle"))}</p></div><div class="tns-type-progress-icon">TNS</div></div>${stepMarkup(1,tr("step1"),fileName||".tns")}${stepMarkup(2,tr("step2"),tr("scanning"))}${stepMarkup(3,tr("step3"),tr("pending"))}<div class="tns-type-progress-result" hidden><span>${esc(tr("detected"))}</span><div class="tns-type-progress-result-fields"><div><em>${esc(tr("type"))}</em><strong data-result-type>—</strong></div><div data-result-format-row><em>${esc(tr("format"))}</em><strong data-result-format>—</strong></div></div></div></section>`;document.body.appendChild(o);document.documentElement.classList.add("tns-import-progress-lock");requestAnimationFrame(()=>o.classList.add("visible"));return o;}
  function setStep(o,n,status,detail){const s=o?.querySelector(`[data-step="${n}"]`);if(!s)return;s.classList.remove("pending","active","completed","error");s.classList.add(status);const c=s.querySelector(".tns-type-progress-circle"),st=s.querySelector(".tns-type-progress-status"),d=s.querySelector(".tns-type-progress-detail");if(c&&status==="completed")c.textContent="✓";if(c&&status==="error")c.textContent="!";if(st)st.textContent=status==="active"?tr("processing"):status==="completed"?tr("ready"):status==="error"?"Error":tr("pending");if(d&&detail)d.textContent=detail;}
  function showType(o,result){const box=o?.querySelector(".tns-type-progress-result"),type=o?.querySelector("[data-result-type]"),fmt=o?.querySelector("[data-result-format]"),fmtRow=o?.querySelector("[data-result-format-row]");if(!box||!type||!fmt)return;box.hidden=false;box.classList.toggle("warning",Boolean(result?.malformed));if(result?.family==="document"){type.textContent=tr("document");fmtRow.hidden=true;return;}fmtRow.hidden=false;if(result?.family==="ndless"){type.textContent=result.typeLabel||tr("ndless");fmt.textContent=result.formatLabel||result.format||tr("malformed");return;}type.textContent="Unknown";fmt.textContent=result?.reason||"unknown";}
  async function closeOverlay(o){if(!o?.isConnected)return;o.classList.add("closing");document.documentElement.classList.remove("tns-import-progress-lock");await sleep(210);o.remove();}
  async function waitForDetector(timeout=5000){const start=Date.now();while(Date.now()-start<timeout){if(window.NdlessFormatDetector?.inspectFile)return window.NdlessFormatDetector;await sleep(30);}throw new Error("Ndless format detector is not available.");}
  async function waitForInspector(timeout=5000){const start=Date.now();while(Date.now()-start<timeout){if(window.TnsNdlessInspector?.showInspector)return window.TnsNdlessInspector;await sleep(30);}throw new Error("Ndless Inspector is not available.");}
  function bypassXml(input){input.dataset.tnsTypeProgressBypass="1";input.dataset.ndlessInspectorBypass="1";input.dispatchEvent(new Event("change",{bubbles:true}));}
  function bypassDecode(button){button.dataset.tnsTypeProgressBypass="1";button.dataset.ndlessInspectorBypass="1";button.click();}

  async function analyzeAndRoute(file,normalRoute){if(busy||!file)return;busy=true;const o=createOverlay(file.name||"documento.tns"),started=performance.now();try{await nextPaint();setStep(o,1,"active",file.name||"documento.tns");await sleep(70);setStep(o,1,"completed",`${tr("fileReady")} ${formatBytes(file.size)}`);setStep(o,2,"active",tr("scanning"));const detector=await waitForDetector();const result=await detector.inspectFile(file);showType(o,result);
      const ndless=result?.family==="ndless";const malformed=ndless&&!result.valid;const document=result?.family==="document";if(ndless){setStep(o,2,"completed",malformed?tr("malformedDetail"):`${tr("ndlessDetail")} ${result.formatLabel||result.format} · ARM`);setStep(o,3,"active",tr("openingNdless"));}else{setStep(o,2,"completed",document?tr("documentDetail"):tr("unknownDetail"));setStep(o,3,"active",tr("openingDocument"));}
      const elapsed=performance.now()-started;if(elapsed<650)await sleep(650-elapsed);setStep(o,3,"completed",ndless?tr("openingNdless"):tr("openingDocument"));await sleep(220);await closeOverlay(o);if(ndless){const inspector=await waitForInspector();inspector.showInspector(result);}else normalRoute();
    }catch(error){console.warn("TNS type detection progress failed; using normal TNS flow.",error);setStep(o,2,"error",error?.message||tr("failed"));setStep(o,3,"active",tr("openingDocument"));await sleep(450);await closeOverlay(o);normalRoute();}finally{busy=false;}}

  window.addEventListener("change",event=>{const input=event.target;if(!(input instanceof HTMLInputElement)||input.id!==XML_INPUT_ID)return;if(input.dataset.tnsTypeProgressBypass==="1"){delete input.dataset.tnsTypeProgressBypass;return;}const file=input.files?.[0];if(!file||!/\.tns$/i.test(file.name||""))return;event.preventDefault();event.stopImmediatePropagation();analyzeAndRoute(file,()=>bypassXml(input));},true);
  window.addEventListener("click",event=>{const button=event.target instanceof Element?event.target.closest(`#${DECODE_BUTTON_ID}`):null;if(!button)return;if(button.dataset.tnsTypeProgressBypass==="1"){delete button.dataset.tnsTypeProgressBypass;return;}const file=document.getElementById(DECODE_INPUT_ID)?.files?.[0];if(!file||!/\.tns$/i.test(file.name||""))return;event.preventDefault();event.stopImmediatePropagation();analyzeAndRoute(file,()=>bypassDecode(button));},true);
})();
