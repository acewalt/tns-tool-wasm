# ROM Converter: comprobaciones de 0.1.16

## Conversor web

En Archivo → ROM Converter también se puede seleccionar una ROM o un ZIP individual desde la web. La detección, normalización, preview y preparación del paquete se ejecutan en el equipo del usuario, sin subir el cartucho. Se admiten NES, GB/GBC, SNES, GBA y los perfiles experimentales DS/N64; no todos los juegos son compatibles.

La web prepara un ZIP para la calculadora con un reproductor ARM precompilado y un cartucho de datos `.rom.tns`. Hay que copiar ambos archivos a la misma carpeta y abrir el programa. No se convierte el juego en código C equivalente. En la web, Mario 64 usa el emulador N64 genérico; el port específico europeo sigue siendo una opción del conversor de escritorio.

También se exporta un proyecto ZIP con las fuentes reales del emulador y la ROM como recurso comprobado por SHA-256. Se abre en la versión de escritorio para editar y recompilar C/C++. El paquete web no requiere ejecutar el SDK ni instalar la aplicación.

Los reproductores y sus proyectos sin cartuchos están en `assets/rom/`, con tamaños y hashes en `manifest.json`. Cada proyecto incluye sus licencias. Se construyen con `desktop/prepare-rom-web.cjs` en la rama `codex/rom-converter-web`. El validador web se genera a partir de `desktop/rom-data.cjs` con `scripts/build-rom-web-data.cjs`; los hashes del cartucho se calculan de forma asíncrona en el navegador. Los guardados del preview se conservan en el almacenamiento local del navegador.

Se probaron las seis familias en Chromium sin puente nativo: detección por cabecera, animación en cinco diagnósticos originales, arranque acotado sin imagen del diagnóstico N64, exportación del proyecto y del paquete. Los seis reproductores ARM cargaron los mismos cartuchos externos en el preview ejecutable. Estas pruebas no certifican partidas completas ni rendimiento físico.

Se prueban el arranque y las primeras pantallas, no partidas completas. Los cartuchos del usuario y las imágenes de juegos se mantienen fuera de Git y de las descargas públicas.

- SNES: 18 cartuchos distintos del paquete, incluidos Yoshi's Island, Zelda, Donkey Kong Country, Kirby, Star Fox, Chrono Trigger, Mario RPG y Contra III, produjeron cambios de imagen en 1.200 fotogramas. Contra III permitió corregir la detección de cabeceras antiguas cuyo título ocupa el byte de mapa.
- N64: 12 cartuchos completaron 1.200 intervalos acotados del intérprete. Mario 64, Pokémon Stadium, Star Fox 64 y Banjo-Kazooie mostraron imágenes variables. Otros solo mostraron pantallas iniciales; Paper Mario, F-Zero X y Wave Race quedaron negros en esta prueba. No se presentan como compatibles.
- GBA y DS: diagnósticos originales con animación y entrada. No se recibieron juegos comerciales GBA/DS para validarlos.
- SNES/GBA: mando y RAM de cartucho verificados. DS: táctil y restauración de guardado; N64: restauración de RAM de cartucho y Controller Pak.
- Los cuatro proyectos generados compilan con el SDK ARM. El TNS de DS lee un cartucho externo de 8 MiB y genera imagen en el preview ARM.

N64 y DS son experimentales. El rendimiento físico en una TI-Nspire CX II no se certifica con una prueba en PC. El preview directo ejecuta el emulador como WebAssembly; el preview del proyecto ejecuta su C/C++ compilado a ARM.

Fuentes: [PocketSNES](https://github.com/gameblabla/pocketsnes-nspire), [gpSP Nspire](https://github.com/andymcca/lr-gpsp-nspire), [Daedalus Nspire](https://github.com/Marckey2007/daedalus-nspire), [NooDS](https://github.com/Hydr8gon/NooDS). Revisiones y hashes fijados en desktop/rom/*-profile.json.
