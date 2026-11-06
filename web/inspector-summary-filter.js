(() => {
  "use strict";

  const LABELS = new Set([
    "xml", "cards", "widgets", "lua", "python", "resources", "images", "sheets", "notes", "graphs", "calculators", "basic", "symbols",
    "tarjetas", "recursos", "imágenes", "imagenes", "hojas", "notas", "gráficos", "graficos", "calculadoras", "básico", "basico", "símbolos", "simbolos",
    "cartes", "ressources", "feuilles", "graphiques", "calculatrices", "symboles"
  ]);

  const VALUE_RE = /^\s*([^:]+?)\s*:\s*(-?\d+(?:\.\d+)?)\s*$/;

  function normalizeLabel(value) {
    return String(value || "").trim().toLowerCase();
  }

  function updateChip(element) {
    if (!(element instanceof HTMLElement) || element.children.length) return;
    const match = VALUE_RE.exec(String(element.textContent || ""));
    if (!match) {
      if (element.dataset.inspectorSummaryZeroHidden === "1") {
        element.hidden = false;
        delete element.dataset.inspectorSummaryZeroHidden;
      }
      return;
    }

    const label = normalizeLabel(match[1]);
    if (!LABELS.has(label)) return;

    const value = Number(match[2]);
    if (Number.isFinite(value) && value < 1) {
      element.hidden = true;
      element.dataset.inspectorSummaryZeroHidden = "1";
    } else if (element.dataset.inspectorSummaryZeroHidden === "1") {
      element.hidden = false;
      delete element.dataset.inspectorSummaryZeroHidden;
    }
  }

  function apply(root = document) {
    const modals = [];
    if (root === document) {
      modals.push(...document.querySelectorAll(".inspector-modal"));
    } else {
      if (root.matches?.(".inspector-modal")) modals.push(root);
      modals.push(...(root.querySelectorAll?.(".inspector-modal") || []));
      const parentModal = root.closest?.(".inspector-modal");
      if (parentModal) modals.push(parentModal);
    }

    for (const modal of new Set(modals)) {
      for (const element of modal.querySelectorAll("span, button, strong, div")) {
        updateChip(element);
      }
    }
  }

  let scheduled = false;
  let pendingRoot = document;
  function schedule(root = document) {
    pendingRoot = root || document;
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const target = pendingRoot;
      pendingRoot = document;
      apply(target);
    });
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "characterData") {
        const parent = record.target.parentElement;
        if (parent) schedule(parent);
        continue;
      }
      for (const node of record.addedNodes) {
        if (node instanceof Element) schedule(node);
      }
    }
  });

  function start() {
    apply(document);
    if (document.body) observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
