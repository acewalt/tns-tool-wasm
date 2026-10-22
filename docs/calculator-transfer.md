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
8. **Capturar pantalla**: solicita una captura por el servicio RLE `0x4024`. Decodifica el formato clásico de 4 bits en escala de grises y el RLE RGB565 de 16 bits de modelos a color. Si recibe una respuesta completa, la reconstruye en un canvas y permite descargarla como PNG.

## Recuperación de comunicaciones CX II (21 de octubre de 2026)

Si el navegador muestra un error NNSE con una cabecera que contiene
`6c ce 54 fd 64 01 40 60` (archivos) o
`6d e1 54 fd 64 01 40 24` (captura), no significa necesariamente
que no detecte la calculadora. En pruebas con hardware se ha visto que
la lectura de directorios y la creación de carpetas llegan a funcionar,
pero que alguna respuesta posterior comienza en un límite de lectura USB
desalineado.

El receptor ahora recorre un búfer persistente, valida sumas de
verificación NNSE, reconoce el control NNSE compacto y solo admite
paquetes NavNet sin encapsular cuando verifica íntegramente sus
sumas de verificación y las direcciones de la respuesta. El barrido
está acotado a 8192 bytes para no aceptar silenciosamente datos
arbitrarios. Se añadieron pruebas con prefijos residuales, respuestas
partidas entre lecturas WebUSB, tramas dañadas y descargas en varios
bloques.

**Validación restante:** estas pruebas utilizan dispositivos simulados.
No se ha verificado el parche en una TI-Nspire CX II física conectada
desde Windows y Brave. Es recomendable comprobar primero lectura
de carpetas y descarga de un TNS pequeño, después descarga de un
TNS grande, y por último captura de pantalla. No uses WebTILP y esta
página simultáneamente sobre la misma calculadora.

## Árbol de carpetas y seguimiento de descargas

El administrador integrado ahora usa una vista jerárquica inspirada en
[ashif_6672 / Uiverse](https://uiverse.io/ashif_6672/nice-warthog-84)
adaptada a los temas propios de TNS Tool WASM.

- El directorio raíz se consulta al establecer conexión. Cada subcarpeta
  se consulta **solo cuando se despliega por primera vez**.
- Las subcarpetas cargadas se conservan en caché mientras permanezca abierta
  la sesión; al contraer y reabrir una rama no se repite la transferencia USB.
- La selección de archivos puede mantenerse entre carpetas abiertas, y la
  ruta mostrada indica dónde se crearán carpetas o se enviarán archivos.
- **Actualizar** vuelve a consultar el directorio elegido.
- Durante la recepción se muestran bytes recibidos, porcentaje, tiempo
  transcurrido y velocidad media. Los bytes completos del archivo se ofrecen
  inmediatamente al navegador para guardar el TNS, **antes de esperar** al
  comando de finalización del protocolo. La sesión USB sigue bloqueada
  durante **Finalizando y cerrando transferencia**; no desconectes el cable
  ni intentes otra operación mientras tanto.
- Los controles de selección y navegación quedan temporalmente bloqueados
  durante una operación USB, de modo que no cambie el archivo seleccionado
  mientras la calculadora completa la transferencia.

Esto elimina consultas innecesarias al volver a desplegar carpetas, pero
**no demuestra todavía una aceleración de la transferencia USB real**.
La velocidad depende del número y tamaño de los paquetes que envíe el
firmware CX II y de la latencia de los acuses de recibo NNSE.
Compara archivos pequeños y grandes para medir la velocidad en hardware.

## Recuperación de USB, pantalla y desplazamiento (22 de octubre de 2026)

- El árbol de documentos tiene **su propio desplazamiento vertical**. Su
  contenedor flex permite crecer en altura y desplazar los elementos anidados
  con la rueda del mouse, el panel táctil o el teclado.
- En CX II, después de recibir todos los bytes de un TNS o una captura,
  el protocolo puede tardar en confirmar el fin de la operación. El archivo
  y la imagen se ofrecen al navegador **antes** de esperar a esa confirmación.
- El cierre de descargas y capturas dispone de un límite de aproximadamente
  ocho segundos; cada operación de entrada USB dispone de un límite de
  doce segundos en condiciones normales. Si la calculadora no responde,
  **se invalida la sesión** y se solicita reconectar. No se inicia otra
  operación usando la conexión posiblemente desincronizada.
- La captura RLE ya no intenta descomprimir datos en cada paquete. Lee el
  tamaño comprimido anunciado, reúne los fragmentos y descomprime una sola
  vez; muestra el progreso de recepción y permite guardar PNG.
- Si falla la finalización después de que el archivo o la imagen se hayan
  entregado, se informa del resultado y de la necesidad de reconectar,
  en vez de mantener los botones permanentemente desactivados.

**Importante:** la nueva estrategia USB se ha probado con hardware simulado,
incluidos timeouts y capturas fragmentadas. Es necesario verificar en una
TI-Nspire CX II real tanto la captura de pantalla como la resincronización
después de una descarga; WebUSB no permite cancelar con AbortSignal una
lectura USB ya iniciada.

## Límites actuales

- El protocolo USB de TI-Nspire tiene variantes. Desde el 21-10-2026 se incorpora una implementación NNSE para CX II en USB configuración 1, que encapsula paquetes NavNet, gestiona petición de dirección, sincronización de hora, acuses NNSE y paquetes de datos. **Solo se ha validado mediante pruebas USB simuladas; sigue pendiente una validación física en Windows, Chrome/Brave y calculadora TI-Nspire CX II.**
- La captura RLE decodifica tanto 4 bits por píxel como RGB565 de 16 bits. Los modelos CX/CX II pueden usar variantes que requieren pruebas físicas adicionales; si el firmware no responde con un formato esperado, se informa el error sin mostrar una captura ficticia.
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
