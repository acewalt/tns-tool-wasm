(() => {
  "use strict";
  const root = typeof window !== "undefined" ? window : globalThis;
  const WIDTH = 320;
  const HEIGHT = 240;
  const BYTE_COUNT = WIDTH * HEIGHT * 2;
  const WORD_COUNT = WIDTH * HEIGHT;
  const MARKER = "__TNS_RGB565_FRAME__:";
  const frames = new Map();
  let sequence = 0;

  function detect(source) {
    const text = String(source || "");
    return /\b(?:setScreen|setBufPixel|setBufPixelRGB|I_Flip|I_InitGraphics|I_FinishUpdate)\s*\(/m.test(text)
      || /\bSCREEN_BASE_(?:PTR|ADDR)\b/m.test(text)
      || /0xC0000010\b/i.test(text)
      || /\b(?:lcd_blit|lcd_set_mode|lcd_init)\s*\(/m.test(text);
  }

  function numbers(body, limit) {
    const out = [];
    const re = /(?:0[xX][0-9a-fA-F]+|\b\d+\b)/g;
    for (let match; (match = re.exec(String(body || ""))) && out.length < limit;) {
      const raw = match[0];
      const value = /^0[xX]/.test(raw) ? Number.parseInt(raw.slice(2), 16) : Number.parseInt(raw, 10);
      if (Number.isFinite(value)) out.push(value);
    }
    return out;
  }

  function extractBytes(source) {
    const text = String(source || "");
    const re = /\b(?:static\s+)?(?:const\s+)?(?:unsigned\s+char|uint8_t|byte)\s+([A-Za-z_]\w*)\s*\[\s*(?:SCREEN_SIZE|153600)\s*\]\s*=\s*\{([\s\S]*?)\}\s*;/g;
    for (let match; (match = re.exec(text));) {
      const values = numbers(match[2], BYTE_COUNT);
      if (values.length < BYTE_COUNT) continue;
      const bytes = new Uint8Array(BYTE_COUNT);
      for (let i = 0; i < BYTE_COUNT; i += 1) bytes[i] = values[i] & 0xff;
      return { name: match[1], bytes, storage: "uint8" };
    }
    return null;
  }

  function extractWords(source) {
    const text = String(source || "");
    const re = /\b(?:static\s+)?(?:const\s+)?(?:uint16_t|unsigned\s+short)\s+([A-Za-z_]\w*)\s*\[\s*(?:SCREEN_PIXELS|76800)\s*\]\s*=\s*\{([\s\S]*?)\}\s*;/g;
    for (let match; (match = re.exec(text));) {
      const values = numbers(match[2], WORD_COUNT);
      if (values.length < WORD_COUNT) continue;
      const bytes = new Uint8Array(BYTE_COUNT);
      for (let i = 0; i < WORD_COUNT; i += 1) {
        const value = values[i] & 0xffff;
        bytes[i * 2] = value & 0xff;
        bytes[i * 2 + 1] = value >>> 8;
      }
      return { name: match[1], bytes, storage: "uint16" };
    }
    return null;
  }

  function extract(source) {
    return extractBytes(source) || extractWords(source) || null;
  }

  function rgb565(value) {
    const word = Number(value) & 0xffff;
    return [
      Math.round(((word >>> 11) & 31) * 255 / 31),
      Math.round(((word >>> 5) & 63) * 255 / 63),
      Math.round((word & 31) * 255 / 31),
    ];
  }

  function remember(frame) {
    const id = String(++sequence);
    frames.set(id, frame);
    if (frames.size > 8) frames.delete(frames.keys().next().value);
    return id;
  }

  function preview(source, fallback) {
    const raw = String(source || "");
    if (!detect(raw)) return fallback(raw);
    const frame = extract(raw);
    if (!frame) {
      return {
        width: WIDTH,
        height: HEIGHT,
        mode: "framebuffer-native",
        commands: [{ type: "clear", color: [0, 0, 0] }],
        warnings: ["Native framebuffer renderer detected. Debug printf/puts strings are hidden because they are not LCD pixels. Live preview requires executing/emulating the ARM program."],
      };
    }
    const id = remember(frame);
    return {
      width: WIDTH,
      height: HEIGHT,
      mode: "framebuffer-static",
      framebuffer: frame,
      commands: [
        { type: "clear", color: [0, 0, 0] },
        { type: "text", x: 0, y: 0, text: MARKER + id, color: [0, 0, 0] },
      ],
      warnings: [`Native RGB565 framebuffer detected (${frame.name}). Showing embedded 320×240 screen data; live execution still requires the Ndless runtime/emulation and any external game data.`],
    };
  }

  function draw(ctx, frame) {
    if (!ctx || !frame?.bytes || frame.bytes.length < BYTE_COUNT) return false;
    const image = ctx.createImageData(WIDTH, HEIGHT);
    for (let i = 0; i < WORD_COUNT; i += 1) {
      const b = i * 2;
      const [r, g, blue] = rgb565(frame.bytes[b] | (frame.bytes[b + 1] << 8));
      const p = i * 4;
      image.data[p] = r;
      image.data[p + 1] = g;
      image.data[p + 2] = blue;
      image.data[p + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return true;
  }

  function patchPreviewCanvas(canvas) {
    if (!canvas || canvas.__tnsRgb565Patched) return;
    const ctx = canvas.getContext?.("2d");
    if (!ctx || ctx.__tnsRgb565Patched) return;
    const original = ctx.fillText.bind(ctx);
    ctx.fillText = function(text, x, y, maxWidth) {
      const value = String(text ?? "");
      if (value.startsWith(MARKER)) {
        const frame = frames.get(value.slice(MARKER.length));
        if (frame && draw(ctx, frame)) return;
      }
      return maxWidth === undefined ? original(text, x, y) : original(text, x, y, maxWidth);
    };
    ctx.__tnsRgb565Patched = true;
    canvas.__tnsRgb565Patched = true;
  }

  function patchVisibleCanvases() {
    if (typeof document === "undefined") return;
    document.querySelectorAll("[data-ndless-project-canvas]").forEach(patchPreviewCanvas);
  }

  root.NdlessFramebufferPreview = Object.freeze({ WIDTH, HEIGHT, BYTE_COUNT, MARKER, detect, extract, rgb565, preview, draw, patchPreviewCanvas, patchVisibleCanvases });
  patchVisibleCanvases();
  if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
    new MutationObserver(patchVisibleCanvases).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
