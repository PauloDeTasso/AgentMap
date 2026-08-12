@echo off
title AgentMap - Parando
echo.
echo =========================================
echo   AgentMap - Parando servidores
echo =========================================
echo.
echo Parando processos do AgentMap...
powershell -ExecutionPolicy Bypass -File "%~dp0..\scripts\stop-agentmap.ps1" -Silent
echo.
echo AgentMap parado.
pause
