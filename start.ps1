# ===============================================================================
#   Precipitation Rendering Functional Equivalence Analyzer
#   1-Click PowerShell Runner Script
# ===============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  PRECIPITATION RENDERING FUNCTIONAL EQUIVALENCE ANALYZER" -ForegroundColor White
Write-Host "  Automated Computer-Vision Equivalence QA for Radar Imagery" -ForegroundColor Green
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Virtual Environment & Dependencies
$VenvPython = "C:\Users\ADMIN\honeywell_venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    $VenvPython = Join-Path $ScriptDir "backend\venv\Scripts\python.exe"
}
if (-not (Test-Path $VenvPython)) {
    Write-Host "[*] Setting up Python virtual environment..." -ForegroundColor Yellow
    python -m venv (Join-Path $ScriptDir "backend\venv")
    $pip = Join-Path $ScriptDir "backend\venv\Scripts\pip.exe"
    & $pip install -r (Join-Path $ScriptDir "backend\requirements.txt")
    $VenvPython = Join-Path $ScriptDir "backend\venv\Scripts\python.exe"
}

# 2. Dataset Generation Check
$DatasetSample = Join-Path $ScriptDir "data\expected\pair_001.png"
if (-not (Test-Path $DatasetSample)) {
    Write-Host "[*] Generating benchmark dataset (100 pairs)..." -ForegroundColor Yellow
    & $VenvPython (Join-Path $ScriptDir "generate_dataset.py")
}

# 3. Frontend Check
$FrontendModules = Join-Path $ScriptDir "frontend\node_modules"
if (-not (Test-Path $FrontendModules)) {
    Write-Host "[*] Installing frontend npm dependencies..." -ForegroundColor Yellow
    Set-Location (Join-Path $ScriptDir "frontend")
    npm.cmd install
    Set-Location $ScriptDir
}

Write-Host "[*] Launching Backend Server on port 8000..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$ScriptDir\backend`" && `"$VenvPython`" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "[*] Launching Frontend Server on port 5173..." -ForegroundColor Green
Start-Process cmd.exe -ArgumentList "/k", "cd /d `"$ScriptDir\frontend`" && npm.cmd run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "[*] Opening browser at http://localhost:5173..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "  SYSTEM ACTIVE & READY" -ForegroundColor Green
Write-Host "  - UI Dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "  - REST API:     http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  - API Docs:     http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
