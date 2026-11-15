/* Real offline Notes editing, repeated save, grouped page and TNS roundtrip. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v44/notes-layout.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-notes-layout-v44-')));
let win,server;const logs=[];
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1600,height:1100,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',(_e,level,message)=>logs.push({level,message}));await win.loadURL(origin);
 const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
 fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));
 fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));win.destroy();server.close();app.exit(0);
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack||String(error),logs},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(x,m)=>{if(!x)throw Error(m);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(20);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TiNotepadRichView?.mountEditor&&!document.querySelector('#startup-loader'),'offline startup');applyLanguage('en');
 await loadXmlDoctorFiles([new File(['<prob xmlns="urn:TI.Problem" ver="1.0"><sym/></prob>'],'Problem1.xml')],'file');
 const staleNote=await addNotepadWidgetToStage();await addNotepadWidgetToStage();await addCalculatorWidgetToStage();await addSpreadsheetWidgetToStage();
 await showNotepadModal(staleNote);document.querySelector('#note-edit-view').click();let editor=document.querySelector('.ti-note-rich-view');editor.focus();document.execCommand('insertText',false,'Standalone saved 44');
 document.querySelector('#note-save').click();await wait(()=>!document.querySelector('.ti-note-rich-modal'),'first save');
 await showNotepadModal(staleNote);must(document.querySelector('.ti-note-rich-view').textContent.includes('Standalone saved 44'),'Old Inspector item reopened empty Notes');document.querySelector('#note-cancel').click();await pause(250);
 // A formatting edit during the asynchronous native save must be flushed too.
 const raceItem=await readStoredDocumentWidget(staleNote,'TI.Notepad'),raceHost=document.createElement('div');document.body.append(raceHost);
 let releaseSave,saveStarted,saveCount=0;const entered=new Promise(resolve=>saveStarted=resolve);
 const raceEditor=TiNotepadRichView.mountEditor(raceHost,raceItem,{onSaveRich:async(text,rich)=>{
  if(++saveCount===1){saveStarted();await new Promise(resolve=>releaseSave=resolve);}
  return saveNotepadWidgetToStage(raceItem,text,rich);
 }});
 raceEditor.editor.focus();document.execCommand('insertText',false,' During save');const inFlight=raceEditor.save();await entered;
 const selected=document.createRange();selected.selectNodeContents(raceEditor.editor);getSelection().removeAllRanges();getSelection().addRange(selected);
 raceHost.querySelector('[data-command=bold]')?.click();
 if(!raceEditor.editor.querySelector('b,strong')) {document.execCommand('bold',false);raceEditor.editor.dispatchEvent(new Event('input',{bubbles:true}));}
 releaseSave();await inFlight;must(saveCount===2,'An edit during Save was incorrectly marked as saved');
 const raceRich=TiNotepadRichView.parseNotepadRichText((await readStoredDocumentWidget(raceItem,'TI.Notepad')).raw_xml);must(raceRich,'Saved rich Notes is invalid');
 raceEditor.destroy();raceHost.remove();
 let data=await inspectXmlDocument(),cards=documentLayoutCards(data);must(cards.length===4,'Expected four application pages');
 await applyDocumentPageLayout({action:'group',file:cards[0].file,path:cards[0].path,cards,layout:{clay:7,w1:5000,h1:5000,w2:5000,h2:5000}});
 const groupsNow=async()=>{const d=await inspectXmlDocument(),g=TnsDocumentPreviewNavigation.groups(d.items);g.widgets=documentWidgetPreviewPages(d.items,g);return g;};
 let groups=await groupsNow(),preview=await openDocumentAppPreview(groups,'widgets',0,{});await pause(80);
 let panes=[...preview.backdrop.querySelectorAll('[data-app-kind=notes]')];must(panes.length===2,'Both Notes apps must mount');
 for(const [index,pane] of panes.entries()){
  const rich=pane.querySelector('.ti-note-rich-view');must(rich.contentEditable==='true','Grouped Notes is read only');
  const bounds=rich.getBoundingClientRect();must(bounds.height>25&&bounds.width>60,'Grouped Notes collapsed');
  must(Math.abs(bounds.height-pane.querySelector('.note-calculator-shell').getBoundingClientRect().height)<1,'A hidden native header left dead space in grouped Notes');
  rich.focus();const range=document.createRange();range.selectNodeContents(rich);range.collapse(false);getSelection().removeAllRanges();getSelection().addRange(range);
  must(document.execCommand('insertText',false,' Layout note '+index),'Native browser text insertion failed');
 }
 editor=panes[0].querySelector('.ti-note-rich-view');editor.focus();const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);getSelection().removeAllRanges();getSelection().addRange(range);document.dispatchEvent(new Event('selectionchange'));
 const button=panes[0].querySelector('#note-math-templates');button.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));button.click();
 await wait(()=>document.querySelector('[data-template-id=fraction]'),'templates');document.querySelector('[data-template-id=fraction]').click();
 const field=panes[0].querySelector('.ti-note-math-source');must(field,'Template was not inserted in the active Notes pane');field.value='((3)/(4))';field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
 must(editor.querySelector('mfrac'),'Native fraction is missing');
 preview.backdrop.querySelector('[data-compound-save]').click();await wait(()=>preview.backdrop.querySelector('[data-compound-status]').textContent==='Layout saved','group save');
 let stored=(await inspectXmlDocument()).items.filter(i=>i.name==='TI.Notepad');must(stored[0].raw_xml.includes('Layout note 0')&&stored[1].raw_xml.includes('Layout note 1'),'Grouped save omitted a Notes app');must(stored[0].raw_xml.includes('0fraction'),'Grouped save flattened math');
 editor.focus();const end=document.createRange();end.selectNodeContents(editor);end.collapse(false);getSelection().removeAllRanges();getSelection().addRange(end);document.execCommand('insertText',false,' Second save');
 preview.backdrop.querySelector('[data-compound-save]').click();await wait(()=>!preview.backdrop.querySelector('[data-compound-save]').disabled,'second group save');await pause(100);
 must((await inspectXmlDocument()).items.find(i=>i.name==='TI.Notepad').raw_xml.includes('Second save'),'Repeated save lost latest Notes');
 preview.backdrop.querySelector('[data-widget-close]').click();await pause(250);groups=await groupsNow();preview=await openDocumentAppPreview(groups,'widgets',0,{});await pause(50);
 must(preview.backdrop.querySelector('[data-app-kind=notes]').textContent.includes('Second save'),'Saved grouped Notes reset after new session');
 const stage=xmlDoctor.stagePath;pyodide.globals.set('qa_notes_layout_stage',stage);
 const decoded=await pyodide.runPythonAsync(`import pathlib,tnstools\n_qa_root=pathlib.Path(qa_notes_layout_stage)\n_qa_tns=pathlib.Path('/tmp/notes-layout-v44.tns')\ntnstools.build_tns_from_xml(_qa_root,_qa_tns)\n_qa_out=pathlib.Path('/tmp/notes-layout-v44-reopened');_qa_out.mkdir(exist_ok=True)\ntnstools.decode_tns_file(_qa_tns,_qa_out)\n(_qa_out/'Problem1.xml').read_text(encoding='utf-8')`);
 must(decoded.includes('Second save')&&decoded.includes('Layout note 1')&&decoded.includes('0fraction'),'Native TNS roundtrip lost grouped Notes');
 return{ok:true,offline:true,staleInspectorRefresh:true,editDuringSaveFlushed:true,editableGroupedNotes:true,multipleNotesIsolated:true,directTemplate:true,repeatedSave:true,newSessionReopen:true,nativeTnsRoundtrip:true};
}
