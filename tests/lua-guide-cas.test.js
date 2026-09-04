import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../lua-guide-cas.js", import.meta.url), "utf8");

assert.doesNotThrow(() => new Function(source), "lua-guide-cas.js should parse as JavaScript");
assert.match(source, /\.lua-guide-categories/);
assert.match(source, /math\.evalStr/);
assert.match(source, /TnsCasBridge/);
assert.match(source, /TnsCasHybrid/);
assert.match(source, /deSolve/);
assert.match(source, /integral\(/);
assert.match(source, /cannot execute during initialization/);

console.log("lua-guide-cas tests: OK");
