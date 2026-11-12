/* Offline integration against local XML fixtures; no user documents are shipped. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const input=path.resolve(process.argv[2]||path.join(root,'release/qa/widgets-v39'));
const reportPath=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v40/integration-browser.json');
const fixtures={compound:fs.readFileSync(path.join(input,'case3-Problem1.xml'),'utf8'),trig:fs.readFileSync(path.join(input,'case2-Problem1.xml'),'utf8')};
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-widgets-v39-')));
app.commandLine.appendSwitch('disable-gpu');
let win,server;
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin);
 const report=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(fixtures)})`);
 fs.writeFileSync(reportPath,JSON.stringify(report,null,2));fs.writeFileSync(reportPath+'.png',(await win.webContents.capturePage()).toPNG());
 console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(async error=>{
 let state;if(win&&!win.isDestroyed()){state=await win.webContents.executeJavaScript('({steps:window.__widgetSteps,python:window.TnsPythonPreview?.getSnapshot(),log:document.querySelector("#xml-log")?.textContent.slice(-1600)})').catch(()=>null);fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());}
 fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:error.stack||String(error),state},null,2));console.error(error);win?.destroy();server?.close();app.exit(1);
});
async function check(fixtures){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),must=(v,m)=>{if(!v)throw Error(m);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(25);}};
 window.__widgetSteps=[];const mark=value=>window.__widgetSteps.push(value);
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TiNotepadRichView&&window.TnsPythonPreview&&window.TnsGraphPreview&&!document.querySelector('#startup-loader'),'offline startup');
 applyLanguage('en');
 await loadXmlDoctorFiles([new File([fixtures.compound],'Problem1.xml')],'file');
 const native=await inspectXmlDocument();const groups=window.TnsDocumentPreviewNavigation.groups(native.items);groups.widgets=documentWidgetPreviewPages(native.items,groups);
 must(native.items.filter(i=>i.type==='Widget').length===4,'Graph internals became application widgets');
 must(groups.widgets.length===2&&groups.widgets[0].previewKind==='compound','Split apps created duplicate tabs');
 const compound=await openDocumentAppPreview(groups,'widgets',0,{});await pause(350);
 const panes=[...document.querySelectorAll('.compound-preview-pane')].map(p=>{const r=p.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,text:p.textContent};});
 must(panes.length===3&&panes[0].x<panes[1].x&&panes[2].y>panes[0].y&&panes[1].h>panes[0].h,'Native clay5 panel positions differ');
 must(panes[1].text.includes('cos')&&panes[1].text.includes('sin'),'Native note math boxes lost');
 must([...document.querySelectorAll('.compound-preview-pane .ti-note-run')].filter(node=>node.textContent.trim()).every(node=>parseFloat(getComputedStyle(node).fontSize)>=8),'Native Notes missing font attributes rendered as microscopic text');
 const oldWidth=compound.layout.w1;document.querySelector('.compound-divider-x').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
 must(compound.layout.w1>oldWidth,'Keyboard divider does not resize');
 await saveDocumentCardLayout(groups.widgets[0],compound.layout);
 must(pyodide.FS.readFile(xmlDoctor.stagePath+'/Problem1.xml',{encoding:'utf8'}).includes('w1="4937"'),'Layout save omitted native ratio');
 compound.dispose();await new Promise(resolve=>closeModal(compound.backdrop,resolve));await pause(300);mark('native compound layout/math/save');
 const fixture='<prob xmlns="urn:TI.Problem" xmlns:py="urn:TI.PythonEditor" xmlns:sh="urn:TI.PythonShell"><card clay="0"><wdgt type="TI.PythonEditor" ver="1.0"><py:data><py:name>demo.py</py:name><py:dirf>0</py:dirf></py:data></wdgt></card><card clay="0"><wdgt type="TI.PythonShell" ver="1.0"><sh:data><sh:name>demo.py</sh:name></sh:data></wdgt></card></prob>';
 await loadXmlDoctorFiles([new File([fixture],'Problem1.xml'),new File(['answer=21\ndef twice(x):\n    return x*2\nprint(twice(answer))\n'],'demo.py')],'file');
 const data=await inspectXmlDocument(),pyGroups=window.TnsDocumentPreviewNavigation.groups(data.items);pyGroups.widgets=documentWidgetPreviewPages(data.items,pyGroups);
 const editor=data.items.find(i=>i.content_label==='Python'),shell=data.items.find(i=>i.content_label==='PythonShell');
 must(editor&&shell,'Python editor or native shell not imported');
 const session={};await openDocumentAppPreview(pyGroups,'widgets',0,session);must(window.TnsPythonPreview.getSnapshot().mode==='editor','Python widget skipped editor');
 window.TnsPythonPreview.setSource('answer=30\ndef twice(x):\n    return x*2\nprint(twice(answer))\n');await window.TnsPythonPreview.run();
 await wait(()=>window.TnsPythonPreview.getSnapshot()?.mode==='shell'&&!window.TnsPythonPreview.getSnapshot()?.busy,'editor run to shell');
 must(window.TnsPythonPreview.getSnapshot().output.includes('60'),'Shell did not run current editor draft');
 await window.TnsPythonPreview.sendInput('twice(answer)+2');must(window.TnsPythonPreview.getSnapshot().output.includes('62'),'Shell lost script namespace');
 must(documentPythonPreviewSource(editor).source.includes('answer=30'),'Editor draft was not staged');
 window.TnsPythonPreview.close();mark('native Python editor/shell namespace');
 await openPyDoctorModal({code:documentPythonPreviewSource(editor).source,target:{mode:'xml-python',item:editor}});
 const box=document.querySelector('#py-code');box.value='answer=35';box.dispatchEvent(new Event('input',{bubbles:true}));
 must(documentPythonPreviewSource(editor).source==='answer=35','Syntax PY draft not autosaved');
 must(document.querySelector('#py-doctor-save-btn').hidden&&document.querySelector('#py-doctor-download-btn').hidden,'Removed Python toolbar actions visible');
 closePyDoctorModal();await pause(300);mark('Syntax PY autosave');
 const headers={en:['Name','Actions','Type','File','Path','Details'],es:['Nombre','Acciones','Tipo','Archivo','Ruta','Detalle'],fr:['Nom','Actions','Type','Fichier','Chemin','Détails']};
 for(const lang of ['en','es','fr']){
  applyLanguage(lang);await openDocumentInspector();await pause(300);
  const modal=document.querySelector('.inspector-modal'),actual=[...modal.querySelectorAll('thead th')].map(e=>e.textContent);
  must(JSON.stringify(actual)===JSON.stringify(headers[lang]),lang+' Inspector headers untranslated');
  must(modal.querySelector('.python-syntax-action')&&modal.querySelector('.python-shell-action')?.textContent==='Shell Run','Python Inspector actions incorrect');
  const widths=[...modal.querySelectorAll('thead th')].map(e=>e.getBoundingClientRect().width);
  must(widths.length===6&&widths[0]>=140&&widths[0]<=180&&widths[2]>=100&&widths[2]<=140&&widths[3]>=140&&widths[3]<=180,'Inspector columns changed: '+JSON.stringify(widths));
  must(modal.querySelector('table').getBoundingClientRect().width<1800,'Inspector table inflated to intrinsic content width');
  const actionRects=[...modal.querySelector('tr[data-inspector-element] .inspector-actions').children].filter(e=>e.getClientRects().length).map(e=>e.getBoundingClientRect());
  must(actionRects.every(r=>Math.abs(r.y+r.height/2-actionRects[0].y-actionRects[0].height/2)<1),'Inspector action buttons wrap: '+JSON.stringify(actionRects.map(r=>({x:r.x,y:r.y,w:r.width,h:r.height}))));
  modal.parentElement.remove();
 }
 mark('Inspector column widths, inline actions and EN/ES/FR');
 await loadXmlDoctorFiles([new File([fixtures.trig],'Problem1.xml')],'file');const trigData=await inspectXmlDocument();
 const calculator=trigData.items.find(item=>item.name==='TI.Scratchpad');must(calculator,'Native trig Calculator missing');
 const calc=await openCalculatorInLovePreview(calculator);await calc.submit('trigo(π/4)');
 await wait(()=>['ready','done','error'].includes(calc.getSnapshot().status)&&calc.getRows().length>0,'native trigo call');
 const trigRow=calc.getRows().at(-1);must(trigRow.status!=='error'&&JSON.stringify(trigRow).includes('√(2)/2'),'Native trigo omitted exact pi/4 result: '+JSON.stringify(trigRow));
 window.TnsPrgmPreview.close();mark('actual native trigo(pi/4) exact output');
 applyLanguage('en');await loadXmlDoctorFiles([new File([fixtures.compound],'Problem1.xml')],'file');
 const finalData=await inspectXmlDocument(),finalGroups=window.TnsDocumentPreviewNavigation.groups(finalData.items);finalGroups.widgets=documentWidgetPreviewPages(finalData.items,finalGroups);
 await openDocumentInspector();await pause(350);
 return{ok:true,steps:window.__widgetSteps,panes:panes.map(({text,...r})=>r)};
}
