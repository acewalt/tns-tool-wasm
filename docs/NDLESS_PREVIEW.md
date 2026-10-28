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

Native SDK dialogs appear below the preview with their original title, message
and button choices. ARM execution waits for a valid response without a watchdog
timeout. Missing and malformed BMPs exercise both Continue and Abort. Loading
resources while waiting restarts the current project with those files.

The two CX SP804 timers model load, enable/stop, prescaler, width, periodic and
one-shot counting plus readable raw/masked interrupt status. CPU IRQ injection
is not implemented. Executed ARM926 WFI is skipped so SDK polling/idle loops
can wake; elapsed delays and key checks remain in the guest program.

The portable includes Unicorn.js 1.0.3 (GPL-2.0), with SHA256-verified JavaScript,
WASM and license, and requires no CDN for this feature. Version 2.1.4 reproduced
a WASM translator trap in the official SDK's SDL keyboard initialization, so it
is not used by this preview. SWIs are serviced between CPU slices, including
modern LCD callback ABI, memory allocation, file and common C string operations.
The seven SDK screen formats are accepted, including transposed RGB565/RGB555,
packed 4-bit grayscale and indexed 8-bit palettes. Output is converted to RGB565.
Legacy CX control uses 0xC0000018. ARM conditional SVC and Thumb SVC instructions
are handled with their execution mode preserved between CPU slices.

Open **Program files and arguments** below the screen to load WAD, NES, BMP or
other resources (up to 64 MiB combined). These files live in the preview's virtual
`/documents` directory for this workspace session. The first file is passed as
a quoted argument automatically; edit arguments as needed. Relative paths,
directories, directory enumeration, stat, errno and virtual saves are supported.
Resources and virtual saves are not written back to the computer or autosaved
with the project. Clear resources removes them and recompiles without arguments.

This is a partial Ndless execution environment, not a TI-Nspire OS emulator.
OS services outside the implemented kernel, unsupported LCD modes and hardware
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
node --test --test-concurrency=1 tests/ndless-preview-native.test.cjs tests/ndless-preview-lcd-files.test.cjs tests/ndless-preview-games.test.cjs
node tools/ndless-community-preview.cjs
node tools/package-ndless-games.cjs
```

The fixtures exercise SDL gradients and dynamically calculated text, double
precision fractals, C++ vectors/templates across source files, animation,
keyboard changes, C with ARM assembly, unsupported SWIs, invalid memory,
infinite loops, and invalid C source. The same worker script runs in Node's
adapter and Electron. The portable release additionally tests editor changes,
frame invalidation, animation, pause/resume, keyboard and error recovery inside
the app extracted from the public ZIP before publishing it. Resource upload,
quoted paths containing spaces, and clearing resources are also checked there.
The community suite fetches pinned public sources and SHA256-verified Freedoom
data, compiles nDoom and NesNspire, and plays them through the same ARM worker.
See [game audit](NDLESS_GAME_PREVIEW_AUDIT.md) for results and limits.
