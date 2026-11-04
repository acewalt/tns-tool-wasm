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
    const problem = /Problem(\d+)\.xml$/i.exec(String(item?.file || '').replaceAll('\\', '/'))?.[1] || '1';
    const card = /\/card(?:\[(\d+)\])?(?:\/|$)/.exec(String(item?.path || ''));
    return `${problem}.${card ? card[1] || '1' : index + 1}`;
  }
  function createTabs({ items = [], selected = 0, onSelect = () => {} } = {}) {
    if (items.length < 2) return null;
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
  globalThis.TnsDocumentPreviewNavigation = Object.freeze({ groups, windowFor, pageLabel, createTabs });
})();
