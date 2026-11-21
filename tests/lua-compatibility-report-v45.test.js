import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(new URL('../web/lua-compatibility-report.js',import.meta.url),'utf8'),context);
const report=context.window.TnsLuaCompatibility;
test('gmatch is supported; real LuaJS limitations are reported with their source lines',()=>{
 const supported=report.analyze('function on.paint(gc) for w in string.gmatch("one two","%S+") do gc:drawString(w,0,0) end end');
 assert.equal(supported.status.preview,'ready');assert.equal(supported.warnings.length,0);
 const pending=report.analyze('local co=coroutine.create(function()end)\nstring.dump(function()end)\ncollectgarbage("count")');
 assert.equal(pending.status.preview,'review');
 assert.deepEqual(Array.from(pending.warnings[0].lines),[1,2,3]);
 for(const language of ['es','en','fr']){
   const text=report.reportText(pending,language);
   assert.match(text,/LuaJS/);assert.match(text,/string.dump/);assert.match(text,/collectgarbage/);
 }
});
