$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath("Desktop")
$Root = "G:\PROJETOS\WEB\AgentMap\scripts"

$StartShortcut = $WshShell.CreateShortcut("$Desktop\AgentMap - Start.lnk")
$StartShortcut.TargetPath = "$Root\start-agentmap.bat"
$StartShortcut.WorkingDirectory = $Root
$StartShortcut.Description = "Start AgentMap Backend + MCP"
$StartShortcut.Save()

$StopShortcut = $WshShell.CreateShortcut("$Desktop\AgentMap - Stop.lnk")
$StopShortcut.TargetPath = "$Root\stop-agentmap.bat"
$StopShortcut.WorkingDirectory = $Root
$StopShortcut.Description = "Stop AgentMap Backend + MCP"
$StopShortcut.Save()

$RestartShortcut = $WshShell.CreateShortcut("$Desktop\AgentMap - Restart.lnk")
$RestartShortcut.TargetPath = "$Root\restart-agentmap.bat"
$RestartShortcut.WorkingDirectory = $Root
$RestartShortcut.Description = "Restart AgentMap Backend + MCP"
$RestartShortcut.Save()

Write-Host "Shortcuts created on Desktop:" -ForegroundColor Green
Write-Host "  - AgentMap - Start.lnk"
Write-Host "  - AgentMap - Stop.lnk"
Write-Host "  - AgentMap - Restart.lnk"
