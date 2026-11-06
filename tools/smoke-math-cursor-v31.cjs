/* Real Chromium editing/selection regression for the Math view source adapter.
   Runs without a network request, with source text as the authoritative model. */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(process.env.TNS_SMOKE_WEB_ROOT || path.join(__dirname, '..'));
const reportPath = path.resolve(process.env.TNS_SMOKE_REPORT || path.join(root, 'release/qa/math-cursor-v31.json'));
let win;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async () => {
  win = new BrowserWindow({ show: false, width: 1000, height: 800, webPreferences: { sandbox: true, contextIsolation: true } });
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<html lang="en"><head><style>#host{position:relative;width:900px;height:700px}</style></head><body><button id="palette">Catalog</button><div id="host"><textarea id="source"></textarea></div></body></html>'));
  await win.webContents.insertCSS(fs.readFileSync(path.join(root,'web/ti-math-editor.css'),'utf8'));
  for (const name of ['web/ti-math-typeset.js','web/ti-math-editor.js']) await win.webContents.executeJavaScript(fs.readFileSync(path.join(root,name),'utf8'));
  const report = await win.webContents.executeJavaScript(`(${run.toString()})()`);
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
  fs.writeFileSync(reportPath+'.png',(await win.webContents.capturePage()).toPNG());
  console.log(JSON.stringify(report));win.destroy();app.exit(report.ok?0:1);
}).catch(error=>{ console.error(error); win?.destroy(); app.exit(1); });
function run() {
  const source=document.querySelector('#source'),host=document.querySelector('#host'),calls=[],cases=[];
  const must=(value,message)=>{if(!value)throw Error(message);};
  const fixture='Prgm\nabc+def\nsecond\nEndPrgm';source.value=fixture;source.setSelectionRange(0,0);
  const controller=window.TnsMathEditor.install({host,editor:source,replaceRange:(text,start,end)=>{calls.push({text,start,end});source.value=source.value.slice(0,start)+text+source.value.slice(end);source.setSelectionRange(start+text.length,start+text.length);source.dispatchEvent(new Event('input',{bubbles:true}));}});
  const reset=(text=fixture)=>{source.value=text;source.setSelectionRange(0,0);source.dispatchEvent(new Event('input',{bubbles:true}));controller.resetSelection();controller.setActive(true);};
  const editRow=n=>{host.querySelector('[data-math-line="'+n+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));return host.querySelector('.ti-math-source-input');};
  controller.setActive(true);
  let input=editRow(2);input.setSelectionRange(4,7);input.dispatchEvent(new Event('select'));document.querySelector('#palette').focus();
  const range=controller.captureSelection();must(range.start===9&&range.end===12,'Blur lost the actual selected source range: '+JSON.stringify(range));
  controller.replaceSelection('π');must(source.value==='Prgm\nabc+π\nsecond\nEndPrgm','Catalog inserted at a stale source position');
  must(host.querySelector('textarea.ti-math-source-input')===document.activeElement,'Insertion did not restore visible editor focus');
  cases.push({name:'palette restores selected caret',ok:true,range,source:source.value});
  reset();input=editRow(3);input.setSelectionRange(0,0);input.dispatchEvent(new Event('select'));document.querySelector('#palette').focus();controller.replaceSelection('root(8,3)+');
  must(source.value==='Prgm\nabc+def\nroot(8,3)+second\nEndPrgm','A new line kept the earlier caret');cases.push({name:'switch line then insert',ok:true,source:source.value});
  reset();input=editRow(2);input.setSelectionRange(3,3);input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  must(source.value==='Prgm\nabc\n+def\nsecond\nEndPrgm','Enter did not create a source newline');must(controller.active,'Enter disabled Math view');
  input.value=input.value.slice(0,input.selectionStart)+'NEW'+input.value.slice(input.selectionEnd);input.setSelectionRange(7,7);input.dispatchEvent(new Event('input',{bubbles:true}));controller.flush();
  must(source.value==='Prgm\nabc\nNEW+def\nsecond\nEndPrgm','Multiline typing lost source');must(host.querySelectorAll('[data-math-line]').length===5,'Multiline source did not rerender as rows');cases.push({name:'Enter and multiline text',ok:true,source:source.value});
  reset();input=editRow(2);input.setSelectionRange(7,7);input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  input=editRow(3);must(input.value==='second','Click after a multiline edit opened the wrong source line: '+input.value);input.setSelectionRange(0,0);input.dispatchEvent(new Event('select'));controller.replaceSelection('X');must(source.value==='Prgm\nabc+def\n\nXsecond\nEndPrgm','Offset below multiline editor was not adjusted');cases.push({name:'row pointer before blur retains line offset',ok:true});
  reset();input=editRow(2);input.value='stale';input.dispatchEvent(new Event('input',{bubbles:true}));source.value='Prgm\nnewDocument\nEndPrgm';source.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('blur'));must(source.value==='Prgm\nnewDocument\nEndPrgm','Old editor overwrote switched document');must(!host.querySelector('.ti-math-source-input'),'Stale textarea survived program switch');
  cases.push({name:'external program switch discards stale textarea',ok:true});
  reset('\nPrgm\nEndPrgm');input=editRow(1);must(input.value==='','First empty line mapped to wrong offset');controller.replaceSelection('© start');must(source.value==='© start\nPrgm\nEndPrgm','First empty line insertion failed');
  cases.push({name:'leading empty line caret',ok:true});
  const header=host.querySelector('.ti-math-source-header strong').textContent;must(header==='Math view','Header uses obsolete 2D label');
  controller.flush();return {ok:true,cases,replaceCalls:calls.length,header};
}
