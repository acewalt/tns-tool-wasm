(() => {
  "use strict";

  const INSTALL_MARK = "__tnsNspirePreviewIsolationV5";
  const RUNTIME_VERSION = "20260903-nspire-runtime-v5";
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
      // Generated LuaJS calls helpers such as lua_eq(...) through bare global
      // identifiers. Keep the actual binding synchronized with window.*.
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

  function parseLuaBaseInteger(text, radix) {
    let source = String(text).trim();
    if (!source) return null;

    let sign = 1;
    if (source[0] === "+" || source[0] === "-") {
      if (source[0] === "-") sign = -1;
      source = source.slice(1);
    }
    if (!source) return null;

    let value = 0;
    for (const ch of source.toLowerCase()) {
      const code = ch.charCodeAt(0);
      let digit = -1;
      if (code >= 48 && code <= 57) digit = code - 48;
      else if (code >= 97 && code <= 122) digit = code - 97 + 10;
      if (digit < 0 || digit >= radix) return null;
      value = value * radix + digit;
    }
    return sign * value;
  }

  function installTiTonumberSemantics() {
    const root = window;
    const globals = root.G?.str;
    const current = globals?.tonumber;
    if (typeof current !== "function" || current.__tnsTiTonumberV5) return;

    const safeTonumber = function (value, base) {
      // Lua tonumber(number) returns the number itself. JavaScript NaN is not a
      // valid failed-conversion sentinel in Lua, so normalize it to nil.
      if (typeof value === "number") {
        return [Number.isNaN(value) ? null : value];
      }
      if (typeof value !== "string") return [null];

      const text = value.trim();
      if (!text) return [null];

      // With an explicit base, Lua expects an integer representation and the
      // whole string must be valid for that radix.
      if (base !== undefined && base !== null) {
        const radix = Number(base);
        if (!Number.isInteger(radix) || radix < 2 || radix > 36) return [null];
        return [parseLuaBaseInteger(text, radix)];
      }

      // Standard decimal/scientific number. Reject partial matches such as
      // "12abc": JS parseFloat would return 12, while Lua tonumber returns nil.
      if (/^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/.test(text)) {
        const numeric = Number(text);
        return [Number.isNaN(numeric) ? null : numeric];
      }

      // Lua 5.1 accepts ordinary hexadecimal integer literals as numbers.
      const hex = /^([+-]?)0[xX]([0-9a-fA-F]+)$/.exec(text);
      if (hex) {
        const magnitude = parseInt(hex[2], 16);
        return [(hex[1] === "-" ? -1 : 1) * magnitude];
      }

      return [null];
    };

    safeTonumber.__tnsTiTonumberV5 = true;
    safeTonumber.__tnsTiTonumberBase = current;
    globals.tonumber = safeTonumber;

    // Diagnostic probes: invalid input must be nil; valid numeric input must
    // remain numeric. They are stored only for debugging and do not affect Lua.
    try {
      root.__tnsNspirePreviewTonumberProbe = {
        invalidIsNil: safeTonumber("not-a-number")[0] === null,
        decimal: safeTonumber("12.5")[0] === 12.5,
        trailingRejected: safeTonumber("12abc")[0] === null,
      };
    } catch (_error) {}
  }

  function installTiNilSemantics() {
    const root = window;

    // A missing Lua table field is nil. Never let JavaScript undefined escape
    // from a table read into the Lua program.
    for (const name of ["lua_rawget", "lua_tableget"]) {
      const current = root[name];
      if (typeof current !== "function" || current.__tnsTiNilReadV5) continue;

      const safeRead = function (table, key) {
        if (table == null || table === false || key === undefined || key === null) return null;
        const value = current.apply(this, arguments);
        return value === undefined ? null : value;
      };

      copyFunctionMarkers(safeRead, current);
      safeRead.__tnsTiNilReadV5 = true;
      safeRead.__tnsTiNilReadBase = current;
      bindGeneratedLuaSymbol(name, safeRead);
    }

    // The parser compiles `x == nil` to the bare JS call `lua_eq(x, null)`.
    const currentEq = root.lua_eq;
    if (typeof currentEq === "function" && !currentEq.__tnsTiNilEqV5) {
      const safeEq = function (left, right) {
        const leftNil = left === undefined || left === null;
        const rightNil = right === undefined || right === null;
        if (leftNil || rightNil) return leftNil && rightNil;
        return currentEq.apply(this, arguments);
      };
      copyFunctionMarkers(safeEq, currentEq);
      safeEq.__tnsTiNilEqV5 = true;
      safeEq.__tnsTiNilEqBase = currentEq;
      bindGeneratedLuaSymbol("lua_eq", safeEq);
    }

    const typeFn = root.G?.str?.type;
    if (typeof typeFn === "function" && !typeFn.__tnsTiNilTypeV5) {
      const safeType = function (value) {
        if (value === undefined || value === null) return ["nil"];
        return typeFn.apply(this, arguments);
      };
      safeType.__tnsTiNilTypeV5 = true;
      safeType.__tnsTiNilTypeBase = typeFn;
      root.G.str.type = safeType;
    }

    installTiTonumberSemantics();

    let equalityProbe = false;
    try { equalityProbe = (0, eval)("lua_eq(null, null) === true"); } catch (_error) {}
    root.__tnsNspirePreviewNilEqualityProbe = equalityProbe;
    root.__tnsNspirePreviewNilSemanticsV5 = true;
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
