param(
    [switch]$Silent,
    [switch]$Help
)

if ($Help) {
    Write-Host "AgentMap Starter"
    Write-Host "Usage: .\start-agentmap.ps1 [-Silent]"
    Write-Host "Starts both the AgentMap backend (port 3150) and MCP server."
    exit 0
}

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "..\backend"
$backendDir = Resolve-Path $backendDir

if (-not $Silent) {
    Write-Host "=== AgentMap Starter ===" -ForegroundColor Cyan
    Write-Host ""
}

if (-not (Test-Path $backendDir)) {
    if (-not $Silent) {
        Write-Host "ERROR: Backend directory not found at $backendDir" -ForegroundColor Red
    }
    exit 1
}

if (-not (Test-Path (Join-Path $backendDir "node_modules"))) {
    if (-not $Silent) {
        Write-Host "WARNING: node_modules not found. Running npm install..." -ForegroundColor Yellow
    }
    Set-Location $backendDir
    npm install
    if ($LASTEXITCODE -ne 0) {
        if (-not $Silent) {
            Write-Host "ERROR: npm install failed" -ForegroundColor Red
        }
        exit 1
    }
}

if (-not $Silent) {
    Write-Host "Stopping existing AgentMap processes..." -ForegroundColor Yellow
}
$stopScript = Join-Path $root "stop-agentmap.ps1"
if (Test-Path $stopScript) {
    & $stopScript -Silent
    Start-Sleep -Seconds 2
}

$logsDir = Join-Path $root "..\logs"
if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

if (-not $Silent) {
    Write-Host "Starting backend server on http://localhost:3150" -ForegroundColor Green
}

$backendLog = Join-Path $logsDir "backend.log"
$mcpLog = Join-Path $logsDir "mcp.log"

Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev > `"$backendLog`" 2>&1" -WorkingDirectory $backendDir -WindowStyle Normal

if (-not $Silent) {
    Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
}
$maxRetries = 30
$retry = 0
while ($retry -lt $maxRetries) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3150/api/status" -Method GET -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            if (-not $Silent) {
                Write-Host "Backend started successfully!" -ForegroundColor Green
            }
            break
        }
    } catch {
        Start-Sleep -Seconds 1
        $retry++
    }
}

if ($retry -ge $maxRetries) {
    if (-not $Silent) {
        Write-Host "WARNING: Backend did not respond within timeout, but process may still be starting..." -ForegroundColor Yellow
    }
}

if (-not $Silent) {
    Write-Host "Starting MCP server..." -ForegroundColor Green
}
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run mcp >> `"$mcpLog`" 2>&1" -WorkingDirectory $backendDir -WindowStyle Normal

if (-not $Silent) {
    Write-Host ""
    Write-Host "=== AgentMap Started ===" -ForegroundColor Green
    Write-Host "Backend:  http://localhost:3150" -ForegroundColor Cyan
    Write-Host "MCP:      stdio (connected to Kilo)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To stop: Run .\scripts\stop-agentmap.ps1" -ForegroundColor Yellow
}

if (-not $Silent) {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:3150/index.html"
}
