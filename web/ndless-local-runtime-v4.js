(() => {
  "use strict";

  const WINDOWS = Object.freeze({
    platform:"windows",
    releaseTag:"tns-tool-compiler-v4",
    version:"0.2.2",
    url:"https://github.com/acewalt/tns-tool-wasm/releases/download/tns-tool-compiler-v4/TNS-Tool-Compiler-Windows-x64.exe",
  });
  // The Zehn ABI bug fixed by v4 was Windows/MinGW-specific. Keep the
  // validated Linux package until a Linux v4 asset is published.
  const LINUX = Object.freeze({
    platform:"linux",
    releaseTag:"tns-tool-compiler-v3",
    version:"0.2.1",
    url:"https://github.com/acewalt/tns-tool-wasm/releases/download/tns-tool-compiler-v3/TNS-Tool-Compiler-Linux-x64.AppImage",
  });
  const SPECS = Object.freeze({ windows:WINDOWS, linux:LINUX });
  const RECENT_MS = 6 * 60 * 60 * 1000;
  const PATCH_MARK = "__tnsCompilerOfficialV4Download";
  let lastPatchedBridge = null;

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

  function detectDesktopPlatform(bridge = window.NdlessLocalBridge) {
    const detected = bridge?.detectDesktopPlatform?.();
    if (detected && SPECS[detected]) return detected;
    const value = String(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent || "").toLowerCase();
    if (value.includes("win")) return "windows";
    if (value.includes("linux") || value.includes("x11")) return "linux";
    return null;
  }

  function specForPlatform(platform) {
    return SPECS[platform] || null;
  }

  function expectedVersionForPlatform(platform) {
    return specForPlatform(platform)?.version || null;
  }

  function markerKey(platform) {
    const spec = specForPlatform(platform);
    return spec ? `tns-tool-compiler-download:${spec.releaseTag}:${platform}` : "";
  }

  function readMarker(platform) {
    const key = markerKey(platform);
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return data && typeof data.at === "number" ? data : null;
    } catch (_) { return null; }
  }

  function writeMarker(platform, data) {
    const key = markerKey(platform);
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
  }

  function clearOldMarkers() {
    const keys = [
      "tns-tool-compiler-download:tns-tool-compiler-v1",
      "tns-tool-compiler-download:tns-tool-compiler-v2",
      "tns-tool-compiler-download:tns-tool-compiler-v3",
      "tns-tool-compiler-download:tns-tool-compiler-v4",
    ];
    for (const key of keys) {
      try { localStorage.removeItem(key); } catch (_) {}
    }
  }

  function clearDownloadState(platform = null) {
    const platforms = platform ? [platform] : Object.keys(SPECS);
    for (const os of platforms) {
      const key = markerKey(os);
      if (!key) continue;
      try { localStorage.removeItem(key); } catch (_) {}
    }
    clearOldMarkers();
  }

  function downloadState(platform = null) {
    const os = platform || detectDesktopPlatform();
    const marker = os ? readMarker(os) : null;
    return {
      platform:os || "unknown",
      recent:!!marker && Date.now() - marker.at < RECENT_MS,
      marker,
    };
  }

  function normalizeStatus(input) {
    const status = input && typeof input === "object" ? { ...input } : input;
    if (!status?.connected || status.legacy) return status;
    const platform = SPECS[status.platform] ? status.platform : detectDesktopPlatform();
    const spec = specForPlatform(platform);
    if (!spec) return status;
    const outdated = compareVersions(status.version, spec.version) < 0;
    if (!outdated) {
      return {
        ...status,
        updateRequired:false,
        expectedVersion:spec.version,
        releaseTag:spec.releaseTag,
      };
    }
    return {
      ...status,
      toolchainReady:false,
      updateRequired:true,
      expectedVersion:spec.version,
      releaseTag:spec.releaseTag,
      missing:[`TNS Tool Compiler ${status.version || "unknown"} is outdated. Install ${spec.version} (${spec.releaseTag}).`],
    };
  }

  function patchBridge() {
    const bridge = window.NdlessLocalBridge;
    if (!bridge?.status) return false;
    if (bridge === lastPatchedBridge && bridge.downloadCompiler?.[PATCH_MARK] === true) return true;
    if (bridge.downloadCompiler?.[PATCH_MARK] === true) {
      lastPatchedBridge = bridge;
      return true;
    }

    const original = bridge;
    clearOldMarkers();

    const status = async options => normalizeStatus(await original.status(options));
    const ensureReady = async (options = {}) => {
      const first = await status({ signal:options.signal, timeoutMs:options.timeoutMs || 900 });
      if (first?.connected) return first;
      return normalizeStatus(await original.ensureReady(options));
    };

    const downloadCompiler = (options = {}) => {
      const platform = options.platform || detectDesktopPlatform(original);
      const spec = specForPlatform(platform);
      if (!spec) {
        return {
          started:false,
          recent:false,
          unsupported:true,
          platform:platform || "unknown",
          message:"Automatic TNS Tool Compiler download is available for Windows x64 and Linux x64 only.",
        };
      }

      const state = downloadState(platform);
      if (!options.force && state.recent) {
        return { started:false, recent:true, unsupported:false, platform, url:spec.url, marker:state.marker, version:spec.version, releaseTag:spec.releaseTag };
      }

      const anchor = document.createElement("a");
      anchor.href = spec.url;
      anchor.rel = "noopener";
      anchor.style.display = "none";
      anchor.setAttribute("aria-hidden", "true");
      document.body.appendChild(anchor);
      anchor.click();
      setTimeout(() => anchor.remove(), 1000);

      const marker = {
        at:Date.now(),
        platform,
        url:spec.url,
        tag:spec.releaseTag,
        bridgeVersion:spec.version,
      };
      writeMarker(platform, marker);
      console.info(`[Ndless compiler] Downloading ${spec.releaseTag} (${spec.version}) for ${platform}.`);
      return { started:true, recent:false, unsupported:false, platform, url:spec.url, marker, version:spec.version, releaseTag:spec.releaseTag };
    };
    downloadCompiler[PATCH_MARK] = true;

    const DOWNLOADS = Object.freeze({ windows:WINDOWS.url, linux:LINUX.url });
    window.NdlessLocalBridge = Object.freeze({
      ...original,
      RELEASE_TAG:WINDOWS.releaseTag,
      EXPECTED_BRIDGE_VERSION:WINDOWS.version,
      DOWNLOADS,
      status,
      ensureReady,
      detectDesktopPlatform:() => detectDesktopPlatform(original),
      downloadCompiler,
      downloadState,
      clearDownloadState,
    });
    lastPatchedBridge = window.NdlessLocalBridge;
    console.info("[Ndless compiler] Official compiler routing enabled: Windows v4/0.2.2.");
    return true;
  }

  // Kept for compatibility with the previous loader. Build behavior is now
  // handled by the official Build TNS flow instead of the experimental patch.
  function patchBuildManager() { return true; }

  let attempts = 0;
  function retry() {
    patchBridge();
    if (attempts++ < 300) setTimeout(retry, 100);
  }

  retry();
  window.addEventListener("tns-runtime-ready", patchBridge);
  try { window.NdlessRuntimeReady?.then?.(patchBridge).catch?.(() => {}); } catch (_) {}

  window.NdlessLocalRuntimeUpgrade = Object.freeze({
    WINDOWS,
    LINUX,
    SPECS,
    compareVersions,
    detectDesktopPlatform,
    specForPlatform,
    expectedVersionForPlatform,
    normalizeStatus,
    patchBridge,
    patchBuildManager,
  });
})();