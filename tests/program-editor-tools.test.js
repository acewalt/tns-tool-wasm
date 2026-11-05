import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const root=new URL('../',import.meta.url);
const data=JSON.parse(fs.readFileSync(new URL('assets/program-editor/menu.json',root),'utf8'));
const source=fs.readFileSync(new URL('program-editor-tools.js',root),'utf8');
const all=data.categories.flatMap(function flatten(node){return [node,...(node.children?.flatMap(flatten)||[])];});
const leaves=all.filter(node=>!node.children?.length);
function api(){
  const window={};
  vm.runInNewContext(source,{window,document:{currentScript:{src:'https://example.test/program-editor-tools.js'},baseURI:'https://example.test/',documentElement:{lang:'en'}},URL,Event,fetch:async()=>({ok:true,json:async()=>data})});
  return window.TnsProgramEditorTools;
}
function editor(value,start=0,end=start){return {value,selectionStart:start,selectionEnd:end,events:[],focus(){this.focused=true;},setSelectionRange(a,b=a){this.selectionStart=a;this.selectionEnd=b;},dispatchEvent(event){this.events.push(event.type);}};}

test('all nine supplied icon categories and every hierarchy leaf have actual operations',()=>{
  assert.equal(data.categories.length,9);
  assert.equal(new Set(all.map(node=>node.id)).size,all.length);
  assert.equal(leaves.length,394);
  assert.equal(leaves.filter(node=>node.action).length,16);
  assert.equal(leaves.filter(node=>node.code).length,378);
  for(const node of data.categories)assert(fs.existsSync(new URL('assets/program-editor/'+node.icon,root)));
  for(const node of leaves)assert(node.action||typeof node.code==='string',node.id);
  const original=fs.readFileSync(new URL(data.source,root),'utf8');
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'),data.sourceSha256,'generated hierarchy must match supplied reference');
});
test('nested mode, shape and Hub templates preserve actual TI source rather than menu labels',()=>{
  const tool=api();
  assert.equal(tool.findNode(data.categories,'7.2.3').code,'setMode(2,3)');
  assert.equal(tool.findNode(data.categories,'4.5').code,'For i,1,10\nDisp i\nEndFor');
  assert.equal(tool.findNode(data.categories,'9.1.1').code,'DrawLine x1,y1,x2,y2');
  const hub=tool.findNode(data.categories,'8.1.1');
  assert.equal(hub.kind,'fragment');assert.equal(hub.code,'Send "SET LIGHT ..."');
  assert(all.filter(n=>n.id.startsWith('8.')&&n.kind==='fragment').every(n=>typeof n.code==='string'));
});
test('all sixteen editor operations dispatch separately and never insert their displayed labels',async()=>{
  const tool=api(),seen=[];
  const actionNodes=leaves.filter(node=>node.action);
  const actions=Object.fromEntries(actionNodes.map(node=>[node.action,(ctx,entry)=>{seen.push(entry.action);assert.equal(ctx.name,'test2');}]));
  for(const node of actionNodes)await tool.dispatch(node,{getContext:()=>({enabled:true,name:'test2'}),actions,insert(){throw Error('Editor operation was inserted as text');}});
  assert.deepEqual(seen,actionNodes.map(node=>node.action));
});
test('disabled or non ProgramEditor context cannot insert commands or run actions',async()=>{
  const tool=api();let used=false;
  await assert.rejects(tool.dispatch(leaves[0],{getContext:()=>({enabled:false}),actions:{new(){used=true;}}}),/Select a Program Editor/);
  await assert.rejects(tool.dispatch(tool.findNode(data.categories,'3.1'),{getContext:()=>({enabled:false}),insert(){used=true;}}),/Select a Program Editor/);
  assert.equal(used,false);
});
test('command insertion replaces only selection and supplies source plus metadata to adapters',async()=>{
  const tool=api(),text=editor('Prgm\nreplace\nEndPrgm',5,12),node=tool.findNode(data.categories,'3.1');
  await tool.dispatch(node,{getContext:()=>({enabled:true,editor:text})});
  assert.equal(text.value,'Prgm\nLocal a,b\nEndPrgm');
  assert.equal(text.selectionStart,14);assert.deepEqual(text.events,['input']);
  let inserted;
  await tool.dispatch(node,{getContext:()=>({enabled:true,name:'p'}),insert:(code,entry,context)=>{inserted={code,id:entry.id,name:context.name};}});
  assert.deepEqual(inserted,{code:'Local a,b',id:'3.1',name:'p'});
});
test('comment action toggles only selected lines with TI comment tokens and preserves blank first line',async()=>{
  const tool=api(),node=tool.findNode(data.categories,'1.8'),text=editor('\nPrgm\n  Disp "Hello"\nEndPrgm',6,21);
  await tool.dispatch(node,{getContext:()=>({enabled:true,editor:text})});
  assert.equal(text.value,'\nPrgm\n  © Disp "Hello"\nEndPrgm');
  await tool.dispatch(node,{getContext:()=>({enabled:true,editor:text})});
  assert.equal(text.value,'\nPrgm\n  Disp "Hello"\nEndPrgm');
  const blank=editor('\nPrgm\nEndPrgm');tool.toggleComment(blank);assert.equal(blank.value,'\nPrgm\nEndPrgm');
});
test('find, replace and go-to-line use actual text offsets with a reusable textarea/Monaco adapter',async()=>{
  const tool=api(),text=editor('Prgm\nDisp "Hello"\nDisp "World"\nEndPrgm');
  await tool.dispatch(tool.findNode(data.categories,'1.9'),{getContext:()=>({enabled:true,editor:text}),prompt:async()=> 'world'});
  assert.equal(text.value.slice(text.selectionStart,text.selectionEnd),'World');
  let answers=['Hello','Goodbye'];
  await tool.dispatch(tool.findNode(data.categories,'1.A'),{getContext:()=>({enabled:true,editor:text}),prompt:async()=>answers.shift()});
  assert.match(text.value,/Goodbye/);assert.doesNotMatch(text.value,/Hello/);
  await tool.dispatch(tool.findNode(data.categories,'1.B'),{getContext:()=>({enabled:true,editor:text}),prompt:async()=> '3'});
  assert.equal(text.value.slice(0,text.selectionStart).split('\n').length,3);
});
test('category and action labels follow the requested language',()=>{
  const tool=api();
  assert.equal(tool.label(data.categories[0],'es'),'Acciones');
  assert.equal(tool.label(data.categories[0],'en'),'Actions');
  assert.equal(tool.label(data.categories[0],'fr'),'Actions');
  assert.equal(tool.label(tool.findNode(data.categories,'2.2'),'fr'),'Vérifier la syntaxe');
  assert.equal(tool.label(tool.findNode(data.categories,'1.6'),'en'),'Rename…');
  assert.equal(tool.label(tool.findNode(data.categories,'7.1.1'),'en'),'Float');
});
