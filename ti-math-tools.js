(() => {
  'use strict';
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const language=()=>String(document.documentElement.lang||'en').slice(0,2);
  const words={en:{templates:'Math templates',catalog:'Catalog',insert:'Insert',cancel:'Cancel',back:'Back',rows:'Rows',columns:'Columns',dimensions:'Choose dimensions',search:'Find a command or symbol',syntax:'TI syntax',math:'Mathematical view in the editor',empty:'No entries match the search.',library:'Document libraries',noLibraries:'This document has no imported library catalog.',fill:'Complete the parameters after inserting.'},es:{templates:'Plantillas matemáticas',catalog:'Catálogo',insert:'Insertar',cancel:'Cancelar',back:'Volver',rows:'Filas',columns:'Columnas',dimensions:'Elegir dimensiones',search:'Buscar un comando o símbolo',syntax:'Sintaxis TI',math:'Vista matemática en el editor',empty:'No hay entradas para esta búsqueda.',library:'Bibliotecas del documento',noLibraries:'Este documento no tiene un catálogo de bibliotecas importadas.',fill:'Completa los parámetros después de insertar.'},fr:{templates:'Modèles mathématiques',catalog:'Catalogue',insert:'Insérer',cancel:'Annuler',back:'Retour',rows:'Lignes',columns:'Colonnes',dimensions:'Choisir les dimensions',search:'Rechercher une commande ou un symbole',syntax:'Syntaxe TI',math:'Vue mathématique dans l’éditeur',empty:'Aucune entrée pour cette recherche.',library:'Bibliothèques du document',noLibraries:'Ce document ne contient aucun catalogue de bibliothèques importées.',fill:'Complétez les paramètres après insertion.'}};
  const t=k=>(words[language()]||words.en)[k]||k;
  const specs=[
    ['fraction','01_fraccion.jpg','Fracción','((1)/(1))'],['power','02_exponente.jpg','Potencia','1^(1)'],['sqrt','03_raiz_cuadrada.jpg','Raíz cuadrada','√(1)'],['root','04_raiz_enesima.jpg','Raíz enésima','root(1,1)'],['exp','05_exponencial_e.jpg','Exponencial','e^(1)'],['log','06_logaritmo_base.jpg','Logaritmo','log(1,1)'],
    ['piecewise2','07_funcion_por_partes_2.jpg','Función por partes · 2','piecewise(1,1,1,1)'],['piecewiseN','08_funcion_por_partes_n.jpg','Función por partes · N','piecewise(1,1,1,1,1,1)'],['system2','09_sistema_2_ecuaciones.jpg','Sistema · 2','system(1,1)'],['systemN','10_sistema_n_ecuaciones.jpg','Sistema · N','system(1,1,1)'],['abs','11_valor_absoluto.jpg','Valor absoluto','abs(1)'],['dms','12_grados_minutos_segundos.jpg','Grados, minutos, segundos',"1°1'1''"],
    ['matrix22','13_matriz_2x2.jpg','Matriz · 2×2','[[1,1][1,1]]'],['matrix12','14_matriz_1x2.jpg','Matriz · 1×2','[1,1]'],['matrix21','15_matriz_2x1.jpg','Matriz · 2×1','[[1][1]]'],['matrixN','16_matriz_mxn.jpg','Matriz · M×N','[[1,1,1][1,1,1][1,1,1]]'],['sum','17_sumatoria.jpg','Sumatoria','∑(1,1,1,1)'],['product','18_productoria.jpg','Productoria','∏(1,1,1,1)'],['derivative','19_primera_derivada.jpg','Derivada','d(1,1)'],['derivative2','20_segunda_derivada.jpg','Segunda derivada','d(1,1,2)'],['derivativeN','21_derivada_enesima.jpg','Derivada · N','d(1,1,1)'],['integralDef','22_integral_definida.jpg','Integral definida','∫(1,1,1,1)'],['integral','23_integral_indefinida.jpg','Integral indefinida','∫(1,1)'],['limit','24_limite.jpg','Límite','lim(1,1,1,1)'],['subscript',null,'Subíndice','1₁']
  ].map(([id,icon,label,source])=>({id,icon,label,source}));
  let active=null,catalogPromise=null;
  function close(){active?.close();}
  function iconButton(kind,options={}) {
    const button=document.createElement('button');button.type='button';button.className='green-tool-button ti-math-icon-button';button.dataset.mathTool=kind;button.title=t(kind);button.setAttribute('aria-label',t(kind));button.setAttribute('aria-haspopup','dialog');
    button.innerHTML=`<span aria-hidden="true" class="ti-math-tool-icon ti-math-icon-${kind}"></span>`;
    if(options.onClick)button.addEventListener('click',options.onClick);return button;
  }
  function panel(options,kind) {
    close();const anchor=options.anchor, previous=document.activeElement,popup=document.createElement('section');popup.className='ti-math-tool-popup';popup.setAttribute('role','dialog');popup.setAttribute('aria-label',t(kind));
    popup.innerHTML=`<header><strong>${esc(t(kind))}</strong><button type="button" class="ti-math-popup-close" aria-label="${esc(t('cancel'))}">×</button></header><div class="ti-math-popup-content"></div>`;
    document.body.append(popup);anchor?.setAttribute('aria-expanded','true');
    const place=()=>{const r=anchor?.getBoundingClientRect()||{left:innerWidth/2-210,bottom:60};const width=Math.min(kind==='catalog'?680:440,innerWidth-24);popup.style.width=width+'px';popup.style.left=Math.max(12,Math.min(innerWidth-width-12,r.left))+'px';popup.style.top=Math.max(12,Math.min(innerHeight-220,r.bottom+8))+'px';popup.style.maxHeight=Math.max(200,innerHeight-parseFloat(popup.style.top)-12)+'px';};
    let disposed=false,observer=null;const finish=()=>{if(disposed)return;disposed=true;observer?.disconnect();popup.remove();anchor?.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',keys,true);window.removeEventListener('resize',place);if(active?.popup===popup)active=null;options.onClose?.();if(previous?.isConnected)previous.focus({preventScroll:true});};
    const outside=e=>{if(!popup.contains(e.target)&&!anchor?.contains(e.target))finish();};const keys=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish();}else if(e.key==='Tab'){const focusable=[...popup.querySelectorAll('button,input,[tabindex="0"]')].filter(el=>!el.disabled&&!el.hidden&&el.getBoundingClientRect().height);const index=focusable.indexOf(document.activeElement);if(focusable.length&&(e.shiftKey?index<=0:index===focusable.length-1)){e.preventDefault();focusable[e.shiftKey?focusable.length-1:0].focus();}}};
    popup.querySelector('.ti-math-popup-close').onclick=finish;document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',keys,true);window.addEventListener('resize',place);place();active={popup,close:finish};
    if(anchor){observer=new MutationObserver(()=>{if(!anchor.isConnected)finish();});observer.observe(document.body,{childList:true});const backdrop=anchor.closest('.modal-backdrop,.prgm-preview-overlay');if(backdrop)observer.observe(backdrop,{childList:true});}
    return {popup,content:popup.querySelector('.ti-math-popup-content'),close:finish,place,insert:(source,metadata)=>{if(anchor&&!anchor.isConnected){finish();return;}finish();options.insert?.(source,metadata);}};
  }
  function buildTemplate(id,rows=3,columns=3) {
    const n=Math.max(1,Math.min(20,Math.floor(Number(rows)||3))),m=Math.max(1,Math.min(20,Math.floor(Number(columns)||3)));
    if(id==='matrixN')return '['+Array.from({length:n},()=>`[${Array(m).fill('1').join(',')}]`).join('')+']';
    if(id==='systemN')return `system(${Array(Math.max(2,n)).fill('1').join(',')})`;
    if(id==='piecewiseN')return `piecewise(${Array(Math.max(2,n)*2).fill('1').join(',')})`;
    return specs.find(item=>item.id===id)?.source||'';
  }
  function openTemplates(options={}) {
    const p=panel(options,'templates');
    const showGrid=()=>{
      p.content.innerHTML=`<div class="ti-math-template-grid">${specs.map(s=>`<button type="button" data-template-id="${s.id}" title="${esc(s.label)}" aria-label="${esc(s.label)}">${s.icon?`<img src="./assets/calculator-icons/${s.icon}" alt="">`:window.TnsMathTypeset.render(s.source)}${/N$/.test(s.id)?'<span class="ti-math-size-mark">…</span>':''}</button>`).join('')}</div>`;
      if(options.getMathView&&options.setMathView){const label=document.createElement('label');label.className='ti-math-view-option';const check=document.createElement('input');check.type='checkbox';check.checked=options.getMathView();check.onchange=()=>options.setMathView(check.checked);label.append(check,document.createTextNode(t('math')));p.content.append(label);}
      p.content.querySelector('.ti-math-template-grid').onclick=e=>{const target=e.target.closest('[data-template-id]');if(!target)return;const id=target.dataset.templateId;if(['matrixN','systemN','piecewiseN'].includes(id))dimensions(id);else p.insert(buildTemplate(id),specs.find(s=>s.id===id));};p.place();
    };
    const dimensions=id=>{
      const matrix=id==='matrixN';p.content.innerHTML=`<form class="ti-math-dimensions"><strong>${esc(t('dimensions'))}</strong><label>${esc(t('rows'))}<input name="rows" type="number" min="${matrix?1:2}" max="20" step="1" value="3" required></label>${matrix?`<label>${esc(t('columns'))}<input name="columns" type="number" min="1" max="20" step="1" value="3" required></label>`:''}<div class="ti-math-dimension-preview"></div><div class="ti-math-popup-actions"><button type="button" data-back>${esc(t('back'))}</button><button type="submit" class="green-tool-button">${esc(t('insert'))}</button></div></form>`;
      const form=p.content.querySelector('form'),render=()=>p.content.querySelector('.ti-math-dimension-preview').innerHTML=window.TnsMathTypeset.render(buildTemplate(id,form.elements.rows.value,form.elements.columns?.value));form.oninput=render;form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())p.insert(buildTemplate(id,form.elements.rows.value,form.elements.columns?.value),{...specs.find(s=>s.id===id),rows:Number(form.elements.rows.value),columns:Number(form.elements.columns?.value)||1});};form.querySelector('[data-back]').onclick=showGrid;render();form.elements.rows.focus();form.elements.rows.select();p.place();
    };
    showGrid();p.content.querySelector('button')?.focus();return p;
  }
  async function loadCatalog() {return catalogPromise ||= fetch('./assets/math-tools/catalog.json?v=20261104-math-tools-v30').then(r=>{if(!r.ok)throw Error(`Catalog HTTP ${r.status}`);return r.json();});}
  function openCatalog(options={}) {
    const p=panel(options,'catalog');p.content.innerHTML='<div class="ti-math-catalog-loading">…</div>';
    loadCatalog().then(entries=>{
      if(!p.popup.isConnected)return;
      const labels=['A–Z','∫ Σ','° ℉ ℃','∞ β °',t('templates'),t('library')],icons=['01_libro_az.svg','02_integral_sumatoria.svg','03_grados_fahrenheit_celsius.svg','04_infinito_beta_grados.svg','05_nodos_estructura.svg','06_libros_biblioteca.svg'];let tab=1,query='',selected=null;
      p.content.innerHTML=`<nav class="ti-math-catalog-tabs">${labels.map((label,i)=>`<button type="button" data-catalog-tab="${i+1}" title="${esc(label)}" aria-label="${esc(label)}"><img src="./assets/math-tools/${icons[i]}" alt=""><span>${esc(label)}</span></button>`).join('')}</nav><input class="ti-math-catalog-search" type="search" placeholder="${esc(t('search'))}" aria-label="${esc(t('search'))}"><div class="ti-math-catalog-body"><div class="ti-math-catalog-list" role="listbox"></div><div class="ti-math-catalog-detail"></div></div>`;
      const list=p.content.querySelector('.ti-math-catalog-list'),detail=p.content.querySelector('.ti-math-catalog-detail');
      const select=item=>{selected=item;detail.innerHTML=item?`<strong>${esc(item.nombre)}</strong><p>${esc(item.descripcion||item.header)}</p><div class="ti-math-catalog-formula">${window.TnsMathTypeset.render(item.codigo_o_equivalente||item.nombre)}</div><small>${esc(t('syntax'))}</small><code>${esc(item.codigo_o_equivalente||item.nombre)}</code><p class="muted-text">${esc(t('fill'))}</p><button type="button" class="green-tool-button" data-catalog-insert>${esc(t('insert'))}</button>`:'';detail.querySelector('[data-catalog-insert]')?.addEventListener('click',()=>p.insert(selected.codigo_o_equivalente||selected.nombre));};
      const render=()=>{
        for(const button of p.content.querySelectorAll('[data-catalog-tab]')){button.classList.toggle('active',Number(button.dataset.catalogTab)===tab);button.setAttribute('aria-pressed',String(Number(button.dataset.catalogTab)===tab));}
        const needle=query.toLocaleLowerCase(),items=entries.filter(item=>(query||Number(item.pestana)===tab)&&(!query||`${item.nombre} ${item.codigo_o_equivalente} ${item.descripcion}`.toLocaleLowerCase().includes(needle)));
        list.replaceChildren();if(tab===6&&!query){list.textContent=t('noLibraries');select(null);return;}if(!items.length){list.textContent=t('empty');select(null);return;}
        for(const item of items){const b=document.createElement('button');b.type='button';b.className='ti-math-catalog-entry';b.setAttribute('role','option');b.innerHTML=`<span>${esc(item.nombre)}</span><small>${esc(item.header)}</small>`;b.onclick=()=>{for(const node of list.children)node.setAttribute('aria-selected',String(node===b));select(item);};b.ondblclick=()=>p.insert(item.codigo_o_equivalente||item.nombre);list.append(b);}list.firstElementChild.click();
      };
      p.content.querySelector('nav').onclick=e=>{const button=e.target.closest('[data-catalog-tab]');if(!button)return;tab=Number(button.dataset.catalogTab);query='';p.content.querySelector('input').value='';if(tab===5){p.close();openTemplates(options);}else render();};p.content.querySelector('input').oninput=e=>{query=e.target.value;render();};render();p.content.querySelector('input').focus();p.place();
    }).catch(error=>{if(p.popup.isConnected)p.content.textContent=error.message;});return p;
  }
  window.TnsMathTools=Object.freeze({templates:specs,buildTemplate,openTemplates,openCatalog,close,iconButton,render:s=>window.TnsMathTypeset.render(s)});
})();
