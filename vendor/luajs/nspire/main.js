console.info("main.js");

_WIDTH	= 640;
_HEIGHT	= 480;

function run(n){
	console.info("running");
	SCALE = 1;
	canvas = document.getElementById("canvas");
	context = canvas.getContext("2d");
	context.font = "20px Arial";

	//mouse
	canvas.addEventListener('mousemove', doMouseMove);
	canvas.addEventListener('mouseup'  , doMouseUp  );
	canvas.addEventListener('mousedown', doMouseDown);
	
	
	
	G.str['on'] = lua_newtable();
	lua_tableset(G.str['platform'], 'window', (lua_call(G.str['Window'], [_WIDTH, _HEIGHT]))[0]);
	init_user_script();
	//runLuaScript(luascript);
	
	
	
	
	callEvent("create"  , lua_tableget(lua_tableget(G.str['platform'], "window"), "_gc"));
	callEvent("resize", _WIDTH, _HEIGHT);
	G.str['platform'].str["window"].str["invalidated"]	= false;
	context.scale(SCALE, SCALE);
	callEvent("paint", G.str['platform'].str["window"].str["gc"]);
	
	if (n == null)
		setInterval(mainLoop, 1);
}



function mainLoop(){
	dotimer();
	keyloop();
	
	if (lua_true(G.str['platform'].str["window"].str["invalidated"])) {
		gc_clearScreen();
		context.scale(SCALE, SCALE);
		callEvent("paint", G.str['platform'].str["window"].str["gc"])
		G.str['platform'].str["window"].str["invalidated"] = false
	}
}

function runLuaScript(script){
	var scr=lua_parser.parse(script);
	var usercode=scr.split("\n").slice(19).join("\n");
	eval(usercode);
}

