import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const root=fileURLToPath(new URL('../',import.meta.url)),app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const saveSource=app.slice(app.indexOf('async function saveCalculatorWidgetToStage('),app.indexOf('\nfunction documentCalculatorFile('));
const bridge=`import ast,json,sys
sys.path.insert(0,sys.argv[1])
payload=json.load(sys.stdin); namespace=payload['globals']
if payload.get('failReplace'):
 import page_layout
 def fail(*args): raise OSError('simulated replacement failure')
 page_layout.os.replace=fail
tree=ast.parse(payload['code']); final=tree.body.pop()
exec(compile(tree,'<calculator-save>','exec'),namespace)
print(eval(compile(ast.Expression(final.value),'<calculator-result>','eval'),namespace))`;
function python(code,input,args=[]){
  const result=spawnSync(process.env.PYTHON||'python',['-c',code,...args],{cwd:root,input:JSON.stringify(input),encoding:'utf8',env:{...process.env,PYTHONUTF8:'1'},timeout:15000});
  if(result.status!==0)throw Error(result.error?.message||result.stderr||result.stdout);
  return JSON.parse(result.stdout);
}
const namespaces='xmlns="urn:TI.Problem" xmlns:sp="urn:TI.Scratchpad" xmlns:unused="urn:preserve"';
const selected='<wdgt type="TI.Scratchpad" marker="selected"><sp:auth>opaque&#13;author</sp:auth><sp:mFlags>17</sp:mFlags></wdgt>';
const sibling='<wdgt type="TI.Scratchpad" marker="other"><sp:auth>other&#13;author</sp:auth><sp:erow><sp:entr>keep()</sp:entr><sp:rslt><sp:disp>original</sp:disp></sp:rslt></sp:erow></wdgt>';
const fixture='<?xml version="1.0" encoding="UTF-8" ?><prob '+namespaces+'><sym><e t="7"><n>demo</n><v>Prgm&#13;Disp 7&#13;EndPrgm</v></e></sym><card clay="1" w1="5000" h1="10000" w2="10000" h2="10000">'+selected+sibling+'</card></prob>';
const snapshot=selected.replace('<wdgt ','<wdgt '+namespaces+' ');
function setup(t,{failReplace=false}={}){
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tns-calc-save-v44-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const sourcePath=path.join(directory,'source'),stagePath=path.join(directory,'stage');fs.mkdirSync(sourcePath);fs.mkdirSync(stagePath);
  const file=path.join(stagePath,'Problem1.xml'),other=path.join(stagePath,'Problem2.xml');fs.writeFileSync(file,fixture);fs.writeFileSync(other,fixture);
  const globals=new Map(),xmlDoctor={sourcePath:sourcePath.replaceAll('\\','/'),stagePath:stagePath.replaceAll('\\','/'),embedded:false};
  const context={JSON,xmlDoctor,ensureXmlStageCopy:async()=>{},pyodide:{globals:{set:(key,value)=>globals.set(key,value)},runPythonAsync:async code=>JSON.stringify(python(bridge,{code,globals:Object.fromEntries(globals),failReplace},[path.join(root,'editor_XML')]))}};
  vm.runInNewContext(saveSource+'\nglobalThis.save=saveCalculatorWidgetToStage;',context);
  return{context,directory,sourcePath,stagePath,file,other,item:{file:path.join(sourcePath,'Problem1.xml'),path:'/prob/card/wdgt[1]',raw_xml:snapshot}};
}
const inspect=`import json,sys,xml.etree.ElementTree as ET
from calculator_history import extract_calculator_rows
root=ET.parse(json.load(sys.stdin)['file']).getroot(); p='{urn:TI.Problem}'; sp='{urn:TI.Scratchpad}'
widgets=root.find(p+'card').findall(p+'wdgt')
print(json.dumps({'rows':extract_calculator_rows(widgets[0]),'auth':widgets[0].find(sp+'auth').text,'flags':widgets[0].find(sp+'mFlags').text,'sibling':ET.tostring(widgets[1],encoding='unicode'),'program':root.find(p+'sym').find(p+'e').find(p+'v').text}))`;
function readSaved(file){return python("import sys;sys.path.insert(0,sys.argv[1])\n"+inspect,{file},[path.join(root,'editor_XML')]);}

