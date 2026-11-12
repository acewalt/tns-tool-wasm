import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { evaluatePrgmExpression } from '../src/prgm/math.js';

const context = {};
vm.runInNewContext(fs.readFileSync(new URL('../web/graph-preview.js',import.meta.url),'utf8'),context);
const graph=context.TnsGraphPreview;
const xml=`<wdgt xmlns="urn:TI.Problem" xmlns:g="urn:TI.GeoGrapher" type="TI.GeoGrapher"><g:fig><g:objs>
<g:axes_system><g:id>1</g:id><g:umin>−2</g:umin><g:umax>2</g:umax><g:vmin>−1</g:vmin><g:vmax>3</g:vmax><g:srfx>10</g:srfx><g:srfy>20</g:srfy><g:srfw>8</g:srfw><g:srfh>8</g:srfh><g:asho>1</g:asho></g:axes_system>
<g:axis><g:id>2</g:id><g:xaxis/><g:lbl>x</g:lbl></g:axis><g:axis><g:id>3</g:id><g:yaxis/><g:lbl>y</g:lbl></g:axis>
<g:number><g:id>4</g:id><g:axistic><g:ty>0</g:ty></g:axistic><g:num>0.5</g:num></g:number>
<g:expression><g:id>5</g:id><g:expr>fonction</g:expr><g:lbl>f1</g:lbl></g:expression><g:graph><g:id>6</g:id><g:par>1 5 </g:par><g:type>0</g:type><g:alco>255</g:alco><g:asho>1</g:asho></g:graph>
<g:expression><g:id>7</g:id><g:expr>cos(x)</g:expr><g:lbl>f2</g:lbl></g:expression><g:graph><g:id>8</g:id><g:par>1 7 </g:par><g:alco>16711680</g:alco><g:asho>0</g:asho></g:graph>
<g:point><g:id>9</g:id><g:par>2 3</g:par><g:point_ll/><g:x>14</g:x><g:y>22</g:y></g:point>
<g:number><g:id>10</g:id><g:num>1</g:num></g:number><g:circle><g:id>11</g:id><g:par>9 10</g:par><g:circle_pr/></g:circle>
<g:point><g:id>12</g:id><g:par>11</g:par><g:pton_c><g:t>1.0471975511965976</g:t><g:aani>1</g:aani></g:pton_c><g:x>15</g:x><g:y>23.7320508075689</g:y></g:point>
<g:number><g:id>13</g:id><g:par>12 1</g:par><g:coord_p><g:ty>0</g:ty></g:coord_p><g:lbl>ca</g:lbl><g:num>0.5</g:num></g:number>
<g:line><g:id>14</g:id><g:par>2 12</g:par><g:perpline_lp/></g:line>
<g:point><g:id>15</g:id><g:par>14 2</g:par><g:point_ll/><g:x>15</g:x><g:y>22</g:y></g:point>
</g:objs></g:fig></wdgt>`;

test('native graph parser retains all curves, actual axes window and tick interval',()=>{
  const state=graph.parseXml(xml);
  assert.equal(state.viewport.xmin,-2);assert.equal(state.viewport.ymax,3);assert.equal(state.tickX,.5);
  assert.equal(state.curves.length,2);assert.equal(state.curves[0].id,'6');assert.equal(state.curves[0].formula,'fonction');assert.equal(state.curves[0].expressionId,'5');assert.equal(state.curves[1].visible,false);
  assert.equal(state.animationAvailable,true);
  const point=graph.paperToWorld(state,15,23.7320508075689);
  assert.ok(Math.abs(point.x-.5)<1e-12);assert.ok(Math.abs(point.y-Math.sqrt(3)/2)<1e-12);
  assert.ok(Math.abs(graph.worldToPaper(state,point.x,point.y).y-23.7320508075689)<1e-10);
});

test('wheel zoom preserves the world point under the pointer',()=>{
  const before={xmin:-2,xmax:6,ymin:-3,ymax:5},after=graph.zoomViewport(before,.5,.2,.7);
  assert.equal(after.xmax-after.xmin,4);assert.equal(after.ymax-after.ymin,4);
  assert.ok(Math.abs(before.xmin+8*.2-(after.xmin+4*.2))<1e-12);
  assert.ok(Math.abs(before.ymax-8*.7-(after.ymax-4*.7))<1e-12);
});

