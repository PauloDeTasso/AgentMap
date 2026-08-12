@echo off
title AgentMap - Reiniciando
echo.
echo =========================================
echo   AgentMap - Reiniciando servidores
echo =========================================
echo.
echo Parando...
powershell -ExecutionPolicy Bypass -File "%~dp0..\scripts\stop-agentmap.ps1" -Silent >nul 2>&1
timeout /t 2 /nobreak >nul
echo Iniciando...
powershell -ExecutionPolicy Bypass -File "%~dp0..\scripts\start-agentmap.ps1" -Silent
pause
