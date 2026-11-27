import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyTemplate,legacyStart} from './helpers/legacy-templates.js';
import {analyzeLuaImport,projectFromImport} from '../src/lua-visual-builder/importer.js';
import {analyzeLuaIR} from '../src/lua-visual-builder/semantic-ir.js';
import {validateProject,parseProject} from '../src/lua-visual-builder/model.js';
import {generateLua} from '../src/lua-visual-builder/generator.js';
import {createLuaPreview} from '../src/lua/preview.js';
import {nodeChoices,intentEdge} from '../src/lua-visual-builder/choices.js';
import {connectionError} from '../src/lua-visual-builder/logic.js';

test('contextual node recommendations work from unconnected inputs and outputs with typed references',()=>{
 const g={nodes:[{id:'math',type:'multiply'},{id:'go',type:'navigate'},{id:'event',type:'event'}],edges:[]};
 for(const intent of [{to:'math',input:'a'},{to:'go',input:'page'},{from:'event',out:'next'}]){
  const choices=nodeChoices(g,intent);assert.ok(choices.length);for(const c of choices){const node={id:'new',type:c.type,expression:'1'};assert.equal(connectionError({...g,nodes:[...g.nodes,node]},intentEdge(intent,node,c.port)),'');}
 }
 assert.equal(nodeChoices(g,{to:'go',input:'page'})[0].type,'pageRef');
 assert.ok(nodeChoices(g,{to:'math',input:'a'}).some(c=>c.type==='input'&&c.recommended));
 assert.equal(nodeChoices(g,{to:'go',input:'page'}).some(c=>c.type==='componentRef'),false);
});
test('semantic IR records nested lexical ownership, call dependencies and source ranges',()=>{
 const source='local x=2\nlocal function f(a) local x=a*2 return x end\nfunction on.paint(gc) gc:drawString(f(x),0,0) end';
 const {ir}=analyzeLuaIR(source);assert.equal(ir.functions.length,2);assert.ok(ir.scopes.some(s=>s.symbols.some(v=>v.name==='a'&&v.kind==='parameter')));assert.ok(ir.dependencies.some(d=>d.calls.includes('f')));assert.ok(ir.operations.some(n=>n.operator==='*'&&source.slice(...n.range)==='a*2'));
});
test('own legacy start screen becomes editable without metadata, preserving the original',async()=>{
 const report=analyzeLuaImport(legacyStart),p=projectFromImport(report);assert.equal(report.strategy,'tns-tool-legacy');assert.deepEqual(validateProject(p),[]);assert.equal(p.reconstruction.original,legacyStart);assert.ok(p.pages[0].components.some(c=>c.text==='Hello Lua'));assert.ok(p.pages[0].components.some(c=>c.type==='Button'&&c.text==='Siguiente'));
 const runtime=await createLuaPreview(generateLua(p));try{assert.ok(runtime.paint().texts.includes('Hello Lua'));}finally{runtime.close();}
});
const form=()=>legacyTemplate('form',{title:'Hooke',inputCount:2,fieldLabels:['k','x'],fieldBindings:['k','x'],showDetailsButton:false,buttonActions:[{type:'calc',target:'F',expression:'k*x'}]});
async function calculate(source,a='100',b='0.15'){
 const r=await createLuaPreview(source);try{
  r.event('enterKey');r.event('mouseDown',[90,50]);r.event('charIn',[a]);r.event('mouseDown',[90,80]);r.event('charIn',[b]);r.event('mouseDown',[130,200]);return r.paint();
 }finally{r.close();}
}
test('legacy form calculation and input bindings agree with the original runtime',async()=>{
 const original=form(),report=analyzeLuaImport(original),p=projectFromImport(report);assert.equal(report.strategy,'tns-tool-legacy');assert.deepEqual(validateProject(p),[]);assert.equal(p.reconstruction.pending.length,0);
 const a=await calculate(original),b=await calculate(generateLua(p));assert.ok(a.texts.some(s=>s==='F=15'));assert.ok(b.texts.some(s=>s==='F=15'));assert.ok(p.graphs&&Object.values(p.graphs).some(g=>g.nodes.some(n=>n.type==='multiply')));
 const restored=parseProject(JSON.stringify(p));assert.equal(restored.reconstruction.original,original);assert.ok((await calculate(generateLua(restored))).texts.includes('F=15'));
});
test('editing reconstructed math and labels changes generated executable Lua',async()=>{
 const p=projectFromImport(analyzeLuaImport(form()));const g=Object.values(p.graphs).find(g=>g.nodes.some(n=>n.type==='multiply'));g.nodes.find(n=>n.type==='multiply').type='divide';p.pages[1].components.find(c=>c.type==='Label'&&c.text==='Hooke').text='Edited form';
 const output=await calculate(generateLua(p),'12','3');assert.ok(output.texts.includes('Edited form'));assert.ok(output.texts.includes('F=4'));
});
test('invalid numeric input does not silently compute a value',async()=>{
 const p=projectFromImport(analyzeLuaImport(form()));const result=await calculate(generateLua(p),'bad','3');assert.ok(result.texts.some(s=>s.includes('Enter a valid number')));assert.equal(result.texts.some(s=>s==='F=0'),false);
});

test('unknown page callbacks remain explicit pending behavior with the original intact',()=>{
 const original=legacyStart.replace('addPage({','addPage({ timer = function(self) unexpectedSideEffect() end,');
 const report=analyzeLuaImport(original),p=projectFromImport(report);
 assert.equal(p.reconstruction.original,original);
 assert.ok(p.reconstruction.pending.some(v=>v.reason.includes('Custom page callback')&&v.reason.includes('timer')));
 assert.equal(generateLua(p,{metadata:false}).includes('unexpectedSideEffect()'),false);
});

test('unrelated navigation pages use bounded rows and manual anchors survive measured layout',async()=>{
 const {template,page}=await import('../src/lua-visual-builder/model.js');
 const {layoutPages}=await import('../src/lua-visual-builder/workspace.js');
 const {navigationLinks}=await import('../src/lua-visual-builder/semantics.js');
 const p=template('menu');while(p.pages.length<50)p.pages.push(page('Extra '+p.pages.length));
 const dimensions=Object.fromEntries(p.pages.map(v=>[v.id,{width:264,height:410}]));
 layoutPages(p,navigationLinks(p),{dimensions});
 assert.ok(Math.max(...Object.values(p.navigation.positions).map(v=>v.y))<6000);
 p.navigation.positions[p.startPage]={x:900,y:750,manual:true};
 layoutPages(p,navigationLinks(p),{dimensions});assert.deepEqual(p.navigation.positions[p.startPage],{x:900,y:750,manual:true});
 for(const [i,a]of p.pages.entries())for(const b of p.pages.slice(i+1)){const x=p.navigation.positions[a.id],y=p.navigation.positions[b.id];assert.ok(!(x.x<y.x+264&&x.x+264>y.x&&x.y<y.y+410&&x.y+410>y.y));}
});
