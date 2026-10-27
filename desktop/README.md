# TNS Tool Portable — Windows (experimental)

This is a desktop **port of the existing application**, not a rewrite.
The UI and source files are loaded from the same repository via an ephemeral
loopback HTTP origin. This preserves existing fetch(), workers, and WebUSB.
The renderer is sandboxed, context-isolated, and has no Node.js access.

Syntax Doctor also includes the shared numerical [Prgm preview](../docs/prgm-preview.md).
The extracted-ZIP acceptance check opens its actual toolbar button, exercises
the supplied physics program and invalid-input recovery, tests Enter and zoom,
refreshes unsaved source, and repeats in a narrow browser window without a native bridge.

The Windows workflow extracts the public ZIP, compares its ASAR with the build,
opens the extracted application, waits for Pyodide and Monaco, opens the actual
File menu and clicks its visible New Ndless Project button, then creates C and
C++ projects through the project form,
checks the visible editor and file tree, and closes each project to verify
the normal editor returns. Set `TNS_DESKTOP_SMOKE_REPORT` to an absolute JSON
output path to run the same hidden acceptance check locally. The application
exits after writing the result. It also exercises destination folder creation
and upload using a simulated calculator in the real dialog. This check does
not perform a physical USB transfer. Set `TNS_DESKTOP_SMOKE_BUILD=1` as well to
prepare the shipped SDK and compile C and C++ starters through native IPC.

The acceptance check also opens a window without the native bridge and verifies
that New/Open Ndless Project displays the desktop requirement dialog. It saves
a screenshot beside the JSON report. Diagnostic runs never post visits or
generated-document statistics to the production service.

The desktop project menu is enabled when the native bridge is present; it must
not depend on the asynchronous app-ready reset of all buttons. Acceptance tests
check disabled state, the maintenance badge and pointer hit-testing before
clicking. The application title includes its version. A native desktop wizard
screenshot is saved as well as the web notice screenshot.

Desktop visitor identity is stored once in `userData/tns-tool/stats-identity.json`
and read through the trusted native bridge. Changing the local server port or
restarting the application preserves that anonymous ID; the backend deduplicates
daily visits. Browser visitors retain the existing localStorage behavior.

Repeated-capture protocol fix (0.1.7): NNSE acknowledgements now echo the
received sequence without allocating a new outgoing sequence. The previous
implementation allocated then overwrote it, leaving one gap per acknowledged
fragment. Regression coverage includes 700 ACKs across sequence wraparound and
a peer that accepts the first screenshot but rejects the next request if the
host sequence has gaps. This follows the NNSEMessage/ACK handling described in
[libnspire cx2.cpp](https://github.com/Vogtinator/libnspire/blob/master/src/cx2.cpp).
The timeout message reports an interrupted USB session without diagnosing a
native app. Real-hardware repeated capture still needs validation.

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
After the extracted-ZIP acceptance test passes, internal repository builds
publish a versioned GitHub Release with `TNS-Tool-Portable-Windows-x64.zip` and
its SHA256 checksum, marked as the latest release. The web notice links directly
to that public ZIP; it no longer asks users to choose a workflow artifact.
Release publication is skipped for fork pull requests and refuses to reuse a
version belonging to a different source commit.
Keep its resources and DLLs together. Deep C++ include paths are stored inside
`resources/compiler/sdk.bin.gz` so Explorer can extract the portable ZIP without
error 0x80010135. The first compiler request verifies the bundle and prepares it
once under `%LOCALAPPDATA%/TNS/sdk/<content-id>`. Subsequent requests and launches
reuse that versioned cache. Opening the app does not unpack the SDK. The cache
uses additional disk space and remains on that Windows profile when the app is
moved. No runtime download is needed. Fortran is omitted; C/C++/assembly, LTO,
all C++ headers and the official target libraries remain bundled. The optional
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
