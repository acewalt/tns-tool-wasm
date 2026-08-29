(() => {
  "use strict";

  const BASE_URL = "http://127.0.0.1:34981";
  const STATUS_URL = `${BASE_URL}/v1/status`;
  const BUILD_URL = `${BASE_URL}/v1/build`;
  const PROTOCOL_URL = "tnstool://start";
  const RELEASE_TAG = "tns-tool-compiler-bridge-v1";
  const RELEASE_BASE = `https://github.com/acewalt/tns-tool-wasm/releases/download/${RELEASE_TAG}`;
  const DOWNLOADS = Object.freeze({
    windows: `${RELEASE_BASE}/TNS-Tool-Compiler-Windows-x64.zip`,
    linux: `${RELEASE_BASE}/TNS-Tool-Compiler-Linux-x64.tar.gz`,
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
      signal: controller.signal,
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
        throw error;
      }
      return data || {};
    } finally {
      scoped.cleanup();
    }
  }

  async function status(options = {}) {
    try {
      const data = await fetchJson(STATUS_URL, { method:"GET", headers:{ "X-TNS-Tool-Protocol":"1" } }, options.timeoutMs || 900, options.signal);
      return {
        connected: data?.bridge === true,
        toolchainReady: data?.toolchainReady === true,
        platform: data?.platform || "unknown",
        version: data?.version || "unknown",
        toolchain: data?.toolchain || null,
        missing: Array.isArray(data?.missing) ? data.missing : [],
        raw: data,
      };
    } catch (error) {
      if (options.signal?.aborted) throw abortError();
      return { connected:false, toolchainReady:false, platform:"unknown", version:null, toolchain:null, missing:[], error };
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
    if (options.openIfMissing === false) return current;

    onProgress({ stage:"connecting", message:"Opening TNS Tool Compiler…" });
    openLocalCompiler();

    const deadline = performance.now() + (options.waitMs || 12000);
    while (performance.now() < deadline) {
      if (options.signal?.aborted) throw abortError();
      await new Promise(resolve => setTimeout(resolve, 450));
      current = await status({ signal:options.signal, timeoutMs:700 });
      if (current.connected) return current;
    }
    return current;
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function projectPayload(project) {
    const core = window.NdlessProjectCore;
    if (!core?.exportEntries) throw new Error("Ndless project export module is unavailable.");
    const files = core.exportEntries(project);
    return {
      protocol: 1,
      client: {
        name: "TNS Tool WASM",
        origin: location.origin,
        href: location.href,
      },
      project: {
        name: project?.name || "ndless-app",
        target: project?.target || "zehn-modern",
        language: project?.language || "c",
        template: project?.template || "basic",
      },
      // The bridge writes these entries into an isolated temporary project directory.
      // Keeping the payload structured avoids putting a large ZIP inside a custom URL.
      files,
    };
  }

  async function build(project, options = {}) {
    const onProgress = options.onProgress || (()=>{});
    const ready = options.status || await ensureReady({
      signal: options.signal,
      openIfMissing: options.openIfMissing !== false,
      onProgress,
      waitMs: options.waitMs,
    });

    if (!ready?.connected) {
      const error = new Error("TNS Tool Compiler is not connected.");
      error.code = "LOCAL_BRIDGE_UNAVAILABLE";
      error.details = "Install the Windows or Linux bridge once, then allow the browser to open tnstool:// when Build TNS is pressed.";
      throw error;
    }
    if (!ready.toolchainReady) {
      const error = new Error("The local compiler bridge is connected, but the Ndless toolchain is not ready.");
      error.code = "LOCAL_TOOLCHAIN_MISSING";
      error.details = ready.missing?.length ? `Missing: ${ready.missing.join(", ")}` : "Install or bundle the Ndless ARM toolchain next to the bridge.";
      throw error;
    }

    onProgress({ stage:"sending", message:`Sending project to local ${ready.platform || "native"} compiler…` });
    const data = await fetchJson(BUILD_URL, {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "X-TNS-Tool-Protocol":"1",
      },
      body: JSON.stringify(projectPayload(project)),
    }, options.timeoutMs || 120000, options.signal);

    if (!data?.ok || !data?.tnsBase64) {
      const error = new Error(data?.message || "The local compiler did not return a TNS artifact.");
      error.code = data?.code || "LOCAL_BUILD_FAILED";
      error.details = data?.details || data?.log || "";
      error.diagnostics = data?.diagnostics || [];
      throw error;
    }

    return {
      ok:true,
      engine:"local",
      filename:data.filename || `${project?.name || "ndless-app"}.tns`,
      bytes:base64ToBytes(data.tnsBase64),
      elfBytes:data.elfBase64 ? base64ToBytes(data.elfBase64) : null,
      logs:Array.isArray(data.logs) ? data.logs : (data.log ? String(data.log).split(/\r?\n/) : []),
      diagnostics:Array.isArray(data.diagnostics) ? data.diagnostics : [],
      toolchain:data.toolchain || ready.toolchain || null,
      platform:data.platform || ready.platform || "unknown",
      durationMs:Number(data.durationMs) || 0,
    };
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
    DOWNLOADS,
    status,
    ensureReady,
    openLocalCompiler,
    build,
    browserFallbackReady,
  });
})();