import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeLuaImport,projectFromImport,generateImportedLua} from '../src/lua-visual-builder/importer.js';
import {instrumentCaptureSource,createCaptureRecorder,reconstructScreen,projectFromCapture,screenFingerprint} from '../src/lua-visual-builder/capture.js';
import {template,page,component,validateProject,parseProject} from '../src/lua-visual-builder/model.js';
import {eventEntries,describeActions,insertOnWire,routeWire} from '../src/lua-visual-builder/presentation.js';
import {getEventActions,setEventActions,navigationLinks} from '../src/lua-visual-builder/semantics.js';
import {layoutPages,PAGE_WIDTH,pageHeight} from '../src/lua-visual-builder/workspace.js';
import {createLuaPreview} from '../src/lua/preview.js';
import {generateLua} from '../src/lua-visual-builder/generator.js';
import {parse as parseLua51} from '../vendor/luaparse/index.js';

const helpers=`local title="Original"
local function text(g,s,x,y) g:drawString(s,x,y,"top") end
local screens={ home=function(g) local alias=g; text(alias,title,10,20) end }
local selected=screens.home
function on.paint(gc) selected(gc) end
function on.enterKey() title="Changed" end`;
test('extended analysis follows lexical helpers, table callbacks, aliases and graphics arguments without execution',()=>{
 const r=analyzeLuaImport(helpers+'\nerror("must not execute")',{extended:true});assert.equal(r.observations.length,1);const d=r.observations[0];assert.equal(d.method,'drawString');assert.equal(d.scope,'text');assert.equal(d.constant,true);assert.equal(d.convertible,false);assert.deepEqual(d.args.slice(0,3),['Original',10,20]);assert.ok(d.callPath.length===3);assert.ok(r.resolvedCalls.some(c=>c.to==='text'));
 const p=projectFromImport(r);assert.ok(p.pages[0].components[0].locked);assert.equal(generateImportedLua(p,{metadata:false}),r.source);
});
test('analysis bounds recursion and retains dynamic coordinates instead of fabricating literals',()=>{
 const r=analyzeLuaImport('local function draw(g,x) g:drawString("test",x,10) end\nfunction on.paint(gc) draw(gc,platform.window:width()) end',{extended:true});assert.equal(r.observations[0].status,'dynamic');assert.equal(r.observations[0].args[1],null);assert.equal(projectFromImport(r).pages[0].components.length,0);
 const recursive=analyzeLuaImport('local function recur(g) recur(g) end\nfunction on.paint(gc) recur(gc) end',{extended:true});assert.equal(recursive.diagnostics.filter(d=>d.severity==='error').length,0);
});
test('capture instrumentation keeps original lines, tags verified helper sites and remains valid Lua',()=>{
 const result=instrumentCaptureSource(helpers);assert.equal(result.code.split('\n').length,helpers.split('\n').length);assert.ok(result.code.includes(result.name));assert.ok(Object.values(result.sites).some(s=>s.function==='text'&&s.line===2));assert.ok(parseLua51(result.code));
});
test('capture frame recorder preserves ordered styles, source attribution, events and paused snapshots within bounds',()=>{
 let now=0;const c=createCaptureRecorder({sites:{1:{line:12,function:'paintText'}},now:()=>now,maxOperations:20,maxFrames:3,maxMs:100});c.begin();c.operation('setColorRGB',[10,20,30]);const restore=c.site(1);c.operation('drawString',['Hi',5,9,'top']);restore();c.event('enterKey');c.end();let s=c.snapshot();assert.equal(s.operations[1].style.color,'#0a141e');assert.equal(s.operations[1].source.line,12);assert.equal(s.operations[1].order,1);assert.equal(s.event.type,'enterKey');c.pause();c.begin();c.operation('drawString',['new',10,20]);c.end();assert.equal(c.snapshot().operations[0].args[0],'new');assert.equal(c.export().frames.length,1);now=101;c.begin();c.operation('drawRect',[1,2,3,4]);assert.match(c.export().stopReason,/limit/);
});
test('screen dedup, page grouping and confirmed transition evidence never rewrite original handlers',()=>{
 const r=analyzeLuaImport(helpers),c=createCaptureRecorder();c.begin();c.operation('drawString',['First',10,20,'top']);c.end();const first=c.snapshot();c.begin();c.operation('drawString',['Second',10,20,'top']);c.end();const second=c.snapshot();assert.notEqual(screenFingerprint(first),screenFingerprint(second));assert.equal(screenFingerprint(first,{structural:true}),screenFingerprint(second,{structural:true}));const session={screens:[{id:'a',name:'Home',group:'home',frame:first},{id:'b',name:'Counter changed',group:'home',frame:second},{id:'c',name:'Other',group:'other',frame:second}],transitions:[{from:'a',to:'c',confirmed:true,event:{type:'enterKey'}}]};const p=projectFromCapture(r,session);assert.equal(p.pages.length,2);assert.equal(p.imported.capture.screenPages.a,p.imported.capture.screenPages.b);assert.deepEqual(validateProject(p),[]);assert.equal(generateImportedLua(p,{metadata:false}),helpers);assert.ok(reconstructScreen(first).every(c=>c.locked&&c.captureBinding.status==='Read only'));assert.equal(parseProject(JSON.stringify(p)).pages.length,2);
});
test('event explorer and explanations use visible names and actual branches without changing canonical logic',()=>{
 const p=template('menu'),before=JSON.stringify(p);const entries=eventEntries(p,'es');assert.ok(entries.some(e=>e.label==='Calculator'&&e.event==='click'));const desc=describeActions(p,p.startPage+':go0:click','es');assert.ok(desc.text.includes('Calculator'));assert.equal(JSON.stringify(p),before);const h=template('hooke'),key=h.startPage+':calculate:click',actions=getEventActions(h,key);assert.equal(actions.length,2);assert.ok(describeActions(h,key,'fr').text.includes(' N'));assert.equal(JSON.stringify(getEventActions(h,key)),JSON.stringify(actions));
});
test('inserting an action on an execution wire preserves downstream behavior and rejects self-rewiring',()=>{
 const p=template('menu'),key=p.startPage+':go0:click',g=p.graphs[key],node={id:'show_new',type:'setText',target:'title',expression:'"Hello"',x:30,y:30};g.nodes.push(node);assert.ok(insertOnWire(g,0,node));const actions=getEventActions(p,key);assert.equal(actions[0].type,'setText');assert.equal(actions[1].type,'navigate');assert.equal(insertOnWire(g,0,node),false);
});
test('4, 10, 25 and 50 page graphs keep nonoverlapping bounds and preserve manual positions',()=>{
 for(const count of [4,10,25,50]){const p=template('menu');while(p.pages.length<count){const pg=page('Extra '+p.pages.length);pg.components.push({...component('Button'),events:{click:[{type:'navigate',page:p.startPage}]}});p.pages.push(pg);}const links=navigationLinks(p);layoutPages(p,links);for(const a of p.pages)for(const b of p.pages){if(a===b)continue;const pa=p.navigation.positions[a.id],pb=p.navigation.positions[b.id];assert.ok(!(pa.x<pb.x+PAGE_WIDTH&&pa.x+PAGE_WIDTH>pb.x&&pa.y<pb.y+pageHeight(b,links)&&pa.y+pageHeight(a,links)>pb.y));}p.navigation.positions[p.startPage]={x:125,y:87,manual:true};layoutPages(p,links);assert.equal(p.navigation.positions[p.startPage].x,125);}
 const path=routeWire({x:0,y:0},{x:600,y:200},[{x:150,y:0,w:200,h:250}]);assert.ok(!/NaN|Infinity/.test(path));assert.match(path,/Q/);
});
test('beginner canonical multiplication and styling execute without Lua edits',async()=>{
 const p=template('hooke'),pg=p.pages[0],key=pg.id+':calculate:click';setEventActions(p,key,[{type:'if',condition:'value("a") == ""',yes:[{type:'setText',target:'result',expression:'"Enter a number"'}],no:[{type:'setText',target:'result',expression:'input("a") * input("b")',decimals:2,suffix:' N'},{type:'setColor',target:'result',color:'#228844'}]}]);const preview=await createLuaPreview(generateLua(p));try{preview.event('mouseDown',[30,170]);preview.event('mouseUp',[30,170]);assert.ok(preview.paint().texts.some(t=>t.includes('15.00 N')));}finally{preview.close();}
});


