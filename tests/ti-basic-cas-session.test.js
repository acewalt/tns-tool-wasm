import test from 'node:test';
import assert from 'node:assert/strict';
import { createMathSession } from '../src/prgm/math-api.js';

function backend() {
  const calls = []; let loads = 0;
  return {
    calls,
    get loads() { return loads; },
    ensureReady: async () => { loads++; return true; },
    supportsFunction: name => ['integral', 'd', 'sin'].includes(name) || name.startsWith('tnscalcs'),
    evaluate(expression) {
      calls.push(expression);
      const value = expression.includes(':=') ? 'Done' : expression.startsWith('sin(') ? expression : 'x^2/2';
      return { handled: true, value, raw: value, error: null };
    },
    getStatus: () => ({ backend: 'test CAS' }),
  };
}

test('numeric matrix entry never starts the CAS and genuine domain errors do not fall back', async () => {
  const cas = backend(), session = createMathSession({ cas });
  assert.deepEqual((await session.evaluateAsync('newMat(2,3)')).value, [[0, 0, 0], [0, 0, 0]]);
  await assert.rejects(session.evaluateAsync('log(1,1)'), error => error.code === 'DOMAIN_ERROR');
  assert.equal(cas.loads, 0);
  assert.deepEqual(cas.calls, []);
});

test('independent Calculator contexts namespace symbolic definitions before shared CAS evaluation', async () => {
  const cas = backend(), a = createMathSession({ cas }), b = createMathSession({ cas });
  await a.evaluateAsync('a:=integral(x,x)');
  await a.evaluateAsync('a+1');
  const first = cas.calls.filter(call => call.includes(':=')).map(call => /^([\w]+):=/.exec(call)?.[1]).filter(Boolean);
  cas.calls.length = 0;
  await b.evaluateAsync('a:=integral(x,x)');
  await b.evaluateAsync('a+1');
  const second = cas.calls.filter(call => call.includes(':=')).map(call => /^([\w]+):=/.exec(call)?.[1]).filter(Boolean);
  assert.ok(first.length > 0 && second.length > 0);
  assert.ok([...first, ...second].every(name => /^[A-Za-z][A-Za-z0-9]*$/.test(name) && name !== 'a'));
  assert.ok(second.every(name => !first.includes(name)));
  cas.calls.length = 0;
  await a.evaluateAsync('DelVar a'); await a.evaluateAsync('integral(x,x)');
  const purged = cas.calls.filter(call => /^purge\(/.test(call)).map(call => /^purge\((\w+)\)/.exec(call)?.[1]);
  assert.ok(purged.some(name => first.includes(name)), 'Deletion purges the same stable internal binding');
});

test('unchanged valid symbolic calls remain valid while unknown nested calls fail', async () => {
  const cas = backend(), session = createMathSession({ cas });
  assert.equal((await session.evaluateAsync('sin(x)')).display, 'sin(x)');
  await assert.rejects(session.evaluateAsync('1+unknownMathFunction(2)'), error => error.code === 'UNSUPPORTED_FUNCTION');
  assert.ok(!cas.calls.some(call => call.includes('unknownMathFunction')));
});

test('unavailable CAS reports an explicit failure rather than echoing an answer', async () => {
  const session = createMathSession({ cas: { ensureReady: async () => false, getStatus: () => ({ error: 'offline failure' }) } });
  await assert.rejects(session.evaluateAsync('integral(x,x)'), error => error.code === 'CAS_UNAVAILABLE' && error.message.includes('offline failure'));
});
