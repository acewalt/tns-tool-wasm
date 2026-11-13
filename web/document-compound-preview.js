(() => {
  'use strict';
  const words = () => ({
    en: { title: 'Document page', note: 'Drag a divider to resize the applications on this page.', save: 'Save layout', saved: 'Layout saved', close: 'Close', unavailable: 'A preview is not available for this application yet.', vertical: 'Resize columns', horizontal: 'Resize rows' },
    es: { title: 'Página del documento', note: 'Arrastra un separador para ajustar las aplicaciones de esta página.', save: 'Guardar distribución', saved: 'Distribución guardada', close: 'Cerrar', unavailable: 'Esta aplicación todavía no tiene previsualizador.', vertical: 'Ajustar columnas', horizontal: 'Ajustar filas' },
    fr: { title: 'Page du document', note: 'Faites glisser une séparation pour redimensionner les applications.', save: 'Enregistrer la disposition', saved: 'Disposition enregistrée', close: 'Fermer', unavailable: 'Aucun aperçu disponible pour cette application.', vertical: 'Redimensionner les colonnes', horizontal: 'Redimensionner les lignes' },
  })[String(document.documentElement.lang || 'en').slice(0, 2)] || { title: 'Document page', note: '', save: 'Save layout', saved: 'Layout saved', close: 'Close', unavailable: 'Preview unavailable.', vertical: 'Resize columns', horizontal: 'Resize rows' };
  const ratio = (value, fallback = 5000) => Math.max(1000, Math.min(9000, Number.isFinite(Number(value)) ? Number(value) : fallback));
  function layoutFor(page, draft = {}) {
    const count = page.previewItems?.length || 0, source = page.detail || {};
    return { count, clay: Number(source.clay || 0), w1: ratio(draft.w1 ?? source.w1), h1: ratio(draft.h1 ?? source.h1) };
  }
  function open(page, options = {}) {
    const t = words(), backdrop = options.createBackdrop?.('modal-backdrop') || document.createElement('div');
    backdrop.classList.add('modal-backdrop');
    backdrop.innerHTML = '<section class="modal widget-preview-modal compound-preview-modal" role="dialog" aria-modal="true"><h2></h2><p class="muted-text"></p><div class="modal-top-actions"><button type="button" data-widget-close></button></div><div class="preview-controls"><button type="button" class="green-tool-button" data-compound-save></button></div><div class="widget-preview-calculator compound-preview-calculator"><div class="compound-preview-chrome"></div><div class="compound-preview-panes"></div></div><div class="modal-actions"><span role="status" data-compound-status></span></div></section>';
    const modal = backdrop.firstElementChild, stage = modal.querySelector('.compound-preview-panes'), controllers = [];
    modal.querySelector('h2').textContent = t.title;
    modal.querySelector('p').textContent = t.note;
    const closeButton = modal.querySelector('[data-widget-close]'); closeButton.textContent = t.close;
    const save = modal.querySelector('[data-compound-save]'); save.textContent = t.save; save.hidden = !options.onSave;
    const status = modal.querySelector('[data-compound-status]');
    const layout = layoutFor(page, options.draft?.layout); let disposed = false;
    let activePane = 0;
    const panes = [];
    function activatePane(index) {
      activePane = index;
      const navigation = window.TnsDocumentPreviewNavigation;
      for (const [paneIndex, pane] of panes.entries()) pane.dataset.active = String(paneIndex === index);
      navigation?.updateChrome(modal.querySelector('.compound-preview-chrome'), { appKind: page.previewItems?.[index]?.previewKind });
    }
    const persist = () => options.setDraft?.({ layout: { ...layout } });
    const refresh = () => { if (!disposed) for (const controller of controllers) { controller.refresh?.(); controller.draw?.(); } };
    const reportChange = values => { options.onVariablesChange?.(values); refresh(); };
    function resizeLayout() {
      stage.style.setProperty('--compound-x', layout.w1 / 100 + '%');
      stage.style.setProperty('--compound-y', layout.h1 / 100 + '%');
      for (const controller of controllers) controller.resize?.();
    }
    stage.dataset.layout = layout.count === 3 && layout.clay === 5 ? 'left-stack' : layout.count === 2 ? 'columns' : 'grid';
    for (const [index, app] of (page.previewItems || []).entries()) {
      const pane = document.createElement('div'); pane.className = 'compound-preview-pane'; pane.dataset.pane = index;
      pane.setAttribute('aria-label', app.previewItem?.detail?.name || app.name); pane.tabIndex = 0; stage.append(pane);
      panes.push(pane);
      const accent = window.TnsDocumentPreviewNavigation?.accentFor(app.previewKind);
      if (accent) pane.style.setProperty('--document-preview-accent', accent);
      pane.onpointerdown = pane.onfocusin = () => activatePane(index);
      const item = app.previewItem || app;
      try {
        if (app.previewKind === 'graphs' && window.TnsGraphPreview) controllers.push(window.TnsGraphPreview.mount(pane, item, { ...options, controls: false, onVariablesChange: reportChange }));
        else if (app.previewKind === 'notes' && window.TiNotepadRichView) controllers.push(window.TiNotepadRichView.mount(pane, item, options));
        else { const text = document.createElement('p'); text.className = 'compound-preview-unavailable'; text.textContent = `${app.name}: ${t.unavailable}`; pane.append(text); }
      } catch (error) { pane.textContent = error.message; pane.classList.add('compound-preview-error'); }
    }
    function splitter(axis) {
      const handle = document.createElement('div'); handle.className = `compound-preview-divider compound-divider-${axis}`;
      handle.tabIndex = 0; handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', axis === 'x' ? 'vertical' : 'horizontal');
      handle.setAttribute('aria-label', axis === 'x' ? t.vertical : t.horizontal);
      const key = axis === 'x' ? 'w1' : 'h1';
      const update = value => { layout[key] = ratio(value); handle.setAttribute('aria-valuenow', String(Math.round(layout[key] / 100))); resizeLayout(); persist(); };
      handle.onpointerdown = event => { if (event.button) return; event.preventDefault(); handle.setPointerCapture(event.pointerId); handle.dataset.dragging = 'true'; };
      handle.onpointermove = event => {
        if (handle.dataset.dragging !== 'true') return;
        const rect = stage.getBoundingClientRect();
        update(axis === 'x' ? (event.clientX - rect.left) / rect.width * 10000 : (event.clientY - rect.top) / rect.height * 10000);
      };
      handle.onpointerup = handle.onpointercancel = () => { delete handle.dataset.dragging; };
      handle.onkeydown = event => {
        const directions = axis === 'x' ? { ArrowLeft: -1, ArrowRight: 1 } : { ArrowUp: -1, ArrowDown: 1 };
        if (directions[event.key]) { event.preventDefault(); update(layout[key] + directions[event.key] * 250); }
      };
      stage.append(handle); update(layout[key]);
    }
    if (layout.count > 1) splitter('x');
    if (layout.count > 2) splitter('y');
    function dispose() {
      if (disposed) return; persist(); disposed = true;
      window.removeEventListener('tns-document-variables-change', onVariablesChange);
      for (const controller of controllers) { controller.dispose?.(); controller.destroy?.(); }
    }
    function onVariablesChange(event) { if (event.detail?.file === page.file) refresh(); }
    window.addEventListener('tns-document-variables-change', onVariablesChange);
    closeButton.onclick = () => { dispose(); if (options.closeBackdrop) options.closeBackdrop(backdrop); else backdrop.remove(); };
    save.onclick = async () => { save.disabled = true; try { await options.onSave({ ...layout }); status.textContent = t.saved; } catch (error) { status.textContent = error.message; } finally { save.disabled = false; } };
    if (!backdrop.isConnected) document.body.append(backdrop);
    options.mountWindow?.(backdrop);
    activatePane(activePane);
    const previousCleanup = backdrop.__previewWindowCleanup;
    backdrop.__previewWindowCleanup = () => { dispose(); previousCleanup?.(); };
    resizeLayout();
    return { backdrop, controllers, layout, dispose, refresh };
  }
  window.TnsCompoundPreview = Object.freeze({ open, layoutFor });
})();
