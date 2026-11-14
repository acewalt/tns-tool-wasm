/* Full application/offline native layout roundtrip. Private fixtures stay local. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const fixtures=path.resolve(process.argv[2]||path.join(root,'release/qa/widgets-v39'));
const reportPath=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v42/layout-editor-browser.json');
const source=fs.readFileSync(path.join(fixtures,'case3-Problem1.xml'),'utf8');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-layout-editor-v42-')));
app.commandLine.appendSwitch('disable-gpu');let win,server;
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(r,done)=>done({cancel:!r.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin);const report=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(source)})`);
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));await new Promise(r=>setTimeout(r,700));fs.writeFileSync(reportPath+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(async e=>{fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:e.stack},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(e);win?.destroy();server?.close();app.exit(1);});
async function check(source){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(30);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsDocumentPageLayout&&!document.querySelector('#startup-loader'),'offline startup');
 applyLanguage('en'); if(!document.body.classList.contains('app-active'))document.querySelector('#xml-toggle-btn').click();await pause(500); await loadXmlDoctorFiles([new File([source],'Problem1.xml')],'file');
 const counts=data=>[data.summary.cards,data.summary.widgets];const before=await inspectXmlDocument();must(JSON.stringify(counts(before))==='[2,4]','Wrong initial native counts');
 await openDocumentInspector();let summary=document.querySelector('.inspector-summary');must(summary.firstElementChild.textContent==='Cards: 2','Cards is not the first summary action');must(summary.firstElementChild.dataset.previewKind==='widgets','Cards lost page preview');must([...summary.children].some(x=>x.textContent==='Widgets: 4'&&x.tagName==='SPAN'),'Widgets must be the non-page app count');
 const table=document.querySelector('.inspector-table');must(table.querySelectorAll('th').length===6,'Inspector columns changed');
 const layout=await openDocumentPageLayout();const modal=layout.modal;must(modal.querySelectorAll('[data-layout-clay]').length===8,'Eight designs not available');must(layout.getState().order.length===3,'Native grouped apps missing');
 modal.querySelector('[data-layout-clay="3"]').click();modal.querySelector('[data-layout-order] li button:last-child').click();
 const signature=item=>new XMLSerializer().serializeToString(new DOMParser().parseFromString(item.raw_xml,'text/xml').documentElement).replace(/\s+xmlns(?::\w+)?="[^"]*"/g,'');
 const widgetBefore=before.items.filter(x=>x.type==='Widget').map(signature).sort();
 modal.querySelector('[data-layout-save]').click();await wait(()=>modal.querySelector('[data-layout-status]').textContent==='Changes saved in the document.','arrange native page');
 const arranged=await inspectXmlDocument();let cards=documentLayoutCards(arranged);must(cards[0].detail.clay==='3'&&cards[0].apps[0].name==='TI.Notepad','Preset/order not saved to native XML');
 must(JSON.stringify(arranged.items.filter(x=>x.type==='Widget').map(signature).sort())===JSON.stringify(widgetBefore),'Arrange changed app data');
 modal.querySelector('[data-layout-ungroup]').click();await wait(()=>layout.getState().pages.length===4,'ungroup');
 must(JSON.stringify(counts(await inspectXmlDocument()))==='[4,4]','Ungroup did not produce four single-app pages');
 const checkboxes=[...modal.querySelectorAll('[data-layout-group-list] input')];checkboxes.forEach(c=>{if(!c.checked)c.click();});must(!modal.querySelector('[data-layout-group]').disabled,'Group four apps unavailable');
 modal.querySelector('[data-layout-group]').click();await wait(()=>layout.getState().pages.length===1,'group four applications');
 const grouped=await inspectXmlDocument();cards=documentLayoutCards(grouped);must(JSON.stringify(counts(grouped))==='[1,4]'&&cards[0].detail.clay==='7','Group did not create native four-pane page');
 must(JSON.stringify(grouped.items.filter(x=>x.type==='Widget').map(signature).sort())===JSON.stringify(widgetBefore),'Group lost native application data');
 must(layout.getState().order.length===4,'UI not refreshed after grouping'); const groups=TnsDocumentPreviewNavigation.groups(grouped.items);groups.widgets=documentWidgetPreviewPages(grouped.items,groups);const mixed=await openDocumentAppPreview(groups,'widgets',0,{});await pause(300);must(mixed.backdrop.querySelectorAll('.compound-preview-pane').length===4,'Grouped preview lost app slots');must(mixed.backdrop.querySelectorAll('.compound-preview-pane[data-app-kind=sheets] .sheet-cell').length>=240,'Grouped native Spreadsheet not embedded');mixed.dispose();await new Promise(r=>closeModal(mixed.backdrop,r));
 for(const lang of ['es','fr','en']){applyLanguage(lang);const translated=await openDocumentPageLayout();must(translated.modal.querySelector('h2').textContent.length>4,'Layout translation missing');translated.close();}
 const stale=layout.getState().pages[0];let failed=false;try{await applyDocumentPageLayout({action:'layout',file:stale.file,path:stale.path,cards:[{...stale,raw_xml:stale.raw_xml.replace('clay="7"','clay="0"')}],clay:7,order:[0,1,2,3]});}catch(e){failed=/changed/.test(e.message);}must(failed,'Stale snapshot overwrote page');
 const visual=await openDocumentPageLayout(); await pause(500);must(visual.backdrop.isConnected,'Layout modal disconnected');window.__layoutVisual=visual; const native=pyodide.FS.readFile(xmlDoctor.stagePath+'/Problem1.xml',{encoding:'utf8'});must(!native.includes('tns-layout')&&native.includes('clay="7"'),'Temporary layout metadata leaked into native output');
 return{ok:true,offline:true,checks:['Cards first / Widgets count','all Inspector columns preserved','8 layouts','native order and preset saved','native snapshots preserved','ungroup 2→4 pages','group 4→1 pages','ES/EN/FR','stale snapshot rejected'],counts:counts(grouped),ui:{modals:document.querySelectorAll('.modal-backdrop').length,rect:visual.modal.getBoundingClientRect().toJSON(),display:getComputedStyle(visual.backdrop).display,opacity:getComputedStyle(visual.backdrop).opacity,zIndex:getComputedStyle(visual.backdrop).zIndex,top:document.elementFromPoint(720,500)?.outerHTML.slice(0,140)}};
}
