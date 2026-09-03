(() => {
  "use strict";

  const INSTALL_MARK = "__tnsNspirePreviewIsolationV3";
  const RUNTIME_VERSION = "20260903-nspire-runtime-v3";
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

    // Do not abort if GitHub Pages still serves the arithmetic-helper build.
    // Both variants are valid LuaJS builds; the TI compatibility layer below
    // normalizes Lua nil semantics after the runtime has been evaluated.
    window.__tnsNspirePreviewLegacyArithmeticFiles = legacyArithmeticFiles;
    window.__tnsNspirePreviewRuntimeBuild = RUNTIME_VERSION;
    return sources;
  }

  function installTiNilSemantics() {
    const root = window;

    // Lua has a single missing-value representation: nil. LuaJS tables may
    // return JavaScript undefined for an absent key, so normalize reads only.
    for (const name of ["lua_rawget", "lua_tableget"]) {
      const current = root[name];
      if (typeof current !== "function" || current.__tnsTiNilReadV3) continue;

      const safeRead = function (table, key) {
        if (table == null || table === false || key === undefined || key === null) return null;
        const value = current.apply(this, arguments);
        return value === undefined ? null : value;
      };

      copyFunctionMarkers(safeRead, current);
      safeRead.__tnsTiNilReadV3 = true;
      safeRead.__tnsTiNilReadBase = current;
      root[name] = safeRead;
      try {
        // Some generated LuaJS code resolves the symbol lexically instead of
        // through window.*, so keep both references aligned.
        if (name === "lua_rawget") lua_rawget = safeRead;
        if (name === "lua_tableget") lua_tableget = safeRead;
      } catch (_error) {}
    }

    // Some LuaJS builds compare JS values strictly enough that undefined does
    // not behave as Lua nil. Make nil equality explicit without changing any
    // non-nil comparison semantics.
    const currentEq = root.lua_eq;
    if (typeof currentEq === "function" && !currentEq.__tnsTiNilEqV3) {
      const safeEq = function (left, right) {
        const leftNil = left === undefined || left === null;
        const rightNil = right === undefined || right === null;
        if (leftNil || rightNil) return leftNil && rightNil;
        return currentEq.apply(this, arguments);
      };
      copyFunctionMarkers(safeEq, currentEq);
      safeEq.__tnsTiNilEqV3 = true;
      safeEq.__tnsTiNilEqBase = currentEq;
      root.lua_eq = safeEq;
      try { lua_eq = safeEq; } catch (_error) {}
    }

    // Keep type(nil) correct even when the underlying JS value is undefined.
    const typeFn = root.G?.str?.type;
    if (typeof typeFn === "function" && !typeFn.__tnsTiNilTypeV3 && typeof root.lua_tableset === "function") {
      const safeType = function (value) {
        if (value === undefined || value === null) return ["nil"];
        return typeFn.apply(this, arguments);
      };
      safeType.__tnsTiNilTypeV3 = true;
      safeType.__tnsTiNilTypeBase = typeFn;
      root.lua_tableset(root.G.str, "type", safeType);
    }

    root.__tnsNspirePreviewNilSemanticsV3 = true;
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

        // Run after the normal hardening/LÖVE bridge. bindings.js also queues
        // TI table compatibility in a microtask, so queue one final pass after
        // it to guarantee that absent fields end as Lua nil, never undefined.
        installTiNilSemantics();
        queueMicrotask(installTiNilSemantics);
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
