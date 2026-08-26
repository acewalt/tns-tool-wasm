console.info("timer.js");

// Repair the bundled LuaJS bit library and expose a real Lua 5.2 bit32 table.
// The original bit.band starts its accumulator at 0, making every AND return 0.
// That breaks common binary formats and BSP/subsector flags such as Doom's 0x8000.
(function installBitCompatibility() {
	if (typeof G === 'undefined' || !G.str || typeof lua_newtable !== 'function' || typeof lua_tableset !== 'function') return;

	var u32 = function (value) { return Number(value) >>> 0; };
	var i32 = function (value) { return Number(value) | 0; };
	var args = function (values) { return Array.prototype.slice.call(values); };
	var normalizeShift = function (value) {
		value = Math.trunc(Number(value) || 0);
		return value;
	};
	var rotateShift = function (value) {
		return ((normalizeShift(value) % 32) + 32) % 32;
	};

	var bit32Table = lua_newtable();
	lua_tableset(bit32Table, 'band', function () {
		var values = args(arguments);
		var result = 0xFFFFFFFF;
		for (var index = 0; index < values.length; index += 1) result = (result & u32(values[index])) >>> 0;
		return [result >>> 0];
	});
	lua_tableset(bit32Table, 'bor', function () {
		var values = args(arguments);
		var result = 0;
		for (var index = 0; index < values.length; index += 1) result = (result | u32(values[index])) >>> 0;
		return [result >>> 0];
	});
	lua_tableset(bit32Table, 'bxor', function () {
		var values = args(arguments);
		var result = 0;
		for (var index = 0; index < values.length; index += 1) result = (result ^ u32(values[index])) >>> 0;
		return [result >>> 0];
	});
	lua_tableset(bit32Table, 'bnot', function (value) { return [(~u32(value)) >>> 0]; });
	lua_tableset(bit32Table, 'btest', function () {
		var values = args(arguments);
		var result = 0xFFFFFFFF;
		for (var index = 0; index < values.length; index += 1) result = (result & u32(values[index])) >>> 0;
		return [result !== 0];
	});
	lua_tableset(bit32Table, 'lshift', function (value, displacement) {
		var shift = normalizeShift(displacement);
		if (shift < 0) return lua_tableget(bit32Table, 'rshift')(value, -shift);
		return [shift >= 32 ? 0 : ((u32(value) << shift) >>> 0)];
	});
	lua_tableset(bit32Table, 'rshift', function (value, displacement) {
		var shift = normalizeShift(displacement);
		if (shift < 0) return lua_tableget(bit32Table, 'lshift')(value, -shift);
		return [shift >= 32 ? 0 : ((u32(value) >>> shift) >>> 0)];
	});
	lua_tableset(bit32Table, 'arshift', function (value, displacement) {
		var shift = normalizeShift(displacement);
		if (shift < 0) return lua_tableget(bit32Table, 'lshift')(value, -shift);
		if (shift >= 32) return [i32(value) < 0 ? 0xFFFFFFFF : 0];
		return [(i32(value) >> shift) >>> 0];
	});
	lua_tableset(bit32Table, 'lrotate', function (value, displacement) {
		var shift = rotateShift(displacement);
		var number = u32(value);
		if (!shift) return [number];
		return [((number << shift) | (number >>> (32 - shift))) >>> 0];
	});
	lua_tableset(bit32Table, 'rrotate', function (value, displacement) {
		var shift = rotateShift(displacement);
		var number = u32(value);
		if (!shift) return [number];
		return [((number >>> shift) | (number << (32 - shift))) >>> 0];
	});
	lua_tableset(bit32Table, 'extract', function (value, field, width) {
		field = Math.trunc(Number(field) || 0);
		width = width == null ? 1 : Math.trunc(Number(width) || 0);
		if (field < 0 || width <= 0 || field + width > 32) throw new Error("trying to access non-existent bits");
		var mask = width === 32 ? 0xFFFFFFFF : (Math.pow(2, width) - 1) >>> 0;
		return [((u32(value) >>> field) & mask) >>> 0];
	});
	lua_tableset(bit32Table, 'replace', function (value, replacement, field, width) {
		field = Math.trunc(Number(field) || 0);
		width = width == null ? 1 : Math.trunc(Number(width) || 0);
		if (field < 0 || width <= 0 || field + width > 32) throw new Error("trying to access non-existent bits");
		var mask = width === 32 ? 0xFFFFFFFF : (Math.pow(2, width) - 1) >>> 0;
		var shiftedMask = field === 0 ? mask : ((mask << field) >>> 0);
		var cleared = (u32(value) & (~shiftedMask)) >>> 0;
		var inserted = (((u32(replacement) & mask) << field) >>> 0);
		return [(cleared | inserted) >>> 0];
	});
	G.str['bit32'] = bit32Table;

	// LuaJIT-style `bit` compatibility. Keep signed 32-bit return values, but
	// make the operations correct and complete enough for libraries which fall
	// back to `bit` instead of `bit32`.
	var bitTable = G.str['bit'];
	if (!bitTable || typeof bitTable !== 'object') {
		bitTable = lua_newtable();
		G.str['bit'] = bitTable;
	}
	lua_tableset(bitTable, 'tobit', function (value) { return [i32(value)]; });
	lua_tableset(bitTable, 'band', function () {
		var values = args(arguments);
		var result = -1;
		for (var index = 0; index < values.length; index += 1) result = result & i32(values[index]);
		return [result | 0];
	});
	lua_tableset(bitTable, 'bor', function () {
		var values = args(arguments);
		var result = 0;
		for (var index = 0; index < values.length; index += 1) result = result | i32(values[index]);
		return [result | 0];
	});
	lua_tableset(bitTable, 'bxor', function () {
		var values = args(arguments);
		var result = 0;
		for (var index = 0; index < values.length; index += 1) result = result ^ i32(values[index]);
		return [result | 0];
	});
	lua_tableset(bitTable, 'bnot', function (value) { return [(~i32(value)) | 0]; });
	lua_tableset(bitTable, 'lshift', function (value, displacement) { return [(i32(value) << (normalizeShift(displacement) & 31)) | 0]; });
	lua_tableset(bitTable, 'rshift', function (value, displacement) { return [(u32(value) >>> (normalizeShift(displacement) & 31)) | 0]; });
	lua_tableset(bitTable, 'arshift', function (value, displacement) { return [(i32(value) >> (normalizeShift(displacement) & 31)) | 0]; });
	lua_tableset(bitTable, 'rol', function (value, displacement) {
		var result = lua_tableget(bit32Table, 'lrotate')(value, displacement)[0];
		return [result | 0];
	});
	lua_tableset(bitTable, 'ror', function (value, displacement) {
		var result = lua_tableget(bit32Table, 'rrotate')(value, displacement)[0];
		return [result | 0];
	});
})();

