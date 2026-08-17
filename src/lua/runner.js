import { createLuaRuntime, loadLuaScript, serializeError } from "./runtime.js";
import { runSuite } from "../test-runner/suite.js";

export async function runLuaTest(luaSource, options = {}) {
  const runtime = await createLuaRuntime(options);
  const results = [];
  try {
    await runtime.load(luaSource, options);
    const calls = normalizeCalls(options);
    for (const call of calls) {
      results.push({
        name: call.name,
        function: call.functionName,
        args: call.args,
        value: runtime.call(call.functionName, call.args)
      });
    }
  } catch (_error) {
    // The runtime already stored the structured error.
  }
  const snapshot = runtime.snapshot();
  runtime.close();
  return {
    ...snapshot,
    success: snapshot.syntaxOk && snapshot.runtimeOk && snapshot.errors.length === 0,
    results
  };
}

export async function runLuaTestSuite(luaSource, tests = [], options = {}) {
  const runtime = await createLuaRuntime(options);
  try {
    await runtime.load(luaSource, options);
  } catch (error) {
    const snapshot = runtime.snapshot();
    runtime.close();
    return {
      success: false,
      syntaxOk: snapshot.syntaxOk,
      runtimeOk: snapshot.runtimeOk,
      passed: 0,
      failed: tests.length,
      total: tests.length,
      stdout: snapshot.stdout,
      stderr: snapshot.stderr,
      errors: snapshot.errors.length ? snapshot.errors : [serializeError(error, "load")],
      results: tests.map((test) => ({
        name: test.name || "(unnamed)",
        passed: false,
        error: "Lua source could not be loaded",
        expected: test.expected || null,
        received: null
      }))
    };
  }
  const suite = await runSuite(runtime, tests, options);
  runtime.close();
  return suite;
}

export async function callLuaFunction(luaSourceOrRuntime, functionName, args = [], options = {}) {
  if (luaSourceOrRuntime && typeof luaSourceOrRuntime.call === "function") {
    return luaSourceOrRuntime.call(functionName, args);
  }
  const runtime = await createLuaRuntime(options);
  try {
    await runtime.load(String(luaSourceOrRuntime || ""), options);
    return runtime.call(functionName, args);
  } finally {
    runtime.close();
  }
}

export { createLuaRuntime, loadLuaScript };

function normalizeCalls(options) {
  if (Array.isArray(options.calls)) return options.calls.map(normalizeCall);
  if (options.functionName || options.call) return [normalizeCall(options.call || options)];
  return [];
}

function normalizeCall(call) {
  return {
    name: call.name || call.functionName || call.function || "call",
    functionName: call.functionName || call.function || "solveAnyEquation",
    args: Array.isArray(call.args) ? call.args : call.input == null ? [] : [call.input]
  };
}
