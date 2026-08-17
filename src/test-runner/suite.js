import { assertExpected } from "./assertions.js";
import { serializeError } from "../lua/runtime.js";

export async function runSuite(runtime, tests = [], options = {}) {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = runSingleTest(runtime, test, options);
    results.push(result);
    if (result.passed) passed += 1;
    else failed += 1;
  }

  const snapshot = runtime.snapshot();
  return {
    success: failed === 0 && snapshot.errors.length === 0,
    syntaxOk: snapshot.syntaxOk,
    runtimeOk: snapshot.runtimeOk,
    passed,
    failed,
    total: tests.length,
    stdout: snapshot.stdout,
    stderr: snapshot.stderr,
    errors: snapshot.errors,
    missingApis: snapshot.missingApis,
    results
  };
}

function runSingleTest(runtime, test = {}, options = {}) {
  const name = test.name || "(unnamed)";
  const functionName = test.function || test.functionName || options.functionName || "solveAnyEquation";
  const args = Array.isArray(test.args) ? test.args : test.input == null ? [] : [test.input];
  try {
    const received = runtime.call(functionName, args);
    const assertion = assertExpected(received, test.expected || {});
    return {
      name,
      function: functionName,
      args,
      passed: assertion.passed,
      expected: test.expected || {},
      received,
      failures: assertion.failures
    };
  } catch (error) {
    return {
      name,
      function: functionName,
      args,
      passed: false,
      expected: test.expected || {},
      received: null,
      failures: [{
        path: "$",
        expected: test.expected || {},
        received: null
      }],
      error: serializeError(error, `test:${name}`)
    };
  }
}
