import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../ti-cas-preview-bridge-v2.js", import.meta.url), "utf8");
let captured = null;
const windowObject = {
  createLuaJsPreviewRuntime: async (code, ctx, canvas, logEl, symbols) => {
    captured = { code, ctx, canvas, logEl, symbols };
    return { ok: true };
  },
  setTimeout,
};
const context = {
  window: windowObject,
  console,
  URL,
  performance,
  setTimeout,
  clearTimeout,
  Infinity,
};
vm.createContext(context);
vm.runInContext(source, context, { filename: "ti-cas-preview-bridge-v2.js" });

const bridge = windowObject.TnsCasBridge;
assert.ok(bridge, "TnsCasBridge should be installed");
assert.equal(windowObject.__tnsCasPreviewBridgeInstalled, true);
assert.match(bridge.version, /v2$/);
assert.equal(bridge.translateTiToGiac("deSolve(y'=x*y,x,y)"), "desolve(y'=x*y,x,y)");
assert.equal(bridge.translateTiToGiac("nSolve(x^2-4=0,x)"), "fsolve(x^2-4=0,x)");
assert.equal(bridge.translateGiacToTi("pi+infinity"), "π+∞");
assert.equal(bridge.shouldHandle("factor(x^2-1)", "eval", []), true);
assert.equal(bridge.shouldHandle('tolower("ABC")', "eval", []), false);
assert.equal(bridge.shouldHandle("miFuncion(2)", "evalStr", ["miFuncion"]), false);
assert.equal(bridge.sourceNeedsCas('local r=math.evalStr("factor(x^2-1)")'), true);
assert.equal(bridge.sourceNeedsCas('local r=math.eval("tolower(\\\"ABC\\\")")', ["tolower"]), false);
assert.equal(bridge.luaPatternToRegExp("%S+").exec("hola mundo")[0], "hola");
assert.equal(bridge.luaPatternToRegExp("%d+").exec("abc123")[0], "123");

const gmatchLog = { textContent: "", scrollTop: 0, scrollHeight: 0 };
await windowObject.createLuaJsPreviewRuntime(
  'for word in string.gmatch("uno dos", "%S+") do print(word) end',
  null,
  null,
  gmatchLog,
  { variables: {}, basicFunctions: {} }
);
assert.ok(captured.code.includes("__tnsStringGmatch"));
assert.equal(typeof captured.symbols.variables.__tnsStringGmatch, "function");

const log = { textContent: "", scrollTop: 0, scrollHeight: 0 };
const runtime = await windowObject.createLuaJsPreviewRuntime(
  'local r = math.evalStr("factor(x^2-1)")',
  null,
  null,
  log,
  { variables: { keep: 1 }, basicFunctions: { custom: {} } }
);
assert.deepEqual(runtime, { ok: true });
assert.ok(captured.code.includes("__tnsCasEvalStr"));
assert.ok(captured.code.includes('local r = math.evalStr("factor(x^2-1)")'));
assert.equal(captured.symbols.variables.keep, 1);
assert.equal(typeof captured.symbols.variables.__tnsCasEval, "function");
assert.equal(typeof captured.symbols.variables.__tnsCasEvalStr, "function");
assert.match(log.textContent, /CAS Preview:/);

console.log("ti-cas-preview-bridge v2 tests: OK");
