import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLuaScript, runLuaTest, runLuaTestSuite } from "../src/lua/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, "fixtures", "simple_solver.lua");
const luaSource = await fs.readFile(fixture, "utf8");

const single = await runLuaTest(luaSource);
assert.equal(single.success, true);
assert.equal(single.syntaxOk, true);
assert.equal(single.runtimeOk, true);

const lua = await loadLuaScript(fixture);
const solved = lua.call("solveAnyEquation", ["y''+4*y=0"]);
assert.equal(solved.solved, true);
assert.equal(Array.isArray(solved.lines), true);
const nested = lua.call("nested", []);
assert.deepEqual(nested.data.items, [1, 2, 3]);
lua.close();

const tests = JSON.parse(await fs.readFile(path.join(__dirname, "edo.sample.json"), "utf8"));
const suite = await runLuaTestSuite(luaSource, tests.tests, { functionName: tests.function });
assert.equal(suite.success, true);
assert.equal(suite.passed, 2);
assert.equal(suite.failed, 0);

console.log("PASS smoke Lua runner");
