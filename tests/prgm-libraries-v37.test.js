import test from 'node:test';
import assert from 'node:assert/strict';
import {createCalculatorSession} from '../src/prgm/calculator-session.js';
import {createPrgmPreview,runPrgmPreview,compilePrgm} from '../src/prgm/runtime.js';
import {evaluatePrgmExpression as value} from '../src/prgm/math.js';

const complete=result=>{let state=result.runtime.snapshot();for(let i=0;i<100&&!['done','error','waiting','stopped'].includes(state.status);i++)state=result.runtime.run(250);return state;};
const routine=(name,source,parameters='',extras={})=>({name,source,parameters,documentType:'Func',...extras});

test('qualified library names and relational chains have TI expression semantics',()=>{
  assert.equal(value('0≤2≤3'),true);assert.equal(value('0≤2≤1'),false);assert.equal(value('1<2<3 and 3≠4'),true);
  assert.throws(()=>value('(1<2)<3'),error=>error.code==='TYPE_ERROR');
  assert.equal(compilePrgm('Prgm\nlib\\run()\nEndPrgm').code[1].expr.name,'lib\\run');
});

test('a Func returns the last evaluated branch expression and preserves its private Local scope',async()=>{
  const session=createCalculatorSession({programs:[routine('choose','Func\nLocal internal\ninternal:=7\nIf x<0 Then\n-internal\nElse\ninternal\nEndIf\nEndFunc','x')]});
  assert.equal((await session.submit('choose(-1)')).result.value,-7);assert.equal((await session.submit('choose(1)+1')).result.value,8);
  assert(!session.getVariables().some(item=>item.name==='internal'));
  assert.equal(session.getRows()[0].kind,'calculation');assert.equal(session.getRows()[0].display,'-7');
});

test('Func helper Disp output, matrix values and final return occupy separate Calculator fields',async()=>{
  const session=createCalculatorSession({programs:[
    routine('private_step','Func\nDisp "Step",[[x,2][5,5]]\nx\nEndFunc','x',{library_access:'LibPriv'}),
    routine('explain','Func\nprivate_step(x)\nDisp x,"=",factor(x)\nx\nEndFunc','x',{library_access:'LibPub'}),
  ],libraryName:'demo'});
  const result=await session.submit('demo\\explain(10)');assert.equal(result.result.value,10);
  assert.equal(result.output.length,2);assert.deepEqual(result.output[0].values,['Step',[[10,2],[5,5]]]);
  assert.equal(result.output[1].segments[2].text,'2*5');assert.equal(result.output[1].segments[2].kind,'math');
  assert.equal(session.getRows()[0].display,'10');assert(!result.output.some(row=>row.kind==='return'));
  await assert.rejects(session.submit('demo\\private_step(10)'),error=>error.code==='LIBRARY_ACCESS');
});

test('an exported library routine uses its own helpers and globals rather than the caller problem',async()=>{
  const sourceVars={counter:0,sourcevalue:40},changes=[];
  const library=[
    routine('helper','Func\nsourcevalue+x\nEndFunc','x',{problemId:'problem1',libraryName:'example',library_access:'LibPriv'}),
    routine('public','Func\ncounter:=counter+1\nhelper(x)\nEndFunc','x',{problemId:'problem1',libraryName:'example',library_access:'LibPub'}),
  ];
  const session=createCalculatorSession({problemId:'problem2',variables:{sourcevalue:900},programs:[routine('helper','Func\nx*100\nEndFunc','x')],getLibraryPrograms:()=>library,getLibraryVariables:()=>sourceVars,onLibraryVariablesChange:(_item,values)=>changes.push(values)});
  assert.equal((await session.submit('helper(2)')).result.value,200);
  assert.equal((await session.submit('example\\public(2)')).result.value,42);
  assert.equal(sourceVars.counter,1);assert.equal(changes.at(-1).counter,1);
  assert.equal((await session.submit('sourcevalue')).result.value,900);
  await assert.rejects(session.submit('counter'),error=>['UNDEFINED_VARIABLE','CAS_UNAVAILABLE'].includes(error.code));
  sourceVars.sourcevalue=50;assert.equal((await session.submit('example\\public(2)')).result.value,52);
});

