import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {createMathSession} from '../src/prgm/math-api.js';

const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('function spreadsheetColumnName('),app.indexOf('function extractSpreadsheetStateFromRawXml('));
const context={window:{TnsTiBasicMath:{createSession:createMathSession}}};
vm.runInNewContext(source+'\nglobalThis.formula=evaluateSpreadsheetFormula;globalThis.recalculate=recalculateSpreadsheetCells;',context);
const toolsContext={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../web/spreadsheet-tools.js',import.meta.url),'utf8'),toolsContext);

test('spreadsheet formulas use selected problem variables, ranges and referenced formulas',()=>{
  const math=createMathSession({variables:{angle:Math.PI/3}});
  const cells={'0:0':{formula:'2',data:'2'},'0:1':{formula:'3',data:'3'},'1:0':{formula:'=A1+B1',data:'5'},'1:1':{formula:'4',data:'4'}};
  assert.equal(context.formula('=sum(A1:B2)',cells,{mathSession:math}),'14');
  assert.equal(context.formula('=cos(angle)',cells,{mathSession:math}),'0.5');
  assert.equal(context.formula('=AVERAGE(A1:B1)',cells,{mathSession:math}),'2.5');
  assert.equal(context.formula('=A1+A2',cells,{mathSession:math}),'7');
  assert.equal(context.formula('="A1"',cells,{mathSession:math}),'A1','quoted cell-like text is literal');
  const cycle={'0:0':{formula:'=B1'},'0:1':{formula:'=A1'}};
  assert.equal(context.formula('=A1',cycle,{mathSession:math}),'#CIRC!');
});

test('opening or saving a sheet does not replace cached exact answers with approximation/errors',()=>{
  const cells={'0:0':{formula:'=someNativeCASFunction(2)',data:'√(5)/4-1/4',rawXml:'native formatting'}};
  context.recalculate(cells,{preserveCached:true});
  assert.equal(cells['0:0'].data,'√(5)/4-1/4');
  context.recalculate(cells);
  assert.equal(cells['0:0'].data,'#NAME?');
  assert.equal(cells['0:0'].rawXml,'native formatting');
});

test('range selection is independent of drag direction and clipboard tables retain blank cells',()=>{
  assert.deepEqual(JSON.parse(JSON.stringify(toolsContext.window.TnsSpreadsheetTools.bounds({anchorRow:4,anchorCol:3,row:1,col:0}))),{top:1,bottom:4,left:0,right:3});
  assert.deepEqual(JSON.parse(JSON.stringify(toolsContext.window.TnsSpreadsheetTools.parseTable('1\t\t3\r\n4\t5\t6\r\n'))),[['1','','3'],['4','5','6']]);
});

test('TI arbitrary integer glyph renders as n without altering authoritative source',()=>{
  const typeset={window:{}};
  vm.runInNewContext(fs.readFileSync(new URL('../web/ti-math-typeset.js',import.meta.url),'utf8'),typeset);
  const expression='-√(2)/(√((2*\uF04249-1)*π))';
  const result=typeset.window.TnsMathTypeset.parse(expression);
  assert.equal(result.source,expression);assert.equal(result.valid,true);
  assert.match(result.markup,/n49/);assert.doesNotMatch(result.markup,/\uF042/);assert.match(result.markup,/<mfrac>/);
});
