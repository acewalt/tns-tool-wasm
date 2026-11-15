import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

const root=fileURLToPath(new URL('../',import.meta.url)),app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const save=app.slice(app.indexOf('async function saveNotepadWidgetToStage('),app.indexOf('\nfunction showNotepadModal('));
const bridge=`import ast,json,sys
sys.path.insert(0,sys.argv[1])
p=json.load(sys.stdin); ns=p['globals']
if p['fail']:
 import page_layout
 def fail(*args): raise OSError('replacement failure')
 page_layout.os.replace=fail
tree=ast.parse(p['code']); last=tree.body.pop()
exec(compile(tree,'<notes-save>','exec'),ns)
print(eval(compile(ast.Expression(last.value),'<result>','eval'),ns))`;
const binding='xmlns="urn:TI.Problem" xmlns:np="urn:TI.Notepad" xmlns:unused="urn:keep"';
const note='<wdgt type="TI.Notepad"><np:fmtxt>&lt;r2dtotree&gt;&lt;leaf&gt;old&lt;/leaf&gt;&lt;/r2dtotree&gt;</np:fmtxt><np:opaque>retain&#13;metadata</np:opaque></wdgt>';
const fixture=`<prob ${binding}><sym><e><v>Prgm&#13;Disp 1&#13;EndPrgm</v></e></sym><card>${note}${note.replace('old','sibling')}</card></prob>`;
function setup(t,fail=false){
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'tns-notes-save-v44-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const stagePath=path.join(directory,'stage'),sourcePath=path.join(directory,'source');fs.mkdirSync(stagePath);fs.mkdirSync(sourcePath);
 const file=path.join(stagePath,'Problem1.xml');fs.writeFileSync(file,fixture);
 const globals=new Map(),context={JSON,ensureXmlStageCopy:async()=>{},xmlDoctor:{stagePath:stagePath.replaceAll('\\','/'),sourcePath:sourcePath.replaceAll('\\','/')},pyodide:{globals:{set:(key,value)=>globals.set(key,value)},runPythonAsync:async code=>{
  const result=spawnSync(process.env.PYTHON||'python',['-c',bridge,path.join(root,'editor_XML')],{cwd:root,encoding:'utf8',input:JSON.stringify({code,globals:Object.fromEntries(globals),fail}),timeout:15000});
  if(result.status!==0)throw Error(result.stderr||String(result.error));return result.stdout.trim();
 }}};
 vm.runInNewContext(save+'\nglobalThis.save=saveNotepadWidgetToStage;',context);
 return{context,file,directory,stagePath,item:{file:path.join(sourcePath,'Problem1.xml'),path:'/prob/card/wdgt[1]',raw_xml:note.replace('<wdgt ',`<wdgt ${binding} `)}};
}
test('Notes save preserves sibling CRs and native metadata, and supports repeated snapshots',async t=>{
 const{context,file,item}=setup(t);
 const result=await context.save(item,'new','<r2dtotree><leaf>new</leaf></r2dtotree>');
 const xml=fs.readFileSync(file,'utf8');assert.match(xml,/xmlns:unused="urn:keep"/);assert.match(xml,/retain&#13;metadata/);assert.match(xml,/Prgm&#13;Disp 1&#13;EndPrgm/);assert.match(xml,/sibling/);
 assert.match(result.raw_xml,/&lt;leaf&gt;new&lt;\/leaf&gt;/);
 await context.save({...item,file:result.file,raw_xml:result.raw_xml},'second','<r2dtotree><leaf>second</leaf></r2dtotree>');assert.match(fs.readFileSync(file,'utf8'),/second/);
});
test('Notes refuses stale, mismatched or foreign widgets and invalid rich XML',async t=>{
 const{context,file,item,directory}=setup(t),before=fs.readFileSync(file);
 for(const bad of [{...item,raw_xml:''},{...item,path:'/prob/card/wdgt[2]'},{...item,file:path.join(directory,'Problem1.xml')},{...item,path:'/prob/card[9]/wdgt'},{...item,raw_xml:item.raw_xml.replace('old','changed')}]){
  await assert.rejects(context.save(bad,'new','<r2dtotree/>'));assert.deepEqual(fs.readFileSync(file),before);
 }
 await assert.rejects(context.save(item,'bad','<r2dtotree>'));assert.deepEqual(fs.readFileSync(file),before);
 await context.save(item,'new','<r2dtotree/>');await assert.rejects(context.save(item,'stale','<r2dtotree/>'),/changed/);
});
test('Notes atomic replacement failure keeps original bytes',async t=>{
 const{context,file,item,stagePath}=setup(t,true),before=fs.readFileSync(file);
 await assert.rejects(context.save(item,'new','<r2dtotree/>'),/replacement failure/);assert.deepEqual(fs.readFileSync(file),before);assert.deepEqual(fs.readdirSync(stagePath),['Problem1.xml']);
});
