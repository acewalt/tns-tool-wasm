(() => {
  "use strict";

  if (!document.querySelector('link[data-header-controls-compact="true"]')) {
    const headerControlsStyle = document.createElement("link");
    headerControlsStyle.rel = "stylesheet";
    headerControlsStyle.href = "./header-controls-compact.css?v=20260827-header-controls-v3";
    headerControlsStyle.dataset.headerControlsCompact = "true";
    document.head.appendChild(headerControlsStyle);
  }

  if (!document.querySelector('script[data-media-import-controller="true"]')) {
    const mediaScript = document.createElement("script");
    mediaScript.src = "./media-import-controller.js?v=20260827-media-import-v3";
    mediaScript.dataset.mediaImportController = "true";
    document.head.appendChild(mediaScript);
  }

  if (!document.querySelector('script[data-drag-drop-ui="true"]')) {
    const dragUiScript = document.createElement("script");
    dragUiScript.src = "./drag-drop-ui.js?v=20260827-drag-drop-v1";
    dragUiScript.dataset.dragDropUi = "true";
    document.head.appendChild(dragUiScript);
  }

  if (!document.querySelector('script[data-home-drop-import="true"]')) {
    const homeDropScript = document.createElement("script");
    homeDropScript.src = "./home-drop-import.js?v=20260827-home-drop-v1";
    homeDropScript.dataset.homeDropImport = "true";
    document.head.appendChild(homeDropScript);
  }

  if (!document.querySelector('script[data-lua-drop-progress="true"]')) {
    const luaProgressScript = document.createElement("script");
    luaProgressScript.src = "./lua-drop-progress.js?v=20260827-lua-drop-progress-v1";
    luaProgressScript.dataset.luaDropProgress = "true";
    document.head.appendChild(luaProgressScript);
  }

  if (!document.querySelector('script[data-import-progress-i18n="true"]')) {
    const importProgressI18nScript = document.createElement("script");
    importProgressI18nScript.src = "./import-progress-i18n.js?v=20260827-import-i18n-v1";
    importProgressI18nScript.dataset.importProgressI18n = "true";
    document.head.appendChild(importProgressI18nScript);
  }

  if (!document.querySelector('script[data-sidebar-title-i18n="true"]')) {
    const sidebarTitleI18nScript = document.createElement("script");
    sidebarTitleI18nScript.src = "./sidebar-title-i18n.js?v=20260827-sidebar-title-i18n-v1";
    sidebarTitleI18nScript.dataset.sidebarTitleI18n = "true";
    document.head.appendChild(sidebarTitleI18nScript);
  }

  if (!document.querySelector('script[data-inspector-page-menu-i18n="true"]')) {
    const inspectorPageMenuI18nScript = document.createElement("script");
    inspectorPageMenuI18nScript.src = "./inspector-page-menu-i18n.js?v=20260827-inspector-page-i18n-v1";
    inspectorPageMenuI18nScript.dataset.inspectorPageMenuI18n = "true";
    document.head.appendChild(inspectorPageMenuI18nScript);
  }

  if (!document.querySelector('link[data-image-editor-style="true"]')) {
    const imageEditorStyle = document.createElement("link");
    imageEditorStyle.rel = "stylesheet";
    imageEditorStyle.href = "./image-editor.css?v=20260827-image-editor-v1";
    imageEditorStyle.dataset.imageEditorStyle = "true";
    document.head.appendChild(imageEditorStyle);
  }

  function loadImageEditorScript(selector, src, datasetKey) {
    const existing = document.querySelector(selector);
    if (existing) {
      if (existing.dataset.loaded === "1") return Promise.resolve();
      return new Promise((resolve) => {
        const finish = () => resolve();
        existing.addEventListener("load", finish, { once: true });
        existing.addEventListener("error", finish, { once: true });
        setTimeout(finish, 1500);
      });
    }
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset[datasetKey] = "true";
      script.addEventListener("load", () => { script.dataset.loaded = "1"; resolve(); }, { once: true });
      script.addEventListener("error", resolve, { once: true });
      document.head.appendChild(script);
    });
  }

  loadImageEditorScript(
    'script[data-image-editor-i18n="true"]',
    "./image-editor-i18n.js?v=20260827-image-editor-v1",
    "imageEditorI18n"
  ).then(() => loadImageEditorScript(
    'script[data-image-editor-core="true"]',
    "./image-editor-core.js?v=20260827-image-editor-v1",
    "imageEditorCore"
  )).then(() => loadImageEditorScript(
    'script[data-image-editor-hooks="true"]',
    "./image-editor-hooks.js?v=20260827-image-editor-v1",
    "imageEditorHooks"
  )).catch((error) => console.error("Image editor loader:", error));
})();
