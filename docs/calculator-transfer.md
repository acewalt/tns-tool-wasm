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

## Captura nativa y cierre de sesión CX II (22 de octubre de 2026)

La captura obtenida de la TI-Nspire CX II se representa en el canvas con sus
dimensiones nativas de **320 × 240 píxeles** (o las dimensiones reales
reportadas por otro modelo), en una zona lateral más amplia. La vista previa
no aplica escalado automático; en pantallas estrechas es desplazable. Debajo
se indica la resolución exacta.

Después de recibir correctamente la captura, la sesión NNSE envía un mensaje
de desconexión de servicio **sin esperar a un ACK terminal** que determinados
firmwares omiten. Los paquetes tardíos se procesan o descartan según el
número de secuencia al iniciar una nueva operación; esta última todavía debe
recibir sus propias respuestas válidas. De este modo una captura correcta
no debería forzar por sí sola una reconexión. Las operaciones restantes
mantienen sus comprobaciones normales.

La modificación incluye una prueba que simula ausencia del ACK de
desconexión tras la captura, seguida por una consulta realista del directorio.
**Pendiente:** verificar el comportamiento con una TI-Nspire CX II física;
la simulación no demuestra compatibilidad con todas las versiones de
firmware.

## Acciones individuales por elemento (22 de octubre de 2026)

Cada fila de archivo y carpeta muestra, al pasar el mouse o al recibir
el foco del teclado, tres botones con sus títulos accesibles:
**⬇️ Descargar**, **✏️ Renombrar** y **🗑️ Eliminar**. En dispositivos
táctiles aparecen siempre. Los botones principales de nueva carpeta,
descarga y eliminación también muestran un icono.

- **Archivo:** Descargar recibe únicamente ese documento TNS y mantiene
  el guardado temprano antes del cierre del servicio. Renombrar envía el
  comando TI-Nspire `0x21 0x01` con las rutas origen y destino; solo
  actualiza la vista al recibir respuesta `FF 00`. Eliminar utiliza
  el comando existente para archivos, con confirmación.
- **Carpeta:** Descargar recorre sus subcarpetas y genera un ZIP sin
  recomprimir los documentos. La exportación admite como máximo
  300 documentos, 64 MiB y 16 niveles, para proteger la memoria y evitar
  sesiones USB desproporcionadas. El nombre y la estructura de las
  carpetas se conservan, incluidas las carpetas vacías.
  Renombrar intenta el comando nativo `0x21` con la ruta completa; si
  el firmware no lo admite, se informa el rechazo, sin copiar ni borrar
  ningún elemento. Eliminar requiere una confirmación individual y está
  sujeto a las reglas de eliminación de carpetas del firmware.
- **Seguridad:** se impide renombrar la raíz, cambiar de carpeta durante
  un renombrado o sustituir un nombre ya existente en el directorio
  mostrado. Los documentos `.tns` mantienen su extensión.

**Validación pendiente:** las operaciones nuevas pasan pruebas de
transporte simulado y de interfaz, pero se deben comprobar con la
calculadora física antes de confiar en el renombrado de directorios
según la versión del firmware.

## Vistas y estado de conexión (octubre de 2026)

- El botón **Conectar calculadora** aparece únicamente cuando no hay una
  conexión USB confirmada. Después de conectar, desaparece y queda disponible
  **Desconectar**; si falla o se pierde la conexión, se restablece **Conectar**.
- El selector de **Lista / Cuadrícula** cambia solo la presentación del mismo
  explorador USB. Lista mantiene su árbol de carpetas anidadas; cuadrícula
  muestra tarjetas para las entradas de la carpeta actual, con iconos SVG,
  selección múltiple y las mismas acciones de descarga, renombrado y borrado.
- En cuadrícula, pulsar una carpeta accede a ella (con lectura USB diferida),
  y **↑** regresa al directorio superior. Pulsar un archivo alterna su
  selección. Las carpetas previamente cargadas se obtienen desde caché.
