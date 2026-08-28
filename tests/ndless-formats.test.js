import assert from "node:assert/strict";

// Browser modules intentionally expose their APIs on window. In Node, provide the
// same global so the parsers/analysis can be regression-tested without a DOM.
globalThis.window = globalThis;

await import("../ndless-zehn.js");
await import("../ndless-bflt.js");
await import("../ndless-prg.js");
await import("../ndless-format-detector.js");
await import("../ndless-arm-decoder.js");
await import("../ndless-analysis.js");
await import("../ndless-rebuilder.js");

function putU32LE(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value >>> 0, true);
}

function putU32BE(bytes, offset, value) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value >>> 0, false);
}

function makeZehn(exec = new Uint8Array(16)) {
  const bytes = new Uint8Array(32 + exec.length);
  putU32LE(bytes, 0, 0x6e68655a);
  putU32LE(bytes, 4, 1);
  putU32LE(bytes, 8, bytes.length);
  putU32LE(bytes, 12, 0);
  putU32LE(bytes, 16, 0);
  putU32LE(bytes, 20, 0);
  putU32LE(bytes, 24, bytes.length);
  putU32LE(bytes, 28, 0);
  bytes.set(exec, 32);
  return bytes;
}

function makeBflt(flags = 0x0002) {
  const bytes = new Uint8Array(128);
  bytes.set([0x62, 0x46, 0x4c, 0x54], 0);
  putU32BE(bytes, 4, 4);
  putU32BE(bytes, 8, 64);
  putU32BE(bytes, 12, 96);
  putU32BE(bytes, 16, 112);
  putU32BE(bytes, 20, 120);
  putU32BE(bytes, 24, 4096);
  putU32BE(bytes, 28, 112);
  putU32BE(bytes, 32, 1);
  putU32BE(bytes, 36, flags);
  putU32BE(bytes, 40, 0);
  // Real ARM words from the SDK helloworld startup.
  bytes.set([0xF0, 0x4F, 0x2D, 0xE9, 0x04, 0xD0, 0x8F, 0xE5, 0x57, 0x0C, 0x00, 0xEB, 0xF0, 0x8F, 0xBD, 0xE8], 64);
  putU32BE(bytes, 112, 40);
  return bytes;
}

