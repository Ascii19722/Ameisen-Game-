# Prompt für einen Ideen-Chat zur „Ameisen-Sim“

(Alles ab hier in den neuen Chat kopieren.)

---

Hallo! Ich entwickle zusammen mit einer anderen KI (Claude Code) ein kleines Computerspiel: die **„Ameisen-Sim“**.
In **diesem** Chat soll NICHTS programmiert werden. Ich möchte hier nur **Ideen ausarbeiten, verbessern und neue Ideen
sammeln**. Am Ende soll aus unseren Ideen eine klare Aufgabenliste entstehen, die ich dem Programmier-Chat geben kann.

Bitte lies die ganze Beschreibung genau. Sie enthält den aktuellen Stand, alle Entscheidungen, die ich schon getroffen
habe, und was mir gefällt und was nicht.

---

## 1. Worum geht es?

Die Ameisen-Sim ist ein **ruhiges Zuschau-Spiel** („zum Chillen“): Man schaut im **Querschnitt** (wie durch eine
Glasscheibe von der Seite) in die Erde und sieht, wie eine Ameisenkolonie ganz von selbst ihr Nest gräbt, Futter sammelt,
Brut großzieht, wächst und sich gegen Feinde wehrt.

- **Kein Ziel, kein Game Over, kein Stress.** Man soll einfach gern zuschauen. Die Kolonie kann Rückschläge haben,
  erholt sich aber immer (die Königin stirbt nie).
- Der Spieler greift (bisher) kaum ein: Er kann zoomen, das Tempo ändern, eine neue Kolonie starten und im
  **Bau-Editor** selbst ein Nest malen.
- Alles soll sich **lebendig und echt** anfühlen: Die Ameisen sollen wirken, als würden sie selbst entscheiden –
  nichts soll „vorprogrammiert“ aussehen.

**Vorbilder:**
- **Optik: „ants.sim“** (ein Pixel-Art-Ameisenvideo/Spiel): Bodenschichten mit hellen Sprenkeln, graue Steine,
  braune Gänge, ovale Kammern, lila-oranger Abendhimmel, Wolken aus runden Bällchen, Wald aus runden Baumkronen,
  helle Info-Karte oben links.
- **Spielablauf: „fieldnotes.sim“**: Gründung durch die Königin, Brut (Ei → Larve → Puppe → Ameise), Kammern mit
  Aufgaben, Futtersuche draußen, Vorratskammern, mehrere Eingänge, Sandhaufen am Eingang, Netz aus Gängen.
- **Echte Ameisennester** (Forschung von W. R. Tschinkel, Nest-Abgüsse): senkrechte Schächte mit flachen,
  waagerechten Kammern; Kammern oben größer und dichter, unten kleiner; mehr Ameisen → mehr Verzweigung.

---

## 2. Art und Aussehen

**Ameisenart: Rote Waldameise (Formica rufa)** – meine Wahl.
- Farben: **Kopf und Brust rostrot, Hinterleib schwarzbraun, Beine dunkelrot, dunkler Fleck oben auf dem Kopf.**
- Der Hügel am Eingang ist ein **Haufen aus Kiefernnadeln und Zweigen** (wie bei echten Waldameisen).
- Feinde (fremde Räuber-Ameisen) sind **schwarz**, damit man sie gut unterscheidet.

**Grafikstil:**
- **Pixel-Art** mit harten Kanten, nichts verschwommen. Alles wird in kleiner Auflösung gezeichnet und dann groß
  hochskaliert.
- **Querformat, Vollbild am PC.**
- Die Welt ist größer als der Bildschirm: Man kann **rein- und rauszoomen** und **verschieben**.
- Die Ameisen sieht man **von der Seite** (weil wir seitlich ins Nest schauen). Sie laufen mit **Dreifuß-Gang**
  (je drei Beine heben sich gleichzeitig), haben **kurze Beine**, der Körper ist nah am Boden, die Fühler tasten.
  An Wänden und Decken drehen sie sich mit; beim Umdrehen wird der Körper kurz schmal (sichtbare Drehung).
