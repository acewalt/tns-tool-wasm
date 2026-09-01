(() => {
  "use strict";

  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const AUTOSAVE_KEY="tns-tool-ndless-project-autosave-v1";
  const state={project:null,workspace:null,editor:null,editorInputDisposable:null,activeTab:"preview",previewTimer:null,menuRestore:new Map(),toolbarRestore:new Map(),originalTitle:"Syntax Doctor XML"};
  const L={
    es:{newProject:"Nuevo proyecto Ndless",openProject:"Abrir proyecto Ndless",exportProject:"Exportar proyecto ZIP",closeProject:"Cerrar proyecto",title:"Crear proyecto Ndless",name:"Nombre del proyecto",language:"Lenguaje",template:"Plantilla",target:"Destino",create:"Crear proyecto",cancel:"Cancelar",files:"Archivos",newFile:"Nuevo archivo",importFiles:"Importar",editor:"Editor",preview:"Preview",console:"Consola",build:"Build",runPreview:"Actualizar preview",validate:"Validar",download:"Descargar ZIP",exit:"Salir",browserPreview:"Preview TI-Nspire · 320×240",previewNote:"Simulación en navegador de llamadas gráficas/texto comunes. El comportamiento exacto se valida compilando con el SDK.",buildReady:"Proyecto listo para compilar",buildExternal:"El compilador ARM de Ndless es nativo y no puede ejecutarse directamente en GitHub Pages. Este workspace genera el proyecto y Makefile compatibles para compilarlo con el SDK.",buildCommand:"Comando",targetLabel:"Target",sourceValidation:"Validación de fuente",valid:"Proyecto válido",invalid:"Revisa los errores",noPage:"+ Página no aplica a proyectos Ndless.",fileName:"Nombre del archivo",deleteFile:"Eliminar",refreshMakefile:"Regenerar Makefile",copy:"Copiar",sdkFeature:"Workflow inspirado en NdlessEditor: proyecto → editar → preview → build → ejecutar/transferir.",basic:"Básico",graphics:"Gráficos nSDL",consoleTpl:"Consola",legacy:"Legacy bFLT · OS 3.1",modern:"Modern Zehn",c:"C",cpp:"C++",downloaded:"ZIP generado",notText:"Este archivo no es editable como texto.",replaceProject:"Hay un proyecto Ndless abierto. ¿Crear otro y reemplazar la sesión actual?"},
    en:{newProject:"New Ndless Project",openProject:"Open Ndless Project",exportProject:"Export project ZIP",closeProject:"Close project",title:"Create Ndless project",name:"Project name",language:"Language",template:"Template",target:"Target",create:"Create project",cancel:"Cancel",files:"Files",newFile:"New file",importFiles:"Import",editor:"Editor",preview:"Preview",console:"Console",build:"Build",runPreview:"Refresh preview",validate:"Validate",download:"Download ZIP",exit:"Exit",browserPreview:"TI-Nspire Preview · 320×240",previewNote:"Browser simulation of common graphics/text calls. Exact behavior is validated by compiling with the SDK.",buildReady:"Project ready to build",buildExternal:"The Ndless ARM compiler is a native toolchain and cannot run directly inside GitHub Pages. This workspace generates an SDK-compatible project and Makefile for compilation with the SDK.",buildCommand:"Command",targetLabel:"Target",sourceValidation:"Source validation",valid:"Project valid",invalid:"Review errors",noPage:"+ Page does not apply to Ndless projects.",fileName:"File name",deleteFile:"Delete",refreshMakefile:"Regenerate Makefile",copy:"Copy",sdkFeature:"Workflow inspired by NdlessEditor: project → edit → preview → build → run/transfer.",basic:"Basic",graphics:"nSDL Graphics",consoleTpl:"Console",legacy:"Legacy bFLT · OS 3.1",modern:"Modern Zehn",c:"C",cpp:"C++",downloaded:"ZIP generated",notText:"This file is not editable as text.",replaceProject:"An Ndless project is already open. Create another and replace the current session?"},
    fr:{newProject:"Nouveau projet Ndless",openProject:"Ouvrir projet Ndless",exportProject:"Exporter le projet ZIP",closeProject:"Fermer le projet",title:"Créer un projet Ndless",name:"Nom du projet",language:"Langage",template:"Modèle",target:"Cible",create:"Créer",cancel:"Annuler",files:"Fichiers",newFile:"Nouveau fichier",importFiles:"Importer",editor:"Éditeur",preview:"Aperçu",console:"Console",build:"Build",runPreview:"Actualiser l'aperçu",validate:"Valider",download:"Télécharger ZIP",exit:"Quitter",browserPreview:"Aperçu TI-Nspire · 320×240",previewNote:"Simulation navigateur des appels graphiques/texte courants. Le comportement exact se valide avec le SDK.",buildReady:"Projet prêt à compiler",buildExternal:"Le compilateur ARM Ndless est un outil natif et ne peut pas s'exécuter directement dans GitHub Pages. Ce workspace génère un projet et Makefile compatibles SDK.",buildCommand:"Commande",targetLabel:"Cible",sourceValidation:"Validation source",valid:"Projet valide",invalid:"Vérifier les erreurs",noPage:"+ Page ne s'applique pas aux projets Ndless.",fileName:"Nom du fichier",deleteFile:"Supprimer",refreshMakefile:"Régénérer Makefile",copy:"Copier",sdkFeature:"Workflow inspiré de NdlessEditor : projet → édition → aperçu → build → exécution/transfert.",basic:"Basique",graphics:"Graphiques nSDL",consoleTpl:"Console",legacy:"Legacy bFLT · OS 3.1",modern:"Modern Zehn",c:"C",cpp:"C++",downloaded:"ZIP généré",notText:"Ce fichier n'est pas éditable comme texte.",replaceProject:"Un projet Ndless est déjà ouvert. Le remplacer ?"}
  };
  function lang(){const a=$("#language-buttons button.active[data-lang]")?.dataset.lang;const h=String(document.documentElement.lang||"es").slice(0,2);return L[a]?a:(L[h]?h:"es");}
  const tr=k=>L[lang()]?.[k]||L.es[k]||k;
  const core=()=>window.NdlessProjectCore;

  function ensureCLanguage(){
    const monaco=window.TnsMonacoEditor?.monaco;if(!monaco)return;
    const register=(id,aliases)=>{
      if(monaco.languages.getLanguages().some(x=>x.id===id))return;
      monaco.languages.register({id,aliases});
      monaco.languages.setLanguageConfiguration(id,{comments:{lineComment:"//",blockComment:["/*","*/"]},brackets:[["{","}"],["(",")"],["[","]"]],autoClosingPairs:[{open:"{",close:"}"},{open:"(",close:")"},{open:"[",close:"]"},{open:'"',close:'"'},{open:"'",close:"'"}]});
      monaco.languages.setMonarchTokensProvider(id,{keywords:["auto","break","case","char","class","const","continue","default","delete","do","double","else","enum","extern","float","for","if","int","long","namespace","new","private","protected","public","register","return","short","signed","sizeof","static","struct","switch","template","this","typedef","union","unsigned","using","virtual","void","volatile","while","bool","true","false"],tokenizer:{root:[[/#\s*[A-Za-z_]+/,"keyword.directive"],[/\/\/.*$/,"comment"],[/\/\*/,"comment","@comment"],[/"([^"\\]|\\.)*"/,"string"],[/'([^'\\]|\\.)*'/,"string"],[/0x[0-9a-fA-F]+|\b\d+(?:\.\d+)?\b/,"number"],[/[A-Za-z_][A-Za-z0-9_]*/,{cases:{"@keywords":"keyword","@default":"identifier"}}],[/[{}()\[\];,.]/,"delimiter"],[/[+\-*\/%=<>!&|^~?:]+/,"operator"]],comment:[[/[^*]+/,"comment"],[/\*\//,"comment","@pop"],[/\*/,"comment"]]}});
    };
    register("ndless-c",["Ndless C","C"]);register("ndless-cpp",["Ndless C++","C++"]);
  }
  function editorLanguage(name){if(/\.(cpp|cc|cxx|hpp|hh)$/i.test(name))return"ndless-cpp";if(/\.(c|h|S|s)$/i.test(name))return"ndless-c";return"plaintext";}
  function isTextFile(name){return /^(?:Makefile|.*\.(?:c|cpp|cc|cxx|h|hpp|hh|S|s|txt|md|json|mk))$/i.test(name);}

  function saveCurrentFile(){if(!state.project||!state.editor)return;const name=state.project.activeFile;if(name&&isTextFile(name))state.project.files[name]=state.editor.getValue();saveAutosave();}
  function saveAutosave(){if(!state.project)return;try{localStorage.setItem(AUTOSAVE_KEY,JSON.stringify(state.project));}catch(_){} }
  function disposeEditor(){try{state.editorInputDisposable?.dispose?.();}catch(_){}state.editorInputDisposable=null;try{state.editor?.dispose?.();}catch(_){}state.editor=null;}

  function renderConsole(extra=[]){
    if(!state.workspace||!state.project)return;const out=$("[data-project-console]",state.workspace);if(!out)return;
    const v=core().validateProject(state.project),lines=[`> ${state.project.name}`,`target: ${core().TARGETS[state.project.target]?.label||state.project.target}`,v.valid?`✓ ${tr("valid")}`:`✕ ${tr("invalid")}`];
    v.errors.forEach(x=>lines.push(`ERROR: ${x}`));v.warnings.forEach(x=>lines.push(`WARN: ${x}`));extra.forEach(x=>lines.push(String(x)));out.textContent=lines.join("\n");
  }
  function drawPreview(){
    if(!state.project||!state.workspace)return;saveCurrentFile();
    const src=Object.entries(state.project.files).filter(([n])=>/\.(?:c|cpp|cc|cxx)$/i.test(n)).map(([,s])=>s).join("\n");
    const result=core().previewFromSource(src),canvas=$("[data-ndless-project-canvas]",state.workspace),note=$("[data-preview-note]",state.workspace);
    if(!canvas)return;canvas.width=result.width;canvas.height=result.height;const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;
    for(const cmd of result.commands){if(cmd.type==="clear"){ctx.fillStyle=`rgb(${cmd.color.join(",")})`;ctx.fillRect(0,0,canvas.width,canvas.height);}else if(cmd.type==="text"){ctx.fillStyle=`rgb(${cmd.color.join(",")})`;ctx.font="11px monospace";ctx.textBaseline="top";String(cmd.text).split("\n").forEach((line,i)=>ctx.fillText(line,cmd.x,cmd.y+i*12));}}
    note.textContent=result.warnings[0]||tr("previewNote");renderConsole();
  }
  function schedulePreview(){clearTimeout(state.previewTimer);state.previewTimer=setTimeout(drawPreview,220);}

  function mountEditor(){
    if(!state.workspace||!state.project)return;disposeEditor();const host=$("[data-ndless-project-editor]",state.workspace),name=state.project.activeFile;const value=state.project.files[name]??"";
    $("[data-active-file]",state.workspace).textContent=name||"—";$("[data-active-language]",state.workspace).textContent=editorLanguage(name).replace("ndless-","").toUpperCase();
    if(!isTextFile(name)){host.innerHTML=`<div class="ndless-project-empty">${esc(tr("notText"))}</div>`;return;}
    host.innerHTML="";
    const start=()=>{if(!window.TnsMonacoEditor||!host.isConnected)return;ensureCLanguage();state.editor=window.TnsMonacoEditor.createTextEditor(host,{value,language:editorLanguage(name),theme:document.documentElement.dataset.theme==="light"?"light":"dark",editorOptions:{fontSize:13,lineHeight:20,wordWrap:"off",minimap:{enabled:false},padding:{top:12,bottom:12}}});state.editorInputDisposable=state.editor.onInput(v=>{state.project.files[name]=v;saveAutosave();schedulePreview();});};
    if(window.TnsMonacoEditor)start();else window.addEventListener("tns-monaco-ready",start,{once:true});
  }

  function fileList(){
    const box=$("[data-project-files]",state.workspace);if(!box)return;box.innerHTML="";
    Object.keys(state.project.files).sort((a,b)=>{if(a===state.project.activeFile)return-1;if(b===state.project.activeFile)return 1;if(a==="Makefile")return-1;if(b==="Makefile")return 1;return a.localeCompare(b);}).forEach(name=>{
      const b=document.createElement("button");b.type="button";b.className=name===state.project.activeFile?"active":"";b.innerHTML=`<span>${esc(name)}</span><small>${/\.cpp$/i.test(name)?"C++":/\.[ch]$/i.test(name)?"C":name==="Makefile"?"BUILD":"FILE"}</small>`;b.addEventListener("click",()=>{saveCurrentFile();state.project.activeFile=name;fileList();mountEditor();});box.appendChild(b);
    });
  }
  function newFile(){const name=prompt(tr("fileName"),state.project.language==="cpp"?"new_file.cpp":"new_file.c");if(!name)return;const safe=String(name).trim().replace(/[\\/:*?"<>|]+/g,"_");if(!safe)return;if(state.project.files[safe]!=null){alert("File already exists.");return;}saveCurrentFile();state.project.files[safe]="";state.project.activeFile=safe;saveAutosave();fileList();mountEditor();}
  async function importFiles(input){const files=Array.from(input||[]);if(!files.length)return;saveCurrentFile();for(const f of files){if(f.size>2_000_000)continue;state.project.files[f.name]=await f.text();state.project.activeFile=f.name;}saveAutosave();fileList();mountEditor();drawPreview();}
  function deleteActiveFile(){const name=state.project?.activeFile;if(!name||name==="Makefile"||name==="README_BUILD.md")return;if(!confirm(`${tr("deleteFile")}: ${name}?`))return;disposeEditor();delete state.project.files[name];state.project.activeFile=Object.keys(state.project.files).find(n=>/\.(c|cpp)$/i.test(n))||Object.keys(state.project.files)[0];saveAutosave();fileList();mountEditor();drawPreview();}

  function setRightTab(tab){state.activeTab=tab;$$('[data-project-tab]',state.workspace).forEach(b=>b.classList.toggle("active",b.dataset.projectTab===tab));$$('[data-project-pane]',state.workspace).forEach(p=>p.hidden=p.dataset.projectPane!==tab);if(tab==="preview")drawPreview();if(tab==="console")renderConsole();if(tab==="build")renderBuild();}
  function renderBuild(){
    saveCurrentFile();core().refreshGeneratedFiles(state.project);const pane=$("[data-project-build]",state.workspace),v=core().validateProject(state.project),target=core().TARGETS[state.project.target];
    pane.innerHTML=`<div class="ndless-project-build-card"><span>${esc(tr("targetLabel"))}</span><strong>${esc(target?.label||state.project.target)}</strong><small>${esc(target?.output||"")}</small></div><div class="ndless-project-build-card"><span>${esc(tr("sourceValidation"))}</span><strong class="${v.valid?"ok":"bad"}">${esc(v.valid?tr("valid"):tr("invalid"))}</strong><small>${esc([...v.errors,...v.warnings].join(" · ")||tr("buildReady"))}</small></div><div class="ndless-project-build-info"><h4>${esc(tr("buildReady"))}</h4><p>${esc(tr("buildExternal"))}</p><label>${esc(tr("buildCommand"))}</label><code>make</code><div><button type="button" data-build-refresh>${esc(tr("refreshMakefile"))}</button><button type="button" data-build-copy>${esc(tr("copy"))}</button></div></div>`;
    $("[data-build-refresh]",pane)?.addEventListener("click",()=>{core().refreshGeneratedFiles(state.project);saveAutosave();fileList();if(state.project.activeFile==="Makefile")mountEditor();renderBuild();renderConsole(["Makefile regenerated."]);});
    $("[data-build-copy]",pane)?.addEventListener("click",()=>navigator.clipboard?.writeText?.("make"));
  }

  function workspaceHtml(project){
    const target=core().TARGETS[project.target];
    return `<div class="ndless-project-workspace"><div class="ndless-project-topbar"><div class="ndless-project-identity"><span>NDLESS PROJECT</span><strong>${esc(project.name)}</strong><small>${esc(target?.label||project.target)}</small></div><div class="ndless-project-actions"><button type="button" data-project-preview>${esc(tr("runPreview"))}</button><button type="button" data-project-validate>${esc(tr("validate"))}</button><button type="button" class="primary" data-project-download>${esc(tr("download"))}</button><button type="button" data-project-exit>${esc(tr("exit"))}</button></div></div><div class="ndless-project-body"><aside class="ndless-project-files"><div class="ndless-project-section-head"><b>${esc(tr("files"))}</b><div><button type="button" data-project-new-file title="${esc(tr("newFile"))}">＋</button><label title="${esc(tr("importFiles"))}">⇧<input data-project-import-files type="file" multiple accept=".c,.cpp,.cc,.cxx,.h,.hpp,.S,.s,.txt,.md,.json" hidden></label><button type="button" data-project-delete-file title="${esc(tr("deleteFile"))}">−</button></div></div><div class="ndless-project-file-list" data-project-files></div><div class="ndless-project-sdk-note">${esc(tr("sdkFeature"))}</div></aside><section class="ndless-project-editor"><header><div><small>${esc(tr("editor"))}</small><strong data-active-file>—</strong></div><span data-active-language>C</span></header><div class="ndless-project-monaco" data-ndless-project-editor></div></section><aside class="ndless-project-right"><div class="ndless-project-tabs"><button class="active" data-project-tab="preview">${esc(tr("preview"))}</button><button data-project-tab="console">${esc(tr("console"))}</button><button data-project-tab="build">${esc(tr("build"))}</button></div><section data-project-pane="preview" class="ndless-project-preview"><h3>${esc(tr("browserPreview"))}</h3><div class="ndless-project-screen"><canvas data-ndless-project-canvas width="320" height="240"></canvas></div><p data-preview-note>${esc(tr("previewNote"))}</p></section><section data-project-pane="console" hidden><pre class="ndless-project-console" data-project-console></pre></section><section data-project-pane="build" hidden><div class="ndless-project-build" data-project-build></div></section></aside></div></div>`;
  }
  function bindWorkspace(){const w=state.workspace;$("[data-project-new-file]",w).addEventListener("click",newFile);$("[data-project-import-files]",w).addEventListener("change",e=>{importFiles(e.target.files);e.target.value="";});$("[data-project-delete-file]",w).addEventListener("click",deleteActiveFile);$("[data-project-preview]",w).addEventListener("click",drawPreview);$("[data-project-validate]",w).addEventListener("click",()=>{saveCurrentFile();setRightTab("console");renderConsole();});$("[data-project-download]",w).addEventListener("click",downloadProject);$("[data-project-exit]",w).addEventListener("click",closeProject);$$('[data-project-tab]',w).forEach(b=>b.addEventListener("click",()=>setRightTab(b.dataset.projectTab)));}

  function setFileMenuMode(active){
    const panel=$("#xml-doctor-panel .doctor-toolbar .tool-menu:first-of-type > .menu-panel");if(!panel)return;
    Array.from(panel.children).forEach(el=>{if(el.dataset.ndlessProjectAction==="1")return;if(active){if(!state.menuRestore.has(el))state.menuRestore.set(el,el.style.display);el.style.display="none";}else if(state.menuRestore.has(el)){el.style.display=state.menuRestore.get(el);state.menuRestore.delete(el);}});
    $$('[data-ndless-project-only]',panel).forEach(el=>el.hidden=!active);$$('[data-ndless-project-always]',panel).forEach(el=>el.hidden=false);
  }
  function setToolbarMode(active){
    const panel=$("#xml-doctor-panel"),toolbar=$(".doctor-toolbar",panel);if(!panel||!toolbar)return;
    const hide=[...$$('.doctor-toolbar > .tool-menu',panel).slice(1),$("#xml-syntax-btn"),$("#xml-programs"),$("#xml-line-label")].filter(Boolean);
    hide.forEach(el=>{if(active){if(!state.toolbarRestore.has(el))state.toolbarRestore.set(el,el.style.display);el.style.display="none";}else if(state.toolbarRestore.has(el)){el.style.display=state.toolbarRestore.get(el);state.toolbarRestore.delete(el);}});
    const page=$(".file-page-menu > .nested-trigger",panel);if(page){page.disabled=active;page.setAttribute("aria-disabled",active?"true":"false");page.title=active?tr("noPage"):"";}
  }
  function activateProject(project){
    closeProject(true);state.project=project;const panel=$("#xml-doctor-panel"),grid=$(".doctor-grid",panel),title=$(".doctor-toolbar h2",panel);if(!panel)return;
    panel.classList.add("ndless-project-mode");if(grid)grid.hidden=true;if(title){state.originalTitle=title.textContent;title.textContent=`Ndless Project · ${project.name}`;}
    setToolbarMode(true);setFileMenuMode(true);const host=document.createElement("div");host.innerHTML=workspaceHtml(project);state.workspace=host.firstElementChild;panel.appendChild(state.workspace);bindWorkspace();fileList();mountEditor();drawPreview();saveAutosave();
  }
  function closeProject(restore=true){
    if(!state.project&&!state.workspace)return;saveCurrentFile();disposeEditor();state.workspace?.remove();state.workspace=null;state.project=null;const panel=$("#xml-doctor-panel"),grid=$(".doctor-grid",panel),title=$(".doctor-toolbar h2",panel);panel?.classList.remove("ndless-project-mode");if(grid)grid.hidden=false;if(title&&restore)title.textContent=state.originalTitle||"Syntax Doctor XML";setToolbarMode(false);setFileMenuMode(false);
  }

  function wizard(){
    if(state.project&&!confirm(tr("replaceProject")))return;
    const ov=document.createElement("div");ov.className="ndless-project-dialog-overlay";ov.innerHTML=`<form class="ndless-project-dialog"><div class="ndless-project-dialog-head"><div><span>NDLESS</span><h3>${esc(tr("title"))}</h3></div><button type="button" data-dialog-close>×</button></div><label>${esc(tr("name"))}<input name="name" value="my-ndless-app" autocomplete="off"></label><div class="ndless-project-dialog-grid"><label>${esc(tr("language"))}<select name="language"><option value="c">${esc(tr("c"))}</option><option value="cpp">${esc(tr("cpp"))}</option></select></label><label>${esc(tr("template"))}<select name="template"><option value="basic">${esc(tr("basic"))}</option><option value="graphics">${esc(tr("graphics"))}</option><option value="console">${esc(tr("consoleTpl"))}</option></select></label></div><label>${esc(tr("target"))}<select name="target"><option value="bflt-r903">${esc(tr("legacy"))}</option><option value="zehn-modern">${esc(tr("modern"))}</option></select></label><p>${esc(tr("sdkFeature"))}</p><div class="ndless-project-dialog-actions"><button type="button" data-dialog-cancel>${esc(tr("cancel"))}</button><button class="primary" type="submit">${esc(tr("create"))}</button></div></form>`;document.body.appendChild(ov);
    const close=()=>ov.remove();$("[data-dialog-close]",ov).onclick=close;$("[data-dialog-cancel]",ov).onclick=close;ov.addEventListener("click",e=>{if(e.target===ov)close();});$("form",ov).addEventListener("submit",e=>{e.preventDefault();const fd=new FormData(e.currentTarget),p=core().createProject({name:fd.get("name"),language:fd.get("language"),template:fd.get("template"),target:fd.get("target")});close();activateProject(p);});
  }

  async function downloadProject(){
    if(!state.project)return;saveCurrentFile();const entries=core().exportEntries(state.project);if(!window.JSZip){alert("JSZip is not ready.");return;}const zip=new JSZip();for(const [name,text] of Object.entries(entries))zip.file(name,String(text));const blob=await zip.generateAsync({type:"blob",compression:"DEFLATE"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${core().sanitizeProjectName(state.project.name)}-ndless-project.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);renderConsole([tr("downloaded")]);
  }
  async function openProjectZip(file){
    if(!file)return;if(!window.JSZip){alert("JSZip is not ready.");return;}const zip=await JSZip.loadAsync(file),entries={};for(const [name,obj] of Object.entries(zip.files)){if(obj.dir||name.includes("../")||name.startsWith("/"))continue;if(!isTextFile(name)&&name!==".tnsproject.json")continue;entries[name]=await obj.async("text");}activateProject(core().importEntries(entries));renderConsole(["Project imported."]);
  }

  function injectMenu(){
    const panel=$("#xml-doctor-panel .doctor-toolbar .tool-menu:first-of-type > .menu-panel");if(!panel||$("#xml-new-ndless-project",panel))return;
    const sep=document.createElement("div");sep.className="ndless-project-menu-separator";sep.dataset.ndlessProjectAction="1";sep.dataset.ndlessProjectAlways="1";
    const btn=document.createElement("button");btn.type="button";btn.id="xml-new-ndless-project";btn.className="menu-action ndless-project-menu-action";btn.dataset.ndlessProjectAction="1";btn.dataset.ndlessProjectAlways="1";btn.textContent=tr("newProject");btn.addEventListener("click",wizard);
    const open=document.createElement("label");open.className="menu-action file-menu-action ndless-project-menu-action";open.dataset.ndlessProjectAction="1";open.dataset.ndlessProjectAlways="1";open.innerHTML=`<span>${esc(tr("openProject"))}</span><input type="file" accept=".zip" hidden>`;$("input",open).addEventListener("change",e=>{openProjectZip(e.target.files?.[0]);e.target.value="";});
    const exp=document.createElement("button");exp.type="button";exp.className="menu-action";exp.dataset.ndlessProjectAction="1";exp.dataset.ndlessProjectOnly="1";exp.hidden=true;exp.textContent=tr("exportProject");exp.addEventListener("click",downloadProject);
    const close=document.createElement("button");close.type="button";close.className="menu-action";close.dataset.ndlessProjectAction="1";close.dataset.ndlessProjectOnly="1";close.hidden=true;close.textContent=tr("closeProject");close.addEventListener("click",()=>closeProject());
    const openTns=$("input#xml-tns-file",panel)?.closest("label");
    const anchor=openTns?.nextSibling||$("#xml-new-btn",panel)?.nextSibling||panel.firstElementChild;
    panel.insertBefore(sep,anchor);panel.insertBefore(btn,anchor);panel.insertBefore(open,anchor);panel.insertBefore(exp,anchor);panel.insertBefore(close,anchor);
  }
  function init(){if(!core())return setTimeout(init,100);if(!$("#xml-doctor-panel"))return setTimeout(init,100);injectMenu();document.addEventListener("click",e=>{if(state.project&&e.target.closest?.(".file-page-menu")){e.preventDefault();e.stopImmediatePropagation();}},true);window.NdlessProjectWorkspace=Object.freeze({newProject:wizard,openProjectZip,activateProject,closeProject,getProject:()=>state.project,downloadProject});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
