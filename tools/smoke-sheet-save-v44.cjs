/* Repeated standalone/compound Sheets saves through the offline native bridge. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v44/sheet-save.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-sheet-save-v44-')));
let win,server;const logs=[];
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1500,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',(_e,level,message)=>logs.push({level,message}));await win.loadURL(origin);win.webContents.focus();
 const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
 fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));console.log(JSON.stringify(result));win.destroy();server.close();app.exit(0);
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack||String(error),logs},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),must=(x,m)=>{if(!x)throw Error(m);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(20);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsCompoundPreview&&!document.querySelector('#startup-loader'),'startup');applyLanguage('en');
 const blank=await(await fetch('./templates/blank_tns_xml/Problem1.xml')).text();await loadXmlDoctorFiles([new File([blank],'Problem1.xml')],'file');
 let item=await addSpreadsheetWidgetToStage();
 // Creation opens a new Inspector before the first editor; its rows still
 // close over the original blank snapshot after that editor saves.
 await openDocumentInspector();showSpreadsheetModal(item);await pause(100);
 const enter=(row,col,value)=>{const m=document.querySelector('.spreadsheet-modal'),cell=m.querySelector('.sheet-cell[data-row="'+row+'"][data-col="'+col+'"]');cell.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:1}));window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:1}));const f=m.querySelector('.spreadsheet-formula-value');f.focus();f.value=value;f.dispatchEvent(new InputEvent('input',{bubbles:true}));f.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));};
 enter(0,0,'666');enter(0,1,'123');enter(1,0,'=A1+B1');document.querySelector('#spreadsheet-save').click();
 await wait(()=>!document.querySelector('.spreadsheet-modal'),'first UI Save');
 document.querySelector('.spreadsheet-action').click();await wait(()=>document.querySelector('.spreadsheet-modal'),'cached Inspector reopen');
 must(document.querySelector('.sheet-cell[data-row="0"][data-col="0"]').textContent==='666','Inspector reopened blank instead of saved A1');
 must(document.querySelector('.sheet-cell[data-row="1"][data-col="0"]').textContent==='789','Inspector reopened without saved formula result');
 enter(0,0,'667');document.querySelector('#spreadsheet-save').click();await wait(()=>!document.querySelector('.spreadsheet-modal'),'second UI Save');
 document.querySelector('#inspector-close').click();await pause(250);item=(await inspectXmlDocument()).items.find(x=>x.name==='tabulator');
 const state={cells:{'0:0':{formula:'5',data:'5'},'0:1':{formula:'6',data:'6'},'0:2':{formula:'=A1+B1',data:'11'}},dirty:true};
 await saveSpreadsheetPreview(item,state);state.cells['0:0']={formula:'7',data:'7'};state.cells['0:2'].data='13';await saveSpreadsheetPreview(item,state);
 // Other native app saves/creation rewrite the document's namespace prefixes.
 await addCalculatorWidgetToStage();state.cells['0:0']={formula:'8',data:'8'};state.cells['0:2'].data='14';await saveSpreadsheetPreview(item,state);
 const now=async()=>{const data=await inspectXmlDocument(),groups=TnsDocumentPreviewNavigation.groups(data.items);groups.widgets=documentWidgetPreviewPages(data.items,groups);return{data,groups};};
 let inspected=await now(),cards=documentLayoutCards(inspected.data);const selected=cards.filter(c=>c.apps.some(a=>a.name==='TI.Scratchpad'||a.name==='tabulator'));
 await applyDocumentPageLayout({action:'group',file:selected[0].file,path:selected[0].path,cards:selected,layout:{clay:1,w1:5000,h1:10000,w2:10000,h2:10000}});
 inspected=await now();let index=inspected.groups.widgets.findIndex(p=>p.previewKind==='compound');const preview=await openDocumentAppPreview(inspected.groups,'widgets',index,{});await pause(100);
 const sheet=preview.controllers.find(c=>c.state?.cells);must(sheet,'Missing mounted sheet');sheet.state.cells['0:0']={formula:'9',data:'9'};sheet.state.dirty=true;await sheet.save();
 const save=preview.backdrop.querySelector('[data-compound-save]');save.click();await wait(()=>preview.backdrop.querySelector('[data-compound-status]').textContent==='Layout saved','compound save');
 sheet.state.cells['0:0']={formula:'10',data:'10'};sheet.state.dirty=true;await sheet.save();
 // A serialized empty result must not poison the returned next-save snapshot.
 sheet.state.cells['1:0']={formula:'=unsupported(1)',data:''};sheet.state.dirty=true;await sheet.save();sheet.state.cells['1:0'].data='pending';sheet.state.dirty=true;await sheet.save();
 preview.dispose();closeModal(preview.backdrop);await pause(250);
 const reopened=await openDocumentAppPreview(inspected.groups,'widgets',index,{});await pause(50);
 must(reopened.backdrop.querySelector('[data-app-kind=sheets] .sheet-cell[data-row="0"][data-col="0"]').textContent==='10','Cached grouped Inspector reopened old sheet data');
 const stale=(await inspectXmlDocument()).items.find(i=>i.name==='tabulator');
 const fresh=await readStoredDocumentWidget(stale,'tabulator');await saveSpreadsheetPreview(fresh,{cells:{'0:0':{formula:'55',data:'55'}}});
 const before=pyodide.FS.readFile(fresh.file,{encoding:'utf8'});let rejected=false;
 try{await saveSpreadsheetPreview(stale,{cells:{'0:0':{formula:'999',data:'999'}}});}catch(error){rejected=/selected spreadsheet changed/.test(error.message);}
 must(rejected,'An already-open stale sheet overwrote a newer save');must(pyodide.FS.readFile(fresh.file,{encoding:'utf8'})===before,'Rejected concurrent save changed native file');
 pyodide.globals.set('qa_sheet_v44_file',fresh.file);
 const native=JSON.parse(await pyodide.runPythonAsync(`import json,pathlib,tnstools
_qa_sheet_file=pathlib.Path(qa_sheet_v44_file)
_qa_sheet_tns=pathlib.Path('/tmp/qa-sheet-v44.tns')
_qa_sheet_decoded=pathlib.Path('/tmp/qa-sheet-v44-decoded')
tnstools.build_tns_from_xml(_qa_sheet_file.parent,_qa_sheet_tns)
_qa_sheet_decoded.mkdir(exist_ok=True)
tnstools.decode_tns_file(_qa_sheet_tns,_qa_sheet_decoded)
json.dumps({'bytes':len(_qa_sheet_tns.read_bytes()),'xml':(_qa_sheet_decoded/_qa_sheet_file.name).read_text(encoding='utf-8')})`));
 must(native.bytes>0&&extractSpreadsheetStateFromRawXml(native.xml).cells['0:0'].data==='55','Native TNS roundtrip lost sheet save');
 return{ok:true,offline:true,inspectorReopen:true,secondInspectorSave:true,repeatedStandalone:true,afterSiblingRewrite:true,repeatedGrouped:true,groupInspectorReopen:true,emptyResultSnapshot:true,concurrentChangeRejected:true,nativeTnsRoundtrip:true};
}
