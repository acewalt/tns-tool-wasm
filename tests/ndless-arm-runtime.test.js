import assert from 'node:assert/strict';

await import('../ndless-arm-runtime.js');
const runtime = globalThis.NdlessArmRuntime;
assert.ok(runtime, 'NdlessArmRuntime should be exposed globally');
assert.match(runtime.ENGINE_JS, /@alexaltea\/unicorn-js@2\.1\.4\/dist\/unicorn_arm\.js$/);
assert.match(runtime.ENGINE_WASM, /@alexaltea\/unicorn-js@2\.1\.4\/dist\/unicorn_arm\.wasm$/);

const base = 0x10000000;
const source = new Uint8Array(40);
const set32 = (off, value) => runtime.w32(source, off, value >>> 0);
set32(0, 0x10);
set32(4, 0x20);
set32(8, 0x30);
set32(12, 0xffffffff);
set32(20, 0x12345678);

const relocated = runtime.relocateImage(source, [
  { type:3, data:0 },       // FILE_COMPRESSED marker: already handled
  { type:4, data:0 },       // UNALIGNED_RELOC marker
  { type:0, data:0 },       // ADD_BASE
  { type:1, data:4 },       // ADD_BASE_GOT until 0xFFFFFFFF
  { type:2, data:20 },      // SET_ZERO
], base, 64);

assert.equal(relocated.length, 64, 'runtime allocation should include BSS/zero tail');
assert.equal(runtime.u32(relocated, 0), base + 0x10);
assert.equal(runtime.u32(relocated, 4), base + 0x20);
assert.equal(runtime.u32(relocated, 8), base + 0x30);
assert.equal(runtime.u32(relocated, 12), 0xffffffff, 'GOT terminator must be preserved');
assert.equal(runtime.u32(relocated, 20), 0, 'SET_ZERO must clear the target word');
assert.ok(relocated.subarray(40).every(v => v === 0), 'BSS tail must be zero initialized');

assert.throws(() => runtime.relocateImage(new Uint8Array(16), [{ type:4, data:1 }], base), /UNALIGNED_RELOC/);
assert.throws(() => runtime.relocateImage(new Uint8Array(16), [{ type:0, data:32 }], base), /outside image/);

console.log('PASS Ndless live ARM Zehn relocation semantics');
