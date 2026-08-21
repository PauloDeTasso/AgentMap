@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-agentmap.ps1" %*
exit /b %errorlevel%
