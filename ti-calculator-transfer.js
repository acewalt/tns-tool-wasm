/* First-party TI-Nspire calculator manager. Uses ./ti-nspire-webusb.js. */
(() => {
  "use strict";
  const text = {
    es: {
      title:"Administrador TI-Nspire", subtitle:"Conexión USB directa · TNS Tool WASM",
      connect:"Conectar calculadora", disconnect:"Desconectar", close:"Cerrar",
      idle:"Sin conexión. Conecta una TI-Nspire por USB y pulsa Conectar.",
      connecting:"USB autorizado. Negociando protocolo TI-Nspire…",
      connected:"Calculadora conectada", failed:"Error de comunicación",
      note:"WebUSB requiere Chrome, Edge o Brave y un controlador USB compatible. No utiliza servicios externos.",
      folders:"Archivos y carpetas", model:"Calculadora", capture:"Captura de pantalla",
      captureHint:"Captura RLE experimental: escala de grises y color RGB565. Depende del modelo y firmware.",
      files:"Archivos", refresh:"Actualizar", newFolder:"Nueva carpeta", send:"Enviar TNS",
      sendCurrent:"Enviar TNS actual", receive:"Recibir seleccionados", remove:"Eliminar seleccionados",
      select:"Seleccionar", name:"Nombre", type:"Tipo", size:"Tamaño", location:"Carpeta",
      folder:"Carpeta", document:"Documento", empty:"Carpeta vacía.",
      unavailable:"Conecta una calculadora para ver sus archivos reales.", progress:"Transferencia",
      promptFolder:"Nombre de la carpeta:", overwrite:"¿Reemplazar el archivo existente en la calculadora?",
      confirmDelete:"¿Eliminar los archivos seleccionados? Esta acción no se puede deshacer.",
      confirmFolders:"También se eliminarán carpetas y todo su contenido. ¿Continuar?",
      success:"Operación confirmada por la calculadora.", downloaded:"Archivos recibidos.",
      emptySelection:"Selecciona documentos para recibir.", exportUnavailable:"No está disponible el generador del documento TNS actual.",
      screenshotUnsupported:"La calculadora no entregó una captura RLE compatible.", saveImage:"Guardar PNG",
      unready:"La calculadora todavía no ha confirmado la conexión.", help:"Ayuda USB",
      caution:"No desconectes el cable durante una transferencia.",
      loadingFolder:"Leyendo carpeta…", finishing:"Finalizando y cerrando transferencia…",
      destination:"Carpeta de destino", receiving:"Recibiendo", sending:"Enviando",
      capturePending:"Solicitando captura a la calculadora…",
      nativeSize:"Resolución original",
      savedReconnect:"Archivo guardado. La sesión USB dejó de responder: conecta nuevamente la calculadora.",
      captureSavedReconnect:"Captura obtenida. Reconecta la calculadora antes de otra operación.",
      reconnect:"La comunicación USB se interrumpió. Conecta nuevamente la calculadora."
    },
    en: {
      title:"TI-Nspire Manager", subtitle:"Native USB · TNS Tool WASM",
      connect:"Connect calculator", disconnect:"Disconnect", close:"Close",
      idle:"Not connected. Plug in a TI-Nspire via USB and click Connect.",
      connecting:"USB authorized. Negotiating TI-Nspire protocol…",
      connected:"Calculator connected", failed:"Communication error",
      note:"WebUSB requires Chrome, Edge or Brave and a compatible USB driver. No external service.",
      folders:"Calculator files and folders", model:"Calculator", capture:"Screen capture",
      captureHint:"Experimental RLE screenshot: grayscale and RGB565 colour. Depends on model and firmware.",
      files:"Files", refresh:"Refresh", newFolder:"New folder", send:"Send TNS",
      sendCurrent:"Send current TNS", receive:"Receive selected", remove:"Delete selected",
      select:"Select", name:"Name", type:"Type", size:"Size", location:"Folder",
      folder:"Folder", document:"Document", empty:"Folder empty.",
      unavailable:"Connect a calculator to see its real files.", progress:"Transfer",
      promptFolder:"Folder name:", overwrite:"Overwrite the existing calculator file?",
      confirmDelete:"Delete selected files? This cannot be undone.",
      confirmFolders:"This will also delete folders and all their contents. Continue?",
      success:"Operation confirmed by calculator.", downloaded:"Files received.",
      emptySelection:"Select documents to receive.", exportUnavailable:"Current TNS builder is unavailable.",
      screenshotUnsupported:"No compatible RLE screenshot was received.", saveImage:"Save PNG",
      unready:"Calculator has not confirmed a connection.", help:"USB help",
      caution:"Do not unplug USB while transferring.",
      loadingFolder:"Reading folder…", finishing:"Finishing and closing transfer…",
      destination:"Destination folder", receiving:"Receiving", sending:"Sending",
      capturePending:"Requesting calculator screenshot…",
      nativeSize:"Original resolution",
      savedReconnect:"File saved. USB session stopped responding: reconnect the calculator.",
      captureSavedReconnect:"Screenshot obtained. Reconnect the calculator before another operation.",
      reconnect:"USB communication was interrupted. Reconnect the calculator."
    },
    fr: {
      title:"Gestionnaire TI-Nspire", subtitle:"USB natif · TNS Tool WASM",
      connect:"Connecter calculatrice", disconnect:"Déconnecter", close:"Fermer",
      idle:"Déconnectée. Branchez la TI-Nspire, puis Connecter.",
      connecting:"USB autorisé. Connexion au protocole TI-Nspire…",
      connected:"Calculatrice connectée", failed:"Erreur de communication",
      note:"WebUSB requiert Chrome, Edge ou Brave et un pilote USB compatible.",
      folders:"Fichiers et dossiers", model:"Calculatrice", capture:"Capture d'écran",
      captureHint:"Capture RLE expérimentale : niveaux de gris et couleur RGB565, selon le modèle.",
      files:"Fichiers", refresh:"Actualiser", newFolder:"Nouveau dossier", send:"Envoyer TNS",
      sendCurrent:"Envoyer TNS actuel", receive:"Recevoir sélection", remove:"Supprimer sélection",
      select:"Sélectionner", name:"Nom", type:"Type", size:"Taille", location:"Dossier",
      folder:"Dossier", document:"Document", empty:"Dossier vide.",
      unavailable:"Connectez la calculatrice pour voir ses vrais fichiers.", progress:"Transfert",
      promptFolder:"Nom du dossier :", overwrite:"Remplacer le fichier existant sur la calculatrice ?",
      confirmDelete:"Supprimer les fichiers sélectionnés ? Opération irréversible.",
      confirmFolders:"Supprimer également les dossiers et tout leur contenu ?",
      success:"Opération confirmée par la calculatrice.", downloaded:"Fichiers reçus.",
      emptySelection:"Sélectionnez les documents.", exportUnavailable:"Générateur TNS indisponible.",
      screenshotUnsupported:"Aucune capture RLE compatible.", saveImage:"Enregistrer PNG",
      unready:"La connexion n'est pas confirmée.", help:"Aide USB",
      caution:"Ne débranchez pas le câble pendant le transfert.",
      loadingFolder:"Lecture du dossier…", finishing:"Finalisation du transfert…",
      destination:"Dossier cible", receiving:"Réception", sending:"Envoi",
      capturePending:"Demande de capture à la calculatrice…",
      nativeSize:"Résolution d'origine",
      savedReconnect:"Fichier enregistré. Reconnectez la calculatrice.",
      captureSavedReconnect:"Capture obtenue. Reconnectez la calculatrice.",
      reconnect:"Communication USB interrompue. Reconnectez la calculatrice."
    }
  };
  const q=(selector,root=document)=>root?.querySelector(selector);
  const state={
    root:null,link:null,path:"/",files:[],chosen:new Set(),busy:false,
    cache:new Map(),expanded:new Set(["/"]),transferStarted:0,
    lastDownloadSaved:false,lastScreenshotReady:false
  };
  function tr(k){
    const language=String(document.documentElement.lang||"es").slice(0,2);
    return (text[language]||text.es)[k]||k;
  }
  function say(value,error=false){
    const label=q("[data-ti-status]",state.root);
    if(label){label.textContent=value;label.dataset.error=error?"1":"0";}
  }
  function log(value){const label=q("[data-ti-log]",state.root);if(label)label.textContent=value;}
  const formatted=n=>n>=1048576?(n/1048576).toFixed(2)+" MB":n>=1024?(n/1024).toFixed(1)+" KB":n+" B";
  function saveFile(name,data,type="application/octet-stream"){
    const url=URL.createObjectURL(new Blob([data],{type}));
    const a=document.createElement("a");a.href=url;
    a.download=name.replace(/[/\\:*?"<>|]/g,"_");
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function allKnown(){
    const entries=new Map();
    for(const group of state.cache.values())for(const item of group)entries.set(item.path,item);
    return [...entries.values()];
  }
  function selected(){return allKnown().filter(x=>state.chosen.has(x.path));}
  function setCurrentFolder(path) {
    state.path=path;
    state.files=state.cache.get(path)||[];
  }
  function updateTransfer(name,current,total,direction,phase="data"){
    if(!state.root)return;
    const progress=q("[data-ti-bar]",state.root);
    const pct=total?Math.min(100,Math.round(100*current/total)):0;
    if(progress){progress.hidden=false;progress.value=pct;}
    const seconds=Math.max(0.001,(Date.now()-state.transferStarted)/1000);
    const rate=current/seconds;
    const label=direction==="upload"?tr("sending"):tr("receiving");
    const details=name+" · "+formatted(current)+" / "+formatted(total)+
      " ("+pct+"%) · "+formatted(Math.round(rate))+"/s · "+Math.round(seconds)+"s";
    if(phase==="finalizing"){say(tr("finishing"));log(details+" · "+tr("finishing"));}
    else {say(label+" "+name+" · "+pct+"%");log(details);}
  }
  function controls(){
    if(!state.root)return;
    const online=Boolean(state.link?.connected);
    const disable=(s,val)=>{const e=q("[data-ti-"+s+"]",state.root);if(e)e.disabled=val;};
    disable("connect",state.busy||online);
    disable("disconnect",state.busy||!online);
    for(const action of ["refresh","mkdir","upload","current","capture"])disable(action,state.busy||!online);
    disable("up",state.busy||!online||state.path==="/");
    disable("receive",state.busy||!online||!selected().length||selected().some(f=>f.isDir));
    disable("delete",state.busy||!online||!selected().length);
    const all=q("[data-ti-all]",state.root);
    if(all) {
      all.disabled=state.busy||!online||state.files.length===0;
      all.checked=state.files.length>0&&state.files.every(f=>state.chosen.has(f.path));
      all.indeterminate=state.files.some(f=>state.chosen.has(f.path))&&!all.checked;
    }
    const count=q("[data-ti-selected]",state.root);
    if(count)count.textContent=selected().length+"/"+allKnown().length;
    for(const item of state.root.querySelectorAll?.(".ti-tree-row input, .ti-tree-row button")||[])
      item.disabled=state.busy;
  }
  // Adapted from the Uiverse folder-tree concept, scoped to the manager.
  // Children are requested from the physical calculator only when expanded.
  function rows(){
    const host=q("[data-ti-rows]",state.root);
    if(!host)return;
    host.replaceChildren();
    q("[data-ti-path]",state.root).textContent=state.path;
    if(!state.link?.connected){
      const p=document.createElement("p");p.className="ti-manager-empty";
      p.textContent=tr("unavailable");host.append(p);controls();return;
    }
    const icon=(folder,expanded)=>{
      const el=document.createElement("span");el.className="ti-tree-icon";
      el.innerHTML=folder?
        (expanded?
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10h20M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>':
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>'):
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/></svg>';
      return el;
    };
    const buildBranch=(path,depth)=>{
      const ul=document.createElement("ul");ul.className="ti-tree-list";
      const entries=[...(state.cache.get(path)||[])].sort((a,b)=>
        Number(b.isDir)-Number(a.isDir)||a.name.localeCompare(b.name));
      if(!entries.length){
        const li=document.createElement("li");li.className="ti-tree-empty";
        li.textContent=tr("empty");ul.append(li);
      }
      for(const file of entries) {
        const li=document.createElement("li");li.className="ti-tree-item";
        const expanded=file.isDir&&state.expanded.has(file.path);
        const r=document.createElement("div");r.className="ti-manager-row ti-tree-row";
        r.classList.toggle("selected",state.chosen.has(file.path));
        r.classList.toggle("ti-tree-destination",file.isDir&&state.path===file.path);
        const cb=document.createElement("input");cb.type="checkbox";
        cb.checked=state.chosen.has(file.path);
        cb.setAttribute("aria-label",tr("select")+" "+file.name);
        cb.addEventListener("change",()=>{
          if(state.busy){cb.checked=state.chosen.has(file.path);return;}
          if(cb.checked)state.chosen.add(file.path);else state.chosen.delete(file.path);
          r.classList.toggle("selected",cb.checked);controls();
        });
        const b=document.createElement("button");b.type="button";b.className="ti-manager-filename ti-tree-label";
        b.title=file.path;
        const chevron=document.createElement("span");
        chevron.className="ti-tree-chevron"+(expanded?" is-expanded":"");
        chevron.textContent=file.isDir?"▸":"";
        const name=document.createElement("span");name.className="ti-tree-text";
        name.textContent=file.name;
        b.append(chevron,icon(file.isDir,expanded),name);
        b.addEventListener("click",()=>{
          if(state.busy)return;
          if(file.isDir){void toggleFolder(file.path);}
          else{cb.checked=!cb.checked;cb.dispatchEvent(new Event("change"));}
        });
        const type=document.createElement("span");type.textContent=file.isDir?tr("folder"):tr("document");
        const size=document.createElement("span");size.textContent=file.isDir?"—":formatted(file.size);
        const folder=document.createElement("span");folder.textContent=path;
        r.append(cb,b,type,size,folder);li.append(r);
        if(file.isDir){
          const wrapper=document.createElement("div");
          wrapper.className="ti-tree-children-wrapper"+(expanded?" is-open":"");
          const children=document.createElement("div");children.className="ti-tree-children";
          if(state.cache.has(file.path))children.append(buildBranch(file.path,depth+1));
          wrapper.append(children);li.append(wrapper);
        }
        ul.append(li);
      }
      return ul;
    };
    host.append(buildBranch("/",0));
    controls();
  }
  async function toggleFolder(path) {
    if(state.busy)return;
    if(state.expanded.has(path)) {
      state.expanded.delete(path);
      if(state.path===path)setCurrentFolder(path.split("/").slice(0,-1).join("/")||"/");
      rows();return;
    }
    state.expanded.add(path);
    setCurrentFolder(path);
    if(!state.cache.has(path))await list(path);
    else rows();
  }
  async function working(operation,message=tr("progress")){
    if(state.busy||!state.root)return;
    state.busy=true;
    state.lastDownloadSaved=false;state.lastScreenshotReady=false;
    controls();say(message);
    const progress=q("[data-ti-bar]",state.root);
    if(progress){progress.hidden=true;progress.value=0;}
    try{await operation();}
    catch(e){
      const broken=Boolean(state.link?.broken);
      if(broken){
        const oldLink=state.link;
        state.link=null;state.files=[];state.cache.clear();
        state.expanded=new Set(["/"]);state.chosen.clear();state.path="/";
        q("[data-ti-device]",state.root).textContent="—";
        // A WebUSB read may still be pending in Chromium. Close this handle
        // best-effort, but never reuse it after a transport timeout.
        void oldLink.close().catch(()=>{});
        rows();
        const message=state.lastDownloadSaved?tr("savedReconnect"):
          state.lastScreenshotReady?tr("captureSavedReconnect"):tr("reconnect");
        say(message,true);
        log(message+" "+String(e.message||e));
      }else{
        say(tr("failed")+": "+(e.message||e),true);
        log(String(e.message||e));
      }
    }
    finally{state.busy=false;controls();if(progress)progress.hidden=true;}
  }
  async function connect(){
    if(state.busy)return;
    let device;
    // Do not delay requestDevice; it requires the originating click activation.
    try{
      if(!window.TnsNspireUSB?.NspireUSB)throw Error("El controlador WebUSB aún no está cargado.");
      device=await window.TnsNspireUSB.NspireUSB.select();
    }
    catch(e){if(e.name!=="NotFoundError")say(e.message||String(e),true);return;}
    await working(async()=>{
      state.link=device;
      say(tr("connecting"));
      state.files=await device.connect();
      state.cache.clear();state.cache.set("/",state.files);
      state.expanded=new Set(["/"]);state.path="/";state.chosen.clear();
      q("[data-ti-device]",state.root).textContent=device.device.productName||
        (device.cx2?"TI-Nspire CX II / CAS":"TI-Nspire / CX");
      say(tr("connected")+" · "+q("[data-ti-device]",state.root).textContent);
      log(tr("success"));rows();
    },tr("connecting"));
  }
  async function disconnect(){
    await working(async()=>{
      await state.link?.close();
      state.link=null;state.path="/";state.files=[];
      state.cache.clear();state.expanded=new Set(["/"]);state.chosen.clear();
      q("[data-ti-device]",state.root).textContent="—";
      q("[data-ti-image]",state.root).replaceChildren();
      rows();say(tr("idle"));log("");
    });
  }
  async function list(path){
    if(!state.link?.connected)return;
    await working(async()=>{
      say(tr("loadingFolder")+" "+path);
      const files=await state.link.listDir(path);
      state.cache.set(path,files);
      state.expanded.add(path);setCurrentFolder(path);
      const stillKnown=new Set(allKnown().map(f=>f.path));
      for(const chosenPath of state.chosen)if(!stillKnown.has(chosenPath))state.chosen.delete(chosenPath);
      say(tr("connected"));rows();
    });
  }
  async function send(name,data){
    if(!state.link?.connected)throw Error(tr("unready"));
    if(!/\.tns$/i.test(name))throw Error(tr("files")+" .tns");
    const dest=window.TnsNspireUSB.childPath(state.path,name);
    if(state.files.some(f=>f.name.toLowerCase()===name.toLowerCase())&&!confirm(tr("overwrite")))return false;
    state.transferStarted=Date.now();
    await state.link.putFile(dest,data,(n,total,phase)=>{
      updateTransfer(name,n,total,"upload",phase);
    });
    return true;
  }
  async function upload(files){
    if(!files.length)return;
    await working(async()=>{
      let uploaded=0;
      for(const file of files){
        const data=new Uint8Array(await file.arrayBuffer());
        if(await send(file.name,data))uploaded++;
      }
      if(!uploaded)return;
      state.files=await state.link.listDir(state.path);
      state.cache.set(state.path,state.files);
      state.chosen.clear();rows();
      say(tr("success"));
    });
  }
  async function current(){
    if(!state.link?.connected)return;
    await working(async()=>{
      const createButton=document.querySelector("#xml-create-tns-btn");
      if(!createButton||createButton.disabled)throw Error(tr("exportUnavailable"));
      const builder=window.TnsFileSaveExperimental?.buildXmlDoctorArtifact;
      if(typeof builder!=="function")throw Error(tr("exportUnavailable"));
      const a=await builder();
      if(!a?.ok||!a.bytes?.length)throw Error(tr("exportUnavailable"));
      if(!(await send(a.filename,new Uint8Array(a.bytes))))return;
      state.files=await state.link.listDir(state.path);
      state.cache.set(state.path,state.files);
      state.chosen.clear();rows();say(tr("success"));
    });
  }
  async function receive(){
    if(!selected().length)return say(tr("emptySelection"),true);
    const targets=selected().filter(f=>!f.isDir);
    await working(async()=>{
      for(const f of targets){
        say(tr("progress")+" "+f.name);
        state.transferStarted=Date.now();
        let savedEarly=false;
        const data=await state.link.getFile(f.path,(n,total,phase)=>{
          updateTransfer(f.name,n,total,"download",phase);
        },bytes=>{
          // File payload is complete even when the device needs more time to
          // acknowledge the terminal command. Save without unblocking USB.
          try {saveFile(f.name,bytes);savedEarly=true;state.lastDownloadSaved=true;}
          catch(error){log(String(error?.message||error));}
        });
        if(!savedEarly)saveFile(f.name,data);
        log(f.name+" · "+formatted(data.length)+" · "+tr("downloaded"));
      }
      say(tr("downloaded"));
    });
  }
  async function mkdir(){
    const name=prompt(tr("promptFolder"));
    if(!name)return;
    await working(async()=>{
      await state.link.makeDir(window.TnsNspireUSB.childPath(state.path,name));
      state.files=await state.link.listDir(state.path);
      state.cache.set(state.path,state.files);
      rows();say(tr("success"));
    });
  }
  async function remove(){
    const targets=selected();
    if(!targets.length||!confirm(tr("confirmDelete")))return;
    if(targets.some(x=>x.isDir)&&!confirm(tr("confirmFolders")))return;
    await working(async()=>{
      for(const f of targets) {
        await state.link.deleteEntry(f.path,f.isDir);
        state.chosen.delete(f.path);
        if(f.isDir)for(const key of [...state.cache.keys()])
          if(key===f.path||key.startsWith(f.path+"/"))state.cache.delete(key);
      }
      state.files=await state.link.listDir(state.path);
      state.cache.set(state.path,state.files);
      state.chosen.clear();rows();say(tr("success"));
    });
  }
  function renderScreenshot(snapshot){
    const {width,height,pixels}=snapshot;
    const canvas=document.createElement("canvas");
    canvas.width=width;canvas.height=height;
    // Preserve native 1 image pixel = 1 CSS pixel in the preview.
    // The sidebar itself is wide enough for the 320x240 CX II display;
    // smaller viewports scroll rather than shrinking the image.
    canvas.style.width=width+"px";
    canvas.style.height=height+"px";
    canvas.className="ti-manager-native-screenshot";
    const ctx=canvas.getContext("2d"),img=ctx.createImageData(width,height);
    for(let i=0;i<width*height;i++){
      const p=i*4;
      if(snapshot.bpp===16){
        const rgb=pixels[i*2]|(pixels[i*2+1]<<8);
        img.data[p]=Math.round(((rgb>>>11)&31)*255/31);
        img.data[p+1]=Math.round(((rgb>>>5)&63)*255/63);
        img.data[p+2]=Math.round((rgb&31)*255/31);
      }else{
        const byte=pixels[i>>>1];
        const gray=((i&1)?byte&15:byte>>>4)*17;
        img.data[p]=gray;img.data[p+1]=gray;img.data[p+2]=gray;
      }
      img.data[p+3]=255;
    }
    ctx.putImageData(img,0,0);
    const host=q("[data-ti-image]",state.root);host.replaceChildren();
    const btn=document.createElement("button");btn.type="button";btn.textContent=tr("saveImage");
    btn.addEventListener("click",()=>{
      canvas.toBlob(blob=>{
        if(!blob)return;const url=URL.createObjectURL(blob);
        const a=document.createElement("a");a.href=url;a.download="TI-Nspire-captura.png";
        a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
      },"image/png");
    });
    const resolution=document.createElement("output");
    resolution.className="ti-manager-resolution";
    resolution.textContent=tr("nativeSize")+" · "+width+" × "+height+" px";
    host.append(canvas,resolution,btn);
  }
  async function screenshot(){
    await working(async()=>{
      state.transferStarted=Date.now();
      let renderedEarly=false;
      const image=await state.link.screenshotRle((received,total,phase)=>{
        if(phase==="requesting"){
          say(tr("capturePending"));
          log(tr("capturePending"));
        }else{
          updateTransfer("PNG",received,total,"download",phase);
        }
      },snapshot=>{
        // Render as soon as the screen bitmap is complete; final USB service
        // close can be delayed or fail independently of the image data.
        renderScreenshot(snapshot);
        renderedEarly=true;state.lastScreenshotReady=true;
      });
      if(!renderedEarly)renderScreenshot(image);
      say(tr("success"));
    },tr("capturePending"));
  }
  function close(){
    if(state.busy)return;
    const link=state.link;state.root?.remove();state.root=null;
    state.link=null;state.files=[];state.cache.clear();state.chosen.clear();
    if(link)void link.close().catch(console.error);
  }
  function open(){
    if(state.root)return;
    const root=document.createElement("div");root.className="ti-manager-overlay";
    root.innerHTML=[
      '<section class="ti-manager-dialog" role="dialog" aria-modal="true" aria-labelledby="ti-manager-title">',
      '<header class="ti-manager-head"><div><h2 id="ti-manager-title"></h2><p data-ti-subtitle></p></div>',
      '<button type="button" data-ti-close class="ti-manager-x" aria-label="Close">×</button></header>',
      '<div class="ti-manager-toolbar"><button type="button" data-ti-connect class="ti-manager-primary"></button>',
      '<button type="button" data-ti-disconnect disabled></button><span data-ti-status></span></div>',
      '<div class="ti-manager-grid"><aside class="ti-manager-side">',
      '<h3 data-ti-model-label></h3><div class="ti-manager-device" data-ti-device>—</div>',
      '<h3 data-ti-capture-label></h3><p data-ti-capture-hint></p>',
      '<button type="button" data-ti-capture disabled></button><div data-ti-image class="ti-manager-image"></div>',
      '<p data-ti-browser-hint></p></aside>',
      '<main class="ti-manager-files"><div class="ti-manager-files-head"><h3 data-ti-folder-title></h3>',
      '<div class="ti-manager-actions"><button type="button" data-ti-refresh disabled></button>',
      '<button type="button" data-ti-mkdir disabled></button><button type="button" data-ti-receive disabled></button>',
      '<button type="button" data-ti-delete disabled></button></div></div>',
      '<div class="ti-manager-path"><button type="button" data-ti-up disabled>↑</button><code data-ti-path>/</code><span data-ti-selected>0/0</span></div>',
      '<div class="ti-manager-table" tabindex="0" role="region"><div class="ti-manager-cols"><input type="checkbox" data-ti-all />',
      '<span data-ti-name-label></span><span data-ti-type-label></span><span data-ti-size-label></span><span data-ti-location-label></span></div>',
      '<div data-ti-rows></div></div>',
      '<div class="ti-manager-footer-actions"><label><span data-ti-upload-text></span><input type="file" data-ti-upload multiple accept=".tns" disabled hidden /></label>',
      '<button type="button" data-ti-current disabled></button></div>',
      '<div class="ti-manager-log"><span data-ti-progress-label></span><progress data-ti-bar max="100" value="0" hidden></progress><output data-ti-log></output></div></main></div>',
      '<footer class="ti-manager-bottom"><span data-ti-caution></span>',
      '<a data-ti-help href="./docs/calculator-transfer.md" target="_blank" rel="noopener noreferrer"></a></footer></section>'
    ].join("");
    document.body.append(root);state.root=root;state.path="/";state.files=[];
    state.cache.clear();state.expanded=new Set(["/"]);state.chosen.clear();
    const labels={
      "#ti-manager-title":"title","[data-ti-subtitle]":"subtitle",
      "[data-ti-connect]":"connect","[data-ti-disconnect]":"disconnect",
      "[data-ti-model-label]":"model","[data-ti-capture-label]":"capture",
      "[data-ti-capture-hint]":"captureHint","[data-ti-capture]":"capture",
      "[data-ti-browser-hint]":"note","[data-ti-folder-title]":"folders",
      "[data-ti-refresh]":"refresh","[data-ti-mkdir]":"newFolder",
      "[data-ti-receive]":"receive","[data-ti-delete]":"remove",
      "[data-ti-name-label]":"name","[data-ti-type-label]":"type",
      "[data-ti-size-label]":"size","[data-ti-location-label]":"location",
      "[data-ti-upload-text]":"send","[data-ti-current]":"sendCurrent",
      "[data-ti-progress-label]":"progress","[data-ti-caution]":"caution",
      "[data-ti-help]":"help"
    };
    for(const [sel,key]of Object.entries(labels))q(sel,root).textContent=tr(key);
    q(".ti-manager-table",root).setAttribute("aria-label",tr("folders"));
    q("[data-ti-close]",root).addEventListener("click",close);
    q("[data-ti-connect]",root).addEventListener("click",connect);
    q("[data-ti-disconnect]",root).addEventListener("click",disconnect);
    q("[data-ti-refresh]",root).addEventListener("click",()=>list(state.path));
    q("[data-ti-mkdir]",root).addEventListener("click",mkdir);
    q("[data-ti-receive]",root).addEventListener("click",receive);
    q("[data-ti-delete]",root).addEventListener("click",remove);
    q("[data-ti-current]",root).addEventListener("click",current);
    q("[data-ti-capture]",root).addEventListener("click",screenshot);
    q("[data-ti-up]",root).addEventListener("click",()=>{
      const parent=state.path.split("/").slice(0,-1).join("/")||"/";
      setCurrentFolder(parent);state.expanded.add(parent);
      if(state.cache.has(parent))rows();else void list(parent);
    });
    q("[data-ti-upload]",root).addEventListener("change",event=>{
      const files=Array.from(event.target.files||[]);
      event.target.value="";void upload(files);
    });
    q("[data-ti-all]",root).addEventListener("change",event=>{
      if(event.target.checked)state.files.forEach(f=>state.chosen.add(f.path));
      else state.chosen.clear();
      rows();
    });
    say(tr("idle"));log(tr("note"));rows();
  }
  document.addEventListener("click",event=>{
    if(event.target.closest?.("#xml-transfer-calculator-btn")){event.preventDefault();open();}
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&state.root&&!state.busy)close();
  });
  window.TnsCalculatorTransfer=Object.freeze({open,close});
})();