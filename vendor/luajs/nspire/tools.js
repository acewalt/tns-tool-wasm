console.info("tools.js")

// Compatibility fixes for the LuaJS runtime used by the LÖVE preview.
// Keep source length/line positions stable whenever possible so parser errors
// still point at the original project source.
(function installLuaParserCompatibility() {
  if (typeof lua_parser === 'undefined' || !lua_parser || typeof lua_parser.parse !== 'function') return;
  if (lua_parser.__tnsToolCompatibilityInstalled) return;

  var originalParse = lua_parser.parse;

  function longBracketLevelAt(source, index) {
    if (source.charAt(index) !== '[') return -1;
    var cursor = index + 1;
    var level = 0;
    while (source.charAt(cursor) === '=') {
      level += 1;
      cursor += 1;
    }
    return source.charAt(cursor) === '[' ? level : -1;
  }

  function skipLongBracket(source, index, level) {
    var close = ']' + new Array(level + 1).join('=') + ']';
    var start = index + level + 2;
    var end = source.indexOf(close, start);
    return end < 0 ? source.length : end + close.length;
  }

  function normalizeLuaParserSource(source) {
    source = String(source == null ? '' : source);
    if (source.indexOf(';') < 0) return source;

    var output = source.split('');
    var index = 0;
    while (index < source.length) {
      var ch = source.charAt(index);

      // Quoted strings.
      if (ch === '"' || ch === "'") {
        var quote = ch;
        index += 1;
        while (index < source.length) {
          ch = source.charAt(index);
          if (ch === '\\') {
            index += 2;
            continue;
          }
          index += 1;
          if (ch === quote) break;
        }
        continue;
      }

      // Comments, including --[=[ long comments ]=].
      if (ch === '-' && source.charAt(index + 1) === '-') {
        var commentStart = index + 2;
        var commentLevel = longBracketLevelAt(source, commentStart);
        if (commentLevel >= 0) {
          index = skipLongBracket(source, commentStart, commentLevel);
        } else {
          var newline = source.indexOf('\n', commentStart);
          index = newline < 0 ? source.length : newline + 1;
        }
        continue;
      }

      // Long strings: [[...]], [=[...]=], etc.
      if (ch === '[') {
        var stringLevel = longBracketLevelAt(source, index);
        if (stringLevel >= 0) {
          index = skipLongBracket(source, index, stringLevel);
          continue;
        }
      }

      // lua.js accepts ordinary statement separators, but its grammar rejects
      // the valid Lua 5.1 forms `return;` and `break;` used by real projects.
      // Replace only that terminator with a space; do not touch semicolons in
      // table constructors or strings.
      if (/[A-Za-z_]/.test(ch)) {
        var start = index;
        index += 1;
        while (index < source.length && /[A-Za-z0-9_]/.test(source.charAt(index))) index += 1;
        var token = source.slice(start, index);
        if (token === 'return' || token === 'break') {
          var cursor = index;
          while (cursor < source.length && (source.charAt(cursor) === ' ' || source.charAt(cursor) === '\t' || source.charAt(cursor) === '\r')) cursor += 1;
          if (source.charAt(cursor) === ';') output[cursor] = ' ';
        }
        continue;
      }

      index += 1;
    }
    return output.join('');
  }

  lua_parser.parse = function (source) {
    return originalParse.call(lua_parser, normalizeLuaParserSource(source));
  };
  lua_parser.__tnsToolCompatibilityInstalled = true;
  lua_parser.__tnsToolNormalizeSource = normalizeLuaParserSource;
})();