test('formula presentation uses the canonical AST, readable names, and escaped MathML', async()=>{
 const {presentFormula}=await import('../src/lua-visual-builder/formula-presentation.js');
 const formula=presentFormula('input("k") * input("x")',[{id:'k',text:'Elastic constant'},{id:'x',text:'Deformation'}]);
 assert.equal(formula.text,'(Elastic constant × Deformation)');assert.match(formula.html,/<math/);assert.match(formula.html,/Elastic constant/);
 assert.match(presentFormula('(1+2)/sqrt(4)').html,/<mfrac>/);assert.match(presentFormula('2^3').html,/<msup>/);
 assert.doesNotMatch(presentFormula('<script>alert(1)</script>').html,/<script>/);
});
test('semantic event layout preserves hand-placed nodes until explicit reset',async()=>{
 const {semanticGraphLayout}=await import('../src/lua-visual-builder/workspace.js');
 const graph={nodes:[{id:'e',type:'event',x:12,y:13,manual:true},{id:'a',type:'back',x:400,y:30}],edges:[{from:'e',out:'next',to:'a',input:'in'}]};
 semanticGraphLayout(graph);assert.deepEqual([graph.nodes[0].x,graph.nodes[0].y],[12,13]);
 semanticGraphLayout(graph,{reset:true});assert.notDeepEqual([graph.nodes[0].x,graph.nodes[0].y],[12,13]);
});

