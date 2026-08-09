@echo off
title AgentMap - Iniciando
echo.
echo =========================================
echo   AgentMap - Iniciando servidores
echo =========================================
echo.

set "ROOT=%~dp0.."
set "BACKEND=%ROOT%\backend"

echo [1/3] Parando processos anteriores...
powershell -ExecutionPolicy Bypass -File "%ROOT%\scripts\stop-agentmap.ps1" -Silent >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2/3] Iniciando backend...
cd /d "%BACKEND%"
start "AgentMap Backend" cmd /c "npm run dev"

echo [3/3] Aguardando servidor iniciar...
:wait
timeout /t 2 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3150/api/status' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel% neq 0 goto wait

echo.
echo =========================================
echo   AgentMap iniciado com sucesso!
echo   Backend: http://localhost:3150
echo =========================================
echo.

start http://localhost:3150/index.html

pause
