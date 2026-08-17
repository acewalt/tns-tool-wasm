export function formatSuiteText(suite) {
  const lines = [];
  for (const result of suite.results || []) {
    lines.push(`${result.passed ? "PASS" : "FAIL"}  ${result.name}`);
    if (!result.passed) {
      if (result.error?.message) lines.push(`Error: ${result.error.message}`);
      for (const failure of result.failures || []) {
        lines.push("");
        lines.push(`Expected: ${failure.path}=${formatValue(failure.expected)}`);
        lines.push(`Received: ${failure.path}=${formatValue(failure.received)}`);
      }
      lines.push("");
    }
  }
  lines.push("");
  lines.push(`Passed: ${suite.passed}`);
  lines.push(`Failed: ${suite.failed}`);
  lines.push(`Total: ${suite.total}`);
  if (suite.errors?.length) {
    lines.push("");
    lines.push("Errors:");
    for (const error of suite.errors) lines.push(`- ${error.phase}: ${error.message}`);
  }
  if (suite.missingApis?.length) {
    lines.push("");
    lines.push("Missing TI-Nspire APIs:");
    for (const api of suite.missingApis) lines.push(`- ${api}`);
  }
  return lines.join("\n");
}

export function formatLuaTestText(result) {
  const lines = [];
  lines.push(result.success ? "PASS  Lua script loaded" : "FAIL  Lua script loaded");
  lines.push(`syntaxOk=${result.syntaxOk}`);
  lines.push(`runtimeOk=${result.runtimeOk}`);
  for (const call of result.results || []) {
    lines.push(`CALL  ${call.function}`);
    lines.push(formatValue(call.value));
  }
  if (result.errors?.length) {
    lines.push("");
    lines.push("Errors:");
    for (const error of result.errors) lines.push(`- ${error.phase}: ${error.message}`);
  }
  return lines.join("\n");
}

function formatValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
