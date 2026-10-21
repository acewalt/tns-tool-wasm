# Transferir a calculadora (TI-Nspire)

## Estado de la integración

El menú **File → Save → Transferir a calculadora** abre un gestor con exploración de USB, archivos/carpetas, subida y descarga de documentos TNS, y una sección para capturas.

**La detección WebUSB no es una sesión de archivos.** Chrome/Brave pueden reconocer una TI-Nspire con los identificadores USB de Texas Instruments (`0451:e012` y `0451:e022`), pero leer el sistema de archivos y enviar datos exige el protocolo USB del dispositivo.

Para explorar directorios y transferir documentos desde TNS Tool WASM se incluye un **puente local opcional**. No se envían los archivos a servidores de terceros: el puente escucha solamente en `127.0.0.1:8765` y valida el origen de las solicitudes. El sitio público continúa ejecutándose en GitHub Pages.

## Requisitos del puente local

- Python 3 y PyUSB / libusb instalados.
- Un clon local separado de [TI-Nspire Python Link](https://github.com/depaolaluigi123/TI-Nspire-Python-Link), proyecto de Luigi De Paola con licencia GPL-3.0. **No se incluye ni copia su implementación dentro de este repositorio**.
- Cable USB de datos, calculadora encendida y controladores/permisos USB compatibles.
- Navegador que permita conexiones de una página HTTPS hacia `127.0.0.1`. En algunas versiones puede aparecer un permiso de acceso a la red local.

### Configurar (Windows PowerShell)

```powershell
py -m pip install pyusb
git clone https://github.com/depaolaluigi123/TI-Nspire-Python-Link.git
py tools/calculator-transfer/bridge.py --link-repo .\TI-Nspire-Python-Link
```

Ejecuta el último comando desde el directorio de este repositorio. Si el repositorio de Python Link se clonó en otra carpeta, usa su ruta absoluta con `--link-repo`. PyUSB necesita también un backend **libusb** instalado; `pip install pyusb` por sí solo podría no ser suficiente.

**Atención (Windows):** algunas calculadoras y controladores requieren una interfaz WinUSB/libusb para acceso directo. Cambiar el controlador de TI a WinUSB puede impedir temporalmente que otras aplicaciones TI se comuniquen. No cambies controladores sin verificar el modelo y hacer una copia de seguridad. Cierra otras aplicaciones que estén utilizando la calculadora.

### Uso

1. Conecta y enciende la calculadora mediante el cable USB.
2. Inicia el puente local en tu ordenador.
3. Abre TNS Tool WASM, entra en **File → Save → Transferir a calculadora**.
4. Pulsa **Buscar puente local**. Aparecerán únicamente las calculadoras detectadas de verdad.
5. Selecciona una calculadora y espera a la conexión.
6. Navega por las carpetas, descarga archivos o sube un `.tns` mediante **Enviar .tns**. La opción **Enviar documento actual** compila el documento abierto antes de transferirlo (cuando está disponible el generador).
7. Para crear una carpeta usa **Nueva carpeta**. Confirma antes de reemplazar un archivo existente.

El botón **Detectar USB** usa WebUSB para obtener autorización y reconocer un dispositivo; esto **no** sustituye al puente para abrir carpetas. Si el puente no está instalado, el módulo muestra el motivo en lugar de simular una estructura de directorios.

## Captura de pantalla

La primera versión del puente utiliza la API de TI-Nspire Python Link, que proporciona operaciones de archivos pero **no captura de pantalla**. Por ello el botón de captura permanece deshabilitado, y no se muestra ninguna imagen ficticia.

Para **TI-Nspire CX II/CX II CAS**, [TI-Nspire CX II Connect](https://nspireconnect.ti.com/) de Texas Instruments puede capturar la pantalla y transferir documentos. Requiere un navegador y sistema compatibles según TI. Para modelos clásicos, consulta TI-Nspire Computer Link u otras herramientas compatibles; no todas admiten CX II.

Una implementación futura de captura real puede conectar un backend compatible a `GET /api/screenshot` y cambiar `capabilities.screenshot` a `true`, una vez validada con hardware. No se debe habilitar esa bandera sin disponer de una imagen real del dispositivo.

## API del puente

- `GET /api/health`: estado de conexión y capacidades reales.
- `GET /api/devices`: dispositivos TI-Nspire enumerados.
- `POST /api/connect`: seleccionar `bus_number` y `address`.
- `GET /api/files?path=...`: listar archivos y directorios reales.
- `GET /api/download?path=...`: descargar bytes reales.
- `POST /api/upload`: escribir un `.tns` real (máximo 12 MiB).
- `POST /api/mkdir`: crear directorio.

El puente está restringido al host loopback, verifica los orígenes de navegador aceptados y rechaza rutas relativas, nombres que incluyan separadores de carpetas, cuerpos demasiado grandes y cargas distintas de `.tns`. Requiere autorización USB del sistema operativo.

**Limitaciones:** pruebas de hardware aún pendientes; comportamiento dependiente del modelo/controlador; no se admite cambiar nombres, borrar archivos, hacer respaldo integral, capturar la pantalla, ni transferir un sistema operativo desde este módulo.
