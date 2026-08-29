(() => {
  "use strict";
  const registry = window.TnsContainerRegistry;
  if (registry?.getAdapter && registry?.register) {
    const nzp = registry.getAdapter("nzp");
    if (nzp) registry.register({ ...nzp, editorGlobal: "TnsStructuredContentEditor" });
  }

  // Experimental only: load the direct-file persistence layer without touching
  // any existing TNS generation, download, or save button implementation.
  if (document.querySelector('script[data-tns-file-save-experimental-core="true"]')) return;
  const core = document.createElement("script");
  core.src = "./tns-file-save-experimental-core.js?v=20260829-direct-save-v6";
  core.async = false;
  core.dataset.tnsFileSaveExperimentalCore = "true";
  core.addEventListener("load", () => {
    if (document.querySelector('script[data-tns-file-save-experimental="true"]')) return;
    const ui = document.createElement("script");
    ui.src = "./tns-file-save-experimental.js?v=20260829-direct-save-v6";
    ui.async = false;
    ui.dataset.tnsFileSaveExperimental = "true";
    document.head.appendChild(ui);
  }, { once: true });
  core.addEventListener("error", () => console.error("Failed to load experimental TNS file save core."), { once: true });
  document.head.appendChild(core);
})();