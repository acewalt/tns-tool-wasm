# Ndless build audit — 2026-10-26

The reported target is TI-Nspire CX II CAS, OS 6.2.0.333. The original example,
its uncompressed equivalent, the PRG wrapper and the independent tiny PRG all
produced the calculator's unsupported-document error. Its physical cause has
not yet been established. This audit addresses independently verified build defects.

## How published native projects are built

The official SDK's Makefile template and Crafti use the same sequence:

1. `nspire-gcc` / `nspire-g++` compiles source to ARM objects for ARM926EJ-S.
2. `nspire-ld` invokes the SDK linker wrapper. It supplies the startup objects,
   linker script, Ndless archives, Newlib, libstdc++ and libgcc in the SDK order.
3. `genzehn` converts the relocatable ARM ELF to Zehn.
4. `make-prg` prepends the SDK's loader, selecting the zlib-capable loader when
   the Zehn is compressed. Renaming a generic ELF to `.tns` is insufficient.

References:

- [Official SDK introduction](https://github.com/ndless-nspire/Ndless/wiki/Ndless-SDK:-C-and-assembly-development-introduction)
- [SDK template](https://github.com/ndless-nspire/Ndless/blob/master/ndless-sdk/bin/Makefile.tpl)
- [SDK toolchain configuration](https://github.com/ndless-nspire/Ndless/blob/master/ndless-sdk/toolchain/build_toolchain.sh)
- [Crafti Makefile](https://github.com/Vogtinator/crafti/blob/master/Makefile)

## Verified differences in the old portable

The v4 packaging workflow downloaded the generic Windows Arm GNU 14.3.rel1
distribution and combined its target libraries with separately built Ndless
archives. The SDK's own Newlib build explicitly defines `MALLOC_PROVIDED` and
`ABORT_PROVIDED`, disables supplied syscalls, and enables binary compatibility
for the reentrancy structures. Generic Arm libraries are not a substitute for
these settings.

The old C++ starter reproduced duplicate `_malloc_r`, `_free_r`, `_realloc_r`
definitions and unresolved `_sbrk`. This is a build defect with direct evidence.
The core also emitted raw Zehn and the adapter checked only its signature;
the SDK's final PRG packaging step was absent. Ndless supports direct Zehn, so
this difference alone does not establish the cause of the physical rejection.

## Applied correction

The build-time preparation verifies the original compiler hash and the pinned
official SDK Debian package hash. It extracts only platform-independent ARM
headers, archives, startup objects and loaders into the Windows-native runtime.
No Debian package is installed and no Linux binary is executed.

The host compiler remains GCC 14.3.1 for Windows; target libraries are the
official SDK's GCC 14.2.0 archives. The provenance manifest makes this distinction
visible. The core is placed beside the corrected runtime so it does not select
the previous per-user runtime. The adapter performs the official loader
concatenation and validates the Zehn sizes before returning a `.tns`.

The native core still uses a controlled set of compilation commands; it does
not execute arbitrary project Makefiles. Projects requiring custom generated
assets, linker scripts or additional build commands need explicit support.

## Validation and limits

- C with allocation and C++ with `std::vector` now compile through the desktop
  adapter. The previous C++ link conflict is gone.
- The SDK's unchanged `helloworld-sdl/hello-sdl.c` compiles with the same runtime.
- Tests verify PRG signature, embedded Zehn, compressed payload size and
  relocation bounds. They reject truncated output.
- The old example reaches `main`, writes its message and returns 0 under ARM
  emulation with OS syscalls mocked and screen/key functions stubbed. That is
  not an emulator of OS 6.2.0.333.
- None of these checks proves that the updated files execute on the physical
  calculator. The earlier independent PRG rejection remains unexplained.

## Subsequent physical result

The user also tested `SDK-Hello-World.tns` (127416 bytes), built with the corrected
runtime, and reported the same unsupported-document dialog. The library fix has
therefore not resolved the reported hardware failure.

Successful Pacman, Tetris or Dino launches do not establish that Ndless is active:
Lua versions of these games exist. The user's exact game files have not been
identified. For example, the author's [Pacman archive entry](https://www.ticalc.org/archives/files/fileinfo/441/44142.html)
explicitly identifies it as Lua; it is not evidence about the user's own copy.
Current Ndless activation must be checked independently. The official
[r2021 release notes](https://github.com/ndless-nspire/Ndless/releases/tag/r2021)
describe its installation message on the Home screen.

The error dialog alone does not establish inactivity either: Ndless's
`ploaderhook.c` also allows the OS unsupported-format dialog when its loader
returns `0xDEAD`. Activation is the next diagnostic check, not a confirmed cause.

## Activation and successful native execution — 2026-10-27

The user opened the installer, started it and captured the Home screen showing
`Ndless successfully installed!`. Afterwards `SDK-Hello-World.tns` opened on the
physical CX II CAS, OS 6.2.0.333. The sample intentionally calls `SDL_Delay(3000)`
then `SDL_Quit()`, so closing after a few seconds is expected. This confirms
physical execution for that generated example; it does not validate every old
diagnostic binary or every template.

The older `my-ndless-app` variants now trigger Ndless's legacy LCD compatibility
warning, followed by a blank screen and exit. The basic template calls `clrscr`
and `printf`; the controlled linker uses `libsyscalls.a`, whereas the SDK's
automatic on-screen console requires `libsyscalls_nspireio.a`. It never explicitly
creates a console. A successful mocked stdout assertion did not establish LCD
output, and did not reproduce the reported immediate exit on hardware.

New Basic and Graphics C/C++ starters instead use the SDL path that worked in
the official example, draw their text explicitly, and wait for an Escape key
event. Native build checks assert Zehn `USES_LCD_BLIT=1` and `RUNS_ON_HWW=1`.
The new starters still require a physical user check; their success is not yet
claimed. Existing projects and previously compiled `.tns` files are not rewritten.

## Portable startup and size

The 0.1.2 ASAR included about 238 MB of documentation (237500315 bytes of GIFs). Those assets are
excluded from the desktop build. The old single-file executable also unpacks
the entire app and SDK into a temporary directory on each run. The default
0.1.3 artifact is a folder ZIP: extract once, then launch its executable directly.

GCC's `-mcpu=arm926ej-s -marm -print-multi-directory` selects `.`. The compiler
core fixes these CPU/mode options, so unused architecture multilib directories
are removed from the prepared runtime (794602428 bytes in the current build).
Allocation fixtures and four generated SDL starters still compile afterwards.

Baseline measurement: launching the already extracted 0.1.2 app with an isolated
fresh profile, waiting for Python/Monaco, and exercising editor/folder UI took
6.72 seconds. That measurement excludes single-file self-extraction and is not
a promise of startup time on other computers.

The final 0.1.3 ASAR is approximately 8.8 MB; the complete
extracted portable folder is approximately 646 MB. The packaged smoke check
passed with external DNS blocked, using a fresh isolated profile. Page load
completed 2686 ms after main-process initialization; the renderer reported
Python/Monaco readiness at 2588 ms after navigation. Both C/C++ wizards defaulted
to Modern Zehn, mounted their editors and restored the normal editor on close.
Folder creation/upload was checked against simulated USB only.
