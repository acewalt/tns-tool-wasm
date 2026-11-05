import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePrgmExpression as ev, formatPrgmValue, expressionTree } from '../src/prgm/math.js';
import { createMathSession } from '../src/prgm/math-api.js';
import { runPrgmPreview } from '../src/prgm/runtime.js';

test('TI matrix notation distinguishes lists, row vectors, columns and matrix indices', () => {
  assert.deepEqual(ev('[[1,2][3,4]]'), [[1, 2], [3, 4]]);
  assert.deepEqual(ev('[1,2]'), [[1, 2]]);
  assert.deepEqual(ev('[[1][2]]'), [[1], [2]]);
  assert.deepEqual(ev('{1,2}'), [1, 2]);
  assert.equal(ev('a[2,1]', { a: [[3, 4], [5, 6]] }), 5);
  assert.deepEqual(ev('[[1,2][3,4]]*identity(2)'), [[1, 2], [3, 4]]);
  assert.deepEqual(ev('[[1,2][3,4]]+[[1,1][1,1]]'), [[2, 3], [4, 5]]);
  assert.deepEqual(ev('[[1,2][3,4]]+1'), [[2, 2], [3, 5]]);
  assert.deepEqual(ev('sum([[1,2][3,4]])'), [[4, 6]]);
  assert.equal(ev('0b101+0hff'), 260);
  assert.throws(() => ev('0b102'), error => error.code === 'SYNTAX_ERROR');
  assert.throws(() => ev('[[1,2][3]]'), error => error.code === 'DIMENSION_ERROR');
  assert.throws(() => ev('a[0,1]', { a: [[1]] }), error => error.code === 'DOMAIN_ERROR');
});

