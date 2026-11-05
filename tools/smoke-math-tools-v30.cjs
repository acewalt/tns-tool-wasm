/* Run with Electron against the offline desktop vendor directory.
   Uses actual menu clicks, editable document widgets and the shipped CAS path.
   No request to a public host is allowed, including visitor-counter traffic. */
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.env.TNS_SMOKE_WEB_ROOT || path.join(__dirname, '..'));
const desktop = path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT || path.join(root, '..', 'portable-0.1.27', 'desktop'));
const vendor = path.resolve(process.env.TNS_SMOKE_VENDOR || path.join(desktop, 'vendor'));
const reportPath = path.resolve(process.env.TNS_SMOKE_REPORT || path.join(root, 'release', 'qa', 'math-tools-v30.json'));
const { makeServer, listen } = require(path.join(desktop, 'server.cjs'));
const report = { ok: false, cases: [], errors: [], blockedPublicRequests: [] };
const timed = (promise, label, ms = 90000) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(Error(label + ' timed out')), ms))]);
let win, server;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  server = makeServer(root, vendor); const origin = await listen(server);
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, done) => {
    const external = !details.url.startsWith(origin); if (external) report.blockedPublicRequests.push(details.url.split('?')[0]); done({ cancel: external });
  });
  win = new BrowserWindow({ show: false, width: 1440, height: 1000, webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false, offscreen: true } });
  win.webContents.on('console-message', (_event, level, message) => fs.appendFileSync(reportPath + '.console.log', `${level}: ${message}\n`));
  await timed(win.loadURL(origin), 'Initial navigation', 45000);
  report.fixture = await timed(win.webContents.executeJavaScript(`(${installFixture.toString()})()`), 'Offline fixture');
  const steps = process.env.TNS_SMOKE_STEPS?.split(',').filter(Boolean) || ['programMenu', 'programActions', 'programFileActions', 'templateDimensions', 'catalogInsertion', 'mathematicalEditor', 'calculatorCommands', 'loveControls'];
  report.partial=Boolean(process.env.TNS_SMOKE_STEPS||process.env.TNS_SMOKE_SKIP_RESPONSIVE);report.steps=steps;
  for (const step of steps) {
    const result = await timed(win.webContents.executeJavaScript(`window.__v30Math.run(${JSON.stringify(step)})`), step, step === 'calculatorCommands' ? 120000 : 90000);
    report.cases.push(result); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    fs.writeFileSync(reportPath + '.' + step + '.png', (await win.webContents.capturePage()).toPNG());
    if(step==='mathematicalEditor'&&result.ok){
      report.mathViewCapture=await win.webContents.executeJavaScript('window.__v30Math.captureMathView(false)');fs.writeFileSync(reportPath+'.math-view-top.png',(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript('window.__v30Math.captureMathView(true)');fs.writeFileSync(reportPath+'.math-view-bottom.png',(await win.webContents.capturePage()).toPNG());
      await win.webContents.executeJavaScript('window.__v30Math.restoreSourceView()');
    }
  }
  report.responsive = [];
  for (const viewport of process.env.TNS_SMOKE_SKIP_RESPONSIVE?[]:[{ name: 'desktop-dark', width: 1440, height: 1000, theme: 'dark' }, { name: 'desktop-light', width: 1440, height: 1000, theme: 'light' }, { name: 'mobile-dark', width: 390, height: 844, theme: 'dark' }, { name: 'mobile-light', width: 390, height: 844, theme: 'light' }]) {
    win.setContentSize(viewport.width, viewport.height);
    const result = await timed(win.webContents.executeJavaScript(`window.__v30Math.responsive(${JSON.stringify(viewport)})`), viewport.name);
    report.responsive.push(result); fs.writeFileSync(reportPath + '.' + viewport.name + '.png', (await win.webContents.capturePage()).toPNG());
  }
  report.final = await win.webContents.executeJavaScript('window.__v30Math.finish()');
  report.ok = report.cases.every(item => item.ok) && report.responsive.every(item => item.ok) && report.final.ok;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, cases: report.cases.map(({ name, ok, error }) => ({ name, ok, error })), responsive: report.responsive.map(({ name, ok, error }) => ({ name, ok, error })), final: report.final, reportPath }));
  win.destroy(); server.close(); app.exit(report.ok ? 0 : 1);
}).catch(async error => {
  report.errors.push(error.stack || String(error));
  if (win && !win.isDestroyed()) {
    report.renderer = await timed(win.webContents.executeJavaScript('({progress:window.__v30MathProgress,xmlLog:document.querySelector("#xml-log")?.textContent})'), 'Failure diagnostics', 3000).catch(() => ({ unresponsive: true }));
    fs.writeFileSync(reportPath + '.failure.png', (await win.webContents.capturePage()).toPNG()); win.destroy();
  }
  fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.error(error); server?.close(); app.exit(1);
});

