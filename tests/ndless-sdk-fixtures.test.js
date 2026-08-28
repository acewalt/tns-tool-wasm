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

const files = (await collectTns(root)).sort();
const counts = { zehn: 0, bflt: 0, prg: 0, document: 0, unknown: 0, malformed: 0 };
const rows = [];

for (const absolute of files) {
  const relative = path.relative(root, absolute).split(path.sep).join("/");
  const bytes = new Uint8Array(await fs.readFile(absolute));
  const result = window.NdlessFormatDetector.detect(bytes);
  let observed;
  if (result.family === "document") {
    observed = "ti-nspire";
    counts.document += 1;
  } else if (result.family === "ndless" && result.valid) {
    observed = result.format;
    counts[result.format] += 1;
  } else if (result.malformed) {
    observed = `malformed:${result.format}`;
    counts.malformed += 1;
  } else {
    observed = "unknown";
    counts.unknown += 1;
  }
  rows.push({ filename: relative, expected: EXPECTED.get(relative) ?? "(not catalogued)", observed });
  if (EXPECTED.has(relative)) assert.equal(observed, EXPECTED.get(relative), relative);
}

assert.equal(files.length, 26, "Ndless 3.1 r903 SDK fixture count changed; update the catalogue intentionally if using a different SDK build");
assert.deepEqual(counts, { zehn: 0, bflt: 9, prg: 16, document: 1, unknown: 0, malformed: 0 });
assert.equal(rows.filter(row => row.expected === "(not catalogued)").length, 0, "Unexpected .tns fixture found in SDK");
assert.equal(EXPECTED.size, files.length, "Expected fixture catalogue and discovered files differ");

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

console.table(rows);
console.log("Ndless SDK counts:", counts);
console.log("PASS real Ndless 3.1 r903 SDK fixtures");
