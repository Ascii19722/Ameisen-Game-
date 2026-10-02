# CLAUDE.md – Regeln für dieses Projekt

Ameisen-Sim: Pixel-Art-Ameisenkolonie im Querschnitt. Zum Zuschauen und Chillen,
kein Ziel, kein Game Over. Vorbild für die Optik: @ants.sim (Referenz-Frames in `referenz/`).

## Sprache
- Antworten, Kommentare im Code und Commit-Nachrichten auf Deutsch.
- Erklärungen kurz und für Nicht-Profis verständlich.

## Technik
- Reines HTML + JavaScript + Canvas. Kein Framework, kein Build-Schritt, kein npm nötig.
- `index.html` muss per Doppelklick im Browser laufen (`file://`). Darum klassische
  `<script>`-Dateien statt ES-Module.
- Später wird daraus eine .exe (Electron, Stufe 7). Nichts einbauen, was das verhindert.
- Bis ca. 1000 Ameisen sollen flüssig laufen. Keine Arbeit pro Ameise, die mit der
  Weltgröße wächst, wenn es sich vermeiden lässt.

## Aufbau
- `index.html` – Seite und Canvas
- `src/world.js` – Sandraster, Oberfläche, Tunnelplanung
- `src/ants.js` – Ameisen: Wegfindung, Graben, Sand tragen
- `src/render.js` – Zeichnen (Pixel-Art, ein Pixel = eine Zelle, dann hochskaliert)
- `src/main.js` – Start, Spielschleife, Tasten, HUD

## Optik
- Pixel-Art: alles wird erst in kleiner Auflösung (320×180) gezeichnet und dann
  ohne Glättung hochskaliert.
- Querformat, Vollbild am PC.
- Farben an den Referenz-Frames orientieren (warmer Sand, dunklere Tunnel, schwarze Ameisen).

## Arbeitsweise
- In Stufen bauen (siehe START.md). Pro Stufe nur das, was dazugehört.
- Kleine, saubere Commits. Nach jeder Stufe muss das Spiel lauffähig sein.
- Vor dem Commit im Browser prüfen (keine Fehler in der Konsole).
- Kosten im Blick: knapp arbeiten, nicht unnötig viel umbauen.
