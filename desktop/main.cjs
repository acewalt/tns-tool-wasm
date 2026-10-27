const path=require('node:path');
const {app,BrowserWindow,session,ipcMain,dialog,shell}=require('electron');
const {makeServer,listen}=require('./server.cjs');
const compiler=require('./compiler.cjs');
const {loadLocalApp}=require('./startup.cjs');
const {performance}=require('node:perf_hooks');
const bootStarted=performance.now();

const TI_VENDOR=0x0451;
const TI_PRODUCTS=new Set([0xe012,0xe022]);
let win=null,server=null,origin='';
const primaryInstance=app.requestSingleInstanceLock();
if(!primaryInstance) app.quit();
else app.on('second-instance',()=>{ if(win){if(win.isMinimized())win.restore();win.focus();} });

function trusted(url){
  if(!origin || typeof url!=='string')return false;
  try { return new URL(url).origin===new URL(origin).origin; } catch { return false; }
}
function deviceAllowed(device) {
  return Number(device?.vendorId)===TI_VENDOR && TI_PRODUCTS.has(Number(device?.productId));
}
function configureUSB(ses){
  ses.setPermissionRequestHandler((contents,permission,callback,details)=>{
    const source=details?.requestingUrl || contents.getURL();
    callback(permission==='usb' && trusted(source));
  });
  ses.setPermissionCheckHandler((contents,permission,requestingOrigin)=>{
    return permission==='usb' && trusted(requestingOrigin);
  });
  ses.setDevicePermissionHandler(details=>
    details.deviceType==='usb' && trusted(details.origin) && deviceAllowed(details.device));
  ses.on('select-usb-device',async(event,details,callback)=>{
    event.preventDefault();
    const devices=details.deviceList.filter(deviceAllowed);
    if(devices.length===1){callback(devices[0].deviceId);return;}
    if(!devices.length){callback();return;}
    const choice=await dialog.showMessageBox(win,{type:'question',title:'TI-Nspire',
      message:'Selecciona la calculadora que deseas conectar',
      buttons:[...devices.map(d=>d.productName || 'TI-Nspire'),'Cancelar'],
      cancelId:devices.length});
    callback(devices[choice.response]?.deviceId);
  });
}
function registerNativeBridge(){
  const exe=compiler.compilerPath(process.resourcesPath,process.env.TNS_DESKTOP_COMPILER);
  function onlyLocal(event){
    if(!win || event.sender!==win.webContents || !trusted(event.senderFrame?.url))
      throw new Error('Origen no autorizado.');
  }
  ipcMain.handle('tns:compiler-status',async event=>{
    onlyLocal(event);return compiler.status(exe);
  });
  ipcMain.handle('tns:ndless-build',async(event,payload)=>{
    onlyLocal(event);return compiler.build(exe,payload);
  });
}
if(primaryInstance) app.whenReady().then(async()=>{
  const root=app.getAppPath();
  const vendor=app.isPackaged?path.join(process.resourcesPath,'vendor'):path.join(root,'desktop','vendor');
  server=makeServer(root,vendor);
  origin=await listen(server);
  configureUSB(session.defaultSession);
  registerNativeBridge();
  win=new BrowserWindow({width:1440,height:900,minWidth:900,minHeight:620,
    title:'TNS Tool Portable',show:false,icon:path.join(__dirname,'assets','icon.png'),
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),
      nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  const smokeReport=process.env.TNS_DESKTOP_SMOKE_REPORT;
  if(smokeReport)win.webContents.on('console-message',(_event,level,message)=>console.log(level,message));
  if(!smokeReport)win.once('ready-to-show',()=>win.show());
  win.webContents.setWindowOpenHandler(({url})=>{
    if(url.startsWith('https://'))shell.openExternal(url).catch(()=>{});
    return {action:'deny'};
  });
  win.webContents.on('will-navigate',(event,url)=>{if(!trusted(url))event.preventDefault();});
  await loadLocalApp(win,origin);
  if(smokeReport){
    await require('./smoke.cjs').checkWorkspace(win,smokeReport,{pageLoadedMs:performance.now()-bootStarted});
    app.quit();
  }
}).catch(error=>{
  if(process.env.TNS_DESKTOP_SMOKE_REPORT){
    require('node:fs').writeFileSync(process.env.TNS_DESKTOP_SMOKE_REPORT,JSON.stringify({ok:false,error:error.stack}));
    app.exit(1);return;
  }
  dialog.showErrorBox('TNS Tool Portable',error.message);
  app.quit();
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{if(server)server.close();});
