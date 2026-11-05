/* Real Chromium layout regression for grouped document previews.
   Run with Electron; no public API calls or visitor-counter traffic are allowed.
   Optional TNS_SMOKE_WEB_ROOT, TNS_SMOKE_DESKTOP_ROOT, TNS_SMOKE_VENDOR,
   TNS_SMOKE_REPORT select a source tree, offline runtime, and report location. */
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.env.TNS_SMOKE_WEB_ROOT || path.join(__dirname, '..'));
const desktop = path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT || path.join(root, 'desktop'));
const vendor = path.resolve(process.env.TNS_SMOKE_VENDOR || path.join(desktop, 'vendor'));
const reportPath = path.resolve(process.env.TNS_SMOKE_REPORT || path.join(root, 'release', 'qa', 'preview-layout-v29.json'));
const { makeServer, listen } = require(path.join(desktop, 'server.cjs'));
const matrix = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'compact', width: 900, height: 700 },
  { name: 'mobile', width: 390, height: 844 },
];
let server, win;
const report = { ok: false, fixture: null, cases: [], errors: [] };
const timed = (promise, label, ms = 90000) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(Error(label + ' timed out')), ms))]);
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  server = makeServer(root, vendor);
  const origin = await listen(server);
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, done) => done({ cancel: !details.url.startsWith(origin) }));
  win = new BrowserWindow({ show: false, width: 1440, height: 900, webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, offscreen: true } });
  win.webContents.on('console-message', (_event, level, message) => fs.appendFileSync(reportPath + '.console.log', `${level}: ${message}\n`));
  await timed(win.loadURL(origin), 'Initial navigation', 45000);
  report.fixture = await timed(win.webContents.executeJavaScript(`(${installFixture.toString()})()`), 'Offline fixture');
  for (const viewport of matrix) {
    win.setContentSize(viewport.width, viewport.height);
    for (const expanded of [false, true]) {
      const result = await timed(win.webContents.executeJavaScript(`window.__v29Layout.runCase(${JSON.stringify({ ...viewport, expanded })})`), viewport.name + (expanded ? ' expanded' : ' normal'));
      report.cases.push(result);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      fs.writeFileSync(reportPath + `.${viewport.name}-${expanded ? 'expanded' : 'normal'}.png`, (await win.webContents.capturePage()).toPNG());
    }
  }
  report.final = await win.webContents.executeJavaScript('window.__v29Layout.finish()');
  report.rawLua = [];
  for (const viewport of matrix) {
    win.setContentSize(viewport.width, viewport.height);
    for (const expanded of [false, true]) {
      const reference = report.cases.find(item => item.name === viewport.name && item.expanded === expanded).samples[0];
      const result = await timed(win.webContents.executeJavaScript(`window.__v29Layout.runRawLuaCase(${JSON.stringify({ ...viewport, expanded, reference })})`), 'Raw Lua ' + viewport.name);
      report.rawLua.push(result);
    }
  }
  report.rawLuaPendingClose = await win.webContents.executeJavaScript('window.__v29Layout.closePendingRawLua()');
  win.setContentSize(1440, 900);
  report.unsupported = await win.webContents.executeJavaScript(`window.__v29Layout.runUnsupported(${JSON.stringify(report.cases.find(item => item.name === 'desktop' && !item.expanded).samples[0])})`);
  report.ok = report.cases.every(item => item.ok) && report.final.ok && report.rawLua.every(item => item.ok) && report.rawLuaPendingClose.ok && report.unsupported.ok;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, groupedCases: report.cases.length, rawLuaCases: report.rawLua.length, pendingClose: report.rawLuaPendingClose.ok, unsupported: report.unsupported.ok, reportPath }));
  win.destroy(); server.close(); app.exit(report.ok ? 0 : 1);
}).catch(async error => {
  report.errors.push(error.stack || String(error));
  if (win && !win.isDestroyed()) {
    report.renderer = await timed(win.webContents.executeJavaScript('({progress:window.__v29LayoutProgress,xmlLog:document.querySelector("#xml-log")?.textContent})'), 'Failure diagnostics', 3000).catch(() => ({ unresponsive: true }));
    fs.writeFileSync(reportPath + '.failure.png', (await win.webContents.capturePage()).toPNG());
    win.destroy();
  }
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.error(error); server?.close(); app.exit(1);
});

