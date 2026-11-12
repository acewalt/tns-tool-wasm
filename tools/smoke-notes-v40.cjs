/* Electron browser regression: Notes input/result styles and native XML survival.
   Optional argument: directory containing private caseN-ProblemN.xml fixtures. */
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=process.argv[2]?fs.readdirSync(process.argv[2]).filter(name=>/^case\d+-Problem\d+\.xml$/.test(name)).map(name=>({name,xml:fs.readFileSync(path.join(process.argv[2],name),'utf8')})):[];
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1000,height:800,webPreferences:{sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 try {
  await win.loadURL('data:text/html,<html><body></body></html>');
  await win.webContents.insertCSS(fs.readFileSync(path.join(root,'web/notepad-rich-view.css'),'utf8'));
  await win.webContents.executeJavaScript('window.showNotepadModal=()=>{};'+fs.readFileSync(path.join(root,'web/ti-math-typeset.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'web/notepad-rich-view.js'),'utf8'));
  const result=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(files)})`);
  await win.webContents.executeJavaScript('document.fonts.ready.then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))');
  const dir=path.join(root,'release/qa/widgets-v40');fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'notes-browser.json'),JSON.stringify(result,null,2));
  fs.writeFileSync(path.join(dir,'notes-browser.png'),(await win.webContents.capturePage()).toPNG());
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
 const reports=[];
 for(const file of files){
  const doc=new DOMParser().parseFromString(file.xml,'application/xml');
  for(const widget of doc.querySelectorAll('wdgt[type="TI.Notepad"]')){
   const raw=new XMLSerializer().serializeToString(widget),card=document.body.appendChild(document.createElement('div'));
   card.style.cssText='display:inline-block;vertical-align:top;width:320px;height:240px;overflow:auto;margin:8px;border:1px solid #bbb;background:white;';
   const view=TiNotepadRichView.mount(card,{raw_xml:raw}),runs=view.model?.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.runs))||[];
   if(!['case0-Problem2.xml','case2-Problem1.xml'].includes(file.name)||!runs.some(run=>run.nativeXml))card.style.display='none';
   const native=runs.filter(run=>run.nativeXml),saved=TiNotepadRichView.buildRichTextFromParagraphRuns(view.model,TiNotepadRichView.extractEditableModel(card).paragraphs);
   for(const run of native)must(saved.includes(run.nativeXml),file.name+': native mathbox changed after save');
   const outputs=native.filter(run=>run.output).length;
   must(card.querySelectorAll('.ti-note-math-output').length===outputs,file.name+': cached answers missing');
   reports.push({file:file.name,native:native.length,outputs,keywords:card.querySelectorAll('[data-ti-keyword]').length});if(card.style.display==='none')view.destroy();
  }
 }
 mounted.destroy();return{ok:true,styles:{keywordBold:true,inputBlue:true,variableBold:true,resultGreen:true},roundtrip:true,fixtures:reports};
}