// Lua 5.2 bit32 compatibility. LÖVE projects often carry binary parsers that
// use bit32 even when they otherwise target Lua 5.1/LuaJIT.
(function installBit32Compatibility() {
  if (typeof G === 'undefined' || !G.str || typeof lua_newtable !== 'function' || typeof lua_tableset !== 'function') return;
  if (G.str.bit32) return;

  var bit32Table = lua_newtable();
  var toUint32 = function (value) { return Number(value) >>> 0; };
  var toInt32 = function (value) { return Number(value) | 0; };
  var argsArray = function (args) { return Array.prototype.slice.call(args); };

  lua_tableset(bit32Table, 'band', function () {
    var args = argsArray(arguments);
    var value = 0xFFFFFFFF;
    for (var i = 0; i < args.length; i += 1) value = (value & toUint32(args[i])) >>> 0;
    return [value >>> 0];
  });
  lua_tableset(bit32Table, 'bor', function () {
    var args = argsArray(arguments);
    var value = 0;
    for (var i = 0; i < args.length; i += 1) value = (value | toUint32(args[i])) >>> 0;
    return [value >>> 0];
  });
  lua_tableset(bit32Table, 'bxor', function () {
    var args = argsArray(arguments);
    var value = 0;
    for (var i = 0; i < args.length; i += 1) value = (value ^ toUint32(args[i])) >>> 0;
    return [value >>> 0];
  });
  lua_tableset(bit32Table, 'bnot', function (value) {
    return [(~toUint32(value)) >>> 0];
  });
  lua_tableset(bit32Table, 'btest', function () {
    var args = argsArray(arguments);
    var value = 0xFFFFFFFF;
    for (var i = 0; i < args.length; i += 1) value = (value & toUint32(args[i])) >>> 0;
    return [value !== 0];
  });
  lua_tableset(bit32Table, 'lshift', function (value, displacement) {
    var shift = Number(displacement) || 0;
    if (shift < 0) {
      shift = -shift;
      return [shift >= 32 ? 0 : (toUint32(value) >>> shift) >>> 0];
    }
    return [shift >= 32 ? 0 : (toUint32(value) << shift) >>> 0];
  });
  lua_tableset(bit32Table, 'rshift', function (value, displacement) {
    var shift = Number(displacement) || 0;
    if (shift < 0) {
      shift = -shift;
      return [shift >= 32 ? 0 : (toUint32(value) << shift) >>> 0];
    }
    return [shift >= 32 ? 0 : (toUint32(value) >>> shift) >>> 0];
  });
  lua_tableset(bit32Table, 'arshift', function (value, displacement) {
    var shift = Number(displacement) || 0;
    if (shift < 0) {
      shift = -shift;
      return [shift >= 32 ? 0 : (toUint32(value) << shift) >>> 0];
    }
    if (shift >= 32) return [toInt32(value) < 0 ? 0xFFFFFFFF : 0];
    return [(toInt32(value) >> shift) >>> 0];
  });
  lua_tableset(bit32Table, 'lrotate', function (value, displacement) {
    var shift = ((Number(displacement) || 0) % 32 + 32) % 32;
    var n = toUint32(value);
    if (shift === 0) return [n];
    return [((n << shift) | (n >>> (32 - shift))) >>> 0];
  });
  lua_tableset(bit32Table, 'rrotate', function (value, displacement) {
    var shift = ((Number(displacement) || 0) % 32 + 32) % 32;
    var n = toUint32(value);
    if (shift === 0) return [n];
    return [((n >>> shift) | (n << (32 - shift))) >>> 0];
  });
  lua_tableset(bit32Table, 'extract', function (value, field, width) {
    field = Math.max(0, Math.min(31, Number(field) || 0));
    width = width == null ? 1 : Math.max(1, Number(width) || 1);
    width = Math.min(width, 32 - field);
    var mask = width >= 32 ? 0xFFFFFFFF : (Math.pow(2, width) - 1) >>> 0;
    return [((toUint32(value) >>> field) & mask) >>> 0];
  });
  lua_tableset(bit32Table, 'replace', function (value, replacement, field, width) {
    field = Math.max(0, Math.min(31, Number(field) || 0));
    width = width == null ? 1 : Math.max(1, Number(width) || 1);
    width = Math.min(width, 32 - field);
    var mask = width >= 32 ? 0xFFFFFFFF : (Math.pow(2, width) - 1) >>> 0;
    var shiftedMask = field === 0 ? mask : (mask << field) >>> 0;
    var result = (toUint32(value) & (~shiftedMask)) >>> 0;
    result = (result | (((toUint32(replacement) & mask) << field) >>> 0)) >>> 0;
    return [result];
  });

  G.str.bit32 = bit32Table;
})();

// Install the LÖVE 11.5 base-module version API as soon as app.js publishes
// the runtime's `love` table. This avoids adding another silent stub and lets
// libraries perform normal feature/version checks.
(function installLoveBaseCompatibilityHook() {
  if (typeof G === 'undefined' || !G.str || typeof lua_tableset !== 'function' || typeof lua_tableget !== 'function') return;

  var loveValue = G.str.love;
  var deprecationOutput = true;

  function patchLove(love) {
    if (!love || typeof love !== 'object') return;
    lua_tableset(love, '_version', '11.5');
    lua_tableset(love, '_version_major', 11);
    lua_tableset(love, '_version_minor', 5);
    lua_tableset(love, '_version_revision', 0);
    lua_tableset(love, '_version_codename', 'Mysterious Mysteries');

    if (!lua_tableget(love, 'getVersion')) {
      lua_tableset(love, 'getVersion', function () {
        return [11, 5, 0, 'Mysterious Mysteries'];
      });
    }
    if (!lua_tableget(love, 'isVersionCompatible')) {
      lua_tableset(love, 'isVersionCompatible', function () {
        var args = Array.prototype.slice.call(arguments);
        if (args[0] === love) args.shift();
        var major;
        var minor;
        var revision;
        if (typeof args[0] === 'string') {
          var parts = args[0].split('.');
          major = Number(parts[0]);
          minor = Number(parts[1] || 0);
          revision = Number(parts[2] || 0);
        } else {
          major = Number(args[0]);
          minor = Number(args[1] || 0);
          revision = Number(args[2] || 0);
        }
        if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(revision)) return [false];
        return [major === 11 && (minor < 5 || (minor === 5 && revision <= 0))];
      });
    }
    if (!lua_tableget(love, 'hasDeprecationOutput')) {
      lua_tableset(love, 'hasDeprecationOutput', function () { return [deprecationOutput]; });
    }
    if (!lua_tableget(love, 'setDeprecationOutput')) {
      lua_tableset(love, 'setDeprecationOutput', function () {
        var args = Array.prototype.slice.call(arguments);
        if (args[0] === love) args.shift();
        deprecationOutput = !!args[0];
        return [];
      });
    }
  }

  var descriptor = Object.getOwnPropertyDescriptor(G.str, 'love');
  if (!descriptor || descriptor.configurable) {
    Object.defineProperty(G.str, 'love', {
      configurable: true,
      enumerable: true,
      get: function () { return loveValue; },
      set: function (value) {
        loveValue = value;
        patchLove(value);
      }
    });
  }
  if (loveValue) patchLove(loveValue);
})();

