# Handoff: Ameisen-Sim (Pixel-Art-Ameisenkolonie im Querschnitt)
_Stand: 2026-10-03 · Zweig `claude/new-session-n7qdgx` (Arbeitszweig ab jetzt) · letzter Code-Commit `3bc4fa9`_

## Ziel
Ein ruhiges Zuschau-Spiel („zum Chillen“, kein Ziel, kein Game Over): Man schaut seitlich ins Erdreich auf
Ameisenkolonien, die selbst graben, Futter holen, Brut großziehen und sich wehren. Läuft im Browser
(`index.html` per Doppelklick) und als Windows-.exe (Electron). **Zuerst `CLAUDE.md` lesen** – dort stehen alle
Regeln und Design-Entscheidungen des Nutzers (Deutsch, Nicht-Profi, Erklärungen einfach halten).
Großes Ausbau-Ziel des Nutzers: **Open World mit mehreren Kolonien verschiedener Arten gleichzeitig**
(Feuerameise, Honigameise, Bullet-Ameise …), Ameisen und Pflanzen zeichnet er selbst in Claude Design als PNGs.

## Aktueller Stand
- Der Nutzer arbeitet ab jetzt lokal auf seinem Windows-Desktop mit der Claude-Code-Desktop-App im Ordner
  `Desktop\Ameisen-Game` (Git-Klon, angelegt von `Ameisen-Game auf Desktop holen.bat`). Weiter auf dem Zweig
  `claude/new-session-n7qdgx` committen und pushen – genau diesen Zweig lädt seine `Ameisen-Sim aktualisieren.bat`.
  (`claude/loving-clarke-blnrn1` ist eine alte Cloud-Arbeitskopie mit identischem Stand, nicht mehr benutzen.)
- Spiel läuft fehlerfrei (Playwright-Test 2026-10-03: 60 min Spielzeit, Speichern/Laden, Neue Kolonie, Bau-Editor,
  Bilder-Prüfer – keine Konsolenfehler). Arbeitsbaum sauber.
- Fertig in dieser Runde:
  - **Aufräumen**: doppelter Sprite-Code zu `pixelate()` (src/sprites.js) zusammengefasst, Startwerte
    (`world.time/moves/entrances`, `colony.foodCap/capTimer/buryCheck`) sauber angelegt.
  - **Leistung**: Laufkarte `walkMap` in src/ants.js (nur bei `markDirty` neu berechnet), Aufgaben werden in
    `colony.jobs` mitgezählt, Grabstellen-Belegung `tip.ants`, `orient()` rechnet nur bei Feldwechsel.
    Gemessen bei ~690 Ameisen: 1,10 → 0,61 ms pro Rechenschritt. Bildschirm-Auflösung auf Full-HD-Pixelmenge
    begrenzt (`pxScale` in src/main.js), tagsüber keine Extra-Ebene für Ameisen (src/render.js `render`).
    **Taste I** zeigt Bilder/s, Rechen- und Zeichenzeit.
  - **Bilder-Fundament**: src/arten.js, src/pflanzen.js, src/bilder.js, tools/bilder-pruefer.html (Knopf „BILDER“),
    electron/preload.js. Jede Ameise hat `a.art`, Kolonie `colony.art`. Ohne eigene Bilder ist alles pixelgleich wie vorher.
- **Unbestätigt**: Der Nutzer meldete heftiges Ruckeln ab vielen Ameisen (Task-Manager: CPU ~6 %, GPU ~6 % =
  ein voller Kern). Ob die Leistungs-Änderungen auf seinem PC reichen, ist ungetestet – die Cloud-Testumgebung
  hatte keine echte GPU, Zeichenzeiten dort sind nicht aussagekräftig.
- Electron-Teil (preload.js liest `Bilder\Ameisen-Game`) nur mit nachgebautem `electron`-Modul getestet, nie in
  echtem Electron.

