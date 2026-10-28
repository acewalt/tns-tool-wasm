These artifacts contain emulator code only, with no cartridges or proprietary
firmware. `manifest.json` records their byte lengths and SHA256 values.

Build them with Emscripten **3.1.74**:

```
node desktop/prepare-rom-snes.cjs
node desktop/prepare-rom-gba.cjs
node desktop/prepare-rom-n64.cjs
node desktop/prepare-rom-nds.cjs
# TNS_EMSDK points to Emscripten 3.1.74; PYTHON points to Python 3.
node desktop/build-rom-preview.cjs snes
node desktop/build-rom-preview.cjs gba
node desktop/build-rom-preview.cjs n64
node desktop/build-rom-preview.cjs nds
```

The source revisions, archive hashes and repositories are pinned in the
adjacent `*-profile.json` files. The build adapters and modified native sources
are also in this repository; each distributed `vendor/rom/*-template.zip`
contains the corresponding modified source, build profile and upstream notices.

PocketSNES includes the historical Snes9x license and individual component
notices. gpSP and Daedalus use GPL v2 or later; NooDS uses GPL v3 or later.
Their original notices remain in the source templates. GBA uses the included
open replacement BIOS. DS boots directly through the core's HLE implementation.

`node desktop/prepare-rom-prebuilt.cjs` checks every artifact before copying it
to the portable runtime. Updating an artifact requires regenerating its manifest.
