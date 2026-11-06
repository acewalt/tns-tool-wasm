(() => {
  "use strict";

  const BASE_URL = "http://127.0.0.1:34983";
  const STATUS_URL = `${BASE_URL}/v2/status`;
  const BUILD_URL = `${BASE_URL}/v2/build`;
  const PROTOCOL_URL = "ndlessweb://start";
  const RELEASE_TAG = "ndless-web-compiler-v1";
  const DOWNLOAD_URL = `https://github.com/acewalt/tns-tool-wasm/releases/download/${RELEASE_TAG}/Ndless-Web-Compiler-Windows-x64.exe`;
  const MARK = "__ndlessWebBridgeV1";
  let original = null;

  function platform() {
    const value = String(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "").toLowerCase();
    if (value.includes("win")) return "windows";
    if (value.includes("linux") || value.includes("x11")) return "linux";
    return null;
  }

  function timeoutSignal(timeoutMs, outerSignal) {
    const controller = new AbortController();
    let timer = null;
    const abort = () => controller.abort(outerSignal?.reason || new DOMException("Cancelled", "AbortError"));
    if (outerSignal) {
      if (outerSignal.aborted) abort();
      else outerSignal.addEventListener("abort", abort, { once:true });
    }
    if (timeoutMs > 0) timer = setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), timeoutMs);
    return { signal:controller.signal, cleanup(){ if (timer) clearTimeout(timer); outerSignal?.removeEventListener?.("abort", abort); } };
  }

  async function status(options = {}) {
    if (platform() !== "windows") return original?.status ? original.status(options) : { connected:false, toolchainReady:false, platform:platform() || "unknown" };
    const scoped = timeoutSignal(options.timeoutMs || 850, options.signal);
    try {
      const response = await fetch(STATUS_URL, { method:"GET", cache:"no-store", headers:{ "X-TNS-Tool-Protocol":"2" }, signal:scoped.signal });
      const data = await response.json();
      return {
        connected:response.ok && (data?.compiler === true || data?.bridge === true),
        toolchainReady:data?.toolchainReady === true,
        protocol:Number(data?.protocol || 0),
        platform:data?.platform || "windows",
        version:data?.version || "0.2.2",
        launcherVersion:data?.launcherVersion || null,
        selfContained:true,
        transport:data?.transport || "zip",
        stage:data?.stage || "unknown",
        progress:Number(data?.progress || 0),
        message:data?.message || "",
        error:data?.error || "",
        missing:Array.isArray(data?.missing) ? data.missing : [],
        webBridge:true,
        raw:data,
      };
    } catch (error) {
      if (options.signal?.aborted) throw error;
      return { connected:false, toolchainReady:false, protocol:2, platform:"windows", version:"0.2.2", stage:"offline", progress:0, message:"Ndless Web Compiler no está abierto.", error:"", missing:[], webBridge:true };
    } finally { scoped.cleanup(); }
  }

  function openLocalCompiler() {
    const a = document.createElement("a");
    a.href = `${PROTOCOL_URL}?origin=${encodeURIComponent(location.origin)}`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
    return a.href;
  }

  function downloadCompiler(options = {}) {
    if (platform() !== "windows") return original?.downloadCompiler ? original.downloadCompiler(options) : { unsupported:true, started:false, platform:platform() || "unknown" };
    const a = document.createElement("a");
    a.href = DOWNLOAD_URL;
    a.download = "Ndless-Web-Compiler-Windows-x64.exe";
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
    try { localStorage.setItem("ndless-web-compiler-download", JSON.stringify({ at:Date.now(), url:DOWNLOAD_URL })); } catch (_) {}
    return { started:true, recent:false, unsupported:false, platform:"windows", url:DOWNLOAD_URL, version:"1.0.0", backendVersion:"0.2.2", releaseTag:RELEASE_TAG };
  }

  function downloadState() {
    try {
      const marker = JSON.parse(localStorage.getItem("ndless-web-compiler-download") || "null");
      return { recent:!!marker && Date.now() - Number(marker.at || 0) < 6*60*60*1000, marker };
    } catch (_) { return { recent:false, marker:null }; }
  }
  function clearDownloadState() { try { localStorage.removeItem("ndless-web-compiler-download"); } catch (_) {} }

  async function ensureReady(options = {}) {
    let current = await status(options);
    if (current.connected) return current;
    if (options.openIfMissing !== false) openLocalCompiler();
    const deadline = Date.now() + (options.waitMs || 12000);
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 500));
      current = await status(options);
      if (current.connected) return current;
    }
    return current;
  }

  async function projectZip(project) {
    const core = window.NdlessProjectCore;
    if (!core?.exportEntries) throw new Error("Ndless project export module is unavailable.");
    if (typeof window.JSZip !== "function") throw new Error("JSZip is unavailable.");
    const zip = new window.JSZip();
    const entries = core.exportEntries(project);
    for (const [name, value] of Object.entries(entries)) {
      if (value instanceof Uint8Array || value instanceof ArrayBuffer || value instanceof Blob) zip.file(name, value);
      else zip.file(name, String(value ?? ""));
    }
    return zip.generateAsync({ type:"uint8array", compression:"DEFLATE", compressionOptions:{ level:6 } });
  }

  async function build(project, options = {}) {
    if (platform() !== "windows" && original?.build) return original.build(project, options);
    const ready = options.status || await status({ signal:options.signal, timeoutMs:900 });
    if (!ready?.connected) throw Object.assign(new Error("Ndless Web Compiler no está abierto."), { code:"LOCAL_BRIDGE_UNAVAILABLE" });
    if (!ready.toolchainReady) throw Object.assign(new Error(ready.message || "El backend todavía se está preparando."), { code:"LOCAL_TOOLCHAIN_PREPARING", details:ready.error || "" });
    const onProgress = options.onProgress || (()=>{});
    onProgress({ stage:"sending", message:"Packing project.zip…" });
    const zipBytes = await projectZip(project);
    onProgress({ stage:"sending", message:`Sending project.zip (${Math.max(1, Math.round(zipBytes.length/1024))} KB) to Ndless Web Compiler…` });
    const scoped = timeoutSignal(options.timeoutMs || 240000, options.signal);
    try {
      const response = await fetch(BUILD_URL, {
        method:"POST", cache:"no-store",
        headers:{
          "Content-Type":"application/zip", "X-TNS-Tool-Protocol":"2",
          "X-TNS-Project-Name":project?.name || "ndless-app",
          "X-TNS-Project-Target":project?.target || "zehn-modern",
          "X-TNS-Project-Language":project?.language || "c",
          "X-TNS-Project-Template":project?.template || "basic",
        },
        body:zipBytes, signal:scoped.signal,
      });
      if (!response.ok) {
        let data = null; try { data = await response.json(); } catch (_) {}
        const error = new Error(data?.message || `Ndless Web Compiler returned HTTP ${response.status}.`);
        error.code = data?.code || `HTTP_${response.status}`;
        error.details = data?.details || data?.error || "";
        throw error;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length) throw new Error("Ndless Web Compiler returned an empty TNS.");
      return { ok:true, engine:"local", filename:response.headers.get("X-TNS-Filename") || `${project?.name || "ndless-app"}.tns`, bytes, elfBytes:null, logs:[], diagnostics:[], platform:"windows", toolchain:"Ndless Web Compiler + canonical v4 backend", durationMs:Number(response.headers.get("X-TNS-Duration-Ms")) || 0 };
    } finally { scoped.cleanup(); }
  }

  function patch() {
    const current = window.NdlessLocalBridge;
    if (current?.[MARK]) return true;
    if (current && !current?.webBridge) original = current;
    const base = original || current || {};
    window.NdlessLocalBridge = Object.freeze({
      ...base,
      BASE_URL, STATUS_URL, BUILD_URL, PROTOCOL_URL, RELEASE_TAG,
      DOWNLOADS:Object.freeze({ windows:DOWNLOAD_URL, linux:base?.DOWNLOADS?.linux || "" }),
      PROTOCOL_VERSION:2,
      EXPECTED_BRIDGE_VERSION:"0.2.2",
      status, ensureReady, openLocalCompiler, projectZip, build,
      detectDesktopPlatform:platform, downloadCompiler, downloadState, clearDownloadState,
      webBridge:true, [MARK]:true,
    });
    return true;
  }

  let attempts = 0;
  (function retry(){ patch(); if (attempts++ < 600) setTimeout(retry,100); })();
  window.NdlessWebBridge = Object.freeze({ patch, BASE_URL, STATUS_URL, BUILD_URL, DOWNLOAD_URL, RELEASE_TAG });
})();