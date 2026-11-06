const test=require('node:test'),assert=require('node:assert/strict');
const {installEditorShortcutMenuGuard}=require('../desktop/editor-shortcuts.cjs');
test('editor chords bypass native menu accelerators without suppressing renderer events',()=>{
  let listener;const calls=[];installEditorShortcutMenuGuard({on:(event,fn)=>{assert.equal(event,'before-input-event');listener=fn;},setIgnoreMenuShortcuts:value=>calls.push(value)});
  const event={preventDefault:()=>{throw Error('DOM keyboard events must remain enabled');}};
  for(const input of [{key:'r',control:true},{key:'B',control:true},{key:'r',meta:true},{key:'r',control:true,shift:true},{key:'r',control:true,alt:true},{key:'Control'},{key:'c',control:true}])listener(event,input);
  assert.deepEqual(calls,[true,true,true,false,false,false,false]);
});
