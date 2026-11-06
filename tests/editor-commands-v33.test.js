import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const slice=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
test('Ctrl+B and Ctrl+R dispatch once and only in the enabled editor scope',async()=>{
  const context={};vm.runInNewContext(slice('function installEditorCommandShortcuts(','function isTiBasicProgramCandidate(')+'\nglobalThis.install=installEditorCommandShortcuts;',context);
  const scope=new EventTarget(),calls=[];let enabled=true;
  const dispose=context.install(scope,{enabled:()=>enabled,syntax:()=>calls.push('syntax'),preview:()=>calls.push('preview')});
  const key=(key,extra={})=>{const e=new Event('keydown',{cancelable:true});Object.assign(e,{key,ctrlKey:true,...extra});scope.dispatchEvent(e);return e;};
  assert(key('b').defaultPrevented);assert(key('r').defaultPrevented);key('b',{repeat:true});key('r',{altKey:true});key('b',{shiftKey:true});await Promise.resolve();assert.deepEqual(calls,['syntax','preview']);
  enabled=false;assert(!key('r').defaultPrevented);dispose();enabled=true;key('b');await Promise.resolve();assert.equal(calls.length,2);
});
test('readonly declaration derives only from program metadata and follows rename/access/parameters',()=>{
  const context={isTiBasicProgramCandidate:item=>item?.document_type==='Prgm'};vm.runInNewContext(slice('function programEditorDeclaration(','function syncProgramEditorDeclaration(')+'\nglobalThis.declaration=programEditorDeclaration;',context);
  const item={document_type:'Prgm',program_name:'nuevo',library_access:'LibPub ',parameters:''};assert.equal(context.declaration(item),'Define LibPub nuevo()=');
  Object.assign(item,{program_name:'renamed',library_access:'LibPriv',parameters:'x,y'});assert.equal(context.declaration(item),'Define LibPriv renamed(x,y)=');assert.equal(context.declaration(null),'');
});
test('document variables and callable source are scoped to the selected problem, without Local identifiers',()=>{
  const first={program_name:'same',document_type:'Prgm',parameters:'',file:'/source/sub/Problem1.xml',code:'Prgm\nLocal private\nDisp 1\nEndPrgm'},second={...first,file:'/stage/other/Problem1.xml',code:'Prgm\nDisp 2\nEndPrgm'};
  const context={xmlDoctor:{current:first,candidates:[first,second],previewItems:[{content_label:'Value',type:'Symbol',name:'n',content:'7',file:first.file}]},document:{querySelector:()=>({value:'Prgm\nDisp 3\nEndPrgm'})},documentPreviewFileKey:file=>file.replace(/^\/(source|stage)\//,''),Map};
  vm.runInNewContext(slice('function documentCalculatorFile(','function documentCalculatorContext(')+'\nglobalThis.programs=documentCalculatorPrograms;globalThis.variables=documentStoredVariables;',context);
  assert.equal(context.programs(first.file).length,1);assert(context.programs(first.file)[0].source.includes('Disp 3'));assert(context.programs(second.file)[0].source.includes('Disp 2'));
  assert.deepEqual([...context.variables(first.file)].map(item=>item.name),['n','same']);assert.deepEqual([...context.variables(second.file)].map(item=>item.name),['same']);
});
