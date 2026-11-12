/* Local, offline validation of user-provided ScriptApps. Extracted XML/Lua
   fixtures remain outside source control. Pass the extraction directory. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const input=path.resolve(process.argv[2]||path.join(root,'release/qa/widgets-v39'));
const reportPath=path.resolve(process.env.TNS_SMOKE_REPORT||path.join(input,'lua-browser.json'));
const cases=[[1,2],[2,1]].map(([problem,widget])=>({problem,xml:fs.readFileSync(path.join(input,`case0-Problem${problem}.xml`),'utf8'),source:fs.readFileSync(path.join(input,`case0-Problem${problem}-widget${widget}-script0.lua`),'utf8')}));
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-lua-v39-')));
app.commandLine.appendSwitch('disable-gpu');
let win,server;
app.whenReady().then(async()=>{
 server=makeServer(root,path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin);
 const report=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(cases)})`);
 for(const row of report.cases){if(row.image){fs.writeFileSync(path.join(input,`case0-Problem${row.problem}.browser.png`),Buffer.from(row.image.split(',')[1],'base64'));delete row.image;}}
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(async error=>{
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:error.stack||String(error)},null,2));console.error(error);win?.destroy();server?.close();app.exit(1);
});
async function check(cases){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const wait=async(predicate,label)=>{const end=Date.now()+60000;while(!predicate()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(30);}};
 const must=(value,message)=>{if(!value)throw Error(message);};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&!document.querySelector('#startup-loader'),'offline startup');
 xmlDoctor.stagePath='/work/lua-v39';xmlDoctor.sourcePath='/work/lua-v39';xmlDoctor.candidates=[];xmlDoctor.previewItems=[];
 pyodide.FS.mkdirTree(xmlDoctor.stagePath);documentCalculatorSessions.clear();
 for(const entry of cases)pyodide.FS.writeFile(`${xmlDoctor.stagePath}/Problem${entry.problem}.xml`,entry.xml);
 const reports=[];
 for(const entry of cases){
  const item={file:`${xmlDoctor.stagePath}/Problem${entry.problem}.xml`,path:'',content:entry.source};
  const symbols=await loadLuaPreviewSymbols(item,entry.source);
  if(entry.problem===2)must(Object.keys(symbols.basicFunctions).length===1&&symbols.basicFunctions.f,'Other problems’ Func definitions leaked into problem2');
  const canvas=document.createElement('canvas');canvas.width=318;canvas.height=212;
  const log=document.createElement('pre');const runtime=await createLuaJsPreviewRuntime(entry.source,canvas.getContext('2d'),canvas,log,symbols);
  try{
   runtime.boot();await pause(250);
   must(!/ERROR|not supported|math\.eval:/i.test(log.textContent),'Lua '+entry.problem+': '+log.textContent);
   const text=runtime.getScreenText();
   if(entry.problem===1)must(text.includes('var f')&&text.includes('f\'(x)'),'Variation table text missing');
   if(entry.problem===2){
    const viewer=G.str.m_viewer;
    must(lua_tableget(viewer,'valid')===true,'3D viewer did not load stored f(x,y)');
    const values=lua_tableget(viewer,'fvalues'),row=lua_tableget(values,8);
    must(Number.isFinite(lua_tableget(row,4))&&lua_tableget(row,4)!==lua_tableget(row,12),'3D fvalues are missing or flat');
   }
   // A timer tick must not reinstall the old all-problem math.eval fallback.
   must(lua_tableget(G.str.math,'eval').__tnsDocumentScope===true,'Timer replaced scoped math.eval');
   runtime.callEvent('arrowRight');runtime.charIn('*');await pause(100);
   must(!/ERROR/.test(log.textContent),'Interaction failed: '+log.textContent);
   const painted=document.createElement('canvas');painted.width=canvas.width;painted.height=canvas.height;
   const paintedContext=painted.getContext('2d');paintedContext.fillStyle='#ffffff';paintedContext.fillRect(0,0,painted.width,painted.height);paintedContext.drawImage(canvas,0,0);
   const pixels=paintedContext.getImageData(0,0,painted.width,painted.height).data;
   let ink=0;for(let p=0;p<pixels.length;p+=4)if(pixels[p]+pixels[p+1]+pixels[p+2]<600)ink++;
   must(ink>50,'The ScriptApp canvas did not render visible pixels');
   reports.push({problem:entry.problem,functions:Object.keys(symbols.basicFunctions),variables:Object.keys(symbols.variables).length,ink,text,log:log.textContent,image:painted.toDataURL('image/png')});
  }finally{runtime.close();}
 }
 const source='function on.create() var.monitor("a"); value=var.recall("a") end\nfunction on.varChange(names) value=var.recall(names[1]) end';
 const canvas=document.createElement('canvas');canvas.width=318;canvas.height=212;
 const synthetic=await createLuaJsPreviewRuntime(source,canvas.getContext('2d'),canvas,document.createElement('pre'),{variables:{a:2},problemFile:'/work/lua-v39/Problem1.xml'});
 try {
  synthetic.boot();must(G.str.value===2,'Initial monitored value missing');
  documentCalculatorMathSession('/work/lua-v39/Problem1.xml').variables.a=3;
  window.dispatchEvent(new CustomEvent('tns-document-variables-change',{detail:{file:'/work/lua-v39/Problem2.xml',changedNames:['a']}}));
  must(G.str.value===2,'A different problem changed this Lua preview');
  window.dispatchEvent(new CustomEvent('tns-document-variables-change',{detail:{file:'/work/lua-v39/Problem1.xml',changedNames:['a']}}));
  must(G.str.value===3,'Monitored problem variable changes did not reach Lua');
 } finally {synthetic.close();}
 return{ok:true,cases:reports,monitoredVariables:true};
}
