# Ndless executable preview

The Windows desktop workspace compiles the current project with its bundled
Ndless SDK and executes the resulting Zehn ARM program inside a dedicated Web
Worker. The preview displays the program's 320×240 RGB565 framebuffer. It does
not infer execution from text literals or regular expressions.

Editing any project file invalidates the previous screen immediately. After
650 ms without changes, compilation starts. Only one preview compilation runs
at once; intermediate edits and obsolete compiler results are discarded. Header,
assembly, file deletion and settings changes also invalidate execution. Switching
editor tabs alone does not rebuild. Closing a project terminates its worker.

Auto can be disabled; Restart compiles the current revision again. Pause/Resume
controls execution. Click the screen before using its keyboard, or use the
on-screen controls. Typing in the source editor does not press calculator keys.
Console stdout is shown separately; printf does not create an LCD console.

The portable includes Unicorn.js 1.0.3 (GPL-2.0), with SHA256-verified JavaScript,
WASM and license, and requires no CDN for this feature. Version 2.1.4 reproduced
a WASM translator trap in the official SDK's SDL keyboard initialization, so it
is not used by this preview. SWIs are serviced between CPU slices, including
modern RGB565 lcd_blit, memory allocation, file and common C string operations.

This is a partial Ndless execution environment, not a TI-Nspire OS emulator.
OS services outside the implemented kernel, other LCD formats and hardware
peripherals can fail explicitly. Speed and timing are simulated; successful
preview execution does not replace testing on a physical calculator. Compiling
large projects takes time, so "live" means recompilation after an edit followed
by continuous execution, not a C interpreter running every keystroke.

## Verification

```
node --test tests/ndless-live-session.test.js
node tests/ndless-arm-runtime.test.js
```

On Windows, after preparing desktop vendor assets and the SDK, set
`TNS_DESKTOP_COMPILER` to the bundled compiler executable and run:

```
node --test tests/ndless-preview-native.test.cjs
```

The fixtures exercise SDL gradients and dynamically calculated text, double
precision fractals, C++ vectors/templates across source files, animation,
keyboard changes, C with ARM assembly, unsupported SWIs, invalid memory,
infinite loops, and invalid C source. The same worker script runs in Node's
adapter and Electron. The portable release additionally tests editor changes,
frame invalidation, animation, pause/resume, keyboard and error recovery inside
the app extracted from the public ZIP before publishing it.