## Wichtige Dateien & Befehle
- `CLAUDE.md` – Regeln + alle Nutzer-Entscheidungen. Bei neuen Wünschen ergänzen.
- `START.md` – Stufenplan, Vorbild-Analyse (ants.sim, fieldnotes.sim, Tschinkel).
- `src/world.js` – Raster, Graben (`planStep`, `digStep`, `bite`), Kammern, Bauplan (`PLAN`), `markDirty`/`markAllDirty`.
- `src/colony.js` – Königin, Brut, Futter, Jobs (`colonyTask`, `startJob`/`endJob` zählen `colony.jobs`), Beute, Abfall.
- `src/ants.js` – Wegfindung (`bfs`, `walkMap`, `isWalkable`), Entscheidungen (`decide`), Bewegung, `updateAnts`.
- `src/enemies.js`, `src/sky.js`, `src/save.js`, `src/main.js` (Schleife, HUD, Tasten, `perf`).
- `src/sprites.js` – eingebaute Sprites; `buildAntFrames(p)`, `spritesFor(art, caste)`, `casteLook(art, caste)`.
- `src/render.js` – Zeichnen; `drawAnts` nimmt eigenes Bild (`ameisenBild`) sonst eingebautes Sprite; `drawPlants`.
- `src/arten.js` – `ARTEN` (Arten mit `woerter`, `groesse`, `farben`, `bild`), `KASTEN`, `ANSICHTEN`, `ANIMATIONEN`.
- `src/pflanzen.js` – `PFLANZEN` (plant/flower/seeds mit `futter`, `menge`, `hoehe`, `eingebaut`), `ZUSTAENDE`.
- `src/bilder.js` – `bildErkennen(datei)` (Name → Art/Sorte/Ansicht/Animation/Nr.), `bilderLaden()`, `ameisenBild`, `pflanzenBild`.
- `tools/bilder-pruefer.html` – zeigt gefundene PNGs, Erkennung, Animationen, Regler für `breite`/`boden`/`hoehe`.
- `bilder/` – Bilder für die Browser-Version + `bilder/liste.js` (von `Bilderliste erstellen.bat`), `bilder/LIESMICH.txt` = Namensregeln.
- `Ameisen-Sim aktualisieren.bat` – beim Nutzer auf dem Desktop: lädt Zweig `claude/new-session-n7qdgx` als ZIP,
  ersetzt `%LOCALAPPDATA%\Ameisen-Sim\resources\app`, aktualisiert sich jetzt selbst. Spielstand bleibt.
- `Ameisen-Game auf Desktop holen.bat` – klont das Projekt nach `Desktop\Ameisen-Game` (installiert Git per winget, falls nötig).
- Starten: `index.html` im Browser öffnen. Kein Build, kein npm.
- Testen: keine Testsuite. Bewährt: Playwright mit `file:///…/index.html`, dann in `page.evaluate` z. B.
  `for (let k = 0; k < 60*60*30; k++) sim.step(1/30)` über `window.sim`, Screenshot, auf `pageerror` und
  Konsolenfehler achten. Sprite-Gleichheit: MD5 über `getImageData` aller `antSprites`/`itemSprites`/`spiderSprites`
  (Wert am 2026-10-03: `3460c5e01560f8957bd1ae5ab6baffaf`).

## Was funktioniert hat
- Graben Krümel für Krümel nur an offenen Gangwänden (`bite`); Jobs zufällig wählen (`pickRandom`); Ameisen laufen
  bis 2 Pixel von der Wand; Baustellen nach 150 s ohne Fortschritt aufgeben; Zeitraffer max. 16 Schritte pro Bild.
- Bilder-Erkennung über Suchwörter im Datei- UND Ordnernamen (Wörter ≤ 4 Buchstaben exakt, längere als Wortanfang,
  CamelCase wird getrennt) – getestet mit Namen wie `FeuerameiseKoeniginSeiteLaufen01.png`, `Soldat Seite Kampf 1.png`,
  `HonigAmeise_queen_top_idle_01.png`. Grund: Die echten Dateinamen des Nutzers sind unbekannt.
