import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {createMathSession} from '../src/prgm/math-api.js';

// Test the same parser and recalculation functions mounted by the sheet UI.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('function spreadsheetColumnName('),app.indexOf('function extractSpreadsheetStateFromRawXml('));
assert.ok(source.startsWith('function spreadsheetColumnName('),'Spreadsheet formula implementation was not found');
const context={window:{TnsTiBasicMath:{createSession:createMathSession}}};
vm.runInNewContext(source+'\nglobalThis.formula=evaluateSpreadsheetFormula;globalThis.recalculate=recalculateSpreadsheetCells;',context);
const mathSession=createMathSession();
const cells=Object.fromEntries([1,2,3,4,5].map((n,i)=>[i+':0',{formula:String(n),data:String(n)}]));
const cases=[
  ['=A1+A2',3],['=A5-A2',3],['=A2*A4',8],['=A4/A2',2],['=1+B1',1],['=B1+A1',1],
  ['=A2^3',8],['=sqrt(A4)',2],['=abs(-A5)',5],
  ['=sum(A1:A5)',15],['=sum(A1:A10)',15],['=SUM($A$1:$A$5)',15],
  ['=sum({1,2,3})',6],['=mean(A1:A5)',3],['=AVERAGE(A1:A5)',3],
  ['=mean(A1:A10)',3],['=median(A1:A5)',3],['=product(A1:A5)',120],
  ['=min(A1:A5)',1],['=max(A1:A5)',5],
  ['=varPop(A1:A5)',2],['=varSamp(A1:A5)',2.5],
  ['=stDevPop(A1:A5)',Math.sqrt(2)],['=stDevSamp(A1:A5)',Math.sqrt(2.5)],
  ['=round(1.234,2)',1.23],['=sin(π/2)',1],
  ['=when(A1>2,10,20)',20],['=IF(A5>2,10,20)',10],
  ['=count(A1:A5)',5],['=count(A1:A10)',5],['=count(2,4,6)',3],['=count({1,"text",3})',2],['=A1>0','true'],['="A1"','A1'],
];
for(const [formula,expected] of cases)test('formula: '+formula,()=>{
 const actual=context.formula(formula,cells,{mathSession});
 if(typeof expected==='number')assert.ok(Math.abs(Number(actual)-expected)<1e-9,formula+': expected '+expected+', got '+actual);
 else assert.equal(actual,expected);
});
test('errors are explicit and a self-reference is rejected',()=>{
 assert.equal(context.formula('=A1/0',cells,{mathSession}),'#DIV/0!');
 assert.equal(context.formula('=sum(A1:A99999)',cells,{mathSession}),'#REF!');
 assert.equal(context.formula('=unknownNative(A1)',cells,{mathSession}),'#NAME?');
 const recursive={'0:0':{formula:'=B1',data:'0'},'0:1':{formula:'=A1',data:'0'}};
 context.recalculate(recursive,{mathSession,changedCellKeys:['0:0']});
 assert.equal(recursive['0:0'].data,'#CIRC!');
 assert.equal(recursive['0:1'].data,'#CIRC!');
});
test('recalculate invalidates all dependent formulas, not unrelated native cache',()=>{
 const data={'0:0':{formula:'2',data:'2'},'0:1':{formula:'=A1*3',data:'6'},
 '0:2':{formula:'=B1+1',data:'7'},'1:0':{formula:'=sum(A1:C1)',data:'15'},
 '1:1':{formula:'=nativeUnsupported(3)',data:'√(5)/4-1/4'}};
 data['0:0'].formula='4';data['0:0'].data='4';
 context.recalculate(data,{mathSession,changedCellKeys:['0:0']});
 assert.equal(data['0:1'].data,'12');assert.equal(data['0:2'].data,'13');
 assert.equal(data['1:0'].data,'29');assert.equal(data['1:1'].data,'√(5)/4-1/4');
});
