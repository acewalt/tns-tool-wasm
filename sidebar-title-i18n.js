(() => {
  "use strict";

  const STORAGE_KEY = "tns-tool-language";
  const LABELS = {
    es: "HERRAMIENTAS",
    en: "TOOLS",
    fr: "OUTILS",
  };

  function getLanguage() {
    const saved = String(localStorage.getItem(STORAGE_KEY) || "").toLowerCase();
    if (LABELS[saved]) return saved;
    const browser = String(navigator.language || navigator.userLanguage || "en").slice(0, 2).toLowerCase();
    return LABELS[browser] ? browser : "en";
  }

  function applySidebarTitle(language = getLanguage()) {
    const title = document.querySelector(".tools-sidebar .sidebar-title");
    if (!title) return;
    title.textContent = LABELS[language] || LABELS.en;
    title.setAttribute("data-sidebar-i18n", "tools");
  }

  function install() {
    applySidebarTitle();

    document.querySelectorAll("#language-buttons [data-lang]").forEach((button) => {
      button.addEventListener("click", () => {
        const language = String(button.dataset.lang || "").toLowerCase();
        if (LABELS[language]) {
          // Run after app.js stores/applies the selected language.
          setTimeout(() => applySidebarTitle(language), 0);
        }
      });
    });

    // Keep the label synchronized if another part of the app changes language/state.
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY) applySidebarTitle();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
