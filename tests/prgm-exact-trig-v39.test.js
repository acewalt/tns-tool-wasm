import assert from 'node:assert/strict';
import test from 'node:test';
import {createCalculatorSession} from '../src/prgm/calculator-session.js';
import {createMathSession} from '../src/prgm/math-api.js';

function finish(session,result){const state=result.runtime.run(1000);assert.equal(state.status,'done',state.error?.message);session.finish(state);return state;}
const trigo={name:'trigo',parameters:'x',source:'Prgm\nLocal a,y\nx→a\ncos(a)→y\nDisp y,sin(a)\nEndPrgm'};

test('exact angle provenance travels from Calculator argument through Local assignment and trig results',async()=>{
  const session=createCalculatorSession({programs:[trigo]});
  const state=finish(session,await session.submit('trigo(π/4)'));
  assert.equal(state.text,'√(2)/2\u2009√(2)/2');
  assert.equal(typeof state.variables.y,'number');assert.ok(Math.abs(state.variables.y-Math.SQRT1_2)<1e-14);
  assert.equal((await session.submit('π/4')).result.display,'π/4');
  assert.equal((await session.submit('a:=π/3')).result.value,Math.PI/3);
  assert.equal((await session.submit('cos(a)')).result.display,'1/2');
});

test('decimal approximations are not reverse-engineered into exact radicals',async()=>{
  const session=createCalculatorSession({programs:[trigo]});
  const state=finish(session,await session.submit('trigo(0.7853981633974483)'));
  assert.equal(state.text,'0.707107\u20090.707107');
  assert.equal((await session.submit('sin(0.7853981633974483)')).result.display,'0.707107');
});

test('Local parameter scopes and reassignment cannot reuse a previous exact angle',async()=>{
  const source={name:'changed',parameters:'x',source:'Prgm\nLocal a\nx→a\nDisp cos(a)\na:=0.7853981633974483\nDisp cos(a)\nEndPrgm'};
  const session=createCalculatorSession({programs:[source,trigo]});
  assert.equal(finish(session,await session.submit('changed(π/4)')).text,'√(2)/2\n0.707107');
  assert.equal(finish(session,await session.submit('trigo(π/6)')).text,'√(3)/2\u20091/2');
  assert.equal(finish(session,await session.submit('trigo(0.5)')).text,'0.877583\u20090.479426');
  assert.equal(finish(session,await session.submit('trigo(π/4)')).text,'√(2)/2\u2009√(2)/2');
});

test('routine arguments carry exact trees through nested Prgm and Func calls without leaking their locals',async()=>{
  const programs=[{name:'outer',source:'Prgm\ninner(π/4)\nDisp f(0.5)\ninner(π/6)\nEndPrgm'},
    {name:'inner',parameters:'x',source:'Prgm\nDisp cos(x)\nEndPrgm'},
    {name:'f',parameters:'x',documentType:'Func',source:'Func\nDisp sin(x)\nReturn x\nEndFunc'}];
  const session=createCalculatorSession({programs});
  assert.equal(finish(session,await session.submit('outer()')).text,'√(2)/2\n0.479426\n0.5\n√(3)/2');
  assert.ok(!session.getVariables().some(item=>item.name==='x'));
});

test('live external variable changes invalidate exact display instead of changing numeric evaluation',()=>{
  const math=createMathSession();math.evaluate('angle:=π/4');assert.equal(math.evaluate('sin(angle)').display,'√(2)/2');
  math.variables.angle=.5;assert.equal(math.evaluate('sin(angle)').display,'0.479426');
  assert.equal(math.evaluate('sin(angle)').value,Math.sin(.5));
});
