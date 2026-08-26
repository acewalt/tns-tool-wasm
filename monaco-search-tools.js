(() => {
  "use strict";

  const STYLE_ID = "tns-monaco-search-tools-style";
  const PATCH_FLAG = "__tnsSearchToolsPatched";
  const CONTEXT_CLASS = "tns-monaco-context-menu";
  let activeContextMenu = null;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .tns-monaco-search-host { position: relative !important; }
      .tns-monaco-search-rail {
        position:absolute; z-index:35; top:6px; right:6px; width:38px;
        display:flex; flex-direction:column; align-items:center; gap:6px; pointer-events:auto;
      }
      .tns-monaco-search-toggle {
        width:34px; height:34px; border:1px solid rgba(148,163,184,.35); border-radius:9px;
        background:rgba(15,23,42,.94); color:#dbeafe; display:grid; place-items:center;
        padding:0; cursor:pointer; box-shadow:0 5px 16px rgba(0,0,0,.28);
      }
      .tns-monaco-search-toggle:hover, .tns-monaco-search-toggle.active { background:#1d4f7a; border-color:#65a9e8; }
      .tns-monaco-search-toggle svg { width:18px; height:18px; stroke:currentColor; fill:none; stroke-width:2; }
      .tns-monaco-search-panel {
        position:absolute; z-index:34; top:6px; right:49px; width:min(330px,calc(100% - 66px));
        max-height:calc(100% - 12px); overflow:hidden; border:1px solid rgba(71,94,128,.7);
        border-radius:10px; background:rgba(9,18,34,.98); color:#d7e5f7;
        box-shadow:0 14px 38px rgba(0,0,0,.42); display:flex; flex-direction:column;
      }
      .tns-monaco-search-panel[hidden] { display:none !important; }
      .tns-monaco-search-head { display:flex; align-items:center; gap:6px; padding:8px; border-bottom:1px solid rgba(71,94,128,.45); }
      .tns-monaco-search-input-wrap {
        display:flex; align-items:center; gap:3px; flex:1; min-width:0; background:#111d31;
        border:1px solid #39506f; border-radius:6px; padding:0 4px 0 8px;
      }
      .tns-monaco-search-input-wrap:focus-within { border-color:#69aaf0; box-shadow:0 0 0 1px #69aaf0; }
      .tns-monaco-search-input {
        flex:1; min-width:0; height:30px; border:0 !important; outline:0 !important;
        background:transparent !important; color:#eef6ff !important;
        font:12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; padding:0 3px !important;
      }
      .tns-monaco-search-opt, .tns-monaco-search-icon-btn {
        min-width:25px; height:25px; border:0; border-radius:5px; background:transparent;
        color:#9fb2ca; padding:0 5px; cursor:pointer; font-size:11px;
      }
      .tns-monaco-search-opt:hover, .tns-monaco-search-icon-btn:hover, .tns-monaco-search-opt.active { background:#263d59; color:#fff; }
      .tns-monaco-search-meta { display:flex; align-items:center; gap:4px; padding:6px 8px 4px; color:#8ea3bd; font-size:11px; }
      .tns-monaco-search-count { margin-left:auto; }
      .tns-monaco-replace-row { display:flex; gap:5px; padding:0 8px 7px; }
      .tns-monaco-replace-input {
        flex:1; min-width:0; height:29px; border:1px solid #39506f !important; border-radius:6px;
        outline:0; background:#111d31 !important; color:#eef6ff !important; padding:0 8px !important;
        font:12px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
      }
      .tns-monaco-replace-input:focus { border-color:#69aaf0 !important; }
      .tns-monaco-replace-btn { border:1px solid #39506f; border-radius:6px; background:#173352; color:#d7e5f7; padding:0 8px; cursor:pointer; }
      .tns-monaco-replace-btn:hover { background:#214b75; }
      .tns-monaco-search-results { overflow:auto; padding:4px 5px 7px; min-height:34px; max-height:250px; }
      .tns-monaco-search-empty { padding:10px; color:#7f93ac; font-size:12px; }
      .tns-monaco-search-result {
        width:100%; border:0; border-radius:5px; background:transparent; color:#cbd9e9; text-align:left;
        display:grid; grid-template-columns:38px minmax(0,1fr); gap:6px; padding:5px 7px; cursor:pointer;
        font:11px/1.35 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
      }
      .tns-monaco-search-result:hover, .tns-monaco-search-result.active { background:#173352; }
      .tns-monaco-search-line { color:#6f91b8; text-align:right; }
      .tns-monaco-search-snippet { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .tns-monaco-search-mark { color:#dffb8c; font-weight:700; }

      .${CONTEXT_CLASS} {
        position:fixed; z-index:100000; min-width:176px; padding:6px;
        border:1px solid rgba(96,123,157,.75); border-radius:10px;
        background:rgba(10,20,36,.985); color:#e6eef8;
        box-shadow:0 18px 46px rgba(0,0,0,.5);
        font:13px/1.25 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .${CONTEXT_CLASS} button {
        width:100%; min-height:34px; border:0; border-radius:7px; background:transparent;
        color:inherit; text-align:left; padding:7px 12px; cursor:pointer; font:inherit;
      }
      .${CONTEXT_CLASS} button:hover, .${CONTEXT_CLASS} button:focus-visible { outline:0; background:#1d3c5d; }
      .${CONTEXT_CLASS} button:disabled { opacity:.42; cursor:default; background:transparent; }
      .${CONTEXT_CLASS} .sep { height:1px; margin:5px 4px; background:rgba(148,163,184,.24); }

      .lua-edit-mobile-separator { height:1px; margin:5px 6px; background:rgba(148,163,184,.28); }
      #lua-clear-document { color:#ff9a9a !important; }
      #lua-clear-document:hover { background:rgba(190,40,40,.22) !important; }

      @media (pointer:coarse) {
        .lua-edit-menu-panel button { min-height:40px; }
        .${CONTEXT_CLASS} { min-width:210px; padding:7px; border-radius:12px; }
        .${CONTEXT_CLASS} button { min-height:44px; font-size:16px; padding:9px 14px; }
        .monaco-editor, .monaco-code-host { -webkit-touch-callout:none; }
      }
    `;
    document.head.append(style);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;",
    }[char]));
  }

  function selectedText(adapter) {
    const start = Number(adapter.selectionStart || 0);
    const end = Number(adapter.selectionEnd || 0);
    return end > start ? String(adapter.value || "").slice(start, end) : "";
  }

  function lineInfo(text, offset) {
    const before = text.slice(0, offset);
    const line = before.split("\n").length;
    const lineStart = before.lastIndexOf("\n") + 1;
    const lineEndRaw = text.indexOf("\n", offset);
    const lineEnd = lineEndRaw < 0 ? text.length : lineEndRaw;
    return { line, lineStart, lineEnd, snippet:text.slice(lineStart, lineEnd) };
  }

  function compileMatcher(query, options) {
    if (!query) return null;
    try {
      let source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (options.whole) source = `\\b(?:${source})\\b`;
      return new RegExp(source, options.caseSensitive ? "g" : "gi");
    } catch (_error) { return null; }
  }

  function findMatches(text, query, options) {
    const regex = compileMatcher(query, options);
    if (!regex) return [];
    const results = [];
    let match;
    while ((match = regex.exec(text))) {
      const value = match[0];
      if (!value.length) { regex.lastIndex += 1; continue; }
      const info = lineInfo(text, match.index);
      results.push({ start:match.index, end:match.index + value.length, text:value, ...info });
      if (results.length >= 5000) break;
    }
    return results;
  }

  async function writeClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    area.style.pointerEvents = "none";
    document.body.append(area);
    area.select();
    document.execCommand?.("copy");
    area.remove();
  }

  async function readClipboard() {
    if (navigator.clipboard?.readText) {
      try { return await navigator.clipboard.readText(); }
      catch (_error) {}
    }
    return window.prompt("Pega el texto aquí:", "");
  }

  function decorate(container, adapter) {
    if (!container || !adapter || container.dataset.tnsSearchTools === "1") return adapter;
    container.dataset.tnsSearchTools = "1";
    container.classList.add("tns-monaco-search-host");

    const rail = document.createElement("div");
    rail.className = "tns-monaco-search-rail";
    rail.innerHTML = `<button type="button" class="tns-monaco-search-toggle" title="Buscar en este archivo (Ctrl+F)" aria-label="Buscar"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="M16 16l4.5 4.5"></path></svg></button>`;

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
        <span>Resultados</span><span class="tns-monaco-search-count">0 resultados</span>
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
    const state = { caseSensitive:false, whole:false, regex:false, matches:[], current:-1 };
    const options = () => ({ caseSensitive:state.caseSensitive, whole:state.whole, regex:state.regex });

    function renderResults() {
      const total = state.matches.length;
      count.textContent = total ? `${Math.max(1,state.current + 1)} / ${total}` : "0 resultados";
      if (!total) {
        resultsEl.innerHTML = `<div class="tns-monaco-search-empty">${input.value ? "Sin coincidencias" : "Escribe para buscar en el archivo"}</div>`;
        return;
      }
      resultsEl.innerHTML = state.matches.slice(0,300).map((match,index) => {
        const relativeStart = Math.max(0,match.start - match.lineStart);
        const relativeEnd = relativeStart + match.text.length;
        const before = match.snippet.slice(0,relativeStart);
        const hit = match.snippet.slice(relativeStart,relativeEnd);
        const after = match.snippet.slice(relativeEnd);
        return `<button type="button" class="tns-monaco-search-result${index === state.current ? " active" : ""}" data-match="${index}"><span class="tns-monaco-search-line">${match.line}</span><span class="tns-monaco-search-snippet">${escapeHtml(before)}<span class="tns-monaco-search-mark">${escapeHtml(hit)}</span>${escapeHtml(after)}</span></button>`;
      }).join("");
      resultsEl.querySelector(".active")?.scrollIntoView({ block:"nearest" });
    }

    function refresh(keepCurrent = false) {
      state.matches = findMatches(String(adapter.value || ""), input.value, options());
      if (!state.matches.length) state.current = -1;
      else if (!keepCurrent || state.current < 0 || state.current >= state.matches.length) state.current = 0;
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
      requestAnimationFrame(() => { input.focus(); input.select(); });
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
      adapter.value = text.slice(0,match.start) + replaceInput.value + text.slice(match.end);
      refresh();
      if (state.matches.length) selectMatch(Math.min(state.current,state.matches.length - 1));
    }

    function replaceAll() {
      const regex = compileMatcher(input.value,options());
      if (!regex) return;
      adapter.value = String(adapter.value || "").replace(regex,replaceInput.value);
      refresh();
      adapter.focus();
    }

    toggle.addEventListener("click", () => panel.hidden ? openSearch() : closeSearch());
    input.addEventListener("input", () => refresh());
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); selectMatch(state.current + (event.shiftKey ? -1 : 1)); }
      else if (event.key === "Escape") { event.preventDefault(); closeSearch(); }
    });
    replaceInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); replaceCurrent(); }
      else if (event.key === "Escape") { event.preventDefault(); closeSearch(); }
    });
    panel.addEventListener("click", (event) => {
      const opt = event.target.closest("[data-opt]");
      if (opt) {
        const key = opt.dataset.opt;
        if (key === "case") state.caseSensitive = !state.caseSensitive;
        if (key === "whole") state.whole = !state.whole;
        if (key === "regex") state.regex = !state.regex;
        opt.classList.toggle("active",state[key === "case" ? "caseSensitive" : key]);
        refresh(); input.focus(); return;
      }
      const result = event.target.closest("[data-match]");
      if (result) { selectMatch(Number(result.dataset.match)); return; }
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
        event.preventDefault(); event.stopPropagation(); openSearch(true);
      } else if (mod && !event.altKey && key === "h") {
        event.preventDefault(); event.stopPropagation(); openSearch(true);
        replaceRow.hidden = false;
        panel.querySelector('[data-action="toggle-replace"]').textContent = "▴";
        requestAnimationFrame(() => replaceInput.focus());
      }
    },true);
    adapter.addEventListener?.("input", () => { if (!panel.hidden && input.value) refresh(true); });
    return adapter;
  }

  function patchApi() {
    const api = window.TnsMonacoEditor;
    if (!api || api[PATCH_FLAG]) return false;
    api[PATCH_FLAG] = true;
    installStyles();
    for (const name of ["createLuaEditor","createTextEditor"]) {
      const original = api[name];
      if (typeof original !== "function") continue;
      api[name] = function (container,...args) {
        return decorate(container,original.call(this,container,...args));
      };
    }
    return true;
  }

  function rawSelection(raw) {
    const start = Math.max(0,Number(raw?.selectionStart || 0));
    const end = Math.max(start,Number(raw?.selectionEnd || start));
    return { start,end };
  }

  function focusRawEditor(raw) {
    const wrap = raw?.closest(".lua-editor-wrap,#xml-editor-wrap,#py-code-wrap,.editor-wrap");
    const input = wrap?.querySelector(".monaco-editor textarea.inputarea");
    if (input) input.focus(); else raw?.focus?.();
  }

  function emitRawInput(raw) {
    raw?.dispatchEvent?.(new Event("input",{ bubbles:true }));
  }

  function replaceRawSelection(raw,replacement) {
    if (!raw) return;
    const value = String(raw.value || "");
    const { start,end } = rawSelection(raw);
    const text = String(replacement ?? "");
    raw.value = value.slice(0,start) + text + value.slice(end);
    const caret = start + text.length;
    raw.setSelectionRange?.(caret,caret);
    emitRawInput(raw);
    focusRawEditor(raw);
  }

  function selectWordAtCaret(raw) {
    if (!raw) return;
    const value = String(raw.value || "");
    const sel = rawSelection(raw);
    if (sel.end > sel.start || !value) return;
    const isWord = (ch) => /[A-Za-z0-9_À-ÿµλσπθΩ]/.test(ch || "");
    let left = Math.min(sel.start,value.length);
    if (!isWord(value[left]) && left > 0 && isWord(value[left - 1])) left -= 1;
    if (!isWord(value[left])) return;
    let right = left;
    while (left > 0 && isWord(value[left - 1])) left -= 1;
    while (right < value.length && isWord(value[right])) right += 1;
    if (right > left) raw.setSelectionRange?.(left,right);
  }

  function closeContextMenu(refocus = false) {
    if (!activeContextMenu) return;
    const { menu,raw } = activeContextMenu;
    menu.remove();
    activeContextMenu = null;
    if (refocus) focusRawEditor(raw);
  }

  function positionContextMenu(menu,x,y) {
    document.body.append(menu);
    const margin = 8;
    const rect = menu.getBoundingClientRect();
    const maxX = Math.max(margin,window.innerWidth - rect.width - margin);
    const maxY = Math.max(margin,window.innerHeight - rect.height - margin);
    menu.style.left = `${Math.max(margin,Math.min(x,maxX))}px`;
    menu.style.top = `${Math.max(margin,Math.min(y,maxY))}px`;
  }

  function showContextMenu(raw,x,y,{ selectWord = false } = {}) {
    if (!raw) return;
    installStyles();
    closeContextMenu(false);
    if (selectWord) selectWordAtCaret(raw);
    const sel = rawSelection(raw);
    const hasSelection = sel.end > sel.start;
    const menu = document.createElement("div");
    menu.className = CONTEXT_CLASS;
    menu.setAttribute("role","menu");
    menu.innerHTML = `
      <button type="button" data-action="copy" ${hasSelection ? "" : "disabled"}>Copiar</button>
      <button type="button" data-action="cut" ${hasSelection ? "" : "disabled"}>Cortar</button>
      <button type="button" data-action="paste">Pegar</button>
      <div class="sep"></div>
      <button type="button" data-action="select-all">Seleccionar todo</button>`;
    menu.addEventListener("pointerdown",event => event.stopPropagation());
    menu.addEventListener("contextmenu",event => event.preventDefault());
    menu.addEventListener("click",async event => {
      const button = event.target.closest("button[data-action]");
      if (!button || button.disabled) return;
      event.preventDefault(); event.stopPropagation();
      const action = button.dataset.action;
      try {
        if (action === "copy") {
          const current = rawSelection(raw);
          await writeClipboard(String(raw.value || "").slice(current.start,current.end));
        } else if (action === "cut") {
          const current = rawSelection(raw);
          await writeClipboard(String(raw.value || "").slice(current.start,current.end));
          replaceRawSelection(raw,"");
        } else if (action === "paste") {
          const text = await readClipboard();
          if (text !== null) replaceRawSelection(raw,text);
        } else if (action === "select-all") {
          raw.setSelectionRange?.(0,String(raw.value || "").length);
        }
      } catch (error) {
        console.warn("Editor context action failed",error);
      }
      closeContextMenu(true);
    });
    positionContextMenu(menu,x,y);
    activeContextMenu = { menu,raw };
  }

  function attachContextMenu(wrap,raw) {
    if (!wrap || !raw || wrap.dataset.tnsContextMenu === "1") return false;
    wrap.dataset.tnsContextMenu = "1";
    wrap.addEventListener("contextmenu",event => {
      if (!event.target.closest(".monaco-editor,.monaco-code-host")) return;
      event.preventDefault(); event.stopPropagation();
      showContextMenu(raw,event.clientX,event.clientY,{ selectWord:true });
    },true);

    let timer = 0;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    const cancel = () => { if (timer) window.clearTimeout(timer); timer = 0; };

    wrap.addEventListener("pointerdown",event => {
      if (event.pointerType !== "touch") return;
      if (!event.target.closest(".monaco-editor,.monaco-code-host")) return;
      startX = lastX = event.clientX;
      startY = lastY = event.clientY;
      cancel();
      timer = window.setTimeout(() => {
        timer = 0;
        showContextMenu(raw,lastX,lastY,{ selectWord:true });
        try { navigator.vibrate?.(18); } catch (_error) {}
      },575);
    },true);
    wrap.addEventListener("pointermove",event => {
      if (event.pointerType !== "touch" || !timer) return;
      lastX = event.clientX; lastY = event.clientY;
      if (Math.hypot(lastX - startX,lastY - startY) > 12) cancel();
    },true);
    wrap.addEventListener("pointerup",cancel,true);
    wrap.addEventListener("pointercancel",cancel,true);
    return true;
  }

  function installContextMenus() {
    const targets = [
      ["#xml-editor-wrap","#xml-code"],
      ["#py-code-wrap","#py-code"],
      [".lua-modal .lua-editor-wrap",".lua-modal #lua-editor"],
    ];
    let installed = false;
    for (const [wrapSelector,rawSelector] of targets) {
      const wrap = document.querySelector(wrapSelector);
      const raw = document.querySelector(rawSelector);
      if (wrap && raw) installed = attachContextMenu(wrap,raw) || installed;
    }
    return installed;
  }

  function luaEditorField() {
    return document.querySelector(".lua-modal #lua-editor");
  }

  function luaToolStatus(message) {
    const log = document.querySelector(".lua-modal #lua-log");
    if (!log) return;
    const prefix = log.textContent && !log.textContent.endsWith("\n") ? "\n" : "";
    log.textContent += `${prefix}[EDIT] ${message}`;
    log.scrollTop = log.scrollHeight;
  }

  function closeLuaEditPanel() {
    const panel = document.querySelector(".lua-modal #lua-edit-menu-panel");
    if (panel) panel.hidden = true;
  }

  function makeLuaEditButton(id,label,handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = id;
    button.textContent = label;
    button.addEventListener("click",async event => {
      event.preventDefault(); event.stopPropagation();
      try { await handler(); }
      catch (error) { luaToolStatus(error?.message || String(error)); }
      closeLuaEditPanel();
    });
    return button;
  }

  function installLuaMobileEditActions() {
    installStyles();
    const panel = document.querySelector(".lua-modal #lua-edit-menu-panel");
    if (!panel || panel.dataset.mobileEditTools === "1") return false;
    panel.dataset.mobileEditTools = "1";

    const separator = document.createElement("div");
    separator.className = "lua-edit-mobile-separator";
    panel.append(separator);

    panel.append(makeLuaEditButton("lua-select-all","Seleccionar todo",() => {
      const raw = luaEditorField();
      if (!raw) return;
      raw.setSelectionRange?.(0,String(raw.value || "").length);
      focusRawEditor(raw);
      luaToolStatus("Todo el código seleccionado.");
    }));

    panel.append(makeLuaEditButton("lua-copy-selection","Copiar selección",async () => {
      const raw = luaEditorField();
      if (!raw) return;
      const sel = rawSelection(raw);
      if (sel.end <= sel.start) { luaToolStatus("No hay texto seleccionado."); return; }
      await writeClipboard(String(raw.value || "").slice(sel.start,sel.end));
      luaToolStatus("Selección copiada.");
    }));

    panel.append(makeLuaEditButton("lua-cut-selection","Cortar selección",async () => {
      const raw = luaEditorField();
      if (!raw) return;
      const sel = rawSelection(raw);
      if (sel.end <= sel.start) { luaToolStatus("No hay texto seleccionado."); return; }
      await writeClipboard(String(raw.value || "").slice(sel.start,sel.end));
      replaceRawSelection(raw,"");
      luaToolStatus("Selección cortada.");
    }));

    panel.append(makeLuaEditButton("lua-paste-selection","Pegar",async () => {
      const raw = luaEditorField();
      if (!raw) return;
      const text = await readClipboard();
      if (text === null) return;
      replaceRawSelection(raw,text);
      luaToolStatus("Texto pegado.");
    }));

    const separator2 = document.createElement("div");
    separator2.className = "lua-edit-mobile-separator";
    panel.append(separator2);

    panel.append(makeLuaEditButton("lua-clear-document","Limpiar documento",() => {
      const raw = luaEditorField();
      if (!raw) return;
      if (!window.confirm("¿Eliminar todo el código Lua de este documento?")) return;
      raw.value = "";
      raw.setSelectionRange?.(0,0);
      emitRawInput(raw);
      focusRawEditor(raw);
      luaToolStatus("Documento limpiado. Pulsa Guardar cuando quieras conservar el cambio.");
    }));
    return true;
  }

  if (!patchApi()) window.addEventListener("tns-monaco-ready",patchApi,{ once:true });

  document.addEventListener("pointerdown",event => {
    if (activeContextMenu && !event.target.closest(`.${CONTEXT_CLASS}`)) closeContextMenu(false);
  },true);
  window.addEventListener("blur",() => closeContextMenu(false));
  window.addEventListener("resize",() => closeContextMenu(false));
  document.addEventListener("scroll",() => closeContextMenu(false),true);

  const observer = new MutationObserver(() => {
    installLuaMobileEditActions();
    installContextMenus();
  });
  const startObserver = () => {
    installStyles();
    installLuaMobileEditActions();
    installContextMenus();
    if (document.body) observer.observe(document.body,{ childList:true,subtree:true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",startObserver,{ once:true });
  else startObserver();
})();
