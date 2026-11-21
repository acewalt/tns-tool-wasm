import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Run the vendor compiler itself, without browser/CLI compatibility patches.
const source=fs.readFileSync(new URL('../vendor/luajs/lua.js',import.meta.url),'utf8');
function run(chunk){
 const context=vm.createContext({console});vm.runInContext(source,context);
 const compiled=context.lua_parser.parse(chunk);vm.runInContext(compiled,context);
 return JSON.parse(JSON.stringify(context.lua_call(context.G.str.read,[])));
}

test('local functions recurse, capture outer locals and shadow globals without leaking their binding',()=>{
 assert.deepEqual(run(`
   function f(n) return 999 end
   local scale=2
   local function factorial(n) if n<=1 then return scale end return n*factorial(n-1) end
   local function factory(offset)
     local function f(n) if n==0 then return offset end return n+f(n-1) end
     return f
   end
   local first=factory(10);local second=factory(20)
   function read() return factorial(5),first(3),second(3),f(5) end
 `),[240,16,26,999]);
});

test('local recursive closures are separate on repeated calls and preserve mutual forward bindings',()=>{
 assert.deepEqual(run(`
   function read()
     local even,odd
     even=function(n) if n==0 then return true end return odd(n-1) end
     odd=function(n) if n==0 then return false end return even(n-1) end
     local function f(n) if n<2 then return 1 end return n*f(n-1) end
     return f(8),even(12),odd(11)
   end
 `),[40320,true,true]);
});

test('assert preserves multiple returns and protected calls preserve success/error results',()=>{
 assert.deepEqual(run(`
   function read()
     local a,b=assert(true,17)
     local ok,x,y=xpcall(function() return 3,4 end,function(e)return 'bad' end)
     local no,err=xpcall(function() error('test') end,function(e)return 'caught:'..e end)
     local broken,msg=xpcall(function() error('test') end,function(e)error('handler')end)
     return a,b,ok,x,y,no,err,broken,msg
   end
 `),[true,17,true,3,4,false,'caught:test',false,'error in error handling']);
});

test('rawequal respects types and object identity without invoking equality metamethods',()=>{
 assert.deepEqual(run(`function read()
   local t={};local other={};local mt={__eq=function()return true end};setmetatable(t,mt);setmetatable(other,mt)
   return rawequal(t,t),rawequal(t,other),rawequal(1,'1'),rawequal(nil,nil),rawequal(false,false)
 end`),[true,false,false,true,true]);
});

test('math rad/deg convert in the right direction and clock reads a finite elapsed time',()=>{
 const [rad,deg,radNegative,degNegative,clock]=run(`function read()return math.rad(180),math.deg(math.pi),math.rad(-90),math.deg(-math.pi/2),os.clock() end`);
 assert.ok(Math.abs(rad-Math.PI)<1e-12);assert.equal(deg,180);assert.ok(Math.abs(radNegative+Math.PI/2)<1e-12);assert.equal(degNegative,-90);assert.ok(Number.isFinite(clock)&&clock>=0);
});

test('Lua 5.1 legacy table traversals preserve keys, array order and non-nil early returns',()=>{
 assert.deepEqual(run(`function read()
   local t={10,20,30};local total=0;local ordered=''
   table.foreach(t,function(k,v)total=total+k+v end)
   table.foreachi(t,function(k,v)ordered=ordered..tostring(k)..':'..tostring(v)..';'end)
   local stop=table.foreachi(t,function(k,v)if k==2 then return false end end)
   return table.getn(t),total,ordered,stop
 end`),[3,66,'1:10;2:20;3:30;',false]);
});

test('unsupported bytecode, coroutines and heap measurement return named diagnostics instead of fake results',()=>{
 const values=run(`function read()
   local a,b=pcall(collectgarbage,'count')
   local c,d=pcall(string.dump,function()return 1 end)
   local e,f=pcall(coroutine.create,function()return 1 end)
   return a,b,c,d,e,f
 end`);
 assert.equal(values[0],false);assert.match(values[1],/collectgarbage\(count\).*JavaScript/);
 assert.equal(values[2],false);assert.match(values[3],/string.dump.*bytecode/);
 assert.equal(values[4],false);assert.match(values[5],/coroutine.create.*call stack/);
});
