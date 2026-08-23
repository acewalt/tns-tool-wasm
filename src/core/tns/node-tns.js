import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const BRIDGE = path.join(__dirname, "tns_bridge.py");

export async function inspectTns(inputPath) {
  return runTnsBridge(["inspect", inputPath]);
}

export async function extractTns(inputPath, outputDir) {
  return runTnsBridge(["extract", inputPath, "--output", outputDir]);
}

export async function buildTns(projectDir, outputTns) {
  return runTnsBridge(["build", projectDir, "--output", outputTns]);
}

export async function createTnsDocument(outputTns) {
  return runTnsBridge(["create", "--output", outputTns]);
}

export async function addLuaScriptApp(inputPath, luaSourceOrFile, outputTns, options = {}) {
  if (options.luaFile) {
    return addLuaScriptAppFromFile(inputPath, options.luaFile, outputTns);
  }
  const maybeFile = String(luaSourceOrFile || "");
  try {
    const stat = await fs.stat(maybeFile);
    if (stat.isFile()) return addLuaScriptAppFromFile(inputPath, maybeFile, outputTns);
  } catch (_error) {
    // Treat as source text below.
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tns-tool-lua-"));
  const tempFile = path.join(tempDir, "script.lua");
  await fs.writeFile(tempFile, String(luaSourceOrFile || ""), "utf8");
  try {
    return await addLuaScriptAppFromFile(inputPath, tempFile, outputTns);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function addLuaScriptAppFromFile(inputPath, luaFile, outputTns) {
  return runTnsBridge(["add-lua", inputPath, luaFile, "--output", outputTns]);
}

export async function getLuaScriptApps(inputPath) {
  const inspected = await inspectTns(inputPath);
  return inspected.luaScripts || [];
}

export async function runTnsBridge(args = [], options = {}) {
  const python = options.python || process.env.PYTHON || "python";
  const result = await spawnJson(python, [BRIDGE, ...args], {
    cwd: options.cwd || REPO_ROOT
  });
  return result;
}

function spawnJson(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch (error) {
        reject(new Error(`TNS bridge did not return JSON. exit=${code}\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}\n${error.message}`));
        return;
      }
      if (stderr.trim()) parsed.stderr = stderr.trim().split(/\r?\n/);
      parsed.exitCode = code;
      resolve(parsed);
    });
  });
}
