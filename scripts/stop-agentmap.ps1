param(
    [switch]$Silent,
    [switch]$Help
)

if ($Help) {
    Write-Host "AgentMap Stopper"
    Write-Host "Usage: .\stop-agentmap.ps1 [-Silent]"
    Write-Host "Stops all AgentMap backend and MCP processes with process-tree killing and retry."
    exit 0
}

$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $Silent) {
    Write-Host "=== AgentMap Stopper ===" -ForegroundColor Cyan
    Write-Host ""
}

# Patterns to identify AgentMap processes (cmd.exe wrappers, npm, ts-node, tsx)
$patterns = @(
    "npm run dev",
    "npm run mcp",
    "ts-node src/index.ts",
    "tsx src/mcp-server/index.ts",
    "npm.cmd"
)

# Get current process ID and parent chain to exclude self
$currentPid = [System.Diagnostics.Process]::GetCurrentProcess().Id
$parentPid = (Get-CimInstance Win32_Process -Filter "ProcessId=$currentPid").ParentProcessId

function Find-AgentMapProcesses {
    param([int]$ExcludePid, [int]$ExcludeParentPid)

    $result = @()

    # Find node.exe processes matching AgentMap patterns
    Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object {
        $cmdLine = $_.CommandLine
        $isAgentMap = $false

        foreach ($pattern in $patterns) {
            if ($cmdLine -like "*$pattern*") {
                $isAgentMap = $true
                break
            }
        }
        # Also check if it's from our workspace (but not stop-agentmap)
        if ($cmdLine -like "*AgentMap*" -and $cmdLine -notlike "*stop-agentmap*") {
            $isAgentMap = $true
        }

        if ($isAgentMap -and $_.ProcessId -ne $ExcludePid -and $_.ProcessId -ne $ExcludeParentPid) {
            $result += $_
        }
    }

    # Find cmd.exe processes that wrap our npm/start scripts
    # Exclude stop-agentmap.bat processes (our own script)
    Get-CimInstance Win32_Process -Filter "Name='cmd.exe'" | ForEach-Object {
        $cmdLine = $_.CommandLine
        $isAgentMap = $false

        if ($cmdLine -like "*npm run dev*" -or $cmdLine -like "*npm run mcp*") {
            $isAgentMap = $true
        }

        # Exclude our own stop script process
        if ($cmdLine -like "*stop-agentmap*") {
            $isAgentMap = $false
        }

        if ($isAgentMap -and $_.ProcessId -ne $ExcludePid -and $_.ProcessId -ne $ExcludeParentPid) {
            $result += $_
        }
    }

    # Find npm processes (npm.cmd -> node.exe, but sometimes shows as npm)
    Get-CimInstance Win32_Process -Filter "Name='npm.exe'" | ForEach-Object {
        $cmdLine = $_.CommandLine
        foreach ($pattern in $patterns) {
            if ($cmdLine -like "*$pattern*") {
                $result += $_
                break
            }
        }
    }

    # Deduplicate by ProcessId
    return $result | Sort-Object ProcessId -Unique
}

# Attempt to kill processes with retry
$maxRetries = 3
$retryDelay = 2

for ($attempt = 1; $attempt -le $maxRetries; $attempt++) {
    $processes = Find-AgentMapProcesses -ExcludePid $currentPid -ExcludeParentPid $parentPid

    if ($processes.Count -eq 0) {
        if (-not $Silent -and $attempt -eq 1) {
            Write-Host "No AgentMap processes found running." -ForegroundColor Yellow
        }
        break
    }

    if (-not $Silent) {
        Write-Host "Attempt ${attempt}/${maxRetries}: Stopping $($processes.Count) AgentMap process(es)..." -ForegroundColor Yellow
        foreach ($proc in $processes) {
            Write-Host "  PID: $($proc.ProcessId) [$($proc.Name)] - $($proc.CommandLine)" -ForegroundColor Gray
        }
    }

    foreach ($proc in $processes) {
        # Kill the process tree (process + all children)
        $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($proc.ProcessId)"
        foreach ($child in $children) {
            try {
                Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue
                if (-not $Silent) {
                    Write-Host "  Killed child PID: $($child.ProcessId) ($($child.Name))" -ForegroundColor DarkGray
                }
            } catch {}
        }

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

    # Wait for processes to fully terminate and ports to be released
    Start-Sleep -Seconds $retryDelay

    # Check if any processes remain
    $remaining = Find-AgentMapProcesses -ExcludePid $currentPid -ExcludeParentPid $parentPid
    if ($remaining.Count -eq 0) {
        if (-not $Silent) {
            Write-Host "All AgentMap processes stopped." -ForegroundColor Green
        }
        break
    }

    if ($attempt -lt $maxRetries) {
        if (-not $Silent) {
            Write-Host "$($remaining.Count) process(es) still running. Retrying in ${retryDelay} seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds $retryDelay
        }
    }
}

# Final verification: check port 3150
Start-Sleep -Seconds 2
$portInUse = Get-NetTCPConnection -LocalPort 3150 -ErrorAction SilentlyContinue
if ($portInUse -and $portInUse.Count -gt 0) {
    # Check if the port is in LISTEN state (truly in use) or just teardown states
    $listenConns = $portInUse | Where-Object { $_.State -eq "Listen" }
    $teardownStates = @("TimeWait", "FinWait1", "FinWait2", "CloseWait", "Closing")
    $teardownConns = $portInUse | Where-Object { $_.State -in $teardownStates }

    # Check if the owning process is still alive
    $pids = $portInUse | ForEach-Object { $_.OwningProcess } | Sort-Object -Unique
    $alivePids = $pids | Where-Object { Get-Process -Id $_ -ErrorAction SilentlyContinue }

    if ($listenConns.Count -gt 0 -and $alivePids.Count -gt 0) {
        if (-not $Silent) {
            Write-Host ""
            Write-Host "WARNING: Port 3150 is still in use by PID(s): $($alivePids -join ', ')" -ForegroundColor Yellow
            Write-Host "  You may need to manually kill these: Stop-Process -Id $($alivePids -join ', ')" -ForegroundColor DarkGray
        }
        exit 1
    } else {
        if (-not $Silent) {
            if ($teardownConns.Count -gt 0 -and $alivePids.Count -eq 0) {
                Write-Host ""
                Write-Host "Port 3150 in teardown state ($($teardownConns[0].State)). Processes killed successfully." -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "Port 3150 is now free." -ForegroundColor Green
            }
            Write-Host ""
            Write-Host "AgentMap stopped successfully!" -ForegroundColor Green
        }
    }
} else {
    if (-not $Silent) {
        Write-Host ""
        Write-Host "Port 3150 is now free." -ForegroundColor Green
        Write-Host ""
        Write-Host "AgentMap stopped successfully!" -ForegroundColor Green
    }
}
