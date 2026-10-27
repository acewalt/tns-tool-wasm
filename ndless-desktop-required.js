(() => {
  'use strict';
  const copy={
    es:{tag:'Proyectos Ndless',title:'Continúa en la versión de escritorio',
      body:'Para crear y abrir proyectos Ndless se requiere TNS Tool Portable. La versión web tiene limitaciones del navegador y no incluye el entorno completo de compilación ARM.',
      steps:['Descarga TNS Tool Portable para Windows.','Extrae todo el ZIP en una carpeta.','Abre TNS Tool Portable.exe y continúa con tu proyecto.'],
      download:'Ver descargas en GitHub',close:'Cerrar',note:'Abre la compilación más reciente y descarga TNS-Tool-Portable-Windows-x64. GitHub puede solicitar que inicies sesión.',badge:'Requiere la versión de escritorio'},
    en:{tag:'Ndless projects',title:'Continue in the desktop version',
      body:'Creating and opening Ndless projects requires TNS Tool Portable. The web version has browser limitations and does not include the full ARM build environment.',
      steps:['Download TNS Tool Portable for Windows.','Extract the entire ZIP into a folder.','Open TNS Tool Portable.exe and continue with your project.'],
      download:'View downloads on GitHub',close:'Close',note:'Open the latest build and download TNS-Tool-Portable-Windows-x64. GitHub may ask you to sign in.',badge:'Requires the desktop version'},
    fr:{tag:'Projets Ndless',title:'Continuez dans la version de bureau',
      body:'La création et l’ouverture de projets Ndless nécessitent TNS Tool Portable. La version web est limitée par le navigateur et ne contient pas l’environnement complet de compilation ARM.',
      steps:['Téléchargez TNS Tool Portable pour Windows.','Extrayez tout le ZIP dans un dossier.','Ouvrez TNS Tool Portable.exe et poursuivez votre projet.'],
      download:'Voir les téléchargements sur GitHub',close:'Fermer',note:'Ouvrez la compilation la plus récente et téléchargez TNS-Tool-Portable-Windows-x64. GitHub peut demander une connexion.',badge:'Version de bureau requise'}
  };
  const download='https://github.com/acewalt/tns-tool-wasm/actions/workflows/desktop-portable-windows.yml?query=branch%3Afeature%2Fdesktop-portable-ndless';
  const desktop=()=>Boolean(window.TnsDesktop);
  let overlay=null,previousFocus=null;
  const text=()=>copy[String(document.documentElement.lang||'es').slice(0,2)]||copy.es;
  function close(){
    overlay?.remove();overlay=null;
    document.documentElement.classList.remove('ndless-desktop-required-lock');
    previousFocus?.focus?.();
  }
  function open(){
    if(desktop())return false;
    if(overlay){overlay.querySelector('[data-desktop-download]').focus();return true;}
    previousFocus=document.activeElement;
    const t=text();
    overlay=document.createElement('div');overlay.className='ndless-desktop-required-overlay';
    const card=document.createElement('section');card.className='ndless-desktop-required-card';
    card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
    card.setAttribute('aria-labelledby','ndless-desktop-required-title');
    card.setAttribute('aria-describedby','ndless-desktop-required-body');
    const head=document.createElement('header');head.className='ndless-desktop-required-head';
    const tag=document.createElement('span');tag.className='ndless-desktop-required-tag';tag.textContent=t.tag;
    const icon=document.createElement('img');icon.src='./icon/tns_icon.png';icon.alt='';icon.width=48;icon.height=48;
    head.append(tag,icon);
    const title=document.createElement('h2');title.id='ndless-desktop-required-title';title.textContent=t.title;
    const body=document.createElement('p');body.id='ndless-desktop-required-body';body.textContent=t.body;
    const steps=document.createElement('ol');
    for(const value of t.steps){const item=document.createElement('li');item.textContent=value;steps.append(item);}
    const note=document.createElement('p');note.className='ndless-desktop-required-note';note.textContent=t.note;
    const actions=document.createElement('div');actions.className='ndless-desktop-required-actions';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent=t.close;cancel.addEventListener('click',close);
    const link=document.createElement('a');link.href=download;link.target='_blank';link.rel='noopener noreferrer';link.textContent=t.download;
    link.dataset.desktopDownload='true';
    actions.append(cancel,link);card.append(head,title,body,steps,note,actions);overlay.append(card);
    overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
    document.body.append(overlay);document.documentElement.classList.add('ndless-desktop-required-lock');link.focus();
    return true;
  }
  function isProjectAction(target){
    const action=target?.closest?.('#xml-new-ndless-project,label[data-ndless-project-action]');
    return action && (action.id==='xml-new-ndless-project'||action.querySelector('input[accept=".zip"]'));
  }
  window.addEventListener('click',event=>{
    if(desktop()||!isProjectAction(event.target))return;
    event.preventDefault();event.stopImmediatePropagation();open();
  },true);
  window.addEventListener('change',event=>{
    if(desktop()||!isProjectAction(event.target))return;
    event.preventDefault();event.stopImmediatePropagation();event.target.value='';open();
  },true);
  window.addEventListener('keydown',event=>{
    if(!overlay)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();}
    else if(event.key==='Tab'){
      const buttons=[...overlay.querySelectorAll('button,a[href]')],first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  },true);
  function enableNoticeButton(){
    if(desktop())return;
    const button=document.getElementById('xml-new-ndless-project');
    if(!button)return;
    if(button.disabled)button.disabled=false;
    if(button.title!==text().badge)button.title=text().badge;
    const badge=button.querySelector('.ndless-project-off-badge');
    if(badge&&badge.textContent!=='PC'){badge.textContent='PC';badge.setAttribute('aria-label',text().badge);}
  }
  new MutationObserver(enableNoticeButton).observe(document.body,{childList:true,subtree:true});
  enableNoticeButton();
  window.TnsNdlessDesktopRequired=Object.freeze({open,close});
})();
