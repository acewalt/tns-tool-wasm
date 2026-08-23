import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { installTiNspireMocks } from "./ti-nspire-mocks.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(__dirname, "..", "..");

const LUAJS_RUNTIME_FILES = [
  "vendor/luajs/lua.js",
  "vendor/luajs/nspire/env.js",
  "vendor/luajs/nspire/tools.js",
  "vendor/luajs/nspire/bindings.js",
  "vendor/luajs/nspire/platform.js",
  "vendor/luajs/nspire/timer.js",
  "vendor/luajs/nspire/locale.js"
];

export async function createLuaRuntime(options = {}) {
  const runtime = new LuaRuntime(options);
  await runtime.initialize();
  return runtime;
}

export async function loadLuaScript(filePath, options = {}) {
  const luaSource = await fs.readFile(filePath, "utf8");
  const runtime = await createLuaRuntime({ ...options, filename: filePath });
  await runtime.load(luaSource, { filename: filePath, callLifecycle: options.callLifecycle });
  return runtime;
}

export class LuaRuntime {
  constructor(options = {}) {
    this.options = options;
    this.rootDir = options.rootDir ? path.resolve(options.rootDir) : DEFAULT_REPO_ROOT;
    this.state = {
      stdout: [],
      stderr: [],
      errors: [],
      missingApis: [],
      drawCalls: [],
      store: { ...(options.variables || {}) },
      nativeEditors: []
    };
    this.context = null;
    this.loaded = false;
    this.syntaxOk = false;
    this.runtimeOk = false;
  }

  async initialize() {
    const sandbox = createSandbox(this.state, this.options);
    this.context = vm.createContext(sandbox, {
      name: "tns-tool-wasm-lua-runtime",
      codeGeneration: { strings: true, wasm: false }
    });

    for (const file of LUAJS_RUNTIME_FILES) {
      const source = await fs.readFile(path.join(this.rootDir, file), "utf8");
      vm.runInContext(source, this.context, { filename: file });
    }

    installLuaJsCompatibilityPatches(this.context, this.state);
    installTiNspireMocks(this.context, this.state, this.options);
    return this;
  }

  compile(luaSource) {
    this.assertInitialized();
    const normalized = normalizeLuaSource(luaSource);
    const parsed = this.context.lua_parser.parse(normalized);
    return stripLuaJsBootstrap(parsed);
  }

  async load(luaSource, options = {}) {
    this.assertInitialized();
    const filename = options.filename || this.options.filename || "lua-script.lua";
    try {
      const jsSource = this.compile(luaSource);
      this.syntaxOk = true;
      vm.runInContext(jsSource, this.context, { filename });
      this.loaded = true;
      this.runtimeOk = true;
      if (options.callLifecycle) this.callLifecycle();
      return this;
    } catch (error) {
      const phase = this.syntaxOk ? "runtime" : "syntax";
      this.runtimeOk = false;
      this.state.errors.push(serializeError(error, phase));
      throw error;
    }
  }

  callLifecycle() {
    for (const eventName of ["create", "construction"]) {
      try {
        const handler = this.getGlobalPath(`on.${eventName}`);
        if (handler) this.context.lua_call(handler, []);
      } catch (error) {
        this.state.errors.push(serializeError(error, `lifecycle:${eventName}`));
      }
    }
  }

  call(functionName, args = []) {
    this.assertInitialized();
    if (!this.loaded) throw new Error("No Lua source has been loaded into this runtime");
    const fn = this.getGlobalPath(functionName);
    if (typeof fn !== "function") {
      throw new Error(`Lua global function not found: ${functionName}`);
    }
    try {
      const luaArgs = args.map((arg) => jsToLua(this.context, arg));
      const values = this.context.lua_call(fn, luaArgs);
      const converted = values.map((value) => luaToJson(this.context, value));
      return converted.length <= 1 ? converted[0] : converted;
    } catch (error) {
      this.state.errors.push(serializeError(error, `call:${functionName}`));
      throw error;
    }
  }

  getGlobalPath(pathName) {
    this.assertInitialized();
    const parts = String(pathName || "").split(".").filter(Boolean);
    let value = this.context.G;
    for (const part of parts) {
      value = this.context.lua_tableget(value, part);
      if (value == null) return null;
    }
    return value;
  }