G.str['timer'] = lua_newtable();
lua_tableset(G.str['timer'], 'delay', 0);
lua_tableset(G.str['timer'], 'running', false);
lua_tableset(G.str['timer'], 'lastrun', 0);
lua_tableset(G.str['timer'], 'start', (function (_t) {
	var tmp;
	if (lua_lt(_t, 0.01)) {
	lua_call(G.str['error'], ["argument needs to be >=0.01"]);
	}
	lua_tableset(G.str['timer'], 'delay', _t);
	lua_tableset(G.str['timer'], 'running', true);
	lua_tableset(G.str['timer'], 'lastrun', lua_call(lua_tableget(G.str['PCspire'], 'getMicroTime'), [])[0]);
	return [];
}))
lua_tableset(G.str['timer'], 'stop', (function () {
	var tmp;
	lua_tableset(G.str['timer'], 'delay', 0);
	lua_tableset(G.str['timer'], 'running', false);
	return [];
}))
lua_tableset(G.str['timer'], 'getMilliSecCounter', (function () {
	var tmp;
	return [lua_multiply(lua_call(lua_tableget(G.str['PCspire'], 'getMicroTime'), [])[0], 1000)];
	return [];
}))

dotimer	= function () {
	var tmp;
	var _tm_6 = lua_call(lua_tableget(G.str['PCspire'], 'getMicroTime'), [])[0];
	if ((lua_true(lua_tableget(G.str['timer'], 'running')) && lua_lte(lua_add(lua_tableget(G.str['timer'], 'delay'), lua_tableget(G.str['timer'], 'lastrun')), _tm_6))) {
		lua_tableset(G.str['timer'], 'lastrun', _tm_6);
		lua_call(lua_tableget(G.str['PCspire'], 'callEvent'), [lua_tableget(G.str['on'], 'timer')]);
	}
	return [];
}

