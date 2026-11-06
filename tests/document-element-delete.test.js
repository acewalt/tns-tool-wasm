import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const start=app.indexOf('async function deleteDocumentInspectorElement('),end=app.indexOf('\nasync function openDocumentInspector(',start);
assert(start>=0&&end>start);
function setup({failure=false,removedSymbol='',storedPrograms=null}={}){
  const current={index:0,program_name:'demo',document_type:'Prgm',file:'/source/sub/Problem1.xml',code:'Prgm\nEndPrgm'};
  const other={...current,index:1,file:'/source/other/Problem1.xml',code:'Prgm\nDisp "other draft"\nEndPrgm'};
  const field={value:'Prgm\nDisp "unfinished draft'},globals=new Map(),events=[],purged=[];
  const state={current,candidates:[current,other],previewItems:[{old:true}],previewFile:current.file,stagePrepared:false,embedded:false};
  const identity=file=>String(file||'').replace(/^\/(?:source|stage)\//,'');
  const sessions=new Map([['sub/Problem1.xml',{mathSession:{evaluate:command=>purged.push(command)}}],['other/Problem1.xml',{mathSession:{evaluate(){throw Error('Changed another problem');}}}]]);
  const context={xmlDoctor:state,tiMathEditor:{flush:()=>events.push('flush')},document:{querySelector:selector=>selector==='#xml-code'?field:null},documentXmlFileIdentity:identity,documentCalculatorFile:identity,documentCalculatorSessions:sessions,TI_CALCULATOR_AUTH_B64:'auth',JSON,Map,Error,
    ensureXmlStageCopy:async()=>{state.stagePrepared=true;events.push('stage');},
    pyodide:{globals:{set:(name,value)=>globals.set(name,value)},runPythonAsync:async()=>{events.push('mutate');if(failure)throw Error('The selected element changed. Reopen Document Inspector.');return JSON.stringify({removed:'/prob/card[2]/wdgt',removed_symbol:removedSymbol});}},
    window:{TnsPrgmPreview:{close:()=>events.push('close')}},
    scanXmlPrograms:async()=>{events.push('scan');state.candidates=(storedPrograms||[current,other]).map((candidate,index)=>({...candidate,index,file:candidate.file.replace('/source/','/stage/'),code:'Prgm\nDisp "stored"\nEndPrgm'}));state.current=state.candidates[0]||null;field.value=state.current?.code||'';},
    selectXmlProgram:index=>{if(state.current)state.current.code=field.value;state.current=state.candidates.find(item=>item.index===index);field.value=state.current.code;events.push('select');},
    collectLoadedTnsVariables:()=>events.push('variables'),inspectXmlDocument:async()=>{state.previewItems=[{fresh:true}];events.push('inspect');},xmlLog:()=>events.push('log'),inspectorElementDeleteWords:()=>({remove:'Delete'})};
  vm.runInNewContext(app.slice(start,end)+'\nglobalThis.remove=deleteDocumentInspectorElement;',context);
  return{context,state,field,globals,events,purged,sessions,current,other};
}
const notes={name:'TI.Notepad',type:'Widget',file:'/source/sub/Problem1.xml',path:'/prob/card[2]/wdgt',raw_xml:'<wdgt type="TI.Notepad" />'};

test('deleting an unrelated app retains invalid active draft and same-name drafts in other problems',async()=>{
  const x=setup(),draft=x.field.value,otherDraft=x.other.code;
  await x.context.remove(notes);
  assert.equal(x.field.value,draft);assert.equal(x.state.current.program_name,'demo');assert.equal(x.state.current.file,'/stage/sub/Problem1.xml');
  assert.equal(x.state.candidates.find(item=>item.file==='/stage/other/Problem1.xml').code,otherDraft);
  assert.equal(x.state.embedded,false);assert.equal(x.sessions.size,2);assert.equal(x.purged.length,0);assert(x.events.indexOf('mutate')<x.events.indexOf('scan'));
  assert.deepEqual(JSON.parse(x.globals.get('wasm_inspector_remove')),{file:notes.file,path:notes.path,xml:notes.raw_xml,resource:false,size:null});
});
test('deleted stored symbol is not resurrected from a draft and only its problem loses that value',async()=>{
  const x=setup({removedSymbol:'demo',storedPrograms:[{program_name:'other',document_type:'Prgm',file:'/source/sub/Problem1.xml',code:'Prgm\nEndPrgm'}]});
  await x.context.remove({...notes,type:'Prgm',name:'demo'});
  assert.equal(x.state.candidates.length,1);assert.equal(x.state.current.program_name,'other');assert.deepEqual(x.purged,['Unlock demo','DelVar demo']);assert.equal(x.sessions.size,2);
});
test('stale-target refusal leaves source drafts and selection unchanged',async()=>{
  const x=setup({failure:true}),draft=x.field.value,oldCandidates=x.state.candidates;
  await assert.rejects(x.context.remove(notes),/changed/);
  assert.equal(x.field.value,draft);assert.equal(x.state.current,x.current);assert.equal(x.state.candidates,oldCandidates);assert(!x.events.includes('scan'));assert(!x.events.includes('close'));
});
test('resource removal carries its inspected file length and never falls back to basename matching',async()=>{
  const x=setup();await x.context.remove({type:'Resource',name:'asset.bin',file:'/source/images/asset.bin',path:'/images/asset.bin',detail:{length:23}});
  const payload=JSON.parse(x.globals.get('wasm_inspector_remove'));assert.equal(payload.file,'/source/images/asset.bin');assert.equal(payload.path,'/images/asset.bin');assert.equal(payload.resource,true);assert.equal(payload.size,23);
});

test('Inspector remains available while an unfinished draft has syntax errors',async()=>{
  const fix=fs.readFileSync(new URL('../web/xml-program-editor-fix.js',import.meta.url),'utf8');
  const begin=fix.indexOf('  openDocumentInspector = async function () {'),stop=fix.indexOf('\n  selectXmlProgram = function',begin);
  const draft='Prgm\nDisp "unfinished',state={current:{program_name:'demo',document_type:'Prgm',file:'/source/Problem1.xml',code:draft},lastReport:{errors:1},candidates:[],embedded:false};let opened=0,synced=0;
  const context={xmlDoctor:state,persistCurrentProgram:async()=>{throw Error('Fix syntax');},scanXmlPrograms:async()=>{throw Error('Invalid draft must not be rescanned away');},syncCode:()=>{synced++;},oldInspector:async()=>{opened++;return 'opened';},patchInspectorIfEmpty(){},requestAnimationFrame:fn=>fn()};
  vm.runInNewContext(fix.slice(begin,stop),context);
  assert.equal(await context.openDocumentInspector(),'opened');assert.equal(opened,1);assert.equal(synced,1);assert.equal(state.current.code,draft);
  state.lastReport={errors:0};await assert.rejects(context.openDocumentInspector(),/Fix syntax/);assert.equal(opened,1,'Unexpected persistence errors must not be swallowed');
});
