(() => {
  "use strict";

  const INSTALL_MARK = "__tnsNspirePreviewIsolationV1";
  const LOVE_PROJECT_SOURCE_MARK = "installTnsLoveProjectRuntimeCompatibilityV3";

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

  // This is the TI-Nspire/LuaJS hardening layer from app.js, deliberately kept
  // independent from love-project-compat.js. It contains no LÖVE project,
  // LuaJIT, ffi or Ndless behavior.
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

      // A normal TI-Nspire ScriptApp must not inherit the compatibility source
      // that love-project-compat.js appends for multi-file LÖVE/LuaJIT projects.
      const filteredLoader = async function (...loaderArgs) {
        if (typeof savedLoader !== "function") return [];
        const sources = await savedLoader.apply(this, loaderArgs);
        if (!Array.isArray(sources)) return sources;
        return sources.filter((source) => !String(source).includes(LOVE_PROJECT_SOURCE_MARK));
      };

      window.loadLuaJsRuntimeSources = filteredLoader;
      window.hardenLuaJsPreviewRuntime = hardenNspireLuaJsRuntime;
      window.__tnsNspirePreviewRuntimeActive = true;

      try {
        return await currentCreate.apply(this, args);
      } finally {
        window.__tnsNspirePreviewRuntimeActive = false;
        // Do not overwrite a newer patch that another script installed while the
        // async runtime was booting.
        if (window.loadLuaJsRuntimeSources === filteredLoader) window.loadLuaJsRuntimeSources = savedLoader;
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
