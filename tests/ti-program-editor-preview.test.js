import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(new URL('../web/ti-program-editor-preview.js', import.meta.url), 'utf8'), context);
const editor = context.window.TnsProgramEditorPreview;

test('Program Editor declarations come from metadata, independent of editable source', () => {
  assert.equal(editor.formatDeclaration({name:'dos',parameters:'',library_access:''}), 'Define dos()=');
  assert.equal(editor.formatDeclaration({name:'renamed',parameters:['x','y'],library_access:'LibPub '}), 'Define LibPub renamed(x,y)=');
  assert.equal(editor.formatDeclaration({name:'private',parameters:'x',access:'LibPriv'}), 'Define LibPriv private(x)=');
  assert.equal(editor.formatDeclaration({name:'test',library_access:'arbitrary command'}), 'Define test()=');
});
test('only an outer stored Define wrapper is removed; nested program definitions remain intact', () => {
  const body = 'Prgm\nDefine nested()=Prgm\nDisp 1\nEndPrgm\nnested()\nEndPrgm';
  assert.equal(editor.stripDeclaration('Define LibPub sonar()=\n'+body),body);
  assert.equal(editor.stripDeclaration(body),body);
  assert.equal(editor.stripDeclaration('\nPrgm\nDisp 1\nEndPrgm\n'),'\nPrgm\nDisp 1\nEndPrgm\n');
  assert.equal(editor.stripDeclaration('Define f(x)=sin(x)'),'Define f(x)=sin(x)');
});
test('the TI source palette separates commands, variables, strings, operators and malformed strings', () => {
  assert.match(editor.highlightLine('Local x'),/ti-pe-keyword">Local<.*ti-pe-identifier">x</);
  assert.match(editor.highlightLine('x:=-15'),/ti-pe-identifier">x<.*ti-pe-operator">:<.*ti-pe-operator">=<.*ti-pe-operator">-<.*ti-pe-number">15</);
  assert.match(editor.highlightLine('Disp "If <script>"'),/ti-pe-keyword">Disp<.*ti-pe-string">&quot;If &lt;script&gt;&quot;</);
  assert.doesNotMatch(editor.highlightLine('Disp "If <script>"'),/<script>|ti-pe-keyword">If</);
  assert.match(editor.highlightLine('Disp "unfinished'),/ti-pe-invalid-string/);
  assert.match(editor.highlightLine('© Local x'),/ti-pe-comment/);
});
test('the calculator editor counter reports editable body lines separately from wrapper delimiters', () => {
  const source='Prgm\nLocal x\nx:=-15\nDisp abs(x)\nEndPrgm';
  assert.equal(editor.lineCounter(source,source.indexOf('Disp')+4).current,3);
  assert.equal(editor.lineCounter(source,source.length).total,3);
  assert.equal(editor.lineCounter(source,0).current,1);
  assert.equal(editor.lineCounter('Prgm\n\nEndPrgm',6).total,1);
  assert.equal(editor.lineCounter('',0).total,1);
});
test('mathematical editor strings recover their literal quotes from source without changing Calculator formatting', () => {
  assert.equal(editor.quotedLiteralFor('Disp "hola"','hola'),'"hola"');
  assert.equal(editor.quotedLiteralFor('piecewise("yes",x>0,"no",x<0)','yes'),'"yes"');
  assert.equal(editor.quotedLiteralFor('Disp "<script>"','<script>'),'"<script>"');
  assert.equal(editor.quotedLiteralFor('f("one","two")','two'),'"two"');
  assert.equal(editor.quotedLiteralFor('Disp "one","two"','one","two'),'"one","two"');
  assert.equal(editor.quotedLiteralFor('Disp hola','hola'),null);
  assert.equal(editor.quotedLiteralFor('Disp "other"','hola'),null);
});

test('embedded Program Editor shortcuts stay in their pane and Escape preserves its surface', () => {
  const code = fs.readFileSync(new URL('../web/ti-program-editor-preview.js', import.meta.url), 'utf8');
  const start = code.indexOf('    function keys(event) {'), end = code.indexOf('    const navigation =', start);
  const calls = [], options = {embedded:true};
  const ctx = {closed:false, options, overlay:{contains:target=>target.owned}, source:{}, action:kind=>calls.push(kind), close:()=>calls.push('close')};
  vm.runInNewContext(code.slice(start,end)+'\nglobalThis.keys=keys;',ctx);
  const press = (key, target, extra={}) => ctx.keys({key,target,preventDefault(){calls.push('prevent');},stopImmediatePropagation(){calls.push('stop');},...extra});
  const own = {owned:true,closest:()=>null}, peer = {owned:false,closest:()=>null}, popup = {owned:true,closest:()=>({})};
  press('Escape',own); assert.deepEqual(calls,[]);
  press('r',peer,{ctrlKey:true}); press('r',popup,{ctrlKey:true}); assert.deepEqual(calls,[]);
  press('r',own,{ctrlKey:true}); assert.deepEqual(calls,['prevent','stop','run']);
  calls.length=0; options.embedded=false; press('Escape',own); assert.deepEqual(calls,['prevent','stop','close']);
});
