#!/usr/bin/env node
import fs from "node:fs/promises";
import { runLuaTest } from "../src/lua/index.js";
import { formatLuaTestText } from "../src/test-runner/reporter.js";

const args = process.argv.slice(2);
const json = args.includes("--json");
let functionName = null;
let callArgs = [];
let filePath = null;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--json") continue;
  if (arg === "--call") {
    functionName = args[index + 1];
    index += 1;
    continue;
  }
  if (arg === "--arg") {
    callArgs.push(args[index + 1] ?? "");
    index += 1;
    continue;
  }
  if (!filePath) filePath = arg;
}
if (!filePath) {
  console.error("Usage: npm run lua-test -- archivo.lua [--call functionName --arg value] [--json]");
  process.exit(2);
}

const luaSource = await fs.readFile(filePath, "utf8");
const result = await runLuaTest(luaSource, {
  filename: filePath,
  calls: functionName ? [{ functionName, args: callArgs }] : []
});

if (json) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  process.stdout.write(`${formatLuaTestText(result)}\n`);
}

process.exit(result.success ? 0 : 1);
