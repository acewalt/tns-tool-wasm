var _dummy_1 = (function () {
	return [];
});

G.str['cursor'] = lua_newtable();
lua_tableset(G.str['cursor'], 'hide', _dummy_1);
lua_tableset(G.str['cursor'], 'show', _dummy_1);
lua_tableset(G.str['cursor'], 'set', _dummy_1);
G.str['image'] = lua_newtable();
lua_tableset(G.str['image'], 'new', _dummy_1);
G.str['var'] = lua_newtable();
lua_tableset(G.str['var'], 'store', _dummy_1);
lua_tableset(G.str['var'], 'recall', _dummy_1);
G.str['document'] = lua_newtable();
lua_tableset(G.str['document'], 'markChanged', _dummy_1);
