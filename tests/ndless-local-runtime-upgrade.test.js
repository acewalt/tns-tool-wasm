import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, '..', 'ndless-local-runtime-upgrade.js'), 'utf8');

let bridgeVersion = '0.2.0';
let toolchainReady = false;
let downloadClicks = 0;
let nativeBuilds = 0;
const storage = new Map();

const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
};

const document = {
  body: {
    appendChild() {},
  },
  createElement() {
    return {
      style: {},
      setAttribute() {},
      click() { downloadClicks += 1; },
      remove() {},
    };
  },
};

const window = {
  addEventListener() {},
  NdlessLocalBridge: Object.freeze({
    RELEASE_TAG: 'tns-tool-compiler-v2',
    async status() {
      return {
        connected: true,
        toolchainReady,
        protocol: 2,
        platform: 'windows',
        version: bridgeVersion,
        legacy: false,
        missing: toolchainReady ? [] : ['old runtime'],
      };
    },
    async ensureReady() { return this.status(); },
    detectDesktopPlatform() { return 'windows'; },
  }),
  NdlessBuildManager: Object.freeze({
    async build() {
      nativeBuilds += 1;
      return { ok: true, filename: 'app.tns', bytes: new Uint8Array([1, 2, 3]) };
    },
  }),
};

const context = vm.createContext({
  window,
  document,
  navigator: { platform: 'Win32', userAgent: 'Windows' },
  localStorage,
  console,
  setTimeout() { return 0; },
  clearTimeout() {},
  Uint8Array,
  ArrayBuffer,
  Object,
  String,
  Number,
  Date,
  JSON,
  Math,
});

vm.runInContext(source, context, { filename: 'ndless-local-runtime-upgrade.js' });

const options = {
  openLocal: false,
  alreadyOpened: true,
  waitForConnection: true,
  onProgress(info) { options.progress = info; },
};

const outdated = await window.NdlessBuildManager.build({ name: 'test' }, options);
assert.strictEqual(outdated.ok, false);
assert.strictEqual(outdated.code, 'LOCAL_COMPILER_UPDATE_REQUIRED');
assert.strictEqual(outdated.stage, 'installing');
assert.strictEqual(downloadClicks, 1, 'v3 download must be triggered once');
assert.strictEqual(nativeBuilds, 0, 'must not compile with the outdated 0.2.0 runtime');
assert.match(options.progress.message, /0\.2\.1/);
assert.strictEqual(window.NdlessLocalBridge.RELEASE_TAG, 'tns-tool-compiler-v3');
assert.match(window.NdlessLocalBridge.DOWNLOADS.windows, /tns-tool-compiler-v3/);

bridgeVersion = '0.2.1';
toolchainReady = true;
const current = await window.NdlessBuildManager.build({ name: 'test' }, options);
assert.strictEqual(current.ok, true);
assert.strictEqual(nativeBuilds, 1, 'current compiler must delegate to the real build');

console.log('PASS Ndless local runtime upgrade guard');
