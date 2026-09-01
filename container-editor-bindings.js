(() => {
  "use strict";
  const registry = window.TnsContainerRegistry;
  if (registry?.getAdapter && registry?.register) {
    const nzp = registry.getAdapter("nzp");
    if (nzp) registry.register({ ...nzp, editorGlobal: "TnsStructuredContentEditor" });
  }

  const VERSION = "20260831-loader-ndless-menu";

  function loadZehnStreamFix() {
    if (document.querySelector('script[data-ndless-zehn-stream-fix="true"]')) {
      window.NdlessZehnStreamFix?.patchZehn?.();
      return;
    }
    const fix = document.createElement("script");
    fix.src = `./ndless-zehn-stream-fix.js?v=${VERSION}`;
    fix.async = false;
    fix.dataset.ndlessZehnStreamFix = "true";
    fix.addEventListener("error", () => console.error("Failed to load Ndless Zehn stream fix."), { once: true });
    document.head.appendChild(fix);
  }

  function loadWebBridge() {
    if (document.querySelector('script[data-ndless-web-bridge="true"]')) {
      window.NdlessWebBridge?.patch?.();
      return;
    }
    const bridge = document.createElement("script");
    bridge.src = `./ndless-web-bridge.js?v=${VERSION}`;
    bridge.async = false;
    bridge.dataset.ndlessWebBridge = "true";
    bridge.addEventListener("error", () => console.error("Failed to load Ndless Web Compiler bridge."), { once: true });
    document.head.appendChild(bridge);
  }

  function loadOfficialBuildFlow() {
    if (document.querySelector('script[data-ndless-build-official-flow="true"]')) {
      window.NdlessOfficialBuildFlow?.suppressExperimentalNdlessControls?.();
      return;
    }
    const flow = document.createElement("script");
    flow.src = `./ndless-build-confirm-flow.js?v=${VERSION}`;
    flow.async = false;
    flow.dataset.ndlessBuildOfficialFlow = "true";
    flow.addEventListener("error", () => console.error("Failed to load Ndless Build TNS handoff flow."), { once: true });
    document.head.appendChild(flow);
  }

  function loadDiagnostics() {
    loadZehnStreamFix();
    loadWebBridge();
    loadOfficialBuildFlow();
    if (document.querySelector('script[data-ndless-experimental-export-fix="true"]')) {
      window.NdlessExperimentalExportDiagnostics?.setup?.();
      return;
    }
    const fix = document.createElement("script");
    fix.src = `./ndless-experimental-export-fix.js?v=${VERSION}`;
    fix.async = false;
    fix.dataset.ndlessExperimentalExportFix = "true";
    fix.addEventListener("error", () => console.error("Failed to load Ndless diagnostics."), { once: true });
    document.head.appendChild(fix);
  }

  function loadUi() {
    const existing = document.querySelector('script[data-tns-file-save-experimental="true"]');
    if (existing) {
      if (window.TnsFileSaveExperimental) loadDiagnostics();
      else existing.addEventListener("load", loadDiagnostics, { once: true });
      return;
    }
    const ui = document.createElement("script");
    ui.src = `./tns-file-save-experimental.js?v=${VERSION}`;
    ui.async = false;
    ui.dataset.tnsFileSaveExperimental = "true";
    ui.addEventListener("load", loadDiagnostics, { once: true });
    ui.addEventListener("error", () => console.error("Failed to load TNS file save UI."), { once: true });
    document.head.appendChild(ui);
  }

  loadZehnStreamFix();
  loadWebBridge();
  loadOfficialBuildFlow();
  const existingCore = document.querySelector('script[data-tns-file-save-experimental-core="true"]');
  if (existingCore) {
    if (window.TnsFileSaveExperimentalCore) loadUi();
    else existingCore.addEventListener("load", loadUi, { once: true });
    return;
  }

  const core = document.createElement("script");
  core.src = `./tns-file-save-experimental-core.js?v=${VERSION}`;
  core.async = false;
  core.dataset.tnsFileSaveExperimentalCore = "true";
  core.addEventListener("load", loadUi, { once: true });
  core.addEventListener("error", () => console.error("Failed to load TNS file save core."), { once: true });
  document.head.appendChild(core);
})();
