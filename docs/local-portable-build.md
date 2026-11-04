# Compilar el portable de Windows en tu PC

`COMPILAR_PORTABLE_WINDOWS.bat` aplica un ZIP de cambios al repositorio y construye allí el portable de Windows x64. No necesita GitHub Actions para compilar.

Ejecútalo desde la raíz de la copia que incluye el proyecto Electron de Windows. El BAT verifica que existan `desktop:build:win`, Electron, `electron-builder` y sus archivos de entrada; si abriste la rama web-only, se detiene antes de instalar dependencias o modificarla.

## Para cada actualización

1. Extrae una vez el ZIP de este flujo dentro de la carpeta del repositorio. Conserva la estructura de carpetas.
2. Guarda el ZIP de cambios que te entregue ChatGPT en cualquier carpeta.
3. Ejecuta `COMPILAR_PORTABLE_WINDOWS.bat`. Elige el ZIP de cambios en la ventana que aparece; también puedes arrastrar su ruta como primer argumento.
4. El BAT hace una copia de seguridad de los archivos que va a reemplazar, aplica el ZIP y compila usando el código local. Si las dependencias aún no existen, las instala y obtiene los recursos de la última Release **portable** pública; las Releases del compilador no se usan como base.
5. En `release/local-publish` quedan `TNS-Tool-Portable-Windows-x64.zip`, su archivo SHA256 y una nota con la versión y el commit. El ejecutable real está dentro del ZIP y también en `release/portable/win-unpacked/TNS Tool Portable.exe`.
6. Sube el ZIP y el SHA256 a una GitHub Release etiquetada `tns-tool-portable-v<VERSION>` y márcala como la última. Primero publica en GitHub el mismo código fuente y confirma que el número de `package.json` no reutilice un tag antiguo.

El ZIP público contiene la carpeta portable completa, con `TNS Tool Portable.exe`, `resources`, DLL y SDK. No publiques solamente el EXE: necesita los archivos que lo acompañan. Se mantiene el formato portable extraíble para conservar el inicio rápido.

## Requisitos y primera compilación

- Windows x64.
- Node.js 22 o superior, con `npm`.
- Para una copia nueva, el BAT selecciona una Release `tns-tool-portable-v<VERSION>` que contenga el ZIP de Windows, comprueba su SHA256 y descarga una sola vez los recursos. Usa el digest de GitHub o el archivo `.sha256.txt` de esa Release. Si ya tienes una carpeta portable extraída, puedes evitar esa descarga pasando la ruta del ZIP o de la carpeta como segundo argumento:

```bat
COMPILAR_PORTABLE_WINDOWS.bat "C:\Actualizaciones\cambios.zip" "D:\Apps\TNS-Tool-Portable"
```

Si no pasas el primer argumento, el BAT abre el selector de ZIP. Si no tienes cambios que aplicar, cancélalo y compilará el código actual. Los recursos descargados se completan dentro de `desktop/vendor`; el script conserva los archivos que ya existen.

El workflow de empaquetado de Windows solo admite ejecución manual (`workflow_dispatch`); los cambios de código y los pull requests ya no disparan la compilación larga. `desktop-source-checks.yml` conserva las comprobaciones rápidas. El flujo habitual es producir el paquete en tu PC y subir el ZIP y su checksum a la Release. Si aplicas un ZIP antiguo que reactiva los disparadores automáticos, el BAT los desactiva de nuevo y guarda una copia del YAML anterior en `release/local-update-backups`.

Para compilar el código de la carpeta desde PowerShell sin abrir el selector ni el Explorador:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\desktop\build-portable-local.ps1 -SkipUpdate -NoOpenOutput -SeedPortablePath "D:\Apps\TNS-Tool-Portable"
```

El helper se guarda con codificación compatible con Windows PowerShell 5.1. El cálculo del SHA256 usa .NET, por lo que no depende de que `Get-FileHash` esté disponible.
