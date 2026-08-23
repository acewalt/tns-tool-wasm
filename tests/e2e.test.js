import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "cli", "tns-tool.js");
const solverFixture = path.join(__dirname, "fixtures", "simple_solver.lua");
const genericFixture = path.join(__dirname, "fixtures", "generic_utils.lua");
const suiteFixture = path.join(__dirname, "edo.sample.json");

const capabilities = runJson(["capabilities", "--json"]);
assert.equal(capabilities.success, true);
assert.equal(capabilities.capabilities.lua.callFunction, true);
assert.equal(capabilities.capabilities.tns.inspect, false);

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

