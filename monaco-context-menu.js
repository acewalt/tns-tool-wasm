(() => {
  "use strict";

  const STYLE_ID = "tns-monaco-context-menu-style";
  const MENU_CLASS = "tns-monaco-context-menu";
  let activeMenu = null;

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .${MENU_CLASS} {
        position: fixed;
        z-index: 100000;
        min-width: 176px;
        padding: 6px;
        border: 1px solid rgba(96, 123, 157, .75);
        border-radius: 10px;
        background: rgba(10, 20, 36, .985);
        color: #e6eef8;
        box-shadow: 0 18px 46px rgba(0,0,0,.5);
        font: 13px/1.25 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .${MENU_CLASS}[hidden] { display: none !important; }
      .${MENU_CLASS} button {
        width: 100%;
        min-height: 34px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: inherit;
        text-align: left;
        padding: 7px 12px;
        cursor: pointer;
        font: inherit;
      }
      .${MENU_CLASS} button:hover,
      .${MENU_CLASS} button:focus-visible {
        outline: 0;
        background: #1d3c5d;
      }
      .${MENU_CLASS} button:disabled {
        opacity: .42;
        cursor: default;
        background: transparent;
      }
      .${MENU_CLASS} .sep {
        height: 1px;
        margin: 5px 4px;
        background: rgba(148,163,184,.24);
      }
      @media (pointer: coarse) {
        .${MENU_CLASS} {
          min-width: 210px;
          padding: 7px;
          border-radius: 12px;
        }
        .${MENU_CLASS} button {
          min-height: 44px;
          font-size: 16px;
          padding: 9px 14px;
        }
        .monaco-editor,
        .monaco-code-host {
          -webkit-touch-callout: none;
        }
      }
    `;
    document.head.append(style);
  }

  function rawValue(raw) {
    return String(raw?.value ?? "");
  }

  function selection(raw) {
    const start = Math.max(0, Number(raw?.selectionStart || 0));
    const end = Math.max(start, Number(raw?.selectionEnd || start));
    return { start, end };
  }

  function focusEditor(raw) {
    const wrap = raw?.closest(".lua-editor-wrap, #xml-editor-wrap, #py-code-wrap, .editor-wrap");
    const input = wrap?.querySelector(".monaco-editor textarea.inputarea");
    if (input) input.focus();
    else raw?.focus?.();
  }

  function emitInput(raw) {
    raw?.dispatchEvent?.(new Event("input", { bubbles: true }));
  }

  function replaceSelection(raw, replacement) {
    if (!raw) return;
    const value = rawValue(raw);
    const { start, end } = selection(raw);
    const text = String(replacement ?? "");
    raw.value = value.slice(0, start) + text + value.slice(end);
    const caret = start + text.length;
    raw.setSelectionRange?.(caret, caret);
    emitInput(raw);
    focusEditor(raw);
  }

  function selectWordAtCaret(raw) {
    if (!raw) return;
    const value = rawValue(raw);
    const { start, end } = selection(raw);
    if (end > start || !value) return;
    let left = Math.min(start, value.length);
    let right = left;
    const isWord = (ch) => /[A-Za-z0-9_À-ÿµλσπθΩ]/.test(ch || "");
    if (!isWord(value[left]) && left > 0 && isWord(value[left - 1])) left -= 1;
    if (!isWord(value[left])) return;
    while (left > 0 && isWord(value[left - 1])) left -= 1;
    right = Math.max(right, left);
    while (right < value.length && isWord(value[right])) right += 1;
    if (right > left) raw.setSelectionRange?.(left, right);
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
      try {
        return await navigator.clipboard.readText();
      } catch (_error) {
        // iOS/Safari can deny programmatic reads even after a user gesture.
      }
    }
    return window.prompt("Pega el texto aquí:", "");
  }

  function closeMenu(refocus = false) {
    if (!activeMenu) return;
    const { menu, raw } = activeMenu;
    menu.remove();
    activeMenu = null;
    if (refocus) focusEditor(raw);
  }

  function positionMenu(menu, x, y) {
    document.body.append(menu);
    const margin = 8;
    const rect = menu.getBoundingClientRect();
    const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin);
    menu.style.left = `${Math.max(margin, Math.min(x, maxX))}px`;
    menu.style.top = `${Math.max(margin, Math.min(y, maxY))}px`;
  }

  function showMenu(raw, x, y, { selectWord = false } = {}) {
    if (!raw) return;
    installStyles();
    closeMenu(false);
    if (selectWord) selectWordAtCaret(raw);

    const { start, end } = selection(raw);
    const hasSelection = end > start;
    const menu = document.createElement("div");
    menu.className = MENU_CLASS;
    menu.setAttribute("role", "menu");
    menu.innerHTML = `
      <button type="button" data-action="copy" ${hasSelection ? "" : "disabled"}>Copiar</button>
      <button type="button" data-action="cut" ${hasSelection ? "" : "disabled"}>Cortar</button>
      <button type="button" data-action="paste">Pegar</button>
      <div class="sep"></div>
      <button type="button" data-action="select-all">Seleccionar todo</button>
    `;

    menu.addEventListener("pointerdown", (event) => event.stopPropagation());
    menu.addEventListener("contextmenu", (event) => event.preventDefault());
    menu.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button || button.disabled) return;
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.action;
      try {
        if (action === "copy") {
          const sel = selection(raw);
          await writeClipboard(rawValue(raw).slice(sel.start, sel.end));
          closeMenu(true);
        } else if (action === "cut") {
          const sel = selection(raw);
          await writeClipboard(rawValue(raw).slice(sel.start, sel.end));
          replaceSelection(raw, "");
          closeMenu(true);
        } else if (action === "paste") {
          const text = await readClipboard();
          if (text !== null) replaceSelection(raw, text);
          closeMenu(true);
        } else if (action === "select-all") {
          raw.setSelectionRange?.(0, rawValue(raw).length);
          closeMenu(true);
        }
      } catch (error) {
        console.warn("Editor context action failed", error);
        closeMenu(true);
      }
    });

    positionMenu(menu, x, y);
    activeMenu = { menu, raw };
  }

  function attach(wrap, raw) {
    if (!wrap || !raw || wrap.dataset.tnsContextMenu === "1") return false;
    wrap.dataset.tnsContextMenu = "1";

    wrap.addEventListener("contextmenu", (event) => {
      if (!event.target.closest(".monaco-editor, .monaco-code-host")) return;
      event.preventDefault();
      event.stopPropagation();
      showMenu(raw, event.clientX, event.clientY, { selectWord: true });
    }, true);

    let timer = 0;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    const cancelLongPress = () => {
      if (timer) window.clearTimeout(timer);
      timer = 0;
    };

    wrap.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "touch") return;
      if (!event.target.closest(".monaco-editor, .monaco-code-host")) return;
      startX = lastX = event.clientX;
      startY = lastY = event.clientY;
      cancelLongPress();
      timer = window.setTimeout(() => {
        timer = 0;
        showMenu(raw, lastX, lastY, { selectWord: true });
        try { navigator.vibrate?.(18); } catch (_error) {}
      }, 575);
    }, true);

    wrap.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "touch" || !timer) return;
      lastX = event.clientX;
      lastY = event.clientY;
      if (Math.hypot(lastX - startX, lastY - startY) > 12) cancelLongPress();
    }, true);
    wrap.addEventListener("pointerup", cancelLongPress, true);
    wrap.addEventListener("pointercancel", cancelLongPress, true);

    return true;
  }

  function install() {
    installStyles();
    const targets = [
      ["#xml-editor-wrap", "#xml-code"],
      ["#py-code-wrap", "#py-code"],
      [".lua-modal .lua-editor-wrap", ".lua-modal #lua-editor"],
    ];
    let installed = false;
    for (const [wrapSelector, rawSelector] of targets) {
      const wrap = document.querySelector(wrapSelector);
      const raw = document.querySelector(rawSelector);
      if (wrap && raw) installed = attach(wrap, raw) || installed;
    }
    return installed;
  }

  document.addEventListener("pointerdown", (event) => {
    if (activeMenu && !event.target.closest(`.${MENU_CLASS}`)) closeMenu(false);
  }, true);
  window.addEventListener("blur", () => closeMenu(false));
  window.addEventListener("resize", () => closeMenu(false));
  document.addEventListener("scroll", () => closeMenu(false), true);

  const observer = new MutationObserver(install);
  const start = () => {
    install();
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
