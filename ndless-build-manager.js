(() => {
  "use strict";

  let worker = null;
  let seq = 0;
  const pending = new Map();
  let lastArtifact = null;

  function ensureWorker() {
    if (worker) return worker;
    const url = new URL("./ndless-build-worker.js", document.baseURI).href;
    worker = new Worker(url, { type: "module", name: "ndless-build-worker" });
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
      const error = new Error(event.message || "Ndless build worker crashed.");
      for (const request of pending.values()) { request.cleanup?.(); request.reject(error); }
      pending.clear();
      try { worker.terminate(); } catch (_) {}
      worker = null;
    };
    return worker;
  }

  function resetWorker() {
    try { worker?.terminate?.(); } catch (_) {}
    worker = null;
    for (const request of pending.values()) { request.cleanup?.(); request.reject(new DOMException("Build cancelled", "AbortError")); }
    pending.clear();
  }

  function request(action, payload = {}, options = {}) {
    const w = ensureWorker();
    const id = ++seq;
    return new Promise((resolve, reject) => {
      let abortHandler = null;
      const cleanup = () => { if (abortHandler && options.signal) options.signal.removeEventListener("abort", abortHandler); };
      if (options.signal) {
        if (options.signal.aborted) return reject(new DOMException("Build cancelled", "AbortError"));
        abortHandler = () => { pending.delete(id); cleanup(); resetWorker(); reject(new DOMException("Build cancelled", "AbortError")); };
        options.signal.addEventListener("abort", abortHandler, { once: true });
      }
      pending.set(id, { resolve, reject, cleanup, onProgress: options.onProgress });
      w.postMessage({ id, action, ...payload });
    });
  }

  async function prepare(options = {}) {
    options.onProgress?.({ stage:"preparing", message:"Preparing browser ARM compiler…" });
    const result = await request("prepare", {}, options);
    if (!result?.ok) {
      const error = new Error(result?.message || "Browser ARM compiler is unavailable.");
      error.code = result?.code;
      error.details = result?.details;
      throw error;
    }
    return result;
  }

  function sanitizedProject(project) {
    const files = {};
    for (const [name, value] of Object.entries(project?.files || {})) {
      if (typeof value === "string") files[name] = value;
    }
    return {
      type: project?.type,
      version: project?.version,
      name: project?.name || "ndless-app",
      language: project?.language || "c",
      template: project?.template || "basic",
      target: project?.target || "zehn-modern",
      activeFile: project?.activeFile || "",
      files,
      settings: { ...(project?.settings || {}) },
    };
  }

  async function build(project, options = {}) {
    const started = performance.now();
    const onProgress = options.onProgress || (()=>{});
    lastArtifact = null;
    if (!project) return { ok:false, stage:"preparing", diagnostics:[], message:"No Ndless project is open." };
    if (project.target !== "zehn-modern") {
      return { ok:false, stage:"preparing", diagnostics:[], code:"TARGET_NOT_IMPLEMENTED", message:"Browser Build TNS currently supports Modern Zehn first. Legacy bFLT remains available through the external r903 SDK while its browser linker is being ported." };
    }

    try {
      await prepare({ onProgress, signal: options.signal });
      onProgress({ stage:"compiling", message:"Compiling project for ARM926EJ-S…" });
      const compiled = await request("build", { project: sanitizedProject(project) }, { onProgress, signal: options.signal });
      if (!compiled?.ok) return { ok:false, stage:"compile", code:compiled?.code, message:compiled?.message || "Compilation failed.", details:compiled?.details || "", diagnostics:compiled?.diagnostics || [], logs: compiled?.details ? String(compiled.details).split(/\r?\n/) : [] };
      const elfBytes = new Uint8Array(compiled.elf);

      onProgress({ stage:"packaging", message:"Converting ARM ELF to Zehn…" });
      if (!globalThis.NdlessElf32 || !globalThis.NdlessZehnBuilder) throw new Error("ELF/Zehn build modules are unavailable.");
      const name = globalThis.NdlessProjectCore?.sanitizeProjectName?.(project.name) || String(project.name || "ndless-app").replace(/[^A-Za-z0-9._-]+/g,"-");
      const packaged = await globalThis.NdlessZehnBuilder.buildFromElf(elfBytes, {
        name,
        author: "TNS Tool WASM",
        version: 1,
        compress: false,
        runsOnColor: true,
        runsOnClickpad: true,
        runsOnTouchpad: true,
        runsOn32MB: true,
      });
      const bytes = packaged.bytes;

      onProgress({ stage:"validating", message:"Validating generated TNS…" });
      const detection = globalThis.TnsUniversalDetector?.detect?.(bytes) || globalThis.NdlessFormatDetector?.detect?.(bytes) || globalThis.NdlessZehn?.findZehn?.(bytes);
      if (!detection?.valid || detection.format !== "zehn") throw new Error(`Generated TNS failed validation${detection?.reason ? `: ${detection.reason}` : "."}`);

      const result = {
        ok:true,
        target:"zehn-modern",
        filename:`${name}.tns`,
        bytes,
        elfBytes,
        format:"zehn",
        detection,
        logs: compiled.logs || [],
        diagnostics: compiled.diagnostics || [],
        stats:{
          sourceFiles: compiled.sourceCount || 0,
          elfSize: elfBytes.length,
          tnsSize: bytes.length,
          relocations: packaged.stats?.relocations || 0,
          durationMs: Math.round(performance.now() - started),
        },
      };
      lastArtifact = result;
      onProgress({ stage:"complete", message:"Build successful.", result });
      return result;
    } catch (error) {
      if (error?.name === "AbortError") return { ok:false, stage:"cancelled", code:"CANCELLED", message:"Build cancelled.", diagnostics:[] };
      return { ok:false, stage:"build", code:error?.code || "BUILD_ERROR", message:error?.message || String(error), details:error?.details || "", diagnostics:error?.diagnostics || [] };
    }
  }

  function download(result = lastArtifact) {
    if (!result?.ok || !result.bytes) throw new Error("No successful TNS build is available.");
    const blob = new Blob([result.bytes], { type:"application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = result.filename || "program.tns";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function artifact() { return lastArtifact; }
  function dispose() { resetWorker(); lastArtifact = null; }

  window.NdlessBuildManager = Object.freeze({ prepare, build, download, artifact, dispose });
})();
