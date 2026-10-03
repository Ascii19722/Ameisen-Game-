'use strict';

// Futterpflanzen an der Oberfläche. Jede Pflanze kann eigene Bilder (PNG) bekommen, siehe bilder/LIESMICH.txt.
// Ohne Bilder wird die eingebaute Pixel-Pflanze gezeichnet (nur bei „eingebaut: true“). Eine neue Pflanze
// ohne eingebaute Zeichnung erscheint erst im Spiel, wenn Bilder für sie da sind.
//
// Felder:
//   name     Anzeigename
//   woerter  Suchwörter im Datei- oder Ordnernamen
//   futter   was die Ameisen davon abschneiden: 'leaf' (Blattstück), 'petal' (Blütenblatt), 'seed' (Samen)
//   menge    so viele Stücke trägt eine Pflanze [mindestens, höchstens]
//   hoehe    so viele Welt-Pixel ist ein Bild hoch (ganzes Bild inkl. Rand; Füße/Wurzel = unterer Bildrand)
//   tempo    Bilder pro Sekunde, wenn die Pflanze mehrere Bilder hat (z. B. Wiegen im Wind)
//   eingebaut  true = es gibt eine eingebaute Zeichnung (render.js, drawSources)
//
// Zustände (im Dateinamen): voll / halb / leer – je nachdem, wie viel Futter noch dran ist.
const PFLANZEN = {
  plant: { name: 'Blattpflanze', woerter: ['blattpflanze', 'blatt', 'blaetter', 'leaf', 'leaves'], futter: 'leaf', menge: [6, 14], hoehe: 20, tempo: 4, eingebaut: true },
  flower: { name: 'Blume', woerter: ['blume', 'bluete', 'flower', 'blossom'], futter: 'petal', menge: [6, 14], hoehe: 24, tempo: 4, eingebaut: true },
  seeds: { name: 'Gras mit Samen', woerter: ['gras', 'samen', 'aehre', 'grass', 'seed', 'seeds'], futter: 'seed', menge: [6, 14], hoehe: 18, tempo: 4, eingebaut: true },
};

const ZUSTAENDE = {
  voll: { name: 'voll', woerter: ['voll', 'full', 'gross', 'ganz'] },
  halb: { name: 'halb', woerter: ['halb', 'half', 'mittel'] },
  leer: { name: 'fast leer', woerter: ['leer', 'kahl', 'wenig', 'empty', 'abgefressen'] },
};

// Allgemeine Wörter, an denen man eine Pflanze erkennt (falls keine bestimmte Pflanze im Namen steht)
const PFLANZEN_WOERTER = ['pflanze', 'pflanzen', 'plant', 'plants', 'flora'];
