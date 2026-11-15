/* Real renderer coverage of page selection, native layouts, swaps and save lifecycle. */
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v44/layout-editor.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-layout-editor-v44-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 try{
  await win.loadURL('data:text/html,<html lang="en"><body></body></html>');
  await win.webContents.insertCSS('body{font:14px Arial;color:#e4edf8;background:#101827}.modal-backdrop{position:fixed;inset:0;display:grid;place-items:center;z-index:20;background:#0008}.modal{background:#101827;padding:24px}.modal-actions{display:flex;justify-content:end;gap:10px}button{color:#e4edf8;background:#244361;border:1px solid #34475f;border-radius:8px;padding:10px;cursor:pointer}button:disabled{opacity:.4}.green-tool-button{background:#a5ed32;color:#19310d}');
  await win.webContents.insertCSS(fs.readFileSync(path.join(root,'web/document-page-layout.css'),'utf8'));
  for(const file of ['document-preview-navigation.js','document-page-layout.js'])await win.webContents.executeJavaScript(fs.readFileSync(path.join(root,'web',file),'utf8')+'\nvoid 0;');
  const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
  fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));
  fs.writeFileSync(report+'.dark.png',(await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript('document.documentElement.dataset.theme="light";document.body.style.background="#f2f5fa";new Promise(resolve=>setTimeout(resolve,250))');
  fs.writeFileSync(report+'.light.png',(await win.webContents.capturePage()).toPNG());
  await win.setContentSize(620,900);await win.webContents.executeJavaScript('new Promise(resolve=>setTimeout(resolve,250))');
  const responsive=await win.webContents.executeJavaScript('(()=>{const modal=document.querySelector(".document-page-layout-modal");return modal.scrollWidth<=modal.clientWidth+1})()');
  if(!responsive)throw Error('Layout overflows at a narrow viewport');
  fs.writeFileSync(report+'.mobile.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));app.exit(0);
 }catch(error){fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack},null,2));fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);app.exit(1);}
 finally{win.destroy();}
}).catch(error=>{console.error(error);app.exit(1);});
async function check(){
 const must=(value,message)=>{if(!value)throw Error(message);},pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const page=(index,names,file='/stage/Problem1.xml')=>({file,path:'/prob/card['+index+']',raw_xml:'snapshot-'+file+'-'+index,detail:{clay:names.length===2?1:0,w1:4000,h1:5000,w2:0,h2:0},apps:names.map(name=>({name,type:'Widget'}))});
 const pages=[page(1,['TI.GeoGrapher','TI.Scratchpad']),page(2,['TI.PythonEditor']),page(3,['TI.ProgramEditor']),page(4,['TI.Notepad','tabulator']),page(1,['TI.Notepad'],'/stage/Problem2.xml')];
 const underlying=document.createElement('div');underlying.className='modal-backdrop';underlying.style.zIndex='43000';underlying.innerHTML='<button id="launch">Page layout</button><textarea>unsaved draft</textarea>';document.body.append(underlying);const opener=underlying.querySelector('button');opener.focus();
 let operation,finish,closes=0;const layout=TnsDocumentPageLayout.open({pages,onApply:change=>{operation=change;return new Promise(resolve=>{finish=resolve;});},onClose:()=>closes++});
 const q=selector=>layout.modal.querySelector(selector),clickPage=index=>q('[data-layout-page="'+index+'"]').click(),designs=()=>[...layout.modal.querySelectorAll('[data-layout-clay]')].map(el=>Number(el.dataset.layoutClay)),types=()=>[...layout.modal.querySelectorAll('[data-layout-app]')].map(el=>el.dataset.appType);
 await pause(220);must(Number(getComputedStyle(layout.backdrop).zIndex)===43001,'Layout did not open above the active preview');must(underlying.inert,'Underlying preview is not inert');must(document.activeElement===q('[data-layout-close]'),'Layout did not own focus');
 must(layout.modal.querySelectorAll('[data-layout-pages]').length===1&&!q('[data-layout-group-list]'),'Pages are duplicated');must(!q('[data-layout-order]')&&!q('[data-layout-preview]'),'Removed controls remain');
 must(designs().join(',')==='1,2'&&types().join(',')==='TI.GeoGrapher,TI.Scratchpad','Two-app designs or preview wrong');
 const previewBounds=q('[data-layout-draft]').getBoundingClientRect(),presetBounds=q('.page-layout-presets').getBoundingClientRect();must(previewBounds.y>presetBounds.bottom,'Symbolic preview must be below the templates');
 must(q('[data-layout-app="0"]').style.width==='40%','Existing divider ratio was not kept');
 clickPage(1);must(designs().join(',')==='0'&&types().join(',')==='TI.PythonEditor','Single page symbolic preview did not update');must(q('[data-layout-ungroup]').hidden,'Ungroup shown for a simple page');
 clickPage(0);must(!q('[data-layout-ungroup]').hidden,'Ungroup missing for a grouped page');q('[data-layout-multiple]').click();must(layout.getState().multiple,'Multiple selection toggle failed');clickPage(1);must(designs().join(',')==='3,4,5,6','Three-app layouts not filtered');must(q('[data-layout-page="4"]').disabled,'Another problem can be selected');
 clickPage(2);must(designs().join(',')==='7','Four-app layout not filtered');clickPage(3);must(!designs().length&&q('[data-layout-save]').disabled&&q('[data-layout-draft]').hidden,'More than four apps can be saved');clickPage(3);clickPage(2);q('[data-layout-clay="5"]').click();
 const dragFrom=q('[data-layout-app="0"]'),dragTo=q('[data-layout-app="2"]'),data=new DataTransfer();dragFrom.dispatchEvent(new DragEvent('dragstart',{dataTransfer:data,bubbles:true,cancelable:true}));dragTo.dispatchEvent(new DragEvent('dragover',{dataTransfer:data,bubbles:true,cancelable:true}));dragTo.dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}));
 must(types().join(',')==='TI.PythonEditor,TI.Scratchpad,TI.GeoGrapher','Dragging did not swap positions');
 const press=index=>q('[data-layout-app="'+index+'"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));press(0);press(1);must(types().join(',')==='TI.Scratchpad,TI.PythonEditor,TI.GeoGrapher','Keyboard swap did not match drag');
 const app0=q('[data-layout-app="0"]');must(app0.style.getPropertyValue('--app-accent')==='#89869d','Calculator color diverges from navigation');must(getComputedStyle(app0).textAlign==='center','Native application titles are not centered');
 q('[data-layout-save]').click();await pause(0);must(operation.action==='group'&&operation.cards.length===2&&operation.layout.clay===5&&operation.order.join(',')==='1,2,0','Wrong grouping permutation/layout');must(operation.cards[0].raw_xml===pages[0].raw_xml,'Native snapshot missing');must(layout.backdrop.isConnected&&q('[data-layout-save]').disabled,'Dialog closes before saving finishes');finish({pages:[{...pages[0],apps:operation.order.map(i=>[...pages[0].apps,...pages[1].apps][i])},...pages.slice(2)],path:pages[0].path});await pause(0);
 must(!layout.backdrop.isConnected&&closes===1,'Save layout did not close after success');must(!underlying.inert&&document.activeElement===opener&&underlying.querySelector('textarea').value==='unsaved draft','Save did not restore focus and preserve underlying draft');
 const failing=TnsDocumentPageLayout.open({pages,selected:pages[1],onApply:async()=>{throw Error('Native snapshot changed; reopen the dialog.');}});failing.modal.querySelector('[data-layout-save]').click();await pause(0);must(failing.backdrop.isConnected&&failing.modal.querySelector('[data-layout-status]').textContent.includes('snapshot changed'),'Native errors close the dialog or disappear');failing.close();
 const clear=TnsDocumentPageLayout.open({pages,onApply:async()=>({})});clear.modal.querySelector('[data-layout-multiple]').click();clear.modal.querySelector('[data-layout-clear]').click();must(!clear.getState().selectedPages.length&&clear.modal.querySelector('[data-layout-save]').disabled,'Clear selection kept an invisible active page');must(!clear.modal.querySelector('[data-layout-page="4"]').disabled,'Clearing did not release same-problem restriction');clear.modal.querySelector('[data-layout-page="4"]').click();must(clear.getState().selectedPages[0].file.endsWith('Problem2.xml'),'Duplicate native paths select a page in the wrong problem');clear.close();
 for(const lang of ['es','fr']){document.documentElement.lang=lang;const translated=TnsDocumentPageLayout.open({pages});must(translated.modal.querySelector('.page-layout-page').textContent.includes('TI.GeoGrapher'),'Native type was translated');must(!translated.modal.textContent.includes('undefined'),'Missing localized layout text');translated.close();}
 document.documentElement.lang='en';const visual=TnsDocumentPageLayout.open({pages,onApply:async()=>({})});visual.modal.querySelector('[data-layout-multiple]').click();visual.modal.querySelector('[data-layout-page="1"]').click();visual.modal.querySelector('[data-layout-clay="5"]').click();await pause(220);
 return{ok:true,filteredDesigns:{one:[0],two:[1,2],three:[3,4,5,6],four:[7]},singleList:true,multiSelection:true,sameProblemGuard:true,appLimit:true,dragAndKeyboardSwap:true,groupOrder:operation.order,selectedLayout:operation.layout.clay,nativeSnapshots:true,saveClosesAfterSuccess:true,errorsPreserveDialog:true,focusRestored:true,translations:['en','es','fr']};
}
