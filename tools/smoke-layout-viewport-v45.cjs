/* Real offline grouped viewports: native sizes, zoom, expanding and Sheet isolation. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v45/viewport.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-layout-viewport-v45-')));
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
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(20);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TiNotepadRichView?.mountEditor&&!document.querySelector('#startup-loader'),'offline startup');applyLanguage('en');
 await loadXmlDoctorFiles([new File(['<prob xmlns="urn:TI.Problem" ver="1.0"><sym/></prob>'],'Problem1.xml')],'file');
 await addNotepadWidgetToStage(); const note=(await inspectXmlDocument()).items.find(i=>i.name==='TI.Notepad');await saveNotepadWidgetToStage(note,'Some text to edit and format');await addCalculatorWidgetToStage();await addGraphWidgetToStage();await addSpreadsheetWidgetToStage();
 let data=await inspectXmlDocument(),cards=documentLayoutCards(data);
 await applyDocumentPageLayout({action:'group',file:cards[0].file,path:cards[0].path,cards,layout:{clay:7,w1:5000,h1:5000,w2:5000,h2:5000}});
 data=await inspectXmlDocument();const groups=TnsDocumentPreviewNavigation.groups(data.items);groups.widgets=documentWidgetPreviewPages(data.items,groups);
 const preview=await openDocumentAppPreview(groups,'widgets',0,{});await pause(200);
 const rect=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return {tag:n.tagName,class:n.className,x:r.x,y:r.y,w:r.width,h:r.height,cw:n.clientWidth,ch:n.clientHeight,sw:n.scrollWidth,sh:n.scrollHeight,overflow:s.overflow,transform:s.transform}};
 const modal=preview.backdrop.querySelector('.compound-preview-modal'),frame=modal.querySelector('.preview-window-frame'),display=modal.querySelector('.compound-preview-calculator');
 const sheetPane=modal.querySelector('[data-app-kind=sheets]');
 must(sheetPane.querySelector('.spreadsheet-formula-bar'),'Sheet lost its formula bar during mounting');
 must(!modal.querySelector('.preview-window-header.spreadsheet-modal-header'),'Nested Sheet header was taken out of its application');
 must(!modal.querySelector('.preview-window-left .ti-note-modebar'),'Nested Notes controls were taken out of their application');
 const info=()=>({frame:rect(frame),display:rect(display),panes:[...modal.querySelectorAll('.compound-preview-pane')].map(p=>({kind:p.dataset.appKind,pane:rect(p),child:rect(p.firstElementChild)}))});
 const validate=(state,label)=>{
   must(Math.abs(state.frame.w/state.frame.h-4/3)<.01,label+' display aspect changed');
   must(state.frame.sw<=state.frame.cw+1&&state.frame.sh<=state.frame.ch+1,label+' gained an outer scrollbar');
   must(state.display.sw<=state.display.cw+1&&state.display.sh<=state.display.ch+1,label+' display overflow');
   must(state.panes.length===4,label+' lost a pane');
   for(const {kind,pane,child} of state.panes){
     must(pane.sw<=pane.cw+1&&pane.sh<=pane.ch+1,label+' wrapper gained a scrollbar: '+pane.class);
     if(kind!=='sheets')must(Math.abs(pane.w-child.w)<2&&Math.abs(pane.h-child.h)<2,label+' child does not fit '+kind);
   }
 };
 const states={normal:info()};
 preview.backdrop.querySelector('[data-preview-window-zoom]').click();await pause(160);states.zoom=info();
 preview.backdrop.querySelector('[data-preview-window-expand]').click();await pause(160);states.expanded=info();
 preview.backdrop.querySelector('[data-preview-window-expand]').click();await pause(160);states.restored=info();
 for(const [name,state] of Object.entries(states))validate(state,name);
 must(states.normal.display.cw===320&&states.normal.display.ch===240,'Normal display must remain 320x240');
 must(states.zoom.display.cw===320&&states.zoom.frame.cw===560,'Magnifier should scale the existing display once');
 must(states.expanded.display.cw>320&&states.expanded.display.transform==='matrix(1, 0, 0, 1, 0, 0)','Expanded view must resize without magnifier scaling');
 return {ok:true,offline:true,nestedControlsIsolated:true,noOuterScrollbars:true,fourPaneGeometry:true,states};
}
