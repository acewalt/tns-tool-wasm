import assert from "node:assert/strict";

globalThis.window = globalThis;
await import("../ndless-arm-decoder.js");
await import("../ndless-analysis.js");

const image = new Uint8Array(32);
const view = new DataView(image.buffer);
const put = (offset, word) => view.setUint32(offset, word >>> 0, true);

// 0x0000: b 0x0010. Bytes at 0x0004..0x000C intentionally look like
// plausible ARM code but are unreachable from entry and must not be decoded
// by the default Smart/reachable analysis.
put(0x00, 0xEA000002);
put(0x04, 0xE92D4010); // push {r4,lr} - unreachable
put(0x08, 0xE3A0007F); // mov r0,#127 - unreachable
put(0x0C, 0xE12FFF1E); // bx lr - unreachable
put(0x10, 0xE3A00001); // mov r0,#1
put(0x14, 0xE12FFF1E); // bx lr
put(0x18, 0xE3A01002); // trailing unreachable bytes
put(0x1C, 0xE12FFF1E);

const model = {
  image,
  codeStart: 0,
  codeEnd: image.length,
  runtimeBase: 0,
  entry: 0,
  fileOffsetBase: 0,
  containerOffsetBase: 0,
  runtimeToImage: address => Number.isInteger(address) && address >= 0 && address < image.length ? address : null,
};

const smart = window.NdlessAnalysis.analyze(model, { mode: "reachable" });
assert.equal(smart.analysisMode, "reachable");
assert.deepEqual(smart.instructions.map(row => row.address), [0x00, 0x10, 0x14]);
assert.equal(smart.instructions.some(row => row.address === 0x04), false);
assert.equal(smart.instructions.some(row => row.address === 0x18), false);

const full = window.NdlessAnalysis.analyze(model, { mode: "full" });
assert.equal(full.analysisMode, "full");
assert.equal(full.instructions.length, 8);
assert.equal(full.instructions.some(row => row.address === 0x04), true);
assert.equal(full.instructions.some(row => row.address === 0x18), true);

console.log("PASS Ndless reachable analysis skips unreachable linear-sweep bytes");
