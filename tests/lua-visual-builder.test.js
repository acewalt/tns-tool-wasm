import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,template,component,page,decodeProject,validateProject,clone,renameComponent} from '../src/lua-visual-builder/model.js';
import {generateLua} from '../src/lua-visual-builder/generator.js';
import {compileExpression,evaluateExpression} from '../src/lua-visual-builder/expressions.js';
import {connect,graphToActions} from '../src/lua-visual-builder/logic.js';
import {createLuaPreview,runLuaPreviewActions} from '../src/lua/preview.js';

test('all six templates generate executable TI Lua, preserving editable metadata',async()=>{
  for(const name of ['hooke','menu','form','graph','quiz','study']){
    const p=template(name),code=generateLua(p);assert.deepEqual(decodeProject(code),p);
    const r=await runLuaPreviewActions(code,[{type:'paint'}]);assert.equal(r.success,true,name+JSON.stringify(r.final.errors));assert.ok(r.final.drawCalls.length>0);
  }
});
test('Hooke inputs, validation and generated click handler produce 15.00 N',async()=>{
  const session=await createLuaPreview(generateLua(template('hooke')));
  try{
    const snapshot=session.event('mouseDown',[45,175]);assert.ok(snapshot.texts.includes('15.00 N'),JSON.stringify(snapshot));
    session.call('VB.setValue',['a','bad']);session.event('mouseDown',[45,175]);assert.ok(session.snapshot().texts.some(s=>s.includes('valid number')));
  }finally{session.close();}
});
test('page navigation, history and keyboard focus work without HTML',async()=>{
  const p=template('menu'),session=await createLuaPreview(generateLua(p));
  try{session.event('mouseDown',[90,65]);assert.ok(session.snapshot().texts.includes('Back'));session.event('escapeKey');assert.ok(session.snapshot().texts.includes('Calculator'));session.event('tabKey');session.event('enterKey');assert.ok(session.snapshot().texts.includes('Back'));}finally{session.close();}
});
test('data and execution nodes compile to a working multiply flow',async()=>{
  const p=template('hooke'),graph={nodes:[{id:'e',type:'event'},{id:'a',type:'input',target:'a'},{id:'b',type:'input',target:'b'},{id:'m',type:'multiply'},{id:'s',type:'setText',target:'result',suffix:' N'}],edges:[]};
  for(const e of [{from:'e',out:'next',to:'s',input:'in'},{from:'a',out:'value',to:'m',input:'a'},{from:'b',out:'value',to:'m',input:'b'},{from:'m',out:'value',to:'s',input:'value'}])connect(graph,e);
  p.graphs[p.pages[0].id+':calculate:click']=graph;
  const r=await runLuaPreviewActions(generateLua(p),[{type:'event',event:'mouseDown',args:[40,175]}]);assert.equal(r.success,true,JSON.stringify(r.final.errors));assert.ok(r.final.texts.includes('15 N'));
  assert.throws(()=>connect(graph,{from:'a',out:'value',to:'s',input:'in'}),/execution/);
  const cyclic=clone(graph);cyclic.edges=cyclic.edges.filter(e=>!(e.to==='m'&&e.input==='a'));cyclic.edges.push({from:'m',out:'value',to:'m',input:'a'});assert.throws(()=>graphToActions(cyclic),/cycle/);
});
test('expression grammar is bounded, rejects injected Lua and retains arithmetic precedence',()=>{
  assert.match(compileExpression('-2^2+input("a")*3'),/VB\.input/);
  assert.throws(()=>compileExpression('os.execute("bad")'));
  assert.throws(()=>compileExpression('1; error("bad")'));
  assert.throws(()=>compileExpression('someUnknownFn(1)'),/Unknown function/);
  assert.throws(()=>compileExpression('('.repeat(400)+'1'+')'.repeat(400)),/complex/);
});
test('all fifteen components draw, including image and native Formula',async()=>{
  const p=createProject();p.pages[0].components=[];
  const types=['Label','Input','Button','Panel','Dropdown','Checkbox','Radio','Slider','Table','Graph','Image','Progress','Scroll','Formula','Shape'];
  types.forEach((type,i)=>{const c=component(type,(i%5)*62,Math.floor(i/5)*65);c.id=type;c.w=60;c.h=60;p.pages[0].components.push(c);});
  p.assets.img={width:1,height:1,runs:[[1,255,0,0,1]]};p.pages[0].components.find(c=>c.type==='Image').asset='img';
  const r=await runLuaPreviewActions(generateLua(p),[{type:'paint'}]);assert.equal(r.success,true,JSON.stringify(r.final.errors));assert.ok(r.final.drawCalls.some(c=>c.op==='drawLine'||c.method==='drawLine'||c.type==='drawLine'));
});
test('checkbox, dropdown, radio, slider and editable input respond to calculator events',async()=>{
  const p=createProject();p.pages[0].components=['Checkbox','Dropdown','Radio','Slider','Input'].map((type,i)=>({...component(type,10,5+i*39),id:'c'+i,w:200,h:30}));
  const s=await createLuaPreview(generateLua(p));try{
    s.event('mouseDown',[20,15]);s.event('mouseDown',[20,54]);s.event('mouseDown',[20,93]);s.event('mouseDown',[110,132]);s.event('mouseUp',[110,132]);
    assert.equal(s.call('VB.value',['c0']).value,true);assert.equal(s.call('VB.value',['c1']).value,'Two');assert.equal(s.call('VB.value',['c2']).value,true);
    const slider=s.call('VB.value',['c3']).value;assert.ok(slider>=45&&slider<=55,String(slider));
    s.event('mouseDown',[20,171]);s.event('charIn',['42']);assert.equal(s.call('VB.value',['c4']).value,'42');s.event('backspaceKey');assert.equal(s.call('VB.value',['c4']).value,'4');
  }finally{s.close();}
});
test('global and page-local variables retain scope and reset independently',async()=>{
  const p=createProject();p.variables.n=10;p.pages[0].variables.n=2;
  const s=await createLuaPreview(generateLua(p));try{
    assert.equal(s.call('VB.variable',['n']).value,2);s.call('VB.setVariable',['n',4,'local']);s.call('VB.resetVariable',['n','local']);assert.equal(s.call('VB.variable',['n']).value,2);
    const second=page('Other');p.pages.push(second); // a fresh runtime includes both pages
  }finally{s.close();}
  const next=await createLuaPreview(generateLua(p));try{next.call('VB.go',[p.pages[1].id]);assert.equal(next.call('VB.variable',['n']).value,10);next.call('VB.setVariable',['n',20,'global']);next.call('VB.resetVariable',['n','global']);assert.equal(next.call('VB.variable',['n']).value,10);}finally{next.close();}
});
test('rename migrates graph scope and data bindings without changing a different page',()=>{
  const p=template('hooke'),first=p.pages[0],second=clone(first);second.id='another';p.pages.push(second);
  p.graphs[first.id+':calculate:click']={nodes:[{id:'e',type:'event'},{id:'a',type:'input',target:'a'}],edges:[]};
  renameComponent(p,first.id,'a','constant');renameComponent(p,first.id,'calculate','run');
  assert.equal(p.graphs[first.id+':run:click'].nodes[1].target,'constant');assert.equal(p.graphs[first.id+':calculate:click'],undefined);
  assert.equal(second.components.find(c=>c.id==='calculate').events.click[1].expression,'input("a") * input("b")');
  p.graphs[first.id+':run:click'].nodes[1].id='a" onclick="bad';assert.ok(validateProject(p).some(s=>s.includes('logic node')));
});
test('formula design evaluation matches generated Lua and malformed formatting is rejected',()=>{
  assert.equal(evaluateExpression('0 and 2'),2);assert.equal(evaluateExpression('not 0'),false);
  assert.equal(evaluateExpression('input("a")*input("b")',{input:id=>({a:100,b:0.15})[id]}),15);
  const p=template('hooke');p.pages[0].components.find(c=>c.id==='calculate').events.click[1].decimals='bad';assert.throws(()=>generateLua(p),/Decimals/);
  p.pages[0].variables={'not a name':1};assert.ok(validateProject(p).some(s=>s.includes('Invalid variable')));
});
test('large valid page sets paint while oversized execution queues stop with a diagnosis',async()=>{
  const p=createProject();for(let i=0;i<10;i++){const pg=page('Screen '+i);for(let j=0;j<40;j++)pg.components.push({...component('Label',j%8*40,Math.floor(j/8)*30),id:'label'+j,text:'Item '+j});p.pages.push(pg);}
  const r=await runLuaPreviewActions(generateLua(p),[{type:'call',function:'VB.go',args:[p.pages[10].id]},{type:'paint'}]);assert.equal(r.success,true,JSON.stringify(r.final.errors));
  p.events.start=[{type:'repeat',count:'1000',body:Array.from({length:8},()=>({type:'setVariable',target:'n',expression:'1'}))}];
  const session=await createLuaPreview(generateLua(p));try{assert.ok(session.snapshot().texts.some(t=>t.includes('queue limit')),JSON.stringify(session.snapshot().texts));}finally{session.close();}
});
test('bounded loops, variables, delay and breakpoint queues execute and resume',async()=>{
  const p=createProject();p.variables.count=0;p.pages[0].components=[{...component('Label'),id:'out',text:'wait'}];p.events.start=[{type:'repeat',count:'3',body:[{type:'increment',target:'count',expression:'2'}]},{type:'setText',target:'out',expression:'count',breakpoint:true}];
  const session=await createLuaPreview(generateLua(p));try{assert.ok(session.snapshot().texts.includes('wait'));session.call('VB.resume');assert.ok(session.snapshot().texts.includes('6'));}finally{session.close();}
});
test('invalid layout parents and duplicate IDs are rejected; renaming updates bindings',()=>{
  const p=template('hooke');renameComponent(p,p.pages[0].id,'a','constant');assert.match(p.pages[0].components.find(c=>c.id==='calculate').events.click[1].expression,/input\("constant"\)/);
  assert.deepEqual(p.pages[0].components.find(c=>c.id==='calculate').events.click[0].inputs,['constant','b']);
  p.pages[0].components[0].parent=p.pages[0].components[0].id;assert.ok(validateProject(p).length);
  assert.throws(()=>generateLua(p),/hierarchy/);
});
