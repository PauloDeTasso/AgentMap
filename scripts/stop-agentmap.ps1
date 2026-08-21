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
$port = 3150

if (-not $Silent) {
    Write-Host "=== AgentMap - Parando Servidor ===" -ForegroundColor Cyan
    Write-Host ""
}

# Patterns to identify AgentMap processes
$patterns = @(
    "npm run dev",
    "npm run mcp",
    "ts-node src/index",
    "tsx src/mcp-server"
)

# Collect all PIDs to kill
$pids = @()

# 1) Find processes listening on port 3150
$portPids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    Select-Object -ExpandProperty OwningProcess -Unique)
foreach ($p in $portPids) { $pids += $p }

# 2) Find node.exe processes matching AgentMap patterns
$nodePids = Get-WmiObject Win32_Process -Filter "Name='node.exe'" |
    Where-Object {
        $matched = $false
        foreach ($pat in $patterns) {
            if ($_.CommandLine -like "*$pat*") { $matched = $true; break }
        }
        # Also match if the path contains "AgentMap" and it's not our stop script
        if (-not $matched -and $_.CommandLine -like "*AgentMap*" -and $_.CommandLine -notlike "*stop-agentmap*") {
            $matched = $true
        }
        # Check it's not our own stop script
        if ($_.CommandLine -like "*stop-agentmap*") { $matched = $false }
        $matched
    } |
    Select-Object -ExpandProperty ProcessId -Unique
foreach ($p in $nodePids) { $pids += $p }

# 3) Find cmd.exe wrappers that run our npm scripts
$cmdPids = Get-WmiObject Win32_Process -Filter "Name='cmd.exe'" |
    Where-Object {
        $matched = $false
        foreach ($pat in $patterns) {
            if ($_.CommandLine -like "*$pat*") { $matched = $true; break }
        }
        if ($_.CommandLine -like "*stop-agentmap*") { $matched = $false }
        $matched
    } |
    Select-Object -ExpandProperty ProcessId -Unique
foreach ($p in $cmdPids) { $pids += $p }

$pids = $pids | Sort-Object -Unique

if ($pids.Count -eq 0) {
    if (-not $Silent) {
        Write-Host "No AgentMap processes found running." -ForegroundColor Yellow
    }
    # Still verify port is free
    Start-Sleep -Seconds 1
    $portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
        Where-Object { $_.State -eq "Listen" }
    if ($portInUse) {
        if (-not $Silent) {
            Write-Host "AVISO: Porta $port ainda em uso por outro processo." -ForegroundColor Yellow
        }
        exit 1
    }
    exit 0
}

if (-not $Silent) {
    Write-Host "Found $($pids.Count) AgentMap process(es):" -ForegroundColor Yellow
    foreach ($procId in $pids) {
        $proc = Get-WmiObject Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue
        $cmd = if ($proc) { $proc.CommandLine } else { "unknown" }
        Write-Host "  PID: $procId - $cmd" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Stopping processes..." -ForegroundColor Yellow
}

# Kill processes with retry
$maxRetries = 3
for ($attempt = 1; $attempt -le $maxRetries; $attempt++) {
    foreach ($procId in $pids) {
        taskkill /F /T /PID $procId 2>$null | Out-Null
    }
    Start-Sleep -Seconds 2

    # Check if any processes remain
    $remaining = @()
    foreach ($procId in $pids) {
        if (Get-Process -Id $procId -ErrorAction SilentlyContinue) {
            $remaining += $procId
        }
    }
    if ($remaining.Count -eq 0) { break }

    if (-not $Silent -and $attempt -lt $maxRetries) {
        Write-Host "$($remaining.Count) process(es) still running. Retrying..." -ForegroundColor Yellow
    }
}

# Verify port is free
Start-Sleep -Seconds 2
$portInUse = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" }

if ($portInUse) {
    if (-not $Silent) {
        Write-Host ""
        Write-Host "AVISO: Porta $port ainda em uso." -ForegroundColor Yellow
        Write-Host "  Tente: taskkill /F /T /PID <pid> manualmente" -ForegroundColor DarkGray
    }
    exit 1
} else {
    if (-not $Silent) {
        Write-Host ""
        Write-Host "Porta $port liberada." -ForegroundColor Green
        Write-Host "AgentMap parado com sucesso!" -ForegroundColor Green
    }
    exit 0
}
