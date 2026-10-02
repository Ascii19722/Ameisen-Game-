@echo off
rem Ameisen-Sim: holt bei jedem Doppelklick den neuesten Stand von GitHub und startet das Spiel.
rem Der Spielstand bleibt erhalten.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText('%~f0'); $a=$t.IndexOf(':'+':SKRIPT::')+10; $env:AMEISEN_BAT='%~f0'; Invoke-Expression $t.Substring($a)"
if errorlevel 1 pause
exit /b
::SKRIPT::
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$repo = 'Ascii19722/Ameisen-Game-'
$zweig = 'claude/new-session-n7qdgx'
$version = '44.5.1'
$ziel = Join-Path $env:LOCALAPPDATA 'Ameisen-Sim'
$exe = Join-Path $ziel 'Ameisen-Sim.exe'
$tokenDatei = Join-Path $env:LOCALAPPDATA 'Ameisen-Sim-Token.txt'
$neu = Join-Path $env:TEMP 'ameisen-neu.zip'

Write-Host ''
Write-Host '  Ameisen-Sim: hole den neuesten Stand ...' -ForegroundColor Yellow

function Hole($token) {
  $kopf = @{ 'User-Agent' = 'Ameisen-Sim' }
  if ($token) { $kopf['Authorization'] = "Bearer $token" }
  Invoke-WebRequest -Uri "https://api.github.com/repos/$repo/zipball/$zweig" -Headers $kopf -OutFile $neu -UseBasicParsing
}

$token = ''
if (Test-Path $tokenDatei) { $token = (Get-Content $tokenDatei -Raw).Trim() }
try { Hole $token }
catch {
  Write-Host ''
  Write-Host '  Das Projekt ist privat. Einmalig wird ein GitHub-Schluessel (Token) gebraucht:' -ForegroundColor Cyan
  Write-Host '   1. Gleich oeffnet sich GitHub im Browser (vorher ggf. anmelden).'
  Write-Host '   2. Token name: Ameisen-Sim   Expiration: No expiration (oder 1 Jahr)'
  Write-Host '   3. Repository access: "Only select repositories" -> Ameisen-Game- auswaehlen'
  Write-Host '   4. Permissions -> Repository permissions -> Contents: "Read-only"'
  Write-Host '   5. Unten "Generate token" klicken, den Schluessel kopieren'
  Write-Host '   6. Hier ins Fenster einfuegen (Rechtsklick) und Enter druecken'
  Write-Host ''
  Start-Process 'https://github.com/settings/personal-access-tokens/new'
  $token = (Read-Host '  Schluessel').Trim()
  Hole $token
  Set-Content -Path $tokenDatei -Value $token
  Write-Host '  Schluessel gespeichert - beim naechsten Mal geht es ohne.' -ForegroundColor Green
}

# Laeuft das Spiel noch? Dann schliessen (es speichert dabei).
Get-Process -Name 'Ameisen-Sim' -ErrorAction SilentlyContinue | ForEach-Object { $_.CloseMainWindow() | Out-Null }
Start-Sleep -Seconds 1
Get-Process -Name 'Ameisen-Sim' -ErrorAction SilentlyContinue | Stop-Process -Force

if (-not (Test-Path $exe)) {
  $ezip = Join-Path $env:TEMP "electron-v$version-win32-x64.zip"
  Write-Host '  Lade Electron herunter (einmalig, ca. 150 MB) ...'
  Invoke-WebRequest -Uri "https://github.com/electron/electron/releases/download/v$version/electron-v$version-win32-x64.zip" -OutFile $ezip -UseBasicParsing
  if (Test-Path $ziel) { Remove-Item $ziel -Recurse -Force }
  Expand-Archive -Path $ezip -DestinationPath $ziel -Force
  Rename-Item (Join-Path $ziel 'electron.exe') 'Ameisen-Sim.exe'
  Remove-Item $ezip -Force
}

Write-Host '  Spiel wird erneuert ...'
$tmp = Join-Path $env:TEMP 'ameisen-neu'
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
Expand-Archive -Path $neu -DestinationPath $tmp -Force
$quelle = (Get-ChildItem $tmp -Directory | Select-Object -First 1).FullName
$app = Join-Path $ziel 'resources\app'
if (Test-Path $app) { Remove-Item $app -Recurse -Force }
New-Item -ItemType Directory -Path $app | Out-Null
foreach ($teil in 'index.html', 'src', 'tools', 'electron', 'package.json') {
  Copy-Item (Join-Path $quelle $teil) $app -Recurse -Force
}
Remove-Item $tmp -Recurse -Force
Remove-Item $neu -Force

# Verknuepfung zum Spiel und diese Datei auf den Desktop
try {
  $desktop = [Environment]::GetFolderPath('Desktop')
  $shell = New-Object -ComObject WScript.Shell
  $link = $shell.CreateShortcut((Join-Path $desktop 'Ameisen-Sim.lnk'))
  $link.TargetPath = $exe
  $link.WorkingDirectory = $ziel
  $link.Save()
  $hier = Join-Path $desktop 'Ameisen-Sim aktualisieren.bat'
  if ($env:AMEISEN_BAT -ne $hier) { Copy-Item $env:AMEISEN_BAT $hier -Force }
} catch { Write-Host "  (Desktop-Verknuepfung: $($_.Exception.Message))" }

Write-Host ''
Write-Host '  Fertig! Das Spiel startet jetzt.' -ForegroundColor Green
Start-Sleep -Seconds 1
Start-Process $exe
