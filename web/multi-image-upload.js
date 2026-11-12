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

  const V="20261029-syntax-doctor-general-v1";
  const RUNTIME_V="20261029-startup-loader-v4";
  const TNS_PROGRESS_V="20261015-import-dialog-lifecycle-v4";
  const NOTES_V="20261112-widgets-v40";
  const NOTES_SIZE_FIX_V="20260904-notepad-size-fix-v1";
  const NOTES_SAVE_FIX_V="20261112-widgets-v40";
  const LUA_GUIDE_CAS_V="20260903-lua-guide-cas-v1";
  const LOVE_PREVIEW_SIDE_V="20261106-preview-frame-fix-v32";
  const LOVE_PREVIEW_MATH_V="20261105-preview-tools-v31";
  ensureStyle('link[data-runtime-loading-overlay-style="true"]', `./web/runtime-loading-overlay.css?v=${RUNTIME_V}`, "runtimeLoadingOverlayStyle");
  ensureStyle('link[data-header-controls-compact="true"]', "./web/header-controls-compact.css?v=20260827-header-controls-v3", "headerControlsCompact");
  ensureStyle('link[data-tns-type-progress-style="true"]', `./web/tns-type-detection-progress.css?v=${TNS_PROGRESS_V}`, "tnsTypeProgressStyle");
  ensureStyle('link[data-ndless-tns-inspector-style="true"]', `./web/ndless-tns-inspector.css?v=${V}`, "ndlessTnsInspectorStyle");
  ensureStyle('link[data-ndless-editor-style="true"]', `./web/ndless-editor.css?v=20261029-usb-rom-v21`, "ndlessEditorStyle");
  ensureStyle('link[data-ndless-friendly-editor-style="true"]', `./web/ndless-friendly-editor.css?v=${V}`, "ndlessFriendlyEditorStyle");
  ensureStyle('link[data-ndless-friendly-layout-fix-style="true"]', `./web/ndless-friendly-layout-fix.css?v=${V}`, "ndlessFriendlyLayoutFixStyle");
  ensureStyle('link[data-ndless-project-workspace-style="true"]', `./web/ndless-project-workspace.css?v=20261029-usb-rom-v21`, "ndlessProjectWorkspaceStyle");
  ensureStyle('link[data-rom-converter-style="true"]', `./web/rom-converter.css?v=20261029-usb-rom-v21`, "romConverterStyle");
  ensureStyle('link[data-ndless-project-layout-fix-style="true"]', `./web/ndless-project-layout-fix.css?v=${V}`, "ndlessProjectLayoutFixStyle");
  ensureStyle('link[data-ndless-project-sdk-enhancements-style="true"]', `./web/ndless-project-sdk-enhancements.css?v=${V}`, "ndlessProjectSdkEnhancementsStyle");
  ensureStyle('link[data-ndless-project-performance-fix-style="true"]', `./web/ndless-project-performance-fix.css?v=${V}`, "ndlessProjectPerformanceFixStyle");
  ensureStyle('link[data-ndless-project-file-tree-style="true"]', `./web/ndless-project-file-tree.css?v=${V}`, "ndlessProjectFileTreeStyle");
  ensureStyle('link[data-ndless-build-ui-style="true"]', `./web/ndless-build-ui.css?v=${V}`, "ndlessBuildUiStyle");
  ensureStyle('link[data-content-pack-editor-style="true"]', `./web/content-pack-editor.css?v=${V}`, "contentPackEditorStyle");
  ensureStyle('link[data-structured-content-editor-style="true"]', `./web/structured-content-editor.css?v=${V}`, "structuredContentEditorStyle");
  ensureStyle('link[data-nvp-editor-style="true"]', `./web/nvp-editor.css?v=${V}`, "nvpEditorStyle");
  ensureStyle('link[data-image-editor-style="true"]', "./web/image-editor.css?v=20260827-image-editor-v1", "imageEditorStyle");
  ensureStyle('link[data-notepad-rich-view-style="true"]', `./web/notepad-rich-view.css?v=${NOTES_V}`, "notepadRichViewStyle");
  ensureStyle('link[data-lua-guide-cas-style="true"]', `./web/lua-guide-cas.css?v=${LUA_GUIDE_CAS_V}`, "luaGuideCasStyle");
  ensureStyle('link[data-love-preview-side-controls-style="true"]', `./web/love-preview-side-controls.css?v=${LOVE_PREVIEW_SIDE_V}`, "lovePreviewSideControlsStyle");
  ensureStyle('link[data-love-preview-live-math-style="true"]', `./web/love-preview-live-math.css?v=${LOVE_PREVIEW_MATH_V}`, "lovePreviewLiveMathStyle");

  loadScript('script[data-runtime-loading-overlay="true"]', `./web/runtime-loading-overlay.js?v=${RUNTIME_V}`, "runtimeLoadingOverlay").catch(console.error);
  loadScript('script[data-monaco-ti-reference-theme="true"]', "./web/monaco-ti-reference-theme.js?v=20261106-ti-reference-theme-v34", "monacoTiReferenceTheme").catch(console.error);

  const tnsChain = loadScript('script[data-tns-container-registry="true"]', `./web/tns-container-registry.js?v=${V}`, "tnsContainerRegistry")
    .then(() => loadScript('script[data-nzp-content-format="true"]', `./web/nzp-content-format.js?v=${V}`, "nzpContentFormat"))
    .then(() => loadScript('script[data-nvp-video-format="true"]', `./web/nvp-video-format.js?v=${V}`, "nvpVideoFormat"))
    .then(() => loadScript('script[data-content-pack-editor="true"]', `./web/content-pack-editor.js?v=${V}`, "contentPackEditor"))
    .then(() => loadScript('script[data-structured-content-editor="true"]', `./web/structured-content-editor.js?v=${V}`, "structuredContentEditor"))
    .then(() => loadScript('script[data-nvp-editor="true"]', `./web/nvp-editor.js?v=${V}`, "nvpEditor"))
    .then(() => loadScript('script[data-container-editor-bindings="true"]', `./web/container-editor-bindings.js?v=${V}`, "containerEditorBindings"))
    .then(() => loadScript('script[data-ndless-zehn="true"]', `./web/ndless-zehn.js?v=${V}`, "ndlessZehn"))
    .then(() => loadScript('script[data-ndless-elf32="true"]', `./web/ndless-elf32.js?v=${V}`, "ndlessElf32"))
    .then(() => loadScript('script[data-ndless-zehn-builder="true"]', `./web/ndless-zehn-builder.js?v=${V}`, "ndlessZehnBuilder"))
    .then(() => loadScript('script[data-ndless-bflt="true"]', `./web/ndless-bflt.js?v=${V}`, "ndlessBflt"))
    .then(() => loadScript('script[data-ndless-prg="true"]', `./web/ndless-prg.js?v=${V}`, "ndlessPrg"))
    .then(() => loadScript('script[data-ndless-format-detector="true"]', `./web/ndless-format-detector.js?v=${V}`, "ndlessFormatDetector"))
    .then(() => loadScript('script[data-tns-universal-detector="true"]', `./web/tns-universal-detector.js?v=${V}`, "tnsUniversalDetector"))
    .then(() => loadScript('script[data-tns-type-progress="true"]', `./web/tns-type-detection-progress.js?v=${TNS_PROGRESS_V}`, "tnsTypeProgress"))
    .then(() => loadScript('script[data-ndless-tns-inspector="true"]', `./web/ndless-tns-inspector.js?v=${V}`, "ndlessTnsInspector"))
    .then(() => loadScript('script[data-ndless-arm-decoder="true"]', `./web/ndless-arm-decoder.js?v=${V}`, "ndlessArmDecoder"))
    .then(() => loadScript('script[data-ndless-analysis="true"]', `./web/ndless-analysis.js?v=${V}`, "ndlessAnalysis"))
    .then(() => loadScript('script[data-ndless-friendly-core="true"]', `./web/ndless-friendly-core.js?v=${V}`, "ndlessFriendlyCore"))
    .then(() => loadScript('script[data-ndless-rebuilder="true"]', `./web/ndless-rebuilder.js?v=${V}`, "ndlessRebuilder"))
    .then(() => loadScript('script[data-ndless-editor="true"]', `./web/ndless-editor.js?v=20261029-usb-rom-v21`, "ndlessEditor"))
    .then(() => loadScript('script[data-ndless-friendly-editor="true"]', `./web/ndless-friendly-editor.js?v=${V}`, "ndlessFriendlyEditor"))
    .then(() => loadScript('script[data-ndless-inspector-editor-link="true"]', `./web/ndless-inspector-editor-link.js?v=${V}`, "ndlessInspectorEditorLink"))
    .then(() => loadScript('script[data-ndless-project-core="true"]', `./web/ndless-project-core.js?v=${V}`, "ndlessProjectCore"))
    .then(() => loadScript('script[data-ndless-project-core-enhancements="true"]', `./web/ndless-project-core-enhancements.js?v=${V}`, "ndlessProjectCoreEnhancements"))
    .then(() => loadScript('script[data-ndless-framebuffer-preview="true"]', `./web/ndless-framebuffer-preview.js?v=${V}`, "ndlessFramebufferPreview"))
    .then(() => loadScript('script[data-ndless-project-folder-build="true"]', `./web/ndless-project-folder-build.js?v=${V}`, "ndlessProjectFolderBuild"))
    .then(() => loadScript('script[data-ndless-live-session="true"]', `./web/ndless-live-session.js?v=${V}`, "ndlessLiveSession"))
    .then(() => loadScript('script[data-ndless-project-workspace="true"]', `./web/ndless-project-workspace.js?v=20261029-sidebar-workflow-v24`, "ndlessProjectWorkspace"))
    .then(() => loadScript('script[data-ndless-arm-runtime-v2="true"]', `./web/ndless-arm-runtime-v2.js?v=${V}`, "ndlessArmRuntimeV2"))
    .then(() => loadScript('script[data-ndless-project-sdk-enhancements-v2="true"]', `./web/ndless-project-sdk-enhancements-v2.js?v=${V}`, "ndlessProjectSdkEnhancementsV2"))
    .then(() => loadScript('script[data-ndless-project-file-tree="true"]', `./web/ndless-project-file-tree.js?v=${V}`, "ndlessProjectFileTree"))
    .then(() => loadScript('script[data-ndless-local-bridge="true"]', `./web/ndless-local-bridge.js?v=${V}`, "ndlessLocalBridge"))
    .then(() => loadScript('script[data-ndless-local-installer="true"]', `./web/ndless-local-installer.js?v=${V}`, "ndlessLocalInstaller"))
    .then(() => loadScript('script[data-ndless-build-manager="true"]', `./web/ndless-build-manager.js?v=${V}`, "ndlessBuildManager"))
    .then(() => loadScript('script[data-ndless-browser-compiler="true"]', `./web/ndless-browser-compiler.js?v=${V}`, "ndlessBrowserCompiler"))
    .then(() => loadScript('script[data-ndless-browser-live-preview="true"]', `./web/ndless-browser-live-preview.js?v=${V}`, "ndlessBrowserLivePreview"))
    .then(() => loadScript('script[data-ndless-build-auto-install="true"]', `./web/ndless-build-auto-install.js?v=${V}`, "ndlessBuildAutoInstall"))
    .then(() => loadScript('script[data-ndless-build-ui="true"]', `./web/ndless-build-ui.js?v=${V}`, "ndlessBuildUi"))
    .then(() => loadScript('script[data-ndless-live-preview="true"]', `./web/ndless-live-preview.js?v=20261029-usb-rom-v21`, "ndlessLivePreview"))
    .then(() => loadScript('script[data-ndless-executable-preview="true"]', `./web/ndless-executable-preview.js?v=${V}`, "ndlessExecutablePreview"))
    .then(() => loadScript('script[data-rom-gb-preview="true"]', `./web/rom-gb-preview.js?v=20261029-usb-rom-v21`, "romGbPreview"))
    .then(() => loadScript('script[data-rom-web-converter="true"]', `./web/rom-web-converter.js?v=${V}`, "romWebConverter"))
    .then(() => loadScript('script[data-rom-converter-view="true"]', `./web/rom-converter-view.js?v=20261029-usb-rom-v21`, "romConverterView"))
    .then(() => loadScript('script[data-rom-converter="true"]', `./web/rom-converter.js?v=20261111-desktop-download-v38`, "romConverter"));
  window.TnsRuntimeReady = tnsChain;
  window.NdlessRuntimeReady = tnsChain;
  tnsChain.catch(error => console.error("TNS runtime loader:", error));

  const independent = [
    ['script[data-media-import-controller="true"]', "./web/media-import-controller.js?v=20261104-preview-pages-v27", "mediaImportController"],
    ['script[data-drag-drop-ui="true"]', "./web/drag-drop-ui.js?v=20261029-usb-rom-v21", "dragDropUi"],
    ['script[data-home-drop-import="true"]', "./web/home-drop-import.js?v=20261029-usb-rom-v21", "homeDropImport"],
    ['script[data-lua-drop-progress="true"]', "./web/lua-drop-progress.js?v=20261015-import-dialog-lifecycle-v4", "luaDropProgress"],
    ['script[data-import-progress-i18n="true"]', "./web/import-progress-i18n.js?v=20260827-import-i18n-v1", "importProgressI18n"],
    ['script[data-sidebar-title-i18n="true"]', "./web/sidebar-title-i18n.js?v=20260827-sidebar-title-i18n-v1", "sidebarTitleI18n"],
    ['script[data-inspector-page-menu-i18n="true"]', "./web/inspector-page-menu-i18n.js?v=20260827-inspector-page-i18n-v1", "inspectorPageMenuI18n"],
    ['script[data-inspector-summary-filter="true"]', "./web/inspector-summary-filter.js?v=20260827-summary-filter-v1", "inspectorSummaryFilter"],
    ['script[data-notepad-rich-view="true"]', `./web/notepad-rich-view.js?v=${NOTES_V}`, "notepadRichView"],
    ['script[data-notepad-rich-size-fix="true"]', `./web/notepad-rich-size-fix.js?v=${NOTES_SIZE_FIX_V}`, "notepadRichSizeFix"],
    ['script[data-notepad-rich-save-fix="true"]', `./web/notepad-rich-save-fix.js?v=${NOTES_SAVE_FIX_V}`, "notepadRichSaveFix"],
    ['script[data-lua-guide-cas="true"]', `./web/lua-guide-cas.js?v=${LUA_GUIDE_CAS_V}`, "luaGuideCas"],
    ['script[data-love-preview-side-controls="true"]', `./web/love-preview-side-controls.js?v=${LOVE_PREVIEW_SIDE_V}`, "lovePreviewSideControls"],
    ['script[data-love-preview-live-math="true"]', `./web/love-preview-live-math.js?v=${LOVE_PREVIEW_MATH_V}`, "lovePreviewLiveMath"],
  ];
  independent.forEach(args => loadScript(...args).catch(error => console.error("Runtime loader:", error)));

  loadScript('script[data-image-editor-i18n="true"]', "./web/image-editor-i18n.js?v=20260827-image-editor-v1", "imageEditorI18n")
    .then(() => loadScript('script[data-image-editor-core="true"]', "./web/image-editor-core.js?v=20260827-image-editor-v1", "imageEditorCore"))
    .then(() => loadScript('script[data-image-editor-hooks="true"]', "./web/image-editor-hooks.js?v=20261104-image-preview-v28", "imageEditorHooks"))
    .catch(error => console.error("Image editor loader:", error));
})();
