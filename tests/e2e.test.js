import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "cli", "tns-tool.js");
const solverFixture = path.join(__dirname, "fixtures", "simple_solver.lua");
const genericFixture = path.join(__dirname, "fixtures", "generic_utils.lua");
const previewFixture = path.join(__dirname, "fixtures", "preview_counter.lua");
const suiteFixture = path.join(__dirname, "edo.sample.json");
const previewActionsFixture = path.join(__dirname, "preview.actions.json");
const previewSuiteFixture = path.join(__dirname, "preview.sample.json");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tns-tool-e2e-"));

const capabilities = runJson(["capabilities", "--json"]);
assert.equal(capabilities.success, true);
assert.equal(capabilities.capabilities.lua.callFunction, true);
assert.equal(capabilities.capabilities.tns.inspect, true);

const mocks = runJson(["lua", "mocks", "--json"]);
assert.equal(mocks.success, true);
assert.equal(mocks.mockedApis["platform.window"].status, "partial");

const check = runJson(["lua", "check", solverFixture, "--json"]);
assert.equal(check.success, true);
assert.equal(check.syntaxOk, true);

const stdinCheck = runJson(["lua", "check", "-", "--json"], fs.readFileSync(genericFixture, "utf8"));
assert.equal(stdinCheck.success, true);

const genericCall = runJson([
  "lua",
  "call",
  genericFixture,
  "--function",
  "addPair",
  "--args",
  "[2,3]",
  "--json"
]);
assert.equal(genericCall.success, true);
assert.equal(genericCall.value.sum, 5);
assert.deepEqual(genericCall.value.values, [2, 3]);

const suite = runJson(["lua", "suite", solverFixture, suiteFixture, "--json"]);
assert.equal(suite.success, true);
assert.equal(suite.passed, 2);
assert.equal(suite.failed, 0);

const preview = runJson([
  "lua",
  "preview",
  previewFixture,
  "--actions",
  previewActionsFixture,
  "--json"
]);
assert.equal(preview.success, true);
assert.equal(preview.final.globals.counter, 1);
assert.equal(preview.final.globals.textValue, "A[down]");
assert.equal(preview.final.texts.includes("Counter: 1"), true);

const previewSuite = runJson(["lua", "suite", previewFixture, previewSuiteFixture, "--json"]);
assert.equal(previewSuite.success, true);
assert.equal(previewSuite.passed, 2);
assert.equal(previewSuite.failed, 0);

const createdTns = path.join(tempDir, "created.tns");
const withLuaTns = path.join(tempDir, "with-lua.tns");
const extractedDir = path.join(tempDir, "extracted");
const rebuiltTns = path.join(tempDir, "rebuilt.tns");
const created = runJson(["tns", "create", "--output", createdTns, "--json"]);
assert.equal(created.success, true);
assert.equal(fs.existsSync(createdTns), true);
const inserted = runJson(["tns", "add-lua", createdTns, previewFixture, "--output", withLuaTns, "--json"]);
assert.equal(inserted.success, true);
assert.equal(inserted.summary.luaScriptCount, 1);
const inspected = runJson(["tns", "inspect", withLuaTns, "--json"]);
assert.equal(inspected.success, true);
assert.equal(inspected.luaScripts.length, 1);
assert.equal(inspected.luaScripts[0].source.includes("Counter:"), true);
const extracted = runJson(["tns", "extract", withLuaTns, "--output", extractedDir, "--json"]);
assert.equal(extracted.success, true);
assert.equal(extracted.summary.luaScriptCount, 1);
const rebuilt = runJson(["tns", "build", extractedDir, "--output", rebuiltTns, "--json"]);
assert.equal(rebuilt.success, true);
assert.equal(fs.existsSync(rebuiltTns), true);

const externalLua = "C:\\Users\\walt\\Downloads\\math_fixed_corregido.LUA";
if (fs.existsSync(externalLua)) {
  const externalCall = runJson([
    "lua",
    "call",
    externalLua,
    "--function",
    "solveAnyEquation",
    "--args",
    "[\"y''+4*y=0\"]",
    "--json"
  ]);
  assert.equal(externalCall.success, true);
  assert.equal(externalCall.value.solved, true);
}

console.log("PASS e2e tns-tool CLI");

function runJson(args, input = "") {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: repoRoot,
    input,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, `CLI failed:\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
  assert.equal(result.stderr.trim(), "");
  return JSON.parse(result.stdout);
}
