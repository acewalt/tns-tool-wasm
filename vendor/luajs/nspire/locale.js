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

// Correct a few LuaJS arithmetic/core semantics before third-party projects run.
(function installLuaCoreCompatibility() {
	function isLuaNumber(value) {
		if (typeof value === 'number') return !Number.isNaN(value);
		if (typeof value !== 'string' || value.trim() === '') return false;
		return !Number.isNaN(Number(value));
	}
	function toLuaNumber(value) {
		return typeof value === 'number' ? value : Number(value);
	}
	function meta(value, name) {
		return value && typeof value === 'object' && value.metatable && value.metatable.str
			? value.metatable.str[name]
			: null;
	}
	function binaryArithmetic(left, right, metamethod, operation, label) {
		if (isLuaNumber(left) && isLuaNumber(right)) {
			return operation(toLuaNumber(left), toLuaNumber(right));
		}
		var handler = meta(left, metamethod) || meta(right, metamethod);
		if (handler) return lua_rawcall(handler, [left, right])[0];
		throw new Error(label + ' <' + left + '> and <' + right + '> not supported');
	}

	lua_add = function (left, right) {
		return binaryArithmetic(left, right, '__add', function (a, b) { return a + b; }, 'Adding');
	};
	lua_subtract = function (left, right) {
		return binaryArithmetic(left, right, '__sub', function (a, b) { return a - b; }, 'Subtracting');
	};
	lua_multiply = function (left, right) {
		return binaryArithmetic(left, right, '__mul', function (a, b) { return a * b; }, 'Multiplying');
	};
	lua_divide = function (left, right) {
		return binaryArithmetic(left, right, '__div', function (a, b) { return a / b; }, 'Dividing');
	};
	lua_power = function (left, right) {
		return binaryArithmetic(left, right, '__pow', function (a, b) { return Math.pow(a, b); }, 'Power');
	};
	lua_mod = function (left, right) {
		return binaryArithmetic(left, right, '__mod', function (a, b) {
			if (b === 0) return NaN;
			var result = a % b;
			if (result !== 0 && ((result < 0) !== (b < 0))) result += b;
			return result;
		}, 'Modulo');
	};
	lua_unm = function (value) {
		if (isLuaNumber(value)) return -toLuaNumber(value);
		var handler = meta(value, '__unm');
		if (handler) return lua_rawcall(handler, [value])[0];
		throw new Error('Inverting <' + value + '> not supported');
	};

	// Lua assert returns all supplied arguments when the condition is truthy.
	G.str['assert'] = function () {
		var args = Array.prototype.slice.call(arguments);
		var value = args[0];
		if (value == null || value === false) {
			throw new Error(args.length > 1 && args[1] != null ? String(args[1]) : 'assertion failed!');
		}
		return args;
	};
})();

