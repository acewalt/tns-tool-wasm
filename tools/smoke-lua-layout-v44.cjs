/* Offline compound-page Lua integration: two independent VMs + Calculator. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v44/lua-layout.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-lua-layout-v44-')));
let win,server;const logs=[];
app.whenReady().then(async()=>{
  server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
  win=new BrowserWindow({show:false,width:1600,height:1100,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
  win.webContents.on('console-message',(_e,level,message)=>logs.push({level,message}));
  await win.loadURL(origin);win.webContents.focus();
  const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
  fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));
  fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));win.destroy();server.close();app.exit(0);
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack||String(error),logs},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(){
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(x,m)=>{if(!x)throw Error(m);};
  const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(25);}};
  await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsPrgmPreview&&!document.querySelector('#startup-loader'),'offline startup');applyLanguage('en');
  const blank=await(await fetch('./templates/blank_tns_xml/Problem1.xml')).text();
  await loadXmlDoctorFiles([new File([blank],'Problem1.xml')],'file');
  await addLuaScriptAppToStage();await addLuaScriptAppToStage();await addCalculatorWidgetToStage();
  const resource=document.createElement('canvas');resource.width=resource.height=4;const pixels=resource.getContext('2d');pixels.fillStyle='#ff0000';pixels.fillRect(0,0,4,4);
  pyodide.FS.writeFile('/work/xml_doctor_stage/pane-red.png',new Uint8Array(await(await fetch(resource.toDataURL('image/png'))).arrayBuffer()));
  const source=tag=>`platform.apilevel='2.3'
counter=0
resource=image.new('pane-red.png')
clicks=0
moves=0
ups=0
ticks=0
observed=-1
var.monitor('shared')
timer.start(0.1)
function on.resize(w,h) width=w height=h end
function on.timer() ticks=ticks+1 platform.window:invalidate() end
function on.charIn(c) counter=counter+1 var.store('shared',counter) platform.window:invalidate() end
function on.arrowRight() counter=counter+10 platform.window:invalidate() end
function on.varChange(names) observed=var.recall('shared') or -1 platform.window:invalidate() end
function on.mouseDown(x,y) clicks=clicks+1 mousex=x mousey=y end
function on.mouseMove(x,y) moves=moves+1 mousex=x mousey=y end
function on.mouseUp(x,y) ups=ups+1 end
function on.paint(gc)
 gc:setColorRGB(255,255,255) gc:fillRect(0,0,platform.window:width(),platform.window:height())
 gc:setColorRGB(0,0,0) gc:setFont('sansserif','r',10)
 gc:drawString('${tag}: '..counter,3,3,'top')
 gc:drawString('ticks '..ticks,3,20,'top')
 gc:drawImage(resource,40,40)
end`;
  pyodide.globals.set('qa_lua_sources',JSON.stringify([source('ALPHA'),source('BETA')]));
  await pyodide.runPythonAsync(`import json, pathlib, xml.etree.ElementTree as ET
_qa_lua_file=pathlib.Path('/work/xml_doctor_stage/Problem1.xml')
_qa_lua_tree=ET.parse(_qa_lua_file)
for _qa_lua_node,_qa_lua_code in zip(_qa_lua_tree.getroot().iter('{urn:TI.ScriptApp}script'),json.loads(qa_lua_sources)):
 _qa_lua_node.text=_qa_lua_code
_qa_lua_tree.write(_qa_lua_file,encoding='utf-8',xml_declaration=True)`);
  const groupsNow=async()=>{const data=await inspectXmlDocument(),groups=TnsDocumentPreviewNavigation.groups(data.items);groups.widgets=documentWidgetPreviewPages(data.items,groups);return groups;};
  let data=await inspectXmlDocument(),cards=documentLayoutCards(data).filter(card=>card.apps.some(app=>['TI.ScriptApp','TI.Scratchpad'].includes(app.name)));
  await applyDocumentPageLayout({action:'group',file:cards[0].file,path:cards[0].path,cards,layout:{clay:3,w1:5000,h1:5000,w2:5000,h2:5000}});
  let groups=await groupsNow(),preview=await openDocumentAppPreview(groups,'widgets',groups.widgets.findIndex(page=>page.previewKind==='compound'),{});
  const frames=[...preview.backdrop.querySelectorAll('iframe.document-embedded-lua-preview')];
  must(frames.length===2,'Expected two Lua panes');
  await wait(()=>frames.every(frame=>frame.dataset.ready==='true'),'independent Lua boot');
  const state=(i,name)=>frames[i].contentWindow.G.str[name],canv=i=>frames[i].contentDocument.querySelector('canvas');
  must(state(0,'counter')===0&&state(1,'counter')===0,'Lua source not loaded');
  must(!frames[0].contentWindow.pyodide&&!frames[1].contentWindow.pyodide,'Embedded Lua started its own Pyodide');
  must(frames.every(frame=>frame.contentWindow.TnsTiPreviewFontCalibration&&frame.contentWindow.__tnsTiPreviewPerformanceInstalled),'Existing Lua compatibility layers missing');
  for(let index=0;index<2;index++){const image=canv(index).getContext('2d').getImageData(41,41,1,1).data;must(image[0]===255&&image[1]===0&&image[2]===0,'Lua image resource did not paint in pane '+index);}
  canv(0).focus();canv(0).dispatchEvent(new KeyboardEvent('keydown',{key:'x',bubbles:true,cancelable:true}));
  must(state(0,'counter')===1&&state(1,'counter')===0,'Keyboard crossed Lua realms');
  must(state(1,'observed')===1,'var.store did not notify the other Lua pane');
  canv(1).focus();canv(1).dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  must(state(1,'counter')===10&&state(0,'counter')===1,'Arrow handler crossed Lua realms');
  const box=canv(0).getBoundingClientRect();
  for(const type of ['pointerdown','pointermove','pointerup'])canv(0).dispatchEvent(new PointerEvent(type,{pointerId:1,clientX:box.left+20,clientY:box.top+20,bubbles:true,cancelable:true}));
  must(state(0,'clicks')===1&&state(0,'moves')===1&&state(0,'ups')===1,'Pointer drag events missing');
  must(state(1,'clicks')===0&&state(1,'moves')===0,'Pointer input leaked to another Lua pane');
  const initialWidth=canv(1).width;
  const divider=preview.backdrop.querySelector('[data-layout-field=w1]');
  divider.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  await wait(()=>canv(1).width!==initialWidth,'pane resize lifecycle');must(state(1,'width')===canv(1).width,'Lua on.resize has wrong pane size');
  await pause(450);must(state(0,'ticks')>0&&state(1,'ticks')>0,'Independent timers did not run');
  const pane=preview.backdrop.querySelector('[data-app-kind=calculators]'),entry=pane.querySelector('[data-expression]');
  entry.value='shared:=42';entry.dispatchEvent(new Event('input',{bubbles:true}));entry.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  await wait(()=>pane.querySelector('[data-previous-runs]').textContent.includes('42'),'editable Calculator sibling');
  must(state(0,'observed')===42&&state(1,'observed')===42,'Calculator did not share variables with both Lua apps');
  preview.backdrop.querySelector('[data-compound-save]').click();await wait(()=>preview.backdrop.querySelector('[data-compound-status]').textContent==='Layout saved','compound Save');
  const oldWindow=frames[0].contentWindow,oldCounter=state(0,'ticks');preview.backdrop.querySelector('[data-widget-close]').click();await pause(300);
  must(!frames[0].isConnected&&!frames[1].isConnected,'Closing card retained iframes');
  must(oldWindow.G.str.ticks===oldCounter,'Closing card retained a Lua timer');
  groups=await groupsNow();preview=await openDocumentAppPreview(groups,'widgets',groups.widgets.findIndex(page=>page.previewKind==='compound'),{});
  await wait(()=>[...preview.backdrop.querySelectorAll('iframe')].every(frame=>frame.dataset.ready==='true'),'Lua reopening');
  must(preview.backdrop.querySelector('[data-app-kind=calculators] [data-previous-runs]').textContent.includes('42'),'Save lost Calculator sibling history');
  must(preview.backdrop.querySelector('iframe').contentWindow.G.str.counter===0,'New card reused disposed Lua globals');
  const reopenedFrames=[...preview.backdrop.querySelectorAll('iframe')],oldRealm=reopenedFrames[0].contentWindow;
  preview.backdrop.querySelector('.compound-preview-chrome .document-preview-tab').click();
  await wait(()=>document.querySelector('.ti-program-editor-preview-modal'),'switch to Program Editor card');
  must(reopenedFrames.every(frame=>!frame.isConnected),'Changing cards retained Lua panes');
  const stoppedTicks=oldRealm.G.str.ticks;await pause(250);must(oldRealm.G.str.ticks===stoppedTicks,'Changing cards retained Lua timers');
  document.querySelectorAll('.ti-program-editor-chrome .document-preview-tab')[1].click();
  await wait(()=>document.querySelector('.compound-preview-modal'),'switch back to grouped card');
  const current=document.querySelector('.compound-preview-modal');
  await wait(()=>[...current.querySelectorAll('iframe')].length===2&&[...current.querySelectorAll('iframe')].every(frame=>frame.dataset.ready==='true'),'Lua after card switch');
  current.querySelector('[data-widget-close]').click();await pause(200);
  must(!document.querySelector('iframe.document-embedded-lua-preview'),'Reopened card cleanup failed');
  return {ok:true,offline:true,twoLuaRealms:true,noAdditionalPyodide:true,compatibilityLayers:true,imageResources:true,keyboardAndArrowIsolation:true,pointerDrag:true,onResize:true,timers:true,sharedProblemVariables:true,calculatorSiblingEditable:true,compoundSave:true,cardSwitchCleanup:true,closeReopenCleanup:true};
}
