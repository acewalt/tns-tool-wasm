export const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={select:'m4 3 14 9-7 1-3 7Z',pan:'M8 11V5a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v9q0 6-6 6H11q-3 0-5-4l-4-6q1-3 4-1Z',fit:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',layout:'M3 3h7v5H3Zm11 13h7v5h-7ZM3 16h7v5H3Zm11-13h7v5h-7ZM6 8v8m12-8v8',group:'M4 8V4h4m8 0h4v4M4 16v4h4m8 0h4v-4M8 8h8v8H8Z',align:'M4 3v18m3-14h13v4H7Zm0 8h8v4H7Z',lock:'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5Z',view:'M2 12q10-14 20 0-10 14-20 0Zm7 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',help:'M9 8a3 3 0 1 1 5 2q-2 1-2 4m0 3v1M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20',add:'M12 4v16M4 12h16',delete:'M5 6h14M9 6V3h6v3M7 6v15h10V6m-6 4v7m3-7v7',duplicate:'M8 8h13v13H8ZM3 16V3h13',undo:'m8 3-5 5 5 5M3 8h11a7 7 0 0 1 0 14',redo:'m16 3 5 5-5 5m5-5H10a7 7 0 0 0 0 14',play:'m6 3 15 9-15 9Z',save:'M3 3h16l2 2v16H3Zm4 0v7h10V3M7 21v-8h10v8',code:'m8 5-6 7 6 7m8-14 6 7-6 7m-3-16-2 18',nav:'M3 3h6v5H3Zm12 13h6v5h-6ZM3 16h6v5H3Zm3-8v5h12v3m-12-3v3',logic:'M3 4h6v6H3Zm12 10h6v6h-6ZM9 7h9v7',file:'M4 2h10l6 6v14H4Zm10 0v7h6',search:'M10 3a7 7 0 1 0 0 14 7 7 0 1 0 0-14m5 12 6 6',close:'m5 5 14 14M19 5 5 19',chevron:'m8 5 7 7-7 7',capture:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M12 7a5 5 0 1 0 0 10 5 5 0 1 0 0-10'};
Object.assign(paths,{
 application:'M12 2 3 7v10l9 5 9-5V7Zm-9 5 9 5 9-5M12 12v10',page:'M3 4h18v16H3Zm0 5h18',
 Button:'M4 6h16v12H4Zm5 6h6',Input:'M4 6h16v12H4Zm5 2v8m-2-8h4m-4 8h4',Label:'M4 5h16m-8 0v15m-4 0h8',Panel:'M3 4h18v16H3Zm0 5h18',
 event:'m13 2-9 12h7l-1 8 10-13h-8Z',timer:'M9 2h6m-3 0v4m-2 5 2 3 3-4M12 6a8 8 0 1 0 0 16 8 8 0 0 0 0-16',
 variable:'M5 5q7-5 14 0v14q-7 5-14 0Zm0 0q7 5 14 0M5 11q7 5 14 0',function:'M9 3q-4 2-4 6v6q0 4 4 6m6-18q4 2 4 6v6q0 4-4 6',
 star:'m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z',warning:'m12 3 10 18H2Zm0 6v5m0 3v1',check:'m4 12 5 5L20 6',
 expand:'m5 8 7-5 7 5M5 16l7 5 7-5',collapse:'m5 3 7 5 7-5M5 21l7-5 7 5',edit:'m4 16 12-12 4 4L8 20H4Zm9-9 4 4',
 component:'M4 4h16v16H4Z',flow:'M4 4h6v6H4Zm10 10h6v6h-6ZM10 7h7v7',resource:'M3 5h18v15H3Zm0 12 6-6 4 4 3-3 5 5'
});
export function icon(name){return `<svg data-icon="${escapeHtml(name)}" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.component}"/></svg>`;}
export function iconButton(name,title,attrs=''){return `<button class="lvb-icon-button" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}" ${attrs}>${icon(name)}</button>`;}
// Move existing controls into compact groups rather than replacing their handlers.
export function compactToolbar(bar,{tools={},menus={},lang='en'}={}){
 if(!bar)return;
 for(const [selector,kind]of Object.entries(tools)){const b=bar.querySelector(selector);if(b){const title=b.title||b.textContent.trim();b.title=title;b.setAttribute('aria-label',title);b.classList.add('lvb-icon-button');b.innerHTML=icon(kind);}}
 for(const [label,selectors]of Object.entries(menus)){const details=document.createElement('details');details.className='lvb-tool-menu';const kind=/[Aa]lign|[Aa]line|[Aa]lignement/.test(label)?'align':/[Gg]roup|[Gg]rup/.test(label)?'group':/[Ll]ayout|[Dd]istrib|[Dd]ispos/.test(label)?'layout':'select';details.innerHTML='<summary title="'+escapeHtml(label)+'" aria-label="'+escapeHtml(label)+'">'+icon(kind)+'</summary><div></div>';for(const sel of selectors)bar.querySelectorAll(sel).forEach(el=>details.lastElementChild.append(el));if(details.lastElementChild.children.length)bar.append(details);}
 const help=bar.querySelector('[data-graph-hint]');if(help){const value=help.textContent;help.remove();const b=document.createElement('button');b.className='lvb-icon-button';b.title=value;b.setAttribute('aria-label',value);b.innerHTML=icon('help');b.onclick=()=>{const note=document.createElement('div');note.className='lvb-context-help';note.textContent=value;bar.append(note);setTimeout(()=>note.remove(),6000);};bar.append(b);}
}

