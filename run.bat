@echo off
title Precipitation Rendering Functional Equivalence Analyzer
color 0b

echo ===============================================================================
echo   PRECIPITATION RENDERING FUNCTIONAL EQUIVALENCE ANALYZER
echo   Automated Computer-Vision Equivalence QA for Radar Precipitation
echo ===============================================================================
echo.

cd /d "%~dp0"

:: 1. Check Python Virtual Environment
set "PYTHON_EXE=C:\Users\ADMIN\honeywell_venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=backend\venv\Scripts\python.exe"
)
if not exist "%PYTHON_EXE%" (
    echo [*] Creating Python virtual environment in backend\venv...
    python -m venv backend\venv
    if %errorlevel% neq 0 (
        echo [!] ERROR: Python 3.10+ is required in PATH. Please install Python.
        pause
        exit /b 1
    )
    echo [*] Installing backend dependencies...
    backend\venv\Scripts\pip.exe install -r backend\requirements.txt
    set "PYTHON_EXE=backend\venv\Scripts\python.exe"
)

:: 2. Check Synthetic Dataset
if not exist "data\expected\pair_001.png" (
    echo [*] Generating 100-pair benchmark dataset...
    "%PYTHON_EXE%" generate_dataset.py
)

:: 3. Check Frontend Node Modules
if not exist "frontend\node_modules" (
    echo [*] Installing frontend npm dependencies...
    cd frontend
    call npm.cmd install
    cd ..
)

echo.
echo ===============================================================================
echo   STARTING SERVERS
echo ===============================================================================
echo.
echo [*] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "Backend - Equivalence Analyzer API" cmd /k "cd /d %~dp0\backend && ""%PYTHON_EXE%"" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [*] Starting Frontend Dev Server on http://localhost:5173 ...
start "Frontend - Equivalence Analyzer UI" cmd /k "cd /d %~dp0\frontend && npm.cmd run dev"

timeout /t 3 /nobreak >nul

echo.
echo [*] Opening Web Application in your default browser...
start http://localhost:5173

echo.
echo ===============================================================================
echo   APPLICATION READY!
echo   - Web UI:      http://localhost:5173
echo   - Backend API: http://127.0.0.1:8000
echo   - API Docs:    http://127.0.0.1:8000/docs
echo ===============================================================================
echo.
echo Press any key to exit this launcher window (servers will stay running)...
pause >nul
