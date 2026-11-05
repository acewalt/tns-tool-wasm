const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(root,'../portable-0.1.27/desktop');
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const reportPath=path.join(root,'release/qa/program-draft-v31.json');let win,server;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 server=makeServer(root,path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(details,done)=>done({cancel:!details.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 await win.loadURL(origin);
 const report=await win.webContents.executeJavaScript(`(${run.toString()})()`);
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report));win.destroy();server.close();app.exit(report.ok?0:1);
}).catch(async error=>{console.error(error);if(win&&!win.isDestroyed()){const state=await win.webContents.executeJavaScript('({log:document.querySelector("#xml-log")?.textContent,source:document.querySelector("#xml-code")?.value,current:xmlDoctor.current,candidates:xmlDoctor.candidates})').catch(()=>null);fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:String(error),state},null,2));win.destroy();}server?.close();app.exit(1);});
async function run(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const wait=async(fn,label)=>{const end=Date.now()+45000;while(!fn()){if(Date.now()>end)throw Error('Timeout '+label);await pause(30);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.__tnsXmlProgramEditorFix&&!document.querySelector('#startup-loader')&&!document.querySelector('#xml-toggle-btn').disabled,'runtime');
 applyLanguage('en');if(document.querySelector('#xml-doctor-panel').classList.contains('collapsed'))document.querySelector('#xml-toggle-btn').click();
 await pause(600);
 const create=async()=>{let done=false;const task=addPageFromFileMenu('program-editor').finally(()=>done=true);await wait(()=>done||document.querySelector('#xpe-apply'),'creation settings');document.querySelector('#xpe-apply')?.click();await task;await pause(70);return xmlDoctor.current.program_name;};
 const first=await create(),code=document.querySelector('#xml-code'),adapter=codeEditorAdapters.get('#xml-code');
 const expected='Prgm\nLocal x\n41→x\nDisp "FIRST DRAFT",x+1\nEndPrgm';
 adapter.replaceRange(expected,0,code.value.length);await pause(50);
 const before={first,current:xmlDoctor.current.program_name,source:code.value,embedded:xmlDoctor.embedded,candidate:xmlDoctor.candidates.find(item=>item.program_name===first)?.code};
 tiMathEditor.setActive(true);let mathInput=document.querySelector('[data-math-line="4"]');mathInput.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));mathInput=document.querySelector('.ti-math-source-input');mathInput.setSelectionRange(mathInput.value.length,mathInput.value.length);mathInput.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));mathInput.value+='Disp "MATH DRAFT"';mathInput.setSelectionRange(mathInput.value.length,mathInput.value.length);mathInput.dispatchEvent(new Event('input',{bubbles:true}));
 const second=await create();const after={current:xmlDoctor.current.program_name,source:code.value,candidates:xmlDoctor.candidates.map(item=>({name:item.program_name,code:item.code}))};
 const firstCandidate=xmlDoctor.candidates.find(item=>item.program_name===first);must(firstCandidate,'First program disappeared');
 const combo=document.querySelector('#xml-programs');combo.value=String(firstCandidate.index);combo.dispatchEvent(new Event('change',{bubbles:true}));await wait(()=>xmlDoctor.current?.program_name===first,'combo select first');
 const restored=code.value;must(restored.includes('MATH DRAFT'),'Active Math view draft lost before adding second');
 const openProgram=async(name)=>{await chooseTiProgramEditor();const openButton=[...document.querySelectorAll('.ti-program-open-list button')].find(button=>button.textContent.startsWith(name+' ['));must(openButton,'Menu Open does not list '+name);openButton.click();await wait(()=>xmlDoctor.current?.program_name===name,'menu Open '+name);};
 const cancelCreation=async()=>{const expected=code.value,name=xmlDoctor.current.program_name;let done=false;const task=addPageFromFileMenu('program-editor').finally(()=>done=true);await wait(()=>done||document.querySelector('#xpe-apply'),'cancel settings');document.querySelector('#xpe-cancel')?.click();await task;must(xmlDoctor.current.program_name===name&&code.value===expected,'Cancel new program changed current draft');};
 for(let cycle=0;cycle<2;cycle++){await openProgram(second);await openProgram(first);must(code.value.includes('MATH DRAFT')&&code.value.includes('FIRST DRAFT'),'Menu Open lost original draft');await cancelCreation();}
 const disk=await pyodide.runPythonAsync(`from pathlib import Path\nPath("${xmlDoctor.stagePath}/Problem1.xml").read_text()`);
 const hasDraft=restored.includes('FIRST DRAFT')&&restored.includes('41');
 const paletteCase=await(async()=>{
   tiMathEditor.setActive(true);const row=document.querySelector('[data-math-line="4"]');row.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true}));const input=document.querySelector('.ti-math-source-input');must(input,'No math line input');input.setSelectionRange(input.value.indexOf('x+1'),input.value.indexOf('x+1')+3);input.dispatchEvent(new Event('select'));
   const anchor=document.querySelector('#xml-math-catalog-btn');anchor.focus();const selection=tiMathEditor.captureSelection();insertXmlToolText('7');const actual=code.value;must(actual.includes('Disp "FIRST DRAFT",7'),'Actual adapter inserted at stale caret: '+actual);return {ok:true,selection,actual};
 })();
 return{ok:hasDraft&&paletteCase.ok,before,after,first,second,restored,diskHasDraft:disk.includes('FIRST DRAFT'),paletteCase};
}
