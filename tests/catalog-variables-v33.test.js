import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{},document:{documentElement:{lang:'en'}}};vm.runInNewContext(fs.readFileSync(new URL('../web/ti-math-tools.js',import.meta.url),'utf8'),context);
const api=context.window.TnsMathTools;
test('Var deduplicates names, retains values and inserts callable document symbols',()=>{
  const entries=api.normalizeVariables([{name:'a',value:1},{name:'A',value:2},{name:'sonar',type:'Prgm',insertion:'sonar()'},{name:'fn',type:'Func',parameters:'x,y'},{name:'',value:0}]);
  assert.equal(entries.length,3);assert.equal(entries[0].value,2);assert.equal(entries.find(item=>item.name==='sonar').insertion,'sonar()');assert.equal(entries.find(item=>item.name==='fn').callable,true);
});
test('local libraries list only TNS files and preserve relative paths and file handles',async()=>{
  const handle={kind:'file',getFile:async()=>({name:'a.tns'})},directory={async *entries(){yield ['ignore.nes',{kind:'file'}];yield ['b.TNS',handle];yield ['sub',{kind:'directory',async *entries(){yield ['a.tns',handle];yield ['wrong.tns.exe',{kind:'file'}];}}];}};
  const result=await api.collectDirectoryLibraries(directory);assert.deepEqual(Array.from(result.files,item=>item.relativePath),['b.TNS','sub/a.tns']);assert.equal(result.files[0].handle,handle);assert.equal(result.truncated,false);
  const limited=await api.collectDirectoryLibraries(directory,{maxEntries:1});assert.equal(limited.files.length,1);assert.equal(limited.truncated,true);
  const shallow=await api.collectDirectoryLibraries(directory,{maxDepth:0});assert.equal(shallow.files.length,1);
});
test('directory input fallback filters extensions before displaying files',()=>{
  const files=api.librariesFromFiles([{name:'a.tns',webkitRelativePath:'Downloads/a.tns'},{name:'readme.txt'},{name:'B.TNS'}]);assert.equal(files.length,2);assert.equal(files.find(file=>file.name==='a.tns').relativePath,'Downloads/a.tns');
});
