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

