import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

globalThis.window = globalThis;
globalThis.location = { origin: "http://localhost" };
globalThis.performance ||= { now: () => Date.now() };

const downloads = [];
function makeElement(tag) {
  const node = {
    tagName: String(tag).toUpperCase(),
    style: {},
    dataset: {},
    children: [],
    isConnected: true,
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      child.isConnected = true;
      return child;
    },
    append(...children) {
      for (const child of children) this.appendChild(child);
    },
    remove() {
      this.removed = true;
    },
    setAttribute(name, value) {
      this[name] = String(value);
    },
    addEventListener() {},
    click() {
      if (this.tagName === "A") downloads.push({ href: this.href, download: this.download });
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    insertAdjacentElement(_position, child) {
      return this.appendChild(child);
    },
    closest() {
      return null;
    },
  };
  return node;
}

globalThis.document = {
  baseURI: "http://localhost/",
  documentElement: makeElement("html"),
  body: makeElement("body"),
  createElement: makeElement,
  querySelector() {
    return null;
  },
  querySelectorAll() {
    return [];
  },
};
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};
if (typeof URL.createObjectURL !== "function") URL.createObjectURL = () => "blob:mock";
if (typeof URL.revokeObjectURL !== "function") URL.revokeObjectURL = () => {};

await import("../ndless-bflt.js");
await import("../ndless-prg.js");
await import("../ndless-zehn.js");
await import("../ndless-format-detector.js");
await import("../ndless-elf32.js");
await import("../ndless-zehn-builder.js");
await import("../tns-file-save-experimental-core.js");

function align(n, a = 4) {
  return (n + a - 1) & ~(a - 1);
}

function makeElf(returnValue = 7) {
  const names = ["", ".text", ".data", ".bss", ".symtab", ".strtab", ".rel.data", ".shstrtab"];
  let shstr = "\0";
  const nameOff = {};
  for (const n of names.slice(1)) {
    nameOff[n] = shstr.length;
    shstr += n + "\0";
  }
  const strtab = "\0foo\0";
  const text = Uint8Array.from([returnValue & 255, 0x00, 0xa0, 0xe3, 0x1e, 0xff, 0x2f, 0xe1]);
  const data = Uint8Array.from([0, 0, 0, 0]);
  const sym = new Uint8Array(32);
  const sv = new DataView(sym.buffer);
  sv.setUint32(16, 1, true);
  sv.setUint32(20, 0, true);
  sv.setUint32(24, 4, true);
  sym[28] = (1 << 4) | 2;
  sv.setUint16(30, 1, true);
  const rel = new Uint8Array(8);
  const rv = new DataView(rel.buffer);
  rv.setUint32(0, 4, true);
  rv.setUint32(4, (1 << 8) | 2, true);
  const shstrBytes = new TextEncoder().encode(shstr);
  const strBytes = new TextEncoder().encode(strtab);
  const payloads = [null, text, data, null, sym, strBytes, rel, shstrBytes];
  let off = 52;
  const offsets = [];
  for (let i = 0; i < payloads.length; i++) {
    const p = payloads[i];
    if (!p) {
      offsets[i] = 0;
      continue;
    }
    off = align(off, 4);
    offsets[i] = off;
    off += p.length;
  }
  const shoff = align(off, 4);
  const shnum = 8;
  const total = shoff + shnum * 40;
  const bytes = new Uint8Array(total);
  const v = new DataView(bytes.buffer);
  bytes.set([0x7f, 0x45, 0x4c, 0x46, 1, 1, 1, 0], 0);
  v.setUint16(16, 2, true);
  v.setUint16(18, 40, true);
  v.setUint32(20, 1, true);
  v.setUint32(24, 0, true);
  v.setUint32(32, shoff, true);
  v.setUint32(36, 0x5000000, true);
  v.setUint16(40, 52, true);
  v.setUint16(46, 40, true);
  v.setUint16(48, shnum, true);
  v.setUint16(50, 7, true);
  for (let i = 0; i < payloads.length; i++) if (payloads[i]) bytes.set(payloads[i], offsets[i]);
  function sh(i, name, type, flags, addr, offset, size, link = 0, info = 0, alignv = 4, entsize = 0) {
    const o = shoff + i * 40;
    v.setUint32(o, nameOff[name] || 0, true);
    v.setUint32(o + 4, type, true);
    v.setUint32(o + 8, flags, true);
    v.setUint32(o + 12, addr, true);
    v.setUint32(o + 16, offset, true);
    v.setUint32(o + 20, size, true);
    v.setUint32(o + 24, link, true);
    v.setUint32(o + 28, info, true);
    v.setUint32(o + 32, alignv, true);
    v.setUint32(o + 36, entsize, true);
  }
  sh(1, ".text", 1, 0x6, 0, offsets[1], text.length, 0, 0, 4, 0);
  sh(2, ".data", 1, 0x3, 8, offsets[2], data.length, 0, 0, 4, 0);
  sh(3, ".bss", 8, 0x3, 12, 0, 4, 0, 0, 4, 0);
  sh(4, ".symtab", 2, 0, 0, offsets[4], sym.length, 5, 1, 4, 16);
  sh(5, ".strtab", 3, 0, 0, offsets[5], strBytes.length, 0, 0, 1, 0);
  sh(6, ".rel.data", 9, 0, 0, offsets[6], rel.length, 4, 2, 4, 8);
  sh(7, ".shstrtab", 3, 0, 0, offsets[7], shstrBytes.length, 0, 0, 1, 0);
  return bytes;
}

