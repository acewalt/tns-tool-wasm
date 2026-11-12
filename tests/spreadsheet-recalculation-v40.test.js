import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {createMathSession} from '../src/prgm/math-api.js';

const app = fs.readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');
const source = app.slice(app.indexOf('function spreadsheetColumnName('), app.indexOf('function extractSpreadsheetStateFromRawXml('));
const context = {window: {TnsTiBasicMath: {createSession: createMathSession}}};
vm.runInNewContext(source + '\nglobalThis.formula=evaluateSpreadsheetFormula;globalThis.recalculate=recalculateSpreadsheetCells;', context);

const nativeCells = () => ({
  '0:0': {formula: '=near(msign(sa)*cos\uF005(ca))', data: '2*π/5', globalName: 'a'},
  '1:0': {formula: '=cos(a1)', data: '√(5)/4-1/4', globalName: 'cb'},
  '2:0': {formula: '=sin(a1)', data: '√(2*(√(5)+5))/4', globalName: 'sb'},
});

test('editing a dependent cell uses the unchanged native cached input instead of recalculating unsupported helpers', () => {
  const cells = nativeCells(), mathSession = createMathSession();
  cells['1:0'].formula = '=cos(a1)+1';
  context.recalculate(cells, {mathSession, changedCellKeys: ['1:0']});
  assert.equal(cells['0:0'].data, '2*π/5');
  assert.ok(Math.abs(Number(cells['1:0'].data) - (Math.cos(2 * Math.PI / 5) + 1)) < 1e-10);
  assert.equal(cells['2:0'].data, '√(2*(√(5)+5))/4');
  assert.equal(context.formula('=sin(a1)', cells, {mathSession}), '0.951056516295');
});

test('changed values invalidate their transitive dependents and range formulas, including deletions', () => {
  const mathSession = createMathSession();
  const cells = {'0:0': {formula:'5', data:'5'}, '0:1': {formula:'=A1+1', data:'2'}, '0:2': {formula:'=B1+1', data:'3'}, '1:0': {formula:'=sum(A1:C1)', data:'6'}, '1:1': {formula:'=unknownNative(2)', data:'√(2)'}};
  context.recalculate(cells, {mathSession, changedCellKeys:['0:0']});
  assert.equal(cells['0:1'].data, '6'); assert.equal(cells['0:2'].data, '7'); assert.equal(cells['1:0'].data, '18');
  assert.equal(cells['1:1'].data, '√(2)');
  delete cells['0:0'];
  context.recalculate(cells, {mathSession, changedCellKeys:['0:0']});
  assert.equal(cells['0:1'].data, '1'); assert.equal(cells['0:2'].data, '2'); assert.equal(cells['1:0'].data, '3');
});

test('committing an unchanged formula keeps native exact results; cell-like function names remain callable', () => {
  const cells = nativeCells(), mathSession = createMathSession();
  context.recalculate(cells, {mathSession, changedCellKeys:[]});
  assert.equal(cells['1:0'].data, '√(5)/4-1/4');
  mathSession.evaluate('Define f1(x)=2*x');
  assert.equal(context.formula('=f1(3)', cells, {mathSession}), '6');
});

test('long one-column ranges and cycles fail explicitly without unbounded evaluation', () => {
  const mathSession = createMathSession();
  assert.equal(context.formula('=sum(A1:A99999)', {}, {mathSession}), '#REF!');
  const cells = {'0:0':{formula:'=B1',data:'1'},'0:1':{formula:'=A1',data:'1'}};
  context.recalculate(cells, {mathSession, changedCellKeys:['0:0']});
  assert.equal(cells['0:0'].data, '#CIRC!'); assert.equal(cells['0:1'].data, '#CIRC!');
});
