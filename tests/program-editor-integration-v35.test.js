import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const slice=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));

test('Program Editor source changes target the exact selected problem and preserve another draft',()=>{
  const a={index:0,program_name:'demo',file:'/stage/Problem1.xml',code:'old-a',parameters:'x',library_access:'LibPriv',document_type:'Prgm'},b={...a,index:1,file:'/stage/Problem2.xml',code:'old-b'};
  const box={value:'unsaved-a',disabled:false},context={xmlDoctor:{candidates:[a,b],current:a,outputFileName:'demo.tns',embedded:true},documentPreviewFileKey:x=>x,document:{querySelector:()=>box},tiMathEditor:{flush(){}},selectXmlProgram:index=>{context.xmlDoctor.current=context.xmlDoctor.candidates[index];box.value=context.xmlDoctor.current.code;},codeEditorAdapters:new Map([['#xml-code',{replaceRange:value=>{box.value=value;}}]])};
  vm.runInNewContext(slice('function documentProgramPreviewSource(','async function openDocumentAppPreview(')+'\nglobalThis.write=setDocumentProgramPreviewSource;globalThis.read=documentProgramPreviewSource;',context);
  const item={name:'TI.ProgramEditor',file:b.file,path:'/prob/card[1]/wdgt',detail:{name:'demo'}};
  context.write(item,'Prgm\nDisp x\nEndPrgm');
  assert.equal(a.code,'unsaved-a');assert.equal(context.xmlDoctor.current,b);assert.equal(b.code,box.value);assert.equal(context.xmlDoctor.embedded,false);
  assert.equal(context.read(item).library_access,'LibPriv');assert.equal(context.read(item).parameters,'x');
});

test('Basic opens the editor, while Run opens an idle Calculator with a separate draft',async()=>{
  const item={file:'/stage/Problem1.xml',detail:{name:'demo'},content_label:'ProgramEditor'},data={name:'demo',source:'Prgm\nDisp 7\nEndPrgm'},calls=[];
  const context={documentProgramPreviewSource:()=>data,setDocumentProgramPreviewSource:(_item,source)=>{data.source=source;},documentPreviewDocumentName:()=> 'demo',documentCalculatorContext:()=>({}),xmlDoctor:{},runXmlSyntax:async()=>({errors:0,warnings:0,diagnostics:[]}),embedXmlCode:async()=>{},Map,window:{TnsProgramEditorPreview:{open:(source,options)=>calls.push({kind:'editor',source,options})},TnsPrgmPreview:{open:(source,options)=>calls.push({kind:'calculator',source,options})}}};
  vm.runInNewContext(slice('async function openDocumentAppPreview(','function programEditorVisibilityWords(')+'\nglobalThis.openPreview=openDocumentAppPreview;',context);
  const groups={basic:[item]},session={drafts:new Map([['0:editor',{source:'stale editor page source',selectionStart:3}],['0:run',{input:'demo()',rows:[]}]])};
  await context.openPreview(groups,'basic',0,session);assert.equal(calls.at(-1).kind,'editor');assert.equal(calls.at(-1).options.draft.source,data.source);
  assert.equal(calls.at(-1).options.draft.selectionStart,3,'Keep the view caret while using the authoritative program draft');
  assert.equal((await calls.at(-1).options.onSyntax(data.source)).errors,0);
  await calls.at(-1).options.onRun(data,{expanded:true});assert.equal(calls.at(-1).kind,'calculator');assert.equal(calls.at(-1).options.initialInput,'demo()');assert.equal(calls.at(-1).options.expanded,true);
  assert.equal(calls.at(-1).options.autoStart,undefined);assert.equal(calls.at(-1).options.readSource().source,data.source);
});
