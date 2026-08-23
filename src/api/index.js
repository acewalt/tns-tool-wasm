export { getCapabilities, TNS_TOOL_VERSION } from "../core/capabilities.js";

export {
  addLuaScriptApp,
  addLuaScriptAppFromFile,
  buildTns,
  createTnsDocument,
  extractTns,
  getLuaScriptApps,
  inspectTns
} from "../core/tns/node-tns.js";

export {
  LuaRuntime,
  createLuaRuntime,
  loadLuaScript,
  luaToJson,
  jsToLua,
  callLuaFunction,
  createLuaPreview,
  runLuaPreviewActions,
  runLuaTest,
  runLuaTestSuite
} from "../lua/index.js";

export { getTiNspireMockCapabilities } from "../lua/ti-nspire-mocks.js";

import { runLuaTest, runLuaTestSuite, loadLuaScript, runLuaPreviewActions as runPreviewActions } from "../lua/index.js";

export async function validateLua(luaSource, options = {}) {
  return runLuaTest(luaSource, options);
}

export async function runLua(luaSource, options = {}) {
  return runLuaTest(luaSource, options);
}

export async function callLuaFunctionFromFile(filePath, functionName, args = [], options = {}) {
  const runtime = await loadLuaScript(filePath, options);
  try {
    const value = runtime.call(functionName, args);
    const snapshot = runtime.snapshot();
    return {
      success: snapshot.success,
      syntaxOk: snapshot.syntaxOk,
      runtimeOk: snapshot.runtimeOk,
      stdout: snapshot.stdout,
      stderr: snapshot.stderr,
      errors: snapshot.errors,
      missingApis: snapshot.missingApis,
      function: functionName,
      args,
      value
    };
  } catch (error) {
    const snapshot = runtime.snapshot();
    return {
      success: false,
      syntaxOk: snapshot.syntaxOk,
      runtimeOk: false,
      stdout: snapshot.stdout,
      stderr: snapshot.stderr,
      errors: snapshot.errors,
      missingApis: snapshot.missingApis,
      function: functionName,
      args,
      value: null,
      error: {
        code: "LUA_CALL_ERROR",
        message: String(error?.message || error),
        details: {}
      }
    };
  } finally {
    runtime.close();
  }
}

export async function runLuaSuite(luaSource, suiteDefinition = {}, options = {}) {
  const tests = Array.isArray(suiteDefinition) ? suiteDefinition : suiteDefinition.tests || [];
  if (suiteDefinition?.type === "preview" || tests.some((test) => Array.isArray(test.actions))) {
    const { runLuaPreviewSuite } = await import("../test-runner/preview-suite.js");
    return runLuaPreviewSuite(luaSource, tests, {
      ...options,
      globals: suiteDefinition.globals || options.globals || []
    });
  }
  return runLuaTestSuite(luaSource, tests, {
    ...options,
    functionName: suiteDefinition.function || suiteDefinition.functionName || options.functionName
  });
}

export async function runLuaPreview(luaSource, actionsOrDefinition = [], options = {}) {
  const actions = Array.isArray(actionsOrDefinition) ? actionsOrDefinition : actionsOrDefinition.actions || [];
  return runPreviewActions(luaSource, actions, {
    ...options,
    globals: actionsOrDefinition.globals || options.globals || []
  });
}
