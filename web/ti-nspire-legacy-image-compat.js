(() => {
  "use strict";

  const VERSION = "20260903-eepro-inline-image-v2";
  if (window.__tnsLegacyImageCompatVersion === VERSION) return;
  window.__tnsLegacyImageCompatVersion = VERSION;

  function bindGlobalSymbol(name, value) {
    const slot = `__tnsLegacyCompatBinding_${name}`;
    window[slot] = value;
    window[name] = value;
    try {
      (0, eval)(`${name} = window[${JSON.stringify(slot)}];`);
    } catch (_error) {}
    try { delete window[slot]; } catch (_error) { window[slot] = undefined; }
    return value;
  }

  function byteAt(source, index) {
    return source.charCodeAt(index) & 0xff;
  }

  function u32le(source, index) {
    return (
      byteAt(source, index)
      | (byteAt(source, index + 1) << 8)
      | (byteAt(source, index + 2) << 16)
      | (byteAt(source, index + 3) << 24)
    ) >>> 0;
  }

  // Legacy TI-Nspire/EEPro image.new strings have this layout:
  //   u32 width
  //   u32 height
  //   u32 reserved (normally 0)
  //   u32 row stride in bytes (normally width * 2)
  //   u32 format/version (the uploaded EEPro file uses 0x00010010)
  //   little-endian RGB555 pixel rows
  //
  // The uploaded sint.tns.xml contains 11x10/stride22, 14x7/stride28 and
  // 37x37/stride74 images. Comparing the decoded 37x37 TI-Planet logo with the
  // real calculator screenshot confirms RGB555, not RGB565.
  function decodeInlineTiImage(source) {
    if (typeof source !== "string" || source.length < 20) return null;

    const width = u32le(source, 0);
    const height = u32le(source, 4);
    const reserved = u32le(source, 8);
    const stride = u32le(source, 12);
    const format = u32le(source, 16);
    const dataOffset = 20;

    if (!width || !height || width > 4096 || height > 4096) return null;
    if (reserved !== 0) return null;
    if (stride < width * 2 || stride > width * 8) return null;
    if (!format) return null;

    const required = dataOffset + (height - 1) * stride + width * 2;
    if (required > source.length) return null;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { width, height, stride, format, canvas: null, inline: true, name: "inline-ti-image" };
    }

    const imageData = ctx.createImageData(width, height);
    const output = imageData.data;
    let out = 0;

    for (let y = 0; y < height; y += 1) {
      const row = dataOffset + y * stride;
      for (let x = 0; x < width; x += 1) {
        const offset = row + x * 2;
        const value = byteAt(source, offset) | (byteAt(source, offset + 1) << 8);
        const r5 = (value >>> 10) & 0x1f;
        const g5 = (value >>> 5) & 0x1f;
        const b5 = value & 0x1f;
        output[out++] = Math.round((r5 * 255) / 31);
        output[out++] = Math.round((g5 * 255) / 31);
        output[out++] = Math.round((b5 * 255) / 31);
        output[out++] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return {
      width,
      height,
      stride,
      format,
      pixelFormat: "RGB555LE",
      canvas,
      inline: true,
      name: "inline-ti-image",
    };
  }

  function createImageObject(resource, global) {
    if (typeof window.createLuaJsImageObject === "function") {
      try {
        return window.createLuaJsImageObject(resource, global);
      } catch (_error) {}
    }

    const image = global.lua_newtable();
    image.__tnsImage = resource;
    global.lua_tableset(image, "width", (self) => [Number((self?.__tnsImage || resource)?.width) || 0]);
    global.lua_tableset(image, "height", (self) => [Number((self?.__tnsImage || resource)?.height) || 0]);
    return image;
  }

  function imageResource(value) {
    return value?.__tnsImage || null;
  }

  function luaUnicodeSub(source, start, end) {
    const chars = Array.from(String(source ?? ""));
    const length = chars.length;
    const normalize = (value, fallback) => {
      if (value == null) return fallback;
      let n = Math.trunc(Number(value));
      if (!Number.isFinite(n)) return fallback;
      if (n < 0) n = length + n + 1;
      return n;
    };
    let first = normalize(start, 1);
    let last = normalize(end, length);
    first = Math.max(1, first);
    last = Math.min(length, last);
    if (first > last || first > length || last < 1) return "";
    return chars.slice(first - 1, last).join("");
  }

  function installLegacyApi(imageTable, global = window) {
    if (!imageTable || !global?.lua_tableset || !global?.lua_tableget) return;

    const currentNew = global.lua_tableget(imageTable, "new");
    if (typeof currentNew === "function" && !currentNew.__tnsEeproInlineImageCompat) {
      const compatibleNew = function (source) {
        // Keep the normal Add Image / _R.IMG resource path first.
        try {
          const normal = currentNew.apply(this, arguments);
          if (Array.isArray(normal) && normal[0] != null) return normal;
        } catch (_error) {
          // If it is not a normal resource, try the legacy embedded format.
        }

        const resource = decodeInlineTiImage(source);
        if (!resource) return [null];
        window.__tnsInlineTiImageDecodeCount = (window.__tnsInlineTiImageDecodeCount || 0) + 1;
        window.__tnsInlineTiImageLast = {
          width: resource.width,
          height: resource.height,
          stride: resource.stride,
          format: resource.format,
          pixelFormat: resource.pixelFormat,
        };
        return [createImageObject(resource, global)];
      };
      compatibleNew.__tnsEeproInlineImageCompat = true;
      compatibleNew.__tnsEeproInlineImageBase = currentNew;
      global.lua_tableset(imageTable, "new", compatibleNew);
    }

    // BetterLuaAPI/EEPro uses the static form image.width(img)/image.height(img).
    // The modern Preview image objects already support img:width()/img:height().
    global.lua_tableset(imageTable, "width", (image) => [Number(imageResource(image)?.width) || 0]);
    global.lua_tableset(imageTable, "height", (image) => [Number(imageResource(image)?.height) || 0]);

    // Older EEPro widgets use string.usub for Unicode-aware cursor handling.
    const stringTable = global.G?.str?.string;
    if (stringTable) {
      global.lua_tableset(stringTable, "usub", (source, start, end) => [luaUnicodeSub(source, start, end)]);
    }
  }

  function installBridge() {
    const currentAttach = window.attachLuaJsImageApi;
    if (typeof currentAttach !== "function") return false;
    if (currentAttach.__tnsEeproInlineImageCompat) return true;

    const compatibleAttach = function (imageTable, resources, global = window) {
      // Reuse the same resource/image object pipeline used by the page's
      // Add Image feature. Then augment it only for legacy inline EEPro blobs.
      const result = currentAttach.apply(this, arguments);
      installLegacyApi(imageTable, global);
      return result;
    };
    compatibleAttach.__tnsEeproInlineImageCompat = true;
    compatibleAttach.__tnsEeproInlineImageBase = currentAttach;
    bindGlobalSymbol("attachLuaJsImageApi", compatibleAttach);
    window.__tnsLegacyImageCompatInstalled = true;
    return true;
  }

  if (!installBridge()) {
    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      if (installBridge() || attempts >= 400) window.clearInterval(retry);
    }, 25);
    window.addEventListener("DOMContentLoaded", installBridge, { once: true });
  }
})();