async function installFixture() {
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (condition, label, ms = 30000) => { const end = Date.now() + ms; while (!condition()) { if (Date.now() > end) throw Error('Timed out: ' + label); await pause(30); } };
  const must = (value, message) => { if (!value) throw Error(message); };
  const visible = element => Boolean(element?.isConnected && element.getClientRects().length && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden');
  const shown = (selector, scope = document) => [...scope.querySelectorAll(selector)].find(visible);
  const rect = element => { const box = element.getBoundingClientRect(); return Object.fromEntries(['left', 'top', 'right', 'bottom', 'width', 'height'].map(key => [key, Math.round(box[key] * 100) / 100])); };
  const bounds = element => { const box = rect(element); must(box.left >= -1 && box.right <= innerWidth + 1 && box.top >= -1 && box.bottom <= innerHeight + 1, 'Popup exceeds viewport: ' + JSON.stringify(box)); return box; };
  const progress = step => { window.__v30MathProgress = { step }; };
  const originalOverflow = document.body.style.overflow;
  progress('offline runtime');
  await wait(() => window.TnsProgramEditorTools && window.TnsMathTools && window.TnsMathEditor && window.TnsPrgmPreview && typeof pyodide !== 'undefined' && pyodide && !document.querySelector('#xml-toggle-btn').disabled && !document.querySelector('#startup-loader'), 'math tools and offline app');
  applyLanguage('en'); if (document.querySelector('#xml-doctor-panel').classList.contains('collapsed')) document.querySelector('#xml-toggle-btn').click();
  await ensureXmlProjectForPageCreation(); await addLuaScriptAppToStage();
  await pause(80); const luaOnlyHidden = !visible(document.querySelector('[data-program-editor-tools]'));
  const graph = await addGraphWidgetToStage(); await scanXmlPrograms();
  const graphCandidate = xmlDoctor.candidates.find(item => item.document_type === 'Func');
  if (graphCandidate) selectXmlProgram(graphCandidate.index);
  await pause(80); const graphFunctionHidden = !visible(document.querySelector('[data-program-editor-tools]'));
  let created = false; const create = Promise.resolve(addProgramEditorToStage()).then(value => { created = true; return value; });
  await wait(() => created || shown('#xpe-apply'), 'Program Editor creation'); shown('#xpe-apply')?.click(); await create;
  await scanXmlPrograms();
  let program = xmlDoctor.candidates.find(item => item.document_type === 'Prgm'); must(program, 'Actual Program Editor was not created');
  selectXmlProgram(program.index); await pause(120);
  const calculator = await addCalculatorWidgetToStage(); await scanXmlPrograms();
  program = xmlDoctor.candidates.find(item => item.program_name === program.program_name) || program; selectXmlProgram(program.index);
  const data = await inspectXmlDocument(), groups = window.TnsDocumentPreviewNavigation.groups(data.items);
  const lua = groups.lua[0], calculatorItem = groups.calculators[0] || calculator;
  const code = document.querySelector('#xml-code');
  const write = source => { code.value = source; code.dispatchEvent(new Event('input', { bubbles: true })); };
  const position = offset => { code.focus(); code.setSelectionRange(offset, offset); };
  const base = 'Prgm\n\nEndPrgm';
  const selectProgram = async () => { const item = xmlDoctor.candidates.find(entry => entry.program_name === program.program_name); must(item, 'Fixture program disappeared'); selectXmlProgram(item.index); await pause(40); };
  const closePopups = () => { window.TnsMathTools.close(); document.querySelector('.program-editor-dismiss')?.click(); closeToolMenus(); };
  let pendingProgramAction=null;
  const actionSettled=async()=>{if(pendingProgramAction)await wait(()=>!pendingProgramAction.disabled,'Program Editor action completion');};
  const openProgramMenu = async id => {
    await actionSettled();
    closePopups(); const edit = document.querySelector('#xml-edit-menu'); must(!edit.hidden, 'Edit menu is hidden'); if (!edit.classList.contains('open')) edit.querySelector('.menu-trigger').click();
    const trigger = document.querySelector('[data-program-editor-tools]'); must(visible(trigger), 'Program Editor tool is hidden for an actual editor'); trigger.click();
    await wait(() => shown('.program-editor-tools-panel [data-program-menu-id]'), 'Program menu data');
    if (id) { const parts = id.split('.'); for (let depth = 1; depth <= parts.length; depth++) { const path = parts.slice(0, depth).join('.'); const row = document.querySelector(`[data-program-menu-id="${path}"]`); must(row, 'Missing program menu row '+path+': '+JSON.stringify({heading:shown('.program-editor-tools-panel')?.querySelector('header')?.textContent,rows:[...document.querySelectorAll('[data-program-menu-id]')].map(row=>row.dataset.programMenuId),parent:edit.className}));if(depth===parts.length&&!row.hasAttribute('aria-haspopup'))pendingProgramAction=row; row.click(); if (depth < parts.length) await pause(10); } }
    return document.querySelector('.program-editor-tools-panel');
  };
  const toolButton = kind => shown(`[data-math-tool="${kind}"]`, document.querySelector('.doctor-toolbar'));
  const openTemplates = async () => { closePopups(); const button = toolButton('templates'); must(button, 'Main math template button missing'); button.click(); await wait(() => shown('.ti-math-template-grid'), 'Math template palette'); return shown('.ti-math-tool-popup'); };
  const insertTemplate = async (id, dimensions) => {
    await openTemplates(); document.querySelector(`[data-template-id="${id}"]`).click();
    if (dimensions) { const form = shown('.ti-math-dimensions'); must(form, id + ' did not request dimensions'); form.elements.rows.value = String(dimensions.rows); if (form.elements.columns) form.elements.columns.value = String(dimensions.columns); form.dispatchEvent(new Event('input', { bubbles: true })); form.querySelector('[type="submit"]').click(); }
    await pause(60); must(!shown('.ti-math-tool-popup'), 'Template popup remained open after insertion');
  };
  const openCatalog = async () => { closePopups(); const button = toolButton('catalog'); must(button, 'Main catalog button missing'); button.click(); await wait(() => shown('.ti-math-catalog-entry'), 'Catalog entries'); return shown('.ti-math-tool-popup'); };
  const programSettings = async (values = {}) => {
    await wait(() => shown('#xpe-apply,#doc-apply'), 'Program settings form'); const apply = shown('#xpe-apply,#doc-apply'), form = apply.closest('.modal');
    for (const [field, value] of Object.entries(values)) { const input = form.querySelector(({ name:'#xpe-name,#doc-name', access:'#xpe-access,#doc-access', type:'#xpe-type,#doc-type' })[field]); must(input, 'Missing program settings field ' + field); input.value = value; }
    const buttonBox=apply.getBoundingClientRect(),hit=document.elementFromPoint(buttonBox.left+buttonBox.width/2,buttonBox.top+buttonBox.height/2);must(apply===hit||apply.contains(hit),'Program settings Apply is covered by another menu');
    apply.click(); await wait(() => !form.isConnected, 'Apply program settings');
    await actionSettled();
    await wait(()=>xmlDoctor.current?.is_program_editor&&(!values.name||xmlDoctor.current.program_name===values.name)&&(!values.access||String(xmlDoctor.current.library_access||'').trim()===values.access),'Applied program settings');
  };
  const originalPrompt = window.prompt, originalConfirm = window.confirm;
  let prompts = [];
  window.prompt = (message, value) => { const answer = prompts.length ? prompts.shift() : null; return typeof answer === 'function' ? answer(message, value) : answer; };
  window.confirm = () => true;
  const cases = {
    async programMenu() {
      must(luaOnlyHidden, 'Program Editor appeared for a Lua-only document'); must(graphFunctionHidden, 'Program Editor appeared for a graph Func');
      await selectProgram(); await openProgramMenu();
      const panel = shown('.program-editor-tools-panel'); must(panel.querySelectorAll('[data-program-menu-id]').length === 9, 'Program Editor does not show nine categories');
      const icons = [...panel.querySelectorAll('img')]; await wait(() => icons.every(image => image.complete && image.naturalWidth), 'Program Editor SVG icons');
      bounds(panel); document.querySelector('[data-program-menu-id="2"]').click();
      must(document.querySelector('[data-program-menu-id="2.1"]') && document.querySelector('[data-program-menu-id="2.2"]') && document.querySelector('[data-program-menu-id="2.3"]'), 'Syntax / store / run are not grouped in category 2');
      must(!visible(document.querySelector('#xml-syntax-btn')), 'Legacy standalone Run syntax is still visible');
      closePopups(); write(base); position(5); await openProgramMenu('3.1'); await wait(() => code.value.includes('Local a,b'), 'Local insertion');
      return { luaOnlyHidden, graphFunctionHidden, categoryCount: 9, svgIcons: icons.length, nestedSyntax: true, sourceInserted: code.value };
    },
    async programActions() {
      await selectProgram(); write('Prgm\nDisp "V30 ACTION"\nEndPrgm');
      await openProgramMenu('2.2'); await wait(() => xmlDoctor.lastReport && !shown('.program-editor-tools-panel'), 'Verify syntax action'); must(xmlDoctor.lastReport.errors === 0, 'Valid program was rejected');
      await openProgramMenu('2.1'); await wait(() => xmlDoctor.embedded && !shown('.program-editor-tools-panel'), 'Verify and store action');
      const inspected = await inspectXmlDocument(); must(inspected.items.some(item => item.name === 'TI.ProgramEditor' && item.detail?.name === program.program_name && item.content?.includes('V30 ACTION')) || inspected.items.some(item => item.name === program.program_name && item.raw_xml?.includes('V30 ACTION')), 'Stored code is absent from document XML');
      position(5); code.setSelectionRange(5, 22); await openProgramMenu('1.8'); await pause(30); must(code.value.includes('© Disp'), 'Comment action did not change the program');
      await openProgramMenu('1.8'); await pause(30); must(!code.value.includes('© Disp'), 'Uncomment action did not restore the program');
      prompts = ['ACTION']; await openProgramMenu('1.9'); await pause(30); must(code.value.slice(code.selectionStart, code.selectionEnd) === 'ACTION', 'Find did not select real editor text');
      prompts = ['2']; await openProgramMenu('1.B'); await pause(30); must(code.selectionStart === 5, 'Go to line did not move the actual editor selection');
      await openProgramMenu('2.3'); await wait(() => shown('.prgm-preview-modal'), 'Run program action'); await wait(() => shown('.prgm-preview-modal [data-output]')?.textContent.includes('V30 ACTION'), 'Prgm output');
      const runOutput = shown('.prgm-preview-modal [data-output]').textContent; window.TnsPrgmPreview.close();
      const beforeCopy=xmlDoctor.candidates.filter(item=>item.is_program_editor).length;
      await openProgramMenu('1.5'); await wait(()=>shown('#xpe-apply')||!shown('.program-editor-tools-panel'),'Copy settings');
      if(shown('#xpe-apply')){document.querySelector('#xpe-name').value='v30copy';document.querySelector('#xpe-apply').click();}
      await actionSettled();await wait(()=>xmlDoctor.current?.program_name==='v30copy'&&!shown('.program-editor-tools-panel'),'Copied program');
      must(code.value.includes('V30 ACTION'),'Copy did not retain source');must(xmlDoctor.candidates.filter(item=>item.is_program_editor).length===beforeCopy+1,'Copy did not create a Program Editor widget');
      await openProgramMenu('2.1');await wait(()=>xmlDoctor.embedded&&!shown('.program-editor-tools-panel'),'Store copied program');
      await openProgramMenu('1.2');await wait(()=>shown('.ti-program-open-list'),'Open program list');
      const originalButton=[...document.querySelectorAll('.ti-program-open-list button')].find(button=>button.textContent.startsWith(program.program_name+' '));must(originalButton,'Original program absent from Open');originalButton.click();await wait(()=>xmlDoctor.current?.program_name===program.program_name&&!shown('.ti-program-open-list'),'Open original program');
      await openProgramMenu('1.6');await programSettings({name:'v30renamed'});program.program_name='v30renamed';must(xmlDoctor.current.program_name==='v30renamed','Rename did not update program metadata');
      await openProgramMenu('1.7');await programSettings({access:'LibPriv'});must(String(xmlDoctor.current.library_access||'').trim()==='LibPriv','Library access did not update metadata: '+JSON.stringify({name:xmlDoctor.current?.program_name,access:xmlDoctor.current?.library_access}));
      await openProgramMenu('2.1');await wait(()=>xmlDoctor.embedded&&!shown('.program-editor-tools-panel'),'Store renamed program');
      const persisted=await inspectXmlDocument(),renamed=persisted.items.find(item=>item.name==='TI.ProgramEditor'&&item.detail?.name==='v30renamed');must(renamed&&String(renamed.detail.visibility||'').trim()==='LibPriv'&&renamed.content.includes('V30 ACTION'),'Renamed source and library access are not persisted in actual ProgramEditor XML');
      return { syntaxErrors: 0, stored: true, comment: true, find: true, goToLine: true, runOutput, copy:true, open:true,rename:'v30renamed',library:'LibPriv' };
    },
    async programFileActions() {
      await selectProgram(); await openProgramMenu('1.1'); await programSettings({name:'v30new'}); await wait(()=>xmlDoctor.current?.program_name==='v30new'&&!shown('.program-editor-tools-panel'),'New program');
      must(code.value.includes('Prgm')&&code.value.includes('EndPrgm'),'New action did not create program source');
      await openProgramMenu('1.4');await wait(()=>shown('#inspector-close'),'View document action');document.querySelector('#inspector-close').click();await wait(()=>!shown('#inspector-close'),'Close document inspector');
      const nativeClick=HTMLInputElement.prototype.click,source='Prgm\nDisp "V30 IMPORT"\nEndPrgm';let pickerOpened=false;
      HTMLInputElement.prototype.click=function(){if(this.type!=='file')return nativeClick.call(this);pickerOpened=true;const transfer=new DataTransfer();transfer.items.add(new File([source],'v30-import.tib',{type:'text/plain'}));this.files=transfer.files;this.dispatchEvent(new Event('change',{bubbles:true}));};
      try{await openProgramMenu('1.3');await programSettings({name:'v30import'});await wait(()=>xmlDoctor.current?.program_name==='v30import'&&code.value.includes('V30 IMPORT'),'Imported source');}finally{HTMLInputElement.prototype.click=nativeClick;}
      must(pickerOpened,'Import did not open the actual file input');
      await openProgramMenu('2.1');await wait(()=>xmlDoctor.embedded&&!shown('.program-editor-tools-panel'),'Store imported program');const imported=await inspectXmlDocument();must(imported.items.some(item=>item.name==='TI.ProgramEditor'&&item.detail?.name==='v30import'&&item.content.includes('V30 IMPORT')),'Imported program source was not stored in document XML');
      await openProgramMenu('1.D');await wait(()=>code.disabled&&!visible(document.querySelector('[data-program-editor-tools]')),'Close program editor action');must(xmlDoctor.candidates.some(item=>item.program_name==='v30import'),'Close action deleted the document program');
      await selectProgram();return{newProgram:true,view:true,importedSource:source,closeRetainsDocument:true};
    },
    async templateDimensions() {
      await selectProgram(); write(base); position(5); await insertTemplate('fraction'); must(code.value.includes('((1)/(1))'), 'Fraction template did not insert TI source');
      const details = [];
      for (const [id, dimensions, expected] of [['matrixN', { rows: 2, columns: 4 }, '[[1,1,1,1][1,1,1,1]]'], ['systemN', { rows: 4 }, 'system(1,1,1,1)'], ['piecewiseN', { rows: 4 }, 'piecewise(1,1,1,1,1,1,1,1)']]) {
        write(base); position(5); await openTemplates(); document.querySelector(`[data-template-id="${id}"]`).click();
        const form = shown('.ti-math-dimensions'); must(form && code.value === base, id + ' inserted before dimension confirmation');
        must(Boolean(form.elements.columns) === (id === 'matrixN'), 'Dimension fields are incorrect for ' + id);
        document.querySelector('.ti-math-popup-close').click(); must(code.value === base, 'Cancel changed the source for ' + id);
        position(5); await insertTemplate(id, dimensions); must(code.value.includes(expected), 'Incorrect dimensioned source for ' + id + ': ' + code.value); details.push({ id, dimensions, source: expected, cancelSafe: true });
      }
      return { fraction: true, dimensioned: details };
    },
    async catalogInsertion() {
      await selectProgram(); write(base); position(5); const popup = await openCatalog();
      must(popup.querySelectorAll('[data-catalog-tab]').length === 6, 'Six supplied catalog tabs are absent');
      const search = popup.querySelector('.ti-math-catalog-search'); search.value = 'identity'; search.dispatchEvent(new Event('input', { bubbles: true }));
      const entry = [...popup.querySelectorAll('.ti-math-catalog-entry')].find(button => /identity/i.test(button.textContent)); must(entry, 'identity is absent from the supplied catalog'); entry.click();
      const expected = popup.querySelector('.ti-math-catalog-detail code').textContent; must(/^identity\(/i.test(expected), 'Catalog syntax does not match identity'); popup.querySelector('[data-catalog-insert]').click();
      must(code.value.includes(expected), 'Catalog selection did not insert into actual Program Editor'); return { tabs: 6, sourceInserted: expected };
    },
    async mathematicalEditor() {
      await selectProgram(); const samples = ['((1)/(1))','1^(1)','√(1)','root(1,1)','\uF03F^(1)','log(1,1)','piecewise(1,1,1,1)','piecewise(1,1,1,1,1,1)','system(1,1)','system(1,1,1)','abs(1)',"1°1'1''",'[[1,1][1,1]]','[1,1]','[[1][1]]','[[1,1,1][1,1,1][1,1,1]]','∑(1,1,1,1)','∏(1,1,1,1)','\uF008(1,1)','\uF008(1,1,2)','\uF008(1,1,1)','∫(1,1,1,1)','∫(1,1)','lim(1,1,1,1)','1₁'];
      const raw = 'Prgm\n' + samples.join('\n') + '\nEndPrgm'; write(raw); await openTemplates();
      const checkbox = document.querySelector('.ti-math-view-option input'); must(checkbox, 'Mathematical view toggle is absent'); if (!checkbox.checked) checkbox.click(); window.TnsMathTools.close(); await pause(40);
      const surface = shown('.ti-math-source-view'); must(surface, 'Mathematical editor did not appear');
      const rows = [...surface.querySelectorAll('[data-math-line]')], mathRows = rows.filter(row => row.querySelector('math')); must(mathRows.length >= samples.length, 'Some supplied template forms have no MathML rendering: ' + mathRows.length);
      must(surface.querySelector('mfrac') && surface.querySelector('msqrt') && surface.querySelector('mroot') && surface.querySelector('mtable') && surface.querySelector('msub'), 'Expected mathematical structures are absent'); must(code.value === raw, 'Switching to mathematical view mutated TI source');
      surface.querySelector('[data-math-line="2"]').click(); const input = surface.querySelector('.ti-math-source-input'); must(input, 'Mathematical line is not editable'); input.value = '((2)/(3))'; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      must(code.value.split('\n')[1] === '((2)/(3))' && !code.value.includes('<math'), 'Mathematical editing did not preserve plain TI source');
      await openTemplates(); const off = document.querySelector('.ti-math-view-option input'); if (off.checked) off.click(); window.TnsMathTools.close(); must(!visible(document.querySelector('.ti-math-source-view')), 'Mathematical view did not return to the source editor');
      return { suppliedSamples: samples.length, renderedMathRows: mathRows.length, structures: ['mfrac', 'msqrt', 'mroot', 'mtable', 'msub'], editedSource: code.value.split('\n')[1] };
    },
    async calculatorCommands() {
      closePopups(); await openCalculatorInLovePreview(calculatorItem);
      await wait(() => shown('.calculator-editor-stage'), 'Calculator preview'); const modal = shown('.love-preview-modal');
      const composer = () => modal.querySelector('#love-calculator-composer .calc-visual-slot[contenteditable]'); await wait(composer, 'Calculator editable input');
      const calculations = [],symbolic=[],oldCopy=copyPlainText;let copied='';copyPlainText=async value=>{copied=value;};
      const casBefore=window.TnsCasBridge?.getStatus?.();must(casBefore?.status!=='ready','Cold Calculator CAS path was warmed before the first symbolic Enter');
      const enterAndCopy=async source=>{
        const field=composer(),entryHost=modal.querySelector('#love-calculator-composer');field.textContent=source;field.dispatchEvent(new Event('input',{bubbles:true}));
        const started=performance.now();field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
        const busyObserved=entryHost.inert;must(busyObserved,'Calculator did not mark its asynchronous entry busy: '+source);
        // A repeated key during startup must not append the same result twice.
        field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
        await wait(()=>!entryHost.inert,'Calculator asynchronous Enter: '+source,60000);
        copied='';modal.querySelector('#love-preview-copy-content').click();await wait(()=>Boolean(copied),'Calculator Copy output');
        const prefix=source+' = ',matches=copied.split('\n').filter(line=>line.startsWith(prefix));must(matches.length===1,'Calculator Enter failed or appended duplicates: '+source+' '+copied);
        const display=matches[0].slice(prefix.length).trim();must(display&&display!==source&&!/Error|unsupported|no soportad|not supported/i.test(display),'Calculator UI did not evaluate source: '+source+' '+display);
        must(composer()?.textContent.trim()==='','Calculator did not reset the composer after appending its answer: '+source);
        return{source,display,visibleOutput:copied,busyObserved,duplicateEnterIgnored:true,composerReset:true,durationMs:Math.round(performance.now()-started),backend:window.TnsCasBridge?.getStatus?.().backend};
      };
      try{
        for(const [source,expected]of[['d(sin(x),x)','cos(x)'],['factor(x²−1)',null],['∫(x²,x)','x^3/3']]){
          const answer=await enterAndCopy(source),display=answer.display.replace(/\s/g,'');
          if(expected)must(display.replace(/[()]/g,'')===expected.replace(/[()]/g,''),'Incorrect symbolic UI answer: '+JSON.stringify(answer));else must(/x/.test(display)&&/x-1/.test(display)&&/x\+1/.test(display),'Factor did not return the actual factorization: '+JSON.stringify(answer));
          symbolic.push(answer);
        }
        for(const [source,expected]of[['newMat(2,3)','[[0,0,0][0,0,0]]'],['identity(3)','[[1,0,0][0,1,0][0,0,1]]'],['diag({1,2,3})','[[1,0,0][0,2,0][0,0,3]]'],['diag([[3,4][5,6]])','[[3,6]]'],['randMat(3,3)',null]]){
          const answer=await enterAndCopy(source),display=answer.display.replace(/\s/g,'');
          if(expected)must(display===expected,'Incorrect matrix UI answer: '+JSON.stringify(answer));else{const values=display.match(/-?\d+/g)?.map(Number)||[];must(display.startsWith('[[')&&values.length===9&&values.every(value=>Number.isInteger(value)&&value>=-9&&value<=9),'randMat UI did not return a 3×3 integer matrix');}
          calculations.push(answer);
        }
      }finally{copyPlainText=oldCopy;}
      const template = modal.querySelector('[data-math-tool="templates"],.love-preview-templates-toggle'), catalog = modal.querySelector('[data-math-tool="catalog"],.love-preview-catalog-toggle'); must(template && catalog, 'Calculator math template/catalog controls are absent');
      template.click(); await wait(() => shown('.ti-math-template-grid'), 'Calculator templates'); document.querySelector('[data-template-id="matrixN"]').click(); must(shown('.ti-math-dimensions'), 'Calculator matrix does not request dimensions'); window.TnsMathTools.close();
      catalog.click(); await wait(() => shown('.ti-math-catalog-entry'), 'Calculator catalog'); window.TnsMathTools.close();
      const cas = window.TnsCasBridge?.getStatus?.() || null;
      modal.querySelector('#love-preview-close-top')?.click(); await wait(() => !modal.isConnected, 'Calculator close');
      must(cas?.status==='ready'&&/local/i.test(cas.backend||''),'Calculator did not use the local Giac backend: '+JSON.stringify(cas));
      return { commands: calculations, symbolic, coldCasStatus:casBefore?.status,dimensionDialog: true, catalog: true, cas };
    },
    async loveControls() {
      const source = 'platform.apilevel="2.3"\nfunction on.paint(gc) gc:setColorRGB(255,255,255) gc:fillRect(0,0,platform.window:width(),platform.window:height()) gc:setColorRGB(0,0,0) gc:drawString("V30 PAINT",8,8,"top") end';
      const attempts = [];
      for (const grouped of [false, true]) {
        const options = grouped ? { item: lua, documentName: 'V30', pageNavigation: { items: [lua], selected: 0, onSelect() {} } } : {};
        await showLovePreview(source, null, null, options); await wait(() => shown('.love-preview-modal')?.dataset.previewReady === 'true', 'LÖVE ready');
        const modal = shown('.love-preview-modal'); const controls = modal.querySelector('.preview-controls');
        const up = controls?.querySelector('[data-key="up"]'), left = controls?.querySelector('[data-key="left"]'), down = controls?.querySelector('[data-key="down"]'), right = controls?.querySelector('[data-key="right"]'); must(up && left && down && right, 'LÖVE direction controls missing');
        must(up.textContent.trim() === '↑' && left.textContent.trim() === '←' && down.textContent.trim() === '↓' && right.textContent.trim() === '→', 'First LÖVE paint has unenhanced text direction controls');
        const template = modal.querySelector('.love-preview-templates-toggle'), catalog = modal.querySelector('.love-preview-catalog-toggle'); must(template && catalog && !/Templates|Plantillas/i.test(template.textContent), 'LÖVE templates are not an icon control');
        const before = rect(modal.querySelector('.preview-window-stage')); await pause(500); const after = rect(modal.querySelector('.preview-window-stage')); must(before.left === after.left && before.top === after.top, 'LÖVE screen shifted after controls loaded: '+JSON.stringify({before,after}));
        template.click(); await wait(() => shown('.ti-math-template-grid'), 'LÖVE templates'); const popup = shown('.ti-math-tool-popup'); bounds(popup);if(template.getBoundingClientRect().bottom+220<innerHeight)must(popup.getBoundingClientRect().top>=template.getBoundingClientRect().bottom-1,'LÖVE templates opened beside/above the control despite room below'); window.TnsMathTools.close(); attempts.push({ grouped, arrows: ['↑', '←', '↓', '→'], screen: after, iconOnly: true });
        modal.querySelector('#love-preview-close-top').click(); await wait(() => !modal.isConnected, 'LÖVE close');
      }
      return { attempts };
    },
  };
  window.__v30Math = {
    async captureMathView(bottom){if(!shown('.ti-math-source-view'))document.querySelector('#xml-math-view-btn').click();await pause(50);const surface=shown('.ti-math-source-view');must(surface,'Mathematical view is missing for capture');surface.scrollTop=bottom?surface.scrollHeight:0;await pause(30);must(surface.scrollHeight>surface.clientHeight,'Mathematical view does not scroll within the editor');must(document.documentElement.scrollWidth<=innerWidth+1,'Mathematical view overflows the page horizontally');return{screen:rect(surface),scrollHeight:surface.scrollHeight,clientHeight:surface.clientHeight,mathRows:surface.querySelectorAll('math').length};},
    restoreSourceView(){if(shown('.ti-math-source-view'))document.querySelector('#xml-math-view-btn').click();},
    async run(name) { progress(name); try { return { name, ok: true, ...(await cases[name]()) }; } catch (error) { closePopups();window.TnsPrgmPreview.close();for(const modal of document.querySelectorAll('.love-preview-modal'))modal.querySelector('#love-preview-close-top')?.click();await pause(300);return { name, ok: false, error: error.stack || String(error), xmlLog: document.querySelector('#xml-log')?.textContent?.slice(-2500) }; } },
    async responsive(config) {
      progress(config.name); try {
        applyTheme(config.theme); await selectProgram(); await pause(60); const templateButton = toolButton('templates'), catalogButton = toolButton('catalog'); must(templateButton && catalogButton, 'Math toolbar buttons absent');
        const masks = [templateButton, catalogButton].map(button => ({ color: getComputedStyle(button).color, icon: getComputedStyle(button.querySelector('.ti-math-tool-icon')).maskImage })); must(masks.every(item => item.icon !== 'none'), 'A supplied toolbar icon is invisible');
        const palette = await openTemplates(); const templateBounds = bounds(palette);await wait(()=>[...palette.querySelectorAll('img')].every(image=>image.complete&&image.naturalWidth),'Mathematical template icons',5000); window.TnsMathTools.close();
        const catalog = await openCatalog(), catalogBounds = bounds(catalog); must(catalog.querySelectorAll('[data-catalog-tab]').length === 6, 'Catalog icons are absent'); window.TnsMathTools.close();
        await openProgramMenu(); const programBounds = bounds(shown('.program-editor-tools-panel')); closePopups();
        return { name: config.name, ok: true, masks, templateBounds, catalogBounds, programBounds };
      } catch (error) { closePopups(); return { name: config.name, ok: false, error: error.stack || String(error) }; }
    },
    finish() { closePopups(); window.prompt = originalPrompt; window.confirm = originalConfirm; return { ok: document.body.style.overflow === originalOverflow, overflowRestored: document.body.style.overflow === originalOverflow }; },
  };
  return { luaOnlyHidden, graphFunctionHidden, programName: program.program_name, programCandidates: xmlDoctor.candidates.length, appKinds: Object.keys(groups).filter(key => groups[key]?.length) };
}
