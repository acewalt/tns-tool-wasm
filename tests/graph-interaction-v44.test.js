import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { evaluatePrgmExpression } from '../src/prgm/math.js';

const scope={};
vm.runInNewContext(fs.readFileSync(new URL('../web/graph-preview.js',import.meta.url),'utf8'),scope);
const graph=scope.TnsGraphPreview;
const near=(actual,expected,tolerance=1e-10)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);

test('wave coefficients recognize equivalent affine arguments and reject non-wave guesses',()=>{
  for(const source of ['2*sin(3*x+1)-4','2*(sin((x+1/3)*3))-4','sin(3*x+1)*2-4']){
    const model=graph.waveTransform(source);assert.ok(model,source);
    near(model.amplitude,2);near(model.frequency,3);near(model.phase,1);near(model.offset,-4);
  }
  const scoped=graph.waveTransform('a*cos(b*x+c)+d',{a:3,b:.5,c:1,d:-2});
  near(scoped.amplitude,3);near(scoped.frequency,.5);near(scoped.phase,1);near(scoped.offset,-2);
  for(const source of ['sin(x^2)','sin(x)+cos(x)','1/sin(x)','custom(x)','sin(x)*x'])assert.equal(graph.waveTransform(source),null,source);
  assert.equal(graph.affineFormula('globalThis.process.exit()'),null);
});

test('repeated gestures and native formula reloads do not nest sine translations',()=>{
  let formula='sin(x)';
  for(let i=0;i<100;i++){
    formula=graph.translatedFormula(formula,.25,-.1);
    assert.ok(formula.length<40,formula);
    assert.equal((formula.match(/sin\(/g)||[]).length,1);
  }
  assert.equal(formula,'sin(x-25)-10');
  near(evaluatePrgmExpression(formula,{x:26}),Math.sin(1)-10);
});

test('crest dragging changes amplitude and wavelength, with a fixed adjacent zero',()=>{
  const model=graph.waveTransform('sin(x)'),anchor=graph.waveDragAnchor(model,{x:Math.PI/2,y:1});assert.ok(anchor);
  const changed=graph.reshapeWave(anchor,{x:Math.PI,y:2});
  near(changed.amplitude,2);near(changed.frequency,.5);near(changed.phase,0);
  assert.equal(graph.transformFormula(changed),'2*sin(0.5*x)');
  near(evaluatePrgmExpression(graph.transformFormula(changed),{x:Math.PI}),2);
  assert.equal(graph.waveDragAnchor(model,{x:0,y:0}),null,'a slope uses translation');
  const translated=graph.translatedTransform(changed,2,-3);
  assert.equal(graph.transformFormula(translated),'2*sin(0.5*x-1)-3');
  near(evaluatePrgmExpression(graph.transformFormula(translated),{x:2}),-3);
});

test('shape dragging respects degrees, grads, cosine, phase and vertical offsets',()=>{
  for(const [mode,crest] of [['RAD',Math.PI/2],['DEG',90],['GRAD',100]]){
    const source='3*sin(2*x+10)+4',model=graph.waveTransform(source),point={x:(crest-10)/2,y:7};
    const anchor=graph.waveDragAnchor(model,point,mode);assert.ok(anchor,mode);
    const target={x:anchor.originX+(point.x-anchor.originX)*2,y:10},changed=graph.reshapeWave(anchor,target);
    near(changed.amplitude,6);near(changed.frequency,1);
    near(changed.phase,anchor.originPhase-changed.frequency*anchor.originX);
    near(evaluatePrgmExpression(graph.transformFormula(changed),{x:target.x},{angleMode:mode}),10,1e-5);
  }
  const model=graph.waveTransform('2*cos(x-1)-3'),anchor=graph.waveDragAnchor(model,{x:1,y:-1});assert.ok(anchor);
  const changed=graph.reshapeWave(anchor,{x:anchor.originX+(1-anchor.originX)*.5,y:1});
  near(changed.frequency,2);near(changed.amplitude,4);
  near(evaluatePrgmExpression(graph.transformFormula(changed),{x:anchor.originX+(1-anchor.originX)*.5}),1,1e-5);
});

test('ordinary curves translate from one retained source while zero remains a real curve',()=>{
  let model={kind:'translation',base:'x^2+1',dx:0,dy:0};
  for(let i=0;i<100;i++)model=graph.translatedTransform(model,.1,.25);
  const formula=graph.transformFormula(model);assert.equal(formula,'((x-10)^2+1)+25');
  near(evaluatePrgmExpression(formula,{x:11}),27);
  assert.equal(graph.parseXml('<wdgt><fig><objs><expression><id>2</id><expr>0</expr><lbl>f1</lbl></expression></objs></fig></wdgt>').curves[0].formula,'0');
});
