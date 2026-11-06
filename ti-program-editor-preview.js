(() => {
  'use strict';
  const WORDS = {
    en: { title: 'Program Editor', note: 'TI.ProgramEditor · edit source, check syntax and open Calculator to run.', close: 'Close', syntax: 'Check syntax', run: 'Run in Calculator', save: 'Save', saved: 'Saved', ready: 'Ready', changed: 'Unsaved changes', checking: 'Checking syntax…', saving: 'Saving…', errors: 'Errors', warnings: 'Warnings', line: 'Line', diagnostics: 'Syntax results', noIssues: 'No errors or warnings.', tools: 'Insert', hint: 'Ctrl+B: check syntax · Ctrl+R: open Calculator. Press Enter there to execute the call.', source: 'Editable program source', definition: 'Program definition (read only)', unavailable: 'This action is not available.', failed: 'The action failed.' },
    es: { title: 'Editor de programas', note: 'TI.ProgramEditor · edita el código, verifica la sintaxis y abre Calculadora para ejecutar.', close: 'Cerrar', syntax: 'Verificar sintaxis', run: 'Ejecutar en Calculadora', save: 'Guardar', saved: 'Guardado', ready: 'Listo', changed: 'Cambios sin guardar', checking: 'Verificando sintaxis…', saving: 'Guardando…', errors: 'Errores', warnings: 'Advertencias', line: 'Línea', diagnostics: 'Resultado de sintaxis', noIssues: 'Sin errores ni advertencias.', tools: 'Insertar', hint: 'Ctrl+B: verificar sintaxis · Ctrl+R: abrir Calculadora. Allí pulsa Enter para ejecutar la llamada.', source: 'Código editable del programa', definition: 'Definición del programa (solo lectura)', unavailable: 'Esta acción no está disponible.', failed: 'La acción no se pudo completar.' },
    fr: { title: 'Éditeur de programmes', note: 'TI.ProgramEditor · modifiez le code, vérifiez la syntaxe puis ouvrez Calculs pour exécuter.', close: 'Fermer', syntax: 'Vérifier la syntaxe', run: 'Exécuter dans Calculs', save: 'Enregistrer', saved: 'Enregistré', ready: 'Prêt', changed: 'Modifications non enregistrées', checking: 'Vérification de la syntaxe…', saving: 'Enregistrement…', errors: 'Erreurs', warnings: 'Avertissements', line: 'Ligne', diagnostics: 'Résultat de syntaxe', noIssues: 'Aucune erreur ni aucun avertissement.', tools: 'Insérer', hint: 'Ctrl+B : vérifier la syntaxe · Ctrl+R : ouvrir Calculs. Appuyez sur Entrée pour exécuter l’appel.', source: 'Code du programme modifiable', definition: 'Définition du programme (lecture seule)', unavailable: 'Cette action est indisponible.', failed: 'L’action a échoué.' }
  };
  const KEYWORDS = new Set('Define LibPriv LibPub Prgm Func Local If Then Else ElseIf For To Step Do While Loop EndIf EndFor EndLoop Disp Request Text Return EndPrgm EndFunc Try ElseTry EndTry Stop Cycle Exit Goto Lbl DelVar Lock Unlock RequestStr DispAt'.toLowerCase().split(' '));
  const esc = text => String(text ?? '').replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[value]));
  let active = null;

  function stripDeclaration(source) {
    return String(source ?? '').replace(/^\s*Define\s+(?:(?:LibPub|LibPriv)\s+)?[\p{L}_][\p{L}\p{N}_]*\s*\([^)]*\)\s*=\s*(?=(?:Prgm|Func)\b)/iu, '');
  }
  function declaration(data = {}) {
    const access = String(data.library_access ?? data.access ?? '').trim();
    const visibility = /^LibPub$/i.test(access) ? 'LibPub ' : /^LibPriv$/i.test(access) ? 'LibPriv ' : '';
    const parameters = Array.isArray(data.parameters) ? data.parameters.join(',') : String(data.parameters ?? '');
    return `Define ${visibility}${String(data.name || data.program_name || 'programa')}(${parameters})=`;
  }
  function highlightLine(source) {
    const line = String(source ?? ''); let at = 0, markup = '';
    const token = (kind, text) => `<span class="ti-pe-${kind}">${esc(text)}</span>`;
    while (at < line.length) {
      const rest = line.slice(at);
      if (rest.startsWith('©') || rest.startsWith('//')) { markup += token('comment', rest); break; }
      if (rest[0] === '"') {
        const match = /^"(?:[^"\\]|\\.)*(?:"|$)/.exec(rest)[0];
        markup += token(match.length > 1 && match.endsWith('"') ? 'string' : 'invalid-string', match); at += match.length; continue;
      }
      const identifier = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(rest);
      if (identifier) { const word = identifier[0]; markup += token(KEYWORDS.has(word.toLowerCase()) ? 'keyword' : word.toLowerCase() === 'clrio' ? 'clrio' : 'identifier', word); at += word.length; continue; }
      const number = /^\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(rest);
      if (number) { markup += token('number', number[0]); at += number[0].length; continue; }
      markup += token(/[→:=+\-*/^=<>&·√πΣΔ,]/.test(rest[0]) ? 'operator' : 'plain', rest[0]); at++;
    }
    return markup || '\u200b';
  }
  function lineCounter(source, caret = 0) {
    const text = String(source ?? ''), lines = text.split('\n');
    const first = /^\s*(?:Prgm|Func)\s*$/i.test(lines[0]) ? 1 : 0;
    const last = lines.length > first && /^\s*End(?:Prgm|Func)\s*$/i.test(lines.at(-1)) ? lines.length - 1 : lines.length;
    const total = Math.max(1, last - first), row = text.slice(0, Math.max(0, Math.min(text.length, caret))).split('\n').length;
    return { current: Math.max(1, Math.min(total, row - first)), total, sourceLine: row };
  }
  function quotedLiteralFor(source, renderedText) {
    const text = String(renderedText ?? '');
    for (const literal of String(source ?? '').match(/"(?:[^"\\]|\\.)*"/g) || []) if (literal.slice(1, -1) === text || literal === text) return literal;
    // A renderer can emit a single mtext for several comma-separated quoted
    // arguments. Preserve the exact source spelling in that case as well.
    return String(source ?? '').includes('"' + text + '"') ? '"' + text + '"' : null;
  }

  function open(initial = {}, options = {}) {
    active?.close();
    const language = String(document.documentElement.lang || 'en').slice(0, 2), t = WORDS[language] || WORDS.en;
    const overlay = options.createBackdrop?.('modal-backdrop ti-program-editor-preview-backdrop') || document.createElement('div');
    overlay.classList.add('modal-backdrop', 'ti-program-editor-preview-backdrop');
    const previous = document.activeElement, oldOverflow = document.body.style.overflow;
    if (!overlay.__documentPreviewRestore) overlay.__documentPreviewRestore = () => { document.body.style.overflow = oldOverflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
    document.body.style.overflow = 'hidden';
    overlay.innerHTML = `<section class="modal widget-preview-modal ti-program-editor-preview-modal" role="dialog" aria-modal="true" aria-labelledby="ti-pe-preview-title" tabindex="-1">
      <div class="modal-top-actions"><button type="button" data-ti-pe-close></button></div><h2 id="ti-pe-preview-title"></h2><p class="muted-text" data-ti-pe-note></p>
      <div class="preview-controls ti-program-editor-controls"><button type="button" class="green-tool-button" data-ti-pe-syntax></button><button type="button" class="green-tool-button" data-ti-pe-run></button><button type="button" data-ti-pe-save></button><button type="button" data-ti-pe-math-view aria-pressed="false">Math view</button><div class="ti-program-editor-tools" data-ti-pe-tools></div></div>
      <div class="widget-preview-calculator ti-program-editor-calculator"><div class="ti-program-editor-chrome"></div><div class="ti-program-editor-namebar"><span data-ti-pe-name></span><span data-ti-pe-counter></span></div><div class="ti-program-editor-scroll" data-ti-pe-scroll><div class="ti-program-editor-declaration" data-ti-pe-declaration contenteditable="false" aria-readonly="true"></div><div class="ti-program-editor-source-host"><pre data-ti-pe-highlight aria-hidden="true"></pre><textarea data-ti-pe-source wrap="off" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea></div></div></div>
      <div class="modal-actions ti-program-editor-report"><strong data-ti-pe-results-title></strong><p data-ti-pe-status role="status" aria-live="polite"></p><div data-ti-pe-diagnostics></div></div><p class="ti-program-editor-hint" data-ti-pe-hint></p>
    </section>`;
    const $ = selector => overlay.querySelector(selector), modal = $('.ti-program-editor-preview-modal'), source = $('[data-ti-pe-source]'), highlight = $('[data-ti-pe-highlight]'), scroll = $('[data-ti-pe-scroll]'), host = $('.ti-program-editor-source-host');
    const sourceDraft = options.draft;
    let data = { ...initial }, closed = false, busy = false, dirty = false, expanded = Boolean(options.expanded), report = null, baseSource = stripDeclaration(initial.source), mathEditor = null, mathObserver = null;
    source.value = String(sourceDraft?.source ?? baseSource); dirty = source.value !== baseSource;
    let issueLines = new Map();
    for (const [selector, label] of Object.entries({ '#ti-pe-preview-title': t.title, '[data-ti-pe-close]': t.close, '[data-ti-pe-note]': t.note, '[data-ti-pe-syntax]': t.syntax, '[data-ti-pe-run]': t.run, '[data-ti-pe-save]': t.save, '[data-ti-pe-results-title]': t.diagnostics, '[data-ti-pe-hint]': t.hint })) $(selector).textContent = label;
    source.setAttribute('aria-label', t.source); $('[data-ti-pe-declaration]').setAttribute('aria-label', t.definition);
    $('[data-ti-pe-syntax]').disabled = typeof options.onSyntax !== 'function'; $('[data-ti-pe-run]').disabled = typeof options.onRun !== 'function'; $('[data-ti-pe-save]').disabled = typeof options.onSave !== 'function';

    function latestData() { return { ...data, source: source.value }; }
    function saveDraft() { if (closed) return; options.setDraft?.({ source: source.value, selectionStart: source.selectionStart, selectionEnd: source.selectionEnd, scrollTop: scroll.scrollTop, mathView: Boolean(mathEditor?.active) }); }
    function renderHeader() {
      if (closed || !modal.isConnected) return;
      $('[data-ti-pe-name]').textContent = `${dirty ? '* ' : ''}${data.name || data.program_name || 'programa'}`;
      // The declaration is a sibling of the textarea. Selection, typing,
      // paste, undo and template insertion never include this readonly text.
      const definition = $('[data-ti-pe-declaration]'), name = String(data.name || data.program_name || 'programa'), full = declaration(data), marker = full.lastIndexOf(name + '('), strong = document.createElement('strong');
      strong.textContent = name; definition.replaceChildren(document.createTextNode(full.slice(0, marker)), strong, document.createTextNode(full.slice(marker + name.length)));
      const counter = lineCounter(source.value, source.selectionStart); $('[data-ti-pe-counter]').textContent = `${counter.current}/${counter.total}`;
      window.TnsDocumentPreviewNavigation?.updateChrome($('.ti-program-editor-chrome'), { title: options.documentName || data.documentName || data.name || 'documento' });
    }
    function renderSource() {
      if (closed) return;
      const lines = source.value.split('\n');
      highlight.innerHTML = lines.map((line, index) => `<span class="ti-pe-source-line${issueLines.has(index + 1) ? ' ti-pe-source-' + issueLines.get(index + 1).toLowerCase() : ''}" data-source-line="${index + 1}">${highlightLine(line)}</span>`).join('');
      host.style.height = `${Math.max(1, lines.length) * 24 + 16}px`;
      highlight.scrollLeft = source.scrollLeft; renderHeader(); decorateMath();
    }
    function decorateMath() {
      if (closed || !mathEditor?.active) return;
      const lines = source.value.split('\n');
      for (const row of host.querySelectorAll('[data-math-line]')) {
        const line = Number(row.dataset.mathLine), formula = row.querySelector('.ti-math-source-formula'), text = lines[line - 1] || '';
        row.classList.toggle('ti-pe-math-row-error', issueLines.get(line) === 'ERROR'); row.classList.toggle('ti-pe-math-row-warning', issueLines.get(line) === 'WARNING');
        // Scalar assignments keep TI's red :=/arrow/operator tokens. Structured
        // formulas continue to use the shared MathML renderer unchanged.
        if (formula && !formula.querySelector('textarea') && !formula.dataset.tiPeScalar && /(?::=|→)/.test(text) && !/(?:\/|\^|√|∫|∑|∏|\[|abs\(|piecewise\(|system\(|sqrt\(|root\(|log\()/i.test(text)) {
          formula.dataset.tiPeScalar = 'true'; const code = document.createElement('code'); code.dataset.tiPeColored = 'true'; code.innerHTML = highlightLine(text); formula.replaceChildren(code);
        }
        if (formula && !formula.querySelector('textarea')) {
          for (const token of formula.querySelectorAll('math mtext,math mi')) {
            const original = token.dataset.tiPeLiteralOriginal ?? token.textContent;
            const literal = token.localName === 'mtext' || original.startsWith('"') ? quotedLiteralFor(text, original) : null;
            if (literal) {
              token.dataset.tiPeLiteralOriginal = original; token.classList.add('ti-pe-math-string'); token.setAttribute('mathvariant', 'normal');
              if (token.textContent !== literal) token.textContent = literal;
            } else if (original.includes('"')) {
              // An opaque concatenated expression should keep its exact
              // source tokens and colors rather than swallowing its quotes.
              const code = document.createElement('code'); code.dataset.tiPeColored = 'true'; code.innerHTML = highlightLine(text); formula.replaceChildren(code); break;
            }
          }
        }
      }
      for (const code of host.querySelectorAll('.ti-math-source-formula > code:not([data-ti-pe-colored])')) { const text = code.textContent; code.dataset.tiPeColored = 'true'; code.innerHTML = highlightLine(text); }
      for (const token of host.querySelectorAll('.ti-math-source-formula math mo')) token.classList.toggle('ti-pe-math-operator', /^[→:=+\-*/^=<>&·√πΣΔ,]+$/.test(token.textContent));
    }
    function setMathView(value, focus = true) {
      if (closed || busy || !mathEditor) return false;
      mathEditor.flush(); mathEditor.setActive(Boolean(value)); $('[data-ti-pe-math-view]').setAttribute('aria-pressed', String(mathEditor.active));
      decorateMath(); saveDraft();
      if (focus) { if (mathEditor.active) mathEditor.focusSelection?.(); else { source.focus({ preventScroll: true }); revealCaret(); } }
      return mathEditor.active;
    }
    function selectLine(line) {
      if (closed) return;
      const number = Math.max(1, Number(line) || 1), lines = source.value.split('\n'), start = lines.slice(0, number - 1).reduce((count, text) => count + text.length + 1, 0);
      mathEditor?.flush(); source.setSelectionRange(Math.min(start, source.value.length), Math.min(start + (lines[number - 1]?.length || 0), source.value.length));
      if (mathEditor?.active) { mathEditor.resetSelection(); mathEditor.focusSelection?.(); } else source.focus({ preventScroll: true });
      revealCaret(); renderHeader(); saveDraft();
    }
    function revealCaret() {
      if (closed || mathEditor?.active) return;
      const y = $('[data-ti-pe-declaration]').offsetHeight + (lineCounter(source.value, source.selectionStart).sourceLine - 1) * 24;
      if (y < scroll.scrollTop) scroll.scrollTop = y;
      else if (y + 24 > scroll.scrollTop + scroll.clientHeight) scroll.scrollTop = y + 24 - scroll.clientHeight;
    }
    function sourceChanged() {
      if (closed) return;
      dirty = source.value !== baseSource; report = null; issueLines.clear(); $('[data-ti-pe-diagnostics]').replaceChildren();
      $('[data-ti-pe-status]').textContent = dirty ? t.changed : t.ready;
      renderSource(); saveDraft();
      try { const updating = options.onChange?.(source.value); if (updating?.catch) updating.catch(showError); } catch (error) { showError(error); }
      revealCaret();
    }
    function setSource(value) { if (closed) return; mathEditor?.flush(); source.value = String(value ?? ''); source.setSelectionRange(Math.min(source.selectionStart, source.value.length), Math.min(source.selectionEnd, source.value.length)); sourceChanged(); mathEditor?.refresh(); }
    function insertText(text) { if (closed || busy) return false; if (mathEditor?.active) return mathEditor.replaceSelection(String(text)); source.focus({ preventScroll: true }); source.setRangeText(String(text), source.selectionStart, source.selectionEnd, 'end'); sourceChanged(); return true; }
    function showError(error) { if (closed) return; $('[data-ti-pe-status]').textContent = error?.message || String(error || t.failed); $('[data-ti-pe-status]').classList.add('ti-pe-status-error'); }
    function showReport(value) {
      if (closed) return;
      report = value || {}; issueLines = new Map(); const diagnostics = Array.isArray(report.diagnostics) ? report.diagnostics : [];
      const diagnosticsHost = $('[data-ti-pe-diagnostics]'); diagnosticsHost.replaceChildren();
      for (const diagnostic of diagnostics) {
        const line = Number(diagnostic.line), severity = String(diagnostic.severity || diagnostic.level || 'INFO').toUpperCase();
        if (line && (severity === 'ERROR' || !issueLines.has(line))) issueLines.set(line, severity);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'ti-pe-diagnostic'; button.dataset.severity = severity;
        const code = diagnostic.code_label || (diagnostic.code ? `${severity === 'WARNING' ? 'W' : 'E'}${diagnostic.code}` : '');
        button.textContent = [code, line ? `${t.line} ${line}` : '', diagnostic.message || diagnostic.detail || ''].filter(Boolean).join(' · '); button.disabled = !line; button.onclick = () => selectLine(line); diagnosticsHost.append(button);
      }
      const errors = Number(report.errors || 0), warnings = Number(report.warnings || 0);
      $('[data-ti-pe-status]').textContent = errors || warnings ? `${t.errors}: ${errors} · ${t.warnings}: ${warnings}` : t.noIssues;
      $('[data-ti-pe-status]').classList.toggle('ti-pe-status-error', errors > 0); renderSource();
    }
    async function action(kind) {
      if (closed || busy) return;
      const callback = kind === 'syntax' ? options.onSyntax : kind === 'save' ? options.onSave : options.onRun;
      if (typeof callback !== 'function') { showError(t.unavailable); return; }
      mathEditor?.flush(); saveDraft(); const actionSource = source.value; busy = true; host.inert = true; source.readOnly = true; $('[data-ti-pe-status]').classList.remove('ti-pe-status-error');
      const buttons = ['syntax', 'save', 'run'].map(name => $(`[data-ti-pe-${name}]`)); const enabled = buttons.map(button => !button.disabled); buttons.forEach(button => { button.disabled = true; });
      try {
        if (kind === 'run') { const latest = latestData(), state = { expanded }; close({ switching: typeof options.createBackdrop === 'function' }); return await callback(latest, state); }
        $('[data-ti-pe-status]').textContent = kind === 'save' ? t.saving : t.checking;
        const value = await callback(actionSource);
        if (closed) return value;
        if (kind === 'syntax') { if (source.value === actionSource) showReport(value); } else { baseSource = actionSource; dirty = source.value !== baseSource; renderHeader(); $('[data-ti-pe-status]').textContent = dirty ? t.changed : t.saved; }
        return value;
      } catch (error) {
        if (closed && kind === 'run') { const reopened = open(latestData(), { ...options, expanded, draft: { source: source.value } }); reopened.showError(error); }
        else showError(error);
      } finally { if (!closed) { busy = false; host.inert = false; source.readOnly = false; buttons.forEach((button, index) => { button.disabled = !enabled[index]; }); } }
    }
    function close(state = {}) {
      if (closed) return; mathEditor?.flush(); saveDraft(); closed = true; mathEditor?.dispose(); mathObserver?.disconnect(); window.TnsMathTools?.close(); document.removeEventListener('keydown', keys, true);
      overlay.__previewWindowCleanup?.(); delete overlay.__previewWindowCleanup;
      if (!state.switching) { if (options.closeBackdrop) options.closeBackdrop(overlay); else { overlay.remove(); overlay.__documentPreviewRestore?.(); delete overlay.__documentPreviewRestore; } }
      if (active?.close === close) active = null;
    }
    function keys(event) {
      if (closed || event.target.closest?.('.ti-math-tool-popup')) return;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && !event.repeat && ['b', 'r'].includes(event.key.toLowerCase())) { event.preventDefault(); event.stopImmediatePropagation(); action(event.key.toLowerCase() === 'b' ? 'syntax' : 'run'); }
      else if (event.key === 'Escape' && !event.target.closest?.('.ti-math-source-input')) { event.preventDefault(); event.stopImmediatePropagation(); close(); }
      else if (event.key === 'Tab' && event.target === source) { event.preventDefault(); source.setRangeText('  ', source.selectionStart, source.selectionEnd, 'end'); sourceChanged(); }
    }
    const navigation = { ...(options.pageNavigation || { items: [{ file: data.file, path: data.path, name: data.name }], selected: 0 }), onSelect: next => { if (closed || busy) return; close({ switching: true }); return options.pageNavigation?.onSelect(next, { expanded }); } };
    window.TnsDocumentPreviewNavigation?.mountChrome($('.ti-program-editor-chrome'), { ...navigation, title: options.documentName || data.documentName || data.name || 'documento', mode: 'RAD', onClose: () => close() });
    const tools = $('[data-ti-pe-tools]'); tools.setAttribute('aria-label', t.tools);
    for (const kind of ['templates', 'catalog', 'variables']) {
      const button = window.TnsMathTools?.iconButton(kind); if (!button) continue;
      button.dataset.tiPeTool = kind; button.onclick = () => { const settings = { anchor: button, insert: insertText, getVariables: options.getVariables }; if (kind === 'templates') window.TnsMathTools.openTemplates(settings); else if (kind === 'catalog') window.TnsMathTools.openCatalog(settings); else window.TnsMathTools.openVariables(settings); }; tools.append(button);
    }
    source.addEventListener('input', sourceChanged); source.addEventListener('scroll', () => { highlight.scrollLeft = source.scrollLeft; saveDraft(); });
    source.addEventListener('select', () => { renderHeader(); saveDraft(); }); source.addEventListener('keyup', () => { renderHeader(); revealCaret(); saveDraft(); }); scroll.addEventListener('scroll', saveDraft);
    if (window.TnsMathEditor) {
      mathEditor = window.TnsMathEditor.install({ host, editor: source, isEnabled: () => !closed && !busy, replaceRange: (text, start, end) => { if (closed) return; const before = source.value; source.setRangeText(String(text), start, end, 'end'); if (source.value !== before) sourceChanged(); }, onChange: () => { if (closed) return; $('[data-ti-pe-math-view]').setAttribute('aria-pressed', String(Boolean(mathEditor?.active))); renderHeader(); decorateMath(); saveDraft(); } });
      mathObserver = new MutationObserver(decorateMath); mathObserver.observe(host.querySelector('.ti-math-source-view'), { childList: true, subtree: true });
    } else $('[data-ti-pe-math-view]').hidden = true;
    $('[data-ti-pe-math-view]').onclick = () => setMathView(!mathEditor?.active);
    $('[data-ti-pe-close]').onclick = () => close(); $('[data-ti-pe-syntax]').onclick = () => action('syntax'); $('[data-ti-pe-run]').onclick = () => action('run'); $('[data-ti-pe-save]').onclick = () => action('save');
    overlay.onclick = event => { if (event.target === overlay) close(); };
    if (!overlay.isConnected) document.body.append(overlay);
    window.TnsPreviewWindow?.mount(overlay, { ...options, pageNavigation: navigation, expanded, setExpanded: value => { expanded = value; options.setExpanded?.(value); }, onResize: size => { options.onResize?.(size); } });
    document.addEventListener('keydown', keys, true); renderSource(); source.setSelectionRange(Math.min(source.value.length, sourceDraft?.selectionStart || 0), Math.min(source.value.length, sourceDraft?.selectionEnd || 0)); setMathView(sourceDraft?.mathView !== false, false); scroll.scrollTop = sourceDraft?.scrollTop || 0; renderHeader(); $('[data-ti-pe-status]').textContent = dirty ? t.changed : t.ready;
    active = { close, getSource: () => source.value, setSource, insertText, setMathView, checkSyntax: () => action('syntax'), run: () => action('run'), save: () => action('save'), showError, getSnapshot: () => ({ source: source.value, declaration: declaration(data), name: data.name, dirty, busy, expanded, mathView: Boolean(mathEditor?.active), report, selectionStart: source.selectionStart, selectionEnd: source.selectionEnd }), refresh: next => { if (closed) return; if (next) data = { ...data, ...next }; renderHeader(); } };
    if (mathEditor?.active) mathEditor.focusSelection?.(); else source.focus({ preventScroll: true });
    return active;
  }
  window.TnsProgramEditorPreview = Object.freeze({ open, close: state => active?.close(state), getSource: () => active?.getSource() ?? '', getSnapshot: () => active?.getSnapshot() ?? null, formatDeclaration: declaration, highlightLine, stripDeclaration, lineCounter, quotedLiteralFor });
})();
