@echo off
setlocal
chcp 65001 >nul
title TNS Tool - actualizar y compilar portable para Windows
cd /d "%~dp0"

set "UPDATE_ZIP=%~1"
set "SEED_PORTABLE=%~2"

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0desktop\build-portable-local.ps1" -UpdateZip "%UPDATE_ZIP%" -SeedPortablePath "%SEED_PORTABLE%"
set "BUILD_EXIT=%ERRORLEVEL%"

if not "%BUILD_EXIT%"=="0" (
  echo.
  echo La compilacion se detuvo. Revisa el mensaje anterior.
  pause
)

exit /b %BUILD_EXIT%
