/* Electron browser regression: Notes input/result and output-only styles and native XML survival.
   Optional argument: directory containing private caseN-ProblemN.xml fixtures. */
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.TNS_SMOKE_WEB_ROOT||path.join(__dirname,'..'));
const report=process.env.TNS_SMOKE_REPORT||path.join(root,'release/qa/widgets-v41/notes-browser.json');
const files=process.argv[2]?fs.readdirSync(process.argv[2]).filter(name=>/^case\d+-Problem\d+\.xml$/.test(name)).map(name=>({name,xml:fs.readFileSync(path.join(process.argv[2],name),'utf8')})):[];
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1000,height:800,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 try {
  await win.loadURL('data:text/html,<html><body></body></html>');
  await win.webContents.insertCSS(fs.readFileSync(path.join(root,'web/notepad-rich-view.css'),'utf8'));
  await win.webContents.executeJavaScript('window.showNotepadModal=()=>{};'+fs.readFileSync(path.join(root,'web/ti-math-typeset.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'web/notepad-rich-view.js'),'utf8'));
  const result=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(files)})`);
  await win.webContents.executeJavaScript('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))');
  fs.mkdirSync(path.dirname(report),{recursive:true});
  fs.writeFileSync(report,JSON.stringify(result,null,2));
  fs.writeFileSync(report+'.png',(await win.webContents.capturePage()).toPNG());
  console.log(JSON.stringify(result));app.exit(0);
 }catch(error){console.error(error.stack);app.exit(1);}finally{win.destroy();}
});
function check(files){
 const must=(condition,message)=>{if(!condition)throw Error(message);};
 const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const rich='<r2dtotree><formatManager><formatEntry entryID="0" tc="1" fs="11" fn0="TI-Nspire Sans"/><formatEntry entryID="1" tc="254" fs="11"/><formatEntry entryID="2" tc="254" fs="11" fst="1"/><formatEntry entryID="3" tc="32769" fs="11"/></formatManager><node name="1doc"><node name="1para"><node name="1rtline"><leaf name="1keyword" tc0="129">Heading</leaf><node name="0el"><mbox><attr iomode="1"/><out><full>−5</full></out></mbox><node name="0el" id0="1"><leaf name="0text" np="2" id0="2" pp0="4" id1="1" pp1="8">xmin:=−5</leaf></node><node name="0el" id0="3"><leaf name="0text" id0="3">−5</leaf></node></node></node></node></node></r2dtotree>';
 const raw='<wdgt xmlns="urn:TI.Problem" xmlns:np="urn:TI.Notepad" type="TI.Notepad"><np:fmtxt>'+escape(rich)+'</np:fmtxt></wdgt>';
 const host=document.body.appendChild(document.createElement('div'));
 const mounted=TiNotepadRichView.mount(host,{raw_xml:raw});
 must(getComputedStyle(host.querySelector('[data-ti-keyword]')).fontWeight==='700','Native keyword must retain bold');
 must(getComputedStyle(host.querySelector('.ti-note-math-input')).color==='rgb(0, 0, 254)','Native math input lost blue');
 must(getComputedStyle(host.querySelector('.ti-note-math-output')).color==='rgb(0, 128, 1)','Native math output lost green');
 must(host.querySelector('.ti-note-math-result-arrow')?.textContent==='▸','Math result separator missing');
 must(getComputedStyle(Array.from(host.querySelectorAll('.ti-note-math-input mi')).find(mi=>mi.textContent==='xmin')).fontWeight==='700','Native variable-name emphasis lost');
 must(host.querySelectorAll('.ti-note-math-output').length===1,'Native formatted answer duplicated');
 const roundtrip=TiNotepadRichView.buildRichTextFromParagraphRuns(mounted.model,TiNotepadRichView.extractEditableModel(host).paragraphs);
 must(roundtrip.includes('name="1keyword"'),'Saving lost keyword style');
 must(roundtrip.includes(mounted.model.paragraphs[0].lines[0].runs.find(run=>run.nativeXml).nativeXml),'Saving changed authoritative native mathbox');
 host.remove();
 const onlyRich='<r2dtotree><node name="1doc"><node name="1para"><node name="1rtline"><leaf name="1word" tc0="254">cos(a)=</leaf><node name="0el" tc="0"><mbox><attr iomode="2"/><out><full>√(5)/4-1/4</full></out></mbox><node name="0el" tc="254"><leaf name="0text">cos(a)</leaf></node><node name="0el" tc="32769"><node name="0fraction"><node name="0el"><leaf name="0text">2*π</leaf></node><node name="0el"><leaf name="0text">5</leaf></node></node></node></node></node></node></node></r2dtotree>';
 const onlyHost=document.body.appendChild(document.createElement('div'));
 const onlyView=TiNotepadRichView.mount(onlyHost,{raw_xml:'<wdgt xmlns:np="urn:TI.Notepad" type="TI.Notepad"><np:fmtxt>'+escape(onlyRich)+'</np:fmtxt></wdgt>'});
 must(getComputedStyle(onlyHost.querySelector('.ti-note-math-output')).color==='rgb(0, 0, 0)','Output-only math must inherit its enclosing black Notes style');
 must(getComputedStyle(onlyHost.querySelector('.ti-note-run')).color==='rgb(0, 0, 254)','Output-only prose must retain its native blue style');
 must(Math.abs(parseFloat(getComputedStyle(onlyHost.querySelector('.ti-note-run')).fontSize)-44/3)<0.01,'Legacy Notes without fs must inherit the native 11 pt default');
 must(!onlyHost.querySelector('.ti-note-math-input,.ti-note-math-result-arrow'),'Output-only Notes must not display evaluator input or arrow');
 must(onlyHost.querySelector('math')?.getAttribute('displaystyle')==='true','Notes fractions need full-sized numerator and denominator');
 must(Array.from(onlyHost.querySelectorAll('mo')).some(op=>op.textContent==='·'),'Notes multiplication must use a centered dot');
 const onlySaved=TiNotepadRichView.buildRichTextFromParagraphRuns(onlyView.model,TiNotepadRichView.extractEditableModel(onlyHost).paragraphs);
 must(onlySaved.includes(onlyView.model.paragraphs[0].lines[0].runs.find(run=>run.nativeXml).nativeXml),'Output-only presentation changed stored native XML');
 onlyView.destroy();onlyHost.remove();
 const sizeRich='<r2dtotree><formatManager><formatEntry entryID="0" fs="8"/></formatManager><node name="1doc"><node name="1para"><node name="1rtline"><leaf name="1word" fs0="9">Explicit nine</leaf><leaf name="1word" id0="0">Table eight</leaf></node></node></node></r2dtotree>';
 const sizeModel=TiNotepadRichView.parseNotepadRichText('<wdgt xmlns:np="urn:TI.Notepad" type="TI.Notepad"><np:fmtxt>'+escape(sizeRich)+'</np:fmtxt></wdgt>');
 must(sizeModel.paragraphs[0].lines[0].runs[0].style.fontSize===9,'Explicit native fs9 must not be enlarged');
 must(sizeModel.paragraphs[0].lines[0].runs[1].style.fontSize===8,'Format table fs8 must not be enlarged');
 const reports=[];
 for(const file of files){
  const doc=new DOMParser().parseFromString(file.xml,'application/xml');
  for(const widget of doc.querySelectorAll('wdgt[type="TI.Notepad"]')){
   const raw=new XMLSerializer().serializeToString(widget),card=document.body.appendChild(document.createElement('div'));
   card.style.cssText='display:inline-block;vertical-align:top;width:320px;height:240px;overflow:auto;margin:8px;border:1px solid #bbb;background:white;';
   const view=TiNotepadRichView.mount(card,{raw_xml:raw}),runs=view.model?.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.runs))||[];
   if(!['case3-Problem1.xml'].includes(file.name)||!runs.some(run=>run.nativeXml))card.style.display='none';
   const native=runs.filter(run=>run.nativeXml),saved=TiNotepadRichView.buildRichTextFromParagraphRuns(view.model,TiNotepadRichView.extractEditableModel(card).paragraphs);
   for(const run of native)must(saved.includes(run.nativeXml),file.name+': native mathbox changed after save');
   const outputs=native.filter(run=>run.output).length;
   must(card.querySelectorAll('.ti-note-math-output').length===outputs,file.name+': cached answers missing');
   const outputOnly=native.filter(run=>run.outputOnly&&run.output);
   const outputElements=Array.from(card.querySelectorAll('.ti-note-math[data-ti-output-only="true"] .ti-note-math-output'));
   must(outputElements.length===outputOnly.length,file.name+': output-only answer count changed');
   for(let i=0;i<outputOnly.length;i++){
    const expected=document.createElement('span');expected.style.color=outputOnly[i].outputStyle.color;document.body.appendChild(expected);
    must(getComputedStyle(outputElements[i]).color===getComputedStyle(expected).color,file.name+': output-only result inherited evaluator color');expected.remove();
   }
   must(Array.from(card.querySelectorAll('.ti-note-math math')).every(math=>math.getAttribute('displaystyle')==='true'),file.name+': Notes fraction sizing changed');
   reports.push({file:file.name,native:native.length,outputs,outputOnly:outputOnly.length,keywords:card.querySelectorAll('[data-ti-keyword]').length});if(card.style.display==='none')view.destroy();
  }
 }
 mounted.destroy();return{ok:true,styles:{keywordBold:true,inputBlue:true,variableBold:true,resultGreen:true,outputOnlyInherits:true,fullSizeFractions:true,centeredMultiplication:true},roundtrip:true,fixtures:reports};
}
