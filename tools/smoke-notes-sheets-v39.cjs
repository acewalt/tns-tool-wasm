/* Run with Electron. Optional first argument: a directory of extracted Problem
   XML files, kept outside version control. No user document is distributed. */
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),directory=process.argv[2];
const inputs=directory?fs.readdirSync(directory).filter(name=>/^case\d+-Problem\d+\.xml$/.test(name)).map(name=>({name,xml:fs.readFileSync(path.join(directory,name),'utf8')})):[];
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const appSource=read('web/app.js');
const helpers=appSource.slice(appSource.indexOf('function spreadsheetColumnName('),appSource.indexOf('async function parseXlsxFirstSheet('));
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1000,height:700,webPreferences:{sandbox:true,contextIsolation:true}});
 await win.loadURL('data:text/html,<html><body></body></html>');
 await win.webContents.executeJavaScript('window.showNotepadModal=()=>{};window.saveNotepadWidgetToStage=()=>{};window.buildTiNotepadRichText=()=>{};'+read('web/ti-math-typeset.js')+'\n'+read('web/notepad-rich-view.js')+'\n'+read('web/spreadsheet-tools.js')+'\n'+helpers);
 const result=await win.webContents.executeJavaScript(`(${check.toString()})(${JSON.stringify(inputs)})`);
 const out=path.join(root,'release/qa/widgets-v39/notes-sheets-browser.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 win.destroy();app.exit(0);
}).catch(error=>{console.error(error.stack);app.exit(1);});

async function check(inputs) {
 const must=(value,message)=>{if(!value)throw Error(message);};
 const escape=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const rich='<r2dtotree><node name="1doc"><node name="1para"><node name="1rtline"><leaf name="1word">cos(a)=</leaf><node name="0el"><mbox><attr iomode="2"/><out><full>√(5)/4-1/4</full></out></mbox><node name="0el"><leaf name="0text">meval(cos(a))</leaf></node></node></node></node></node></r2dtotree>';
 const xml='<wdgt xmlns="urn:TI.Problem" xmlns:np="urn:TI.Notepad" type="TI.Notepad"><np:fmtxt>'+escape(rich)+'</np:fmtxt></wdgt>';
 const host=document.body.appendChild(document.createElement('div'));let variables={a:1};
 const view=TiNotepadRichView.mount(host,{raw_xml:xml,file:'Problem1.xml'},{mathSession:{snapshot:()=>({variables}),expression:()=>0.5}});
 must(host.textContent.includes('cos(a)='),'Notes lost ordinary/keyword text');must(host.querySelector('mfrac'),'Native cached fraction is not MathML');must(!host.textContent.includes('meval'),'Output-only note must show its saved answer');
 const edited=TiNotepadRichView.extractEditableModel(host),roundtrip=TiNotepadRichView.buildRichTextFromParagraphRuns(view.model,edited.paragraphs);
 must(roundtrip.includes('<mbox>')&&roundtrip.includes('iomode="2"')&&roundtrip.includes('meval(cos(a))'),'Rich text save lost native mathbox/configuration');
 variables={a:2};window.dispatchEvent(new CustomEvent('tns-document-variables-change',{detail:{file:'Problem1.xml'}}));must(host.textContent.includes('0.5'),'Shared-problem variable refresh did not update note output');view.destroy();
 const reports=[];
 for(const input of inputs) {
   const doc=new DOMParser().parseFromString(input.xml,'application/xml');
   for(const widget of doc.querySelectorAll('wdgt')) {
    if(widget.getAttribute('type')!=='TI.Notepad')continue;
    const raw=new XMLSerializer().serializeToString(widget),model=TiNotepadRichView.parseNotepadRichText(raw);if(!model)continue;
    const output=document.createElement('div'),mounted=TiNotepadRichView.mount(output,{raw_xml:raw,file:input.name},{});
    const native=model.paragraphs.flatMap(p=>p.lines.flatMap(l=>l.runs)).filter(run=>run.kind==='native').length;
    must(output.querySelectorAll('.ti-note-math').length===native,input.name+': missing native runs');
    must(!output.innerHTML.includes('undefined'),input.name+': leaked undefined');
    reports.push({file:input.name,paragraphs:model.paragraphs.length,native,characters:output.textContent.length});mounted.destroy();
   }
 }
 const sheet=document.body.appendChild(document.createElement('div'));sheet.innerHTML='<div class="spreadsheet-grid" tabindex="0"></div><span class="spreadsheet-cell-name"></span><input class="spreadsheet-formula-value"><output class="spreadsheet-selection-info"></output><button data-sheet-tool="clear"></button><button data-sheet-tool="sum"></button>';
 const state={rows:20,cols:12,activeRow:0,activeCol:0,cells:{'0:0':{formula:'1',data:'1'},'0:1':{formula:'2',data:'2'},'1:0':{formula:'=native()',data:'√(5)/4-1/4'}},columnNames:['x'],columnWidths:[80]};
 const controller=TnsSpreadsheetTools.mount(sheet,state,{evaluate:()=> '3'}),grid=sheet.querySelector('.spreadsheet-grid');
 must(state.cells['1:0'].data==='√(5)/4-1/4','Opening sheet changed cached exact output');must(sheet.querySelector('.sheet-column-name').textContent==='x','Native column name missing');
 controller.select(0,0);controller.select(0,1,true);const clipboard=new DataTransfer();grid.dispatchEvent(new ClipboardEvent('copy',{bubbles:true,clipboardData:clipboard}));must(clipboard.getData('text/plain')==='1\t2','Range copy did not include both cells');
 controller.select(2,0);const paste=new DataTransfer();paste.setData('text/plain','4\t5\n6\t7');grid.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,clipboardData:paste}));must(state.cells['3:1'].data==='7','Rectangular paste failed');
 const formula=sheet.querySelector('.spreadsheet-formula-value');controller.select(0,0);formula.focus();formula.value='=A1+B1';formula.dispatchEvent(new Event('input',{bubbles:true}));controller.commit();must(state.cells['0:0'].formula==='=A1+B1','Formula bar failed to commit source');
 controller.select(5,1);formula.focus();formula.value='=sum()';formula.setSelectionRange(5,5);formula.dispatchEvent(new Event('input',{bubbles:true}));
 grid.querySelector('[data-row="0"][data-col="0"].sheet-cell').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
 grid.querySelector('[data-row="4"][data-col="0"].sheet-cell').dispatchEvent(new PointerEvent('pointerover',{bubbles:true}));
 window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));
 must(formula.value==='=sum(A1:A5)','Drag selecting a range did not insert a formula reference');
 must(state.activeRow===5&&state.activeCol===1,'Inserting formula references changed the destination cell');
 controller.commit();
 must(state.cells['5:1'].formula==='=sum(A1:A5)','Formula range did not commit');
 controller.select(2,0);controller.select(3,1,true);sheet.querySelector('[data-sheet-tool=clear]').click();must(!state.cells['2:0']&&!state.cells['3:1'],'Range clear failed');controller.destroy();
 return{ok:true,nativeNotes:reports,sheet:{copy:true,paste:true,formula:true,clear:true,cachedExact:true},mathboxes:{render:true,roundtrip:true,refresh:true}};
}