const elfA = makeElf(7);
const elfB = makeElf(19);
const packageA = await globalThis.NdlessZehnBuilder.buildFromElf(elfA, { name: "direct-demo", author: "TNS Tool WASM", compress: false });
const packageB = await globalThis.NdlessZehnBuilder.buildFromElf(elfB, { name: "direct-demo", author: "TNS Tool WASM", compress: false });
const bridgeCalls = { opened: 0, ensure: [], builds: [] };

globalThis.NdlessLocalBridge = {
  openLocalCompiler() {
    bridgeCalls.opened += 1;
  },
  async status() {
    return { connected: false, toolchainReady: false };
  },
  async ensureReady(options = {}) {
    bridgeCalls.ensure.push(options);
    return { connected: true, toolchainReady: true, protocol: 2, platform: "test", toolchain: "mock" };
  },
  async build(project) {
    bridgeCalls.builds.push(project);
    const source = Object.values(project.files || {}).join("\n");
    const isB = source.includes("return 19");
    return {
      ok: true,
      filename: `${project.name || "ndless-app"}.tns`,
      bytes: isB ? packageB.bytes : packageA.bytes,
      elfBytes: isB ? elfB : elfA,
      logs: [],
      diagnostics: [],
      platform: "test",
      toolchain: "mock",
    };
  },
  async browserFallbackReady() {
    return false;
  },
};

await import("../ndless-build-manager.js");

let currentProject = null;
globalThis.NdlessProjectWorkspace = {
  getProject() {
    return currentProject;
  },
};

await import("../tns-file-save-experimental.js");

function projectWith(source) {
  return {
    type: "ndless-project",
    version: 1,
    name: "direct-demo",
    language: "c",
    template: "minimal",
    target: "zehn-modern",
    activeFile: "main.c",
    files: { "main.c": source },
    settings: { browserFreestanding: true, optLevel: "2" },
  };
}

test("fixture colors_ndless.tns is detected as Ndless and not normal XML", async () => {
  const bytes = new Uint8Array(await readFile(new URL("./fixtures/colors_ndless.tns", import.meta.url)));
  const detection = globalThis.NdlessFormatDetector.detect(bytes);
  assert.ok(bytes.length > 0);
  assert.equal(detection.family, "ndless");
  assert.notEqual(detection.family, "document");
});

test("minimal Zehn package produces valid Ndless bytes from a valid ARM ELF", async () => {
  const parsedElf = globalThis.NdlessElf32.parse(elfA);
  assert.equal(parsedElf.header.machine, 40);
  assert.equal(parsedElf.sectionByName(".text").address, 0);
  assert.ok(packageA.bytes.length > 0);
  assert.match("direct-demo.tns", /\.tns$/);
  const detection = globalThis.NdlessFormatDetector.detect(packageA.bytes);
  assert.equal(detection.family, "ndless");
  assert.equal(detection.format, "zehn");
  assert.equal(detection.valid, true);
});

test("project fingerprint prevents stale artifact reuse after source changes", async () => {
  globalThis.NdlessBuildManager.dispose();
  currentProject = projectWith("int main(void) { return 7; }\n");
  const resultA = await globalThis.NdlessBuildManager.build(currentProject, { openLocal: false, alreadyOpened: true, waitForConnection: true });
  assert.ok(resultA.ok);
  assert.equal(globalThis.NdlessBuildManager.artifact(currentProject)?.projectFingerprint, resultA.projectFingerprint);

  const staleFingerprint = resultA.projectFingerprint;
  currentProject = projectWith("int main(void) { return 19; }\n");
  assert.equal(globalThis.NdlessBuildManager.artifact(currentProject), null);

  const resultB = await globalThis.NdlessBuildManager.build(currentProject, { openLocal: false, alreadyOpened: true, waitForConnection: true });
  assert.ok(resultB.ok);
  assert.notEqual(resultB.projectFingerprint, staleFingerprint);
  assert.equal(globalThis.NdlessBuildManager.artifact(currentProject)?.projectFingerprint, resultB.projectFingerprint);
});

test("experimental download handler rebuilds current project and downloads valid .tns bytes", async () => {
  globalThis.NdlessBuildManager.dispose();
  downloads.length = 0;
  bridgeCalls.opened = 0;
  bridgeCalls.ensure.length = 0;
  bridgeCalls.builds.length = 0;

  currentProject = projectWith("int main(void) { return 7; }\n");
  await globalThis.NdlessBuildManager.build(currentProject, { openLocal: false, alreadyOpened: true, waitForConnection: true });

  currentProject = projectWith("int main(void) { return 19; }\n");
  const result = await globalThis.TnsFileSaveExperimental.downloadCurrentExperimental();

  assert.equal(result.source, "fresh-build");
  assert.equal(result.artifact.filename, "direct-demo.tns");
  assert.equal(result.artifact.validation.family, "ndless");
  assert.equal(result.artifact.validation.format, "zehn");
  assert.equal(result.artifact.validation.valid, true);
  assert.ok(result.artifact.bytes.length > 0);
  assert.equal(downloads.at(-1).download, "direct-demo.tns");
  assert.equal(bridgeCalls.opened, 1);
  assert.equal(bridgeCalls.ensure.at(-1).alreadyOpened, true);
  assert.equal(bridgeCalls.ensure.at(-1).waitForConnection, true);
  assert.equal(bridgeCalls.builds.at(-1).files["main.c"], "int main(void) { return 19; }\n");
});
