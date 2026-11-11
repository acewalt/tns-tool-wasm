import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createMathSession} from '../src/prgm/math-api.js';

const source=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
function context(){
  const file=name=>'/work/stage/'+name,editor={value:'Func\nReturn x+1\nEndFunc'};
  const state={current:null,previewFile:file('Problem2.xml'),candidates:[
    {program_name:'libf',document_type:'Func',code:'Func\nReturn x\nEndFunc',parameters:'x',library_access:'LibPub',file:file('Problem1.xml'),path:'/prob/sym/e[1]/v'},
    {program_name:'helper',document_type:'Func',code:'Func\nReturn x\nEndFunc',parameters:'x',library_access:'LibPriv',file:file('Problem1.xml'),path:'/prob/sym/e[2]/v'},
    {program_name:'localf',document_type:'Func',code:'Func\nReturn 2*x\nEndFunc',parameters:'x',library_access:'LibPub',file:file('Problem2.xml'),path:'/prob/sym/e/v'},
  ],previewItems:[
    {type:'Card',file:file('Problem1.xml')},{type:'Card',file:file('Problem2.xml')},
    {name:'labels',type:'Symbol',file:file('Problem1.xml'),content_label:'Value',content:'{"a","b"}',detail:{t:'4'}},
    {name:'v',type:'Symbol',file:file('Problem2.xml'),content_label:'Value',content:'7',detail:{t:'0'}},
  ]};
  const ctx={xmlDoctor:state,documentPreviewFileKey:name=>String(name).split('/').pop(),documentPreviewDocumentName:()=> 'numberlab',documentCalculatorSessions:new Map(),document:{querySelector:()=>editor,documentElement:{lang:'en'}},window:{TnsTiBasicMath:{createSession:createMathSession}},structuredClone};
  const start=source.indexOf('function documentCalculatorFile('),end=source.indexOf('\nwindow.TnsDocumentVariables',start);
  assert(start>=0&&end>start);vm.runInNewContext(source.slice(start,end)+'\nglobalThis.getContext=documentCalculatorContext;globalThis.getPrograms=documentCalculatorPrograms;globalThis.getLibraries=documentCalculatorLibraryPrograms;',ctx);
  return {ctx,state,editor,file};
}

test('Calculator feeds selected-problem definitions with access and library metadata',()=>{
  const {ctx,state,editor,file}=context();state.current=state.candidates[2];
  const options=ctx.getContext(file('Problem2.xml')),items=options.getPrograms();
  assert.equal(items.length,1);assert.equal(items[0].name,'localf');assert.equal(items[0].source,editor.value);
  assert.equal(items[0].problemId,'Problem2.xml');assert.equal(items[0].libraryName,'numberlab');assert.equal(items[0].library_access,'LibPub');
  assert.equal(options.mathSession.variables.v,7);assert.equal(options.mathSession.variables.labels,undefined);
  assert.equal(Object.hasOwn(options.mathSession.variables,'ans'),false,'Loading stored symbols must not manufacture an Ans result');
});

test('library helpers come from the first problem and retain private access metadata',()=>{
  const {ctx,file}=context(),options=ctx.getContext(file('Problem2.xml'));
  const library=options.getLibraryPrograms();assert.deepEqual(Array.from(library,item=>item.name),['libf','helper']);
  assert.equal(library[1].library_access,'LibPriv');
  const values=options.getLibraryVariables(library[0]);assert.deepEqual(values.labels,['a','b']);assert.equal(values.v,undefined);
  options.onLibraryVariablesChange(library[0],{...values,count:9});
  assert.equal(options.getLibraryVariables(library[0]).count,9);assert.equal(options.mathSession.variables.count,undefined);assert.equal(options.mathSession.variables.v,7);
});

test('an empty first problem does not export routines from a later problem',()=>{
  const {ctx,state}=context();state.candidates=state.candidates.filter(item=>item.file.endsWith('Problem2.xml'));
  assert.equal(ctx.getLibraries().length,0);
});

test('Ans comes from saved literal answers without replaying stored calls',()=>{
  const {ctx}=context(),math=createMathSession();
  ctx.initializeCalculatorHistoryAnswer(math,[{entry:'effect()',full:'99'},{entry:'effect()',full:'10'},{full:'Done'}]);
  assert.equal(math.variables.ans,10);
  ctx.initializeCalculatorHistoryAnswer(math,[{full:'50'}]);assert.equal(math.variables.ans,10,'Preserve live Ans');
  const isolated=createMathSession();ctx.initializeCalculatorHistoryAnswer(isolated,[{full:'missing_function()'},{full:'"a,b"'}]);assert.equal(isolated.variables.ans,'a,b');
  const matrix=createMathSession();ctx.initializeCalculatorHistoryAnswer(matrix,[{full:'[[1,2][3,4]]'}]);assert.deepEqual(matrix.variables.ans,[[1,2],[3,4]]);
});
