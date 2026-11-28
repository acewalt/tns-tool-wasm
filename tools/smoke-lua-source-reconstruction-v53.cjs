// Local user fixtures stay in ignored release/qa/v53; never embed them in releases.
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const {makeServer,listen}=require(path.join(root,'../portable-0.1.27/desktop/server.cjs'));
const report=path.join(root,'release/qa/v53/browser.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-v53-')));
let win,server;const checks=[],logs=[],fixtures=[];
const pause=ms=>new Promise(r=>setTimeout(r,ms)),must=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
const js=s=>win.webContents.executeJavaScript(s.includes('await ')&&!s.trim().startsWith('(async')?'(async()=>{'+s+'})()':s);
app.whenReady().then(async()=>{
 try{
  server=makeServer(root,path.join(root,'../portable-0.1.27/desktop/vendor'));const origin=await listen(server);
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(r,done)=>done({cancel:!r.url.startsWith(origin)}));
  win=new BrowserWindow({show:false,width:1650,height:1080,webPreferences:{sandbox:true,contextIsolation:true,offscreen:true,backgroundThrottling:false}});
  win.webContents.on('console-message',(_e,level,message)=>{if(level>=2)logs.push(message.slice(0,600));});
  await win.loadURL(origin);
  for(let i=0;i<400&&!await js("typeof showLuaEditor==='function'");i++)await pause(50);
  await js(`(async()=>{
   window.build=await import('./web/lua-visual-builder.js');window.cap=await import('./src/lua-visual-builder/capture.js');window.imp=await import('./src/lua-visual-builder/importer.js');
   window.b=await build.openLuaVisualBuilder({language:'en',source:''});window.q=s=>b.modal.querySelector(s);
  })()`);
  // Native <details> clicks exercise the actual menubar event lifecycle.
  await js(`q('.lvb-tool-menu summary').click()`);
  must(await js(`b.modal.querySelectorAll('.lvb-tool-menu[open]').length===1`),'File opens');
  await js(`b.modal.querySelectorAll('.lvb-tool-menu summary')[1].click()`);
  must(await js(`b.modal.querySelectorAll('.lvb-tool-menu[open]').length===1&&b.modal.querySelectorAll('.lvb-tool-menu')[1].open`),'Edit closes File');
  await js(`document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`);
  must(await js(`!q('.lvb-tool-menu[open]')`),'outside pointer closes menus');
  await js(`q('.lvb-tool-menu summary').click()`);
  win.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});await pause(40);
  must(await js(`b.modal.isConnected&&!q('.lvb-tool-menu[open]')`),'Escape closes menu without closing builder');
  await js(`b.modal.querySelectorAll('.lvb-tool-menu summary')[2].click();q('[data-command=panels]').click()`);
  must(await js(`!q('.lvb-tool-menu[open]')`),'action closes its menu');
  await js(`b.close();window.frame=document.createElement('iframe');frame.style='width:320px;height:212px;border:0';document.body.append(frame);frame.src='./web/lua-layout-frame.html';`);
  for(let i=0;i<400&&!await js(`!!frame.contentWindow.TnsLuaLayoutFrame`);i++)await pause(50);
  for(let i=0;i<3;i++){
   const source=fs.readFileSync(path.join(root,`release/qa/v53/doc${i}/script-0.lua`),'utf8'),symbols=JSON.parse(fs.readFileSync(path.join(root,`release/qa/v53/doc${i}/symbols.json`),'utf8').replace(/^\uFEFF/,''));
   await js(`window.source=${JSON.stringify(source)};window.symbols=${JSON.stringify(symbols)};window.r=await frame.contentWindow.TnsLuaLayoutFrame.start({code:source,symbols,language:'es',capture:{maxFrames:30,maxOperations:20000}})`);
   await pause(i===2?2600:250);
   const result=await js(`(()=>{const snapshot=r.captureScreen(),report=imp.analyzeLuaImport(source);window.convertedProject=cap.projectFromCapture(report,{format:'tns-lua-capture-session',screens:[{id:'first',name:'First',frame:snapshot}]});
    const comps=convertedProject.pages.flatMap(p=>p.components),editable=comps.filter(c=>c.sourceBinding&&!c.locked),label=editable.find(c=>c.type==='Label'&&c.sourceBinding.args[0]?.literal);window.originalTexts=r.getScreenText();
    if(label)label.text+=' TEST53';window.converted=imp.generateImportedLua(convertedProject,{metadata:false});return {operations:snapshot.operations.length,components:comps.length,editable:editable.length,edited:!!label,functions:Object.keys(symbols.basicFunctions||{}),texts:originalTexts,error:frame.contentDocument.querySelector('[role=alert]').textContent};})()`);
   must(!result.error,'fixture '+i+' original runtime has no errors');must(result.operations>0,'fixture '+i+' captures real drawings');
    if(i===0)must(result.functions.length===4,'ProbasMaster exposes its four stored TI-BASIC functions');
   must(result.editable>0,'fixture '+i+' has reversible visual source edits');must(result.edited,'fixture '+i+' has an editable text declaration');
   await js(`r.close();window.r=await frame.contentWindow.TnsLuaLayoutFrame.start({code:converted,symbols,language:'es',capture:{maxFrames:30,maxOperations:20000}})`);await pause(i===2?2600:200);
   const after=await js(`({texts:r.getScreenText(),error:frame.contentDocument.querySelector('[role=alert]').textContent})`);
   must(!after.error&&after.texts.includes('TEST53'),'fixture '+i+' edited source actually runs');
   fixtures.push({...result,after:after.texts});
   const png=await js(`frame.contentDocument.querySelector('canvas').toDataURL('image/png')`);fs.writeFileSync(path.join(root,`release/qa/v53/preview-${i}.png`),Buffer.from(png.split(',')[1],'base64'));
   await js(`r.close()`);
  }
  const probasSymbols=JSON.parse(fs.readFileSync(path.join(root,'release/qa/v53/doc0/symbols.json'),'utf8').replace(/^\uFEFF/,''));
  const mathProbe='platform.apilevel="2.0"\nlocal value,err=math.eval("erf(1)")\nassert(value and math.abs(value-0.8427007929497149)<0.00000001, tostring(err or value))\nfunction on.paint(gc) gc:drawString("Stored erf: OK",10,20,"top") end';
  await js(`window.r=await frame.contentWindow.TnsLuaLayoutFrame.start({code:${JSON.stringify(mathProbe)},symbols:${JSON.stringify(probasSymbols)},language:'es'})`);await pause(200);
  must(await js(`r.getScreenText().includes('Stored erf: OK')&&!frame.contentDocument.querySelector('[role=alert]').textContent`),'Lua math.eval executes the document erf Func and its definite integral');
  await js(`r.close()`);
  // Pending input is independent of history and must not be submitted automatically.
  const raw=fs.readFileSync(path.join(root,'release/qa/v53/scratch.xml'),'utf8');
  await js(`window.raw=${JSON.stringify(raw)}`);
  must(await js(`TnsCalculatorHistory.parseDraft(raw)==='supergeo()'&&TnsCalculatorHistory.parseRows(raw).length===0`),'SuperEspace restores pending supergeo() without inventing history');
  must(await js(`extractCalculatorInput({raw_xml:'<wdgt/>',detail:{input:'old()'}})===''`),'cleared native draft cannot resurrect stale detail');
  // The same normalization used for TNS downloads supplies the XML archive name.
  must(await js(`typeof xmlDoctorTnsOutputName==='function'`),'document archive naming helper available');
  fs.writeFileSync(report,JSON.stringify({success:true,checks,fixtures,logs},null,2));
 }catch(e){fs.writeFileSync(report,JSON.stringify({success:false,error:e.stack,checks,fixtures,logs},null,2));process.exitCode=1;}
 finally{win?.destroy();server?.close();app.quit();}
});
