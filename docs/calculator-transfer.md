# Administrador TI-Nspire nativo de TNS Tool WASM

**Ubicación:** File / Archivo → Save / Guardar → Transferir a calculadora.

## Funcionamiento

Este módulo es parte del código de TNS Tool WASM. **No incrusta WebTILP, no abre otra web y no utiliza un puente Python**. Los controladores `ti-nspire-webusb.js` y `ti-nspire-nnse.js` conversan directamente con calculadoras TI-Nspire por medio de la API WebUSB del navegador. La TI-Nspire CX II usa tramas NNSE (NavNet SE) en la configuración USB 1; las generaciones anteriores conservan NavNet sin ese encapsulado. La interfaz es `ti-calculator-transfer.js`, con estilos propios en `ti-calculator-transfer.css`.

El protocolo empleado se documenta públicamente en [Hackspire: USB Protocol](https://www.hackspire.org/USB_Protocol/). La implementación propia incluye acuses de recepción, verificaciones de integridad (CRC), conexión y desconexión de servicios, lectura de directorios, recepción y envío de TNS, creación y borrado de carpetas y captura RLE.

## Requisitos

- Chrome, Brave o Edge de escritorio con soporte WebUSB.
- Página HTTPS, como [TNS Tool WASM](https://acewalt.github.io/tns-tool-wasm/).
- Cable USB de **datos**; calculadora encendida y sin otro programa que esté usando el puerto.
- Controlador USB compatible. En Windows, algunos modelos TI pueden estar vinculados al controlador de TI o a otro programa y WebUSB no podrá reclamar su interfaz. Cambiar drivers sin comprobar compatibilidad puede dejar inoperante el software oficial hasta restaurarlos.

Se filtran los dispositivos Texas Instruments con identificadores `0451:e012` (familia clásica/CX) y `0451:e022` (familia CX II). **La selección USB no implica conexión**: la aplicación solo marca “Conectada” si completó el protocolo y leyó el directorio raíz.

## Acciones implementadas

1. **Conectar calculadora**: solicita permiso WebUSB y establece una sesión TI-Nspire real. No muestra archivos artificiales.
2. **Actualizar / carpetas**: consulta directorios reales y permite entrar o regresar.
3. **Enviar TNS**: elige uno o varios documentos `.tns` del ordenador, confirma reemplazos y los transmite a la carpeta abierta.
4. **Enviar TNS actual**: construye el documento activo usando el generador existente y lo transfiere directamente, sin descargar y volver a seleccionar el archivo. El generador experimental debe estar cargado.
5. **Recibir seleccionados**: lee archivos de la calculadora y los descarga al ordenador.
6. **Nueva carpeta**: solicita un nombre y envía el comando de creación.
7. **Eliminar seleccionados**: pide confirmación. **Importante:** eliminar una carpeta puede borrar también su contenido; se muestra una segunda confirmación.
8. **Capturar pantalla**: intenta la función de captura mediante el servicio RLE `0x4024`, limitado a imágenes de escala de grises de 4 bits. Si se recibe una imagen válida, la reconstruye en un canvas y permite descargarla como PNG.

## Límites actuales

- El protocolo USB de TI-Nspire tiene variantes. Desde el 21-10-2026 se incorpora una implementación NNSE para CX II en USB configuración 1, que encapsula paquetes NavNet, gestiona petición de dirección, sincronización de hora, acuses NNSE y paquetes de datos. **Solo se ha validado mediante pruebas USB simuladas; sigue pendiente una validación física en Windows, Chrome/Brave y calculadora TI-Nspire CX II.**
- La captura RLE implementada solo decodifica 4 bits por píxel. Algunas generaciones CX/CX II tienen pantallas de color de 16 bits y pueden usar otro formato o servicio. En esos casos se informa que la captura no es compatible: no se muestra ninguna captura falsa.
- No se han implementado instalación de SO, restauraciones ni acciones que modifiquen firmware.
- Las transferencias quedan restringidas a documentos `.tns` para no corromper formatos ajenos.
- Una lectura o escritura interrumpida puede dejar un documento incompleto en la calculadora. No retires el cable mientras haya actividad.
- No está probado con el hardware del usuario; las pruebas automáticas usan paquetes y dispositivos USB simulados y **no equivalen a una prueba real**.

## Estructura técnica

- `ti-nspire-nnse.js` — protocolo de transporte NNSE para la TI-Nspire CX II y pruebas de integridad de trama.
- `ti-nspire-webusb.js` — controlador WebUSB, NavNet clásico y comandos de archivo.
- `ti-calculator-transfer.js` — explorador, botones, progreso, selección y generación del documento.
- `ti-calculator-transfer.css` — diseño del módulo.
- `tests/calculator-transfer-ui.test.js` — validaciones del protocolo NavNet clásico con respuestas sintéticas.
- `tests/nnse-transport.test.js` — validaciones de tramas y handshakes NNSE, listado, envío, descarga, borrado y datos RLE con hardware simulado.

Los scripts históricos `tools/calculator-transfer/bridge.py` y su prueba Python permanecen por compatibilidad del repositorio, **pero el módulo de la página ya no los utiliza**.
