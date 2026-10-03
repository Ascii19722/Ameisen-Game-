@echo off
rem Schreibt die Liste der Bilder im Ordner "bilder" nach bilder\liste.js.
rem Nur fuer das Spiel im Browser noetig - das Programm (.exe) findet die Bilder selbst.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$t=[IO.File]::ReadAllText('%~f0'); $a=$t.IndexOf(':'+':SKRIPT::')+10; $env:AMEISEN_ORDNER='%~dp0'; Invoke-Expression $t.Substring($a)"
pause
exit /b
::SKRIPT::
$ErrorActionPreference = 'Stop'
$b = Join-Path $env:AMEISEN_ORDNER 'bilder'
if (-not (Test-Path $b)) { New-Item -ItemType Directory -Path $b | Out-Null }
$b = (Resolve-Path $b).Path
$zeilen = @(Get-ChildItem $b -Recurse -File -Filter *.png | Sort-Object FullName | ForEach-Object {
  '  ' + (ConvertTo-Json ($_.FullName.Substring($b.Length + 1) -replace '\\', '/'))
})
$text = "// Automatisch erstellt von 'Bilderliste erstellen.bat'`r`nwindow.BILDER_LISTE = [`r`n" + ($zeilen -join ",`r`n") + "`r`n];`r`n"
[IO.File]::WriteAllText((Join-Path $b 'liste.js'), $text, (New-Object Text.UTF8Encoding $false))
Write-Host ''
Write-Host ('  ' + $zeilen.Count + ' Bilder in bilder\liste.js eingetragen.') -ForegroundColor Green
