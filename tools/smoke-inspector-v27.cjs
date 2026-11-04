/* Integration smoke: run with Electron. Uses real Pyodide/TNS stage creation.
   Optional TNS_SMOKE_WEB_ROOT, TNS_SMOKE_DESKTOP_ROOT, TNS_SMOKE_VENDOR,
   TNS_SMOKE_REPORT paths select a source tree and an existing offline runtime. */
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.env.TNS_SMOKE_WEB_ROOT || path.join(__dirname, '..'));
const desktop = path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT || path.join(root, 'desktop'));
const vendor = path.resolve(process.env.TNS_SMOKE_VENDOR || path.join(desktop, 'vendor'));
const reportPath = path.resolve(process.env.TNS_SMOKE_REPORT || path.join(root, 'release', 'qa', 'inspector-v27.json'));
const { makeServer, listen } = require(path.join(desktop, 'server.cjs'));
let server, win;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  server = makeServer(root, vendor);
  const origin = await listen(server);
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, done) => done({ cancel: !details.url.startsWith(origin) }));
  win = new BrowserWindow({ show: false, width: 1600, height: 1100, webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, offscreen: true } });
  win.webContents.on('console-message', (_event, level, message) => fs.appendFileSync(reportPath + '.console.log', `${level}: ${message}\n`));
  await Promise.race([win.loadURL(origin), new Promise((_resolve, reject) => setTimeout(() => reject(Error('Initial navigation timed out')), 45000))]);
  fs.appendFileSync(reportPath + '.console.log', 'SMOKE: navigation complete\n');
  const result = await Promise.race([win.webContents.executeJavaScript(`(${run.toString()})()`), new Promise((_resolve, reject) => setTimeout(() => reject(Error('Inspector integration smoke exceeded 120 seconds')), 120000))]);
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
  fs.writeFileSync(reportPath + '.png', (await win.webContents.capturePage()).toPNG());
  console.log(JSON.stringify(result));
  win.destroy(); server.close(); app.quit();
}).catch(async error => {
  const checks = win && !win.isDestroyed() ? await Promise.race([win.webContents.executeJavaScript('({checks:window.__v27SmokeResults||[],xmlLog:document.querySelector("#xml-log")?.textContent,body:document.body.className,runtimeStatus:document.querySelector("#runtime-status")?.textContent,xmlDisabled:document.querySelector("#xml-toggle-btn")?.disabled})').catch(() => null),new Promise(resolve=>setTimeout(()=>resolve({rendererUnresponsive:true}),3000))]) : null;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ ok: false, error: error.stack || String(error), ...checks }, null, 2));
  if (win && !win.isDestroyed()) { fs.writeFileSync(reportPath + '.failure.png', (await win.webContents.capturePage()).toPNG()); win.destroy(); }
  console.error(error); server?.close(); app.exit(1);
});

