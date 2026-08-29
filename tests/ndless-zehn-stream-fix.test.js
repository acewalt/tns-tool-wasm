import assert from "node:assert/strict";
import { deflateSync, deflateRawSync } from "node:zlib";

const nativeSetTimeout = globalThis.setTimeout;
globalThis.window = globalThis;
globalThis.addEventListener ||= () => {};
globalThis.setTimeout = () => 0;

await import("../ndless-zehn.js");
await import("../ndless-zehn-stream-fix.js");

function putU32LE(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value >>> 0, true);
}

function makeCompressedZehn(exec, compressed) {
  const bytes = new Uint8Array(36 + compressed.length);
  putU32LE(bytes, 0, 0x6e68655a);
  putU32LE(bytes, 4, 1);
  putU32LE(bytes, 8, bytes.length);
  putU32LE(bytes, 12, 1);
  putU32LE(bytes, 16, 0);
  putU32LE(bytes, 20, 0);
  putU32LE(bytes, 24, 36 + exec.length);
  putU32LE(bytes, 28, 0);
  putU32LE(bytes, 32, 3); // FILE_COMPRESSED + ZLIB marker
  bytes.set(compressed, 36);
  return bytes;
}

const exec = new Uint8Array(4096);
for (let i = 0; i < exec.length; i += 1) exec[i] = (i * 29 + (i >>> 4)) & 0xff;

// The browser editor must not depend on new Response(stream).arrayBuffer().
const savedResponse = globalThis.Response;
globalThis.Response = undefined;

const standard = makeCompressedZehn(exec, new Uint8Array(deflateSync(exec)));
const parsedStandard = window.NdlessZehn.findZehn(standard);
assert.equal(parsedStandard?.valid, true);
assert.equal(parsedStandard.compressed, true);
const inflatedStandard = await window.NdlessZehn.inflateExecutable(standard, parsedStandard);
assert.deepEqual(inflatedStandard, exec);

// Compatibility: accept raw DEFLATE from legacy/custom producers that still use the ZLIB marker.
const raw = makeCompressedZehn(exec, new Uint8Array(deflateRawSync(exec)));
const parsedRaw = window.NdlessZehn.findZehn(raw);
const inflatedRaw = await window.NdlessZehn.inflateExecutable(raw, parsedRaw);
assert.deepEqual(inflatedRaw, exec);

// Corrupt payloads must explain the actual Zehn/zlib failure instead of surfacing "Failed to fetch".
const corrupt = makeCompressedZehn(exec, new Uint8Array([0x78, 0x9c, 0x00, 0x01, 0x02, 0x03]));
const parsedCorrupt = window.NdlessZehn.findZehn(corrupt);
await assert.rejects(
  () => window.NdlessZehn.inflateExecutable(corrupt, parsedCorrupt),
  error => /Zehn zlib payload could not be decompressed/.test(error?.message || "") && !/Failed to fetch/.test(error?.message || "")
);

globalThis.Response = savedResponse;
globalThis.setTimeout = nativeSetTimeout;

console.log("PASS Ndless Zehn robust zlib editor stream handling");
