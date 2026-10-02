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
- `src/sprites.js` – Ameisen-Bilder von der Seite (Laufbilder je Sorte, vorgezeichnet)
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
- KEIN fest programmierter Bauablauf (keine vorgegebenen Bögen/Schleifen)! Es gibt nur einen BAUPLAN aus
  Neigungen; jede grabende Ameise entscheidet selbst. Jedes Nest wird anders. Regeln (Wahrscheinlichkeiten):
  * Königin gräbt am Eingang los, eher nach unten, wackelt leicht; irgendwann gräbt sie die erste Kammer.
  * Gangspitzen wackeln zufällig, haben leichte Neigung (Königin: nach unten; Äste: zur Seite, leicht abwärts).
  * Abstand halten: Gänge weichen anderen Gängen aus; stößt ein Gang auf einen anderen, hört er meist auf
    (selten Durchbruch = Schleife). Steinen wird ausgewichen.
  * Je größer die Kolonie, desto öfter neue Abzweige (aber nur wo vorne Platz ist, mit Abstand zu anderen Abzweigen).
  * Am Gangende manchmal eine Kammer; Seitenkammern über kurzen Stummel – nur wo genug Platz ist
    (Mindestabstand zu anderen Kammern und Gängen).
  * KEIN Röntgenblick: Steine (und Weltrand) bemerkt eine Ameise erst, wenn sie beim Graben dagegen stößt.
    Dann tastet sie sich am Stein entlang zur Seite (merkt sich die Seite); kommt sie lange nicht vorbei,
    endet der Gang dort. Kammern werden um Steine herum gegraben (Stein bleibt stehen).
  * Eigene Gänge kennen die Ameisen (sie laufen darin herum, Ortssinn) – Abstand zu bekannten Gängen
    halten ist erlaubt, Wissen über Unbekanntes im Boden nicht.
  * ERST IN DIE TIEFE, DANN IN DIE BREITE: Die Königin gräbt zuerst einen langen Schacht weit nach unten;
    Abzweige zur Seite kommen erst mit wachsender Kolonie. Die Königskammer liegt möglichst TIEF
    (die Königin zieht mit nach unten, wenn das Nest tiefer wird). Ausgegrabener Sand wird nach oben
    getragen und bildet einen Sandhügel am Eingang, der mit dem Nest wächst.
  * Manche neuen Gänge suchen die Tiefe; gibt ein Gang auf, versucht es später eine andere Ameise woanders.
  Vorschau: Bogen „Ohne Röntgenblick“ (Nest A/B im Zeitraffer).
- Steine: WENIGE (ca. 10–15 im Nestbereich, verschiedene Größen), so wie im ants.sim-Video.
- Kammer-Aufgaben (wie in echten Nestern): Königin, Eier, Larven, Puppen (Kokons), Vorrat (Samen/Futter),
  Abfall (weit weg, abseits), Winterkammer (ganz tief), leere Reserve. Brut wird je nach Wärme hoch/runter
  getragen (oben warm am Tag, unten bei Kälte/Nacht).
  Später ggf. ergänzen: Kammern dort, wo Brut abgelegt wird (echte Ameisen).
- Kammern NICHT dicht aneinander: wie im ants.sim-Video klein und rund (ca. 3–4× Gangbreite),
  zwischen zwei Kammern mindestens eine Kammerbreite Sand (Mindestabstand), Kammern am Ende von
  Ästen oder an Knicken, an einem kurzen Stummel. Viel freier Sand rund ums Nest.
- Proportionen wie im ants.sim-Video (nachgemessen): Kammer ca. 3,5–4 Ameisenlängen breit und gut 2 hoch;
  Hauptgang ca. 1 Ameise breit, Seitengänge etwas schmaler; Äste 4–9 Ameisenlängen; ganzes Nest ca.
  45–50 Ameisenlängen tief (lang gezogen). Favoriten: Bogen „Proportionen“ Nr. 1–3 (wie 3 und 4).
  Folge: Das Nest ist dann ca. 300 Welt-Pixel tief – größer als der jetzige Bildschirm (320×180).
  ENTSCHIEDEN: Die Welt wird größer, mit Kamera zum Scrollen und Zoomen (rein- und rauszoomen),
  kommt mit Stufe 3 (zieht diesen Teil von Stufe 7 vor).
- Seitenansicht: Ameisen gibt es auch von der Seite (Querschnitt = wir schauen seitlich ins Nest).
  Seiten-Modell für Königin (R13), Arbeiterin (A11), Soldatin (S17), Pflegerin (P7), 3 Haltungen
  (flach / hoch / Hinterleib hoch) – Auswahl und wann Seiten- vs. Draufsicht steht noch aus.
- Ameisen drehen sich: am Gangende/bei Richtungswechsel wenden sie sichtbar (Körper wird kurz schmal
  = Drehung), an Wänden und Ecken drehen sie sich mit und klettern hoch/runter.
- Larve = L4 (gelblich, mit Ringen und kleinem Kopf, windet sich). Larven unterscheiden sich je Sorte
  vor allem in der GRÖSSE: Pflegerin < Arbeiterin < Männchen < Soldatin < Königin-Larve.
- Sorten unterscheiden sich im KÖRPERBAU (nach echten Ameisen):
  Königin = größte, gewölbte Flugbrust mit Abschnitten und Flügelnarben, 3 Punktaugen, große Augen, großer Hinterleib.
  Soldatin = groß, riesiger eckiger Kopf, Säbel-Kiefer, normale schmale Brust.
  Arbeiterin = klein, schlank, kleiner Kopf, kleine Augen, schmale Brust. Pflegerin = noch kleiner.
  Männchen = kleiner Kopf, sehr große Augen, Flugbrust mit Flügeln, schlanker Hinterleib.
  Junge Königin = wie Königin, mit Flügeln.
- Seitenansicht: Beine KURZ, Körper nah am Boden (nicht hochbeinig), kleine Schritte.
- Laufen: deutlicher Dreifuß-Gang (je 3 Beine heben sich, schwingen nach vorne, setzen auf; die anderen
  3 schieben), Knie knicken, Füße heben sich sichtbar, Körper wippt leicht, Fühler tasten.
- Gänge etwas breiter (Radius ca. 2,2 statt 1,6). Eier liegen einzeln mit Abstand am Kammerboden.
- Larven bewegen sich: echte Larven können nicht laufen, sie winden/krümmen sich, heben den Kopf
  (betteln um Futter) und rutschen dabei ein Stück. So animieren.
- Vorschau-Bögen werden als HTML im Scratchpad gebaut (Formen-Parameter wie gW, gL, thW, headW, legLen, Farben).
- Dem Nutzer bei Design-Fragen lieber Beispiele zur Auswahl zeigen und Tipps geben.

## Arbeitsweise
- In Stufen bauen (siehe START.md). Pro Stufe nur das, was dazugehört.
- Kleine, saubere Commits. Nach jeder Stufe muss das Spiel lauffähig sein.
- Vor dem Commit im Browser prüfen (keine Fehler in der Konsole).
- Kosten im Blick: knapp arbeiten, nicht unnötig viel umbauen.
