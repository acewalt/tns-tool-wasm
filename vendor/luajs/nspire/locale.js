G.str['locale'] = lua_newtable();

lua_tableset(G.str['locale'], 'name', (function () {
	var tmp;
	return ["en"];
	return [];
}))

// Lua 5.1/5.2 select(index, ...) compatibility.
// The bundled lua.js ships select() as a Not supported stub, but many
// third-party Lua libraries rely on it for vararg handling.
G.str['select'] = function (index) {
	var values = Array.prototype.slice.call(arguments, 1);
	if (index === '#') {
		return [values.length];
	}
	var numeric = Number(index);
	if (!Number.isFinite(numeric) || Math.floor(numeric) !== numeric || numeric === 0) {
		throw new Error("bad argument #1 to 'select' (index out of range)");
	}
	var start;
	if (numeric > 0) {
		start = Math.min(numeric - 1, values.length);
	} else {
		start = values.length + numeric;
		if (start < 0) {
			throw new Error("bad argument #1 to 'select' (index out of range)");
		}
	}
	return values.slice(start);
};

// Fix LuaJS core semantics that are required by ordinary Lua projects.
// The upstream runtime treats parseFloat(table) === NaN as if it were a
// numeric value, so arithmetic metamethods (__add, __sub, ...) never run for
// tables. It also returns a scalar from assert(), whereas every native LuaJS
// function is expected to return an array of Lua return values.
(function installLuaCoreCompatibility() {
	var argsArray = function (args) {
		return Array.prototype.slice.call(args);
	};
	var isNumeric = function (value) {
		return !Number.isNaN(parseFloat(value));
	};
	var meta = function (value, name) {
		return value && value.metatable && value.metatable.str && value.metatable.str[name];
	};
	var callMeta = function (name, left, right, errorText) {
		var handler = meta(left, name) || meta(right, name);
		if (handler) return lua_rawcall(handler, [left, right])[0];
		throw new Error(errorText);
	};

	var luaAssertCompat = function (value, message) {
		var values = argsArray(arguments);
		if (lua_true(value)) return values;
		throw new Error(message == null ? 'assertion failed!' : String(message));
	};
	if (typeof lua_core !== 'undefined' && lua_core) lua_core['assert'] = luaAssertCompat;
	G.str['assert'] = luaAssertCompat;

	lua_unm = function (value) {
		if (isNumeric(value)) return -parseFloat(value);
		var handler = meta(value, '__unm');
		if (handler) return lua_rawcall(handler, [value])[0];
		throw new Error('Inverting <' + value + '> not supported');
	};

	lua_add = function (left, right) {
		if (isNumeric(left) && isNumeric(right)) return parseFloat(left) + parseFloat(right);
		return callMeta('__add', left, right, 'Adding <' + left + '> and <' + right + '> not supported');
	};
	lua_subtract = function (left, right) {
		if (isNumeric(left) && isNumeric(right)) return parseFloat(left) - parseFloat(right);
		return callMeta('__sub', left, right, 'Subtracting <' + left + '> and <' + right + '> not supported');
	};
	lua_multiply = function (left, right) {
		if (isNumeric(left) && isNumeric(right)) return parseFloat(left) * parseFloat(right);
		return callMeta('__mul', left, right, 'Multiplying <' + left + '> and <' + right + '> not supported');
	};
	lua_divide = function (left, right) {
		if (isNumeric(left) && isNumeric(right)) return parseFloat(left) / parseFloat(right);
		return callMeta('__div', left, right, 'Dividing <' + left + '> and <' + right + '> not supported');
	};
	lua_power = function (left, right) {
		if (isNumeric(left) && isNumeric(right)) return Math.pow(parseFloat(left), parseFloat(right));
		return callMeta('__pow', left, right, '<' + left + '> to the power of <' + right + '> not supported');
	};
	lua_mod = function (left, right) {
		if (!(isNumeric(left) && isNumeric(right))) {
			return callMeta('__mod', left, right, 'Modulo <' + left + '> and <' + right + '> not supported');
		}
		var a = parseFloat(left);
		var b = parseFloat(right);
		if (b === 0) return NaN;
		// Lua modulo follows floor division; JavaScript % does not for negative
		// operands, so normalize it to the divisor's sign.
		return a - Math.floor(a / b) * b;
	};
})();

