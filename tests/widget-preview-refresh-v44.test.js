import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const begin=source.indexOf('async function readStoredDocumentWidget(');
const end=source.indexOf('\nfunction createSpreadsheetPreviewState(',begin);
const bridge=source.slice(begin,end)+'\nglobalThis.read=readStoredDocumentWidget;';
function setup(items){
  // Parser output for an already-inspected native widget; these tests concern
  // snapshot ownership and target selection rather than XML parser behavior.
  const old={type:'Widget',name:'tabulator',file:'/source/Problem1.xml',path:'/prob/card[2]/wdgt',raw_xml:'old snapshot'};
  const current={...old,file:'/stage/Problem1.xml',raw_xml:'fresh snapshot',detail:{columns:26}};
  const context={Error,inspectXmlDocument:async()=>({items:items||[current]}),
    documentXmlFileIdentity:file=>String(file||'').replace(/^\/(source|stage)\//,''),
    DOMParser:class{parseFromString(xml){return{documentElement:{namespaceURI:xml==='wrong namespace'?'urn:foreign':'urn:TI.Problem',localName:'wdgt',getAttribute:()=> 'tabulator'}};}}};
  vm.runInNewContext(bridge,context);return{old,current,context};
}
test('opening a cached Inspector widget reads the exact latest stage snapshot without mutating older views',async()=>{
  const{old,current,context}=setup(),fresh=await context.read(old,'tabulator');
  assert.equal(fresh.file,'/stage/Problem1.xml');assert.equal(fresh.raw_xml,'fresh snapshot');
  assert.notEqual(fresh,current);assert.notEqual(fresh.detail,current.detail);
  assert.equal(old.raw_xml,'old snapshot');assert.equal(old.file,'/source/Problem1.xml');
});
test('refresh rejects foreign, noncanonical or removed identities instead of falling back to a sole sheet',async()=>{
  const{old,context}=setup();
  for(const changes of [{file:'/foreign/Problem1.xml'},{file:'../Problem1.xml'},{file:'C:/elsewhere/Problem1.xml'},{file:''},{path:'/prob/card[3]/wdgt'},{path:'/prob/card[2]/wdgt[99]'},{path:'/prob/card[2]/wdgt/script'}]){
    await assert.rejects(context.read({...old,...changes},'tabulator'),/identity|no longer exists/);
  }
});
test('same path in another problem, a different app type and duplicate targets are not accepted',async()=>{
  const{old,current}=setup();
  for(const items of [[{...current,file:'/stage/Problem2.xml'}],[{...current,name:'TI.Notepad'}],[current,{...current}]]){
    await assert.rejects(setup(items).context.read(old,'tabulator'),/no longer exists/);
  }
});
test('a matching label cannot substitute an application outside the native Problem namespace',async()=>{
  const{old,current}=setup();
  await assert.rejects(setup([{...current,raw_xml:'wrong namespace'}]).context.read(old,'tabulator'),/not a native/);
});
