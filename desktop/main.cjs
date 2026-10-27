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
  const visitorId=require('./stats-identity.cjs').persistentVisitorId(app.getPath('userData'));
  function onlyLocal(event){
    if(!win || event.sender!==win.webContents || !trusted(event.senderFrame?.url))
      throw new Error('Origen no autorizado.');
  }
  ipcMain.handle('tns:compiler-status',async event=>{
    onlyLocal(event);return compiler.status(exe);
  });
  ipcMain.handle('tns:stats-identity',async event=>{
    onlyLocal(event);
    return {visitorId:await visitorId(),enabled:!process.env.TNS_DESKTOP_SMOKE_REPORT};
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
  if(process.env.TNS_DESKTOP_SMOKE_REPORT)session.defaultSession.webRequest.onBeforeRequest(
    {urls:['https://tns-tool-stats.guard-mauricio-save.workers.dev/api/*']},
    (details,callback)=>callback({cancel:details.method!=='GET'})
  );
  configureUSB(session.defaultSession);
  registerNativeBridge();
  win=new BrowserWindow({width:1440,height:900,minWidth:900,minHeight:620,
    title:'TNS Tool Portable '+app.getVersion(),show:false,icon:path.join(__dirname,'assets','icon.png'),
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),
      nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,
      backgroundThrottling:!Boolean(process.env.TNS_DESKTOP_SMOKE_REPORT),
      offscreen:Boolean(process.env.TNS_DESKTOP_SMOKE_REPORT)}});
  win.on('page-title-updated',event=>event.preventDefault());
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
    const report=await require('./smoke.cjs').checkWorkspace(win,smokeReport,{pageLoadedMs:performance.now()-bootStarted,origin});
    report.version=app.getVersion();report.windowTitle=win.getTitle();
    if(report.windowTitle!=='TNS Tool Portable '+report.version)throw Error('Portable version is missing from window title');
    if(process.env.TNS_DESKTOP_SMOKE_BUILD){
      report.nativeBuild=await win.webContents.executeJavaScript(`(async()=>{
        const started=performance.now(),results=[];
        const status=await window.TnsDesktop.compilerStatus();
        if(!status.toolchainReady)throw Error(status.missing?.join(', ')||'Bundled SDK not ready');
        for(const language of ['c','cpp']){
          const project=window.NdlessProjectCore.createProject({language,template:'basic',target:'zehn-modern'});
          const zip=new window.JSZip();
          for(const [name,content] of Object.entries(window.NdlessProjectCore.exportEntries(project)))zip.file(name,content);
          const result=await window.TnsDesktop.buildNdless({name:'packaged-'+language,zip:await zip.generateAsync({type:'uint8array'})});
          if(!result.ok||result.format!=='prg-zehn'||result.bytes.length<1000)throw Error('Packaged '+language+' build failed');
          results.push({language,bytes:result.bytes.length,format:result.format});
        }
        return{results,durationMs:performance.now()-started};
      })()`);
    }
    report.prgmPreview=await require('./smoke-prgm.cjs').checkPrgm(win,smokeReport);
      if(process.env.TNS_DESKTOP_SMOKE_BUILD)report.ndlessPreview=await require('./smoke-ndless-preview.cjs').checkNdlessPreview(win,smokeReport);
    const browser=new BrowserWindow({width:1440,height:1000,show:false,
      webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,offscreen:true}});
    try{
      await loadLocalApp(browser,origin);
      report.browserRequirement=await require('./smoke-web.cjs').checkBrowserRequirement(browser,smokeReport+'.web.png');
      await browser.webContents.executeJavaScript('window.TnsNdlessDesktopRequired.close()');
      browser.setContentSize(430,860);
      report.browserPrgmPreview=await require('./smoke-prgm.cjs').checkPrgm(browser,smokeReport+'.mobile');
      await require('node:fs/promises').writeFile(smokeReport,JSON.stringify(report,null,2));
    }finally{browser.destroy();}
    app.quit();
  }
}).catch(async error=>{
  if(process.env.TNS_DESKTOP_SMOKE_REPORT){
    try{if(win&&!win.isDestroyed())await require('node:fs/promises').writeFile(process.env.TNS_DESKTOP_SMOKE_REPORT+'.error.png',(await win.webContents.capturePage()).toPNG());}catch(_){}
    require('node:fs').writeFileSync(process.env.TNS_DESKTOP_SMOKE_REPORT,JSON.stringify({ok:false,error:error.stack}));
    app.exit(1);return;
  }
  dialog.showErrorBox('TNS Tool Portable',error.message);
  app.quit();
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{if(server)server.close();});
