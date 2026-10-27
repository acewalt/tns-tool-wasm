# Pruebas de juegos del preview Ndless — 0.1.12

Se compila código ARM real con el SDK incluido y se ejecuta el mismo Worker
usado en Electron. Las comprobaciones inspeccionan los píxeles del framebuffer,
envían teclas y verifican cambios de estado. No se dibujan capturas prefabricadas
ni se interpreta el texto del programa para simular su resultado.

## Juegos públicos

| Proyecto | Fuente fijada | Resultado local |
| --- | --- | --- |
| [nDoom](https://github.com/critor/ndoom/tree/deca0127ec83d1401d62cee380e5f35a93ad1863) | deca0127ec83d1401d62cee380e5f35a93ad1863 | Mapa 3D, paleta, giro y disparos. Munición 50 → 46 en la captura revisada. |
| [NesNspire](https://github.com/mihkeymouse/NesNspire/tree/b7b6e48c6e5229eada88deccffebdb21518e4fbd) | b7b6e48c6e5229eada88deccffebdb21518e4fbd | Explorador, cartucho NROM original animado, respuesta al mando, salida normal y log de carga. |
| [Mario 64 para Ndless](https://github.com/rayzerbrain/sm64-nsp/blob/860d324ad5155c1a9519fea84327adc56da1fd64/INSTALLING.md) | 860d324ad5155c1a9519fea84327adc56da1fd64 | Se revisó la construcción; no se ejecutó. Necesita una ROM original para extraer recursos. No se afirma compatibilidad. |

nDoom usa [Freedoom 0.13.0](https://github.com/freedoom/freedoom/releases/tag/v0.13.0),
sin descargar un WAD comercial. SHA256 del ZIP:
`3f9b264f3e3ce503b4fb7f6bdcb1f419d93c7b546f4df3e874dd878db9688f59`.
SHA256 de `freedoom1.wad`:
`7323bcc168c5a45ff10749b339960e98314740a734c30d4b9f3337001f9e703d`.

Las fuentes antiguas requieren adaptaciones explícitas para el compilador actual:
nDoom usa OLD_SCREEN_API, diagnósticos compatibles con C antiguo y atributos
`common` en símbolos globales. NesNspire incorpora strings.h y cambia a `.inc`
los mappers incluidos para evitar compilarlos por duplicado. El script conserva
los clones intactos y aplica estas adaptaciones a las copias de compilación.
No se modifican las reglas de los juegos.

En la ejecución local registrada, NesNspire produjo 7 imágenes distintas en
1,36 s; nDoom llegó al primer mapa en 41,8 s y completó la prueba en 57,9 s,
con 90 imágenes distintas. Son tiempos de esta prueba, sin garantía de FPS ni
velocidad equivalente a la calculadora. Se ensayó una secuencia concreta, no
una partida completa ni todos los mappers o cartuchos NES.

## Seis juegos originales

`examples/ndless-games` contiene plataformas, raycaster 3D, Pong, Snake, bloques
y sprites. Se verifican por separado movimientos, saltos, colisiones, cambios
del mando, rotación/apilado y carga de BMP con 64–256 sprites. El plataformas
es original; no es Mario. Los proyectos se exportan con:

```
node tools/package-ndless-games.cjs
```

El ZIP resultante contiene seis proyectos importables, el BMP y las instrucciones.

## Regresiones cubiertas

La suite nativa local pasa 29 escenarios: los seis juegos, siete formatos LCD,
una paleta CX, archivos/directorios/guardados y catorce casos de C/C++/ARM,
animación, memoria, errores, Thumb y bucle infinito. Node cuenta además tres
grupos contenedores, por lo que muestra 32 pruebas aprobadas.

Los fallos encontrados incluyeron: ABI incorrecta de lcd_blit, registro LCD CX
equivocado, ON permanentemente pulsado, errno sin puntero, revisión virtual
antigua, chdir con retorno incorrecto, pérdida del modo Thumb y lectura de
cadenas que cruzaba el límite de una página válida. Ahora tienen cobertura
reproducible. Se elimina el framebuffer anterior ante un puntero inválido.

La aceptación de Electron también comprueba edición real, descarte del compilado
anterior, errores y recuperación, teclado, pausa, cierre, recursos, argumentos
entre comillas y limpieza. GitHub Actions exige aprobar las pruebas nativas,
ambos juegos públicos y la app extraída del ZIP antes de publicar el portable.

El entorno sigue siendo parcial: no emula el SO completo ni todos sus periféricos.
Pasar estas pruebas no certifica cualquier juego ni sustituye probar el TNS en
una calculadora física.
