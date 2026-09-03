(() => {
  "use strict";

  const MIN_VISIBLE_MS = 2200;
  const FADE_MS = 520;
  const READY_LOG = "Runtime WASM listo.";
  const ROOT_LOCK = "tns-runtime-loading-lock";
  const MOTION_CLASS = "startup-loader-motion-v2";
  const FINAL_CLASS = "startup-loader-finalizing";
  const STYLE_ID = "tns-startup-loader-motion-v2-style";

  let loader = null;
  let observer = null;
  let checkTimer = 0;
  let finishTimer = 0;
  let startedAt = 0;
  let terminalSeen = false;
  let finalized = false;
  let nativeRemove = null;

  try {
    if (document.currentScript) document.currentScript.dataset.loaded = "1";
  } catch (_error) {}

  function currentLanguage() {
    const saved = String(localStorage.getItem("tns-tool-language") || "").toLowerCase();
    if (["es", "en", "fr"].includes(saved)) return saved;
    const html = String(document.documentElement.lang || "").slice(0, 2).toLowerCase();
    if (["es", "en", "fr"].includes(html)) return html;
    return "es";
  }

  function loadingText() {
    const lang = currentLanguage();
    if (lang === "en") return "Loading Pyodide...";
    if (lang === "fr") return "Chargement de Pyodide...";
    return "Cargando Pyodide...";
  }

  function installMotionStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #startup-loader.${MOTION_CLASS} {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      #startup-loader.${MOTION_CLASS} .startup-loader-outline {
        animation: none !important;
        transform: none !important;
        overflow: visible;
      }

      #startup-loader.${MOTION_CLASS} .startup-loader-outline rect:first-of-type {
        stroke-dasharray: 68 32 !important;
        animation: tnsStartupOuterTrace 1.7s linear infinite !important;
      }

      #startup-loader.${MOTION_CLASS} .startup-loader-outline rect:nth-of-type(2) {
        stroke-dasharray: 46 54 !important;
        animation: tnsStartupInnerTrace 1.7s linear infinite !important;
      }

      #startup-loader.${MOTION_CLASS} .startup-loader-mark {
        transform-origin: 50% 50%;
        animation: tnsStartupMarkFloat 1.7s ease-in-out infinite alternate !important;
      }

      #startup-loader.${MOTION_CLASS} .startup-loader-core {
        animation: tnsStartupCoreBreath 1.35s ease-in-out infinite alternate !important;
      }

      #startup-loader.${MOTION_CLASS} h2 {
        color: transparent !important;
        background: linear-gradient(90deg,
          #79df31 0%,
          #a8f343 18%,
          #e1ff87 36%,
          #a9f23f 52%,
          #78de32 68%,
          #dfff80 84%,
          #79df31 100%);
        background-size: 250% 100%;
        background-position: 0 0;
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        transform-origin: center;
        animation:
          tnsStartupWordReveal 760ms cubic-bezier(.2,.8,.2,1) both,
          tnsStartupWordSweep 1.65s linear 420ms infinite,
          tnsStartupWordGlow 1.3s ease-in-out 420ms infinite alternate !important;
      }

      #startup-loader.${MOTION_CLASS} .startup-loader-status {
        animation: tnsStartupStatusReveal 520ms ease 420ms both !important;
      }

      #startup-loader.${MOTION_CLASS}.startup-loader-closing:not(.${FINAL_CLASS}) {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }

      #startup-loader.${MOTION_CLASS}.${FINAL_CLASS} {
        opacity: 0 !important;
        visibility: visible !important;
        pointer-events: none !important;
        transition: opacity ${FADE_MS}ms ease !important;
      }

      @keyframes tnsStartupOuterTrace {
        from { stroke-dashoffset: 0; }
        to { stroke-dashoffset: -100; }
      }

      @keyframes tnsStartupInnerTrace {
        from { stroke-dashoffset: 0; }
        to { stroke-dashoffset: 100; }
      }

      @keyframes tnsStartupMarkFloat {
        from { transform: translateY(1px) scale(.985); filter: brightness(.96); }
        to { transform: translateY(-2px) scale(1.015); filter: brightness(1.12); }
      }

      @keyframes tnsStartupCoreBreath {
        from {
          filter: brightness(.94);
          box-shadow: 0 0 14px rgba(164, 242, 63, .22), inset 0 0 18px rgba(164, 242, 63, .08);
        }
        to {
          filter: brightness(1.18);
          box-shadow: 0 0 30px rgba(164, 242, 63, .46), inset 0 0 24px rgba(164, 242, 63, .16);
        }
      }

      @keyframes tnsStartupWordReveal {
        0% { opacity: 0; transform: translateY(9px) scale(.96); filter: blur(5px); letter-spacing: .07em; }
        65% { opacity: 1; filter: blur(0); }
        100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); letter-spacing: normal; }
      }

      @keyframes tnsStartupWordSweep {
        from { background-position: 0 0; }
        to { background-position: -250% 0; }
      }

      @keyframes tnsStartupWordGlow {
        from { filter: drop-shadow(0 0 7px rgba(158, 239, 57, .28)); }
        to { filter: drop-shadow(0 0 18px rgba(158, 239, 57, .62)); }
      }

      @keyframes tnsStartupStatusReveal {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  function fallbackMarkup() {
    return `
      <div class="startup-loader-card">
        <div class="startup-loader-mark" aria-hidden="true">
          <svg class="startup-loader-outline" viewBox="0 0 120 120" focusable="false" style="animation:none">
            <rect x="8" y="8" width="104" height="104" rx="28" ry="28" pathLength="100"
              fill="none" stroke="var(--lime, #a3ee3d)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"
              stroke-dasharray="68 32"></rect>
            <rect x="15" y="15" width="90" height="90" rx="24" ry="24" pathLength="100"
              fill="none" stroke="var(--lime, #a3ee3d)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"
              stroke-opacity="0.82" stroke-dasharray="46 54"></rect>
          </svg>
          <div class="startup-loader-core">TNS</div>
        </div>
        <h2>TNS tool</h2>
        <p id="runtime-status" class="startup-loader-status">${loadingText()}</p>
      </div>`;
  }

  function isRuntimeTerminal() {
    const status = document.querySelector("#runtime-status");
    if (status?.classList.contains("ready") || status?.classList.contains("error")) return true;
    const state = String(loader?.dataset?.state || "").toLowerCase();
    if (state === "ready" || state === "error") return true;
    const log = document.querySelector("#log");
    return String(log?.textContent || "").includes(READY_LOG);
  }

  function blockKeyboard(event) {
    if (finalized) return;
    if (["Tab", "Enter", " ", "Spacebar", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function finishNow() {
    if (finalized || !loader) return;
    finalized = true;
    window.clearInterval(checkTimer);
    window.clearTimeout(finishTimer);
    observer?.disconnect();
    document.removeEventListener("keydown", blockKeyboard, true);
    document.documentElement.classList.remove(ROOT_LOCK);

    loader.classList.add(FINAL_CLASS, "startup-loader-closing");
    window.setTimeout(() => {
      try {
        if (loader?.isConnected) nativeRemove?.();
      } catch (_error) {}
    }, FADE_MS + 40);
  }

  function scheduleFinish() {
    if (!loader || finalized || !terminalSeen) return;
    const elapsed = performance.now() - startedAt;
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    window.clearTimeout(finishTimer);
    finishTimer = window.setTimeout(finishNow, wait);
  }

  function checkState() {
    if (finalized) return;
    if (isRuntimeTerminal()) {
      terminalSeen = true;
      scheduleFinish();
    }
  }

  function adoptOrCreateLoader() {
    document.getElementById("tns-runtime-loading-overlay")?.remove();

    loader = document.getElementById("startup-loader");
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "startup-loader";
      loader.className = "startup-loader";
      loader.setAttribute("role", "status");
      loader.setAttribute("aria-live", "polite");
      loader.innerHTML = fallbackMarkup();
      document.body.prepend(loader);
    }

    installMotionStyle();
    loader.classList.remove(FINAL_CLASS);
    loader.classList.add(MOTION_CLASS);

    // app.js may already have marked the loader as closing. Keep that state
    // from hiding the animation until the minimum presentation time has elapsed.
    const status = loader.querySelector("#runtime-status");
    if (status && !String(status.textContent || "").trim()) status.textContent = loadingText();

    const prototypeRemove = Element.prototype.remove;
    nativeRemove = () => prototypeRemove.call(loader);
    try {
      Object.defineProperty(loader, "remove", {
        configurable: true,
        value: () => {
          terminalSeen = true;
          scheduleFinish();
        },
      });
    } catch (_error) {
      try {
        loader.remove = () => {
          terminalSeen = true;
          scheduleFinish();
        };
      } catch (_ignore) {}
    }

    startedAt = performance.now();
    document.documentElement.classList.add(ROOT_LOCK);
    document.addEventListener("keydown", blockKeyboard, true);

    observer = new MutationObserver(checkState);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "data-state"],
    });

    checkTimer = window.setInterval(checkState, 100);
    checkState();

    window.__tnsStartupLoaderMotion = {
      version: "20260903-startup-motion-v2",
      minVisibleMs: MIN_VISIBLE_MS,
      startedAt,
    };
  }

  function start() {
    adoptOrCreateLoader();
    document.querySelector("#language-buttons")?.addEventListener("click", () => {
      window.setTimeout(() => {
        if (!loader || finalized) return;
        const status = loader.querySelector("#runtime-status");
        if (status && !status.classList.contains("ready") && !status.classList.contains("error")) {
          status.textContent = loadingText();
        }
      }, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
