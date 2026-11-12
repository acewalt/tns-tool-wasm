import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createMathSession } from '../src/prgm/math-api.js';
import { evaluatePrgmExpression } from '../src/prgm/math.js';

const scope = {};
vm.runInNewContext(fs.readFileSync(new URL('../web/graph-preview.js', import.meta.url), 'utf8'), scope);
const graph = scope.TnsGraphPreview;
const math = { evaluate: evaluatePrgmExpression };

test('redrawing curves has a per-sample budget and does not exhaust the shared Calculator', () => {
  const session = createMathSession();
  session.context.steps = 99999;
  for (let i = 0; i < 3000; i++) {
    const x = i / 100;
    assert.equal(graph.evaluateSample('sin(x)', { x }, session, math), Math.sin(x));
  }
  assert.equal(session.context.steps, 99999);
  assert.equal(graph.evaluateSample('1/(abs(x^2-1)+x^2-1)', { x: 2 }, session, math), 1 / 6);
  assert.throws(() => graph.evaluateSample('unsupported(x)', { x: 1 }, session, math), /unsupported/);
});

test('resizing preserves the ratio of horizontal and vertical world-unit scales', () => {
  const original = { xmin: -2, xmax: 2, ymin: -1, ymax: 1 };
  const expanded = graph.fittedViewport(original, 2, 800 / 600);
  assert.equal(400 / (original.xmax-original.xmin) / (200/(original.ymax-original.ymin)), 1);
  assert.ok(Math.abs(800 / (expanded.xmax-expanded.xmin) / (600/(expanded.ymax-expanded.ymin)) - 1) < 1e-12);
  const restored = graph.fittedViewport(expanded, 800 / 600, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), original);
});

test('curve dragging translates its formula in world coordinates', () => {
  const formula = graph.translatedFormula('sin(x)', 2, -3);
  assert.ok(Math.abs(evaluatePrgmExpression(formula, { x: 3 }) - (Math.sin(1) - 3)) < 1e-12);
});
