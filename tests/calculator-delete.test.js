import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');
const item=(path,isDir=false)=>({path,name:path.split('/').pop(),isDir,size:0});
function fixture(directories,{accept=true,protectedPath=null}={}){
  const nodes=new Map(),node=()=>({textContent:'',dataset:{},disabled:false,hidden:false,value:0,setAttribute(){},classList:{toggle(){}}});
  const root={querySelector:selector=>{if(selector==='[data-ti-rows]')return null;if(!nodes.has(selector))nodes.set(selector,node());return nodes.get(selector);},querySelectorAll:()=>[]};
  const document={documentElement:{lang:'en'},addEventListener(){},createElement:node};
  const window={},reads=[],writes=[],confirmations=[];
  const context=vm.createContext({window,document,console,Uint8Array,DataView,ArrayBuffer,TextEncoder,TextDecoder,Date,Error,setTimeout,clearTimeout,confirm:message=>{confirmations.push({message,reads:[...reads],writes:[...writes]});return typeof accept==='function'?accept(message):accept;}});
  vm.runInContext(read('ti-nspire-webusb.js'),context);
  const source=read('ti-calculator-transfer.js').replace('window.TnsCalculatorTransfer=Object.freeze({open,close});','window.TnsCalculatorTransfer=Object.freeze({open,close,deleteOne,deleteTargets,planDeletion});window.testState=state;');
  vm.runInContext(source,context);
  const state=window.testState;state.root=root;
  state.link={connected:true,broken:false,
    async listDir(path){reads.push(path);if(!directories.has(path))throw Error('Missing folder '+path);return directories.get(path).map(f=>({...f}));},
    async deleteEntry(path,isDir){
      writes.push(path);
      if(path===protectedPath)throw Object.assign(Error('Native rejection'),{code:'USB_DELETE_REJECTED',deviceStatus:'ff 04',path});
      if(isDir){assert.equal(directories.get(path).length,0,'A folder must be emptied before removing it');directories.delete(path);}
      const parent=path.slice(0,path.lastIndexOf('/'))||'/';directories.set(parent,directories.get(parent).filter(f=>f.path!==path));
    }
  };
  state.cache.set('/',directories.get('/'));
  return {api:window.TnsCalculatorTransfer,state,nodes,reads,writes,confirmations};
}
const tree=()=>new Map([
  ['/',[item('/Drafts',true),item('/keep.tns')]],
  ['/Drafts',[item('/Drafts/a.tns'),item('/Drafts/empty',true),item('/Drafts/sub',true)]],
  ['/Drafts/empty',[]],['/Drafts/sub',[item('/Drafts/sub/b.tns')]]
]);
{
  const directories=tree(),f=fixture(directories,{accept:false});
  await f.api.deleteOne(item('/Drafts',true));
  assert.equal(f.confirmations.length,1);assert.match(f.confirmations[0].message,/Files: 2 · Folders: 3/);
  assert.match(f.confirmations[0].message,/\/Drafts/);assert.match(f.confirmations[0].message,/cannot be undone/);
  assert.deepEqual(f.confirmations[0].reads,['/Drafts','/Drafts/empty','/Drafts/sub'],'Enumeration finishes before confirmation');
  assert.deepEqual(f.writes,[],'Cancellation never sends a delete command');assert.ok(directories.has('/Drafts'));
}
{
  const directories=tree(),f=fixture(directories,{accept:()=>{directories.get('/Drafts').push(item('/Drafts/new-after-confirmation.tns'));return true;}});
  await f.api.deleteOne(item('/Drafts',true));
  assert.ok(directories.has('/Drafts'),'A newly added item prevents removal of the parent folder');
  assert.equal(directories.get('/Drafts')[0].path,'/Drafts/new-after-confirmation.tns');
  assert.ok(!f.writes.includes('/Drafts/new-after-confirmation.tns'),'Do not expand a confirmed deletion plan');
}
{
  const directories=tree(),f=fixture(directories);
  await f.api.deleteTargets([item('/Drafts',true),item('/Drafts/sub/b.tns')]);
  assert.deepEqual(f.writes,['/Drafts/a.tns','/Drafts/empty','/Drafts/sub/b.tns','/Drafts/sub','/Drafts']);
  assert.deepEqual(f.confirmations[0].writes,[]);assert.ok(!directories.has('/Drafts'));
  assert.equal(directories.get('/').length,1);assert.equal(directories.get('/')[0].path,'/keep.tns');
  assert.equal(f.state.busy,false);
}
{
  const directories=new Map([['/',[item('/Drafts',true)]],['/Drafts',[item('/Drafts/a.tns'),item('/Drafts/locked.tns')]]]);
  const f=fixture(directories,{protectedPath:'/Drafts/locked.tns'});
  await f.api.deleteOne(item('/Drafts',true));
  assert.deepEqual(f.writes,['/Drafts/a.tns','/Drafts/locked.tns'],'Stop on the first rejection; never remove its parent');
  assert.ok(directories.has('/Drafts'));assert.equal(directories.get('/Drafts').length,1);
  const message=f.nodes.get('[data-ti-status]').textContent;
  assert.match(message,/Operation failed/);assert.match(message,/\/Drafts\/locked.tns/);assert.match(message,/FF 04/);
  assert.match(message,/Confirmed deletions: 1\/3/);assert.doesNotMatch(message,/Communication error/);
  assert.equal(f.state.link.connected,true);
}
{
  const directories=tree(),f=fixture(directories);
  await assert.rejects(f.api.planDeletion([item('/',true)]),/verify/);
  directories.set('/Drafts',[{name:'outside.tns',path:'/Other/outside.tns',isDir:false}]);
  await assert.rejects(f.api.planDeletion([item('/Drafts',true)]),/verify/);
  directories.set('/Drafts',Array.from({length:1001},(_,i)=>item('/Drafts/'+i+'.tns')));
  await assert.rejects(f.api.planDeletion([item('/Drafts',true)]),/1000/);
  assert.deepEqual(f.writes,[]);assert.equal(f.confirmations.length,0);
}
console.log('Recursive calculator deletion: preflight, cancellation, postorder, overlapping selections, scope limits and partial rejection passed.');
