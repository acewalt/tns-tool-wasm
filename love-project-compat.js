(() => {
  "use strict";

  // Keep the original Expanded view behavior from app.js: it intentionally
  // changes the logical LÖVE resolution and dispatches love.resize.
  // locale.js checks this flag before installing its CSS-only zoom override.
  window.__tnsLovePreviewVisualZoomInstalled = true;

  // GitHub ZIPs frequently contain many nested main.lua files in vendored
  // libraries, benchmarks and examples. Pick the main.lua whose parent covers
  // the largest share of the archive instead of whichever */main.lua happens
  // to be enumerated first.
  if (typeof window.stripCommonLoveProjectRoot === "function" && !window.stripCommonLoveProjectRoot.__tnsProjectRootFix) {
    const originalStripCommonLoveProjectRoot = window.stripCommonLoveProjectRoot;
    const fixedStripCommonLoveProjectRoot = function (files) {
      const normalized = typeof window.normalizeLoveProjectFiles === "function"
        ? window.normalizeLoveProjectFiles(files)
        : originalStripCommonLoveProjectRoot(files);

      if (!Array.isArray(normalized) || !normalized.length) return normalized || [];
      if (normalized.some((file) => String(file.path || "").toLowerCase() === "main.lua")) return normalized;

      const candidates = normalized
        .filter((file) => String(file.path || "").toLowerCase().endsWith("/main.lua"))
        .map((file) => {
          const path = String(file.path || "");
          const prefix = path.slice(0, -"main.lua".length);
          const coverage = normalized.reduce((count, entry) => count + (String(entry.path || "").startsWith(prefix) ? 1 : 0), 0);
          const depth = path.split("/").filter(Boolean).length;
          return { file, path, prefix, coverage, depth };
        })
        .sort((a, b) => b.coverage - a.coverage || a.depth - b.depth || a.path.length - b.path.length || a.path.localeCompare(b.path));

      if (!candidates.length) return normalized;
      const root = candidates[0];
      return normalized.map((file) => {
        const path = String(file.path || "");
        return path.startsWith(root.prefix) ? { ...file, path: path.slice(root.prefix.length) } : file;
      });
    };
    fixedStripCommonLoveProjectRoot.__tnsProjectRootFix = true;
    window.stripCommonLoveProjectRoot = fixedStripCommonLoveProjectRoot;
  }

  const runtimeCompatSource = String.raw`
(function installTnsLoveProjectRuntimeCompatibility() {
  if (typeof window === 'undefined' || window.__tnsLoveProjectRuntimeCompatibilityInstalled) return;
  window.__tnsLoveProjectRuntimeCompatibilityInstalled = true;
  window.__tnsLuaCurrentVarargs = [];

  // lua.js compiles top-level ... references to a JS variable named varargs,
  // but the preview previously evaluated chunks without defining it. Inject a
  // chunk-local snapshot so modules such as STI can use (...) exactly as under
  // Lua require(), where the first vararg is the module name.
  if (typeof lua_parser !== 'undefined' && lua_parser && typeof lua_parser.parse === 'function' && !lua_parser.__tnsChunkVarargsInstalled) {
    var previousParse = lua_parser.parse;
    lua_parser.parse = function (source) {
      var generated = String(previousParse.call(lua_parser, source));
      var lines = generated.split('\n');
      var declaration = "var varargs = (typeof window !== 'undefined' && Array.isArray(window.__tnsLuaCurrentVarargs)) ? window.__tnsLuaCurrentVarargs.slice() : [];";
      lines.splice(Math.min(19, lines.length), 0, declaration);
      return lines.join('\n');
    };
    lua_parser.__tnsChunkVarargsInstalled = true;
  }

  if (typeof G !== 'undefined' && G && G.str && typeof lua_newtable === 'function' && typeof lua_tableset === 'function') {
    // Minimal LuaJIT identity table. Browser previews cannot load native
    // Steam DLLs, but many LÖVE projects inspect jit.os/jit.arch first.
    var jitTable = G.str.jit;
    if (!jitTable || typeof jitTable !== 'object') {
      jitTable = lua_newtable();
      G.str.jit = jitTable;
    }
    lua_tableset(jitTable, 'os', 'Windows');
    lua_tableset(jitTable, 'arch', 'x64');
    lua_tableset(jitTable, 'version', 'LuaJIT-compatible browser shim');

    // Minimal FFI shim. cdef is accepted, native libraries return an object
    // whose SteamAPI_Init reports false, matching BYTEPATH's own graceful
    // no-Steam path. General native FFI is intentionally not pretended to be
    // available in a browser.
    var ffiTable = G.str.ffi;
    if (!ffiTable || typeof ffiTable !== 'object') {
      ffiTable = lua_newtable();
      G.str.ffi = ffiTable;
    }
    lua_tableset(ffiTable, 'cdef', function () { return []; });
    lua_tableset(ffiTable, 'load', function () {
      var nativeLibrary = lua_newtable();
      lua_tableset(nativeLibrary, 'SteamAPI_Init', function () { return [false]; });
      return [nativeLibrary];
    });
    lua_tableset(ffiTable, 'cast', function (_ctype, value) { return [value]; });
    lua_tableset(ffiTable, 'copy', function () { return []; });
    lua_tableset(ffiTable, 'new', function (ctype, sizeOrValue) {
      var buffer = lua_newtable();
      var text = String(ctype == null ? '' : ctype);
      var size = Number(sizeOrValue);
      if (!Number.isFinite(size) || size < 1) {
        var fixed = /\[(\d+)\]/.exec(text);
        size = fixed ? Number(fixed[1]) : 1;
      }
      size = Math.max(1, Math.min(1048576, Math.floor(size)));
      for (var index = 0; index < size; index += 1) lua_tableset(buffer, index, 0);
      return [buffer];
    });
    lua_tableset(ffiTable, 'string', function (value, length) {
      if (typeof value === 'string') return [length == null ? value : value.slice(0, Math.max(0, Number(length) || 0))];
      return [''];
    });

    // Intercept the require function that app.js installs after the runtime
    // sources load. Besides supplying built-in LuaJIT modules, this sets the
    // module-name vararg while the required chunk is compiled/evaluated.
    var requireValue = G.str.require;
    var wrapRequire = function (fn) {
      if (typeof fn !== 'function' || fn.__tnsProjectRequireWrapper) return fn;
      var wrapped = function (moduleName) {
        var key = String(moduleName == null ? '' : moduleName);
        if (key === 'ffi') return [ffiTable];
        if (key === 'jit') return [jitTable];
        if (key === 'bit' && G.str.bit) return [G.str.bit];
        if (key === 'bit32' && G.str.bit32) return [G.str.bit32];
        var previous = window.__tnsLuaCurrentVarargs;
        window.__tnsLuaCurrentVarargs = [key];
        try {
          return fn.apply(this, arguments);
        } finally {
          window.__tnsLuaCurrentVarargs = previous || [];
        }
      };
      wrapped.__tnsProjectRequireWrapper = true;
      return wrapped;
    };

    var descriptor = Object.getOwnPropertyDescriptor(G.str, 'require');
    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(G.str, 'require', {
        configurable: true,
        enumerable: true,
        get: function () { return requireValue; },
        set: function (value) { requireValue = wrapRequire(value); }
      });
      if (requireValue) requireValue = wrapRequire(requireValue);
    }
  }

  // love.system.getOS should identify a browser build as Web. This is what
  // love.js-targeted projects commonly branch on.
  if (typeof window.lua_tableset === 'function' && !window.lua_tableset.__tnsLoveWebOsCompat) {
    var baseTableSet = window.lua_tableset;
    var compatibleTableSet = function (table, key, value) {
      if (key === 'getOS' && typeof value === 'function') value = function () { return ['Web']; };
      return baseTableSet(table, key, value);
    };
    compatibleTableSet.__tnsLoveWebOsCompat = true;
    window.lua_tableset = compatibleTableSet;
  }

  // Common Texture/Font methods used by real LÖVE projects. app.js already
  // provides the drawable itself; these fill method-level gaps without lying
  // about advanced rendering capabilities.
  if (typeof window.lua_tableget === 'function' && !window.lua_tableget.__tnsLoveFilterCompat) {
    var baseTableGet = window.lua_tableget;
    var filters = typeof WeakMap === 'function' ? new WeakMap() : null;
    var compatibleTableGet = function (table, key) {
      var value = baseTableGet(table, key);
      if (value != null || !table || typeof table !== 'object') return value;
      var kind = null;
      try { kind = baseTableGet(table, 'type'); } catch (_error) {}
      var filterable = kind === 'Font' || kind === 'Image' || kind === 'Canvas' || kind === 'Texture';
      if (!filterable) return value;
      if (key === 'setFilter') {
        return function () {
          var args = Array.prototype.slice.call(arguments);
          if (args[0] === table) args.shift();
          if (filters) filters.set(table, [String(args[0] || 'linear'), String(args[1] || args[0] || 'linear'), Number(args[2] || 1)]);
          return [];
        };
      }
      if (key === 'getFilter') {
        return function () { return filters && filters.get(table) ? filters.get(table) : ['linear', 'linear', 1]; };
      }
      if (key === 'setWrap') return function () { return []; };
      if (key === 'getWrap') return function () { return ['clamp', 'clamp']; };
      return value;
    };
    compatibleTableGet.__tnsLoveFilterCompat = true;
    window.lua_tableget = compatibleTableGet;
  }
})();`;

  if (typeof window.loadLuaJsRuntimeSources === "function" && !window.loadLuaJsRuntimeSources.__tnsProjectCompat) {
    const originalLoadLuaJsRuntimeSources = window.loadLuaJsRuntimeSources;
    const compatibleLoadLuaJsRuntimeSources = async function (...args) {
      const sources = await originalLoadLuaJsRuntimeSources.apply(this, args);
      const list = Array.isArray(sources) ? sources.slice() : [];
      if (!list.some((source) => String(source).includes("installTnsLoveProjectRuntimeCompatibility"))) {
        list.push(runtimeCompatSource);
      }
      return list;
    };
    compatibleLoadLuaJsRuntimeSources.__tnsProjectCompat = true;
    window.loadLuaJsRuntimeSources = compatibleLoadLuaJsRuntimeSources;
  }
})();
