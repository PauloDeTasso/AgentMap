@echo off
title AgentMap - Parando
echo.
echo =========================================
echo   AgentMap - Parando servidores
echo =========================================
echo.

set "ROOT=%~dp0.."
set "SCRIPTS=%~dp0"

powershell -ExecutionPolicy Bypass -File "%SCRIPTS%stop-agentmap.ps1"

echo.
echo =========================================
echo   AgentMap parado.
echo =========================================
