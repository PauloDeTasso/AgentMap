param(
    [switch]$Help
)

if ($Help) {
    Write-Host "AgentMap Restarter"
    Write-Host "Usage: .\restart-agentmap.ps1"
    Write-Host "Stops and then starts the AgentMap backend and MCP server."
    exit 0
}

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$stopScript = Join-Path $root "stop-agentmap.ps1"
$startScript = Join-Path $root "start-agentmap.ps1"

Write-Host "=== AgentMap Restarter ===" -ForegroundColor Cyan
Write-Host ""

# Stop
Write-Host "Step 1: Stopping AgentMap..." -ForegroundColor Yellow
& $stopScript

# Wait a bit for processes to fully terminate
Start-Sleep -Seconds 2

# Start
Write-Host ""
Write-Host "Step 2: Starting AgentMap..." -ForegroundColor Yellow
& $startScript
