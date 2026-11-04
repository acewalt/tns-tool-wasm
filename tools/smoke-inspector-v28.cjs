/* Integration smoke: run with Electron. Uses real Pyodide/TNS stage creation.
   Optional TNS_SMOKE_WEB_ROOT, TNS_SMOKE_DESKTOP_ROOT, TNS_SMOKE_VENDOR,
   TNS_SMOKE_REPORT paths select a source tree and an existing offline runtime. */
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.env.TNS_SMOKE_WEB_ROOT || path.join(__dirname, '..'));
const desktop = path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT || path.join(root, 'desktop'));
const vendor = path.resolve(process.env.TNS_SMOKE_VENDOR || path.join(desktop, 'vendor'));
const reportPath = path.resolve(process.env.TNS_SMOKE_REPORT || path.join(root, 'release', 'qa', 'inspector-v28.json'));
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
  const checks = win && !win.isDestroyed() ? await Promise.race([win.webContents.executeJavaScript('({checks:window.__v28SmokeResults||[],xmlLog:document.querySelector("#xml-log")?.textContent,body:document.body.className,runtimeStatus:document.querySelector("#runtime-status")?.textContent,xmlDisabled:document.querySelector("#xml-toggle-btn")?.disabled})').catch(() => null),new Promise(resolve=>setTimeout(()=>resolve({rendererUnresponsive:true}),3000))]) : null;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ ok: false, error: error.stack || String(error), ...checks }, null, 2));
  if (win && !win.isDestroyed()) { fs.writeFileSync(reportPath + '.failure.png', (await win.webContents.capturePage()).toPNG()); win.destroy(); }
  console.error(error); server?.close(); app.exit(1);
});

