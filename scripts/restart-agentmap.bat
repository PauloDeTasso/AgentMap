@echo off
title AgentMap - Reiniciando
echo.
echo =========================================
echo   AgentMap - Reiniciando servidores
echo =========================================
echo.

set "ROOT=%~dp0.."
set "SCRIPTS=%~dp0"

echo [1/2] Parando...
powershell -ExecutionPolicy Bypass -File "%SCRIPTS%stop-agentmap.ps1" -Silent
timeout /t 3 /nobreak >nul

echo [2/2] Iniciando...
call "%SCRIPTS%start-agentmap.bat"
