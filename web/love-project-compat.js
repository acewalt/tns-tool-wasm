(() => {
  "use strict";

  // Expanded view is intentionally a real alternate LÖVE resolution.
  window.__tnsLovePreviewVisualZoomInstalled = true;

  function patchLoveProjectRootSelection() {
    if (typeof window.stripCommonLoveProjectRoot !== "function" || window.stripCommonLoveProjectRoot.__tnsProjectRootFixV3) return;
    const original = window.stripCommonLoveProjectRoot;

    const fixed = function (files) {
      const normalized = typeof window.normalizeLoveProjectFiles === "function"
        ? window.normalizeLoveProjectFiles(files)
        : original(files);
      if (!Array.isArray(normalized) || !normalized.length) return normalized || [];

      const directMain = normalized.find((file) => String(file.path || "").toLowerCase() === "main.lua");
      if (directMain) {
        window.__tnsLoveSelectedProjectRoot = "";
        return normalized;
      }

      const candidates = normalized
        .filter((file) => String(file.path || "").toLowerCase().endsWith("/main.lua"))
        .map((file) => {
          const path = String(file.path || "");
          const prefix = path.slice(0, -"main.lua".length);
          const lowerPrefix = prefix.toLowerCase();
          const coverage = normalized.reduce((count, entry) => count + (String(entry.path || "").startsWith(prefix) ? 1 : 0), 0);
          const hasConf = normalized.some((entry) => String(entry.path || "").toLowerCase() === `${lowerPrefix}conf.lua`);
          const hasReadme = normalized.some((entry) => {
            const p = String(entry.path || "").toLowerCase();
            return p === `${lowerPrefix}readme.md` || p === `${lowerPrefix}readme.txt`;
          });
          const depth = path.split("/").filter(Boolean).length;
          return { path, prefix, coverage, hasConf, hasReadme, depth };
        })
        .sort((a, b) =>
          Number(b.hasConf) - Number(a.hasConf) ||
          b.coverage - a.coverage ||
          Number(b.hasReadme) - Number(a.hasReadme) ||
          a.depth - b.depth ||
          a.path.length - b.path.length ||
          a.path.localeCompare(b.path)
        );

      if (!candidates.length) return normalized;
      const root = candidates[0];
      window.__tnsLoveSelectedProjectRoot = root.prefix;
      return normalized
        .filter((file) => String(file.path || "").startsWith(root.prefix))
        .map((file) => ({ ...file, path: String(file.path || "").slice(root.prefix.length) }));
    };

    fixed.__tnsProjectRootFixV3 = true;
    window.stripCommonLoveProjectRoot = fixed;
  }

  function readImageDimensions(bytes, path = "") {
    if (!(bytes instanceof Uint8Array) || bytes.length < 10) return null;
    const ext = String(path).split(".").pop().toLowerCase();
    const be16 = (i) => ((bytes[i] << 8) | bytes[i + 1]) >>> 0;
    const le16 = (i) => (bytes[i] | (bytes[i + 1] << 8)) >>> 0;
    const be32 = (i) => (((bytes[i] << 24) >>> 0) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
    const le32 = (i) => (bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)) >>> 0;

    if ((ext === "png" || (bytes[0] === 0x89 && bytes[1] === 0x50)) && bytes.length >= 24) {
      const width = be32(16);
      const height = be32(20);
      return width && height ? { width, height } : null;
    }

    if ((ext === "gif" || (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)) && bytes.length >= 10) {
      const width = le16(6);
      const height = le16(8);
      return width && height ? { width, height } : null;
    }

    if ((ext === "bmp" || (bytes[0] === 0x42 && bytes[1] === 0x4d)) && bytes.length >= 26) {
      const width = le32(18);
      const rawHeight = le32(22) | 0;
      const height = Math.abs(rawHeight);
      return width && height ? { width, height } : null;
    }

    if (ext === "jpg" || ext === "jpeg" || (bytes[0] === 0xff && bytes[1] === 0xd8)) {
      let i = 2;
      while (i + 8 < bytes.length) {
        if (bytes[i] !== 0xff) { i += 1; continue; }
        while (i < bytes.length && bytes[i] === 0xff) i += 1;
        const marker = bytes[i++];
        if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
        if (i + 1 >= bytes.length) break;
        const length = be16(i);
        if (length < 2 || i + length > bytes.length) break;
        const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
        if (isSof && length >= 7) {
          const height = be16(i + 3);
          const width = be16(i + 5);
          return width && height ? { width, height } : null;
        }
        i += length;
      }
    }

    return null;
  }

  function patchSynchronousImageDimensions() {
    if (window.__tnsLoveSyncImageDimensionsV3) return;
    window.__tnsLoveSyncImageDimensionsV3 = true;
    window.__tnsLovePendingImageDimensions = null;

    if (typeof window.findLoveProjectFile === "function" && !window.findLoveProjectFile.__tnsImageDimensionsV3) {
      const originalFind = window.findLoveProjectFile;
      const compatibleFind = function (files, path) {
        const file = originalFind.apply(this, arguments);
        const pathname = String(path || "");
        if (/\.(?:png|jpe?g|gif|bmp)$/i.test(pathname) && file?.bytes instanceof Uint8Array) {
          window.__tnsLovePendingImageDimensions = readImageDimensions(file.bytes, pathname);
        } else {
          window.__tnsLovePendingImageDimensions = null;
        }
        return file;
      };
      compatibleFind.__tnsImageDimensionsV3 = true;
      window.findLoveProjectFile = compatibleFind;
    }

    const NativeImage = window.Image;
    if (typeof NativeImage === "function" && !NativeImage.__tnsImageDimensionsV3) {
      const CompatibleImage = function (...args) {
        const element = new NativeImage(...args);
        const dims = window.__tnsLovePendingImageDimensions;
        window.__tnsLovePendingImageDimensions = null;
        if (dims?.width > 0 && dims?.height > 0) {
          element.width = dims.width;
          element.height = dims.height;
        }
        return element;
      };
      CompatibleImage.prototype = NativeImage.prototype;
      try { Object.setPrototypeOf(CompatibleImage, NativeImage); } catch (_error) {}
      CompatibleImage.__tnsImageDimensionsV3 = true;
      window.Image = CompatibleImage;
    }
  }

  patchLoveProjectRootSelection();
  patchSynchronousImageDimensions();

  const runtimeCompatSource = String.raw`
(function installTnsLoveProjectRuntimeCompatibilityV3() {
  if (typeof window === 'undefined') return;
  window.__tnsLuaCurrentVarargs = [];
  window.__tnsLuaRequireStack = [];

  function longBracketLevelAt(source, index) {
    if (source.charAt(index) !== '[') return -1;
    var cursor = index + 1;
    var level = 0;
    while (source.charAt(cursor) === '=') { level += 1; cursor += 1; }
    return source.charAt(cursor) === '[' ? level : -1;
  }

  function skipLongBracket(source, index, level) {
    var close = ']' + new Array(level + 1).join('=') + ']';
    var end = source.indexOf(close, index + level + 2);
    return end < 0 ? source.length : end + close.length;
  }

  function normalizeStatementSemicolons(source) {
    source = String(source == null ? '' : source);
    if (source.indexOf(';') < 0) return source;
    var output = source.split('');
    var braceDepth = 0;
    var index = 0;
    while (index < source.length) {
      var ch = source.charAt(index);
      if (ch === '"' || ch === "'") {
        var quote = ch;
        index += 1;
        while (index < source.length) {
          var current = source.charAt(index);
          if (current === '\\') { index += 2; continue; }
          index += 1;
          if (current === quote) break;
        }
        continue;
      }
      if (ch === '-' && source.charAt(index + 1) === '-') {
        var commentStart = index + 2;
        var commentLevel = longBracketLevelAt(source, commentStart);
        if (commentLevel >= 0) index = skipLongBracket(source, commentStart, commentLevel);
        else {
          var newline = source.indexOf('\n', commentStart);
          index = newline < 0 ? source.length : newline + 1;
        }
        continue;
      }
      if (ch === '[') {
        var stringLevel = longBracketLevelAt(source, index);
        if (stringLevel >= 0) { index = skipLongBracket(source, index, stringLevel); continue; }
      }
      if (ch === '{') braceDepth += 1;
      else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (ch === ';' && braceDepth === 0) output[index] = ' ';
      index += 1;
    }
    return output.join('');
  }

  if (typeof lua_parser !== 'undefined' && lua_parser && typeof lua_parser.parse === 'function' && !lua_parser.__tnsStatementSemicolonV3) {
    var parserBeforeSemicolons = lua_parser.parse;
    lua_parser.parse = function (source) {
      return parserBeforeSemicolons.call(lua_parser, normalizeStatementSemicolons(source));
    };
    lua_parser.__tnsStatementSemicolonV3 = true;
  }

  if (typeof lua_parser !== 'undefined' && lua_parser && typeof lua_parser.parse === 'function' && !lua_parser.__tnsChunkVarargsV3) {
    var parserBeforeVarargs = lua_parser.parse;
    lua_parser.parse = function (source) {
      var generated = String(parserBeforeVarargs.call(lua_parser, source));
      var lines = generated.split('\n');
      var declaration = "var varargs = (typeof window !== 'undefined' && Array.isArray(window.__tnsLuaCurrentVarargs)) ? window.__tnsLuaCurrentVarargs.slice() : [];";
      lines.splice(Math.min(19, lines.length), 0, declaration);
      return lines.join('\n');
    };
    lua_parser.__tnsChunkVarargsV3 = true;
  }

  if (typeof G !== 'undefined' && G && G.str && typeof lua_newtable === 'function' && typeof lua_tableset === 'function') {
    // Correct Lua string.sub, including negative indices. BYTEPATH relies on
    // file:sub(1, -5) before dynamic require() calls.
    if (G.str.string) {
      lua_tableset(G.str.string, 'sub', function (value, first, last) {
        var text = String(value == null ? '' : value);
        var length = text.length;
        var start = Number(first == null ? 1 : first);
        var finish = Number(last == null ? -1 : last);
        if (!Number.isFinite(start)) start = 1;
        if (!Number.isFinite(finish)) finish = -1;
        start = Math.trunc(start);
        finish = Math.trunc(finish);
        if (start < 0) start = length + start + 1;
        if (finish < 0) finish = length + finish + 1;
        if (start < 1) start = 1;
        if (finish > length) finish = length;
        if (start > finish || start > length || finish < 1) return [''];
        return [text.slice(start - 1, finish)];
      });

      lua_tableset(G.str.string, 'reverse', function (value) {
        return [Array.from(String(value == null ? '' : value)).reverse().join('')];
      });

      lua_tableset(G.str.string, 'format', function (format) {
        var values = Array.prototype.slice.call(arguments, 1);
        var cursor = 0;
        var source = String(format == null ? '' : format);
        return [source.replace(/%([-+ #0]*)(\d*)(?:\.(\d+))?([cdiouxXeEfgGqs%])/g, function (_all, flags, widthText, precisionText, type) {
          if (type === '%') return '%';
          var value = values[cursor++];
          var precision = precisionText === undefined ? null : Math.max(0, Number(precisionText) || 0);
          var out = '';
          var number = Number(value);
          if (type === 's') out = String(value == null ? 'nil' : value);
          else if (type === 'q') out = JSON.stringify(String(value == null ? '' : value));
          else if (type === 'c') out = String.fromCharCode(Number.isFinite(number) ? Math.trunc(number) : 0);
          else if (type === 'd' || type === 'i') out = String(Number.isFinite(number) ? Math.trunc(number) : 0);
          else if (type === 'u') out = String((Number.isFinite(number) ? Math.trunc(number) : 0) >>> 0);
          else if (type === 'x' || type === 'X') {
            out = ((Number.isFinite(number) ? Math.trunc(number) : 0) >>> 0).toString(16);
            if (type === 'X') out = out.toUpperCase();
          } else if (type === 'o') out = ((Number.isFinite(number) ? Math.trunc(number) : 0) >>> 0).toString(8);
          else if (type === 'f') out = (Number.isFinite(number) ? number : 0).toFixed(precision == null ? 6 : precision);
          else if (type === 'e' || type === 'E') {
            out = (Number.isFinite(number) ? number : 0).toExponential(precision == null ? 6 : precision);
            if (type === 'E') out = out.toUpperCase();
          } else if (type === 'g' || type === 'G') {
            out = (Number.isFinite(number) ? number : 0).toPrecision(precision == null ? 6 : Math.max(1, precision));
            out = out.replace(/(?:\.0+|(?:(\.\d*?)0+))(?=e|$)/i, '$1');
            if (type === 'G') out = out.toUpperCase();
          }
          if ((flags.indexOf('+') >= 0 || flags.indexOf(' ') >= 0) && Number.isFinite(number) && number >= 0 && /[diufeg]/i.test(type)) {
            out = (flags.indexOf('+') >= 0 ? '+' : ' ') + out;
          }
          var width = Number(widthText) || 0;
          if (width > out.length) {
            var pad = new Array(width - out.length + 1).join(flags.indexOf('0') >= 0 && flags.indexOf('-') < 0 ? '0' : ' ');
            out = flags.indexOf('-') >= 0 ? out + pad : pad + out;
          }
          return out;
        })];
      });
    }

    var jitTable = G.str.jit;
    if (!jitTable || typeof jitTable !== 'object') {
      jitTable = lua_newtable();
      G.str.jit = jitTable;
    }
    lua_tableset(jitTable, 'os', 'Windows');
    lua_tableset(jitTable, 'arch', 'x64');
    lua_tableset(jitTable, 'version', 'LuaJIT-compatible browser shim');

    var ffiTable = G.str.ffi;
    if (!ffiTable || typeof ffiTable !== 'object') {
      ffiTable = lua_newtable();
      G.str.ffi = ffiTable;
    }
    lua_tableset(ffiTable, 'cdef', function () { return []; });
    lua_tableset(ffiTable, 'load', function () {
      var nativeLibrary = lua_newtable();
      lua_tableset(nativeLibrary, 'SteamAPI_Init', function () { return [false]; });
      lua_tableset(nativeLibrary, 'SteamAPI_RestartAppIfNecessary', function () { return [false]; });
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
      for (var i = 0; i < size; i += 1) lua_tableset(buffer, i, 0);
      return [buffer];
    });
    lua_tableset(ffiTable, 'string', function (value, length) {
      if (typeof value === 'string') return [length == null ? value : value.slice(0, Math.max(0, Number(length) || 0))];
      return [''];
    });

    var requireValue = G.str.require;
    var wrapRequire = function (fn) {
      if (typeof fn !== 'function' || fn.__tnsProjectRequireWrapperV3) return fn;
      var wrapped = function (moduleName) {
        var key = String(moduleName == null ? '' : moduleName);
        if (key === 'ffi') return [ffiTable];
        if (key === 'jit') return [jitTable];
        if (key === 'bit' && G.str.bit) return [G.str.bit];
        if (key === 'bit32' && G.str.bit32) return [G.str.bit32];
        if (!key) {
          var chain = window.__tnsLuaRequireStack.length ? window.__tnsLuaRequireStack.join(' -> ') : '<root>';
          throw new Error("require received an empty module name (require chain: " + chain + ")");
        }
        var previous = window.__tnsLuaCurrentVarargs;
        window.__tnsLuaCurrentVarargs = [key];
        window.__tnsLuaRequireStack.push(key);
        try { return fn.apply(this, arguments); }
        finally {
          window.__tnsLuaRequireStack.pop();
          window.__tnsLuaCurrentVarargs = previous || [];
        }
      };
      wrapped.__tnsProjectRequireWrapperV3 = true;
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
})();`;

  function installPostHardenLoveCompatibility() {
    const w = window;
    const G = w.G;
    if (!G || !G.str || typeof w.lua_tableset !== "function" || typeof w.lua_tableget !== "function" || typeof w.lua_newtable !== "function") return;
    if (w.lua_tableset.__tnsPostHardenLoveCompatV3) return;

    const baseTableSet = w.lua_tableset;
    const baseTableGet = w.lua_tableget;
    const filterState = new WeakMap();
    const wrapState = new WeakMap();
    const graphicsStates = new WeakMap();
    const patchedGraphics = new WeakSet();
    let loveValue = G.str.love;
    let graphicsTable = null;
    let systemTable = null;
    let deprecationOutput = true;

    const stripSelf = (argsLike, table) => {
      const args = Array.prototype.slice.call(argsLike || []);
      return args[0] === table ? args.slice(1) : args;
    };
    const makeTable = (object) => {
      const table = w.lua_newtable();
      for (const [key, value] of Object.entries(object || {})) baseTableSet(table, key, value);
      return table;
    };
    const call = (fn, args = []) => typeof fn === "function" ? w.lua_call(fn, args) : [];

    function getKind(table) {
      if (!table || typeof table !== "object") return "";
      try {
        const kind = baseTableGet(table, "type");
        return typeof kind === "string" ? kind : "";
      } catch (_error) {
        return "";
      }
    }

    function patchLove(love) {
      if (!love || typeof love !== "object") return;
      baseTableSet(love, "_version", "11.5");
      baseTableSet(love, "_version_major", 11);
      baseTableSet(love, "_version_minor", 5);
      baseTableSet(love, "_version_revision", 0);
      baseTableSet(love, "_version_codename", "Mysterious Mysteries");
      baseTableSet(love, "getVersion", function () { return [11, 5, 0, "Mysterious Mysteries"]; });
      baseTableSet(love, "isVersionCompatible", function () {
        const args = stripSelf(arguments, love);
        let major, minor, revision;
        if (typeof args[0] === "string") {
          const parts = args[0].split(".");
          major = Number(parts[0]);
          minor = Number(parts[1] || 0);
          revision = Number(parts[2] || 0);
        } else {
          major = Number(args[0]);
          minor = Number(args[1] || 0);
          revision = Number(args[2] || 0);
        }
        const compatible = Number.isFinite(major) && Number.isFinite(minor) && Number.isFinite(revision)
          && major === 11 && (minor < 5 || (minor === 5 && revision <= 0));
        return [compatible];
      });
      baseTableSet(love, "hasDeprecationOutput", function () { return [deprecationOutput]; });
      baseTableSet(love, "setDeprecationOutput", function () {
        const args = stripSelf(arguments, love);
        deprecationOutput = !!args[0];
        return [];
      });
    }

    function graphicsDimensions(graphics) {
      try {
        const fn = baseTableGet(graphics, "getDimensions");
        const result = call(fn, []);
        const width = Number(result && result[0]);
        const height = Number(result && result[1]);
        if (Number.isFinite(width) && Number.isFinite(height)) return [width, height];
      } catch (_error) {}
      return [320, 240];
    }

    function installGraphicsCompat(graphics) {
      if (!graphics || typeof graphics !== "object" || patchedGraphics.has(graphics)) return;
      patchedGraphics.add(graphics);
      const state = {
        wireframe: false,
        meshCullMode: "none",
        frontFaceWinding: "ccw",
        depthCompare: null,
        depthWrite: false,
        stencilCompare: null,
        stencilValue: null,
      };
      graphicsStates.set(graphics, state);

      baseTableSet(graphics, "getCanvasFormats", function () { return [makeTable({ normal: true, rgba8: true, srgba8: true })]; });
      baseTableSet(graphics, "getImageFormats", function () { return [makeTable({ normal: true, rgba8: true, srgba8: true })]; });
      baseTableSet(graphics, "getSupported", function () {
        return [makeTable({
          clampzero: false,
          lighten: true,
          multicanvasformats: false,
          glsl3: false,
          instancing: false,
          fullnpot: true,
          pixelshaderhighp: false,
          shaderderivatives: false,
        })];
      });
      baseTableSet(graphics, "getTextureTypes", function () { return [makeTable({ "2d": true, array: false, cube: false, volume: false })]; });
      baseTableSet(graphics, "getPixelDimensions", function () {
        const dims = graphicsDimensions(graphics);
        const scale = Number(w.devicePixelRatio) || 1;
        return [Math.round(dims[0] * scale), Math.round(dims[1] * scale)];
      });
      baseTableSet(graphics, "getPixelWidth", function () { return [baseTableGet(graphics, "getPixelDimensions")()[0]]; });
      baseTableSet(graphics, "getPixelHeight", function () { return [baseTableGet(graphics, "getPixelDimensions")()[1]]; });
      baseTableSet(graphics, "setWireframe", function () {
        const args = stripSelf(arguments, graphics);
        state.wireframe = !!args[0];
        return [];
      });
      baseTableSet(graphics, "isWireframe", function () { return [state.wireframe]; });
      baseTableSet(graphics, "setMeshCullMode", function () {
        const args = stripSelf(arguments, graphics);
        state.meshCullMode = args[0] == null ? "none" : String(args[0]);
        return [];
      });
      baseTableSet(graphics, "getMeshCullMode", function () { return [state.meshCullMode]; });
      baseTableSet(graphics, "setFrontFaceWinding", function () {
        const args = stripSelf(arguments, graphics);
        state.frontFaceWinding = args[0] == null ? "ccw" : String(args[0]);
        return [];
      });
      baseTableSet(graphics, "getFrontFaceWinding", function () { return [state.frontFaceWinding]; });
      baseTableSet(graphics, "setDepthMode", function () {
        const args = stripSelf(arguments, graphics);
        if (!args.length || args[0] == null) {
          state.depthCompare = null;
          state.depthWrite = false;
        } else {
          state.depthCompare = String(args[0]);
          state.depthWrite = !!args[1];
        }
        return [];
      });
      baseTableSet(graphics, "getDepthMode", function () { return [state.depthCompare, state.depthWrite]; });
      baseTableSet(graphics, "getStencilTest", function () { return [state.stencilCompare, state.stencilValue]; });
      baseTableSet(graphics, "isGammaCorrect", function () { return [false]; });
    }

    const compatibleTableSet = function (table, key, value) {
      if (table === loveValue && key === "graphics") {
        graphicsTable = value;
        installGraphicsCompat(graphicsTable);
      }
      if (table === loveValue && key === "system") systemTable = value;
      if (table === systemTable && key === "getOS" && typeof value === "function") value = function () { return ["Web"]; };
      if (table === graphicsTable && key === "setStencilTest" && typeof value === "function") {
        const original = value;
        value = function () {
          const state = graphicsStates.get(graphicsTable);
          const args = stripSelf(arguments, graphicsTable);
          if (state) {
            state.stencilCompare = args[0] == null ? null : String(args[0]);
            state.stencilValue = args[1] == null ? null : Number(args[1]);
          }
          return original.apply(this, arguments);
        };
      }
      return baseTableSet(table, key, value);
    };
    compatibleTableSet.__tnsPostHardenLoveCompatV3 = true;
    w.lua_tableset = compatibleTableSet;

    const compatibleTableGet = function (table, key) {
      const value = baseTableGet(table, key);
      if (value != null || !table || typeof table !== "object") return value;
      const kind = getKind(table);
      const textureLike = kind === "Image" || kind === "Canvas" || kind === "Texture" || kind === "ArrayImage" || kind === "CubeImage" || kind === "VolumeImage";
      const filterable = textureLike || kind === "Font";

      if (filterable && key === "setFilter") {
        return function () {
          const args = stripSelf(arguments, table);
          filterState.set(table, [String(args[0] || "linear"), String(args[1] || args[0] || "linear"), Number(args[2] || 1)]);
          return [];
        };
      }
      if (filterable && key === "getFilter") return function () { return filterState.get(table) || ["linear", "linear", 1]; };
      if (textureLike && key === "setWrap") {
        return function () {
          const args = stripSelf(arguments, table);
          wrapState.set(table, [String(args[0] || "clamp"), String(args[1] || args[0] || "clamp")]);
          return [];
        };
      }
      if (textureLike && key === "getWrap") return function () { return wrapState.get(table) || ["clamp", "clamp"]; };
      if (textureLike && key === "getDPIScale") return function () { return [1]; };
      if (textureLike && key === "getPixelDimensions") {
        return function () {
          const getDimensions = baseTableGet(table, "getDimensions");
          const dims = call(getDimensions, [table]);
          return [Math.round(Number(dims[0])), Math.round(Number(dims[1]))];
        };
      }
      if (textureLike && key === "getPixelWidth") return function () { return [compatibleTableGet(table, "getPixelDimensions")()[0]]; };
      if (textureLike && key === "getPixelHeight") return function () { return [compatibleTableGet(table, "getPixelDimensions")()[1]]; };
      if (textureLike && key === "getTextureType") return function () { return [kind === "ArrayImage" ? "array" : kind === "CubeImage" ? "cube" : kind === "VolumeImage" ? "volume" : "2d"]; };
      if (textureLike && key === "getFormat") return function () { return ["rgba8"]; };
      if (textureLike && key === "isReadable") return function () { return [true]; };
      if (textureLike && key === "getMipmapCount") return function () { return [1]; };
      return value;
    };
    compatibleTableGet.__tnsPostHardenLoveCompatV3 = true;
    w.lua_tableget = compatibleTableGet;

    const descriptor = Object.getOwnPropertyDescriptor(G.str, "love");
    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(G.str, "love", {
        configurable: true,
        enumerable: true,
        get() { return loveValue; },
        set(value) {
          loveValue = value;
          patchLove(value);
        },
      });
    }
    if (loveValue) patchLove(loveValue);
  }

  if (typeof window.hardenLuaJsPreviewRuntime === "function" && !window.hardenLuaJsPreviewRuntime.__tnsLovePostHardenV3) {
    const originalHarden = window.hardenLuaJsPreviewRuntime;
    const compatibleHarden = function (...args) {
      const result = originalHarden.apply(this, args);
      installPostHardenLoveCompatibility();
      return result;
    };
    compatibleHarden.__tnsLovePostHardenV3 = true;
    window.hardenLuaJsPreviewRuntime = compatibleHarden;
  }

  if (typeof window.loadLuaJsRuntimeSources === "function" && !window.loadLuaJsRuntimeSources.__tnsProjectCompatV3) {
    const originalLoad = window.loadLuaJsRuntimeSources;
    const compatibleLoad = async function (...args) {
      const sources = await originalLoad.apply(this, args);
      const list = Array.isArray(sources) ? sources.slice() : [];
      if (!list.some((source) => String(source).includes("installTnsLoveProjectRuntimeCompatibilityV3"))) list.push(runtimeCompatSource);
      return list;
    };
    compatibleLoad.__tnsProjectCompatV3 = true;
    window.loadLuaJsRuntimeSources = compatibleLoad;
  }
})();
