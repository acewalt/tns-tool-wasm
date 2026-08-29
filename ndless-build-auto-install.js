(() => {
  "use strict";

  const manager = window.NdlessBuildManager;
  if (!manager) return;

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new DOMException("Build cancelled", "AbortError"));
      const timer = setTimeout(() => {
        signal?.removeEventListener?.("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException("Build cancelled", "AbortError"));
      };
      signal?.addEventListener?.("abort", onAbort, { once:true });
    });
  }

  async function waitForNewCompiler(options = {}) {
    const bridge = window.NdlessLocalBridge;
    if (!bridge?.status) return null;
    const deadline = Date.now() + (options.timeoutMs || 10 * 60 * 1000);
    while (Date.now() < deadline) {
      if (options.signal?.aborted) throw new DOMException("Build cancelled", "AbortError");
      const status = await bridge.status({ signal:options.signal, timeoutMs:900 });
      if (status?.connected && !status?.legacy && Number(status?.protocol || 0) === 2 && status?.toolchainReady) {
        bridge.clearDownloadState?.();
        return status;
      }
      await sleep(1200, options.signal);
    }
    return null;
  }

  function needsInstaller(result) {
    if (!result || result.ok) return false;
    return [
      "LOCAL_COMPILER_REQUIRED",
      "LOCAL_BRIDGE_UNAVAILABLE",
      "LOCAL_TOOLCHAIN_MISSING",
      "LOCAL_COMPILER_UPDATE_REQUIRED",
    ].includes(result.code);
  }

  async function build(project, options = {}) {
    const onProgress = options.onProgress || (()=>{});
    const first = await manager.build(project, options);
    if (!needsInstaller(first)) return first;

    const bridge = window.NdlessLocalBridge;
    if (!bridge?.downloadCompiler) return first;

    const download = bridge.downloadCompiler();
    if (download.unsupported) {
      return {
        ...first,
        code:"LOCAL_COMPILER_PLATFORM_UNSUPPORTED",
        message:"TNS Tool Compiler must be installed manually on this platform.",
        details:download.message || first.details || "",
      };
    }

    if (download.started) {
      onProgress({
        stage:"installing",
        message:`Downloading TNS Tool Compiler for ${download.platform === "windows" ? "Windows" : "Linux"}… Open the downloaded file once; this build will continue automatically.`,
      });
    } else {
      onProgress({
        stage:"installing",
        message:"TNS Tool Compiler was already downloaded recently. Open the downloaded file; this build will continue automatically when the compiler starts.",
      });
    }

    const ready = await waitForNewCompiler({ signal:options.signal, timeoutMs:options.installWaitMs || 10 * 60 * 1000 });
    if (!ready) {
      return {
        ok:false,
        stage:"installing",
        code:"LOCAL_COMPILER_INSTALL_PENDING",
        message:download.started ? "TNS Tool Compiler was downloaded, but it has not been opened yet." : "Waiting for TNS Tool Compiler to be opened.",
        details:"Open the downloaded TNS Tool Compiler file once. It installs/registers tnstool:// locally. After it starts, Build TNS will use it without downloading the compiler again.",
        diagnostics:[],
      };
    }

    onProgress({ stage:"connecting", message:"TNS Tool Compiler is ready. Continuing Build TNS…" });
    return manager.build(project, { ...options, openLocal:false });
  }

  window.NdlessBuildManager = Object.freeze({ ...manager, build });
})();
