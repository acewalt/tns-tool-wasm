import assert from "node:assert/strict";

globalThis.window = globalThis;
await import("../ndless-zehn.js");
await import("../ndless-rebuilder.js");

function putU32LE(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value >>> 0, true);
}

async function compressDeflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function makeCompressedZehn(exec) {
  const compressed = await compressDeflate(exec);
  const bytes = new Uint8Array(36 + compressed.length);
  putU32LE(bytes, 0, 0x6e68655a);
  putU32LE(bytes, 4, 1);
  putU32LE(bytes, 8, bytes.length);
  putU32LE(bytes, 12, 1);
  putU32LE(bytes, 16, 0);
  putU32LE(bytes, 20, 0);
  putU32LE(bytes, 24, 36 + exec.length);
  putU32LE(bytes, 28, 0);
  putU32LE(bytes, 32, 3); // FILE_COMPRESSED + ZLIB
  bytes.set(compressed, 36);
  return bytes;
}

const exec = new Uint8Array(2048);
for (let i = 0; i < exec.length; i += 1) exec[i] = (i * 37 + (i >>> 3)) & 0xff;
const original = await makeCompressedZehn(exec);
const parsed = window.NdlessZehn.findZehn(original);
assert.equal(parsed?.valid, true);
assert.equal(parsed.compressed, true);

const adapter = await window.NdlessRebuilder.createAdapter({
  ...parsed,
  bytes: original,
  file: { name: "synthetic-zlib.tns" },
});

// Opening and exporting without touching executable bytes must be byte-for-byte stable.
const noOp = await adapter.build();
assert.equal(noOp.preservedStoredExecutable, true);
assert.deepEqual(noOp.bytes, original);
assert.equal(window.NdlessZehn.findZehn(noOp.bytes)?.valid, true);

// Once executable bytes change, rebuild/recompression is allowed, but the exported
// file must still parse and inflate back to exactly the edited logical image.
adapter.patchWorking(128, new Uint8Array([0x00, 0x00, 0xA0, 0xE3]));
const edited = await adapter.build();
const reparsed = window.NdlessZehn.findZehn(edited.bytes);
assert.equal(reparsed?.valid, true);
const reinflated = await window.NdlessZehn.inflateExecutable(edited.bytes, reparsed);
assert.deepEqual(reinflated, adapter.workingBytes);

console.log("PASS Ndless Zehn export -> reimport roundtrip");
