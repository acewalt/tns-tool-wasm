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
      captureHint:"Captura la pantalla actual de la calculadora. La imagen anterior se conserva hasta recibir una nueva.",
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
      caution:"Cerrar conserva la conexión. Pulsa Desconectar para liberarla. No retires el cable durante una transferencia.",
      loadingFolder:"Leyendo carpeta…", finishing:"Finalizando y cerrando transferencia…",
      destination:"Carpeta de destino", receiving:"Recibiendo", sending:"Enviando",
      capturePending:"Solicitando captura a la calculadora…",
      nativeSize:"Resolución original",
      savedReconnect:"Archivo guardado. Pulsa Conectar para continuar; puedes dejar el cable conectado.",
      captureSavedReconnect:"Captura obtenida. Pulsa Conectar para continuar; no hace falta retirar el cable.",
      reconnect:"La comunicación USB se interrumpió. Pulsa Conectar para reintentar.",
      captureUnavailable:"La calculadora no respondió a esta captura. La sesión USB se ha cerrado para poder reintentar. Pulsa Conectar sin retirar el cable; se conserva la última imagen válida.",
      downloadOne:"Descargar", renameOne:"Renombrar", deleteOne:"Eliminar",
      renamePrompt:"Nuevo nombre para", renameConflict:"Ya existe otro elemento con ese nombre.",
      renameExtension:"Los documentos TNS deben conservar su extensión .tns.",
      deletePrompt:"¿Eliminar este elemento de la calculadora?", folderWarning:"Si es una carpeta, esta acción puede borrar su contenido.",
      folderZip:"Descargando carpeta como ZIP…", folderTooLarge:"La carpeta supera el límite de 300 documentos o 64 MB.",
      folderTooDeep:"La estructura supera las 16 subcarpetas anidadas.", notConnected:"Conecta la calculadora para continuar.",
      viewList:"Vista de lista", viewGrid:"Vista de cuadrícula",
      chooseDestination:"Elegir carpeta de destino", destinationFor:"Archivos para enviar",
      sendHere:"Enviar aquí", cancelSend:"Cancelar", rootFolder:"Raíz de la calculadora",
      noSubfolders:"Esta carpeta no contiene subcarpetas.", folderLoadError:"No se pudo leer esta carpeta.",
      destinationLoading:"Buscando carpetas…", targetPath:"Guardar en",
      cancelled:"Envío cancelado", chooseFolder:"Abrir carpeta", backFolder:"Carpeta anterior",
      createFolder:"Crear carpeta", folderCreating:"Creando carpeta…", folderCreateError:"No se pudo crear la carpeta.",
      folderNameRequired:"Escribe un nombre de carpeta.", folderExists:"Ya existe un elemento con ese nombre."
    },
    en: {
      title:"TI-Nspire Manager", subtitle:"Native USB · TNS Tool WASM",
      connect:"Connect calculator", disconnect:"Disconnect", close:"Close",
      idle:"Not connected. Plug in a TI-Nspire via USB and click Connect.",
      connecting:"USB authorized. Negotiating TI-Nspire protocol…",
      connected:"Calculator connected", failed:"Communication error",
      note:"WebUSB requires Chrome, Edge or Brave and a compatible USB driver. No external service.",
      folders:"Calculator files and folders", model:"Calculator", capture:"Screen capture",
      captureHint:"Capture the calculator's current screen. The previous image stays visible until a new one arrives.",
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
      captureSavedReconnect:"Screenshot obtained. Click Connect to continue; leave the cable plugged in.",
      captureUnavailable:"The calculator did not respond to this screenshot. The USB session was closed so you can retry. Click Connect without unplugging the cable; the last valid image is preserved.",
      reconnect:"USB communication was interrupted. Reconnect the calculator.",
      downloadOne:"Download", renameOne:"Rename", deleteOne:"Delete",
      renamePrompt:"New name for", renameConflict:"An item with this name already exists.",
      renameExtension:"TNS documents must keep their .tns extension.",
      deletePrompt:"Delete this item from the calculator?", folderWarning:"If it is a folder, its contents may be deleted.",
      folderZip:"Downloading folder as ZIP…", folderTooLarge:"Folder exceeds 300 files or 64 MB.",
      folderTooDeep:"This folder is nested more than 16 levels.", notConnected:"Connect the calculator first.",
      viewList:"List view", viewGrid:"Grid view",
      chooseDestination:"Choose destination folder", destinationFor:"Files to send",
      sendHere:"Send here", cancelSend:"Cancel", rootFolder:"Calculator root",
      noSubfolders:"No subfolders in this folder.", folderLoadError:"Could not read this folder.",
      destinationLoading:"Loading folders…", targetPath:"Save to",
      cancelled:"Transfer cancelled", chooseFolder:"Open folder", backFolder:"Parent folder",
      createFolder:"Create folder", folderCreating:"Creating folder…", folderCreateError:"Could not create folder.",
      folderNameRequired:"Enter a folder name.", folderExists:"An item with that name already exists."
    },
    fr: {
      title:"Gestionnaire TI-Nspire", subtitle:"USB natif · TNS Tool WASM",
      connect:"Connecter calculatrice", disconnect:"Déconnecter", close:"Fermer",
      idle:"Déconnectée. Branchez la TI-Nspire, puis Connecter.",
      connecting:"USB autorisé. Connexion au protocole TI-Nspire…",
      connected:"Calculatrice connectée", failed:"Erreur de communication",
      note:"WebUSB requiert Chrome, Edge ou Brave et un pilote USB compatible.",
      folders:"Fichiers et dossiers", model:"Calculatrice", capture:"Capture d'écran",
      captureHint:"Capture l'écran actuel de la calculatrice. L'image précédente reste affichée jusqu'à réception d'une nouvelle capture.",
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
      captureSavedReconnect:"Capture obtenue. Cliquez sur Connecter sans débrancher le câble.",
      captureUnavailable:"La calculatrice ne répond pas à cette capture. La session USB a été fermée pour permettre un nouvel essai. Cliquez sur Connecter sans débrancher le câble ; la dernière image valide est conservée.",
      reconnect:"Communication USB interrompue. Reconnectez la calculatrice.",
      downloadOne:"Télécharger", renameOne:"Renommer", deleteOne:"Supprimer",
      renamePrompt:"Nouveau nom pour", renameConflict:"Un élément porte déjà ce nom.",
      renameExtension:"Les documents TNS doivent conserver l'extension .tns.",
      deletePrompt:"Supprimer cet élément de la calculatrice ?", folderWarning:"Si c'est un dossier, son contenu peut être supprimé.",
      folderZip:"Téléchargement du dossier en ZIP…", folderTooLarge:"Le dossier dépasse 300 fichiers ou 64 Mo.",
      folderTooDeep:"Plus de 16 niveaux de dossiers.", notConnected:"Connectez d'abord la calculatrice.",
      viewList:"Vue en liste", viewGrid:"Vue en grille",
      chooseDestination:"Choisir le dossier de destination", destinationFor:"Fichiers à envoyer",
      sendHere:"Envoyer ici", cancelSend:"Annuler", rootFolder:"Racine de la calculatrice",
      noSubfolders:"Aucun sous-dossier.", folderLoadError:"Impossible de lire le dossier.",
      destinationLoading:"Chargement des dossiers…", targetPath:"Enregistrer dans",
      cancelled:"Envoi annulé", chooseFolder:"Ouvrir le dossier", backFolder:"Dossier parent",
      createFolder:"Créer le dossier", folderCreating:"Création du dossier…", folderCreateError:"Impossible de créer le dossier.",
      folderNameRequired:"Saisissez un nom de dossier.", folderExists:"Un élément porte déjà ce nom."
    }
  };
  const q=(selector,root=document)=>root?.querySelector(selector);
  const state={
    root:null,link:null,path:"/",files:[],chosen:new Set(),busy:false,
    cache:new Map(),expanded:new Set(["/"]),transferStarted:0,view:"list",
    lastDownloadSaved:false,lastScreenshotReady:false,destinationPicker:null,
    lastDevice:null,selecting:false
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
    const locked=state.busy||state.selecting||Boolean(state.destinationPicker);
    const disable=(s,val)=>{const e=q("[data-ti-"+s+"]",state.root);if(e)e.disabled=val;};
    disable("connect",locked||online);
    // Hide Connect once there is a confirmed connection; show it again on
    // explicit disconnect or a broken transport so reconnection is possible.
    const connectButton=q("[data-ti-connect]",state.root);
    if(connectButton)connectButton.hidden=online;
    disable("disconnect",locked||!online);
    const disconnectButton=q("[data-ti-disconnect]",state.root);
    if(disconnectButton)disconnectButton.hidden=!online;
    for(const [view,selector] of [["list","[data-ti-view-list]"],["grid","[data-ti-view-grid]"]]){
      const button=q(selector,state.root);
      if(button){
        button.setAttribute("aria-pressed",String(state.view===view));
        button.classList.toggle("active",state.view===view);
      }
    }
    for(const action of ["refresh","mkdir","upload","current","capture"])disable(action,locked||!online);
    disable("up",locked||!online||state.path==="/");
    disable("receive",locked||!online||!selected().length||selected().some(f=>f.isDir));
    disable("delete",locked||!online||!selected().length);
    const all=q("[data-ti-all]",state.root);
    if(all) {
      all.disabled=locked||!online||state.files.length===0;
      all.checked=state.files.length>0&&state.files.every(f=>state.chosen.has(f.path));
      all.indeterminate=state.files.some(f=>state.chosen.has(f.path))&&!all.checked;
    }
    const count=q("[data-ti-selected]",state.root);
    if(count)count.textContent=selected().length+"/"+allKnown().length;
    for(const item of state.root.querySelectorAll?.(".ti-tree-row input, .ti-tree-row button, .ti-grid-tile input, .ti-grid-tile button")||[])
      item.disabled=locked;
  }
  // Adapted from the Uiverse folder-tree concept, scoped to the manager.
  // Children are requested from the physical calculator only when expanded.
  function rows(){
    const host=q("[data-ti-rows]",state.root);
    if(!host)return;
    host.replaceChildren();
    const table=q(".ti-manager-table",state.root);
    if(table)table.dataset.view=state.view;
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
    // Shared individual actions preserve the existing SVG theme masks.
    const makeFileActions=file=>{
      const actions=document.createElement("div");
      actions.className="ti-row-actions";
      for(const [kind,label,handler,danger] of [
        ["download",tr("downloadOne"),downloadOne,false],
        ["rename",tr("renameOne"),renameOne,false],
        ["delete",tr("deleteOne"),deleteOne,true]
      ]){
        const action=document.createElement("button");action.type="button";
        action.className="ti-row-action"+(danger?" ti-row-action-danger":"");
        const symbol=document.createElement("span");
        symbol.className="ti-action-icon ti-action-icon-"+kind;
        symbol.setAttribute("aria-hidden","true");
        action.append(symbol);
        action.title=label+" · "+file.name;
        action.setAttribute("aria-label",label+" "+file.name);
        action.addEventListener("click",event=>{
          event.preventDefault();event.stopPropagation();
          if(!state.busy)void handler(file);
        });
        actions.append(action);
      }
      return actions;
    };
    if(state.view==="grid"){
      const gallery=document.createElement("div");gallery.className="ti-grid-gallery";
      const entries=[...(state.cache.get(state.path)||[])].sort((a,b)=>
        Number(b.isDir)-Number(a.isDir)||a.name.localeCompare(b.name));
      if(!entries.length){
        const empty=document.createElement("p");empty.className="ti-manager-empty";
        empty.textContent=tr("empty");gallery.append(empty);
      }
      for(const file of entries){
        const tile=document.createElement("div");
        tile.className="ti-grid-tile";
        tile.classList.toggle("selected",state.chosen.has(file.path));
        tile.title=file.path;
        const checkbox=document.createElement("input");checkbox.type="checkbox";
        checkbox.className="ti-manager-item-check";
        checkbox.setAttribute("aria-label",tr("select")+" "+file.name);
        checkbox.checked=state.chosen.has(file.path);
        checkbox.addEventListener("change",()=>{
          if(state.busy){checkbox.checked=state.chosen.has(file.path);return;}
          if(checkbox.checked)state.chosen.add(file.path);
          else state.chosen.delete(file.path);
          tile.classList.toggle("selected",checkbox.checked);
          controls();
        });
        const openItem=document.createElement("button");openItem.type="button";
        openItem.className="ti-grid-open";openItem.title=file.path;
        openItem.append(icon(file.isDir,false));
        const name=document.createElement("span");name.className="ti-grid-name";
        name.textContent=file.name;
        const metadata=document.createElement("small");metadata.className="ti-grid-meta";
        metadata.textContent=file.isDir?tr("folder"):formatted(file.size);
        openItem.append(name,metadata);
        openItem.addEventListener("click",()=>{
          if(state.busy)return;
          if(file.isDir)void enterGridFolder(file.path);
          else{checkbox.checked=!checkbox.checked;checkbox.dispatchEvent(new Event("change"));}
        });
        tile.append(checkbox,openItem,makeFileActions(file));
        gallery.append(tile);
      }
      host.append(gallery);
      controls();
      return;
    }
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
        cb.className="ti-manager-item-check";
        cb.checked=state.chosen.has(file.path);
        cb.setAttribute("aria-label",tr("select")+" "+file.name);
        // The checkbox is revealed by the hovered or focused row in CSS,
        // and stays visible while checked (Windows Explorer style).
        cb.addEventListener("change",()=>{
          if(state.busy){cb.checked=state.chosen.has(file.path);return;}
          if(cb.checked)state.chosen.add(file.path);else state.chosen.delete(file.path);
          r.classList.toggle("selected",cb.checked);controls();
        });
        const nameCell=document.createElement("div");nameCell.className="ti-manager-namecell";
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
        nameCell.append(b,makeFileActions(file));
        r.append(cb,nameCell,type,size,folder);li.append(r);
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
  async function enterGridFolder(path){
    if(state.busy)return;
    state.expanded.add(path);
    setCurrentFolder(path);
    if(!state.cache.has(path))await list(path);
    else rows();
  }
  function setView(view){
    if(view!=="list"&&view!=="grid")return;
    state.view=view;
    try{localStorage.setItem("tns-tool-calculator-view",view);}catch(_){}
    rows();
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
        // Finish releasing the old USB handle before enabling Connect. An
        // unawaited close can otherwise close a newly reopened device.
        state.lastDevice=oldLink.detached ? null : oldLink.device || state.lastDevice;
        await oldLink.close().catch(()=>{});
        rows();
        const notice=state.lastDownloadSaved?tr("savedReconnect"):
          state.lastScreenshotReady?tr("captureSavedReconnect"):
          e.code==="USB_TIMEOUT"&&message===tr("capturePending")?tr("captureUnavailable"):tr("reconnect");
        say(notice,true);
        log(notice+" "+String(e.message||e));
      }else{
        say(tr("failed")+": "+(e.message||e),true);
        log(String(e.message||e));
      }
    }
    finally{state.busy=false;controls();if(progress)progress.hidden=true;}
  }
  async function connect(){
    if(state.busy||state.selecting||state.link?.connected)return;
    let device;
    // Do not delay requestDevice; it requires the originating click activation.
    state.selecting=true;controls();
    try{
      if(!window.TnsNspireUSB?.NspireUSB)throw Error("El controlador WebUSB aún no está cargado.");
      device=state.lastDevice ? new window.TnsNspireUSB.NspireUSB(state.lastDevice) :
        await window.TnsNspireUSB.NspireUSB.select();
    }
    catch(e){if(e.name!=="NotFoundError")say(e.message||String(e),true);return;}
    finally{state.selecting=false;controls();}
    await working(async()=>{
      state.link=device;
      state.lastDevice=device.device;
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
  // This chooser does not alter state.path. It only returns a real directory
  // path selected from the connected calculator (or null on cancellation).
  function chooseDestination(fileNames){
    if(!state.root||!state.link?.connected||state.busy||state.destinationPicker)
      return Promise.resolve(null);
    return new Promise(resolve=>{
      const originalFocus=document.activeElement;
      const picker={active:true,path:state.path,loading:false,creating:false,validated:false,entries:[],cancel:null};
      const overlay=document.createElement("div");
      overlay.className="ti-destination-overlay";
      const panel=document.createElement("section");
      panel.className="ti-destination-dialog";
      panel.setAttribute("role","dialog");
      panel.setAttribute("aria-modal","true");
      panel.setAttribute("aria-label",tr("chooseDestination"));
      const heading=document.createElement("h3");heading.textContent=tr("chooseDestination");
      const description=document.createElement("p");
      description.className="ti-destination-description";
      description.textContent=tr("destinationFor")+": "+fileNames.join(", ");
      const toolbar=document.createElement("div");toolbar.className="ti-destination-toolbar";
      const home=document.createElement("button");home.type="button";
      home.className="ti-destination-nav";home.textContent="⌂";
      home.title=tr("rootFolder");home.setAttribute("aria-label",tr("rootFolder"));
      const up=document.createElement("button");up.type="button";
      up.className="ti-destination-nav";up.textContent="↑";
      up.title=tr("backFolder");up.setAttribute("aria-label",tr("backFolder"));
      const breadcrumb=document.createElement("code");breadcrumb.className="ti-destination-path";
      toolbar.append(home,up,breadcrumb);
      const newFolder=document.createElement("button");newFolder.type="button";
      newFolder.className="ti-destination-new-folder";newFolder.textContent=tr("newFolder");
      toolbar.append(newFolder);
      const creation=document.createElement("form");creation.className="ti-destination-create-form";creation.hidden=true;
      const folderName=document.createElement("input");folderName.type="text";folderName.maxLength=170;
      folderName.className="ti-destination-folder-name";folderName.placeholder=tr("promptFolder");
      folderName.setAttribute("aria-label",tr("promptFolder"));
      const createButton=document.createElement("button");createButton.type="submit";
      createButton.className="ti-destination-create-confirm";createButton.textContent=tr("createFolder");
      const cancelCreation=document.createElement("button");cancelCreation.type="button";
      cancelCreation.className="ti-destination-create-cancel";cancelCreation.textContent=tr("cancelSend");
      creation.append(folderName,createButton,cancelCreation);
      const listing=document.createElement("div");
      listing.className="ti-destination-list";
      listing.setAttribute("role","list");
      const notice=document.createElement("p");
      notice.className="ti-destination-notice";
      notice.setAttribute("role","status");
      const footer=document.createElement("div");
      footer.className="ti-destination-footer";
      const cancel=document.createElement("button");cancel.type="button";
      cancel.className="ti-destination-cancel";cancel.textContent=tr("cancelSend");
      const confirmButton=document.createElement("button");confirmButton.type="button";
      confirmButton.className="ti-destination-confirm";confirmButton.textContent=tr("sendHere");
      footer.append(cancel,confirmButton);
      panel.append(heading,description,toolbar,creation,listing,notice,footer);
      overlay.append(panel);
      const finish=value=>{
        if(!picker.active||picker.creating)return;
        picker.active=false;
        overlay.remove();
        if(state.destinationPicker===picker)state.destinationPicker=null;
        controls();
        try{originalFocus?.focus?.();}catch(_){}
        resolve(value);
      };
      picker.cancel=()=>finish(null);
      const updateButtons=()=>{
        breadcrumb.textContent=picker.path;
        home.disabled=picker.loading||picker.path==="/";
        up.disabled=picker.loading||picker.path==="/";
        confirmButton.disabled=picker.loading||!picker.validated||!state.link?.connected;
        newFolder.disabled=picker.loading||!picker.validated||!state.link?.connected;
        folderName.disabled=picker.loading;createButton.disabled=picker.loading;
        cancelCreation.disabled=picker.loading;cancel.disabled=picker.creating;
      };
      const enter=async path=>{
        if(!picker.active||picker.loading||!state.link?.connected)return;
        const wasValidated=picker.validated;
        picker.loading=true;picker.validated=false;
        notice.textContent=tr("destinationLoading");notice.dataset.error="0";
        listing.replaceChildren();
        updateButtons();
        try{
          // Folder information may already be cached from the main explorer.
          const entries=state.cache.get(path)||await state.link.listDir(path);
          if(!picker.active)return;
          state.cache.set(path,entries);
          picker.path=path;
          picker.entries=entries;
          picker.validated=true;
          const folders=entries.filter(entry=>entry.isDir).sort((a,b)=>
            a.name.localeCompare(b.name));
          if(!folders.length){
            const empty=document.createElement("p");
            empty.className="ti-destination-empty";
            empty.textContent=tr("noSubfolders");
            listing.append(empty);
          }
          for(const folder of folders){
            const item=document.createElement("button");item.type="button";
            item.className="ti-destination-folder";
            item.setAttribute("aria-label",tr("chooseFolder")+" "+folder.name);
            const symbol=document.createElement("span");
            symbol.className="ti-destination-folder-icon";
            symbol.setAttribute("aria-hidden","true");
            symbol.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/></svg>';
            const label=document.createElement("span");label.textContent=folder.name;
            const arrow=document.createElement("span");arrow.textContent="›";
            item.append(symbol,label,arrow);
            item.addEventListener("click",()=>{void enter(folder.path);});
            listing.append(item);
          }
          notice.textContent="";
        }catch(error){
          if(picker.active){
            picker.validated=wasValidated;
            notice.textContent=tr("folderLoadError")+" "+(error.message||error);
            notice.dataset.error="1";
          }
        }finally{
          picker.loading=false;
          if(picker.active)updateButtons();
        }
      };
      newFolder.addEventListener("click",()=>{
        if(newFolder.disabled)return;
        creation.hidden=false;folderName.value="";folderName.focus();
      });
      cancelCreation.addEventListener("click",()=>{creation.hidden=true;newFolder.focus();});
      creation.addEventListener("submit",async event=>{
        event.preventDefault();
        if(picker.loading||!picker.validated||!state.link?.connected)return;
        const name=folderName.value.trim(),parent=picker.path;
        let path;
        try{
          if(!name)throw Error(tr("folderNameRequired"));
          path=window.TnsNspireUSB.childPath(parent,name);
          if(picker.entries.some(entry=>entry.name.toLowerCase()===name.toLowerCase()))
            throw Error(tr("folderExists"));
        }catch(error){notice.textContent=error.message;notice.dataset.error="1";folderName.focus();return;}
        picker.loading=true;picker.creating=true;updateButtons();
        notice.textContent=tr("folderCreating");notice.dataset.error="0";
        try{
          await state.link.makeDir(path);
          // A USB acknowledgement must precede navigation or any file upload.
          state.cache.delete(parent);state.cache.delete(path);
          const entries=await state.link.listDir(parent);
          state.cache.set(parent,entries);picker.entries=entries;
          if(parent===state.path){state.files=entries;rows();}
          creation.hidden=true;
          picker.creating=false;picker.loading=false;
          await enter(path);
        }catch(error){
          notice.textContent=tr("folderCreateError")+" "+(error.message||error);
          notice.dataset.error="1";
        }finally{
          picker.creating=false;picker.loading=false;
          if(picker.active)updateButtons();
        }
      });
      cancel.addEventListener("click",()=>finish(null));
      confirmButton.addEventListener("click",()=>{
        if(!picker.loading&&picker.validated)finish(picker.path);
      });
      home.addEventListener("click",()=>{void enter("/");});
      up.addEventListener("click",()=>{
        void enter(picker.path.split("/").slice(0,-1).join("/")||"/");
      });
      overlay.addEventListener("keydown",event=>{
        if(event.key==="Escape"){
          event.preventDefault();event.stopPropagation();
          if(picker.creating)return;
          if(!creation.hidden){creation.hidden=true;newFolder.focus();}else finish(null);
        }
      });
      // Clicking outside the dialog cancels without transferring any bytes.
      overlay.addEventListener("click",event=>{
        if(event.target===overlay)finish(null);
      });
      state.destinationPicker=picker;
      q(".ti-manager-dialog",state.root).append(overlay);
      controls();
      cancel.focus();
      void enter(picker.path);
    });
  }
  async function send(name,data,directory,knownNames){
    if(!state.link?.connected)throw Error(tr("unready"));
    if(!/\.tns$/i.test(name))throw Error(tr("files")+" .tns");
    const dest=window.TnsNspireUSB.childPath(directory,name);
    if(knownNames.has(name.toLowerCase())&&!confirm(tr("overwrite")+"\n"+dest))
      return false;
    state.transferStarted=Date.now();
    await state.link.putFile(dest,data,(n,total,phase)=>{
      updateTransfer(name,n,total,"upload",phase);
    });
    knownNames.add(name.toLowerCase());
    return true;
  }
  async function refreshUploadDestination(directory){
    const files=await state.link.listDir(directory);
    state.cache.set(directory,files);
    if(state.path===directory)state.files=files;
    state.chosen.clear();
    rows();
  }
  async function upload(files){
    if(!files.length||state.busy||!state.link?.connected)return;
    const directory=await chooseDestination(files.map(file=>file.name));
    if(directory===null){say(tr("cancelled"));return;}
    await working(async()=>{
      const currentEntries=await state.link.listDir(directory);
      state.cache.set(directory,currentEntries);
      const knownNames=new Set(currentEntries.map(f=>f.name.toLowerCase()));
      let uploaded=0;
      for(const file of files){
        const data=new Uint8Array(await file.arrayBuffer());
        if(await send(file.name,data,directory,knownNames))uploaded++;
      }
      if(!uploaded){say(tr("cancelled"));return;}
      await refreshUploadDestination(directory);
      say(tr("success")+" · "+directory);
    });
  }
  async function current(){
    if(!state.link?.connected||state.busy)return;
    const createButton=document.querySelector("#xml-create-tns-btn");
    const builder=window.TnsFileSaveExperimental?.buildXmlDoctorArtifact;
    if(!createButton||createButton.disabled||typeof builder!=="function")
      return say(tr("exportUnavailable"),true);
    const directory=await chooseDestination([tr("sendCurrent")]);
    if(directory===null){say(tr("cancelled"));return;}
    await working(async()=>{
      const artifact=await builder();
      if(!artifact?.ok||!artifact.bytes?.length)throw Error(tr("exportUnavailable"));
      const currentEntries=await state.link.listDir(directory);
      state.cache.set(directory,currentEntries);
      const knownNames=new Set(currentEntries.map(f=>f.name.toLowerCase()));
      if(!(await send(artifact.filename,new Uint8Array(artifact.bytes),directory,knownNames))){
        say(tr("cancelled"));return;
      }
      await refreshUploadDestination(directory);
      say(tr("success")+" · "+directory);
    });
  }
  async function receive(){
    const targets=selected().filter(f=>!f.isDir);
    if(!targets.length)return say(tr("emptySelection"),true);
    await working(async()=>{
      for(const file of targets)await downloadDocument(file);
      say(tr("downloaded"));
    });
  }
  function parentPath(path){
    return path.split("/").slice(0,-1).join("/")||"/";
  }
  function dropFolderCache(path) {
    for(const key of [...state.cache.keys()]){
      if(key===path||key.startsWith(path+"/"))state.cache.delete(key);
    }
    for(const key of [...state.expanded]){
      if(key===path||key.startsWith(path+"/"))state.expanded.delete(key);
    }
    for(const key of [...state.chosen]){
      if(key===path||key.startsWith(path+"/"))state.chosen.delete(key);
    }
    if(state.path===path||state.path.startsWith(path+"/"))setCurrentFolder(parentPath(path));
  }
  async function refreshParent(path) {
    const files=await state.link.listDir(path);
    state.cache.set(path,files);
    if(state.path===path)state.files=files;
    rows();
  }
  async function downloadDocument(file){
    state.transferStarted=Date.now();
    let savedEarly=false;
    const data=await state.link.getFile(file.path,(received,total,phase)=>{
      updateTransfer(file.name,received,total,"download",phase);
    },bytes=>{
      try {
        saveFile(file.name,bytes);
        savedEarly=true;
        state.lastDownloadSaved=true;
      } catch(error) { log(String(error?.message||error)); }
    });
    if(!savedEarly){saveFile(file.name,data);state.lastDownloadSaved=true;}
    log(file.name+" · "+formatted(data.length)+" · "+tr("downloaded"));
  }
  async function downloadFolder(folder){
    const zip=window.TnsCalculatorZip;
    if(!zip?.pack)throw Error("No se ha cargado el módulo ZIP.");
    const MAX_FILES=300,MAX_BYTES=64*1024*1024,MAX_DEPTH=16;
    const entries=[{path:folder.name+"/",isDir:true}];
    const documents=[],stack=[{path:folder.path,relative:folder.name+"/",depth:0}];
    let cumulative=0;
    // Enumerate first to check size limits BEFORE downloading document bytes.
    while(stack.length){
      const item=stack.pop();
      if(item.depth>MAX_DEPTH)throw Error(tr("folderTooDeep"));
      say(tr("loadingFolder")+" "+item.path);
      const children=state.cache.get(item.path)||await state.link.listDir(item.path);
      state.cache.set(item.path,children);
      for(const child of children){
        const relative=item.relative+child.name+(child.isDir?"/":"");
        if(child.isDir){
          entries.push({path:relative,isDir:true});
          stack.push({path:child.path,relative,depth:item.depth+1});
        }else{
          documents.push({file:child,relative});
          cumulative+=child.size||0;
          if(documents.length>MAX_FILES||cumulative>MAX_BYTES)
            throw Error(tr("folderTooLarge"));
        }
      }
      if(entries.length+documents.length>1000)throw Error(tr("folderTooLarge"));
    }
    const MAX_REMAINING=MAX_BYTES;
    let total=0;
    for(const {file,relative} of documents){
      if(file.size===0){
        entries.push({path:relative,data:new Uint8Array(0)});
        continue;
      }
      state.transferStarted=Date.now();
      say(tr("folderZip")+" "+file.name);
      const data=await state.link.getFile(file.path,(received,count,phase)=>{
        updateTransfer(file.name,received,count,"download",phase);
      });
      total+=data.length;
      if(total>MAX_REMAINING)throw Error(tr("folderTooLarge"));
      entries.push({path:relative,data});
    }
    const bytes=zip.pack(entries);
    saveFile(folder.name+".zip",bytes,"application/zip");
    state.lastDownloadSaved=true;
    say(tr("downloaded"));
  }
  async function downloadOne(file){
    if(!state.link?.connected||state.busy)return;
    await working(async()=>{
      if(file.isDir)await downloadFolder(file);
      else await downloadDocument(file);
      say(tr("downloaded"));
    },file.isDir?tr("folderZip"):tr("receiving")+" "+file.name);
  }
  async function renameOne(file){
    if(!state.link?.connected||state.busy)return;
    const answer=prompt(tr("renamePrompt")+" "+file.name+":",file.name);
    if(answer===null)return;
    let name=answer.trim();
    if(!name||name===file.name)return;
    // Keep the TNS document type intact. Never rename an existing TNS to a
    // different extension, and do not move it into another directory.
    if(!file.isDir&&/\.tns$/i.test(file.name)){
      if(!name.includes("."))name+=".tns";
      else if(!/\.tns$/i.test(name)){say(tr("renameExtension"),true);return;}
    }
    const parent=parentPath(file.path);
    let next;
    try { next=window.TnsNspireUSB.childPath(parent,name); }
    catch(error){say(error.message||String(error),true);return;}
    if(state.cache.get(parent)?.some(item=>
      item.path!==file.path&&item.name.toLowerCase()===name.toLowerCase())){
      say(tr("renameConflict"),true);return;
    }
    if(next===file.path)return;
    await working(async()=>{
      // Recheck the actual device directory immediately before renaming:
      // cached lists may be stale if the user changed files on the handheld.
      const current=await state.link.listDir(parent);
      state.cache.set(parent,current);
      if(current.some(item=>item.path!==file.path &&
        item.name.toLowerCase()===name.toLowerCase()))
        throw Error(tr("renameConflict"));
      await state.link.renameEntry(file.path,next);
      state.chosen.delete(file.path);
      if(file.isDir)dropFolderCache(file.path);
      await refreshParent(parent);
      say(tr("success"));
    },tr("renameOne")+" "+file.name);
  }
  async function deleteOne(file){
    if(!state.link?.connected||state.busy)return;
    if(!confirm(tr("deletePrompt")+"\n"+file.path+
       (file.isDir?"\n"+tr("folderWarning"):"")))return;
    await working(async()=>{
      await state.link.deleteEntry(file.path,file.isDir);
      state.chosen.delete(file.path);
      if(file.isDir)dropFolderCache(file.path);
      await refreshParent(parentPath(file.path));
      say(tr("success"));
    },tr("deleteOne")+" "+file.name);
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
    if(state.destinationPicker)state.destinationPicker.cancel();
    // Hiding the manager must not tear down a healthy USB session. Retain the
    // bitmap, folder and selection too; Disconnect is the explicit release.
    if(state.root)state.root.hidden=true;
  }
  function open(){
    if(state.root){state.root.hidden=false;controls();return;}
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
      '<div class="ti-manager-actions"><div class="ti-manager-view-switch" role="group" data-ti-view-group>',
      '<button type="button" data-ti-view-list aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.1M4 12h.1M4 18h.1" stroke-width="3"/></svg></button>',
      '<button type="button" data-ti-view-grid aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="3.5" width="7" height="7" rx="1.3"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.3"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.3"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.3"/></svg></button>',
      '</div><button type="button" data-ti-refresh disabled></button>',
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
    try{
      const saved=localStorage.getItem("tns-tool-calculator-view");
      if(saved==="list"||saved==="grid")state.view=saved;
    }catch(_){} 
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
    for(const [selector,emoji]of Object.entries({
      "[data-ti-mkdir]":"📁➕", "[data-ti-delete]":"🗑️",
      "[data-ti-receive]":"⬇️","[data-ti-refresh]":"🔄",
      "[data-ti-upload-text]":"📤"
    })){
      const control=q(selector,root);
      if(control)control.textContent=emoji+" "+control.textContent;
    }
    q(".ti-manager-table",root).setAttribute("aria-label",tr("folders"));
    q("[data-ti-view-group]",root).setAttribute("aria-label",tr("folders"));
    for(const [view,key] of [["list","viewList"],["grid","viewGrid"]]){
      const button=q("[data-ti-view-"+view+"]",root);
      button.title=tr(key);
      button.setAttribute("aria-label",tr(key));
      button.addEventListener("click",()=>setView(view));
    }
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
    if(event.key==="Escape"&&state.destinationPicker){
      event.preventDefault();state.destinationPicker.cancel();return;
    }
    if(event.key==="Escape"&&state.root&&!state.busy)close();
  });
  if(typeof navigator!=="undefined")navigator.usb?.addEventListener?.("disconnect",event=>{
    const link=state.link;
    if(event.device===state.lastDevice)state.lastDevice=null;
    if(!link||link.device!==event.device)return;
    link.detached=true;link.broken=true;link.connected=false;
    if(!state.busy)void working(async()=>{
      await link.close();state.link=null;state.files=[];state.cache.clear();state.chosen.clear();
      q("[data-ti-device]",state.root).textContent="—";
      rows();say(tr("reconnect"),true);
    });
  });
  window.TnsCalculatorTransfer=Object.freeze({open,close});
})();
