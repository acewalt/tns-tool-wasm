import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{},document:{documentElement:{lang:'en'}}};
vm.runInNewContext(fs.readFileSync(new URL('../web/ti-math-tools.js',import.meta.url),'utf8'),context);
const api=context.window.TnsMathTools;

test('Var distinguishes callable TI types from scalar, string, list and matrix symbols',()=>{
  const cases=[
    [{name:'step',type:'Prgm'},'program'],
    [{name:'primes',document_type:'Func'},'function'],
    [{name:'poly',kind:'symbol_value',documentType:'Func'},'function'],
    [{name:'count',value:10},'variable'],
    [{name:'label',value:'text'},'string'],
    [{name:'values',value:[1,2,3]},'list'],
    [{name:'matrix',value:[[1,2],[3,4]]},'matrix'],
    [{name:'matrix',kind:'matrix'},'matrix'],
  ];
  for(const [entry,expected]of cases)assert.equal(api.variableCategory(entry),expected,entry.name);
});

test('XML symbol metadata keeps callable status and the qualified insertion token',()=>{
  const result=api.normalizeVariables([{name:'primecount',kind:'symbol_value',document_type:'Func',parameters:'a,b',insertion:'numtheory\\primecount()'}]);
  assert.equal(result[0].callable,true);
  assert.equal(result[0].kind,'Func');
  assert.equal(result[0].parameters,'a,b');
  assert.equal(result[0].insertion,'numtheory\\primecount()');
});

test('Var uses one alphabetical list while retaining each symbol type and value',()=>{
  const result=api.normalizeVariables([{name:'z',type:'Prgm'},{name:'beta',value:[1,2]},{name:'alpha',type:'Func',parameters:'n'},{name:'BETA',value:[3,4]}]);
  assert.deepEqual(Array.from(result,item=>item.name),['alpha','BETA','z']);
  assert.deepEqual(Array.from(result,item=>api.variableCategory(item)),['function','list','program']);
  assert.deepEqual(Array.from(result[1].value),[3,4]);
});
