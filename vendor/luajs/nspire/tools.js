console.info("tools.js")

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
