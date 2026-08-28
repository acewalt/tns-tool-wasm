import assert from "node:assert/strict";
globalThis.window=globalThis;
await import("../ndless-arm-decoder.js");
await import("../ndless-friendly-core.js");

const core=globalThis.NdlessFriendlyCore;
assert.ok(core,"friendly core should load");

const original=0xE3A04001; // mov r4, #1
const patched=core.patchDataProcessingImmediate(original,100);
const decoded=globalThis.NdlessArmDecoder.decodeWord(patched,0x1000);
assert.equal(decoded.mnemonic,"mov");
assert.equal(decoded.rd,4);
assert.equal(decoded.operand2.immediate,100);
assert.deepEqual(Array.from(core.wordBytesLE(patched)),[patched&255,(patched>>>8)&255,(patched>>>16)&255,(patched>>>24)&255]);

assert.equal(core.encodeArmImmediate(0xFF),core.encodeArmImmediate(0xFF));
assert.ok(core.encodeArmImmediate(0x80000000),"rotated ARM immediate should be encodable");
assert.equal(core.encodeArmImmediate(0x12345678),null,"arbitrary 32-bit constant must be rejected instead of silently truncating");

const rows=[
  {...globalThis.NdlessArmDecoder.decodeWord(0xE3A04001,0x1000),address:0x1000,imageOffset:0,word:0xE3A04001},
  {...globalThis.NdlessArmDecoder.decodeWord(0xE3540001,0x1004),address:0x1004,imageOffset:4,word:0xE3540001},
  {...globalThis.NdlessArmDecoder.decodeWord(0x1A000001,0x1008),address:0x1008,imageOffset:8,word:0x1A000001},
  {...globalThis.NdlessArmDecoder.decodeWord(0xE1A00004,0x100C),address:0x100C,imageOffset:12,word:0xE1A00004},
  {...globalThis.NdlessArmDecoder.decodeWord(0xE1A0F00E,0x1010),address:0x1010,imageOffset:16,word:0xE1A0F00E},
];
const readable=core.readableCode(rows,{name:"sub_00001000",address:0x1000,end:0x1014},0);
assert.match(readable.code,/function sub_00001000/);
assert.match(readable.code,/local_r4 = 1/);
assert.match(readable.code,/compare local_r4 with 1/);
assert.match(readable.code,/if \(/);
assert.match(readable.code,/return arg0/);
const immediates=core.immediateCandidates(rows);
assert.ok(immediates.some(x=>x.address===0x1000&&x.value===1));
assert.ok(immediates.some(x=>x.address===0x1004&&x.label==="Comparison value"));
console.log("PASS friendly Ndless readable-code and semantic immediate patch helpers");
