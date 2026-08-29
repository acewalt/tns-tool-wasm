(() => {
  "use strict";
  const registry = window.TnsContainerRegistry;
  if (registry?.getAdapter && registry?.register) {
    const nzp = registry.getAdapter("nzp");
    if (nzp) registry.register({ ...nzp, editorGlobal: "TnsStructuredContentEditor" });
  }

  const VERSION = "20260829-direct-save-v13";

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

  function loadRuntimeUpgrade() {
    if (document.querySelector('script[data-ndless-local-runtime-upgrade="true"]')) {
      window.NdlessLocalRuntimeUpgrade?.patchBridge?.();
      window.NdlessLocalRuntimeUpgrade?.patchBuildManager?.();
      return;
    }
    const upgrade = document.createElement("script");
    upgrade.src = `./ndless-local-runtime-v4.js?v=${VERSION}`;
    upgrade.async = false;
    upgrade.dataset.ndlessLocalRuntimeUpgrade = "true";
    upgrade.addEventListener("error", () => console.error("Failed to load Ndless local compiler v4 routing."), { once: true });
    document.head.appendChild(upgrade);
  }

  function loadOfficialBuildFlow() {
    if (document.querySelector('script[data-ndless-build-official-flow="true"]')) {
      window.NdlessOfficialBuildFlow?.suppressExperimentalNdlessControls?.();
      window.NdlessOfficialBuildFlow?.patchBuildManager?.();
      return;
    }
    const flow = document.createElement("script");
    flow.src = `./ndless-build-confirm-flow.js?v=${VERSION}`;
    flow.async = false;
    flow.dataset.ndlessBuildOfficialFlow = "true";
    flow.addEventListener("error", () => console.error("Failed to load confirmed Ndless Build TNS flow."), { once: true });
    document.head.appendChild(flow);
  }

  function loadDiagnostics() {
    loadZehnStreamFix();
    loadRuntimeUpgrade();
    loadOfficialBuildFlow();
    if (document.querySelector('script[data-ndless-experimental-export-fix="true"]')) {
      window.NdlessExperimentalExportDiagnostics?.setup?.();
      return;
    }
    const fix = document.createElement("script");
    fix.src = `./ndless-experimental-export-fix.js?v=${VERSION}`;
    fix.async = false;
    fix.dataset.ndlessExperimentalExportFix = "true";
    fix.addEventListener("error", () => console.error("Failed to load Ndless experimental export diagnostics/fix."), { once: true });
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
    ui.addEventListener("error", () => console.error("Failed to load experimental TNS file save UI."), { once: true });
    document.head.appendChild(ui);
  }

  // Direct-file persistence and Ndless reconstruction diagnostics remain
  // available for document editing, while Ndless Build TNS now uses the
  // confirmed compiler-v4 handoff flow.
  loadZehnStreamFix();
  loadRuntimeUpgrade();
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
  core.addEventListener("error", () => console.error("Failed to load experimental TNS file save core."), { once: true });
  document.head.appendChild(core);
})();