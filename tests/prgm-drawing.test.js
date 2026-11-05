import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PrgmDrawing,DRAWING_COMMANDS} from '../src/prgm/drawing.js';
import {createPrgmPreview,runPrgmPreview} from '../src/prgm/runtime.js';

test('the exact CX II sample compiles all graphics commands and keeps the full published buffer',()=>{
  const source=fs.readFileSync(new URL('../examples/cx-ii-drawing-test.tib',import.meta.url),'utf8');
  const result=runPrgmPreview(source);
  assert.equal(result.status,'done',JSON.stringify(result.error));assert.equal(result.name,'doce');
  assert.equal(result.graphics.width,318);assert.equal(result.graphics.height,212);assert.equal(result.graphics.buffering,true);
  assert.equal(result.graphics.commands.length,19);assert.equal(result.graphics.commands.at(-1).text,'RGB / POLY / ARC');
  assert.equal(result.graphics.commands.find(c=>c.kind==='arc'&&c.fill).sweep,270);
  assert.deepEqual(result.graphics.commands.find(c=>c.kind==='point').point,[287,170]);
  assert.equal(result.text,'');
});
test('UseBuffer retains the prior front image until each PaintBuffer and snapshots are independent',()=>{
  const d=new PrgmDrawing();d.execute('drawline',[0,0,10,10]);d.execute('usebuffer',[]);d.execute('setcolor',[255,0,0]);d.execute('fillrect',[20,20,30,30]);
  const original=d.snapshot();assert.equal(original.commands.length,1);assert.equal(original.bufferedOperations,2);
  d.execute('paintbuffer',[]);const published=d.snapshot();assert.equal(published.commands.length,2);assert.deepEqual(published.commands[1].color,[255,0,0]);
  d.execute('clear',[]);assert.equal(d.snapshot().commands.length,2);d.execute('paintbuffer',[]);assert.equal(d.snapshot().commands.length,1);assert.equal(d.snapshot().commands[0].kind,'clear');
  published.commands[0].points[0][0]=999;assert.equal(original.commands[0].points[0][0],0);
});
test('SetWindow transforms only new objects and resets to top-left device coordinates',()=>{
  const d=new PrgmDrawing();d.execute('drawline',[10,20,100,110]);d.execute('setwindow',[0,159,0,106]);d.execute('drawline',[0,0,159,106]);d.execute('fillrect',[10,100,20,10]);d.execute('setwindow',[0,0,0,0]);d.execute('drawline',[0,0,159,106]);
  const c=d.snapshot().commands;assert.deepEqual(c[0].points,[[10,20],[100,110]]);assert.deepEqual(c[1].points,[[0,212],[318,0]]);assert.deepEqual(c[2].rect,[20,12,40,-20]);assert.deepEqual(c[3].points,[[0,0],[159,106]]);
});
test('rounding, RGB, pen styles, open DrawPoly, list variants and all point styles preserve device semantics',()=>{
  const d=new PrgmDrawing();d.execute('setpen',[3,2]);d.execute('drawpoly',[[0.4,10.6,20],[0,10,20]]);d.execute('fillpoly',[0,0,10,0,10,10]);
  const first=d.snapshot().commands[0];assert.equal(first.fill,false);assert.deepEqual(first.points,[[0,0],[11,10],[20,20]]);assert.deepEqual(first.pen,{thickness:3,style:2});
  for(let i=1;i<=13;i++)d.execute('plotxy',[i*5,20,i]);
  assert.equal(d.snapshot().commands.filter(c=>c.kind==='point').length,13);
  assert.deepEqual(d.snapshot().commands[1].points,[[0,0],[10,0],[10,10]]);
});
test('drawing arguments evaluate variables and function calls without evaluating program source as JS',()=>{
  const result=runPrgmPreview('Prgm\nLocal x\n5→x\nSetColor x*10,0,abs(-20)\nDrawLine x,1+2,x^2,round(9.7)\nDrawText 0,20,"x=",x\nEndPrgm');
  assert.equal(result.status,'done',JSON.stringify(result.error));assert.deepEqual(result.graphics.commands[0].points,[[5,3],[25,10]]);assert.deepEqual(result.graphics.commands[0].color,[50,0,20]);assert.equal(result.graphics.commands[1].text,'x=\u20095');
});
test('invalid geometry, command arity, data types and resource limits fail with actual source lines',()=>{
  for(const [source,code] of [
    ['SetColor 256,0,0','DOMAIN_ERROR'],['SetColor "red",0,0','TYPE_ERROR'],['SetPen 0,1','DOMAIN_ERROR'],['SetWindow 1,1,0,2','DOMAIN_ERROR'],['DrawCircle 0,0,-1','DOMAIN_ERROR'],['DrawLine 1,2,3','ARGUMENT_ERROR'],['DrawPoly 1,2,3','ARGUMENT_ERROR'],['DrawPoly {1,2},{1}','DIMENSION_ERROR'],['FillPoly 1,2,3,4','ARGUMENT_ERROR'],['PlotXY 1,2,14','DOMAIN_ERROR'],['Clear 1','ARGUMENT_ERROR'],['UseBuffer 1','ARGUMENT_ERROR'],['PaintBuffer 1','ARGUMENT_ERROR']
  ]){const result=runPrgmPreview('Prgm\n'+source+'\nEndPrgm');assert.equal(result.error?.code,code,source);assert.equal(result.error.line,2,source);}
  const limited=runPrgmPreview('Prgm\nFor i,1,4\nDrawLine i,0,i,5\nEndFor\nEndPrgm',[],{maxDrawingOperations:3});assert.equal(limited.error.code,'RESOURCE_LIMIT');
});
test('Calculator text output remains separate; Request is prohibited after entering graphics mode',()=>{
  const result=runPrgmPreview('Prgm\nDisp "before"\nDrawCircle 30,30,5\nDisp "after"\nEndPrgm');assert.equal(result.text,'before\nafter');assert.equal(result.graphics.commands.length,1);
  const blocked=runPrgmPreview('Prgm\nDrawLine 0,0,2,2\nRequest "input",a\nEndPrgm');assert.equal(blocked.error.code,'GRAPHICS_MODE_REQUEST');assert.equal(blocked.error.line,3);
  const settingsOnly=runPrgmPreview('Prgm\nSetColor 2,3,4\nRequest "input",a\nEndPrgm',[5]);assert.equal(settingsOnly.status,'done');
});
test('Wait yields without replaying prior commands; CLI fast mode skips wall-clock delays',()=>{
  let now=100;const p=createPrgmPreview('DrawLine 0,0,10,10\nWait .5\nDrawCircle 10,10,4',{now:()=>now});let s=p.run();assert.equal(s.graphics.commands.length,1);assert.equal(s.waitRemainingMs,500);assert.equal(p.run().executed,s.executed);now=601;s=p.run();assert.equal(s.status,'done');assert.equal(s.graphics.commands.length,2);
  assert.equal(runPrgmPreview('Wait 10000\nDisp "ok"').text,'ok');
});
test('each advertised drawing operation has an executable example',()=>{
  const samples={clear:[],drawarc:[1,1,10,10,0,180],drawcircle:[1,1,1],drawline:[1,1,5,5],drawpoly:[0,0,5,5],drawrect:[1,1,5,5],drawtext:[1,10,'ok'],fillarc:[1,1,5,5,90,90],fillcircle:[5,5,2],fillpoly:[1,1,5,1,1,5],fillrect:[1,1,5,5],paintbuffer:[],plotxy:[1,1,1],setcolor:[1,2,3],setpen:[1,1],setwindow:[0,0,0,0],usebuffer:[]};
  assert.deepEqual(Object.keys(samples).sort(),[...DRAWING_COMMANDS].sort());for(const [name,args] of Object.entries(samples)){const d=new PrgmDrawing();assert.doesNotThrow(()=>d.execute(name,args),name);}
});
test('each PaintBuffer yields one published animation frame instead of exhausting the loop at once',()=>{
  const p=createPrgmPreview('Prgm\nUseBuffer\nFor n,1,3\nClear\nSetColor n*50,0,0\nFillCircle n*10,10,4\nPaintBuffer\nEndFor\nEndPrgm');
  for(let n=1;n<=3;n++){const state=p.run();assert.equal(state.status,'paused');assert.equal(state.variables.n,n);assert.equal(p.frameYield,true);assert.deepEqual(state.graphics.commands.at(-1).color,[n*50,0,0]);assert.deepEqual(state.graphics.commands.at(-1).center,[n*10,10]);}
  assert.equal(p.run().status,'done');
});