test('curves resolve stored symbolic expressions and report unsupported calls instead of drawing zero',()=>{
  const state=graph.parseXml(xml);
  const sampled=graph.sampleCurve(state.curves[0],state.viewport,9,evaluatePrgmExpression,{fonction:'coefficient*x^2',coefficient:2});
  assert.equal(sampled.errors.length,0);assert.equal(sampled.points[0].y,8);assert.equal(sampled.points[4].y,0);
  const invalid=graph.sampleCurve({formula:'not_a_TI_function(x)'},state.viewport,9,evaluatePrgmExpression);
  assert.ok(invalid.points.every(point=>point===null));assert.match(invalid.errors[0],/not_a_TI_function/i);
  assert.throws(()=>graph.expandFormula('a',{a:'b',b:'a'}),/Circular graph variable/);
});

test('moving a constrained point updates dependent intersections and named coordinates',()=>{
  const state=graph.parseXml(xml),geometry=graph.geometry(state);
  const initial=geometry.point('12'),projection=geometry.point('15');
  assert.ok(Math.abs(initial.x-.5)<1e-12);assert.ok(Math.abs(initial.y-Math.sqrt(3)/2)<1e-12);
  assert.ok(Math.abs(projection.x-.5)<1e-12);assert.equal(projection.y,0);
  const animated=state.objects.find(object=>object.id==='12');animated.children.pton_c.t=String(Math.PI);
  assert.ok(Math.abs(geometry.point('12').x+1)<1e-12);assert.ok(Math.abs(geometry.point('15').x+1)<1e-12);
  assert.ok(Math.abs(geometry.number(state.objects.find(object=>object.id==='13'))+1)<1e-12);
});

test('saving a changed graph preserves other curves and unrelated native construction XML',()=>{
  const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
  const start=app.indexOf('async function saveGraphWidgetToStage('),stop=app.indexOf('\nfunction showGraphModal(',start);
  let python,globals={};const state=graph.parseXml(xml);state.curves[0].formula='x^3';state.viewport={xmin:-4,xmax:4,ymin:-2,ymax:6};
  const setup={window:{TnsGraphPreview:graph},ensureXmlStageCopy:async()=>{},extractGraphStateFromRawXml:raw=>({...graph.parseXml(raw),name:'f1',formula:'fonction'}),normalizeGraphFormulaInput:value=>String(value),xmlDoctor:{sourcePath:'/source',stagePath:'/stage'},pyodide:{globals:{set:(key,value)=>globals[key]=value},runPythonAsync:async source=>{python=source;return '{}';}}};
  vm.runInNewContext(app.slice(start,stop)+'\nglobalThis.save=saveGraphWidgetToStage;',setup);
  return setup.save({file:'/source/Problem1.xml',path:'/prob/card/wdgt',raw_xml:xml},state).then(()=>{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tns-graph-save-')),file=path.join(dir,'Problem1.xml');
    fs.writeFileSync(file,`<prob xmlns="urn:TI.Problem"><sym><e t="6"><n>f1</n><p>x</p><v>fonction</v></e><e t="6"><n>f2</n><p>x</p><v>cos(x)</v></e></sym><card><clay>5</clay>${xml}<wdgt type="TI.Notepad"><data>untouched</data></wdgt></card></prob>`);
    const defs=JSON.stringify({...globals,wasm_graph_save_file:file});
    const script=`import json,sys,xml.etree.ElementTree as ET\nfrom pathlib import Path\nsys.path.insert(0,${JSON.stringify(path.resolve('editor_XML'))})\nglobals().update(json.loads(${JSON.stringify(defs)}))\n`+python.replace(/source_root=Path\("\/source"\); stage_root=Path\("\/stage"\)/,`source_root=Path(${JSON.stringify(dir)}); stage_root=Path(${JSON.stringify(dir)})`)+`\nroot=ET.parse(${JSON.stringify(file)}).getroot()\nns={'p':'urn:TI.Problem','g':'urn:TI.GeoGrapher'}\nexprs=root.findall('.//g:expression/g:expr',ns)\nassert [n.text for n in exprs]==['x^3','cos(x)']\nassert root.find('.//p:wdgt[@type="TI.Notepad"]/p:data',ns).text=='untouched'\nassert root.find('.//p:card/p:clay',ns).text=='5'\nassert root.find('.//g:axes_system/g:umin',ns).text=='-4'\nassert root.find('.//g:point/g:point_ll',ns) is not None\nassert root.find('.//p:e[p:n="f2"]/p:v',ns).text=='cos(x)'\nprint('ok')`;
    const result=spawnSync(process.env.PYTHON||'python',['-c',script],{encoding:'utf8'});
    try{assert.equal(result.status,0,result.stderr||result.stdout);}finally{fs.rmSync(dir,{recursive:true,force:true});}
  });
});
