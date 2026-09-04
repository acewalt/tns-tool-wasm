(() => {
  "use strict";

  const VERSION = "20260904-ti-font-calibration-v1";
  // TI-Nspire gc font sizes behave much closer to typographic points than to
  // raw browser CSS pixels. 10 on the calculator is roughly 13.3 CSS px at
  // 96 dpi. The old preview rendered 10 as 10px, which made every ScriptApp
  // look about 25% smaller than the real device and also changed wrapping.
  const TI_FONT_SCALE = 4 / 3;
  const CONTEXTS = new WeakSet();
  const PROXIES = new WeakMap();

  function scaleCanvasFont(value) {
    const source = String(value || "");
    return source.replace(/(\d+(?:\.\d+)?)px\b/i, (_match, raw) => {
      const size = Number(raw);
      if (!Number.isFinite(size) || size <= 0) return _match;
      return `${Math.round(size * TI_FONT_SCALE * 1000) / 1000}px`;
    });
  }

  function calibratedContext(ctx) {
    if (!ctx || typeof ctx !== "object") return ctx;
    if (CONTEXTS.has(ctx)) return ctx;
    if (PROXIES.has(ctx)) return PROXIES.get(ctx);

    const proxy = new Proxy(ctx, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
      set(target, property, value) {
        if (property === "font") {
          target.font = scaleCanvasFont(value);
          return true;
        }
        return Reflect.set(target, property, value, target);
      }
    });

    PROXIES.set(ctx, proxy);
    CONTEXTS.add(proxy);
    return proxy;
  }

  function install() {
    const current = window.createLuaJsPreviewRuntime;
    if (typeof current !== "function") return false;
    if (current.__tnsTiFontCalibrationVersion === VERSION) return true;

    const wrapped = async function (code, ctx, canvas, logEl, symbols = {}) {
      return current.call(this, code, calibratedContext(ctx), canvas, logEl, symbols);
    };

    wrapped.__tnsTiFontCalibrationVersion = VERSION;
    wrapped.__tnsTiFontCalibrationBase = current;
    window.createLuaJsPreviewRuntime = wrapped;
    return true;
  }

  // CAS/isolation wrappers are also installed dynamically. Re-check a few
  // bounded times so this calibration ends up around the final runtime wrapper
  // without using a MutationObserver or an endless polling loop.
  for (const delay of [0, 50, 150, 400, 900, 1800, 3500]) {
    window.setTimeout(install, delay);
  }

  window.TnsTiPreviewFontCalibration = {
    version: VERSION,
    scale: TI_FONT_SCALE,
    install
  };
})();
