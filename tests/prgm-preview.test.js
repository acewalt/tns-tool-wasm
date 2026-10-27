import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPrgmPreview,runPrgmPreview,evaluatePrgmExpression as ev} from '../src/prgm/runtime.js';
const physics=fs.readFileSync(new URL('../examples/physics-prgm.tib',import.meta.url),'utf8');
test('real 602-line physics program waits for menus and accepts calculator expressions',()=>{
  const p=createPrgmPreview(physics,{name:'phy'});let s=p.run();
  assert.equal(s.status,'waiting');assert.equal(s.pending.variable,'opcion');assert.match(s.text,/MENU PRINCIPAL/);
  assert.equal(s.variables.opcion,undefined);
  p.answer('1');s=p.run();assert.equal(s.pending.variable,'seleccion');assert.match(s.text,/1:Velocidad/);
  assert.match(s.text,/MENU PRINCIPAL/);assert.match(s.text,/op: 1/);
  p.answer('1');p.run();p.answer('100');p.run();p.answer('2*10');s=p.run();
  assert.equal(s.status,'done');assert.equal(s.variables.velocidad,5);assert.match(s.text,/v=5 m\/s/);
});
test('MRUA route from the supplied screenshots produces 0.70966 s',()=>{
  const s=runPrgmPreview(physics,[1,2,6,2,56,5,41]);
  assert.equal(s.status,'done');assert.ok(Math.abs(s.variables.t-(-56+Math.sqrt(3546))/5)<1e-12);
  assert.match(s.text,/\(t\)=0.70966 s/);assert.match(s.text,/t=\(-56\+√\(3546\)\)\/5/);
});
test('other physics branches, nested guards and radian trig run actual calculations',()=>{
  assert.match(runPrgmPreview(physics,[1,1,12,0]).text,/Error/);
  assert.match(runPrgmPreview(physics,[2,2,1,12,3]).text,/F=36 N/);
  assert.match(runPrgmPreview(physics,[3,1,2,10,20,60]).text,/T=100 J/);
  assert.match(runPrgmPreview(physics,[5,1,72]).text,/v=20 m\/s/);
  assert.match(runPrgmPreview(physics,[6,2]).text,/Ec=1\/2/);
});
test('invalid Request input stays pending; Cancel preserves old value and sets status',()=>{
  const p=createPrgmPreview('Prgm\n7→x\nRequest "x:",x,0,ok\nDisp x,ok\nEndPrgm');p.run();
  const invalid=p.answer('window.alert(1)');assert.ok(invalid.inputError);assert.equal(invalid.status,'waiting');assert.equal(invalid.variables.x,7);
  p.answer('',{cancel:true});const s=p.run();assert.equal(s.text,'7\u20090');assert.equal(s.variables.ok,0);
  const q=createPrgmPreview('RequestStr "Nombre:",s\nDisp s');q.run();q.answer('<script>&π');assert.equal(q.run().text,'Nombre: <script>&π\n<script>&π');
});
test('If/ElseIf, one-line If, loops, Exit, Cycle, Goto and DispAt',()=>{
  const s=runPrgmPreview(`Prgm
0→s
For k,1,5
If k=3
Cycle
s+k→s
EndFor
If s=12 Then
Disp "yes"
ElseIf s=10 Then
Disp "wrong"
Else
Disp "no"
EndIf
While s>10
s-1→s
EndWhile
Loop
Exit
EndLoop
Goto end
Disp "unreachable"
Lbl end
DispAt 1,"s=",s
EndPrgm`);
  assert.equal(s.status,'done');assert.equal(s.text,'s=\u200910');assert.equal(s.variables.s,10);
  assert.equal(runPrgmPreview('If false Then\nDisp 1\nElseIf true Then\nDisp 2\nElse\nDisp 3\nEndIf').text,'2');
  assert.equal(runPrgmPreview('0→x:For i,3,1,-1:x+i→x:EndFor:Disp x').text,'6');
  assert.equal(runPrgmPreview('If false\nIf true Then\nDisp "skip"\nEndIf\nDisp "ok"').text,'ok');
});
test('numerical grammar handles TI glyphs, precedence, strings, lists and angle modes',()=>{
  assert.equal(ev('−2^2+2^3^2'),508);assert.equal(ev('2(3+4)'),14);
  assert.equal(ev('√(16)+6.67E−11'),4+6.67e-11);assert.equal(ev('"a:b"&string(2+3)'),'a:b5');
  assert.equal(ev('{10,20}[2]'),20);assert.ok(Math.abs(ev('cos(60)',{},{angleMode:'DEG'})-.5)<1e-12);
  assert.ok(Math.abs(ev('cos(60°)',{},{angleMode:'DEG'})-.5)<1e-12);
  assert.equal(ev('false and missing=0'),false);
  assert.equal(runPrgmPreview('Define foo()=Prgm:Disp "a:©b":EndPrgm').text,'a:©b');
});
test('unsupported constructs, undefined variables and dangerous input fail explicitly with lines',()=>{
  const s=runPrgmPreview('Prgm\nLocal a\nDisp a\nEndPrgm');assert.equal(s.error.code,'UNDEFINED_VARIABLE');assert.equal(s.error.line,3);
  assert.equal(runPrgmPreview('Disp solve(x=1,x)').error.code,'UNSUPPORTED_FUNCTION');
  assert.equal(runPrgmPreview('Disp solve(1,2)').error.code,'UNSUPPORTED_FUNCTION');
  assert.equal(runPrgmPreview('DrawLine 1,2,3,4').error.code,'UNSUPPORTED_COMMAND');
  assert.equal(runPrgmPreview('If true Then\nDisp 1').error.code,'SYNTAX_ERROR');
  assert.equal(runPrgmPreview('Disp 1/0').error.code,'DIVISION_BY_ZERO');
  assert.equal(runPrgmPreview('Loop\nEndLoop',[],{maxInstructions:100}).error.code,'EXECUTION_LIMIT');
  assert.throws(()=>ev('globalThis.process.exit()'));assert.equal(globalThis.__prgmPreviewUnsafe,undefined);
});
test('step and stop retain output and Request has its actual source line',()=>{
  const p=createPrgmPreview('Disp "one"\nRequest "n:",n\nDisp n');
  assert.equal(p.step().text,'one');const waiting=p.step();assert.equal(waiting.pending.line,2);assert.equal(waiting.line,2);
  assert.equal(p.stop().status,'stopped');assert.equal(p.run().text,'one');
});
test('ClrIO preserves the TI-Nspire history seen in the reference calculator',()=>{
  const s=runPrgmPreview('Disp "menu":Request "op:",n:ClrIO:Disp "submenu"',[1]);
  assert.equal(s.text,'menu\nop: 1\nsubmenu');assert.equal(s.warnings[0].code,'COMPAT_CLRIO');
  const video=runPrgmPreview(physics,[1,2,3,45,2,2,3]);
  assert.match(video.text,/MENU PRINCIPAL/);assert.match(video.text,/op: 1/);assert.match(video.text,/op: 2/);assert.match(video.text,/\(a\)=14.3333 m\/s\^2/);
});
