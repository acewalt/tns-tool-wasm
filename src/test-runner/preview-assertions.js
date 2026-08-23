export function assertPreviewSnapshot(snapshot = {}, expected = {}) {
  const failures = [];
  const text = (snapshot.texts || []).join("\n");

  if (expected.runtimeOk != null && snapshot.runtimeOk !== expected.runtimeOk) {
    failures.push({ path: "runtimeOk", expected: expected.runtimeOk, received: snapshot.runtimeOk });
  }

  if (expected.noErrors === true && (snapshot.errors || []).length > 0) {
    failures.push({ path: "errors.length", expected: 0, received: snapshot.errors.length });
  }

  for (const value of toArray(expected.textContains)) {
    if (!text.includes(String(value))) {
      failures.push({ path: "textContains", expected: String(value), received: text });
    }
  }

  for (const value of toArray(expected.textNotContains)) {
    if (text.includes(String(value))) {
      failures.push({ path: "textNotContains", expected: `not ${String(value)}`, received: text });
    }
  }

  for (const matcher of toArray(expected.drawCallExists)) {
    const matched = (snapshot.drawCalls || []).some((call) => matchDrawCall(call, matcher));
    if (!matched) {
      failures.push({ path: "drawCallExists", expected: matcher, received: snapshot.drawCalls || [] });
    }
  }

  for (const [globalName, value] of Object.entries(expected.globalEquals || {})) {
    const received = snapshot.globals?.[globalName];
    if (!deepEqual(received, value)) {
      failures.push({ path: `globalEquals.${globalName}`, expected: value, received });
    }
  }

  return {
    passed: failures.length === 0,
    failures
  };
}

function matchDrawCall(call, matcher) {
  if (typeof matcher === "string") return call.op === matcher;
  if (!matcher || typeof matcher !== "object") return false;
  for (const [key, expected] of Object.entries(matcher)) {
    if (!deepEqual(call[key], expected)) return false;
  }
  return true;
}

function toArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
