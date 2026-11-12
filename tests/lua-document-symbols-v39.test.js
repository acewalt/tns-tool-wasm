import assert from 'node:assert/strict';
import test from 'node:test';
import {parseStoredTiValue} from '../src/lua/document-symbols.js';
import {installLuaDocumentBindings} from '../src/lua/document-symbols.js';
import {createLuaPreview} from '../src/lua/preview.js';
import fs from 'node:fs';
import vm from 'node:vm';
import {api as mathApi} from '../src/prgm/math-api.js';

test('stored TI values retain booleans, Unicode minus, exact rationals, matrices and quoted strings',()=>{
  assert.deepEqual(parseStoredTiValue('{true,−5,5/2,{"a""b",false},undef}','1'),[true,-5,2.5,['a"b',false],'undef']);
  assert.deepEqual(parseStoredTiValue('[[1,−2][3/2,4]]','2'),[[1,-2],[1.5,4]]);
  assert.equal(parseStoredTiValue('text without quotes','4'),'text without quotes');
  assert.equal(parseStoredTiValue('"a""b"','4'),'a"b');
  assert.throws(()=>parseStoredTiValue('unknown(5)','3'),/Unsupported stored TI value/);
  assert.throws(()=>parseStoredTiValue('1/0','3'),error=>error.code==='DIVISION_BY_ZERO');
});

test('Lua imports stored matrix values and recallstr without converting them to nil or JavaScript objects',async()=>{
  const session=await createLuaPreview(`
    function read()
      local m = var.recall("m")
      return {m[1][2], m[2][1], var.recall("flag"), var.recallstr("caption")}
    end
  `,{variables:{m:[[1,-2],[1.5,4]],flag:false,caption:'saved'}});
  try { assert.deepEqual(session.runtime.call('read'),[-2,1.5,false,'saved']);assert.deepEqual(session.snapshot().errors,[]); }
  finally { session.close(); }
});

test('math.eval invokes this problem’s Func definitions and nested helpers only',async()=>{
  const source=`function read() return math.eval("f(3)") end`;
  const functionsA={f:{params:'x',body:'Func\nReturn helper(x)+offset\nEndFunc'},helper:{params:'x',body:'Func\nReturn x^2\nEndFunc'}};
  const a=await createLuaPreview(source,{variables:{offset:2},basicFunctions:functionsA});
  const b=await createLuaPreview(source,{basicFunctions:{f:{params:'x',body:'Func\nReturn x+100\nEndFunc'}}});
  try { assert.equal(a.runtime.call('read'),11);assert.equal(b.runtime.call('read'),103);assert.equal(a.runtime.call('read'),11); }
  finally {a.close();b.close();}
});

test('unsupported math.eval returns nil and an explicit diagnostic, never zero',async()=>{
  const session=await createLuaPreview(`function read() local value,err=math.eval("not_a_supported_call(5)"); return {value==nil,err} end`);
  try {
    const result=session.runtime.call('read');assert.equal(result[0],true);assert.match(result[1],/UNSUPPORTED_FUNCTION/);
    assert.match(session.snapshot().unsupportedApis[0].message,/not_a_supported_call/);
  } finally {session.close();}
});

test('Lua var.store and math assignments share the same scope and nil deletes a variable',async()=>{
  const session=await createLuaPreview(`
    function read()
      var.store("X", 5)
      math.eval("x:=x+2")
      local n=var.recall("x")
      var.store("x",nil)
      return {n,var.recall("X")==nil}
    end
  `);
  try {assert.deepEqual(session.runtime.call('read'),[7,true]);}
  finally {session.close();}
});

test('resize initializes geometry before a ScriptApp on.create computes layout ratios',async()=>{
  const session=await createLuaPreview(`
    local height=nil
    function on.resize(w,h) height=h end
    function on.create() ratio=85/height end
    function read() return ratio end
  `,{width:318,height:212});
  try {assert.deepEqual(session.snapshot().errors,[]);assert.equal(session.runtime.call('read'),85/212);}
  finally {session.close();}
});

test('separate Lua runtimes resolve string methods in their own VM library',async()=>{
  const a=await createLuaPreview(`function read() return ("one"):upper() end`);
  const b=await createLuaPreview(`function read() return ("two"):upper() end`);
  try {assert.equal(a.runtime.call('read'),'ONE');assert.equal(b.runtime.call('read'),'TWO');assert.equal(a.runtime.call('read'),'ONE');}
  finally {a.close();b.close();}
});

test('shared document initialization preserves string-valued formulas and resolves forward references without changing Ans',()=>{
  const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
  const records=[
    {name:'d',value:'b+1',symbolType:'3'},
    {name:'b',value:'a+3',symbolType:'3'},
    {name:'a',value:'2',symbolType:'3'},
    {name:'fonction',value:'x^2-x^3',symbolType:'4'},
    {name:'angle',value:'near(msign(sa)*acos(ca))',symbolType:'4'},
    {name:'sa',value:'−0.9424',symbolType:'3'},
    {name:'ca',value:'0.3345',symbolType:'3'},
    {name:'table',value:'[[1/2,−2][3,4]]',symbolType:'2'},
    {name:'flag',value:'false',symbolType:'4'},
    {name:'ans',value:'7',symbolType:'3'},
    {name:'not_supported',value:'missing_data(1)',symbolType:'3'},
  ].map(item=>({...item,type:'variable'}));
  const context={window:{TnsTiBasicMath:mathApi},document:{documentElement:{lang:'en'}},documentCalculatorFile:file=>file,documentCalculatorSessions:new Map(),documentStoredVariables:()=>records};
  const start=app.indexOf('function documentCalculatorMathSession('),end=app.indexOf('function initializeCalculatorHistoryAnswer(',start);
  vm.runInNewContext(app.slice(start,end)+'\nglobalThis.initialize=documentCalculatorMathSession;',context);
  const session=context.initialize('Problem1.xml');
  assert.equal(session.variables.a,2);assert.equal(session.variables.b,5);assert.equal(session.variables.d,6);
  assert.equal(session.variables.fonction,'x^2-x^3');assert.equal(session.variables.angle,'near(msign(sa)*acos(ca))');
  assert.deepEqual(session.variables.table,[[0.5,-2],[3,4]]);assert.equal(session.variables.flag,false);
  assert.equal(session.variables.ans,7);assert.equal(Object.hasOwn(session.variables,'not_supported'),false);
  assert.equal(context.initialize('Problem1.xml'),session,'Opening another page in the same problem shares its context');
  assert.notEqual(context.initialize('Problem2.xml'),session,'Another problem receives a separate context');
});

test('opening Lua does not reset variables already edited by another page in the shared problem',async()=>{
  const session=await createLuaPreview('function read() return var.recall("a") end');
  try{
    const math=mathApi.createSession({variables:{a:7}});
    installLuaDocumentBindings(session.runtime.context,{variables:{a:2,b:3},mathSession:math});
    assert.equal(session.runtime.call('read'),7);
    assert.equal(math.variables.b,3);
  }finally{session.close();}
});
