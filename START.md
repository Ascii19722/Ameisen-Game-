# START – So geht's los

## Spiel starten
`index.html` im Browser öffnen (Doppelklick). Fertig.

Ein Tag dauert 5 Minuten (bei Tempo 1×). Tag und Uhrzeit stehen in der Info-Karte oben links.

Tasten:
- **Leertaste**: Pause
- **1 / 2 / 3 / 4**: Tempo 1×, 2×, 4×, 8×
- **F**: Vollbild an/aus

## Stufen

| Stufe | Inhalt | Stand |
|---|---|---|
| 1 | Sand-Look, Ameisen graben Tunnel | ✅ fertig |
| 2 | Himmel, Wald, Wolken, Tag/Nacht, Look wie @ants.sim | ✅ fertig |
| 3a | Große Welt mit Zoom, Ameisen von der Seite, Graben nach Bauplan, Sandhügel | fertig |
| 3b | Königin legt Eier → Larven → Puppen → neue Ameisen, Futter holen, Kammer-Aufgaben | fertig |
| 3c | Soldatinnen, Pflegerinnen, HUD mit echten Zahlen, Speichern, "Neue Kolonie" | fertig |
| 4 | Beute gemeinsam tragen, Abfallkammer/Abfallhaufen, Brut nach Wärme, Zeitknöpfe | fertig |
| 5 | Feinde: Spinne an der Oberfläche, rote Räuber-Ameisen; Kampf, Soldatinnen verteidigen | fertig |
| 6 | Ambient-Sound | offen |
| 7 | Größere Welt, .exe | .exe fertig (build-exe.sh), Rest offen |

## Vorbilder
- **Grafik: @ants.sim** – Bodenschichten (Humus, Sand, roter Lehm, grauer Untergrund) mit
  hellen Sprenkeln, graue Steine mit gepunktetem Rand, Zickzack-Hauptgang mit runden Kammern,
  lila-oranger Himmel, Wolken aus runden Bällchen, Wald aus runden Kronen in Schichten,
  helle Info-Karte oben links ("KOLONIE · x AMEISEN · x BRUT · x% NEST" mit Balken).
- **Spielablauf: fieldnotes.sim** – so soll die Kolonie leben:
  1. **Gründung**: Am Anfang gräbt nur die Königin (orange-rot, größer) einen kurzen Gang und
     eine erste Kammer (Königskammer). Dort legt sie Eier.
  2. **Brut**: Ei → Larve → Puppe → Ameise. Puppen liegen ordentlich in Reihen in einer eigenen
     Puppenkammer (weiße Kreise im Raster). Arbeiterinnen tragen die Brut dorthin.
  3. **Wachstum**: Mit jeder neuen Arbeiterin wird mehr gegraben. Gänge verbinden sich auch zu
     Schleifen, Kammern hängen an kurzen Seitengängen.
  4. **Kammern mit Aufgabe, an der Farbe erkennbar**: Königskammer (dunkel lila-grau, Königin + Eier),
     Puppenkammer (weiße Puppen), Vorrat Samen (gelb), Vorrat Blätter (grün),
     Vorrat Beeren (lila), Abfall (dunkelbraun).
  5. **Futtersuche**: Ameisen gehen raus zu Blumen und Büschen (gelbe Blüten, rote Beeren),
     tragen Futter heim und füllen die passende Vorratskammer. Futter → mehr Brut.
  6. **Wetter**: Regen und Nacht (rein optisch).
  7. Zwei Sandhaufen links und rechts vom Eingang.


## Wie die Vorbilder ihre Gänge bauen (Video-Analyse)

**ants.sim** (Tag für Tag im Video beobachtet) – danach bauen wir:
1. Tag 1–4: Die Königin gräbt allein **einen langen, ruhigen Bogen** schräg nach unten (keine Kammer!).
   Er krümmt sich gleichmäßig, wackelt kaum.
2. Am Ende des Bogens ein **Haken** (Gang biegt stärker um), dort die **erste Kammer** (Königskammer).
3. Tag 8–11: Ein **zweiter Bogen** startet direkt neben dem Eingang, schwingt zur anderen Seite aus und
   biegt zurück, bis er den ersten Bogen unten **trifft** → herzförmige Schleife.
4. Danach entstehen **Seitenkammern**: an einem fertigen Gang ein kurzer Stummel nach **außen**, dann eine
   Pilz-Kammer (flacher Boden, runde Decke). Kammern liegen immer außen, nie in der Schleife.
5. Tag 15+: Vom unteren Treffpunkt wächst ein **Stamm** weiter nach unten, von dem **Äste** schräg
   abgehen, jeweils mit Kammer am Ende; überall kommen weitere Seitenkammern dazu.
6. Steinen wird in weitem Bogen ausgewichen. Gänge sind schmal (Ameise so breit wie der Gang),
   viel befahrene Gänge bekommen dunkle Laufspuren.
7. Zuerst wird lang erkundet, Kammern kommen erst danach – das Nest wächst mit der Zahl der Ameisen.

**Echte Ameisennester** (Forschung von W. R. Tschinkel, Gips-/Metall-Abgüsse) – fließt mit ein:
- Grundbaustein: mehr oder weniger senkrechter **Schacht** mit flachen, waagrechten **Kammern** daran.
- Schächte laufen im **Zickzack/spiralförmig**, oben flach (ca. 15–20°), tiefer steiler (bis ca. 70°).
- Kammern beginnen als runde Mulde an der **Außenseite** des Schachts und werden beim Vergrößern
  **mehrlappig**; flacher Boden, Höhe bleibt gleich.
- **Oben große Kammern dicht beieinander, nach unten kleiner und mit mehr Abstand.**
- Kammern entstehen dort, wo Brut abgelegt wird (viele Ameisen an einer Stelle → runde Kammer).
- Mehr Ameisen → mehr Verzweigung: erst baumartig, später ein Netz mit Schleifen.
- Gänge halten Abstand zueinander (Nutzer-Wunsch: Gänge weiter auseinander).

**fieldnotes** (zum Vergleich):
1. Königin gräbt einen kurzen Schacht, unten sofort die Königskammer.
2. Dann lange, **fast gerade waagrechte Gänge** links und rechts auf Höhe der Königskammer, dazu
   senkrechte Schächte; viele Gänge enden mit einem kleinen Haken nach unten (Erkundung).
3. Vorratskammern entstehen dicht um die Königskammer, später weiter außen; Gänge verbinden sich zu
   einem Netz mit vielen Schleifen. Später werden neue Eingänge von oben gegraben.
4. Zwei große Sandhaufen links und rechts vom Eingang wachsen mit dem Nest.

## Prompt für die nächste Stufe
> Lies CLAUDE.md und START.md. Baue Stufe 6: Sound (leises Krabbeln, Graben, Vögel am Tag,
> Grillen in der Nacht, Kampfgeräusche), mit Lautstärke-Knopf. Ohne Dateien aus dem Netz,
> Töne mit der Web-Audio-API erzeugen. Danach START.md aktualisieren, committen, pushen.

## Noch zu tun (außerhalb des Codes)
- Referenz-Frames nach `referenz/` legen (hilft beim Feinschliff).
