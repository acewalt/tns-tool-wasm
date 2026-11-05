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

  const CLOSE_TERMS = ["close", "cerrar", "fermer"];

  function norm(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function currentLanguage() {
    const active = document.querySelector("#language-buttons button.active[data-lang]")?.dataset.lang;
    const lang = String(active || document.documentElement.lang || "en").slice(0, 2).toLowerCase();
    return ["es", "fr"].includes(lang) ? lang : "en";
  }

  function mathLabels() {
    const lang = currentLanguage();
    const labels = {
      en: {
        math: "Math entry",
        on: "ON",
        off: "OFF",
        templates: "Templates",
        catalog: "Catalog",
        edit: "Editable TI syntax",
        hint: "Use ← →, Backspace or Delete to edit anywhere",
        preview: "Optimized mathematical view"
      },
      es: {
        math: "Entrada matemática",
        on: "ON",
        off: "OFF",
        templates: "Plantillas",
        catalog: "Catálogo",
        edit: "Sintaxis TI editable",
        hint: "Usa ← →, Backspace o Delete para editar en cualquier posición",
        preview: "Vista matemática optimizada"
      },
      fr: {
        math: "Saisie mathématique",
        on: "ON",
        off: "OFF",
        templates: "Modèles",
        catalog: "Catalogue",
        edit: "Syntaxe TI modifiable",
        hint: "Utilisez ← →, Retour arrière ou Suppr pour modifier partout",
        preview: "Vue mathématique optimisée"
      }
    };
    return labels[lang] || labels.en;
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
      if (CLOSE_TERMS.includes(text)) closeCount += 1;
    }

    if (known < 2) return -1;
    return known * 10 + closeCount;
  }

  function findActionRow(modal) {
    const copy = modal.querySelector("#love-preview-copy-content,#lua-preview-copy-content");
    const row = copy?.closest(".modal-actions");
    if (row) return row;
    let best = null;
    let bestScore = -1;
    const candidates = [modal, ...modal.querySelectorAll("div, footer, section")];

    for (const candidate of candidates) {
      if (candidate.classList?.contains("preview-controls")) continue;
      const score = actionScore(candidate);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    return bestScore >= 20 ? best : null;
  }

  function hideDuplicateClose(actionRow) {
    if (!actionRow) return;
    for (const button of directButtons(actionRow)) {
      if (!CLOSE_TERMS.includes(norm(button.textContent))) continue;
      button.hidden = true;
      button.classList.add("love-preview-side-close-hidden");
      button.setAttribute("aria-hidden", "true");
      button.tabIndex = -1;
    }
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

  function dispatchCanvasKey(canvas, key) {
    if (!canvas) return;
    const options = { key, bubbles: true, cancelable: true, composed: true };
    canvas.dispatchEvent(new KeyboardEvent("keydown", options));
    canvas.dispatchEvent(new KeyboardEvent("keyup", options));
  }

  function cleanLiveSource(source) {
    const text = String(source?.textContent || "").trim();
    return text === "—" ? "" : text;
  }

  function setupEditableMathEntry(modal) {
    const host = modal.querySelector(".love-preview-live-math");
    const canvas = modal.querySelector("#love-preview-canvas,#lua-preview-canvas");
    const source = host?.querySelector(".lpm-source code");
    const pretty = host?.querySelector(".lpm-pretty");
    if (!host || !canvas || !source || !pretty) return false;
    if (host.querySelector(".love-preview-math-editor")) return true;

    const labels = mathLabels();
    const editor = document.createElement("div");
    editor.className = "love-preview-math-editor";
    editor.innerHTML = `
      <div class="love-preview-math-editor-head">
        <strong>${labels.edit}</strong>
        <span>${labels.hint}</span>
      </div>
      <input class="love-preview-math-editor-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="${labels.edit}">
      <div class="love-preview-math-preview-label">${labels.preview}</div>
    `;
    host.insertBefore(editor, pretty);

    const input = editor.querySelector(".love-preview-math-editor-input");
    const state = {
      last: cleanLiveSource(source),
      syncing: false,
      composing: false
    };
    input.value = state.last;

    const refreshFromPreview = (force = false) => {
      if (state.syncing || state.composing) return;
      if (!force && document.activeElement === input) return;
      const next = cleanLiveSource(source);
      if (next === state.last && input.value === next) return;
      state.last = next;
      input.value = next;
      if (force) input.setSelectionRange(next.length, next.length);
    };

    const syncToPreview = () => {
      if (state.composing) return;
      const next = input.value;
      const previous = state.last;
      if (next === previous) return;

      let prefix = 0;
      const max = Math.min(previous.length, next.length);
      while (prefix < max && previous[prefix] === next[prefix]) prefix += 1;

      state.syncing = true;

      // The TI ScriptApp field does not need an internal movable caret here.
      // Rebuild only the changed suffix from the end, so the external editor
      // can still offer a normal browser caret anywhere in the expression.
      for (let i = previous.length; i > prefix; i -= 1) {
        dispatchCanvasKey(canvas, "Backspace");
      }
      for (const ch of next.slice(prefix)) {
        dispatchCanvasKey(canvas, ch);
      }

      state.last = next;
      queueMicrotask(() => {
        state.syncing = false;
      });
    };

    input.addEventListener("compositionstart", () => {
      state.composing = true;
    });
    input.addEventListener("compositionend", () => {
      state.composing = false;
      syncToPreview();
    });
    input.addEventListener("input", syncToPreview);
    input.addEventListener("keydown", event => {
      event.stopPropagation();
      if (event.key === "Enter") {
        event.preventDefault();
        dispatchCanvasKey(canvas, "Enter");
      }
    });

    const refreshLater = () => window.setTimeout(() => refreshFromPreview(false), 0);
    canvas.addEventListener("keydown", refreshLater, false);
    canvas.addEventListener("click", refreshLater, false);

    editor.addEventListener("click", event => event.stopPropagation());
    modal.classList.add("love-preview-editable-math-ready");
    return true;
  }

  function setMathEntryEnabled(modal, enabled) {
    const host = modal.querySelector(".love-preview-live-math");
    const button = modal.querySelector(".love-preview-math-entry-toggle");
    if (!host || !button) return;

    const labels = mathLabels();
    const value = Boolean(enabled);
    modal.dataset.loveMathEntryEnabled = value ? "true" : "false";
    host.hidden = !value;
    host.classList.toggle("love-preview-math-entry-hidden", !value);
    button.setAttribute("aria-pressed", value ? "true" : "false");
    button.dataset.enabled = value ? "true" : "false";
    button.textContent = `${labels.math}: ${value ? labels.on : labels.off}`;
    button.title = value ? `${labels.math}: ${labels.on}` : `${labels.math}: ${labels.off}`;

    if (value) {
      setupEditableMathEntry(modal);
      const input = host.querySelector(".love-preview-math-editor-input");
      const source = host.querySelector(".lpm-source code");
      if (input && source && document.activeElement !== input) {
        const text = cleanLiveSource(source);
        input.value = text;
        input.setSelectionRange(text.length, text.length);
      }
    }
  }

  function setupMathTools(modal, rightActions) {
    // Calculator already has its own editable MathPrint entry and palettes.
    if (modal.querySelector('#love-calculator-composer')) return true;
    const host = modal.querySelector(".love-preview-live-math");
    const templatesButton = modal.querySelector(".lpm-toggle");
    const templatesPanel = modal.querySelector(".lpm-panel");
    const actionRow = rightActions?.querySelector(".love-preview-side-action-row");
    if (!host || !templatesButton || !actionRow) return false;

    const labels = mathLabels();

    let icons = actionRow.querySelector(".love-preview-tool-icons");
    if (!icons) {
      icons = document.createElement("div");
      icons.className = "love-preview-tool-icons";
      actionRow.appendChild(icons);
    }

    templatesButton.classList.remove("green-tool-button");
    templatesButton.classList.add("love-preview-side-tool-button", "love-preview-templates-toggle");
    templatesButton.replaceChildren();
    templatesButton.classList.add("ti-math-icon-button");
    templatesButton.setAttribute("aria-label", labels.templates);
    templatesButton.title = labels.templates;
    if (templatesButton.parentNode !== icons) icons.appendChild(templatesButton);

    let catalog = icons.querySelector(".love-preview-catalog-toggle");
    if (!catalog) {
      catalog = document.createElement("button");
      catalog.type = "button";
      catalog.className = "love-preview-side-tool-button ti-math-icon-button love-preview-catalog-toggle";
      icons.appendChild(catalog);
      catalog.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        window.TnsMathTools?.openCatalog({
          anchor: catalog,
          insert: text => window.TnsLovePreviewLiveMath?.insert(modal, text)
        });
      });
    }
    catalog.setAttribute("aria-label", labels.catalog);
    catalog.title = labels.catalog;

    if (templatesPanel && templatesPanel.parentNode !== actionRow) {
      actionRow.appendChild(templatesPanel);
    }

    let mathButton = actionRow.querySelector(".love-preview-math-entry-toggle");
    if (!mathButton) {
      mathButton = document.createElement("button");
      mathButton.type = "button";
      mathButton.className = "love-preview-side-tool-button love-preview-math-entry-toggle";
      actionRow.appendChild(mathButton);
      mathButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        setMathEntryEnabled(modal, modal.dataset.loveMathEntryEnabled !== "true");
      });
    }

    setupEditableMathEntry(modal);

    if (!modal.dataset.loveMathEntryEnabled) {
      modal.dataset.loveMathEntryEnabled = "false";
    }
    setMathEntryEnabled(modal, modal.dataset.loveMathEntryEnabled === "true");
    modal.classList.add("love-preview-side-math-tools-ready");
    return true;
  }

  function setupWorkspace(modal, stage, controls) {
    // Reuse the common display anchor instead of nesting a second workspace.
    const shared = modal.querySelector(".preview-window-body");
    if (shared) {
      shared.classList.add("love-preview-side-workspace");
      shared.querySelector(":scope > .preview-window-left")?.classList.add("love-preview-side-keys");
      shared.querySelector(":scope > .preview-window-center")?.classList.add("love-preview-side-center");
      shared.querySelector(":scope > .preview-window-right")?.classList.add("love-preview-side-actions");
    }
    let workspace = modal.querySelector(".love-preview-side-workspace");
    let leftKeys = workspace?.querySelector(":scope > .love-preview-side-keys") || null;
    let center = workspace?.querySelector(":scope > .love-preview-side-center") || null;
    let rightActions = workspace?.querySelector(":scope > .love-preview-side-actions") || null;

    if (!workspace) {
      workspace = document.createElement("div");
      workspace.className = "love-preview-side-workspace";

      leftKeys = document.createElement("aside");
      leftKeys.className = "love-preview-side-keys";
      leftKeys.setAttribute("aria-label", "Preview navigation controls");

      center = document.createElement("div");
      center.className = "love-preview-side-center";

      rightActions = document.createElement("aside");
      rightActions.className = "love-preview-side-actions";
      rightActions.setAttribute("aria-label", "Preview actions");

      stage.parentNode.insertBefore(workspace, stage);
      workspace.appendChild(leftKeys);
      workspace.appendChild(center);
      workspace.appendChild(rightActions);
    } else {
      if (!leftKeys) {
        leftKeys = document.createElement("aside");
        leftKeys.className = "love-preview-side-keys";
        leftKeys.setAttribute("aria-label", "Preview navigation controls");
        workspace.insertBefore(leftKeys, workspace.firstChild);
      }
      if (!center) {
        center = document.createElement("div");
        center.className = "love-preview-side-center";
        workspace.appendChild(center);
      }
      if (!rightActions) {
        rightActions = document.createElement("aside");
        rightActions.className = "love-preview-side-actions";
        rightActions.setAttribute("aria-label", "Preview actions");
        workspace.appendChild(rightActions);
      }
    }

    if (stage.parentNode !== center) center.appendChild(stage);
    if (controls.parentNode !== leftKeys) leftKeys.appendChild(controls);

    let actionRow = rightActions.querySelector(".love-preview-side-action-row");
    if (!actionRow) {
      actionRow = findActionRow(modal);
      if (actionRow) {
        actionRow.classList.add("love-preview-side-action-row");
        hideDuplicateClose(actionRow);
        rightActions.appendChild(actionRow);
      }
    } else {
      hideDuplicateClose(actionRow);
    }

    setupMathTools(modal, rightActions);

    workspace.classList.toggle("is-expanded", stage.classList.contains("expanded-view"));
    modal.classList.add("love-preview-side-ui-ready");
  }

  function enhanceModal(modal) {
    const stage = modal?.querySelector(".love-preview-stage,.lua-preview-calculator");
    const controls = modal?.querySelector(".preview-controls");
    if (!stage || !controls) return false;

    setupKeys(controls);
    setupWorkspace(modal, stage, controls);
    window.TnsLovePreviewLiveMath?.enhanceModal?.(modal);
    return true;
  }

  function enhanceAll() {
    let count = 0;
    for (const modal of document.querySelectorAll(".love-preview-modal,.lua-preview-modal")) {
      if (enhanceModal(modal)) count += 1;
    }
    return count;
  }

  let retryGeneration = 0;
  function scheduleBoundedRefresh() {
    const generation = ++retryGeneration;
    const delays = [0, 40, 120, 300, 700, 1050];

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

    // Observe only the body and each backdrop's direct children. Preview logs
    // and canvases update deeply inside a modal and do not trigger this watcher.
    const backdrops = new Map();
    const isBackdrop = node => node?.nodeType === 1 && node.matches(".modal-backdrop,.prgm-preview-overlay,.preview-window-backdrop");
    const watchBackdrop = node => {
      if (!isBackdrop(node) || backdrops.has(node)) return;
      const observer = new MutationObserver(() => enhanceAll());
      observer.observe(node, { childList: true });
      backdrops.set(node, observer);
    };
    const watchBody = () => {
      for (const node of document.body.children) watchBackdrop(node);
      const observer = new MutationObserver(records => {
        for (const record of records) {
          for (const node of record.removedNodes) {
            backdrops.get(node)?.disconnect();
            backdrops.delete(node);
          }
          for (const node of record.addedNodes) watchBackdrop(node);
        }
        enhanceAll();
      });
      observer.observe(document.body, { childList: true });
      enhanceAll();
    };
    document.addEventListener("click", event => {
      const button = event.target?.closest?.("button");
      if (isPreviewOpenButton(button) || button?.closest?.(".love-preview-modal,.lua-preview-modal")) {
        scheduleBoundedRefresh();
      }
    });

    window.TnsLovePreviewSideControls = {
      version: "20261104-preview-tools-v30",
      refresh: enhanceAll,
      enhanceModal,
      setMathEntryEnabled
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", watchBody, { once: true });
    } else {
      watchBody();
    }
  }
})();
