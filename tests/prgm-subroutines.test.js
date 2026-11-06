import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrgmPreview,runPrgmPreview} from '../src/prgm/runtime.js';

test('internal Prgm definitions register without executing their body and return to the caller',()=>{
  const result=runPrgmPreview('Prgm\nDefine init()=Prgm\nshared:=7\nEndPrgm\nDefine add(value)=Prgm\nshared:=shared+value\nEndPrgm\ninit()\nadd(3)\nDisp shared\nEndPrgm');
  assert.equal(result.status,'done');assert.equal(result.text,'10');assert.equal(result.variables.shared,10);assert.equal(result.callDepth,0);
  const before=runPrgmPreview('Prgm\nmissing()\nDefine missing()=Prgm\nDisp 1\nEndPrgm\nEndPrgm');
  assert.equal(before.error.code,'UNSUPPORTED_FUNCTION');assert.equal(before.error.line,2);
});

test('routine arguments and Local names are private and share only problem variables',()=>{
  const result=runPrgmPreview('Prgm\nLocal outer\nouter:=99\nshared:=2\nDefine helper(value)=Prgm\nLocal private,value\nprivate:=3\nvalue:=value+private\nshared:=shared+value\nEndPrgm\nhelper(4)\nDisp outer,shared\nEndPrgm');
  assert.equal(result.status,'done');assert.equal(result.text,'99\u20099');assert.equal(result.variables.value,undefined);assert.equal(result.variables.private,undefined);
  const hidden=runPrgmPreview('Prgm\nLocal secret\nsecret:=1\nDefine child()=Prgm\nDisp secret\nEndPrgm\nchild()\nEndPrgm');
  assert.equal(hidden.error.code,'UNDEFINED_VARIABLE');assert.equal(hidden.error.line,5);
  const shadow=runPrgmPreview('Prgm\nsecret:=8\nDefine child()=Prgm\nLocal secret\nDisp secret\nEndPrgm\nchild()\nEndPrgm');
  assert.equal(shadow.error.code,'UNDEFINED_VARIABLE');assert.equal(shadow.error.line,5);
});

test('multiline Func callbacks evaluate inside expressions, recurse and return without stray output',()=>{
  const result=runPrgmPreview('Prgm\nDefine factorial(n)=Func\nLocal n\nIf n≤1 Then\nReturn 1\nEndIf\nReturn n*factorial(n-1)\nEndFunc\nDisp 1+factorial(5),factorial(3)\nEndPrgm');
  assert.equal(result.status,'done');assert.equal(result.text,'121\u20096');assert.equal(result.output.length,1);assert.equal(result.variables.n,undefined);
  const unicode=runPrgmPreview('Prgm\nDefine θ(v1,v2)=Func\nLocal v1,v2\nReturn dotP(v1,v2)\nEndFunc\nDisp θ([[1,2]],[[3,4]])\nEndPrgm');
  assert.equal(unicode.text,'11');assert.equal(unicode.status,'done');
});

test('local routine definitions stay private while sibling definitions remain independent',()=>{
  const result=runPrgmPreview('Prgm\nDefine first()=Prgm\nLocal child\nDefine child()=Prgm\nshared:=8\nEndPrgm\nchild()\nEndPrgm\nfirst()\nDisp shared\nchild()\nEndPrgm');
  assert.equal(result.text,'8');assert.equal(result.error.code,'UNSUPPORTED_FUNCTION');assert.equal(result.error.line,11);
});

test('typed nested closures, procedure expression misuse and argument counts fail at real lines',()=>{
  const malformed=runPrgmPreview('Prgm\nDefine helper()=Prgm\nEndFunc\nEndPrgm');
  assert.equal(malformed.error.code,'SYNTAX_ERROR');assert.equal(malformed.error.line,3);
  const expr=runPrgmPreview('Prgm\nDefine helper()=Prgm\nEndPrgm\nDisp helper()+1\nEndPrgm');
  assert.equal(expr.error.code,'PROGRAM_IN_EXPRESSION');assert.equal(expr.error.line,4);
  const arity=runPrgmPreview('Prgm\nDefine helper(value)=Prgm\nEndPrgm\nhelper()\nEndPrgm');
  assert.equal(arity.error.code,'ARGUMENT_ERROR');assert.equal(arity.error.line,4);
  const missingReturn=runPrgmPreview('Prgm\nDefine helper()=Func\nEndFunc\nDisp helper()\nEndPrgm');
  assert.equal(missingReturn.error.code,'MISSING_RETURN');
});

test('recursive procedures and functions retain global instruction and depth limits',()=>{
  for(const source of ['Prgm\nDefine again()=Prgm\nagain()\nEndPrgm\nagain()\nEndPrgm','Prgm\nDefine again()=Func\nReturn again()\nEndFunc\nDisp again()\nEndPrgm']){
    const result=runPrgmPreview(source,[],{maxInstructions:200});
    assert.equal(result.status,'error');assert.equal(result.error.code,'EXECUTION_LIMIT');assert.ok(result.executed<=300);
  }
});

