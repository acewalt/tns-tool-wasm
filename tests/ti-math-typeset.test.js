import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../ti-math-typeset.js',import.meta.url),'utf8'),context);
const math=context.window.TnsMathTypeset;
test('all supplied calculator templates produce real two-dimensional MathML',()=>{
  const cases=[['((1)/(1))','mfrac'],['1^(1)','msup'],['√(1)','msqrt'],['root(1,1)','mroot'],['\uF03F^(1)','msup'],['log(1,1)','msub'],['piecewise(1,1,1,1)','mtable'],['piecewise(1,1,1,1,1,1)','mtable'],['system(1,1)','mtable'],['abs(1)','mo'],["1°1'1''",'″'],['[[1,1][1,1]]','mtable'],['[1,1]','mtable'],['[[1][1]]','mtable'],['[[1,1,1][1,1,1][1,1,1]]','mtable'],['∑(1,1,1,1)','munderover'],['∏(1,1,1,1)','munderover'],['\uF008(1,1)','mfrac'],['\uF008(1,1,2)','msup'],['\uF008(1,1,1)','mfrac'],['∫(1,1,1,1)','msubsup'],['∫(1,1)','∫'],['lim(1,1,1,1)','munder'],['1₁','msub']];
  for(const [source,tag] of cases){const result=math.parse(source);assert.equal(result.valid,true,source);assert(result.markup.includes(tag),source);assert(!result.markup.includes('\uF008')&&!result.markup.includes('\uF03F'),source);assert.equal(result.source,source);}
});
test('nested expressions keep fraction, root, exponent and matrix structure',()=>{
  const output=math.render('[[root((a+b)/c,3),d(x^2,x)][∫(x,x,0,2),lim(sin(x)/x,x,0)]]');
  for(const tag of ['mtable','mfrac','mroot','msup','msubsup','munder'])assert(output.includes(tag),tag);
});
test('invalid input remains literal and markup is always escaped',()=>{
  assert.equal(math.parse('root(1,').valid,false);
  assert(!math.render('"<img src=x onerror=alert(1)>"').includes('<img'));
  assert(!math.renderLine('Disp "<script>"').includes('<script>'));
  assert(math.renderLine('Prgm').includes('<code>Prgm</code>'));
});
