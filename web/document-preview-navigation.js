(() => {
  'use strict';
  const kinds = ['lua', 'python', 'images', 'sheets', 'notes', 'graphs', 'calculators', 'basic'];
  function groups(items = []) {
    const result = Object.fromEntries(kinds.map(kind => [kind, []]));
    for (const item of items) {
      const kind = item.type === 'Lua Script' ? 'lua'
        : item.content_label === 'Python' ? 'python'
        : item.content_label === 'Image' ? 'images'
        : item.content_label === 'Spreadsheet' ? 'sheets'
        : item.content_label === 'Notepad' ? 'notes'
        : item.content_label === 'Graph' ? 'graphs'
        : item.content_label === 'Scratchpad' ? 'calculators'
        : item.type === 'Widget' && item.name === 'TI.ProgramEditor' ? 'basic' : null;
      if (kind) result[kind].push(item);
    }
    for (const entries of Object.values(result)) {
      entries.sort((a, b) => String(a.file).localeCompare(String(b.file), undefined, { numeric: true })
        || String(a.path).localeCompare(String(b.path), undefined, { numeric: true }));
    }
    return result;
  }
  function windowFor(length, selected = 0, start = null) {
    const count = Math.max(0, Math.trunc(length));
    const index = Math.max(0, Math.min(count - 1, Math.trunc(selected) || 0));
    const first = Math.max(0, Math.min(Math.max(0, count - 3), start === null ? index - 1 : Math.trunc(start) || 0));
    return { selected: index, start: first, indices: Array.from({ length: Math.min(3, count - first) }, (_, i) => first + i), previous: first > 0, next: first + 3 < count };
  }
  function pageLabel(item, index = 0) {
    const page = item?.previewPage || item;
    const problem = /Problem(\d+)\.xml$/i.exec(String(page?.file || '').replaceAll('\\', '/'))?.[1] || '1';
    const card = /\/card(?:\[(\d+)\])?(?:\/|$)/.exec(String(page?.path || ''));
    return `${problem}.${card ? card[1] || '1' : index + 1}`;
  }
  function createTabs({ items = [], selected = 0, onSelect = () => {} } = {}) {
    if (!items.length) return null;
    const tabs = document.createElement('nav');
    tabs.className = 'document-preview-tabs';
    tabs.setAttribute('aria-label', 'Document pages');
    let start = windowFor(items.length, selected).start;
    const render = () => {
      const view = windowFor(items.length, selected, start);
      tabs.replaceChildren();
      const arrow = (label, direction, enabled) => {
        const button = document.createElement('button'); button.type = 'button';
        button.className = 'document-preview-tab-arrow'; button.textContent = direction < 0 ? '◀' : '▶';
        button.setAttribute('aria-label', label); button.disabled = !enabled;
        button.onclick = () => { start = windowFor(items.length, selected, start + direction).start; render(); };
        tabs.append(button);
      };
      arrow('Previous pages', -1, view.previous);
      for (const index of view.indices) {
        const item = items[index], button = document.createElement('button'); button.type = 'button';
        button.className = 'document-preview-tab'; button.textContent = pageLabel(item, index);
        button.title = item?.detail?.name || item?.name || button.textContent;
        button.setAttribute('aria-current', index === selected ? 'page' : 'false');
        button.onclick = () => { if (index !== selected) onSelect(index); };
        tabs.append(button);
      }
      arrow('Next pages', 1, view.next);
    };
    render(); return tabs;
  }
  function updateChrome(host, { title, mode } = {}) {
    const parts = host?.__tnsDocumentPreviewChrome;
    if (!parts) return host;
    if (title !== undefined) {
      parts.title.textContent = String(title || 'documento').replace(/\.tns$/i, '');
      parts.title.title = parts.title.textContent;
    }
    if (mode !== undefined) parts.mode.textContent = String(mode || 'RAD');
    return host;
  }
  function createChrome({ items = [], selected = 0, onSelect = () => {}, title = 'documento', mode = 'RAD', onClose } = {}) {
    const chrome = document.createElement('div'); chrome.className = 'document-preview-chrome';
    const labelWidth = Math.max(3, ...items.map((item, index) => pageLabel(item, index).length));
    const reserve = Math.min(150, Math.max(64, 27 + Math.min(3, items.length) * Math.max(27, labelWidth * 6 + 9)));
    chrome.style.setProperty('--document-preview-title-reserve', `${reserve}px`);
    const pages = document.createElement('div'); pages.className = 'document-preview-chrome-pages';
    const tabs = createTabs({ items, selected, onSelect });
    if (tabs) pages.append(tabs);
    const name = document.createElement('span'); name.className = 'document-preview-chrome-title';
    name.setAttribute('data-preview-document', ''); name.setAttribute('data-document', '');
    const status = document.createElement('div'); status.className = 'document-preview-chrome-status';
    const angle = document.createElement('span'); angle.className = 'document-preview-chrome-mode';
    angle.setAttribute('data-preview-mode', ''); angle.setAttribute('data-mode', '');
    const battery = document.createElement('span'); battery.className = 'document-preview-chrome-battery'; battery.setAttribute('aria-hidden', 'true');
    const close = document.createElement('button'); close.type = 'button'; close.className = 'document-preview-chrome-close'; close.textContent = '×';
    const lang = String(document.documentElement?.lang || 'en').slice(0, 2);
    const closeLabel = ({ es: 'Cerrar preview', fr: 'Fermer l’aperçu', en: 'Close preview' })[lang] || 'Close preview';
    close.setAttribute('aria-label', closeLabel); close.title = closeLabel;
    close.disabled = typeof onClose !== 'function';
    close.onclick = event => { event?.preventDefault?.(); event?.stopPropagation?.(); onClose?.(); };
    status.append(angle, battery, close); chrome.append(pages, name, status);
    chrome.__tnsDocumentPreviewChrome = { title: name, mode: angle, reserve };
    return updateChrome(chrome, { title, mode });
  }
  function mountChrome(host, options = {}) {
    if (!host) return null;
    const chrome = createChrome(options);
    host.classList.add('document-preview-chrome');
    host.replaceChildren(...chrome.childNodes);
    host.__tnsDocumentPreviewChrome = chrome.__tnsDocumentPreviewChrome;
    host.style.setProperty('--document-preview-title-reserve', `${chrome.__tnsDocumentPreviewChrome.reserve}px`);
    return host;
  }
  globalThis.TnsDocumentPreviewNavigation = Object.freeze({ groups, windowFor, pageLabel, createTabs, createChrome, mountChrome, updateChrome });
})();