  setGlobal(name, value) {
    this.assertInitialized();
    this.context.lua_tableset(this.context.G, name, jsToLua(this.context, value));
  }

  getGlobal(name) {
    const value = this.getGlobalPath(name);
    return luaToJson(this.context, value);
  }

  resetDrawCalls() {
    this.state.drawCalls = [];
  }

  getDrawSnapshot() {
    const drawCalls = [...(this.state.drawCalls || [])];
    return {
      drawCalls,
      texts: drawCalls
        .filter((call) => call.op === "drawString")
        .map((call) => String(call.text ?? ""))
    };
  }

  snapshot() {
    return {
      success: this.syntaxOk && this.runtimeOk && this.state.errors.length === 0,
      syntaxOk: this.syntaxOk,
      runtimeOk: this.runtimeOk,
      stdout: [...this.state.stdout],
      stderr: [...this.state.stderr],
      errors: [...this.state.errors],
      warnings: [...(this.state.warnings || [])],
      missingApis: [...this.state.missingApis],
      unsupportedApis: [...this.state.missingApis],
      ...this.getDrawSnapshot()
    };
  }

  close() {
    this.loaded = false;
  }

  assertInitialized() {
    if (!this.context) throw new Error("Lua runtime is not initialized");
  }
}

export function jsToLua(global, value) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return global.lua_newtable(value.map((item) => jsToLua(global, item)));
  if (typeof value === "object") {
    const table = global.lua_newtable();
    for (const [key, child] of Object.entries(value)) {
      global.lua_tableset(table, key, jsToLua(global, child));
    }
    return table;
  }
  throw new TypeError(`Cannot convert JavaScript value to Lua: ${typeof value}`);
}

export function luaToJson(global, value, seen = new WeakSet()) {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "function") throw new TypeError("Cannot convert Lua function to JSON");
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) throw new TypeError("Cannot convert circular Lua table to JSON");
  seen.add(value);

  const stringKeys = Object.keys(value.str || {}).filter((key) => key !== "__nativeState");
  const numericKeys = tableNumericKeys(value);
  const boolKeys = Object.keys(value.bool || value.bools || {});
  const objectKeys = Array.isArray(value.objs) ? value.objs : [];
  const isArrayOnly = stringKeys.length === 0 && boolKeys.length === 0 && objectKeys.length === 0 && numericKeys.every((key, index) => key === index + 1);

  if (isArrayOnly) {
    return numericKeys.map((key) => luaToJson(global, global.lua_rawget(value, key), seen));
  }

  const output = {};
  for (const key of stringKeys) {
    output[key] = luaToJson(global, value.str[key], seen);
  }
  for (const key of numericKeys) {
    output[String(key)] = luaToJson(global, global.lua_rawget(value, key), seen);
  }
  const boolTable = value.bool || value.bools || {};
  for (const key of Object.keys(boolTable)) {
    output[key] = luaToJson(global, boolTable[key], seen);
  }
  for (let index = 0; index < objectKeys.length; index += 1) {
    output[`object:${index}`] = luaToJson(global, objectKeys[index][1], seen);
  }
  return output;
}

export function serializeError(error, phase = "runtime", details = {}) {
  return {
    code: inferErrorCode(error, phase),
    phase,
    message: String(error?.message || error),
    file: details.file || null,
    line: details.line || extractLine(error),
    details,
    stack: String(error?.stack || "").split("\n").slice(0, 8)
  };
}

function inferErrorCode(error, phase) {
  const message = String(error?.message || error || "");
  const lower = message.toLowerCase();
  if (message.includes("Unsupported LuaJS/TI-Nspire API")) return "TI_NSPIRE_API_UNSUPPORTED";
  if (lower.includes("function not found")) return "LUA_FUNCTION_NOT_FOUND";
  if (phase === "syntax") return "LUA_SYNTAX_ERROR";
  if (phase.startsWith("call:")) return "LUA_CALL_ERROR";
  return "LUA_RUNTIME_ERROR";
}

function extractLine(error) {
  const stack = String(error?.stack || "");
  const match = stack.match(/:(\d+):\d+\)?(?:\n|$)/);
  return match ? Number(match[1]) : null;
}

