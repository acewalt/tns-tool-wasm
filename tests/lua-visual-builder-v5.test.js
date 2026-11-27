import test from 'node:test';
import assert from 'node:assert/strict';
import {createGraphInteraction,GraphState,freeNodePosition,menuPosition} from '../src/lua-visual-builder/interactions.js';
import {template,validateProject,parseProject} from '../src/lua-visual-builder/model.js';
import {projectRelationships} from '../src/lua-visual-builder/relationships.js';
import {editableCaptureProject,reviewCapturedScreen} from '../src/lua-visual-builder/reconstruction.js';
import {availableEvents,eventEntries} from '../src/lua-visual-builder/presentation.js';
import {setEventActions} from '../src/lua-visual-builder/semantics.js';
import {connect} from '../src/lua-visual-builder/logic.js';
import {analyzeLuaImport} from '../src/lua-visual-builder/importer.js';
import {generateLua} from '../src/lua-visual-builder/generator.js';
import {createLuaPreview} from '../src/lua/preview.js';

test('graph interaction releases capture before a fixed chooser and ignores the resulting lost capture',()=>{
 const log=[];let c;c=createGraphInteraction({capture:id=>log.push(['capture',id]),release:id=>{log.push(['release',id]);assert.equal(c.lost(id),false);}});
 c.transition(GraphState.DRAGGING_WIRE,{source:'x'},7);c.transition(GraphState.CHOOSING_NODE,{anchor:{x:40,y:50}});
 assert.equal(c.pointer,null);assert.equal(c.state,GraphState.CHOOSING_NODE);assert.deepEqual(c.data.anchor,{x:40,y:50});assert.deepEqual(log,[['capture',7],['release',7]]);
 c.cancel();assert.equal(c.state,GraphState.IDLE);assert.equal(c.data,null);
 for(const state of [GraphState.PANNING,GraphState.BOX_SELECTION,GraphState.DRAGGING_NODE,GraphState.RECONNECTING_WIRE]){c.transition(state,{},2);assert.equal(c.lost(2),true);assert.equal(c.state,GraphState.IDLE);}
});
test('placement uses real sizes and respects explicit manual overlap preference',()=>{
 const existing=[{x:20,y:20,w:220,h:410},{x:300,y:30,w:240,h:190}],rect={x:50,y:80,w:235,h:170};const position=freeNodePosition(rect,existing);
 assert.ok(existing.every(b=>position.x+rect.w<=b.x||position.x>=b.x+b.w||position.y+rect.h<=b.y||position.y>=b.y+b.h));assert.deepEqual(freeNodePosition(rect,existing,{allowOverlap:true}),{x:50,y:80});assert.deepEqual(menuPosition({x:790,y:580},{w:800,h:600},{w:280,h:320}),{x:514,y:274});
});
test('compatible event lists do not discard configured legacy events',()=>{
 assert.deepEqual(availableEvents('Input'),['change','enter']);assert.deepEqual(availableEvents('Label'),[]);assert.deepEqual(availableEvents('', 'page'),['show']);
 const p=template('menu'),pg=p.pages[0];setEventActions(p,pg.id+':go0:change',[{type:'back'}]);const before=JSON.stringify(p),entries=eventEntries(p);assert.ok(entries.some(e=>e.key===pg.id+':go0:change'&&e.count===1));assert.equal(JSON.stringify(p),before);
});
test('exact duplicate connections are idempotent',()=>{
 const p=template('menu'),g=p.graphs[p.startPage+':go0:click'],e={...g.edges[0]};connect(g,e);connect(g,e);assert.equal(g.edges.filter(w=>JSON.stringify(w)===JSON.stringify(e)).length,1);
});
test('Overview describes actual ownership, execution, navigation, data and variables without changing the project',()=>{
 const p=template('hooke'),key=p.startPage+':calculate:click';p.variables.mass=3;setEventActions(p,key,[{type:'setVariable',target:'mass',expression:'4'},{type:'setText',target:'result',expression:'mass'}]);
 const before=JSON.stringify(p),a=projectRelationships(p),b=projectRelationships(p);assert.deepEqual(a,b);assert.equal(JSON.stringify(p),before);assert.equal(new Set(a.nodes.map(n=>n.id)).size,a.nodes.length);assert.ok(a.edges.some(e=>e.from==='page:'+p.startPage&&e.to==='component:'+p.startPage+':calculate'));assert.ok(a.edges.some(e=>e.to==='event:'+key&&e.type==='owns'));assert.ok(a.edges.some(e=>e.type==='exec'));assert.ok(a.edges.some(e=>e.type==='modifies'&&e.to==='variable:global:mass'));assert.ok(a.edges.every(e=>a.nodes.some(n=>n.id===e.from)&&a.nodes.some(n=>n.id===e.to)));
});
const style={font:12,bold:false,color:'#244d78'},frame=operations=>({operations,size:{width:320,height:212}});
const session=()=>({screens:[{id:'home',name:'Home',frame:frame([{method:'fillRect',order:0,args:[15,100,160,30],style},{method:'drawString',order:1,args:['Continue',30,105,'top'],style:{...style,color:'#ffffff'}}]),review:{0:{type:'Button'}}},{id:'result',name:'Result',frame:frame([{method:'drawString',order:0,args:['Result page',20,20,'top'],style}])}],transitions:[{from:'home',to:'result',confirmed:true,component:'capture_0',trigger:'click',event:{type:'mouseDown',args:[25,110]}}]});
test('multipage editable reconstruction merges reviewed button text and binds only confirmed transitions',async()=>{
 const original='function on.paint(gc) gc:drawString("Original",5,5,"top") end',report=analyzeLuaImport(original),capture=session();const p=editableCaptureProject(report,capture);
 assert.equal(p.pages.length,2);assert.equal(p.pages[0].components.length,1);assert.equal(p.pages[0].components[0].type,'Button');assert.equal(p.pages[0].components[0].text,'Continue');assert.equal(p.pages[0].components[0].locked,false);assert.deepEqual(validateProject(p),[]);assert.equal(p.reconstruction.original,original);assert.equal(p.reconstruction.pending.length,0);
 const preview=await createLuaPreview(generateLua(parseProject(JSON.stringify(p))));try{assert.ok(preview.paint().texts.includes('Continue'));preview.event('mouseDown',[25,110]);preview.event('mouseUp',[25,110]);assert.ok(preview.paint().texts.includes('Result page'));}finally{preview.close();}
 p.pages[1].components[0].text='Edited result';const edited=await createLuaPreview(generateLua(p));try{edited.event('mouseDown',[25,110]);edited.event('mouseUp',[25,110]);assert.ok(edited.paint().texts.includes('Edited result'));}finally{edited.close();}
 assert.equal(capture.screens[0].review[0].type,'Button');assert.equal(reviewCapturedScreen(capture.screens[0])[0].id,'capture_0');
});
test('ambiguous transitions remain visible as pending behavior, not invented handlers',()=>{
 const s=session();s.transitions[0].confirmed=false;const p=editableCaptureProject(analyzeLuaImport('function on.paint(gc) end'),s);assert.equal(Object.keys(p.graphs).length,0);assert.equal(p.reconstruction.pending.length,1);assert.ok(p.reconstruction.pending[0].reason.includes('Unconfirmed'));
 s.transitions[0].confirmed=true;s.transitions[0].component='unknown';s.transitions[0].event={type:'timer'};const q=editableCaptureProject(analyzeLuaImport('function on.paint(gc) end'),s);assert.equal(Object.keys(q.graphs).length,0);assert.ok(q.reconstruction.pending[0].reason.includes('Choose'));
});
