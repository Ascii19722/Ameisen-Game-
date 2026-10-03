'use strict';
// Läuft im Programm (.exe) vor dem Spiel: sucht eigene Bilder (PNG) in diesen Ordnern und gibt die
// Liste ans Spiel weiter (window.ameisenBilder, siehe src/bilder.js):
//   • Bilder\Ameisen-Game  (der Bilder-Ordner von Windows)
//   • Desktop\Ameisen-Game\bilder
//   • der Ordner „bilder“ im Spiel selbst
const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const MAX_DATEIEN = 5000;

function sammeln(ordner, unter, out, tiefe) {
  let eintraege;
  try { eintraege = fs.readdirSync(path.join(ordner, unter), { withFileTypes: true }); } catch (e) { return; }
  for (const e of eintraege) {
    if (out.length >= MAX_DATEIEN) return;
    const rel = unter ? unter + '/' + e.name : e.name;
    if (e.isDirectory() && tiefe < 5) sammeln(ordner, rel, out, tiefe + 1);
    else if (e.isFile() && /\.png$/i.test(e.name)) out.push(rel);
  }
}

function liste() {
  const p = ipcRenderer.sendSync('ameisen-pfade');
  const orte = [
    { name: 'Bilder\\Ameisen-Game', pfad: path.join(p.pictures, 'Ameisen-Game') },
    { name: 'Desktop\\Ameisen-Game\\bilder', pfad: path.join(p.desktop, 'Ameisen-Game', 'bilder') },
    { name: 'Spiel-Ordner bilder', pfad: path.join(p.app, 'bilder') },
  ];
  const quellen = [], dateien = [];
  for (const o of orte) {
    const gefunden = [];
    sammeln(o.pfad, '', gefunden, 0);
    quellen.push({ name: o.name, pfad: o.pfad, anzahl: gefunden.length });
    for (const d of gefunden) dateien.push({ datei: d, quelle: o.name, url: pathToFileURL(path.join(o.pfad, d)).href });
  }
  return { quellen, dateien };
}

contextBridge.exposeInMainWorld('ameisenBilder', { liste });
