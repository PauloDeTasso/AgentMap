param(
    [switch]$Silent,
    [switch]$Help
)

if ($Help) {
    Write-Host "AgentMap Stopper"
    Write-Host "Usage: .\stop-agentmap.ps1 [-Silent]"
    Write-Host "Stops all AgentMap backend and MCP processes."
    exit 0
}

$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $Silent) {
    Write-Host "=== AgentMap Stopper ===" -ForegroundColor Cyan
    Write-Host ""
}

# Patterns to identify AgentMap processes
$patterns = @(
    "npm run dev",
    "npm run mcp",
    "ts-node src/index.ts",
    "tsx src/mcp-server/index.ts",
    "AgentMap"
)

# Find all node processes that match AgentMap patterns
$processesToKill = @()

Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object {
    $cmdLine = $_.CommandLine
    $isAgentMap = $false
    
    foreach ($pattern in $patterns) {
        if ($cmdLine -like "*$pattern*") {
            $isAgentMap = $true
            break
        }
    }
    
    # Also check if it's using our workspace
    if ($cmdLine -like "*AgentMap*") {
        $isAgentMap = $true
    }
    
    if ($isAgentMap) {
        $processesToKill += $_
    }
}

if ($processesToKill.Count -eq 0) {
    if (-not $Silent) {
        Write-Host "No AgentMap processes found running." -ForegroundColor Yellow
    }
    exit 0
}

if (-not $Silent) {
    Write-Host "Found $($processesToKill.Count) AgentMap process(es):" -ForegroundColor Yellow
    foreach ($proc in $processesToKill) {
        Write-Host "  PID: $($proc.ProcessId) - $($proc.CommandLine)" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Stopping processes..." -ForegroundColor Yellow
}

# Kill processes
foreach ($proc in $processesToKill) {
    try {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
        if (-not $Silent) {
            Write-Host "  Killed PID: $($proc.ProcessId)" -ForegroundColor Green
        }
    } catch {
        if (-not $Silent) {
            Write-Host "  Failed to kill PID: $($proc.ProcessId) - $_" -ForegroundColor Red
        }
    }
}

# Wait a moment for ports to be released
Start-Sleep -Seconds 2

# Verify port 3150 is free
$portInUse = Get-NetTCPConnection -LocalPort 3150 -ErrorAction SilentlyContinue
if ($portInUse) {
    if (-not $Silent) {
        Write-Host ""
        Write-Host "WARNING: Port 3150 is still in use by another process." -ForegroundColor Yellow
        $portInUse | Select-Object OwningProcess, LocalPort | Format-Table
    }
} else {
    if (-not $Silent) {
        Write-Host ""
        Write-Host "Port 3150 is now free." -ForegroundColor Green
    }
}

if (-not $Silent) {
    Write-Host ""
    Write-Host "AgentMap stopped successfully!" -ForegroundColor Green
}
