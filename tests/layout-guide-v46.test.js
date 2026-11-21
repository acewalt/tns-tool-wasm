import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apiCatalog,guideCategories,usedApis,compatibilityFor,localize} from '../src/lua/api-catalog.js';
import {createMathSession} from '../src/prgm/math-api.js';
import {runLuaPreviewActions} from '../src/lua/preview.js';

test('pointer ratios are native integers before layout persistence',()=>{
 const context={window:{},document:{documentElement:{lang:'en'}}};
 vm.runInNewContext(fs.readFileSync(new URL('../web/document-compound-preview.js',import.meta.url),'utf8'),context);
 const layout=context.window.TnsCompoundPreview.layoutFor({previewItems:[{},{}],detail:{clay:2,h1:4312.739128,w1:5000}});
 assert.equal(layout.h1,4313);
 for(const value of Object.values(layout))assert.equal(Number.isInteger(value),true);
});
test('Lua guide has unique stable entries, all site languages, categories and real pattern example',async()=>{
 assert.equal(new Set(apiCatalog.map(item=>item.id)).size,apiCatalog.length);
 assert.equal(guideCategories.length,10);
 for(const item of apiCatalog)for(const lang of ['en','es','fr'])assert.ok(localize(item.description,lang),item.id+' '+lang);
 const entry=apiCatalog.find(item=>item.id==='string-gmatch');
 const result=await runLuaPreviewActions(entry.example,[{type:'paint'}]);
 assert.equal(result.success,true,JSON.stringify(result.final.errors));
 assert.deepEqual(result.final.texts,['Hola','Mundo','Lua']);
});
test('used API detection ignores quoted examples and comments',()=>{
 const entries=usedApis('-- string.gsub("x","x","y")\nlocal s="string.find()"\nfor word in string.gmatch("x y", "%S+") do end\n--[[math.eval("1")]]');
 assert.deepEqual(entries.map(item=>item.id),['string-gmatch']);
});
test('compatibility distinguishes evidence, partial CAS and unsupported Lua features',()=>{
 const report=JSON.parse(fs.readFileSync(new URL('../docs/qa/lua-compatibility-v45.json',import.meta.url),'utf8'));
 for(const id of ['lua-coroutine','lua-gc','string-dump'])assert.equal(compatibilityFor(apiCatalog.find(item=>item.id===id),report).status,'unsupported');
 assert.ok(compatibilityFor(apiCatalog.find(item=>item.id==='string-gmatch'),report).checks.length);
 assert.match(compatibilityFor(apiCatalog.find(item=>item.id==='math-eval'),report).note.en,/CAS/);
});
test('Calculator preserves Lua API names as symbolic calls and evaluates only their arguments',async()=>{
 const session=createMathSession();
 assert.equal((await session.evaluateAsync('math.eval(1+2^2)')).display,'math.eval(5)');
 assert.equal((await session.evaluateAsync('math.eval("1+1")')).display,'math.eval("1+1")');
 assert.equal((await session.evaluateAsync('math.evalstr(1*1)')).display,'math.evalstr(1)');
 assert.equal((await session.evaluateAsync('373.216-273.15')).display,'100.066');
 await assert.rejects(session.evaluateAsync('math.eval()'));
});

 test('all supplied non-CAS guide examples load and paint in a fresh Lua session',async()=>{
 for(const entry of apiCatalog.filter(e=>e.example&&compatibilityFor(e).status!=='unsupported'&&e.category!=='cas')){
  const result=await runLuaPreviewActions(entry.example,[{type:'paint'}]);
  assert.equal(result.success,true,entry.id+': '+JSON.stringify(result.final.errors));
 }
 });
