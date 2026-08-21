param(
    [switch]$Help
)

if ($Help) {
    Write-Host "AgentMap Restarter"
    Write-Host "Usage: .\restart-agentmap.ps1"
    Write-Host "Stops and then starts the AgentMap backend."
    exit 0
}

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== AgentMap - Reiniciando ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop
Write-Host "Step 1/2: Parando AgentMap..." -ForegroundColor Yellow
& "$root\stop-agentmap.ps1"

# Wait for processes to fully terminate
Start-Sleep -Seconds 2

# Step 2: Start
Write-Host ""
Write-Host "Step 2/2: Iniciando AgentMap..." -ForegroundColor Yellow
& "$root\start-agentmap.ps1"

exit $LASTEXITCODE
