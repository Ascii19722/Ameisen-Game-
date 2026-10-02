#!/bin/sh
# Baut EINE .bat-Datei, in der das ganze Spiel steckt (als Base64-ZIP).
# Doppelklick unter Windows: installiert oder aktualisiert die Ameisen-Sim (Spielstand bleibt erhalten).
set -e
OUT=${1:-dist}
mkdir -p "$OUT"
TMP=$(mktemp -d)
zip -qr "$TMP/spiel.zip" index.html src tools electron package.json
BAT="$OUT/Ameisen-Sim-Update.bat"
{
  cat <<'KOPF'
@echo off
rem Ameisen-Sim installieren oder aktualisieren: einfach doppelklicken.
rem Der Spielstand bleibt erhalten. Das Spiel steckt unten in dieser Datei.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText('%~f0'); $a=$t.IndexOf(':'+':SKRIPT::')+10; $b=$t.IndexOf(':'+':DATEN::'); $env:AMEISEN_BAT='%~f0'; Invoke-Expression $t.Substring($a,$b-$a)"
pause
exit /b
::SKRIPT::
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$version = '44.5.1'
$ziel = Join-Path $env:LOCALAPPDATA 'Ameisen-Sim'
$exe = Join-Path $ziel 'Ameisen-Sim.exe'
Write-Host ''
Write-Host '  Ameisen-Sim wird installiert / aktualisiert ...' -ForegroundColor Yellow
Write-Host ''
# Laeuft das Spiel noch? Dann schliessen (es speichert dabei).
Get-Process -Name 'Ameisen-Sim' -ErrorAction SilentlyContinue | ForEach-Object { $_.CloseMainWindow() | Out-Null }
Start-Sleep -Seconds 2
Get-Process -Name 'Ameisen-Sim' -ErrorAction SilentlyContinue | Stop-Process -Force
if (-not (Test-Path $exe)) {
  $zip = Join-Path $env:TEMP "electron-v$version-win32-x64.zip"
  Write-Host '  Lade Electron herunter (einmalig, ca. 150 MB) ...'
  Invoke-WebRequest -Uri "https://github.com/electron/electron/releases/download/v$version/electron-v$version-win32-x64.zip" -OutFile $zip
  Write-Host '  Entpacke Electron ...'
  if (Test-Path $ziel) { Remove-Item $ziel -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $ziel -Force
  Rename-Item (Join-Path $ziel 'electron.exe') 'Ameisen-Sim.exe'
  Remove-Item $zip -Force
}
Write-Host '  Spiel wird erneuert ...'
$t = [IO.File]::ReadAllText($env:AMEISEN_BAT)
$daten = $t.Substring($t.IndexOf(':' + ':DATEN::') + 9)
$spiel = Join-Path $env:TEMP 'ameisen-spiel.zip'
[IO.File]::WriteAllBytes($spiel, [Convert]::FromBase64String($daten.Trim()))
$app = Join-Path $ziel 'resources\app'
if (Test-Path $app) { Remove-Item $app -Recurse -Force }
Expand-Archive -Path $spiel -DestinationPath $app -Force
Remove-Item $spiel -Force
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut((Join-Path $desktop 'Ameisen-Sim.lnk'))
$link.TargetPath = $exe
$link.WorkingDirectory = $ziel
$link.Save()
Write-Host ''
Write-Host '  Fertig! Das Spiel startet jetzt. Auf dem Desktop liegt "Ameisen-Sim".' -ForegroundColor Green
Write-Host ''
Start-Process $exe
KOPF
  echo '::DATEN::'
  base64 -w 76 "$TMP/spiel.zip"
} | sed 's/$/\r/' > "$BAT"
rm -rf "$TMP"
echo "Fertig: $BAT"
