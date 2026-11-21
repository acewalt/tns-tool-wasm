import { apiCatalog, guideCategories, localize, usedApis, compatibilityFor, explanationFor } from '../src/lua/api-catalog.js?v=20261121-guide-v46';

const labels = {
  en:{title:'Lua Guide',all:'All',used:'Functions used in my code',search:'Find an API, command or example',insert:'Insert',try:'Try',explain:'Explain',compare:'Compare',close:'Close',example:'Example',parameters:'Parameters',result:'Results and common errors',comparison:'TI / Preview compatibility',none:'No documented APIs found in this code.',inserted:'Inserted at the editor cursor.',noEditor:'Open a Lua editor to insert an example.',isolated:'Try opens a separate preview. Your code is unchanged.',noExample:'This reference has no runnable example.',report:'Verified Preview checks',unverified:'No matching recorded check; this is not a physical calculator certification.',cas:'CAS reference and examples',back:'Back to entries',loading:'Loading guide…',source:'Official reference',detail:'Complete parameters for your application; check nil/error returns and use supported API levels.',failure:'The example could not start: '},
  es:{title:'Guía Lua',all:'Todo',used:'Funciones usadas en mi código',search:'Buscar API, comando o ejemplo',insert:'Insertar',try:'Probar',explain:'Explicar',compare:'Comparar',close:'Cerrar',example:'Ejemplo',parameters:'Parámetros',result:'Resultados y errores habituales',comparison:'Compatibilidad TI / Preview',none:'No se encontraron APIs documentadas en este código.',inserted:'Insertado en el cursor del editor.',noEditor:'Abre un editor Lua para insertar un ejemplo.',isolated:'Probar abre un preview separado. Tu código se conserva.',noExample:'Esta referencia no tiene un ejemplo ejecutable.',report:'Pruebas de Preview verificadas',unverified:'No hay una prueba registrada coincidente; esto no certifica una calculadora física.',cas:'Referencia CAS y ejemplos',back:'Volver a las entradas',loading:'Cargando guía…',source:'Referencia oficial',detail:'Completa los parámetros para tu aplicación; comprueba los retornos nil/error y usa niveles de API compatibles.',failure:'No se pudo iniciar el ejemplo: '},
  fr:{title:'Guide Lua',all:'Tout',used:'Fonctions utilisées dans mon code',search:'Rechercher une API, commande ou exemple',insert:'Insérer',try:'Tester',explain:'Expliquer',compare:'Comparer',close:'Fermer',example:'Exemple',parameters:'Paramètres',result:'Résultats et erreurs fréquentes',comparison:'Compatibilité TI / Aperçu',none:'Aucune API documentée trouvée dans ce code.',inserted:'Inséré au curseur de l’éditeur.',noEditor:'Ouvrez un éditeur Lua pour insérer un exemple.',isolated:'Tester ouvre un aperçu séparé. Votre code est conservé.',noExample:'Cette référence n’a pas d’exemple exécutable.',report:'Tests de l’aperçu vérifiés',unverified:'Aucun test enregistré correspondant ; ceci ne certifie pas une calculatrice physique.',cas:'Référence CAS et exemples',back:'Retour aux entrées',loading:'Chargement du guide…',source:'Référence officielle',detail:'Complétez les paramètres pour votre application ; vérifiez les retours nil/error et utilisez des niveaux API compatibles.',failure:'Impossible de démarrer l’exemple : '},
};
const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function openLuaGuide(options={}) {
  const lang=labels[options.language]?options.language:'en',t=labels[lang],text=value=>localize(value,lang);
  const editor=options.editor, selection={start:editor?.selectionStart??0,end:editor?.selectionEnd??0};
  const backdrop=document.createElement('div');backdrop.className='modal-backdrop lua-guide-backdrop';
  backdrop.dataset.luaGuideUnified='true';
  backdrop.innerHTML=`<section class="modal lua-guide-modal" role="dialog" aria-modal="true" aria-label="${t.title}"><header><h2>${t.title}</h2><button type="button" data-close>${t.close}</button></header><input type="search" class="library-search" placeholder="${t.search}" aria-label="${t.search}"><div class="lua-guide-categories"></div><div class="lua-guide-content"><nav class="lua-guide-results" aria-label="${t.title}"></nav><article class="lua-guide-detail"></article></div><section class="lua-guide-cas-slot" hidden></section><p class="lua-guide-status" role="status">${t.loading}</p></section>`;
  document.body.append(backdrop);
  // Use existing nested modal ordering; an isolated test remains above the guide.
  const layers=[...document.querySelectorAll('.modal-backdrop,.prgm-preview-overlay')].filter(node=>node!==backdrop);
  backdrop.style.zIndex=String(layers.reduce((z,node)=>Math.max(z,parseInt(getComputedStyle(node).zIndex)||0),10049)+1);
  const modal=backdrop.firstElementChild,bar=modal.querySelector('.lua-guide-categories'),list=modal.querySelector('.lua-guide-results'),detail=modal.querySelector('.lua-guide-detail'),search=modal.querySelector('input'),status=modal.querySelector('[role=status]'),content=modal.querySelector('.lua-guide-content'),casSlot=modal.querySelector('.lua-guide-cas-slot');
  const report=await fetch('./src/lua/compatibility-evidence-v45.json').then(r=>r.ok?r.json():null).catch(()=>null);
  if(!backdrop.isConnected)return;
  let category='all',selected=null,mode='explain';
  const categories=[{id:'all',label:t.all},...guideCategories.map(value=>({...value,label:text(value.label)})),{id:'used',label:t.used}];
  const source=()=>editor?.value||options.item?.content||'';
  const used=()=>new Set(usedApis(source()).map(item=>item.id));
  const selectionText=item=>`${item.name} ${text(item.description)} ${item.category}`.toLowerCase();
  function renderDetail() {
    if(!selected){detail.innerHTML=`<p>${t.none}</p>`;return;}
    const item=selected,compat=compatibilityFor(item,report),explanation=explanationFor(item);
    detail.innerHTML=`<h3><code>${escape(item.name)}</code></h3><p>${escape(text(item.description))}</p><div class="lua-guide-entry-actions">${['insert','try','explain','compare'].map(action=>`<button type="button" data-action="${action}" ${(!item.example&&['insert','try'].includes(action))||(!editor&&action==='insert')?'disabled':''} ${action===mode?'aria-pressed="true"':''}>${t[action]}</button>`).join('')}</div>${mode==='compare'?`<h4>${t.comparison}</h4><p>${escape(text(compat.note))}</p><p>${t.report}${compat.version?' · '+escape(compat.version):''}</p>${compat.checks.length?`<ul>${compat.checks.map(check=>`<li><strong>${escape(check.status)}</strong> · ${escape(check.name)}</li>`).join('')}</ul>`:`<p>${t.unverified}</p>`}`:`<h4>${t.parameters}</h4><code>${escape(item.name)}</code><p>${escape(text(explanation.parameters))}</p><h4>${t.result}</h4><p>${escape(text(explanation.result))}</p><p>${escape(text(explanation.errors))}</p>${item.example?`<h4>${t.example}</h4><pre><code>${escape(item.example)}</code></pre>`:`<p>${t.noExample}</p>`}`}<a href="${escape(item.reference)}" target="_blank" rel="noopener noreferrer">${t.source}</a>`;
  }
  function render() {
    const ids=used(),query=search.value.toLowerCase().trim();
    bar.innerHTML=categories.map(value=>`<button type="button" data-category="${value.id}" aria-pressed="${category===value.id}">${escape(value.label)}${value.id==='used'?' ('+ids.size+')':''}</button>`).join('');
    content.hidden=false;casSlot.hidden=true;
    const items=apiCatalog.filter(item=>(category==='all'||category==='used'&&ids.has(item.id)||item.category===category)&&(!query||selectionText(item).includes(query)));
    if(!items.includes(selected))selected=items[0]||null;
    list.innerHTML=(category==='cas'?`<button type="button" data-cas-reference>${t.cas}</button>`:'')+items.map(item=>`<button type="button" data-entry="${escape(item.id)}" aria-pressed="${selected===item}"><code>${escape(item.name)}</code><span>${escape(text(item.description))}</span></button>`).join('');
    renderDetail();status.textContent=t.isolated;
  }
  bar.onclick=event=>{const button=event.target.closest('[data-category]');if(button){category=button.dataset.category;mode='explain';render();}};
  search.oninput=render;
  list.onclick=event=>{
    const button=event.target.closest('[data-entry]');if(button){selected=apiCatalog.find(item=>item.id===button.dataset.entry);render();return;}
    if(event.target.closest('[data-cas-reference]')){
      const panel=window.TnsLuaGuideCas?.createPanel?.(lang);
      if(panel){panel.hidden=false;casSlot.replaceChildren(panel);casSlot.hidden=false;content.hidden=true;}
    }
  };
  detail.onclick=async event=>{
    const button=event.target.closest('[data-action]');if(!button||!selected)return;
    const action=button.dataset.action,item=selected;
    if(action==='insert'){
      if(!editor){status.textContent=t.noEditor;return;}
      const value=editor.value,code=item.example;
      editor.value=value.slice(0,selection.start)+code+value.slice(selection.end);
      selection.start+=code.length;selection.end=selection.start;
      editor.setSelectionRange(selection.start,selection.end);editor.dispatchEvent(new Event('input',{bubbles:true}));status.textContent=t.inserted;
    }else if(action==='try'){
      button.disabled=true;
      try{await options.preview?.(item.example);}catch(error){status.textContent=t.failure+error.message;}finally{button.disabled=false;}
    }else{mode=action;renderDetail();}
  };
  modal.querySelector('[data-close]').onclick=()=>options.closeModal?options.closeModal(backdrop):backdrop.remove();
  render();search.focus();
  return {backdrop,modal};
}
