(() => {
  'use strict';
  const labels = {
    es: ['Math view', 'Editar texto', 'Haz clic para editar. Enter crea una línea; Ctrl+Enter termina la edición.', 'Línea'],
    en: ['Math view', 'Edit text', 'Click to edit. Enter adds a line; Ctrl+Enter finishes editing.', 'Line'],
    fr: ['Math view', 'Modifier le texte', 'Cliquez pour modifier. Entrée ajoute une ligne ; Ctrl+Entrée termine la saisie.', 'Ligne']
  };
  function install({ host, editor, replaceRange, isEnabled = () => true, onChange = () => {} }) {
    const surface = document.createElement('section');
    surface.className = 'ti-math-source-view'; surface.hidden = true; host.append(surface);
    let active = false, editing = null, disposed = false, writing = false;
    let knownSource = editor.value, selection = { start: editor.selectionStart || 0, end: editor.selectionEnd || 0 };
    const text = () => labels[String(document.documentElement.lang || 'en').slice(0, 2)] || labels.en;
    const clamp = offset => Math.max(0, Math.min(editor.value.length, Number(offset) || 0));
    function syncSelection(start, end = start) {
      selection = { start: clamp(start), end: clamp(end) };
      if (selection.end < selection.start) [selection.start, selection.end] = [selection.end, selection.start];
      // The source adapter updates Monaco's real caret without moving focus away
      // from the visible Math view textarea.
      editor.setSelectionRange(selection.start, selection.end);
      return { ...selection };
    }
    function captureSelection() {
      if (!active) return { start: editor.selectionStart || 0, end: editor.selectionEnd || 0 };
      if (editing && knownSource === editor.value) {
        syncSelection(editing.start + editing.input.selectionStart, editing.start + editing.input.selectionEnd);
      }
      return { ...selection };
    }
    function apply(source, start, end) {
      writing = true;
      try { replaceRange(String(source), start, end); }
      finally { writing = false; knownSource = editor.value; }
    }
    function flush() {
      if (editing) captureSelection();
      editing = null;
      render();
      return { ...selection };
    }
    function lineAt(position) {
      const value = editor.value, caret = clamp(position), start = caret === 0 ? 0 : value.lastIndexOf('\n', caret - 1) + 1;
      const next = value.indexOf('\n', caret), end = next < 0 ? value.length : next;
      return { start, end, line: value.slice(start, end), number: value.slice(0, start).split('\n').length };
    }
    function editAt(start, end = start) {
      if (!active || !isEnabled() || disposed) return;
      editing = null; render();
      const current = lineAt(start), row = surface.querySelector(`[data-math-line="${current.number}"]`);
      if (!row) return;
      const formula = row.querySelector('.ti-math-source-formula'), input = document.createElement('textarea');
      input.className = 'ti-math-source-input'; input.value = current.line; input.spellcheck = false;
      input.setAttribute('aria-label', `${text()[3]} ${current.number}`); formula.replaceChildren(input); row.classList.add('editing');
      const session = { row, input, start: current.start, length: current.line.length, original: current.line };
      editing = session;
      const resize = () => { input.style.height = 'auto'; input.style.height = Math.max(33, input.scrollHeight) + 'px'; };
      const update = () => {
        if (editing !== session) return;
        const from = input.selectionStart, to = input.selectionEnd;
        apply(input.value, session.start, session.start + session.length);
        session.length = input.value.length; syncSelection(session.start + from, session.start + to); resize(); onChange();
      };
      const remember = () => { if (editing === session) captureSelection(); };
      input.oninput = update; input.onselect = remember; input.onclick = remember; input.onkeyup = remember;
      input.onblur = () => { if (editing === session) flush(); };
      input.onkeydown = event => {
        if (event.key === 'Escape') {
          event.preventDefault(); apply(session.original, session.start, session.start + session.length);
          syncSelection(session.start + session.original.length); editing = null; render(); onChange();
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault(); flush(); surface.querySelector(`[data-math-line="${lineAt(selection.start).number}"]`)?.focus({ preventScroll: true });
        } else if (event.key === 'Enter' || event.key === 'Tab') {
          event.preventDefault(); input.setRangeText(event.key === 'Enter' ? '\n' : '  ', input.selectionStart, input.selectionEnd, 'end'); update();
        }
      };
      input.focus({ preventScroll: true });
      input.setSelectionRange(Math.max(0, Math.min(input.value.length, start - current.start)), Math.max(0, Math.min(input.value.length, end - current.start)));
      remember(); resize();
      row.scrollIntoView({ block: 'nearest' });
    }
    function render() {
      if (!active || editing || disposed || writing) return;
      const scroll = surface.scrollTop; surface.replaceChildren();
      const header = document.createElement('header'); header.className = 'ti-math-source-header';
      const title = document.createElement('strong'); title.textContent = text()[0];
      const hint = document.createElement('small'); hint.textContent = text()[2]; header.append(title, hint); surface.append(header);
      const lines = editor.value.split('\n'); let offset = 0;
      lines.forEach((line, index) => {
        const start = offset, row = document.createElement('div'); row.className = 'ti-math-source-row'; row.tabIndex = 0;
        row.dataset.mathLine = String(index + 1); row.dataset.mathStart = String(start);
        row.setAttribute('aria-label', `${text()[3]} ${index + 1}: ${line}`);
        const gutter = document.createElement('span'); gutter.className = 'ti-math-source-gutter'; gutter.textContent = String(index + 1);
        const formula = document.createElement('div'); formula.className = 'ti-math-source-formula'; formula.innerHTML = window.TnsMathTypeset.renderLine(line);
        row.append(gutter, formula);
        // Start editing on pointerdown, before blur can rebuild this row and
        // discard the click. Rows below a multiline edit need its offset delta.
        row.onpointerdown = event => {
          if (event.target.closest('textarea')) return;
          event.preventDefault();
          const delta = editing && start > editing.start ? editing.length - editing.original.length : 0;
          const caret = start + delta + line.length;
          flush(); editAt(caret);
        };
        row.onclick = event => {
          // Keyboard/assistive activation has no preceding pointerdown.
          if (event.detail === 0 && !event.target.closest('textarea')) { const delta = editing && start > editing.start ? editing.length - editing.original.length : 0; const caret = start + delta + line.length; flush(); editAt(caret); }
        };
        row.onfocus = () => { if (!editing) syncSelection(start + line.length); };
        row.onkeydown = event => {
          if (event.target.closest('textarea')) return;
          if (event.key === 'Enter' || event.key === 'F2') {
            event.preventDefault(); editAt(start + line.length);
            if (event.key === 'Enter') editing.input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); const next = event.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling;
            if (next?.classList.contains('ti-math-source-row')) next.focus();
          }
        };
        surface.append(row); offset += line.length + 1;
      });
      surface.scrollTop = scroll;
    }
    function replaceSelection(value) {
      if (!active || !isEnabled() || disposed) return false;
      const range = captureSelection(); editing = null;
      const insert = String(value); apply(insert, range.start, range.end);
      const caret = range.start + insert.length; syncSelection(caret); render(); editAt(caret); onChange(); return true;
    }
    function resetSelection() {
      editing = null; knownSource = editor.value;
      syncSelection(editor.selectionStart || 0, editor.selectionEnd || 0); render();
      return { ...selection };
    }
    function setActive(value) {
      const next = Boolean(value && isEnabled());
      if (active === next) { if (active) render(); return active; }
      if (editing) flush(); active = next;
      host.classList.toggle('ti-math-source-active', active); surface.hidden = !active;
      if (active) { knownSource = editor.value; syncSelection(editor.selectionStart || 0, editor.selectionEnd || 0); render(); }
      onChange(); return active;
    }
    function refresh() {
      if (disposed || writing) return;
      if (knownSource !== editor.value) {
        // Program switches and source-mode edits are authoritative. Never let
        // a stale line textarea replace text in the newly selected program.
        editing = null; knownSource = editor.value; syncSelection(editor.selectionStart || 0, editor.selectionEnd || 0);
      }
      if (active && !isEnabled()) setActive(false); else render();
    }
    const rememberBeforeBlur = () => { if (active && editing) captureSelection(); };
    document.addEventListener('pointerdown', rememberBeforeBlur, true);
    editor.addEventListener('input', refresh);
    return {
      get active() { return active; }, setActive, refresh, captureSelection, replaceSelection, flush, resetSelection,
      dispose() { disposed = true; editing = null; editor.removeEventListener('input', refresh); document.removeEventListener('pointerdown', rememberBeforeBlur, true); surface.remove(); host.classList.remove('ti-math-source-active'); }
    };
  }
  window.TnsMathEditor = Object.freeze({ install });
})();
