import test from 'node:test';
import assert from 'node:assert/strict';
import {createMathContext, evaluatePrgmExpression, normalizeTiMath, PrgmError} from '../src/prgm/math.js';

const near = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≠ ${expected}`);
const value = (source, variables = {}, options = {}) => evaluatePrgmExpression(source, variables, options);

test('TI document inverse-trig and transpose glyphs retain actual matrix/angle semantics', () => {
  assert.deepEqual(value('[[1,2,3][4,5,6]]\uF002'), [[1,4],[2,5],[3,6]]);
  assert.deepEqual(value('([[1,2][3,4]]\uF002)\uF002'), [[1,2],[3,4]]);
  near(value('cos\uF005(0)'), Math.PI / 2);
  near(value('COS\uF005(0)', {}, {angleMode:'DEG'}), 90);
  assert.equal(normalizeTiMath('"cos\uF005 mat▶list \uF002"'), '"cos\uF005 mat▶list \uF002"');
  assert.throws(() => value('2\uF002'), {code:'TYPE_ERROR'});
});

test('Sonar shifts a six-row ray trail using augment, subMat and serialized transpose', () => {
  const original = [[1,2],[3,4],[5,6],[7,8],[9,10],[11,12]];
  const actual = value('(augment([[0][0]],subMat(matrice,1,1,5,2)\uF002))\uF002', {matrice:original});
  assert.deepEqual(actual, [[0,0],[1,2],[3,4],[5,6],[7,8],[9,10]]);
  assert.deepEqual(original, [[1,2],[3,4],[5,6],[7,8],[9,10],[11,12]]);
  assert.deepEqual(value('matrice[2]', {matrice:original}), [[3,4]]);
  assert.equal(value('matrice[2,1]', {matrice:original}), 3);
  assert.throws(() => value('matrice[0]', {matrice:original}), {code:'DOMAIN_ERROR'});
  assert.throws(() => value('matrice[7]', {matrice:original}), {code:'INDEX_ERROR'});
});

test('dotP accepts lists and equally oriented vectors, unitV preserves vector shape', () => {
  assert.equal(value('dotP({1,2,3},{4,5,6})'), 32);
  assert.equal(value('dotP([[1,2,3]],[[4,5,6]])'), 32);
  assert.equal(value('dotP([[1][2][3]],[[4][5][6]])'), 32);
  assert.deepEqual(value('unitV([[3,4]])'), [[0.6,0.8]]);
  assert.deepEqual(value('unitV([[3][4]])'), [[0.6],[0.8]]);
  for (const expression of ['dotP([[1,2]],[[1][2]])','dotP([[1,2][3,4]],[[1,2][3,4]])','dotP({1},{1,2})']) assert.throws(() => value(expression), {code:'DIMENSION_ERROR'});
  assert.throws(() => value('unitV([[0,0]])'), {code:'DOMAIN_ERROR'});
  assert.throws(() => value('unitV({3,4})'), {code:'TYPE_ERROR'});
});

test('Sonar angle from inverse cosine of normalized dot product produces real headings', () => {
  const heading = 'cos\uF005(dotP(v1,v2)/(norm(v1)*norm(v2)))*(180/π)';
  near(value(heading, {v1:[[0,25]],v2:[[100,0]]}), 90);
  near(value(heading, {v1:[[30,30]],v2:[[100,0]]}), 45);
  near(value(heading, {v1:[[-25,0]],v2:[[100,0]]}), 180);
});

test('polar vector input converts torpedo movement to rectangular coordinates in each angle mode', () => {
  const rad = value('[[154,106]]+[[7,∠angle_tir]]', {angle_tir:Math.PI/2});
  near(rad[0][0],154); near(rad[0][1],113);
  const deg = value('[[7,∠90]]', {}, {angleMode:'DEG'});
  near(deg[0][0],0); near(deg[0][1],7);
  const grad = value('[[7,∠100]]', {}, {angleMode:'GRAD'});
  near(grad[0][0],0); near(grad[0][1],7);
  const explicit = value('[[7,∠90°]]');
  near(explicit[0][0],0); near(explicit[0][1],7);
  assert.throws(() => value('[[7,∠90,2]]'), {code:'UNSUPPORTED_COORDINATES'});
});

test('explicit degrees and DMS evaluate in the current mode, including stored intermediate angles', () => {
  for (const angleMode of ['RAD','DEG','GRAD']) {
    const context=createMathContext({angleMode});
    const angle=value('90°', {}, {context});
    near(value('sin(a)', {a:angle}, {context}),1);
    near(value('sin(90°+0)', {}, {context}),1);
    near(value("sin(90°0'0'')", {}, {context}),1);
  }
});

test('matrix-to-list conversion is row-major and recognizes serialized aliases without changing strings', () => {
  for (const name of ['mat▶list','mat►list','mat@>list','mat2list']) assert.deepEqual(value(name+'([[1,2][3,4]])'),[1,2,3,4]);
  assert.equal(value('mat▶list([[154,106]])[2]'),106);
  assert.throws(() => value('mat▶list({1,2})'), {code:'TYPE_ERROR'});
  assert.equal(value('"mat▶list([[1,2]])"'), 'mat▶list([[1,2]])');
});

test('expr evaluates entered text through the bounded TI parser and keeps strings inert', () => {
  assert.equal(value('expr(" "&"3"&"6"&"0")'),360);
  assert.equal(value('expr("sqrt(25)+a")', {a:2}),7);
  assert.deepEqual(value('expr("[[1,2][3,4]]")'),[[1,2],[3,4]]);
  assert.throws(() => value('expr(42)'), {code:'TYPE_ERROR'});
  assert.throws(() => value('expr("globalThis.process.exit(0)")'), PrgmError);
  assert.throws(() => value('expr("expr(""expr(""""1"""")"")")', {}, {maxMathSteps:3}), {code:'RESOURCE_LIMIT'});
});

test('getKey preserves no-key, nonblocking and blocking callback contracts and checks its flag', () => {
  const keys=['','t','1','enter','esc'], modes=[], context=createMathContext({getKey:mode=>{modes.push(mode);return keys.shift();}});
  assert.equal(value('getKey()', {}, {context}), '');
  assert.equal(value('getKey(0)', {}, {context}), 't');
  assert.equal(value('getKey(1)', {}, {context}), '1');
  assert.equal(value('getKey(1)', {}, {context}), 'enter');
  assert.equal(value('getKey(0)', {}, {context}), 'esc');
  assert.deepEqual(modes,[0,0,1,1,0]);
  assert.equal(value('getKey()'),'');
  assert.throws(() => value('getKey(2)'), {code:'DOMAIN_ERROR'});
  assert.throws(() => value('getKey(0,1)'), {code:'ARGUMENT_ERROR'});
  assert.throws(() => value('getKey()', {}, {getKey:()=>42}), {code:'TYPE_ERROR'});
});

test('runtime-owned multiline function callback receives evaluated arguments exactly once and remains bounded', () => {
  const context=createMathContext(), calls=[];
  context.functions['θ']={parameters:['a','b'],invoke:args=>{calls.push(args);return args[0]+args[1];}};
  assert.equal(value('θ(2+3,4)', {}, {context}),9);
  assert.deepEqual(calls,[[5,4]]);
  assert.throws(() => value('θ(1)', {}, {context}), {code:'ARGUMENT_ERROR'});
  assert.equal(context.calls,0);
  context.functions.recurse={parameters:[],invoke:()=>value('recurse()', {}, {context})};
  assert.throws(() => value('recurse()', {}, {context}), {code:'EXECUTION_LIMIT'});
  assert.equal(context.calls,0);
});
test('inverse trig tolerates machine-rounding at normalized vector boundaries but rejects real domain errors',()=>{
  assert.doesNotThrow(()=>evaluatePrgmExpression('acos(1.0000000000000002)'));
  assert.throws(()=>evaluatePrgmExpression('acos(1.001)'));
});
