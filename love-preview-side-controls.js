(() => {
  "use strict";

  const INSTALLED = "data-love-preview-side-controls-installed";

  const KEY_ALIASES = {
    up: ["up", "arriba", "haut"],
    down: ["down", "abajo", "bas"],
    left: ["left", "izquierda", "gauche"],
    right: ["right", "derecha", "droite"],
    space: ["space", "espacio", "espace"],
    enter: ["enter", "entrar", "intro", "entrée", "entree"],
    esc: ["esc", "escape", "échap", "echap"]
  };

  const ARROWS = {
    up: "↑",
    down: "↓",
    left: "←",
    right: "→"
  };

  const ACTION_TERMS = [
    "copy content",
    "copy ti-nspire",
    "replace with ti-nspire",
    "copiar contenido",
    "copiar ti-nspire",
    "reemplazar con ti-nspire",
    "copier le contenu",
    "copier ti-nspire",
    "remplacer par ti-nspire"
  ];

  function norm(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function keyName(button) {
    if (!button) return null;
    if (button.dataset.loveKey) return button.dataset.loveKey;

    const text = norm(button.dataset.loveOriginalLabel || button.textContent);
    for (const [key, aliases] of Object.entries(KEY_ALIASES)) {
      if (aliases.some(alias => norm(alias) === text)) return key;
    }
    return null;
  }

  function directButtons(element) {
    if (!element) return [];
    return Array.from(element.children || []).filter(child => child.tagName === "BUTTON");
  }

  function actionScore(element) {
    const buttons = directButtons(element);
    if (buttons.length < 3) return -1;

    let known = 0;
    let closeCount = 0;

    for (const button of buttons) {
      const text = norm(button.textContent);
      if (ACTION_TERMS.some(term => text.includes(norm(term)))) known += 1;
      if (["close", "cerrar", "fermer"].includes(text)) closeCount += 1;
    }

    // The Preview footer has three named actions plus Close. Requiring at
    // least two named actions prevents us from grabbing the modal header.
    if (known < 2) return -1;
    return known * 10 + closeCount;
  }

  function findActionRow(modal) {
    let best = null;
    let bestScore = -1;

    const candidates = [modal, ...modal.querySelectorAll("div, footer, section")];
    for (const candidate of candidates) {
      if (candidate.classList?.contains("preview-controls")) continue;
      if (candidate.closest(".love-preview-side-actions")) continue;
      const score = actionScore(candidate);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    return bestScore >= 20 ? best : null;
  }

  function setupKeys(controls) {
    if (!controls) return;

    let dpad = controls.querySelector(":scope > .love-preview-dpad");
    let aux = controls.querySelector(":scope > .love-preview-aux-keys");

    if (!dpad) {
      dpad = document.createElement("div");
      dpad.className = "love-preview-dpad";
    }

    if (!aux) {
      aux = document.createElement("div");
      aux.className = "love-preview-aux-keys";
    }

    const buttons = Array.from(controls.querySelectorAll("button"));
    const found = new Map();

    for (const button of buttons) {
      const key = keyName(button);
      if (!key || found.has(key)) continue;
      found.set(key, button);
    }

    for (const key of ["up", "left", "down", "right"]) {
      const button = found.get(key);
      if (!button) continue;

      if (!button.dataset.loveOriginalLabel) {
        button.dataset.loveOriginalLabel = String(button.textContent || "").trim();
      }
      button.dataset.loveKey = key;
      button.textContent = ARROWS[key];
      button.setAttribute("aria-label", button.dataset.loveOriginalLabel || key);
      button.title = button.dataset.loveOriginalLabel || key;
      dpad.appendChild(button);
    }

    for (const key of ["space", "enter", "esc"]) {
      const button = found.get(key);
      if (!button) continue;
      if (!button.dataset.loveOriginalLabel) {
        button.dataset.loveOriginalLabel = String(button.textContent || "").trim();
      }
      button.dataset.loveKey = key;
      aux.appendChild(button);
    }

    // Only switch layout after the four directions were found. This avoids
    // altering unrelated .preview-controls containers elsewhere on the page.
    if (["up", "down", "left", "right"].every(key => found.has(key))) {
      controls.classList.add("love-preview-keyboard-controls");
      if (!dpad.parentNode) controls.appendChild(dpad);
      if (!aux.parentNode && aux.children.length) controls.appendChild(aux);
    }
  }

  function setupWorkspace(modal, stage, controls) {
    let workspace = modal.querySelector(":scope .love-preview-side-workspace");
    let center;
    let side;

    if (!workspace) {
      workspace = document.createElement("div");
      workspace.className = "love-preview-side-workspace";

      center = document.createElement("div");
      center.className = "love-preview-side-center";

      side = document.createElement("aside");
      side.className = "love-preview-side-actions";
      side.setAttribute("aria-label", "Preview actions");

      stage.parentNode.insertBefore(workspace, stage);
      workspace.appendChild(center);
      workspace.appendChild(side);
    } else {
      center = workspace.querySelector(":scope > .love-preview-side-center");
      side = workspace.querySelector(":scope > .love-preview-side-actions");
    }

    if (!center || !side) return null;

    if (stage.parentNode !== center) center.appendChild(stage);
    if (controls && controls.parentNode !== center) center.appendChild(controls);

    const actionRow = findActionRow(modal);
    if (actionRow && actionRow.parentNode !== side) {
      actionRow.classList.add("love-preview-side-action-row");
      side.appendChild(actionRow);
    }

    workspace.classList.toggle("is-expanded", stage.classList.contains("expanded-view"));
    modal.classList.add("love-preview-side-ui-ready");
    return workspace;
  }

  function enhanceModal(modal) {
    if (!modal) return;

    const stage = modal.querySelector(".love-preview-stage");
    const controls = modal.querySelector(".preview-controls");
    if (!stage || !controls) return;

    setupKeys(controls);
    setupWorkspace(modal, stage, controls);
  }

  function enhanceAll() {
    document.querySelectorAll(".love-preview-modal").forEach(enhanceModal);
  }

  if (!document.documentElement.hasAttribute(INSTALLED)) {
    document.documentElement.setAttribute(INSTALLED, "1");

    const observer = new MutationObserver(() => {
      // Coalesce the many DOM writes generated while the preview snapshot is
      // refreshed. queueMicrotask keeps the control patch cheap and idempotent.
      queueMicrotask(enhanceAll);
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", enhanceAll, { once: true });
    } else {
      enhanceAll();
    }

    window.TnsLovePreviewSideControls = {
      version: "20260903-side-controls-v1",
      refresh: enhanceAll
    };
  }
})();