async function installFixture() {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (predicate, label, timeout = 30000) => { const end = Date.now() + timeout; while (!predicate()) { if (Date.now() > end) throw Error('Timed out: ' + label); await pause(30); } };
  const must = (condition, message) => { if (!condition) throw Error(message); };
  const visible = element => Boolean(element?.isConnected && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).display !== 'none');
  const shown = (scope, selector) => [...scope.querySelectorAll(selector)].find(visible);
  window.__v29LayoutProgress = { step: 'offline runtime' };
  await wait(() => window.TnsDocumentPreviewNavigation && window.TnsPrgmPreview && typeof pyodide !== 'undefined' && pyodide && !document.querySelector('#xml-toggle-btn').disabled && !document.querySelector('#startup-loader'), 'offline app');
  applyLanguage('en');
  if (document.querySelector('#xml-doctor-panel').classList.contains('collapsed')) document.querySelector('#xml-toggle-btn').click();
  await ensureXmlProjectForPageCreation();
  let programFinished = false;
  const program = Promise.resolve(addProgramEditorToStage()).then(value => { programFinished = true; return value; });
  await wait(() => programFinished || shown(document, '#xpe-apply'), 'ProgramEditor settings');
  shown(document, '#xpe-apply')?.click(); await program;
  await addLuaScriptAppToStage(); await addNotepadWidgetToStage();
  const bitmap = document.createElement('canvas'); bitmap.width = 1009; bitmap.height = 310;
  const ctx = bitmap.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1009, 310); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 20, 20); ctx.fillStyle = '#00ff00'; ctx.fillRect(909, 210, 100, 100);
  const addImage = addImageWidgetToStage.__tnsImportProgressOriginal || addImageWidgetToStage;
  await addImage(new File([encodeCanvasToTiRgb565Bmp(bitmap)], 'v29-layout.bmp', { type: 'image/bmp' }));
  await addGraphWidgetToStage();
  const calculator = await addCalculatorWidgetToStage(); await saveCalculatorWidgetToStage(calculator, [await calculateScratchpadRow('29+7')]);
  await addSpreadsheetWidgetToStage(); await addPythonEditorToStage();
  await scanXmlPrograms();
  const data = await inspectXmlDocument(), groups = window.TnsDocumentPreviewNavigation.groups(data.items);
  const pages = documentWidgetPreviewPages(data.items, groups);
  groups.widgets = pages;
  const kinds = ['basic', 'lua', 'notes', 'images', 'graphs', 'calculators', 'sheets', 'python'];
  const targets = kinds.map(kind => ({ kind, index: pages.findIndex(page => page.previewKind === kind) }));
  must(targets.every(target => target.index >= 0), 'Fixture does not contain all eight app kinds');
  must(pages.length === 8, 'Fixture includes internal widgets: ' + pages.map(page => page.name).join(', '));
  await openDocumentInspector();
  const inspector = shown(document, '.inspector-modal');
  inspector.querySelector('[data-preview-kind="widgets"]').click();
  await wait(() => shown(document, '.prgm-preview-modal'), 'initial Widgets preview');
  const backdrop = shown(document, '.prgm-preview-modal').parentElement;
  const originalOverflow = backdrop.__documentPreviewRestore ? '' : document.body.style.overflow;
  let selected = 0;
  const drafted = new Set();
  const errors = [];
  const recordError = (errorsForCase, condition, message, details) => { if (!condition) errorsForCase.push({ message, details }); };
  const modal = () => backdrop.firstElementChild;
  const ready = element => element && (element.matches('.love-preview-modal,.image-resource-modal') ? element.dataset.previewReady === 'true' : element.matches('.py-preview-modal') ? !element.querySelector('#py-preview-run')?.disabled : true);
  const nav = element => shown(element, '.document-preview-tabs');
  const select = async target => {
    if (selected === target) { await wait(() => ready(modal()), 'current runtime ready'); return modal(); }
    const old = modal();
    let start = window.TnsDocumentPreviewNavigation.windowFor(pages.length, selected).start;
    while (target < start || target >= start + 3) {
      const direction = target < start ? -1 : 1;
      const arrow = nav(old)?.querySelector('[aria-label="' + (direction > 0 ? 'Next pages' : 'Previous pages') + '"]');
      must(arrow && !arrow.disabled, 'Navigation arrow unavailable for page ' + target); arrow.click(); start += direction;
    }
    const button = nav(old).querySelectorAll('.document-preview-tab')[target - start];
    must(button, 'Widget page tab is absent');
    button.click(); button.click();
    await wait(() => !old.isConnected && ready(modal()), 'Widget page ' + target);
    selected = target; await pause(60); return modal();
  };
  const expandControl = element => shown(element, '[data-preview-window-expand],[data-document-preview-expand],[data-preview-expand],[data-expand],#love-preview-size-toggle,#image-expand');
  const setExpanded = async expanded => {
    const control = expandControl(modal());
    must(control, 'Expanded toggle is missing for ' + pages[selected].previewKind);
    const pressed = control.getAttribute('aria-pressed') === 'true';
    if (pressed !== expanded) control.click();
    await pause(100);
    must(control.getAttribute('aria-pressed') === String(expanded), 'Expanded state failed for ' + pages[selected].previewKind);
  };
  const rect = element => { const r = element.getBoundingClientRect(); return Object.fromEntries(['left', 'top', 'right', 'bottom', 'width', 'height'].map(key => [key, Math.round(r[key] * 100) / 100])); };
  const draft = (element, kind, caseErrors) => {
    let input, expected, read, write;
    if (kind === 'notes') { input = element.querySelector('#note-editor,.ti-note-rich-view'); expected = 'V29 UNSAVED NOTE'; read = () => input.value ?? input.textContent; write = () => { if ('value' in input) input.value = expected; else input.textContent = expected; }; }
    if (kind === 'sheets') { input = element.querySelector('.sheet-cell[data-row="0"][data-col="0"]'); expected = 'V29 UNSAVED CELL'; read = () => input.textContent; write = () => { input.textContent = expected; }; }
    if (kind === 'graphs') { input = element.querySelector('#love-graph-formula'); expected = 'x^2+29'; read = () => input.value; write = () => { input.value = expected; }; }
    if (kind === 'calculators') { input = element.querySelector('[data-editor-part="slot:0"][contenteditable]'); expected = '29+7'; read = () => input.textContent; write = () => { input.textContent = expected; }; }
    if (!expected) return;
    recordError(caseErrors, input, 'Draft input missing: ' + kind);
    if (!input) return;
    if (drafted.has(kind)) recordError(caseErrors, read() === expected, 'Switching discarded draft: ' + kind, { expected, actual: read() });
    else { write(); input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: expected })); drafted.add(kind); }
  };
  const controlsByKind = {
    basic: '[data-run],[data-copy],[data-close]', lua: '.preview-controls [data-key],#love-preview-close-top',
    notes: '#note-save,#note-cancel', images: '[data-pan],#image-calculator-toggle,#image-close',
    graphs: '#love-graph-formula,#love-graph-apply,#love-graph-save',
    calculators: '[data-editor-part="slot:0"],#love-calculator-save,#love-calculator-templates-toggle',
    sheets: '.sheet-cell[data-row="0"][data-col="0"],#spreadsheet-save,#spreadsheet-cancel',
    python: '#py-preview-run,#py-preview-restart,#py-preview-close',
  };
  const reachable = element => {
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = element.getBoundingClientRect(), x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
    const top = document.elementFromPoint(x, y);
    return { usable: r.width > 0 && r.height > 0 && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1 && (top === element || element.contains(top)), rect: rect(element), hit: top ? { tag: top.tagName, id: top.id, className: top.className } : null };
  };
  const resetScroll = element => { element.scrollTop = 0; element.scrollLeft = 0; for (const child of element.querySelectorAll('*')) if (child.scrollTop || child.scrollLeft) { child.scrollTop = 0; child.scrollLeft = 0; } };
  const measure = async (kind, caseErrors, expanded) => {
    const element = modal(); resetScroll(element); backdrop.scrollTop = 0; await pause(30);
    const chrome = shown(element, '.document-preview-chrome');
    const header = expanded ? shown(element, '.preview-window-header') : chrome;
    recordError(caseErrors, header, 'Shared header missing/hidden: ' + kind);
    recordError(caseErrors, expanded ? !chrome : Boolean(chrome), 'Calculator chrome visibility is inconsistent: ' + kind, { expanded, chromeVisible: Boolean(chrome) });
    const screen = shown(element, '.preview-window-stage') || chrome?.closest('.document-preview-display,.document-preview-screen,.prgm-preview-screen-shell,.prgm-preview-screen,.document-image-calculator,.note-calculator-shell,.spreadsheet-calc,.love-preview-stage,.py-calculator-shell') || chrome?.parentElement;
    const body = element.querySelector('.preview-window-body'), footer = element.querySelector('.preview-window-footer');
    const style = getComputedStyle(element), snapshot = { kind, modal: rect(element), screen: screen ? rect(screen) : null, header: header ? rect(header) : null,
      structure: { body: body ? { ...rect(body), clientHeight: body.clientHeight, clientWidth: body.clientWidth, scrollHeight: body.scrollHeight, scrollWidth: body.scrollWidth } : null, footer: footer ? rect(footer) : null },
      border: ['Top','Right','Bottom','Left'].map(side => [style['border' + side + 'Width'], style['border' + side + 'Style'], style['border' + side + 'Color']]),
      radii: ['borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius'].map(key => style[key]),
      expanded: expandControl(element)?.getAttribute('aria-pressed'), controls: [] };
    if (body && body.scrollWidth > body.clientWidth + 1) snapshot.overflowNodes = [...body.querySelectorAll('*')].map(node => ({ node, box: node.getBoundingClientRect() })).filter(({ box }) => box.width && (box.left < body.getBoundingClientRect().left || box.right > body.getBoundingClientRect().right)).map(({ node }) => ({ tag: node.tagName, id: node.id, classes: node.className, rect: rect(node), width: getComputedStyle(node).width, minWidth: getComputedStyle(node).minWidth, whiteSpace: getComputedStyle(node).whiteSpace })).slice(0, 40);
    recordError(caseErrors, snapshot.border.every(([width, line, color]) => width === '1px' && line === 'solid' && color === 'rgb(48, 67, 93)'), 'Modal border mismatch: ' + kind, snapshot.border);
    recordError(caseErrors, snapshot.radii.every(value => value === '20px'), 'Modal corner mismatch: ' + kind, snapshot.radii);
    recordError(caseErrors, !body || body.scrollWidth - body.clientWidth <= 1, 'Preview body has horizontal overflow: ' + kind, snapshot.structure.body);
    recordError(caseErrors, backdrop.isConnected && !backdrop.classList.contains('closing') && element.parentElement === backdrop, 'Persistent preview shell replaced/faded: ' + kind);
    recordError(caseErrors, nav(element)?.querySelectorAll('.document-preview-tab').length <= 3, 'Too many visible tabs: ' + kind);
    recordError(caseErrors, snapshot.modal.left >= -1 && snapshot.modal.right <= innerWidth + 1 && snapshot.modal.top >= -1 && snapshot.modal.bottom <= innerHeight + 1, 'Modal extends outside viewport: ' + kind, snapshot.modal);
    if (kind === 'calculators') {
      const canvas = element.querySelector('#love-preview-canvas'), pixels = canvas.getContext('2d').getImageData(0, 0, Math.min(180, canvas.width), Math.min(70, canvas.height)).data;
      let dark = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 200 && pixels[i] < 150 && pixels[i + 1] < 150 && pixels[i + 2] < 150) dark++;
      snapshot.calculatorHistoryDarkPixels = dark;
      recordError(caseErrors, dark > 20, 'Calculator history canvas cleared after resize/navigation', dark);
    }
    if (snapshot.screen) {
      recordError(caseErrors, snapshot.screen.left >= snapshot.modal.left && snapshot.screen.right <= snapshot.modal.right && snapshot.screen.top >= snapshot.modal.top && snapshot.screen.bottom <= snapshot.modal.bottom, 'Calculator screen extends outside modal: ' + kind, snapshot.screen);
      recordError(caseErrors, Math.abs(snapshot.screen.left + snapshot.screen.width / 2 - snapshot.modal.left - snapshot.modal.width / 2) <= 1, 'Calculator display is not centered in common shell: ' + kind, { modal: snapshot.modal, screen: snapshot.screen });
    }
    const usableControls = [...element.querySelectorAll(controlsByKind[kind])].filter(visible).filter(control => !control.disabled).slice(0, 5);
    recordError(caseErrors, usableControls.length > 0, 'App controls are missing: ' + kind);
    for (const control of usableControls) {
      const access = reachable(control); snapshot.controls.push({ selector: control.id || control.dataset.pan || control.dataset.key || control.tagName, ...access });
      recordError(caseErrors, access.usable, 'Control is clipped or obscured: ' + kind, snapshot.controls.at(-1));
    }
    resetScroll(element); backdrop.scrollTop = 0;
    draft(element, kind, caseErrors);
    return snapshot;
  };
  window.__v29Layout = {
    async runRawLuaCase(config) {
      const source = 'counter=0\nfunction on.paint(gc) gc:setColorRGB(255,255,255) gc:fillRect(0,0,platform.window:width(),platform.window:height()) gc:setColorRGB(0,0,0) gc:drawString("V29 RAW LUA "..counter,8,8,"top") end\nfunction on.enterKey() counter=counter+1 platform.window:invalidate() end';
      await showLuaPreview(source);
      const element = shown(document, '.lua-preview-modal'), rawBackdrop = element.parentElement, caseErrors = [];
      const toggle = element.querySelector('[data-preview-window-expand]');
      if (config.expanded) toggle.click();
      await pause(350); resetScroll(element); rawBackdrop.scrollTop = 0; await pause(30);
      const stage = element.querySelector('.preview-window-stage'), canvas = element.querySelector('#lua-preview-canvas');
      const sample = { modal: rect(element), screen: rect(stage), canvas: { ...rect(canvas), backingWidth: canvas.width, backingHeight: canvas.height }, backdrop: { ...rect(rawBackdrop), clientWidth: rawBackdrop.clientWidth, clientHeight: rawBackdrop.clientHeight, scrollWidth: rawBackdrop.scrollWidth, scrollHeight: rawBackdrop.scrollHeight, overflow: getComputedStyle(rawBackdrop).overflow, bodyOverflow: document.body.style.overflow } };
      for (const part of ['modal', 'screen']) for (const key of ['left', 'top', 'width', 'height']) recordError(caseErrors, Math.abs(sample[part][key] - config.reference[part][key]) <= 1, 'Raw Lua position differs: ' + part + '.' + key, { actual: sample[part], expected: config.reference[part] });
      recordError(caseErrors, canvas.width === Math.round(sample.screen.width) && canvas.height === Math.round(sample.screen.height) - (config.expanded ? 0 : 26), 'Raw Lua backing canvas does not match display', sample);
      recordError(caseErrors, getComputedStyle(element).borderRadius === '20px' && getComputedStyle(element).borderTopColor === 'rgb(48, 67, 93)', 'Raw Lua border mismatch');
      const oldCopy = copyPlainText; let copied = '';
      copyPlainText = async value => { copied = value; };
      try {
        const enter = element.querySelector('[data-event="on.enterKey"]'); enter.click(); await pause(60);
        element.querySelector('#lua-preview-copy-content').click(); await pause(30);
        recordError(caseErrors, copied.includes('V29 RAW LUA 1'), 'Raw Lua enter/copy handler did not paint current content', copied);
        element.querySelector('#lua-preview-copy-log').click(); await pause(30);
        recordError(caseErrors, copied.includes('copied') || copied.includes('Copied'), 'Raw Lua copy log handler failed', copied);
      } finally { copyPlainText = oldCopy; }
      for (const control of element.querySelectorAll('[data-preview-window-expand],#lua-preview-close,.preview-controls button,#lua-preview-copy-content,#lua-preview-copy-log')) recordError(caseErrors, reachable(control).usable, 'Raw Lua control clipped', { id: control.id, event: control.dataset.event, access: reachable(control) });
      element.querySelector('#lua-preview-close').click(); await wait(() => !rawBackdrop.isConnected, 'raw Lua close');
      return { ...config, reference: undefined, sample, ok: !caseErrors.length, errors: caseErrors };
    },
    async closePendingRawLua() {
      const pending = showLuaPreview('function on.paint(gc) gc:drawString("pending",0,0) end');
      const element = shown(document, '.lua-preview-modal'), rawBackdrop = element.parentElement;
      element.querySelector('#lua-preview-close').click(); await pending; await wait(() => !rawBackdrop.isConnected, 'pending Lua close');
      return { ok: !rawBackdrop.isConnected };
    },
    async runUnsupported(reference) {
      await openDocumentAppPreview({ widgets: [{ name: 'Unsupported QA Widget', previewKind: 'unsupported' }] }, 'widgets');
      const element = shown(document, '.widget-preview-modal'), rawBackdrop = element.parentElement, caseErrors = [];
      await pause(350); const sample = { modal: rect(element), screen: rect(element.querySelector('.preview-window-stage')) };
      for (const part of ['modal', 'screen']) for (const key of ['left', 'top', 'width', 'height']) recordError(caseErrors, Math.abs(sample[part][key] - reference[part][key]) <= 1, 'Unsupported app position differs: ' + part + '.' + key, sample);
      recordError(caseErrors, element.querySelector('.widget-preview-unavailable')?.textContent.includes('not available'), 'Unsupported app does not explain preview limitation');
      element.querySelector('[data-widget-close]').click(); await wait(() => !rawBackdrop.isConnected, 'unsupported app close');
      return { sample, ok: !caseErrors.length, errors: caseErrors };
    },
    async runCase(config) {
      window.__v29LayoutProgress = { ...config, step: 'start' };
      const caseErrors = [], samples = [];
      await select(0); await setExpanded(config.expanded);
      for (const { kind, index } of targets) {
        window.__v29LayoutProgress = { ...config, step: kind };
        await select(index);
        recordError(caseErrors, expandControl(modal())?.getAttribute('aria-pressed') === String(config.expanded), 'Cross-app navigation discarded expanded mode: ' + kind, { expected: config.expanded, actual: expandControl(modal())?.getAttribute('aria-pressed') });
        await setExpanded(config.expanded); await pause(60);
        samples.push(await measure(kind, caseErrors, config.expanded));
      }
      const spread = {};
      for (const part of ['modal', 'screen', 'header']) {
        spread[part] = {};
        for (const key of ['left', 'top', 'width', 'height']) {
          const values = samples.filter(sample => sample[part]).map(sample => sample[part][key]);
          spread[part][key] = values.length ? Math.round((Math.max(...values) - Math.min(...values)) * 100) / 100 : null;
          recordError(caseErrors, values.length === kinds.length && spread[part][key] <= 1, 'Position/size drift: ' + part + '.' + key, samples.map(sample => ({ kind: sample.kind, value: sample[part]?.[key] })));
        }
      }
      const horizontalOverflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth;
      recordError(caseErrors, horizontalOverflow <= 1, 'Document has horizontal overflow', horizontalOverflow);
      if (!config.expanded) for (const sample of samples) recordError(caseErrors, sample.screen && (innerWidth < 600 ? sample.screen.width > 0 && sample.screen.width <= 320 : Math.abs(sample.screen.width - 320) <= 1) && Math.abs(sample.screen.height - 240) <= 1, 'Normal calculator size is not 320x240 or compact shared width: ' + sample.kind, sample.screen);
      errors.push(...caseErrors);
      console.log('LAYOUT: ' + config.name + ' ' + (config.expanded ? 'expanded' : 'normal') + ' errors=' + caseErrors.length);
      return { ...config, viewport: { width: innerWidth, height: innerHeight }, ok: !caseErrors.length, spread, horizontalOverflow, samples, errors: caseErrors };
    },
    async finish() {
      const draftErrors = [];
      for (const target of targets.filter(target => drafted.has(target.kind))) { await select(target.index); draft(modal(), target.kind, draftErrors); }
      const close = shown(modal(), '.document-preview-chrome-close,[data-close],#love-preview-close-top,#note-cancel,#image-close,#spreadsheet-cancel,#py-preview-close');
      must(close, 'Final close button missing'); close.click(); await wait(() => !backdrop.isConnected, 'final close');
      const bodyOverflowRestored = document.body.style.overflow === originalOverflow;
      return { ok: !errors.length && !draftErrors.length && bodyOverflowRestored, draftsPreserved: [...drafted], errors: draftErrors, bodyOverflowRestored };
    },
  };
  return { pages: pages.length, kinds: targets, externalNetworkBlocked: true };
}
