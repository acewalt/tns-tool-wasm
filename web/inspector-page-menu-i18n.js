(() => {
  "use strict";

  const COPY = {
    es: {
      addPage: "+ Página",
      addPdf: "Agregar PDF",
      addPdfTitle: "Convierte cada página del PDF a imagen y crea una card por página.",
    },
    en: {
      addPage: "+ Page",
      addPdf: "Add PDF",
      addPdfTitle: "Converts each PDF page to an image and creates one card per page.",
    },
    fr: {
      addPage: "+ Page",
      addPdf: "Ajouter un PDF",
      addPdfTitle: "Convertit chaque page du PDF en image et crée une carte par page.",
    },
  };

  function language() {
    const saved = String(localStorage.getItem("tns-tool-language") || "").toLowerCase();
    if (COPY[saved]) return saved;
    const html = String(document.documentElement.lang || "").slice(0, 2).toLowerCase();
    if (COPY[html]) return html;
    const browser = String(navigator.language || navigator.userLanguage || "en").slice(0, 2).toLowerCase();
    return COPY[browser] ? browser : "en";
  }

  function apply(root = document) {
    const text = COPY[language()] || COPY.en;

    // Static +Page controls already use data-i18n in some places. This also
    // catches the dynamically-created Document Inspector trigger.
    const pageButtons = [];
    if (root.matches?.('[data-i18n="addPage"]')) pageButtons.push(root);
    pageButtons.push(...Array.from(root.querySelectorAll?.('[data-i18n="addPage"]') || []));

    const inspectorRoots = [];
    if (root.matches?.(".inspector-modal")) inspectorRoots.push(root);
    inspectorRoots.push(...Array.from(root.querySelectorAll?.(".inspector-modal") || []));
    if (root === document) inspectorRoots.push(...Array.from(document.querySelectorAll(".inspector-modal")));

    for (const modal of new Set(inspectorRoots)) {
      for (const button of modal.querySelectorAll("button")) {
        const value = String(button.textContent || "").trim();
        if (/^\+\s*(?:Page|Pagina|Página)$/i.test(value)) pageButtons.push(button);
      }
    }

    for (const button of new Set(pageButtons)) {
      button.textContent = text.addPage;
      button.dataset.i18n = "addPage";
    }

    for (const id of ["file-page-add-pdf", "add-pdf-widget"]) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.textContent = text.addPdf;
      button.title = text.addPdfTitle;
      button.dataset.i18n = "addPdfWidget";
      button.dataset.i18nTitle = "addPdfWidgetTitle";
    }
  }

  let queued = false;
  function queueApply(root = document) {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply(root);
    });
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) queueApply(node);
      }
    }
  });

  function start() {
    apply(document);
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    document.querySelector("#language-buttons")?.addEventListener("click", () => setTimeout(() => apply(document), 0));
    window.addEventListener("storage", (event) => {
      if (event.key === "tns-tool-language") apply(document);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