function createSandbox(state, options) {
  const drawingContext = createDrawingContextMock();
  const width = Number(options.width) || 318;
  const height = Number(options.height) || 212;
  const sandbox = {
    console: {
      info: () => {},
      log: (...args) => state.stdout.push(args.join(" ")),
      warn: (...args) => state.stderr.push(args.join(" ")),
      error: (...args) => state.stderr.push(args.join(" "))
    },
    Math,
    Date,
    String,
    Number,
    Boolean,
    Array,
    Object,
    RegExp,
    JSON,
    Error,
    TypeError,
    SyntaxError,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    Infinity,
    NaN,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    canvas: { width, height },
    context: drawingContext
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  return sandbox;
}

function createDrawingContextMock() {
  const noOp = () => {};
  return {
    beginPath: noOp,
    moveTo: noOp,
    lineTo: noOp,
    closePath: noOp,
    stroke: noOp,
    save: noOp,
    restore: noOp,
    scale: noOp,
    arc: noOp,
    fill: noOp,
    strokeRect: noOp,
    fillRect: noOp,
    fillText: noOp,
    measureText: (text) => ({ width: String(text ?? "").length * 6 }),
    font: "10px sans-serif",
    lineWidth: 1,
    fillStyle: "#000000",
    strokeStyle: "#000000"
  };
}

function installLuaJsCompatibilityPatches(global, state) {
  const originalLen = global.lua_len;
  global.lua_len = (value) => {
    if (value == null || value === false) return 0;
    return originalLen(value);
  };
  if (global.G?.str) {
    global.G.str.next = (table, key = null) => {
      if (table == null || table === false || typeof table !== "object") return [null, null];
      const keys = luaTableKeys(table);
      const start = key == null ? 0 : keys.findIndex((candidate) => candidate === key) + 1;
      if (key != null && start <= 0) return [null, null];
      for (let index = start; index < keys.length; index += 1) {
        const entryKey = keys[index];
        const entry = global.lua_rawget(table, entryKey);
        if (entry != null) return [entryKey, entry];
      }
      return [null, null];
    };
  }
  global.not_supported = () => {
    const message = "Unsupported LuaJS/TI-Nspire API called";
    state.missingApis.push({
      code: "TI_NSPIRE_API_UNSUPPORTED",
      api: "unknown",
      status: "unsupported",
      message
    });
    throw new Error(message);
  };
}

function luaTableKeys(table) {
  const keys = [];
  for (const key of Object.keys(table.str || {})) keys.push(key);
  if (table.arraymode && Array.isArray(table.uints)) {
    for (let index = table.uints.length - 1; index >= 0; index -= 1) {
      if (table.uints[index] != null) keys.push(index + 1);
    }
  } else {
    for (const key of Object.keys(table.uints || {})) keys.push(Number(key));
  }
  for (const key of Object.keys(table.floats || {})) keys.push(Number(key));
  const boolTable = table.bool || table.bools || {};
  for (const key of Object.keys(boolTable)) keys.push(key === "true");
  const objectKeys = Array.isArray(table.objs) ? table.objs : [];
  for (const entry of objectKeys) keys.push(entry[0]);
  return keys;
}

function stripLuaJsBootstrap(parsedJs) {
  const lines = String(parsedJs).split("\n");
  return lines.slice(19).join("\n");
}

function tableNumericKeys(table) {
  const keys = new Set();
  if (table.arraymode && Array.isArray(table.uints)) {
    for (let index = 0; index < table.uints.length; index += 1) {
      if (table.uints[index] != null) keys.add(index + 1);
    }
  } else {
    for (const key of Object.keys(table.uints || {})) {
      if (table.uints[key] != null) keys.add(Number(key));
    }
  }
  for (const key of Object.keys(table.floats || {})) {
    if (table.floats[key] != null) keys.add(Number(key));
  }
  return [...keys].filter((key) => Number.isFinite(key)).sort((a, b) => a - b);
}

function normalizeLuaSource(luaSource) {
  return decodeXmlTextEntities(String(luaSource || ""))
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
}

function decodeXmlTextEntities(text) {
  return String(text || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}
