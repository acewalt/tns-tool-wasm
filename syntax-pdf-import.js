(() => {
  "use strict";
  if (document.querySelector('script[data-media-import-controller="true"]')) return;
  const script = document.createElement("script");
  script.src = "./media-import-controller.js?v=20260827-media-import-v3";
  script.dataset.mediaImportController = "true";
  document.head.appendChild(script);
})();
