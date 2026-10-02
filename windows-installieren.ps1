# Ameisen-Sim für Windows installieren
# Lädt Electron (das Programm-Gerüst, ca. 150 MB) herunter, legt das Spiel hinein
# und erstellt eine Verknüpfung "Ameisen-Sim" auf dem Desktop.
# Nochmal ausführen = Spiel aktualisieren (der Spielstand bleibt erhalten).
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # macht den Download viel schneller
$version = '44.5.1'
$quelle = $PSScriptRoot
$ziel = Join-Path $env:LOCALAPPDATA 'Ameisen-Sim'
$exe = Join-Path $ziel 'Ameisen-Sim.exe'

Write-Host ''
Write-Host '  Ameisen-Sim wird installiert ...' -ForegroundColor Yellow
Write-Host ''

if (-not (Test-Path $exe)) {
  $zip = Join-Path $env:TEMP "electron-v$version-win32-x64.zip"
  Write-Host '  1/3  Lade Electron herunter (ca. 150 MB, dauert etwas) ...'
  Invoke-WebRequest -Uri "https://github.com/electron/electron/releases/download/v$version/electron-v$version-win32-x64.zip" -OutFile $zip
  Write-Host '  2/3  Entpacke ...'
  if (Test-Path $ziel) { Remove-Item $ziel -Recurse -Force }
  Expand-Archive -Path $zip -DestinationPath $ziel -Force
  Rename-Item (Join-Path $ziel 'electron.exe') 'Ameisen-Sim.exe'
  Remove-Item $zip -Force
} else {
  Write-Host '  1/3  Electron ist schon da, nur das Spiel wird erneuert.'
  Write-Host '  2/3  -'
}

Write-Host '  3/3  Kopiere das Spiel und lege die Verknüpfung auf den Desktop ...'
$app = Join-Path $ziel 'resources\app'
if (Test-Path $app) { Remove-Item $app -Recurse -Force }
New-Item -ItemType Directory -Path $app | Out-Null
foreach ($teil in 'index.html', 'src', 'tools', 'electron', 'package.json') {
  Copy-Item (Join-Path $quelle $teil) $app -Recurse -Force
}

$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut((Join-Path $desktop 'Ameisen-Sim.lnk'))
$link.TargetPath = $exe
$link.WorkingDirectory = $ziel
$link.Description = 'Ameisen-Sim'
$link.Save()

Write-Host ''
Write-Host '  Fertig! Auf dem Desktop liegt jetzt "Ameisen-Sim".' -ForegroundColor Green
Write-Host ''
Start-Process $exe
