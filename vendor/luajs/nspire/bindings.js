console.info("bindings.js");


G.str['PCspire'] = lua_newtable();

lua_tableset(G.str['PCspire'], 'setTitle', (function (_t) {
  var tmp;
  
  return [];
}))
lua_tableset(G.str['PCspire'], 'setUpKeyboard', (function () {
  var tmp;
  
  return [];
}))
lua_tableset(G.str['PCspire'], 'getHeight', (function () {
  var tmp;
  return [212];
  return [];
}))
lua_tableset(G.str['PCspire'], 'getWidth', (function () {
  var tmp;
  return [318];
  return [];
}))
lua_tableset(G.str['PCspire'], 'getMicroTime', (function () {
  var tmp;
  return [(new Date()).getTime()/1000];
  return [];
}))
lua_tableset(G.str['PCspire'], 'sleep', (function (_t) {
  var tmp;
  
  return [];
}))

lua_tableset(G.str['PCspire'], 'callEvent', (function (_f) {
  var tmp;
  var varargs = slice(arguments, 1);
  if (lua_true(_f)) {
	return lua_call(_f, varargs);
  }
  return [];
}))

function callEvent(_event) {
	var tmp;
	var varargs = slice(arguments, 1);
	if (lua_true(lua_tableget(G.str['on'], _event))) {
		lua_call(lua_tableget(G.str['on'], _event),  varargs);
	}
}

