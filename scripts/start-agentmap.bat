@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-agentmap.ps1" %*
exit /b %errorlevel%
