(() => {
  'use strict';
  const layouts = [
    {clay:0,count:1,cells:[[0,0,1,1]]},
    {clay:1,count:2,cells:[[0,0,.5,1],[.5,0,.5,1]]},
    {clay:2,count:2,cells:[[0,0,1,.5],[0,.5,1,.5]]},
    {clay:3,count:3,cells:[[0,0,1,.5],[0,.5,.5,.5],[.5,.5,.5,.5]]},
    {clay:4,count:3,cells:[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,1,.5]]},
    {clay:5,count:3,cells:[[0,0,.5,.5],[.5,0,.5,1],[0,.5,.5,.5]]},
    {clay:6,count:3,cells:[[0,0,.5,1],[.5,0,.5,.5],[.5,.5,.5,.5]]},
    {clay:7,count:4,cells:[[0,0,.5,.5],[.5,0,.5,.5],[0,.5,.5,.5],[.5,.5,.5,.5]]},
  ];
  const words = () => ({
    en:{title:'Page layout',description:'A card is one calculator page. Group up to four applications on a page, or separate them into individual pages.',page:'Page',apps:'Applications',design:'Design',layout:'Layout',order:'Application order',up:'Move up',down:'Move down',save:'Save layout',saved:'Changes saved in the document.',group:'Group pages',ungroup:'Ungroup applications',join:'Select pages in the same problem to group',close:'Close',empty:'This page has no applications.',preview:'Preview page',busy:'Saving…',capacity:'applications',limit:'Select two or more pages with a total of 2–4 applications.',single:'This action needs a page with more than one application.',unknown:'Choose a design for this number of applications.',same:'Pages from different problems cannot be grouped.'},
    es:{title:'Distribución de páginas',description:'Una card es una página de la calculadora. Agrupa hasta cuatro aplicaciones en una página o sepáralas en páginas individuales.',page:'Página',apps:'Aplicaciones',design:'Diseño',layout:'Distribución',order:'Orden de las aplicaciones',up:'Subir',down:'Bajar',save:'Guardar distribución',saved:'Cambios guardados en el documento.',group:'Agrupar páginas',ungroup:'Desagrupar aplicaciones',join:'Selecciona páginas del mismo problema para agrupar',close:'Cerrar',empty:'Esta página no tiene aplicaciones.',preview:'Previsualizar página',busy:'Guardando…',capacity:'aplicaciones',limit:'Selecciona dos o más páginas con un total de 2–4 aplicaciones.',single:'Esta acción necesita una página con más de una aplicación.',unknown:'Elige un diseño para esta cantidad de aplicaciones.',same:'No se pueden agrupar páginas de problemas distintos.'},
    fr:{title:'Disposition des pages',description:'Une card est une page de la calculatrice. Regroupez jusqu’à quatre applications sur une page ou séparez-les en pages individuelles.',page:'Page',apps:'Applications',design:'Disposition',layout:'Disposition',order:'Ordre des applications',up:'Monter',down:'Descendre',save:'Enregistrer la disposition',saved:'Modifications enregistrées dans le document.',group:'Regrouper les pages',ungroup:'Dégrouper les applications',join:'Sélectionnez des pages du même problème à regrouper',close:'Fermer',empty:'Cette page ne contient aucune application.',preview:'Aperçu de la page',busy:'Enregistrement…',capacity:'applications',limit:'Sélectionnez au moins deux pages contenant 2 à 4 applications au total.',single:'Cette action nécessite une page contenant plusieurs applications.',unknown:'Choisissez une disposition adaptée au nombre d’applications.',same:'Impossible de regrouper des pages de problèmes différents.'},
  })[String(document.documentElement.lang||'en').slice(0,2)] || {};
  const cellIcon = (preset) => {
    const icon=document.createElement('span');icon.className='page-layout-icon';icon.setAttribute('aria-hidden','true');
    for(const [x,y,w,h] of preset.cells){const cell=document.createElement('span');Object.assign(cell.style,{left:x*100+'%',top:y*100+'%',width:w*100+'%',height:h*100+'%'});icon.append(cell);}
    return icon;
  };
  const defaultClay=count=>({1:0,2:1,3:3,4:7})[count] ?? 0;
  function nativeRatios(page,clay,count) {
    const active=[[],['w1'],['h1'],['w1','h1'],['w1','h1'],['w1','h1'],['w1','h2'],['w1','h1','h2']][clay] || [];
    return Object.fromEntries(['w1','h1','w2','h2'].map(key=>{
      if(count===1)return [key,10000];
      const value=Number(page?.detail?.[key]),split=active.includes(key);
      return [key,Math.max(split?1000:0,Math.min(split?9000:10000,Number.isFinite(value)?value:5000))];
    }));
  }
  function applicationType(app) {
    const name=String(app?.name||'');
    if(name.startsWith('TI.')||name==='tabulator')return name;
    return ({Notepad:'TI.Notepad',Graph:'TI.GeoGrapher',Scratchpad:'TI.Scratchpad',Python:'TI.PythonEditor',PythonShell:'TI.PythonShell',Spreadsheet:'tabulator',Lua:'TI.ScriptApp'})[app?.content_label] || name || String(app?.type||'');
  }
  function pageApplications(page) {
    const types=new Map();
    for(const app of page.apps||[]){const type=applicationType(app);types.set(type,(types.get(type)||0)+1);}
    return [...types].map(([type,count])=>type+(count>1?' ×'+count:'')).join(' + ');
  }
  function visibleLayers() {
    return [...document.querySelectorAll('.modal-backdrop,.prgm-preview-overlay,dialog[open]')].filter(layer=>{
      const style=getComputedStyle(layer);return style.display!=='none'&&style.visibility!=='hidden'&&!layer.classList.contains('closing');
    });
  }
  function open(options={}) {
    const opener=document.activeElement;
    const t=words(),backdrop=document.createElement('div');backdrop.className='modal-backdrop document-page-layout-backdrop';
    const previousLayers=visibleLayers();
    const previousInert=previousLayers.map(layer=>[layer,layer.inert]);
    for(const [layer] of previousInert)layer.inert=true;
    backdrop.style.setProperty('z-index',String(Math.max(10050,...previousLayers.map(layer=>Number(getComputedStyle(layer).zIndex)||0))+1),'important');
    backdrop.innerHTML='<section class="modal document-page-layout-modal" role="dialog" aria-modal="true" aria-labelledby="page-layout-title"><h2 id="page-layout-title"></h2><p data-layout-description></p><div class="page-layout-editor"><div class="page-layout-pages"><h3 data-layout-page-title></h3><div data-layout-pages></div><h3 data-layout-group-title></h3><div data-layout-group-list></div><button type="button" data-layout-group></button></div><div class="page-layout-details"><div class="page-layout-presets" role="group"></div><h3 data-layout-order-title></h3><ol data-layout-order></ol><p class="muted-text" data-layout-empty></p><div class="page-layout-command-row"><button type="button" data-layout-ungroup></button><button type="button" data-layout-preview></button></div></div></div><p role="status" data-layout-status></p><div class="modal-actions"><button type="button" data-layout-close></button><button type="button" class="green-tool-button" data-layout-save></button></div></section>';
    const q=s=>backdrop.querySelector(s),modal=backdrop.firstElementChild;
    q('h2').textContent=t.title;q('[data-layout-description]').textContent=t.description;q('[data-layout-page-title]').textContent=t.page;q('[data-layout-group-title]').textContent=t.join;q('[data-layout-order-title]').textContent=t.order;
    for(const [key,text] of [['group',t.group],['ungroup',t.ungroup],['preview',t.preview],['close',t.close],['save',t.save]])q('[data-layout-'+key+']').textContent=text;
    let pages=options.pages||[],selected=Math.max(0,pages.findIndex(p=>p.file===options.selected?.file&&p.path===options.selected?.path)),order=[],clay=0,ratios={},busy=false;
    const selectedGroup=new Set();
    const appLabel=app=>app.detail?.name||app.name||app.type;
    const pageLabel=(page,index)=>`${t.page} ${window.TnsDocumentPreviewNavigation?.pageLabel(page)||index+1} · ${pageApplications(page)||t.empty} (${page.apps.length})`;
    const status=q('[data-layout-status]');
    function resetDraft(){const page=pages[selected];order=(page?.apps||[]).map((_,i)=>i);const native=Number(page?.detail?.clay||0);clay=layouts.some(l=>l.clay===native&&l.count===order.length)?native:defaultClay(order.length);ratios=nativeRatios(page,clay,order.length);selectedGroup.clear();if(page)selectedGroup.add(page.path);}
    function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b;}
    function draw(){
      const page=pages[selected],list=q('[data-layout-pages]');list.replaceChildren();
      pages.forEach((p,i)=>{const b=button(pageLabel(p,i),()=>{selected=i;resetDraft();status.textContent='';draw();});b.className='page-layout-page';b.setAttribute('aria-pressed',String(i===selected));b.disabled=busy;list.append(b);});
      const group=q('[data-layout-group-list]');group.replaceChildren();
      pages.filter(p=>p.file===page?.file).forEach(p=>{const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=selectedGroup.has(p.path);input.disabled=busy||!p.apps.length;input.onchange=()=>{input.checked?selectedGroup.add(p.path):selectedGroup.delete(p.path);updateActions();};label.append(input,document.createTextNode(pageLabel(p,pages.indexOf(p))));group.append(label);});
      const presets=q('.page-layout-presets');presets.replaceChildren();
      for(const preset of layouts){const b=button('',()=>{clay=preset.clay;ratios={w1:5000,h1:5000,w2:5000,h2:5000};draw();});b.className='page-layout-preset';b.append(cellIcon(preset),document.createTextNode(`${t.design} ${preset.clay+1}`));b.title=`${preset.count} ${t.capacity}`;b.setAttribute('aria-pressed',String(preset.clay===clay));b.dataset.layoutClay=preset.clay;b.disabled=busy||preset.count!==order.length;presets.append(b);}
      const rows=q('[data-layout-order]');rows.replaceChildren();
      order.forEach((index,position)=>{const li=document.createElement('li'),name=document.createElement('span');name.textContent=appLabel(page.apps[index]);li.append(name);for(const [offset,label,symbol] of [[-1,t.up,'↑'],[1,t.down,'↓']]){const b=button(symbol,()=>{[order[position],order[position+offset]]=[order[position+offset],order[position]];draw();});b.setAttribute('aria-label',label+': '+name.textContent);b.disabled=busy||position+offset<0||position+offset>=order.length;li.append(b);}rows.append(li);});
      q('[data-layout-empty]').textContent=order.length?'':t.empty;updateActions();
    }
    function updateActions(){const page=pages[selected],group=pages.filter(p=>p.file===page?.file&&selectedGroup.has(p.path)),total=group.reduce((n,p)=>n+p.apps.length,0);q('[data-layout-group]').disabled=busy||group.length<2||total<2||total>4;q('[data-layout-group]').title=group.length<2||total>4?t.limit:'';q('[data-layout-ungroup]').disabled=busy||order.length<2;q('[data-layout-save]').disabled=busy||!order.length;q('[data-layout-preview]').disabled=busy||!page||!options.onPreview;q('[data-layout-close]').disabled=busy;}
    async function apply(action){
      const page=pages[selected];if(!page||busy)return;
      const affected=action==='group'?pages.filter(p=>p.file===page.file&&selectedGroup.has(p.path)):[page];
      if(action==='group'&&(affected.length<2||affected.reduce((n,p)=>n+p.apps.length,0)>4)){status.textContent=t.limit;return;}
      busy=true;status.textContent=t.busy;draw();
      try{
        const next=await options.onApply?.({action,file:page.file,path:page.path,cards:affected,layout:action==='group'?{clay:defaultClay(affected.reduce((n,p)=>n+p.apps.length,0)),w1:5000,h1:5000,w2:5000,h2:5000}:{clay,...ratios},order:order.slice()});
        if(next?.pages){pages=next.pages;selected=Math.max(0,pages.findIndex(p=>p.file===page.file&&p.path===(next.path||page.path)));resetDraft();}
        status.textContent=t.saved;
      }catch(error){status.textContent=error.message;}
      finally{busy=false;draw();}
    }
    q('[data-layout-save]').onclick=()=>apply('layout');q('[data-layout-group]').onclick=()=>apply('group');q('[data-layout-ungroup]').onclick=()=>apply('ungroup');
    const isTop=()=>backdrop.isConnected&&!visibleLayers().some(layer=>layer!==backdrop&&(Number(getComputedStyle(layer).zIndex)||0)>(Number(getComputedStyle(backdrop).zIndex)||0));
    const focusables=()=>[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const keepFocus=event=>{if(isTop()&&!backdrop.contains(event.target))queueMicrotask(()=>{if(isTop()&&!backdrop.contains(document.activeElement))q('[data-layout-close]').focus({preventScroll:true});});};
    const close=()=>{if(!busy){document.removeEventListener('focusin',keepFocus,true);backdrop.remove();for(const [layer,inert] of previousInert)layer.inert=inert;if(opener?.isConnected)opener.focus({preventScroll:true});options.onClose?.();}};
    q('[data-layout-close]').onclick=close;q('[data-layout-preview]').onclick=()=>options.onPreview?.(pages[selected]);
    backdrop.addEventListener('keydown',event=>{
      if(!isTop())return;
      // Preview keyboard handlers live on document; do not run the underlying
      // application while its layout dialog owns keyboard focus.
      event.stopPropagation();
      if(event.key==='Escape'){event.preventDefault();close();}
      else if(event.key==='Tab'){
        const items=focusables(),first=items[0],last=items.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    });
    resetDraft();draw();document.body.append(backdrop);document.addEventListener('focusin',keepFocus,true);q('[data-layout-close]').focus();
    return{backdrop,modal,close,getState:()=>({pages,selected,order:order.slice(),clay,ratios:{...ratios}})};
  }
  window.TnsDocumentPageLayout=Object.freeze({open,layouts,defaultClay,words});
})();