- **Wichtig: Nichts perfekt rund oder gerade!** Gänge schlängeln sich, Kammerränder sind leicht unregelmäßig –
  „gegraben hat immer Macken“.

**Ameisen-Sorten (Designs habe ich aus vielen Beispielen ausgewählt, Codes in Klammern):**
| Sorte | Aussehen | Aufgabe |
|---|---|---|
| **Arbeiterin (A11)** | schlank, kleiner Kopf, kleine Augen | gräbt, holt Futter, trägt alles |
| **Königin (R13)** | größte; gewölbte Brust mit Flügelnarben, 3 Punktaugen, **langer Hinterleib aus 5 Platten mit braunen Fugen**, ein dicker runder Knoten | liegt still in ihrer Kammer, wird gefüttert, legt laufend Eier |
| **Soldatin (S17)** | groß, **riesiger eckiger Kopf, lange offene Säbel-Kiefer**, zwei Knoten | bewacht den Eingang, kämpft, hilft Beute tragen |
| **Pflegerin (P7)** | klein, etwas heller | kümmert sich um Königin und Brut |
| **Junge Königin (P11)** | wie Königin, **mit Flügeln** | *noch nicht im Spiel* (Idee: Hochzeitsflug) |
| **Männchen (P27)** | schlank, kleiner Kopf, große Augen, **mit Flügeln** | *noch nicht im Spiel* |

Hinweis: Echte Waldameisen haben eigentlich keine Säbel-Soldatinnen – die Soldatin bleibt aber, weil sie mir gefällt.

**Brut:**
- **Ei:** cremefarben, oval, klein. Eier liegen einzeln mit Abstand am Kammerboden.
- **Larve (L4):** gelblich mit Ringen und kleinem Kopf; kann nicht laufen, **windet sich**, hebt den Kopf (bettelt).
  Larven verschiedener Sorten unterscheiden sich vor allem in der **Größe**.
- **Kokon (Puppe):** beige, länglich.
- Alles, was abgelegt wird (Brut, Futter), **fällt mit Schwerkraft** auf den Kammerboden und stapelt sich.

---

## 3. Was das Spiel schon kann (aktueller Stand)

**Welt:**
- Bodenschichten: Humus, Sand, roter Lehm, grauer Untergrund. Wenige Steine (10–15), verschiedene Größen.
- **Steinplatten** an den Grenzen zwischen den Schichten, mit nur 2–4 Lücken.
- Himmel mit Tag und Nacht (ein Tag = 5 Minuten bei Tempo 1×), Sonne, Mond, Sterne, Wolken, Wald im Hintergrund.
- Futterpflanzen an der Oberfläche: Blattpflanzen, rosa Blumen, Gras mit Samen. Abgeerntete Pflanzen werden kahl,
  neue wachsen nach.

**Graben (sehr wichtig – so will ich es):**
- Die Gänge werden **nicht vorberechnet**. Es gibt nur einen **„Bauplan aus Neigungen“**: Jede Grabstelle hat eine
  grobe Wunschrichtung, wackelt zufällig, schlängelt sich in Kurven. Jedes Nest wird anders.
- **Kein Röntgenblick:** Ameisen merken Steine und Platten erst, wenn sie dagegen stoßen, und tasten sich dann
  daran entlang, bis sie eine Lücke finden – oder geben auf.
- Ameisen tragen den Sand **Krümel für Krümel** ab, nur an offenen Gangwänden – nie „aus dem Nichts“.
- **Ablauf:** Die Königin gräbt zuerst einen Schacht nach unten. Ihre Kammer liegt **auf halber Höhe** (nicht ganz
  unten). Schon früh entstehen **fast waagerechte Seitengänge nach links und rechts (wie Etagen)**, dazu schräge
  Abzweige. Es gibt **viele Gänge**; nicht jeder Gang braucht eine Kammer.
- **Kammern** liegen eher am **Ende von Seitengängen**, nicht direkt am Hauptschacht.
  Alle Kammern sind **gleich groß: liegende Ovale (32 × 16 Pixel, etwa 5 Ameisen lang)**, die **Königskammer ist
  größer (46 × 22)**. Boden leicht abgeflacht.
