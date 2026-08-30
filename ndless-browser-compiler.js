(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const WORKER_VERSION = "20260829-browser-sdk-v1";
  const WORKER_URL = new URL(`./ndless-build-worker-v2.js?v=${WORKER_VERSION}`, document.baseURI).href;
  const RELEASE_TAG = "ndless-arm-toolchain-v1";

  let worker = null;
  let seq = 0;
  const pending = new Map();
  let lastArtifact = null;

  function ensureWorker() {
    if (worker) return worker;
    worker = new Worker(WORKER_URL, { type:"module", name:"ndless-full-sdk-build-worker" });
    worker.onmessage = event => {
      const msg = event.data || {};
      if (msg.type === "progress") {
        for (const request of pending.values()) request.onProgress?.(msg);
        return;
      }
      if (msg.type !== "result") return;
      const request = pending.get(msg.id);
      if (!request) return;
      pending.delete(msg.id);
      request.cleanup?.();
      request.resolve(msg.result);
    };
    worker.onerror = event => {
      const error = new Error(event.message || "Ndless browser compiler worker crashed.");
      for (const request of pending.values()) {
        request.cleanup?.();
        request.reject(error);
      }
      pending.clear();
      try { worker.terminate(); } catch (_) {}
      worker = null;
    };
    return worker;
  }

  function reset() {
    try { worker?.terminate?.(); } catch (_) {}
    worker = null;
    for (const request of pending.values()) {
      request.cleanup?.();
      request.reject(new DOMException("Build cancelled", "AbortError"));
    }
    pending.clear();
  }

  function request(action, payload = {}, options = {}) {
    const w = ensureWorker();
    const id = ++seq;
    return new Promise((resolve, reject) => {
      let abortHandler = null;
      const cleanup = () => {
        if (abortHandler && options.signal) options.signal.removeEventListener("abort", abortHandler);
      };
      if (options.signal) {
        if (options.signal.aborted) {
          cleanup();
          reject(new DOMException("Build cancelled", "AbortError"));
          return;
        }
        abortHandler = () => {
          pending.delete(id);
          cleanup();
          reset();
          reject(new DOMException("Build cancelled", "AbortError"));
        };
        options.signal.addEventListener("abort", abortHandler, { once:true });
      }
      pending.set(id, { resolve, reject, cleanup, onProgress:options.onProgress });
      w.postMessage({ id, action, ...payload });
    });
  }

  function sanitizeProject(project) {
    const files = {};
    for (const [name, value] of Object.entries(project?.files || {})) {
      if (typeof value === "string") files[name] = value;
    }
    return {
      type:project?.type || "ndless-project",
      version:project?.version || 1,
      name:project?.name || "ndless-app",
      language:project?.language || "c",
      template:project?.template || "basic",
      target:"zehn-modern",
      activeFile:project?.activeFile || "",
      files,
      settings:{ ...(project?.settings || {}) },
    };
  }

  function sanitizeName(name) {
    const coreName = root.NdlessProjectCore?.sanitizeProjectName?.(name);
    if (coreName) return coreName;
    const clean = String(name || "ndless-app").trim().replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
    return clean || "ndless-app";
  }

  function validateTns(bytes) {
    const parsed = root.NdlessZehn?.findZehn?.(bytes);
    if (!parsed?.valid) throw new Error(`Generated browser TNS failed Zehn validation${parsed?.reason ? `: ${parsed.reason}` : "."}`);
    return parsed;
  }

  async function prepare(options = {}) {
    options.onProgress?.({ stage:"preparing", message:"Preparando Clang/LLD + Ndless SDK en el navegador…" });
    const result = await request("prepare", {}, options);
    if (!result?.ok) {
      const error = new Error(result?.message || "Browser ARM toolchain is unavailable.");
      error.code = result?.code || "BROWSER_TOOLCHAIN_UNAVAILABLE";
      error.details = result?.details || "";
      throw error;
    }
    return result;
  }

  async function build(project, options = {}) {
    if (!project) throw new Error("No Ndless project is open.");
    if ((project.target || "zehn-modern") !== "zehn-modern") {
      const error = new Error("Browser-native compilation currently supports Modern Zehn only.");
      error.code = "TARGET_NOT_IMPLEMENTED";
      throw error;
    }

    const onProgress = options.onProgress || (() => {});
    const started = performance.now();
    const sanitized = sanitizeProject(project);

    onProgress({ stage:"preparing", message:"Inicializando compilador ARM dentro del navegador…" });
    await prepare({ signal:options.signal, onProgress });

    onProgress({ stage:"compiling", message:"Compilando proyecto con Clang ARM + Ndless SDK…" });
    const compiled = await request("build", { project:sanitized }, { signal:options.signal, onProgress });
    if (!compiled?.ok) {
      const error = new Error(compiled?.message || "Browser ARM compilation failed.");
      error.code = compiled?.code || "BROWSER_BUILD_FAILED";
      error.details = compiled?.details || "";
      error.diagnostics = compiled?.diagnostics || [];
      throw error;
    }

    const elfBytes = new Uint8Array(compiled.elf);
    if (!elfBytes.length) throw new Error("Browser compiler returned an empty ARM ELF.");

    onProgress({ stage:"packaging", message:"Convirtiendo ELF ARM a Zehn dentro del navegador…" });
    if (!root.NdlessZehnBuilder?.buildFromElf) throw new Error("NdlessZehnBuilder is unavailable.");
    const name = sanitizeName(project.name);
    const packaged = await root.NdlessZehnBuilder.buildFromElf(elfBytes, {
      name,
      author:"TNS Tool WASM",
      version:1,
      compress:false,
      runsOnColor:true,
      runsOnClickpad:true,
      runsOnTouchpad:true,
      runsOn32MB:true,
    });
    const bytes = packaged.bytes;
    const detection = validateTns(bytes);

    const result = {
      ok:true,
      engine:"browser-full-sdk",
      target:"zehn-modern",
      filename:`${name}.tns`,
      bytes,
      elfBytes,
      detection,
      logs:compiled.logs || [],
      diagnostics:compiled.diagnostics || [],
      toolchain:compiled.toolchain || null,
      stats:{
        sourceFiles:compiled.sourceCount || 0,
        elfSize:elfBytes.length,
        tnsSize:bytes.length,
        relocations:packaged.stats?.relocations || 0,
        durationMs:Math.round(performance.now() - started),
      },
    };
    lastArtifact = result;
    onProgress({ stage:"complete", message:`Compilación web lista · ${Math.round(bytes.length / 1024)} KB`, result });
    return result;
  }

  async function releaseReady() {
    try {
      const response = await fetch(`https://api.github.com/repos/acewalt/tns-tool-wasm/releases/tags/${RELEASE_TAG}`, {
        headers:{ Accept:"application/vnd.github+json" },
        cache:"no-store",
      });
      if (!response.ok) return false;
      const release = await response.json();
      const manifest = release.assets?.find?.(asset => asset.name === "toolchain.json");
      return !!manifest;
    } catch (_) {
      return false;
    }
  }

  root.NdlessBrowserCompiler = Object.freeze({
    version:1,
    WORKER_URL,
    RELEASE_TAG,
    prepare,
    build,
    releaseReady,
    sanitizeProject,
    reset,
    get lastArtifact(){ return lastArtifact; },
  });
})();
