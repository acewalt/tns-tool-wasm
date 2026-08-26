(() => {
  "use strict";

  const STYLE_ID = "tns-monaco-search-tools-style";
  const PATCH_FLAG = "__tnsSearchToolsPatched";

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .tns-monaco-search-host {
        position: relative !important;
      }
      .tns-monaco-search-rail {
        position: absolute;
        z-index: 35;
        top: 6px;
        right: 6px;
        width: 38px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        pointer-events: auto;
      }
      .tns-monaco-search-toggle {
        width: 34px;
        height: 34px;
        border: 1px solid rgba(148, 163, 184, .35);
        border-radius: 9px;
        background: rgba(15, 23, 42, .94);
        color: #dbeafe;
        display: grid;
        place-items: center;
        padding: 0;
        cursor: pointer;
        box-shadow: 0 5px 16px rgba(0,0,0,.28);
      }
      .tns-monaco-search-toggle:hover,
      .tns-monaco-search-toggle.active {
        background: #1d4f7a;
        border-color: #65a9e8;
      }
      .tns-monaco-search-toggle svg {
        width: 18px;
        height: 18px;
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
      }
      .tns-monaco-search-panel {
        position: absolute;
        z-index: 34;
        top: 6px;
        right: 49px;
        width: min(330px, calc(100% - 66px));
        max-height: calc(100% - 12px);
        overflow: hidden;
        border: 1px solid rgba(71, 94, 128, .7);
        border-radius: 10px;
        background: rgba(9, 18, 34, .98);
        color: #d7e5f7;
        box-shadow: 0 14px 38px rgba(0,0,0,.42);
        display: flex;
        flex-direction: column;
      }
      .tns-monaco-search-panel[hidden] { display: none !important; }
      .tns-monaco-search-head {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px;
        border-bottom: 1px solid rgba(71, 94, 128, .45);
      }
      .tns-monaco-search-input-wrap {
        display: flex;
        align-items: center;
        gap: 3px;
        flex: 1;
        min-width: 0;
        background: #111d31;
        border: 1px solid #39506f;
        border-radius: 6px;
        padding: 0 4px 0 8px;
      }
      .tns-monaco-search-input-wrap:focus-within {
        border-color: #69aaf0;
        box-shadow: 0 0 0 1px #69aaf0;
      }
      .tns-monaco-search-input {
        flex: 1;
        min-width: 0;
        height: 30px;
        border: 0 !important;
        outline: 0 !important;
        background: transparent !important;
        color: #eef6ff !important;
        font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        padding: 0 3px !important;
      }
      .tns-monaco-search-opt,
      .tns-monaco-search-icon-btn {
        min-width: 25px;
        height: 25px;
        border: 0;
        border-radius: 5px;
        background: transparent;
        color: #9fb2ca;
        padding: 0 5px;
        cursor: pointer;
        font-size: 11px;
      }
      .tns-monaco-search-opt:hover,
      .tns-monaco-search-icon-btn:hover,
      .tns-monaco-search-opt.active {
        background: #263d59;
        color: #fff;
      }
      .tns-monaco-search-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 8px 4px;
        color: #8ea3bd;
        font-size: 11px;
      }
      .tns-monaco-search-count { margin-left: auto; }
      .tns-monaco-replace-row {
        display: flex;
        gap: 5px;
        padding: 0 8px 7px;
      }
      .tns-monaco-replace-input {
        flex: 1;
        min-width: 0;
        height: 29px;
        border: 1px solid #39506f !important;
        border-radius: 6px;
        outline: 0;
        background: #111d31 !important;
        color: #eef6ff !important;
        padding: 0 8px !important;
        font: 12px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      .tns-monaco-replace-input:focus { border-color: #69aaf0 !important; }
      .tns-monaco-replace-btn {
        border: 1px solid #39506f;
        border-radius: 6px;
        background: #173352;
        color: #d7e5f7;
        padding: 0 8px;
        cursor: pointer;
      }
      .tns-monaco-replace-btn:hover { background: #214b75; }
      .tns-monaco-search-results {
        overflow: auto;
        padding: 4px 5px 7px;
        min-height: 34px;
        max-height: 250px;
      }
      .tns-monaco-search-empty {
        padding: 10px;
        color: #7f93ac;
        font-size: 12px;
      }
      .tns-monaco-search-result {
        width: 100%;
        border: 0;
        border-radius: 5px;
        background: transparent;
        color: #cbd9e9;
        text-align: left;
        display: grid;
        grid-template-columns: 38px minmax(0,1fr);
        gap: 6px;
        padding: 5px 7px;
        cursor: pointer;
        font: 11px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }
      .tns-monaco-search-result:hover,
      .tns-monaco-search-result.active {
        background: #173352;
      }
      .tns-monaco-search-line { color: #6f91b8; text-align: right; }
      .tns-monaco-search-snippet {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .tns-monaco-search-mark {
        color: #dffb8c;
        font-weight: 700;
      }
    `;
    document.head.append(style);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[char]));
  }

  function selectedText(adapter) {
    const start = Number(adapter.selectionStart || 0);
    const end = Number(adapter.selectionEnd || 0);
    if (end <= start) return "";
    return String(adapter.value || "").slice(start, end);
  }

  function lineInfo(text, offset) {
    const before = text.slice(0, offset);
    const line = before.split("\n").length;
    const lineStart = before.lastIndexOf("\n") + 1;
    const lineEndRaw = text.indexOf("\n", offset);
    const lineEnd = lineEndRaw < 0 ? text.length : lineEndRaw;
    return { line, lineStart, lineEnd, snippet: text.slice(lineStart, lineEnd) };
  }

  function compileMatcher(query, options) {
    if (!query) return null;
    try {
      let source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (options.whole) source = `\\b(?:${source})\\b`;
      return new RegExp(source, options.caseSensitive ? "g" : "gi");
    } catch (_error) {
      return null;
    }
  }

  function findMatches(text, query, options) {
    const regex = compileMatcher(query, options);
    if (!regex) return [];
    const results = [];
    let match;
    while ((match = regex.exec(text))) {
      const value = match[0];
      if (!value.length) {
        regex.lastIndex += 1;
        continue;
      }
      const info = lineInfo(text, match.index);
      results.push({
        start: match.index,
        end: match.index + value.length,
        text: value,
        ...info,
      });
      if (results.length >= 5000) break;
    }
    return results;
  }

  function decorate(container, adapter) {
    if (!container || !adapter || container.dataset.tnsSearchTools === "1") return adapter;
    container.dataset.tnsSearchTools = "1";
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
        <button type="button" class="tns-monaco-replace-btn" data-action="replace-one" title="Reemplazar actual">Replace</button>
        <button type="button" class="tns-monaco-replace-btn" data-action="replace-all" title="Reemplazar todos">All</button>
      </div>
      <div class="tns-monaco-search-results"></div>`;

    container.append(panel, rail);

    const toggle = rail.querySelector(".tns-monaco-search-toggle");
    const input = panel.querySelector(".tns-monaco-search-input");
    const replaceInput = panel.querySelector(".tns-monaco-replace-input");
    const replaceRow = panel.querySelector(".tns-monaco-replace-row");
    const count = panel.querySelector(".tns-monaco-search-count");
    const resultsEl = panel.querySelector(".tns-monaco-search-results");
    const state = { caseSensitive: false, whole: false, regex: false, matches: [], current: -1 };

    function options() {
      return { caseSensitive: state.caseSensitive, whole: state.whole, regex: state.regex };
    }

    function selectMatch(index, refocus = true) {
      if (!state.matches.length) return;
      state.current = (index + state.matches.length) % state.matches.length;
      const match = state.matches[state.current];
      adapter.setSelectionRange(match.start, match.end);
      if (refocus) adapter.focus();
      renderResults();
    }

    function renderResults() {
      const total = state.matches.length;
      count.textContent = total ? `${Math.max(1, state.current + 1)} / ${total}` : "0 resultados";
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
      const active = resultsEl.querySelector(".active");
      active?.scrollIntoView({ block: "nearest" });
    }

    function refresh(keepCurrent = false) {
      const text = String(adapter.value || "");
      state.matches = findMatches(text, input.value, options());
      if (!state.matches.length) state.current = -1;
      else if (!keepCurrent || state.current < 0 || state.current >= state.matches.length) state.current = 0;
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
      const regex = compileMatcher(input.value, options());
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
        opt.classList.toggle("active", state[key === "case" ? "caseSensitive" : key]);
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
      }
      else if (action === "replace-one") replaceCurrent();
      else if (action === "replace-all") replaceAll();
    });

    container.addEventListener("keydown", (event) => {
      const mod = event.ctrlKey || event.metaKey;
      if (mod && !event.altKey && String(event.key).toLowerCase() === "f") {
        event.preventDefault();
        event.stopPropagation();
        openSearch(true);
      } else if (mod && !event.altKey && String(event.key).toLowerCase() === "h") {
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

    return adapter;
  }

  function patchApi() {
    const api = window.TnsMonacoEditor;
    if (!api || api[PATCH_FLAG]) return false;
    api[PATCH_FLAG] = true;
    installStyles();

    for (const name of ["createLuaEditor", "createTextEditor"]) {
      const original = api[name];
      if (typeof original !== "function") continue;
      api[name] = function (container, ...args) {
        return decorate(container, original.call(this, container, ...args));
      };
    }
    return true;
  }

  if (!patchApi()) {
    window.addEventListener("tns-monaco-ready", patchApi, { once: true });
  }
})();
