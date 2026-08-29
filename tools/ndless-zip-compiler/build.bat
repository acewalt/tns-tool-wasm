@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo  Building NdlessZipCompiler.exe
echo ========================================
echo.

set "CSC=%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "%CSC%" set "CSC=%WINDIR%\Microsoft.NET\Framework\v4.0.30319\csc.exe"

if not exist "%CSC%" (
  echo [ERROR] No se encontro csc.exe de .NET Framework 4.x.
  pause
  exit /b 1
)

if not exist "NdlessZipCompiler.cs" (
  echo [ERROR] Falta NdlessZipCompiler.cs.
  pause
  exit /b 1
)

if not exist "dist" mkdir "dist"

"%CSC%" /nologo /optimize+ /target:exe /platform:x64 ^
  /out:"dist\NdlessZipCompiler.exe" ^
  /reference:System.dll ^
  /reference:System.Core.dll ^
  "NdlessZipCompiler.cs"

if errorlevel 1 (
  echo.
  echo [ERROR] No se pudo compilar NdlessZipCompiler.exe.
  pause
  exit /b 1
)

echo.
echo [OK] %CD%\dist\NdlessZipCompiler.exe
echo.
echo Arrastra un ZIP de proyecto encima de ese EXE.
echo La primera ejecucion descarga automaticamente TNS Tool Compiler v3 si hace falta.
echo.
pause
