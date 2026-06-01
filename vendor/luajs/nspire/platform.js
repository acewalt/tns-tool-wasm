console.info("platform.js");


_WIDTH	= 640;
_HEIGHT	= 480;

function degToRad(deg){
	return deg*(Math.PI/180)
}

function gc_drawLine(x1, y1, x2, y2){	
	context.beginPath();
	context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.closePath();
    context.stroke();
}

function gc_drawArc(x, y, w, h, angleS, angleE){
	context.save()
	context.beginPath();
	angleE=-(angleE+angleS);
	angleS=-angleS;
	var r	= (w+h)/4;
	context.moveTo(x+w/2, y+h/2);
	context.scale(1, (h/w));
	context.arc(x+w/2, (y+h/2)*(w/h), w/2, degToRad(angleS), degToRad(angleE),true);
	//context.lineTo(x+r, y+r);
    context.stroke();
    context.restore();
}

function gc_fillArc(x, y, w, h, angleS, angleE){
	context.save()
	context.beginPath();
	angleE=-(angleE+angleS);
	angleS=-angleS;
	var r	= (w+h)/4;
	context.moveTo(x+w/2, y+h/2);
	context.scale(1, h/w);
	context.arc(x+w/2, (y+h/2)*(w/h), w/2, degToRad(angleS), degToRad(angleE),true);
	//context.lineTo(x+r, y+r);
    context.fill();
    context.restore();
}

function gc_drawRect(x, y, w, h){
    context.strokeRect(x, y, w, h);
}

function gc_fillRect(x, y, w, h){
	//if (x == 0 && h == 0) throw new Error("brag");
    context.fillRect(x, y, w, h);
}

function gc_fillPolygon(poly){
	var length	= lua_len(poly);
	var x	= lua_tableget(poly, 1);
	var y	= lua_tableget(poly, 2);
	
	context.beginPath();
	context.moveTo(x, y);
	for(var i=3; i<=length; i+=2){
		x	= lua_tableget(poly, i  );
		y	= lua_tableget(poly, i+1);
		context.lineTo(x, y);
	}
	context.fill()	
}



function gc_drawPolyLine(poly){
	var length	= lua_len(poly);
	var x	= lua_tableget(poly, 1);
	var y	= lua_tableget(poly, 2);
	
	context.beginPath();
	context.moveTo(x, y);
	for(var i=3; i<=length; i+=2){
		x	= lua_tableget(poly, i  );
		y	= lua_tableget(poly, i+1);
		context.lineTo(x, y);
	}
	context.stroke();
}

function gc_setLineWidth(w){
	context.lineWidth	= w
}

function gc_clearScreen(){
    canvas.width = canvas.width;
    context.font="20px Arial";
}


function gc_setColor(r, g, b){
	context.fillStyle	= "rgb(" + r + "," + g + "," + b + ")";
	context.strokeStyle	= context.fillStyle;
}

function gc_setFont(style, font){

}

function gc_drawString(str, x, y, offset){
	if (offset == "top") y+= 14;
	context.fillText(str, x, y);
}



console.info("platform");
G.str['platform'] = lua_newtable();
lua_tableset(G.str['platform'], '_hwLevel', 5);
lua_tableset(G.str['platform'], 'apiLevel', '1.5');
lua_tableset(G.str['platform'], 'hw', (function () {
	var tmp;
	return [lua_tableget(G.str['platform'], '_hwLevel')];
	return [];
}))

lua_tableset(G.str['platform'], 'isColorDisplay', (function () {
	var tmp;
	return [true];
	return [];
}))

lua_tableset(G.str['platform'], 'isDeviceModeRendering', (function () {
	var tmp;
	return [true];
	return [];
}))