test('Calculator screenshot commands return actual matrices and diagonals', () => {
  assert.deepEqual(ev('newMat(2,3)'), [[0, 0, 0], [0, 0, 0]]);
  assert.deepEqual(ev('identity(3)'), [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  assert.deepEqual(ev('diag({1,2,3})'), [[1, 0, 0], [0, 2, 0], [0, 0, 3]]);
  assert.deepEqual(ev('diag([[3,4][5,6]])'), [[3, 6]]);
  const random = ev('randMat(3,3)', {}, { randomSeed: 41 });
  assert.equal(random.length, 3);
  assert.ok(random.flat().every(value => Number.isInteger(value) && value >= -9 && value <= 9));
  assert.deepEqual(random, ev('randMat(3,3)', {}, { randomSeed: 41 }));
  assert.throws(() => ev('newMat(100,100)'), error => error.code === 'RESOURCE_LIMIT');
});

test('root, log base, math-font e, DMS and bounded sum/product templates evaluate', () => {
  assert.equal(ev('root(-27,3)'), -3);
  assert.equal(ev('log(8,2)'), 3);
  assert.equal(ev('√(9)'), 3);
  assert.equal(ev('\uf03f^(1)'), Math.E);
  assert.equal(ev('e^1'), Math.E);
  assert.equal(ev('sin⁻¹(0)'), 0);
  assert.equal(ev('3²'), 9);
  assert.equal(ev('"sin⁻¹ ∑ \uf03f"'), 'sin⁻¹ ∑ \uf03f');
  assert.ok(Math.abs(ev("1°1'1''") - (1 + 1 / 60 + 1 / 3600) * Math.PI / 180) < 1e-15);
  assert.ok(Math.abs(ev('sin(-30°)', {}, { angleMode: 'DEG' }) + 0.5) < 1e-14);
  assert.ok(Math.abs(ev("sin(-30°0'0'')", {}, { angleMode: 'DEG' }) + 0.5) < 1e-14);
  assert.equal(ev('∑(k,k,1,4)'), 10);
  assert.equal(ev('∏(k,k,1,4)'), 24);
  assert.deepEqual(ev('seq(k^2,k,1,3)'), [1, 4, 9]);
  assert.throws(() => ev('log(1,1)'), error => error.code === 'DOMAIN_ERROR');
  assert.throws(() => ev('sumSeq(k,k,1,10001)'), error => error.code === 'RESOURCE_LIMIT');
});

test('piecewise and when evaluate only their selected branch', () => {
  assert.equal(ev('piecewise(1/0,false,5,true)'), 5);
  assert.equal(ev('piecewise(1,false,7)'), 7);
  assert.equal(ev('when(true,3,1/0)'), 3);
  assert.throws(() => ev('piecewise(1,false)'), error => error.code === 'UNDEFINED_RESULT');
});

test('Calculator session retains Define variables, functions, assignments, Ans and mode settings', () => {
  const session = createMathSession({ language: 'en' });
  assert.equal(session.evaluate('Define c=[[3,4][5,6]]').display, 'Done');
  assert.deepEqual(session.evaluate('diag(c)').value, [[3, 6]]);
  assert.deepEqual(session.evaluate('a:=newMat(2,3)').value, [[0, 0, 0], [0, 0, 0]]);
  assert.deepEqual(session.evaluate('identity(3)→b').value, ev('identity(3)'));
  assert.equal(session.evaluate('Define square(x)=x^2').display, 'Done');
  assert.equal(session.evaluate('square(5)').value, 25);
  assert.equal(session.evaluate('Ans+1').value, 26);
  session.evaluate('setMode(2,2)');
  assert.equal(session.evaluate('sin(90)').value, 1);
  assert.equal(session.evaluate('getMode(2)').value, 2);
  session.evaluate('Lock c');
  assert.equal(session.evaluate('getLockInfo(c)').value, 1);
  assert.throws(() => session.evaluate('c:=0'), error => error.code === 'LOCKED_VARIABLE');
  session.evaluate('Unlock c'); session.evaluate('DelVar c');
  assert.throws(() => session.evaluate('c'), error => error.code === 'UNDEFINED_VARIABLE');
});

test('Loop + one-line If + Goto from the supplied rollcount screenshot executes deterministically', () => {
  const values = [0, 0.2, 0.4, 0.4]; let at = 0;
  const result = runPrgmPreview(`Define rollcount()=Func
Local i
1→i
Loop
If randInt(1,6)=randInt(1,6)
Goto finish
i+1→i
EndLoop
Lbl finish
Return i
EndFunc`, [], { random: () => values[at++], maxInstructions: 200 });
  assert.equal(result.status, 'done');
  assert.equal(result.returnValue, 2);
  assert.equal(at, 4);
});

test('Try errors, functions, locks and mode changes work through Program Preview', () => {
  const result = runPrgmPreview(`Prgm
Define f(x)=x^2
Disp f(4)
Try
1/0→a
Else
Disp errCode
ClrErr
EndTry
setMode(2,2)
Disp sin(90)
EndPrgm`);
  assert.equal(result.status, 'done');
  assert.equal(result.text, '16\n250\n1');
  assert.equal(result.variables.errcode, 0);
  assert.equal(result.angleMode, 'DEG');
});

test('Goto inside For preserves the active counter and a jump out discards that scope', () => {
  const result = runPrgmPreview('Prgm\n0→s\nFor i,1,3\nGoto add\n99→s\nLbl add\ns+i→s\nEndFor\nDisp s\nEndPrgm');
  assert.equal(result.status, 'done'); assert.equal(result.text, '6');
  const out = runPrgmPreview('Prgm\nFor i,1,5\nGoto finish\nEndFor\nLbl finish\nDisp i\nEndPrgm');
  assert.equal(out.status, 'done'); assert.equal(out.text, '1');
});

test('matrices have TI text notation, unsupported symbolic/hardware APIs fail explicitly', () => {
  assert.equal(formatPrgmValue([[1, 2], [3, 4]]), '[[1,2][3,4]]');
  assert.equal(expressionTree('\uf008(x^2,x)').name, 'd');
  for (const source of ['d(x^2,x)', 'integral(x,x)', 'solve(x=1,x)', 'getPlatform()']) {
    assert.throws(() => ev(source), error => ['UNSUPPORTED_FUNCTION', 'UNSUPPORTED_PLATFORM'].includes(error.code));
  }
  assert.throws(() => ev('globalThis.process.exit()'));
});
