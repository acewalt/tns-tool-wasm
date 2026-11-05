giacwasm.js is compiled with emscripten 1.38.41
If emsdk install 1.38.41 && emsdk activate 1.38.41 does not work, try instead
emsdk install latest-fastcomp
emsdk activate latest-fastcomp
(thanks to Vivien Guillet for that information)

=========
      // WARNING: library_sdl.js SDL_Quit() is buggy, it should be
      /*
	SDL_Quit: function() {
	_SDL_AudioQuit();
	var keyboardListeningElement = Module['keyboardListeningElement'] || document;
	keyboardListeningElement.removeEventListener("keydown", SDL.receiveEvent);
	keyboardListeningElement.removeEventListener("keyup", SDL.receiveEvent);
	keyboardListeningElement.removeEventListener("keypress", SDL.receiveEvent);
	Module.print('SDL_Quit called (and ignored)');
	},
      */
        
        
==========
gmp.js is a port of the GNU Multiple-Precision Library (GMP), a library for arbitrary precision arithmetic, to JavaScript using Emscripten.

GMP website: http://gmplib.org/
Steps to build

    First run configure and make natively/normally. You will need some of the generated executables. Optionally, also build test.c and see that it works (see instructions inside test.c).

    Run configure using something like
    export CFLAGS=-m32
    ./configure ABI=32
    make clean
    (export CFLAGS='-Os -s PRECISE_I32_MUL=1' does not work)
    EMCONFIGURE_JS=1 emconfigure ./configure --build=none --host=none

    Edit config.h and disable HAVE_QUAD_T, HAVE_OBSTACK_VPRINTF

    Run make using something like

    emmake make

