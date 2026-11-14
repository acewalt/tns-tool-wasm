import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const extract=(start,end)=>app.slice(app.indexOf(start),app.indexOf(end,app.indexOf(start)));
test('layout editor preserves inactive native ratios on a no-op save and bounds only active dividers',()=>{
 const source=fs.readFileSync(new URL('../web/document-page-layout.js',import.meta.url),'utf8');
 const start=source.indexOf('  function nativeRatios('),end=source.indexOf('  function open(',start);
 const ctx={};vm.runInNewContext(source.slice(start,end)+'\nglobalThis.ratios=nativeRatios;',ctx);
 const active=[[],['w1'],['h1'],['w1','h1'],['w1','h1'],['w1','h1'],['w1','h2'],['w1','h1','h2']];
 for(let clay=1;clay<=7;clay++)for(const inactive of [0,10000]){
  const detail=Object.fromEntries(['w1','h1','w2','h2'].map(key=>[key,String(active[clay].includes(key)?4687:inactive)]));
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.ratios({detail},clay,clay<=2?2:clay===7?4:3))),Object.fromEntries(Object.entries(detail).map(([key,value])=>[key,Number(value)])),`preset ${clay}, inactive ${inactive}`);
  for(const endpoint of [0,10000]){
   const bounded=ctx.ratios({detail:Object.fromEntries(['w1','h1','w2','h2'].map(key=>[key,endpoint]))},clay,clay<=2?2:clay===7?4:3);
   for(const key of ['w1','h1','w2','h2'])assert.equal(bounded[key],active[clay].includes(key)?endpoint===0?1000:9000:endpoint,`preset ${clay}, ${key}, ${endpoint}`);
  }
 }
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.ratios({detail:{w1:0,h1:5000,w2:0,h2:0}},0,1))),{w1:10000,h1:10000,w2:10000,h2:10000});
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.ratios({},1,2))),{w1:5000,h1:5000,w2:5000,h2:5000});
});

test('layout transactions roundtrip native TNS and reject invalid/stale state',()=>{
 const result=spawnSync(process.env.PYTHON||'python',['tests/test_page_layout.py'],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',timeout:60000});
 assert.equal(result.status,0,result.error?.message||result.stdout+'\n'+result.stderr);
});
test('page layout payloads pass only supported native fields and ungroup has no arrange fields',async()=>{
 const globals=new Map();const ctx={JSON,Object,Error,documentXmlFileIdentity:file=>file.replace('/source/',''),ensureXmlStageCopy:async()=>{},xmlDoctor:{stagePath:'/stage'},pyodide:{globals:{set:(k,v)=>globals.set(k,v)},runPythonAsync:async()=>'{}'}};
 vm.runInNewContext(extract('async function writeDocumentPageLayout(', '\nasync function applyDocumentPageLayout(')+'\nglobalThis.write=writeDocumentPageLayout;',ctx);
 const base={file:'/source/Problem1.xml',path:'/prob/card',cards:[{path:'/prob/card',raw_xml:'<card />'}],layout:{clay:1,count:2,w1:4200,h1:5000,w2:5000,h2:5000},order:[1,0]};
 await ctx.write({...base,action:'arrange'});let op=JSON.parse(globals.get('wasm_page_layout')).operation;assert.equal(op.destination,undefined);assert.equal(op.layout.count,undefined);assert.equal(op.layout.w1,4200);assert.deepEqual(op.order,[1,0]);
 await ctx.write({...base,action:'ungroup'});op=JSON.parse(globals.get('wasm_page_layout')).operation;assert.equal(op.layout,undefined);assert.equal(op.order,undefined);assert.equal(op.destination,undefined);
 await ctx.write({...base,action:'group'});op=JSON.parse(globals.get('wasm_page_layout')).operation;assert.equal(op.destination,'/prob/card');
 await ctx.write({...base,action:'arrange',layout:{clay:0}});op=JSON.parse(globals.get('wasm_page_layout')).operation;assert.deepEqual(op.layout,{clay:0,w1:10000,h1:10000,w2:10000,h2:10000});
 await assert.rejects(ctx.write({...base,file:'/source/../foreign.xml',action:'arrange'}),/Invalid/);
});
test('app grouping preserves unfinished editor drafts, selection and same-name programs from other problems',async()=>{
 const current={index:0,file:'/source/Problem1.xml',program_name:'same',document_type:'Prgm',code:'Prgm\nEndPrgm'},other={...current,index:1,file:'/source/Problem2.xml',code:'Prgm\nDisp "other draft"\nEndPrgm'};
 const field={value:'Prgm\nDisp "unfinished'},state={current,candidates:[current,other]};
 const ctx={JSON,Map,window:{},xmlDoctor:state,tiMathEditor:{flush(){}},document:{querySelector:()=>field},documentXmlFileIdentity:file=>file.replace(/^\/(?:source|stage)\//,''),writeDocumentPageLayout:async()=>({destination_path:'/prob/card'}),scanXmlPrograms:async()=>{state.candidates=[current,other].map(c=>({...c,file:c.file.replace('/source/','/stage/'),code:'stored'}));field.value='stored';state.current=state.candidates[0];},selectXmlProgram:index=>{if(state.current)state.current.code=field.value;state.current=state.candidates[index];field.value=state.current.code;},inspectXmlDocument:async()=>({items:[]}),documentLayoutCards:()=>[]};
 vm.runInNewContext(extract('async function applyDocumentPageLayout(', '\nasync function openDocumentPageLayout(')+'\nglobalThis.apply=applyDocumentPageLayout;',ctx);
 await ctx.apply({action:'group',cards:[],path:'/prob/card',clay:1});assert.equal(field.value,'Prgm\nDisp "unfinished');assert.equal(state.candidates[1].code,other.code);assert.equal(state.current.file,'/stage/Problem1.xml');assert.equal(state.embedded,false);
});
