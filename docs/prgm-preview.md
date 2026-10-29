# Preview de programas Prgm

Abre un documento TNS en Syntax Doctor, selecciona un bloque `Prgm` y pulsa
**Preview Prgm** junto a **Ejecutar sintaxis**. Se ejecuta una copia del código
actual del editor, incluidos los cambios que todavía no has guardado.

La pantalla simula 320 × 240 píxeles con barra de documento e historial de texto.
**Vista ampliada** ofrece un área de hasta 800 × 600, como Lua/LÖVE, y oculta la
barra de calculadora. La letra, las filas y el popup mantienen su tamaño; el texto
se distribuye usando el ancho disponible. No vuelve a ejecutar el programa ni
descarta lo escrito en la entrada. `Request` abre un cuadro dentro de la pantalla;
Enter acepta y Esc cancela esa entrada. Cancelar conserva el valor anterior de
la variable, si existe, y permite continuar como indica el manual de TI.

Controles: ejecutar/pausar, paso, detener, reiniciar/actualizar, desplazar salida,
copiar salida, ver variables y saltar a la línea actual o del error en el editor.
Cambiar RAD/DEG reinicia el programa. Reiniciar vuelve a leer el editor y descarta
las variables de la ejecución anterior. La salida anterior y su separador
«Hecho» se conservan en el historial de la sesión, como una nueva llamada en
la página Calculadora. Si ya hay una ejecución previa, el seguimiento de salida
deja visible su último resultado sobre la nueva llamada y coloca los menús
debajo del popup; después de responder se desplaza para mostrar la nueva salida.
**Limpiar historial** elimina esas ejecuciones anteriores sin cambiar el
programa activo ni lo escrito en un `Request`. Cerrar el preview termina esta
sesión de historial; no se guardan sus resultados fuera del panel.

## Cobertura inicial

- Programas sin parámetros: `Prgm`/`EndPrgm`, cabecera `Define nombre()=Prgm`.
- `Local`, `DelVar`, `Disp`, `DispAt`, `Request`, `RequestStr`.
- `If` de una instrucción o con `Then`, `ElseIf`, `Else`, `EndIf`.
- `For`, `While`, `Loop`, `Exit`, `Cycle`, `Lbl`, `Goto`, `Return`, `Stop`.
- Asignaciones `→` y `:=`, comentarios `©`, instrucciones separadas por `:`.
- Números reales, cadenas, concatenación, listas e índices desde 1, comparaciones
  y lógica; operadores TI como `−`, `·`, `√`, `π` y notación científica.
- `approx`, `string`, `sqrt`, trigonometría RAD/DEG, `abs`, `round`, `floor`,
  `ceiling`, `iPart`, `min`, `max`, `ln`, `log`, `exp`, `mod`, `remain`, `dim`,
  `left`, `right`, `mid` y factorial.

`ClrIO` no es una instrucción del catálogo TI-Nspire consultado. El preview lo
avisa y lo omite para conservar el historial, como en las capturas de referencia:
los menús y las respuestas anteriores siguen disponibles al desplazarse. Ante
el primer `Request`, el bloque de salida comienza en la columna izquierda del
popup, como en las capturas de la calculadora. En tamaño calculadora, una primera
ejecución corta se coloca al pie del área de salida, de modo que las opciones
del menú aparezcan debajo del popup incluso si el historial está vacío. No se
insertan resultados de ejecuciones inexistentes. Tras aceptar o cancelar esa
primera entrada, el historial pasa al margen izquierdo del documento y lo
conserva en las entradas siguientes. Una entrada inválida mantiene la posición
inicial; reiniciar restablece ese primer estado. La vista ampliada recalcula la
posición sin escalar la letra ni el popup. Se conserva el espacio de la barra
de desplazamiento y los mismos nodos del historial. La presentación de resultados usa seis
cifras significativas; los cálculos internos usan números JavaScript de doble
precisión.

No es un emulador completo: no calcula CAS simbólico, unidades físicas, matrices,
dibujos ni funciones externas o definiciones anidadas. Los casos no soportados,
las variables sin valor y errores numéricos se muestran con código y línea; no
se convierten a cero ni se saltan silenciosamente. Los bucles tienen un límite de
instrucciones y se ejecutan por lotes para poder detenerlos desde la interfaz.

## Automatización sin DOM

El mismo motor está expuesto en `src/api/index.js`:

```js
import {createPrgmPreview, runPrgmPreview} from './src/api/index.js';
const preview = createPrgmPreview(source, {name: 'phy'});
preview.run();                 // Avanza hasta un Request o el siguiente lote.
preview.answer('1');            // Evalúa una expresión como entrada.
preview.run();
preview.answer('', {cancel:true});
const snapshot = preview.snapshot();
```

CLI:

```bash
node cli/tns-tool.js prgm preview examples/physics-prgm.tib --inputs '[1,2,6,2,56,5,41]' --json
node cli/tns-tool.js prgm preview programa.tib --angle DEG --json
```

También admite `-` para stdin. La salida JSON contiene estado (`waiting`, `done`,
`error`, etc.), entrada pendiente, variables, salida, línea y avisos. Si se agotan
las entradas del array, devuelve el siguiente Request pendiente. Se puede enviar
`{"cancel":true}` en el array para cancelar una entrada. Un error usa código de
salida 4; argumentos inválidos, 2; archivo inaccesible, 3.

El ejemplo de física conserva el código proporcionado por el usuario. La ruta
`1 → 2 → 6 → 2 → 56 → 5 → 41` produce `(t)=0.70966 s`. Su línea
`6.67*e-11→constanteg` utiliza una variable `e`; no es equivalente a `6.67E-11`.
El preview no corrige esa expresión automáticamente.

Referencias primarias:
[Request y RequestStr](https://education.ti.com/html/webhelp/eg_tinspire/en/Subsystems/EG_RefGuide_CAS/Content/M_RefGuide/RG_alpha_R.HTML),
[Disp y DispAt](https://education.ti.com/html/webhelp/eg_tinspire/en/Subsystems/EG_RefGuide_CAS/Content/M_RefGuide/RG_alpha_D.HTML).
