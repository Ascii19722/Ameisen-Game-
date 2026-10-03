# Handoff: Ameisen-Sim (Pixel-Art-Ameisenkolonie im Querschnitt)
_Stand: 2026-10-03 · Zweig `claude/new-session-n7qdgx` · letzter Commit `6b66bce`_

## Ziel
Ein ruhiges Zuschau-Spiel („zum Chillen“, kein Ziel, kein Game Over): Man schaut seitlich ins Erdreich auf eine
Kolonie **Roter Waldameisen**, die von selbst gräbt, Futter holt, Brut großzieht und sich gegen Feinde wehrt.
Läuft im Browser (`index.html` per Doppelklick) und als Windows-.exe (Electron). Arbeitsweise in Stufen
(`START.md`), alle Regeln und Design-Entscheidungen des Nutzers stehen in **`CLAUDE.md` – zuerst lesen**.
Offen sind laut `START.md`: Stufe 6 (Sound) und Rest von Stufe 7 (größere Welt). Danach wünscht der Nutzer sich
inkrementelle Verbesserungen nach Feedback.

## Aktueller Stand
- Arbeitsbaum sauber, alles committet und auf GitHub gepusht. Repo `Ascii19722/Ameisen-Game-` ist **öffentlich**.
- Spiel läuft fehlerfrei (Playwright-Test am 2026-10-03: 60 min Spielzeit, ~150 Ameisen, Feinde, Brut; Bau-Editor →
  „Im Spiel ausprobieren“ → Königin wird gefüttert; keine Konsolenfehler).
- Fertig: große Welt mit Zoom/Kamera, Seitenansicht-Sprites (Arbeiterin, Königin, Soldatin, Pflegerin, Räuber, Spinne),
  Graben ohne Vorberechnung (Bauplan aus Neigungen, Steine erst bei Berührung), Steinplatten an Schichtgrenzen,
  gleich große ovale Kammern (32×16, Königskammer 46×22), Königin liegt still auf halber Höhe, Brut-Kreislauf,
  Futter von Pflanzen, Beute gemeinsam tragen, Abfall, Brut nach Wärme, Feinde (Spinne, schwarze Räuber), Kampf,
  mehrere Eingänge, Nadelhügel, Speichern (localStorage), „Neue Kolonie“, Zeitraffer 1×–100×, Bau-Editor.
- `Ideen-Chat-Prompt.md`: Prompt, den der Nutzer in einem **separaten Ideen-Chat** (ohne Programmieren) zum
  Spielprinzip nutzt. Ergebnisse von dort bringt er evtl. als fertigen Aufgaben-Text zurück.
- Junge Königin (P11) und Männchen (P27) gibt es nur als Design (von oben), **nicht im Spiel**.
- Der Ordner „Ameisen-Bilder“ (PNG/GIF-Export der Sprites) wurde dem Nutzer als ZIP geschickt, zeigt aber noch die
  **alten schwarzen** Farben; liegt nicht im Repo.

## Wichtige Dateien & Befehle
- `CLAUDE.md` – Regeln + alle Nutzer-Entscheidungen (Designs, Graberegeln, Kammergrößen, Art). Bei neuen Wünschen ergänzen.
- `START.md` – Stufenplan, Vorbild-Analyse (ants.sim, fieldnotes.sim, Tschinkel), Prompt für nächste Stufe.
- `src/world.js` – Raster, Graben (`planStep`, `digStep`, `bite`), Kammern (`roomBlobs`, `startRoom`), Bauplan
  (`updatePlan`, Konstanten in `PLAN`), Steinplatten (`makePlates`), Hügel (`placeOneGrain`).
- `src/colony.js` – Königin, Brut, Futter, Kammer-Aufgaben, Jobs der Arbeiterinnen (`colonyTask`), Beute, Abfall.
- `src/ants.js` – Wegfindung (BFS, `isWalkable`), Entscheidungen (`decide`, `queenDecide`, `soldierDecide`), Bewegung.
- `src/enemies.js` – Spinne, Räuber, Kampf (`antCombat`). `src/sprites.js` – alle Sprites, Farben (`RUFA`).
- `src/render.js`, `src/sky.js`, `src/main.js` (Schleife, HUD, Tasten), `src/save.js` (Speichern/Laden).
- `tools/bau-editor.html` – Bau-Editor, nutzt die `src/`-Dateien; im Spiel über Knopf „BAU-EDITOR“.
- Starten: `index.html` im Browser öffnen. Kein Build, kein npm.
- Testen: Es gibt keine Testsuite im Repo. Bewährt: Playwright (global installiert, `require(execSync('npm root -g') + '/playwright')`)
  mit `file:///…/index.html`, dann `sim.step(1/30)` in einer Schleife über `window.sim` und Screenshot; auf `pageerror` achten.
