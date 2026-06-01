G = (function() {
		var tmp;
		G = lua_newtable2(lua_core);
		for (var i in lua_libs) {
			G.str[i] = lua_newtable2(lua_libs[i]);
		}
		String.prototype["metatable"] = lua_newtable(null, "__index", G.str.string);
		G.str['arg'] = lua_newtable();
		G.str['_G'] = G;
		G.str['module'] = function (name) {
			lua_createmodule(G, name, slice(arguments, 1));
		};
		G.str['require'] = function (name) {
			lua_require(G, name);
		};
		G.str['package'].str['seeall'] = function (module) {
			if (!module.metatable) {
				module.metatable = lua_newtable();
			}
			module.metatable.str['__index'] = G;
		};
		return G;
	})();


