@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restart-agentmap.ps1" %*
exit /b %errorlevel%