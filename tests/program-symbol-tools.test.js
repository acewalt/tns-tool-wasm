import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const start=source.indexOf('function isTiBasicProgramCandidate('),end=source.indexOf('\nfunction insertXmlToolText(',start);
assert(start>=0&&end>start);
const box={disabled:false},context={xmlDoctor:{current:null},document:{querySelector:()=>box}};
vm.runInNewContext(source.slice(start,end)+'\nglobalThis.accepts=isTiBasicProgramCandidate;globalThis.selected=isTiProgramEditorSelected;',context);

test('stored TI program symbols expose source tools even without an editor widget',()=>{
  const sonar={kind:'symbol_value',document_type:'Prgm',is_program_editor:false,widget_type:null,code:'Prgm\nDefine draw()=Prgm\nDrawLine 0,0,1,1\nEndPrgm\ndraw()\nEndPrgm'};
  assert.equal(context.accepts(sonar),true);
  context.xmlDoctor.current=sonar;assert.equal(context.selected(),true);
  box.disabled=true;assert.equal(context.selected(),false);box.disabled=false;
});
test('real Func bodies qualify, graph expressions and non-BASIC widgets do not',()=>{
  for(const code of ['Func\nReturn 1\nEndFunc','Define LibPub f()=\nFunc\nReturn 1\nEndFunc'])assert.equal(context.accepts({kind:'symbol_value',document_type:'Func',code}),true);
  for(const candidate of [null,{kind:'symbol_value',document_type:'Func',code:'sin(x)'},{kind:'symbol_value',document_type:'Expr',code:'1'},{kind:'lua_script',code:'Prgm'},{widget_type:'TI.Scratchpad',code:'Prgm'}])assert.equal(context.accepts(candidate),false);
  for(const candidate of [{is_program_editor:true},{widget_type:'TI.ProgramEditor'},{kind:'program_editor_visual_tree'}])assert.equal(context.accepts(candidate),true);
});
test('preview of a stored symbol cannot accidentally open another ProgramEditor page',async()=>{
  const a=source.indexOf('async function openXmlPrgmPreview('),b=source.indexOf('\nfunction setXmlDoctorDocumentActionsEnabled(',a);
  const calls=[],ctx={tiMathEditor:null,documentCalculatorContext:()=>({}),window:{TnsPrgmPreview:{open:(data,options)=>calls.push({data,options})},TnsDocumentPreviewNavigation:{groups:()=>({basic:[{file:'/stage/Problem1.xml',detail:{name:'other'}}]})}},xmlDoctor:{current:{program_name:'sonar',file:'/stage/Problem1.xml',parameters:'x'},outputFileName:'Sonar.tns'},document:{querySelector:()=>({value:'Prgm\nDisp x\nEndPrgm'})},inspectXmlDocument:async()=>({items:[]}),documentPreviewFileKey:x=>x,openDocumentAppPreview:()=>{throw Error('Opened an unrelated program');}};
  vm.runInNewContext(source.slice(a,b)+'\nglobalThis.openPreview=openXmlPrgmPreview;',ctx);
  await ctx.openPreview();assert.equal(calls.length,1);assert.equal(calls[0].data.name,'sonar');assert.equal(calls[0].data.parameters,'x');assert.equal(calls[0].data.source,'Prgm\nDisp x\nEndPrgm');
});
