(() => {
  'use strict';
  const scriptBase = new URL('.', document.currentScript?.src || document.baseURI);
  const MENU_URL = new URL('assets/program-editor/menu.json?v=20261104-program-tools-v30', scriptBase);
  let dataPromise;
  const WORDS = {
    es: { title:'Editor de programa', back:'Volver', loading:'Cargando editor de programa…', unavailable:'Selecciona un Editor de programas para usar esta herramienta.', missing:'Esta acción del editor no está disponible.', insert:'Insertar', search:'Texto a buscar', replacement:'Reemplazar por', line:'Número de línea', notFound:'No se encontró el texto.', failed:'No se pudo completar la acción.', hub:'Plantillas de TI-Innovator y Rover. Completa los parámetros de los fragmentos antes de ejecutarlos.', categories:['Acciones','Verificar sintaxis y almacenar','Definir variables','Control','Transferencias','E/S','Modo','Hub','Dibujar'], actions:['Nuevo…','Abrir…','Importar…','Ver…','Crear copia…','Renombrar…','Cambiar acceso a librería…','Comentar / descomentar','Encontrar…','Encontrar y reemplazar…','Ir a la línea…','Regresar','Cerrar','Verificar sintaxis y almacenar','Verificar sintaxis','Ejecutar'] },
    en: { title:'Program Editor', back:'Back', loading:'Loading Program Editor…', unavailable:'Select a Program Editor to use this tool.', missing:'This editor action is unavailable.', insert:'Insert', search:'Find text', replacement:'Replace with', line:'Line number', notFound:'Text was not found.', failed:'The action could not be completed.', hub:'TI-Innovator and Rover templates. Complete fragment parameters before running them.', categories:['Actions','Check syntax and store','Define variables','Control','Transfers','I/O','Mode','Hub','Draw'], actions:['New…','Open…','Import…','View…','Create copy…','Rename…','Change library access…','Comment / uncomment','Find…','Find and replace…','Go to line…','Return','Close','Check syntax and store','Check syntax','Run'] },
    fr: { title:'Éditeur de programmes', back:'Retour', loading:'Chargement de l’éditeur de programmes…', unavailable:'Sélectionnez un éditeur de programmes pour utiliser cet outil.', missing:'Cette action de l’éditeur n’est pas disponible.', insert:'Insérer', search:'Texte à rechercher', replacement:'Remplacer par', line:'Numéro de ligne', notFound:'Texte introuvable.', failed:'L’action n’a pas pu être terminée.', hub:'Modèles TI-Innovator et Rover. Complétez les paramètres des fragments avant de les exécuter.', categories:['Actions','Vérifier la syntaxe et stocker','Définir des variables','Contrôle','Transferts','E/S','Mode','Hub','Dessiner'], actions:['Nouveau…','Ouvrir…','Importer…','Afficher…','Créer une copie…','Renommer…','Modifier l’accès bibliothèque…','Commenter / décommenter','Rechercher…','Rechercher et remplacer…','Atteindre la ligne…','Revenir','Fermer','Vérifier la syntaxe et stocker','Vérifier la syntaxe','Exécuter'] },
  };
  const ACTION_KEYS = ['new','open','import','view','copy','rename','library','comment','find','replace','line','back','close','verifyStore','verify','run'];
  const COMMAND_LABELS = {
    en: {'Borrar variable':'Delete variable','Bloquear':'Locking','Bloquear variable':'Lock variable','Desbloquear variable':'Unlock variable','Obtener info de bloqueo':'Get lock information','Mostrar dígitos':'Display digits','Ángulos':'Angles','Radián':'Radian','Grado':'Degree','Gradián':'Gradian','Formato exponencial':'Exponential format','Científico':'Scientific','Ingeniería':'Engineering','Real o complejo':'Real or complex','Rectangular':'Rectangular','Polar':'Polar','Auto o aprox':'Auto or approximate','Aproximado':'Approximate','Exacto':'Exact','Formato de vector':'Vector format','Cilíndrico':'Cylindrical','Esférico':'Spherical','Base':'Base','Decimal':'Decimal','Hexadecimal':'Hexadecimal','Binario':'Binary','Sistema de unidades':'Unit system','Inglés (EE. UU.)':'English (US)','Obtener modo':'Get mode','Obtener información de idioma':'Get language information','Obtener información de la plataforma':'Get platform information','Formas':'Shapes','Control':'Control'},
    fr: {'Borrar variable':'Supprimer une variable','Bloquear':'Verrouillage','Bloquear variable':'Verrouiller une variable','Desbloquear variable':'Déverrouiller une variable','Obtener info de bloqueo':'Informations de verrouillage','Mostrar dígitos':'Chiffres affichés','Ángulos':'Angles','Radián':'Radian','Grado':'Degré','Gradián':'Grade','Formato exponencial':'Format exponentiel','Científico':'Scientifique','Ingeniería':'Ingénieur','Real o complejo':'Réel ou complexe','Rectangular':'Rectangulaire','Polar':'Polaire','Auto o aprox':'Auto ou approché','Aproximado':'Approché','Exacto':'Exact','Formato de vector':'Format vectoriel','Cilíndrico':'Cylindrique','Esférico':'Sphérique','Base':'Base','Decimal':'Décimale','Hexadecimal':'Hexadécimale','Binario':'Binaire','Sistema de unidades':'Système d’unités','Inglés (EE. UU.)':'Anglais (US)','Obtener modo':'Lire le mode','Obtener información de idioma':'Informations de langue','Obtener información de la plataforma':'Informations de plateforme','Formas':'Formes','Control':'Contrôle'},
  };
  function language(value) { const key=String(value || document.documentElement.lang || 'en').slice(0,2); return WORDS[key] ? key : 'en'; }
  function words(value) { return WORDS[language(value)]; }
  function label(node, lang) {
    const key=language(lang), copy=WORDS[key];
    if (/^[1-9]$/.test(node.id)) return copy.categories[Number(node.id)-1];
    if (node.action) return copy.actions[ACTION_KEYS.indexOf(node.action)] || node.label;
    if (key !== 'es' && /^Flotante\d*$/.test(node.label)) return node.label.replace('Flotante',key==='fr'?'Flottant':'Float');
    if (key !== 'es' && /^Fijo\d+$/.test(node.label)) return node.label.replace('Fijo',key==='fr'?'Fixe':'Fix');
    return COMMAND_LABELS[key]?.[node.label] || node.label;
  }
  function loadData() {
    if (!dataPromise) dataPromise=fetch(MENU_URL).then(response=>{ if(!response.ok)throw Error(`Program menu: HTTP ${response.status}`);return response.json(); }).then(data=>{ if(data.categories?.length!==9)throw Error('Invalid Program Editor menu');return data; }).catch(error=>{dataPromise=null;throw error;});
    return dataPromise;
  }
  function findNode(categories, id) {
    for (const node of categories || []) { if(node.id===id)return node;const child=findNode(node.children,id);if(child)return child; }
    return null;
  }
  function updateEditor(editor, value, start, end=start) {
    editor.value=value; editor.dispatchEvent(new Event('input',{bubbles:true})); editor.focus(); editor.setSelectionRange(start,end);
  }
  function insertSource(editor, code) {
    if (!editor || editor.disabled) throw Error('No editable program');
    const start=editor.selectionStart || 0,end=editor.selectionEnd || start;
    updateEditor(editor,String(editor.value).slice(0,start)+code+String(editor.value).slice(end),start+code.length);
  }
  function toggleComment(editor) {
    const text=String(editor.value),offset=editor.selectionStart||0,start=offset>0?text.lastIndexOf('\n',offset-1)+1:0;
    const selectedEnd=editor.selectionEnd || editor.selectionStart || 0;
    const end=text.indexOf('\n',Math.max(start,selectedEnd-1));
    const finish=end<0?text.length:end, lines=text.slice(start,finish).split('\n');
    const remove=lines.every(line=>!line.trim() || /^\s*©/.test(line));
    const next=lines.map(line=>remove?line.replace(/^(\s*)© ?/,'$1'):(line.trim()?line.replace(/^(\s*)/,'$1© '):line)).join('\n');
    updateEditor(editor,text.slice(0,start)+next+text.slice(finish),start,start+next.length);
  }
  async function dispatch(node, options={}) {
    const context=options.getContext?.() || {};
    if (!context.enabled) throw Error(words(options.language?.()).unavailable);
    if (node.children?.length) throw Error('A menu category is not an editor operation');
    if (node.code != null) return options.insert ? options.insert(node.code,node,context) : insertSource(context.editor,node.code);
    const action=options.actions?.[node.action];
    if (action) {
      if(['new','open','import','view','copy','rename','library','run','close'].includes(node.action))options.close?.();
      return action(context,node);
    }
    const editor=context.editor, copy=words(options.language?.()), ask=options.prompt || ((message,value)=>window.prompt(message,value));
    if (node.action==='comment' && editor) return toggleComment(editor);
    if (node.action==='line' && editor) {
      const answer=await ask(copy.line,'1'); if(answer==null)return;
      const number=Number(answer), lines=String(editor.value).split('\n');
      if(!Number.isInteger(number)||number<1||number>lines.length)throw Error(`${copy.line}: 1–${lines.length}`);
      const offset=lines.slice(0,number-1).join('\n').length+(number>1?1:0);editor.focus();editor.setSelectionRange(offset,offset);return;
    }
    if ((node.action==='find'||node.action==='replace') && editor) {
      const query=await ask(copy.search,'');if(!query)return;
      const text=String(editor.value), after=editor.selectionEnd||0;
      let found=text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase(),after);if(found<0)found=text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
      if(found<0)throw Error(copy.notFound);
      if(node.action==='find'){editor.focus();editor.setSelectionRange(found,found+query.length);return;}
      const replacement=await ask(copy.replacement,'');if(replacement==null)return;
      updateEditor(editor,text.slice(0,found)+replacement+text.slice(found+query.length),found,found+replacement.length);return;
    }
    if(node.action==='back')return options.close?.();
    throw Error(`${copy.missing} ${label(node,options.language?.())}`);
  }
  function install(options={}) {
    const host=options.host;
    if(!host)throw Error('Program Editor menu host is required');
    const trigger=document.createElement('button');trigger.type='button';trigger.className='menu-action program-editor-trigger';trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.dataset.programEditorTools='';
    const panel=document.createElement('section');panel.className='program-editor-tools-panel';panel.hidden=true;panel.setAttribute('role','dialog');
    panel.setAttribute('aria-modal','false');panel.tabIndex=-1;document.body.append(panel);host.append(trigger);
    let data=null, path=[], busy=false, disposed=false;
    const currentLanguage=()=>language(options.language?.());
    const currentWords=()=>words(currentLanguage());
    const fail=error=>{const output=panel.querySelector('[data-program-menu-status]');if(output)output.textContent=error.message||currentWords().failed;options.onError?.(error);};
    function position() {
      if(panel.hidden)return;
      const box=trigger.getBoundingClientRect(),width=Math.min(420,innerWidth-24),top=Math.max(12,Math.min(box.bottom+8,innerHeight-170));
      panel.style.width=width+'px';panel.style.left=Math.max(12,Math.min(box.left,innerWidth-width-12))+'px';panel.style.top=top+'px';panel.style.maxHeight=Math.max(150,innerHeight-top-12)+'px';
    }
    function close(restore=true) { panel.hidden=true;trigger.setAttribute('aria-expanded','false');path=[];if(restore&&!disposed&&!trigger.hidden)trigger.focus({preventScroll:true}); }
    function render() {
      if(disposed)return;
      const copy=currentWords(), parent=path.at(-1), nodes=parent?.children || data?.categories || [];
      panel.replaceChildren();panel.setAttribute('aria-label',copy.title);
      const heading=document.createElement('header');heading.className='program-editor-menu-heading';
      if(parent){const back=document.createElement('button');back.type='button';back.className='program-editor-back';back.textContent='←';back.title=copy.back;back.setAttribute('aria-label',copy.back);back.onclick=()=>{path.pop();render();panel.querySelector('[data-program-menu-id]')?.focus();};heading.append(back);}
      const title=document.createElement('strong');title.textContent=parent?label(parent,currentLanguage()):copy.title;heading.append(title);
      const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='×';dismiss.className='program-editor-dismiss';dismiss.setAttribute('aria-label',copy.actions[12]);dismiss.onclick=()=>close();heading.append(dismiss);panel.append(heading);
      if(path[0]?.id==='8'){const hint=document.createElement('p');hint.className='program-editor-menu-hint';hint.textContent=copy.hub;panel.append(hint);}
      const list=document.createElement('div');list.className='program-editor-menu-list';list.setAttribute('role','menu');
      for(const node of nodes){
        const row=document.createElement('button');row.type='button';row.className='program-editor-menu-row';row.dataset.programMenuId=node.id;row.setAttribute('role','menuitem');
        if(node.children){row.setAttribute('aria-haspopup','menu');}
        if(node.icon){const image=document.createElement('img');image.src=new URL('assets/program-editor/'+node.icon,scriptBase).href;image.alt='';image.width=image.height=26;row.append(image);}
        const text=document.createElement('span');text.className='program-editor-menu-label';text.textContent=label(node,currentLanguage());row.append(text);
        if(node.children){const arrow=document.createElement('span');arrow.className='program-editor-menu-arrow';arrow.textContent='›';row.append(arrow);}
        else if(node.code)row.title=node.code;
        row.onclick=async()=>{if(busy)return;if(node.children){path.push(node);render();panel.querySelector('[data-program-menu-id]')?.focus();return;}busy=true;row.disabled=true;try{await dispatch(node,{...options,close:()=>close()});close(false);}catch(error){fail(error);}finally{busy=false;row.disabled=false;}};
        list.append(row);
      }
      panel.append(list);
      const status=document.createElement('p');status.className='program-editor-menu-status';status.dataset.programMenuStatus='';status.setAttribute('role','status');status.textContent=data?'':copy.loading;panel.append(status);position();
    }
    function refresh() { const ctx=options.getContext?.() || {};trigger.textContent=currentWords().title;trigger.hidden=!ctx.enabled;trigger.disabled=!ctx.enabled;if(!ctx.enabled)close(false);if(!panel.hidden)render(); }
    async function open() {
      refresh();if(trigger.hidden)return;panel.hidden=false;trigger.setAttribute('aria-expanded','true');render();
      try{data=await loadData();if(panel.hidden||disposed)return;render();panel.querySelector('[data-program-menu-id]')?.focus({preventScroll:true});}catch(error){fail(error);}
    }
    trigger.onclick=event=>{event.preventDefault();event.stopPropagation();panel.hidden?void open():close();};
    trigger.onkeydown=event=>{if(event.key==='ArrowDown'){event.preventDefault();event.stopPropagation();void open();}};
    panel.onclick=event=>event.stopPropagation();
    panel.onkeydown=event=>{
      const rows=[...panel.querySelectorAll('[data-program-menu-id]')],index=rows.indexOf(document.activeElement);
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();rows[(index+(event.key==='ArrowDown'?1:-1)+rows.length)%rows.length]?.focus();}
      else if(event.key==='ArrowRight' && document.activeElement?.hasAttribute('aria-haspopup')){event.preventDefault();document.activeElement.click();}
      else if(event.key==='ArrowLeft'||event.key==='Escape'){event.preventDefault();event.stopPropagation();if(path.length){path.pop();render();panel.querySelector('[data-program-menu-id]')?.focus();}else close();}
    };
    const outside=event=>{if(!panel.hidden&&!panel.contains(event.target)&&!trigger.contains(event.target))close(false);};
    const menu=host.closest('.tool-menu'),menuObserver=new MutationObserver(()=>{if(menu&&!menu.classList.contains('open'))close(false);});
    if(menu)menuObserver.observe(menu,{attributes:true,attributeFilter:['class']});
    const languageObserver=new MutationObserver(refresh);languageObserver.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    document.addEventListener('pointerdown',outside);window.addEventListener('resize',position);window.addEventListener('scroll',position,true);document.addEventListener('tns:program-editor-context',refresh);
    const ready=loadData().then(value=>{data=value;return value;}).catch(error=>{options.onError?.(error);return null;});
    refresh();
    return {ready,refresh,open,close,dispose(){disposed=true;close(false);menuObserver.disconnect();languageObserver.disconnect();document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);document.removeEventListener('tns:program-editor-context',refresh);trigger.remove();panel.remove();}};
  }
  window.TnsProgramEditorTools=Object.freeze({install,loadData,findNode,dispatch,label,toggleComment,insertSource});
})();