test('simple action edits update semantic colors while preserving manual node positions',()=>{
 const p=template('hooke'),key=p.startPage+':calculate:click';setEventActions(p,key,[{type:'setColor',target:'result',color:'#112233'}]);
 const node=p.graphs[key].nodes.find(n=>n.type==='setColor');node.x=123;node.y=456;node.manual=true;
 const actions=getEventActions(p,key);actions[0].color='#228844';setEventActions(p,key,actions);
 assert.equal(getEventActions(p,key)[0].color,'#228844');const updated=p.graphs[key].nodes.find(n=>n.type==='setColor');assert.deepEqual([updated.x,updated.y,updated.manual],[123,456,true]);
});

test('empty-input conditions and quiz feedback execute after JSON restore',async()=>{
 const p=template('hooke'),key=p.startPage+':calculate:click';setEventActions(p,key,[{type:'if',condition:'value("a") == ""',yes:[{type:'setText',target:'result',expression:'"Please enter a number"'}],no:[{type:'setText',target:'result',expression:'input("a") * input("b")'}]}]);
 const saved=parseProject(JSON.stringify(p));const preview=await createLuaPreview(generateLua(saved));try{
  preview.call('VB.setValue',['a','']);preview.event('mouseDown',[30,170]);preview.event('mouseUp',[30,170]);assert.ok(preview.paint().texts.some(t=>t.includes('Please enter a number')));
  preview.call('VB.setValue',['a','2']);preview.event('mouseDown',[30,170]);preview.event('mouseUp',[30,170]);assert.ok(preview.paint().texts.includes('0.3'));
 }finally{preview.close();}
 const quiz=await createLuaPreview(generateLua(parseProject(JSON.stringify(template('quiz')))));try{
  quiz.event('mouseDown',[30,90]);quiz.event('mouseUp',[30,90]);assert.ok(quiz.paint().texts.includes('Try again'));
  quiz.event('mouseDown',[30,118]);quiz.event('mouseUp',[30,118]);assert.ok(quiz.paint().texts.includes('Correct!'));
 }finally{quiz.close();}
});
