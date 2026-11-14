(() => {
  'use strict';
  const words = () => ({
    en: { title: 'Document page', note: 'Drag a divider to resize the applications on this page.', save: 'Save layout', edit: 'Page layout', ungroup: 'Ungroup applications', saved: 'Layout saved', close: 'Close', unavailable: 'A preview is not available for this application yet.', vertical: 'Resize columns', horizontal: 'Resize rows' },
    es: { title: 'Página del documento', note: 'Arrastra un separador para ajustar las aplicaciones de esta página.', save: 'Guardar distribución', edit: 'Diseño de página', ungroup: 'Desagrupar aplicaciones', saved: 'Distribución guardada', close: 'Cerrar', unavailable: 'Esta aplicación todavía no tiene previsualizador.', vertical: 'Ajustar columnas', horizontal: 'Ajustar filas' },
    fr: { title: 'Page du document', note: 'Faites glisser une séparation pour redimensionner les applications.', save: 'Enregistrer la disposition', edit: 'Disposition de page', ungroup: 'Dissocier les applications', saved: 'Disposition enregistrée', close: 'Fermer', unavailable: 'Aucun aperçu disponible pour cette application.', vertical: 'Redimensionner les colonnes', horizontal: 'Redimensionner les lignes' },
  })[String(document.documentElement.lang || 'en').slice(0, 2)] || { title: 'Document page', note: '', save: 'Save layout', saved: 'Layout saved', close: 'Close', unavailable: 'Preview unavailable.', vertical: 'Resize columns', horizontal: 'Resize rows' };
  const ratio = (value, fallback = 5000) => Math.max(1000, Math.min(9000, Number.isFinite(Number(value)) ? Number(value) : fallback));
  const capacities = [1, 2, 2, 3, 3, 3, 3, 4];
  function layoutFor(page, draft = {}) {
    const count = page.previewItems?.length || 0, source = page.detail || {};
    const requested = Number(draft.clay ?? source.clay ?? 0);
    const clay = Number.isInteger(requested) && capacities[requested] >= count ? requested : ({ 0: 0, 1: 0, 2: 1, 3: 3, 4: 7 }[count] ?? 7);
    return { count, clay, w1: ratio(draft.w1 ?? source.w1), h1: ratio(draft.h1 ?? source.h1), w2: ratio(draft.w2 ?? source.w2), h2: ratio(draft.h2 ?? source.h2) };
  }
  // TI layout codes are zero based. App order follows the native XML order;
  // in clay=5, for example, the right-hand app is slot 1 rather than slot 2.
  function layoutGeometry(layout) {
    const x = ratio(layout.w1) / 100, y = ratio(layout.h1) / 100, y2 = ratio(layout.h2) / 100;
    const rect = (left, top, width, height) => ({ left, top, width, height });
    const divider = (axis, start, end, key = axis === 'x' ? 'w1' : 'h1') => ({ axis, start, end, key });
    const layouts = [
      { panes: [rect(0, 0, 100, 100)], dividers: [] },
      { panes: [rect(0, 0, x, 100), rect(x, 0, 100 - x, 100)], dividers: [divider('x', 0, 100)] },
      { panes: [rect(0, 0, 100, y), rect(0, y, 100, 100 - y)], dividers: [divider('y', 0, 100)] },
      { panes: [rect(0, 0, 100, y), rect(0, y, x, 100 - y), rect(x, y, 100 - x, 100 - y)], dividers: [divider('x', y, 100), divider('y', 0, 100)] },
      { panes: [rect(0, 0, x, y), rect(x, 0, 100 - x, y), rect(0, y, 100, 100 - y)], dividers: [divider('x', 0, y), divider('y', 0, 100)] },
      { panes: [rect(0, 0, x, y), rect(x, 0, 100 - x, 100), rect(0, y, x, 100 - y)], dividers: [divider('x', 0, 100), divider('y', 0, x)] },
      { panes: [rect(0, 0, x, 100), rect(x, 0, 100 - x, y2), rect(x, y2, 100 - x, 100 - y2)], dividers: [divider('x', 0, 100), divider('y', x, 100, 'h2')] },
      { panes: [rect(0, 0, x, y), rect(x, 0, 100 - x, y2), rect(0, y, x, 100 - y), rect(x, y2, 100 - x, 100 - y2)], dividers: [divider('x', 0, 100), divider('y', 0, x), divider('y', x, 100, 'h2')] },
    ];
    return layouts[layout.clay] || layouts[0];
  }
  function open(page, options = {}) {
    const t = words(), backdrop = options.createBackdrop?.('modal-backdrop') || document.createElement('div');
    backdrop.classList.add('modal-backdrop');
    backdrop.innerHTML = '<section class="modal widget-preview-modal compound-preview-modal" role="dialog" aria-modal="true"><h2></h2><p class="muted-text"></p><div class="modal-top-actions"><button type="button" data-widget-close></button></div><div class="preview-controls"><button type="button" class="green-tool-button" data-compound-edit></button><button type="button" data-compound-ungroup></button><button type="button" class="green-tool-button" data-compound-save></button></div><div class="widget-preview-calculator compound-preview-calculator"><div class="compound-preview-chrome"></div><div class="compound-preview-panes"></div></div><div class="modal-actions"><span role="status" data-compound-status></span></div></section>';
    const modal = backdrop.firstElementChild, stage = modal.querySelector('.compound-preview-panes'), controllers = [];
    modal.querySelector('h2').textContent = t.title;
    modal.querySelector('p').textContent = t.note;
    const closeButton = modal.querySelector('[data-widget-close]'); closeButton.textContent = t.close;
    const save = modal.querySelector('[data-compound-save]'); save.textContent = t.save; save.hidden = !options.onSave;
    const edit = modal.querySelector('[data-compound-edit]'); edit.textContent = t.edit; edit.hidden = !options.onEditLayout;
    const ungroup = modal.querySelector('[data-compound-ungroup]'); ungroup.textContent = t.ungroup; ungroup.hidden = !options.onUngroup || (page.previewItems?.length || 0) < 2;
    const status = modal.querySelector('[data-compound-status]');
    const layout = layoutFor(page, options.draft?.layout); let disposed = false;
    let activePane = 0;
    const panes = [];
    const splitters = [];
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
      const geometry = layoutGeometry(layout);
      for (const [index, pane] of panes.entries()) {
        const box = geometry.panes[index]; if (!box) continue;
        const leftGap = box.left > 0 ? 1 : 0, topGap = box.top > 0 ? 1 : 0;
        const rightGap = box.left + box.width < 99.999 ? 1 : 0, bottomGap = box.top + box.height < 99.999 ? 1 : 0;
        pane.style.left = `calc(${box.left}% + ${leftGap}px)`;
        pane.style.top = `calc(${box.top}% + ${topGap}px)`;
        pane.style.width = `calc(${box.width}% - ${leftGap + rightGap}px)`;
        pane.style.height = `calc(${box.height}% - ${topGap + bottomGap}px)`;
      }
      for (const [index, handle] of splitters.entries()) {
        const spec = geometry.dividers[index]; if (!spec) continue;
        if (spec.axis === 'x') { handle.style.left = layout[spec.key] / 100 + '%'; handle.style.top = spec.start + '%'; handle.style.bottom = (100 - spec.end) + '%'; }
        else { handle.style.top = layout[spec.key] / 100 + '%'; handle.style.left = spec.start + '%'; handle.style.right = (100 - spec.end) + '%'; }
      }
      for (const controller of controllers) controller.resize?.();
    }
    stage.dataset.layout = ['single', 'columns', 'rows', 'bottom-split', 'top-split', 'left-stack', 'right-stack', 'grid'][layout.clay];
    for (const [index, app] of (page.previewItems || []).entries()) {
      const pane = document.createElement('div'); pane.className = 'compound-preview-pane'; pane.dataset.pane = index;
      pane.dataset.appKind = app.previewKind || 'unsupported';
      pane.setAttribute('aria-label', app.previewItem?.detail?.name || app.name); pane.tabIndex = 0; stage.append(pane);
      panes.push(pane);
      const accent = window.TnsDocumentPreviewNavigation?.accentFor(app.previewKind);
      if (accent) pane.style.setProperty('--document-preview-accent', accent);
      pane.onpointerdown = pane.onfocusin = () => activatePane(index);
      const item = app.previewItem || app;
      try {
        if (app.previewKind === 'graphs' && window.TnsGraphPreview) controllers.push(window.TnsGraphPreview.mount(pane, item, { ...options, controls: false, onVariablesChange: reportChange }));
        else if (app.previewKind === 'notes' && window.TiNotepadRichView) controllers.push(window.TiNotepadRichView.mount(pane, item, options));
        else {
          // The document owner supplies adapters that need staged XML or its
          // shared maths session (for example Lists & Spreadsheet). Keeping
          // this hook synchronous makes controller cleanup deterministic.
          const controller = options.mountApplication?.(pane, app, { ...options, onVariablesChange: reportChange });
          if (controller && typeof controller.then === 'function') throw Error('The embedded app adapter must return its controller synchronously.');
          if (controller) controllers.push(controller);
          else { const text = document.createElement('p'); text.className = 'compound-preview-unavailable'; text.textContent = `${app.name}: ${t.unavailable}`; pane.append(text); }
        }
      } catch (error) { pane.textContent = error.message; pane.classList.add('compound-preview-error'); }
    }
    function splitter(spec) {
      const { axis, key } = spec;
      const handle = document.createElement('div'); handle.className = `compound-preview-divider compound-divider-${axis}`;
      handle.dataset.layoutField = key;
      handle.tabIndex = 0; handle.setAttribute('role', 'separator'); handle.setAttribute('aria-orientation', axis === 'x' ? 'vertical' : 'horizontal');
      handle.setAttribute('aria-label', axis === 'x' ? t.vertical : t.horizontal);
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
      splitters.push(handle);
    }
    for (const spec of layoutGeometry(layout).dividers) splitter(spec);
    function dispose() {
      if (disposed) return;
      for (const controller of controllers) controller.commit?.();
      persist(); disposed = true;
      window.removeEventListener('tns-document-variables-change', onVariablesChange);
      for (const controller of controllers) { controller.dispose?.(); controller.destroy?.(); }
    }
    function onVariablesChange(event) { if (event.detail?.file === page.file) refresh(); }
    window.addEventListener('tns-document-variables-change', onVariablesChange);
    closeButton.onclick = () => { dispose(); if (options.closeBackdrop) options.closeBackdrop(backdrop); else backdrop.remove(); };
    const commitApplications = () => { for (const controller of controllers) controller.commit?.(); };
    save.onclick = async () => { save.disabled = true; try { commitApplications(); await options.onSave({ ...layout }); status.textContent = t.saved; } catch (error) { status.textContent = error.message; } finally { save.disabled = false; } };
    const command = async (button, callback) => { button.disabled = true; try { commitApplications(); await callback(page, { ...layout }); } catch (error) { status.textContent = error.message; } finally { button.disabled = false; } };
    edit.onclick = () => command(edit, options.onEditLayout);
    ungroup.onclick = () => command(ungroup, options.onUngroup);
    // A divider is a layout control; opening its settings must not intercept
    // double-clicks inside a Notes editor or a graph's interactive surface.
    if (options.onEditLayout) for (const handle of splitters) handle.ondblclick = () => command(edit, options.onEditLayout);
    if (!backdrop.isConnected) document.body.append(backdrop);
    options.mountWindow?.(backdrop);
    activatePane(activePane);
    const previousCleanup = backdrop.__previewWindowCleanup;
    backdrop.__previewWindowCleanup = () => { dispose(); previousCleanup?.(); };
    resizeLayout();
    return { backdrop, controllers, layout, dispose, refresh };
  }
  window.TnsCompoundPreview = Object.freeze({ open, layoutFor, layoutGeometry });
})();