- **Auslieferung an den Nutzer:** Nach jeder Änderung `git push -u origin claude/new-session-n7qdgx`. Der Nutzer
  doppelklickt dann `Ameisen-Sim aktualisieren.bat` auf seinem Desktop (lädt den Zweig als ZIP von GitHub, ersetzt
  `%LOCALAPPDATA%\Ameisen-Sim\resources\app`, Spielstand bleibt). Ohne Push bekommt er nichts.
- Alternativ: `./build-update-bat.sh <ausgabeordner>` baut eine eigenständige Update-.bat (Spiel als Base64 darin).

## Was funktioniert hat
- Graben „Krümel für Krümel“ nur an offenen Gangwänden (`bite`) – der Nutzer lehnt Gänge ab, die „aus dem Nichts“ entstehen.
- Zufällige Auswahl von Jobs (`pickRandom` in `colony.js`) statt „immer das erste“ – sonst blockiert ein unerreichbares Teil alles.
- Ameisen dürfen bis 2 Pixel von der Wand laufen (`isWalkable`), sonst umrunden sie jede Nische.
- Baustellen ohne Fortschritt werden nach 150 s aufgegeben; Königskammer wird dann am Schachtende neu angelegt (nie aufgegeben).
- Zeitraffer: max. 16 Rechenschritte pro Bild, darüber größere Schritte.
- Update über öffentliches GitHub-ZIP – funktioniert ohne Token (Repo ist öffentlich).

## Was nicht funktioniert hat
- Vorberechnete Gangformen (fester Bogen) – vom Nutzer abgelehnt („Ameisen sollen selbst graben“).
- Röntgenblick (Ameisen weichen Steinen vorher aus) – abgelehnt.
- Königin tief unten / Umzug in tiefere Kammer – Nutzer will sie auf halber Höhe; Umzug ist im Code, aber aus (`PLAN.royalMoves = 0`).
- Steile Sandpyramide als Hügel – zu groß; jetzt flach (ca. 1/8 des Aushubs, sanftes Abrutschen).
- Futter-Ziel hart an Kammergröße gekoppelt – Kolonie verhungerte; jetzt `max(Bedarf, 50 % Kapazität)`.
- Fertige .exe als Datei schicken – zu groß (151 MB) für Upload und GitHub; deshalb die Update-.bat.
- Direkt auf den Desktop des Nutzers schreiben – geht nicht (Cloud-Umgebung ohne Zugriff auf seinen PC).

## Nächste Schritte
1. Auf neue Wünsche des Nutzers warten; vorher `CLAUDE.md` lesen. Bei Design-Fragen erst Vorschau-Bilder mit
   mehreren Varianten zeigen (Nutzer wählt gern aus vielen Beispielen), dann bauen.
2. Falls der Nutzer Ergebnisse aus dem Ideen-Chat bringt: als Aufgabenliste umsetzen, `CLAUDE.md`/`START.md` ergänzen.
3. Offen laut `START.md`: Stufe 6 Sound (Web-Audio-API, keine Dateien aus dem Netz, Lautstärke-Knopf).
4. Angebotene, vom Nutzer noch nicht beantwortete Optionen: Duftspuren/Ameisenstraßen; Soldatinnen durch
   Ameisensäure-spritzende große Arbeiterinnen ersetzen (realistischer für Waldameisen); „Ameisen-Bilder“ in
   Waldameisen-Farben neu exportieren; Ameisen-Symbol für die .exe.
5. Nach jeder Änderung: im Browser per Playwright prüfen (keine Konsolenfehler), committen (deutsche Commit-Nachricht), pushen,
   dem Nutzer sagen, dass er „Ameisen-Sim aktualisieren“ doppelklicken soll.

## Offene Fragen
- Spielprinzip: Bleibt es reines Zuschauen oder soll der Spieler eingreifen können? Wird im Ideen-Chat geklärt.
- Soll die Soldatin (S17, Säbel-Kiefer) bleiben, obwohl echte Waldameisen keine haben? Bisher: bleibt.
- Nest wird mit der Wegfindungs-Änderung sehr dicht (12–20 Kammern nach 80 min); Nutzer hat dazu noch nichts gesagt.
