const RELEASE_TAG = "ndless-arm-toolchain-v1";
const RELEASE_API = `https://api.github.com/repos/acewalt/tns-tool-wasm/releases/tags/${RELEASE_TAG}`;
const CACHE_NAME = "tns-tool-ndless-arm-toolchain-v2";
const SDK_MAGIC = "TNSWEBSDK1";

let releasePromise = null;
let manifestPromise = null;
let sdkPromise = null;
const loadedTools = new Map();

function progress(stage, message, extra = {}) {
  postMessage({ type:"progress", stage, message, ...extra });
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
  if (b[4] !== 1 || b[5] !== 1) return false;
  return (b[18] | (b[19] << 8)) === 40;
}

function diagnosticsFromText(text) {
  const result = [];
  const re = /(?:^|\n)([^:\n]+):(\d+):(\d+):\s+(fatal error|error|warning|note):\s*([^\n]+)/g;
  for (let m; (m = re.exec(String(text || ""))); ) {
    result.push({
      file:m[1].replace(/^\/project\//, ""),
      line:+m[2],
      column:+m[3],
      severity:/warning/.test(m[4]) ? "warning" : (/note/.test(m[4]) ? "info" : "error"),
      message:m[5].trim(),
    });
  }
  return result;
}

async function getRelease() {
  if (!releasePromise) {
    releasePromise = (async () => {
      progress("preparing", "Comprobando toolchain ARM web…");
      const response = await fetch(RELEASE_API, {
        headers:{ Accept:"application/vnd.github+json" },
        cache:"no-store",
      });
      if (response.status === 404) {
        throw buildError(
          "ARM_TOOLCHAIN_BUILDING",
          "La toolchain ARM web todavía se está construyendo.",
          "GitHub Actions está preparando Clang/LLD + Ndless SDK. Cuando se publique la release ndless-arm-toolchain-v1, el navegador la usará automáticamente."
        );
      }
      if (!response.ok) throw buildError("TOOLCHAIN_RELEASE_FETCH_FAILED", `No se pudo consultar la toolchain ARM (${response.status}).`);
      const release = await response.json();
      if (!Array.isArray(release.assets)) throw buildError("TOOLCHAIN_RELEASE_INVALID", "La release ARM no contiene assets.");
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
  if (!asset) throw buildError("TOOLCHAIN_ASSET_MISSING", `Falta un asset de la toolchain: ${name}`);
  return asset;
}

async function cachedFetch(asset) {
  const direct = asset.browser_download_url;
  const api = asset.url;
  let cache = null;
  try {
    if (typeof caches !== "undefined") cache = await caches.open(CACHE_NAME);
  } catch (_) {}

  if (cache && direct) {
    try {
      const hit = await cache.match(direct);
      if (hit) return hit;
    } catch (_) {}
  }

  const attempts = [
    [direct, { mode:"cors", cache:"force-cache" }],
    [api, { headers:{ Accept:"application/octet-stream" }, mode:"cors", cache:"no-store" }],
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
  throw buildError("TOOLCHAIN_ASSET_FETCH_FAILED", `No se pudo descargar ${asset.name}.`, lastError?.message || "Network error");
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
      try { manifest = JSON.parse(text); }
      catch (_) { throw buildError("TOOLCHAIN_MANIFEST_INVALID", "toolchain.json no es JSON válido."); }

      if (!manifest?.targetBackends?.includes?.("ARM")) throw buildError("TOOLCHAIN_ARM_BACKEND_MISSING", "La toolchain publicada no contiene backend ARM.");
      if (manifest.targetTriple !== "arm-none-eabi") throw buildError("TOOLCHAIN_TARGET_MISMATCH", `Target inesperado: ${manifest.targetTriple || "unknown"}.`);
      if (!manifest.tools?.clang || !manifest.tools?.lld) throw buildError("TOOLCHAIN_MANIFEST_INVALID", "Falta Clang o LLD en el manifiesto.");
      if (manifest.sdk?.format !== SDK_MAGIC || !Array.isArray(manifest.sdk?.packParts) || !manifest.sdk.packParts.length) {
        throw buildError("FULL_SDK_SYSROOT_REQUIRED", "La release ARM existe, pero no contiene el Ndless SDK web completo.");
      }
      return { release, manifest };
    })().catch(error => {
      manifestPromise = null;
      throw error;
    });
  }
  return manifestPromise;
}

async function combineParts(release, names, label) {
  const chunks = [];
  let total = 0;
  for (let i = 0; i < names.length; i++) {
    progress("preparing", `Descargando ${label} ${i + 1}/${names.length}…`, { current:i + 1, total:names.length, tool:label });
    const chunk = await assetBytes(release, names[i]);
    chunks.push(chunk);
    total += chunk.length;
  }
  const all = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.length;
  }
  return all;
}

async function combineWasmParts(release, toolName, info) {
  const names = Array.from(info.wasmParts || []);
  if (!names.length) throw buildError("TOOLCHAIN_PARTS_MISSING", `${toolName} no tiene partes WASM.`);
  const wasm = await combineParts(release, names, toolName);
  if (info.wasmBytes && Number(info.wasmBytes) !== wasm.length) {
    throw buildError("TOOLCHAIN_SIZE_MISMATCH", `${toolName}.wasm tiene tamaño inesperado.`);
  }
  if (info.wasmSha256) {
    progress("preparing", `Verificando ${toolName}…`);
    const digest = await sha256(wasm);
    if (digest.toLowerCase() !== String(info.wasmSha256).toLowerCase()) {
      throw buildError("TOOLCHAIN_HASH_MISMATCH", `${toolName}.wasm falló SHA-256.`);
    }
  }
  return wasm;
}

async function importEmscriptenFactory(jsText, toolName) {
  const source = `${jsText}\nexport default LLVMTool;\n//# sourceURL=ndless-${toolName}.mjs\n`;
  const url = URL.createObjectURL(new Blob([source], { type:"text/javascript" }));
  try {
    const module = await import(url);
    if (typeof module.default !== "function") throw buildError("TOOLCHAIN_FACTORY_INVALID", `${toolName}.js no expuso LLVMTool.`);
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
    if (!info) throw buildError("TOOLCHAIN_MANIFEST_INVALID", `No hay ${toolName} en el manifiesto.`);
    progress("preparing", `Cargando ${toolName} ARM…`);
    const [jsText, wasm] = await Promise.all([
      assetText(release, info.js),
      combineWasmParts(release, toolName, info),
    ]);
    if (info.jsSha256) {
      const digest = await sha256(new TextEncoder().encode(jsText));
      if (digest.toLowerCase() !== String(info.jsSha256).toLowerCase()) throw buildError("TOOLCHAIN_HASH_MISMATCH", `${toolName}.js falló SHA-256.`);
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

async function gunzip(bytes) {
  if (typeof DecompressionStream !== "function") {
    throw buildError("GZIP_UNAVAILABLE", "Este navegador no ofrece DecompressionStream(gzip), necesario para descomprimir el SDK.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function readU16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function parseSdkPack(raw) {
  const magic = new TextDecoder().decode(raw.subarray(0, SDK_MAGIC.length));
  if (magic !== SDK_MAGIC) throw buildError("SDK_PACK_INVALID", `Magic SDK inválido: ${magic}.`);
  let p = SDK_MAGIC.length;
  if (p + 4 > raw.length) throw buildError("SDK_PACK_INVALID", "SDK pack truncado.");
  const count = readU32(raw, p); p += 4;
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (p + 6 > raw.length) throw buildError("SDK_PACK_INVALID", `SDK pack truncado en entrada ${i}.`);
    const pathLen = readU16(raw, p); p += 2;
    const dataLen = readU32(raw, p); p += 4;
    if (!pathLen || p + pathLen + dataLen > raw.length) throw buildError("SDK_PACK_INVALID", `Entrada SDK ${i} inválida.`);
    const path = new TextDecoder().decode(raw.subarray(p, p + pathLen)); p += pathLen;
    if (!path.startsWith("/sdk/") || path.includes("/../")) throw buildError("SDK_PACK_INVALID", `Ruta SDK insegura: ${path}`);
    files.set(path, raw.slice(p, p + dataLen));
    p += dataLen;
  }
  if (!files.size) throw buildError("SDK_PACK_INVALID", "SDK pack vacío.");
  return files;
}

async function loadSdk() {
  if (!sdkPromise) {
    sdkPromise = (async () => {
      const { release, manifest } = await getManifest();
      const info = manifest.sdk;
      progress("preparing", "Cargando Ndless SDK web…");
      const packed = await combineParts(release, info.packParts, "Ndless SDK");
      if (info.packBytes && Number(info.packBytes) !== packed.length) throw buildError("SDK_SIZE_MISMATCH", "El SDK comprimido tiene tamaño inesperado.");
      if (info.packSha256) {
        const digest = await sha256(packed);
        if (digest.toLowerCase() !== String(info.packSha256).toLowerCase()) throw buildError("SDK_HASH_MISMATCH", "El SDK falló SHA-256.");
      }
      progress("preparing", "Descomprimiendo Ndless SDK…");
      const raw = await gunzip(packed);
      if (info.unpackedBytes && Number(info.unpackedBytes) !== raw.length) throw buildError("SDK_SIZE_MISMATCH", "El SDK descomprimido tiene tamaño inesperado.");
      if (info.unpackedSha256) {
        const digest = await sha256(raw);
        if (digest.toLowerCase() !== String(info.unpackedSha256).toLowerCase()) throw buildError("SDK_HASH_MISMATCH", "El SDK descomprimido falló SHA-256.");
      }
      const files = parseSdkPack(raw);
      for (const required of [
        "/sdk/ndless/include/os.h",
        "/sdk/ndless/include/libndls.h",
        "/sdk/ndless/lib/libndls.a",
        "/sdk/ndless/lib/libsyscalls.a",
        "/sdk/ndless/system/ldscript",
        "/sdk/ndless/system/crt0.o",
        "/sdk/lib/libc.a",
        "/sdk/lib/libm.a",
        "/sdk/lib/libgcc.a",
      ]) {
        if (!files.has(required)) throw buildError("SDK_FILE_MISSING", `El SDK publicado no contiene ${required}.`);
      }
      return { files, info, manifest };
    })().catch(error => {
      sdkPromise = null;
      throw error;
    });
  }
  return sdkPromise;
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

async function runEmscriptenTool(toolName, args, files = {}, readPaths = [], withSdk = true) {
  const [tool, sdk] = await Promise.all([
    loadTool(toolName),
    withSdk ? loadSdk() : Promise.resolve(null),
  ]);
  const stdout = [];
  const stderr = [];
  let module;
  try {
    module = await tool.factory({
      noInitialRun:true,
      wasmBinary:tool.wasm,
      print:text => stdout.push(String(text)),
      printErr:text => stderr.push(String(text)),
    });
  } catch (error) {
    throw buildError("TOOLCHAIN_INSTANTIATE_FAILED", `No se pudo iniciar ${toolName}.wasm.`, error?.stack || error?.message || String(error));
  }

  const FS = module?.FS;
  if (!FS || typeof module.callMain !== "function") throw buildError("TOOLCHAIN_RUNTIME_INVALID", `${toolName} no expone FS + callMain.`);

  for (const dir of ["/project", "/build", "/sdk"]) mkdirTree(FS, dir);

  const mounted = new Set();
  const write = (path, value) => {
    if (mounted.has(path)) return;
    mkdirTree(FS, parentDir(path));
    FS.writeFile(path, value instanceof Uint8Array ? value : String(value), value instanceof Uint8Array ? undefined : { encoding:"utf8" });
    mounted.add(path);
  };

  if (sdk) {
    progress("preparing", `Montando SDK en ${toolName}…`);
    for (const [path, bytes] of sdk.files) write(path, bytes);
  }
  for (const [path, value] of Object.entries(files)) {
    if (!path.startsWith("/")) throw buildError("INTERNAL_PATH_ERROR", `Ruta interna debe ser absoluta: ${path}`);
    write(path, value);
  }

  let code = 0;
  try {
    const returned = module.callMain(args);
    if (typeof returned === "number") code = returned;
  } catch (error) {
    if (typeof error?.status === "number") code = error.status;
    else if (error?.name === "ExitStatus") code = Number(error.status || 0);
    else if (String(error) === "unwind") code = Number(module.EXITSTATUS || 0);
    else throw buildError("TOOLCHAIN_RUNTIME_ERROR", `${toolName} se detuvo inesperadamente.`, error?.stack || error?.message || String(error));
  }
  if (typeof module.EXITSTATUS === "number" && module.EXITSTATUS !== 0) code = module.EXITSTATUS;

  const outputs = {};
  for (const path of readPaths) {
    try { outputs[path] = new Uint8Array(FS.readFile(path)); }
    catch (_) { outputs[path] = null; }
  }
  return { code, stdout, stderr, text:[...stdout, ...stderr].join("\n").trim(), outputs };
}

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

function projectIncludeDirs(project) {
  const dirs = new Set(["/project", "/project/include"]);
  for (const name of Object.keys(project?.files || {})) {
    if (!/\.(?:h|hpp|hh|hxx)$/i.test(name)) continue;
    const clean = safePath(name);
    const slash = clean.lastIndexOf("/");
    if (slash > 0) dirs.add(`/project/${clean.slice(0, slash)}`);
  }
  return [...dirs];
}

function sdkCompileIncludes(sdkInfo, isCpp) {
  const dirs = Array.from(sdkInfo?.includeDirs || []);
  return dirs.filter(path => isCpp || !path.startsWith("/sdk/cxx/"));
}

function commonCompileArgs(project, sdkInfo, source) {
  const lower = source.toLowerCase();
  const isCpp = /\.(?:cpp|cc|cxx)$/.test(lower);
  const args = [
    "--target=arm-none-eabi",
    "-mcpu=arm926ej-s",
    "-marm",
    "-mfloat-abi=soft",
    "-Os",
    "-D_TINSPIRE",
    "-Wall",
    "-W",
    "-ffunction-sections",
    "-fdata-sections",
    "-fno-stack-protector",
    "-nostdinc",
  ];
  if (isCpp) args.push("-std=c++11", "-fno-exceptions", "-fno-rtti", "-fno-threadsafe-statics");
  for (const dir of projectIncludeDirs(project)) args.push("-I", dir);
  for (const dir of sdkCompileIncludes(sdkInfo, isCpp)) {
    const system = dir.startsWith("/sdk/clang/") || dir.startsWith("/sdk/newlib/") || dir.startsWith("/sdk/cxx/");
    args.push(system ? "-isystem" : "-I", dir);
  }
  return args;
}

async function compileOne(project, source, index, projectFiles, sdkInfo) {
  const out = `/build/source_${String(index).padStart(4, "0")}.o`;
  const args = commonCompileArgs(project, sdkInfo, source);
  if (/\.S$/.test(source)) args.push("-x", "assembler-with-cpp", "-D", "GNU_AS");
  else if (/\.s$/.test(source)) args.push("-x", "assembler");
  args.push("-c", `/project/${safePath(source)}`, "-o", out);

  const result = await runEmscriptenTool("clang", args, projectFiles, [out], true);
  if (result.code !== 0 || !result.outputs[out]) {
    const text = result.text || `clang exited with code ${result.code}`;
    const error = buildError("COMPILE_FAILED", `Falló la compilación de ${source}.`, text);
    error.diagnostics = diagnosticsFromText(text);
    throw error;
  }
  if (!isArmElf(result.outputs[out])) throw buildError("COMPILE_INVALID_OBJECT", `${source} no produjo un objeto ELF32 ARM.`);
  return { path:out, bytes:result.outputs[out], log:result.text };
}

function sdkHas(sdkFiles, path) {
  return sdkFiles.has(path);
}

async function linkObjects(project, objects, sdk) {
  const files = {};
  const objectPaths = [];
  objects.forEach((object, index) => {
    const path = `/build/object_${String(index).padStart(4, "0")}.o`;
    files[path] = object.bytes;
    objectPaths.push(path);
  });
  const out = "/build/program.elf";
  const system = sdk.info.system || {};
  const args = [
    "-flavor", "gnu",
    "-m", "armelf",
    "-static",
    "--emit-relocs",
    "--gc-sections",
    "--build-id=none",
    "-T", system.ldscript || "/sdk/ndless/system/ldscript",
    system.crt0 || "/sdk/ndless/system/crt0.o",
    system.crti || "/sdk/ndless/system/crti.o",
    ...objectPaths,
    "-L", "/sdk/ndless/lib",
    "-L", "/sdk/lib",
  ];

  for (const name of ["freetype", "z", "SDL_gfx", "SDL_image", "SDL"]) {
    if (sdkHas(sdk.files, `/sdk/ndless/lib/lib${name}.a`)) args.push(`-l${name}`);
  }

  args.push("--start-group");
  if (sdkHas(sdk.files, "/sdk/ndless/lib/libnspireio.a")) args.push("-lnspireio");
  if (sdkHas(sdk.files, "/sdk/lib/libstdc++.a")) args.push("-lstdc++");
  if (sdkHas(sdk.files, "/sdk/lib/libsupc++.a")) args.push("-lsupc++");
  args.push("-lndls", "-lsyscalls", "-lm", "-lc", "--end-group", "-lgcc");
  if (system.crtn && sdkHas(sdk.files, system.crtn)) args.push(system.crtn);
  args.push("-o", out);

  progress("linking", "Enlazando ELF32 ARM con LLD + Ndless SDK…");
  const result = await runEmscriptenTool("lld", args, files, [out], true);
  if (result.code !== 0 || !result.outputs[out]) {
    const error = buildError("LINK_FAILED", "LLD no pudo enlazar el ejecutable ARM.", result.text || `lld exited with code ${result.code}`);
    error.diagnostics = diagnosticsFromText(result.text);
    throw error;
  }
  if (!isArmElf(result.outputs[out])) throw buildError("LINK_INVALID_ELF", "La salida enlazada no es ELF32 ARM.");
  return { elf:result.outputs[out], log:result.text };
}

async function prepareToolchain() {
  const [{ manifest }, sdk] = await Promise.all([getManifest(), loadSdk()]);
  return {
    ok:true,
    provider:RELEASE_TAG,
    llvmVersion:manifest.llvmVersion,
    armRuntimeVersion:manifest.armRuntimeVersion,
    armSupport:true,
    fullSdk:true,
    sdkFiles:sdk.files.size,
    targetTriple:manifest.targetTriple,
    cpu:manifest.cpu,
  };
}

async function compileProject(project) {
  const prepared = await prepareToolchain();
  const sdk = await loadSdk();
  const projectFiles = projectFs(project);
  const sources = Object.keys(project?.files || {})
    .filter(name => /\.(?:c|cc|cpp|cxx|s|S)$/i.test(name))
    .sort();

  if (!sources.length) throw buildError("NO_SOURCES", "El proyecto no contiene fuentes C/C++/ARM.");

  const objects = [];
  const logs = [];
  for (let i = 0; i < sources.length; i++) {
    progress("compiling", `Compilando ${i + 1}/${sources.length}: ${sources[i]}`, { current:i + 1, total:sources.length, file:sources[i] });
    const object = await compileOne(project, sources[i], i, projectFiles, sdk.info);
    objects.push(object);
    if (object.log) logs.push(object.log);
  }

  const linked = await linkObjects(project, objects, sdk);
  if (linked.log) logs.push(linked.log);
  return {
    elf:linked.elf,
    logs:logs.filter(Boolean),
    diagnostics:diagnosticsFromText(logs.join("\n")),
    sourceCount:sources.length,
    prepared,
  };
}

self.onmessage = async event => {
  const { id, action, project } = event.data || {};
  try {
    if (action === "prepare") {
      const result = await prepareToolchain();
      postMessage({ type:"result", id, result });
      return;
    }
    if (action === "build") {
      const result = await compileProject(project);
      postMessage({
        type:"result",
        id,
        result:{
          ok:true,
          provider:RELEASE_TAG,
          fullSdk:true,
          elf:result.elf.buffer,
          logs:result.logs,
          diagnostics:result.diagnostics,
          sourceCount:result.sourceCount,
          toolchain:result.prepared,
        },
      }, [result.elf.buffer]);
      return;
    }
    throw buildError("UNKNOWN_ACTION", `Acción desconocida: ${action}`);
  } catch (error) {
    postMessage({
      type:"result",
      id,
      result:{
        ok:false,
        code:error?.code || "BUILD_ERROR",
        message:error?.message || String(error),
        details:error?.details || "",
        diagnostics:error?.diagnostics || [],
      },
    });
  }
};
