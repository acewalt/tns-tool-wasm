const RELEASE_TAG = "ndless-arm-toolchain-v1";
const RELEASE_API = `https://api.github.com/repos/acewalt/tns-tool-wasm/releases/tags/${RELEASE_TAG}`;
const CACHE_NAME = "tns-tool-ndless-arm-toolchain-v1";

let releasePromise = null;
let manifestPromise = null;
const loadedTools = new Map();

function progress(stage, message, extra = {}) {
  postMessage({ type: "progress", stage, message, ...extra });
}

function buildError(code, message, details = "") {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function safePath(value) {
  const parts = String(value || "").replace(/\\/g, "/").split("/").filter(Boolean);
  const clean = [];
  for (const part of parts) {
    if (part === "." || !part) continue;
    if (part === ".." || part.includes("\0")) throw buildError("UNSAFE_PATH", `Unsafe project path: ${value}`);
    clean.push(part.replace(/[<>:"|?*]/g, "_"));
  }
  return clean.join("/");
}

function isArmElf(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
  if (b.length < 52) return false;
  if (b[0] !== 0x7f || b[1] !== 0x45 || b[2] !== 0x4c || b[3] !== 0x46) return false;
  if (b[4] !== 1 || b[5] !== 1) return false; // ELF32 + little-endian.
  return (b[18] | (b[19] << 8)) === 40; // EM_ARM.
}

function diagnosticsFromText(text) {
  const result = [];
  const re = /(?:^|\n)([^\n:]+):(\d+):(\d+):\s+(fatal error|error|warning|note):\s*([^\n]+)/g;
  for (let m; (m = re.exec(String(text || ""))); ) {
    result.push({
      file: m[1].replace(/^\/project\//, ""),
      line: +m[2],
      column: +m[3],
      severity: /warning/.test(m[4]) ? "warning" : (/note/.test(m[4]) ? "info" : "error"),
      message: m[5].trim(),
    });
  }
  return result;
}

async function getRelease() {
  if (!releasePromise) {
    releasePromise = (async () => {
      progress("preparing", "Checking dedicated Ndless ARM web toolchain…");
      const response = await fetch(RELEASE_API, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
      });
      if (response.status === 404) {
        throw buildError(
          "ARM_TOOLCHAIN_BUILDING",
          "The dedicated Ndless ARM browser toolchain is still being built.",
          "GitHub Actions is compiling Clang + LLD with LLVM_TARGETS_TO_BUILD=ARM. Build TNS will use that toolchain automatically as soon as the ndless-arm-toolchain-v1 release is published."
        );
      }
      if (!response.ok) {
        throw buildError("TOOLCHAIN_RELEASE_FETCH_FAILED", `Could not read the ARM toolchain release (${response.status}).`);
      }
      const release = await response.json();
      if (!Array.isArray(release.assets)) throw buildError("TOOLCHAIN_RELEASE_INVALID", "ARM toolchain release has no asset list.");
      return release;
    })().catch(error => {
      releasePromise = null;
      throw error;
    });
  }
  return releasePromise;
}

function findAsset(release, name) {
  const asset = release.assets.find(item => item?.name === name);
  if (!asset) throw buildError("TOOLCHAIN_ASSET_MISSING", `ARM toolchain asset is missing: ${name}`);
  return asset;
}

async function cachedFetch(asset) {
  const direct = asset.browser_download_url;
  const api = asset.url;
  let cache = null;
  try { if (typeof caches !== "undefined") cache = await caches.open(CACHE_NAME); } catch (_) {}

  if (cache && direct) {
    try {
      const hit = await cache.match(direct);
      if (hit) return hit;
    } catch (_) {}
  }

  const attempts = [
    [direct, { mode: "cors", cache: "force-cache" }],
    [api, { headers: { Accept: "application/octet-stream" }, mode: "cors", cache: "no-store" }],
  ].filter(([url]) => !!url);

  let lastError = null;
  for (const [url, init] of attempts) {
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        lastError = new Error(`${response.status} ${response.statusText}`);
        continue;
      }
      if (cache && direct) {
        try { await cache.put(direct, response.clone()); } catch (_) {}
      }
      return response;
    } catch (error) {
      lastError = error;
    }
  }
  throw buildError("TOOLCHAIN_ASSET_FETCH_FAILED", `Could not download ${asset.name}.`, lastError?.message || "Network error");
}

async function assetBytes(release, name) {
  return new Uint8Array(await (await cachedFetch(findAsset(release, name))).arrayBuffer());
}

async function assetText(release, name) {
  return (await cachedFetch(findAsset(release, name))).text();
}

function hex(bytes) {
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(bytes) {
  return hex(await crypto.subtle.digest("SHA-256", bytes));
}

async function getManifest() {
  if (!manifestPromise) {
    manifestPromise = (async () => {
      const release = await getRelease();
      const text = await assetText(release, "toolchain.json");
      let manifest;
      try { manifest = JSON.parse(text); } catch (_) { throw buildError("TOOLCHAIN_MANIFEST_INVALID", "ARM toolchain manifest is not valid JSON."); }
      if (!manifest?.targetBackends?.includes?.("ARM")) throw buildError("TOOLCHAIN_ARM_BACKEND_MISSING", "Published toolchain manifest does not contain the ARM backend.");
      if (manifest.targetTriple !== "arm-none-eabi") throw buildError("TOOLCHAIN_TARGET_MISMATCH", `Unexpected toolchain target: ${manifest.targetTriple || "unknown"}`);
      if (!manifest.tools?.clang || !manifest.tools?.lld) throw buildError("TOOLCHAIN_MANIFEST_INVALID", "Toolchain manifest is missing clang or lld.");
      return { release, manifest };
    })().catch(error => {
      manifestPromise = null;
      throw error;
    });
  }
  return manifestPromise;
}

async function combineWasmParts(release, toolName, toolInfo) {
  const partNames = Array.from(toolInfo.wasmParts || []);
  if (!partNames.length) throw buildError("TOOLCHAIN_PARTS_MISSING", `${toolName} has no WebAssembly parts in the manifest.`);
  const chunks = [];
  let total = 0;
  for (let i = 0; i < partNames.length; i++) {
    progress("preparing", `Downloading ${toolName} ${i + 1}/${partNames.length}…`, { current: i + 1, total: partNames.length, tool: toolName });
    const chunk = await assetBytes(release, partNames[i]);
    chunks.push(chunk);
    total += chunk.length;
  }
  const wasm = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    wasm.set(chunk, offset);
    offset += chunk.length;
  }
  if (toolInfo.wasmBytes && Number(toolInfo.wasmBytes) !== wasm.length) {
    throw buildError("TOOLCHAIN_SIZE_MISMATCH", `${toolName}.wasm size mismatch.`, `expected=${toolInfo.wasmBytes}; actual=${wasm.length}`);
  }
  if (toolInfo.wasmSha256) {
    progress("preparing", `Verifying ${toolName}…`);
    const digest = await sha256(wasm);
    if (digest.toLowerCase() !== String(toolInfo.wasmSha256).toLowerCase()) {
      throw buildError("TOOLCHAIN_HASH_MISMATCH", `${toolName}.wasm failed SHA-256 verification.`);
    }
  }
  return wasm;
}

async function importEmscriptenFactory(jsText, toolName) {
  // The workflow currently emits classic MODULARIZE output. Turning that trusted
  // release asset into an ES module lets this module worker load it without eval().
  const source = `${jsText}\nexport default LLVMTool;\n//# sourceURL=ndless-${toolName}.mjs\n`;
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  try {
    const module = await import(url);
    if (typeof module.default !== "function") throw buildError("TOOLCHAIN_FACTORY_INVALID", `${toolName}.js did not expose the LLVMTool factory.`);
    return module.default;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadTool(toolName) {
  if (loadedTools.has(toolName)) return loadedTools.get(toolName);
  const promise = (async () => {
    const { release, manifest } = await getManifest();
    const info = manifest.tools[toolName];
    if (!info) throw buildError("TOOLCHAIN_MANIFEST_INVALID", `Manifest has no ${toolName} tool.`);
    progress("preparing", `Loading dedicated ARM ${toolName}…`);
    const [jsText, wasm] = await Promise.all([
      assetText(release, info.js),
      combineWasmParts(release, toolName, info),
    ]);
    if (info.jsSha256) {
      const digest = await sha256(new TextEncoder().encode(jsText));
      if (digest.toLowerCase() !== String(info.jsSha256).toLowerCase()) throw buildError("TOOLCHAIN_HASH_MISMATCH", `${toolName}.js failed SHA-256 verification.`);
    }
    const factory = await importEmscriptenFactory(jsText, toolName);
    return { factory, wasm, info };
  })().catch(error => {
    loadedTools.delete(toolName);
    throw error;
  });
  loadedTools.set(toolName, promise);
  return promise;
}

function mkdirTree(FS, path) {
  if (!path || path === "/") return;
  if (typeof FS.mkdirTree === "function") {
    try { FS.mkdirTree(path); } catch (_) {}
    return;
  }
  const parts = path.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    try { FS.mkdir(current); } catch (_) {}
  }
}

function parentDir(path) {
  const i = path.lastIndexOf("/");
  return i > 0 ? path.slice(0, i) : "/";
}

function normalizeInputFiles(files = {}) {
  const out = {};
  for (const [path, value] of Object.entries(files)) {
    if (!path.startsWith("/")) throw buildError("INTERNAL_PATH_ERROR", `Tool input path must be absolute: ${path}`);
    out[path] = value;
  }
  return out;
}

async function runEmscriptenTool(toolName, args, files = {}, readPaths = []) {
  const tool = await loadTool(toolName);
  const stdout = [];
  const stderr = [];
  let module;
  try {
    module = await tool.factory({
      noInitialRun: true,
      wasmBinary: tool.wasm,
      print: text => stdout.push(String(text)),
      printErr: text => stderr.push(String(text)),
    });
  } catch (error) {
    throw buildError("TOOLCHAIN_INSTANTIATE_FAILED", `Could not instantiate ${toolName}.wasm.`, error?.stack || error?.message || String(error));
  }
  const FS = module?.FS;
  if (!FS || typeof module.callMain !== "function") throw buildError("TOOLCHAIN_RUNTIME_INVALID", `${toolName} runtime does not expose FS + callMain.`);

  for (const dir of ["/project", "/project/include", "/build"]) mkdirTree(FS, dir);
  for (const [path, value] of Object.entries(normalizeInputFiles(files))) {
    mkdirTree(FS, parentDir(path));
    FS.writeFile(path, value instanceof Uint8Array ? value : String(value), value instanceof Uint8Array ? undefined : { encoding: "utf8" });
  }

  let code = 0;
  try {
    const returned = module.callMain(args);
    if (typeof returned === "number") code = returned;
  } catch (error) {
    if (typeof error?.status === "number") code = error.status;
    else if (error?.name === "ExitStatus") code = Number(error.status || 0);
    else if (String(error) === "unwind") code = Number(module.EXITSTATUS || 0);
    else throw buildError("TOOLCHAIN_RUNTIME_ERROR", `${toolName} crashed while running.`, error?.stack || error?.message || String(error));
  }
  if (typeof module.EXITSTATUS === "number" && module.EXITSTATUS !== 0) code = module.EXITSTATUS;

  const outputs = {};
  for (const path of readPaths) {
    try { outputs[path] = new Uint8Array(FS.readFile(path)); }
    catch (_) { outputs[path] = null; }
  }
  return { code, stdout, stderr, text: [...stdout, ...stderr].join("\n").trim(), outputs };
}

const CRT0 = `.syntax unified
.arm
.section .text.startup,"ax",%progbits
.global _start
.type _start,%function
_start:
    push {r4-r11, lr}
    bl main
    pop {r4-r11, pc}
.size _start, .-_start
`;

const LD_SCRIPT = `OUTPUT_FORMAT("elf32-littlearm")
OUTPUT_ARCH(arm)
ENTRY(_start)
SECTIONS {
  . = 0;
  .text : {
    KEEP(*(.text.startup))
    *(.text)
    *(.text.*)
  }
  .rodata : { *(.rodata) *(.rodata.*) }
  .got : {
    *(.got.plt*)
    *(.got)
    LONG(0xFFFFFFFF)
  }
  .data : {
    *(.data)
    *(.data.*)
    KEEP(*(.init_array.*))
    KEEP(*(.init_array))
    KEEP(*(.fini_array.*))
    KEEP(*(.fini_array))
    KEEP(*(.genzehn))
  }
  .ARM.extab : { KEEP(*(.ARM.extab* .gnu.linkonce.armextab.*)) }
  PROVIDE_HIDDEN(__exidx_start = .);
  .ARM.exidx : { KEEP(*(.ARM.exidx* .gnu.linkonce.armexidx.*)) }
  PROVIDE_HIDDEN(__exidx_end = .);
  .eh_frame : { KEEP(*(.eh_frame)) }
  .bss (NOLOAD) : {
    PROVIDE(__bss_start = .);
    *(.bss)
    *(.bss.*)
    *(COMMON)
    PROVIDE(_end = .);
  }
  /DISCARD/ : { *(.comment) *(.note.GNU-stack) }
}
`;

function projectFs(project) {
  const files = {};
  for (const [rawName, value] of Object.entries(project?.files || {})) {
    if (typeof value !== "string") continue;
    const name = safePath(rawName);
    if (!name) continue;
    files[`/project/${name}`] = value;
  }
  return files;
}

function commonCompileArgs() {
  return [
    "--target=arm-none-eabi",
    "-mcpu=arm926ej-s",
    "-marm",
    "-mfloat-abi=soft",
    "-Os",
    "-D_TINSPIRE",
    "-ffreestanding",
    "-fno-builtin",
    "-fno-stack-protector",
    "-ffunction-sections",
    "-fdata-sections",
    "-fno-unwind-tables",
    "-fno-asynchronous-unwind-tables",
    "-nostdinc",
    "-I/project",
    "-I/project/include",
  ];
}

async function compileOne(source, index, files) {
  const lower = source.toLowerCase();
  const out = `/build/source_${String(index).padStart(4, "0")}.o`;
  const args = commonCompileArgs();
  if (/\.(?:cpp|cc|cxx)$/.test(lower)) args.push("-std=c++11", "-fno-exceptions", "-fno-rtti", "-fno-threadsafe-statics");
  else if (/\.S$/.test(source)) args.push("-x", "assembler-with-cpp");
  else if (/\.s$/.test(source)) args.push("-x", "assembler");
  args.push("-c", `/project/${safePath(source)}`, "-o", out);

  const result = await runEmscriptenTool("clang", args, files, [out]);
  if (result.code !== 0 || !result.outputs[out]) {
    const text = result.text || `clang exited with code ${result.code}`;
    const error = buildError("COMPILE_FAILED", `Compilation failed: ${source}`, text);
    error.diagnostics = diagnosticsFromText(text);
    throw error;
  }
  if (!isArmElf(result.outputs[out])) throw buildError("COMPILE_INVALID_OBJECT", `${source} did not produce an ELF32 ARM object.`);
  return { path: out, bytes: result.outputs[out], log: result.text };
}

async function compileCrt0() {
  const out = "/build/__ndless_crt0.o";
  const args = [...commonCompileArgs(), "-x", "assembler-with-cpp", "-c", "/project/__ndless_crt0.S", "-o", out];
  const result = await runEmscriptenTool("clang", args, { "/project/__ndless_crt0.S": CRT0 }, [out]);
  if (result.code !== 0 || !result.outputs[out]) throw buildError("CRT_COMPILE_FAILED", "Failed to assemble the browser Ndless startup stub.", result.text);
  if (!isArmElf(result.outputs[out])) throw buildError("CRT_INVALID_OBJECT", "Browser Ndless startup stub is not ELF32 ARM.");
  return { path: out, bytes: result.outputs[out], log: result.text };
}

async function linkObjects(objects) {
  const files = { "/build/ndless.ld": LD_SCRIPT };
  const objectPaths = [];
  objects.forEach((object, index) => {
    const path = `/build/object_${String(index).padStart(4, "0")}.o`;
    files[path] = object.bytes;
    objectPaths.push(path);
  });
  const out = "/build/program.elf";
  const args = [
    "-flavor", "gnu",
    "-m", "armelf",
    "-T", "/build/ndless.ld",
    "--entry", "_start",
    "--emit-relocs",
    "--gc-sections",
    "--no-undefined",
    "--build-id=none",
    ...objectPaths,
    "-o", out,
  ];
  progress("linking", "Linking ELF32 ARM with dedicated LLD…");
  const result = await runEmscriptenTool("lld", args, files, [out]);
  if (result.code !== 0 || !result.outputs[out]) throw buildError("LINK_FAILED", "LLD failed to link the ARM executable.", result.text || `lld exited with code ${result.code}`);
  if (!isArmElf(result.outputs[out])) throw buildError("LINK_INVALID_ELF", "Linked output is not a valid ELF32 ARM image.");
  return { elf: result.outputs[out], log: result.text };
}

async function prepareToolchain() {
  const { manifest } = await getManifest();
  return {
    ok: true,
    provider: "ndless-arm-toolchain-v1",
    llvmVersion: manifest.llvmVersion,
    armSupport: true,
    targetTriple: manifest.targetTriple,
    cpu: manifest.cpu,
  };
}

async function compileProject(project) {
  await prepareToolchain();
  const files = projectFs(project);
  const sources = Object.keys(project?.files || {}).filter(name => /\.(?:c|cc|cpp|cxx|s|S)$/i.test(name) && !/(^|\/)__ndless_/.test(name));
  if (!sources.length) throw buildError("NO_SOURCES", "Project has no C/C++/ARM source files.");

  const objects = [];
  const logs = [];
  const crt = await compileCrt0();
  objects.push(crt);
  if (crt.log) logs.push(crt.log);

  for (let i = 0; i < sources.length; i++) {
    progress("compiling", `Compiling ${i + 1}/${sources.length}: ${sources[i]}`, { current: i + 1, total: sources.length, file: sources[i] });
    const object = await compileOne(sources[i], i, files);
    objects.push(object);
    if (object.log) logs.push(object.log);
  }

  const linked = await linkObjects(objects);
  if (linked.log) logs.push(linked.log);
  return {
    elf: linked.elf,
    logs: logs.filter(Boolean),
    diagnostics: diagnosticsFromText(logs.join("\n")),
    sourceCount: sources.length,
  };
}

self.onmessage = async event => {
  const { id, action, project } = event.data || {};
  try {
    if (action === "prepare") {
      const result = await prepareToolchain();
      postMessage({ type: "result", id, result });
      return;
    }
    if (action === "build") {
      const result = await compileProject(project);
      postMessage({
        type: "result",
        id,
        result: {
          ok: true,
          provider: "ndless-arm-toolchain-v1",
          elf: result.elf.buffer,
          logs: result.logs,
          diagnostics: result.diagnostics,
          sourceCount: result.sourceCount,
        },
      }, [result.elf.buffer]);
      return;
    }
    throw buildError("UNKNOWN_ACTION", `Unknown build worker action: ${action}`);
  } catch (error) {
    postMessage({
      type: "result",
      id,
      result: {
        ok: false,
        code: error?.code || "BUILD_ERROR",
        message: error?.message || String(error),
        details: error?.details || "",
        diagnostics: error?.diagnostics || [],
      },
    });
  }
};
