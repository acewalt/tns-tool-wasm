(() => {
  "use strict";

  const OVERLAY_ID = "tns-runtime-loading-overlay";
  const READY_LOG = "Runtime WASM listo.";
  const ROOT_LOCK = "tns-runtime-loading-lock";
  let overlay = null;
  let observer = null;
  let removed = false;
  let checkTimer = 0;

  function currentLanguage() {
    const saved = String(localStorage.getItem("tns-tool-language") || "").toLowerCase();
    if (["es", "en", "fr"].includes(saved)) return saved;
    const html = String(document.documentElement.lang || "").slice(0, 2).toLowerCase();
    if (["es", "en", "fr"].includes(html)) return html;
    return "en";
  }

  function loadingText() {
    const lang = currentLanguage();
    if (lang === "es") return "Cargando runtime WASM";
    if (lang === "fr") return "Chargement du runtime WASM";
    return "Loading WASM runtime";
  }

  function isRuntimeReady() {
    const status = document.querySelector("#runtime-status");
    if (status?.classList.contains("ready")) return true;
    const log = document.querySelector("#log");
    return String(log?.textContent || "").includes(READY_LOG);
  }

  function finish() {
    if (removed || !overlay) return;
    removed = true;
    window.clearInterval(checkTimer);
    observer?.disconnect();
    document.documentElement.classList.remove(ROOT_LOCK);
    overlay.classList.add("is-ready");
    window.setTimeout(() => overlay?.remove(), 820);
  }

  function checkReady() {
    if (isRuntimeReady()) finish();
  }

  function blockKeyboard(event) {
    if (removed) return;
    if (["Tab", "Enter", " ", "Spacebar", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function createOverlay() {
    if (isRuntimeReady() || document.getElementById(OVERLAY_ID)) return;

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-label", "TNS Tool loading");
    overlay.innerHTML = `
      <div class="tns-runtime-loader-shell">
        <div class="tns-runtime-loader-mark" aria-hidden="true">
          <svg viewBox="0 0 116 116" width="116" height="116">
            <defs>
              <linearGradient id="tns-runtime-gradient-a" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#d6ff63"></stop>
                <stop offset="1" stop-color="#72df3e"></stop>
              </linearGradient>
              <linearGradient id="tns-runtime-gradient-b" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#b8ff47"></stop>
                <stop offset="0.52" stop-color="#8ff235"></stop>
                <stop offset="1" stop-color="#43d976"></stop>
              </linearGradient>
            </defs>
            <circle class="tns-runtime-loader-dash" cx="58" cy="58" r="51" pathLength="360" stroke="url(#tns-runtime-gradient-a)"></circle>
            <circle class="tns-runtime-loader-orbit" cx="58" cy="58" r="43" pathLength="360" stroke="url(#tns-runtime-gradient-b)"></circle>
          </svg>
          <div class="tns-runtime-loader-core"></div>
        </div>
        <div class="tns-runtime-loader-brand">TNS <span>tool</span></div>
        <div class="tns-runtime-loader-status">${loadingText()}</div>
      </div>`;

    document.documentElement.classList.add(ROOT_LOCK);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", blockKeyboard, true);

    observer = new MutationObserver(checkReady);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    // Fallback polling covers status changes made through code paths that do not
    // add DOM nodes and makes the overlay independent from the log renderer.
    checkTimer = window.setInterval(checkReady, 120);
    checkReady();
  }

  function start() {
    createOverlay();
    document.querySelector("#language-buttons")?.addEventListener("click", () => {
      window.setTimeout(() => {
        if (!overlay || removed) return;
        const status = overlay.querySelector(".tns-runtime-loader-status");
        if (status) status.textContent = loadingText();
      }, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
