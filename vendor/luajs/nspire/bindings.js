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
