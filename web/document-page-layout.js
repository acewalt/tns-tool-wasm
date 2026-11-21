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
    en:{application:'application',selectedOne:'page selected',title:'Page layout',description:'A card is one calculator page. Group up to four applications on a page, or separate them into individual pages.',page:'Page',apps:'Applications',design:'Design',layout:'Layout',order:'Application order',up:'Move up',down:'Move down',save:'Save layout',saved:'Changes saved in the document.',group:'Group pages',ungroup:'Ungroup applications',join:'Select pages in the same problem to group',close:'Close',empty:'This page has no applications.',preview:'Preview page',busy:'Saving…',capacity:'applications',limit:'Select two or more pages with a total of 2–4 applications.',single:'This action needs a page with more than one application.',unknown:'Choose a design for this number of applications.',same:'Pages from different problems cannot be grouped.',pages:'Pages',organize:'Organize pages',multiple:'Select multiple pages',clear:'Clear',selected:'pages selected',total:'applications in total',choose:'Select a page to see its layout.',arrange:'Drag an application onto another to swap their positions.',keyboard:'Press Enter on two applications to swap them.',picked:'Application selected. Choose its new position.',swapped:'Application positions swapped.',draft:'Page preview',none:'Select at least one page.',tooMany:'A page can contain up to four applications.'},
    es:{application:'aplicación',selectedOne:'página seleccionada',title:'Distribución de páginas',description:'Una card es una página de la calculadora. Agrupa hasta cuatro aplicaciones en una página o sepáralas en páginas individuales.',page:'Página',apps:'Aplicaciones',design:'Diseño',layout:'Distribución',order:'Orden de las aplicaciones',up:'Subir',down:'Bajar',save:'Guardar distribución',saved:'Cambios guardados en el documento.',group:'Agrupar páginas',ungroup:'Desagrupar aplicaciones',join:'Selecciona páginas del mismo problema para agrupar',close:'Cerrar',empty:'Esta página no tiene aplicaciones.',preview:'Previsualizar página',busy:'Guardando…',capacity:'aplicaciones',limit:'Selecciona dos o más páginas con un total de 2–4 aplicaciones.',single:'Esta acción necesita una página con más de una aplicación.',unknown:'Elige un diseño para esta cantidad de aplicaciones.',same:'No se pueden agrupar páginas de problemas distintos.',pages:'Páginas',organize:'Organizar páginas',multiple:'Seleccionar varias páginas',clear:'Limpiar',selected:'páginas seleccionadas',total:'aplicaciones en total',choose:'Selecciona una página para ver su distribución.',arrange:'Arrastra una aplicación sobre otra para intercambiar sus posiciones.',keyboard:'Pulsa Enter en dos aplicaciones para intercambiarlas.',picked:'Aplicación seleccionada. Elige su nueva posición.',swapped:'Posiciones de las aplicaciones intercambiadas.',draft:'Vista de la página',none:'Selecciona al menos una página.',tooMany:'Una página admite hasta cuatro aplicaciones.'},
    fr:{application:'application',selectedOne:'page sélectionnée',title:'Disposition des pages',description:'Une card est une page de la calculatrice. Regroupez jusqu’à quatre applications sur une page ou séparez-les en pages individuelles.',page:'Page',apps:'Applications',design:'Disposition',layout:'Disposition',order:'Ordre des applications',up:'Monter',down:'Descendre',save:'Enregistrer la disposition',saved:'Modifications enregistrées dans le document.',group:'Regrouper les pages',ungroup:'Dégrouper les applications',join:'Sélectionnez des pages du même problème à regrouper',close:'Fermer',empty:'Cette page ne contient aucune application.',preview:'Aperçu de la page',busy:'Enregistrement…',capacity:'applications',limit:'Sélectionnez au moins deux pages contenant 2 à 4 applications au total.',single:'Cette action nécessite une page contenant plusieurs applications.',unknown:'Choisissez une disposition adaptée au nombre d’applications.',same:'Impossible de regrouper des pages de problèmes différents.',pages:'Pages',organize:'Organiser les pages',multiple:'Sélectionner plusieurs pages',clear:'Effacer',selected:'pages sélectionnées',total:'applications au total',choose:'Sélectionnez une page pour voir sa disposition.',arrange:'Faites glisser une application sur une autre pour échanger leurs positions.',keyboard:'Appuyez sur Entrée sur deux applications pour les échanger.',picked:'Application sélectionnée. Choisissez sa nouvelle position.',swapped:'Positions des applications échangées.',draft:'Aperçu de la page',none:'Sélectionnez au moins une page.',tooMany:'Une page peut contenir jusqu’à quatre applications.'},
  })[String(document.documentElement.lang||'en').slice(0,2)] || {};
  const cellIcon = (preset) => {
    const icon=document.createElement('span');icon.className='page-layout-icon';icon.setAttribute('aria-hidden','true');
    for(const [x,y,w,h] of preset.cells){const cell=document.createElement('span');Object.assign(cell.style,{left:x*100+'%',top:y*100+'%',width:w*100+'%',height:h*100+'%'});icon.append(cell);}
    return icon;
  };
  const countText=(count,singular,plural)=>count+' '+(count===1?singular:plural);
  const defaultClay=count=>({1:0,2:1,3:3,4:7})[count] ?? 0;
  function nativeRatios(page,clay,count) {
    const active=[[],['w1'],['h1'],['w1','h1'],['w1','h1'],['w1','h1'],['w1','h2'],['w1','h1','h2']][clay] || [];
    return Object.fromEntries(['w1','h1','w2','h2'].map(key=>{
      if(count===1)return [key,10000];
      const value=Number(page?.detail?.[key]),split=active.includes(key);
      return [key,Math.round(Math.max(split?1000:0,Math.min(split?9000:10000,Number.isFinite(value)?value:5000)))];
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
  const validLayouts=count=>layouts.filter(preset=>preset.count===count);
  function previewCells(clay,ratios={}) {
    const preset=layouts.find(value=>value.clay===Number(clay));
    if(!preset)return [];
    const r=nativeRatios({detail:ratios},preset.clay,preset.count),x=r.w1/10000,y=r.h1/10000,z=r.h2/10000;
    return [
      [[0,0,1,1]],
      [[0,0,x,1],[x,0,1-x,1]],
      [[0,0,1,y],[0,y,1,1-y]],
      [[0,0,1,y],[0,y,x,1-y],[x,y,1-x,1-y]],
      [[0,0,x,y],[x,0,1-x,y],[0,y,1,1-y]],
      [[0,0,x,y],[x,0,1-x,1],[0,y,x,1-y]],
      [[0,0,x,1],[x,0,1-x,z],[x,z,1-x,1-z]],
      [[0,0,x,y],[x,0,1-x,z],[0,y,x,1-y],[x,z,1-x,1-z]],
    ][preset.clay];
  }
  function applicationAppearance(app) {
    const type=applicationType(app),navigation=window.TnsDocumentPreviewNavigation;
    const fallback={ 'TI.Notepad':'#ffad32','TI.Scratchpad':'#89869d','TI.GeoGrapher':'#299bbe',tabulator:'#59b9a8','TI.PythonEditor':'#3c7faf','TI.PythonShell':'#3c7faf','TI.ProgramEditor':'#f5656b' };
    return {type,accent:navigation?.accentFor?.(type)||fallback[type]||'#299bbe'};
  }
  function open(options={}) {
    const opener=document.activeElement;
    const t=words(),backdrop=document.createElement('div');backdrop.className='modal-backdrop document-page-layout-backdrop';
    const previousLayers=visibleLayers();
    const previousInert=previousLayers.map(layer=>[layer,layer.inert]);
    for(const [layer] of previousInert)layer.inert=true;
    backdrop.style.setProperty('z-index',String(Math.max(10050,...previousLayers.map(layer=>Number(getComputedStyle(layer).zIndex)||0))+1),'important');
    backdrop.innerHTML='<section class="modal document-page-layout-modal" role="dialog" aria-modal="true" aria-labelledby="page-layout-title"><h2 id="page-layout-title"></h2><p data-layout-description></p><div class="page-layout-editor"><aside class="page-layout-pages"><div class="page-layout-pages-heading"><div><h3 data-layout-page-title></h3><p data-layout-pages-count></p></div><button type="button" class="page-layout-multiple" data-layout-multiple data-layout-focus="multiple"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 6 1.5 1.5L7 5M10 6h10M3 12l1.5 1.5L7 11m3 1h10M3 18l1.5 1.5L7 17m3 1h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="page-layout-selection-bar" data-layout-selection-bar hidden><span data-layout-group-title></span><button type="button" data-layout-clear data-layout-focus="clear"></button></div><div data-layout-pages></div><div class="page-layout-selection-footer" data-layout-selection-footer hidden><div><strong data-layout-selected-count></strong><p data-layout-selected-apps></p></div><button type="button" class="green-tool-button" data-layout-group data-layout-focus="group"></button></div></aside><div class="page-layout-details"><h3 data-layout-design-title></h3><div class="page-layout-presets" role="group"></div><p class="page-layout-empty" data-layout-empty></p><div class="page-layout-draft" data-layout-draft><div class="page-layout-draft-heading"><h3 data-layout-preview-title></h3><span data-layout-preview-count></span></div><div class="page-layout-symbolic" data-layout-symbolic role="group"></div><p class="page-layout-swap-hint" data-layout-swap-hint></p></div><div class="page-layout-command-row"><button type="button" data-layout-ungroup data-layout-focus="ungroup" hidden></button></div></div></div><p role="status" aria-live="polite" data-layout-status></p><div class="modal-actions"><button type="button" data-layout-close data-layout-focus="close"></button><button type="button" class="green-tool-button" data-layout-save data-layout-focus="save"></button></div></section>';
    const q=s=>backdrop.querySelector(s),modal=backdrop.firstElementChild;
    q('h2').textContent=t.title;q('[data-layout-description]').textContent=t.description;q('[data-layout-design-title]').textContent=t.layout;
    q('[data-layout-group-title]').textContent=t.join;q('[data-layout-multiple]').title=t.multiple;q('[data-layout-multiple]').setAttribute('aria-label',t.multiple);q('[data-layout-symbolic]').setAttribute('aria-label',t.draft);
    for(const [key,text] of [['group',t.group],['ungroup',t.ungroup],['clear',t.clear],['close',t.close],['save',t.save]])q('[data-layout-'+key+']').textContent=text;
    let pages=options.pages||[],selected=Math.max(0,pages.findIndex(p=>p.file===options.selected?.file&&p.path===options.selected?.path)),order=[],clay=0,ratios={},busy=false,multiple=false,picked=-1,dragSource=-1,closed=false;
    const selectedGroup=new Set();
    const pageKey=page=>JSON.stringify([page.file,page.path]);
    const pageLabel=(page,index)=>`${t.page} ${window.TnsDocumentPreviewNavigation?.pageLabel(page,index)||index+1}`;
    const status=q('[data-layout-status]');
    const selectedPages=()=>multiple?pages.filter(page=>selectedGroup.has(pageKey(page))):pages[selected]?[pages[selected]]:[];
    const applications=()=>selectedPages().flatMap(page=>(page.apps||[]).map(app=>({app,page})));
    function resetDraft(resetSelection=false){
      if(resetSelection){selectedGroup.clear();if(pages[selected])selectedGroup.add(pageKey(pages[selected]));}
      const active=selectedPages(),apps=applications();order=apps.map((_,i)=>i);picked=-1;dragSource=-1;
      const page=active.length===1?active[0]:null,native=Number(page?.detail?.clay||0);clay=validLayouts(apps.length).some(l=>l.clay===native)?native:defaultClay(apps.length);ratios=nativeRatios(page,clay,apps.length);
    }
    function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b;}
    function swap(source,target){
      if(busy||source===target||source<0||target<0||source>=order.length||target>=order.length)return;
      [order[source],order[target]]=[order[target],order[source]];picked=-1;dragSource=-1;status.textContent=t.swapped;draw();
    }
    function choosePage(index){
      if(busy)return;const page=pages[index];
      if(multiple){const key=pageKey(page);selectedGroup.has(key)?selectedGroup.delete(key):selectedGroup.add(key);if(!selectedGroup.has(pageKey(pages[selected])))selected=pages.findIndex(p=>selectedGroup.has(pageKey(p)));if(selected<0)selected=index;}
      else selected=index;
      resetDraft(!multiple);status.textContent='';draw();
    }
    function drawSymbolic(apps){
      const host=q('[data-layout-symbolic]');host.replaceChildren();
      const active=selectedPages(),valid=apps.length>0&&apps.length<=4;
      q('[data-layout-draft]').hidden=!valid;
      if(!valid)return;
      q('[data-layout-preview-title]').textContent=active.length===1?pageLabel(active[0],pages.indexOf(active[0])):t.draft;
      q('[data-layout-preview-count]').textContent=countText(apps.length,t.application,t.capacity);
      q('[data-layout-swap-hint]').textContent=apps.length>1?t.arrange+' '+t.keyboard:'';
      const geometry=previewCells(clay,ratios);
      order.forEach((index,position)=>{
        const app=apps[index].app,{type,accent}=applicationAppearance(app),cell=document.createElement('div'),title=document.createElement('strong');
        cell.className='page-layout-app';cell.dataset.layoutApp=String(position);cell.dataset.appIndex=String(index);cell.dataset.layoutFocus='app-'+position;cell.dataset.appType=type;cell.style.setProperty('--app-accent',accent);
        const [x,y,w,h]=geometry[position];Object.assign(cell.style,{left:x*100+'%',top:y*100+'%',width:w*100+'%',height:h*100+'%'});
        title.textContent=type;cell.append(title);
        const detail=app.detail?.name||app.detail?.program_name||'';if(detail&&detail!==type){const name=document.createElement('span');name.textContent=detail;cell.append(name);}
        if(apps.length>1){
          cell.tabIndex=0;cell.setAttribute('role','button');cell.setAttribute('aria-label',type+'. '+t.arrange);cell.setAttribute('aria-pressed',String(position===picked));cell.draggable=!busy;cell.setAttribute('aria-disabled',String(busy));
          cell.onclick=()=>{if(busy)return;if(picked<0){picked=position;status.textContent=t.picked;draw();}else if(picked===position){picked=-1;draw();}else swap(picked,position);};
          cell.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();cell.click();}else if(event.key==='Escape'&&picked>=0){event.preventDefault();event.stopPropagation();picked=-1;draw();}};
          cell.ondragstart=event=>{if(busy){event.preventDefault();return;}dragSource=position;picked=-1;cell.classList.add('is-dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain','tns-page-layout:'+position);};
          cell.ondragover=event=>{if(dragSource<0||dragSource===position||busy)return;event.preventDefault();event.dataTransfer.dropEffect='move';cell.classList.add('is-drop-target');};
          cell.ondragleave=event=>{if(!cell.contains(event.relatedTarget))cell.classList.remove('is-drop-target');};
          cell.ondrop=event=>{if(dragSource<0||busy)return;event.preventDefault();event.stopPropagation();swap(dragSource,position);};
          cell.ondragend=()=>{dragSource=-1;host.querySelectorAll('.is-dragging,.is-drop-target').forEach(el=>el.classList.remove('is-dragging','is-drop-target'));};
        }
        host.append(cell);
      });
    }
    function draw(){
      const focus=document.activeElement?.dataset.layoutFocus,list=q('[data-layout-pages]'),scrollTop=list.scrollTop,active=selectedPages(),apps=applications(),anchor=active[0];list.replaceChildren();
      q('[data-layout-page-title]').textContent=multiple?t.organize:t.pages;q('[data-layout-pages-count]').textContent=countText(pages.length,t.page.toLowerCase(),t.pages.toLowerCase())+' · '+countText(pages.reduce((sum,page)=>sum+(page.apps?.length||0),0),t.application,t.capacity);
      q('[data-layout-multiple]').setAttribute('aria-pressed',String(multiple));q('[data-layout-multiple]').disabled=busy;
      q('[data-layout-selection-bar]').hidden=!multiple;q('[data-layout-selection-footer]').hidden=!multiple;q('[data-layout-clear]').disabled=busy||!active.length;
      q('[data-layout-selected-count]').textContent=countText(active.length,t.selectedOne,t.selected);q('[data-layout-selected-apps]').textContent=apps.length+' '+t.total;
      pages.forEach((page,index)=>{
        const count=page.apps?.length||0,chosen=multiple?selectedGroup.has(pageKey(page)):index===selected,b=button('',()=>choosePage(index)),head=document.createElement('span'),name=document.createElement('strong'),badge=document.createElement('span'),types=document.createElement('span');
        b.className='page-layout-page';b.dataset.layoutFocus='page-'+index;b.dataset.layoutPage=String(index);b.setAttribute('aria-pressed',String(chosen));b.disabled=busy||(multiple&&anchor&&page.file!==anchor.file)||!count;b.title=multiple&&anchor&&page.file!==anchor.file?t.same:pageApplications(page);
        head.className='page-layout-page-heading';name.textContent=pageLabel(page,index);badge.textContent=countText(count,t.application,t.capacity);badge.className='page-layout-page-count';
        const icon=document.createElement('span');icon.className='page-layout-page-marker';icon.setAttribute('aria-hidden','true');icon.textContent=multiple?(chosen?'✓':''):count>1?'▦':'▣';head.append(icon,name,badge);
        types.className='page-layout-page-types';const counts=new Map();for(const app of page.apps||[]){const type=applicationType(app);counts.set(type,{app,count:(counts.get(type)?.count||0)+1});}
        for(const [type,value] of counts){const chip=document.createElement('span');chip.className='page-layout-app-chip';chip.style.setProperty('--app-accent',applicationAppearance(value.app).accent);chip.textContent=type+(value.count>1?' ×'+value.count:'');types.append(chip);}
        if(!count)types.textContent=t.empty;b.append(head,types);list.append(b);
      });list.scrollTop=scrollTop;
      const presets=q('.page-layout-presets');presets.replaceChildren();
      for(const preset of validLayouts(apps.length)){const b=button('',()=>{clay=preset.clay;ratios=nativeRatios({detail:{w1:5000,h1:5000,w2:5000,h2:5000}},clay,apps.length);picked=-1;draw();});b.className='page-layout-preset';b.append(cellIcon(preset),document.createTextNode(`${t.design} ${preset.clay+1}`));b.title=countText(preset.count,t.application,t.capacity);b.setAttribute('aria-pressed',String(preset.clay===clay));b.dataset.layoutClay=preset.clay;b.dataset.layoutFocus='design-'+preset.clay;b.disabled=busy;presets.append(b);}
      presets.setAttribute('aria-label',t.layout);presets.hidden=!presets.childElementCount;
      q('[data-layout-empty]').textContent=!active.length?t.none:!apps.length?t.empty:apps.length>4?t.tooMany:'';q('[data-layout-empty]').hidden=!!apps.length&&apps.length<=4;
      drawSymbolic(apps);updateActions();if(focus){const target=[...modal.querySelectorAll('[data-layout-focus]')].find(el=>el.dataset.layoutFocus===focus&&!el.disabled&&!el.hidden);target?.focus({preventScroll:true});}
    }
    function updateActions(){const active=selectedPages(),total=applications().length,valid=total>0&&total<=4&&typeof options.onApply==='function';q('[data-layout-group]').disabled=busy||active.length<2||!valid;q('[data-layout-group]').title=active.length<2||!valid?t.limit:'';q('[data-layout-ungroup]').hidden=active.length!==1||total<2;q('[data-layout-ungroup]').disabled=busy||!valid;q('[data-layout-save]').disabled=busy||!valid;q('[data-layout-close]').disabled=busy;}
    async function apply(action,closeAfter=false){
      const affected=selectedPages(),page=affected[0],total=applications().length;if(!page||busy||typeof options.onApply!=='function')return;
      if(!total||total>4||(action==='group'&&(affected.length<2||affected.some(p=>p.file!==page.file)))){status.textContent=t.limit;return;}
      busy=true;status.textContent=t.busy;draw();
      let saved=false;
      try{
        const next=await options.onApply({action,file:page.file,path:page.path,cards:affected,layout:{clay,...ratios},order:order.slice()});
        if(next?.pages){pages=next.pages;selected=Math.max(0,pages.findIndex(p=>p.file===page.file&&p.path===(next.path||page.path)));multiple=false;resetDraft(true);}
        status.textContent=t.saved;saved=true;
      }catch(error){status.textContent=error.message;}
      finally{busy=false;if(saved&&closeAfter)close();else draw();}
    }
    q('[data-layout-save]').onclick=()=>apply(selectedPages().length>1?'group':'layout',true);q('[data-layout-group]').onclick=()=>apply('group');q('[data-layout-ungroup]').onclick=()=>apply('ungroup');
    q('[data-layout-multiple]').onclick=()=>{multiple=!multiple;resetDraft(true);status.textContent='';draw();};
    q('[data-layout-clear]').onclick=()=>{selectedGroup.clear();resetDraft();status.textContent='';draw();};
    const isTop=()=>backdrop.isConnected&&!visibleLayers().some(layer=>layer!==backdrop&&(Number(getComputedStyle(layer).zIndex)||0)>(Number(getComputedStyle(backdrop).zIndex)||0));
    const focusables=()=>[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length);
    const keepFocus=event=>{if(isTop()&&!backdrop.contains(event.target))queueMicrotask(()=>{if(isTop()&&!backdrop.contains(document.activeElement))q('[data-layout-close]').focus({preventScroll:true});});};
    const close=()=>{if(!busy&&!closed){closed=true;document.removeEventListener('focusin',keepFocus,true);backdrop.remove();for(const [layer,inert] of previousInert)layer.inert=inert;if(opener?.isConnected)opener.focus({preventScroll:true});options.onClose?.();}};
    q('[data-layout-close]').onclick=close;
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
    resetDraft(true);draw();document.body.append(backdrop);document.addEventListener('focusin',keepFocus,true);q('[data-layout-close]').focus();
    return{backdrop,modal,close,getState:()=>({pages,selected,multiple,selectedPages:selectedPages(),order:order.slice(),clay,ratios:{...ratios}})};
  }
  window.TnsDocumentPageLayout=Object.freeze({open,layouts,defaultClay,words,validLayouts,previewCells,applicationAppearance});
})();
