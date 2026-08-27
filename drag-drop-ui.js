(() => {
  "use strict";

  const STYLE_ID = "tns-drag-drop-ui-style";
  const DROP_MESSAGES = {
    es: "Suelta el archivo para cargarlo",
    en: "Drop the file to load it",
    fr: "Déposez le fichier pour le charger",
  };

  function currentLanguage() {
    const active = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    const htmlLang = String(document.documentElement.lang || "").slice(0, 2).toLowerCase();
    return active || htmlLang || "es";
  }

  function updateMessage(language = currentLanguage()) {
    if (!document.body) return;
    document.body.dataset.dropMessage = DROP_MESSAGES[language] || DROP_MESSAGES.es;
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* Keep one drag-and-drop UI only: the full-page blurred overlay. */
      body.drop-target-active::after {
        content: attr(data-drop-message) !important;
      }

      /* Disable the older editor/panel-specific drag highlight. The drop logic
         remains intact; only its duplicated visual state is removed. */
      .doctor-panel.drop-target-active {
        border-color: var(--line) !important;
        box-shadow: 0 8px 28px rgb(15 23 42 / 6%) !important;
      }

      .doctor-panel.drop-target-active .code-shell {
        border-color: var(--line) !important;
        background: #fff !important;
      }

      .doctor-panel.drop-target-active .editor-wrap {
        border-color: var(--line) !important;
        background: #fff !important;
      }

      [data-theme="dark"] .doctor-panel.drop-target-active .code-shell,
      [data-theme="dark"] .doctor-panel.drop-target-active .editor-wrap {
        background: #0f172a !important;
      }
    `;
    document.head.appendChild(style);
  }

  function isFileDrag(event) {
    const types = event?.dataTransfer?.types;
    if (!types) return false;
    try {
      return Array.from(types).includes("Files");
    } catch (_error) {
      return false;
    }
  }

  function showGlobalDropOverlay(event) {
    if (!isFileDrag(event) || !document.body) return;
    document.body.classList.add("drop-target-active");
  }

  function hideGlobalDropOverlay() {
    document.body?.classList.remove("drop-target-active");
  }

  function installDragCoverage() {
    // Capture phase guarantees that dragging over the XML/PY code editor does
    // not replace the global overlay with the old local editor highlight.
    window.addEventListener("dragenter", showGlobalDropOverlay, true);
    window.addEventListener("dragover", showGlobalDropOverlay, true);
    window.addEventListener("drop", hideGlobalDropOverlay, true);
    window.addEventListener("dragend", hideGlobalDropOverlay, true);
    window.addEventListener("dragleave", (event) => {
      if (event.relatedTarget == null) hideGlobalDropOverlay();
    }, true);
  }

  function installLanguageSync() {
    updateMessage();

    const languageButtons = document.querySelector("#language-buttons");
    languageButtons?.addEventListener("click", (event) => {
      const button = event.target instanceof Element ? event.target.closest("button[data-lang]") : null;
      if (button?.dataset.lang) updateMessage(button.dataset.lang);
    });

    const observer = new MutationObserver(() => updateMessage());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });

    if (languageButtons) {
      observer.observe(languageButtons, {
        attributes: true,
        subtree: true,
        attributeFilter: ["class"],
      });
    }
  }

  function install() {
    if (document.documentElement.dataset.tnsDragDropUi === "1") return;
    document.documentElement.dataset.tnsDragDropUi = "1";
    installStyles();
    installLanguageSync();
    installDragCoverage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
