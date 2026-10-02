# CLAUDE.md – Regeln für dieses Projekt

Ameisen-Sim: Pixel-Art-Ameisenkolonie im Querschnitt. Zum Zuschauen und Chillen,
kein Ziel, kein Game Over. Vorbild für die Optik: @ants.sim, Vorbild für den Spielablauf:
fieldnotes.sim (Details in START.md, Abschnitt "Vorbilder").

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
- `src/sky.js` – Himmel, Sonne/Mond, Sterne, Wolken, Wald, Tageszeit
- `src/render.js` – Zeichnen (Pixel-Art, ein Pixel = eine Zelle, dann hochskaliert)
- `src/main.js` – Start, Spielschleife, Tasten, HUD

## Optik
- Pixel-Art: alles wird erst in kleiner Auflösung (320×180) gezeichnet und dann
  ohne Glättung hochskaliert.
- Querformat, Vollbild am PC.
- Look wie @ants.sim: Bodenschichten mit Sprenkeln, Steine, braune Gänge, runde Kammern,
  lila-oranger Himmel, runder Wald, helle Info-Karte. Farben stehen in `render.js` und `sky.js`.

## Ameisen-Design (vom Nutzer ausgewählt)
- Ameisen von oben, eckig, Pixel-Art mit harten Kanten (Posen werden vorgezeichnet, `render.js`).
- Arbeiterin = Design A11: schwarz, schlank (Hinterleib/Brust 0.85, Kopf 0.9), Beine 1.1, feine Pixel (ANT_RES 4), Größe 1.4.
- Königin = R13 (gewählt): K1-Grundform (schwarz, Größe 2.1, Brust 1.35 breit/1.25 lang, Kopf 1.1,
  Flügelstummel) mit langem Hinterleib (Länge 1.7) aus 5 schwarzen Platten mit breiten, leicht
  gebogenen braunen Fugen (Farbe 96,58,36). Hinterleib vorne abgerundet und hinten rund.
  Zwischen Brust und Hinterleib EIN dicker runder Knoten statt eines dünnen Strichs.
- Soldatin = Nr. 2 aus dem 20er-Bogen = S17: grau-schwarz (52,48,50), Säbel-Kiefer (lang, offen, Spitzen
  nach innen), Größe 1.65, großer Kopf (1.55 breit, 1.3 lang), zwei Knoten, kräftige Beine.
- Pflegerin = P7: grau-schwarz (Körper 52,48,50 / Glanz 112,106,110 / Beine 40,38,40), klein (Größe 1.05, Hinterleib 0.9).
- Junge Königin (Flieger) = P11: schwarz, Größe 1.85, Flügel, zwei Knoten.
- Männchen = P27: grau-schwarz, schlank (Größe 1.45, kleiner Kopf 0.75), Flügel.
- Schwerkraft: Eier, Larven, Kokons (und später Futter), die abgelegt werden, fallen nach unten
  und bleiben auf dem Kammerboden oder aufeinander liegen (rutschen schräg ab wie Sand).
- Brut: Ei = Nr. 2 (cremefarben 244,232,200, oval). Kokon = Nr. 13 (beige, wie fieldnotes). Larve: offen.
- Gang-Stil = G31 (ants.sim-Form, halbdurchsichtiges Braun, Ameisen-Laufspur, Sandkrümel, BRÖCKLIGER Rand
  mit ausgebrochenen Stücken). Gänge größer (ca. 4 Pixel), Kammern größer (ca. 1,4×) und klar umrissen.
  WICHTIG: nichts perfekt rund – Kammern schief und beulig, Boden leicht krumm, Gangbreite schwankt
  (gegraben hat immer Macken). Stil wie „G31 unregelmäßig G9“ (mit Brut am Boden) gefällt.
  Gänge sollen LANG sein: Seitengänge laufen weit hinaus, bevor sie in eine Kammer münden;
  Hauptgang windet sich nach unten. Favorit war L3 (lang, Kammern weit draußen).
- Gänge NICHT vorberechnen (keine festen Bögen/Pläne)! Sie entstehen beim Graben: jede grabende Ameise
  hat eine grobe Wunschrichtung, wackelt zufällig, weicht Steinen aus, zweigt manchmal ab, verbindet
  sich selten mit anderen Gängen, und gräbt am Ende eine Kammer aus vielen kleinen Grab-Bewegungen
  (Boden wird flachgetreten). Siehe Vorschau-Bogen „Selbst gegraben“. Die aktuelle Gangplanung in
  world.js (Zickzack-Plan) muss dafür in Stufe 3 ersetzt werden.
- Bauablauf wie ants.sim (Details: START.md, „Wie die Vorbilder ihre Gänge bauen“): langer Bogen →
  Haken + Königskammer → zweiter Bogen trifft den ersten (Schleife) → Seitenkammern nach außen →
  Stamm mit Ästen nach unten. Gänge halten deutlich Abstand zueinander (Favorit: Bogen „Bild 6
  weiterentwickelt“ Nr. 6). Kammern flach und mehrlappig, oben groß, unten kleiner (echte Nester).
- Vorschau-Bögen werden als HTML im Scratchpad gebaut (Formen-Parameter wie gW, gL, thW, headW, legLen, Farben).
- Dem Nutzer bei Design-Fragen lieber Beispiele zur Auswahl zeigen und Tipps geben.

## Arbeitsweise
- In Stufen bauen (siehe START.md). Pro Stufe nur das, was dazugehört.
- Kleine, saubere Commits. Nach jeder Stufe muss das Spiel lauffähig sein.
- Vor dem Commit im Browser prüfen (keine Fehler in der Konsole).
- Kosten im Blick: knapp arbeiten, nicht unnötig viel umbauen.
