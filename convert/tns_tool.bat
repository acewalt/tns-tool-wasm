@echo off
setlocal
cd /d "%~dp0"

if "%~1"=="" (
    python code_to_tns.py menu
    goto :eof
)

if /i "%~x1"==".py" (
    python code_to_tns.py quick "%~1" --template plantilla.tns
    goto :eof
)

if /i "%~x1"==".tns" (
    python code_to_tns.py analyze "%~1"
    goto :eof
)

python code_to_tns.py menu
