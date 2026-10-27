# TNS Tool Portable — Windows (experimental)

This is a desktop **port of the existing application**, not a rewrite.
The UI and source files are loaded from the same repository via an ephemeral
loopback HTTP origin. This preserves existing fetch(), workers, and WebUSB.
The renderer is sandboxed, context-isolated, and has no Node.js access.

## Local development

Requirements: Node.js 22+, Windows x64 for actual Ndless compilation.

1. Run `npm install`.
2. Run `npm run desktop:vendor` (downloads pinned Pyodide, JSZip, PDF.js).
3. Run `npm run desktop:dev`.
4. For Ndless builds, set `TNS_DESKTOP_COMPILER` to the absolute path of
   `TNS-Tool-Compiler-Windows-x64.exe` from the project's verified v4 release
   before launching the app, or place it under `resources/compiler/` for a
   packaged build.

Do not open index.html through file://.

## Windows portable binary

Run the GitHub Actions workflow **Desktop Portable Windows**. It downloads
and SHA256-verifies the canonical v4 self-contained compiler, vendors browser
dependencies, builds the Electron portable executable, and uploads the artifact.
The compiler and runtime ship inside the portable executable: the user should
not have to separately install Rust, WSL, Ndless SDK, or the old web bridge.

Offline coverage currently includes normal TNS tools and their Pyodide/JSZip
runtime; additional optional CDN-based features (Giac/CAS, Unicorn emulation,
and other dynamically loaded resources) require a dependency audit before
claiming complete offline parity. Web stats are necessarily network-backed.

## Build Ndless

The existing Ndless Project workflow exports the current project as a ZIP
and sends it over isolated Electron IPC to the verified native compiler,
which runs as `--build-zip project.zip output.tns name`. No shell
interpolation and no compiler command is exposed to web content. The temporary
project directory is removed in success and failure cases. Only a Zehn
artifact is returned if the compiler completes successfully.

Supported target today: `zehn-modern`. The legacy `bflt-r903` target is
NOT implemented by this compiler, and must not be mislabeled as supported.
A valid build does not guarantee runtime compatibility: test on a supported
TI-Nspire with the matching Ndless installed.

## USB

The application uses the repository's native WebUSB implementation. Only
Texas Instruments vendor 0x0451 and products 0xe012/e022 are permitted.
Chromium/Electron's device access and OS USB drivers still determine success;
a physical calculator smoke test remains essential.

## Acceptance criteria before a stable release

- Startup and Pyodide load without network.
- Import/export TNS, Python, Lua ScriptApp, images and PDF.
- Ndless C + C++ compile with a real SDK, and verify Zehn output.
- Transfer produced file to a connected calculator and run it under Ndless.
- Exercise multiple TI-Nspire USB revisions.
- Audit/cache remaining remote runtime dependencies, including Giac.
- Regression-test both normal and Ndless file-menu behaviors.

This branch is an experimental foundation, not a declaration of full parity.
