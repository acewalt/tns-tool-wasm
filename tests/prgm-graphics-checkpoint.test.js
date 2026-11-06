import test from 'node:test';
import assert from 'node:assert/strict';
import {PrgmDrawing} from '../src/prgm/drawing.js';

const bitmap=()=>new Uint8ClampedArray(318*212*4);
test('optional renderer checkpoints keep long overdraw bounded without dropping its prior frame',()=>{
  const checkpoints=[];
  const d=new PrgmDrawing({maxDrawingOperations:3,rasterizeGraphics:frame=>{
    checkpoints.push({commands:frame.commands.length,base:frame.raster?.[0]||0});
    const pixels=bitmap();pixels[0]=(frame.raster?.[0]||0)+frame.commands.length;return pixels;
  }});
  for(let i=0;i<100;i++)d.execute('drawline',[i,0,i,10]);
  const snapshot=d.snapshot();
  assert.equal(snapshot.operationCount,100);assert.equal(snapshot.commands.length,1);
  assert.equal(snapshot.raster[0],99);assert.equal(checkpoints.length,33);
  assert.deepEqual(checkpoints.slice(0,2),[{commands:3,base:0},{commands:3,base:3}]);
  snapshot.raster[0]=0;assert.equal(d.snapshot().raster[0],99);
  d.execute('clear',[]);assert.equal(d.snapshot().raster,undefined);assert.equal(d.snapshot().commands.length,1);
});
test('a checkpoint stays in its back buffer until PaintBuffer publishes an independent copy',()=>{
  const d=new PrgmDrawing({maxDrawingOperations:2,rasterizeGraphics:()=>{const a=bitmap();a[0]=42;return a;}});
  d.execute('drawline',[0,0,10,10]);d.execute('usebuffer',[]);
  d.execute('drawline',[1,0,1,5]);d.execute('drawline',[2,0,2,5]);
  assert.equal(d.snapshot().raster,undefined);assert.equal(d.snapshot().commands.length,1);
  d.execute('paintbuffer',[]);assert.equal(d.snapshot().raster[0],42);assert.equal(d.snapshot().commands.length,1);
  d.execute('clear',[]);assert.equal(d.snapshot().raster[0],42);
  d.execute('paintbuffer',[]);assert.equal(d.snapshot().raster,undefined);
});
test('missing or malformed rasterizers preserve explicit resource failures',()=>{
  for(const options of [{maxDrawingOperations:1},{maxDrawingOperations:1,rasterizeGraphics:()=>[1,2]}]){
    const d=new PrgmDrawing(options);d.execute('drawline',[0,0,1,1]);
    assert.throws(()=>d.execute('drawline',[1,1,2,2]),e=>e.code==='RESOURCE_LIMIT');
  }
});
