param(
    [switch]$Silent,
    [switch]$Help
)

if ($Help) {
    Write-Host "AgentMap Starter"
    Write-Host "Usage: .\start-agentmap.ps1 [-Silent]"
    Write-Host "Starts the AgentMap backend on port 3150 and opens the browser."
    exit 0
}

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root "..\backend"
if (Test-Path $backendDir) { $backendDir = (Resolve-Path $backendDir).Path }

$port = 3150
$healthUrl = "http://localhost:$port/api/status"
$appUrl = "http://localhost:$port/index.html"

if (-not $Silent) {
    Write-Host "=== AgentMap - Iniciando Servidor ===" -ForegroundColor Cyan
    Write-Host ""
}

# 1) Stop existing processes
if (-not $Silent) { Write-Host "[1/4] Parando processos anteriores..." -ForegroundColor Yellow }
& "$root\stop-agentmap.ps1" -Silent >$null 2>&1
Start-Sleep -Seconds 2

# 2) Verify backend directory
if (-not (Test-Path $backendDir)) {
    Write-Host "ERRO: Backend directory not found: $backendDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $backendDir "node_modules"))) {
    if (-not $Silent) { Write-Host "WARNING: node_modules not found. Running npm install..." -ForegroundColor Yellow }
    Push-Location $backendDir
    npm install
    Pop-Location
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: npm install falhou." -ForegroundColor Red
        exit 1
    }
}

# 3) Start backend
if (-not $Silent) { Write-Host "[2/4] Iniciando backend (npm run dev)..." -ForegroundColor Green }
Push-Location $backendDir
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory $backendDir -WindowStyle Normal
Pop-Location

# 4) Wait for server to be ready
if (-not $Silent) { Write-Host "[3/4] Aguardando servidor iniciar..." -ForegroundColor Yellow }

$maxTries = 60
$ready = $false
for ($i = 0; $i -lt $maxTries; $i++) {
    try {
        $r = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
        if ($r.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 2
}

if (-not $ready) {
    Write-Host "ERRO: Servidor nao respondeu apos $maxTries tentativas." -ForegroundColor Red
    exit 1
}

# 5) Open browser
if (-not $Silent) {
    Write-Host "[4/4] Abrindo navegador..." -ForegroundColor Green
    Start-Sleep -Seconds 1
    Start-Process $appUrl
    Write-Host ""
    Write-Host "=== AgentMap iniciado com sucesso! ===" -ForegroundColor Green
    Write-Host "  Backend:  http://localhost:$port" -ForegroundColor Cyan
    Write-Host "  App:      $appUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para parar: .\scripts\stop-agentmap.bat" -ForegroundColor Yellow
}

exit 0
