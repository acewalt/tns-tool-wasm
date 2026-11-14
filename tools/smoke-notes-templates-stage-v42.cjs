/* Offline full-app regression: Notes template -> real staged XML -> native TNS -> reopen.
   Requires the prepared portable desktop vendor, as do other offline smoke tools. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const reportPath=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v42/notes-templates-stage.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-notes-stage-v42-')));
let win,server;const messages=[];
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',(_event,level,message)=>messages.push({level,message}));
 await win.loadURL(origin);
 const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
 await win.webContents.executeJavaScript('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))');
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(result,null,2));
 fs.writeFileSync(reportPath+'.png',(await win.webContents.capturePage()).toPNG());
 console.log(JSON.stringify(result));win.destroy();server.close();app.exit(0);
}).catch(async error=>{
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:error.stack||String(error),messages},null,2));
 if(win&&!win.isDestroyed())fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());
 console.error(error);win?.destroy();server?.close();app.exit(1);
});
async function check(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(20);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TiNotepadRichView&&window.TnsMathTools&&!document.querySelector('#startup-loader'),'offline Notes startup');
 applyLanguage('en');
 const esc=source=>source.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const rich='<r2dtotree><node name="1doc"><node name="1para"><node name="1rtline"><leaf name="1word" tc0="254" fst0="1" fs0="11">Native Notes: </leaf></node></node></node></r2dtotree>';
 const xml='<prob xmlns="urn:TI.Problem" ver="1.0"><sym/><card clay="0" h1="10000" h2="10000" w1="10000" w2="10000"><isDummyCard>0</isDummyCard><flag>0</flag><wdgt xmlns:np="urn:TI.Notepad" type="TI.Notepad" ver="2.0"><np:fmtxt>'+esc(rich)+'</np:fmtxt></wdgt></card></prob>';
 await loadXmlDoctorFiles([new File([xml],'Problem1.xml')],'file');
 let inspected=await inspectXmlDocument(),item=inspected.items.find(x=>x.kind==='notes'||x.type==='Widget'&&x.name==='TI.Notepad');
 must(item,'Native Notes fixture not found by real inspector');
 showNotepadModal(item,{});await pause(150);
 const editor=document.querySelector('.ti-note-rich-view');document.querySelector('#note-edit-view').click();
 const text=editor.querySelector('.ti-note-run').firstChild,range=document.createRange();range.setStart(text,text.length);range.collapse(true);
 editor.focus();getSelection().removeAllRanges();getSelection().addRange(range);document.dispatchEvent(new Event('selectionchange'));
 const templates=document.querySelector('#note-math-templates');must(templates,'Notes Templates button missing in real app');
 templates.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));templates.click();
 await wait(()=>document.querySelector('[data-template-id="fraction"]'),'offline template assets');document.querySelector('[data-template-id="fraction"]').click();
 const source=document.querySelector('.ti-note-math-source');source.value='((√(5)+1)/(4))';source.dispatchEvent(new Event('input',{bubbles:true}));source.closest('form').requestSubmit();
 must(editor.querySelector('mfrac msqrt'),'Real Notes insertion does not render fraction/root');
 document.querySelector('#note-save').click();await wait(()=>!document.querySelector('.ti-note-rich-modal'),'real Notes stage save');
 inspected=await inspectXmlDocument();item=inspected.items.find(x=>x.name==='TI.Notepad');
 must(item?.raw_xml.includes('0fraction')&&item.raw_xml.includes('0sqrt'),'Real staging flattened native operators');
 const model=TiNotepadRichView.parseNotepadRichText(item.raw_xml);
 must(model.plainText.includes('Native Notes: ((√(5)+1)/(4))'),'Real staging changed the caret/source order');
 const stageFile=item.file;
 pyodide.globals.set('qa_notes_file',stageFile);
 const native=await pyodide.runPythonAsync(`import os, pathlib, tempfile, tnstools
_qa_notes_stage=pathlib.Path(qa_notes_file).parent
_qa_notes_out=pathlib.Path('/tmp/qa-notes-template-v42.tns')
tnstools.build_tns_from_xml(_qa_notes_stage,_qa_notes_out)
_qa_notes_dir=pathlib.Path('/tmp/qa-notes-template-v42-reopened')
_qa_notes_dir.mkdir(exist_ok=True)
tnstools.decode_tns_file(_qa_notes_out,_qa_notes_dir)
len(_qa_notes_out.read_bytes())`);
 const decoded=await pyodide.runPythonAsync("(_qa_notes_dir / pathlib.Path(qa_notes_file).name).read_text(encoding='utf-8')");
 await loadXmlDoctorFiles([new File([decoded],'Problem1.xml')],'file');
 inspected=await inspectXmlDocument();item=inspected.items.find(x=>x.name==='TI.Notepad');showNotepadModal(item,{});await pause(150);
 const reopened=document.querySelector('.ti-note-rich-view'),formula=reopened.querySelector('[data-ti-native]');
 must(formula?.querySelector('mfrac msqrt'),'Native TNS build/decode/reopen lost editable mathematical structure');
 must(getComputedStyle(reopened.querySelector('.ti-note-run')).color==='rgb(0, 0, 254)','Native TNS roundtrip lost author color');
 must(getComputedStyle(reopened.querySelector('.ti-note-run')).fontWeight==='700','Native TNS roundtrip lost author bold');
 formula.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
 must(document.querySelector('.ti-note-math-source').value==='((√(5)+1)/(4))','Reopened native formula cannot be edited');
 return{ok:true,offline:true,sharedTemplates:true,realStageSave:true,nativeTnsBytes:Number(native),decodeReopen:true,operatorTree:true,stylePreserved:true,formulaEditable:true};
}
