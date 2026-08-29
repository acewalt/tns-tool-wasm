(() => {
  "use strict";

  const bridge = window.NdlessLocalBridge;
  if (!bridge) return;

  const RELEASE_TAG = "tns-tool-compiler-v1";
  const DOWNLOAD_KEY = `tns-tool-compiler-download:${RELEASE_TAG}`;
  const RECENT_MS = 6 * 60 * 60 * 1000;

  function platform() {
    const value = String(
      navigator.userAgentData?.platform ||
      navigator.platform ||
      navigator.userAgent ||
      ""
    ).toLowerCase();
    if (value.includes("win")) return "windows";
    if (value.includes("linux") || value.includes("x11")) return "linux";
    return null;
  }

  function readMarker() {
    try {
      const raw = localStorage.getItem(DOWNLOAD_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data.at !== "number") return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function writeMarker(data) {
    try { localStorage.setItem(DOWNLOAD_KEY, JSON.stringify(data)); } catch (_) {}
  }

  function clearDownloadState() {
    try { localStorage.removeItem(DOWNLOAD_KEY); } catch (_) {}
  }

  function downloadState() {
    const marker = readMarker();
    if (!marker) return { recent:false, marker:null };
    return { recent:Date.now() - marker.at < RECENT_MS, marker };
  }

  function downloadCompiler(options = {}) {
    const os = options.platform || platform();
    const url = bridge.DOWNLOADS?.[os];
    if (!url) {
      return {
        started:false,
        recent:false,
        unsupported:true,
        platform:os || "unknown",
        message:"Automatic compiler download is currently available for Windows x64 and Linux x64 only.",
      };
    }

    const state = downloadState();
    if (!options.force && state.recent && state.marker?.platform === os) {
      return { started:false, recent:true, unsupported:false, platform:os, url, marker:state.marker };
    }

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    anchor.setAttribute("aria-hidden", "true");
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => anchor.remove(), 1000);

    const marker = { at:Date.now(), platform:os, url, tag:RELEASE_TAG };
    writeMarker(marker);
    return { started:true, recent:false, unsupported:false, platform:os, url, marker };
  }

  window.NdlessLocalBridge = Object.freeze({
    ...bridge,
    detectDesktopPlatform:platform,
    downloadCompiler,
    downloadState,
    clearDownloadState,
  });
})();
