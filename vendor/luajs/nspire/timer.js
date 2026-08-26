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

	// LuaJIT-style `bit` compatibility.
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

dotimer = function () {
	var tmp;
	var _tm_6 = lua_call(lua_tableget(G.str['PCspire'], 'getMicroTime'), [])[0];
	if ((lua_true(lua_tableget(G.str['timer'], 'running')) && lua_lte(lua_add(lua_tableget(G.str['timer'], 'delay'), lua_tableget(G.str['timer'], 'lastrun')), _tm_6))) {
		lua_tableset(G.str['timer'], 'lastrun', _tm_6);
		lua_call(lua_tableget(G.str['PCspire'], 'callEvent'), [lua_tableget(G.str['on'], 'timer')]);
	}
	return [];
};

// TI-Nspire math.eval operations which must be recognized before app.js's
// generic numeric evaluator, because unknown expressions intentionally fall
// back to numeric zero there.
(function installTnsMathEvalCompatibility() {
	if (typeof queueMicrotask !== 'function') return;
	queueMicrotask(function () {
		if (!G || !G.str || G.str.love || !G.str.math || !G.str.var) return;
		var originalEval = lua_tableget(G.str.math, 'eval');
		var recallFn = lua_tableget(G.str.var, 'recall');
		var storeFn = lua_tableget(G.str.var, 'store');
		if (typeof originalEval !== 'function' || originalEval.__tnsMathCompat) return;

		function recall(name) {
			try { return lua_call(recallFn, [name])[0]; } catch (_error) { return G.str[name]; }
		}
		function store(name, value) {
			if (typeof storeFn === 'function') lua_call(storeFn, [name, value]);
			else G.str[name] = value;
			return value;
		}
		function len(value) {
			try { return Number(lua_len(value)) || 0; } catch (_error) { return value && value.length || 0; }
		}
		function makeMatrix(rows, cols) {
			rows = Math.max(0, Math.min(1024, Math.trunc(Number(rows) || 0)));
			cols = Math.max(0, Math.min(1024, Math.trunc(Number(cols) || 0)));
			var outer = lua_newtable();
			for (var r = 1; r <= rows; r += 1) {
				var line = lua_newtable();
				for (var c = 1; c <= cols; c += 1) lua_tableset(line, c, 0);
				lua_tableset(outer, r, line);
			}
			return outer;
		}
		function numeric(text) {
			var expr = String(text || '').trim();
			expr = expr.replace(/dim\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/gi, function (_m, name) { return String(len(recall(name))); });
			expr = expr.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, function (name) {
				var value = recall(name);
				return typeof value === 'number' && Number.isFinite(value) ? String(value) : name;
			});
			expr = expr.replace(/\^/g, '**');
			if (!/^[0-9eE+\-*/().\s]+$/.test(expr)) return NaN;
			try { return Number(Function('"use strict";return (' + expr + ')')()); } catch (_error) { return NaN; }
		}
		function splitArgs(text) {
			var parts = [], current = '', depth = 0;
			for (var i = 0; i < text.length; i += 1) {
				var ch = text.charAt(i);
				if (ch === '(' || ch === '[' || ch === '{') depth += 1;
				else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
				if (ch === ',' && depth === 0) { parts.push(current.trim()); current = ''; }
				else current += ch;
			}
			parts.push(current.trim());
			return parts;
		}

		var compatibleEval = function (expr) {
			var source = String(expr == null ? '' : expr).trim();
			var match = /^NewMat\s*\((.*)\)$/i.exec(source);
			if (match) {
				var args = splitArgs(match[1]);
				var rows = numeric(args[0]), cols = numeric(args[1]);
				if (Number.isFinite(rows) && Number.isFinite(cols)) return [makeMatrix(rows, cols)];
			}
			match = /^dim\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)$/i.exec(source);
			if (match) return [len(recall(match[1]))];
			match = /^mod\s*\((.*)\)$/i.exec(source);
			if (match) {
				var ma = splitArgs(match[1]), a = numeric(ma[0]), b = numeric(ma[1]);
				if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return [((a % b) + b) % b];
			}
			match = /^intDiv\s*\((.*)\)$/i.exec(source);
			if (match) {
				var ia = splitArgs(match[1]), dividend = numeric(ia[0]), divisor = numeric(ia[1]);
				if (Number.isFinite(dividend) && Number.isFinite(divisor) && divisor !== 0) return [Math.floor(dividend / divisor)];
			}
			match = /^DelVar\s+([A-Za-z_][A-Za-z0-9_]*)$/i.exec(source);
			if (match) { store(match[1], null); G.str[match[1]] = null; return [null]; }

			// Complex TI-Basic strings in ABA Logique create these matrices and then
			// read/write them from Lua. Preserve the correct shape even when the full
			// CAS program is not yet emulated statement-by-statement.
			var vars = recall('v');
			var count = Math.max(1, Math.min(8, len(vars) || 1));
			if (/newMat\s*\([^)]*\)\s*=\s*:kar/i.test(source) || /\b:kar\b/i.test(source)) {
				var kar = makeMatrix(Math.pow(2, Math.floor(count / 2)), Math.pow(2, Math.ceil(count / 2)));
				store('kar', kar); G.str.kar = kar; return [kar];
			}
			if (/newMat\s*\([^)]*\)\s*=\s*:tbg/i.test(source) || /\b:tbg\b/i.test(source)) {
				var tbg = makeMatrix(Math.pow(2, count), count + 1);
				store('tbg', tbg); G.str.tbg = tbg; return [tbg];
			}
			if (/newMat\s*\([^)]*\)\s*=\s*:tb/i.test(source) || /\b:tb\b/i.test(source)) {
				var tb = makeMatrix(Math.pow(2, count) + 1, count + 1);
				store('tb', tb); G.str.tb = tb; return [tb];
			}
			return lua_call(originalEval, [expr]);
		};
		compatibleEval.__tnsMathCompat = true;
		lua_tableset(G.str.math, 'eval', compatibleEval);
	});
})();