test('Try in the caller catches a callee error with intact source line and resumes the caller',()=>{
  const result=runPrgmPreview('Prgm\nDefine bad()=Prgm\nshared:=1/0\nEndPrgm\nTry\nbad()\nElse\nDisp errCode\nEndTry\nDisp 9\nEndPrgm');
  assert.equal(result.status,'done');assert.equal(result.text,'250\n9');assert.equal(result.callDepth,0);
});

test('indexed matrix row, cell and list assignments use value semantics',()=>{
  const result=runPrgmPreview('Prgm\nm:=[[1,2][3,4]]\nbackup:=m\nm[1]:=[[5,6]]\nm[2,1]:=7\n{1,2}→items\n9→items[2]\nDisp m,backup,items\nEndPrgm');
  assert.equal(result.status,'done');assert.deepEqual(result.variables.m,[[5,6],[7,4]]);assert.deepEqual(result.variables.backup,[[1,2],[3,4]]);assert.deepEqual(result.variables.items,[1,9]);
  for(const target of ['m[0,1]:=2','m[3]:=[[1,2]]','m[1]:=[[1]]']){
    const invalid=runPrgmPreview('Prgm\nm:=[[1,2][3,4]]\n'+target+'\nEndPrgm');
    assert.equal(invalid.status,'error');assert.equal(invalid.error.line,3);
  }
});

test('Wait and PaintBuffer inside a Prgm yield and resume without skipping the caller',()=>{
  let now=0;const preview=createPrgmPreview('Prgm\nDefine draw()=Prgm\nUseBuffer\nFillCircle 10,10,3\nPaintBuffer\nWait .1\nshared:=7\nEndPrgm\ndraw()\nDisp shared\nEndPrgm',{now:()=>now});
  let state=preview.run();assert.equal(state.status,'paused');assert.equal(state.callDepth,1);assert.equal(state.graphics.commands.length,1);assert.equal(preview.frameYield,true);
  state=preview.run();assert.equal(state.waitRemainingMs,100);assert.equal(state.variables.shared,undefined);
  now=100;state=preview.run();assert.equal(state.status,'done');assert.equal(state.text,'7');assert.equal(state.callDepth,0);
});

test('blocking getKey preserves the assignment until a key arrives and works inside routines',()=>{
  const preview=createPrgmPreview('Prgm\nDefine read()=Prgm\nanswer:="before"\nanswer:=getKey(1)\nEndPrgm\nread()\nDisp answer\nEndPrgm',{interactive:true});
  let state=preview.run();assert.equal(state.status,'paused');assert.equal(state.keyWaiting,true);assert.equal(state.variables.answer,'before');const line=state.nextLine;
  state=preview.run();assert.equal(state.nextLine,line);assert.equal(state.variables.answer,'before');
  preview.sendKey('t');state=preview.run();assert.equal(state.keyWaiting,false);state=preview.run();assert.equal(state.status,'done');assert.equal(state.text,'t');
});

test('interactive getKey polls allow a bounded responsive game while true runaway loops still stop',()=>{
  const source='Prgm\nkey:=""\nWhile key≠"esc"\nkey:=getKey(0)\nEndWhile\nDisp "closed"\nEndPrgm';
  const preview=createPrgmPreview(source,{interactive:true,maxInstructions:12});
  for(let i=0;i<100;i++){const state=preview.run(250);assert.equal(state.status,'paused');assert.equal(preview.frameYield,true);}
  assert.ok(preview.executed>12);preview.sendKey('esc');preview.run();assert.equal(preview.run().text,'closed');
  const limited=createPrgmPreview(source,{maxInstructions:12});let state;do{state=limited.run();}while(state.status==='paused');assert.equal(state.error.code,'EXECUTION_LIMIT');
  assert.equal(runPrgmPreview('Prgm\nLoop\nEndLoop\nEndPrgm',[],{interactive:true,maxInstructions:20}).error.code,'EXECUTION_LIMIT');
});

test('GRAD mode survives construction and internal function evaluation',()=>{
  const result=runPrgmPreview('Prgm\nDefine angle()=Func\nReturn cos(100)\nEndFunc\nDisp angle()\nEndPrgm',[],{angleMode:'GRAD'});
  assert.equal(result.angleMode,'GRAD');assert.ok(Math.abs(Number(result.text))<1e-10);
});
test('the synchronous runner returns keyboard waits instead of spinning forever',()=>{
  const blocking=runPrgmPreview('Prgm\nkey:=getKey(1)\nEndPrgm');
  assert.equal(blocking.status,'paused');assert.equal(blocking.keyWaiting,true);
  const polling=runPrgmPreview('Prgm\nLoop\nkey:=getKey(0)\nEndLoop\nEndPrgm',[],{interactive:true});
  assert.equal(polling.status,'paused');assert.equal(polling.keyPolling,true);
});
