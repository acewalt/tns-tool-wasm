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
    document.removeEventListener("keydown", blockKeyboard, true);
    document.documentElement.classList.remove(ROOT_LOCK);
    overlay.classList.add("is-ready");
    window.setTimeout(() => overlay?.remove(), 900);
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
    if (document.getElementById("startup-loader")) return;
    if (isRuntimeReady() || document.getElementById(OVERLAY_ID)) return;

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-label", "TNS Tool loading");
    overlay.innerHTML = `
      <div class="tns-runtime-loader-shell">
        <div class="tns-runtime-loader-mark" aria-hidden="true">
          <svg viewBox="0 0 160 160" width="160" height="160">
            <defs>
              <linearGradient id="tns-runtime-gradient-a" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#d6ff63"></stop>
                <stop offset="1" stop-color="#72df3e"></stop>
              </linearGradient>
              <linearGradient id="tns-runtime-gradient-b" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#d8ff6b"></stop>
                <stop offset="0.5" stop-color="#8ff235"></stop>
                <stop offset="1" stop-color="#43d976"></stop>
                <animateTransform
                  attributeName="gradientTransform"
                  type="rotate"
                  values="0 .5 .5;-270 .5 .5;-270 .5 .5;-540 .5 .5;-540 .5 .5;-810 .5 .5;-810 .5 .5;-1080 .5 .5;-1080 .5 .5"
                  keyTimes="0;0.125;0.25;0.375;0.5;0.625;0.75;0.875;1"
                  dur="8s"
                  repeatCount="indefinite">
                </animateTransform>
              </linearGradient>
            </defs>
            <circle class="tns-runtime-loader-dash" cx="80" cy="80" r="70" pathLength="360" stroke="url(#tns-runtime-gradient-a)"></circle>
            <circle class="tns-runtime-loader-orbit" cx="80" cy="80" r="59" pathLength="360" stroke="url(#tns-runtime-gradient-b)"></circle>
          </svg>
          <div class="tns-runtime-loader-core"></div>
        </div>

        <svg class="tns-runtime-loader-wordmark" viewBox="0 0 420 82" role="img" aria-label="TNS tool">
          <defs>
            <linearGradient id="tns-runtime-word-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#f5f8ff"></stop>
              <stop offset="0.43" stop-color="#ffffff"></stop>
              <stop offset="0.58" stop-color="#cfff68"></stop>
              <stop offset="1" stop-color="#73e63f"></stop>
            </linearGradient>
          </defs>
          <text x="210" y="58" text-anchor="middle" class="tns-runtime-word-fill">TNS tool</text>
          <text x="210" y="58" text-anchor="middle" class="tns-runtime-word-stroke" pathLength="360">TNS tool</text>
        </svg>

        <div class="tns-runtime-loader-status-row">
          <span class="tns-runtime-loader-status-copy">${loadingText()}</span>
          <span class="tns-runtime-loader-dots" aria-hidden="true"></span>
        </div>
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

    checkTimer = window.setInterval(checkReady, 120);
    checkReady();
  }

  function start() {
    createOverlay();
    document.querySelector("#language-buttons")?.addEventListener("click", () => {
      window.setTimeout(() => {
        if (!overlay || removed) return;
        const status = overlay.querySelector(".tns-runtime-loader-status-copy");
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
