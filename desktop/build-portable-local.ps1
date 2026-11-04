param(
    [string]$UpdateZip = '',
    [string]$SeedPortablePath = '',
    [switch]$SkipUpdate,
    [switch]$NoOpenOutput
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repoPrefix = $repoRoot.TrimEnd('\') + '\'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupRoot = Join-Path $repoRoot "release\local-update-backups\$timestamp"
$seedTemp = $null

function Write-Step([string]$Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Invoke-Checked([string]$Program, [string[]]$Arguments) {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "El comando terminó con código $LASTEXITCODE : $Program $($Arguments -join ' ')"
    }
}

function Get-Sha256Hex([string]$Path) {
    $stream = [IO.File]::OpenRead($Path)
    $digest = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($digest.ComputeHash($stream)).Replace('-', '').ToLowerInvariant() }
    finally { $digest.Dispose(); $stream.Dispose() }
}

function Get-PublicPortableSeed {
    $headers = @{ 'User-Agent' = 'TNS-Tool-Local-Build'; 'Accept' = 'application/vnd.github+json' }
    $releases = Invoke-RestMethod -Uri 'https://api.github.com/repos/acewalt/tns-tool-wasm/releases?per_page=100' -Headers $headers -TimeoutSec 45
    $candidates = @($releases | Where-Object {
        !$_.draft -and !$_.prerelease -and $_.tag_name -match '^tns-tool-portable-v\d+\.\d+\.\d+$' -and
        @($_.assets | Where-Object { $_.name -eq 'TNS-Tool-Portable-Windows-x64.zip' -and $_.state -eq 'uploaded' }).Count
    } | Sort-Object { [version]($_.tag_name -replace '^tns-tool-portable-v', '') } -Descending)
    if (!$candidates.Count) { throw 'No encontré una Release portable pública con el ZIP de Windows. Pasa una carpeta portable extraída como segundo argumento.' }
    $release = $candidates[0]
    $asset = @($release.assets | Where-Object { $_.name -eq 'TNS-Tool-Portable-Windows-x64.zip' })[0]
    $checksum = @($release.assets | Where-Object { $_.name -eq 'TNS-Tool-Portable-Windows-x64.sha256.txt' }) | Select-Object -First 1
    $digest = if ($asset.digest -match '^sha256:([a-fA-F0-9]{64})$') { $Matches[1].ToLowerInvariant() } else { '' }
    return [pscustomobject]@{ Tag = $release.tag_name; ZipUrl = $asset.browser_download_url; Digest = $digest; ChecksumUrl = $checksum.browser_download_url }
}

function Get-PortableResourceRoot([string]$Path) {
    if (Test-Path -LiteralPath (Join-Path $Path 'resources\vendor') -PathType Container) {
        return $Path
    }
    $candidate = Get-ChildItem -LiteralPath $Path -Directory -Recurse -ErrorAction SilentlyContinue |
        Where-Object { (Test-Path -LiteralPath (Join-Path $_.FullName 'resources\vendor') -PathType Container) } |
        Select-Object -First 1
    if ($candidate) { return $candidate.FullName }
    return $null
}

function Copy-MissingFiles([string]$Source, [string]$Destination) {
    if (!(Test-Path -LiteralPath $Source -PathType Container)) {
        throw "Falta la carpeta del portable base: $Source"
    }
    Get-ChildItem -LiteralPath $Source -File -Recurse | ForEach-Object {
        $relative = $_.FullName.Substring($Source.TrimEnd('\').Length).TrimStart('\')
        $target = Join-Path $Destination $relative
        if (!(Test-Path -LiteralPath $target -PathType Leaf)) {
            $targetDir = Split-Path -Parent $target
            New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
            Copy-Item -LiteralPath $_.FullName -Destination $target
        }
    }
}

function Test-BuildDependencies {
    $required = @(
        'desktop\vendor\compiler\TNS-Tool-Compiler-Windows-x64.exe',
        'desktop\vendor\compiler\sdk.bin.gz',
        'desktop\vendor\compiler\sdk.json',
        'desktop\vendor\pyodide\pyodide.js',
        'desktop\vendor\pyodide\pyodide.asm.wasm',
        'desktop\vendor\jszip\jszip.min.js',
        'desktop\vendor\pdfjs\pdf.min.js',
        'desktop\vendor\unicorn\unicorn.js',
        'desktop\vendor\unicorn\unicorn.wasm',
        'desktop\vendor\rom\binjgb.js',
        'desktop\vendor\rom\binjgb.wasm',
        'desktop\vendor\rom\nes-template.zip',
        'desktop\vendor\rom\gb-template.zip',
        'desktop\vendor\rom\snes-template.zip',
        'desktop\vendor\rom\gba-template.zip',
        'desktop\vendor\rom\nds-template.zip',
        'desktop\vendor\rom\n64-template.zip',
        'desktop\vendor\rom\sm64-eu-template.zip'
    )
    foreach ($system in @('nes', 'snes', 'gba', 'nds', 'n64')) {
        $required += "desktop\vendor\rom\$system-preview.js"
        $required += "desktop\vendor\rom\$system-preview.wasm"
    }
    $missing = @($required | Where-Object { !(Test-Path -LiteralPath (Join-Path $repoRoot $_) -PathType Leaf) })
    return $missing
}

function Assert-DesktopBuildSource {
    $packagePath = Join-Path $repoRoot 'package.json'
    if (!(Test-Path -LiteralPath $packagePath -PathType Leaf)) {
        throw 'No encuentro package.json en esta carpeta. Ejecuta el BAT desde la raíz del proyecto.'
    }
    $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
    $desktopBuild = [string]$package.scripts.'desktop:build:win'
    $hasElectron = $package.dependencies.electron -or $package.devDependencies.electron
    $hasBuilder = $package.dependencies.'electron-builder' -or $package.devDependencies.'electron-builder'
    $requiredFiles = @('electron-builder.json', 'desktop\main.cjs', 'desktop\preload.cjs')
    $missingFiles = @($requiredFiles | Where-Object { !(Test-Path -LiteralPath (Join-Path $repoRoot $_) -PathType Leaf) })
    if (!$desktopBuild -or !$hasElectron -or !$hasBuilder -or $missingFiles.Count) {
        $missing = @()
        if (!$desktopBuild) { $missing += 'el comando desktop:build:win' }
        if (!$hasElectron) { $missing += 'Electron' }
        if (!$hasBuilder) { $missing += 'electron-builder' }
        if ($missingFiles.Count) { $missing += $missingFiles }
        throw "Esta copia no contiene el proyecto de escritorio para Windows (package.json $($package.version)); faltan: $($missing -join ', '). Descarga la rama/copia que contiene la versión portable de Windows y vuelve a ejecutar el BAT desde su raíz. No se modificó esta carpeta."
    }
}

function Apply-UpdateZip([string]$Path) {
    if (!$Path) {
        Add-Type -AssemblyName System.Windows.Forms
        $picker = New-Object System.Windows.Forms.OpenFileDialog
        $picker.Title = 'Elige el ZIP de actualización que te entregó ChatGPT'
        $picker.Filter = 'ZIP de actualización (*.zip)|*.zip|Todos los archivos (*.*)|*.*'
        $picker.Multiselect = $false
        if ($picker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
            Write-Host 'No se eligió un ZIP de actualización; compilaré el código que ya está en esta carpeta.' -ForegroundColor Yellow
            return
        }
        $Path = $picker.FileName
    }

    $Path = (Resolve-Path -LiteralPath $Path).Path
    if ([IO.Path]::GetExtension($Path) -ne '.zip') { throw 'El archivo de actualización debe ser un .zip.' }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $files = @($archive.Entries | Where-Object { $_.Name })
        if ($files.Count -eq 0) { throw 'El ZIP de actualización está vacío.' }
        $targets = @()
        foreach ($entry in $files) {
            $relative = $entry.FullName.Replace('\', '/')
            if ($relative.StartsWith('/') -or $relative -match '^[A-Za-z]:' -or
                @($relative.Split('/') | Where-Object { $_ -eq '..' -or $_ -eq '.' }).Count -gt 0) {
                throw "El ZIP contiene una ruta no permitida: $($entry.FullName)"
            }
            $target = [IO.Path]::GetFullPath((Join-Path $repoRoot ($relative.Replace('/', '\'))))
            if (!$target.StartsWith($repoPrefix, [StringComparison]::OrdinalIgnoreCase)) {
                throw "El ZIP intenta escribir fuera del repositorio: $($entry.FullName)"
            }
            $targets += [pscustomobject]@{ Entry = $entry; Path = $target; Relative = $relative }
        }

        $answer = Read-Host "Aplicar $($files.Count) archivos en $repoRoot y compilar? (S/N)"
        if ($answer -notmatch '^(s|si|sí)$') { throw 'Actualización cancelada por el usuario.' }

        $existing = @($targets | Where-Object { Test-Path -LiteralPath $_.Path -PathType Leaf })
        if ($existing.Count) {
            foreach ($item in $existing) {
                $backup = Join-Path $backupRoot ($item.Relative.Replace('/', '\'))
                New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
                Copy-Item -LiteralPath $item.Path -Destination $backup
            }
            Write-Host "Copia de seguridad de archivos reemplazados: $backupRoot" -ForegroundColor Yellow
        }
        Expand-Archive -LiteralPath $Path -DestinationPath $repoRoot -Force
        Write-Host "ZIP aplicado: $Path" -ForegroundColor Green
    }
    finally { $archive.Dispose() }
}

function Disable-AutomaticPortablePackageTriggers {
    $workflow = Join-Path $repoRoot '.github\workflows\desktop-portable-windows.yml'
    if (!(Test-Path -LiteralPath $workflow -PathType Leaf)) { return }
    $lines = [IO.File]::ReadAllLines($workflow)
    $start = -1
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match '^on:\s*$') { $start = $i; break }
    }
    if ($start -lt 0) { return }
    $end = $lines.Length
    for ($i = $start + 1; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match '^\S[^:]*:') { $end = $i; break }
    }
    $current = ($lines[$start..($end - 1)] -join "`n").Trim()
    if ($current -eq "on:`n  workflow_dispatch:") { return }
    $backup = Join-Path $backupRoot '.github\workflows\desktop-portable-windows.yml'
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $backup) | Out-Null
    Copy-Item -LiteralPath $workflow -Destination $backup
    $kept = @()
    if ($start -gt 0) { $kept += $lines[0..($start - 1)] }
    $kept += @('on:', '  workflow_dispatch:', '')
    if ($end -lt $lines.Length) { $kept += $lines[$end..($lines.Length - 1)] }
    $text = ($kept -join "`n").TrimEnd() + "`n"
    [IO.File]::WriteAllText($workflow, $text, [Text.UTF8Encoding]::new($false))
    Write-Host 'El empaquetado de Windows en Actions quedó disponible solo por ejecución manual. El BAT compila en este PC.' -ForegroundColor Green
}

function Invoke-PortableElectronBuild([string]$NpmPath) {
    $pnpmLock = Join-Path $repoRoot 'pnpm-lock.yaml'
    $lockBackup = Join-Path $backupRoot 'local-build\pnpm-lock.yaml'
    $lockHidden = $false
    try {
        if (Test-Path -LiteralPath $pnpmLock -PathType Leaf) {
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $lockBackup) | Out-Null
            Copy-Item -LiteralPath $pnpmLock -Destination $lockBackup -Force
            Remove-Item -LiteralPath $pnpmLock -Force
            $lockHidden = $true
            Write-Host 'Aparté temporalmente pnpm-lock.yaml para que electron-builder use npm, igual que la instalación de dependencias.' -ForegroundColor Yellow
        }
        Invoke-Checked $NpmPath @('run', 'desktop:build:win')
    }
    finally {
        if ($lockHidden -and (Test-Path -LiteralPath $lockBackup -PathType Leaf)) {
            Copy-Item -LiteralPath $lockBackup -Destination $pnpmLock -Force
            Write-Host 'pnpm-lock.yaml fue restaurado sin cambios.' -ForegroundColor Green
        }
    }
}

function Ensure-PortableRuntimeSeed {
    if (@(Test-BuildDependencies).Count -eq 0) { return }
    Write-Step 'Preparando los recursos locales del portable'
    $seedRoot = $null
    if ($SeedPortablePath) {
        $resolvedSeed = (Resolve-Path -LiteralPath $SeedPortablePath).Path
        if (Test-Path -LiteralPath $resolvedSeed -PathType Container) {
            $seedRoot = Get-PortableResourceRoot $resolvedSeed
        } else {
            $script:seedTemp = Join-Path ([IO.Path]::GetTempPath()) ('tns-portable-seed-' + [Guid]::NewGuid().ToString('N'))
            New-Item -ItemType Directory -Force -Path $seedTemp | Out-Null
            Expand-Archive -LiteralPath $resolvedSeed -DestinationPath $seedTemp -Force
            $seedRoot = Get-PortableResourceRoot $seedTemp
        }
    } else {
        $script:seedTemp = Join-Path ([IO.Path]::GetTempPath()) ('tns-portable-seed-' + [Guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Force -Path $seedTemp | Out-Null
        $seedZip = Join-Path $seedTemp 'TNS-Tool-Portable-Windows-x64.zip'
        $seedChecksum = Join-Path $seedTemp 'TNS-Tool-Portable-Windows-x64.sha256.txt'
        $seed = Get-PublicPortableSeed
        Write-Host "Descargando los recursos de $($seed.Tag) (solo la primera vez en una copia nueva)..."
        Invoke-WebRequest -Uri $seed.ZipUrl -OutFile $seedZip -UseBasicParsing -TimeoutSec 600
        $expected = $seed.Digest
        if (!$expected -and $seed.ChecksumUrl) {
            Invoke-WebRequest -Uri $seed.ChecksumUrl -OutFile $seedChecksum -UseBasicParsing -TimeoutSec 45
            $expected = [regex]::Match((Get-Content -LiteralPath $seedChecksum -Raw), '(?i)\b[a-f0-9]{64}\b').Value.ToLowerInvariant()
        }
        if (!$expected) { throw 'El checksum de la Release base no tiene un SHA256 válido.' }
        $actual = Get-Sha256Hex $seedZip
        if ($actual -ne $expected) { throw 'El SHA256 del portable base no coincide con el checksum publicado.' }
        Expand-Archive -LiteralPath $seedZip -DestinationPath (Join-Path $seedTemp 'unpacked') -Force
        $seedRoot = Get-PortableResourceRoot (Join-Path $seedTemp 'unpacked')
    }
    if (!$seedRoot) { throw 'No encontré resources/vendor y resources/compiler en el portable base.' }
    Copy-MissingFiles (Join-Path $seedRoot 'resources\vendor') (Join-Path $repoRoot 'desktop\vendor')
    Copy-MissingFiles (Join-Path $seedRoot 'resources\compiler') (Join-Path $repoRoot 'desktop\vendor\compiler')
    $missing = @(Test-BuildDependencies)
    if ($missing.Count) { throw "El portable base no incluye recursos requeridos: $($missing -join ', ')" }
}

try {
    Push-Location $repoRoot
    if ($env:OS -ne 'Windows_NT' -or [Environment]::Is64BitOperatingSystem -ne $true) {
        throw 'Este BAT construye el portable para Windows x64 y debe ejecutarse en Windows de 64 bits.'
    }

    Assert-DesktopBuildSource
    if (!$SkipUpdate) { if ($UpdateZip) { Apply-UpdateZip $UpdateZip } else { Apply-UpdateZip '' } }
    Assert-DesktopBuildSource
    Disable-AutomaticPortablePackageTriggers

    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    if (!$node) { $node = Get-Command node -ErrorAction SilentlyContinue }
    if (!$node) { throw 'Instala Node.js 22 o superior y vuelve a ejecutar este BAT.' }
    $nodeVersionText = (& $node.Source --version).Trim().TrimStart('v')
    $nodeVersion = [version]$nodeVersionText
    if ($nodeVersion.Major -lt 22) { throw "Se requiere Node.js 22 o superior; se encontró $nodeVersionText." }

    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    $npmPath = $null
    if ($npm) { $npmPath = $npm.Source }
    if (!$npm) {
        $nodeDir = Split-Path -Parent $node.Source
        $npmCandidate = Join-Path $nodeDir 'npm.cmd'
        if (Test-Path -LiteralPath $npmCandidate -PathType Leaf) { $npmPath = $npmCandidate }
    }
    if (!$npmPath) { throw 'No encuentro npm.cmd. Instala Node.js desde nodejs.org con npm incluido y reinicia esta ventana.' }

    Write-Step 'Comprobando e instalando las dependencias declaradas en package.json'
    Invoke-Checked $npmPath @('install', '--no-package-lock', '--no-audit', '--no-fund')

    Ensure-PortableRuntimeSeed

    Write-Step 'Empaquetando el código actualizado en tu PC'
    $env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
    Invoke-PortableElectronBuild $npmPath

    $package = Get-Content -LiteralPath (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json
    $version = [string]$package.version
    if ($version -notmatch '^\d+\.\d+\.\d+$') { throw "Versión inválida en package.json: $version" }
    $builtZip = Join-Path $repoRoot "release\portable\TNS-Tool-Portable-$version-x64.zip"
    if (!(Test-Path -LiteralPath $builtZip -PathType Leaf)) { throw "No apareció el paquete compilado: $builtZip" }

    Write-Step 'Comprobando el paquete y preparando los archivos de Release'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($builtZip)
    try {
        $names = @($archive.Entries | ForEach-Object { $_.FullName })
        foreach ($required in @('TNS Tool Portable.exe', 'resources\app.asar', 'resources\compiler\TNS-Tool-Compiler-Windows-x64.exe', 'resources\compiler\sdk.bin.gz', 'resources\compiler\sdk.json')) {
            if ($names -notcontains $required -and $names -notcontains ($required -replace '\\', '/')) {
                throw "Al paquete le falta el archivo requerido: $required"
            }
        }
        $longest = $archive.Entries | Sort-Object { $_.FullName.Length } -Descending | Select-Object -First 1
        if ($longest.FullName.Length -gt 90) { throw "La ruta del ZIP supera 90 caracteres: $($longest.FullName)" }
    } finally { $archive.Dispose() }

    $publishDir = Join-Path $repoRoot 'release\local-publish'
    New-Item -ItemType Directory -Force -Path $publishDir | Out-Null
    $publishZip = Join-Path $publishDir 'TNS-Tool-Portable-Windows-x64.zip'
    $publishHash = Join-Path $publishDir 'TNS-Tool-Portable-Windows-x64.sha256.txt'
    Copy-Item -LiteralPath $builtZip -Destination $publishZip -Force
    $sha = Get-Sha256Hex $publishZip
    [IO.File]::WriteAllText($publishHash, "$sha  TNS-Tool-Portable-Windows-x64.zip`n", [Text.UTF8Encoding]::new($false))

    $git = Get-Command git.exe -ErrorAction SilentlyContinue
    if (!$git) { $git = Get-Command git -ErrorAction SilentlyContinue }
    $commit = $null
    $status = @()
    if ($git) {
        $commit = (& $git.Source -C $repoRoot rev-parse HEAD 2>$null | Select-Object -First 1)
        $status = @(& $git.Source -C $repoRoot status --porcelain 2>$null)
    }
    if (!$commit) { $commit = 'No se encontró Git en esta copia' }
    $sourceStatus = if ($status.Count) { 'Hay cambios locales; súbelos primero a GitHub antes de crear la Release.' } else { 'La copia local está limpia.' }
    $notes = @"
TNS Tool Portable $version para Windows x64.

ZIP compilado en el PC del autor. Extrae todo y abre TNS Tool Portable.exe.

Código fuente: $commit
Estado del código: $sourceStatus
SHA256: $sha
"@
    [IO.File]::WriteAllText((Join-Path $publishDir 'LEEME-PUBLICACION.txt'), $notes, [Text.UTF8Encoding]::new($false))

    Write-Host "`nCompilación lista: $publishZip" -ForegroundColor Green
    Write-Host "Checksum: $publishHash" -ForegroundColor Green
    Write-Host "Ejecutable incluido: $(Join-Path $repoRoot 'release\portable\win-unpacked\TNS Tool Portable.exe')" -ForegroundColor Green
    if ($status.Count) {
        Write-Warning 'Veo cambios sin commit. Haz commit y push del código fuente antes de publicar estos binarios en una Release.'
    }
    if (!$NoOpenOutput) { Start-Process -FilePath explorer.exe -ArgumentList ('"{0}"' -f $publishDir) }
}
catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    if ($seedTemp -and (Test-Path -LiteralPath $seedTemp)) {
        $tempFull = [IO.Path]::GetFullPath($seedTemp)
        $tempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\') + '\'
        if ($tempFull.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase) -and
            (Split-Path -Leaf $tempFull).StartsWith('tns-portable-seed-')) {
            Remove-Item -LiteralPath $tempFull -Recurse -Force
        }
    }
    Pop-Location -ErrorAction SilentlyContinue
}