// Binary-safe string and common table helpers. The original LuaJS string.byte
// implementation is off-by-one, ignores negative indices, and does not advance
// its loop counter. That makes binary formats (WAD, images, packed data, etc.)
// decode as zeroes.
(function installLuaStringCompatibility() {
	var stringTable = G.str['string'];
	var tableTable = G.str['table'];
	if (!stringTable || !tableTable) return;

	function normalizeStringIndex(index, length, fallback) {
		var n = index == null ? fallback : Number(index);
		if (!Number.isFinite(n)) n = fallback;
		n = Math.trunc(n);
		if (n < 0) n = length + n + 1;
		return n;
	}

	lua_tableset(stringTable, 'byte', function (s, i, j) {
		s = String(s == null ? '' : s);
		var length = s.length;
		var first = normalizeStringIndex(i, length, 1);
		var last = normalizeStringIndex(j, length, first);
		if (first < 1) first = 1;
		if (last > length) last = length;
		if (first > last || first > length || last < 1) return [];
		var result = [];
		for (var pos = first; pos <= last; pos += 1) {
			result.push(s.charCodeAt(pos - 1) & 0xFF);
		}
		return result;
	});

	function escapeRegexChar(ch) {
		return /[\\^$.*+?()[\]{}|/]/.test(ch) ? '\\' + ch : ch;
	}
	function luaClass(code) {
		var map = {
			a: '[A-Za-z]', A: '[^A-Za-z]',
			c: '[\\x00-\\x1F\\x7F]', C: '[^\\x00-\\x1F\\x7F]',
			d: '\\d', D: '\\D',
			l: '[a-z]', L: '[^a-z]',
			p: '[!"#$%&\\\'()*+,\\-./:;<=>?@[\\]\\\\^_`{|}~]', P: '[^!"#$%&\\\'()*+,\\-./:;<=>?@[\\]\\\\^_`{|}~]',
			s: '\\s', S: '\\S',
			u: '[A-Z]', U: '[^A-Z]',
			w: '[A-Za-z0-9_]', W: '[^A-Za-z0-9_]',
			x: '[A-Fa-f0-9]', X: '[^A-Fa-f0-9]',
			z: '\\x00'
		};
		return Object.prototype.hasOwnProperty.call(map, code) ? map[code] : escapeRegexChar(code);
	}
	function luaPatternToRegex(pattern) {
		pattern = String(pattern == null ? '' : pattern);
		var output = '';
		var captures = 0;
		for (var index = 0; index < pattern.length; index += 1) {
			var ch = pattern.charAt(index);
			if (ch === '%') {
				index += 1;
				if (index >= pattern.length) { output += '%'; break; }
				output += luaClass(pattern.charAt(index));
				continue;
			}
			if (ch === '[') {
				var end = index + 1;
				var cls = '[';
				if (pattern.charAt(end) === '^') { cls += '^'; end += 1; }
				for (; end < pattern.length; end += 1) {
					var cc = pattern.charAt(end);
					if (cc === ']') break;
					if (cc === '%' && end + 1 < pattern.length) {
						end += 1;
						var translated = luaClass(pattern.charAt(end));
						cls += translated.charAt(0) === '[' ? translated.slice(1, -1) : translated.replace(/^\\/, '\\');
					} else {
						cls += cc === '\\' ? '\\\\' : cc;
					}
				}
				cls += ']';
				output += cls;
				index = end;
				continue;
			}
			if (ch === '(') {
				// Lua's empty capture () returns a position, unlike JavaScript. Keep
				// it as an empty capture and fix the common position case in match().
				captures += 1;
				output += '(';
				continue;
			}
			if (ch === ')' || ch === '^' || ch === '$' || ch === '.' || ch === '*' || ch === '+' || ch === '?' || ch === '-') {
				if (ch === '-') output += '*?';
				else output += ch;
				continue;
			}
			output += escapeRegexChar(ch);
		}
		return { source: output, captures: captures };
	}

	lua_tableset(stringTable, 'match', function (s, pattern, init) {
		s = String(s == null ? '' : s);
		pattern = String(pattern == null ? '' : pattern);
		var start = normalizeStringIndex(init, s.length, 1);
		if (start < 1) start = 1;
		if (start > s.length + 1) return [null];
		// Position-only capture used by common trim idioms.
		if (pattern === '^()%s*$') {
			return /^\s*$/.test(s.slice(start - 1)) ? [start] : [null];
		}
		var translated = luaPatternToRegex(pattern);
		var regex;
		try { regex = new RegExp(translated.source); }
		catch (_error) { return [null]; }
		var match = regex.exec(s.slice(start - 1));
		if (!match) return [null];
		if (match.length > 1) return match.slice(1);
		return [match[0]];
	});

	lua_tableset(stringTable, 'find', function (s, pattern, init, plain) {
		s = String(s == null ? '' : s);
		pattern = String(pattern == null ? '' : pattern);
		var start = normalizeStringIndex(init, s.length, 1);
		if (start < 1) start = 1;
		var chunk = s.slice(start - 1);
		if (plain) {
			var at = chunk.indexOf(pattern);
			return at < 0 ? [null] : [start + at, start + at + pattern.length - 1];
		}
		var translated = luaPatternToRegex(pattern);
		var regex;
		try { regex = new RegExp(translated.source); }
		catch (_error) { return [null]; }
		var match = regex.exec(chunk);
		if (!match) return [null];
		var first = start + match.index;
		var result = [first, first + match[0].length - 1];
		if (match.length > 1) result = result.concat(match.slice(1));
		return result;
	});

	lua_tableset(stringTable, 'gsub', function (s, pattern, replacement, n) {
		s = String(s == null ? '' : s);
		pattern = String(pattern == null ? '' : pattern);
		var translated = luaPatternToRegex(pattern);
		var regex;
		try { regex = new RegExp(translated.source, 'g'); }
		catch (_error) { return [s, 0]; }
		var limit = n == null ? Infinity : Math.max(0, Math.trunc(Number(n) || 0));
		var count = 0;
		var output = s.replace(regex, function () {
			var args = Array.prototype.slice.call(arguments);
			var whole = args[0];
			var captures = args.slice(1, -2);
			if (count >= limit) return whole;
			count += 1;
			if (typeof replacement === 'function') {
				var returned = replacement.apply(null, captures.length ? captures : [whole]);
				var value = Array.isArray(returned) ? returned[0] : returned;
				return value == null || value === false ? whole : String(value);
			}
			if (replacement && typeof replacement === 'object' && replacement.str && replacement.uints) {
				var key = captures.length ? captures[0] : whole;
				var value = lua_tableget(replacement, key);
				return value == null || value === false ? whole : String(value);
			}
			return String(replacement == null ? '' : replacement).replace(/%%/g, '\u0000').replace(/%([0-9])/g, function (_m, digit) {
				var idx = Number(digit);
				return idx === 0 ? whole : String(captures[idx - 1] == null ? '' : captures[idx - 1]);
			}).replace(/\u0000/g, '%');
		});
		return [output, count];
	});

	lua_tableset(tableTable, 'concat', function (table, sep, i, j) {
		sep = sep == null ? '' : String(sep);
		var first = i == null ? 1 : Math.trunc(Number(i));
		var last = j == null ? lua_len(table) : Math.trunc(Number(j));
		var values = [];
		for (var index = first; index <= last; index += 1) {
			var value = lua_tableget(table, index);
			if (value == null) throw new Error("invalid value (nil) at index " + index + " in table for 'concat'");
			values.push(String(value));
		}
		return [values.join(sep)];
	});

	// Lua 5.2 exposes table.unpack; keep the Lua 5.1 global unpack as fallback.
	if (!lua_tableget(tableTable, 'unpack') && G.str['unpack']) {
		lua_tableset(tableTable, 'unpack', G.str['unpack']);
	}
})();
