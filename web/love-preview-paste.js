(() => {
  "use strict";

  function bindGlobalSymbol(name, value) {
    const slot = `__tnsCompatBinding_${name}`;
    window[slot] = value;
    window[name] = value;
    try {
      (0, eval)(`${name} = window[${JSON.stringify(slot)}];`);
    } catch (_error) {}
    try { delete window[slot]; } catch (_error) { window[slot] = undefined; }
    return value;
  }

  function tiByteAt(source, index) {
    return source.charCodeAt(index) & 0xff;
  }

  function tiU32LE(source, index) {
    return (
      tiByteAt(source, index)
      | (tiByteAt(source, index + 1) << 8)
      | (tiByteAt(source, index + 2) << 16)
      | (tiByteAt(source, index + 3) << 24)
    ) >>> 0;
  }

  function decodeInlineTiImage(source) {
    if (typeof source !== "string" || source.length < 20) return null;

    const width = tiU32LE(source, 0);
    const height = tiU32LE(source, 4);
    const stride = tiU32LE(source, 12) || width * 2;
    const dataOffset = 20;

    // TI-Nspire image.new binary strings used by EEPro/BetterLuaAPI begin with
    // little-endian width/height and contain 16-bit RGB565 rows after a 20-byte
    // header. Reject ordinary strings so filenames still go through the native
    // resource lookup implemented by app.js.
    if (!width || !height || width > 4096 || height > 4096) return null;
    if (stride < width * 2 || stride > width * 8) return null;
    const required = dataOffset + (height - 1) * stride + width * 2;
    if (required > source.length) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { width, height, canvas: null, inline: true };

    const imageData = ctx.createImageData(width, height);
    const out = imageData.data;
    let outIndex = 0;

    for (let y = 0; y < height; y += 1) {
      const row = dataOffset + y * stride;
      for (let x = 0; x < width; x += 1) {
        const pixelOffset = row + x * 2;
        const value = tiByteAt(source, pixelOffset) | (tiByteAt(source, pixelOffset + 1) << 8);
        const r5 = (value >>> 11) & 0x1f;
        const g6 = (value >>> 5) & 0x3f;
        const b5 = value & 0x1f;
        out[outIndex++] = Math.round((r5 * 255) / 31);
        out[outIndex++] = Math.round((g6 * 255) / 63);
        out[outIndex++] = Math.round((b5 * 255) / 31);
        out[outIndex++] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return {
      width,
      height,
      canvas,
      inline: true,
      name: "inline-ti-image",
    };
  }

  function createCompatImageObject(resource, global) {
    if (typeof window.createLuaJsImageObject === "function") {
      try { return window.createLuaJsImageObject(resource, global); } catch (_error) {}
    }

    const table = global.lua_newtable();
    table.__tnsImage = resource;
    global.lua_tableset(table, "width", (self) => [Number((self?.__tnsImage || resource)?.width) || 0]);
    global.lua_tableset(table, "height", (self) => [Number((self?.__tnsImage || resource)?.height) || 0]);
    return table;
  }

  function installInlineImageApi(imageTable, global = window) {
    if (!imageTable || !global?.lua_tableset || !global?.lua_tableget) return;

    const currentNew = global.lua_tableget(imageTable, "new");
    if (typeof currentNew === "function" && !currentNew.__tnsInlineImageCompatV1) {
      const compatibleNew = function (source) {
        try {
          const result = currentNew.apply(this, arguments);
          if (Array.isArray(result) && result[0] != null) return result;
        } catch (_error) {
          // Fall through to the inline TI image decoder.
        }

        const resource = decodeInlineTiImage(source);
        return [resource ? createCompatImageObject(resource, global) : null];
      };
      compatibleNew.__tnsInlineImageCompatV1 = true;
      compatibleNew.__tnsInlineImageBase = currentNew;
      global.lua_tableset(imageTable, "new", compatibleNew);
    }

    // Older TI-Nspire libraries (including EEPro) use image.width(img) and
    // image.height(img), while newer code often uses img:width()/img:height().
    // Support both forms.
    global.lua_tableset(imageTable, "width", (image) => [Number(image?.__tnsImage?.width) || 0]);
    global.lua_tableset(imageTable, "height", (image) => [Number(image?.__tnsImage?.height) || 0]);
  }

  function installInlineImageBridge() {
    const currentAttach = window.attachLuaJsImageApi;
    if (typeof currentAttach !== "function") return false;
    if (currentAttach.__tnsInlineImageCompatV1) return true;

    const compatibleAttach = function (imageTable, resources, global = window) {
      const result = currentAttach.apply(this, arguments);
      installInlineImageApi(imageTable, global);
      return result;
    };

    compatibleAttach.__tnsInlineImageCompatV1 = true;
    compatibleAttach.__tnsInlineImageBase = currentAttach;
    bindGlobalSymbol("attachLuaJsImageApi", compatibleAttach);
    window.__tnsInlineImageCompatInstalled = true;
    return true;
  }

  if (!installInlineImageBridge()) {
    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      if (installInlineImageBridge() || attempts >= 400) window.clearInterval(retry);
    }, 25);
    window.addEventListener("DOMContentLoaded", installInlineImageBridge, { once: true });
  }

  if (window.__tnsLovePreviewPasteInstalled) return;
  window.__tnsLovePreviewPasteInstalled = true;

  function isEditableTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]'
      )
    );
  }

  function dispatchPreviewKey(canvas, key) {
    const options = {
      key,
      bubbles: true,
      cancelable: true,
      composed: true,
    };

    canvas.dispatchEvent(new KeyboardEvent("keydown", options));
    canvas.dispatchEvent(new KeyboardEvent("keyup", options));
  }

  function previewCanvas() {
    const modal = document.querySelector(".love-preview-modal");
    if (!modal?.isConnected || modal.querySelector("#love-calculator-composer")) return null;
    return modal.querySelector("#love-preview-canvas");
  }

  function pasteText(canvas, source) {
    if (!canvas?.isConnected) return false;
    const text = String(source || "")
      .replace(/\r\n?/g, "\n")
      .replace(/\u2212|\u2013/g, "-")
      .replace(/\u00d7/g, "*")
      .replace(/\u00f7/g, "/")
      .replace(/\u03c0/g, "pi")
      .replace(/\u00b2/g, "^2")
      .replace(/\u00b3/g, "^3")
      .replace(/\u221a/g, "sqrt");
    if (!text || text.length > 2048) return false;
    // A pasted newline is whitespace, never an implicit Enter/calculation.
    for (const char of text) {
      dispatchPreviewKey(canvas, char === "\n" || char === "\t" ? " " : char);
    }
    canvas.focus({ preventScroll: true });
    return true;
  }

  function labels() {
    const lang = String(document.documentElement.lang || "es").slice(0, 2).toLowerCase();
    if (lang === "en") return {
      paste: "Paste", hint: "Paste an expression (Ctrl+V)",
      insert: "Insert", close: "Close", tooLong: "Empty text or over 2048 characters."
    };
    if (lang === "fr") return {
      paste: "Coller", hint: "Collez une expression (Ctrl+V)",
      insert: "Insérer", close: "Fermer", tooLong: "Texte vide ou plus de 2048 caractères."
    };
    return {
      paste: "Pegar", hint: "Pega una expresión (Ctrl+V)",
      insert: "Insertar", close: "Cerrar", tooLong: "Texto vacío o más de 2048 caracteres."
    };
  }

  function installPasteButton() {
    const canvas = previewCanvas();
    if (!canvas) return;
    const modal = canvas.closest(".love-preview-modal");
    const anchor = modal.querySelector(".love-preview-side-action-row") || modal.querySelector(".modal-actions");
    if (!anchor || anchor.querySelector(".love-preview-paste-button")) return;

    if (!document.getElementById("tns-love-paste-style")) {
      const style = document.createElement("style");
      style.id = "tns-love-paste-style";
      style.textContent = [
        ".love-preview-paste-button{display:block;width:100%;border:1px solid #7195c0;border-radius:12px;background:#254567;color:#f3f8ff;font:600 12px sans-serif;padding:9px 12px;cursor:pointer}",
        ".love-preview-paste-button:hover{background:#315780}",
        ".love-preview-paste-panel{display:flex;flex-direction:column;gap:7px;margin-top:7px;padding:9px;border:1px solid #456382;border-radius:10px;background:#122239;color:#dce8f6;font:12px sans-serif}",
        ".love-preview-paste-panel[hidden]{display:none!important}",
        ".love-preview-paste-panel textarea{box-sizing:border-box;width:100%;min-height:64px;resize:vertical;border:1px solid #6484a5;border-radius:6px;background:#f7fbff;color:#17243b;padding:6px;font:12px sans-serif}",
        ".love-preview-paste-panel button{border:1px solid #52769b;border-radius:7px;background:#29496d;color:white;padding:6px;cursor:pointer}",
        ".love-preview-paste-actions{display:flex;gap:6px}",
        ".love-preview-paste-actions button{flex:1}"
      ].join("\n");
      document.head.appendChild(style);
    }

    const l = labels();
    const button = document.createElement("button");
    button.type = "button";
    button.className = "love-preview-paste-button";
    button.textContent = l.paste;
    button.title = "Ctrl+V";
    const panel = document.createElement("div");
    panel.className = "love-preview-paste-panel";
    panel.hidden = true;
    const hint = document.createElement("label");
    hint.textContent = l.hint;
    const field = document.createElement("textarea");
    field.spellcheck = false;
    field.autocomplete = "off";
    field.placeholder = l.hint;
    field.setAttribute("aria-label", l.hint);
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    const actions = document.createElement("div");
    actions.className = "love-preview-paste-actions";
    const insert = document.createElement("button");
    insert.type = "button";
    insert.textContent = l.insert;
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = l.close;
    actions.append(insert, close);
    panel.append(hint, field, status, actions);
    anchor.append(button, panel);

    const finish = (value) => {
      if (!pasteText(canvas, value)) {
        status.textContent = l.tooLong;
        panel.hidden = false;
        return;
      }
      field.value = "";
      status.textContent = "";
      panel.hidden = true;
    };
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        if (!navigator.clipboard?.readText) throw Error("Clipboard API unavailable");
        const value = await navigator.clipboard.readText();
        if (!value) throw Error("Clipboard empty");
        finish(value);
      } catch (_error) {
        panel.hidden = false;
        field.focus({ preventScroll: true });
      }
    });
    field.addEventListener("paste", (event) => {
      const value = event.clipboardData?.getData("text/plain");
      if (!value) return;
      event.preventDefault();
      event.stopPropagation();
      finish(value);
    });
    insert.addEventListener("click", () => finish(field.value));
    close.addEventListener("click", () => { panel.hidden = true; canvas.focus({ preventScroll: true }); });
  }

  document.addEventListener("paste", (event) => {
    const canvas = previewCanvas();
    if (!canvas) return;
    const modal = canvas.closest(".love-preview-modal");
    // Do not intercept paste in source editors or other browser inputs.
    if (!modal.contains(event.target) && !modal.contains(document.activeElement)) return;
    if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) return;
    const value = event.clipboardData?.getData("text/plain");
    if (!value) return;
    event.preventDefault();
    pasteText(canvas, value);
  }, true);

  // Preview modals are created dynamically; observe top-level insertions only.
  const observeModals = () => {
    installPasteButton();
    const observer = new MutationObserver(() => installPasteButton());
    observer.observe(document.body, { childList: true });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeModals, { once: true });
  } else {
    observeModals();
  }
})();
