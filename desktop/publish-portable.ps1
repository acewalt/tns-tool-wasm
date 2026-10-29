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
foreach ($manager in @($report.calculatorManager,$report.browserCalculatorManager)) {
    if (!$manager.ok -or !$manager.busyLabels -or !$manager.deviceStorage -or !$manager.dropUpload -or !$manager.nativeMove -or !$manager.collisionSafe -or $manager.webmBytes -lt 100 -or $manager.serialRequests -ne 1) { throw 'Calculator manager desktop/browser recording, drag/drop and storage acceptance is required' }
}
if (!$report.prgmPreview.stableHistory -or !$report.prgmPreview.expandedCanvas -or !$report.browserPrgmPreview.stableHistory -or !$report.browserPrgmPreview.expandedCanvas) { throw 'Prgm history and expanded canvas acceptance is required' }
if (!$report.prgmPreview.firstInputLayout -or !$report.browserPrgmPreview.firstInputLayout) { throw 'Prgm first Request and subsequent transcript layout acceptance is required' }
if (!$report.prgmPreview.historyAcrossRuns -or !$report.browserPrgmPreview.historyAcrossRuns) { throw 'Prgm previous-run history and vertical placement acceptance is required' }
if (!$report.prgmPreview.firstRunPlacement -or !$report.browserPrgmPreview.firstRunPlacement) { throw 'Prgm first execution placement on an empty calculator page is required' }
if (!$report.ndlessPreview.ok -or !$report.ndlessPreview.immediateInvalidation -or !$report.ndlessPreview.keyboard -or !$report.ndlessPreview.pause -or !$report.ndlessPreview.sourceError -or !$report.ndlessPreview.infiniteLoopStopped) { throw 'Compiled Ndless live preview acceptance is required' }
if (!$report.ndlessPreview.resources -or !$report.ndlessPreview.quotedArguments -or !$report.ndlessPreview.clearResources) { throw 'Preview program resources and arguments acceptance is required' }
if (!$report.ndlessPreview.nativeDialog -or !$report.ndlessPreview.spritesWithoutBmp) { throw 'Native missing-resource dialog acceptance is required' }
if (!$report.ndlessPreview.binaryPreview -or !$report.ndlessPreview.binaryEdits -or !$report.ndlessPreview.binaryClose -or !$report.ndlessPreview.sourceProfile) { throw 'Edited TNS preview and explicit SDK source profile acceptance is required' }
if (!$report.romConverter.ok -or !$report.romConverter.animated -or !$report.romConverter.projectExport -or !$report.romConverter.projectOpen -or !$report.romConverter.tnsExport -or !$report.browserRomConverter.ok -or $report.browserRomConverter.desktopRequired) { throw 'ROM Converter desktop/browser acceptance is required' }
if (!$report.gbPreview.ok -or !$report.gbPreview.controller -or !$report.gbPreview.pause -or !$report.gbPreview.persistedRam -or !$report.gbPreview.tnsExport) { throw 'Direct GB/GBC preview, controller, persistent RAM and native TNS acceptance is required' }
if (!$report.romCores.ok -or @($report.romCores.cases).Count -ne 4 -or @($report.romCores.cases | Where-Object { !$_.detected -or !$_.pause -or !$_.restart -or !$_.closed }).Count) { throw 'All four new ROM cores must pass packaged UI acceptance' }
$games = Get-Content (Join-Path $env:RUNNER_TEMP 'community-preview/report.json') -Raw | ConvertFrom-Json
if (!$games.ok -or @($games.results).Count -ne 2 -or !($games.results | Where-Object { $_.game -eq 'nDoom' -and $_.cameraChange -gt .15 -and $_.ammoHudChange -gt .003 }) -or !($games.results | Where-Object { $_.game -eq 'NesNspire' -and $_.controller -and $_.cleanExit })) { throw 'Both real community games must pass before publication' }
$stage = Join-Path $env:RUNNER_TEMP 'portable-release-assets'
$romDesign = Get-Content 'release/rom-design-report.json' -Raw | ConvertFrom-Json
if (!$romDesign.ok -or !$romDesign.controls.headerIcon -or !$romDesign.controls.expanded -or !$romDesign.controls.pauseResume -or !$romDesign.reset.monoHeaderIcon) { throw 'ROM Converter design acceptance is required' }
if (!$romDesign.improvements.ok -or $romDesign.improvements.nesFps -lt 20 -or !$romDesign.improvements.modalContained -or !$romDesign.improvements.n64IndependentControls -or !$romDesign.improvements.normalDocumentMenu -or !$romDesign.improvements.pcBadge -or !$romDesign.improvements.xmlBeforeNdless) { throw 'NES performance, N64 controls and File menu acceptance is required' }
if (!$romDesign.mobileImprovements.ok -or !$romDesign.mobileImprovements.modalContained -or !$romDesign.mobileImprovements.n64IndependentControls) { throw 'Mobile N64 controller and modal acceptance is required' }
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