- La selección de elementos se conserva al cambiar entre las dos vistas.
  La vista elegida se guarda en el almacenamiento local del navegador y
  se restaura al volver a abrir el administrador; no cambia ningún archivo
  ni carpeta de la calculadora.

## Selector de destino para enviar documentos

Ambos botones **Send TNS** (archivos locales) y **Send current TNS**
(documento abierto en el editor) muestran primero un selector de carpetas
de la TI-Nspire. Se inicia en el directorio que está activo en el
explorador, pero navegar dentro del selector **no cambia** esa ruta ni
la vista de lista/cuadrícula.

- El selector solo muestra carpetas, lee subcarpetas del dispositivo
  cuando hace falta y permite ir al nivel superior o a la raíz.
- **Enviar aquí** confirma la ruta visible; **Cancelar**, Escape o un
  clic fuera del selector abortan sin escribir datos en la calculadora.
- La carpeta debe haberse consultado correctamente antes de poder confirmar.
  El destino final se vuelve a leer por USB antes de iniciar el envío.
- Si ya existe un nombre igual en el destino, el usuario debe confirmar
  la sustitución. Esta verificación utiliza la carpeta seleccionada,
  no la carpeta que se estaba examinando al abrir el selector.
- Los archivos enviados actualizan la caché de su carpeta de destino;
  el explorador principal sigue en la misma ubicación y vista.

El selector no requiere servicios externos. Las pruebas automáticas
verifican navegación anidada, cancelación, detección de sobrescrituras
y ambos botones con un dispositivo simulado. La validación física
sigue dependiendo de una TI-Nspire conectada.

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

## Crear una carpeta al enviar

En «Elegir carpeta de destino», pulsa «Nueva carpeta», escribe el nombre y
confirma «Crear carpeta». La aplicación espera la confirmación de la calculadora,
actualiza la lista y entra en la nueva carpeta. Pulsa «Enviar aquí» para transferir
el TNS. Crear una carpeta por sí solo no envía el archivo. Se rechazan nombres
inválidos y nombres que ya aparecen en la carpeta actual.

## Sesión y capturas consecutivas (27-10-2026)

- Cerrar el administrador oculta la ventana y conserva la conexión, carpeta,
  selección e imagen. Al reabrirlo no vuelve a negociar USB. «Desconectar» sí
  libera el dispositivo.
- La captura tiene un plazo total de 15 segundos; su cierre de servicio tiene
  un presupuesto de 1,5 segundos. Un fallo libera los controles y conserva la
  última captura válida.
- Antes de habilitar «Conectar», se espera el cierre del handle anterior. Un
  reintento reutiliza el dispositivo autorizado y no exige retirar el cable.
  No se reintentan automáticamente escrituras ni borrados.
- Se filtran respuestas atrasadas por servicio y sesión, no solo por destino.
- Las pruebas incluyen cinco capturas consecutivas, mensajes de otro servicio,
  un dispositivo silencioso, cierre de servicio bloqueado y la carrera entre
  liberar/reabrir USB. Electron comprueba además tres capturas RGB565 y la
  reapertura del panel con una calculadora simulada.

### Capturar una aplicación nativa Ndless

El [cargador de Ndless](https://github.com/ndless-nspire/Ndless/blob/master/ndless/src/resources/ploaderhook.c)
desactiva las interrupciones antes de llamar al programa y las restaura después.
Por ello una aplicación nativa puede suspender el servicio USB de captura del
sistema mientras está abierta. Un cambio en la web no habilita por sí solo ese
servicio dentro del programa. Si no responde, salir del ejemplo con Esc y pulsar
«Conectar» permite reintentar desde el sistema, dejando el cable conectado. Para
capturar la imagen nativa en ese caso se necesita soporte dentro de la propia
aplicación (por ejemplo guardar su superficie SDL), que no implementa este módulo.

El usuario confirmó que el nuevo ejemplo SDL permanece abierto en su CX II CAS
con SO 6.2.0.333 y Ndless activo. La recuperación y las capturas consecutivas de
esta revisión aún requieren comprobación física; las pruebas automatizadas no
equivalen a esa comprobación.
