/* Native app accents are independent of the website theme and screen size. */
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v41/chrome-colors.json');
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1100,height:700,webPreferences:{sandbox:true,contextIsolation:true}});
 try{
  await win.loadURL('data:text/html,<html><body></body></html>');
  await win.webContents.insertCSS(fs.readFileSync(path.join(root,'web/document-preview-navigation.css'),'utf8'));
  await win.webContents.executeJavaScript(fs.readFileSync(path.join(root,'web/document-preview-navigation.js'),'utf8'));
  const result=await win.webContents.executeJavaScript(`(${check.toString()})()`);
  fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));
  fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));app.exit(0);
 }catch(error){console.error(error);app.exit(1);}finally{win.destroy();}
});
function check(){
 const must=(value,label)=>{if(!value)throw Error(label);};
 const items=Array.from({length:3},(_,i)=>({file:'Problem1.xml',path:`/prob/card[${i+1}]/wdgt`}));
 const cases=[['notes','note-page-modal','love-preview-calculator-bar','rgb(255, 173, 50)'],['calculators','prgm-preview-modal','prgm-preview-chrome','rgb(137, 134, 157)'],['graphs','graph-preview-modal','graph-preview-chrome','rgb(41, 155, 190)'],['sheets','spreadsheet-modal','spreadsheet-calc-topbar','rgb(89, 185, 168)'],['python','ti-python-editor-modal','ti-python-chrome','rgb(60, 127, 175)'],['basic','ti-program-editor-modal','ti-program-editor-chrome','rgb(245, 101, 107)']];
 const results=[];document.body.style.cssText='margin:16px;background:#fff;font:14px Arial';
 for(const theme of ['dark','light']){
  document.documentElement.dataset.theme=theme;
  for(const [kind,modalClass,chromeClass,color]of cases){
   const modal=document.createElement('section');modal.className=modalClass;modal.style.cssText='display:inline-block;width:320px;margin:6px;vertical-align:top';
   const label=document.createElement('p');label.textContent=theme+' / '+kind;
   const host=document.createElement('div');host.className=chromeClass;modal.append(label,host);document.body.append(modal);
   TnsDocumentPreviewNavigation.mountChrome(host,{items,selected:1,title:'Example',onClose:()=>{}});
   const tabs=host.querySelectorAll('.document-preview-tab'),before=host.getBoundingClientRect();
   must(getComputedStyle(host).borderBottomColor===color,kind+': incorrect boundary color');
   must(getComputedStyle(tabs[1]).borderTopColor===color,kind+': active tab color differs');
   must(host.dataset.previewAppKind===kind,kind+': wrong inferred app');
   must(tabs.length===3&&before.width===320&&before.height===26,kind+': changing accents moved the header');
   TnsDocumentPreviewNavigation.updateChrome(host,{appKind:'notes'});
   must(host.querySelector('.document-preview-tab')===tabs[0],kind+': switching active app rebuilt navigation');
   must(getComputedStyle(host).borderBottomColor==='rgb(255, 173, 50)',kind+': switching pane did not recolor');
   TnsDocumentPreviewNavigation.updateChrome(host,{appKind:kind});
   results.push({theme,kind,color,width:before.width,height:before.height});
  }
 }
 return{ok:true,results};
}
