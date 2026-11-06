(() => {
  "use strict";

  const PATCH_FLAG = "__tnsSearchAdapterFixed";

  function augmentAdapter(adapter) {
    if (!adapter || adapter.__tnsSearchAdapterReady) return adapter;
    adapter.__tnsSearchAdapterReady = true;

    if (!("value" in adapter)) {
      Object.defineProperty(adapter, "value", {
        configurable: true,
        enumerable: false,
        get() {
          return typeof adapter.getValue === "function" ? adapter.getValue() : "";
        },
        set(value) {
          if (typeof adapter.setValue === "function") adapter.setValue(String(value ?? ""));
        },
      });
    }

    if (!("selectionStart" in adapter)) {
      Object.defineProperty(adapter, "selectionStart", {
        configurable: true,
        enumerable: false,
        get() {
          return Number(adapter.getSelectionOffsets?.().start || 0);
        },
      });
    }

    if (!("selectionEnd" in adapter)) {
      Object.defineProperty(adapter, "selectionEnd", {
        configurable: true,
        enumerable: false,
        get() {
          return Number(adapter.getSelectionOffsets?.().end || 0);
        },
      });
    }

    if (typeof adapter.addEventListener !== "function") {
      adapter.addEventListener = (type, callback) => {
        if (type === "input" && typeof adapter.onInput === "function") {
          return adapter.onInput(() => callback({ type: "input", target: adapter }));
        }
        return { dispose() {} };
      };
    }

    return adapter;
  }

  function patchApi() {
    const api = window.TnsMonacoEditor;
    if (!api || api[PATCH_FLAG]) return false;
    api[PATCH_FLAG] = true;

    for (const name of ["createLuaEditor", "createTextEditor", "createPythonEditor", "createTiEditor"]) {
      const original = api[name];
      if (typeof original !== "function") continue;
      api[name] = function (...args) {
        return augmentAdapter(original.apply(this, args));
      };
    }

    api.createPythonEditor = function (container, options = {}) {
      return api.createTextEditor(container, { ...options, language: "python" });
    };

    api.createTiEditor = function (container, options = {}) {
      return api.createTextEditor(container, { ...options, language: "ti-basic" });
    };

    return true;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function compileMatcher(query, state) {
    if (!query) return null;
    try {
      let source = state.regex
        ? query
        : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (state.whole) source = `\\b(?:${source})\\b`;
      return new RegExp(source, state.caseSensitive ? "g" : "gi");
    } catch (_error) {
      return null;
    }
  }

  function findMatches(text, query, state) {
    const regex = compileMatcher(query, state);
    if (!regex) return [];
    const matches = [];
    let match;
    while ((match = regex.exec(text))) {
      if (!match[0].length) {
        regex.lastIndex += 1;
        continue;
      }
      const before = text.slice(0, match.index);
      const line = before.split("\n").length;
      const lineStart = before.lastIndexOf("\n") + 1;
      const lineEndRaw = text.indexOf("\n", match.index);
      const lineEnd = lineEndRaw < 0 ? text.length : lineEndRaw;
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0],
        line,
        lineStart,
        snippet: text.slice(lineStart, lineEnd),
      });
      if (matches.length >= 5000) break;
    }
    return matches;
  }

  function selectedText(adapter) {
    const start = Number(adapter.selectionStart || 0);
    const end = Number(adapter.selectionEnd || 0);
    if (end <= start) return "";
    return String(adapter.value || "").slice(start, end);
  }

  function decorateStatic(container, adapter) {
    if (!container || !adapter) return false;
    if (container.querySelector(".tns-monaco-search-rail")) return true;

    container.classList.add("tns-monaco-search-host");

    const rail = document.createElement("div");
    rail.className = "tns-monaco-search-rail";
    rail.innerHTML = `
      <button type="button" class="tns-monaco-search-toggle" title="Buscar en este archivo (Ctrl+F)" aria-label="Buscar">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path></svg>
      </button>`;

    const panel = document.createElement("div");
    panel.className = "tns-monaco-search-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="tns-monaco-search-head">
        <div class="tns-monaco-search-input-wrap">
          <input class="tns-monaco-search-input" type="text" autocomplete="off" spellcheck="false" placeholder="Search">
          <button type="button" class="tns-monaco-search-opt" data-opt="case" title="Coincidir mayúsculas/minúsculas">Aa</button>
          <button type="button" class="tns-monaco-search-opt" data-opt="whole" title="Palabra completa">ab</button>
          <button type="button" class="tns-monaco-search-opt" data-opt="regex" title="Expresión regular">.*</button>
        </div>
        <button type="button" class="tns-monaco-search-icon-btn" data-action="prev" title="Anterior">↑</button>
        <button type="button" class="tns-monaco-search-icon-btn" data-action="next" title="Siguiente">↓</button>
        <button type="button" class="tns-monaco-search-icon-btn" data-action="close" title="Cerrar">×</button>
      </div>
      <div class="tns-monaco-search-meta">
        <button type="button" class="tns-monaco-search-icon-btn" data-action="toggle-replace" title="Mostrar reemplazo">▾</button>
        <span>Resultados</span>
        <span class="tns-monaco-search-count">0 resultados</span>
      </div>
      <div class="tns-monaco-replace-row" hidden>
        <input class="tns-monaco-replace-input" type="text" autocomplete="off" spellcheck="false" placeholder="Replace">
        <button type="button" class="tns-monaco-replace-btn" data-action="replace-one">Replace</button>
        <button type="button" class="tns-monaco-replace-btn" data-action="replace-all">All</button>
      </div>
      <div class="tns-monaco-search-results"></div>`;

    container.append(panel, rail);

    const toggle = rail.querySelector(".tns-monaco-search-toggle");
    const input = panel.querySelector(".tns-monaco-search-input");
    const replaceInput = panel.querySelector(".tns-monaco-replace-input");
    const replaceRow = panel.querySelector(".tns-monaco-replace-row");
    const count = panel.querySelector(".tns-monaco-search-count");
    const resultsEl = panel.querySelector(".tns-monaco-search-results");
    const state = {
      caseSensitive: false,
      whole: false,
      regex: false,
      matches: [],
      current: -1,
    };

    function renderResults() {
      const total = state.matches.length;
      count.textContent = total ? `${state.current + 1} / ${total}` : "0 resultados";
      if (!total) {
        resultsEl.innerHTML = `<div class="tns-monaco-search-empty">${input.value ? "Sin coincidencias" : "Escribe para buscar en el archivo"}</div>`;
        return;
      }

      resultsEl.innerHTML = state.matches.slice(0, 300).map((match, index) => {
        const relativeStart = Math.max(0, match.start - match.lineStart);
        const relativeEnd = relativeStart + match.text.length;
        const before = match.snippet.slice(0, relativeStart);
        const hit = match.snippet.slice(relativeStart, relativeEnd);
        const after = match.snippet.slice(relativeEnd);
        return `<button type="button" class="tns-monaco-search-result${index === state.current ? " active" : ""}" data-match="${index}">
          <span class="tns-monaco-search-line">${match.line}</span>
          <span class="tns-monaco-search-snippet">${escapeHtml(before)}<span class="tns-monaco-search-mark">${escapeHtml(hit)}</span>${escapeHtml(after)}</span>
        </button>`;
      }).join("");

      resultsEl.querySelector(".active")?.scrollIntoView({ block: "nearest" });
    }

    function refresh(keepCurrent = false) {
      state.matches = findMatches(String(adapter.value || ""), input.value, state);
      if (!state.matches.length) {
        state.current = -1;
      } else if (!keepCurrent || state.current < 0 || state.current >= state.matches.length) {
        state.current = 0;
      }
      renderResults();
    }

    function selectMatch(index, refocus = true) {
      if (!state.matches.length) return;
      state.current = (index + state.matches.length) % state.matches.length;
      const match = state.matches[state.current];
      adapter.setSelectionRange(match.start, match.end);
      if (refocus) adapter.focus();
      renderResults();
    }

    function openSearch(seedSelection = true) {
      panel.hidden = false;
      toggle.classList.add("active");
      if (seedSelection && !input.value) {
        const selected = selectedText(adapter);
        if (selected && !selected.includes("\n") && selected.length <= 120) input.value = selected;
      }
      refresh();
      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    }

    function closeSearch() {
      panel.hidden = true;
      toggle.classList.remove("active");
      adapter.focus();
    }

    function replaceCurrent() {
      if (!state.matches.length || state.current < 0) return;
      const match = state.matches[state.current];
      const text = String(adapter.value || "");
      adapter.value = text.slice(0, match.start) + replaceInput.value + text.slice(match.end);
      refresh();
      if (state.matches.length) selectMatch(Math.min(state.current, state.matches.length - 1));
    }

    function replaceAll() {
      const regex = compileMatcher(input.value, state);
      if (!regex) return;
      adapter.value = String(adapter.value || "").replace(regex, replaceInput.value);
      refresh();
      adapter.focus();
    }

    toggle.addEventListener("click", () => panel.hidden ? openSearch() : closeSearch());
    input.addEventListener("input", () => refresh());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        selectMatch(state.current + (event.shiftKey ? -1 : 1));
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
      }
    });
    replaceInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        replaceCurrent();
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeSearch();
      }
    });

    panel.addEventListener("click", (event) => {
      const opt = event.target.closest("[data-opt]");
      if (opt) {
        const key = opt.dataset.opt;
        if (key === "case") state.caseSensitive = !state.caseSensitive;
        if (key === "whole") state.whole = !state.whole;
        if (key === "regex") state.regex = !state.regex;
        opt.classList.toggle("active", key === "case" ? state.caseSensitive : state[key]);
        refresh();
        input.focus();
        return;
      }

      const result = event.target.closest("[data-match]");
      if (result) {
        selectMatch(Number(result.dataset.match));
        return;
      }

      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "prev") selectMatch(state.current - 1);
      else if (action === "next") selectMatch(state.current + 1);
      else if (action === "close") closeSearch();
      else if (action === "toggle-replace") {
        replaceRow.hidden = !replaceRow.hidden;
        event.target.textContent = replaceRow.hidden ? "▾" : "▴";
        if (!replaceRow.hidden) replaceInput.focus();
      } else if (action === "replace-one") replaceCurrent();
      else if (action === "replace-all") replaceAll();
    });

    container.addEventListener("keydown", (event) => {
      const mod = event.ctrlKey || event.metaKey;
      const key = String(event.key).toLowerCase();
      if (mod && !event.altKey && key === "f") {
        event.preventDefault();
        event.stopPropagation();
        openSearch(true);
      } else if (mod && !event.altKey && key === "h") {
        event.preventDefault();
        event.stopPropagation();
        openSearch(true);
        replaceRow.hidden = false;
        panel.querySelector('[data-action="toggle-replace"]').textContent = "▴";
        requestAnimationFrame(() => replaceInput.focus());
      }
    }, true);

    adapter.addEventListener?.("input", () => {
      if (!panel.hidden && input.value) refresh(true);
    });

    return true;
  }

  function getStaticAdapters() {
    try {
      // app.js declares this as a top-level const. Direct eval can resolve
      // global lexical bindings even though they are not window properties.
      return eval("codeEditorAdapters");
    } catch (_error) {
      return null;
    }
  }

  function installStaticSearch() {
    const adapters = getStaticAdapters();
    if (!adapters?.get) return false;

    let installed = false;
    const targets = [
      ["#xml-code", "#xml-editor-wrap"],
      ["#py-code", "#py-code-wrap"],
    ];

    for (const [selector, wrapSelector] of targets) {
      const adapter = adapters.get(selector);
      const wrap = document.querySelector(wrapSelector);
      if (!adapter || !wrap) continue;
      installed = decorateStatic(wrap, adapter) || installed;
    }
    return installed;
  }

  if (!patchApi()) {
    window.addEventListener("tns-monaco-ready", () => {
      patchApi();
      setTimeout(installStaticSearch, 0);
    }, { once: true });
  }

  const retryDelays = [0, 50, 150, 350, 750, 1500];
  for (const delay of retryDelays) {
    setTimeout(installStaticSearch, delay);
  }

  document.addEventListener("DOMContentLoaded", () => {
    installStaticSearch();
    setTimeout(installStaticSearch, 100);
  }, { once: true });
})();
