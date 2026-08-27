(() => {
  "use strict";

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
})();
