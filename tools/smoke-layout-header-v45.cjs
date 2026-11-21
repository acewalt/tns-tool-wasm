/* Offline Page layout header, correct page selection and draft preservation. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v45/layout-header.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-layout-header-v45-')));
let win,server;const logs=[];
app.whenReady().then(async()=>{
  server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
  win=new BrowserWindow({show:false,width:1600,height:1100,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
  win.webContents.on('console-message',(_e,level,message)=>{logs.push({level,message});if(message.startsWith('QA '))console.log(message);});
  await win.loadURL(origin);win.webContents.focus();
  const result=await Promise.race([win.webContents.executeJavaScript(`(${check.toString()})()`),new Promise((_,reject)=>setTimeout(()=>reject(Error('Smoke timeout')),90000))]);
  fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));
  fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));win.destroy();server.close();app.exit(0);
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack||String(error),logs},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(x,m)=>{if(!x)throw Error(m);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(25);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsCompoundPreview&&window.TnsPythonPreview&&!document.querySelector('#startup-loader'),'offline startup');applyLanguage('en');
 const blank=await(await fetch('./templates/blank_tns_xml/Problem1.xml')).text();await loadXmlDoctorFiles([new File([blank],'Problem1.xml')],'file');
 // The blank fixture already contains a Program Editor. The remaining factories
 // are the same ones reached by the +Page menu, without opening unrelated editors.
 for(const [label,create] of [['calculator',addCalculatorWidgetToStage],['sheets',addSpreadsheetWidgetToStage],['notes',addNotepadWidgetToStage],['graph',addGraphWidgetToStage],['lua',addLuaScriptAppToStage],['python',addPythonEditorToStage]]){console.log('QA factory '+label);await create();}
 console.log('QA image');
 const image=document.createElement('canvas');image.width=image.height=8;image.getContext('2d').fillRect(0,0,8,8);await addImageWidgetToStage(new File([await new Promise(resolve=>image.toBlob(resolve))],'header-image.png',{type:'image/png'}));
 console.log('QA shell');pyodide.globals.set('qa_header_file',String(xmlDoctor.stagePath)+'/Problem1.xml');
 await pyodide.runPythonAsync(`from pathlib import Path\nimport xml.etree.ElementTree as ET\np=Path(qa_header_file)\ntree=ET.parse(p);root=tree.getroot();ns='urn:TI.Problem';sh='urn:TI.PythonShell'\nET.register_namespace('',ns);ET.register_namespace('pysh',sh)\ncard=ET.SubElement(root,'{'+ns+'}card',{'clay':'0','w1':'10000','w2':'10000','h1':'10000','h2':'10000'})\nw=ET.SubElement(card,'{'+ns+'}wdgt',{'type':'TI.PythonShell','ver':'1.0'})\nET.SubElement(w,'{'+sh+'}data')\np.write_bytes(b'<?xml version="1.0" encoding="UTF-8" ?>'+ET.tostring(root,encoding='UTF-8',short_empty_elements=False))`);
 const groupsNow=async()=>{const d=await inspectXmlDocument(),g=TnsDocumentPreviewNavigation.groups(d.items);g.widgets=documentWidgetPreviewPages(d.items,g);return g;};
 let groups=await groupsNow();const kinds=[];
 const header=()=>[...document.querySelectorAll('.preview-window-backdrop')].filter(e=>!e.classList.contains('closing')).at(-1);
 const checkHeader=async(label,expectedPath)=>{
   await wait(()=>header()?.querySelector('.preview-window-header [data-document-page-layout]'),label+' header');
   console.log('QA header '+label);const overlay=header(),buttons=overlay.querySelectorAll('[data-document-page-layout],[data-compound-edit]'),b=buttons[0],row=overlay.querySelector('.preview-window-header-actions');
   must(buttons.length===1&&row.contains(b)&&b.getBoundingClientRect().width>0,label+' missing/duplicate Page layout header');
   const source=overlay.querySelector('[data-ti-pe-source],[data-ti-py-source]');
   if(source){source.value=label==='basic'?'Prgm\nDisp "HEADER DRAFT"\nEndPrgm':'print("HEADER DRAFT")';source.dispatchEvent(new Event('input',{bubbles:true}));}
   const entry=overlay.querySelector('[data-expression]');
   if(entry){entry.value='31+11';entry.dispatchEvent(new Event('input',{bubbles:true}));}
   const beforeSource=source?.value,beforeEntry=entry?.value;
   b.click();await wait(()=>document.querySelector('.document-page-layout-backdrop'),label+' layout opens');
   const organizer=document.querySelector('.document-page-layout-backdrop');
   must(Number(getComputedStyle(organizer).zIndex)>Number(getComputedStyle(overlay).zIndex),label+' organizer behind preview');
   const selected=organizer.querySelector('.page-layout-page[aria-pressed=true]');must(selected,label+' selected layout target missing');
   if(expectedPath){const pages=documentLayoutCards(await inspectXmlDocument()),target=pages[Number(selected.dataset.layoutPage)];must(target?.path===documentCardPath(expectedPath),label+' opened layout on '+target?.path+' instead of '+documentCardPath(expectedPath));}
   organizer.querySelector('[data-layout-close]').click();await pause(80);must(!organizer.isConnected&&overlay.isConnected,label+' close restores original preview');
   must(!source||source.isConnected&&source.value===beforeSource,label+' source draft changed while opening layout');
   must(!entry||entry.isConnected&&entry.value===beforeEntry,label+' calculator input draft changed while opening layout');
   const close=overlay.querySelector('[data-ti-pe-close],[data-ti-py-close],[data-close],[data-widget-close],#note-cancel,#spreadsheet-cancel,#image-close,#love-preview-close-top,#py-preview-close');must(close,label+' close absent');close.click();await wait(()=>!overlay.isConnected,label+' preview closes');
   kinds.push(label);
 };
 for(let i=0;i<groups.widgets.length;i++){
   const page=groups.widgets[i],kind=page.name==='TI.PythonShell'?'python-shell':page.previewKind;
   console.log('QA open '+kind);await openDocumentAppPreview(groups,'widgets',i,{});await checkHeader(kind,page.path);
 }
 for(const kind of ['calculators','sheets','graphs','notes','images','lua','basic','python','python-shell'])must(kinds.includes(kind),'Missing fixture '+kind);
 // Direct +Page flow must receive the same action without Inspector navigation.
 groups=await groupsNow();for(const [kind,open] of [['calculators',openCalculatorInLovePreview],['sheets',showSpreadsheetModal],['graphs',openGraphInLovePreview],['notes',showNotepadModal],['images',showImageModal]]){
   const page=groups.widgets.find(p=>p.previewKind===kind);await open(page.previewItem||page);await checkHeader('direct-'+kind,page.path);
 }
 const data=await inspectXmlDocument(),cards=documentLayoutCards(data).slice(0,2);await applyDocumentPageLayout({action:'group',file:cards[0].file,path:cards[0].path,cards,layout:{clay:1,w1:5000,h1:5000,w2:5000,h2:5000}});groups=await groupsNow();await openDocumentAppPreview(groups,'widgets',groups.widgets.findIndex(p=>p.previewKind==='compound'),{});await checkHeader('compound');
 return{ok:true,offline:true,headerOnAllApps:kinds,oneHeaderAction:true,correctPageSelected:true,stackedOrganizer:true,closeRestoresPreview:true,sourceAndInputDraftsPreserved:true};
}
