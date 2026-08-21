param(
    [switch]$Help
)

if ($Help) {
    Write-Host "AgentMap Shortcut Creator"
    Write-Host "Usage: .\create-shortcuts.ps1"
    Write-Host "Creates Start, Stop, and Restart shortcuts on the Windows desktop."
    exit 0
}

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Desktop = [System.Environment]::GetFolderPath("Desktop")

if (-not $Desktop) {
    Write-Host "ERROR: Could not determine Desktop path." -ForegroundColor Red
    exit 1
}

$shortcuts = @(
    @{ Name = "AgentMap - Start.lnk";    Target = "start-agentmap.bat";    Desc = "Iniciar AgentMap Backend + MCP" },
    @{ Name = "AgentMap - Stop.lnk";     Target = "stop-agentmap.bat";     Desc = "Parar todos os processos do AgentMap" },
    @{ Name = "AgentMap - Restart.lnk";  Target = "restart-agentmap.bat";  Desc = "Reiniciar AgentMap Backend" }
)

$WshShell = New-Object -ComObject WScript.Shell
$created = 0

foreach ($sc in $shortcuts) {
    $targetPath = Join-Path $Root $sc.Target
    if (-not (Test-Path $targetPath)) {
        Write-Host "WARNING: Target not found: $targetPath" -ForegroundColor Yellow
        continue
    }

    $shortcut = $WshShell.CreateShortcut((Join-Path $Desktop $sc.Name))
    $shortcut.TargetPath = $targetPath
    $shortcut.WorkingDirectory = $Root
    $shortcut.Description = $sc.Desc
    $shortcut.Save()

    if (Test-Path (Join-Path $Desktop $sc.Name)) {
        Write-Host "  Created: $($sc.Name)" -ForegroundColor Green
        $created++
    } else {
        Write-Host "  FAILED:  $($sc.Name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Shortcuts created on Desktop: $created/$($shortcuts.Count)" -ForegroundColor Green
Write-Host "  - AgentMap - Start.lnk    (Inicia o servidor)"
Write-Host "  - AgentMap - Stop.lnk     (Para todos os processos)"
Write-Host "  - AgentMap - Restart.lnk  (Para e reinicia)"
