export function assertExpected(actual, expected = {}) {
  const failures = [];
  for (const [key, expectedValue] of Object.entries(expected || {})) {
    const receivedValue = getDeepValue(actual, key);
    if (!deepEqual(receivedValue, expectedValue)) {
      failures.push({
        path: key,
        expected: expectedValue,
        received: receivedValue
      });
    }
  }
  return {
    passed: failures.length === 0,
    failures
  };
}

export function getDeepValue(value, path) {
  if (!path) return value;
  const direct = readPath(value, path);
  if (direct !== undefined) return direct;
  return findKeyDeep(value, path);
}

function readPath(value, path) {
  const parts = String(path).split(".");
  let current = value;
  for (const part of parts) {
    if (current == null || typeof current !== "object" || !(part in current)) return undefined;
    current = current[part];
  }
  return current;
}

function findKeyDeep(value, key, seen = new WeakSet()) {
  if (value == null || typeof value !== "object") return undefined;
  if (seen.has(value)) return undefined;
  seen.add(value);
  if (Object.prototype.hasOwnProperty.call(value, key)) return value[key];
  for (const child of Object.values(value)) {
    const found = findKeyDeep(child, key, seen);
    if (found !== undefined) return found;
  }
  return undefined;
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