async function run() {
  const checks = window.__v27SmokeResults = [];
  const check = (condition, message, detail = '') => { if (!condition) throw Error(message + (detail ? ': ' + JSON.stringify(detail) : '')); };
  const done = (name, data = {}) => { checks.push({ name, ...data }); console.log('SMOKE: ' + name); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (predicate, name, timeout = 30000) => { const deadline = Date.now() + timeout; while (!predicate()) { if (Date.now() > deadline) throw Error('Timed out: ' + name); await pause(30); } };
  const current = selector => [...document.querySelectorAll(selector)].find(el => !el.closest('.closing'));
  const addProgram = async () => {
    let finished = false;
    const pending = Promise.resolve(addProgramEditorToStage()).then(value => { finished = true; return value; });
    await wait(() => finished || current('#xpe-apply'), 'ProgramEditor creation settings');
    current('#xpe-apply')?.click();
    return pending;
  };
  const nav = modal => [...modal.querySelectorAll('.document-preview-tabs')].find(el => el.getClientRects().length > 0);
  const close = async (modal, selector) => { modal.querySelector(selector).click(); await wait(() => !modal.isConnected, 'close ' + selector); };
  const move = async (selector, direction, indexInWindow) => {
    const old = current(selector), tabs = nav(old);
    check(tabs, 'Page navigation is missing in ' + selector);
    check(tabs.querySelectorAll('.document-preview-tab').length <= 3, 'More than three pages are visible');
    if (direction) { const arrow = tabs.querySelector('[aria-label="' + (direction > 0 ? 'Next pages' : 'Previous pages') + '"]'); check(arrow && !arrow.disabled, 'Page arrow unavailable'); arrow.click(); }
    const buttons = nav(old).querySelectorAll('.document-preview-tab');
    check(buttons[indexInWindow], 'Requested visible tab is missing');
    const label = buttons[indexInWindow].textContent; buttons[indexInWindow].click();
    await wait(() => current(selector) && current(selector) !== old, 'change page ' + label);
    await wait(() => !old.isConnected, 'old page closed');
    const next = current(selector);
    await wait(() => nav(next)?.querySelector('[aria-current="page"]')?.textContent === label, 'selected tab ' + label);
    if (selector === '.love-preview-modal') await wait(() => next.dataset.previewReady === 'true', 'page runtime ready');
    check(nav(next).querySelectorAll('.document-preview-tab').length <= 3, 'Changed page shows more than three tabs');
    return next;
  };

  console.log('SMOKE: renderer started');
  await wait(() => window.TnsDocumentPreviewNavigation && window.TnsPrgmPreview && typeof pyodide !== 'undefined' && pyodide && !document.querySelector('#xml-toggle-btn').disabled && !document.querySelector('#startup-loader'), 'offline application ready', 30000);
  console.log('SMOKE: runtime ready');
  applyLanguage('en');
  if (document.querySelector('#xml-doctor-panel').classList.contains('collapsed')) document.querySelector('#xml-toggle-btn').click();
  await ensureXmlProjectForPageCreation();
  console.log('SMOKE: base stage created');
  await addProgram();
  console.log('SMOKE: first ProgramEditor created');
  await openDocumentInspector();
  let inspector = current('.inspector-modal');
  check([...inspector.querySelectorAll('.inspector-summary > *')].every(el => !/:\s*0$/.test(el.textContent.trim())), 'Inspector displayed a zero count');
  check(inspector.querySelector('[data-preview-kind="basic"]')?.textContent === 'Basic: 1', 'Basic does not represent the actual ProgramEditor');
  inspector.querySelector('[data-preview-kind="basic"]').click();
  await wait(() => current('.prgm-preview-modal'), 'single Prgm preview');
  check(!current('.prgm-preview-modal').querySelector('.document-preview-tab'), 'A single Prgm shows fake page tabs');
  await close(current('.prgm-preview-modal'), '[data-close]');
  await close(inspector, '#inspector-close');
  done('singleProgramInspector', { hiddenZeros: true, basicProgramEditor: true, noFakeTabs: true });

  for (let i = 0; i < 3; i++) await addProgram();
  for (let i = 0; i < 4; i++) { await addNotepadWidgetToStage(); await addSpreadsheetWidgetToStage(); await addLuaScriptAppToStage(); }
  for (let i = 0; i < 2; i++) { await addGraphWidgetToStage(); await addPythonEditorToStage(); await addCalculatorWidgetToStage(); }
  const bitmap = document.createElement('canvas'); bitmap.width = 8; bitmap.height = 8; bitmap.getContext('2d').fillRect(0, 0, 8, 8);
  const blob = await new Promise(resolve => bitmap.toBlob(resolve, 'image/png'));
  // Create fixture data through the core stage API; the import UI's completion
  // callback intentionally opens its own image viewer and is outside this test.
  const addImage = addImageWidgetToStage.__tnsImportProgressOriginal || addImageWidgetToStage;
  for (let i = 0; i < 4; i++) await addImage(new File([blob], 'v27-image-' + i + '.png', { type: 'image/png' }));
  await scanXmlPrograms();
  let data = await inspectXmlDocument(), groups = window.TnsDocumentPreviewNavigation.groups(data.items);
  check(groups.basic.length === 4, 'Graph Funcs were counted as ProgramEditors', groups.basic.length);
  for (const kind of ['notes', 'sheets', 'lua', 'images']) check(groups[kind].length >= 4, 'Missing created ' + kind + ' pages', groups[kind].length);
  done('stageCreated', Object.fromEntries(Object.entries(groups).map(([kind, items]) => [kind, items.length])));

  const func = xmlDoctor.candidates.find(item => item.document_type === 'Func' && !/^\s*Func\b/i.test(item.code));
  check(func, 'Graph bare Func candidate is missing');
  selectXmlProgram(func.index); await runXmlSyntax();
  check(!xmlDoctor.lastReport.diagnostics.some(d => Number(d.code) === 730), 'Bare graph Func still reports a missing wrapper', xmlDoctor.lastReport);
  await autoFixXml();
  check(!/^\s*(?:Prgm|Func)\b/i.test(document.querySelector('#xml-code').value), 'Auto Fix wrapped a single-expression Func');
  done('bareGraphFunc', { source: document.querySelector('#xml-code').value, wrapperErrors: false, autofixPreservedExpression: true });

  await openDocumentInspector(); inspector = current('.inspector-modal');
  const summary = [...inspector.querySelectorAll('.inspector-summary > *')].map(el => el.textContent.trim());
  check(summary.every(text => !/:\s*0$/.test(text)), 'Inspector displayed a zero count after page creation');
  for (const kind of ['notes', 'sheets', 'lua', 'basic', 'images', 'graphs', 'python', 'calculators']) check(inspector.querySelector('[data-preview-kind="' + kind + '"]'), 'Missing preview summary button: ' + kind);
  done('groupedInspector', { summary });

  inspector.querySelector('[data-preview-kind="notes"]').click(); await wait(() => current('.note-page-modal'), 'notes preview');
  let modal = current('.note-page-modal');
  const noteEditor = modal.querySelector('#note-editor,.ti-note-rich-view');
  if ('value' in noteEditor) noteEditor.value = 'UNSAVED V27 NOTE';
  else { modal.querySelector('#note-edit-view')?.click(); const paragraph = document.createElement('p'), bold = document.createElement('strong'); bold.textContent = 'UNSAVED V27 NOTE'; paragraph.append(bold); noteEditor.replaceChildren(paragraph); noteEditor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'UNSAVED V27 NOTE' })); }
  modal = await move('.note-page-modal', 1, 2); modal = await move('.note-page-modal', -1, 0);
  const restoredNote = modal.querySelector('#note-editor,.ti-note-rich-view');
  check((restoredNote.value ?? restoredNote.textContent) === 'UNSAVED V27 NOTE', 'Switching notes discarded an unsaved draft');
  if (restoredNote.classList.contains('ti-note-rich-view')) check(restoredNote.querySelector('strong'), 'Switching notes discarded rich formatting');
  await close(modal, '#note-cancel'); done('notesPages', { fourthPage: true, draftPreserved: true, maxVisible: 3 });

  inspector.querySelector('[data-preview-kind="sheets"]').click(); await wait(() => current('.spreadsheet-modal'), 'sheet preview');
  modal = current('.spreadsheet-modal'); const cell = modal.querySelector('.sheet-cell[data-row="0"][data-col="0"]');
  check(cell, 'Spreadsheet cell A1 missing'); cell.textContent = 'V27 DRAFT'; cell.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'V27 DRAFT' }));
  modal = await move('.spreadsheet-modal', 1, 2); modal = await move('.spreadsheet-modal', -1, 0);
  check(modal.querySelector('.sheet-cell[data-row="0"][data-col="0"]').textContent === 'V27 DRAFT', 'Switching sheets discarded an unsaved cell');
  await close(modal, '#spreadsheet-cancel'); done('sheetPages', { fourthPage: true, draftPreserved: true });

  inspector.querySelector('[data-preview-kind="basic"]').click(); await wait(() => current('.prgm-preview-modal'), 'grouped Prgm');
  modal = current('.prgm-preview-modal'); modal.querySelector('[data-expand]').click();
  check(modal.classList.contains('expanded'), 'Prgm expanded mode failed'); modal = await move('.prgm-preview-modal', 1, 2);
  check(modal.classList.contains('expanded'), 'Prgm page change lost expanded mode');
  await close(modal, '[data-close]'); done('programPages', { fourthPage: true, expandedPreserved: true });

  inspector.querySelector('[data-preview-kind="lua"]').click(); await wait(() => current('.love-preview-modal'), 'Lua Love preview');
  modal = current('.love-preview-modal'); await wait(() => modal.dataset.previewReady === 'true', 'Lua runtime');
  modal.querySelector('#love-preview-size-toggle').click(); await pause(80);
  check(modal.classList.contains('document-preview-expanded'), 'Lua expanded mode failed');
  modal = await move('.love-preview-modal', 1, 2);
  check(modal.classList.contains('document-preview-expanded'), 'Lua page change lost expanded mode');
  check(modal.querySelector('#love-preview-size-toggle').getAttribute('aria-pressed') === 'true', 'Lua expanded toggle state is stale');
  await close(modal, '#love-preview-close-top'); done('luaPages', { fourthPage: true, expandedPreserved: true });

  inspector.querySelector('[data-preview-kind="images"]').click(); await wait(() => current('.image-resource-modal'), 'image preview');
  modal = await move('.image-resource-modal', 1, 2); check(modal.querySelector('canvas,img'), 'Changed image preview has no bitmap');
  await close(modal, '#image-close'); done('imagePages', { fourthPage: true });

  for (const kind of ['graphs', 'calculators']) {
    inspector.querySelector('[data-preview-kind="' + kind + '"]').click(); await wait(() => current('.love-preview-modal'), kind + ' preview');
    modal = current('.love-preview-modal'); await wait(() => modal.dataset.previewReady === 'true', kind + ' runtime');
    check(kind === 'graphs' ? modal.querySelector('#love-graph-formula') : modal.querySelector('#love-calculator-save'), 'Wrong preview for ' + kind);
    check(nav(modal)?.querySelectorAll('.document-preview-tab').length === 2, 'Two ' + kind + ' pages were not grouped');
    if (kind === 'graphs') {
      const input = modal.querySelector('#love-graph-formula'); input.value = 'x^2+3'; input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      const part = modal.querySelector('[data-editor-part="slot:0"][contenteditable]'); check(part, 'Calculator composer missing');
      part.textContent = '2+3'; part.dispatchEvent(new InputEvent('input', { bubbles: true }));
      modal.querySelector('.preview-controls [data-key="return"]').click();
      const nextPart = modal.querySelector('[data-editor-part="slot:0"][contenteditable]'); nextPart.textContent = '7+8'; nextPart.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    const old = modal, second = nav(modal).querySelectorAll('.document-preview-tab')[1]; second.click(); second.click();
    await wait(() => !old.isConnected && current('.love-preview-modal')?.dataset.previewReady === 'true', kind + ' rapid selection'); await pause(350);
    check([...document.querySelectorAll('.love-preview-modal')].filter(el => !el.closest('.closing')).length === 1, 'Rapid page clicks stacked previews');
    modal = await move('.love-preview-modal', 0, 0);
    if (kind === 'graphs') check(modal.querySelector('#love-graph-formula').value === 'x^2+3', 'Graph page switch lost draft');
    else {
      check(modal.querySelector('[data-editor-part="slot:0"][contenteditable]').textContent === '7+8', 'Calculator page switch lost composer draft');
      check(modal.querySelector('#love-preview-log').textContent.includes('1 entradas'), 'Calculator page switch lost evaluated history');
    }
    await close(modal, '#love-preview-close-top');
    done(kind + 'Pages', { secondPage: true, correctPreview: true, draftPreserved: true, rapidSelection: true });
  }
  inspector.querySelector('[data-preview-kind="python"]').click(); await wait(() => current('.py-preview-modal'), 'Python preview');
  modal = current('.py-preview-modal'); await wait(() => !modal.querySelector('#py-preview-run').disabled, 'Python execution');
  modal = await move('.py-preview-modal', 0, 1); await wait(() => !modal.querySelector('#py-preview-run').disabled, 'second Python execution');
  await close(modal, '#py-preview-close'); done('pythonPages', { secondPage: true });
  await close(inspector, '#inspector-close');

  const program = xmlDoctor.candidates.find(item => item.document_type === 'Prgm'); selectXmlProgram(program.index);
  const edit = document.querySelector('#xml-edit-menu'), preview = document.querySelector('#xml-prgm-preview-btn');
  check(edit.nextElementSibling === preview, 'Prgm Preview is not immediately after Edit');
  check(getComputedStyle(preview).backgroundImage === getComputedStyle(edit.querySelector('.menu-trigger')).backgroundImage, 'Prgm Preview does not use the Edit green');
  renderXmlAnalysis({ errors: 1, warnings: 0, infos: 0, diagnostics: [{ severity: 'ERROR', code: 1, line: 1, message: 'layout smoke' }] });
  xmlLog('XML STRESS LINE\n'.repeat(500)); await pause(100);
  const terminal = document.querySelector('[data-terminal-for="xml-log"]'), log = document.querySelector('#xml-log');
  check(Math.round(terminal.getBoundingClientRect().height) === 320, 'XML log grew with its contents', terminal.getBoundingClientRect().height);
  check(log.clientHeight > 100 && log.scrollHeight > log.clientHeight, 'XML log is not internally scrollable');
  done('toolbarAndConsole', { previewNextToEdit: true, matchingGreen: true, fixedHeight: 320, scrollHeight: log.scrollHeight, viewport: log.clientHeight });
  return { ok: true, checks };
}
