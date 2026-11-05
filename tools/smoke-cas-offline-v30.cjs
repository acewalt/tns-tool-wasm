const {app,BrowserWindow,session}=require('electron'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),desktop=path.resolve(root,'../portable-0.1.27/desktop');
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));let server,win;
const report={ok:false,blocked:[]},out=path.join(root,'release/qa/cas-offline-v30.json');
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(path.join(root,'release/qa/cas-offline-fixture-v30.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Offline CAS check</title></head><body></body></html>');
  server=makeServer(root,path.join(desktop,'vendor'));const origin=await listen(server);
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(d,cb)=>{const blocked=!d.url.startsWith(origin);if(blocked)report.blocked.push(d.url);cb({cancel:blocked});});
  win=new BrowserWindow({show:false,webPreferences:{contextIsolation:true,sandbox:true,backgroundThrottling:false}});
  await win.loadURL(origin+'release/qa/cas-offline-fixture-v30.html');
  report.result=await win.webContents.executeJavaScript(`(async()=>{
    const started=performance.now();
    await Promise.race([new Promise((resolve,reject)=>{
      window.Module={print(){},printErr(){},onRuntimeInitialized:resolve,onAbort:reject};
      const s=document.createElement("script");s.src="/assets/cas/giacwasm.js";s.onerror=()=>reject(Error("local script failed"));document.head.append(s);
    }),new Promise((_,reject)=>setTimeout(()=>reject(Error('Local CAS timeout')),20000))]);
    const evaluate=Module.cwrap("caseval","string",["string"]);
    const cases=["version()","type(sin)","type(foo)","f(x):=x^2","type(f)","purge(x)","restart","piecewise(x<0,-x,x)","surd(-27,3)","system(X=1,Y=2)","1+1","factor(x^2-1)","integrate(x^2,x)","diff(sin(x),x)","identity(3)","newMat(2,3)","diag([1,2,3])","limit(sin(x)/x,x,0)"];
    return{durationMs:performance.now()-started,cases:cases.map(expression=>({expression,result:String(evaluate(expression))}))};
  })()`);
  report.ok=report.result.cases.find(c=>c.expression==='1+1').result==='2'&&!report.blocked.length;
  fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report));win.destroy();server.close();app.exit(report.ok?0:1);
}).catch(e=>{report.error=e.stack;fs.writeFileSync(out,JSON.stringify(report,null,2));console.error(e);win?.destroy();server?.close();app.exit(1);});
