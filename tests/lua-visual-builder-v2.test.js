import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,component,page,template,parseProject,decodeProject,clone,renameComponent} from '../src/lua-visual-builder/model.js';
import {migrateProject,getEventActions,setEventActions,ensureEventGraph,navigationLinks,projectDiagnostics} from '../src/lua-visual-builder/semantics.js';
import {actionsToGraph,graphToActions,connect,socketType} from '../src/lua-visual-builder/logic.js';
import {generateLua} from '../src/lua-visual-builder/generator.js';
import {createLuaPreview,runLuaPreviewActions} from '../src/lua/preview.js';

test('V1 migration preserves effective graph and archives conflicting simple actions exactly once',()=>{
 const p=createProject();p.version=1;p.events.start=[{type:'setVariable',target:'n',expression:'1'}];p.graphs['app:start']=actionsToGraph([{type:'setVariable',target:'n',expression:'2'}]);const v=migrateProject(p);
 assert.equal(v.version,2);assert.equal(v.events,undefined);assert.equal(getEventActions(v,'app:start')[0].expression,'2');assert.equal(v.migrationArchive['app:start'].actions[0].expression,'1');assert.deepEqual(migrateProject(v),v);assert.deepEqual(parseProject(JSON.stringify(p)),v);
});
test('Menu has navigation and per-button event graphs before opening Logic',()=>{
 const p=template('menu'),links=navigationLinks(p);assert.equal(links.filter(l=>l.type==='navigate').length,3);assert.equal(links.filter(l=>l.type==='back').length,3);assert.ok(links.filter(l=>l.type==='back').every(l=>!l.to));assert.equal(projectDiagnostics(p).length,0);
 for(const g of Object.values(p.graphs))assert.equal(g.nodes.filter(n=>n.type==='event').length,1);
});
test('Design action and Logic node edits share destination and formula semantics',()=>{
 const p=template('menu'),key=p.pages[0].id+':go0:click';let list=getEventActions(p,key);list[0].page=p.pages[2].id;setEventActions(p,key,list);assert.equal(p.graphs[key].nodes.find(n=>n.type==='navigate').page,p.pages[2].id);
 p.graphs[key].nodes.find(n=>n.type==='navigate').page=p.pages[3].id;assert.equal(getEventActions(p,key)[0].page,p.pages[3].id);assert.equal(navigationLinks(p).find(l=>l.key===key).to,p.pages[3].id);
 const h=template('hooke'),hk=h.pages[0].id+':calculate:click';assert.ok(h.graphs[hk].nodes.some(n=>n.type==='multiply'));assert.equal(h.graphs[hk].nodes.filter(n=>n.type==='input').length,2);
 const actions=getEventActions(h,hk);actions[1].expression='input("a") + input("b")';setEventActions(h,hk,actions);assert.ok(h.graphs[hk].nodes.some(n=>n.type==='add'));assert.ok(!h.graphs[hk].nodes.some(n=>n.type==='multiply'));
 const source=generateLua(h);assert.deepEqual(decodeProject(source),migrateProject(h));
});
test('mouseDown → navigation → mouseMove → mouseUp never retains the old component (Menu regression)',async()=>{
 const p=template('menu'),s=await createLuaPreview(generateLua(p));try{
  for(let i=0;i<30;i++){s.event('mouseDown',[90,65]);s.event('mouseMove',[80,80]);s.event('mouseUp',[80,80]);s.event('mouseDown',[50,183]);s.event('mouseMove',[70,190]);s.event('mouseUp',[70,190]);s.event('tabKey');s.event('enterKey');s.event('mouseMove',[70,190]);s.event('mouseUp',[70,190]);s.event('escapeKey');}
  assert.equal(s.snapshot().runtimeOk,true,JSON.stringify(s.snapshot().errors));assert.ok(!s.snapshot().texts.join(' ').includes('Missing component'));
 }finally{s.close();}
});
test('change-triggered navigation cannot click a component with the same ID on the new page',async()=>{
 const p=createProject(),one=p.pages[0],two=page('Other');p.pages.push(two);p.variables.accidental=0;one.components=[{...component('Slider',0,0),id:'shared'}];two.components=[{...component('Button',0,0),id:'shared'}];
 setEventActions(p,one.id+':shared:change',[{type:'navigate',page:two.id}]);setEventActions(p,two.id+':shared:click',[{type:'increment',target:'accidental',expression:'1'}]);
 const s=await createLuaPreview(generateLua(p));try{s.event('mouseDown',[30,15]);s.event('mouseMove',[80,15]);s.event('mouseUp',[80,15]);assert.equal(s.call('VB.variable',['accidental']).value,0);s.event('enterKey');assert.equal(s.call('VB.variable',['accidental']).value,0);}finally{s.close();}
});
test('leaving a page cancels pending delay, queue, focus and breakpoint state',async()=>{
 const p=template('menu');p.variables.n=0;const key=p.pages[0].id+':go0:click';setEventActions(p,key,[{type:'delay',expression:'1'},{type:'increment',target:'n',expression:'1'}]);
 const s=await createLuaPreview(generateLua(p));try{s.event('mouseDown',[80,60]);s.call('VB.go',[p.pages[1].id]);for(let i=0;i<30;i++)s.event('timer');assert.equal(s.call('VB.variable',['n']).value,0);s.event('charIn',['a']);s.event('backspaceKey');assert.equal(s.snapshot().runtimeOk,true);}finally{s.close();}
});
test('condition branch reconverges and continues once; reusable flows have bounded recursion',async()=>{
 const p=createProject();p.variables.n=0;const g={nodes:[{id:'event',type:'event'},{id:'test',type:'if',condition:'true'},{id:'yes',type:'increment',target:'n',value:'1'},{id:'no',type:'increment',target:'n',value:'9'},{id:'join',type:'increment',target:'n',value:'10'}],edges:[]};
 for(const [from,out,to]of [['event','next','test'],['test','yes','yes'],['test','no','no'],['test','next','join'],['yes','next','join'],['no','next','join']])connect(g,{from,out,to,input:'in'});
 p.graphs['app:start']=g;const s=await createLuaPreview(generateLua(p));try{assert.equal(s.call('VB.variable',['n']).value,11);}finally{s.close();}
 p.flows.work=actionsToGraph([{type:'increment',target:'n',expression:'2'}]);setEventActions(p,'app:start',[{type:'flow',flow:'work'}]);const r=await createLuaPreview(generateLua(p));try{assert.equal(r.call('VB.variable',['n']).value,2);}finally{r.close();}
 p.flows.work=actionsToGraph([{type:'flow',flow:'work'}]);assert.throws(()=>generateLua(p),/recursive/);
});
test('typed sockets reject incompatible data and references; event entry is immutable in generated graphs',()=>{
 const g=actionsToGraph([]),literal={id:'text',type:'literal',expression:'"hi"'},math={id:'sum',type:'add'},ref={id:'page',type:'pageRef',target:'Home'},show={id:'show',type:'show'};g.nodes.push(literal,math,ref,show);
 assert.equal(socketType(literal,'value','out'),'string');assert.throws(()=>connect(g,{from:'text',out:'value',to:'sum',input:'a'}),/Incompatible/);assert.throws(()=>connect(g,{from:'page',out:'value',to:'show',input:'target'}),/Incompatible/);
 assert.equal(ensureEventGraph(createProject(),'app:start').nodes.filter(n=>n.type==='event').length,1);
});
test('removed components and invalid destinations are diagnosed before Lua export; unreachable pages warn',()=>{
 const p=template('menu'),key=p.pages[0].id+':go0:click';p.graphs[key].nodes.find(n=>n.type==='navigate').page='missing';assert.ok(projectDiagnostics(p).some(d=>d.node&&d.severity==='error'));assert.throws(()=>generateLua(p),/page missing/);
 const h=template('hooke');h.pages[0].components=h.pages[0].components.filter(c=>c.id!=='a');assert.throws(()=>generateLua(h),/Missing component|Missing input/);
});
test('create without writing code, rename bindings, serialize/reopen and calculate native Lua',async()=>{
 const p=createProject();const a={...component('Input',10,10),id:'a',value:'100'},b={...component('Input',10,50),id:'b',value:'.15'},button={...component('Button',10,100),id:'calculate'},out={...component('Label',10,150),id:'result'};p.pages[0].components=[a,b,button,out];setEventActions(p,p.pages[0].id+':calculate:click',[{type:'validate',inputs:['a','b']},{type:'setText',target:'result',expression:'input("a")*input("b")',decimals:2,suffix:' N'}]);renameComponent(p,p.pages[0].id,'a','constant');
 const reopened=parseProject(JSON.stringify(p));assert.equal(reopened.graphs[p.pages[0].id+':calculate:click'].nodes.filter(n=>n.type==='event').length,1);const r=await runLuaPreviewActions(generateLua(reopened),[{type:'event',event:'mouseDown',args:[20,110]}]);assert.ok(r.final.texts.includes('15.00 N'),JSON.stringify(r.final.errors));
});
test('all eleven working templates boot; converter, wizard, quiz and physics perform their logic',async()=>{
 for(const name of ['hooke','menu','form','graph','quiz','study','converter','scientific','score','wizard','physics']){const p=template(name),r=await runLuaPreviewActions(generateLua(p),[{type:'paint'}]);assert.equal(r.success,true,name+JSON.stringify(r.final.errors));}
 const s=await createLuaPreview(generateLua(template('converter')));try{s.event('mouseDown',[30,170]);assert.ok(s.snapshot().texts.includes('1.00 m'));}finally{s.close();}
 const w=await createLuaPreview(generateLua(template('wizard')));try{w.event('mouseDown',[30,165]);assert.ok(w.snapshot().texts.includes('Hello, Ada'));w.event('mouseMove',[30,160]);assert.equal(w.snapshot().runtimeOk,true);}finally{w.close();}
 const wave=await createLuaPreview(generateLua(template('physics')));try{for(let i=0;i<12;i++)wave.event('timer');assert.equal(wave.call('VB.variable',['phase']).value,.2);}finally{wave.close();}
});
test('debug breakpoints and execution traces are opt-in; physical export ignores editor locks',async()=>{
 const p=template('hooke'),key=p.pages[0].id+':calculate:click';p.graphs[key].nodes.find(n=>n.type==='setText').breakpoint=true;p.pages[0].components.find(c=>c.id==='calculate').locked=true;
 for(const debug of [false,true]){const s=await createLuaPreview(generateLua(p,{debug}));try{s.event('mouseDown',[30,170]);if(debug){assert.ok(!s.snapshot().texts.includes('15.00 N'));s.call('VB.resume');}assert.ok(s.snapshot().texts.includes('15.00 N'));}finally{s.close();}}
});
