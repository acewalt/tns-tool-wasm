/* Offline, real application: group BASIC, Calculator, Sheets and Python;
   exercise the actual editors/runtimes and native XML save/reopen. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v43/compound-edit.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-compound-edit-v43-')));
let win,server;const logs=[];
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1600,height:1100,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',(_e,level,message)=>logs.push({level,message}));
 await win.loadURL(origin);win.webContents.focus();
 const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
 const dom=await win.webContents.executeJavaScript(`(()=>{const pane=document.querySelector('[data-app-kind=basic]');return [...pane.querySelectorAll('*')].filter(e=>e.className&&typeof e.className==='string').map(e=>({tag:e.tagName,cls:e.className,h:e.getBoundingClientRect().height,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility}));})()`);
 await win.webContents.executeJavaScript('new Promise(resolve=>setTimeout(resolve,500))');
 fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report+'.dom.json',JSON.stringify(dom,null,2));fs.writeFileSync(report,JSON.stringify(result,null,2));fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));win.destroy();server.close();app.exit(0);
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack||String(error),logs},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(x,m)=>{if(!x)throw Error(m);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(20);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsCompoundPreview&&window.TnsPythonPreview&&!document.querySelector('#startup-loader'),'offline startup');applyLanguage('en');
 const blank=await(await fetch('./templates/blank_tns_xml/Problem1.xml')).text();
 await loadXmlDoctorFiles([new File([blank],'Problem1.xml')],'file');
 document.querySelector('#xml-code').value='Prgm\nDisp 42\nEndPrgm';xmlDoctor.current.code=document.querySelector('#xml-code').value;xmlDoctor.embedded=false;await embedXmlCode();
 await addCalculatorWidgetToStage();await addSpreadsheetWidgetToStage();await addPythonEditorToStage();
 let data=await inspectXmlDocument(),cards=documentLayoutCards(data);
 must(cards.length===4,'Unexpected fixture cards: '+cards.map(c=>c.apps.map(a=>a.name).join(',')));
 await applyDocumentPageLayout({action:'group',file:cards[0].file,path:cards[0].path,cards,layout:{clay:7,w1:5000,h1:5000,w2:5000,h2:5000}});
 const groupsNow=async()=>{const data=await inspectXmlDocument(),groups=TnsDocumentPreviewNavigation.groups(data.items);groups.widgets=documentWidgetPreviewPages(data.items,groups);return groups;};
 let groups=await groupsNow();must(groups.widgets.length===1&&groups.widgets[0].previewItems.length===4,'Native grouping lost apps');
 const session={},preview=await openDocumentAppPreview(groups,'widgets',0,session);window.qaCompound=preview;
 await pause(100);
 const q=s=>preview.backdrop.querySelector(s),pane=kind=>q('[data-app-kind="'+kind+'"]');
 for(const kind of ['basic','calculators','sheets','python'])must(pane(kind)&&!pane(kind).querySelector('.compound-preview-unavailable,.compound-preview-error'),'Missing embedded '+kind+': '+pane(kind)?.textContent);
 const pe=pane('basic'),calc=pane('calculators'),sheet=pane('sheets'),python=pane('python');
 const key=(el,key,extra={})=>el.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra}));
 const point=(el,type='pointerdown')=>el.dispatchEvent(new PointerEvent(type,{pointerId:1,bubbles:true,cancelable:true}));
 const sheetCell=(r,c)=>sheet.querySelector('.sheet-cell[data-row="'+r+'"][data-col="'+c+'"]'),bar=sheet.querySelector('.spreadsheet-formula-value');
 function enterCell(r,c,text){point(sheetCell(r,c));point(window,'pointerup');bar.focus();bar.value=text;bar.dispatchEvent(new InputEvent('input',{bubbles:true}));key(bar,'Enter');}
 enterCell(0,0,'2');enterCell(0,1,'3');enterCell(0,2,'=(A1+B1)');must(sheetCell(0,2).textContent==='5','Embedded sheet did not calculate');
 const peSource=pe.querySelector('textarea');must(peSource,'Embedded BASIC source missing');peSource.value='Prgm\nDisp 43\nEndPrgm';peSource.dispatchEvent(new InputEvent('input',{bubbles:true}));
 key(peSource,'Escape');must(pe.querySelector('textarea'),'Escape removed embedded BASIC pane');pe.querySelector('[data-ti-pe-run]').click();await pause(30);
 const expr=calc.querySelector('[data-expression]');must(expr.value.endsWith('()'),'Run did not route to Calculator peer');expr.focus();key(expr,'Enter');
 await wait(()=>calc.querySelector('[data-output]')?.textContent.includes('43'),'BASIC run in embedded Calculator');
 const pySource=python.querySelector('[data-ti-py-source]');must(pySource,'Embedded Python editor missing');pySource.value='print("PY43")';pySource.dispatchEvent(new InputEvent('input',{bubbles:true}));key(pySource,'Escape');must(python.querySelector('[data-ti-py-source]'),'Escape removed Python pane');
 python.querySelector('[data-ti-py-run]').click();await wait(()=>python.querySelector('[data-ti-py-output]')?.textContent.includes('PY43'),'real Python execution');
 python.querySelector('[data-ti-py-edit]').click();await pause(10);must(python.querySelectorAll('.document-embedded-preview').length===1&&python.querySelector('[data-ti-py-source]').value==='print("PY43")','Shell to editor left stale child or lost source');
 // Drafts are committed before Page layout takes its fresh XML snapshot.
 point(sheetCell(1,2));point(window,'pointerup');bar.focus();bar.value='=A1+B1+1';bar.dispatchEvent(new InputEvent('input',{bubbles:true}));
 peSource.value='Prgm\nIf\nEndPrgm';peSource.dispatchEvent(new InputEvent('input',{bubbles:true}));
 const layout=await openDocumentPageLayout(groups.widgets[0]);await pause(10);
 must(Number(getComputedStyle(layout.backdrop).zIndex)>Number(getComputedStyle(preview.backdrop).zIndex),'Layout behind actual compound preview');
 must(layout.modal.querySelector('.page-layout-page').textContent.includes('TI.ProgramEditor'),'Layout omitted native app label');layout.close();must(preview.backdrop.isConnected,'Closing layout removed underlying compound preview');must(peSource.value==='Prgm\nIf\nEndPrgm','Layout discarded unfinished BASIC source');peSource.value='Prgm\nDisp 43\nEndPrgm';peSource.dispatchEvent(new InputEvent('input',{bubbles:true}));
 const currentSheet=(await inspectXmlDocument()).items.find(i=>i.name==='tabulator');must(currentSheet.raw_xml.includes('=A1+B1+1'),'Layout snapshot lost uncommitted formula');
 await preview.backdrop.__documentPreviewCommit();
 // Save explicitly stores BASIC and the remaining native app data.
 q('[data-compound-save]').click();await wait(()=>q('[data-compound-status]').textContent==='Layout saved','compound native save');
 const saved=(await inspectXmlDocument()).items,stored=saved.find(i=>i.name==='tabulator');must(stored.raw_xml.includes('=A1+B1+1'),'Saved sheet missing formula');
 must(xmlDoctor.candidates.some(c=>c.code.includes('Disp 43')),'BASIC draft lost on save');
 const sheetValues=preview.controllers.find(c=>c.state?.cells)?.state.cells;must(sheetValues['1:2'].data==='6','Draft formula result wrong');
 const widths=[pe,calc,sheet,python].map(p=>({kind:p.dataset.appKind,width:p.getBoundingClientRect().width,height:p.getBoundingClientRect().height,scrollWidth:p.scrollWidth}));
 must(widths.every(p=>p.width>100&&p.height>70),'Embedded surfaces collapsed');
 // Reopening the saved page must recreate interactive apps from native XML.
 preview.dispose();closeModal(preview.backdrop);await pause(200);groups=await groupsNow();const reopened=await openDocumentAppPreview(groups,'widgets',0,{});window.qaCompound=reopened;await pause(100);
 must(reopened.backdrop.querySelector('[data-app-kind=sheets] .sheet-cell[data-row="1"][data-col="2"]').textContent==='6','Native sheet save/reopen lost result');
 must(reopened.backdrop.querySelector('[data-ti-pe-source]').value.includes('Disp 43'),'Native BASIC save/reopen lost source');
 must(reopened.backdrop.querySelector('[data-ti-py-source]').value==='print("PY43")','Python resource save/reopen lost source');
 const pyPeer=reopened.controllers.find(c=>c.kind==='python'),pyItem=pyPeer.getPythonItem();
 const shellHost=document.createElement('div');shellHost.className='compound-preview-pane';shellHost.style.cssText='position:fixed;top:10px;left:10px;width:320px;height:210px';document.body.append(shellHost);
 const shellItem={file:pyItem.file,path:'/prob/card[99]/wdgt',name:'TI.PythonShell',content_label:'PythonShell',detail:{}};
 const shell=mountDocumentEmbeddedPreview(shellHost,{previewItem:shellItem,previewKind:'python'},documentCalculatorContext(pyItem.file),{findPythonEditor:()=>pyPeer});
 await shell.runPython({...documentPythonPreviewSource(pyItem),source:'print("SHELL43")'},pyItem);
 must(shellHost.querySelector('[data-ti-py-output]').textContent.includes('SHELL43'),'Native PythonShell adapter did not execute');
 shellHost.querySelector('[data-ti-py-edit]').click();must(!shellHost.querySelector('[data-ti-py-source]'),'Native shell opened a duplicate editor instead of its peer');
 const livePy=reopened.backdrop.querySelector('[data-ti-py-source]');livePy.value='print("NEW43")';livePy.dispatchEvent(new InputEvent('input',{bubbles:true}));shell.destroy();shellHost.remove();
 must(documentPythonPreviewSource(pyItem).source==='print("NEW43")','Closing shell overwrote its peer editor with stale source');
 livePy.value='print("PY43")';livePy.dispatchEvent(new InputEvent('input',{bubbles:true}));
 await pause(500);
 const zoom=reopened.backdrop.querySelector('.preview-window-header [data-preview-window-zoom]');must(zoom,'Compound header borrowed a hidden child zoom control');zoom.click();await pause(50);
 for(const kind of ['basic','python']){const p=reopened.backdrop.querySelector('[data-app-kind='+kind+']');const source=p.querySelector(kind==='basic'?'.ti-program-editor-scroll':'.ti-python-source-scroll');must(source.getBoundingClientRect().height>40,'Embedded source hidden by diagnostics: '+kind);}
 const history=reopened.backdrop.querySelector('.prgm-preview-history');key(history,'Escape');must(history.isConnected,'Escape removed the embedded Calculator');
 const originalSource=reopened.backdrop.querySelector('[data-ti-pe-source]');originalSource.value='Prgm\nDisp 44\nEndPrgm';originalSource.dispatchEvent(new InputEvent('input',{bubbles:true}));
 const stackedLayout=await openDocumentPageLayout(groups.widgets[0]);stackedLayout.modal.querySelector('[data-layout-preview]').click();
 await wait(()=>document.querySelectorAll('.compound-preview-modal').length===2,'preview above layout');
 const topPreview=[...document.querySelectorAll('.compound-preview-modal')].at(-1),topSource=topPreview.querySelector('[data-ti-pe-source]');must(topSource.value.includes('Disp 44'),'Nested preview ignored current BASIC draft');topSource.value='Prgm\nDisp 45\nEndPrgm';topSource.dispatchEvent(new InputEvent('input',{bubbles:true}));topPreview.querySelector('[data-widget-close]').click();await pause(250);
 stackedLayout.modal.querySelector('[data-layout-save]').click();await wait(()=>stackedLayout.modal.querySelector('[data-layout-status]').textContent.includes('Changes saved'),'apply layout after editing newer preview');
 must(xmlDoctor.candidates.some(c=>c.code.includes('Disp 45')),'Disposing old preview overwrote the newer BASIC draft');stackedLayout.close();await pause(250);
 // A source-file identity may become its staged identity after native saving.
 // Further unsaved edits still belong to the same app when navigating back.
 groups=await groupsNow();const sheetApp=groups.widgets[0].previewItems.find(a=>a.previewKind==='sheets');sheetApp.previewItem.file=xmlDoctor.sourcePath+'/'+documentXmlFileIdentity(sheetApp.previewItem.file);
 const draftSession={},firstDraft=await openDocumentAppPreview(groups,'widgets',0,draftSession);await firstDraft.backdrop.__documentPreviewCommit();
 let target=firstDraft.backdrop.querySelector('[data-app-kind=sheets]'),cell=target.querySelector('[data-row="2"][data-col="2"].sheet-cell');point(cell);point(window,'pointerup');const f=target.querySelector('.spreadsheet-formula-value');f.focus();f.value='99';f.dispatchEvent(new InputEvent('input',{bubbles:true}));key(f,'Enter');firstDraft.backdrop.querySelector('[data-widget-close]').click();await pause(250);
 groups=await groupsNow();const final=await openDocumentAppPreview(groups,'widgets',0,draftSession);window.qaCompound=final;await pause(50);
 must(final.backdrop.querySelector('[data-app-kind=sheets] [data-row="2"][data-col="2"].sheet-cell').textContent==='99','Stage file transition lost unsaved sheet draft');
 must(final.backdrop.querySelector('[data-ti-pe-source]').value.includes('Disp 45'),'Remount used an obsolete BASIC draft');
 return{ok:true,offline:true,apps:['TI.ProgramEditor','TI.Scratchpad','tabulator','TI.PythonEditor','TI.PythonShell'],basicPeerExecution:true,pythonExecution:true,pythonShellPeer:true,escapePreservesApps:true,shellEditorReplacement:true,sheetFormulas:true,draftBeforeLayout:true,layoutOnTop:true,nativeSaveReopen:true,widths};
}
