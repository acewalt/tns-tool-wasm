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
