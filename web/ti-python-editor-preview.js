(() => {
  'use strict';
  const WORDS = {
    en: { editor: 'Python Editor', shell: 'Python Shell', editorNote: 'TI.PythonEditor · edit Python source, check syntax and run in Python Shell.', shellNote: 'Python execution · standard output and interactive input.', close: 'Close', syntax: 'Check syntax', run: 'Run in Python Shell', restart: 'Restart', save: 'Save', saved: 'Saved', edit: 'Open editor PY', ready: 'Ready', changed: 'Unsaved changes', checking: 'Checking syntax…', saving: 'Saving…', running: 'Running…', waiting: 'Waiting for input', finished: 'Finished', failed: 'Execution failed', errors: 'Errors', warnings: 'Warnings', line: 'Line', diagnostics: 'Syntax results', noIssues: 'No errors or warnings.', source: 'Editable Python source', input: 'Python program input', send: 'Send input', hint: 'Ctrl+B: check syntax · Ctrl+R: run in Python Shell. Tab inserts four spaces.', shellHint: 'Enter sends input requested by the program. Restart runs the script again with new input.' },
    es: { editor: 'Editor Python', shell: 'Shell de Python', editorNote: 'TI.PythonEditor · edita el código Python, verifica la sintaxis y ejecuta en la shell.', shellNote: 'Ejecución Python · salida estándar y entrada interactiva.', close: 'Cerrar', syntax: 'Verificar sintaxis', run: 'Ejecutar en shell Python', restart: 'Reiniciar', save: 'Guardar', saved: 'Guardado', edit: 'Abrir editor PY', ready: 'Listo', changed: 'Cambios sin guardar', checking: 'Verificando sintaxis…', saving: 'Guardando…', running: 'Ejecutando…', waiting: 'Esperando entrada', finished: 'Finalizado', failed: 'Error de ejecución', errors: 'Errores', warnings: 'Advertencias', line: 'Línea', diagnostics: 'Resultado de sintaxis', noIssues: 'Sin errores ni advertencias.', source: 'Código Python editable', input: 'Entrada del programa Python', send: 'Enviar entrada', hint: 'Ctrl+B: verificar sintaxis · Ctrl+R: ejecutar en shell Python. Tab inserta cuatro espacios.', shellHint: 'Enter envía la entrada solicitada por el programa. Reiniciar ejecuta el script con nuevas entradas.' },
    fr: { editor: 'Éditeur Python', shell: 'Shell Python', editorNote: 'TI.PythonEditor · modifiez le code Python, vérifiez la syntaxe puis exécutez dans le shell.', shellNote: 'Exécution Python · sortie standard et saisie interactive.', close: 'Fermer', syntax: 'Vérifier la syntaxe', run: 'Exécuter dans le shell', restart: 'Redémarrer', save: 'Enregistrer', saved: 'Enregistré', edit: 'Ouvrir l’éditeur PY', ready: 'Prêt', changed: 'Modifications non enregistrées', checking: 'Vérification de la syntaxe…', saving: 'Enregistrement…', running: 'Exécution…', waiting: 'En attente de saisie', finished: 'Terminé', failed: 'Échec de l’exécution', errors: 'Erreurs', warnings: 'Avertissements', line: 'Ligne', diagnostics: 'Résultat de syntaxe', noIssues: 'Aucune erreur ni aucun avertissement.', source: 'Code Python modifiable', input: 'Saisie du programme Python', send: 'Envoyer la saisie', hint: 'Ctrl+B : vérifier la syntaxe · Ctrl+R : exécuter dans le shell. Tab insère quatre espaces.', shellHint: 'Entrée envoie la saisie demandée par le programme. Redémarrer relance le script avec de nouvelles saisies.' },
  };
  const esc = text => String(text ?? '').replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[value]));
  let active = null;

  // Preserve Python strings (including multiline and prefixed literals) as a
  // token. Color markup never changes the underlying editable source.
  function highlightSource(value) {
    const text = String(value ?? ''); let at = 0, markup = '';
    const token = (kind, source) => `<span class="ti-py-${kind}">${esc(source)}</span>`;
    while (at < text.length) {
      const rest = text.slice(at);
      if (rest[0] === '#') { const end = text.indexOf('\n', at), stop = end < 0 ? text.length : end; markup += token('comment', text.slice(at, stop)); at = stop; continue; }
      const stringStart = /^(?:[rbu]|br|rb|fr|rf|f)?('''|"""|'|")/i.exec(rest);
      if (stringStart) {
        const delimiter = stringStart[1], start = at; at += stringStart[0].length;
        while (at < text.length) {
          if (text[at] === '\\') { at = Math.min(text.length, at + 2); continue; }
          if (text.startsWith(delimiter, at)) { at += delimiter.length; break; }
          if (delimiter.length === 1 && text[at] === '\n') break;
          at++;
        }
        markup += token('string', text.slice(start, at)); continue;
      }
      const word = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(rest);
      if (word) { markup += token('plain', word[0]); at += word[0].length; continue; }
      const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[jJ]?/.exec(rest);
      if (number) { markup += token('plain', number[0]); at += number[0].length; continue; }
      markup += /[=+\-*/%<>!&|^~:@]/.test(rest[0]) ? token('operator', rest[0]) : esc(rest[0]); at++;
    }
    return markup || '\u200b';
  }
  function lineCounter(value, caret = 0) {
    const source = String(value ?? '');
    return { current: source.slice(0, Math.max(0, Math.min(source.length, caret))).split('\n').length, total: source.split('\n').length };
  }
  function scriptName(initial = {}) {
    const name = String(initial.name || initial.filename || 'script.py').split(/[\\/]/).pop() || 'script.py';
    return /\.py$/i.test(name) ? name : name + '.py';
  }
  function shellText(initial, result) {
    const filename = scriptName(initial), moduleName = filename.replace(/\.py$/i, '');
    let text = `>>>#Running ${filename}\n>>>from ${moduleName} import *\n`;
    if (!result) return text;
    text += result.stdout || '';
    if (result.stderr) text += (text.endsWith('\n') ? '' : '\n') + result.stderr;
    if (result.error && !result.waitingForInput) text += (text.endsWith('\n') ? '' : '\n') + (result.error.traceback || `${result.error.type || 'Error'}: ${result.error.message || ''}`);
    if (!result.waitingForInput && !text.endsWith('\n')) text += '\n';
    return text;
  }
  function inputText(inputs) { return inputs.length ? inputs.join('\n') + '\n' : ''; }

  function open(mode, initial = {}, options = {}) {
    if (!options.embedded) active?.close();
    const language = String(document.documentElement.lang || 'en').slice(0, 2), t = WORDS[language] || WORDS.en;
    const isEditor = mode === 'editor', overlay = options.createBackdrop?.('modal-backdrop ti-python-preview-backdrop') || document.createElement('div');
    overlay.classList.add('modal-backdrop', 'ti-python-preview-backdrop');
    const focus = document.activeElement, overflow = document.body.style.overflow;
    if (!options.embedded && !overlay.__documentPreviewRestore) overlay.__documentPreviewRestore = () => { document.body.style.overflow = overflow; if (focus?.isConnected) focus.focus({ preventScroll: true }); };
    if (!options.embedded) document.body.style.overflow = 'hidden';
    overlay.innerHTML = `<section class="modal widget-preview-modal ti-python-preview-modal ti-python-${mode}-modal" role="dialog" aria-modal="true" aria-labelledby="ti-py-title" tabindex="-1">
      <div class="modal-top-actions"><button type="button" data-ti-py-close></button></div><h2 id="ti-py-title"></h2><p class="muted-text" data-ti-py-note></p>
      <div class="preview-controls ti-python-controls">${isEditor ? '<button type="button" class="green-tool-button" data-ti-py-syntax></button><button type="button" class="green-tool-button" data-ti-py-run></button><button type="button" data-ti-py-save></button>' : '<button type="button" class="green-tool-button" data-ti-py-restart></button><button type="button" data-ti-py-send></button><button type="button" data-ti-py-edit></button>'}</div>
      <div class="widget-preview-calculator ti-python-calculator"><div class="ti-python-chrome"></div><div class="ti-python-namebar"><img src="./icon/python.png" alt=""><span data-ti-py-name></span><span data-ti-py-counter></span></div>${isEditor ? '<div class="ti-python-source-scroll" data-ti-py-scroll><div class="ti-python-source-host"><pre data-ti-py-highlight aria-hidden="true"></pre><textarea data-ti-py-source wrap="off" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea></div></div>' : '<div class="ti-python-shell-scroll" data-ti-py-scroll><pre data-ti-py-output></pre><form class="ti-python-input-row" data-ti-py-form><span data-ti-py-prompt>&gt;&gt;&gt;</span><input type="text" data-ti-py-input spellcheck="false" autocomplete="off" autocapitalize="off"></form></div>'}</div>
      <div class="modal-actions ti-python-report"><strong data-ti-py-results-title></strong><p data-ti-py-status role="status" aria-live="polite"></p><div data-ti-py-diagnostics></div></div><p class="ti-python-hint" data-ti-py-hint></p>
    </section>`;
    const $ = selector => overlay.querySelector(selector), modal = $('.ti-python-preview-modal'), scroll = $('[data-ti-py-scroll]'), source = $('[data-ti-py-source]'), input = $('[data-ti-py-input]');
    const initialSource = String(initial.source ?? ''), draft = options.draft?.source === initialSource ? options.draft : null;
    let closed = false, busy = false, dirty = false, expanded = Boolean(options.expanded), baseSource = initialSource, report = null;
    let entries = Array.isArray(draft?.entries) ? draft.entries.map(entry => ({ ...entry, inputs: [...(entry.inputs || [])] })) : [];
    let result = entries.at(-1)?.result || null;
    if (source) { source.value = String(draft?.source ?? initialSource); source.setAttribute('aria-label', t.source); }
    if (input) { input.value = String(draft?.input || ''); input.setAttribute('aria-label', t.input); }
    for (const [selector, label] of Object.entries({ '#ti-py-title': isEditor ? t.editor : t.shell, '[data-ti-py-close]': t.close, '[data-ti-py-note]': isEditor ? t.editorNote : t.shellNote, '[data-ti-py-syntax]': t.syntax, '[data-ti-py-run]': t.run, '[data-ti-py-save]': t.save, '[data-ti-py-restart]': t.restart, '[data-ti-py-send]': t.send, '[data-ti-py-edit]': t.edit, '[data-ti-py-results-title]': isEditor ? t.diagnostics : t.shell, '[data-ti-py-hint]': isEditor ? t.hint : t.shellHint })) if ($(selector)) $(selector).textContent = label;
    if (!isEditor) $('[data-ti-py-edit]').hidden = typeof options.onEdit !== 'function';

    function getSource() { return source ? source.value : initialSource; }
    function saveDraft() { if (closed) return; options.setDraft?.({ source: getSource(), selectionStart: source?.selectionStart || 0, selectionEnd: source?.selectionEnd || 0, scrollTop: scroll.scrollTop, entries: entries.map(entry => ({ ...entry, inputs: [...entry.inputs] })), input: input?.value || '' }); }
    function renderHeader() {
      if (closed) return;
      $('[data-ti-py-name]').textContent = isEditor ? `${dirty ? '* ' : ''}${scriptName(initial)}` : t.shell;
      const count = isEditor ? lineCounter(source.value, source.selectionStart) : lineCounter($('[data-ti-py-output]').textContent, $('[data-ti-py-output]').textContent.length);
      $('[data-ti-py-counter]').textContent = `${count.current}/${count.total}`;
      window.TnsDocumentPreviewNavigation?.updateChrome($('.ti-python-chrome'), { title: options.documentName || initial.documentName || 'documento' });
    }
    function renderSource() {
      if (closed || !source) return;
      $('[data-ti-py-highlight]').innerHTML = highlightSource(source.value);
      $('.ti-python-source-host').style.height = `${Math.max(1, source.value.split('\n').length) * 22 + 12}px`;
      $('[data-ti-py-highlight]').scrollLeft = source.scrollLeft; renderHeader();
    }
    function showError(error) { if (closed) return; $('[data-ti-py-status]').textContent = error?.message || String(error); $('[data-ti-py-status]').classList.add('ti-py-status-error'); }
    function sourceChanged() {
      if (closed) return; dirty = source.value !== baseSource; report = null;
      $('[data-ti-py-diagnostics]').replaceChildren(); $('[data-ti-py-status]').classList.remove('ti-py-status-error'); $('[data-ti-py-status]').textContent = dirty ? t.changed : t.ready;
      renderSource(); saveDraft();
      try { const pending = options.onChange?.(source.value); pending?.catch?.(showError); } catch (error) { showError(error); }
    }
    function revealLine(line) {
      const rows = source.value.split('\n'), index = Math.max(0, Math.min(rows.length - 1, Number(line) - 1)), start = rows.slice(0, index).reduce((n, row) => n + row.length + 1, 0);
      source.setSelectionRange(start, start + rows[index].length); scroll.scrollTop = Math.max(0, index * 22 - 22); source.focus({ preventScroll: true }); renderHeader(); saveDraft();
    }
    function renderReport(value) {
      report = value || {}; $('[data-ti-py-diagnostics]').replaceChildren();
      for (const issue of report.diagnostics || []) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'ti-py-diagnostic'; button.dataset.severity = String(issue.level || issue.severity || 'INFO').toUpperCase();
        button.textContent = [issue.line ? `${t.line} ${issue.line}` : '', issue.message || ''].filter(Boolean).join(' · '); button.disabled = !issue.line; button.onclick = () => revealLine(issue.line); $('[data-ti-py-diagnostics]').append(button);
      }
      $('[data-ti-py-status]').textContent = report.errors || report.warnings ? `${t.errors}: ${report.errors || 0} · ${t.warnings}: ${report.warnings || 0}` : t.noIssues;
      $('[data-ti-py-status]').classList.toggle('ti-py-status-error', Number(report.errors || 0) > 0);
    }
    function setBusy(value) {
      busy = value;
      for (const button of modal.querySelectorAll('.ti-python-controls button')) button.disabled = value;
      for (const tabs of modal.querySelectorAll('.document-preview-tabs')) tabs.inert = value;
      if (source) source.readOnly = value;
      if (input) { input.disabled = value; $('[data-ti-py-send]').disabled = value; }
    }
    async function editorAction(kind) {
      if (closed || busy) return;
      const callback = kind === 'syntax' ? options.onSyntax : kind === 'save' ? options.onSave : options.onRun;
      if (typeof callback !== 'function') return;
      const text = source.value; saveDraft();
      if (kind === 'run') { if (!options.embedded) close({ switching: typeof options.createBackdrop === 'function' }); return callback({ ...initial, source: text, name: scriptName(initial) }, { expanded }); }
      setBusy(true); $('[data-ti-py-status]').textContent = kind === 'syntax' ? t.checking : t.saving;
      try {
        const value = await callback(text); if (closed) return value;
        if (kind === 'syntax') renderReport(value); else { baseSource = text; dirty = source.value !== baseSource; $('[data-ti-py-status]').textContent = dirty ? t.changed : t.saved; renderHeader(); }
        return value;
      } catch (error) { showError(error); } finally { if (!closed) setBusy(false); }
    }
    function renderShell() {
      if (closed) return;
      let transcript = entries.map(entry => {
        if (entry.kind === 'script') return shellText(initial, entry.result);
        let text = `>>>${entry.command}\n` + (entry.result?.stdout || '') + (entry.result?.stderr || '');
        if (entry.result?.error && !entry.result.waitingForInput) text += (text.endsWith('\n') ? '' : '\n') + (entry.result.error.traceback || `${entry.result.error.type || 'Error'}: ${entry.result.error.message || ''}`);
        return entry.result?.waitingForInput || text.endsWith('\n') ? text : text + '\n';
      }).join('');
      const prompt = result?.waitingForInput ? String(result.inputPrompt || '') : '>>>';
      if (result?.waitingForInput && prompt && transcript.endsWith(prompt)) transcript = transcript.slice(0, -prompt.length);
      $('[data-ti-py-output]').textContent = transcript;
      $('[data-ti-py-prompt]').textContent = prompt;
      $('[data-ti-py-status]').textContent = busy ? t.running : !result ? t.ready : result.waitingForInput ? t.waiting : result.success ? t.finished : t.failed;
      $('[data-ti-py-status]').classList.toggle('ti-py-status-error', Boolean(result?.error && !result.waitingForInput)); renderHeader(); saveDraft();
      scroll.scrollTop = scroll.scrollHeight;
    }
    async function executeEntry(entry) {
      if (closed || busy || typeof options.execute !== 'function') return;
      setBusy(true); renderShell();
      try {
        const next = await options.execute(entry.kind === 'script' ? initialSource : entry.command, inputText(entry.inputs), { mode: entry.kind === 'script' ? 'script' : 'repl', reset: entry.kind === 'script' && !entry.inputs.length, replay: entry.inputs.length > 0 });
        if (!closed) { entry.result = result = next; options.onResult?.(next); }
      }
      catch (error) { if (!closed) entry.result = result = { success: false, stdout: '', stderr: '', waitingForInput: false, error: { type: error?.name || 'Error', message: error?.message || String(error) } }; }
      finally { if (!closed) { setBusy(false); renderShell(); if (result?.waitingForInput && (!options.embedded || overlay.contains(document.activeElement))) input.focus({ preventScroll: true }); } }
      return result;
    }
    function runShell() {
      if (closed || busy) return;
      const entry = { kind: 'script', inputs: [], result: null }; entries = [entry]; result = null; input.value = '';
      return executeEntry(entry);
    }
    async function sendInput() {
      if (closed || busy) return;
      if (result?.waitingForInput) { const entry = entries.at(-1); entry.inputs.push(input.value); input.value = ''; return executeEntry(entry); }
      const command = input.value; if (!command.trim()) return;
      const entry = { kind: 'repl', command, inputs: [], result: null }; entries.push(entry); result = null; input.value = '';
      return executeEntry(entry);
    }
    function close(state = {}) {
      if (closed) return; saveDraft();
      if (source && source.value !== baseSource) { try { options.onChange?.(source.value)?.catch?.(showError); } catch (error) { showError(error); } }
      closed = true; document.removeEventListener('keydown', keys, true); overlay.__previewWindowCleanup?.(); delete overlay.__previewWindowCleanup;
      if (!state.switching) { options.onDispose?.(); overlay.remove(); overlay.__documentPreviewRestore?.(); delete overlay.__documentPreviewRestore; }
      if (active?.close === close) active = null;
    }
    function keys(event) {
      if (closed || !overlay.contains(event.target) || event.target.closest?.('.ti-math-tool-popup')) return;
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && !event.repeat && ['b', 'r'].includes(event.key.toLowerCase())) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (isEditor) Promise.resolve(editorAction(event.key.toLowerCase() === 'b' ? 'syntax' : 'run')).catch(showError);
        else if (event.key.toLowerCase() === 'r') runShell();
        else if (typeof options.onSyntax === 'function') Promise.resolve(options.onSyntax(initialSource)).then(value => { if (!closed) renderReport(value); }).catch(showError);
      } else if (event.key === 'Tab' && event.target === source) { event.preventDefault(); source.setRangeText('    ', source.selectionStart, source.selectionEnd, 'end'); sourceChanged(); }
      else if (event.key === 'Escape' && !options.embedded) { event.preventDefault(); event.stopImmediatePropagation(); close(); }
    }
    const navigation = { ...(options.pageNavigation || { items: [{ file: initial.file, path: initial.path, name: scriptName(initial) }], selected: 0 }), onSelect: next => { if (closed || busy) return; close({ switching: true }); return options.pageNavigation?.onSelect(next, { expanded, pythonRun: false }); } };
    window.TnsDocumentPreviewNavigation?.mountChrome($('.ti-python-chrome'), { ...navigation, title: options.documentName || initial.documentName || 'documento', mode: 'RAD', onClose: () => close() });
    $('[data-ti-py-close]').onclick = () => close();
    if (source) {
      source.oninput = sourceChanged; source.onscroll = () => { $('[data-ti-py-highlight]').scrollLeft = source.scrollLeft; saveDraft(); };
      for (const type of ['select', 'keyup', 'click']) source.addEventListener(type, () => { renderHeader(); saveDraft(); });
      for (const kind of ['syntax', 'save', 'run']) { const button = $(`[data-ti-py-${kind}]`); button.disabled = typeof options[kind === 'syntax' ? 'onSyntax' : kind === 'save' ? 'onSave' : 'onRun'] !== 'function'; button.onclick = () => Promise.resolve(editorAction(kind)).catch(showError); }
    } else {
      $('[data-ti-py-form]').onsubmit = event => { event.preventDefault(); sendInput(); };
      $('[data-ti-py-send]').onclick = () => sendInput(); $('[data-ti-py-restart]').onclick = () => runShell();
      $('[data-ti-py-edit]').onclick = () => { if (closed || busy) return; if (!options.embedded) close({ switching: typeof options.createBackdrop === 'function' }); return options.onEdit?.({ expanded }); };
      input.oninput = saveDraft;
    }
    scroll.addEventListener('scroll', saveDraft); overlay.onclick = event => { if (event.target === overlay) close(); };
    if (!overlay.isConnected && !options.embedded) document.body.append(overlay);
    if (!options.embedded) window.TnsPreviewWindow?.mount(overlay, { ...options, pageNavigation: navigation, expanded, setExpanded: value => { expanded = value; options.setExpanded?.(value); } });
    document.addEventListener('keydown', keys, true);
    const instance = { close, getSource, setSource: text => { if (source && !busy) { source.value = String(text ?? ''); sourceChanged(); } }, checkSyntax: () => editorAction('syntax'), save: () => editorAction('save'), run: () => isEditor ? editorAction('run') : runShell(), sendInput: value => { if (input && !busy) { input.value = String(value ?? ''); return sendInput(); } }, getSnapshot: () => ({ mode, name: scriptName(initial), source: getSource(), dirty, busy, expanded, report, result, entries: entries.map(entry => ({ ...entry, inputs: [...entry.inputs] })), output: source ? '' : $('[data-ti-py-output]').textContent }) };
    if (source) { source.setSelectionRange(Math.min(source.value.length, draft?.selectionStart || 0), Math.min(source.value.length, draft?.selectionEnd || 0)); renderSource(); $('[data-ti-py-status]').textContent = t.ready; scroll.scrollTop = draft?.scrollTop || 0; if (!options.embedded) source.focus({ preventScroll: true }); }
    else { setBusy(false); renderShell(); if (options.autoRun === true) runShell(); }
    if (!options.embedded) active = instance;
    return instance;
  }
  window.TnsPythonPreview = Object.freeze({ openEditor: (data, options) => open('editor', data, options), openShell: (data, options) => open('shell', data, options), close: state => active?.close(state), getSnapshot: () => active?.getSnapshot() ?? null, getSource: () => active?.getSource() ?? '', setSource: text => active?.setSource(text), checkSyntax: () => active?.checkSyntax(), save: () => active?.save(), run: () => active?.run(), sendInput: value => active?.sendInput(value), highlightSource, lineCounter, scriptName, shellText, inputText });
})();