async function run() {
  const checks = window.__v28SmokeResults = [];
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
  const backdropOf = modal => modal.closest('.modal-backdrop,.prgm-preview-overlay');
  const chromeCheck = (modal, kind) => {
    const bar = [...modal.querySelectorAll('.document-preview-chrome')].find(el => el.getClientRects().length > 0);
    check(bar, 'Shared calculator header missing: ' + kind);
    const title = bar.querySelector('[data-preview-document]'), rect = bar.getBoundingClientRect(), titleRect = title.getBoundingClientRect();
    check(title.textContent === documentPreviewDocumentName(), 'Header displays the app label instead of document name: ' + kind, title.textContent);
    check(Math.abs(titleRect.left + titleRect.width / 2 - rect.left - rect.width / 2) < 1, 'Header title is not globally centered: ' + kind);
    check(/^(RAD|DEG)$/.test(bar.querySelector('[data-preview-mode]')?.textContent), 'Header angle mode missing: ' + kind);
    check(bar.querySelector('.document-preview-chrome-battery'), 'Header battery missing: ' + kind);
    check(!bar.querySelector('.document-preview-chrome-close')?.disabled, 'Header close button disabled: ' + kind);
    const style = getComputedStyle(bar);
    check(style.borderBottomWidth === '1px' && style.borderBottomColor === 'rgb(103, 206, 230)', 'Header cyan rule missing: ' + kind, [style.borderBottomWidth, style.borderBottomColor]);
    check(Math.round(parseFloat(style.height)) === 26, 'Header changed calculator height: ' + kind, style.height);
    return { kind, title: title.textContent, height: rect.height, cyanRule: true, centered: true };
  };
  const close = async (modal, selector) => { modal.querySelector(selector).click(); await wait(() => !modal.isConnected, 'close ' + selector); };
  const move = async (selector, direction, indexInWindow) => {
    const old = current(selector), backdrop = backdropOf(old), tabs = nav(old);
    check(tabs, 'Page navigation is missing in ' + selector);
    check(tabs.querySelectorAll('.document-preview-tab').length <= 3, 'More than three pages are visible');
    if (direction) { const arrow = tabs.querySelector('[aria-label="' + (direction > 0 ? 'Next pages' : 'Previous pages') + '"]'); check(arrow && !arrow.disabled, 'Page arrow unavailable'); arrow.click(); }
    const buttons = nav(old).querySelectorAll('.document-preview-tab');
    check(buttons[indexInWindow], 'Requested visible tab is missing');
    const label = buttons[indexInWindow].textContent; buttons[indexInWindow].click();
    check(backdrop.isConnected && !backdrop.classList.contains('closing'), 'Page selection detached/faded its backdrop');
    await wait(() => current(selector) && current(selector) !== old, 'change page ' + label);
    await wait(() => !old.isConnected, 'old page closed');
    const next = current(selector);
    check(backdropOf(next) === backdrop, 'Page selection replaced its outer backdrop');
    check(getComputedStyle(backdrop).animationName === 'none' && getComputedStyle(next).animationName === 'none', 'Page selection replayed an entrance animation');
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
  check(nav(current('.prgm-preview-modal')).querySelectorAll('.document-preview-tab').length === 1, 'A single actual Prgm page is not shown');
  chromeCheck(current('.prgm-preview-modal'), 'single Prgm');
  await close(current('.prgm-preview-modal'), '.document-preview-chrome-close');
  await close(inspector, '#inspector-close');
  done('singleProgramInspector', { hiddenZeros: true, basicProgramEditor: true, oneActualTab: true, faithfulChrome: true });

  for (let i = 0; i < 3; i++) await addProgram();
  for (let i = 0; i < 4; i++) { await addNotepadWidgetToStage(); await addSpreadsheetWidgetToStage(); await addLuaScriptAppToStage(); }
  for (let i = 0; i < 2; i++) { await addGraphWidgetToStage(); await addPythonEditorToStage(); await addCalculatorWidgetToStage(); }
  const bitmap = document.createElement('canvas'); bitmap.width = 1009; bitmap.height = 310;
  const imageCtx = bitmap.getContext('2d'); imageCtx.fillStyle = '#ffffff'; imageCtx.fillRect(0,0,1009,310); imageCtx.fillStyle = '#ff0000'; imageCtx.fillRect(0,0,20,20); imageCtx.fillStyle = '#0000ff'; imageCtx.fillRect(40,0,4,310); imageCtx.fillStyle = '#00ff00'; imageCtx.fillRect(909,210,100,100);
  const bmpBytes = encodeCanvasToTiRgb565Bmp(bitmap);
  // Create fixture data through the core stage API; the import UI's completion
  // callback intentionally opens its own image viewer and is outside this test.
  const addImage = addImageWidgetToStage.__tnsImportProgressOriginal || addImageWidgetToStage;
  for (let i = 0; i < 4; i++) await addImage(new File([bmpBytes], 'v28-image-' + i + '.bmp', { type: 'image/bmp' }));
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
  check(inspector.querySelector('.inspector-summary')?.firstElementChild?.dataset.previewKind === 'widgets', 'Widgets is not the first grouped green preview action');
  check(summary.every(text => !/:\s*0$/.test(text)), 'Inspector displayed a zero count after page creation');
  for (const kind of ['notes', 'sheets', 'lua', 'basic', 'images', 'graphs', 'python', 'calculators']) check(inspector.querySelector('[data-preview-kind="' + kind + '"]'), 'Missing preview summary button: ' + kind);
  done('groupedInspector', { summary });

  inspector.querySelector('[data-preview-kind="notes"]').click(); await wait(() => current('.note-page-modal'), 'notes preview');
  let modal = current('.note-page-modal');
  chromeCheck(modal, 'Notes');
  const noteEditor = modal.querySelector('#note-editor,.ti-note-rich-view');
  if ('value' in noteEditor) noteEditor.value = 'UNSAVED V27 NOTE';
  else { modal.querySelector('#note-edit-view')?.click(); const paragraph = document.createElement('p'), bold = document.createElement('strong'); bold.textContent = 'UNSAVED V27 NOTE'; paragraph.append(bold); noteEditor.replaceChildren(paragraph); noteEditor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'UNSAVED V27 NOTE' })); }
  modal = await move('.note-page-modal', 1, 2); modal = await move('.note-page-modal', -1, 0);
  const restoredNote = modal.querySelector('#note-editor,.ti-note-rich-view');
  check((restoredNote.value ?? restoredNote.textContent) === 'UNSAVED V27 NOTE', 'Switching notes discarded an unsaved draft');
  if (restoredNote.classList.contains('ti-note-rich-view')) check(restoredNote.querySelector('strong'), 'Switching notes discarded rich formatting');
  await close(modal, '.document-preview-chrome-close'); done('notesPages', { fourthPage: true, draftPreserved: true, maxVisible: 3, persistentBackdrop: true, noEntranceReplay: true, faithfulChrome: true });

  inspector.querySelector('[data-preview-kind="sheets"]').click(); await wait(() => current('.spreadsheet-modal'), 'sheet preview');
  modal = current('.spreadsheet-modal'); const cell = modal.querySelector('.sheet-cell[data-row="0"][data-col="0"]');
  check(cell, 'Spreadsheet cell A1 missing'); cell.textContent = 'V27 DRAFT'; cell.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: 'V27 DRAFT' }));
  modal = await move('.spreadsheet-modal', 1, 2); modal = await move('.spreadsheet-modal', -1, 0);
  check(modal.querySelector('.sheet-cell[data-row="0"][data-col="0"]').textContent === 'V27 DRAFT', 'Switching sheets discarded an unsaved cell');
  await close(modal, '#spreadsheet-cancel'); done('sheetPages', { fourthPage: true, draftPreserved: true });

  inspector.querySelector('[data-preview-kind="basic"]').click(); await wait(() => current('.prgm-preview-modal'), 'grouped Prgm');
  modal = current('.prgm-preview-modal'); chromeCheck(modal, 'Prgm'); modal.querySelector('[data-expand]').click();
  check(modal.classList.contains('expanded'), 'Prgm expanded mode failed'); modal = await move('.prgm-preview-modal', 1, 2);
  check(modal.classList.contains('expanded'), 'Prgm page change lost expanded mode');
  await close(modal, '[data-close]'); done('programPages', { fourthPage: true, expandedPreserved: true });

  inspector.querySelector('[data-preview-kind="lua"]').click(); await wait(() => current('.love-preview-modal'), 'Lua Love preview');
  modal = current('.love-preview-modal'); await wait(() => modal.dataset.previewReady === 'true', 'Lua runtime');
  chromeCheck(modal, 'Lua');
  modal.querySelector('#love-preview-size-toggle').click(); await pause(80);
  check(modal.classList.contains('document-preview-expanded'), 'Lua expanded mode failed');
  modal = await move('.love-preview-modal', 1, 2);
  check(modal.classList.contains('document-preview-expanded'), 'Lua page change lost expanded mode');
  check(modal.querySelector('#love-preview-size-toggle').getAttribute('aria-pressed') === 'true', 'Lua expanded toggle state is stale');
  await close(modal, '#love-preview-close-top'); done('luaPages', { fourthPage: true, expandedPreserved: true });

  inspector.querySelector('[data-preview-kind="images"]').click(); await wait(() => current('.image-resource-modal'), 'image preview');
  modal = current('.image-resource-modal'); await wait(() => modal.dataset.previewReady === 'true', 'image bitmap'); await pause(300); chromeCheck(modal, 'Images');
  check(modal.querySelectorAll('.document-preview-chrome').length === 1 && modal.querySelectorAll('canvas').length === 1, 'Image preview has duplicate calculator frames');
  let imageCanvas = modal.querySelector('.image-calculator-canvas');
  check(imageCanvas.width === 320 && imageCanvas.height === 214, 'Image calculator viewport is not 320x214');
  check(imageCanvas.getContext('2d').getImageData(19,5,1,1).data[1] === 0, 'Native image was scaled before expansion');
  modal.querySelector('[data-pan="right"]').click(); check(Number(imageCanvas.dataset.viewX) > 0, 'Image pan did not move the native viewport');
  check(imageCanvas.getContext('2d').getImageData(19,5,1,1).data[1] > 200, 'Horizontal pan did not change source pixels');
  modal.querySelector('[data-image-home]').click(); modal.querySelector('[data-pan="down"]').click(); check(Number(imageCanvas.dataset.viewY) > 0, 'Vertical image pan did not move the native viewport');
  check(imageCanvas.getContext('2d').getImageData(19,5,1,1).data[1] > 200, 'Vertical pan did not change source pixels');
  modal.querySelector('[data-image-home]').click(); modal.querySelector('#image-expand').click();
  check(modal.classList.contains('document-image-expanded') && imageCanvas.width > 320 && imageCanvas.height > 214, 'Expanded image did not enlarge its viewport');
  check(imageCanvas.getContext('2d').getImageData(19,5,1,1).data[1] === 0, 'Expanded image stretched source pixels');
  check(Math.abs(imageCanvas.getBoundingClientRect().width-imageCanvas.width) < 1 && getComputedStyle(imageCanvas).transform === 'none', 'Expanded image scales the entire canvas');
  modal.querySelector('#image-calculator-toggle').click(); check(imageCanvas.dataset.imageView === 'fit', 'Image fit toggle failed');
  const scale = Math.min(imageCanvas.width / 1009, imageCanvas.height / 310, 1), drawnWidth = Math.round(1009 * scale), drawnHeight = Math.round(310 * scale);
  const fitPixel = imageCanvas.getContext('2d').getImageData(Math.floor((imageCanvas.width - drawnWidth) / 2 + 959 * scale), Math.floor((imageCanvas.height - drawnHeight) / 2 + 260 * scale), 1, 1).data;
  check(fitPixel[0] < 20 && fitPixel[1] > 220, 'Fit view did not reveal the whole image bottom-right marker');
  modal.querySelector('[data-image-home]').click(); modal.querySelector('[data-pan="right"]').click();
  modal = await move('.image-resource-modal', 1, 2); await wait(() => modal.dataset.previewReady === 'true', 'changed image');
  check(modal.classList.contains('document-image-expanded'), 'Image page switch discarded expanded mode');
  modal = await move('.image-resource-modal', -1, 0); await wait(() => modal.dataset.previewReady === 'true', 'restored image');
  check(Number(modal.querySelector('.image-calculator-canvas').dataset.viewX) > 0, 'Image page switch discarded native pan');
  await close(modal, '.document-preview-chrome-close'); done('imagePages', { fourthPage: true, oneHeader: true, faithfulChrome: true, viewport: '320x214', nativePixels: true, expandedViewport: true, panFit: true, panPreserved: true });

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

  const widgetPages = documentWidgetPreviewPages(data.items, groups), kindsSeen = new Set(), overflowBeforeWidgets = document.body.style.overflow;
  check(widgetPages.length === 26, 'Widgets included nested implementation controls instead of the 26 actual apps', widgetPages.map(page => ({ name: page.name, path: page.path })));
  check(widgetPages.every(page => page.previewKind !== 'unsupported'), 'Created fixture apps incorrectly use the unsupported-app fallback', widgetPages.filter(page => page.previewKind === 'unsupported'));
  inspector.querySelector('[data-preview-kind="widgets"]').click(); await wait(() => current('.prgm-preview-modal'), 'Widgets first page');
  const widgetBackdrop = backdropOf(current('.prgm-preview-modal'));
  let widgetSelected = 0, noteWidget = -1;
  const readyWidget = el => el && (el.classList.contains('love-preview-modal') || el.classList.contains('image-resource-modal') ? el.dataset.previewReady === 'true' : el.classList.contains('py-preview-modal') ? !el.querySelector('#py-preview-run')?.disabled : true);
  const selectWidget = async target => {
    const old = widgetBackdrop.firstElementChild;
    let start = window.TnsDocumentPreviewNavigation.windowFor(widgetPages.length, widgetSelected).start;
    while (target < start || target >= start + 3) {
      const direction = target < start ? -1 : 1;
      const arrow = nav(old).querySelector('[aria-label="' + (direction > 0 ? 'Next pages' : 'Previous pages') + '"]');
      check(!arrow.disabled, 'Widgets page arrow unavailable'); arrow.click(); start += direction;
    }
    const button = nav(old).querySelectorAll('.document-preview-tab')[target - start];
    check(button?.textContent === window.TnsDocumentPreviewNavigation.pageLabel(widgetPages[target], target), 'Widgets are not in actual document order', { target, label: button?.textContent });
    let exposed = false, raf;
    const inspectFrame = () => { if (!widgetBackdrop.isConnected || widgetBackdrop.classList.contains('closing') || Number(getComputedStyle(widgetBackdrop).opacity) < .99) exposed = true; raf = requestAnimationFrame(inspectFrame); };
    raf = requestAnimationFrame(inspectFrame); button.click(); if (target % 3 === 1) button.click();
    await wait(() => !old.isConnected && readyWidget(widgetBackdrop.firstElementChild), 'Widgets page ' + target);
    await pause(20); cancelAnimationFrame(raf);
    const next = widgetBackdrop.firstElementChild;
    check(backdropOf(next) === widgetBackdrop && widgetBackdrop.isConnected && !widgetBackdrop.classList.contains('closing'), 'Widgets switched to another/fading backdrop');
    check(!exposed, 'Widgets exposed the inspector during a rendered frame');
    check(getComputedStyle(widgetBackdrop).animationName === 'none' && getComputedStyle(next).animationName === 'none', 'Widgets replayed opening animation');
    check(nav(next).querySelectorAll('.document-preview-tab').length <= 3, 'Widgets show more than three tabs');
    widgetSelected = target; return next;
  };
  for (let index = 0; index < widgetPages.length; index++) {
    const page = widgetPages[index], kind = page.previewKind;
    modal = index ? await selectWidget(index) : widgetBackdrop.firstElementChild;
    await wait(() => readyWidget(modal), 'Widgets ready ' + kind);
    const correct = ({ basic: '.prgm-preview-modal', lua: '.love-preview-modal', notes: '.note-page-modal', sheets: '.spreadsheet-modal', images: '.image-resource-modal', graphs: '.love-preview-modal', calculators: '.love-preview-modal', python: '.py-preview-modal', unsupported: '.inspector-modal' })[kind];
    check(correct && modal.matches(correct), 'Widgets opened wrong app preview', { index, kind, className: modal.className });
    kindsSeen.add(kind);
    if (['basic', 'lua', 'notes', 'images'].includes(kind)) chromeCheck(modal, 'Widgets ' + kind);
    if (kind === 'notes' && noteWidget < 0) { noteWidget = index; const editor = modal.querySelector('#note-editor,.ti-note-rich-view'); if ('value' in editor) editor.value = 'WIDGETS V28 DRAFT'; else { editor.textContent = 'WIDGETS V28 DRAFT'; editor.dispatchEvent(new InputEvent('input', { bubbles: true })); } }
  }
  check(['basic', 'lua', 'notes', 'sheets', 'graphs', 'calculators', 'python', 'images'].every(kind => kindsSeen.has(kind)), 'Widgets did not reach every created app type', [...kindsSeen]);
  if (noteWidget >= 0 && noteWidget !== widgetSelected) modal = await selectWidget(noteWidget);
  const widgetDraft = modal.querySelector('#note-editor,.ti-note-rich-view');
  check((widgetDraft?.value ?? widgetDraft?.textContent) === 'WIDGETS V28 DRAFT', 'Cross-app Widgets navigation lost a Notes draft');
  await close(modal, '.document-preview-chrome-close');
  check(document.body.style.overflow === overflowBeforeWidgets, 'Closing a cross-app Prgm session did not restore page overflow');
  done('widgetsDocumentOrder', { pages: widgetPages.length, appKinds: [...kindsSeen], unsupportedWidgets: widgetPages.filter(page => page.previewKind === 'unsupported').map(page => ({ name: page.name, path: page.path, file: page.file })), persistentBackdrop: true, noRenderedInspectorFlash: true, noEntranceReplay: true, rapidOldTabClicks: true, notesDraftPreserved: true });
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