- Ausgegrabene Erde kommt nach oben auf einen **Hügel am Eingang**, der mit dem Nest wächst (flach, breit, mit
  Krater in der Mitte).
- Mit wachsender Kolonie entstehen **neue Eingänge** (bis zu 4), und zwar dort, wo Futter weit vom nächsten Eingang
  wächst.
- Ameisen laufen nicht nur direkt an der Wand, sondern auch quer über kleine Lücken.

**Kolonie:**
- Die **Königin liegt still** in ihrer eigenen Kammer (dort beginnen keine neuen Gänge), wird ständig gefüttert und
  legt laufend Eier.
- **Brut-Kreislauf:** Ei → Larve (muss 3× gefüttert werden, wächst sichtbar) → Kokon → neue Ameise.
  Leere Kokonhüllen bleiben als Abfall liegen.
- Beim Eierlegen wird die Sorte gewählt (etwa 15 % Pflegerinnen, 8 % Soldatinnen, Rest Arbeiterinnen).
- **Kammer-Aufgaben:** Königin, Vorrat (Futter), Eier, Larven, Puppen, Abfall (abseits), Reserve.
  Die Brut wird in die passende Kammer getragen.
- **Brut nach Wärme:** tagsüber in die obere, nachts in die untere Larven-/Puppenkammer.
- **Futter:** Ameisen gehen raus, schneiden Blätter, Blüten und Samen ab und bringen sie in die **Vorratskammer**
  (gut sichtbar, etwa halb voll). Daraus werden Königin und Larven gefüttert.
- **Selbstregelung:** Ist der Vorrat unter 40 %, legt die Königin keine Eier.
- **Beute:** Tote Käfer und Grashüpfer liegen draußen; 3–4 Ameisen tragen sie **gemeinsam** zum Eingang, dort
  werden sie zerlegt.
- **Abfall** kommt in eine Abfallkammer abseits oder auf einen Abfallhaufen draußen.

**Feinde und Kampf:**
- **Spinne** an der Oberfläche jagt Ameisen draußen, frisst bis zu 3, zieht verletzt oder satt wieder ab.
- **Schwarze Räuber-Ameisen** kommen in Gruppen, dringen ins Nest ein und stehlen Brut.
- Ameisen wehren sich; Soldatinnen eilen herbei. Tote eigene Ameisen werden zu Abfall, tote Räuber zu Futter.
- Feinde kommen erst ab 40 Ameisen. Kein Game Over.

**Bedienung:**
- Info-Karte oben links: Anzahl Ameisen, Brut, Futter, Soldatinnen, Pflegerinnen, Tag, Uhrzeit, „ANGRIFF!“.
- Zoomen (Mausrad), verschieben (ziehen/Pfeiltasten), Tempo-Knöpfe 1×–16× und ein **Schieber bis 100×**.
- Automatisches **Speichern**, Knopf **„Neue Kolonie“**.
- **Bau-Editor:** Gänge graben, zuschütten, Kammern mit Aufgabe setzen, Sandhügel malen, Eingänge graben;
  als Bild speichern oder das Spiel direkt mit diesem Nest starten.

**Technik (nur damit Ideen realistisch bleiben):**
- Läuft im Browser und als Windows-Programm (.exe). Reines HTML/JavaScript, keine großen Grafik-Dateien.
- Es sollen bis ca. **1000 Ameisen flüssig** laufen – Ideen sollten also nicht pro Ameise extrem viel Rechenarbeit
  brauchen.
- Bisher gibt es **noch keinen Sound**.

---

## 4. Was mir gefällt und was nicht (wichtig für neue Ideen!)

**Gefällt mir:**
- Pixel-Look wie ants.sim, die Bäume im Hintergrund.
- Waagerechte Etagen-Gänge, verzweigtes Netz mit vielen Gängen, die sich schlängeln.
- Gleich große ovale Kammern, größere Königskammer, sichtbare volle Futterkammer.
- Dass die Ameisen „selbst entscheiden“ und Steine erst ertasten müssen.
- Wenn ich viele Beispiele zur Auswahl bekomme (gern 10–40 Varianten) und dann aussuchen kann.

