# Transferir a calculadora en TNS Tool WASM

## Integración WebTILP (modo recomendado)

**File → Save → Transferir a calculadora** abre un panel con WebTILP, el gestor USB real de [TILP para navegador](https://web.tilp.info/). El motor USB, la lectura de archivos, las carpetas y las capturas pertenecen al proyecto [tilibs](https://github.com/adriweb/tilibs), no a una implementación USB nueva en TNS Tool WASM.

WebTILP ejecuta código compilado a WebAssembly y utiliza WebUSB; **no necesita un servidor puente Python local**. Esta integración no contiene ni redistribuye el código GPLv2 de WebTILP: intenta mostrar la página oficial en un marco web y proporciona el enlace directo a la aplicación original.

### Conectar la calculadora

1. Conecta y enciende la calculadora TI-Nspire mediante un cable USB de datos.
2. Abre la opción **Transferir a calculadora** del menú File → Save.
3. Haz clic en **Connect Calculator** dentro de WebTILP y selecciona tu modelo cuando el navegador solicite permiso.
4. Usa **Refresh List** en **Calculator Variables** para cargar los directorios y los archivos *reales* del dispositivo.
5. Selecciona archivos para recibirlos, envíalos con **Send Selected Files**, crea carpetas con **New Folder** o usa **Take Screenshot** en WebTILP.

**Compatibilidad:** Windows con Chrome, Brave o Edge y WebUSB. Las funciones disponibles dependen del modelo y del soporte en WebTILP. En julio de 2026, WebTILP incorporó soporte para TI-Nspire CX II mediante el protocolo NNSE también en Windows.

### Si el gestor integrado no abre o no conecta

Algunos navegadores o la configuración del servidor de WebTILP pueden impedir el acceso WebUSB dentro de un iframe de otro dominio. La opción **Abrir WebTILP en otra pestaña** abre directamente el sitio original en primer plano; allí la solicitud de permisos y las transferencias se gestionan directamente por WebTILP, sin depender del iframe ni del puente Python.

No confundas la carga de la ventana de WebTILP con la conexión de la calculadora: solo WebTILP puede confirmar que ha logrado conectarse.

### Enviar el documento que estás editando

1. Desde el panel pulsa **Preparar TNS actual**. Se guarda el `.tns` construido a partir del documento abierto.
2. Dentro de WebTILP pulsa **Send Selected Files** y selecciona el `.tns` recién generado desde Descargas.
3. Elige la ubicación y confirma la transferencia desde WebTILP.

El navegador **no permite entregar automáticamente los bytes a WebTILP en otro dominio** sin una interfaz pública de importación ofrecida por el propio WebTILP. Por eso preparar el archivo y seleccionarlo en WebTILP son operaciones distintas. No se anuncia una transferencia completada hasta que WebTILP la confirme.

### Capturas de pantalla

En WebTILP utiliza **Take Screenshot**, y luego **Download PNG**. Su funcionamiento depende del hardware compatible y de que la conexión USB esté activa. La página de TNS Tool WASM no genera ni muestra capturas simuladas.

### Licencias y atribución

WebTILP, desarrollado por Adriweb y otros colaboradores, es software libre bajo GPLv2. Su fuente se publica dentro del proyecto [tilibs](https://github.com/adriweb/tilibs); su uso en esta integración se realiza a través de su página pública, sin copiar sus binarios o su código a este repositorio.

## Puente USB Python (alternativo, experimental)

La versión anterior de la integración exigía un servidor en `127.0.0.1:8765`. Ese método **ya no es necesario para el flujo WebTILP**. Su implementación permanece para pruebas específicas de protocolos, pero no es el modo por defecto.

Para utilizarlo manualmente en pruebas:

```powershell
py -m pip install pyusb
git clone https://github.com/depaolaluigi123/TI-Nspire-Python-Link.git
py tools/calculator-transfer/bridge.py --link-repo .\TI-Nspire-Python-Link
```

El puente requiere PyUSB, un backend libusb y permisos/controladores USB adecuados. No implementa capturas de pantalla y no debe confundirse con la integración WebTILP.
