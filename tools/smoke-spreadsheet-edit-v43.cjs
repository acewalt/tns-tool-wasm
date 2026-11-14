/* Real DOM regression: draft-target cell picking, range formulas, cancellation,
   keyboard navigation, clipboard tables and compact-host compatibility. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const reportPath=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v43/spreadsheet-edit-browser.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-sheets-edit-v43-')));
let win,server;
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin);win.webContents.focus();const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));win.destroy();server.close();app.exit(0);
}).catch(async error=>{
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:error.stack||String(error)},null,2));
 if(win&&!win.isDestroyed())fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());
 console.error(error);win?.destroy();server?.close();app.exit(1);
});
async function check(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const end=Date.now()+60000;while(!window.TnsSpreadsheetTools||typeof evaluateSpreadsheetFormula!=='function'||!window.TnsTiBasicMath||document.querySelector('#startup-loader')){if(Date.now()>end)throw Error('Spreadsheet startup timeout');await pause(25);}
 const host=document.createElement('div');host.className='compound-preview-pane';host.dataset.appKind='sheets';host.style.cssText='position:fixed;z-index:9999;top:20px;left:20px;width:600px;height:440px;background:white;display:flex;flex-direction:column';
 host.innerHTML='<div class="spreadsheet-grid-shell"><div class="spreadsheet-grid" tabindex="0"></div></div><div class="spreadsheet-formula-bar"><span class="spreadsheet-cell-name"></span><input class="spreadsheet-formula-value"/><output class="spreadsheet-selection-info"></output></div><button data-sheet-tool="sum">Sum</button>';
 document.body.append(host);
 const state={cells:{'0:0':{formula:'4',data:'4'},'0:1':{formula:'6',data:'6'},'19:2':{formula:'9',data:'9'}},rows:20,cols:12,activeRow:0,activeCol:0};
 const mathSession=window.TnsTiBasicMath.createSession(),changes=[];
 const controller=window.TnsSpreadsheetTools.mount(host,state,{evaluate:formula=>evaluateSpreadsheetFormula(formula,state.cells,{mathSession}),onChange:(_,change)=>{changes.push(change);recalculateSpreadsheetCells(state.cells,{mathSession,changedCellKeys:change.changedCellKeys});}});
 const grid=host.querySelector('.spreadsheet-grid'),formula=host.querySelector('.spreadsheet-formula-value');
 const cell=(row,col)=>grid.querySelector(`.sheet-cell[data-row="${row}"][data-col="${col}"]`);
 const pointer=(target,type='pointerdown',extra={})=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:1,...extra}));
 const click=(row,col,extra={})=>{pointer(cell(row,col),'pointerdown',extra);pointer(window,'pointerup');};
 const key=(target,value,extra={})=>target.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...extra}));
 const type=text=>{must(document.execCommand('insertText',false,text),'Native insertion failed');};
 let leakedKeys=0;const noLeak=()=>leakedKeys++;host.addEventListener('keydown',noLeak);
 click(0,3);key(grid,'=');type('(');must(cell(0,3).textContent==='=(','First typed character was selected/replaced');
 click(0,1);must(state.activeCol===3&&state.activeRow===0,'Picking reference changed the destination');must(cell(0,3).textContent==='=(B1','Cell reference not inserted');must(!state.cells['0:3'],'Unfinished draft committed early');
 type('+');click(19,2);type(')');must(formula.value==='=(B1+C20)','Formula did not mirror cell draft: '+formula.value);
 controller.render();must(cell(0,3).textContent==='=(B1+C20)','Refresh destroyed live draft');key(cell(0,3),'Enter');
 must(state.cells['0:3'].formula==='=B1+C20'&&state.cells['0:3'].data==='15','Point-picked arithmetic did not evaluate: '+JSON.stringify(state.cells['0:3']));must(state.activeRow===1&&state.activeCol===3,'Enter navigation failed');
 formula.focus();formula.value='=mean(';formula.setSelectionRange(formula.value.length,formula.value.length);formula.dispatchEvent(new InputEvent('input',{bubbles:true}));
 pointer(cell(0,0));pointer(cell(0,1),'pointerover');pointer(window,'pointerup');must(formula.value==='=mean(A1:B1','Drag reference did not create range: '+formula.value);type(')');key(formula,'Enter');
 must(state.cells['1:3'].formula==='=mean(A1:B1)'&&state.cells['1:3'].data==='5','Range mean failed or wrote to reference cell');
 click(0,0);formula.focus();formula.value='=999';formula.dispatchEvent(new InputEvent('input',{bubbles:true}));key(formula,'Escape');must(state.cells['0:0'].data==='4'&&formula.value==='4','Escape did not restore original value');
 click(0,4);formula.focus();formula.value='=B1+1';formula.dispatchEvent(new InputEvent('input',{bubbles:true}));controller.commit();must(state.cells['0:4'].data==='7','Save did not flush formula-bar draft');grid.focus();
 click(0,0);click(0,1,{shiftKey:true});let copied='';const copy=new Event('copy',{bubbles:true,cancelable:true});Object.defineProperty(copy,'clipboardData',{value:{setData:(_type,text)=>copied=text}});grid.dispatchEvent(copy);must(copied==='4\t6','Multi-cell copy regressed');
 click(0,0);const paste=new Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(paste,'clipboardData',{value:{getData:()=> '10\t20\n30\t40'}});grid.dispatchEvent(paste);
 must(state.cells['0:0'].data==='10'&&state.cells['1:1'].data==='40','Table paste failed');must(state.cells['0:3'].data==='29'&&state.cells['1:3'].data==='15'&&state.cells['0:4'].data==='21','Transitive recalculation after paste failed');
 click(3,0);key(grid,'=');click(0,0);click(0,1);must(cell(3,0).textContent==='=B1','Consecutive reference picks did not replace pending reference');key(cell(3,0),'Escape');must(!state.cells['3:0'],'Cancel committed formula');
 click(4,0);key(grid,'7');click(4,1);must(state.cells['4:0'].data==='7'&&state.activeCol===1,'Plain cell edit did not commit before navigation');
 must(leakedKeys===0,'Sheet keyboard events leaked to containing preview');host.removeEventListener('keydown',noLeak);
 controller.destroy();host.remove();
 return{ok:true,offline:true,compactHost:true,checks:['point-picked =(B1+C20)','range-picked mean(A1:B1)','draft target preserved','Enter / Escape','formula-bar save flush','refresh preserves draft','copy / paste range','transitive recalculation','pending reference replacement','plain edit navigation','keyboard isolated'],changedCells:changes.flatMap(change=>change.changedCellKeys)};
}