// TI-Nspire math.eval compatibility for matrix/document operations that must
// be resolved before the generic numeric evaluator (which intentionally falls
// back to 0 for unknown identifiers).
(function installTnsMathEvalCompatibility() {
  if (typeof window === 'undefined') return;
  var schedule = typeof queueMicrotask === 'function'
    ? queueMicrotask
    : function (fn) { Promise.resolve().then(fn); };

  schedule(function () {
    var global = window;
    var root = global.G && global.G.str;
    if (!root || !root.platform || !root.on) return;
    var mathTable = root.math;
    var varTable = root.var;
    if (!mathTable || !varTable || typeof global.lua_tableget !== 'function' || typeof global.lua_tableset !== 'function') return;

    var originalEval = global.lua_tableget(mathTable, 'eval');
    var storeFn = global.lua_tableget(varTable, 'store');
    var recallFn = global.lua_tableget(varTable, 'recall');
    if (typeof originalEval !== 'function' || originalEval.__tnsTiMathEvalCompat) return;

    function recall(name) {
      try {
        var result = global.lua_call(recallFn, [name]);
        return Array.isArray(result) ? result[0] : null;
      } catch (_error) {
        return root[name];
      }
    }

    function store(name, value) {
      if (typeof storeFn === 'function') {
        try { global.lua_call(storeFn, [name, value]); } catch (_error) { root[name] = value; }
      } else root[name] = value;
      return value;
    }

    function luaLength(value) {
      if (value == null) return 0;
      try { return Math.max(0, Number(global.lua_len(value)) || 0); } catch (_error) {}
      if (Array.isArray(value) || typeof value === 'string') return value.length;
      return 0;
    }

    function getAt(table, index) {
      if (table == null) return null;
      try { return global.lua_tableget(table, index); } catch (_error) {}
      if (Array.isArray(table)) return table[index - 1];
      return table[index];
    }

    function tableToArray(table) {
      var out = [];
      var length = luaLength(table);
      for (var i = 1; i <= length; i += 1) out.push(getAt(table, i));
      return out;
    }

    function makeMatrix(rows, cols, fill) {
      rows = Math.max(0, Math.min(1024, Math.trunc(Number(rows) || 0)));
      cols = Math.max(0, Math.min(1024, Math.trunc(Number(cols) || 0)));
      var outer = global.lua_newtable();
      for (var r = 1; r <= rows; r += 1) {
        var line = global.lua_newtable();
        for (var c = 1; c <= cols; c += 1) global.lua_tableset(line, c, fill == null ? 0 : fill);
        global.lua_tableset(outer, r, line);
      }
      return outer;
    }

    function splitArgs(text) {
      var parts = [];
      var depth = 0;
      var current = '';
      var quote = '';
      for (var i = 0; i < text.length; i += 1) {
        var ch = text.charAt(i);
        if (quote) {
          current += ch;
          if (ch === '\\') {
            if (i + 1 < text.length) current += text.charAt(++i);
          } else if (ch === quote) quote = '';
          continue;
        }
        if (ch === '"' || ch === "'") { quote = ch; current += ch; continue; }
        if (ch === '(' || ch === '[' || ch === '{') depth += 1;
        else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
        if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; }
        else current += ch;
      }
      parts.push(current.trim());
      return parts;
    }

    function numericExpression(text) {
      var expr = String(text == null ? '' : text).trim();
      expr = expr.replace(/dim\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/gi, function (_all, name) {
        return String(luaLength(recall(name) != null ? recall(name) : root[name]));
      });
      expr = expr.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, function (name) {
        var value = recall(name);
        return typeof value === 'number' && Number.isFinite(value) ? String(value) : name;
      });
      expr = expr.replace(/\^/g, '**');
      if (!/^[0-9eE+\-*/().\s*]+$/.test(expr)) return NaN;
      try {
        var value = Function('"use strict"; return (' + expr + ');')();
        return Number(value);
      } catch (_error) {
        return NaN;
      }
    }

    function logicValue(expression, env) {
      var text = String(expression == null ? '' : expression).toLowerCase();
      text = text.replace(/\bnot\b/g, '!').replace(/\band\b/g, '&&').replace(/\bor\b/g, '||');
      text = text.replace(/\/\s*\(/g, '!(').replace(/\/\s*([a-z][a-z0-9_]*)/g, '!$1');
      text = text.replace(/\*/g, '&&').replace(/\+/g, '||');
      text = text.replace(/\b([a-z][a-z0-9_]*)\b/g, function (name) {
        if (name === 'true' || name === 'false') return name;
        return env[name] ? 'true' : 'false';
      });
      try { return !!Function('"use strict"; return (' + text + ');')(); } catch (_error) { return false; }
    }

    function currentVariables() {
      return tableToArray(recall('v') != null ? recall('v') : root.v).map(function (value) { return String(value); }).filter(Boolean);
    }

    function buildTruthTable(grayOrder) {
      var vars = currentVariables();
      var count = Math.max(1, Math.min(8, vars.length || 1));
      var rows = Math.pow(2, count) + 1;
      var cols = count + 1;
      var table = makeMatrix(rows, cols, 0);
      var header = getAt(table, 1);
      for (var c = 0; c < count; c += 1) global.lua_tableset(header, c + 1, vars[c] || String.fromCharCode(97 + c));
      global.lua_tableset(header, cols, String(recall('eqvar') || root.eqvar || 'S'));
      var equation = String(recall('eq') || root.eq || recall('eql') || root.eql || 'false');
      for (var row = 0; row < rows - 1; row += 1) {
        var code = grayOrder ? (row ^ (row >> 1)) : row;
        var target = getAt(table, row + 2);
        var env = {};
        for (var i = 0; i < count; i += 1) {
          var bit = (code >> (count - 1 - i)) & 1;
          global.lua_tableset(target, i + 1, bit);
          env[(vars[i] || String.fromCharCode(97 + i)).toLowerCase()] = bit === 1;
        }
        global.lua_tableset(target, cols, logicValue(equation, env) ? 1 : 0);
      }
      return table;
    }

    var compatibleEval = function (expr) {
      var source = String(expr == null ? '' : expr).trim();
      var match;

      match = /^NewMat\s*\((.*)\)$/i.exec(source);
      if (match) {
        var args = splitArgs(match[1]);
        if (args.length >= 2) {
          var rows = numericExpression(args[0]);
          var cols = numericExpression(args[1]);
          if (Number.isFinite(rows) && Number.isFinite(cols)) return [makeMatrix(rows, cols, 0)];
        }
      }

      match = /^dim\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)$/i.exec(source);
      if (match) return [luaLength(recall(match[1]) != null ? recall(match[1]) : root[match[1]])];

      match = /^mod\s*\((.*)\)$/i.exec(source);
      if (match) {
        var modArgs = splitArgs(match[1]);
        if (modArgs.length >= 2) {
          var a = numericExpression(modArgs[0]);
          var b = numericExpression(modArgs[1]);
          if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return [((a % b) + b) % b];
        }
      }

      match = /^intDiv\s*\((.*)\)$/i.exec(source);
      if (match) {
        var intArgs = splitArgs(match[1]);
        if (intArgs.length >= 2) {
          var dividend = numericExpression(intArgs[0]);
          var divisor = numericExpression(intArgs[1]);
          if (Number.isFinite(dividend) && Number.isFinite(divisor) && divisor !== 0) return [Math.floor(dividend / divisor)];
        }
      }

      match = /^DelVar\s+([A-Za-z_][A-Za-z0-9_]*)$/i.exec(source);
      if (match) {
        store(match[1], null);
        try { delete root[match[1]]; } catch (_error) { root[match[1]] = null; }
        return [null];
      }

      if (/newMat\s*\([^)]*\)\s*=\s*:kar/i.test(source) || /\b:kar\b/i.test(source)) {
        var vars = currentVariables();
        var equation = String(recall('eql') || root.eql || 'false');
        var matrix = null;
        if (typeof global.createLuaJsKarnaughMatrix === 'function') {
          try { matrix = global.createLuaJsKarnaughMatrix(vars, equation, global); } catch (_error) {}
        }
        if (!matrix) {
          var n = Math.max(1, Math.min(6, vars.length || 1));
          matrix = makeMatrix(Math.pow(2, Math.floor(n / 2)), Math.pow(2, Math.ceil(n / 2)), 0);
        }
        store('kar', matrix);
        root.kar = matrix;
        return [matrix];
      }

      if (/newMat\s*\([^)]*\)\s*=\s*:tbg/i.test(source) || /\b:tbg\b/i.test(source)) {
        var grayTable = buildTruthTable(true);
        var dataRows = global.lua_newtable();
        for (var gr = 2; gr <= luaLength(grayTable); gr += 1) global.lua_tableset(dataRows, gr - 1, getAt(grayTable, gr));
        store('tbg', dataRows);
        store('tb', grayTable);
        root.tbg = dataRows;
        root.tb = grayTable;
        return [grayTable];
      }

      if (/newMat\s*\([^)]*\)\s*=\s*:tb/i.test(source) || /\b:tb\b/i.test(source)) {
        var truthTable = buildTruthTable(false);
        store('tb', truthTable);
        root.tb = truthTable;
        return [truthTable];
      }

      return global.lua_call(originalEval, [expr]);
    };
    compatibleEval.__tnsTiMathEvalCompat = true;
    compatibleEval.__tnsTiBaseMathEval = originalEval;
    global.lua_tableset(mathTable, 'eval', compatibleEval);
  });
})();
