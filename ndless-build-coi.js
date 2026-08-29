(() => {
  "use strict";

  const base = window.NdlessBuildManager;
  if (!base || base.__coiWrapped) return;

  const ATTEMPT_KEY = "tns-tool-ndless-coi-attempt-v1";
  const RESUME_KEY = "tns-tool-ndless-coi-resume-v1";
  const AUTOBUILD_KEY = "tns-tool-ndless-coi-autobuild-v1";
  const AUTOSAVE_KEY = "tns-tool-ndless-project-autosave-v1";

  function isolated() {
    return window.crossOriginIsolated === true && typeof SharedArrayBuffer === "function";
  }

  async function enableIsolation(onProgress) {
    if (isolated()) {
      sessionStorage.removeItem(ATTEMPT_KEY);
      return true;
    }

    if (!("serviceWorker" in navigator)) {
      const error = new Error("This browser cannot enable the cross-origin isolation required by the browser ARM compiler.");
      error.code = "CROSS_ORIGIN_ISOLATION_UNAVAILABLE";
      throw error;
    }

    if (sessionStorage.getItem(ATTEMPT_KEY) === "1") {
      sessionStorage.removeItem(ATTEMPT_KEY);
      const error = new Error("Cross-origin isolation could not be enabled after reloading the page.");
      error.code = "CROSS_ORIGIN_ISOLATION_FAILED";
      error.details = `crossOriginIsolated=${String(window.crossOriginIsolated)}; SharedArrayBuffer=${typeof SharedArrayBuffer}`;
      throw error;
    }

    onProgress?.({ stage:"preparing", message:"Enabling browser compiler isolation… the page will reload once." });
    const registration = await navigator.serviceWorker.register("./ndless-coi-sw.js", {
      scope: "./",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
    try { registration.waiting?.postMessage?.({ type:"SKIP_WAITING" }); } catch (_) {}

    sessionStorage.setItem(ATTEMPT_KEY, "1");
    sessionStorage.setItem(RESUME_KEY, "1");
    sessionStorage.setItem(AUTOBUILD_KEY, "1");

    setTimeout(() => window.location.reload(), 120);
    await new Promise(() => {});
    return false;
  }

  async function prepare(options = {}) {
    await enableIsolation(options.onProgress);
    return base.prepare(options);
  }

  async function build(project, options = {}) {
    await enableIsolation(options.onProgress);
    return base.build(project, options);
  }

  window.NdlessBuildManager = Object.freeze({
    ...base,
    __coiWrapped: true,
    prepare,
    build,
    isolated,
  });

  function restoreAfterReload() {
    if (sessionStorage.getItem(RESUME_KEY) !== "1" || !isolated()) return;
    sessionStorage.removeItem(RESUME_KEY);
    sessionStorage.removeItem(ATTEMPT_KEY);

    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || "null"); } catch (_) {}
    if (!saved || saved.type !== "ndless-project") return;

    const open = () => {
      const workspace = window.NdlessProjectWorkspace;
      if (!workspace?.activateProject) return false;
      if (!workspace.getProject?.()) workspace.activateProject(saved);
      return true;
    };

    const tryAutobuild = (attempt = 0) => {
      if (sessionStorage.getItem(AUTOBUILD_KEY) !== "1") return;
      const button = document.querySelector("#xml-doctor-panel .ndless-build-tns-button");
      if (button) {
        sessionStorage.removeItem(AUTOBUILD_KEY);
        button.click();
        return;
      }
      if (attempt < 30) setTimeout(() => tryAutobuild(attempt + 1), 100);
    };

    const restore = (attempt = 0) => {
      if (open()) {
        setTimeout(() => tryAutobuild(), 150);
        return;
      }
      if (attempt < 30) setTimeout(() => restore(attempt + 1), 100);
    };
    restore();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", restoreAfterReload, { once:true });
  } else {
    restoreAfterReload();
  }
})();