async function transform(bytes, format, mode) {
  const Ctor = mode === "compress" ? globalThis.CompressionStream : globalThis.DecompressionStream;
  assert.equal(typeof Ctor, "function", `${mode} stream must be available in the test runtime`);
  const stream = new Blob([bytes]).stream().pipeThrough(new Ctor(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function makeCompressedZehn(exec) {
  const compressed = await transform(exec, "deflate", "compress");
  const bytes = new Uint8Array(36 + compressed.length);
  putU32LE(bytes, 0, 0x6e68655a);
  putU32LE(bytes, 4, 1);
  putU32LE(bytes, 8, bytes.length);
  putU32LE(bytes, 12, 1);
  putU32LE(bytes, 16, 0);
  putU32LE(bytes, 20, 0);
  putU32LE(bytes, 24, 36 + exec.length);
  putU32LE(bytes, 28, 0);
  // Zehn_reloc { FILE_COMPRESSED, ZLIB } packed little-endian.
  putU32LE(bytes, 32, 3);
  bytes.set(compressed, 36);
  return bytes;
}

async function makeCompressedBflt(kind) {
  const logical = makeBflt(0x0002 | (kind === "GZIP" ? 0x0004 : 0x0008));
  if (kind === "GZIP") {
    const gz = await transform(logical.subarray(64), "gzip", "compress");
    const stored = new Uint8Array(64 + gz.length);
    stored.set(logical.subarray(0, 64));
    stored.set(gz, 64);
    return { logical, stored };
  }
  const gz = await transform(logical.subarray(96), "gzip", "compress");
  const stored = new Uint8Array(96 + gz.length);
  stored.set(logical.subarray(0, 96));
  stored.set(gz, 96);
  return { logical, stored };
}

// Common detector: normal document must not be swallowed by Ndless detection.
const documentBytes = new TextEncoder().encode("*TIMLP0500 synthetic document");
const documentResult = window.NdlessFormatDetector.detect(documentBytes);
assert.equal(documentResult.family, "document");
assert.equal(documentResult.format, "ti-nspire");

// PRG is intentionally strict: exact signature plus the historical crt0 startup.
const prg = new Uint8Array([0x50, 0x52, 0x47, 0x00, 0xF0, 0x4F, 0x2D, 0xE9, 0, 0, 0, 0]);
assert.equal(window.NdlessFormatDetector.detect(prg).format, "prg");
const accidentalPrg = new Uint8Array([0x50, 0x52, 0x47, 0x00, 1, 2, 3, 4, 5, 6, 7, 8]);
const accidentalPrgResult = window.NdlessFormatDetector.detect(accidentalPrg);
assert.equal(accidentalPrgResult.format, "unknown");
assert.equal(accidentalPrgResult.family, "unknown");

// bFLT v4 big-endian header, memory ranges and relocation entry.
const bfltBytes = makeBflt();
const bflt = window.NdlessBflt.parse(bfltBytes);
assert.equal(bflt.valid, true);
assert.equal(bflt.header.rev, 4);
assert.equal(bflt.header.entry, 0x40);
assert.equal(bflt.header.dataStart, 0x60);
assert.equal(bflt.header.dataEnd, 0x70);
assert.equal(bflt.header.bssEnd, 0x78);
assert.equal(bflt.header.stackSize, 4096);
assert.equal(bflt.header.relocStart, 0x70);
assert.equal(bflt.header.relocCount, 1);
assert.equal(bflt.header.flags, 0x2);
const enrichedBflt = await window.NdlessBflt.enrich(bfltBytes, bflt);
assert.equal(enrichedBflt.relocs.length, 1);
assert.equal(enrichedBflt.relocs[0].raw, 40);
assert.equal(enrichedBflt.relocs[0].relocationOffset, 40);
assert.equal(enrichedBflt.relocs[0].targetAddress, 104);
assert.equal(enrichedBflt.relocs[0].address, 104);
assert.equal(enrichedBflt.relocs[0].tableEntryOffset, 112);
assert.equal(enrichedBflt.relocs[0].region, ".data");

// Zehn false-positive regression: the four signature bytes alone are not malformed.
const falseZehn = new Uint8Array(96);
falseZehn.set([0x5A, 0x65, 0x68, 0x6E], 12);
putU32LE(falseZehn, 16, 0x12345678);
const falseZehnResult = window.NdlessZehn.findZehn(falseZehn);
assert.equal(falseZehnResult, null);

const zehnBytes = makeZehn(new Uint8Array([0xF0, 0x4F, 0x2D, 0xE9, 0x1E, 0xFF, 0x2F, 0xE1, 0, 0, 0, 0, 0, 0, 0, 0]));
const zehn = window.NdlessZehn.findZehn(zehnBytes);
assert.equal(zehn.valid, true);
assert.equal(zehn.header.entryOffset, 0);
assert.equal(zehn.compressed, false);
assert.equal(window.NdlessFormatDetector.detect(zehnBytes).format, "zehn");

// A version-valid but structurally credible truncated Zehn is malformed.
const truncatedZehn = new Uint8Array(40);
putU32LE(truncatedZehn, 0, 0x6e68655a);
putU32LE(truncatedZehn, 4, 1);
putU32LE(truncatedZehn, 8, 64);
putU32LE(truncatedZehn, 12, 0);
putU32LE(truncatedZehn, 16, 0);
putU32LE(truncatedZehn, 20, 0);
putU32LE(truncatedZehn, 24, 64);
putU32LE(truncatedZehn, 28, 0);
assert.equal(window.NdlessZehn.findZehn(truncatedZehn)?.malformed, true);

// Common ARM decoder: verify the real SDK helloworld startup bytes.
const arm = window.NdlessArmDecoder.disassemble(bfltBytes, { start: 64, end: 80, runtimeBase: 64, fileOffsetBase: 64, containerOffsetBase: 64 });
assert.deepEqual(arm.map(i => i.mnemonic), ["push", "str", "bl", "pop"]);
assert.equal(arm[0].prologue, true);
assert.equal(arm[2].call, true);
assert.equal(arm[3].return, true);
assert.equal(arm[2].target, 0x31ac);

const analysis = window.NdlessAnalysis.analyze({
  image: bfltBytes,
  codeStart: 64,
  codeEnd: 80,
  runtimeBase: 64,
  entry: 64,
  fileOffsetBase: 64,
  containerOffsetBase: 64,
  runtimeToImage: address => address >= 0 && address < bfltBytes.length ? address : null,
});
assert.equal(analysis.functions[0].name, "entry");
assert.equal(analysis.decodedInstructionCount, 4);
assert.equal(analysis.instructionsForFunction(64).length, 4);
assert.ok(analysis.cfg.get(64)?.blocks.length >= 1);
assert.ok(analysis.cfgForFunction(64)?.blocks.length >= 1);
assert.match(analysis.pseudocode.get(64), /C|entry|return|sub_/i);

// Zehn zlib working image and physical-size-changing rebuild round trip.
const originalExec = new Uint8Array(256);
for (let i = 0; i < originalExec.length; i += 1) originalExec[i] = (i * 17) & 0xff;
const compressedZehnBytes = await makeCompressedZehn(originalExec);
const compressedZehn = window.NdlessZehn.findZehn(compressedZehnBytes);
assert.equal(compressedZehn.valid, true);
assert.equal(compressedZehn.compressed, true);
const inflatedZehn = await window.NdlessZehn.inflateExecutable(compressedZehnBytes, compressedZehn);
assert.deepEqual(inflatedZehn, originalExec);
inflatedZehn[12] ^= 0xff;
const rebuiltZehn = await window.NdlessZehn.rebuild(compressedZehnBytes, compressedZehn, inflatedZehn);
const reinflatedZehn = await window.NdlessZehn.inflateExecutable(rebuiltZehn.bytes, rebuiltZehn.parsed);
assert.deepEqual(reinflatedZehn, inflatedZehn);
assert.equal(rebuiltZehn.parsed.header.allocSize, compressedZehn.header.allocSize);

// bFLT GZIP and GZDATA streams use gzip and preserve logical header offsets.
for (const kind of ["GZIP", "GZDATA"]) {
  const { logical, stored } = await makeCompressedBflt(kind);
  const parsed = window.NdlessBflt.parse(stored);
  assert.equal(parsed.valid, true, `${kind} should parse`);
  assert.equal(parsed.compression, kind);
  const inflated = await window.NdlessBflt.logicalImage(stored, parsed);
  assert.deepEqual(inflated, logical, `${kind} logical image should round-trip`);
  inflated[100] ^= 0x11;
  const rebuilt = await window.NdlessBflt.rebuild(stored, parsed, inflated);
  const roundTrip = await window.NdlessBflt.logicalImage(rebuilt.bytes, rebuilt.parsed);
  assert.deepEqual(roundTrip, inflated, `${kind} rebuilt logical image should match edited working image`);
}

console.log("PASS Ndless Zehn/bFLT/PRG detector, ARM analysis and compression rebuild");
