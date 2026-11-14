/* Native Notes template insertion/caret/roundtrip regression. Run with Electron.
   Optional argument: directory with private caseN-ProblemN.xml fixtures. */
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const reportPath=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v42/notes-templates.json');
const fixtures=process.argv[2]?fs.readdirSync(process.argv[2]).filter(name=>/^case\d+-Problem\d+\.xml$/.test(name)).map(name=>({name,xml:fs.readFileSync(path.join(process.argv[2],name),'utf8')})):[];
let win;
app.whenReady().then(async()=>{
 win=new BrowserWindow({show:false,width:1300,height:900,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await win.loadURL('data:text/html,<html lang="en" data-theme="dark"><head></head><body></body></html>');
 for(const name of ['ti-math-tools.css','notepad-rich-view.css'])await win.webContents.insertCSS(fs.readFileSync(path.join(root,'web',name),'utf8'));
 await win.webContents.insertCSS(':root{--lime:#a3ec25;--panel:#101827;--line:#33465d;--text:#e2ebf4;--muted:#adc0d4}body{font:14px Arial;background:#101827;color:var(--text)}button{background:#244361;color:white;border:0;border-radius:8px;padding:8px;cursor:pointer}.modal{padding:20px}.modal-top-actions{display:flex;justify-content:end;gap:8px}.green-tool-button{background:var(--lime);color:#203800}.note-calculator-shell{width:320px}.love-preview-calculator-bar{background:#30372f;color:white;height:26px;text-align:center}.ti-note-math-composer{max-width:360px}.ti-note-formatbar{max-width:660px}');
 const setup=`window.showNotepadModal=()=>{};window.closeModal=backdrop=>backdrop.remove();window.buildTiNotepadRichText=()=>'';window.savedNotes=[];
 window.saveNotepadWidgetToStage=async(item,text)=>{const doc=new DOMParser().parseFromString(item.raw_xml,'application/xml'),fmtxt=[...doc.getElementsByTagName('*')].find(n=>n.localName==='fmtxt');fmtxt.textContent=window.buildTiNotepadRichText(text);item.raw_xml=new XMLSerializer().serializeToString(doc);item.content=text;window.savedNotes.push(item.raw_xml);return item;};
 window.fetch=async()=>({ok:true,json:async()=>(${fs.readFileSync(path.join(root,'assets/math-tools/catalog-locales.json'),'utf8')})});`;
 await win.webContents.executeJavaScript(setup+'\nvoid 0;');
 for(const name of ['ti-math-typeset.js','ti-math-tools.js','notepad-rich-view.js','notepad-rich-save-fix.js'])await win.webContents.executeJavaScript(fs.readFileSync(path.join(root,'web',name),'utf8')+'\nvoid 0;');
 const result=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(fixtures)})`);
 await win.webContents.executeJavaScript('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))');
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(result,null,2));
 fs.writeFileSync(reportPath+'.png',(await win.webContents.capturePage()).toPNG());
 console.log(JSON.stringify(result));win.destroy();app.exit(0);
}).catch(async error=>{
 fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify({ok:false,error:error.stack||String(error)},null,2));
 if(win&&!win.isDestroyed())fs.writeFileSync(reportPath+'.failure.png',(await win.webContents.capturePage()).toPNG());
 console.error(error);win?.destroy();app.exit(1);
});
async function check(fixtures){
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),must=(value,message)=>{if(!value)throw Error(message);};
 const wait=async(fn,label)=>{for(let i=0;i<300;i++){if(fn())return;await pause(10);}throw Error('Timeout: '+label);};
 const parse=source=>new DOMParser().parseFromString(source,'application/xml'),serialize=node=>new XMLSerializer().serializeToString(node);
 const esc=source=>source.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const cached='<node name="0el" flags="8" tc="0"><mbox><attr iomode="2" active="true"/><out><full>√(5)/4-1/4</full><err>0</err></out></mbox><node name="0el" tc="254"><leaf name="0text">cos(a)</leaf></node><node name="0el" tc="32769"><leaf name="0text">√(5)/4-1/4</leaf></node></node>';
 const rich='<r2dtotree><node name="1doc"><node name="1para"><node name="1rtline"><leaf name="1word" fs0="13" fst0="1" tc0="254">ALPHA</leaf></node></node><node name="1para"><node name="1rtline"><leaf name="1word" fs0="10" tc0="32768">BETA</leaf>'+cached+'</node></node></node></r2dtotree>';
 const item={file:'Problem1.xml',path:'/prob/card/wdgt',raw_xml:'<wdgt xmlns:np="urn:TI.Notepad" type="TI.Notepad"><np:fmtxt>'+esc(rich)+'</np:fmtxt></wdgt>'};
 const native=TnsMathTools.templates.map(spec=>{
  const source=TnsMathTools.buildTemplate(spec.id),xml=TiNotepadRichView.buildMathExpressionXml(source),doc=parse(xml);
  must(!doc.querySelector('parsererror'),'Malformed native template XML: '+spec.id);
  must(doc.querySelector('mbox > attr[iomode="1"]'),'Native mathbox missing: '+spec.id);
  must(!doc.querySelector('out'),'New mathbox invented a cached answer: '+spec.id);
  must(TnsMathTypeset.parse(TiNotepadRichView.nativeMathSource(doc.documentElement)).valid,'Native source damaged: '+spec.id);
  return {id:spec.id,source,operators:[...doc.querySelectorAll('node')].map(n=>n.getAttribute('name'))};
 });
 must(native.find(x=>x.id==='fraction').operators.includes('0fraction'),'Fraction must use a native fraction tree');
 must(native.find(x=>x.id==='sqrt').operators.includes('0sqrt'),'Root must use a native root tree');
 must(native.find(x=>x.id==='matrixN').operators.includes('0matrix'),'Matrix must use a native cell tree');
 showNotepadModal(item);
 let view=document.querySelector('.ti-note-rich-view');
 const editor=()=>document.querySelector('.ti-note-rich-view');
 const caret=(node,offset,end=offset)=>{const range=document.createRange();range.setStart(node,offset);range.setEnd(node,end);view.focus();const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));};
 const choose=async id=>{
  const button=document.querySelector('#note-math-templates');
  button.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));button.click();
  await wait(()=>document.querySelector(`[data-template-id="${id}"]`),'template grid');
  document.querySelector(`[data-template-id="${id}"]`).click();
 };
 const submit=source=>{const field=document.querySelector('.ti-note-math-source');field.value=source;field.dispatchEvent(new Event('input',{bubbles:true}));field.closest('form').requestSubmit();};
 document.querySelector('#note-edit-view').click();
 const first=view.querySelector('.ti-note-run');caret(first.firstChild,2);
 await choose('fraction');
 must(view.contentEditable==='true'&&!document.querySelector('.ti-note-math-composer').hidden,'Template must open editable Notes composer');
 submit('((x+2)/(3))');
 const fraction=[...view.querySelectorAll('[data-ti-native]')].find(node=>node.dataset.tiSource.includes('x+2'));
 must(fraction&&fraction.previousSibling.textContent==='AL'&&fraction.nextSibling.textContent==='PHA','First template missed the live caret');
 must(getComputedStyle(fraction).fontWeight==='700'&&getComputedStyle(fraction).color==='rgb(0, 0, 254)','Insertion lost current text style');
 const beta=view.querySelectorAll('.ti-note-para')[1].querySelector('.ti-note-run');caret(beta.firstChild,1,3);
 await choose('matrixN');
 let dims=document.querySelector('.ti-math-dimensions');
 must(dims,'Matrix dimensions prompt missing');dims.elements.rows.value='2';dims.elements.columns.value='3';dims.requestSubmit();
 must(document.querySelector('.ti-note-math-source').value==='[[1,1,1][1,1,1]]','Matrix dimensions did not reach Notes composer');
 submit('[[2,3,4][5,6,7]]');
 const matrix=[...view.querySelectorAll('[data-ti-native]')].find(node=>node.dataset.tiSource==='[[2,3,4][5,6,7]]');
 must(matrix&&matrix.previousSibling.textContent==='B'&&matrix.nextSibling.textContent==='A','Second template reused an old caret or failed to replace selection');
 const after=document.createRange();after.setStartAfter(matrix);after.collapse(true);getSelection().removeAllRanges();getSelection().addRange(after);document.dispatchEvent(new Event('selectionchange'));
 await choose('systemN');dims=document.querySelector('.ti-math-dimensions');dims.elements.rows.value='4';dims.requestSubmit();
 must(document.querySelector('.ti-note-math-source').value==='system(1,1,1,1)','System dimensions did not reach Notes');
 submit('system(x=1,y=2,x+y=3,x-y=-1)');
 const original=fraction.dataset.tiNative;
 fraction.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
 const sourceField=document.querySelector('.ti-note-math-source');
 sourceField.value='((x+2)/(3)';sourceField.dispatchEvent(new Event('input',{bubbles:true}));
 must(document.querySelector('#note-math-insert').disabled,'Incomplete expression must not replace native math');
 must(fraction.dataset.tiNative===original,'Invalid edit changed the authoritative native XML');
 submit('((x+4)/(7))');
 must(!view.contains(fraction)&&view.querySelector('mfrac'),'Native formula is not editable or lost its 2D preview');
 const cachedRun=()=>[...view.querySelectorAll('[data-ti-native]')].find(node=>node.dataset.tiSource==='cos(a)');
 must(decodeURIComponent(cachedRun().dataset.tiNative)===serialize(parse(cached).documentElement),'Editing changed existing native cached answer');
 document.querySelector('#note-save').click();await wait(()=>savedNotes.length,'native Notes save');
 must(!parse(item.raw_xml).querySelector('parsererror'),'Saved Notes XML invalid');
 const savedModel=TiNotepadRichView.parseNotepadRichText(item.raw_xml);
 must(savedModel.richSource.includes('name="0matrix"'),'Save flattened matrix into prose');
 must(!savedModel.richSource.includes('<math')&&!savedModel.richSource.includes('ti-note'),'Save leaked visual HTML into native XML');
 must(savedModel.plainText.includes('AL((x+4)/(7))PHA')&&savedModel.plainText.includes('B[[2,3,4][5,6,7]]system('),'Saved expression/caret order changed');
 showNotepadModal(item);view=editor();
 must(view.querySelectorAll('[data-ti-native]').length===4,'Save/reopen lost Notes mathboxes');
 must(view.querySelectorAll('mfrac').length>=3&&view.querySelector('mtable'),'Save/reopen lost mathematical display');
 must(getComputedStyle(view.querySelector('.ti-note-run')).fontWeight==='700','Save/reopen changed author bold style');
 must(decodeURIComponent(cachedRun().dataset.tiNative)===serialize(parse(cached).documentElement),'Save/reopen changed author formula cache');
 // Insert directly from Faithful mode and ensure the saved selection belongs
 // to this newly opened editor, not a Range retained from an older modal.
 await choose('sqrt');submit('√(49)');
 must(view.contentEditable==='true'&&view.querySelector('[data-ti-source="√(49)"]'),'Faithful-mode insertion failed to enable editing');
 document.querySelector('#note-save').click();await wait(()=>savedNotes.length===2,'second native Notes save');
 let preserved=0;
 for(const file of fixtures){
  for(const widget of parse(file.xml).querySelectorAll('wdgt[type="TI.Notepad"]')){
   const model=TiNotepadRichView.parseNotepadRichText(serialize(widget));if(!model)continue;
   const host=document.body.appendChild(document.createElement('div'));TiNotepadRichView.renderRichModel(host,model);
   host.querySelector('.ti-note-line').append(document.createTextNode(' '));
   const saved=TiNotepadRichView.buildRichTextFromParagraphRuns(model,TiNotepadRichView.extractEditableModel(host).paragraphs);
   for(const run of model.paragraphs.flatMap(para=>para.lines.flatMap(line=>line.runs)).filter(run=>run.nativeXml)){must(saved.includes(run.nativeXml),file.name+': author formula/cache changed');preserved++;}
   host.remove();
  }
 }
 showNotepadModal(item);
 return {ok:true,templates:native.length,caret:{firstInsertion:true,movedCaret:true,replacedSelection:true},dimensions:{matrix:[2,3],system:4},editableFormula:true,invalidEditRetainsXml:true,saveReopen:true,authorStyle:true,preservedNativeBoxes:preserved,newFormulaCache:false,savedRawXml:item.raw_xml};
}