console.info("window");
G.str['Window'] = lua_call(G.str['class'], [])[0];
lua_tableset(G.str['Window'], 'init', (function (self, _w, _h) {
	var tmp;
	lua_tableset(self, 'w', lua_or(_w, function () {return lua_call(G.str['error'], ["FATAL: No height specified for Window object!"])[0];}));
	lua_tableset(self, 'h', lua_or(_h, function () {return lua_call(G.str['error'], ["FATAL: No width specified for Window object! "])[0];}));
	lua_tableset(self, 'gc', lua_call(lua_tableget(G.str['platform'], 'gc'), [_w, _h])[0]);
	lua_mcall(lua_tableget(self, 'gc'), 'begin', []);
	lua_tableset(self, 'invalidated', false);
	lua_tableset(self, 'invaliddata', 0);
	lua_mcall(self, 'update', []);
	return [];
}))

lua_tableset(G.str['Window'], 'invalidate', (function (self, _x, _y, _w, _h) {
	var tmp;
	lua_tableset(self, 'invalidated', true);
	if ((((lua_true(_x) && lua_true(_y)) && lua_true(_w)) && lua_true(_h))) {
	_x = lua_subtract(_x, 1);
	_y = lua_subtract(_y, 1);
	_w = lua_add(_w, 2);
	_h = lua_add(_h, 2);
	if (lua_eq(lua_call(G.str['type'], [lua_tableget(self, 'invaliddata')])[0], "table")) {
		var _id_8 = lua_tableget(self, 'invaliddata');
		tmp = [lua_tableget(_id_8, 1), lua_tableget(_id_8, 2), lua_tableget(_id_8, 3), lua_tableget(_id_8, 4)]; var _xo_8 = tmp[0]; var _yo_8 = tmp[1]; var _wo_8 = tmp[2]; var _ho_8 = tmp[3]; tmp = null;
		var _xn_8 = lua_call(lua_tableget(G.str['math'], 'min'), [_x, _xo_8])[0];
		var _yn_8 = lua_call(lua_tableget(G.str['math'], 'min'), [_y, _yo_8])[0];
		var _wn_8 = lua_add(lua_subtract(lua_call(lua_tableget(G.str['math'], 'max'), [lua_add(_x, _w), lua_add(_xo_8, _wo_8)])[0], _xn_8), 2);
		var _hn_8 = lua_add(lua_subtract(lua_call(lua_tableget(G.str['math'], 'max'), [lua_add(_y, _h), lua_add(_yo_8, _ho_8)])[0], _yn_8), 2);
		lua_tableset(self, 'invaliddata', lua_newtable([_xn_8, _yn_8, _wn_8, _hn_8]));
	} else {
		lua_tableset(self, 'invaliddata', lua_newtable([_x, _y, _w, _h]));
	}
	} else {
	lua_tableset(self, 'invaliddata', 0);
	}
	return [];
}))

lua_tableset(G.str['Window'], 'height', (function (self) {
	var tmp;
	return [lua_tableget(self, 'h')];
	return [];
}))

lua_tableset(G.str['Window'], 'width', (function (self) {
	var tmp;
	return [lua_tableget(self, 'w')];
	return [];
}))

lua_tableset(G.str['Window'], 'update', (function (self) {
	var tmp;
	lua_call(lua_tableget(G.str['PCspire'], 'callEvent'), [lua_tableget(G.str['on'], 'resize'), lua_tableget(self, 'w'), lua_tableget(self, 'h')]);
	return [];
}))

lua_tableset(G.str['Window'], 'setHeight', (function (self, _h) {
	var tmp;
	lua_tableset(self, 'h', lua_or(lua_and(lua_lt(0, _h), function () {return _h;}), function () {return lua_call(G.str['error'], ["Specified window height is smaller or equal to 0! Are you crazy?"])[0];}));
	lua_call(lua_tableget(G.str['PCspire'], 'callEvent'), [lua_tableget(G.str['on'], 'resize'), lua_tableget(self, 'w'), lua_tableget(self, 'h')]);
	return [];
}))

