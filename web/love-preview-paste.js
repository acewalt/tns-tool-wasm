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

  document.addEventListener(
    "paste",
    (event) => {
      const canvas = document.querySelector("#love-preview-canvas");
      if (!canvas?.isConnected) return;

      // Preserve native paste in the calculator composer and any normal form field.
      if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) return;

      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!text) return;

      event.preventDefault();

      // Normalize Windows/macOS line endings so a pasted multi-line test behaves
      // like typing each line and pressing Enter in the Preview LÖVE window.
      const normalized = text.replace(/\r\n?/g, "\n");

      for (const char of normalized) {
        if (char === "\n") {
          dispatchPreviewKey(canvas, "Enter");
        } else if (char === "\t") {
          dispatchPreviewKey(canvas, "Tab");
        } else {
          dispatchPreviewKey(canvas, char);
        }
      }

      canvas.focus({ preventScroll: true });
    },
    true
  );
})();
