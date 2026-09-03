(() => {
  "use strict";

  const INSTALL_MARK = "__tnsNspirePreviewIsolationV4";
  const RUNTIME_VERSION = "20260903-nspire-runtime-v4";
  const BASE_RUNTIME_FILES = [
    "vendor/luajs/lua.js",
    "vendor/luajs/nspire/env.js",
    "vendor/luajs/nspire/tools.js",
    "vendor/luajs/nspire/bindings.js",
    "vendor/luajs/nspire/platform.js",
    "vendor/luajs/nspire/timer.js",
    "vendor/luajs/nspire/locale.js",
  ];

  function copyFunctionMarkers(target, source) {
    for (const key of Object.keys(source || {})) {
      try { target[key] = source[key]; } catch (_error) {}
    }
  }

  function bindGeneratedLuaSymbol(name, value) {
    const root = window;
    const slot = `__tnsGeneratedLuaBinding_${name}`;
    root[slot] = value;
    root[name] = value;
    try {
      // User Lua is compiled to JS that calls bare identifiers such as
      // lua_eq(...), not window.lua_eq(...). Synchronize that real global
      // binding as well as the window property.
      (0, eval)(`${name} = window[${JSON.stringify(slot)}];`);
    } catch (_error) {}
    try { delete root[slot]; } catch (_error) { root[slot] = undefined; }
    return value;
  }

  async function loadFreshNspireLuaJsSources() {
    const sources = [];
    const legacyArithmeticFiles = [];

    for (const file of BASE_RUNTIME_FILES) {
      const separator = file.includes("?") ? "&" : "?";
      const response = await fetch(`./${file}${separator}v=${RUNTIME_VERSION}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      const source = await response.text();
      if (/\bfunction\s+binaryArithmetic\b/.test(source)) legacyArithmeticFiles.push(file);
      sources.push(source);
    }

    window.__tnsNspirePreviewLegacyArithmeticFiles = legacyArithmeticFiles;
    window.__tnsNspirePreviewRuntimeBuild = RUNTIME_VERSION;
    return sources;
  }

  function installTiNilSemantics() {
    const root = window;

    // A missing Lua table field is nil. Never let JavaScript undefined escape
    // from a table read into the Lua program.
    for (const name of ["lua_rawget", "lua_tableget"]) {
      const current = root[name];
      if (typeof current !== "function" || current.__tnsTiNilReadV4) continue;

      const safeRead = function (table, key) {
        if (table == null || table === false || key === undefined || key === null) return null;
        const value = current.apply(this, arguments);
        return value === undefined ? null : value;
      };

      copyFunctionMarkers(safeRead, current);
      safeRead.__tnsTiNilReadV4 = true;
      safeRead.__tnsTiNilReadBase = current;
      bindGeneratedLuaSymbol(name, safeRead);
    }

    // The parser compiles `x == nil` to the bare JS call `lua_eq(x, null)`.
    // Some runtime variants keep a stale global binding even after
    // window.lua_eq is replaced, so bind both references explicitly.
    const currentEq = root.lua_eq;
    if (typeof currentEq === "function" && !currentEq.__tnsTiNilEqV4) {
      const safeEq = function (left, right) {
        const leftNil = left === undefined || left === null;
        const rightNil = right === undefined || right === null;
        if (leftNil || rightNil) return leftNil && rightNil;
        return currentEq.apply(this, arguments);
      };
      copyFunctionMarkers(safeEq, currentEq);
      safeEq.__tnsTiNilEqV4 = true;
      safeEq.__tnsTiNilEqBase = currentEq;
      bindGeneratedLuaSymbol("lua_eq", safeEq);
    }

    // Keep type(nil) correct for compatibility helpers that expose JS values.
    const typeFn = root.G?.str?.type;
    if (typeof typeFn === "function" && !typeFn.__tnsTiNilTypeV4) {
      const safeType = function (value) {
        if (value === undefined || value === null) return ["nil"];
        return typeFn.apply(this, arguments);
      };
      safeType.__tnsTiNilTypeV4 = true;
      safeType.__tnsTiNilTypeBase = typeFn;
      root.G.str.type = safeType;
    }

    // Probe the same bare identifier that generated Lua code will call.
    let equalityProbe = false;
    try { equalityProbe = (0, eval)("lua_eq(null, null) === true"); } catch (_error) {}
    root.__tnsNspirePreviewNilEqualityProbe = equalityProbe;
    root.__tnsNspirePreviewNilSemanticsV4 = true;
  }

  function installIsolation() {
    const currentCreate = window.createLuaJsPreviewRuntime;
    if (typeof currentCreate !== "function") return false;
    if (currentCreate[INSTALL_MARK]) return true;

    const isolatedCreate = async function (...args) {
      const savedLoader = window.loadLuaJsRuntimeSources;
      const savedHarden = window.hardenLuaJsPreviewRuntime;

      const freshLoader = async function () {
        return loadFreshNspireLuaJsSources();
      };

      const tiHarden = function (...hardenArgs) {
        const result = typeof savedHarden === "function"
          ? savedHarden.apply(this, hardenArgs)
          : undefined;

        installTiNilSemantics();
        if (typeof queueMicrotask === "function") queueMicrotask(installTiNilSemantics);
        else Promise.resolve().then(installTiNilSemantics);
        window.setTimeout(installTiNilSemantics, 0);
        return result;
      };

      window.loadLuaJsRuntimeSources = freshLoader;
      window.hardenLuaJsPreviewRuntime = tiHarden;
      window.__tnsNspirePreviewRuntimeActive = true;

      try {
        return await currentCreate.apply(this, args);
      } finally {
        window.__tnsNspirePreviewRuntimeActive = false;
        if (window.loadLuaJsRuntimeSources === freshLoader) window.loadLuaJsRuntimeSources = savedLoader;
        if (window.hardenLuaJsPreviewRuntime === tiHarden) window.hardenLuaJsPreviewRuntime = savedHarden;
      }
    };

    copyFunctionMarkers(isolatedCreate, currentCreate);
    isolatedCreate[INSTALL_MARK] = true;
    isolatedCreate.__tnsNspirePreviewBase = currentCreate;
    window.createLuaJsPreviewRuntime = isolatedCreate;
    window.__tnsNspirePreviewIsolationInstalled = true;
    return true;
  }

  if (!installIsolation()) {
    let attempts = 0;
    const retry = window.setInterval(() => {
      attempts += 1;
      if (installIsolation() || attempts >= 400) window.clearInterval(retry);
    }, 25);
    window.addEventListener("DOMContentLoaded", installIsolation, { once: true });
  }
})();