lua_tableset(G.str['Window'], 'setWidth', (function (self, _w) {
	var tmp;
	lua_tableset(self, 'w', lua_or(lua_and(lua_lt(0, _w), function () {return _w;}), function () {return lua_call(G.str['error'], ["Specified window width is smaller or equal to 0! Are you crazy?"])[0];}));
	lua_call(lua_tableget(G.str['PCspire'], 'callEvent'), [lua_tableget(G.str['on'], 'resize'), lua_tableget(self, 'w'), lua_tableget(self, 'h')]);
	return [];
}))

console.info("gc");
lua_tableset(G.str['platform'], 'gc', lua_call(G.str['class'], [])[0]);

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'init', (function (self, _framebuffer, _w, _h) {
	var tmp;
	lua_tableset(self, 'w', lua_or(_w, function () {return _WIDTH;}));
	lua_tableset(self, 'h', lua_or(_h, function () {return _HEIGHT;}));
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'begin', (function (self) {
	var tmp;
	gc_setColor("0x00")
	gc_setLineWidth(1)
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'default', (function (self) {
	var tmp;
	lua_call(lua_tableget(lua_tableget(G.str['love'], 'graphics'), 'setColor'), [0, 0, 0]);
	lua_mcall(self, 'setPen', [10]);
	lua_call(lua_tableget(G.str['fonts'], 'setFont'), [24]);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), "finish", (function (_self) {
	var tmp;
	//
	return [];
}));

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'setFont', (function (self, _family, _style, _size) {
	var tmp;
	//
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'drawString', (function (self, _str, _x, _y, _pos) {
	var tmp;
	gc_drawString(_str, _x, _y, _pos);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'drawRect', (function (self, _x, _y, _w, _h) {
	var tmp;
	gc_drawRect(_x, _y, _w, _h);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'fillRect', (function (self, _x, _y, _w, _h) {
	var tmp;
	gc_fillRect(_x, _y, _w, _h);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'fillPolygon', (function (self, _vertices) {
	var tmp;
	gc_fillPolygon(_vertices);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'drawPolygon', (function (self, _vertices) {
	var tmp;
	gc_drawPolyLine(_vertices);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'drawPolyLine', (function (self, _vertices) {
	var tmp;
	gc_drawPolyLine(_vertices);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'drawArc', (function (self, _x, _y, _w, _h, _startangle, _angle) {
	var tmp;
	gc_drawArc(_x, _y, _w, _h, _startangle, _angle);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'fillArc', (function (self, _x, _y, _w, _h, _startangle, _angle) {
	var tmp;
	gc_fillArc(_x, _y, _w, _h, _startangle, _angle);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'drawLine', (function (self, _x1, _y1, _x2, _y2) {
	var tmp;
	gc_drawLine(_x1, _y1, _x2, _y2);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'clipRect', (function (self, _op, _x, _y, _width, _height) {
	var tmp;
	//
	return [];
}))


lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'setPen', (function (self, _thickness, _style) {
	var tmp;
	var w = 1;
	if (lua_eq(_thickness, "medium")) {
		w= 3;
	} else if (lua_eq(_thickness, "thick")) {
		w = 8;
	}
	
	gc_setLineWidth(w);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'setColorRGB', (function (self, _r, _g, _b) {
	gc_setColor(_r, _g, _b);
	return [];
}))

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'getStringWidth', (function (self, _str) {
	var tmp;
	return [lua_multiply(lua_multiply(0.6, 10), lua_len(lua_call(G.str['tostring'], [_str])[0]))];
	return [];
}))


lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'getStringHeight', (function (self, _str) {
	var tmp;
	return [12];
	return [];
}))


lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'setAlpha', (function (self) {
	var tmp;
	return [];
}))



// Draw image

lua_tableset(lua_tableget(G.str['platform'], 'gc'), 'drawImage', (function (self, _img, _x, _y) {
	return [];
}))
    
    
G.str['_menuState'] = false;

G.str['toggleMenu'] = (function () {
  var tmp;
  lua_call(G.str['error'], ["fake error, triggered"]);
  G.str['_menuState'] = lua_not(G.str['_menuState']);
  if (lua_true(G.str['_menuState'])) {
	
  }
  return [];
})









