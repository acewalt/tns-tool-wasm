import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeLuaImport,generateImportedLua} from '../src/lua-visual-builder/importer.js';
import {instrumentCaptureSource,projectFromCapture} from '../src/lua-visual-builder/capture.js';
import {runLuaPreview} from '../src/api/index.js';
import {runPrgmPreview} from '../src/prgm/runtime.js';
import {createLuaPreview} from '../src/lua/preview.js';

function captured(source,operations){
  const report=analyzeLuaImport(source),sites=Object.values(instrumentCaptureSource(source).sites);
  return projectFromCapture(report,{format:'tns-lua-capture-session',screens:[{id:'one',name:'One',frame:{size:{width:320,height:212},operations:operations.map((op,i)=>({order:i,style:{font:12,color:'#000000'},...op,source:sites.find(s=>s.method===op.method)}))}}]});
}
test('class/helper captured labels edit their unique declaration while preserving native callbacks',async()=>{
  const source='local title="Original title"\nlocal function label(gc,s,x,y) gc:drawString(s,x,y,"top") end\nfunction on.paint(gc) label(gc,title,20,30) end\nfunction on.enterKey() title="Entered" end';
  const p=captured(source,[{method:'drawString',args:['Original title',20,30,'top']}]),c=p.pages[0].components[0];
  assert.equal(c.locked,false);assert.equal(c.sourceBinding.args[0].literal,true);
  c.text='Edited title';c.x+=5;
  const converted=generateImportedLua(p,{metadata:false});assert.ok(converted.includes('local title="Edited title"'));assert.ok(converted.includes('(x)+5'));assert.ok(converted.endsWith('function on.enterKey() title="Entered" end'));
  const a=await runLuaPreview(converted,{actions:[{type:'paint'}]});assert.equal(a.success,true);assert.ok(a.final.texts.includes('Edited title'));
  const b=await runLuaPreview(converted,{actions:[{type:'event',event:'enterKey'},{type:'paint'}]});assert.ok(b.final.texts.includes('Entered'));
});
test('shared helper positions and ambiguous strings are not silently changed for a single instance',()=>{
  const source='local title="Repeated"\nlocal title2="Repeated"\nlocal function row(gc,s,x,y) gc:drawString(s,x,y,"top") end\nfunction on.paint(gc) row(gc,title,10,10) row(gc,title2,10,30) end';
  const p=captured(source,[{method:'drawString',args:['Repeated',10,10,'top']},{method:'drawString',args:['Repeated',10,30,'top']}]);
  assert.equal(generateImportedLua(p,{metadata:false}),source);
  assert.ok(p.pages[0].components.every(c=>c.locked));
});
test('Disp resolves numeric coordinates and retains symbolic matrices, with domain and Local errors intact',()=>{
  const result=runPrgmPreview('Prgm\nLocal xa,xb\n20→xa\n50→xb\nDisp "AB=",[[x(b)-x(a)][y(b)-y(a)]],"=",[[xb-xa][4]]\nDisp [[x=30*t+xa][y=4*t+26]]\nEndPrgm');
  assert.equal(result.status,'done',result.error?.message);assert.match(result.text,/x\(b\)-x\(a\)/);assert.match(result.text,/\[\[30\]\[4\]\]/);assert.match(result.text,/x=\(30\*t\)\+20/);assert.equal(result.output[0].segments[1].kind,'math');
  assert.equal(runPrgmPreview('Prgm\nLocal x\nDisp [[x]]\nEndPrgm').error.code,'UNDEFINED_VARIABLE');
  assert.equal(runPrgmPreview('Prgm\nDisp [[1/0]]\nEndPrgm').status,'error');
});

test('Text pauses until OK and obeys its history flag without accepting a typed response',()=>{
  const visible=runPrgmPreview('Prgm\nText "First"\nDisp 42\nEndPrgm');
  assert.equal(visible.status,'waiting');assert.equal(visible.pending.kind,'text');assert.equal(visible.text,'');
  const result=runPrgmPreview('Prgm\nText "First"\nText "Hidden",0\nDisp 42\nEndPrgm',['','']);
  assert.equal(result.status,'done');assert.equal(result.text,'First\n42');
  assert.equal(runPrgmPreview('Func\nText "Invalid"\nEndFunc').status,'error');
});

test('stored error functions call bounded definite integration through Lua math.eval',async()=>{
  const session=await createLuaPreview('function probe(s) return math.eval(s) end',{basicFunctions:{
    erf:{params:'x',body:'Func\n2/sqrt(π)*∫(e^(-t*t),t,0,x)\nEndFunc'},
    erfc:{params:'x',body:'Func\n1-erf(x)\nEndFunc'},
  }});
  try{
    assert.equal(session.runtime.call('probe',['erf(0)']),0);
    assert.ok(Math.abs(session.runtime.call('probe',['erf(1)'])-.8427007929497149)<1e-9);
    assert.ok(Math.abs(session.runtime.call('probe',['erfc(1)'])-.1572992070502851)<1e-9);
    assert.ok(Math.abs(session.runtime.call('probe',['∫(t^2,t,1,0)'])+1/3)<1e-12);
    assert.deepEqual(session.snapshot().unsupportedApis,[]);
    assert.equal(session.runtime.call('probe',['∫(1/t,t,-1,1)'])[1],'DIVISION_BY_ZERO');
  }finally{session.close();}
});
