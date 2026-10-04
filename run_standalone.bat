@echo off
title Precipitation Analyzer - Standalone Production Mode
color 0a

cd /d "%~dp0"

echo ===============================================================================
echo   PRECIPITATION ANALYZER - STANDALONE SINGLE-PORT MODE (PORT 8000)
echo ===============================================================================
echo.

if not exist "frontend\dist\index.html" (
    echo [*] Building frontend production bundle...
    cd frontend
    call npm.cmd run build
    cd ..
)

set "PYTHON_EXE=C:\Users\ADMIN\honeywell_venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=backend\venv\Scripts\python.exe"
)

echo [*] Launching Unified Server at http://127.0.0.1:8000 ...
start http://127.0.0.1:8000
"%PYTHON_EXE%" -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
pause
