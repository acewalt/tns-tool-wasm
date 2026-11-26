import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {analyzeLuaImport,projectFromImport,generateImportedLua,compareImported} from '../src/lua-visual-builder/importer.js';
import {createProject,page,template,parseProject,decodeProject,validateProject} from '../src/lua-visual-builder/model.js';
import {getEventActions,setEventActions,setNavigationTarget,navigationLinks} from '../src/lua-visual-builder/semantics.js';
import {graphToActions,autoLayout,connect} from '../src/lua-visual-builder/logic.js';
import {layoutPages,navigationWorkspace,addReroute} from '../src/lua-visual-builder/workspace.js';
import {generateLua} from '../src/lua-visual-builder/generator.js';
import {createLuaPreview} from '../src/lua/preview.js';

const source=`local title="Hola Mundo"
local counter=0
local function nextTitle() counter=counter+1; return title..counter end
function on.paint(gc)
 gc:setColorRGB(20,40,60)
 gc:drawString("Original",10,20,"top")
 gc:drawString(nextTitle(),10,50,"top")
end
function on.enterKey() title="Changed" end
`;

test('native metadata recovery uses the canonical graph and persistent workspace',()=>{
 const p=template('menu');layoutPages(p,navigationLinks(p));p.navigation.positions[p.startPage].x=550;p.navigation.positions[p.startPage].manual=true;
 const r=analyzeLuaImport(generateLua(p));assert.equal(r.mode,'native');assert.deepEqual(projectFromImport(r),decodeProject(generateLua(p)));
});
test('AST detects scope, captures, calls and partial drawing; analysis does not execute Lua',()=>{
 const r=analyzeLuaImport(source+'error("MUST NOT RUN")',{filename:'original.lua'});
 assert.equal(r.mode,'hybrid');assert.equal(r.metrics.editableDrawingCalls,1);assert.equal(r.metrics.retainedDrawingCalls,1);
 assert.ok(r.functions.find(f=>f.name==='nextTitle').references.includes('counter'));assert.ok(r.calls.some(c=>c.from==='on.paint'&&c.to==='nextTitle'));
 assert.deepEqual(r.events.map(e=>e.event),['paint','enterKey']);assert.ok(r.fragments.some(f=>f.source.includes('MUST NOT RUN')));
 const p=projectFromImport(r);assert.equal(generateLua(p,{metadata:false}),source+'error("MUST NOT RUN")');assert.equal(p.imported.original,r.source);assert.deepEqual(validateProject(p),[]);
});
test('hybrid changes only literal AST ranges and preserves callbacks, upvalues and execution order',async()=>{
 const p=projectFromImport(analyzeLuaImport(source));p.pages[0].components[0].text='Converted';
 const comparison=compareImported(p);assert.equal(comparison.converted,source.replace('"Original"','"Converted"'));assert.equal(comparison.changedLines.length,1);assert.equal(comparison.equivalence,'not-verified');
 const original=await createLuaPreview(source),converted=await createLuaPreview(comparison.converted);
 try{assert.ok(original.snapshot().texts.includes('Original'));assert.ok(converted.snapshot().texts.includes('Converted'));original.event('enterKey');converted.event('enterKey');assert.equal(original.snapshot().runtimeOk,true);assert.equal(converted.snapshot().runtimeOk,true);assert.ok(converted.snapshot().texts.some(t=>t.startsWith('Changed')));}finally{original.close();converted.close();}
 const reopened=decodeProject(generateLua(p));assert.equal(reopened.imported.original,source);assert.equal(generateLua(reopened,{metadata:false}),comparison.converted);
});
test('Unicode, long strings and Lua 5.1 escapes retain their value without JS eval',()=>{
 const s=String.raw`on.paint=function(gc) gc:drawString("á λ 🎮\n\0657",10,-20,"top") gc:drawString([=[
long λ
]=],10,60,"top") end`;
 const r=analyzeLuaImport(s);assert.equal(r.diagnostics.some(d=>d.severity==='error'),false,JSON.stringify(r.diagnostics));assert.equal(r.drawings.length,2);assert.equal(r.drawings[0].args[0],'á λ 🎮\nA7');
 assert.equal(r.drawings[1].args[0],'long λ\n');const p=projectFromImport(r);p.pages[0].components[0].text='λ 🎮\n"backslash\\"';const code=generateImportedLua(p,{metadata:false});assert.ok(!code.includes('\\u'));assert.equal(analyzeLuaImport(code).drawings[0].args[0],p.pages[0].components[0].text);
});
test('nonliteral source edits and unsupported geometry are rejected rather than ignored',()=>{
 const r=analyzeLuaImport('local x=15\nfunction on.paint(gc) gc:drawString("text",x,20,"top") gc:drawLine(1,2,50,70) end'),p=projectFromImport(r);
 p.pages[0].components[0].x++;assert.throws(()=>generateLua(p),/linked to original/);p.pages[0].components[0].x--;
 p.pages[0].components[1].x++;assert.throws(()=>generateLua(p),/not an editable source argument/);
});
test('button evidence is individually accepted; rectangles are never automatically made buttons',()=>{
 const s='function on.paint(gc) gc:fillRect(10,20,100,30) gc:drawRect(20,80,40,40) end\nfunction on.mouseDown(x,y) if x>=10 and x<=110 and y>=20 and y<=50 then print("hit") end end',r=analyzeLuaImport(s);
 assert.equal(r.ambiguous.length,1);const a=projectFromImport(r),b=projectFromImport(r,{accepted:[r.ambiguous[0].id]});assert.equal(a.pages[0].components[0].importRole,undefined);assert.equal(b.pages[0].components[0].importRole,'Button');assert.equal(generateLua(b,{metadata:false}),s);
});
test('conditional state pages, D2Editor, loops, tables and math are detected but original code is retained',()=>{
 const s='local state="home"\nlocal pages={home={},calc={}}\nlocal edit=D2Editor.newRichText()\nfunction on.paint(gc) if state=="home" then gc:drawString("Home",1,2,"top") else for i=1,9 do gc:drawString(i*2,1,i*3) end end end',r=analyzeLuaImport(s);
 assert.equal(r.pages[0].name,'home');assert.equal(r.editors.length,1);assert.equal(r.tables.length,1);assert.ok(r.math.length>=2);assert.ok(r.structures[0].actions.some(a=>a.type==='if'));assert.equal(generateLua(projectFromImport(r),{metadata:false}),s);
});
test('incompatible syntax is diagnosed and source-only programs remain fully exportable',()=>{
 const invalid=analyzeLuaImport('function on.paint(gc) if then end');assert.ok(invalid.diagnostics.some(d=>d.severity==='error'));assert.throws(()=>projectFromImport(invalid),/Fix Lua/);
 const s='local secret=17\nlocal function calc(x) return x+secret end\nfunction on.paint(gc) for i=1,3 do gc:drawString(calc(i),i,i) end end',r=analyzeLuaImport(s);assert.equal(r.mode,'source');const p=projectFromImport(r);assert.deepEqual(validateProject(p),[]);assert.equal(generateLua(parseProject(JSON.stringify(p)),{metadata:false}),s);
});
test('repository ScriptApp corpus is analyzed and reconstructed without source loss',async()=>{
 for(const name of ['preview_counter','generic_utils','simple_solver']){const s=await fs.readFile(new URL('./fixtures/'+name+'.lua',import.meta.url),'utf8'),r=analyzeLuaImport(s,{filename:name+'.lua'});assert.ok(!r.diagnostics.some(d=>d.severity==='error'),name);assert.equal(generateLua(projectFromImport(r),{metadata:false}),s);}
});
test('large drawings fall back to intact source and bounded graphs preserve elseif structure',()=>{
 const s='function on.paint(gc)\n'+Array.from({length:201},(_,i)=>'gc:drawString("Row '+i+'",10,20,"top")').join('\n')+'\nend';
 const report=analyzeLuaImport(s),p=projectFromImport(report);assert.equal(report.mode,'source');assert.equal(report.metrics.editableDrawingCalls,0);assert.ok(report.diagnostics.some(d=>d.message.includes('limit')));assert.deepEqual(validateProject(p),[]);assert.equal(generateLua(p,{metadata:false}),s);
 const branches='function choose(x) if x==1 then print("one") elseif x==2 then print("two") else print("other") end end',r=analyzeLuaImport(branches),g=Object.values(projectFromImport(r).graphs)[0];assert.equal(g.nodes.filter(n=>n.type==='if').length,2);assert.equal(generateLua(projectFromImport(r),{metadata:false}),branches);
});
test('hierarchical layouts use actual edges, handle cycles and preserve locked/manual positions',()=>{
 const p=createProject();p.pages.push(page('A'),page('B'),page('Disconnected'));const[a,b,c]=p.pages;setEventActions(p,a.id+':show',[{type:'navigate',page:b.id},{type:'navigate',page:c.id}]);setEventActions(p,b.id+':show',[{type:'navigate',page:a.id}]);
 layoutPages(p,navigationLinks(p));const w=navigationWorkspace(p);assert.ok(w.positions[b.id].y>w.positions[a.id].y);assert.equal(w.positions[b.id].y,w.positions[c.id].y);
 w.positions[b.id]={x:1000,y:1000,manual:true};w.positions[c.id]={x:100,y:1300,locked:true};for(const mode of ['horizontal','vertical','radial','grid']){layoutPages(p,navigationLinks(p),{mode});assert.equal(w.positions[b.id].x,1000);assert.equal(w.positions[c.id].y,1300);assert.equal(new Set(Object.values(w.positions).map(v=>v.x+','+v.y)).size,4);}
 assert.deepEqual(decodeProject(generateLua(p)).navigation,w);
});
test('editing one conditional transition retains sibling destination and additional logic; event is explicit',()=>{
 const p=template('menu'),[home,a,b]=p.pages,key=home.id+':go0:enter';setEventActions(p,key,[{type:'if',condition:'true',yes:[{type:'navigate',page:a.id}],no:[{type:'navigate',page:b.id}]},{type:'custom',code:'print("after")'}]);
 const links=navigationLinks(p).filter(l=>l.key===key);assert.equal(links.length,2);assert.ok(links.every(l=>l.conditional));const before=JSON.stringify(p.graphs[key].edges);setNavigationTarget(p,{key,node:links[1].node,to:home.id});
 assert.equal(navigationLinks(p).find(l=>l.node===links[0].node&&l.key===key).to,a.id);assert.equal(navigationLinks(p).find(l=>l.node===links[1].node&&l.key===key).to,home.id);assert.equal(JSON.stringify(p.graphs[key].edges),before);assert.ok(getEventActions(p,key).some(a=>a.type==='custom'));
 setNavigationTarget(p,{page:home.id,owner:'go1',event:'change',to:b.id});assert.equal(getEventActions(p,home.id+':go1:change')[0].page,b.id);
});
test('inspector updates preserve IDs, routing, comments, locks, frames and selection',()=>{
 const p=template('hooke'),key=p.pages[0].id+':calculate:click',g=p.graphs[key],action=g.nodes.find(n=>n.type==='setText'),input=g.edges.findIndex(e=>e.to===action.id&&e.input==='value');addReroute(g,input);addReroute(g,g.edges.findIndex(e=>e.out==='next'&&e.input==='in'));
 action.x=888;action.y=777;action.comment='Retain me';action.locked=true;action.breakpoint=true;action.group='Output';g.groups=[{title:'Output',collapsed:true,color:'#123456'}];g.selection=[action.id];const nodes=g.nodes.map(n=>n.id),edges=structuredClone(g.edges);
 const list=getEventActions(p,key);list.find(a=>a.type==='setText').suffix=' new';setEventActions(p,key,list);assert.equal(p.graphs[key],g);assert.deepEqual(new Set(g.nodes.map(n=>n.id)),new Set(nodes));assert.deepEqual(g.edges,edges);const n=g.nodes.find(n=>n.id===action.id);assert.equal(n.suffix,' new');assert.equal(n.comment,'Retain me');assert.equal(n.x,888);assert.equal(n.locked,true);assert.equal(n.breakpoint,true);assert.equal(g.groups[0].collapsed,true);assert.deepEqual(g.selection,[action.id]);
});
test('reroute execution, number and page reference wires retain their behavior',()=>{
 const p=template('hooke'),g=p.graphs[p.pages[0].id+':calculate:click'],before=graphToActions(g);for(const i of [g.edges.findIndex(e=>e.input==='value'),g.edges.findIndex(e=>e.input==='in')])addReroute(g,i);assert.deepEqual(graphToActions(g),before);
 const target=page('Destination'),r={nodes:[{id:'event',type:'event',x:0,y:0},{id:'nav',type:'navigate',x:600,y:0},{id:'ref',type:'pageRef',target:target.id,x:300,y:200}],edges:[]};connect(r,{from:'event',out:'next',to:'nav',input:'in'});connect(r,{from:'ref',out:'value',to:'nav',input:'page'});addReroute(r,1);assert.equal(graphToActions(r)[0].page,target.id);
});
test('partial semantic layout preserves unselected/locked nodes and avoids overlaps with measured sizes',()=>{
 const p=template('hooke'),g=Object.values(p.graphs)[0];const locked=g.nodes[0];locked.locked=true;locked.x=150;locked.y=160;const chosen=new Set(g.nodes.slice(1,4).map(n=>n.id)),before=new Map(g.nodes.map(n=>[n.id,{x:n.x,y:n.y}])),dims=Object.fromEntries(g.nodes.map(n=>[n.id,{width:260,height:330}]));autoLayout(g,{selection:chosen,dimensions:dims});for(const n of g.nodes)if(!chosen.has(n.id))assert.deepEqual({x:n.x,y:n.y},before.get(n.id));for(const n of g.nodes.filter(n=>chosen.has(n.id)))for(const o of g.nodes.filter(o=>o!==n)){const overlap=n.x<o.x+260&&n.x+260>o.x&&n.y<o.y+330&&n.y+330>o.y;assert.equal(overlap,false,n.id+' overlaps '+o.id);}
});
