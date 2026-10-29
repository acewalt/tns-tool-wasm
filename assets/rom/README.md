# Browser ROM players

These are emulator programs, source projects, and WebAssembly engines. **No game cartridge is included.** The converter processes the user's selected cartridge locally.

The matching `*-project.zip` contains the sources and licenses for each ARM player. To rebuild, open it in TNS Tool Portable with the bundled official Ndless SDK. `desktop/prepare-rom-web.cjs` generates all six players from pinned templates on the `codex/rom-converter-web` source branch; `manifest.json` records their exact hashes and sizes.

Upstream engines: [NesNspire](https://github.com/mihkeymouse/NesNspire), [binjgb](https://github.com/binji/binjgb), [PocketSNES](https://github.com/gameblabla/pocketsnes-nspire), [gpSP Nspire](https://github.com/andymcca/lr-gpsp-nspire), [NooDS](https://github.com/Hydr8gon/NooDS), [Daedalus Nspire](https://github.com/Marckey2007/daedalus-nspire). The GBA engine uses the open replacement BIOS already included in its source project.

JSZip 3.10.1 is distributed under the MIT or GPLv3 license; its license notice is preserved in `jszip.min.js`. The ARM preview additionally uses the pinned Unicorn.js engine loaded on demand from its upstream package CDN. DS and N64 are experimental and game compatibility varies.
