import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const root=fileURLToPath(new URL('../',import.meta.url)),app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const save=app.slice(app.indexOf('async function saveGraphWidgetToStage('),app.indexOf('\nfunction showGraphModal('));
const bridge=`import ast,json,sys
sys.path.insert(0,sys.argv[1])
p=json.load(sys.stdin); ns=p['globals']
if p['fail']:
 import page_layout
 def fail(*args): raise OSError('replacement failure')
 page_layout.os.replace=fail
tree=ast.parse(p['code']); last=tree.body.pop()
exec(compile(tree,'<graph-save>','exec'),ns)
print(eval(compile(ast.Expression(last.value),'<result>','eval'),ns))`;
const binding='xmlns="urn:TI.Problem" xmlns:gg="urn:TI.GeoGrapher" xmlns:np="urn:TI.Notepad" xmlns:unused="urn:keep"';
const note='<wdgt type="TI.GeoGrapher"><gg:objs><gg:axes_system><gg:id>1</gg:id><gg:umin>-10</gg:umin><gg:umax>10</gg:umax><gg:vmin>-7</gg:vmin><gg:vmax>7</gg:vmax></gg:axes_system><gg:expression><gg:id>2</gg:id><gg:lbl>f1</gg:lbl><gg:expr>sin(x)</gg:expr></gg:expression><gg:graph><gg:id>3</gg:id><gg:par>1 2 </gg:par><gg:pref>f1(x)</gg:pref></gg:graph></gg:objs></wdgt>';
const fixture=`<prob ${binding}><sym><e><n>untouched</n><v>Prgm&#13;Disp 1&#13;EndPrgm</v></e></sym><card>${note}<wdgt type="TI.Notepad"><np:fmtxt>retain&#13;sibling</np:fmtxt><np:opaque><!--keep-->metadata</np:opaque></wdgt></card></prob>`;
const graphState={curves:[{id:'3',expressionId:'2',name:'f1',formula:'2*sin(0.5*x)',visible:true}],viewport:{xmin:-12,xmax:12,ymin:-5,ymax:5}};
function setup(t,fail=false){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tns-graph-save-v44-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const stagePath=path.join(directory,'stage'),sourcePath=path.join(directory,'source');fs.mkdirSync(stagePath);fs.mkdirSync(sourcePath);
 const file=path.join(stagePath,'Problem1.xml');fs.writeFileSync(file,fixture);
 const globals=new Map(),context={JSON,ensureXmlStageCopy:async()=>{},xmlDoctor:{stagePath:stagePath.replaceAll('\\','/'),sourcePath:sourcePath.replaceAll('\\','/')},pyodide:{globals:{set:(key,value)=>globals.set(key,value)},runPythonAsync:async code=>{
  const result=spawnSync(process.env.PYTHON||'python',['-c',bridge,path.join(root,'editor_XML')],{cwd:root,encoding:'utf8',input:JSON.stringify({code,globals:Object.fromEntries(globals),fail}),timeout:15000});
  if(result.status!==0)throw Error(result.stderr||String(result.error));return result.stdout.trim();
 }}};
 context.extractGraphStateFromRawXml=()=>({name:'f1',formula:'sin(x)'});context.normalizeGraphFormulaInput=x=>x;vm.runInNewContext(save+'\nglobalThis.save=saveGraphWidgetToStage;',context);
 return{context,file,directory,stagePath,item:{file:path.join(sourcePath,'Problem1.xml'),path:'/prob/card/wdgt[1]',raw_xml:note.replace('<wdgt ',`<wdgt ${binding} `)}};
}
test('Graphs save preserves sibling CRs and metadata, updates native curves/symbols and repeats snapshots',async t=>{
 const{context,file,item}=setup(t);
 const result=await context.save(item,graphState);
 const xml=fs.readFileSync(file,'utf8');assert.match(xml,/xmlns:unused="urn:keep"/);assert.match(xml,/retain&#13;sibling/);assert.match(xml,/Prgm&#13;Disp 1&#13;EndPrgm/);assert.match(xml,/<!--keep-->/);
 assert.match(result.raw_xml,/2\*sin\(0\.5\*x\)/);assert.match(xml,/<n>f1<\/n>/);
 await context.save({...item,file:result.file,raw_xml:result.raw_xml},{...graphState,curves:[{...graphState.curves[0],formula:'cos(x)'}]});assert.match(fs.readFileSync(file,'utf8'),/cos\(x\)/);
});

test('Graphs refuses stale, mismatched, foreign and missing identities without falling back',async t=>{
 const{context,file,item,directory}=setup(t),before=fs.readFileSync(file);
 for(const bad of [{...item,raw_xml:''},{...item,path:'/prob/card/wdgt[2]'},{...item,file:path.join(directory,'Problem1.xml')},{...item,path:'/prob/card[9]/wdgt'},{...item,raw_xml:item.raw_xml.replace('sin(x)','cos(x)')}]){
  await assert.rejects(context.save(bad,graphState));assert.deepEqual(fs.readFileSync(file),before);
 }
 await context.save(item,graphState);await assert.rejects(context.save(item,graphState),/changed/);
});

test('Graphs atomic replacement failure keeps original bytes',async t=>{
 const{context,file,item,stagePath}=setup(t,true),before=fs.readFileSync(file);
 await assert.rejects(context.save(item,graphState),/replacement failure/);assert.deepEqual(fs.readFileSync(file),before);assert.deepEqual(fs.readdirSync(stagePath),['Problem1.xml']);
});
