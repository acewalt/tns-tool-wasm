(() => {
  "use strict";

  const INSTALLED = "data-love-preview-side-controls-installed";

  const KEY_ALIASES = {
    up: ["up", "arriba", "haut"],
    down: ["down", "abajo", "bas"],
    left: ["left", "izquierda", "gauche"],
    right: ["right", "derecha", "droite"],
    space: ["space", "espacio", "espace"],
    enter: ["enter", "entrar", "intro", "entree"],
    esc: ["esc", "escape", "echap"]
  };

  const ARROWS = { up: "↑", down: "↓", left: "←", right: "→" };

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
    if (!controls || controls.classList.contains("love-preview-keyboard-controls")) return;

    const found = new Map();
    for (const button of controls.querySelectorAll("button")) {
      const key = keyName(button);
      if (key && !found.has(key)) found.set(key, button);
    }

    if (!["up", "down", "left", "right"].every(key => found.has(key))) return;

    const dpad = document.createElement("div");
    dpad.className = "love-preview-dpad";

    const aux = document.createElement("div");
    aux.className = "love-preview-aux-keys";

    for (const key of ["up", "left", "down", "right"]) {
      const button = found.get(key);
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

    controls.appendChild(dpad);
    if (aux.children.length) controls.appendChild(aux);
    controls.classList.add("love-preview-keyboard-controls");
  }

  function setupWorkspace(modal, stage, controls) {
    let workspace = modal.querySelector(".love-preview-side-workspace");
    let center = workspace?.querySelector(":scope > .love-preview-side-center") || null;
    let side = workspace?.querySelector(":scope > .love-preview-side-actions") || null;

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
    }

    if (!center || !side) return;

    if (stage.parentNode !== center) center.appendChild(stage);
    if (controls.parentNode !== center) center.appendChild(controls);

    if (!side.querySelector(".love-preview-side-action-row")) {
      const actionRow = findActionRow(modal);
      if (actionRow) {
        actionRow.classList.add("love-preview-side-action-row");
        side.appendChild(actionRow);
      }
    }

    workspace.classList.toggle("is-expanded", stage.classList.contains("expanded-view"));
    modal.classList.add("love-preview-side-ui-ready");
  }

  function enhanceModal(modal) {
    const stage = modal?.querySelector(".love-preview-stage");
    const controls = modal?.querySelector(".preview-controls");
    if (!stage || !controls) return false;

    setupKeys(controls);
    setupWorkspace(modal, stage, controls);
    return true;
  }

  function enhanceAll() {
    let count = 0;
    for (const modal of document.querySelectorAll(".love-preview-modal")) {
      if (enhanceModal(modal)) count += 1;
    }
    return count;
  }

  let retryGeneration = 0;
  function scheduleBoundedRefresh() {
    const generation = ++retryGeneration;
    const delays = [0, 40, 120, 300];

    for (const delay of delays) {
      window.setTimeout(() => {
        if (generation !== retryGeneration) return;
        enhanceAll();
      }, delay);
    }
  }

  function isPreviewOpenButton(button) {
    if (!button) return false;
    const text = norm(button.textContent || button.getAttribute("aria-label") || button.title);
    return text.includes("preview") && text.includes("love");
  }

  if (!document.documentElement.hasAttribute(INSTALLED)) {
    document.documentElement.setAttribute(INSTALLED, "1");

    // IMPORTANT: do not watch the whole document with MutationObserver.
    // Preview LÖVE updates snapshots/log DOM frequently; observing every
    // child/class mutation can create a feedback loop and freeze the tab.
    // Instead we enhance only after the user opens/interacts with the preview,
    // using a short bounded retry window for asynchronously-created modal DOM.
    document.addEventListener("click", event => {
      const button = event.target?.closest?.("button");
      if (isPreviewOpenButton(button) || button?.closest?.(".love-preview-modal")) {
        scheduleBoundedRefresh();
      }
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", enhanceAll, { once: true });
    } else {
      enhanceAll();
    }

    window.TnsLovePreviewSideControls = {
      version: "20260903-side-controls-v2-hotfix",
      refresh: enhanceAll
    };
  }
})();
