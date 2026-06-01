window.addEventListener('keydown', doKeyDown, true);
window.addEventListener('keyup', doKeyUp, true);

keypressed	= 0;
n	= 0
function keyloop(){
	n++;
	if (n%2 == 1) 
		n == 0;
	else
		return;
		
	switch (keypressed) {
		case 13:	/* Up arrow was pressed */
			callEvent("enterKey");
			break;
		case 38:	/* Up arrow was pressed */
			callEvent("arrowUp");
			callEvent("arrowKey","up");
			break;
		case 40:	/* Down arrow was pressed */
			callEvent("arrowDown");
			callEvent("arrowKey","down");
			break;
		case 37:	/* Left arrow was pressed */
			callEvent("arrowLeft");
			callEvent("arrowKey","left");
			break;
		case 39:	/* Right arrow was pressed */
			callEvent("arrowRight");
			callEvent("arrowKey","right");
		break;
	}
}

function doKeyDown(evt){
	keypressed	= evt.keyCode;
}

function doKeyUp(evt){
	keypressed	= 0;
}

function getMousePos(canvas, evt) {
	var rect = canvas.getBoundingClientRect(), root = document.documentElement;

	var mouseX = evt.clientX - rect.left - root.scrollLeft;
	var mouseY = evt.clientY - rect.top - root.scrollTop;
	return {
		x: mouseX,
		y: mouseY
	};
}

function doMouseUp(evt){
	var mousePos = getMousePos(canvas, evt);
	callEvent("mouseUp", mousePos.x/SCALE, mousePos.y/SCALE);
}

function doMouseDown(evt){
	var mousePos = getMousePos(canvas, evt);
	callEvent("mouseDown", mousePos.x/SCALE, mousePos.y/SCALE);
}

function doMouseMove(evt){
	var mousePos = getMousePos(canvas, evt);
	callEvent("mouseMove", mousePos.x/SCALE, mousePos.y/SCALE);
}
