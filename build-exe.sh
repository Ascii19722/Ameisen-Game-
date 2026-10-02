#!/bin/sh
# Baut die Windows-Version (Ordner mit Ameisen-Sim.exe) als ZIP – ohne npm install.
# Lädt dazu das fertige Electron für Windows herunter und legt das Spiel hinein.
set -e
VERSION=44.5.1
OUT=${1:-dist}
ZIP=electron-v$VERSION-win32-x64.zip
mkdir -p "$OUT"
[ -f "$OUT/$ZIP" ] || curl -L -o "$OUT/$ZIP" "https://github.com/electron/electron/releases/download/v$VERSION/$ZIP"
rm -rf "$OUT/Ameisen-Sim"
mkdir -p "$OUT/Ameisen-Sim"
unzip -q "$OUT/$ZIP" -d "$OUT/Ameisen-Sim"
mv "$OUT/Ameisen-Sim/electron.exe" "$OUT/Ameisen-Sim/Ameisen-Sim.exe"
APP="$OUT/Ameisen-Sim/resources/app"
mkdir -p "$APP"
cp -r index.html src electron package.json "$APP/"
rm -f "$OUT/Ameisen-Sim-Windows.zip"
(cd "$OUT" && zip -qr Ameisen-Sim-Windows.zip Ameisen-Sim)
echo "Fertig: $OUT/Ameisen-Sim-Windows.zip"
