(() => {
  "use strict";

  const OVERLAY_ID = "tns-build-progress-overlay";
  const STYLE_ID = "tns-build-confirm-flow-style";
  const INSTALLED_KEY = "ndless-web-compiler-installed";
  const DOWNLOAD_DELAY_MS = 1600;
  const READY_WAIT_MS = 15 * 60 * 1000;
  const BUILD_TIMEOUT_MS = 4 * 60 * 1000;
  let activeFlow = null;
  let allowInternalBuildClick = false;

  const sleep = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Build cancelled", "AbortError"));
    const timer = setTimeout(() => { signal?.removeEventListener?.("abort", onAbort); resolve(); }, ms);
    const onAbort = () => { clearTimeout(timer); reject(new DOMException("Build cancelled", "AbortError")); };
    signal?.addEventListener?.("abort", onAbort, { once:true });
  });
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function ensureStyles() {
    if (document.getElementById("tns-import-progress-style")) return Promise.resolve();
    return new Promise(resolve => {
      const existing = document.querySelector('script[data-import-progress-stepper="true"]');
      if (existing) { setTimeout(resolve, 300); return; }
      const s=document.createElement("script"); s.src="./import-progress-stepper.js?v=20260829-web-bridge-v1"; s.async=false; s.dataset.importProgressStepper="true"; s.onload=resolve; s.onerror=resolve; document.head.appendChild(s); setTimeout(resolve,1400);
    });
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style=document.createElement("style"); style.id=STYLE_ID;
    style.textContent=`
      #${OVERLAY_ID} .tns-build-step1-prompt{margin-top:12px;padding:12px;border:1px solid rgba(128,166,216,.28);border-radius:13px;background:rgba(7,17,31,.48)}
      #${OVERLAY_ID} .tns-build-step1-question{color:#dceafa;font-size:12px;font-weight:800;line-height:1.45;margin-bottom:9px}
      #${OVERLAY_ID} .tns-build-step1-actions{display:flex;gap:8px;flex-wrap:wrap}
      #${OVERLAY_ID} .tns-build-confirm,#${OVERLAY_ID} .tns-build-secondary,#${OVERLAY_ID} .tns-build-cancel{min-height:36px;padding:8px 14px;border-radius:999px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}
      #${OVERLAY_ID} .tns-build-confirm{border:1px solid rgba(174,255,81,.72);background:linear-gradient(135deg,#b9ff57,#8eea2f);color:#17310b}
      #${OVERLAY_ID} .tns-build-secondary{border:1px solid rgba(132,172,224,.45);background:rgba(53,82,122,.22);color:#d7e7fb}
      #${OVERLAY_ID} .tns-build-cancel{border:1px solid rgba(255,123,123,.35);background:rgba(122,39,47,.18);color:#ffc7c7;margin-left:auto}
      #${OVERLAY_ID} button[hidden]{display:none!important}
      #${OVERLAY_ID} .tns-import-progress-close{display:none} #${OVERLAY_ID} .tns-import-progress-close.visible{display:block}
      #${OVERLAY_ID} .tns-import-progress-actions{gap:10px;flex-wrap:wrap}
    `;
    document.head.appendChild(style);
  }

  function stepMarkup(n,title,detail,prompt=false){return `<div class="tns-import-step pending" data-step="${n}"><div class="tns-import-step-circle">${n}</div><div class="tns-import-step-line"></div><div class="tns-import-step-content"><div class="tns-import-step-topline"><div class="tns-import-step-title">${esc(title)}</div><div class="tns-import-step-status">Pendiente</div></div><div class="tns-import-step-detail">${esc(detail)}</div>${n===2?'<div class="tns-import-progress-meter"><span></span></div>':""}${prompt?'<div class="tns-build-step1-prompt" data-build-step1-prompt hidden><div class="tns-build-step1-question" data-build-step1-question></div><div class="tns-build-step1-actions"><button type="button" class="tns-build-confirm" data-build-confirm></button><button type="button" class="tns-build-secondary" data-build-redownload hidden>Descargar de nuevo</button></div></div>':""}</div></div>`;}

  function createOverlay(project){
    installStyles(); document.getElementById(OVERLAY_ID)?.remove();
    const o=document.createElement("div"); o.id=OVERLAY_ID; o.className="tns-import-progress-overlay tns-build-progress-overlay"; o.setAttribute("role","dialog"); o.setAttribute("aria-modal","true");
    o.innerHTML=`<section class="tns-import-progress-card"><div class="tns-import-progress-head"><div><div class="tns-import-progress-kicker">Build TNS</div><h2>Generando TNS</h2><p>Abre el compilador local una vez. Después la página enviará el proyecto y recibirá el TNS automáticamente.</p></div><div class="tns-import-progress-icon" aria-hidden="true">⚙</div></div>${stepMarkup(1,"Preparar compilador","Comprobando Ndless Web Compiler…",true)}${stepMarkup(2,"Enviar proyecto",`Se creará ${esc(project?.name||"project")}.zip en memoria y se enviará al EXE.`)}${stepMarkup(3,"Compilar TNS","El launcher usa internamente el backend v4 canónico.")}${stepMarkup(4,"Descargar resultado","El navegador recibirá el .tns terminado y lo guardará en Descargas.")}<div class="tns-import-progress-summary" aria-live="polite"><strong>Preparando Build TNS.</strong> Comprobando el compilador.</div><div class="tns-import-progress-actions"><button type="button" class="tns-build-cancel" data-build-cancel>Cancelar</button><button type="button" class="tns-import-progress-close" data-build-close>Cerrar</button></div></section>`;
    document.body.appendChild(o); document.documentElement.classList.add("tns-import-progress-lock"); requestAnimationFrame(()=>requestAnimationFrame(()=>o.classList.add("visible")));
    return controller(o);
  }

  function controller(o){
    const step=n=>o.querySelector(`.tns-import-step[data-step="${n}"]`), prompt=o.querySelector("[data-build-step1-prompt]"), question=o.querySelector("[data-build-step1-question]"), confirm=o.querySelector("[data-build-confirm]"), redownload=o.querySelector("[data-build-redownload]"), cancel=o.querySelector("[data-build-cancel]"), close=o.querySelector("[data-build-close]");
    const setStep=(n,mode,detail="")=>{const s=step(n); if(!s)return; s.classList.remove("pending","active","completed","error"); s.classList.add(mode); const c=s.querySelector(".tns-import-step-circle"),st=s.querySelector(".tns-import-step-status"),d=s.querySelector(".tns-import-step-detail"); if(c)c.innerHTML=mode==="completed"?"✓":mode==="error"?"!":String(n); if(st)st.textContent=mode==="completed"?"Completado":mode==="active"?"En progreso":mode==="error"?"Con error":"Pendiente"; if(detail&&d)d.textContent=detail;};
    const summary=(title,detail="")=>{const s=o.querySelector(".tns-import-progress-summary"); if(s)s.innerHTML=`<strong>${esc(title)}</strong>${detail?` ${esc(detail)}`:""}`;};
    const meter=p=>{const b=o.querySelector(".tns-import-progress-meter > span"); if(b)b.style.width=`${Math.max(0,Math.min(100,Number(p)||0))}%`;};
    const showPrompt=(text,label,onClick,{showRedownload=false,onRedownload=null}={})=>{prompt.hidden=false; question.textContent=text; confirm.textContent=label; confirm.onclick=onClick; redownload.hidden=!showRedownload; redownload.onclick=onRedownload;};
    const hidePrompt=()=>{prompt.hidden=true; confirm.onclick=null; redownload.onclick=null;};
    const finish=()=>{hidePrompt(); cancel.hidden=true; close.classList.add("visible");};
    const closeFn=()=>{o.classList.add("closing"); setTimeout(()=>{o.remove(); if(!document.querySelector(".tns-import-progress-overlay"))document.documentElement.classList.remove("tns-import-progress-lock");},230);}; close.onclick=closeFn;
    return {o,setStep,summary,meter,showPrompt,hidePrompt,finish,cancel,close:closeFn};
  }

  async function status(signal){try{return await window.NdlessLocalBridge?.status?.({signal,timeoutMs:850})||null;}catch(e){if(signal?.aborted)throw e;return null;}}
  const ready=s=>!!(s?.connected&&s?.toolchainReady&&Number(s?.protocol||0)===2&&s?.webBridge);
  function setInstalled(){try{localStorage.setItem(INSTALLED_KEY,"1");}catch(_){}}
  function installed(){try{return localStorage.getItem(INSTALLED_KEY)==="1";}catch(_){return false;}}

  function waitButton(ui,text,label,options,signal){return new Promise((resolve,reject)=>{const abort=()=>{signal?.removeEventListener?.("abort",abort);reject(new DOMException("Build cancelled","AbortError"));}; signal?.addEventListener?.("abort",abort,{once:true}); ui.showPrompt(text,label,()=>{signal?.removeEventListener?.("abort",abort);resolve();},options);});}

  async function waitReady(ui,signal){
    const deadline=Date.now()+READY_WAIT_MS; let last=null;
    while(Date.now()<deadline){
      last=await status(signal);
      if(ready(last))return last;
      if(last?.connected){
        const p=Number(last.progress||0), msg=last.message||"Preparando backend v4…";
        ui.setStep(1,"active",p>0&&p<100?`${msg} (${p}%)`:msg); ui.summary("Compilador abierto.", last.error||"Espera mientras termina de preparar el backend v4.");
      }
      await sleep(850,signal);
    }
    const e=new Error(last?.error||"Ndless Web Compiler no llegó a estar listo."); e.code="LOCAL_COMPILER_OPEN_PENDING"; throw e;
  }

  async function ensureCompiler(ui,signal){
    const bridge=window.NdlessLocalBridge; if(!bridge?.webBridge||!bridge?.status||!bridge?.downloadCompiler||!bridge?.build)throw new Error("Ndless Web Compiler bridge todavía no está cargado.");
    let s=await status(signal); if(ready(s)){setInstalled();ui.setStep(1,"completed","Ndless Web Compiler ya está abierto y listo.");ui.summary("Compilador listo.","Preparando el ZIP del proyecto.");return s;}

    if(installed()){
      ui.setStep(1,"active","Ndless Web Compiler está instalado, pero cerrado.");
      await waitButton(ui,"Abre el compilador para continuar.","Abrir compilador",{showRedownload:true,onRedownload:()=>bridge.downloadCompiler({force:true})},signal);
      bridge.openLocalCompiler?.();
      ui.hidePrompt(); ui.summary("Abriendo compilador.","Acepta el aviso del navegador para abrir Ndless Web Compiler.");
      return await waitReady(ui,signal);
    }

    bridge.downloadCompiler({force:true});
    ui.setStep(1,"active","Descargando Ndless Web Compiler…"); ui.summary("Descargando compilador.","Es un launcher pequeño; el backend v4 se prepara dentro del EXE la primera vez.");
    await sleep(DOWNLOAD_DELAY_MS,signal);
    await waitButton(ui,"¿Ya se descargó Ndless-Web-Compiler-Windows-x64.exe?","Sí, ya se descargó",{showRedownload:true,onRedownload:()=>bridge.downloadCompiler({force:true})},signal);
    await waitButton(ui,"Ahora abre el EXE desde Descargas. Cuando veas su ventana, confirma aquí.","Ya lo abrí",{showRedownload:true,onRedownload:()=>bridge.downloadCompiler({force:true})},signal);
    ui.hidePrompt(); ui.setStep(1,"active","Buscando Ndless Web Compiler en 127.0.0.1:34983…"); ui.summary("Esperando el EXE.","La primera ejecución puede descargar y preparar el backend v4; verás el progreso aquí cuando responda.");
    s=await waitReady(ui,signal); setInstalled(); ui.setStep(1,"completed","Ndless Web Compiler abierto · backend v4 listo."); ui.summary("Compilador conectado.","Ahora se enviará project.zip."); return s;
  }

  function validate(bytes){const d=window.NdlessFormatDetector?.detect?.(bytes)||window.TnsUniversalDetector?.detect?.(bytes)||null; if(d&&d.valid===false)throw new Error(`El TNS generado no pasó la validación${d.reason?`: ${d.reason}`:"."}`); return d;}
  function download(result){const bytes=result.bytes instanceof Uint8Array?result.bytes:new Uint8Array(result.bytes||[]); const blob=new Blob([bytes],{type:"application/octet-stream"}),url=URL.createObjectURL(blob),a=document.createElement("a"); a.href=url;a.download=result.filename||"program.tns";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);}

  async function compile(project,readyStatus,ui,signal){
    ui.setStep(2,"active",`Creando ${project.name||"project"}.zip en memoria…`);ui.summary("Preparando proyecto.","No se descarga el ZIP: se envía directamente al EXE local.");ui.meter(15);
    const result=await window.NdlessLocalBridge.build(project,{status:readyStatus,signal,timeoutMs:BUILD_TIMEOUT_MS,onProgress(info){const m=info?.message||"Enviando proyecto…"; if(info?.stage==="sending"){ui.setStep(2,"active",m);ui.meter(/Sending project\.zip/i.test(m)?95:45);} }});
    if(!result?.ok||!result?.bytes?.length)throw new Error(result?.message||"El compilador no devolvió un TNS.");
    ui.setStep(2,"completed","project.zip enviado al EXE local.");ui.meter(100);ui.setStep(3,"active","Backend v4 compilando ARM y empaquetando Zehn…");ui.summary("Compilando TNS.","Esperando la respuesta del EXE.");validate(result.bytes);ui.setStep(3,"completed",`${result.filename||"TNS"} compilado y validado.`);return result;
  }

  function currentProject(root){try{const p=window.NdlessProjectWorkspace?.getProject?.();return p&&(!root||root.isConnected)?p:null;}catch(_){return null;}}
  async function run(root){if(activeFlow)return activeFlow;activeFlow=(async()=>{await ensureStyles();const project=currentProject(root);if(!project)throw new Error("No hay un proyecto Ndless abierto.");const ac=new AbortController(),ui=createOverlay(project);ui.cancel.onclick=()=>ac.abort();try{const rs=await ensureCompiler(ui,ac.signal),result=await compile(project,rs,ui,ac.signal);ui.setStep(4,"active",`Recibiendo ${result.filename||"program.tns"}…`);ui.summary("Compilación terminada.","El navegador recibió el TNS desde Ndless Web Compiler.");await sleep(120,ac.signal);download(result);ui.setStep(4,"completed",`${result.filename||"program.tns"} · descarga iniciada.`);ui.summary("Build TNS completado.","El archivo final se guardó mediante la descarga del navegador.");ui.finish();return result;}catch(e){const n=[1,2,3,4].find(x=>ui.o.querySelector(`.tns-import-step[data-step="${x}"]`)?.classList.contains("active"))||1;ui.setStep(n,"error",e?.message||String(e));ui.summary(e?.name==="AbortError"?"Build TNS cancelado.":"Build TNS terminó con un error.",e?.details||"");ui.finish();if(e?.name!=="AbortError")console.error("Build TNS:",e);return null;}})().finally(()=>{activeFlow=null;});return activeFlow;}

  function suppress(){document.querySelectorAll("#xml-doctor-panel .ndless-project-workspace").forEach(root=>{const a=root.querySelector(".ndless-project-actions"),b=a?.querySelector(".ndless-build-tns-button");a?.querySelectorAll(".ndless-save-experimental-button").forEach(x=>x.remove());if(b)b.dataset.experimentalSaveDirect="1";});const s=document.querySelector("[data-tns-file-save-experimental-status]");if(s)s.style.display="none";}
  document.addEventListener("click",e=>{const t=e.target instanceof Element?e.target.closest(".ndless-build-tns-button,[data-real-build-start]"):null;if(!t||allowInternalBuildClick)return;const r=t.closest(".ndless-project-workspace");if(!r)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();run(r);},true);
  new MutationObserver(suppress).observe(document.documentElement,{childList:true,subtree:true});suppress();
  window.NdlessOfficialBuildFlow=Object.freeze({run,suppressExperimentalNdlessControls:suppress,patchBuildManager:()=>true});
})();