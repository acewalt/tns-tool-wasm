# ROM Converter: comprobaciones de 0.1.16

Se prueban el arranque y las primeras pantallas, no partidas completas. Los cartuchos del usuario y las imágenes de juegos se mantienen fuera de Git y de las descargas públicas.

- SNES: 18 cartuchos distintos del paquete, incluidos Yoshi's Island, Zelda, Donkey Kong Country, Kirby, Star Fox, Chrono Trigger, Mario RPG y Contra III, produjeron cambios de imagen en 1.200 fotogramas. Contra III permitió corregir la detección de cabeceras antiguas cuyo título ocupa el byte de mapa.
- N64: 12 cartuchos completaron 1.200 intervalos acotados del intérprete. Mario 64, Pokémon Stadium, Star Fox 64 y Banjo-Kazooie mostraron imágenes variables. Otros solo mostraron pantallas iniciales; Paper Mario, F-Zero X y Wave Race quedaron negros en esta prueba. No se presentan como compatibles.
- GBA y DS: diagnósticos originales con animación y entrada. No se recibieron juegos comerciales GBA/DS para validarlos.
- SNES/GBA: mando y RAM de cartucho verificados. DS: táctil y restauración de guardado; N64: restauración de RAM de cartucho y Controller Pak.
- Los cuatro proyectos generados compilan con el SDK ARM. El TNS de DS lee un cartucho externo de 8 MiB y genera imagen en el preview ARM.

N64 y DS son experimentales. El rendimiento físico en una TI-Nspire CX II no se certifica con una prueba en PC. El preview directo ejecuta el emulador como WebAssembly; el preview del proyecto ejecuta su C/C++ compilado a ARM.

Fuentes: [PocketSNES](https://github.com/gameblabla/pocketsnes-nspire), [gpSP Nspire](https://github.com/andymcca/lr-gpsp-nspire), [Daedalus Nspire](https://github.com/Marckey2007/daedalus-nspire), [NooDS](https://github.com/Hydr8gon/NooDS). Revisiones y hashes fijados en desktop/rom/*-profile.json.
