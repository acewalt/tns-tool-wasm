# TNS Tool Portable — Windows (experimental)

This is a desktop **port of the existing application**, not a rewrite.
The UI and source files are loaded from the same repository via an ephemeral
loopback HTTP origin. This preserves existing fetch(), workers, and WebUSB.
The renderer is sandboxed, context-isolated, and has no Node.js access.

The Windows workflow also opens the packaged ASAR application, waits for
Pyodide and Monaco, creates C and C++ projects through the project form,
checks the visible editor and file tree, and closes each project to verify
the normal editor returns. Set `TNS_DESKTOP_SMOKE_REPORT` to an absolute JSON
output path to run the same hidden acceptance check locally. The application
exits after writing the result. It also exercises destination folder creation
and upload using a simulated calculator in the real dialog. This check does
not perform a native build or a physical USB transfer.

## Local development

Requirements: Node.js 22+, Windows x64 for actual Ndless compilation.

1. Run `npm install`.
2. Run `npm run desktop:vendor` (downloads pinned Pyodide, JSZip, PDF.js).
   After placing the pinned native compiler in `desktop/vendor/compiler/`, run
   `python desktop/prepare-compiler.py` to prepare the matched target libraries.
3. Run `npm run desktop:dev`.
4. For Ndless builds, set `TNS_DESKTOP_COMPILER` to the absolute path of
   `TNS-Tool-Compiler-Windows-x64.exe` from the project's verified v4 release
   before launching the app, or place it under `resources/compiler/` for a
   packaged build.

Do not open index.html through file://.

## Windows portable binary

Run the GitHub Actions workflow **Desktop Portable Windows**. It downloads
and SHA256-verifies the canonical v4 self-contained compiler, vendors browser
dependencies, builds an Electron portable folder ZIP, and uploads the artifact.
Extract the entire ZIP once, then run `TNS Tool Portable.exe` from that folder.
Keep its resources and DLLs together. This avoids unpacking the compiler SDK
into a temporary directory on every launch. The optional
`npm run desktop:build:single-exe` still creates the slower self-extracting variant.
The compiler and runtime ship inside the portable folder: the user should
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
project directory is removed in success and failure cases. The desktop adapter
packages the resulting Zehn with the matching official PRG loader, as in the
SDK's `make-prg` stage. Compressed Zehn uses the compressed-capable loader.

Supported target today: `zehn-modern`. The legacy `bflt-r903` target is
NOT implemented by this compiler, and must not be mislabeled as supported.
A valid build does not guarantee runtime compatibility: test on a supported
TI-Nspire with the matching Ndless installed.

Build audit (2026-10-26): the original Windows package combined Ndless archives
with generic GNU Arm Newlib. This caused duplicate allocator definitions and
unresolved `_sbrk` when linking the C++ starter. `prepare-compiler.py` now verifies
the source compiler and official SDK package hashes, retains the Windows-native
GCC host, overlays the official ARM headers/archives/startup objects, and places
that runtime beside the native compiler core. It does not install or run Linux
programs. The source core uses this adjacent runtime before its per-user cache.

The resulting Windows host GCC is 14.3.1; the official target archives are built
with GCC 14.2.0. `runtime/sdk-manifest.json` records this explicitly. C, C++ with
`std::vector` allocation, and the SDK's Hello World SDL example compile with this
combination. CI checks the PRG, embedded Zehn, decompression and relocation bounds.
The user subsequently confirmed that the generated SDK SDL Hello World opens on
the physical CX II CAS, OS 6.2.0.333, after activating Ndless. Its three-second
automatic exit is intentional. This is hardware evidence for that example only.
The old basic template uses the legacy framebuffer and printf without an
on-screen console; its blank output remains a separate template issue. New
Basic and Graphics templates now use SDL text and wait for ESC rather than a
timeout. Their output is compiled and checked for modern LCD flags, but their
physical execution still needs confirmation.

The packaged compiler targets ARM926EJ-S in ARM mode with software floating point;
GCC selects the root multilib. Unselectable ARM/Thumb/FPU variant directories are
removed at preparation time (about 758 MiB). The packager also excludes the
documentation assets (about 238 MB), which are not application runtime assets.
The desktop project form defaults to the supported `zehn-modern` target.

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
