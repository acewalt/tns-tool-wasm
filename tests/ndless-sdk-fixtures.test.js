import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

globalThis.window = globalThis;
await import("../ndless-zehn.js");
await import("../ndless-bflt.js");
await import("../ndless-prg.js");
await import("../ndless-format-detector.js");
await import("../ndless-arm-decoder.js");

const root = process.env.NDLESS_SDK_ROOT;
if (!root) {
  console.log("SKIP Ndless SDK fixtures (set NDLESS_SDK_ROOT to extracted ndless_v3.1_beta_r903_sdk root)");
  process.exit(0);
}

const EXPECTED = new Map([
  ["_samples/colors/colors.tns", "bflt"],
  ["_samples/helloworld/helloworld.tns", "bflt"],
  ["_samples/helloworld-asm/helloworld-asm.tns", "bflt"],
  ["_samples/helloworld-cpp/helloworld-cpp.tns", "bflt"],
  ["_samples/helloworld-sdl/helloworld-sdl.tns", "bflt"],
  ["_samples/link-sdl/Link.tns", "bflt"],
  ["_samples/luaext/luaextdemo.luax.tns", "bflt"],
  ["_samples/luaext/runluaextdemo.tns", "ti-nspire"],
  ["_samples/ngc/ngc_demo.tns", "bflt"],
  ["_samples/particles/particles.tns", "bflt"],
  ["emu_resources/polydumper/old_binaries/polydumper_1.1.9170_CAS.tns", "prg"],
  ["emu_resources/polydumper/old_binaries/polydumper_1.1.9227.tns", "prg"],
  ["emu_resources/polydumper/old_binaries/polydumper_1.1.9253.tns", "prg"],
  ["emu_resources/polydumper/old_binaries/polydumper_1.2.2344_CAS.tns", "prg"],
  ["emu_resources/polydumper/old_binaries/polydumper_1.2.2394_CAS.tns", "prg"],
  ["emu_resources/polydumper/old_binaries/polydumper_1.2.2398.tns", "prg"],
  ["emu_resources/polydumper/old_binaries/polydumper_1.7.tns", "prg"],
  ["emu_resources/polydumper/old_binaries/polydumper_2.0.tns", "prg"],
  ["emu_resources/polydumper/polydumper_3.1.tns", "prg"],
  ["ndless/3rd/nspireio/demo/ConsoleDemo.tns", "prg"],
  ["ndless/3rd/nspireio/demo/ConsoleDemoAdv.tns", "prg"],
  ["ndless/3rd/nspireio/demo/compatibility.tns", "prg"],
  ["ndless/3rd/nspireio/demo/hello.tns", "prg"],
  ["ndless/3rd/nspireio/demo/replace-stdio.tns", "prg"],
  ["ndless/3rd/nspireio/demo/splitscreen.tns", "prg"],
  ["ndless/3rd/nspireio/demo/tests.tns", "prg"],
]);

async function collectTns(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await collectTns(absolute));
    else if (entry.isFile() && /\.tns$/i.test(entry.name)) out.push(absolute);
  }
  return out;
}
async function loadBflt(...parts){const bytes=new Uint8Array(await fs.readFile(path.join(root,...parts)));return window.NdlessBflt.enrich(bytes,window.NdlessBflt.parse(bytes));}

const files = (await collectTns(root)).sort();
const counts = { zehn: 0, bflt: 0, prg: 0, document: 0, unknown: 0, malformed: 0 };
const rows = [];
for (const absolute of files) {
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  const bytes = new Uint8Array(await fs.readFile(absolute));
  const result = window.NdlessFormatDetector.detect(bytes);
  let observed;
  if (result.family === "document") { observed = "ti-nspire"; counts.document += 1; }
  else if (result.family === "ndless" && result.valid) { observed = result.format; counts[result.format] += 1; }
  else if (result.malformed) { observed = `malformed:${result.format}`; counts.malformed += 1; }
  else { observed = "unknown"; counts.unknown += 1; }
  rows.push({ filename: relative, expected: EXPECTED.get(relative) ?? "(not catalogued)", observed });
  if (EXPECTED.has(relative)) assert.equal(observed, EXPECTED.get(relative), relative);
}
assert.equal(files.length, 26);
assert.deepEqual(counts, { zehn: 0, bflt: 9, prg: 16, document: 1, unknown: 0, malformed: 0 });
assert.equal(rows.filter(row => row.expected === "(not catalogued)").length, 0);
assert.equal(EXPECTED.size, files.length);

const helloPath = path.join(root, "_samples", "helloworld", "helloworld.tns");
const helloBytes = new Uint8Array(await fs.readFile(helloPath));
const hello = await window.NdlessBflt.enrich(helloBytes, window.NdlessBflt.parse(helloBytes));
assert.equal(hello.valid, true);
assert.equal(hello.header.rev, 4);
assert.equal(hello.header.entry, 0x40);
assert.equal(hello.header.dataStart, 0x3224);
assert.equal(hello.header.dataEnd, 0x391c);
assert.equal(hello.header.bssEnd, 0x392e);
assert.equal(hello.header.stackSize, 4096);
assert.equal(hello.header.relocStart, 0x391c);
assert.equal(hello.header.relocCount, 0);
assert.equal(hello.header.flags, 0x2);
assert.deepEqual(Array.from(helloBytes.subarray(0x40, 0x50)), [0xF0,0x4F,0x2D,0xE9,0x04,0xD0,0x8F,0xE5,0x57,0x0C,0x00,0xEB,0xF0,0x8F,0xBD,0xE8]);
const helloArm = window.NdlessArmDecoder.disassemble(helloBytes, { start: 0x40, end: 0x50, runtimeBase: 0x40, fileOffsetBase: 0x40, containerOffsetBase: 0x40 });
assert.deepEqual(helloArm.map(i => i.mnemonic), ["push", "str", "bl", "pop"]);

// Real relocation semantics from r903: ARM relocation entries are payload offsets,
// and the target in the logical flat image is sizeof(flat_hdr) + raw (64 + raw).
const cpp = await loadBflt("_samples","helloworld-cpp","helloworld-cpp.tns");
assert.equal(cpp.header.relocCount, 1);
assert.equal(cpp.relocs[0].raw, 0x2c);
assert.equal(cpp.relocs[0].relocationOffset, 0x2c);
assert.equal(cpp.relocs[0].targetAddress, 0x6c);
assert.equal(cpp.relocs[0].region, ".text");

const luaext = await loadBflt("_samples","luaext","luaextdemo.luax.tns");
assert.equal(luaext.header.relocCount, 2);
assert.deepEqual(luaext.relocs.map(r=>r.raw), [0xf8,0xfc]);
assert.deepEqual(luaext.relocs.map(r=>r.targetAddress), [0x138,0x13c]);
assert.deepEqual(luaext.relocs.map(r=>r.region), [".data",".data"]);
for(const r of [...cpp.relocs,...luaext.relocs]) assert.ok(r.targetAddress+4<=r.logicalBytes?.length||r.targetAddress+4<=0x7fffffff);

console.table(rows);
console.log("Ndless SDK counts:", counts);
console.log("PASS real Ndless 3.1 r903 SDK fixtures + relocation semantics");