test('Calculator saves preserve history data, authoring metadata, sibling apps and native CRs',async t=>{
  const{context,file,other,item}=setup(t),otherBefore=fs.readFileSync(other),before=readSaved(file);
  const rawXml='<sp:erow xmlns:sp="urn:TI.Scratchpad" retained="yes"><sp:entr>1+1</sp:entr><sp:rslt><sp:disp>2</sp:disp><sp:full>2.000</sp:full></sp:rslt><sp:ctxt ang="2" custom="yes"/></sp:erow>';
  const result=await context.save(item,[{entry:'1+1',exact:'1+1',display:'2',full:'2.000',rawXml,context:{ang:'2',custom:'yes'}},{entry:'demo()',display:'Done',full:'Done',output:[{text:'native output'}],kind:'program',status:'done'}]);
  const saved=readSaved(file);assert.equal(result.saved_rows,2);assert.equal(saved.rows[0].full,'2.000');assert.equal(saved.rows[0].context.custom,'yes');assert.match(saved.rows[0].rawXml,/retained="yes"/);
  assert.equal(saved.rows[1].entry,'demo()');assert.equal(saved.rows[1].output[0].text,'native output');assert.equal(saved.auth,'opaque\rauthor');assert.equal(saved.flags,'17');assert.equal(saved.program,'Prgm\rDisp 7\rEndPrgm');assert.equal(saved.sibling,before.sibling);
  assert.match(fs.readFileSync(file,'utf8'),/xmlns:unused="urn:preserve"/);assert.deepEqual(fs.readFileSync(other),otherBefore);assert.equal(context.xmlDoctor.embedded,false,'Saving Calculator must not mark unfinished BASIC as embedded');
  await context.save({...item,file:result.file,raw_xml:result.raw_xml},[]);assert.deepEqual(readSaved(file).rows,[]);assert.equal(readSaved(file).auth,saved.auth);
});

test('Calculator save rejects stale, missing and foreign identities without falling back to another widget',async t=>{
  const{context,file,other,item,directory,sourcePath}=setup(t),before=fs.readFileSync(file),otherBefore=fs.readFileSync(other);
  for(const invalid of [{...item,path:'/prob/card/wdgt[9]'},{...item,file:path.join(sourcePath,'Missing.xml')},{...item,file:path.join(directory,'foreign','Problem1.xml')},{...item,raw_xml:''},{...item,raw_xml:snapshot.replace('opaque','changed')},{...item,path:'/prob/card/wdgt[2]'}]){
    await assert.rejects(context.save(invalid,[{entry:'1',display:'1'}]));assert.deepEqual(fs.readFileSync(file),before);assert.deepEqual(fs.readFileSync(other),otherBefore);
  }
  await context.save(item,[{entry:'5',display:'5'}]);await assert.rejects(context.save(item,[{entry:'6',display:'6'}]),/changed/);assert.equal(readSaved(file).rows[0].display,'5');
});

test('Calculator replacement failure preserves the original file and removes temporary output',async t=>{
  const{context,file,item,stagePath}=setup(t,{failReplace:true}),before=fs.readFileSync(file);
  await assert.rejects(context.save(item,[{entry:'1',display:'1'}]),/simulated replacement failure/);assert.deepEqual(fs.readFileSync(file),before);assert.deepEqual(fs.readdirSync(stagePath).sort(),['Problem1.xml','Problem2.xml']);
});

test('document Calculator drafts retain clears, isolate widgets and ignore old-preview disposal',()=>{
  const source=app.slice(app.indexOf('function documentCalculatorHistoryDraft('),app.indexOf('\nasync function openCalculatorInLovePreview('));
  const sessions=new Map(),context={structuredClone,JSON,documentCalculatorSessions:sessions,documentCalculatorFile:file=>file.split('/').at(-1),documentCalculatorMathSession(file){const key=context.documentCalculatorFile(file);if(!sessions.has(key))sessions.set(key,{mathSession:{}});return sessions.get(key).mathSession;},extractCalculatorRowsFromRawXml:raw=>JSON.parse(raw||'[]')};
  vm.runInNewContext(source+'\nglobalThis.bind=documentCalculatorHistoryDraft;',context);
  const item={file:'/source/Problem1.xml',path:'/prob/card/wdgt[1]',raw_xml:'[]'},one=context.bind(item,{rows:[],input:''});one.remember({rows:[{entry:'1',display:'1',status:'error'}],input:'next'});
  const two=context.bind({...item,file:'/stage/Problem1.xml'},{rows:[],input:''});assert.equal(two.draft.rows.length,1);assert.equal(two.draft.rows[0].status,'error');assert.equal(two.draft.input,'next');
  two.remember({rows:[],input:''});one.remember({rows:[{entry:'old',display:'old'}],input:'old'});
  assert.equal(context.bind(item,{rows:[{entry:'fallback'}]}).draft.rows.length,0);
  assert.equal(context.bind({...item,path:'/prob/card/wdgt[2]'},{rows:[],input:''}).draft.rows.length,0);
  const replaced=context.bind({...item,raw_xml:'[{"entry":"new native","display":"7"}]'},{rows:[{entry:'stale session'}],input:'stale'});
  assert.equal(replaced.draft.rows[0].entry,'new native');assert.equal(replaced.draft.input,'');
  sessions.clear();assert.equal(context.bind(item,{rows:[],input:''}).draft.rows.length,0);
});
