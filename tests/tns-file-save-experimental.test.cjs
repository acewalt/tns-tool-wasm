const assert = require("node:assert/strict");
const test = require("node:test");
const core = require("../tns-file-save-experimental-core.js");

function writableHandle(log) {
  return {
    async createWritable() {
      log.push("createWritable");
      return {
        async write(bytes) { log.push(["write", Array.from(bytes)]); },
        async close() { log.push("close"); },
        async abort() { log.push("abort"); },
      };
    },
  };
}

test("successful build validates before opening destination and writes complete bytes", async () => {
  const log = [];
  const result = await core.buildValidateAndWrite({
    build: async () => { log.push("build"); return { ok: true, bytes: Uint8Array.of(1, 2, 3), filename: "ok.tns" }; },
    validate(bytes) { log.push(["validate", bytes.length]); return { valid: true, family: "document" }; },
    handle: writableHandle(log),
  });
  assert.equal(result.bytesWritten, 3);
  assert.deepEqual(log, ["build", ["validate", 3], "createWritable", ["write", [1, 2, 3]], "close"]);
});

test("build failure never calls createWritable", async () => {
  const log = [];
  await assert.rejects(() => core.buildValidateAndWrite({
    build: async () => { log.push("build"); throw new Error("rebuild failed"); },
    validate() { log.push("validate"); return { valid: true }; },
    handle: writableHandle(log),
  }), /rebuild failed/);
  assert.deepEqual(log, ["build"]);
});

test("validation failure never calls createWritable", async () => {
  const log = [];
  await assert.rejects(() => core.buildValidateAndWrite({
    build: async () => { log.push("build"); return { ok: true, bytes: Uint8Array.of(9) }; },
    validate() { log.push("validate"); return { valid: false, reason: "bad-format" }; },
    handle: writableHandle(log),
  }), /bad-format/);
  assert.deepEqual(log, ["build", "validate"]);
});

test("empty artifact is rejected before destination access", async () => {
  const log = [];
  await assert.rejects(() => core.buildValidateAndWrite({
    build: async () => ({ ok: true, bytes: new Uint8Array(0) }),
    validate() { log.push("validate"); return { valid: true }; },
    handle: writableHandle(log),
  }), /empty/);
  assert.deepEqual(log, []);
});

test("write error aborts writable instead of reporting a successful close", async () => {
  const log = [];
  const handle = {
    async createWritable() {
      log.push("createWritable");
      return {
        async write() { log.push("write"); throw new Error("disk error"); },
        async close() { log.push("close"); },
        async abort() { log.push("abort"); },
      };
    },
  };
  await assert.rejects(() => core.buildValidateAndWrite({
    build: async () => ({ ok: true, bytes: Uint8Array.of(7) }),
    validate: () => ({ valid: true }),
    handle,
  }), /disk error/);
  assert.deepEqual(log, ["createWritable", "write", "abort"]);
});