Administrador USB: estado de carga legible, carpetas doradas, capacidad de almacenamiento consultada a la calculadora, envío de TNS al arrastrarlos sobre una carpeta y movimiento nativo entre carpetas sin reemplazos silenciosos. Graba capturas USB sucesivas y descarga un vídeo WebM sin audio de hasta dos minutos; la fluidez depende del dispositivo.

ROM Converter sigue visible al editar documentos normales. El preview NES usa directamente el mismo núcleo NesNspire compilado a WebAssembly y evita la doble emulación ARM. El mando N64 incorpora cruceta independiente, stick de ocho direcciones con zona muerta ajustable, botones C y gatillos; los FPS representan imágenes completadas. Se corrigió el desplazamiento de la ventana del convertidor.

Incluye las correcciones anteriores de Prgm Preview y la compilación de proyectos Ndless para Windows con el SDK incluido. Las funciones USB se validan con un dispositivo simulado; la tasa y compatibilidad en hardware real pueden variar.

Descarga **TNS-Tool-Portable-Windows-x64.zip**, extrae todo y abre **TNS Tool Portable.exe**. El título muestra la versión. El SDK y los motores están incluidos y funcionan sin conexión.

ROM Converter añade preview directo y proyectos C/C++ compilables para **SNES** (PocketSNES) y **GBA** (gpSP con BIOS abierta). También incorpora **N64** (Daedalus) y **DS** (NooDS) como experimentales, con compatibilidad y rendimiento limitados. No garantiza cualquier juego. DS se validó con diagnósticos originales; no con juegos comerciales.

Detecta cabeceras automáticamente. Admite SNES hasta 8 MiB, GBA hasta 32 MiB, N64 hasta 64 MiB y DS hasta 128 MiB. Mantiene los perfiles anteriores de NES, GB/GBC y Super Mario 64 EU. No incluye cartuchos privados ni BIOS propietarias.

Los cartuchos N64/DS grandes se leen desde un archivo compañero. En ese caso, Build TNS descarga un ZIP con programa y datos: coloca ambos .tns en la misma carpeta de la calculadora y abre el programa. El proyecto ZIP conserva los recursos y permite volver a compilar el paquete completo.

El preview directo tiene animación, controles, pausa, reinicio y guardado por cartucho. DS muestra ambas pantallas y permite tocar la inferior con el ratón. En la calculadora, Doc+flechas mueve el stylus y Doc+Ctrl toca; Esc guarda y sale. El preview de un proyecto fuente sigue ejecutando su C/C++ compilado, con su propio rendimiento.

Se comprobaron compilaciones ARM reales, mandos y guardados, lectura de cartucho externo, y la interfaz de los cuatro núcleos desde el ZIP extraído. También pasan las regresiones de Syntax Doctor/Prgm, Lua, proyectos Ndless, sprites, nDoom y NesNspire. USB requiere comprobación física.

Los motores se construyen desde fuentes públicas fijadas, con licencias y SHA256. Las ROM elegidas permanecen en el equipo. Se adjunta TNS-Preview-Games.zip con seis proyectos originales importables.

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
