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
      captureHint:"Experimental: servicio RLE de 4 bits. No todas las pantallas a color son compatibles.",
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
      caution:"No desconectes el cable durante una transferencia."
    },
    en: {
      title:"TI-Nspire Manager", subtitle:"Native USB · TNS Tool WASM",
      connect:"Connect calculator", disconnect:"Disconnect", close:"Close",
      idle:"Not connected. Plug in a TI-Nspire via USB and click Connect.",
      connecting:"USB authorized. Negotiating TI-Nspire protocol…",
      connected:"Calculator connected", failed:"Communication error",
      note:"WebUSB requires Chrome, Edge or Brave and a compatible USB driver. No external service.",
      folders:"Calculator files and folders", model:"Calculator", capture:"Screen capture",
      captureHint:"Experimental: 4-bit RLE service. Not every colour display is supported.",
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
      caution:"Do not unplug USB while transferring."
    },
    fr: {
      title:"Gestionnaire TI-Nspire", subtitle:"USB natif · TNS Tool WASM",
      connect:"Connecter calculatrice", disconnect:"Déconnecter", close:"Fermer",
      idle:"Déconnectée. Branchez la TI-Nspire, puis Connecter.",
      connecting:"USB autorisé. Connexion au protocole TI-Nspire…",
      connected:"Calculatrice connectée", failed:"Erreur de communication",
      note:"WebUSB requiert Chrome, Edge ou Brave et un pilote USB compatible.",
      folders:"Fichiers et dossiers", model:"Calculatrice", capture:"Capture d'écran",
      captureHint:"Expérimental : service RLE 4 bits. Les écrans couleur peuvent être incompatibles.",
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
      caution:"Ne débranchez pas le câble pendant le transfert."
    }
  };
  const q=(selector,root=document)=>root?.querySelector(selector);
  const state={root:null,link:null,path:"/",files:[],chosen:new Set(),busy:false};
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
  function selected(){return state.files.filter(x=>state.chosen.has(x.path));}
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
    if(all)all.checked=state.files.length>0 && selected().length===state.files.length;
    const count=q("[data-ti-selected]",state.root);
    if(count)count.textContent=selected().length+"/"+state.files.length;
  }
  function rows(){
    const root=q("[data-ti-rows]",state.root);
    if(!root)return;
    root.replaceChildren();
    q("[data-ti-path]",state.root).textContent=state.path;
    if(!state.link?.connected||!state.files.length){
      const p=document.createElement("p");p.className="ti-manager-empty";
      p.textContent=state.link?.connected?tr("empty"):tr("unavailable");
      root.append(p);controls();return;
    }
    const items=[...state.files].sort((a,b)=>Number(b.isDir)-Number(a.isDir)||a.name.localeCompare(b.name));
    for(const file of items){
      const r=document.createElement("div");r.className="ti-manager-row";
      r.classList.toggle("selected",state.chosen.has(file.path));
      const cb=document.createElement("input");cb.type="checkbox";cb.checked=state.chosen.has(file.path);
      cb.setAttribute("aria-label",tr("select")+" "+file.name);
      cb.addEventListener("change",()=>{
        if(cb.checked)state.chosen.add(file.path);else state.chosen.delete(file.path);
        r.classList.toggle("selected",cb.checked);controls();
      });
      const b=document.createElement("button");b.type="button";b.className="ti-manager-filename";
      b.textContent=(file.isDir?"▣  ":"▤  ")+file.name;
      b.title=file.path;
      b.addEventListener("click",()=>{
        if(file.isDir){void list(file.path);}
        else{cb.checked=!cb.checked;cb.dispatchEvent(new Event("change"));}
      });
      const typ=document.createElement("span");typ.textContent=file.isDir?tr("folder"):tr("document");
      const size=document.createElement("span");size.textContent=file.isDir?"—":formatted(file.size);
      const folder=document.createElement("span");folder.textContent=state.path;
      r.append(cb,b,typ,size,folder);root.append(r);
    }
    controls();
  }
  async function working(operation,message=tr("progress")){
    if(state.busy||!state.root)return;
    state.busy=true;controls();say(message);
    try{await operation();}
    catch(e){say(tr("failed")+": "+(e.message||e),true);log(String(e.message||e));}
    finally{state.busy=false;controls();}
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
      state.path="/";state.chosen.clear();
      q("[data-ti-device]",state.root).textContent=device.device.productName||
        (device.cx2?"TI-Nspire CX II / CAS":"TI-Nspire / CX");
      say(tr("connected")+" · "+q("[data-ti-device]",state.root).textContent);
      log(tr("success"));rows();
    },tr("connecting"));
  }
  async function disconnect(){
    await working(async()=>{
      await state.link?.close();
      state.link=null;state.path="/";state.files=[];state.chosen.clear();
      q("[data-ti-device]",state.root).textContent="—";
      q("[data-ti-image]",state.root).replaceChildren();
      rows();say(tr("idle"));log("");
    });
  }
  async function list(path){
    if(!state.link?.connected)return;
    await working(async()=>{
      const files=await state.link.listDir(path);
      state.path=path;state.files=files;state.chosen.clear();
      say(tr("connected"));rows();
    });
  }
  async function send(name,data){
    if(!state.link?.connected)throw Error(tr("unready"));
    if(!/\.tns$/i.test(name))throw Error(tr("files")+" .tns");
    const dest=window.TnsNspireUSB.childPath(state.path,name);
    if(state.files.some(f=>f.name.toLowerCase()===name.toLowerCase())&&!confirm(tr("overwrite")))return false;
    await state.link.putFile(dest,data,(n,total)=>{
      const pct=Math.round(n/total*100);
      say(tr("progress")+" "+name+" · "+pct+"%");
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
      state.chosen.clear();rows();say(tr("success"));
    });
  }
  async function receive(){
    if(!selected().length)return say(tr("emptySelection"),true);
    const targets=selected().filter(f=>!f.isDir);
    await working(async()=>{
      for(const f of targets){
        say(tr("progress")+" "+f.name);
        const data=await state.link.getFile(f.path,(n,total)=>{
          log(f.name+": "+Math.round(n/total*100)+"%");
        });
        saveFile(f.name,data);
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
      rows();say(tr("success"));
    });
  }
  async function remove(){
    const targets=selected();
    if(!targets.length||!confirm(tr("confirmDelete")))return;
    if(targets.some(x=>x.isDir)&&!confirm(tr("confirmFolders")))return;
    await working(async()=>{
      for(const f of targets)await state.link.deleteEntry(f.path,f.isDir);
      state.files=await state.link.listDir(state.path);
      state.chosen.clear();rows();say(tr("success"));
    });
  }
  function renderScreenshot(snapshot){
    const {width,height,pixels}=snapshot;
    const canvas=document.createElement("canvas");
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext("2d"),img=ctx.createImageData(width,height);
    for(let i=0;i<width*height;i++){
      const byte=pixels[i>>>1];
      const gray=((i&1)?byte&15:byte>>>4)*17;
      const p=i*4;img.data[p]=gray;img.data[p+1]=gray;img.data[p+2]=gray;img.data[p+3]=255;
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
    host.append(canvas,btn);
  }
  async function screenshot(){
    await working(async()=>{
      const image=await state.link.screenshotRle();
      renderScreenshot(image);say(tr("success"));
    });
  }
  function close(){
    if(state.busy)return;
    const link=state.link;state.root?.remove();state.root=null;
    state.link=null;state.files=[];state.chosen.clear();
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
      '<div class="ti-manager-table"><div class="ti-manager-cols"><input type="checkbox" data-ti-all />',
      '<span data-ti-name-label></span><span data-ti-type-label></span><span data-ti-size-label></span><span data-ti-location-label></span></div>',
      '<div data-ti-rows></div></div>',
      '<div class="ti-manager-footer-actions"><label><span data-ti-upload-text></span><input type="file" data-ti-upload multiple accept=".tns" disabled hidden /></label>',
      '<button type="button" data-ti-current disabled></button></div>',
      '<div class="ti-manager-log"><span data-ti-progress-label></span><output data-ti-log></output></div></main></div>',
      '<footer class="ti-manager-bottom"><span data-ti-caution></span>',
      '<a data-ti-help href="./docs/calculator-transfer.md" target="_blank" rel="noopener noreferrer"></a></footer></section>'
    ].join("");
    document.body.append(root);state.root=root;state.path="/";state.files=[];state.chosen.clear();
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
    q("[data-ti-close]",root).addEventListener("click",close);
    q("[data-ti-connect]",root).addEventListener("click",connect);
    q("[data-ti-disconnect]",root).addEventListener("click",disconnect);
    q("[data-ti-refresh]",root).addEventListener("click",()=>list(state.path));
    q("[data-ti-mkdir]",root).addEventListener("click",mkdir);
    q("[data-ti-receive]",root).addEventListener("click",receive);
    q("[data-ti-delete]",root).addEventListener("click",remove);
    q("[data-ti-current]",root).addEventListener("click",current);
    q("[data-ti-capture]",root).addEventListener("click",screenshot);
    q("[data-ti-up]",root).addEventListener("click",()=>list(state.path.split("/").slice(0,-1).join("/")||"/"));
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