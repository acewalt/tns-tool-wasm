$ErrorActionPreference = 'Stop'
$version = (Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Invalid portable version' }
$commit = (git rev-parse HEAD).Trim()
$tag = "tns-tool-portable-v$version"
$zip = (Resolve-Path "release/portable/TNS-Tool-Portable-$version-x64.zip").Path
$report = Get-Content (Join-Path $env:RUNNER_TEMP 'portable-smoke.json') -Raw | ConvertFrom-Json
if (!$report.ok -or $report.version -ne $version -or @($report.cases | Where-Object { $_.entry -ne 'visible-menu-click' }).Count) {
    throw 'A matching successful test of the public ZIP is required before publishing'
}
if (!$report.prgmPreview.ok -or !$report.browserPrgmPreview.ok) { throw 'Prgm preview desktop/browser acceptance is required' }
if (!$report.prgmPreview.stableHistory -or !$report.prgmPreview.expandedCanvas -or !$report.browserPrgmPreview.stableHistory -or !$report.browserPrgmPreview.expandedCanvas) { throw 'Prgm history and expanded canvas acceptance is required' }
if (!$report.ndlessPreview.ok -or !$report.ndlessPreview.immediateInvalidation -or !$report.ndlessPreview.keyboard -or !$report.ndlessPreview.pause -or !$report.ndlessPreview.sourceError -or !$report.ndlessPreview.infiniteLoopStopped) { throw 'Compiled Ndless live preview acceptance is required' }
if (!$report.ndlessPreview.resources -or !$report.ndlessPreview.quotedArguments -or !$report.ndlessPreview.clearResources) { throw 'Preview program resources and arguments acceptance is required' }
if (!$report.ndlessPreview.nativeDialog -or !$report.ndlessPreview.spritesWithoutBmp) { throw 'Native missing-resource dialog acceptance is required' }
if (!$report.ndlessPreview.binaryPreview -or !$report.ndlessPreview.binaryEdits -or !$report.ndlessPreview.binaryClose -or !$report.ndlessPreview.sourceProfile) { throw 'Edited TNS preview and explicit SDK source profile acceptance is required' }
$games = Get-Content (Join-Path $env:RUNNER_TEMP 'community-preview/report.json') -Raw | ConvertFrom-Json
if (!$games.ok -or @($games.results).Count -ne 2 -or !($games.results | Where-Object { $_.game -eq 'nDoom' -and $_.cameraChange -gt .15 -and $_.ammoHudChange -gt .003 }) -or !($games.results | Where-Object { $_.game -eq 'NesNspire' -and $_.controller -and $_.cleanExit })) { throw 'Both real community games must pass before publication' }
$stage = Join-Path $env:RUNNER_TEMP 'portable-release-assets'
New-Item -ItemType Directory -Force -Path $stage | Out-Null
$asset = Join-Path $stage 'TNS-Tool-Portable-Windows-x64.zip'
Copy-Item -LiteralPath $zip -Destination $asset
$hash = (Get-FileHash -LiteralPath $asset -Algorithm SHA256).Hash.ToLowerInvariant()
$checksum = Join-Path $stage 'TNS-Tool-Portable-Windows-x64.sha256.txt'
"$hash  TNS-Tool-Portable-Windows-x64.zip" | Set-Content -LiteralPath $checksum -Encoding utf8
$gamePack = (Resolve-Path 'release/preview-games/TNS-Preview-Games.zip').Path
$notes = Join-Path $stage 'notes.md'
@"
TNS Tool Portable **$version** para Windows x64.

Descarga **TNS-Tool-Portable-Windows-x64.zip**, extrae todo el archivo en una carpeta y abre **TNS Tool Portable.exe**. La versión aparece en el título de la ventana.

El SDK Ndless está incluido. Se prepara una vez al usar el compilador; no requiere descargar ni instalar herramientas adicionales.

Incluye Preview Prgm en Syntax Doctor: pantalla de 320×240, Request interactivo, vista ampliada, ejecución por pasos, variables y errores con línea. La ruta MRUA del ejemplo de física se verifica en escritorio y navegador. Es una simulación numérica parcial, sin CAS simbólico, unidades ni gráficos.

El historial conserva los menús y respuestas anteriores, con márgenes estables y popup centrado. La vista ampliada ofrece hasta 800×600 sin escalar la letra ni el cuadro de entrada, como el preview Lua/LÖVE.

El preview Ndless compila automáticamente la revisión actual de C/C++/ARM y ejecuta el programa en un Worker aislado. Muestra el framebuffer RGB565 real, animaciones, teclado y stdout separado. Al editar borra el resultado anterior, descarta compilados atrasados y permite pausar, reiniciar o detener. Las APIs de SO no soportadas muestran un error; no es un emulador completo de TI-Nspire.

Desde la versión 0.1.12 se corrige la ABI de callbacks LCD, formatos RGB555/565, escala de grises y paletas, el registro LCD de CX, la tecla ON, llamadas ARM condicionales/Thumb y archivos relativos. Permite cargar WAD, cartuchos de prueba, BMP y otros recursos, junto con argumentos del programa, para la sesión de preview.

Se compilaron fuentes públicas fijadas de nDoom y NesNspire: Doom con Freedoom cargó un mapa 3D, giró y disparó; NesNspire abrió un cartucho original animado, respondió al mando y salió normalmente. No incluye juegos comerciales ni promete velocidad de hardware real. Mario 64 se compiló localmente con una ROM europea aportada por el usuario y llegó a dibujar menús 3D. La ejecución es lenta y no se certifica una partida completa. No se incluyen su ROM, recursos extraídos ni ejecutable.

La versión 0.1.13 muestra los diálogos reales del programa Ndless y permite responder Abort / Continue cuando falta sprite.bmp. Se verifican recursos ausentes y dañados, retorno de tres botones, temporizadores SP804, esperas del SDK y despertar de idle al pulsar una tecla. La app extraída del ZIP prueba el caso de sprites sin BMP desde la interfaz.

La versión 0.1.14 añade Previsualizar dentro de Edit Ndless. Ejecuta la copia de trabajo del TNS, aplica sus cambios al reiniciar y detiene el programa al salir de la vista. Admite Zehn y PRG que contienen Zehn. También permite importar proyectos fuente grandes con una lista declarativa de archivos, includes y defines en .tnsproject.json, sin ejecutar comandos del ZIP. Se verifica la compilación de varias fuentes y una edición binaria que cambia la imagen ejecutada desde la interfaz del ZIP publicado.

Se verificaron seis juegos originales (plataformas, raycasting 3D, Pong, Snake, bloques y sprites BMP), además de gradientes y texto calculado, fractales con doble precisión, C++ con varios archivos y plantillas, animación, teclado, ensamblador ARM, miles de malloc/free, bucles y errores. La app extraída del ZIP también pasó edición real, invalidación inmediata, animación, pausa, recuperación y respuesta del editor durante un bucle infinito.

Este ZIP se extrajo y probó antes de publicarlo: creación de proyectos C/C++ mediante el botón visible del menú, editor, compilación ARM por IPC y pruebas de capturas USB simuladas. La recuperación USB aún requiere validación física en cada equipo.

También se adjunta TNS-Preview-Games.zip con seis proyectos de código fuente importables y un BMP original.

Código fuente: $commit

SHA256: $hash
"@ | Set-Content -LiteralPath $notes -Encoding utf8
$existing = gh release view $tag --repo $env:GITHUB_REPOSITORY --json targetCommitish 2>$null
if ($LASTEXITCODE -eq 0) {
    if (($existing | ConvertFrom-Json).targetCommitish -ne $commit) { throw 'This version already belongs to another commit; bump the version' }
    gh release upload $tag $asset $checksum $gamePack --repo $env:GITHUB_REPOSITORY --clobber
    if ($LASTEXITCODE -ne 0) { throw 'Release asset upload failed' }
    gh release edit $tag --repo $env:GITHUB_REPOSITORY --notes-file $notes --latest
} else {
    gh release create $tag $asset $checksum $gamePack --repo $env:GITHUB_REPOSITORY --target $commit --title "TNS Tool Portable $version" --notes-file $notes --latest
}
if ($LASTEXITCODE -ne 0) { throw 'Portable release publication failed' }
