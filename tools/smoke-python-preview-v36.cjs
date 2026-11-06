/* Exercises the real offline Python Editor, CPython Shell and saved TNS
   resources. It never accesses a connected calculator or user documents. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const reportPath=path.resolve(process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/python-preview-v36.json'));
let win,server;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 server=makeServer(root,path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(details,done)=>done({cancel:!details.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin);win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true});
 const editor=await win.webContents.executeJavaScript(`(${checkEditor.toString()})()`);
 await new Promise(resolve=>setTimeout(resolve,250));fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath+'.editor.png',(await win.webContents.capturePage()).toPNG());
 const shell=await win.webContents.executeJavaScript(`(${checkShell.toString()})()`);
 await new Promise(resolve=>setTimeout(resolve,250));fs.writeFileSync(reportPath+'.shell.png',(await win.webContents.capturePage()).toPNG());
 const persistence=await win.webContents.executeJavaScript(`(${checkPersistence.toString()})()`);
 const report={ok:true,editor,shell,persistence};fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(async error=>{
 console.error(error.stack||error);fs.mkdirSync(path.dirname(reportPath),{recursive:true});let state;
 if(win&&!win.isDestroyed()){
  state=await win.webContents.executeJavaScript('({steps:window.__pyV36Steps,snapshot:window.TnsPythonPreview?.getSnapshot(),xmlLog:document.querySelector("#xml-log")?.textContent.slice(-2000),pyLog:document.querySelector("#py-log")?.textContent.slice(-2000)})').catch(()=>null);
  fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());win.destroy();
 }
 fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:String(error),state},null,2));server?.close();app.exit(1);
});

async function checkEditor(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout '+label);await pause(30);}};
 const current=selector=>[...document.querySelectorAll(selector)].find(node=>!node.closest('.closing'));
 window.__pyV36Steps=[];const done=name=>window.__pyV36Steps.push(name);
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsPythonPreview&&!document.querySelector('#startup-loader')&&!document.querySelector('#xml-toggle-btn').disabled,'offline runtime');
 applyLanguage('en');if(document.querySelector('#xml-doctor-panel').classList.contains('collapsed'))document.querySelector('#xml-toggle-btn').click();await pause(200);
 const add=addPageFromFileMenu('program-editor');await wait(()=>current('#xpe-apply'),'program metadata');current('#xpe-apply').click();await add;await embedXmlCode();
 const first=await addPythonEditorToStage(),second=await addPythonEditorToStage();
 const source='x = 7\nprint("Hello Python")\nname = input("Name? ")\nprint(name)\nprint(x+1)';
 setDocumentPythonPreviewSource(first,source);setDocumentPythonPreviewSource(second,'print("second")\n');
 await openDocumentInspector();const inspector=current('.inspector-modal');
 const rows=[...inspector.querySelectorAll('tbody tr')].filter(row=>row.cells[0]?.textContent==='TI.PythonEditor');must(rows.length===2,'Expected two Python editor widgets');
 for(const row of rows){must(row.querySelector('.python-editor-action')?.textContent==='Open editor PY','Missing editor action');must(row.querySelector('.python-preview-action')?.textContent==='Preview PY','Missing execution action');}
 inspector.querySelector('[data-preview-kind="python"]').click();await wait(()=>current('.ti-python-editor-modal'),'Python summary opens editor');
 const modal=current('.ti-python-editor-modal'),field=modal.querySelector('[data-ti-py-source]'),stage=modal.querySelector('.ti-python-calculator'),rect=stage.getBoundingClientRect();
 must(!current('.ti-python-shell-modal'),'Python summary executed instead of opening its editor');must(field.value===source,'Wrong Python source');must(Math.abs(rect.width-320)<1&&Math.abs(rect.height-240)<1,'Python editor screen dimensions differ');
 must(getComputedStyle(field).fontFamily.toLowerCase().includes('arial'),'Python source must use a sans serif font');
 const colors={};for(const[kind,expected]of[['plain','rgb(17, 17, 17)'],['string','rgb(0, 128, 0)'],['operator','rgb(255, 0, 0)']]){colors[kind]=getComputedStyle(modal.querySelector('.ti-py-'+kind)).color;must(colors[kind]===expected,'Wrong Python '+kind+' color: '+colors[kind]);}
 must(modal.querySelector('[data-ti-py-name]').textContent===first.detail.name,'Python filename not shown');must(modal.querySelector('[data-ti-py-counter]').textContent==='1/5','Python line counter incorrect');
 const write=value=>{field.value=value;field.setSelectionRange(value.length,value.length);field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));};
 write('if True\n    print("broken")');field.dispatchEvent(new KeyboardEvent('keydown',{key:'b',ctrlKey:true,bubbles:true,cancelable:true}));await wait(()=>window.TnsPythonPreview.getSnapshot()?.report?.errors>0,'Ctrl+B invalid Python');
 write(source);field.dispatchEvent(new KeyboardEvent('keydown',{key:'b',ctrlKey:true,bubbles:true,cancelable:true}));await wait(()=>window.TnsPythonPreview.getSnapshot()?.report?.errors===0&&!window.TnsPythonPreview.getSnapshot().busy,'Ctrl+B valid Python');
 await window.TnsPythonPreview.save();must(!window.TnsPythonPreview.getSnapshot().dirty,'Python Save failed');
 done('editorPaletteAndValidation');window.__pyV36={first,second,source,rect:rect.toJSON(),backdrop:modal.closest('.modal-backdrop')};
 return{summaryOpensEditor:true,twoElementActions:true,dimensions:{width:rect.width,height:rect.height},colors,sharedSyntaxAnalyzer:true,save:true};
}

async function checkShell(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const wait=async(fn,label)=>{const end=Date.now()+30000;while(!fn()){if(Date.now()>end)throw Error('Timeout '+label);await pause(20);}};
 const state=window.__pyV36,field=document.querySelector('[data-ti-py-source]');field.dispatchEvent(new KeyboardEvent('keydown',{key:'r',ctrlKey:true,bubbles:true,cancelable:true}));
 await wait(()=>window.TnsPythonPreview.getSnapshot()?.mode==='shell'&&window.TnsPythonPreview.getSnapshot().result?.waitingForInput,'Ctrl+R shell input');
 let modal=document.querySelector('.ti-python-shell-modal');must(modal.closest('.modal-backdrop')===state.backdrop,'Editor/Shell replaced the outer window');const rect=modal.querySelector('.ti-python-calculator').getBoundingClientRect();must(['x','y','width','height'].every(key=>Math.abs(rect[key]-state.rect[key])<1),'Editor/Shell moved the calculator display');
 must(window.TnsPythonPreview.getSnapshot().output.includes('>>>#Running '+state.first.detail.name)&&window.TnsPythonPreview.getSnapshot().output.includes('Hello Python'),'Shell command header or output missing');must(!window.TnsPythonPreview.getSnapshot().output.includes('PreviewInputExhausted'),'Paused input displays an exception');
 await window.TnsPythonPreview.sendInput('World');must(window.TnsPythonPreview.getSnapshot().result?.success,'Python input did not finish');must(window.TnsPythonPreview.getSnapshot().output.includes('Name? World\nWorld\n8'),'Input or stdout differs');
 await window.TnsPythonPreview.sendInput('x+3');must(window.TnsPythonPreview.getSnapshot().output.endsWith('>>>x+3\n10\n'),'Shell cannot evaluate a defined variable');
 await window.TnsPythonPreview.sendInput('x=21');await window.TnsPythonPreview.sendInput('x');must(window.TnsPythonPreview.getSnapshot().output.endsWith('>>>x\n21\n'),'Shell namespace is not persistent');
 await window.TnsPythonPreview.sendInput('name');must(window.TnsPythonPreview.getSnapshot().output.endsWith(">>>name\n'World'\n"),'Input result is not in the Shell namespace');
 await window.TnsPythonPreview.sendInput('answer=input("Number? ")');must(window.TnsPythonPreview.getSnapshot().result.waitingForInput,'REPL input did not pause');await window.TnsPythonPreview.sendInput('');must(window.TnsPythonPreview.getSnapshot().result.success,'A blank input did not resume the REPL');await window.TnsPythonPreview.sendInput('repr(answer)');must(window.TnsPythonPreview.getSnapshot().result.success,'Input variable missing after resumed REPL');
 await window.TnsPythonPreview.sendInput('counter=0; items=[]');await window.TnsPythonPreview.sendInput('counter+=1; items.append(counter); extra=input("Continue? ")');must(window.TnsPythonPreview.getSnapshot().result.waitingForInput,'Mutable namespace input did not pause');await window.TnsPythonPreview.sendInput('yes');await window.TnsPythonPreview.sendInput('(counter,items,extra)');must(window.TnsPythonPreview.getSnapshot().output.endsWith(">>>(counter,items,extra)\n(1, [1], 'yes')\n"),'Resuming input duplicated namespace/list mutations');
 window.__pyV36Steps.push('shellInputAndPersistentNamespace');return{ctrlRRun:true,sharedLocation:true,persistentBackdrop:true,interactiveInput:true,blankInput:true,inputDoesNotRepeatNamespaceMutations:true,variablesAndExpressions:true,persistentNamespace:true};
}

async function checkPersistence(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const wait=async(fn,label)=>{const end=Date.now()+30000;while(!fn()){if(Date.now()>end)throw Error('Timeout '+label);await pause(20);}};
 const state=window.__pyV36,current=selector=>[...document.querySelectorAll(selector)].find(node=>!node.closest('.closing'));
 const pageTabs=()=>[...document.querySelectorAll('.ti-python-preview-modal .document-preview-tabs')].find(tabs=>tabs.getClientRects().length);
 pageTabs().querySelectorAll('.document-preview-tab')[1].click();await wait(()=>window.TnsPythonPreview.getSnapshot()?.mode==='editor'&&window.TnsPythonPreview.getSnapshot().name===state.second.detail.name,'Navigate to second editor');
 await window.TnsPythonPreview.run();await wait(()=>window.TnsPythonPreview.getSnapshot()?.mode==='shell'&&window.TnsPythonPreview.getSnapshot().result?.success,'Second script run');await window.TnsPythonPreview.sendInput('x');must(window.TnsPythonPreview.getSnapshot().result?.error?.type==='NameError','Python widgets share a namespace');
 pageTabs().querySelectorAll('.document-preview-tab')[0].click();await wait(()=>window.TnsPythonPreview.getSnapshot()?.mode==='editor'&&window.TnsPythonPreview.getSnapshot().name===state.first.detail.name,'Return to first editor');
 const edited=state.source.replace('x = 7','x = 11');window.TnsPythonPreview.setSource(edited);pageTabs().querySelectorAll('.document-preview-tab')[1].click();await wait(()=>window.TnsPythonPreview.getSnapshot()?.name===state.second.detail.name,'Navigate away from changed source');window.TnsPythonPreview.close();
 const engines=Number(await pyodide.runPythonAsync('len(globals().get("_tns_python_preview_sessions", {}))'));must(engines===0,'Closed preview retains interpreter sessions');
 current('.inspector-modal').querySelector('#inspector-close').click();await wait(()=>!current('.inspector-modal'),'Close Inspector');await openDocumentInspector();
 const inspector=current('.inspector-modal');inspector.querySelector('.python-preview-action').click();await wait(()=>window.TnsPythonPreview.getSnapshot()?.mode==='shell','Preview PY opens shell');must(!window.TnsPythonPreview.getSnapshot().result&&!window.TnsPythonPreview.getSnapshot().busy,'Inspector shell autoruns script');
 must(window.TnsPythonPreview.getSnapshot().source===edited,'Draft lost after reopening Inspector');window.TnsPythonPreview.close();
 inspector.querySelector('[data-preview-kind="widgets"]').click();await wait(()=>document.querySelector('.ti-program-editor-preview-modal'),'Widgets first app');
 const tabs=[...document.querySelectorAll('.ti-program-editor-preview-modal .document-preview-tabs')].find(t=>t.getClientRects().length);tabs.querySelectorAll('.document-preview-tab')[1].click();await wait(()=>window.TnsPythonPreview.getSnapshot()?.mode==='editor','Widgets Python editor');must(!document.querySelector('.ti-python-shell-modal'),'Widgets opens execution instead of Python editor');window.TnsPythonPreview.close();
 const roundtrip=JSON.parse(await pyodide.runPythonAsync(`
import json,xml.etree.ElementTree as ET
from pathlib import Path
from tnstools import build_tns_from_xml,decode_tns_file
from xml_scanner import local_name
build_tns_from_xml(Path("${xmlDoctor.stagePath}"),Path('/work/python-preview-v36.tns'))
decode_tns_file(Path('/work/python-preview-v36.tns'),Path('/work/python-preview-v36-roundtrip'))
resources=list(Path('/work/python-preview-v36-roundtrip').rglob('*.py'))
assert any(p.read_text(encoding='utf-8')==${JSON.stringify(edited)} for p in resources),'Edited Python source was lost in TNS export'
root=ET.parse('/work/python-preview-v36-roundtrip/Problem1.xml').getroot()
widgets=[e.attrib.get('type') for e in root.iter() if local_name(e.tag)=='wdgt']
assert widgets.count('TI.PythonEditor')==2,widgets
json.dumps({'ok':True,'pythonResources':len(resources),'pythonEditors':widgets.count('TI.PythonEditor')})
`));must(roundtrip.ok,'TNS roundtrip failed');window.__pyV36Steps.push('navigationIsolationDraftsAndTnsExport');return{differentWidgetNamespace:true,editorDraftRetained:true,inspectorShellDoesNotAutorun:true,widgetsOpensEditor:true,namespaceCleanup:true,tns:roundtrip};
}
