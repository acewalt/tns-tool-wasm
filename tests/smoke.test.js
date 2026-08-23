import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLuaPreview, loadLuaScript, runLuaPreviewActions, runLuaTest, runLuaTestSuite } from "../src/lua/index.js";

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

const previewFixture = path.join(__dirname, "fixtures", "preview_counter.lua");
const previewSource = await fs.readFile(previewFixture, "utf8");
const preview = await createLuaPreview(previewSource, { filename: previewFixture });
preview.event("charIn", ["A"]);
preview.event("enterKey");
const previewSnapshot = preview.snapshot({ globals: ["counter", "textValue"] });
assert.equal(previewSnapshot.runtimeOk, true);
assert.equal(previewSnapshot.globals.counter, 1);
assert.equal(previewSnapshot.globals.textValue, "A");
assert.equal(previewSnapshot.texts.includes("Counter: 1"), true);
preview.close();

const previewRun = await runLuaPreviewActions(previewSource, [
  { type: "event", event: "mouseDown", args: [12, 34] },
  { type: "paint" }
], { filename: previewFixture, globals: ["textValue"] });
assert.equal(previewRun.success, true);
assert.equal(previewRun.final.globals.textValue, "mouse:12,34");

console.log("PASS smoke Lua runner");
