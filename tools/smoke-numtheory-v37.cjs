/* Actual user-supplied TNS integration; the input is not distributed with the
   repository. Usage: electron tools/smoke-numtheory-v37.cjs library.tns */
const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(process.env.TNS_SMOKE_DESKTOP_ROOT||path.join(root,'../portable-0.1.27/desktop'));
const vendor=path.resolve(process.env.TNS_SMOKE_VENDOR_ROOT||path.join(desktop,'vendor'));
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const reportPath=path.resolve(process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/numtheory-v37/browser.json'));
const input=process.env.TNS_NUMTHEORY_TNS||process.argv[2];
if(!input)throw Error('Pass the local numtheory.tns as the first argument.');
const bytes=fs.readFileSync(input).toString('base64');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'tns-numtheory-')));
app.commandLine.appendSwitch('disable-gpu');
let win,server;
app.whenReady().then(async()=>{
 server=makeServer(root,vendor);const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(request,done)=>done({cancel:!request.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin);win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true});
 const report=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(bytes)})`);
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));fs.writeFileSync(reportPath+'.png',(await win.webContents.capturePage()).toPNG());console.log(JSON.stringify(report));win.destroy();server.close();app.exit(0);
}).catch(async error=>{
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});let state;
 if(win&&!win.isDestroyed()){
  state=await win.webContents.executeJavaScript('({steps:window.__numtheorySteps,preview:window.TnsPrgmPreview?.getSnapshot?.(),rows:window.TnsPrgmPreview?.getRows?.(),log:document.querySelector("#xml-log")?.textContent.slice(-2000)})').catch(()=>null);
  fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());win.destroy();
 }
 fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:error.stack||String(error),state},null,2));console.error(error);server?.close();app.exit(1);
});

async function check(base64){
 const pause=ms=>new Promise(r=>setTimeout(r,ms)),must=(v,m)=>{if(!v)throw Error(m);};
 const wait=async(fn,label)=>{const end=Date.now()+60000;while(!fn()){if(Date.now()>end)throw Error('Timeout: '+label);await pause(25);}};
 window.__numtheorySteps=[];const mark=x=>window.__numtheorySteps.push(x);
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.TnsPrgmPreview&&window.TnsCalculatorHistory&&!document.querySelector('#startup-loader'),'offline startup');
 applyLanguage('es');
 const file=new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],'numtheory.tns');await openTnsInXmlDoctor(file);const inspected=await inspectXmlDocument();
 const items=inspected.items||xmlDoctor.previewItems,calculator=items.find(item=>item.type==='Widget'&&item.name==='TI.Scratchpad');must(calculator,'Calculator page missing');
 const candidates=xmlDoctor.candidates.filter(item=>['Prgm','Func'].includes(item.document_type));must(candidates.length>=40,'Missing stored callable definitions');
 const api=await openCalculatorInLovePreview(calculator);mark('opened');
 const initial=api.getRows();must(initial.length===6,'Saved calculator history row count differs');
 must(initial.filter(row=>row.intr).length===4,'Saved Disp transcripts were not imported');
 const normalized=value=>String(value||'').replace(/\s+/gu,' ').trim();
 const text=normalized(document.querySelector('.prgm-preview-history').textContent);must(text.includes('Es gibt 10 Primzahlen'),'Saved textual output missing');must(text.includes('2 ist ein Teiler von 10'),'Saved factorstep output missing');must(document.querySelector('.prgm-calculator-transcript mtable'),'Saved matrix not typeset');
 must(api.getSnapshot().status==='ready','Opening history executed a program');mark('history');
 const calls=[];
 for(const [entry,expectedText]of [
  ['numtheory\\primecount(100,150)','10'],
  ['numtheory\\primelist(100,150)','There are 10 primes'],
  ['numtheory\\factorstep(10)','2 is a divisor of 10'],
 ]){
  const before=api.getRows().length;await api.submit(entry);await wait(()=>api.getRows().length===before+1&&['ready','done','error','stopped'].includes(api.getSnapshot().status),entry);
  const state=api.getSnapshot(),row=api.getRows().at(-1);must(state.status!=='error'&&row.status!=='error',entry+': '+(state.error?.message||row.display));
  must(normalized(row.display).includes(expectedText)||row.output?.some(line=>normalized(line.text).includes(expectedText)),entry+' omitted expected result/output');
  calls.push({entry,status:state.status,display:row.display,output:row.output});mark(entry);
 }
 const factor=api.getRows().at(-1);must(factor.output.some(line=>line.values?.some(value=>value?.[0]?.[0]===10)||line.text.includes('[[10,2]')),'factorstep matrix missing');
 const save=await saveCalculatorWidgetToStage(calculator,api.getRows());must(save.saved_rows===9,'Saved appended history count differs');
 const imported=window.TnsCalculatorHistory.parseRows(save.raw_xml);must(imported.length===9&&imported[0].entry===initial[0].entry,'Saved rows changed');must(imported.filter(row=>row.intr).length>=4,'Saving dropped original rich output');
 const roundtrip=JSON.parse(await pyodide.runPythonAsync(`
import json,xml.etree.ElementTree as ET
from pathlib import Path
from tnstools import build_tns_from_xml,decode_tns_file
from calculator_history import extract_calculator_rows
build_tns_from_xml(Path("${xmlDoctor.stagePath}"),Path('/work/numtheory-v37.tns'))
decode_tns_file(Path('/work/numtheory-v37.tns'),Path('/work/numtheory-v37-roundtrip'))
root=ET.parse('/work/numtheory-v37-roundtrip/Problem1.xml').getroot()
widget=next(e for e in root.iter() if e.tag.rsplit('}',1)[-1]=='wdgt' and e.get('type')=='TI.Scratchpad')
rows=extract_calculator_rows(widget)
assert len(rows)==9
assert sum(bool(row.get('intr')) for row in rows)>=4
json.dumps({'rows':len(rows),'richTranscripts':sum(bool(row.get('intr')) for row in rows)})
`));mark('export-roundtrip');
 return {ok:true,programs:candidates.length,functions:candidates.filter(c=>c.document_type==='Func').length,programRoutines:candidates.filter(c=>c.document_type==='Prgm').length,initialRows:initial.length,richSavedOutputs:initial.filter(row=>row.intr).length,calls,roundtrip};
}
