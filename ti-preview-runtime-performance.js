(() => {
  "use strict";

  const VERSION = "20260905-ti-preview-runtime-performance-v1";
  const MAX_STRING_CACHE = 4096;
  const MAX_GC_CACHE = 4096;

  function boundedSet(map, key, value, limit) {
    if (map.size >= limit && !map.has(key)) map.clear();
    map.set(key, value);
    return value;
  }

  function stablePrimitive(value) {
    if (value == null) return "";
    const type = typeof value;
    if (type === "string") return `s:${value}`;
    if (type === "number") return `n:${value}`;
    if (type === "boolean") return value ? "b:1" : "b:0";
    return null;
  }

  function cloneLuaReturn(value) {
    return Array.isArray(value) ? value.slice() : value;
  }

  function patchStringRuntime() {
    const root = window;
    const table = root.G?.str?.string;
    if (!table || typeof root.lua_tableget !== "function" || typeof root.lua_tableset !== "function") return false;

    const patchMemo = (name, canCache) => {
      const current = root.lua_tableget(table, name);
      if (typeof current !== "function" || current.__tnsPreviewPerfV1) return;
      const cache = new Map();
      const wrapped = function (...args) {
        let key = canCache(args);
        if (key != null) {
          const hit = cache.get(key);
          if (hit !== undefined) return cloneLuaReturn(hit);
        }
        const result = current.apply(this, args);
        if (key != null) boundedSet(cache, key, cloneLuaReturn(result), MAX_STRING_CACHE);
        return result;
      };
      wrapped.__tnsPreviewPerfV1 = true;
      wrapped.__tnsPreviewPerfBase = current;
      wrapped.__tnsPreviewPerfCache = cache;
      root.lua_tableset(table, name, wrapped);
    };

    patchMemo("find", (args) => {
      const source = stablePrimitive(args[0]);
      const pattern = stablePrimitive(args[1]);
      const init = stablePrimitive(args[2]);
      const plain = stablePrimitive(args[3]);
      if (source == null || pattern == null || init == null || plain == null) return null;
      return `${source}\u0001${pattern}\u0001${init}\u0001${plain}`;
    });

    patchMemo("match", (args) => {
      const source = stablePrimitive(args[0]);
      const pattern = stablePrimitive(args[1]);
      const init = stablePrimitive(args[2]);
      if (source == null || pattern == null || init == null) return null;
      return `${source}\u0001${pattern}\u0001${init}`;
    });

    patchMemo("gsub", (args) => {
      const source = stablePrimitive(args[0]);
      const pattern = stablePrimitive(args[1]);
      const replacement = stablePrimitive(args[2]);
      const limit = stablePrimitive(args[3]);
      if (source == null || pattern == null || replacement == null || limit == null) return null;
      return `${source}\u0001${pattern}\u0001${replacement}\u0001${limit}`;
    });

    return true;
  }

  function patchGcRuntime() {
    const root = window;
    if (!root.G?.str?.platform || typeof root.lua_tableget !== "function" || typeof root.lua_tableset !== "function") return false;

    const platform = root.G.str.platform;
    const win = root.lua_tableget(platform, "window");
    const gc = win && root.lua_tableget(win, "gc");
    if (!gc) return false;

    const widthFn = root.lua_tableget(gc, "getStringWidth");
    const fontFn = root.lua_tableget(gc, "setFont");
    const heightFn = root.lua_tableget(gc, "getStringHeight");
    if (typeof widthFn !== "function") return false;
    if (widthFn.__tnsPreviewPerfV1) return true;

    let fontKey = "sansserif|r|12";
    const widthCache = new Map();
    const heightCache = new Map();

    if (typeof fontFn === "function" && !fontFn.__tnsPreviewPerfV1) {
      const wrappedFont = function (...args) {
        // Method form: self, family, style, size.
        const family = args.length >= 4 ? args[1] : args[0];
        const style = args.length >= 4 ? args[2] : args[1];
        const size = args.length >= 4 ? args[3] : args[2];
        fontKey = `${String(family ?? "sansserif")}|${String(style ?? "r")}|${Number(size) || 12}`;
        return fontFn.apply(this, args);
      };
      wrappedFont.__tnsPreviewPerfV1 = true;
      wrappedFont.__tnsPreviewPerfBase = fontFn;
      root.lua_tableset(gc, "setFont", wrappedFont);
    }

    const wrappedWidth = function (...args) {
      const text = args.length >= 2 ? args[1] : args[0];
      const primitive = stablePrimitive(text);
      if (primitive == null) return widthFn.apply(this, args);
      const key = `${fontKey}\u0001${primitive}`;
      const hit = widthCache.get(key);
      if (hit !== undefined) return cloneLuaReturn(hit);
      const result = widthFn.apply(this, args);
      boundedSet(widthCache, key, cloneLuaReturn(result), MAX_GC_CACHE);
      return result;
    };
    wrappedWidth.__tnsPreviewPerfV1 = true;
    wrappedWidth.__tnsPreviewPerfBase = widthFn;
    wrappedWidth.__tnsPreviewPerfCache = widthCache;
    root.lua_tableset(gc, "getStringWidth", wrappedWidth);

    if (typeof heightFn === "function" && !heightFn.__tnsPreviewPerfV1) {
      const wrappedHeight = function (...args) {
        const text = args.length >= 2 ? args[1] : args[0];
        const primitive = stablePrimitive(text);
        const key = `${fontKey}\u0001${primitive ?? "dynamic"}`;
        const hit = heightCache.get(key);
        if (hit !== undefined) return cloneLuaReturn(hit);
        const result = heightFn.apply(this, args);
        boundedSet(heightCache, key, cloneLuaReturn(result), MAX_GC_CACHE);
        return result;
      };
      wrappedHeight.__tnsPreviewPerfV1 = true;
      wrappedHeight.__tnsPreviewPerfBase = heightFn;
      root.lua_tableset(gc, "getStringHeight", wrappedHeight);
    }

    root.__tnsTiPreviewPerfLastGc = {
      widthCache,
      heightCache,
      get fontKey() { return fontKey; }
    };
    return true;
  }

  function patchRuntimeTables() {
    const strings = patchStringRuntime();
    const gc = patchGcRuntime();
    window.__tnsTiPreviewPerformanceLastPatch = {
      version: VERSION,
      strings,
      gc,
      at: Date.now()
    };
    return strings || gc;
  }

  function install() {
    if (window.__tnsTiPreviewPerformanceInstalled === VERSION) return true;
    const current = window.createLuaJsPreviewRuntime;
    if (typeof current !== "function") return false;

    const wrapped = async function (...args) {
      const runtime = await current.apply(this, args);
      patchRuntimeTables();
      return runtime;
    };
    wrapped.__tnsTiPreviewPerformanceVersion = VERSION;
    wrapped.__tnsTiPreviewPerformanceBase = current;
    window.createLuaJsPreviewRuntime = wrapped;
    window.__tnsTiPreviewPerformanceInstalled = VERSION;
    return true;
  }

  if (!install()) {
    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 160) window.clearInterval(retry);
    }, 25);
    window.addEventListener("DOMContentLoaded", install, { once: true });
  }

  window.TnsTiPreviewPerformance = {
    version: VERSION,
    install,
    patchRuntimeTables,
    status() {
      return {
        version: VERSION,
        installed: window.__tnsTiPreviewPerformanceInstalled === VERSION,
        lastPatch: window.__tnsTiPreviewPerformanceLastPatch || null,
        widthCacheSize: window.__tnsTiPreviewPerfLastGc?.widthCache?.size || 0,
        heightCacheSize: window.__tnsTiPreviewPerfLastGc?.heightCache?.size || 0
      };
    }
  };
})();
