/* Real renderer regression for Page layout stacking, focus and native app labels. */
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v43/layout-dialog.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-layout-dialog-v43-')));
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 try{
  await win.loadURL('data:text/html,<html lang="en"><body></body></html>');
  await win.webContents.insertCSS('body{font:14px Arial;color:#e4edf8;background:#101827}.modal-backdrop{position:fixed;inset:0;display:grid;place-items:center;z-index:20;background:#0008}.modal{background:#101827;padding:24px}.modal-actions{display:flex;justify-content:end;gap:10px}button{color:#e4edf8;background:#244361;border:1px solid #34475f;border-radius:8px;padding:10px;cursor:pointer}button:disabled{opacity:.4}.green-tool-button{background:#a5ed32;color:#19310d}.preview-window-backdrop{z-index:10050!important}');
  await win.webContents.insertCSS(fs.readFileSync(path.join(root,'web/document-page-layout.css'),'utf8'));
  for(const file of ['document-preview-navigation.js','document-page-layout.js'])await win.webContents.executeJavaScript(fs.readFileSync(path.join(root,'web',file),'utf8')+'\nvoid 0;');
  const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
  fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));
  fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));app.exit(0);
 }catch(error){fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack},null,2));fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);app.exit(1);}
 finally{win.destroy();}
}).catch(error=>{console.error(error);app.exit(1);});
async function check(){
 const must=(value,message)=>{if(!value)throw Error(message);};
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const page=(index,apps)=>({file:'/stage/Problem1.xml',path:'/prob/card['+index+']',detail:{clay:apps.length===2?1:apps.length===3?3:0},apps:apps.map(name=>({name,type:'Widget'}))});
 const pages=[page(1,['TI.GeoGrapher','TI.Notepad','TI.Notepad']),page(2,['TI.ProgramEditor']),page(3,['tabulator']),page(4,['TI.Scratchpad']),page(5,['TI.PythonEditor']),page(6,['TI.ScriptApp'])];
 const preview=document.createElement('div');preview.className='modal-backdrop preview-window-backdrop';preview.innerHTML='<section class="modal"><h2>Notes preview with an unsaved draft</h2><textarea>keep my draft</textarea><button id="launch">Page layout</button></section>';document.body.append(preview);
 const opener=preview.querySelector('#launch');opener.focus();
 let closes=0;const layout=TnsDocumentPageLayout.open({pages,onClose:()=>closes++});await pause(50);
 const style=getComputedStyle(layout.backdrop);must(Number(style.zIndex)>Number(getComputedStyle(preview).zIndex),'Layout stayed behind preview');
 const button=layout.modal.querySelector('[data-layout-close]'),bounds=button.getBoundingClientRect();must(document.elementFromPoint(bounds.x+bounds.width/2,bounds.y+bounds.height/2)===button,'Layout close button is covered by preview');
 must(document.activeElement===button,'Layout did not take focus');
 const labels=[...layout.modal.querySelectorAll('.page-layout-page')].map(button=>button.textContent);
 must(labels[0]==='Page 1.1 · TI.GeoGrapher + TI.Notepad ×2 (3)','Grouped app type label is wrong: '+labels[0]);
 for(const [index,name] of ['TI.ProgramEditor','tabulator','TI.Scratchpad','TI.PythonEditor','TI.ScriptApp'].entries())must(labels[index+1].includes(name),'Missing native type: '+name);
 must(!labels.some(label=>label.includes('Problem1.xml')),'File name remains in page label');
 must([...layout.modal.querySelectorAll('[data-layout-group-list] label')].every(label=>!label.textContent.includes('Problem1.xml')),'Grouping labels still show XML file');
 opener.focus();await pause(0);must(document.activeElement===button,'Focus escaped to underlying preview: '+document.activeElement?.outerHTML+' layers '+[...document.querySelectorAll('.modal-backdrop')].map(el=>getComputedStyle(el).zIndex));
 const items=[...layout.modal.querySelectorAll('button:not(:disabled),input:not(:disabled)')].filter(el=>el.getClientRects().length),first=items[0],last=items.at(-1);
 last.focus();last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));must(document.activeElement===first,'Forward Tab did not stay in layout');
 first.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));must(document.activeElement===last,'Backward Tab did not stay in layout');
 const next=document.createElement('div');next.className='modal-backdrop';next.style.zIndex=String(Number(style.zIndex)+1);next.innerHTML='<button>Higher preview</button>';document.body.append(next);next.firstElementChild.focus();must(document.activeElement===next.firstElementChild,'Layout stole focus from a newer preview');next.remove();
 button.focus();button.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));must(!layout.backdrop.isConnected&&closes===1,'Escape did not close layout');
 must(preview.isConnected&&document.activeElement===opener&&preview.querySelector('textarea').value==='keep my draft','Closing layout lost preview, draft or original focus');
 // A previous dialog can itself have been promoted above the common preview level.
 preview.style.setProperty('z-index','43000','important');opener.focus();const higher=TnsDocumentPageLayout.open({pages,selected:pages[2]});must(Number(getComputedStyle(higher.backdrop).zIndex)===43001,'Promoted dialog not respected');higher.close();
 // Grouped labels use native application identifiers in all website languages.
 for(const lang of ['es','fr']){document.documentElement.lang=lang;const translated=TnsDocumentPageLayout.open({pages});must(translated.modal.querySelector('.page-layout-page').textContent.includes('TI.Notepad ×2'),'Native app names were translated or lost');translated.close();}
 document.documentElement.lang='en';const visual=TnsDocumentPageLayout.open({pages,selected:pages[2]});await pause(100);
 return{ok:true,previewZIndex:43000,layoutZIndex:Number(getComputedStyle(visual.backdrop).zIndex),frontmost:true,focusTrap:true,focusRestored:true,draftPreserved:true,nativeLabels:labels,languages:['en','es','fr']};
}
