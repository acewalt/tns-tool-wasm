# Offline Giac/Xcas CAS

TNS Tool WASM loads this file locally and on demand for symbolic mathematics. No TI calculator firmware or proprietary CAS code is included.

- Runtime: Giac 1.9.0-xx, Emscripten WebAssembly single-file build, 19,016,229 bytes.
- Original file, unchanged: https://raw.githubusercontent.com/OpenMath-eu/onlymath-engine/7d3ccf044bd7fdd9468299ba03b8ff01b1981d39/giacwasm.js
- Runtime SHA256: a39869bb02000d0baaf8a24907a57552ab4b63f1944b53c222db8fba2840cb7c
- Main license: GNU GPL version 3 or later; full text in LICENSE-GPL-3.0.txt.

Giac/Xcas is copyright Bernard Parisse and Renée De Graeve, Institut Fourier, Université Grenoble Alpes. Optimization, signal processing and graph theory include work by Luka Marohnić.

## Sources, notices and modification rights

[Download the source distribution, build files and arithmetic-library sources](https://github.com/acewalt/tns-tool-wasm/releases/download/tns-tool-portable-v0.1.30/TNS-Giac-CAS-Source.tar.gz) (43,445,099 bytes). SHA256: 0e6024da7c71c3f29ce904f1cf9fe560f54ee91508987adc0ad42b8b8f7fa99d. The same asset is published alongside Portable 0.1.30; no account is required to download it. It contains the complete official emgiac_wasm.tgz source tree with its Makefile and README plus sources for the versions of GMP, MPFR, MPFI, GLPK and PARI identified by its headers, and the author's MicroPython Emscripten port. Each original archive URL and SHA256 is recorded in manifest.json and the source bundle's SOURCES.json.

The official source archive's config.h and the runtime both report 1.9.0-xx. The runtime mirror does not provide a finer C++ source revision or reproducible-build evidence; no bit-identical rebuild claim is made. The exact author-provided build instructions are retained in UPSTREAM-BUILD-README.txt and in the source bundle, including Emscripten 1.38.41 and the SINGLE_FILE target. Rebuilding with modified GPL/LGPL library sources is permitted under their included licenses.

Arithmetic components: GMP (LGPLv3+ or GPLv2+), MPFR (LGPLv3+), MPFI (LGPLv2.1+), GLPK (GPLv3+), PARI (GPLv2+). Additional runtime components include QuickJS, MicroPython, ulab (MIT) and Emscripten (MIT / University of Illinois/NCSA). Full license notices are included in this directory and remain in all source archives. UPSTREAM-COMPONENT-LICENSES.txt is the author's original component notice.

Official project: https://www-fourier.univ-grenoble-alpes.fr/~parisse/giac.html
Compilation documentation: https://www-fourier.univ-grenoble-alpes.fr/~parisse/giac_compile.html

## Verification

The local runtime was loaded in Chromium with every external request blocked. caseval() successfully computed arithmetic, polynomial factorization, integration, differentiation, matrices and limits. The WebAssembly payload is embedded; no separate .wasm file or CDN is required.
