const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..')),desktop=path.resolve(root,'../portable-0.1.27/desktop');
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const reportPath=path.join(root,'release/qa/calculator-layout-v34.json');let win,server;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
  server=makeServer(root,path.join(desktop,'vendor'));const origin=await listen(server);
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(details,done)=>done({cancel:!details.url.startsWith(origin)}));
  win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
  await win.loadURL(origin);win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true});const report=await win.webContents.executeJavaScript(`(${check.toString()})()`);
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath+'.math.png',(await win.webContents.capturePage()).toPNG());
  report.light=await win.webContents.executeJavaScript(`(${checkLight.toString()})()`);
  fs.writeFileSync(reportPath+'.light.png',(await win.webContents.capturePage()).toPNG());
  fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(async error=>{console.error(error.stack||error);if(win&&!win.isDestroyed()){fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());win.destroy();}server?.close();app.exit(1);});
async function check(){
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
  const wait=async(fn,label)=>{const end=Date.now()+45000;while(!fn()){if(Date.now()>end)throw Error('Timeout '+label);await pause(25);}};
  await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsMathTools&&window.TnsPrgmPreview&&!document.querySelector('#startup-loader')&&!document.querySelector('#xml-toggle-btn').disabled,'runtime');
  applyLanguage('en');if(document.querySelector('#xml-doctor-panel').classList.contains('collapsed'))document.querySelector('#xml-toggle-btn').click();
  const creating=addPageFromFileMenu('program-editor');await wait(()=>document.querySelector('#xpe-apply'),'Program settings');document.querySelector('#xpe-apply').click();await creating;await pause(150);
  const display=document.querySelector('#xml-output-filename-display'),filename=document.querySelector('#xml-output-filename'),suffix=document.querySelector('#xml-output-filename-suffix');
  display.click();await pause(30);must(filename.value==='documento'&&suffix.textContent==='.tns','Filename extension inside editable field');filename.focus();
  filename.value='renamed';filename.dispatchEvent(new Event('input'));filename.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));must(display.textContent==='renamed.tns','Rename did not preserve suffix '+JSON.stringify({display:display.textContent,input:filename.value,state:xmlDoctor.outputFileName,focus:document.activeElement.id,disabled:filename.disabled,hidden:filename.hidden,parentHidden:filename.parentElement.hidden,style:getComputedStyle(filename).display,rect:filename.getBoundingClientRect().toJSON(),wrapper:filename.parentElement.parentElement.outerHTML}));
  display.click();filename.value='';filename.dispatchEvent(new Event('input'));must(suffix.textContent==='.tns'&&!suffix.isContentEditable,'Delete removed fixed suffix');filename.blur();must(display.textContent==='documento.tns','Blank name fallback');
  display.click();filename.setSelectionRange(0,filename.value.length);filename.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:(()=>{const data=new DataTransfer();data.setData('text/plain','physics.TNS');return data;})()}));filename.blur();must(display.textContent==='physics.tns','Paste duplicated suffix');
  const edit=document.querySelector('#xml-edit-menu .menu-panel'),mathView=document.querySelector('#xml-math-view-btn');must(edit.contains(mathView)&&edit.lastElementChild===mathView,'Math view must be the final Edit action');
  const source=document.querySelector('#xml-code');codeEditorAdapters.get('#xml-code').replaceRange('Prgm\nDisp "hola"\nEndPrgm',0,source.value.length);
  mathView.click();must(mathView.getAttribute('aria-pressed')==='true','Math view toggle failed');mathView.click();must(mathView.getAttribute('aria-pressed')==='false','Math view toggle off failed');
  document.querySelector('#xml-prgm-preview-btn').click();await wait(()=>document.querySelector('[data-expression]'),'Preview');
  must(window.TnsPrgmPreview.getSnapshot().executed===0,'Preview auto-ran');const field=document.querySelector('[data-expression]');
  for(const [expression,result] of [['2+2','4'],['2^8','256'],['sqrt(25)','5'],['1/4','0.25'],['identity(2)','[[1,0][0,1]]']]){
    field.focus();field.value=expression;field.dispatchEvent(new Event('input'));field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    await wait(()=>window.TnsPrgmPreview.getRows().at(-1)?.entry===expression,'History '+expression);
    must(window.TnsPrgmPreview.getRows().at(-1).display===result,'Wrong result '+expression+': '+window.TnsPrgmPreview.getRows().at(-1).display);
  }
  const rows=[...document.querySelectorAll('.prgm-calculator-row')];must(rows.length===5,'Wrong math row count');
  const colors=rows.map(row=>getComputedStyle(row).backgroundColor);must(colors.every((c,i)=>i===0||c!==colors[i-1]),'No alternating history bands');
  for(const row of rows.slice(0,3)){const left=row.querySelector('.prgm-calculator-expression').getBoundingClientRect(),right=row.querySelector('.prgm-calculator-answer').getBoundingClientRect();must(Math.abs(left.top-right.top)<3,'Short expression/result use separate lines');must(right.left>left.right,'Result not aligned right');}
  must(rows[1].querySelector('msup'),'Power not typeset');must(rows[2].querySelector('msqrt'),'Root not typeset');must(rows[3].querySelector('mfrac'),'Fraction not typeset');must(rows[4].querySelectorAll('mtable').length===1,'Matrix answer not typeset');
  field.focus();field.value='sqrt(25)';field.dispatchEvent(new Event('input'));must(!field.hidden&&document.querySelector('[data-expression-math]').hidden,'Focused editor duplicated expression');
  document.querySelector('[data-copy]').focus();await pause(30);must(field.hidden&&!document.querySelector('[data-expression-math]').hidden,'Blurred expression not typeset');document.querySelector('[data-expression-math]').click();must(document.activeElement===field&&!field.hidden,'Cannot return from typeset input to editor');
  field.value='';field.dispatchEvent(new Event('input'));field.blur();await pause(120);
  return{ok:true,immutableExtension:true,basenameRename:true,fullNamePaste:true,mathViewInEdit:true,alternatingHistory:true,sameLineShortResults:true,typesetPowerRootFractionMatrix:true,noDuplicateEntry:true,explicitProgramExecution:true,colors};
}
async function checkLight(){
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));window.TnsPrgmPreview.close();document.documentElement.dataset.theme='light';window.TnsMonacoEditor?.setTheme?.('light');
  document.querySelector('#xml-math-catalog-btn').click();await pause(200);
  const popup=document.querySelector('.ti-math-catalog-popup'),tabs=[...popup.querySelectorAll('.ti-math-catalog-tabs button')],list=popup.querySelector('.ti-math-catalog-list');
  const style=getComputedStyle(tabs[1]),rgb=style.backgroundColor.match(/\d+/g).map(Number);if(rgb.slice(0,3).some(n=>n<180))throw Error('Inactive light catalog tab remains dark');
  const items=[...list.querySelectorAll('button')];if(!items.length)throw Error('Empty light catalog');const itemStyle=getComputedStyle(items.at(-1)),itemRgb=itemStyle.backgroundColor.match(/\d+/g).map(Number);if(itemRgb.slice(0,3).some(n=>n<180))throw Error('Inactive light catalog list remains dark');
  const icons=[...document.querySelectorAll('#xml-math-templates-btn,#xml-math-catalog-btn')].map(button=>({background:getComputedStyle(button).backgroundColor,filter:getComputedStyle(button.querySelector('span')).filter}));
  if(icons.some(icon=>icon.background!==getComputedStyle(document.querySelector('#xml-prgm-preview-btn')).backgroundColor))throw Error('Math buttons use different green');
  return{catalogLightColors:true,mathButtonsMatchGreen:true,icons};
}
