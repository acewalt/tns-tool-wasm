/* Regression for the native trigonometry sheet. Pass an extracted XML directory;
   fixture files stay local and are never shipped with the application. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const input=path.resolve(process.argv[2]||path.join(root,'release/qa/widgets-v39'));
const reportPath=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v40/spreadsheet-browser.json');
const fixture=fs.readFileSync(path.join(input,'case3-Problem1.xml'),'utf8');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-sheets-v40-')));
app.commandLine.appendSwitch('disable-gpu');
let win,server;
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin);
 const report=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(fixture)})`);
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));fs.writeFileSync(reportPath+'.png',(await win.webContents.capturePage()).toPNG());
 console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(async error=>{
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:error.stack||String(error)},null,2));
 if(win&&!win.isDestroyed())fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());
 console.error(error);win?.destroy();server?.close();app.exit(1);
});
async function check(xml){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),must=(v,m)=>{if(!v)throw Error(m);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(25);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsSpreadsheetTools&&!document.querySelector('#startup-loader'),'offline startup');
 applyLanguage('en');await loadXmlDoctorFiles([new File([xml],'Problem1.xml')],'file');
 const inspection=await inspectXmlDocument(),item=inspection.items.find(i=>i.content_label==='Spreadsheet');must(item,'Native sheet not detected');
 showSpreadsheetModal(item);await pause(350);
 const cell=(row,col=0)=>document.querySelector(`.spreadsheet-grid .sheet-cell[data-row="${row}"][data-col="${col}"]`);
 const value=row=>cell(row).textContent;
 const initial=[value(0),value(1),value(2)];
 must(initial[0]==='2*π/5'&&initial[1].includes('√(5)')&&initial[2].includes('√(2*'),'Native exact answers changed on open: '+initial);
 const edit=(row,formula)=>{const target=cell(row);target.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));target.textContent=formula;target.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));};
 edit(1,'=cos(a1)');must(JSON.stringify([value(0),value(1),value(2)])===JSON.stringify(initial),'Same-formula commit destroyed native answers');
 edit(2,'=sin(a1)');must(JSON.stringify([value(0),value(1),value(2)])===JSON.stringify(initial),'Second same-formula commit destroyed native answers');
 edit(1,'=cos(a1)+1');must(Math.abs(Number(value(1))-(Math.cos(2*Math.PI/5)+1))<1e-10,'Dependent cos edit failed: '+value(1));
 must(value(0)===initial[0]&&value(2)===initial[2],'Unrelated native answer was invalidated');
 edit(0,'=π/3');must(Math.abs(Number(value(1))-1.5)<1e-10&&Math.abs(Number(value(2))-Math.sqrt(3)/2)<1e-10,'Dependent cells did not update after input edit');
 const edited=[value(0),value(1),value(2)];
 document.querySelector('#spreadsheet-save').click();await wait(()=>!document.querySelector('#spreadsheet-save'),'stage save');
 const updated=(await inspectXmlDocument()).items.find(i=>i.content_label==='Spreadsheet');
 const saved=extractSpreadsheetStateFromRawXml(updated.raw_xml);
 must(saved.cells['0:0'].formula==='=π/3'&&saved.cells['1:0'].formula==='=cos(a1)+1','Saved XML lost edited source');
 showSpreadsheetModal(updated);await pause(350);
 must(JSON.stringify([value(0),value(1),value(2)])===JSON.stringify(edited),'Reopening sheet changed computed answers');
 must(!document.querySelector('.spreadsheet-grid').textContent.includes('#NAME?'),'Native sheet still displays NAME errors');
 return{ok:true,offline:true,initial,edited,checks:['same formula cache','lowercase cell references','native cached CAS input','transitive recalculation','XML save and reopen']};
}
