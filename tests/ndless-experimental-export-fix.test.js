import assert from "node:assert/strict";

globalThis.window = globalThis;
globalThis.HTMLInputElement = class {};
globalThis.document = {
  documentElement: {},
  body: { appendChild() {} },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return { dataset:{}, style:{}, appendChild(){}, querySelector(){ return null; }, click(){}, remove(){} }; },
  addEventListener() {},
};
globalThis.MutationObserver = class { observe() {} };
globalThis.addEventListener = () => {};

const calls = [];
let lastNative = null;
globalThis.NdlessBuildManager = Object.freeze({
  async localStatus() {
    return { connected:true, toolchainReady:true, protocol:2, platform:"test", version:"2" };
  },
  async build(project, options = {}) {
    calls.push({ name:project.name, target:project.target });
    options.onProgress?.({ stage:"preparing", message:`target=${project.target}` });
    if (!Object.keys(project.files || {}).some(name => /\.(?:c|cpp|cc|cxx|S|s)$/i.test(name))) {
      return { ok:false, stage:"compile", code:"NO_SOURCES", message:"no sources" };
    }
    if (project.target !== "zehn-modern") {
      return { ok:false, stage:"preparing", code:"TARGET_NOT_IMPLEMENTED", message:"legacy target unavailable" };
    }
    lastNative = {
      ok:true,
      engine:"local",
      target:"zehn-modern",
      filename:`${project.name}.tns`,
      bytes:new Uint8Array([0x5a,0x65,0x68,0x6e]),
      detection:{ valid:true, family:"ndless", format:"zehn" },
      diagnostics:[],
      stats:{ tnsSize:4 },
      projectFingerprint:`native:${project.name}`,
    };
    return lastNative;
  },
  artifact() { return lastNative; },
  projectFingerprint(project) { return `fp:${project.name}:${project.target}:${String(project.files?.["main.c"] || "")}`; },
  sanitizedProject(project) { return { ...project, files:{ ...(project.files || {}) } }; },
  dispose() { lastNative = null; },
});

globalThis.NdlessFormatDetector = {
  detect(bytes) {
    if (!bytes?.length) return { valid:false, family:"unknown", format:"unknown" };
    return bytes[0] === 0x50
      ? { valid:true, family:"ndless", format:"prg" }
      : { valid:true, family:"ndless", format:"zehn" };
  },
};
globalThis.NdlessRebuilder = {
  async createAdapter(result) {
    return { async build() { return { bytes:new Uint8Array(result.bytes) }; } };
  },
};

await import("../ndless-experimental-export-fix.js");

const legacy = {
  type:"ndless-project", version:1, name:"legacy-demo", language:"c", template:"basic",
  target:"bflt-r903", files:{ "main.c":"int main(void) { return 0; }" }, settings:{},
};
const legacyResult = await globalThis.NdlessBuildManager.build(legacy, {
  openLocal:false, alreadyOpened:true, waitForConnection:true,
});
assert.equal(legacyResult.ok, true);
assert.equal(legacyResult.experimentalTargetFallback, true);
assert.equal(legacyResult.requestedTarget, "bflt-r903");
assert.equal(legacyResult.builtTarget, "zehn-modern");
assert.equal(legacy.target, "bflt-r903", "experimental fallback must not mutate project target");
assert.deepEqual(calls.slice(0,2).map(x => x.target), ["bflt-r903", "zehn-modern"]);
assert.equal(globalThis.NdlessBuildManager.artifact(legacy)?.filename, "legacy-demo.tns");

lastNative = null;
const embedded = {
  type:"ndless-project", version:1, name:"embedded-demo", language:"c", template:"basic",
  target:"bflt-r903", files:{ "fixture.tns":new Uint8Array([0x50,0x52,0x47,0x00,0x01]) }, settings:{},
};
const embeddedResult = await globalThis.NdlessBuildManager.build(embedded, {
  openLocal:false, alreadyOpened:true, waitForConnection:true,
});
assert.equal(embeddedResult.ok, true);
assert.equal(embeddedResult.engine, "embedded-rebuild");
assert.equal(embeddedResult.filename, "fixture.tns");
assert.equal(embeddedResult.detection.format, "prg");
assert.deepEqual(Array.from(embeddedResult.bytes), [0x50,0x52,0x47,0x00,0x01]);

console.log("PASS Ndless experimental project export fallback and embedded TNS rebuild");
