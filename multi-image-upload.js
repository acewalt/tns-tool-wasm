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

  ensureStyle('link[data-runtime-loading-overlay-style="true"]', "./runtime-loading-overlay.css?v=20260827-runtime-loader-v3", "runtimeLoadingOverlayStyle");
  ensureStyle('link[data-header-controls-compact="true"]', "./header-controls-compact.css?v=20260827-header-controls-v3", "headerControlsCompact");
  ensureStyle('link[data-tns-type-progress-style="true"]', "./tns-type-detection-progress.css?v=20260828-ndless-workspace-v3", "tnsTypeProgressStyle");
  ensureStyle('link[data-ndless-tns-inspector-style="true"]', "./ndless-tns-inspector.css?v=20260828-ndless-workspace-v3", "ndlessTnsInspectorStyle");
  ensureStyle('link[data-ndless-editor-style="true"]', "./ndless-editor.css?v=20260828-ndless-workspace-v3", "ndlessEditorStyle");
  ensureStyle('link[data-image-editor-style="true"]', "./image-editor.css?v=20260827-image-editor-v1", "imageEditorStyle");

  loadScript('script[data-runtime-loading-overlay="true"]', "./runtime-loading-overlay.js?v=20260827-runtime-loader-v3", "runtimeLoadingOverlay").catch(console.error);
  loadScript('script[data-monaco-ti-reference-theme="true"]', "./monaco-ti-reference-theme.js?v=20260827-ti-reference-theme-v3", "monacoTiReferenceTheme").catch(console.error);

  const ndlessChain = loadScript('script[data-ndless-zehn="true"]', "./ndless-zehn.js?v=20260828-ndless-workspace-v3", "ndlessZehn")
    .then(() => loadScript('script[data-ndless-bflt="true"]', "./ndless-bflt.js?v=20260828-ndless-workspace-v3", "ndlessBflt"))
    .then(() => loadScript('script[data-ndless-prg="true"]', "./ndless-prg.js?v=20260828-ndless-workspace-v3", "ndlessPrg"))
    .then(() => loadScript('script[data-ndless-format-detector="true"]', "./ndless-format-detector.js?v=20260828-ndless-workspace-v3", "ndlessFormatDetector"))
    .then(() => loadScript('script[data-tns-type-progress="true"]', "./tns-type-detection-progress.js?v=20260828-ndless-workspace-v3", "tnsTypeProgress"))
    .then(() => loadScript('script[data-ndless-tns-inspector="true"]', "./ndless-tns-inspector.js?v=20260828-ndless-workspace-v3", "ndlessTnsInspector"))
    .then(() => loadScript('script[data-ndless-arm-decoder="true"]', "./ndless-arm-decoder.js?v=20260828-ndless-workspace-v3", "ndlessArmDecoder"))
    .then(() => loadScript('script[data-ndless-analysis="true"]', "./ndless-analysis.js?v=20260828-ndless-workspace-v3", "ndlessAnalysis"))
    .then(() => loadScript('script[data-ndless-rebuilder="true"]', "./ndless-rebuilder.js?v=20260828-ndless-workspace-v3", "ndlessRebuilder"))
    .then(() => loadScript('script[data-ndless-editor="true"]', "./ndless-editor.js?v=20260828-ndless-workspace-v3", "ndlessEditor"));
  window.NdlessRuntimeReady = ndlessChain;
  ndlessChain.catch(error => console.error("Ndless runtime loader:", error));

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
