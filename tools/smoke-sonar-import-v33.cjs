const {app,BrowserWindow,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const desktop=path.resolve(root,'../portable-0.1.27/desktop');
const {makeServer,listen}=require(path.join(desktop,'server.cjs'));
const inputPath=process.env.TNS_IMPORT_FIXTURE||process.argv[2];
if(!inputPath)throw Error('Pass a TNS fixture path or TNS_IMPORT_FIXTURE.');
const bytes=fs.readFileSync(inputPath),name=path.basename(inputPath);
const reportPath=path.resolve(process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/sonar-import-v33.json'));
let win,server;
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 server=makeServer(root,path.join(desktop,'vendor'));const origin=await listen(server);
 session.defaultSession.webRequest.onBeforeRequest({urls:['*://*/*']},(details,done)=>done({cancel:!details.url.startsWith(origin)}));
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL(origin);
 const report=await win.webContents.executeJavaScript(`(${run.toString()})(${JSON.stringify(bytes.toString('base64'))},${JSON.stringify(name)})`);
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2));
 const sourcePath=path.join(path.dirname(reportPath),'sonar-import-v33.tib');fs.writeFileSync(sourcePath,report.source||'');
 for(const [file,content]of Object.entries(report.xml||{}))fs.writeFileSync(path.join(path.dirname(reportPath),'sonar-import-v33.'+path.basename(file)),content);
 const {code,storedFingerprint,...current}=report.current||{};
 console.log(JSON.stringify({ok:report.ok,current,previewVisible:report.previewVisible,programMenu:report.programMenu,previewOpened:report.previewOpened,menuCategories:report.menuCategories,sourcePath,summary:report.inspection?.summary,visibility:report.visibility}));
 await win.webContents.capturePage().then(image=>fs.writeFileSync(reportPath+'.png',image.toPNG()));
 win.destroy();server.close();app.exit(report.ok?0:1);
}).catch(async error=>{console.error(error);if(win&&!win.isDestroyed())console.error(JSON.stringify(await win.webContents.executeJavaScript('({fingerprints:window.__visibilityFingerprints,log:document.querySelector("#xml-log")?.textContent?.slice(-1400)})').catch(()=>null)));win?.destroy();server?.close();app.exit(1);});
async function run(base64,name){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const wait=async(fn,label)=>{const end=Date.now()+45000;while(!fn()){if(Date.now()>end)throw Error('Timeout '+label);await pause(30);}};
 await wait(()=>typeof pyodide!=='undefined'&&pyodide&&window.__tnsXmlProgramEditorFix&&!document.querySelector('#startup-loader')&&!document.querySelector('#xml-toggle-btn').disabled,'runtime');
 applyLanguage('en');if(document.querySelector('#xml-doctor-panel').classList.contains('collapsed'))document.querySelector('#xml-toggle-btn').click();
 await openTnsInXmlDoctor(new File([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))],name));await pause(300);
 const inspection=await inspectXmlDocument();
 const xml=JSON.parse(await pyodide.runPythonAsync(`import json\nfrom pathlib import Path\njson.dumps({str(p):p.read_text() for p in Path("${xmlDoctor.sourcePath}").rglob("*.xml")})`));
 const source=document.querySelector('#xml-code').value;
 const preview=document.querySelector('#xml-prgm-preview-btn'),previewVisible=!preview.hidden&&!preview.disabled;
 const programMenu=[...document.querySelectorAll('#xml-edit-menu button')].find(button=>button.textContent.includes('Program Editor'));
 const menuEnabled=!!programMenu&&!programMenu.hidden&&!programMenu.disabled;
 document.querySelector('#xml-edit-menu > .menu-trigger').click();programMenu?.click();
 await wait(()=>document.querySelectorAll('.program-editor-tools-panel [data-program-menu-id]').length===9,'Program Editor categories');
 const menuCategories=document.querySelectorAll('.program-editor-tools-panel [data-program-menu-id]').length;
 document.querySelector('.program-editor-dismiss')?.click();document.querySelector('#xml-edit-menu > .menu-trigger').click();
 preview.click();await wait(()=>document.querySelector('.prgm-preview-modal'),'Prgm Preview open');
 const previewSnapshot=window.TnsPrgmPreview.getSnapshot(),previewOpened=previewSnapshot?.name==='sonar';
 window.TnsPrgmPreview.close();
 await openDocumentInspector();
 const fp=()=>{const c=xmlDoctor.current,old=JSON.parse(c.storedFingerprint),now=[c.program_name,c.document_type,c.library_access,c.parameters,document.querySelector('#xml-code').value];return old.map((v,i)=>({i,equal:v===now[i],oldLength:String(v).length,newLength:String(now[i]).length}));};
 window.__visibilityFingerprints=[fp()];
 let eye=document.querySelector('.program-editor-visibility');if(!eye||eye.dataset.visible!=='false')throw Error('Stored program has no hidden-editor eye');
 eye.click();await wait(()=>document.querySelector('.program-editor-visibility')?.dataset.visible==='true','show editor');
 const shown=await inspectXmlDocument();if(shown.items.filter(i=>i.content_label==='ProgramEditor').length!==1)throw Error('Editor was not restored');
 window.__visibilityFingerprints.push(fp());
 document.querySelector('.program-editor-visibility').click();await wait(()=>document.querySelector('.program-editor-visibility')?.dataset.visible==='false','hide editor');
 const hidden=await inspectXmlDocument();if(hidden.items.some(i=>i.content_label==='ProgramEditor')||hidden.summary.widgets!==inspection.summary.widgets)throw Error('Hiding the editor changed other pages');
 const roundtrip=JSON.parse(await pyodide.runPythonAsync(`
import json,xml.etree.ElementTree as ET
from pathlib import Path
from tnstools import build_tns_from_xml,decode_tns_file
from xml_scanner import local_name
def stored(root):
    return [ET.tostring(e,encoding='unicode') for sym in root if local_name(sym.tag)=='sym' for e in sym if local_name(e.tag)=='e']
before=ET.parse(Path("${xmlDoctor.sourcePath}")/'Problem1.xml').getroot()
after=ET.parse(Path("${xmlDoctor.stagePath}")/'Problem1.xml').getroot()
left,right=stored(before)[0],stored(after)[0]
first=next((i for i,(a,b) in enumerate(zip(left,right)) if a!=b),min(len(left),len(right)))
assert left==right,repr((first,left[max(0,first-20):first+40],right[max(0,first-20):first+40],len(left),len(right)))
build_tns_from_xml(Path("${xmlDoctor.stagePath}"),Path('/work/sonar-hidden-roundtrip.tns'))
decode_tns_file(Path('/work/sonar-hidden-roundtrip.tns'),Path('/work/sonar-hidden-roundtrip'))
rebuilt=ET.parse(Path('/work/sonar-hidden-roundtrip/Problem1.xml')).getroot()
assert stored(before)==stored(rebuilt),'Saving hidden editor changed executable symbol'
types=[w.attrib.get('type') for w in rebuilt.iter() if local_name(w.tag)=='wdgt']
assert types==['TI.Scratchpad'],types
json.dumps({'ok':True,'storedProgramUnchanged':True,'roundtripTns':True,'widgets':types})
`));
 if(document.querySelector('#xml-prgm-preview-btn').hidden)throw Error('Hiding the page disabled browser preview');
 const calculator=hidden.items.find(item=>item.content_label==='Scratchpad');document.querySelector('.inspector-modal')?.closest('.modal-backdrop')?.remove();await openCalculatorInLovePreview(calculator);if(window.TnsPrgmPreview.getSnapshot().executed!==0)throw Error('Calculator autostarted');const field=document.querySelector('[data-expression]');field.value='sonar()';field.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));await wait(()=>window.TnsPrgmPreview.getSnapshot().keyPolling,'Sonar from Calculator');if(!window.TnsPrgmPreview.getSnapshot().graphics.active)throw Error('Sonar graphic overlay missing');window.TnsPrgmPreview.close();
 return {calculatorSonar:true,ok:previewVisible&&menuEnabled&&menuCategories===9&&previewOpened&&roundtrip.ok,current:xmlDoctor.current,candidates:xmlDoctor.candidates,source,previewVisible,programMenu:menuEnabled,previewOpened,menuCategories,previewSnapshot,inspection,xml,visibility:roundtrip};
}
