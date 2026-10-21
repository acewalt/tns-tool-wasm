(() => {
  "use strict";
  const HOST = "http://127.0.0.1:8765";
  const USB_VENDOR = 0x0451;
  const SUPPORTED = [0xe012, 0xe022];
  const translations = {
    es: ["Transferir a calculadora", "Detectar USB", "Buscar puente local", "Sin conexión", "USB detectado; faltan los comandos TI-Nspire", "Conexión activa", "Carpetas de la calculadora", "Dispositivos USB", "Actualizar", "Subir", "Enviar .tns", "Enviar documento actual", "Nueva carpeta", "Capturar pantalla", "Captura no disponible en este controlador. Usa la herramienta oficial TI para CX II.", "Inicia el puente local para leer y transferir archivos. Ver instrucciones en docs/calculator-transfer.md. La detección USB no da acceso a las carpetas.", "Seleccionar dispositivo", "No hay archivos en esta carpeta", "Conecta la calculadora para consultar sus archivos", "Descargar", "Instrucciones", "Captura oficial de TI", "Escribe el nombre de la nueva carpeta:", "No se encontró una calculadora compatible.", "Cerrar"],
    en: ["Transfer to calculator", "Detect USB", "Find local bridge", "Not connected", "USB detected; TI-Nspire protocol unavailable", "Connected", "Calculator folders", "USB devices", "Refresh", "Up", "Send .tns", "Send current document", "New folder", "Take screenshot", "Capture unavailable with this driver. Use the official TI CX II tool.", "Start the local bridge to list and transfer files. See docs/calculator-transfer.md. USB detection alone cannot browse folders.", "Select device", "This folder is empty", "Connect a calculator to see real files", "Download", "Instructions", "Official TI screen capture", "Name of the new folder:", "No compatible calculators detected.", "Close"],
    fr: ["Transférer vers calculatrice", "Détecter USB", "Rechercher le pont local", "Déconnectée", "USB détecté; protocole TI-Nspire indisponible", "Connectée", "Dossiers de la calculatrice", "Périphériques USB", "Actualiser", "Monter", "Envoyer .tns", "Envoyer le document", "Nouveau dossier", "Capture d'écran", "Capture non disponible. Utilisez l'application TI officielle CX II.", "Démarrez le pont local pour voir les fichiers (docs/calculator-transfer.md).", "Sélectionner", "Dossier vide", "Connectez la calculatrice pour afficher les fichiers", "Télécharger", "Instructions", "Capture officielle de TI", "Nom du nouveau dossier :", "Aucune calculatrice compatible.", "Fermer"]
  };
  const state = { dialog:null, connected:false, info:null, path:"/", items:[], usb:null, screenshot:false, screenshotUrl:null };
  function tr(i) { const l=(document.documentElement.lang||"es").slice(0,2);return (translations[l]||translations.es)[i]; }
  function el(sel) { return state.dialog?.querySelector(sel); }
  function say(s, error) { const x=el("[data-status]"); if(x){x.textContent=s;x.dataset.error=error?"1":"0";} }
  function note(s) { const x=el("[data-note]");if(x)x.textContent=s; }
  async function api(endpoint, options, blob) {
    const cfg=options||{};
    const ctrl=new AbortController();
    const timeout=setTimeout(()=>ctrl.abort(),cfg.timeout||10000);
    try {
      const response=await fetch(HOST+endpoint,{
        method:cfg.body?"POST":"GET", mode:"cors",cache:"no-store",
        headers:cfg.body?{"Content-Type":"application/json"}:{},
        body:cfg.body?JSON.stringify(cfg.body):undefined,signal:ctrl.signal
      });
      if (!response.ok) {
        const err=await response.json().catch(()=>({}));
        throw new Error(err.error||"HTTP "+response.status);
      }
      return blob?response.blob():response.json();
    } finally {clearTimeout(timeout);}
  }
  function redraw() {
    const box=el("[data-files]");if(!box)return;
    el("[data-path]").textContent=state.path;
    for(const name of ["refresh","upload","current","mkdir"])el("[data-"+name+"]").disabled=!state.connected;
    el("[data-up]").disabled=!state.connected||state.path==="/";
    el("[data-capture]").disabled=!state.connected||!state.screenshot;
    box.replaceChildren();
    if(!state.connected||!state.items.length){const p=document.createElement("p");p.textContent=tr(state.connected?17:18);box.append(p);return;}
    for(const file of [...state.items].sort((a,b)=>Number(b.is_dir)-Number(a.is_dir)||a.name.localeCompare(b.name))){
      const row=document.createElement("div");row.className="ti-calc-row";
      const btn=document.createElement("button");btn.type="button";btn.textContent=(file.is_dir?"▣  ":"▤  ")+file.name;
      btn.addEventListener("click",()=>file.is_dir?openPath(file.path):download(file.path));
      const size=document.createElement("span");size.textContent=file.is_dir?"—":(Number(file.size||0)/1024).toFixed(1)+" KB";
      row.append(btn,size);box.append(row);
    }
  }
  async function refresh() {
    if(!state.connected)return;
    try {
      const r=await api("/api/files?path="+encodeURIComponent(state.path),{timeout:20000});
      state.items=Array.isArray(r.files)?r.files.filter(f=>f&&typeof f.name==="string"&&typeof f.path==="string"):[];
      say(tr(5)+" · "+(state.info?.name||"TI-Nspire"));redraw();
    } catch(e){state.items=[];redraw();say(e.message,true);}
  }
  async function openPath(path){state.path=path;await refresh();}
  function deviceList(devices){
    const box=el("[data-devices]");box.replaceChildren();
    if(!devices.length){box.textContent=tr(23);return;}
    for(const device of devices){
      const b=document.createElement("button");b.type="button";
      b.textContent=(device.name||"TI-Nspire")+" · USB "+device.bus_number+":"+device.address;
      b.addEventListener("click",async()=>{
        try {
          const result=await api("/api/connect",{body:{bus_number:device.bus_number,address:device.address},timeout:20000});
          state.connected=Boolean(result.connected);state.info=result.info||device;
          state.screenshot=Boolean(result.capabilities?.screenshot);
          state.path="/";say(state.connected?tr(5):tr(3));
          note(state.screenshot?"":tr(14));await refresh();
        }catch(e){say(e.message,true);}
      });box.append(b);
    }
  }
  async function searchLocal(){
    try{
      const health=await api("/api/health",{timeout:3000});
      state.connected=Boolean(health.connected);state.info=health.info||null;
      state.screenshot=Boolean(health.capabilities?.screenshot);
      if(state.connected){state.path="/";await refresh();}
      else{const found=await api("/api/devices",{timeout:6000});deviceList(found.devices||[]);say(tr(3));redraw();}
      note(state.screenshot?"":tr(15));
    }catch(e){state.connected=false;state.screenshot=false;deviceList([]);say(state.usb?tr(4):tr(3));note(tr(15));redraw();}
  }
  async function detectUsb(){
    if(!navigator.usb?.requestDevice){say("WebUSB no disponible (Chrome/Brave).",true);return;}
    try{
      const usb=await navigator.usb.requestDevice({filters:SUPPORTED.map(productId=>({vendorId:USB_VENDOR,productId}))});
      if(!SUPPORTED.includes(usb.productId))throw new Error("TI-Nspire no compatible");
      state.usb=usb;
      say(tr(4)+" · "+(usb.productName||"TI-Nspire"));
      note(tr(15));
    }catch(e){if(e.name!=="NotFoundError")say(e.message,true);}
  }
  function binary64(bytes){
    let str="";for(let i=0;i<bytes.length;i+=32768)str+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return btoa(str);
  }
  async function send(name,bytes){
    try{
      if(!state.connected)throw new Error(tr(3));
      if(!/\.tns$/i.test(name))throw new Error("Only .tns files can be transferred.");
      if(bytes.length>12*1024*1024)throw new Error("Maximum 12 MB.");
      if(state.items.some(x=>x.name===name)&&!confirm("¿Reemplazar "+name+"?"))return;
      say("Transfiriendo "+name+"…");
      await api("/api/upload",{body:{path:state.path,name,data:binary64(bytes)},timeout:90000});
      say("Transferido: "+name);await refresh();
    }catch(e){say(e.message,true);}
  }
  async function sendCurrent(){
    try{
      const builder=window.TnsFileSaveExperimental?.buildXmlDoctorArtifact;
      if(typeof builder!=="function")throw new Error("No está disponible la generación del documento actual.");
      const result=await builder();
      if(!result?.ok)throw new Error("No se pudo generar el TNS.");
      await send(result.filename,new Uint8Array(result.bytes));
    }catch(e){say(e.message,true);}
  }
  async function download(path){
    try{
      const data=await api("/api/download?path="+encodeURIComponent(path),{timeout:90000},true);
      const url=URL.createObjectURL(data),a=document.createElement("a");
      a.href=url;a.download=path.split("/").pop().replace(/[\\/:*?"<>|]/g,"_");a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(e){say(e.message,true);}
  }
  async function screenshot(){
    if(!state.screenshot){note(tr(14));return;}
    try{
      const data=await api("/api/screenshot",{timeout:25000},true);
      if(state.screenshotUrl)URL.revokeObjectURL(state.screenshotUrl);
      state.screenshotUrl=URL.createObjectURL(data);
      const box=el("[data-screen]");box.replaceChildren();
      const img=document.createElement("img");img.src=state.screenshotUrl;img.alt="TI-Nspire";
      const link=document.createElement("a");link.href=state.screenshotUrl;link.download="TI-Nspire-screen.png";link.textContent=tr(19);
      box.append(img,link);
    }catch(e){say(e.message,true);}
  }
  function close(){if(state.screenshotUrl)URL.revokeObjectURL(state.screenshotUrl);state.screenshotUrl=null;state.dialog?.remove();state.dialog=null;}
  function open(){
    if(state.dialog)return;
    const overlay=document.createElement("div");overlay.className="ti-calc-overlay";
    overlay.innerHTML=[
      '<section class="ti-calc-dialog" role="dialog" aria-modal="true" aria-labelledby="ti-calc-title">',
      '<header class="ti-calc-head"><div><h2 id="ti-calc-title"></h2><p data-status></p></div><button type="button" data-close class="ti-calc-close">×</button></header>',
      '<div class="ti-calc-toolbar"><button type="button" data-usb></button><button type="button" data-local></button><a data-help href="./docs/calculator-transfer.md" target="_blank" rel="noopener noreferrer"></a></div>',
      '<p class="ti-calc-note" data-note></p>',
      '<div class="ti-calc-columns"><aside class="ti-calc-side"><h3 data-devices-label></h3><div data-devices class="ti-calc-devices"></div><h3 data-capture-label></h3><button type="button" data-capture disabled></button>',
      '<div data-screen class="ti-calc-screen"></div><a data-official href="https://nspireconnect.ti.com/" target="_blank" rel="noopener noreferrer"></a></aside>',
      '<main class="ti-calc-files"><h3 data-files-label></h3><div class="ti-calc-nav"><button data-up type="button" disabled>↑</button><code data-path>/</code><button data-refresh type="button" disabled>↻</button></div>',
      '<div class="ti-calc-file-list" data-files></div><div class="ti-calc-actions"><label><span data-upload-label></span><input data-upload type="file" accept=".tns" hidden disabled></label><button data-current type="button" disabled></button><button data-mkdir type="button" disabled></button></div></main></div></section>'
    ].join("");
    document.body.append(overlay);state.dialog=overlay;state.path="/";state.items=[];
    const fill=[["#ti-calc-title",0],["[data-usb]",1],["[data-local]",2],["[data-files-label]",6],["[data-devices-label]",7],["[data-upload-label]",10],["[data-current]",11],["[data-mkdir]",12],["[data-capture-label]",13],["[data-capture]",13],["[data-help]",20],["[data-official]",21]];
    for(const [selector,index]of fill)el(selector).textContent=tr(index);
    el("[data-close]").setAttribute("aria-label",tr(24));
    el("[data-close]").addEventListener("click",close);
    overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
    el("[data-usb]").addEventListener("click",detectUsb);
    el("[data-local]").addEventListener("click",searchLocal);
    el("[data-refresh]").addEventListener("click",refresh);
    el("[data-up]").addEventListener("click",()=>openPath(state.path.split("/").slice(0,-1).join("/")||"/"));
    el("[data-current]").addEventListener("click",sendCurrent);
    el("[data-upload]").addEventListener("change",async e=>{
      const f=e.target.files?.[0];e.target.value="";if(f)await send(f.name,new Uint8Array(await f.arrayBuffer()));
    });
    el("[data-mkdir]").addEventListener("click",async()=>{
      const name=prompt(tr(22),"Nuevo");if(!name)return;
      try{await api("/api/mkdir",{body:{path:state.path,name}});await refresh();}catch(e){say(e.message,true);}
    });
    el("[data-capture]").addEventListener("click",screenshot);
    say(tr(3));note(tr(15));redraw();void searchLocal();
  }
  document.addEventListener("click",event=>{if(event.target.closest?.("#xml-transfer-calculator-btn")){event.preventDefault();open();}});
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&state.dialog)close();});
  window.TnsCalculatorTransfer=Object.freeze({open,close});
})();