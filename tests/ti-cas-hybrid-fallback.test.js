import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../ti-cas-hybrid-fallback-v1.js", import.meta.url), "utf8");
let captured = null;
const windowObject = {
  createLuaJsPreviewRuntime: async (code, ctx, canvas, logEl, symbols) => {
    captured = { code, ctx, canvas, logEl, symbols };
    return { ok: true };
  },
  setTimeout,
};
const context = { window: windowObject, console, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(source, context, { filename: "ti-cas-hybrid-fallback-v1.js" });

const hybrid = windowObject.TnsCasHybrid;
assert.ok(hybrid, "TnsCasHybrid should be installed");
assert.match(hybrid.version, /hybrid-v1$/);
assert.equal(hybrid.translateIntegralAlias("integral((y+2)/(y-1),y)"), "integrate((y+2)/(y-1),y)");
assert.deepEqual(
  hybrid.parseCall("deSolve(y'=-((x^2+1)*(y-1))/((x-3)*(y+2)),x,y)", ["deSolve"]).args,
  ["y'=-((x^2+1)*(y-1))/((x-3)*(y+2))", "x", "y"]
);

const seen = [];
const symbols = {
  variables: {
    __tnsCasEvalStr: (expr) => {
      seen.push(expr);
      return [expr === "integrate(x^2,x)" ? "x^3/3" : expr, null, true];
    },
    __tnsCasEval: (expr) => [2, null, true],
  }
};
await windowObject.createLuaJsPreviewRuntime(
  'local r = math.evalStr("integral(x^2,x)")',
  null,
  null,
  { textContent: "", scrollTop: 0, scrollHeight: 0 },
  symbols
);
const wrapped = captured.symbols.variables.__tnsCasEvalStr;
assert.deepEqual(wrapped("integral(x^2,x)"), ["x^3/3", null, true]);
assert.deepEqual(seen, ["integrate(x^2,x)"]);

console.log("ti-cas-hybrid-fallback tests: OK");