// Capture pan gestures before node controls consume them; selection remains the default.
export function graphPointerTools(bar,viewport,onPan,lang='en'){
 const t=(en,es,fr)=>lang==='es'?es:lang==='fr'?fr:en;let mode='select';
 const group=document.createElement('div');group.className='lvb-pointer-tools';
 group.innerHTML=iconButton('select',t('Select','Seleccionar','Sélectionner'),'data-pointer-mode="select" aria-pressed="true"')+iconButton('pan',t('Pan · Middle mouse also works','Desplazar · También con botón central','Déplacer · Bouton central également'),'data-pointer-mode="pan" aria-pressed="false"');bar.prepend(group);
 group.querySelectorAll('button').forEach(b=>b.onclick=()=>{mode=b.dataset.pointerMode;viewport.dataset.pointerMode=mode;group.querySelectorAll('button').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));});
 viewport.addEventListener('pointerdown',e=>{if(mode!=='pan'||e.button!==0||e.target.closest('.lvb-minimap-box,canvas.lvb-minimap,canvas.lvb-nav-minimap'))return;e.preventDefault();e.stopImmediatePropagation();viewport.focus();viewport.setPointerCapture(e.pointerId);onPan(e);},true);
}

export function resizableMinimap(canvas){const box=document.createElement('div');box.className='lvb-minimap-box';canvas.before(box);box.append(canvas);box.onpointerdown=e=>e.stopPropagation();return box;}

export function confirmAction(message,lang='en'){
 return new Promise(resolve=>{const overlay=document.createElement('div');overlay.className='modal-backdrop lvb-form-backdrop';overlay.style.zIndex=String(Math.max(10050,...[...document.querySelectorAll('.modal-backdrop')].map(e=>parseInt(getComputedStyle(e).zIndex)||0))+2);const box=document.createElement('section');box.className='lvb-form';box.setAttribute('role','alertdialog');box.innerHTML='<h3></h3><div class="lvb-inline"><button data-cancel></button><button data-confirm class="primary"></button></div>';box.querySelector('h3').textContent=message;box.querySelector('[data-cancel]').textContent=lang==='es'?'Cancelar':lang==='fr'?'Annuler':'Cancel';box.querySelector('[data-confirm]').textContent=lang==='es'?'Confirmar':lang==='fr'?'Confirmer':'Confirm';const finish=v=>{overlay.remove();resolve(v);};box.querySelector('[data-cancel]').onclick=()=>finish(false);box.querySelector('[data-confirm]').onclick=()=>finish(true);box.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape')finish(false);};overlay.append(box);document.body.append(overlay);box.querySelector('[data-cancel]').focus();});
}
