/* Offline Calculator sizing and entry focus inside grouped document pages. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v45/calculator-layout.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-calc-layout-v45-')));
let win,server;const logs=[];
app.whenReady().then(async()=>{
  server=makeServer(root,process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));const origin=await listen(server);
  session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
  win=new BrowserWindow({show:false,width:1600,height:1100,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
  win.webContents.on('console-message',(_e,level,message)=>{logs.push({level,message});if(message.startsWith('QA '))console.log(message);});
  await win.loadURL(origin);win.webContents.focus();
  const result=await Promise.race([win.webContents.executeJavaScript(`(${check.toString()})()`),new Promise((_,reject)=>setTimeout(()=>reject(Error('Smoke timeout')),60000))]);
  fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify(result,null,2));
  fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(result));win.destroy();server.close();app.exit(result.ok?0:1);
}).catch(async error=>{fs.mkdirSync(path.dirname(report),{recursive:true});fs.writeFileSync(report,JSON.stringify({ok:false,error:error.stack||String(error),logs},null,2));if(win&&!win.isDestroyed())fs.writeFileSync(report+'.failure.png',(await win.webContents.capturePage()).toPNG());console.error(error);win?.destroy();server?.close();app.exit(1);});
async function check(){
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(x,m)=>{if(!x)throw Error(m);};
  const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(20);}};
  await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsPrgmPreview&&!document.querySelector('#startup-loader'),'offline startup');applyLanguage('en');
  const blank=await(await fetch('./templates/blank_tns_xml/Problem1.xml')).text();await loadXmlDoctorFiles([new File([blank],'Problem1.xml')],'file');
  console.log('QA fixture loaded');await addCalculatorWidgetToStage();console.log('QA calculator added');
  let data=await inspectXmlDocument(),cards=documentLayoutCards(data);
  const cases=[],rect=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,cw:n.clientWidth,ch:n.clientHeight,sw:n.scrollWidth,sh:n.scrollHeight,sx:n.scrollLeft,sy:n.scrollTop};};
  await applyDocumentPageLayout({action:'group',file:cards[0].file,path:cards[0].path,cards,layout:{clay:2,w1:5000,h1:5000,w2:10000,h2:10000}});
  data=await inspectXmlDocument();const groups=TnsDocumentPreviewNavigation.groups(data.items);groups.widgets=documentWidgetPreviewPages(data.items,groups);
  const preview=await openDocumentAppPreview(groups,'widgets',0,{});await pause(200);
  const pane=preview.backdrop.querySelector('[data-app-kind=calculators]'),entry=pane.querySelector('[data-expression]');
  must(entry,'Embedded Calculator entry missing');
  let ancestorScrollRequests=0;pane.querySelector('[data-calculator-entry]').scrollIntoView=()=>{ancestorScrollRequests++;};
  const info=()=>({pane:rect(pane),center:rect(pane.querySelector('.prgm-preview-center')),shell:rect(pane.querySelector('.prgm-preview-screen-shell')),history:rect(pane.querySelector('.prgm-preview-history')),form:rect(pane.querySelector('[data-calculator-entry]')),frame:rect(preview.backdrop.querySelector('.preview-window-frame')),body:rect(preview.backdrop.querySelector('.preview-window-body'))});
  cases.push({name:'initial',...info()});
  for(let i=0;i<12;i++){
    entry.focus({preventScroll:true});entry.value=`${i}+5`;entry.dispatchEvent(new Event('input',{bubbles:true}));entry.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    await wait(()=>pane.querySelectorAll('[data-calculator-row]').length===i+1,'embedded calculation '+i);await pause(25);
    must(pane.querySelectorAll('.prgm-calculator-answer')[i].textContent===String(i+5),'Wrong grouped Calculator result '+i);
    cases.push({name:'result-'+i,...info()});
  }
  const toggle=preview.backdrop.querySelector('[data-preview-window-zoom]');toggle.click();await pause(150);cases.push({name:'zoom',...info()});
  console.log('QA calculations and zoom');
  toggle.click();await pause(150);cases.push({name:'normal',...info()});
  const expand=preview.backdrop.querySelector('[data-preview-window-expand]');expand.click();await pause(150);cases.push({name:'expanded',...info()});
  must(toggle.disabled,'Magnifier should be disabled in expanded view');expand.click();await pause(150);
  console.log('QA expanded');
  preview.backdrop.querySelector('[data-widget-close]').click();await wait(()=>!preview.backdrop.isConnected,'close horizontal layout');
  console.log('QA closed horizontal');
  data=await inspectXmlDocument();cards=documentLayoutCards(data);await applyDocumentPageLayout({action:'layout',file:cards[0].file,path:cards[0].path,cards:[cards[0]],layout:{clay:1,w1:3500,h1:5000,w2:10000,h2:10000}});
  console.log('QA columns arranged');
  data=await inspectXmlDocument();const columnGroups=TnsDocumentPreviewNavigation.groups(data.items);columnGroups.widgets=documentWidgetPreviewPages(data.items,columnGroups);
  const columnPreview=await openDocumentAppPreview(columnGroups,'widgets',0,{});await pause(150);
  const columnPane=columnPreview.backdrop.querySelector('[data-app-kind=calculators]'),columnEntry=columnPane.querySelector('[data-expression]'),columnHistory=columnPane.querySelector('.prgm-preview-history');
  columnEntry.value='(123+456)/3';columnEntry.dispatchEvent(new Event('input',{bubbles:true}));columnEntry.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await wait(()=>[...columnPane.querySelectorAll('.prgm-calculator-answer')].at(-1)?.textContent==='193','column Calculator result');
  const columnMetrics=()=>({pane:rect(columnPane),shell:rect(columnPane.querySelector('.prgm-preview-screen-shell')),frame:rect(columnPreview.backdrop.querySelector('.preview-window-frame')),body:rect(columnPreview.backdrop.querySelector('.preview-window-body')),history:rect(columnHistory)});
  cases.push({name:'columns',...columnMetrics()});
  const divider=columnPreview.backdrop.querySelector('.compound-divider-x');for(let i=0;i<8;i++)divider.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));await pause(120);cases.push({name:'resized-columns',...columnMetrics()});
  must(cases.every(row=>Math.abs(row.shell.w-row.pane.w)<3&&row.pane.sx===0&&row.pane.sy===0&&row.frame.sx===0&&row.frame.sy===0),'Calculator display shrank or shifted its grouped page');
  must(!ancestorScrollRequests,'Calculator attempted to scroll an ancestor instead of its history');
  return {ok:true,offline:true,realCalculations:13,fullPaneWidth:true,localHistoryScroll:true,stableZoomAndExpanded:true,resizableColumns:true,cases};
}
