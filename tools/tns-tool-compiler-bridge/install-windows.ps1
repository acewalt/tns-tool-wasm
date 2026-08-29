$ErrorActionPreference = 'Stop'

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceExe = Join-Path $SourceDir 'tns-tool-compiler-bridge.exe'
if (-not (Test-Path $SourceExe)) {
  throw "tns-tool-compiler-bridge.exe was not found next to this installer."
}

$InstallDir = Join-Path $env:LOCALAPPDATA 'TNS Tool Compiler'
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
$TargetExe = Join-Path $InstallDir 'tns-tool-compiler-bridge.exe'
Copy-Item -Force $SourceExe $TargetExe

$BundledToolchain = Join-Path $SourceDir 'toolchain'
if (Test-Path $BundledToolchain) {
  $TargetToolchain = Join-Path $InstallDir 'toolchain'
  if (Test-Path $TargetToolchain) { Remove-Item -Recurse -Force $TargetToolchain }
  Copy-Item -Recurse -Force $BundledToolchain $TargetToolchain
}

$ProtocolKey = 'HKCU:\Software\Classes\tnstool'
New-Item -Force $ProtocolKey | Out-Null
Set-Item -Path $ProtocolKey -Value 'URL:TNS Tool Compiler Protocol'
New-ItemProperty -Path $ProtocolKey -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
$CommandKey = Join-Path $ProtocolKey 'shell\open\command'
New-Item -Force $CommandKey | Out-Null
Set-Item -Path $CommandKey -Value ('"{0}" "%1"' -f $TargetExe)

Write-Host ''
Write-Host 'TNS Tool Compiler installed.' -ForegroundColor Green
Write-Host "Location: $InstallDir"
Write-Host 'Protocol: tnstool://'
Write-Host ''
Write-Host 'Starting the local bridge...'
Start-Process -FilePath $TargetExe
Write-Host 'Return to TNS Tool and press Build TNS.'
