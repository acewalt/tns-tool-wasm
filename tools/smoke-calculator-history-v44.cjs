/* Offline TI.Scratchpad save/reopen, layout and native TNS roundtrip. */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v44/calculator-history.json');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-calc-history-v44-')));
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
  const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(20);}};
  await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsPrgmPreview&&!document.querySelector('#startup-loader'),'offline startup');applyLanguage('en');
  const blank=await(await fetch('./templates/blank_tns_xml/Problem1.xml')).text();
  await loadXmlDoctorFiles([new File([blank],'Problem1.xml')],'file');
  await addCalculatorWidgetToStage();
  const groupsNow=async()=>{const data=await inspectXmlDocument(),groups=TnsDocumentPreviewNavigation.groups(data.items);groups.widgets=documentWidgetPreviewPages(data.items,groups);return groups;};
  let groups=await groupsNow(),inspectorGroups=groups,preview=await openDocumentAppPreview(groups,'calculators',0,{});
  await preview.submit('2+3');must(preview.getRows().at(-1)?.display==='5','Calculation failed');
  const save=document.querySelector('[data-save-calculator]');must(save,'Standalone Save missing');save.click();
  await wait(()=>document.querySelector('[data-status]')?.textContent==='Saved','standalone save');
  preview.close();await pause(200);groups=await groupsNow();
  must(groups.calculators[0].raw_xml.includes('2+3'),'Save did not reach staged XML');
  preview=await openDocumentAppPreview(inspectorGroups,'calculators',0,{});must(preview.getRows().length===1&&preview.getRows()[0].display==='5','Same Inspector snapshot reset saved history');
  await preview.submit('6*7');
  document.querySelector('[data-save-calculator]').click();await wait(()=>document.querySelector('[data-status]')?.textContent==='Saved','second standalone save');
  preview.close();await pause(200);groups=await groupsNow();preview=await openDocumentAppPreview(groups,'calculators',0,{});
  must(preview.getRows().length===2&&preview.getRows().at(-1).display==='42','Repeated save/reopen reset history');
  await preview.submit('10+1');preview.close();await pause(200);groups=await groupsNow();preview=await openDocumentAppPreview(groups,'calculators',0,{});
  must(preview.getRows().length===3&&preview.getRows().at(-1).display==='11','Closing and reopening without explicit Save discarded in-memory history');
  // Layout preparation commits live history before changing the widget path.
  const layout=await openDocumentPageLayout(groups.calculators[0]);layout.close();
  preview.close();await pause(200);await addCalculatorWidgetToStage();
  let data=await inspectXmlDocument(),cards=documentLayoutCards(data).filter(card=>card.apps.some(app=>app.name==='TI.Scratchpad'));
  must(cards.length===2,'Expected two Calculator pages');
  await applyDocumentPageLayout({action:'group',file:cards[0].file,path:cards[0].path,cards,layout:{clay:1,w1:5000,h1:10000,w2:10000,h2:10000}});
  groups=await groupsNow();const grouped=await openDocumentAppPreview(groups,'widgets',groups.widgets.findIndex(page=>page.previewKind==='compound'),{});
  const pane=grouped.backdrop.querySelector('[data-app-kind=calculators]'),entry=pane.querySelector('[data-expression]');
  must(pane.querySelector('[data-previous-runs]').textContent.includes('11'),'Grouping lost committed history');
  entry.value='12*12';entry.dispatchEvent(new Event('input',{bubbles:true}));entry.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  await wait(()=>pane.querySelector('[data-previous-runs]').textContent.includes('144'),'embedded Calculator result');
  grouped.backdrop.querySelector('[data-compound-save]').click();await wait(()=>grouped.backdrop.querySelector('[data-compound-status]').textContent==='Layout saved','compound save');
  grouped.backdrop.querySelector('[data-widget-close]').click();await pause(200);
  groups=await groupsNow();must(extractCalculatorRowsFromRawXml(groups.calculators[0].raw_xml).length===4,'Compound Save lost native history');must(extractCalculatorRowsFromRawXml(groups.calculators[1].raw_xml).length===0,'Compound Save changed another Calculator');
  data=await inspectXmlDocument();cards=documentLayoutCards(data).filter(card=>card.apps.filter(app=>app.name==='TI.Scratchpad').length===2);
  await applyDocumentPageLayout({action:'ungroup',file:cards[0].file,path:cards[0].path,cards:[cards[0]]});
  groups=await groupsNow();preview=await openDocumentAppPreview(groups,'calculators',0,{});
  must(preview.getRows().length===4&&preview.getRows().at(-1).display==='144','Ungrouping reset Calculator history');
  preview.close();await pause(200);
  pyodide.globals.set('qa_calc_file',groups.calculators[0].file);
  const native=await pyodide.runPythonAsync(`import pathlib, tnstools
_qa_calc_stage=pathlib.Path(qa_calc_file).parent
_qa_calc_out=pathlib.Path('/tmp/qa-calc-history-v44.tns')
tnstools.build_tns_from_xml(_qa_calc_stage,_qa_calc_out)
_qa_calc_dir=pathlib.Path('/tmp/qa-calc-history-v44-reopened')
_qa_calc_dir.mkdir(exist_ok=True)
tnstools.decode_tns_file(_qa_calc_out,_qa_calc_dir)
len(_qa_calc_out.read_bytes())`);
  const decoded=await pyodide.runPythonAsync("(_qa_calc_dir / pathlib.Path(qa_calc_file).name).read_text(encoding='utf-8')");
  await loadXmlDoctorFiles([new File([decoded],'Problem1.xml')],'file');groups=await groupsNow();preview=await openDocumentAppPreview(groups,'calculators',0,{});
  must(preview.getRows().length===4&&preview.getRows().at(-1).display==='144','Native TNS roundtrip reset Calculator history');
  document.querySelector('[data-clear-history]').click();must(preview.getRows().length===0,'Clear history failed');preview.close();await pause(200);
  groups=await groupsNow();preview=await openDocumentAppPreview(groups,'calculators',0,{});must(preview.getRows().length===0,'Reopening resurrected explicitly cleared history');
  document.querySelector('[data-save-calculator]').click();await wait(()=>document.querySelector('[data-status]')?.textContent==='Saved','clear history save');preview.close();await pause(200);
  groups=await groupsNow();must(extractCalculatorRowsFromRawXml(groups.calculators[0].raw_xml).length===0,'Saving cleared history retained native rows');
  return {ok:true,offline:true,standaloneSaveReopen:true,sameInspectorReopen:true,repeatedSave:true,closeReopenDraft:true,groupUngroup:true,compoundSave:true,independentCalculatorHistory:true,nativeTnsBytes:Number(native),nativeTnsRoundtrip:true,explicitClear:true};
}
