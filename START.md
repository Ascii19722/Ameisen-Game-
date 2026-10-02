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
| 3 | Kolonie wächst, Brut, Königin, HUD, Speichern | offen |
| 4 | Futtersuche draußen, Vorratskammern, Futter ablegen, Zeitsteuerung | offen |
| 5 | Feinde und Kampf | offen |
| 6 | Ambient-Sound | offen |
| 7 | Größere Welt, .exe | offen |

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

## Prompt für die nächste Stufe
> Lies CLAUDE.md und START.md. Baue Stufe 3 nach dem Spielablauf von fieldnotes.sim
> (Abschnitt "Vorbilder", Punkte 1–4): Gründung durch die Königin, Königskammer, Eier → Larven →
> Puppen → neue Arbeiterinnen und Soldatinnen, Puppenkammer, Kammern mit Aufgabe und Farbe.
> Brut-Zahl in der Info-Karte, Speichern im Browser und ein Knopf "Neue Kolonie".
> Danach START.md aktualisieren, committen, pushen.

## Noch zu tun (außerhalb des Codes)
- Referenz-Frames nach `referenz/` legen (hilft beim Feinschliff).
