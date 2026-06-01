console.info("timer.js");

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
