(() => {
  "use strict";
  const registry = window.TnsContainerRegistry;
  if (registry?.getAdapter && registry?.register) {
    const nzp = registry.getAdapter("nzp");
    if (nzp) registry.register({ ...nzp, editorGlobal: "TnsStructuredContentEditor" });
  }

  const VERSION = "20260829-direct-save-v8";

  function loadDiagnostics() {
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

  // Experimental only: direct-file persistence plus Ndless reconstruction diagnostics.
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
