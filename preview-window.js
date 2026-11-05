(() => {
  'use strict';
  const layouts = new WeakMap();
  const labels = () => ({ es: ['Vista expandida','Vista calculadora'], en: ['Expanded view','Calculator view'], fr: ['Vue agrandie','Vue calculatrice'] })[String(document.documentElement.lang || 'en').slice(0,2)] || ['Expanded view','Calculator view'];
  function geometry(modal) { return layouts.get(modal)?.geometry || null; }
  function mount(backdrop, options = {}) {
    const modal = backdrop?.querySelector('.prgm-preview-modal,.love-preview-modal,.lua-preview-modal,.note-page-modal,.spreadsheet-modal,.image-resource-modal,.py-preview-modal,.widget-preview-modal');
    if (!modal || layouts.has(modal)) return layouts.get(modal) || null;
    if (!backdrop.__documentPreviewRestore) {
      const overflow = document.body.style.overflow, focus = document.activeElement;
      backdrop.__documentPreviewRestore = () => {
        document.body.style.overflow = overflow;
        if (focus?.isConnected) focus.focus({ preventScroll: true });
      };
    }
    document.body.style.overflow = 'hidden';
    const prgm = modal.classList.contains('prgm-preview-modal');
    const nativeToggle = modal.querySelector('[data-expand],#love-preview-size-toggle,#image-expand');
    let stage = modal.querySelector('.prgm-preview-screen-shell,#love-preview-stage,.lua-preview-calculator,.note-calculator-shell,.spreadsheet-calc,.document-image-calculator,.widget-preview-calculator');
    let header, body, center, left, right, footer;
    modal.classList.add('preview-window'); backdrop.classList.add('preview-window-backdrop');
    if (prgm) {
      header = modal.querySelector('.prgm-preview-heading'); body = modal.querySelector('.prgm-preview-workspace');
      center = modal.querySelector('.prgm-preview-center'); left = modal.querySelector('.prgm-preview-controls'); right = modal.querySelector('.prgm-preview-inspector');
      footer = modal.querySelector('.prgm-preview-support');
    } else {
      header = modal.querySelector('.image-resource-modal-header,.spreadsheet-modal-header') || document.createElement('header');
      if (!header.parentElement) {
        const heading = document.createElement('div'); heading.className = 'preview-window-heading-text';
        const title = modal.querySelector(':scope > h2'), intro = modal.querySelector(':scope > p.muted-text');
        if (title) heading.append(title); if (intro) heading.append(intro); header.append(heading);
        const actions = modal.querySelector(':scope > .modal-top-actions'); if (actions) header.append(actions);
      }
      body = document.createElement('div'); left = document.createElement('aside'); right = document.createElement('aside'); center = document.createElement('main'); footer = document.createElement('footer');
      body.append(left, center, right);
      if (!stage && modal.classList.contains('py-preview-modal')) {
        stage = document.createElement('div'); stage.className = 'preview-python-screen';
        const chrome = document.createElement('div'); chrome.className = 'love-preview-calculator-bar';
        const nav = modal.querySelector(':scope > .document-preview-tabs');
        window.TnsDocumentPreviewNavigation.mountChrome(chrome, { title: options.documentName || 'documento', onClose: () => backdrop.querySelector('#py-preview-close')?.click() });
        if (nav) chrome.querySelector('.document-preview-chrome-pages').append(nav);
        stage.append(chrome, modal.querySelector('#py-preview-output'));
        const close = modal.querySelector('#py-preview-close'); if (close) { let actions = header.querySelector('.modal-top-actions'); if (!actions) { actions = document.createElement('div');actions.className = 'modal-top-actions';header.append(actions); } actions.append(close); }
      }
      if (!stage) return null;
      center.append(stage);
      const toLeft = ['.preview-controls','.love-graph-editor','.love-calculator-editor','.ti-note-modebar','.document-image-controls'];
      const toRight = ['.ti-note-formatbar','#love-preview-log','#lua-preview-input','#lua-preview-log','.py-preview-terminal-label'];
      for (const selector of toLeft) { const node = modal.querySelector(selector); if (node) left.append(node); }
      for (const selector of toRight) { const node = modal.querySelector(selector); if (node) right.append(node); }
      const leftovers = [...modal.children];
      for (const node of leftovers) {
        if (node === header || node === body || node === stage || node.contains(stage)) continue;
        if (node.matches('.document-preview-tabs')) continue;
        if (node.matches('.modal-actions')) right.append(node);
        else if (node.matches('.image-resource-preview,.spreadsheet-preview-stage')) continue;
        else if (node.matches('input[type=file]')) footer.append(node);
        else footer.append(node);
      }
      modal.replaceChildren(header, body, footer);
    }
    header.classList.add('preview-window-header'); body.classList.add('preview-window-body');
    center.classList.add('preview-window-center'); left.classList.add('preview-window-left'); right.classList.add('preview-window-right'); footer.classList.add('preview-window-footer');
    stage.classList.add('preview-window-stage');
    const actions = header.querySelector('.modal-top-actions,.prgm-preview-top,.image-resource-top-actions,.spreadsheet-header-actions') || header.appendChild(Object.assign(document.createElement('div'),{className:'modal-top-actions'}));
    actions.classList.add('preview-window-header-actions');
    let toggle = nativeToggle;
    if (!toggle) { toggle = document.createElement('button'); toggle.type='button';toggle.className='green-tool-button';actions.prepend(toggle); }
    toggle.setAttribute('data-preview-window-expand', '');
    if (!header.querySelector('.document-preview-expanded-tabs') && options.pageNavigation) {
      const tabs = window.TnsDocumentPreviewNavigation.createTabs(options.pageNavigation);
      if (tabs) { tabs.classList.add('document-preview-expanded-tabs'); actions.prepend(tabs); }
    }
    let expanded = Boolean(options.expanded || modal.matches('.expanded,.document-preview-expanded,.document-image-expanded'));
    const state = { modal, stage, geometry: null, refresh, dispose };
    layouts.set(modal, state);
    function refresh() {
      if (!modal.isConnected) return;
      if (nativeToggle) expanded = modal.matches('.expanded,.document-preview-expanded,.document-image-expanded');
      modal.classList.toggle('preview-window-expanded', expanded); backdrop.dataset.previewExpanded = String(expanded);
      options.setExpanded?.(expanded);
      toggle.setAttribute('aria-pressed',String(expanded)); if (!nativeToggle) toggle.textContent=labels()[expanded ? 1 : 0];
      const availableWidth = Math.max(1, center.clientWidth);
      const width = expanded ? Math.max(1,Math.min(800,availableWidth,Math.max(160,body.clientHeight-22)*4/3)) : Math.min(320,availableWidth);
      const height = expanded ? width*3/4 : 240;
      const next = { width: Math.round(width), height: Math.round(height), expanded };
      const changed = !state.geometry || Object.keys(next).some(key=>next[key]!==state.geometry[key]);
      state.geometry=next;
      modal.style.setProperty('--preview-display-width',next.width+'px');modal.style.setProperty('--preview-display-height',next.height+'px');
      if (changed) { options.onResize?.(next);backdrop.dispatchEvent(new CustomEvent('tns-preview-window-resize',{detail:next})); }
    }
    if (!nativeToggle) toggle.addEventListener('click',()=>{expanded=!expanded;refresh();});
    const observer = new ResizeObserver(refresh); observer.observe(body); observer.observe(center);
    const mutation = new MutationObserver(() => { const next=modal.matches('.expanded,.document-preview-expanded,.document-image-expanded');if(nativeToggle && next!==expanded) refresh(); });
    mutation.observe(modal,{attributes:true,attributeFilter:['class']});
    function dispose() {observer.disconnect();mutation.disconnect();layouts.delete(modal);}
    const previousCleanup=backdrop.__previewWindowCleanup;previousCleanup?.();backdrop.__previewWindowCleanup=dispose;
    window.TnsLovePreviewSideControls?.enhanceModal?.(modal);
    refresh(); requestAnimationFrame(refresh);
    return state;
  }
  window.TnsPreviewWindow = Object.freeze({mount,geometry});
})();