- Eigene Bilder liegen beim Nutzer in `Bilder\Ameisen-Game` (Windows-Bilderordner), weil Updates
  `resources\app` komplett löschen – dort wären sie verloren.

## Was nicht funktioniert hat
- Vorberechnete Gangformen und Röntgenblick (Ameisen weichen Steinen vorher aus) – vom Nutzer abgelehnt.
- Königin tief unten / Umzug – Nutzer will sie auf halber Höhe (`PLAN.royalMoves = 0`).
- Steile Sandpyramide als Hügel – zu groß; Futter-Ziel hart an Kammergröße – Kolonie verhungerte.
- Fertige .exe als Datei schicken – zu groß (151 MB); deshalb die Update-.bat.
- Sprites aus `willReadFrequently`-Canvas in normale Canvas kopieren, um das Ruckeln zu beheben – brachte in der
  Testumgebung nichts (dort ohne GPU kein Beweis in beide Richtungen).
- Bild-Pixel eigener PNGs auslesen (`getImageData`) geht nicht: Bilder von `file://` „verschmutzen“ das Canvas
  (Browser-Sicherheitsregel). Darum Größe/Bodenlinie per Einstellung (`ARTEN[art].bild`) statt automatisch.
  Aus demselben Grund fängt der Bau-Editor `toDataURL` mit try/catch ab.

## Nächste Schritte
1. Vom Nutzer erfragen: Leistungsanzeige (Taste I) bei vielen Ameisen – Bilder/s, „Rechnen … ms“, „Zeichnen … ms“.
   Ist „Zeichnen“ groß: `drawAnts` in src/render.js weiter entlasten (z. B. weniger `save/restore`, Ameisen außerhalb
   des Bildschirms früher überspringen). Ist „Rechnen“ groß: `bfs` in src/ants.js (Haupt-Rechenfresser) begrenzen.
2. Wartet auf den Nutzer: seine PNGs in `Bilder\Ameisen-Game` legen, im Spiel „BILDER“ öffnen. Nicht erkannte Namen
   → passende Suchwörter in `src/arten.js` / `src/pflanzen.js` ergänzen; Werte von den Reglern in `ARTEN[art].bild`
   bzw. `PFLANZEN[art].hoehe` eintragen; neue Pflanzen als Eintrag in `PFLANZEN`.
3. Echten Electron-Start prüfen (Nutzer: „Ameisen-Sim aktualisieren“ doppelklicken, dann BILDER-Knopf: erscheint
   „Bilder\Ameisen-Game“ unter „Wo gesucht wurde“?).
4. Großer Umbau (erst nach Absprache mit dem Nutzer, Beispiele zeigen): mehrere Kolonien. Heute sind `colony`,
   `ants`, `world.royal`, `world.tips`, `world.chambers` einzeln/global – müssten je Kolonie werden.
5. Offen laut `START.md`: Stufe 6 Sound (Web-Audio-API, kein Download, Lautstärke-Knopf).
6. Nach jeder Änderung: im Browser per Playwright prüfen, deutsch committen, `git push origin claude/new-session-n7qdgx`,
   dem Nutzer sagen, er soll „Ameisen-Sim aktualisieren“ doppelklicken.

## Offene Fragen
- Wie heißen die Dateien im Bilder-Ordner des Nutzers wirklich? Davon hängt ab, ob die Erkennung passt.
- Draufsicht-Bilder („oben“) werden geladen, im Spiel aber nicht benutzt – wofür will der Nutzer sie (Karte der
  Open World?) Muss geklärt werden.
- Bleibt es reines Zuschauen oder soll der Spieler eingreifen können? (Nutzer klärt das in einem Ideen-Chat, Prompt
  dafür in `Ideen-Chat-Prompt.md`.)
- `CLAUDE.md` sagt, das Repo sei privat (Token nötig); laut früherer Übergabe ist es öffentlich. Vor dem
  Klonen/Herunterladen ohne Token kurz prüfen.
