/* Offline browser regression using an optional private native XML fixture directory. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const input=path.resolve(process.argv[2]||path.join(root,'release/qa/widgets-v39'));
const reportPath=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v41/compound-browser.json');
const source=fs.readFileSync(path.join(input,'case3-Problem1.xml'),'utf8');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-compound-v41-')));
app.commandLine.appendSwitch('disable-gpu');
let win,server;
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1600,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin);
 const report=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(source)})`);
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
 fs.writeFileSync(reportPath+'.png',(await win.webContents.capturePage()).toPNG());
 console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(async error=>{
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:error.stack||String(error)},null,2));
 if(win&&!win.isDestroyed())fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());
 console.error(error);win?.destroy();server?.close();app.exit(1);
});
async function check(source){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),must=(v,m)=>{if(!v)throw Error(m);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(25);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsGraphPreview&&window.TiNotepadRichView&&!document.querySelector('#startup-loader'),'offline startup');
 applyLanguage('en');
 await loadXmlDoctorFiles([new File([source],'Problem1.xml')],'file');
 const inspection=await inspectXmlDocument(),groups=TnsDocumentPreviewNavigation.groups(inspection.items);groups.widgets=documentWidgetPreviewPages(inspection.items,groups);
 const opened=await openDocumentAppPreview(groups,'widgets',0,{});await pause(300);await document.fonts.ready;
 const modal=opened.backdrop.querySelector('.preview-window'),panes=[...modal.querySelectorAll('.compound-preview-pane')],chrome=modal.querySelector('.compound-preview-chrome');
 must(panes.length===3,'Native split page did not preserve all three applications');
 const rects=panes.map(p=>p.getBoundingClientRect());
 must(rects[0].x<rects[1].x&&rects[2].y>rects[0].y&&rects[1].height>rects[0].height,'Native clay=5 layout changed');
 const colors=[];
 for(const index of [0,1,2,0]){
  panes[index].dispatchEvent(new PointerEvent('pointerdown',{button:0,bubbles:true}));
  const color=getComputedStyle(chrome).borderBottomColor;colors.push(color);
  const kind=index===0?'graphs':'notes';
  must(chrome.dataset.previewAppKind===kind,'Active pane did not update calculator header kind');
  must(panes[index].dataset.active==='true','Active pane outline missing');
 }
 must(colors[0]!==colors[1]&&colors[1]===colors[2]&&colors[0]===colors[3],'Graph and Notes header accents are not distinct');
 const formulas=[...panes[1].querySelectorAll('.ti-note-math-output')];
 must(formulas.length===3,'Native trig output boxes missing');
 must(formulas.every(node=>getComputedStyle(node).color==='rgb(0, 0, 0)'),'Output-only math inherited the green cached answer color');
 must(formulas.every(node=>node.querySelector('math[displaystyle="true"]')),'Native fractions still use small inline numerator layout');
 must(formulas.every(node=>getComputedStyle(node.parentElement).overflowX==='visible'),'Short inline formulas acquired individual scrollbars');
 must(panes[1].querySelector('mo')&&![...panes[1].querySelectorAll('mo')].some(node=>node.textContent==='*'),'Mathematical products display literal asterisks');
 const graph=opened.controllers[0],scaleRatio=()=>{const s=graph.getState(),r=graph.canvas.getBoundingClientRect();return r.width/(s.viewport.xmax-s.viewport.xmin)/(r.height/(s.viewport.ymax-s.viewport.ymin));};
 const normalRatio=scaleRatio();must(Math.abs(normalRatio-1)<.025,'Native unit circle distorted in compound pane: '+normalRatio);
 must(!graph.getState().animationAvailable,'Non-animated native circle acquired a Play control');
 const model=graph.getState(),vertices=TnsGraphPreview.geometry(model).polygon(model.objects.find(object=>object.id==='25'));
 must(vertices.length===12&&vertices.every(p=>Math.abs(Math.hypot(p.x,p.y)-1)<.00001),'Native polygon dependencies escape the unit circle');
 modal.querySelector('[data-preview-window-zoom]').click();await pause(250);
 const zoomBounds=graph.canvas.getBoundingClientRect();
 must(graph.canvas.width>=zoomBounds.width-.5&&graph.canvas.height>=zoomBounds.height-.5,'Compound graph magnifier uses low resolution canvas');
 const zoomRatio=scaleRatio();must(Math.abs(zoomRatio-normalRatio)<.01,'Zoom changed unit circle shape');
 modal.querySelector('[data-preview-window-expand]').click();await pause(200);
 must(modal.querySelector('[data-preview-window-zoom]').disabled,'Magnifier enabled in expanded view');
 const expandedRatio=scaleRatio();must(Math.abs(expandedRatio-normalRatio)<.025,'Expanded compound graph changed world scale');
 modal.querySelector('[data-preview-window-expand]').click();await pause(250);
 must(!graph.root.dataset.error,'Compound geometry error: '+graph.root.dataset.error);
 return{ok:true,offline:true,checks:['native split layout','active application header color','output-only black formulas','full-size fractions','centered math products','regular polygon circle dependencies','native animation flag','high DPI magnifier','expanded proportions'],colors,normalRatio,zoomRatio,expandedRatio,resolution:{width:graph.canvas.width,height:graph.canvas.height}};
}
