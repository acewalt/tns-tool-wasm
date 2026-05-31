# TNS Tool WASM/Web

Primer scaffold web para portar TNS Tool al navegador con Pyodide/WebAssembly.

## Que incluye

- Carga los modulos Python actuales dentro de Pyodide.
- Carga `pycryptodome` desde el repositorio oficial de Pyodide.
- Permite decodificar `.tns` normal a un ZIP con XML.
- Permite crear `.tns` normal desde una carpeta XML.
- Permite crear Python Program `.tns` desde codigo Python y plantilla.
- Permite extraer `q.py` desde un Python Program `.tns`.
- Incluye un analizador basico para Python usando el mismo `PythonSyntaxAnalyzer`.
- Organiza la app en modulos desplegables:
  - `TNS normal`
  - `Python Program`
  - `Syntax Doctor XML`
- Tiene selector de idioma con banderas `ES`, `EN`, `FR` en la cabecera. La seleccion se guarda en `localStorage`.
- Incluye una primera recreacion web de `Syntax Doctor XML`:
  - abrir XML individual o carpeta `.tns.xml`
  - listar programas detectados
  - previsualizar codigo en formato humano
  - ejecutar sintaxis
  - aplicar Auto Fix
  - mostrar cambios
  - resolver variables no declaradas con sugerencias, declaracion nueva o ignorar
  - marcar lineas con errores/advertencias usando puntos rojos/amarillos
  - resaltado visual del codigo:
    - comandos/palabras clave en azul
    - strings en verde oscuro
    - flecha, `&` y `·` fuera de strings en rojo
    - variables locales en negro cursiva
  - incrustar en XML y descargar ZIP resultante
  - desplegar/ocultar el modulo desde un boton principal
- Incluye una primera recreacion web de `Syntax Doctor PY` dentro de `Python Program`:
  - desplegar/ocultar desde boton
  - ejecutar sintaxis con el core compartido
  - Auto Fix
  - mostrar cambios
  - guardar de vuelta al bloque inline
  - descargar `.py`
  - resaltado Python estilo TI-Nspire:
    - keywords en azul
    - strings en verde claro
    - operadores `=`, `==`, `+`, `-`, `/`, `*`, `.` en rojo
    - variables, funciones, numeros y delimitadores en negro regular

## Como probar

Desde la raiz del proyecto:

```powershell
python -m http.server 8000
```

Luego abre:

```text
http://localhost:8000/wasm_web/
```

No lo abras con doble click como `file://`, porque el navegador bloquea `fetch()` para cargar los modulos Python.

## Limitaciones

- Tkinter no existe en WASM/browser; la GUI debe rehacerse en HTML/CSS/JS.
- El navegador no puede escribir directamente en rutas de Windows. Todo se maneja con subida/descarga de archivos.
- El editor XML visual y los modales avanzados se deben portar pantalla por pantalla.
- `Syntax Doctor XML` web ya existe con el flujo funcional principal del escritorio. Todavia se puede mejorar el resaltado de sintaxis fino con una capa visual sobre el editor.
- Esta base usa CDN para Pyodide y JSZip; para una version offline hay que copiar esos assets localmente.

## Siguiente fase recomendada

1. Separar definitivamente `core` de `gui`.
2. Crear endpoints/funciones de motor sin `Path` obligatorio, preferiblemente `bytes -> bytes`.
3. Rehacer `Syntax Doctor XML` y `Syntax Doctor PY` como componentes web.
4. Empaquetar una PWA offline.
