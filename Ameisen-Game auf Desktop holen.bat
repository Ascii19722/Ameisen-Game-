@echo off
rem Holt das Ameisen-Game-Projekt (Quellcode) auf den Desktop in den Ordner "Ameisen-Game",
rem damit man dort mit Claude Code (Desktop-App) weiterarbeiten kann.
rem Ist der Ordner schon da, wird er auf den neuesten Stand gebracht.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText('%~f0'); $a=$t.IndexOf(':'+':SKRIPT::')+10; Invoke-Expression $t.Substring($a)"
pause
exit /b
::SKRIPT::
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$repo = 'https://github.com/Ascii19722/Ameisen-Game-.git'
$zweig = 'claude/new-session-n7qdgx'
$ziel = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Ameisen-Game'
Write-Host ''
Write-Host '  Ameisen-Game: Projekt auf den Desktop holen' -ForegroundColor Yellow
Write-Host "  Ziel: $ziel"
Write-Host ''

$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
  Write-Host '  Git ist nicht installiert. Claude Code braucht Git zum Speichern (Commit/Push).' -ForegroundColor Cyan
  Write-Host '  Versuche Git automatisch zu installieren (winget) ...'
  try {
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
    $git = Get-Command git -ErrorAction SilentlyContinue
  } catch { }
  if (-not $git) {
    Write-Host ''
    Write-Host '  Bitte Git von https://git-scm.com/download/win installieren und diese Datei nochmal starten.' -ForegroundColor Red
    Start-Process 'https://git-scm.com/download/win'
    exit 1
  }
}

if (Test-Path (Join-Path $ziel '.git')) {
  Write-Host '  Ordner gibt es schon - hole den neuesten Stand ...'
  git -C $ziel fetch origin $zweig
  git -C $ziel checkout $zweig
  git -C $ziel pull --ff-only origin $zweig
} elseif (Test-Path $ziel) {
  # Ordner da, aber ohne Git (z. B. nur Bilder drin): Inhalt behalten, Projekt hineinholen
  if (Get-ChildItem $ziel -Force | Where-Object { $_.Name -ne 'bilder' }) {
    Write-Host "  Den Ordner $ziel gibt es schon, und er enthaelt andere Dateien." -ForegroundColor Red
    Write-Host '  Bitte umbenennen oder verschieben und diese Datei nochmal starten (nichts wurde geaendert).'
    exit 1
  }
  git -C $ziel init -q
  git -C $ziel remote add origin $repo
  git -C $ziel fetch origin $zweig
  git -C $ziel checkout -b $zweig --track "origin/$zweig"
} else {
  git clone --branch $zweig $repo $ziel
}

Write-Host ''
Write-Host '  Fertig!' -ForegroundColor Green
Write-Host '  So geht es weiter:'
Write-Host '   1. Claude Code (Desktop-App) oeffnen und den Ordner "Ameisen-Game" auf dem Desktop auswaehlen.'
Write-Host '   2. Als erste Nachricht schreiben:  Lies HANDOFF.md'
Write-Host '   Spiel ausprobieren: index.html im Ordner doppelklicken.'
Start-Process explorer.exe $ziel
