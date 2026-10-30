(() => {
  "use strict";

  const MIN_VISIBLE_MS = 2200;
  const FADE_MS = 520;
  const READY_LOG = "Runtime WASM listo.";
  const ROOT_LOCK = "tns-runtime-loading-lock";
  const MANAGED_CLASS = "startup-loader-managed";
  const FINAL_CLASS = "startup-loader-finalizing";

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
    const active = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    if (["es", "en", "fr"].includes(active)) return active;
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

  function fallbackMarkup() {
    return `
      <div class="startup-loader-card">
        <div class="startup-loader-mark" aria-hidden="true">
          <svg class="startup-loader-outline" viewBox="0 0 164 164" focusable="false">
            <rect x="16" y="16" width="132" height="132" rx="34" pathLength="100" />
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
    if (!loader && isRuntimeTerminal()) return;
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "startup-loader";
      loader.className = "startup-loader";
      loader.setAttribute("role", "status");
      loader.setAttribute("aria-live", "polite");
      loader.innerHTML = fallbackMarkup();
      document.body.prepend(loader);
    }

    loader.classList.remove(FINAL_CLASS, "startup-loader-motion-v2");
    loader.classList.add(MANAGED_CLASS);

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
      version: "20261029-startup-loader-v4",
      minVisibleMs: MIN_VISIBLE_MS,
      startedAt,
    };
  }

  function updateStatusLanguage() {
    if (!loader || finalized) return;
    const status = loader.querySelector("#runtime-status");
    if (status && !status.classList.contains("ready") && !status.classList.contains("error")) {
      status.textContent = loadingText();
    }
  }

  function start() {
    adoptOrCreateLoader();
    document.querySelector("#language-buttons")?.addEventListener("click", () => {
      window.setTimeout(updateStatusLanguage, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
