(() => {
  "use strict";

  const RELEASE_TAG = "tns-tool-compiler-v3";
  const EXPECTED_BRIDGE_VERSION = "0.2.1";
  const RELEASE_BASE = `https://github.com/acewalt/tns-tool-wasm/releases/download/${RELEASE_TAG}`;
  const DOWNLOADS = Object.freeze({
    windows: `${RELEASE_BASE}/TNS-Tool-Compiler-Windows-x64.exe`,
    linux: `${RELEASE_BASE}/TNS-Tool-Compiler-Linux-x64.AppImage`,
  });
  const DOWNLOAD_KEY = `tns-tool-compiler-download:${RELEASE_TAG}`;
  const OLD_DOWNLOAD_KEYS = [
    "tns-tool-compiler-download:tns-tool-compiler-v1",
    "tns-tool-compiler-download:tns-tool-compiler-v2",
  ];
  const RECENT_MS = 6 * 60 * 60 * 1000;
  const PATCH_MARK = "__tnsCompilerV3Download";
  let lastPatchedObject = null;

  function versionParts(value) {
    return String(value || "0").split(/[^0-9]+/).filter(Boolean).slice(0, 4).map(Number);
  }

  function compareVersions(a, b) {
    const aa = versionParts(a), bb = versionParts(b);
    const count = Math.max(aa.length, bb.length, 3);
    for (let i = 0; i < count; i += 1) {
      const av = aa[i] || 0, bv = bb[i] || 0;
      if (av !== bv) return av < bv ? -1 : 1;
    }
    return 0;
  }

  function normalizeStatus(input) {
    const status = input && typeof input === "object" ? { ...input } : input;
    if (!status?.connected || status.legacy) return status;
    const outdated = compareVersions(status.version, EXPECTED_BRIDGE_VERSION) < 0;
    if (!outdated) return { ...status, updateRequired:false, expectedVersion:EXPECTED_BRIDGE_VERSION };
    return {
      ...status,
      toolchainReady:false,
      updateRequired:true,
      expectedVersion:EXPECTED_BRIDGE_VERSION,
      missing:[`TNS Tool Compiler ${status.version || "unknown"} is outdated. Install ${EXPECTED_BRIDGE_VERSION} (${RELEASE_TAG}); it contains the bundled ARM/Ndless runtime.`],
    };
  }

  function desktopPlatform(bridge) {
    const detected = bridge.detectDesktopPlatform?.();
    if (detected) return detected;
    const value = String(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "").toLowerCase();
    if (value.includes("win")) return "windows";
    if (value.includes("linux") || value.includes("x11")) return "linux";
    return null;
  }

  function readMarker() {
    try {
      const raw = localStorage.getItem(DOWNLOAD_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data.at === "number" ? data : null;
    } catch (_) { return null; }
  }

  function writeMarker(data) {
    try { localStorage.setItem(DOWNLOAD_KEY, JSON.stringify(data)); } catch (_) {}
  }

  function clearOldMarkers() {
    for (const key of OLD_DOWNLOAD_KEYS) {
      try { localStorage.removeItem(key); } catch (_) {}
    }
  }

  function patchBridge() {
    const bridge = window.NdlessLocalBridge;
    if (!bridge?.status) return false;
    const alreadyCurrent = bridge.RELEASE_TAG === RELEASE_TAG
      && bridge.EXPECTED_BRIDGE_VERSION === EXPECTED_BRIDGE_VERSION
      && bridge.downloadCompiler?.[PATCH_MARK] === true;
    if (alreadyCurrent) {
      lastPatchedObject = bridge;
      return true;
    }
    if (bridge === lastPatchedObject && bridge.downloadCompiler?.[PATCH_MARK] === true) return true;

    const original = bridge;
    clearOldMarkers();

    const status = async options => normalizeStatus(await original.status(options));
    const ensureReady = async (options = {}) => {
      const first = await status({ signal:options.signal, timeoutMs:options.timeoutMs || 900 });
      if (first?.connected) return first;
      return normalizeStatus(await original.ensureReady(options));
    };
    const downloadState = () => {
      const marker = readMarker();
      return { recent:!!marker && Date.now() - marker.at < RECENT_MS, marker };
    };
    const clearDownloadState = () => {
      try { localStorage.removeItem(DOWNLOAD_KEY); } catch (_) {}
      clearOldMarkers();
    };
    const downloadCompiler = (options = {}) => {
      const platform = options.platform || desktopPlatform(original);
      const url = DOWNLOADS[platform];
      if (!url) {
        return {
          started:false,
          recent:false,
          unsupported:true,
          platform:platform || "unknown",
          message:"Automatic compiler download is currently available for Windows x64 and Linux x64 only.",
        };
      }
      const state = downloadState();
      if (!options.force && state.recent && state.marker?.platform === platform) {
        return { started:false, recent:true, unsupported:false, platform, url, marker:state.marker };
      }
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.rel = "noopener";
      anchor.style.display = "none";
      anchor.setAttribute("aria-hidden", "true");
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => anchor.remove(), 1000);
      const marker = { at:Date.now(), platform, url, tag:RELEASE_TAG, bridgeVersion:EXPECTED_BRIDGE_VERSION };
      writeMarker(marker);
      console.info(`[Ndless compiler] Downloading ${RELEASE_TAG} (${EXPECTED_BRIDGE_VERSION}) for ${platform}.`);
      return { started:true, recent:false, unsupported:false, platform, url, marker };
    };
    downloadCompiler[PATCH_MARK] = true;

    window.NdlessLocalBridge = Object.freeze({
      ...original,
      RELEASE_TAG,
      EXPECTED_BRIDGE_VERSION,
      RELEASE_BASE,
      DOWNLOADS,
      status,
      ensureReady,
      downloadCompiler,
      downloadState,
      clearDownloadState,
    });
    lastPatchedObject = window.NdlessLocalBridge;
    console.info(`[Ndless compiler] Runtime migration enabled: minimum bridge ${EXPECTED_BRIDGE_VERSION}, release ${RELEASE_TAG}.`);
    return true;
  }

  let attempts = 0;
  function retry() {
    patchBridge();
    if (attempts++ < 300) setTimeout(retry, 100);
  }

  retry();
  window.addEventListener("tns-runtime-ready", patchBridge);
  try { window.NdlessRuntimeReady?.then?.(patchBridge).catch?.(() => {}); } catch (_) {}

  window.NdlessLocalRuntimeUpgrade = Object.freeze({
    RELEASE_TAG,
    EXPECTED_BRIDGE_VERSION,
    DOWNLOADS,
    compareVersions,
    normalizeStatus,
    patchBridge,
  });
})();
