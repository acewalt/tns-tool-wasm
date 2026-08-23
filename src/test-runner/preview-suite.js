import { createLuaPreview } from "../lua/preview.js";
import { serializeError } from "../lua/runtime.js";
import { assertPreviewSnapshot } from "./preview-assertions.js";

export async function runLuaPreviewSuite(luaSource, tests = [], options = {}) {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await runPreviewCase(luaSource, test, options);
    results.push(result);
    if (result.passed) passed += 1;
    else failed += 1;
  }

  return {
    success: failed === 0,
    syntaxOk: results.every((result) => result.syntaxOk !== false),
    runtimeOk: results.every((result) => result.runtimeOk !== false),
    passed,
    failed,
    total: tests.length,
    stdout: results.flatMap((result) => result.stdout || []),
    stderr: results.flatMap((result) => result.stderr || []),
    errors: results.flatMap((result) => result.errors || []),
    missingApis: results.flatMap((result) => result.missingApis || []),
    unsupportedApis: results.flatMap((result) => result.unsupportedApis || []),
    results
  };
}

async function runPreviewCase(luaSource, test = {}, options = {}) {
  const session = await createLuaPreview(luaSource, {
    ...options,
    globals: [...new Set([...(options.globals || []), ...Object.keys(test.expected?.globalEquals || {})])]
  });
  const steps = [];
  const name = test.name || "(unnamed)";
  try {
    for (const action of test.actions || []) {
      steps.push(await session.runAction(action));
    }
    const globals = [...new Set([...(options.globals || []), ...(test.globals || []), ...Object.keys(test.expected?.globalEquals || {})])];
    const snapshot = session.snapshot({ globals });
    const assertion = assertPreviewSnapshot(snapshot, test.expected || {});
    return {
      name,
      passed: assertion.passed && snapshot.errors.length === 0,
      syntaxOk: snapshot.syntaxOk,
      runtimeOk: snapshot.runtimeOk,
      stdout: snapshot.stdout,
      stderr: snapshot.stderr,
      errors: snapshot.errors,
      missingApis: snapshot.missingApis,
      unsupportedApis: snapshot.unsupportedApis,
      expected: test.expected || {},
      received: {
        texts: snapshot.texts,
        globals: snapshot.globals,
        drawCalls: snapshot.drawCalls
      },
      failures: assertion.failures,
      steps
    };
  } catch (error) {
    return {
      name,
      passed: false,
      syntaxOk: false,
      runtimeOk: false,
      stdout: [],
      stderr: [],
      errors: [serializeError(error, `preview:${name}`)],
      expected: test.expected || {},
      received: null,
      failures: [{
        path: "$",
        expected: test.expected || {},
        received: null
      }],
      steps
    };
  } finally {
    session.close();
  }
}