G.str['class'] = (function (_prototype) {
  var tmp;
  var _derived_2 = lua_newtable();
  if (lua_true(_prototype)) {
	lua_tableset(_derived_2, '__proto', _prototype);
	lua_tableset(_derived_2, '__index', (function (_t, _key) {
	  var tmp;
	  return [lua_or(lua_call(G.str['rawget'], [_derived_2, _key])[0], function () {return lua_tableget(_prototype, _key);})];
	  return [];
	}))
  } else {
	lua_tableset(_derived_2, '__index', (function (_t, _key) {
	  var tmp;
	  return lua_call(G.str['rawget'], [_derived_2, _key]);
	  return [];
	}))
  }
  lua_tableset(_derived_2, '__call', (function (_proto) {
	var tmp;
	var varargs = slice(arguments, 1);
	var _instance_7 = lua_newtable();
	lua_call(G.str['setmetatable'], [_instance_7, _proto]);
	lua_tableset(_instance_7, '__obj', true);
	var _init_7 = lua_tableget(_instance_7, 'init');
	if (lua_true(_init_7)) {
	  lua_call(_init_7, [_instance_7].concat(varargs));
	}
	return [_instance_7];
	return [];
  }))
  lua_call(G.str['setmetatable'], [_derived_2, _derived_2]);
  return [_derived_2];
  return [];
});
lua_tableset(G.str['string'], 'uchar', (function (_c) {
  var tmp;
  _c = lua_or(lua_and(lua_lt(_c, 256), function () {return _c;}), function () {return 100;});
  return lua_call(lua_tableget(G.str['string'], 'char'), [_c]);
  return [];
}))
lua_tableset(G.str['string'], 'ubyte', (function (self) {
  var tmp;
  var varargs = slice(arguments, 1);
  return lua_call(lua_tableget(G.str['string'], 'byte'), [self].concat(varargs));
  return [];
}))
lua_tableset(G.str['string'], 'usub', (function (self) {
  var tmp;
  var varargs = slice(arguments, 1);
  return lua_call(lua_tableget(G.str['string'], 'sub'), [self].concat(varargs));
  return [];
}))

lua_tableset(G.str['string'], 'split', (function (self, _pattern) {
  var tmp;
  G.str['self_type'] = lua_call(G.str['type'], [self])[0];
  G.str['pattern_type'] = lua_call(G.str['type'], [_pattern])[0];
  if ((!lua_eq(G.str['self_type'], 'string') && !lua_eq(G.str['self_type'], 'number'))) {
	G.str['buffer'] = lua_concat("bad argument #1 to 'split' (string expected, got ", lua_concat(G.str['self_type'], ")"));
	lua_call(G.str['error'], [G.str['buffer']]);
  }
  if (((!lua_eq(G.str['pattern_type'], 'string') && !lua_eq(G.str['pattern_type'], 'number')) && !lua_eq(G.str['pattern_type'], 'nil'))) {
	G.str['buffer'] = lua_concat("bad argument #2 to 'split' (string expected, got ", lua_concat(G.str['pattern_type'], ")"));
	lua_call(G.str['error'], [G.str['buffer']]);
  }
  _pattern = lua_or(_pattern, function () {return '%s+';});
  var _start_12 = 1;
  var _list_12 = lua_newtable();
  while (true) {
	tmp = lua_call(lua_tableget(G.str['string'], 'find'), [self, _pattern, _start_12]); var _b_15 = tmp[0]; var _e_15 = tmp[1]; tmp = null;
	if (lua_eq(_b_15, null)) {
	  lua_tableset(_list_12, lua_add(lua_len(_list_12), 1), lua_call(lua_tableget(G.str['string'], 'sub'), [self, _start_12])[0]);
	  break;
	}
	lua_tableset(_list_12, lua_add(lua_len(_list_12), 1), lua_call(lua_tableget(G.str['string'], 'sub'), [self, _start_12, lua_subtract(_b_15, 1)])[0]);
	_start_12 = lua_add(_e_15, 1);
  }
  return [_list_12];
  return [];
}));

lua_tableset(G.str['math'], 'round', (function (_n) {
  var tmp;
  return lua_call(lua_tableget(G.str['math'], 'floor'), [lua_add(_n, .5)]);
  return [];
}))
