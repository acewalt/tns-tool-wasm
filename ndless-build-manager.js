(() => {
  "use strict";

  let worker = null;
  let seq = 0;
  const pending = new Map();
  let lastArtifact = null;

  function ensureWorker() {
    if (worker) return worker;
    const url = new URL("./ndless-build-worker.js", document.baseURI).href;
    worker = new Worker(url, { type:"module", name:"ndless-build-worker" });
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
        options.signal.addEventListener("abort", abortHandler, { once:true });
      }
      pending.set(id, { resolve, reject, cleanup, onProgress:options.onProgress });
      w.postMessage({ id, action, ...payload });
    });
  }

  async function prepare(options = {}) {
    options.onProgress?.({ stage:"preparing", message:"Preparing browser ARM fallback…" });
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
      type:project?.type,
      version:project?.version,
      name:project?.name || "ndless-app",
      language:project?.language || "c",
      template:project?.template || "basic",
      target:project?.target || "zehn-modern",
      activeFile:project?.activeFile || "",
      files,
      settings:{ ...(project?.settings || {}) },
    };
  }

  function canonicalize(value) {
    if (value == null || typeof value !== "object") return value;
    if (value instanceof Uint8Array) return { __type:"Uint8Array", bytes:Array.from(value) };
    if (ArrayBuffer.isView(value)) return { __type:value.constructor?.name || "TypedArray", bytes:Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)) };
    if (value instanceof ArrayBuffer) return { __type:"ArrayBuffer", bytes:Array.from(new Uint8Array(value)) };
    if (Array.isArray(value)) return value.map(canonicalize);
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }

  function stableStringify(value) {
    return JSON.stringify(canonicalize(value));
  }

  function hashString(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  function projectFingerprint(project) {
    const canonical = stableStringify(sanitizedProject(project));
    return `ndless:${hashString(canonical)}:${canonical.length}`;
  }

  function withProjectFingerprint(result, project) {
    return {
      ...result,
      projectFingerprint:projectFingerprint(project),
      projectSnapshot:sanitizedProject(project),
    };
  }

  function sameProject(result, project) {
    return !!(result?.ok && result.projectFingerprint && result.projectFingerprint === projectFingerprint(project));
  }

  function browserCompatibility(project) {
    if (project?.language === "asm") return { ok:true };
    if (project?.settings?.browserFreestanding) return { ok:true };
    const source = Object.entries(project?.files || {})
      .filter(([name]) => /\.(?:c|cc|cpp|cxx|S|s)$/i.test(name))
      .map(([,text]) => String(text || ""))
      .join("\n");
    if (!/#\s*include\s*[<"]/m.test(source) && !/\b(?:printf|puts|malloc|free|clrscr|wait_key_pressed|SDL_|nSDL_|nio_)\b/.test(source)) return { ok:true };
    return {
      ok:false,
      code:"FULL_SDK_SYSROOT_REQUIRED",
      message:"This project uses Ndless SDK/libc APIs.",
      details:"Use the local TNS Tool Compiler for full SDK projects. The browser-only compiler remains a freestanding fallback.",
    };
  }

  function ndlessDetection(bytes) {
    return globalThis.NdlessFormatDetector?.detect?.(bytes)
      || globalThis.TnsUniversalDetector?.detect?.(bytes)
      || globalThis.NdlessZehn?.findZehn?.(bytes)
      || null;
  }

  function requireValidNdless(bytes) {
    const detection = ndlessDetection(bytes);
    if (!detection?.valid) throw new Error(`Generated TNS failed local Ndless validation${detection?.reason ? `: ${detection.reason}` : "."}`);
    return detection;
  }

  async function localStatus(options = {}) {
    if (!globalThis.NdlessLocalBridge?.status) return { connected:false, toolchainReady:false };
    return globalThis.NdlessLocalBridge.status(options);
  }

  async function engineStatus(options = {}) {
    const local = await localStatus(options);
    let browser = false;
    if (globalThis.NdlessLocalBridge?.browserFallbackReady) browser = await globalThis.NdlessLocalBridge.browserFallbackReady();
    return { local, browser };
  }

  async function buildWithLocal(project, options = {}) {
    const onProgress = options.onProgress || (()=>{});
    if (!globalThis.NdlessLocalBridge) return { ok:false, unavailable:true, code:"LOCAL_BRIDGE_MODULE_MISSING", message:"Local compiler bridge module is unavailable." };

    onProgress({ stage:"connecting", message:"Checking local TNS Tool Compiler…" });
    const status = await globalThis.NdlessLocalBridge.ensureReady({
      signal:options.signal,
      openIfMissing:options.openLocal !== false,
      alreadyOpened:options.alreadyOpened === true,
      waitForConnection:options.waitForConnection === true,
      waitMs:options.localWaitMs || 12000,
      onProgress,
    });
    if (!status?.connected) {
      return {
        ok:false,
        unavailable:true,
        code:"LOCAL_BRIDGE_UNAVAILABLE",
        message:"TNS Tool Compiler is not connected.",
        details:"Install the Windows or Linux bridge once. Build TNS will then use tnstool:// to open it and send the project through 127.0.0.1.",
      };
    }
    if (!status.toolchainReady) {
      return {
        ok:false,
        unavailable:true,
        connected:true,
        code:"LOCAL_TOOLCHAIN_MISSING",
        message:"TNS Tool Compiler is connected, but its Ndless toolchain is incomplete.",
        details:status.missing?.length ? `Missing: ${status.missing.join(", ")}` : "The bridge needs its native Ndless toolchain bundle.",
        status,
      };
    }

    onProgress({ stage:"compiling", message:`Compiling with local ${status.platform || "native"} Ndless toolchain…` });
    const built = await globalThis.NdlessLocalBridge.build(project, { ...options, status, openIfMissing:false });
    const detection = requireValidNdless(built.bytes);
    const result = withProjectFingerprint({
      ok:true,
      engine:"local",
      target:project.target,
      filename:built.filename,
      bytes:built.bytes,
      elfBytes:built.elfBytes || new Uint8Array(0),
      format:detection.format || "ndless",
      detection,
      logs:built.logs || [],
      diagnostics:built.diagnostics || [],
      platform:built.platform || status.platform,
      toolchain:built.toolchain || status.toolchain,
      stats:{
        sourceFiles:Object.keys(project.files || {}).filter(name => /\.(?:c|cc|cpp|cxx|S|s)$/i.test(name)).length,
        elfSize:built.elfBytes?.length || 0,
        tnsSize:built.bytes.length,
        relocations:0,
        durationMs:built.durationMs || 0,
        engine:"local",
      },
    }, project);
    lastArtifact = result;
    onProgress({ stage:"complete", message:`Build successful with local ${status.platform || "native"} compiler.`, result });
    return result;
  }

  async function buildWithBrowser(project, options = {}) {
    const started = performance.now();
    const onProgress = options.onProgress || (()=>{});
    if (project.target !== "zehn-modern") {
      return { ok:false, stage:"preparing", diagnostics:[], code:"TARGET_NOT_IMPLEMENTED", message:"Browser fallback currently supports Modern Zehn only. Use the local compiler for legacy bFLT." };
    }
    const compatibility = browserCompatibility(project);
    if (!compatibility.ok) return { ok:false, stage:"preparing", diagnostics:[], ...compatibility };

    await prepare({ onProgress, signal:options.signal });
    onProgress({ stage:"compiling", message:"Compiling project for ARM926EJ-S in browser fallback…" });
    const compiled = await request("build", { project:sanitizedProject(project) }, { onProgress, signal:options.signal });
    if (!compiled?.ok) return { ok:false, stage:"compile", code:compiled?.code, message:compiled?.message || "Compilation failed.", details:compiled?.details || "", diagnostics:compiled?.diagnostics || [], logs:compiled?.details ? String(compiled.details).split(/\r?\n/) : [] };
    const elfBytes = new Uint8Array(compiled.elf);

    onProgress({ stage:"packaging", message:"Converting ARM ELF to Zehn…" });
    if (!globalThis.NdlessElf32 || !globalThis.NdlessZehnBuilder) throw new Error("ELF/Zehn build modules are unavailable.");
    const name = globalThis.NdlessProjectCore?.sanitizeProjectName?.(project.name) || String(project.name || "ndless-app").replace(/[^A-Za-z0-9._-]+/g,"-");
    const packaged = await globalThis.NdlessZehnBuilder.buildFromElf(elfBytes, {
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

    onProgress({ stage:"validating", message:"Validating generated TNS…" });
    const detection = requireValidNdless(bytes);
    const result = withProjectFingerprint({
      ok:true,
      engine:"browser",
      target:"zehn-modern",
      filename:`${name}.tns`,
      bytes,
      elfBytes,
      format:detection.format || "zehn",
      detection,
      logs:compiled.logs || [],
      diagnostics:compiled.diagnostics || [],
      stats:{
        sourceFiles:compiled.sourceCount || 0,
        elfSize:elfBytes.length,
        tnsSize:bytes.length,
        relocations:packaged.stats?.relocations || 0,
        durationMs:Math.round(performance.now() - started),
        engine:"browser",
      },
    }, project);
    lastArtifact = result;
    onProgress({ stage:"complete", message:"Build successful with browser fallback.", result });
    return result;
  }

  async function build(project, options = {}) {
    const onProgress = options.onProgress || (()=>{});
    lastArtifact = null;
    if (!project) return { ok:false, stage:"preparing", diagnostics:[], message:"No Ndless project is open." };

    try {
      const local = await buildWithLocal(project, { ...options, onProgress });
      if (local.ok) return local;
      if (!local.unavailable) return local;

      const compatibility = browserCompatibility(project);
      const browserReady = project.target === "zehn-modern" && compatibility.ok && await globalThis.NdlessLocalBridge?.browserFallbackReady?.();
      if (browserReady) {
        onProgress({ stage:"preparing", message:"Local compiler unavailable; using browser fallback…" });
        return await buildWithBrowser(project, { ...options, onProgress });
      }

      return {
        ok:false,
        stage:"preparing",
        diagnostics:[],
        code:local.code === "LOCAL_TOOLCHAIN_MISSING" ? "LOCAL_TOOLCHAIN_MISSING" : "LOCAL_COMPILER_REQUIRED",
        message:local.message || "Local TNS Tool Compiler is required.",
        details:[local.details, compatibility.ok ? "The experimental browser compiler release is not currently available." : compatibility.details].filter(Boolean).join("\n\n"),
        localStatus:local.status || null,
      };
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
    a.href = url;
    a.download = result.filename || "program.tns";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function artifact(project = null) {
    if (!project) return lastArtifact;
    return sameProject(lastArtifact, project) ? lastArtifact : null;
  }
  function dispose() { resetWorker(); lastArtifact = null; }

  window.NdlessBuildManager = Object.freeze({
    prepare,
    build,
    download,
    artifact,
    dispose,
    browserCompatibility,
    sanitizedProject,
    projectFingerprint,
    sameProject,
    localStatus,
    engineStatus,
  });
})();
