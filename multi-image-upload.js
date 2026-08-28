(() => {
  "use strict";

  function ensureStyle(selector, href, dataKey) {
    if (document.querySelector(selector)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset[dataKey] = "true";
    document.head.appendChild(link);
  }

  function loadScript(selector, src, dataKey) {
    const existing = document.querySelector(selector);
    if (existing) {
      if (existing.dataset.loaded === "1" || existing.readyState === "complete") return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        existing.addEventListener("load", () => resolve(existing), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset[dataKey] = "true";
      script.addEventListener("load", () => { script.dataset.loaded = "1"; resolve(script); }, { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  const V="20260828-ndless-project-v3";
  ensureStyle('link[data-runtime-loading-overlay-style="true"]', "./runtime-loading-overlay.css?v=20260827-runtime-loader-v3", "runtimeLoadingOverlayStyle");
  ensureStyle('link[data-header-controls-compact="true"]', "./header-controls-compact.css?v=20260827-header-controls-v3", "headerControlsCompact");
  ensureStyle('link[data-tns-type-progress-style="true"]', `./tns-type-detection-progress.css?v=${V}`, "tnsTypeProgressStyle");
  ensureStyle('link[data-ndless-tns-inspector-style="true"]', `./ndless-tns-inspector.css?v=${V}`, "ndlessTnsInspectorStyle");
  ensureStyle('link[data-ndless-editor-style="true"]', `./ndless-editor.css?v=${V}`, "ndlessEditorStyle");
  ensureStyle('link[data-ndless-friendly-editor-style="true"]', `./ndless-friendly-editor.css?v=${V}`, "ndlessFriendlyEditorStyle");
  ensureStyle('link[data-ndless-friendly-layout-fix-style="true"]', `./ndless-friendly-layout-fix.css?v=${V}`, "ndlessFriendlyLayoutFixStyle");
  ensureStyle('link[data-ndless-project-workspace-style="true"]', `./ndless-project-workspace.css?v=${V}`, "ndlessProjectWorkspaceStyle");
  ensureStyle('link[data-ndless-project-layout-fix-style="true"]', `./ndless-project-layout-fix.css?v=${V}`, "ndlessProjectLayoutFixStyle");
  ensureStyle('link[data-ndless-project-sdk-enhancements-style="true"]', `./ndless-project-sdk-enhancements.css?v=${V}`, "ndlessProjectSdkEnhancementsStyle");
  ensureStyle('link[data-content-pack-editor-style="true"]', `./content-pack-editor.css?v=${V}`, "contentPackEditorStyle");
  ensureStyle('link[data-structured-content-editor-style="true"]', `./structured-content-editor.css?v=${V}`, "structuredContentEditorStyle");
  ensureStyle('link[data-nvp-editor-style="true"]', `./nvp-editor.css?v=${V}`, "nvpEditorStyle");
  ensureStyle('link[data-image-editor-style="true"]', "./image-editor.css?v=20260827-image-editor-v1", "imageEditorStyle");

  loadScript('script[data-runtime-loading-overlay="true"]', "./runtime-loading-overlay.js?v=20260827-runtime-loader-v3", "runtimeLoadingOverlay").catch(console.error);
  loadScript('script[data-monaco-ti-reference-theme="true"]', "./monaco-ti-reference-theme.js?v=20260827-ti-reference-theme-v3", "monacoTiReferenceTheme").catch(console.error);

  const tnsChain = loadScript('script[data-tns-container-registry="true"]', `./tns-container-registry.js?v=${V}`, "tnsContainerRegistry")
    .then(() => loadScript('script[data-nzp-content-format="true"]', `./nzp-content-format.js?v=${V}`, "nzpContentFormat"))
    .then(() => loadScript('script[data-nvp-video-format="true"]', `./nvp-video-format.js?v=${V}`, "nvpVideoFormat"))
    .then(() => loadScript('script[data-content-pack-editor="true"]', `./content-pack-editor.js?v=${V}`, "contentPackEditor"))
    .then(() => loadScript('script[data-structured-content-editor="true"]', `./structured-content-editor.js?v=${V}`, "structuredContentEditor"))
    .then(() => loadScript('script[data-nvp-editor="true"]', `./nvp-editor.js?v=${V}`, "nvpEditor"))
    .then(() => loadScript('script[data-container-editor-bindings="true"]', `./container-editor-bindings.js?v=${V}`, "containerEditorBindings"))
    .then(() => loadScript('script[data-ndless-zehn="true"]', `./ndless-zehn.js?v=${V}`, "ndlessZehn"))
    .then(() => loadScript('script[data-ndless-bflt="true"]', `./ndless-bflt.js?v=${V}`, "ndlessBflt"))
    .then(() => loadScript('script[data-ndless-prg="true"]', `./ndless-prg.js?v=${V}`, "ndlessPrg"))
    .then(() => loadScript('script[data-ndless-format-detector="true"]', `./ndless-format-detector.js?v=${V}`, "ndlessFormatDetector"))
    .then(() => loadScript('script[data-tns-universal-detector="true"]', `./tns-universal-detector.js?v=${V}`, "tnsUniversalDetector"))
    .then(() => loadScript('script[data-tns-type-progress="true"]', `./tns-type-detection-progress.js?v=${V}`, "tnsTypeProgress"))
    .then(() => loadScript('script[data-ndless-tns-inspector="true"]', `./ndless-tns-inspector.js?v=${V}`, "ndlessTnsInspector"))
    .then(() => loadScript('script[data-ndless-arm-decoder="true"]', `./ndless-arm-decoder.js?v=${V}`, "ndlessArmDecoder"))
    .then(() => loadScript('script[data-ndless-analysis="true"]', `./ndless-analysis.js?v=${V}`, "ndlessAnalysis"))
    .then(() => loadScript('script[data-ndless-friendly-core="true"]', `./ndless-friendly-core.js?v=${V}`, "ndlessFriendlyCore"))
    .then(() => loadScript('script[data-ndless-rebuilder="true"]', `./ndless-rebuilder.js?v=${V}`, "ndlessRebuilder"))
    .then(() => loadScript('script[data-ndless-editor="true"]', `./ndless-editor.js?v=${V}`, "ndlessEditor"))
    .then(() => loadScript('script[data-ndless-friendly-editor="true"]', `./ndless-friendly-editor.js?v=${V}`, "ndlessFriendlyEditor"))
    .then(() => loadScript('script[data-ndless-inspector-editor-link="true"]', `./ndless-inspector-editor-link.js?v=${V}`, "ndlessInspectorEditorLink"))
    .then(() => loadScript('script[data-ndless-project-core="true"]', `./ndless-project-core.js?v=${V}`, "ndlessProjectCore"))
    .then(() => loadScript('script[data-ndless-project-workspace="true"]', `./ndless-project-workspace.js?v=${V}`, "ndlessProjectWorkspace"))
    .then(() => loadScript('script[data-ndless-project-sdk-enhancements="true"]', `./ndless-project-sdk-enhancements.js?v=${V}`, "ndlessProjectSdkEnhancements"));
  window.TnsRuntimeReady = tnsChain;
  window.NdlessRuntimeReady = tnsChain;
  tnsChain.catch(error => console.error("TNS runtime loader:", error));

  const independent = [
    ['script[data-media-import-controller="true"]', "./media-import-controller.js?v=20260827-media-import-v3", "mediaImportController"],
    ['script[data-drag-drop-ui="true"]', "./drag-drop-ui.js?v=20260827-drag-drop-v1", "dragDropUi"],
    ['script[data-home-drop-import="true"]', "./home-drop-import.js?v=20260827-home-drop-v1", "homeDropImport"],
    ['script[data-lua-drop-progress="true"]', "./lua-drop-progress.js?v=20260827-lua-drop-progress-v1", "luaDropProgress"],
    ['script[data-import-progress-i18n="true"]', "./import-progress-i18n.js?v=20260827-import-i18n-v1", "importProgressI18n"],
    ['script[data-sidebar-title-i18n="true"]', "./sidebar-title-i18n.js?v=20260827-sidebar-title-i18n-v1", "sidebarTitleI18n"],
    ['script[data-inspector-page-menu-i18n="true"]', "./inspector-page-menu-i18n.js?v=20260827-inspector-page-i18n-v1", "inspectorPageMenuI18n"],
    ['script[data-inspector-summary-filter="true"]', "./inspector-summary-filter.js?v=20260827-summary-filter-v1", "inspectorSummaryFilter"],
  ];
  independent.forEach(args => loadScript(...args).catch(error => console.error("Runtime loader:", error)));

  loadScript('script[data-image-editor-i18n="true"]', "./image-editor-i18n.js?v=20260827-image-editor-v1", "imageEditorI18n")
    .then(() => loadScript('script[data-image-editor-core="true"]', "./image-editor-core.js?v=20260827-image-editor-v1", "imageEditorCore"))
    .then(() => loadScript('script[data-image-editor-hooks="true"]', "./image-editor-hooks.js?v=20260827-image-editor-v1", "imageEditorHooks"))
    .catch(error => console.error("Image editor loader:", error));
})();