// Compatibility for older TI-Nspire Lua programs.
//
// app.js installs its own Lua-pattern bridge after lua.js has loaded. Real
// calculator programs often contain strings such as "\*" which LuaJS turns
// into "*" before string.find sees them. A naked repetition token is invalid
// in JavaScript RegExp, so make the bridge tolerant in the same way the old
// preview was while preserving normal Lua pattern behaviour.
(function installTnsLuaPatternCompatibility() {
  if (typeof window === 'undefined') return;

  function escapeRegexChar(ch) {
    return /[\\^$.*+?()[\]{}|/]/.test(ch) ? '\\' + ch : ch;
  }

  function classSource(code) {
    var map = {
      a: 'A-Za-z', d: '0-9', l: 'a-z', u: 'A-Z',
      w: 'A-Za-z0-9_', x: 'A-Fa-f0-9', s: '\\s',
      c: '\\x00-\\x1F\\x7F', p: '!"#$%&\\\'()*+,\\-./:;<=>?@[\\]\\\\^_`{|}~',
      z: '\\x00'
    };
    if (Object.prototype.hasOwnProperty.call(map, code)) return map[code];
    var lower = String(code || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(map, lower) && code !== lower) {
      var positive = map[lower];
      if (positive.charAt(0) === '\\' && positive.length === 2) return '^' + positive;
      return '^' + positive;
    }
    return escapeRegexChar(code);
  }

  function translateClass(pattern, start) {
    var out = '[';
    var index = start + 1;
    if (pattern.charAt(index) === '^') {
      out += '^';
      index += 1;
    }
    for (; index < pattern.length; index += 1) {
      var ch = pattern.charAt(index);
      if (ch === ']') return { source: out + ']', end: index };
      if (ch === '%' && index + 1 < pattern.length) {
        index += 1;
        out += classSource(pattern.charAt(index));
      } else if (ch === '\\') {
        out += '\\\\';
      } else {
        out += ch;
      }
    }
    return { source: '\\[', end: start };
  }

  function compatibleLuaPatternToRegExp(pattern) {
    pattern = String(pattern == null ? '' : pattern);
    var out = '';
    var canRepeat = false;

    for (var index = 0; index < pattern.length; index += 1) {
      var ch = pattern.charAt(index);

      if (ch === '%') {
        var next = pattern.charAt(index + 1);
        if (!next) {
          out += '%';
          canRepeat = true;
          continue;
        }
        index += 1;

        if (next === 'b' && index + 2 < pattern.length) {
          var open = pattern.charAt(index + 1);
          var close = pattern.charAt(index + 2);
          index += 2;
          out += escapeRegexChar(open) + '[^' + escapeRegexChar(open) + escapeRegexChar(close) + ']*' + escapeRegexChar(close);
          canRepeat = true;
          continue;
        }

        var classes = {
          a: '[A-Za-z]', A: '[^A-Za-z]',
          c: '[\\x00-\\x1F\\x7F]', C: '[^\\x00-\\x1F\\x7F]',
          d: '\\d', D: '\\D',
          l: '[a-z]', L: '[^a-z]',
          p: '[!"#$%&\\\'()*+,\\-./:;<=>?@[\\]\\\\^_`{|}~]',
          P: '[^!"#$%&\\\'()*+,\\-./:;<=>?@[\\]\\\\^_`{|}~]',
          s: '\\s', S: '\\S',
          u: '[A-Z]', U: '[^A-Z]',
          w: '[A-Za-z0-9_]', W: '[^A-Za-z0-9_]',
          x: '[A-Fa-f0-9]', X: '[^A-Fa-f0-9]',
          z: '\\x00'
        };
        out += Object.prototype.hasOwnProperty.call(classes, next) ? classes[next] : escapeRegexChar(next);
        canRepeat = true;
        continue;
      }

      if (ch === '[') {
        var translated = translateClass(pattern, index);
        out += translated.source;
        index = translated.end;
        canRepeat = true;
        continue;
      }

      if (ch === '(') {
        out += '(';
        canRepeat = false;
        continue;
      }
      if (ch === ')') {
        out += ')';
        canRepeat = true;
        continue;
      }
      if (ch === '^') {
        out += index === 0 ? '^' : '\\^';
        canRepeat = false;
        continue;
      }
      if (ch === '$') {
        out += index === pattern.length - 1 ? '$' : '\\$';
        canRepeat = true;
        continue;
      }
      if (ch === '.') {
        out += '[\\s\\S]';
        canRepeat = true;
        continue;
      }

      if (ch === '*' || ch === '+' || ch === '?' || ch === '-') {
        if (canRepeat) {
          out += ch === '-' ? '*?' : ch;
        } else {
          // Old TI programs commonly use "\*" in a Lua string. LuaJS turns
          // that into "*" before we see it, so a leading magic token must be
          // treated as a literal instead of creating an invalid JS RegExp.
          out += escapeRegexChar(ch);
          canRepeat = true;
        }
        continue;
      }

      out += escapeRegexChar(ch);
      canRepeat = true;
    }

    try {
      return new RegExp(out, 'g');
    } catch (_error) {
      // Last-resort compatibility: never let string.find crash the whole
      // ScriptApp because a TI pattern cannot be represented by JS RegExp.
      return new RegExp(String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    }
  }

  window.luaPatternToRegExp = compatibleLuaPatternToRegExp;
  try { luaPatternToRegExp = compatibleLuaPatternToRegExp; } catch (_error) {}
})();

// Finish the TI document environment after createLuaJsPreviewRuntime has
// installed var.store/var.recall and injected the symbols extracted from the
// current Problem XML.
(function installTnsDocumentEnvironmentBridge() {
  if (typeof window === 'undefined') return;
  var baseline = {};
  try {
    Object.keys((window.G && window.G.str) || {}).forEach(function (key) { baseline[key] = true; });
  } catch (_error) {}

  var schedule = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : function (fn) { Promise.resolve().then(fn); };

  schedule(function () {
    var global = window;
    var root = global.G && global.G.str;
    if (!root || root.love) return; // LÖVE project runtime, not TI ScriptApp.

    // The LÖVE/TI wrapper uses a transparent internal canvas. TI-Nspire pages
    // are white by default, so keep transparent pixels visually white.
    try {
      var visibleCanvas = document.getElementById('love-preview-canvas');
      if (visibleCanvas) visibleCanvas.style.backgroundColor = '#ffffff';
    } catch (_error) {}

    var varTable = root['var'];
    if (!varTable || typeof global.lua_tableget !== 'function' || typeof global.lua_tableset !== 'function') return;
    var storeFn = global.lua_tableget(varTable, 'store');
    var recallFn = global.lua_tableget(varTable, 'recall');
    if (typeof recallFn !== 'function') return;

    var tracked = new Set();

    function recallValue(name) {
      try {
        var result = global.lua_call(recallFn, [name]);
        return Array.isArray(result) ? result[0] : null;
      } catch (_error) {
        return null;
      }
    }

    // Symbols extracted from <sym> are copied into G.str before the user code
    // is booted. Only keep names that var.recall confirms are document/store
    // variables; ordinary Lua globals are deliberately excluded.
    try {
      Object.keys(root).forEach(function (name) {
        if (baseline[name]) return;
        if (recallValue(name) != null) tracked.add(name);
      });
    } catch (_error) {}

    if (typeof storeFn === 'function' && !storeFn.__tnsDocumentBridge) {
      var wrappedStore = function (key, value) {
        var name = String(key == null ? '' : key);
        if (name) tracked.add(name);
        return global.lua_call(storeFn, [key, value]);
      };
      wrappedStore.__tnsDocumentBridge = true;
      global.lua_tableset(varTable, 'store', wrappedStore);
    }

    global.lua_tableset(varTable, 'list', function () {
      // Discover symbols that existed before this compatibility task ran and
      // symbols added later by var.store.
      try {
        Object.keys(root).forEach(function (name) {
          if (recallValue(name) != null) tracked.add(name);
        });
      } catch (_error) {}
      var names = Array.from(tracked).filter(Boolean).sort();
      var table = global.lua_newtable();
      for (var i = 0; i < names.length; i += 1) global.lua_tableset(table, i + 1, names[i]);
      return [table];
    });

    global.__tnsDocumentEnvironmentActive = true;
  });
})();

// love-project-compat installs extra table-object methods globally after the
// LuaJS hardening step. Those fallbacks are useful for LÖVE Image/Texture/etc.,
// but a TI ScriptApp must keep ordinary Lua table semantics. Some old programs
// also expose plain JS arrays/objects through compatibility helpers; treat
// those as 1-based Lua containers instead of letting lua_rawget dereference a
// missing `uints` field.
(function installTnsTiTableAccessCompatibility() {
  if (typeof window === 'undefined') return;
  var schedule = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : function (fn) { Promise.resolve().then(fn); };

  schedule(function () {
    var global = window;
    var root = global.G && global.G.str;
    if (!root || root.love) return;

    function isLuaJsTable(value) {
      return !!(value && typeof value === 'object' && (
        value.str !== undefined || value.uints !== undefined || value.floats !== undefined ||
        value.bool !== undefined || value.bools !== undefined || value.objs !== undefined ||
        value.arraymode !== undefined
      ));
    }

    function directContainerGet(table, key) {
      if (Array.isArray(table)) {
        if (typeof key === 'number' && Number.isInteger(key)) return table[key - 1];
        return table[key];
      }
      if (table && typeof table === 'object' && !isLuaJsTable(table)) {
        if (Object.prototype.hasOwnProperty.call(table, key)) return table[key];
        if (typeof key === 'number' && Object.prototype.hasOwnProperty.call(table, key - 1)) return table[key - 1];
      }
      return undefined;
    }

    var tableGet = global.lua_tableget;
    if (typeof tableGet === 'function' && !tableGet.__tnsTiSafeAccess) {
      var safeTableGet = function (table, key) {
        if (table == null || table === false || key == null) return null;
        var direct = directContainerGet(table, key);
        if (direct !== undefined) return direct;
        try {
          return tableGet(table, key);
        } catch (error) {
          var message = String(error && error.message || error || '');
          if (/Cannot read properties of (?:undefined|null)|Table is null|Unable to index key|Unsupported key for table|Table index is nil/.test(message)) {
            direct = directContainerGet(table, key);
            return direct === undefined ? null : direct;
          }
          throw error;
        }
      };
      safeTableGet.__tnsTiSafeAccess = true;
      safeTableGet.__tnsTiBaseTableGet = tableGet;
      global.lua_tableget = safeTableGet;
      try { lua_tableget = safeTableGet; } catch (_error) {}
    }

    var rawGet = global.lua_rawget;
    if (typeof rawGet === 'function' && !rawGet.__tnsTiSafeAccess) {
      var safeRawGet = function (table, key) {
        if (table == null || table === false || key == null) return null;
        var direct = directContainerGet(table, key);
        if (direct !== undefined) return direct;
        try {
          return rawGet(table, key);
        } catch (error) {
          var message = String(error && error.message || error || '');
          if (/Cannot read properties of (?:undefined|null)|Table is null|Unsupported key for table|Table index is nil/.test(message)) {
            direct = directContainerGet(table, key);
            return direct === undefined ? null : direct;
          }
          throw error;
        }
      };
      safeRawGet.__tnsTiSafeAccess = true;
      safeRawGet.__tnsTiBaseRawGet = rawGet;
      global.lua_rawget = safeRawGet;
      try { lua_rawget = safeRawGet; } catch (_error) {}
    }
  });
})();
