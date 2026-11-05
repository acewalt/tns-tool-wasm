import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const hierarchy=JSON.parse(fs.readFileSync(new URL('../assets/math-tools/catalog-hierarchy.json',import.meta.url),'utf8'));
const source=fs.readFileSync(new URL('../ti-math-tools.js',import.meta.url),'utf8');
const window={};vm.runInNewContext(source,{window,document:{documentElement:{lang:'en'}}});
const {buildCatalogWizard:build,flattenCatalog:flatten}=window.TnsMathTools;
const leaves=flatten(hierarchy.math.tree),find=id=>leaves.find(n=>n.wizardId===id);

test('hierarchies preserve all supplied operator and conversion groups as data',()=>{
  assert.equal(hierarchy.math.tree.length,15);assert.equal(leaves.length,404);
  assert.equal(hierarchy.conversion.tree.filter(n=>n.children).length,27);
  const units=flatten(hierarchy.conversion.tree).filter(n=>n.code?.startsWith('_'));
  assert.equal(units.length,152);assert(units.some(n=>n.code==='_µH'));assert(units.some(n=>n.code==='_μ0'));
  assert.equal(new Set(leaves.map(n=>n.id)).size,leaves.length);
});
test('matrix, equation-system and conversion assistants generate actual TI tokens',()=>{
  assert.equal(build(find('matrixCreate'),{rows:2,columns:3}),'[[1,1,1][1,1,1]]');
  assert.equal(build(find('solveSystem'),{count:2,variables:'x,y',eq0:'x+y=3',eq1:'x-y=1'}),'solve({x+y=3,x-y=1},{x,y})');
  assert.equal(build(find('linearSystem'),{count:1,variables:'x',eq0:'2*x=8'}),'linSolve({2*x=8},{x})');
  assert.equal(build(hierarchy.conversion.tree[0],{value:'12*_ft',unit:'_m'}),'12*_ft►_m');
});
test('polynomial and differential-equation assistants retain all supplied expressions',()=>{
  assert.equal(build(find('polyRootsBuilder'),{degree:2,variable:'z',domain:'complex',a2:'1',a1:'0',a0:'1'}),'cPolyRoots((1)*z^2+(0)*z+(1),z)');
  assert.equal(build(find('odeSolver'),{equation:"y'=2*y",independent:'x',dependent:'y',condition1:'y(0)=1'}),"deSolve(y'=2*y and y(0)=1,x,y)");
});
test('statistical assistants use TI list count and dependent-list-first signatures',()=>{
  assert.equal(build(find('oneVar'),{count:2,list0:'a',list1:'b'}),'OneVar 2,a,b:stat.results');
  assert.equal(build(find('oneVar'),{count:1,list0:'a',frequency:'freq'}),'OneVar 1,a,freq:stat.results');
  assert.equal(build(find('multipleRegression'),{y:'ys',x:'x1,x2',save:'f2'}),'MultReg ys,x1,x2:CopyVar stat.RegEqn,f2:stat.results');
  assert.equal(build(find('normPdf'),{p0:'0',p1:'0',p2:'1'}),'normPdf(0,0,1)');
});
test('unfinished or unknown syntax cannot be silently inserted as a valid template',()=>{
  assert.throws(()=>build({code:null,wizardId:'unknown'},{}),/token/);
  assert.throws(()=>build(find('matrixCreate'),{rows:0,columns:3}),/1–20/);
  assert.throws(()=>build(find('solveSystem'),{count:2,variables:'x,y',eq0:'x=1'}),/required/);
  assert.throws(()=>build(find('polyRootsReal'),{degree:2,a2:'0',a1:'1',a0:'2'}),/required/);
  const generic=find('zInterval');assert.throws(()=>build(generic,{}),/required/);
  assert.equal(build(generic,{arguments:'1,list1,1,0.95'}),'zInterval 1,list1,1,0.95');
});