test('public exports are selected explicitly; LibPub in a later problem does not become a library export',async()=>{
  const local=routine('second','Func\n2\nEndFunc','',{problemId:'problem2',libraryName:'doc',library_access:'LibPub'});
  const session=createCalculatorSession({problemId:'problem2',programs:[local],getLibraryPrograms:()=>[]});
  assert.equal((await session.submit('second()')).result.value,2);
  await assert.rejects(session.submit('doc\\second()'),error=>error.code==='UNDEFINED_LIBRARY_FUNCTION');
});

test('library Prgm calls keep their namespace and Calculator final Done separated from text output',async()=>{
  const program={name:'show',source:'Prgm\nDisp "Shown"\ncounter:=counter+1\nEndPrgm',documentType:'Prgm',problemId:'problem1',libraryName:'lib',library_access:'LibPub'};
  const libraryVariables={counter:0};
  const session=createCalculatorSession({problemId:'problem2',programs:[],libraryPrograms:[program],getLibraryVariables:()=>libraryVariables});
  const result=await session.submit('lib\\show()'),state=complete(result);assert.equal(state.status,'done');session.finish(state);
  assert.equal(libraryVariables.counter,1);assert.equal(session.getRows()[0].display,'Done');assert.equal(session.getRows()[0].output[0].text,'Shown');
});

test('Func arguments retain their output before a Prgm body in the same saved Calculator transcript',async()=>{
  const session=createCalculatorSession({programs:[
    routine('argument','Func\nDisp "Argument trace"\n7\nEndFunc'),
    {name:'show',parameters:'x',documentType:'Prgm',source:'Prgm\nDisp "Program trace",x\nEndPrgm'},
  ]});
  const result=await session.submit('show(argument())');
  assert.equal(result.kind,'program');assert.equal(result.runtime.snapshot().status,'ready');
  assert.deepEqual(result.runtime.snapshot().output.map(row=>row.text),['Argument trace']);
  const state=complete(result);assert.equal(state.status,'done');session.finish(state);
  const row=session.getRows()[0];assert.equal(row.display,'Done');
  assert.deepEqual(row.output.map(output=>output.text),['Argument trace','Program trace\u20097']);
  assert.deepEqual(row.output[1].values,['Program trace',7]);
});

test('expr string commands use the bounded TI parser, mutate the current Local target and emit output',()=>{
  const result=runPrgmPreview('Func\nLocal x,result\nx:=7\nexpr("result:=x+1")\nexpr("Disp ""safe output""")\nresult\nEndFunc');
  assert.equal(result.status,'done');assert.equal(result.returnValue,8);assert.equal(result.output[0].text,'safe output');
  assert.throws(()=>value('expr("globalThis.process.exit()")'),error=>error.code==='UNSUPPORTED_EXPRESSION');
  const conditional=runPrgmPreview('Func\nLocal x,y\nx:=99\nexpr("y:=x^2|x=4")\ny\nEndFunc');assert.equal(conditional.returnValue,16);assert.equal(conditional.variables.x,99);
});

test('known document routine errors and already emitted text never fall through to a symbolic CAS',async()=>{
  let fallback=0;const session=createCalculatorSession({programs:[routine('broken','Func\nDisp "before error"\nReturn 1+"wrong type"\nEndFunc')],cas:{ensureReady:async()=>{fallback++;return true;}}});
  await assert.rejects(session.submit('broken()'),error=>error.code==='TYPE_ERROR');assert.equal(fallback,0);
  assert.equal(session.getRows()[0].output[0].text,'before error');assert.equal(session.getRows()[0].status,'error');
});

test('current source changes replace previously registered library helper bodies',async()=>{
  let answer=1;const session=createCalculatorSession({getPrograms:()=>[routine('helper',`Func\n${answer}\nEndFunc`),routine('outer','Func\nhelper()\nEndFunc')]});
  assert.equal((await session.submit('outer()')).result.value,1);answer=9;assert.equal((await session.submit('outer()')).result.value,9);
});

test('number theory and list primitives preserve bounded numeric values and formatted factor text',()=>{
  assert.equal(value('isPrime(149)'),true);assert.equal(value('isPrime(150)'),false);assert.equal(value('isPrime(1)'),false);
  assert.equal(value('factor(12)+1'),13);assert.equal(value('string(factor(12))'),'2^2*3');
  assert.deepEqual(value('list▶mat({1,2,3})'),[[1,2,3]]);assert.deepEqual(value('mat▶list([[1,2][3,4]])'),[1,2,3,4]);
  assert.deepEqual(value('right({1,2},0)'),[]);assert.equal(value('right("hello",0)'),'');
  assert.equal(value('mod(x,2)=0|x=8'),true);
});
