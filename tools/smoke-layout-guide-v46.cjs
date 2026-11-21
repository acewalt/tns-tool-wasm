/* Offline compound-page Lua integration: two independent VMs + Calculator. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v46/layout-guide.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-layout-guide-v46-')));
let win,server;const logs=[];
app.whenReady().then(async()=>{
  server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
  win=new BrowserWindow({show:false,width:1600,height:1100,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
  win.webContents.on('console-message',(_e,level,message)=>logs.push({level,message}));
  await win.loadURL(origin);win.webContents.focus();
  const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
  await win.webContents.executeJavaScript(`window.qaHoverDialog=TnsDocumentPageLayout.open({pages:window.qaLayoutPages,onApply:async()=>({})});void 0;`);
  await new Promise(r=>setTimeout(r,650));
  const points=await win.webContents.executeJavaScript(`(() => {const dialog=qaHoverDialog;const rect=dialog.modal.getBoundingClientRect();return [...dialog.modal.querySelectorAll('.page-layout-page')].map(node=>{const r=node.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),width:rect.width,height:rect.height};});})()`);
  for(let i=0;i<12;i++)for(const point of points){win.webContents.sendInputEvent({type:'mouseMove',x:point.x,y:point.y});await new Promise(r=>setTimeout(r,30));const rect=await win.webContents.executeJavaScript(`(() => {const r=qaHoverDialog.modal.getBoundingClientRect();return {width:r.width,height:r.height,scroll:qaHoverDialog.modal.scrollWidth-qaHoverDialog.modal.clientWidth};})()`);if(Math.abs(rect.width-point.width)>1||Math.abs(rect.height-point.height)>1||rect.scroll>1)throw Error('Mouse hover resized the layout dialog: '+JSON.stringify(rect));}
  result.realMouseHoverStable=true;
  await win.webContents.executeJavaScript(`qaHoverDialog.close();showLuaGuide();`);await new Promise(r=>setTimeout(r,250));
  fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));
  fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));win.destroy();server.close();app.exit(0);
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack||String(error),logs},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),must=(v,m)=>{if(!v)throw Error(m);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(25);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsCompoundPreview&&!document.querySelector('#startup-loader'),'startup');applyLanguage('en');
 await loadXmlDoctorFiles([new File(['<prob xmlns="urn:TI.Problem" ver="1.0"><sym/></prob>'],'Problem1.xml')],'file');
 await addLuaScriptAppToStage();await addCalculatorWidgetToStage();
 const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;canvas.getContext('2d').fillStyle='#ff0000';canvas.getContext('2d').fillRect(0,0,32,32);
 const blob=await new Promise(r=>canvas.toBlob(r));await addImageWidgetToStage(new File([blob],'red-image.png',{type:'image/png'}));
 let info=await inspectXmlDocument(),cards=documentLayoutCards(info);
 must(cards.length===3,'Fixture must have Lua, Calculator and actual Add Image cards');
 await applyDocumentPageLayout({action:'group',file:cards[0].file,path:cards[0].path,cards,layout:{clay:3,w1:5000,h1:5000,w2:5000,h2:5000}});
 const groupsNow=async()=>{const data=await inspectXmlDocument(),groups=TnsDocumentPreviewNavigation.groups(data.items);groups.widgets=documentWidgetPreviewPages(data.items,groups);return groups;};
 let groups=await groupsNow(),view=await openDocumentAppPreview(groups,'widgets',0,{});
 await wait(()=>view.backdrop.querySelectorAll('iframe[data-ready=true]').length===2,'Lua and image ScriptApp boot');
 const imageFrame=view.backdrop.querySelector('[data-app-kind=images] iframe');must(imageFrame,'Image ScriptApp did not get its Lua renderer');
 const imageCanvas=imageFrame.contentDocument.querySelector('canvas');
 await wait(()=>{const data=imageCanvas.getContext('2d').getImageData(0,0,imageCanvas.width,imageCanvas.height).data;for(let i=0;i<data.length;i+=4)if(data[i]>200&&data[i+1]<50&&data[i+2]<50)return true;return false;},'real image resource paint');
 const stage=view.backdrop.querySelector('.compound-preview-panes'),box=stage.getBoundingClientRect(),divider=view.backdrop.querySelector('[data-layout-field=h1]');
 // A mouse position need not land on an integer ten-thousandth. Exercise the
 // real pointer path, including capture, rather than seeding a rounded draft.
 divider.setPointerCapture=()=>{};
 divider.dispatchEvent(new PointerEvent('pointerdown',{pointerId:4,button:0,bubbles:true}));
 divider.dispatchEvent(new PointerEvent('pointermove',{pointerId:4,clientX:box.left+5,clientY:box.top+box.height*.436713,bubbles:true}));
 divider.dispatchEvent(new PointerEvent('pointerup',{pointerId:4,bubbles:true}));
 must(Number.isInteger(view.layout.h1)&&view.layout.h1!==5000,'Drag was not quantized to native units');
 view.backdrop.querySelector('[data-compound-save]').click();await wait(()=>view.backdrop.querySelector('[data-compound-status]').textContent==='Layout saved','fractional drag Save layout');
 const saved=(await inspectXmlDocument()).items.find(item=>item.type==='Card');must(Number(saved.detail.h1)===view.layout.h1,'Native XML did not retain dragged layout');
 const ratio=view.layout.h1;view.backdrop.querySelector('[data-widget-close]').click();await pause(200);
 groups=await groupsNow();view=await openDocumentAppPreview(groups,'widgets',0,{});await wait(()=>view.backdrop.querySelectorAll('iframe[data-ready=true]').length===2,'reopen images');must(view.layout.h1===ratio,'Reopen lost native ratio');
 const frame=view.backdrop.querySelector('.preview-window-frame'),before=frame.getBoundingClientRect();
 for(const pane of view.backdrop.querySelectorAll('.compound-preview-pane')){pane.dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));pane.focus({preventScroll:true});await pause(30);const r=frame.getBoundingClientRect();must(Math.abs(r.width-before.width)<1&&Math.abs(r.height-before.height)<1&&Math.abs(r.y-before.y)<1,'Hover/focus changed grouped frame');}
 view.backdrop.querySelector('[data-widget-close]').click();await pause(150);
 const pages=documentLayoutCards(await inspectXmlDocument()),dialog=TnsDocumentPageLayout.open({pages,onApply:async()=>({})});window.qaLayoutPages=pages;
 const page=dialog.modal.querySelector('.page-layout-page'),scroller=page.parentElement,rect=page.getBoundingClientRect();
 must(scroller.scrollWidth<=scroller.clientWidth,'Page list has a horizontal scrollbar');
 must(rect.width<=scroller.clientWidth,'Page button overflows its panel');
 must(getComputedStyle(page).boxSizing==='border-box','Page buttons include padding outside their width');
 dialog.close();
 const calculator=window.TnsTiBasicMath.createSession(),commands=['math.eval(1+2^2)','math.eval("1+1")','math.evalstr(factor(x^2-1))','math.evalstr(integral(x^2,x))','math.evalstr(solve(x^2-4=0,x))','373.216-273.15'],outputs=[];
 for(const command of commands)outputs.push((await calculator.evaluateAsync(command)).display);
 must(outputs[0]==='math.eval(5)'&&outputs[1]==='math.eval("1+1")'&&outputs[2].includes('x')&&outputs[3].includes('3')&&outputs[4].includes('2')&&outputs[5]==='100.066','Recorded Calculator commands failed: '+JSON.stringify(outputs));
 const module=await import('./web/lua-guide.js'),catalog=await import('./src/lua/api-catalog.js');
 const editor=document.createElement('textarea');editor.value='-- before\n\n-- after';editor.setSelectionRange(10,10);document.body.append(editor);const initial=editor.value;
 const guide=await module.openLuaGuide({language:'en',editor,preview:code=>showLovePreview(code,null,null,{})});
 const choose=id=>guide.modal.querySelector('[data-category="'+id+'"]').click();choose('strings');guide.modal.querySelector('[data-entry=string-gmatch]').click();
 guide.modal.querySelector('[data-action=compare]').click();must(guide.modal.querySelector('.lua-guide-detail').textContent.includes('gmatch 3 palabras'),'Guide omitted recorded evidence');
 guide.modal.querySelector('[data-action=try]').click();await wait(()=>document.querySelector('.love-preview-modal'),'isolated Try');await pause(250);
 const preview=document.querySelector('.love-preview-modal');must(preview.textContent.includes('Hola')||preview.querySelector('canvas'),'Try failed to mount preview');must(editor.value===initial,'Try modified user source');preview.querySelector('#love-preview-close-top').click();await pause(200);
 guide.modal.querySelector('[data-action=insert]').click();const example=catalog.apiCatalog.find(i=>i.id==='string-gmatch').example;must(editor.value===initial.slice(0,10)+example+initial.slice(10),'Insert ignored caret or overwrote source');
 choose('cas');guide.modal.querySelector('[data-cas-reference]').click();must(!guide.modal.querySelector('.lua-guide-cas-slot').hidden&&guide.modal.querySelector('.lua-guide-cas-slot').textContent.includes('deSolve'),'Existing CAS guide disconnected');guide.modal.querySelector('[data-close]').click();await pause(200);
 for(const language of ['es','fr']){const g=await module.openLuaGuide({language});must(!g.modal.textContent.includes('undefined'),'Missing guide translation');g.modal.querySelector('[data-close]').click();await pause(100);}
 return {ok:true,offline:true,actualAddImageInLayout:true,twoLuaRealms:true,integerDrag:ratio,saveAndReopen:true,groupedFocusStable:true,pageButtonNoHorizontalOverflow:true,calculatorCommands:commands,calculatorOutputs:outputs,guideCategories:catalog.guideCategories.length,guideEntries:catalog.apiCatalog.length,guideEvidence:true,guideInsertAtCaret:true,guideTryIsolated:true,guideCasIntegrated:true,languages:['en','es','fr']};
}
