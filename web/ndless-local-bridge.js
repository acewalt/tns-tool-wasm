(() => {
  "use strict";

  const BASE_URL = "http://127.0.0.1:34982";
  const STATUS_URL = `${BASE_URL}/v2/status`;
  const BUILD_URL = `${BASE_URL}/v2/build`;
  const LEGACY_BASE_URL = "http://127.0.0.1:34981";
  const LEGACY_STATUS_URL = `${LEGACY_BASE_URL}/v1/status`;
  const PROTOCOL_URL = "tnstool://start";
  const PROTOCOL_VERSION = 2;
  const RELEASE_TAG = "tns-tool-compiler-v2";
  const RELEASE_BASE = `https://github.com/acewalt/tns-tool-wasm/releases/download/${RELEASE_TAG}`;
  const DOWNLOADS = Object.freeze({
    windows: `${RELEASE_BASE}/TNS-Tool-Compiler-Windows-x64.exe`,
    linux: `${RELEASE_BASE}/TNS-Tool-Compiler-Linux-x64.AppImage`,
  });

  function abortError() {
    return new DOMException("Build cancelled", "AbortError");
  }

  function timeoutSignal(timeoutMs, outerSignal) {
    const controller = new AbortController();
    let timer = null;
    const abort = () => controller.abort(outerSignal?.reason || abortError());
    if (outerSignal) {
      if (outerSignal.aborted) abort();
      else outerSignal.addEventListener("abort", abort, { once:true });
    }
    if (timeoutMs > 0) timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), timeoutMs);
    return {
      signal:controller.signal,
      cleanup() {
        if (timer) clearTimeout(timer);
        if (outerSignal) outerSignal.removeEventListener("abort", abort);
      },
    };
  }

  async function fetchJson(url, init = {}, timeoutMs = 1200, outerSignal) {
    const scoped = timeoutSignal(timeoutMs, outerSignal);
    try {
      const response = await fetch(url, { cache:"no-store", ...init, signal:scoped.signal });
      let data = null;
      try { data = await response.json(); } catch (_) {}
      if (!response.ok) {
        const error = new Error(data?.message || `Local compiler returned HTTP ${response.status}.`);
        error.code = data?.code || `HTTP_${response.status}`;
        error.details = data?.details || "";
        error.diagnostics = data?.diagnostics || [];
        error.missing = data?.missing || [];
        throw error;
      }
      return data || {};
    } finally {
      scoped.cleanup();
    }
  }

  async function legacyStatus(options = {}) {
    try {
      const data = await fetchJson(LEGACY_STATUS_URL, { method:"GET" }, options.timeoutMs || 550, options.signal);
      if (data?.bridge !== true && data?.compiler !== true) return null;
      const version = data?.version || "0.1.0";
      return {
        connected:true,
        toolchainReady:false,
        protocol:Number(data?.protocol || 1),
        platform:data?.platform || "windows",
        version,
        toolchain:null,
        missing:[`Legacy TNS Tool Compiler bridge ${version} detected on 127.0.0.1:34981. Install the current self-contained compiler to replace it.`],
        selfContained:false,
        transport:data?.transport || "json",
        legacy:true,
        legacyPort:34981,
        raw:data,
      };
    } catch (error) {
      if (options.signal?.aborted) throw abortError();
      return null;
    }
  }

  async function status(options = {}) {
    try {
      const data = await fetchJson(STATUS_URL, {
        method:"GET",
        headers:{ "X-TNS-Tool-Protocol":String(PROTOCOL_VERSION) },
      }, options.timeoutMs || 900, options.signal);
      const compatible = Number(data?.protocol || 0) === PROTOCOL_VERSION;
      return {
        connected:data?.compiler === true || data?.bridge === true,
        toolchainReady:compatible && data?.toolchainReady === true,
        protocol:Number(data?.protocol || 0),
        platform:data?.platform || "unknown",
        version:data?.version || "unknown",
        toolchain:data?.toolchain || null,
        missing:Array.isArray(data?.missing) ? data.missing : [],
        selfContained:data?.selfContained === true,
        transport:data?.transport || null,
        legacy:false,
        raw:data,
      };
    } catch (error) {
      if (options.signal?.aborted) throw abortError();
      const legacy = await legacyStatus({ signal:options.signal, timeoutMs:Math.min(options.timeoutMs || 700, 650) });
      if (legacy) return legacy;
      return { connected:false, toolchainReady:false, protocol:0, platform:"unknown", version:null, toolchain:null, missing:[], selfContained:false, legacy:false, error };
    }
  }

  function openLocalCompiler() {
    const url = `${PROTOCOL_URL}?origin=${encodeURIComponent(location.origin)}`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.style.display = "none";
    anchor.setAttribute("aria-hidden", "true");
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => anchor.remove(), 1000);
    return url;
  }

  async function ensureReady(options = {}) {
    const onProgress = options.onProgress || (()=>{});
    let current = await status({ signal:options.signal, timeoutMs:900 });
    if (current.connected) return current;
    const alreadyOpened = options.alreadyOpened === true;
    const shouldOpen = options.openIfMissing !== false && !alreadyOpened;
    const shouldWait = shouldOpen || alreadyOpened || options.waitForConnection === true;
    if (!shouldWait) return current;

    if (shouldOpen) onProgress({ stage:"connecting", message:"Opening TNS Tool Compiler…" });
    if (shouldOpen) {
      openLocalCompiler();
    } else {
      onProgress({ stage:"connecting", message:"Waiting for TNS Tool Compiler connection..." });
    }
    const deadline = performance.now() + (options.waitMs || 15000);
    while (performance.now() < deadline) {
      if (options.signal?.aborted) throw abortError();
      await new Promise(resolve => setTimeout(resolve, 500));
      current = await status({ signal:options.signal, timeoutMs:750 });
      if (current.connected) return current;
    }
    return current;
  }

  async function projectZip(project) {
    const core = window.NdlessProjectCore;
    if (!core?.exportEntries) throw new Error("Ndless project export module is unavailable.");
    if (typeof window.JSZip !== "function") throw new Error("JSZip is unavailable; project ZIP cannot be created.");
    const entries = core.exportEntries(project);
    const zip = new window.JSZip();
    for (const [name, value] of Object.entries(entries)) {
      if (value instanceof Uint8Array || value instanceof ArrayBuffer || value instanceof Blob) zip.file(name, value);
      else zip.file(name, String(value ?? ""));
    }
    return zip.generateAsync({ type:"uint8array", compression:"DEFLATE", compressionOptions:{ level:6 } });
  }

  async function build(project, options = {}) {
    const onProgress = options.onProgress || (()=>{});
    const ready = options.status || await ensureReady({
      signal:options.signal,
      openIfMissing:options.openIfMissing !== false,
      alreadyOpened:options.alreadyOpened === true,
      waitForConnection:options.waitForConnection === true,
      onProgress,
      waitMs:options.waitMs || options.localWaitMs,
    });

    if (!ready?.connected) {
      const error = new Error("TNS Tool Compiler is not connected.");
      error.code = "LOCAL_BRIDGE_UNAVAILABLE";
      error.details = "Download and run TNS Tool Compiler once, then allow the browser to open tnstool:// when Build TNS is pressed.";
      throw error;
    }
    if (ready.protocol !== PROTOCOL_VERSION || ready.legacy) {
      const error = new Error("The installed TNS Tool Compiler is an older incompatible version.");
      error.code = "LOCAL_COMPILER_UPDATE_REQUIRED";
      error.details = "The old bridge is still registered for tnstool://. Install the current self-contained compiler once; it will replace that association automatically.";
      throw error;
    }
    if (!ready.toolchainReady) {
      const error = new Error("The local TNS Tool Compiler runtime is incomplete.");
      error.code = "LOCAL_TOOLCHAIN_MISSING";
      error.details = ready.missing?.length ? `Missing: ${ready.missing.join(", ")}` : "Reinstall the self-contained TNS Tool Compiler package.";
      error.missing = ready.missing || [];
      throw error;
    }

    onProgress({ stage:"sending", message:"Packing project.zip…" });
    const zipBytes = await projectZip(project);
    onProgress({ stage:"sending", message:`Sending project.zip (${Math.max(1, Math.round(zipBytes.length / 1024))} KB) to local compiler…` });

    const scoped = timeoutSignal(options.timeoutMs || 180000, options.signal);
    try {
      const response = await fetch(BUILD_URL, {
        method:"POST",
        cache:"no-store",
        headers:{
          "Content-Type":"application/zip",
          "X-TNS-Tool-Protocol":String(PROTOCOL_VERSION),
          "X-TNS-Project-Name":project?.name || "ndless-app",
          "X-TNS-Project-Target":project?.target || "zehn-modern",
          "X-TNS-Project-Language":project?.language || "c",
          "X-TNS-Project-Template":project?.template || "basic",
        },
        body:zipBytes,
        signal:scoped.signal,
      });
      if (!response.ok) {
        let data = null;
        try { data = await response.json(); } catch (_) {}
        const error = new Error(data?.message || `Local compiler returned HTTP ${response.status}.`);
        error.code = data?.code || `HTTP_${response.status}`;
        error.details = data?.details || "";
        error.diagnostics = data?.diagnostics || [];
        error.missing = data?.missing || [];
        throw error;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length) throw new Error("The local compiler returned an empty TNS artifact.");
      const filename = response.headers.get("X-TNS-Filename") || `${project?.name || "ndless-app"}.tns`;
      const durationMs = Number(response.headers.get("X-TNS-Duration-Ms")) || 0;
      return {
        ok:true,
        engine:"local",
        filename,
        bytes,
        elfBytes:null,
        logs:[],
        diagnostics:[],
        toolchain:ready.toolchain || "Bundled GNU Arm + Ndless",
        platform:response.headers.get("X-TNS-Platform") || ready.platform || "unknown",
        durationMs,
      };
    } finally {
      scoped.cleanup();
    }
  }

  async function browserFallbackReady() {
    try {
      const response = await fetch("https://github.com/acewalt/tns-tool-wasm/releases/download/ndless-arm-toolchain-v1/toolchain.json", { method:"GET", cache:"no-store", redirect:"follow" });
      if (!response.ok) return false;
      const manifest = await response.json();
      return manifest?.targetTriple === "arm-none-eabi" && manifest?.targetBackends?.includes?.("ARM") && !!manifest?.tools?.clang && !!manifest?.tools?.lld;
    } catch (_) {
      return false;
    }
  }

  window.NdlessLocalBridge = Object.freeze({
    BASE_URL,
    LEGACY_BASE_URL,
    DOWNLOADS,
    RELEASE_TAG,
    PROTOCOL_VERSION,
    status,
    ensureReady,
    openLocalCompiler,
    projectZip,
    build,
    browserFallbackReady,
  });
})();
