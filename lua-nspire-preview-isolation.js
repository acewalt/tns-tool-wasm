(() => {
  "use strict";

  const INSTALL_MARK = "__tnsNspirePreviewIsolationV2";
  const RUNTIME_VERSION = "20260903-nspire-runtime-v2";
  const BASE_RUNTIME_FILES = [
    "vendor/luajs/lua.js",
    "vendor/luajs/nspire/env.js",
    "vendor/luajs/nspire/tools.js",
    "vendor/luajs/nspire/bindings.js",
    "vendor/luajs/nspire/platform.js",
    "vendor/luajs/nspire/timer.js",
    "vendor/luajs/nspire/locale.js",
  ];

  function luaTableKeys(table) {
    const props = [];
    for (const key in table?.str || {}) props.push(key);
    if (table?.arraymode) {
      for (let index = (table.uints?.length || 0) - 1; index >= 0; index -= 1) {
        if (table.uints[index] != null) props.push(index + 1);
      }
    } else {
      for (const key in table?.uints || {}) props.push(Number(key));
    }
    for (const key in table?.floats || {}) props.push(Number(key));
    const boolTable = table?.bool || table?.bools || {};
    for (const key in boolTable) props.push(key === "true");
    const objectKeys = Array.isArray(table?.objs) ? table.objs : [];
    for (const entry of objectKeys) {
      if (Array.isArray(entry) && entry[0] !== undefined && entry[0] !== null) props.push(entry[0]);
    }
    return props.filter((key) => key !== undefined && key !== null);
  }

  function reorderPairsProps(table, props) {
    const muIndex = props.indexOf("μ");
    const sigmaIndex = props.indexOf("σ");
    if (muIndex < 0 || sigmaIndex < 0) return props;
    const insertAt = Math.min(muIndex, sigmaIndex);
    props.splice(Math.max(muIndex, sigmaIndex), 1);
    props.splice(Math.min(muIndex, sigmaIndex), 1);
    props.splice(insertAt, 0, "σ", "μ");
    return props;
  }

  async function loadFreshNspireLuaJsSources() {
    const sources = [];
    for (const file of BASE_RUNTIME_FILES) {
      const separator = file.includes("?") ? "&" : "?";
      const response = await fetch(`./${file}${separator}v=${RUNTIME_VERSION}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
      sources.push(await response.text());
    }

    // The current repository runtime uses the direct lua_add/lua_subtract
    // implementation. If an obsolete cached arithmetic shim appears here,
    // fail explicitly instead of silently executing the wrong runtime.
    if (sources.some((source) => /\bfunction\s+binaryArithmetic\b/.test(String(source)))) {
      throw new Error(`Obsolete LuaJS arithmetic runtime detected (${RUNTIME_VERSION})`);
    }

    window.__tnsNspirePreviewRuntimeBuild = RUNTIME_VERSION;
    return sources;
  }

  // TI-Nspire hardening only. This keeps the platform/on/gc bridge used by the
  // normal ScriptApp Preview LÖVE, but excludes LÖVE-project/LuaJIT/ffi and
  // every Ndless ARM path.
  function hardenNspireLuaJsRuntime() {
    const originalRawGet = window.lua_rawget;
    const originalRawSet = window.lua_rawset;
    const originalTableGet = window.lua_tableget;
    const originalTableSet = window.lua_tableset;
    const originalLen = window.lua_len;
    const originalConcat = window.lua_concat;
    const originalCall = window.lua_call;
    const originalLt = window.lua_lt;
    const originalLte = window.lua_lte;
    const emptyIterator = () => [null, null];

    window.lua_rawget = (table, key) => {
      if (table == null || table === false || key === undefined || key === null) return null;
      try {
        return originalRawGet(table, key);
      } catch (error) {
        if (typeof key === "object" && /Cannot read properties|Unsupported key for table|Table index is nil/.test(String(error?.message || ""))) {
          const objectKeys = Array.isArray(table.objs) ? table.objs : [];
          for (const entry of objectKeys) {
            if (Array.isArray(entry) && entry[0] === key) return entry[1];
          }
          return null;
        }
        throw error;
      }
    };

    window.lua_rawset = (table, key, value) => {
      if (table == null || table === false || key === undefined || key === null) return [];
      try {
        return originalRawSet(table, key, value);
      } catch (error) {
        if (typeof key === "object" && /Cannot read properties|Unsupported key for table|Table index is nil/.test(String(error?.message || ""))) {
          if (!Array.isArray(table.objs)) table.objs = [];
          const index = table.objs.findIndex((entry) => Array.isArray(entry) && entry[0] === key);
          if (index >= 0) {
            if (value == null) table.objs.splice(index, 1);
            else table.objs[index][1] = value;
          } else if (value != null) {
            table.objs.push([key, value]);
          }
          return [];
        }
        throw error;
      }
    };

    const luaNext = (table, key = null) => {
      if (table == null || table === false || typeof table !== "object") return [null, null];
      const props = luaTableKeys(table);
      reorderPairsProps(table, props);
      const start = key == null ? 0 : props.findIndex((candidate) => candidate === key) + 1;
      if (key != null && start <= 0) return [null, null];
      for (let index = start; index < props.length; index += 1) {
        const entryKey = props[index];
        if (entryKey === undefined || entryKey === null) continue;
        const entry = window.lua_rawget(table, entryKey);
        if (entry != null) return [entryKey, entry];
      }
      return [null, null];
    };

    window.lua_tableget = (table, key) => {
      if (table == null || table === false || key === undefined || key === null) return null;
      try {
        return originalTableGet(table, key);
      } catch (error) {
        if (/Table is null|Unable to index key|Unsupported key for table|Table index is nil/.test(String(error?.message || ""))) return null;
        throw error;
      }
    };

    window.lua_tableset = (table, key, value) => {
      if (table == null || table === false || key === undefined || key === null) return [];
      try {
        return originalTableSet(table, key, value);
      } catch (error) {
        if (/Table is null|Unable to index key|Unsupported key for table|Table index is nil/.test(String(error?.message || ""))) return [];
        throw error;
      }
    };

    window.lua_len = (value) => (value == null || value === false ? 0 : originalLen(value));

    window.lua_concat = (left, right) => {
      const safeLeft = left == null || left === false ? "" : left;
      const safeRight = right == null || right === false ? "" : right;
      try {
        return originalConcat(safeLeft, safeRight);
      } catch (error) {
        if (/metatable|Unable to concat/.test(String(error?.message || ""))) {
          return `${safeLeft ?? ""}${safeRight ?? ""}`;
        }
        throw error;
      }
    };

    window.lua_call = (func, args = []) => {
      if (func == null || func === false) return [];
      try {
        return originalCall(func, args);
      } catch (error) {
        if (error && Array.isArray(error.vars)) return error.vars;
        if (/metatable|Could not call/.test(String(error?.message || ""))) return [];
        throw error;
      }
    };

    const safeComparable = (value) => (value == null || value === false ? 0 : value);
    window.lua_lt = (left, right) => {
      try {
        return originalLt(safeComparable(left), safeComparable(right));
      } catch (error) {
        if (/Unable to compare/.test(String(error?.message || ""))) return false;
        throw error;
      }
    };
    window.lua_lte = (left, right) => {
      try {
        return originalLte(safeComparable(left), safeComparable(right));
      } catch (error) {
        if (/Unable to compare/.test(String(error?.message || ""))) return false;
        throw error;
      }
    };

    if (window.G?.str) {
      window.G.str.ipairs = (table) => {
        if (table == null || table === false || typeof table !== "object") {
          return [emptyIterator, window.lua_newtable(), 0];
        }
        return [
          (target, index) => {
            if (target == null || target === false || typeof target !== "object") return [null, null];
            const entry = target.arraymode ? target.uints[index] : target.uints[index + 1];
            return entry == null ? [null, null] : [index + 1, entry];
          },
          table,
          0,
        ];
      };
      window.G.str.next = luaNext;
      window.G.str.pairs = (table) => {
        if (table == null || table === false || typeof table !== "object") {
          return [emptyIterator, window.lua_newtable(), null];
        }
        const props = luaTableKeys(table);
        reorderPairsProps(table, props);
        let cursor = 0;
        return [
          (target) => {
            while (cursor < props.length) {
              const key = props[cursor];
              cursor += 1;
              if (key === undefined || key === null) continue;
              const entry = window.lua_rawget(target, key);
              if (entry != null) return [key, entry];
            }
            return [null, null];
          },
          table,
          null,
        ];
      };
    }
  }

  function installIsolation() {
    const currentCreate = window.createLuaJsPreviewRuntime;
    if (typeof currentCreate !== "function") return false;
    if (currentCreate[INSTALL_MARK]) return true;

    const isolatedCreate = async function (...args) {
      const savedLoader = window.loadLuaJsRuntimeSources;
      const savedHarden = window.hardenLuaJsPreviewRuntime;

      // Do not call the shared/cached loader here. It can have been wrapped by
      // love-project-compat.js and it also keeps its own source cache. Fetching
      // the seven base TI-Nspire files directly gives this preview a clean,
      // deterministic runtime while leaving the LÖVE project bridge untouched.
      window.loadLuaJsRuntimeSources = loadFreshNspireLuaJsSources;
      window.hardenLuaJsPreviewRuntime = hardenNspireLuaJsRuntime;
      window.__tnsNspirePreviewRuntimeActive = true;

      try {
        return await currentCreate.apply(this, args);
      } finally {
        window.__tnsNspirePreviewRuntimeActive = false;
        if (window.loadLuaJsRuntimeSources === loadFreshNspireLuaJsSources) window.loadLuaJsRuntimeSources = savedLoader;
        if (window.hardenLuaJsPreviewRuntime === hardenNspireLuaJsRuntime) window.hardenLuaJsPreviewRuntime = savedHarden;
      }
    };

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
