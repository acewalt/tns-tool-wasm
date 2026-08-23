#!/usr/bin/env node
import fs from "node:fs/promises";
import { runLuaSuite } from "../src/api/index.js";
import { formatSuiteText } from "../src/test-runner/reporter.js";

const args = process.argv.slice(2);
const json = takeFlag(args, "--json");
const luaPath = args[0];
const testsPath = args[1];

if (!luaPath || !testsPath) {
  console.error("Usage: npm run lua-suite -- archivo.lua tests.json [--json]");
  process.exit(2);
}

const [luaSource, testsSource] = await Promise.all([
  fs.readFile(luaPath, "utf8"),
  fs.readFile(testsPath, "utf8")
]);

const parsed = JSON.parse(testsSource.replace(/^\uFEFF/, ""));
const suite = await runLuaSuite(luaSource, parsed, {
  filename: luaPath,
  functionName: parsed.function || parsed.functionName
});

if (json) {
  process.stdout.write(`${JSON.stringify(suite, null, 2)}\n`);
} else {
  process.stdout.write(`${formatSuiteText(suite)}\n`);
}

process.exit(suite.success ? 0 : 1);

function takeFlag(values, flag) {
  const index = values.indexOf(flag);
  if (index < 0) return false;
  values.splice(index, 1);
  return true;
}
