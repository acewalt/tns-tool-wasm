/* Offline browser Lua runtime with the user's unmodified source and an in-memory diagnostic probe. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v45/lua-compat.json');
const inputDir=process.env.TNS_LUA_FIXTURE_DIR||path.join(os.homedir(),'Downloads');
const fixtures={diagnostic:fs.readFileSync(path.join(inputDir,'Diagnostico_TI_Nspire_LuaJS_Exhaustivo_v2.lua'),'utf8'),thermo:fs.readFileSync(path.join(inputDir,'Termodinamica_Parcial_Modo_Examen.lua'),'utf8')};
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-lua-compat-v45-')));
let win,server;const logs=[];
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1400,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',(_e,level,message)=>logs.push({level,message}));await win.loadURL(origin);
 const result=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(fixtures)})`);
 fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));
 fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify({ok:result.ok,diagnostic:result.diagnostic?.counts,thermo:result.thermo}));win.destroy();server.close();app.exit(result.ok?0:1);
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack||String(error),logs},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(fixtures){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(20);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&typeof createLuaJsPreviewRuntime==='function'&&!document.querySelector('#startup-loader'),'offline startup');applyLanguage('en');
 const holder=document.createElement('div');holder.style.cssText='position:fixed;top:100px;left:500px;z-index:999999;background:#fff';
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;const log=document.createElement('pre');holder.append(canvas,log);document.body.append(holder);
 const run=async(source)=>{log.textContent='';const r=await createLuaJsPreviewRuntime(source,canvas.getContext('2d'),canvas,log,{});r.boot();return r;};
 const results={offline:true};
 try{const runtime=await run('platform.apilevel="2.0"\nfunction on.paint(gc) local y=20 for palabra in string.gmatch("Hola Mundo Lua","%S+") do gc:drawString(palabra,10,y,"top") y=y+25 end end');results.gmatch={text:runtime.getScreenText(),log:log.textContent};runtime.close();}catch(e){results.gmatch={error:e.message,log:log.textContent};}
 const probe=`
function __tns_qa_diagnostic(gc)
 local lines={}
 for si,g in ipairs(suites) do for ti,t in ipairs(g.tests) do
  testRun(si,ti,gc)
  lines[#lines+1]=g.name..'\\t'..t.name..'\\t'..t.kind..'\\t'..t.st..'\\t'..string.gsub(t.info,'[\\r\\n\\t]',' ')
 end end
 return table.concat(lines,'\\n')
end`;
 try{
  const runtime=await run(fixtures.diagnostic+probe);
  for(const name of ['enterKey','tabKey','escapeKey','backspaceKey','deleteKey','arrowUp','arrowDown','arrowLeft','arrowRight','timer'])runtime.callEvent('on.'+name);
  runtime.charIn('x');for(const name of ['mouseDown','mouseMove','mouseUp'])runtime.pointerEvent(name,4,4);
  const gc=lua_tableget(lua_tableget(G.str.platform,'window'),'gc');
  const raw=lua_call(G.str.__tns_qa_diagnostic,[gc])[0];runtime.close();
  const tests=String(raw).split('\n').filter(Boolean).map(row=>{const [suite,name,kind,status,...info]=row.split('\t');return{suite,name,kind,status,info:info.join('\t')};});
  results.diagnostic={total:tests.length,counts:tests.reduce((out,t)=>{out[t.status]=(out[t.status]||0)+1;return out;},{}),tests,log:log.textContent};
 }catch(e){results.diagnostic={error:e.message,log:log.textContent};}
 try{
  const runtime=await run(fixtures.thermo),screens=[];
  const snap=label=>screens.push({label,text:runtime.getScreenText()});snap('home');
  runtime.callEvent('on.enterKey');snap('topics');runtime.callEvent('on.enterKey');snap('tasks');runtime.callEvent('on.enterKey');snap('form');
  for(const name of ['on.escapeKey','on.escapeKey','on.escapeKey'])runtime.callEvent(name);
  runtime.callEvent('on.arrowDown');runtime.callEvent('on.enterKey');snap('examples');runtime.callEvent('on.enterKey');snap('example form');
  runtime.callEvent('on.tabKey');runtime.callEvent('on.tabKey');runtime.callEvent('on.tabKey');runtime.callEvent('on.enterKey');snap('example procedure');
  runtime.callEvent('on.arrowDown');snap('scrolled procedure');runtime.callEvent('on.escapeKey');
  runtime.mouseClick(250,221);snap('cleared form');
  runtime.charIn('9');runtime.charIn('0');runtime.charIn('0');runtime.callEvent('on.tabKey');
  runtime.charIn('2');runtime.charIn('0');runtime.charIn('0');runtime.mouseClick(40,221);snap('manual calculation');
  runtime.mouseClick(150,221);snap('mouse procedure');
  const has=(label,text)=>screens.find(screen=>screen.label===label)?.text.includes(text);
  const assertions={home:has('home','TERMODINAMICA'),topics:has('topics','Primera ley'),tasks:has('tasks','Delta U = Q - W'),example:has('example form','500 J'),procedure:has('example procedure','Procedimiento'),cleared:!has('cleared form','500 J'),manual:has('manual calculation','700 J'),mouse:has('mouse procedure','Procedimiento')};
  results.thermo={screens,assertions,ok:Object.values(assertions).every(Boolean),log:log.textContent};runtime.close();
 }catch(e){results.thermo={error:e.message,log:log.textContent};}
 try{
  const runtime=await run('platform.apilevel="2.0"\nlocal recovered=false\nfunction on.paint(gc) if not recovered then error("CONTROLLED_PAINT_FAILURE") end gc:drawString("Recovered after Enter",5,5,"top") end\nfunction on.enterKey() recovered=true end');
  const diagnostic=log.textContent;runtime.callEvent('on.enterKey');
  results.errorRecovery={diagnostic,afterEnter:runtime.getScreenText(),ok:/on.paint.*ScriptApp:3/.test(diagnostic)&&runtime.getScreenText().includes('Recovered after Enter')};runtime.close();
 }catch(e){results.errorRecovery={ok:false,error:e.message};}
 results.ok=!results.gmatch.error&&results.gmatch.text==='Hola\nMundo\nLua'&&results.thermo.ok&&!/ERROR/.test(results.thermo.log)&&results.errorRecovery.ok;
 return results;
}
