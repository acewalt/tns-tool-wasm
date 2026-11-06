import assert from 'node:assert/strict';
import test from 'node:test';
import {createCalculatorSession} from '../src/prgm/calculator-session.js';

function complete(session,result){let state=result.runtime.snapshot();for(let i=0;i<200&&!['done','error','stopped','waiting'].includes(state.status);i++)state=result.runtime.run(250);session.finish(state);return state;}
const program={name:'demo',source:'Prgm\nLocal x\nx:=-15\nDisp abs(x)\n42→shared\nEndPrgm'};
test('opening a Calculator does not execute source or replay stored program calls',()=>{
  const session=createCalculatorSession({programs:[program],initialRows:[{entry:'demo()',display:'old'}]});
  assert.equal(session.getRuntime(),null);assert.equal(session.getRows().length,1);assert.deepEqual(Object.keys(session.math.variables),[]);
});
test('Calculator evaluates arithmetic and calls programs explicitly with isolated Local values',async()=>{
  const session=createCalculatorSession({programs:[program]});assert.equal((await session.submit('2+3')).result.value,5);
  const state=complete(session,await session.submit('demo()'));assert.equal(state.status,'done');assert.equal(state.text,'15');
  assert.equal((await session.submit('shared+1')).result.value,43);assert(!session.getVariables().some(v=>v.name==='x'));
  assert.equal(session.getRows().length,3);session.finish(state);assert.equal(session.getRows().length,3);
});
test('document Func expressions, arguments and cross-program calls share the problem namespace',async()=>{
  const session=createCalculatorSession({programs:[program,{name:'twice',parameters:'x',documentType:'Func',source:'Func\nReturn 2*x\nEndFunc'},{name:'caller',source:'Prgm\ndemo()\nDisp twice(shared)\nEndPrgm'}]});
  const state=complete(session,await session.submit('caller()'));assert.equal(state.status,'done');assert.equal(state.text,'15\n84');
  assert.equal((await session.submit('twice(shared)+1')).result.value,85);
});
test('formula Func and edited sources resolve the latest document definition',async()=>{
  let source='Prgm\nDisp 1\nEndPrgm';const session=createCalculatorSession({getPrograms:()=>[{name:'edit',source},{name:'f',parameters:'x',documentType:'Func',source:'x^2'}]});
  assert.equal((await session.submit('f(3)+1')).result.value,10);source='Prgm\nDisp 2\nEndPrgm';assert.equal(complete(session,await session.submit('edit()')).text,'2');
});
test('separate Calculator views may share a math session, independent problems do not',async()=>{
  const first=createCalculatorSession({programs:[program]});complete(first,await first.submit('demo()'));
  const otherView=createCalculatorSession({mathSession:first.math,programs:[program]});assert.equal((await otherView.submit('shared')).result.value,42);
  const isolated=createCalculatorSession();await assert.rejects(isolated.submit('shared'),error=>['UNDEFINED_VARIABLE','CAS_UNAVAILABLE'].includes(error.code));
});
test('stored history is copied, error rows survive, and clearing history preserves variables',async()=>{
  const old=[{entry:'1+1',display:'2'}],session=createCalculatorSession({initialRows:old});await session.submit('7→a');
  await assert.rejects(session.submit('1+'),error=>error.code==='SYNTAX_ERROR'||error.code==='CAS_UNAVAILABLE');assert.equal(session.getRows().at(-1).status,'error');
  assert.equal(old.length,1);session.clear();assert.equal(session.getRows().length,0);assert.equal((await session.submit('a')).result.value,7);
});
test('blocking keyboard and graphic programs remain interactive only after submission',async()=>{
  const session=createCalculatorSession({programs:[{name:'keytest',source:'Prgm\nSetColor 0,255,0\nDrawLine 1,2,10,20\ngetKey(1)→key\nDisp key\nEndPrgm'}]});
  const {runtime}=await session.submit('keytest()');let state=runtime.run(100);assert.equal(state.keyWaiting,true);assert.equal(state.graphics.active,true);
  runtime.sendKey('enter');state=complete(session,{runtime});assert.equal(state.status,'done');assert.equal(state.text,'enter');session.finish(state);
});
test('Var includes functions defined in Calculator and angle changes affect subsequent math',async()=>{
  const session=createCalculatorSession();await session.submit('Define custom(x)=x+2');assert(session.getVariables().some(item=>item.name==='custom'&&item.type==='Func'));
  assert.equal((await session.submit('custom(3)')).result.value,5);session.math.setAngleMode('DEG');assert(Math.abs((await session.submit('sin(90)')).result.value-1)<1e-12);
});
