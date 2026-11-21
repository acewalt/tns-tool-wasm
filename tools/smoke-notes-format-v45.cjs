const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v45/notes-format.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-notes-format-v45-')));
let win,server;const logs=[];
app.whenReady().then(async()=>{
 server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1600,height:1100,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 win.webContents.on('console-message',(_e,level,message)=>logs.push({level,message}));await win.loadURL(origin);win.webContents.focus();
 const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
 for(const mode of ['normal','zoom','expanded']){
  await win.webContents.executeJavaScript(`(async()=>{const modal=document.querySelector('.compound-preview-modal'),expand=modal.querySelector('[data-preview-window-expand]'),zoom=modal.querySelector('[data-preview-window-zoom]');if(modal.classList.contains('preview-window-expanded'))expand.click();await new Promise(r=>setTimeout(r,80));const active=zoom.getAttribute('aria-pressed')==='true';if(active!==${JSON.stringify(mode==='zoom')})zoom.click();if(${JSON.stringify(mode==='expanded')})expand.click();await new Promise(r=>setTimeout(r,100));})()`);
  fs.writeFileSync(report+'.'+mode+'.png',(await win.webContents.capturePage()).toPNG());
 }
 await win.webContents.executeJavaScript("document.documentElement.dataset.theme='light'");
 fs.writeFileSync(report+'.light.png',(await win.webContents.capturePage()).toPNG());
 fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));
 fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));win.destroy();server.close();app.exit(0);
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack||String(error),logs},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(x,m)=>{if(!x)throw Error(m);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(20);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TiNotepadRichView?.mountEditor&&!document.querySelector('#startup-loader'),'offline startup');applyLanguage('en');
 await loadXmlDoctorFiles([new File(['<prob xmlns="urn:TI.Problem" ver="1.0"><sym/></prob>'],'Problem1.xml')],'file');
 const first=await addNotepadWidgetToStage(),second=await addNotepadWidgetToStage();
 const dock=document.createElement('div'),panes=document.createElement('div');
 dock.style.cssText='position:fixed;top:100px;left:400px;width:600px;z-index:100100;background:#101827';
 panes.style.cssText='position:fixed;top:230px;left:400px;display:flex;gap:6px;z-index:100100';
 document.body.append(dock,panes);
 const hosts=[first,second].map(()=>{const host=document.createElement('div');host.style.cssText='width:150px;height:95px;overflow:hidden';panes.append(host);return host;});
 const controllers=[first,second].map((item,index)=>TiNotepadRichView.mountEditor(hosts[index],item,{formatToolbarHost:dock,active:index===0,onSaveRich:(text,rich)=>saveNotepadWidgetToStage(item,text,rich)}));
 const [c1,c2]=controllers,editor=c1.editor,bar=dock.querySelector('.ti-note-formatbar');
 must(dock.querySelectorAll('.ti-note-formatbar').length===2,'Each Notes pane must own its toolbar');
 must([...dock.children].filter(el=>!el.hidden).length===1,'Only the active Notes toolbar should appear');
 must(!hosts[0].querySelector('.ti-note-formatbar'),'Font toolbar is still inside calculator pane');
 must(bar.getBoundingClientRect().top<editor.getBoundingClientRect().top,'Font toolbar is not above the editor');
 editor.focus();const all=document.createRange();all.selectNodeContents(editor);getSelection().removeAllRanges();getSelection().addRange(all);document.execCommand('insertText',false,'Alpha Beta');
 const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let text;while((text=walker.nextNode())&&!text.textContent.includes('Alpha')){}
 must(text,'Fixture editor text is missing');const selected=document.createRange();selected.setStart(text,text.textContent.indexOf('Alpha'));selected.setEnd(text,text.textContent.indexOf('Alpha')+5);getSelection().removeAllRanges();getSelection().addRange(selected);document.dispatchEvent(new Event('selectionchange'));
 const bold=bar.querySelector('[data-command=bold]');bold.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));bold.click();
 const size=bar.querySelector('.ti-note-size-select');size.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));size.value='20';size.dispatchEvent(new Event('change',{bubbles:true}));
 const color=bar.querySelector('.ti-note-color-input');color.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));color.value='#0055aa';color.dispatchEvent(new Event('input',{bubbles:true}));
 const edited=TiNotepadRichView.extractEditableModel(editor),runs=edited.paragraphs.flatMap(p=>p.runs),alpha=runs.find(r=>r.text==='Alpha');
 must(alpha,'Formatting changed the selected text');must(alpha.style.bold&&alpha.style.fontSize===20&&alpha.style.color==='#0055aa','Bold, font size or text color not applied to selection: '+JSON.stringify(runs));
 const beta=runs.find(r=>r.text.includes('Beta'));must(beta&&!beta.style.bold&&beta.style.fontSize===11,'Font controls affected text outside the selection');
 c1.setActive(false);c2.setActive(true);must(bar.hidden&&!dock.hidden,'Switching Notes did not change the toolbar');
 c2.setActive(false);must(dock.hidden,'Font dock remained visible on another app');
 c1.setActive(true);must(!dock.hidden&&!bar.hidden,'Returning to Notes did not restore its toolbar');
 const toggle=hosts[0].querySelector('#note-edit-view');toggle.click();must(dock.hidden,'B should hide font controls');toggle.click();must(!dock.hidden,'B should show font controls');
 await c1.save();let stored=await readStoredDocumentWidget(first,'TI.Notepad');const native=TiNotepadRichView.parseNotepadRichText(stored.raw_xml),savedAlpha=native.paragraphs.flatMap(p=>p.lines.flatMap(line=>line.runs)).find(r=>r.text==='Alpha');
 must(savedAlpha?.style.bold&&savedAlpha.style.fontSize===20&&savedAlpha.style.color==='#0055aa','Formatting lost in native Notes XML');
 c1.destroy();c2.destroy();must(!dock.querySelector('.ti-note-formatbar')&&dock.hidden,'Closing panes leaked a font toolbar');panes.remove();dock.remove();
 const data=await inspectXmlDocument(),cards=documentLayoutCards(data);await applyDocumentPageLayout({action:'group',file:cards[0].file,path:cards[0].path,cards,layout:{clay:1,w1:5000,h1:5000,w2:5000,h2:5000}});
 const d=await inspectXmlDocument(),groups=TnsDocumentPreviewNavigation.groups(d.items);groups.widgets=documentWidgetPreviewPages(d.items,groups);
 const preview=await openDocumentAppPreview(groups,'widgets',0,{});await pause(120);
 await pause(350);
 const notePanes=[...preview.backdrop.querySelectorAll('[data-app-kind=notes]')],actualDock=preview.backdrop.querySelector('.compound-preview-format-tools');
 must(actualDock,'The grouped page did not provide an external font dock');must(actualDock.querySelector('.ti-note-formatbar:not([hidden])'),'Active grouped Notes has no font controls');
 must(notePanes.every(p=>!p.querySelector('.ti-note-formatbar')),'A grouped Notes font panel still overlays its pane');
 const fullyVisible=(element,label)=>{const rect=element.getBoundingClientRect();must(rect.width>0&&rect.height>0,label+' collapsed');let left=0,top=0,right=innerWidth,bottom=innerHeight;for(let parent=element.parentElement;parent;parent=parent.parentElement){const style=getComputedStyle(parent),bounds=parent.getBoundingClientRect();if(/hidden|auto|scroll|clip/.test(style.overflowX)){left=Math.max(left,bounds.left);right=Math.min(right,bounds.right);}if(/hidden|auto|scroll|clip/.test(style.overflowY)){top=Math.max(top,bounds.top);bottom=Math.min(bottom,bounds.bottom);}}must(rect.left>=left-1&&rect.right<=right+1&&rect.top>=top-1&&rect.bottom<=bottom+1,label+' clipped by a parent');};
 const visibleControls=()=>{
  [...actualDock.querySelectorAll('.ti-note-formatbar:not([hidden]) button,.ti-note-formatbar:not([hidden]) select,.ti-note-formatbar:not([hidden]) input')].forEach(element=>fullyVisible(element,'Font control '+(element.dataset.command||element.type||element.tagName)));
  const dockBounds=actualDock.getBoundingClientRect(),screenBounds=preview.backdrop.querySelector('.compound-preview-calculator').getBoundingClientRect(),introBounds=preview.backdrop.querySelector('.preview-window-header p').getBoundingClientRect();
  must(dockBounds.bottom<=screenBounds.top-2,'Font dock overlaps the calculator display');
  must(dockBounds.top>=introBounds.bottom+2,'Font dock overlaps the window subtitle');
 };
 const r=actualDock.getBoundingClientRect(),screen=preview.backdrop.querySelector('.compound-preview-calculator').getBoundingClientRect();must(r.bottom<=screen.top+1,'Font dock overlaps the calculator display');visibleControls();
 const originalFrame=preview.backdrop.querySelector('.preview-window-frame').getBoundingClientRect();
 preview.backdrop.querySelector('[data-preview-window-zoom]').click();await pause(80);visibleControls();
 const zoomed=preview.backdrop.querySelector('.preview-window-frame').getBoundingClientRect();must(zoomed.width>originalFrame.width,'Zoom did not enlarge the grouped page');
 preview.backdrop.querySelector('[data-preview-window-expand]').click();await pause(80);visibleControls();must(preview.backdrop.querySelector('[data-preview-window-zoom]').disabled,'Expanded view must disable the magnifier');
 preview.backdrop.querySelector('[data-preview-window-expand]').click();await pause(80);visibleControls();
 // A hidden offscreen renderer has no OS focus and does not emit focusin
 // from .focus(). Deliver the same bubbling event after setting the caret.
 notePanes[1].querySelector('.ti-note-rich-view').focus();notePanes[1].querySelector('.ti-note-rich-view').dispatchEvent(new FocusEvent('focusin',{bubbles:true}));await pause(20);must([...actualDock.querySelectorAll('.ti-note-formatbar')].filter(el=>!el.hidden).length===1,'Grouped selection must show exactly one Notes toolbar');
 const groupedEditor=notePanes[1].querySelector('.ti-note-rich-view'),groupedBar=actualDock.querySelector('.ti-note-formatbar:not([hidden])');
 must(groupedBar===actualDock.querySelectorAll('.ti-note-formatbar')[1],'The focused Notes did not activate its own toolbar');
 const groupedRange=document.createRange();groupedRange.selectNodeContents(groupedEditor);getSelection().removeAllRanges();getSelection().addRange(groupedRange);document.execCommand('insertText',false,'Gamma');
 groupedRange.selectNodeContents(groupedEditor);getSelection().removeAllRanges();getSelection().addRange(groupedRange);document.dispatchEvent(new Event('selectionchange'));
 const italic=groupedBar.querySelector('[data-command=italic]');italic.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));italic.click();
 const groupedSize=groupedBar.querySelector('.ti-note-size-select');groupedSize.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));groupedSize.value='14';groupedSize.dispatchEvent(new Event('change',{bubbles:true}));
 await preview.controllers[1].save();const groupedStored=await readStoredDocumentWidget(d.items.filter(item=>item.name==='TI.Notepad')[1],'TI.Notepad'),groupedNative=TiNotepadRichView.parseNotepadRichText(groupedStored.raw_xml),gamma=groupedNative.paragraphs.flatMap(p=>p.lines.flatMap(line=>line.runs)).find(r=>r.text==='Gamma');
 must(gamma?.style.italic&&gamma.style.fontSize===14,'External controls did not save the active grouped Notes formatting: '+JSON.stringify({gamma,html:groupedEditor.innerHTML,native:groupedNative.paragraphs.map(p=>p.lines),item:preview.controllers[1].item?.path,read:d.items.filter(item=>item.name==='TI.Notepad')[1]?.path}));
 const untouchedStored=await readStoredDocumentWidget(preview.controllers[0].item,'TI.Notepad'),untouchedRuns=TiNotepadRichView.parseNotepadRichText(untouchedStored.raw_xml).paragraphs.flatMap(p=>p.lines.flatMap(line=>line.runs));
 must(untouchedRuns.find(run=>run.text==='Alpha')?.style.fontSize===20&&!untouchedRuns.some(run=>run.text==='Gamma'),'Formatting the second Notes changed the first Notes');
 notePanes[0].dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));must(!actualDock.querySelectorAll('.ti-note-formatbar')[0].hidden&&actualDock.querySelectorAll('.ti-note-formatbar')[1].hidden,'Pointer selection did not activate the correct Notes toolbar');
 return{ok:true,offline:true,externalPanel:true,activePaneOnly:true,selectionPreserved:true,boldSizeColor:true,unselectedTextPreserved:true,nativeXmlFormatting:true,groupedNativeFormatting:true,cleanup:true,groupedDockAboveScreen:true,unclippedControls:true,zoomAndExpanded:true};
}