**Gefällt mir nicht / habe ich abgelehnt:**
- Fest vorprogrammierte Formen (z. B. ein vorgegebener Bogen).
- Gänge, die zu gerade sind; Kammern, die zu hoch sind; Räume, die zu dicht aneinander liegen.
- Röntgenblick (Ameisen wissen vorher, wo Steine sind).
- Königin, die herumläuft oder ganz unten im Nest wohnt.
- Ein Spiel mit Druck oder Niederlage.

---

## 5. Offene Punkte und Ideen, die schon im Raum stehen

1. **Sound** (geplant): leises Krabbeln, Graben, Vögel am Tag, Grillen nachts, Kampfgeräusche, Lautstärke-Knopf.
2. **Duftspuren (Pheromone):** Ameisen legen Spuren zum Futter, andere folgen, gute Wege werden zu
   „Ameisenstraßen“, schlechte verblassen – auf Knopfdruck sichtbar. (Statt echter KI pro Ameise.)
3. **Junge Königinnen und Männchen** mit Flügeln → **Hochzeitsflug** (z. B. einmal im Jahr), vielleicht neue
   Kolonien in der Nähe.
4. **Waldameisen-Verhalten:** Ameisensäure spritzen zur Verteidigung, Blattläuse an Bäumen „melken“ (Honigtau),
   Nadeln für den Hügel sammeln, Sonnenbaden auf dem Hügel im Frühling.
5. **Jahreszeiten / Wetter:** Regen, Winterruhe in einer tiefen Winterkammer, Frühling mit viel Brut.
6. **Umzug der Königin** in eine tiefere Kammer (gibt es im Code, ist aber ausgeschaltet).
7. **Mehr Feinde / Ereignisse:** z. B. Ameisenbär-artiger Specht, Regenwurm, Überschwemmung – aber ohne Stress.
8. **Mehr Infos für Zuschauer:** Anklicken einer Ameise zeigt, was sie gerade tut; Statistik-Kurven; Kamera folgt
   einer Ameise.
9. **Bau-Editor ausbauen:** Vorlagen, Teilen von Nestern, Wettbewerb „schönstes Nest“.

---

## 6. Wie du in diesem Chat arbeiten sollst

- **Bitte nicht programmieren und keinen Code schreiben.** Es geht nur um Ideen, Beschreibungen und Pläne.
- Antworte auf **Deutsch**, **kurz und verständlich** (ich bin kein Profi).
- Gib mir lieber **mehrere Varianten zur Auswahl** (z. B. „Idee A / B / C“ mit kurzer Beschreibung, wie es aussehen
  und sich anfühlen würde), statt nur eine.
- Mach auch **eigene Vorschläge** und gib mir Tipps, was gut zum Spiel passen würde – orientiert an echten Ameisen
  (gern mit spannenden echten Fakten) und an den Vorbildern ants.sim und fieldnotes.sim.
- Prüfe neue Ideen gegen Abschnitt 4 (was mir gefällt / nicht gefällt) und gegen die Technik-Grenzen (1000 Ameisen
  flüssig, Pixel-Art, kein Game Over).
- Frag nach, wenn etwas unklar ist.

**Wenn wir fertig sind**, fasse bitte alles zusammen als:
1. **Liste der beschlossenen Ideen**, jede mit: Name, was genau passiert, wie es aussieht, warum es zum Spiel passt.
2. **Reihenfolge** (was zuerst gebaut werden sollte).
3. Einen fertigen **Text für den Programmier-Chat**, der mit „Lies CLAUDE.md und START.md.“ beginnt und die
   Aufgaben klar beschreibt.

Lass uns anfangen: Schau dir den Stand an, stell mir 2–3 Fragen, was mich gerade am meisten interessiert, und schlag
mir dann die ersten Ideen vor.
