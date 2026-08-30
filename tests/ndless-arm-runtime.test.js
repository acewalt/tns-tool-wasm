import assert from 'node:assert/strict';

await import('../ndless-arm-runtime-v2.js');
const runtime = globalThis.NdlessArmRuntime;
assert.ok(runtime, 'NdlessArmRuntime should be exposed globally');
assert.equal(runtime.version, 2);
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
  { type:3, data:0 },
  { type:4, data:0 },
  { type:0, data:0 },
  { type:1, data:4 },
  { type:2, data:20 },
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

assert.equal(runtime.normalizePath('A:\\documents\\doom1.wad'), '/documents/doom1.wad');
assert.equal(runtime.normalizePath('/documents//games/../doom2.wad'), '/documents/doom2.wad');
const wad = new Uint8Array([0x49,0x57,0x41,0x44,1,2,3,4]);
runtime.mountVirtualFile('/documents/doom1.wad', wad, { writable:false });
const mounted = runtime.getVirtualFile('A:\\documents\\doom1.wad');
assert.ok(mounted);
assert.deepEqual([...mounted.bytes], [...wad]);
assert.equal(mounted.writable, false);
assert.ok(runtime.listVirtualFiles().some(x => x.path === '/documents/doom1.wad' && x.size === wad.length));

assert.deepEqual(runtime.KEYMAP.ArrowUp, [0x1E, 0x001]);
assert.deepEqual(runtime.KEYMAP.ArrowDown, [0x1E, 0x010]);
assert.deepEqual(runtime.KEYMAP.ControlLeft, [0x1E, 0x200]);
assert.deepEqual(runtime.KEYMAP.Digit5, [0x14, 0x020]);
assert.deepEqual(runtime.KEYMAP.KeyA, [0x1C, 0x040]);
assert.equal(runtime.SYSCALL_ISEXT, 0x200000);
assert.equal(runtime.SYSCALL_ISVAR, 0x800000);
assert.ok(runtime.HEAP_SIZE >= 32 * 1024 * 1024, 'Doom needs a non-trivial emulated heap');

console.log('PASS Ndless live ARM v2 relocation, VFS and keyboard surfaces');
