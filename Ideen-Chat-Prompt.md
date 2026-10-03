# Prompt für einen Ideen-Chat zur „Ameisen-Sim“ – Thema: Spielprinzip

(Alles ab hier in den neuen Chat kopieren.)

---

Hallo! Ich entwickle zusammen mit einer anderen KI (Claude Code) ein kleines Computerspiel: die **„Ameisen-Sim“**.
In **diesem** Chat soll NICHTS programmiert werden. Es geht **nur um das Spielprinzip**: Was ist der Kern des Spiels,
was macht man als Spieler, warum macht es Spaß, wie entwickelt es sich über die Zeit? Aussehen und Grafik sind hier
**nicht** das Thema (die sind schon weitgehend festgelegt).

Am Ende soll aus unseren Ideen ein klares Spielprinzip und eine Aufgabenliste entstehen, die ich dem Programmier-Chat
geben kann.

---

## 1. Die Grundidee (so wie sie heute ist)

- Man schaut **im Querschnitt** (seitlich, wie durch eine Glasscheibe) in die Erde auf eine **Kolonie Roter
  Waldameisen**.
- Die Kolonie lebt **ganz von selbst**: Sie gräbt ihr Nest, holt Futter, zieht Brut groß, wächst und wehrt Feinde ab.
- Es ist ein **ruhiges Zuschau-Spiel** („zum Chillen“): **kein Ziel, kein Game Over, kein Stress.** Die Kolonie kann
  Rückschläge haben, erholt sich aber immer (die Königin stirbt nie).
- Die Ameisen sollen wirken, als würden sie **selbst entscheiden** – nichts soll vorprogrammiert aussehen. Jedes Nest
  wird anders.
- **Vorbilder:** „ants.sim“ (Optik, ruhiges Zuschauen) und „fieldnotes.sim“ (Kolonie mit Kammern, Brut, Futtersuche,
  mehreren Eingängen).

**Die offene Hauptfrage:** Ist reines Zuschauen genug, oder soll der Spieler mehr machen können? Und wenn ja: was,
ohne dass es stressig wird?

---

## 2. Was in der Simulation schon passiert (der „Kreislauf“)

**Gründung und Graben**
- Die Königin gräbt zuerst einen Schacht nach unten und legt auf halber Höhe ihre Königskammer an.
- Danach graben Arbeiterinnen Gänge nach links und rechts (wie Etagen), mit Abzweigen; am Ende vieler Gänge
  entstehen Kammern. Mit mehr Ameisen wird mehr gegraben.
- **Kein Röntgenblick:** Steine und Steinplatten im Boden bemerken die Ameisen erst, wenn sie dagegen stoßen; dann
  tasten sie sich entlang, bis sie eine Lücke finden – oder geben auf.
- Ausgegrabene Erde wird nach oben getragen und bildet einen **Hügel** (bei Waldameisen aus Nadeln), der mit dem Nest
  wächst. Mit wachsender Kolonie entstehen **neue Eingänge**, dort, wo Futter wächst.

**Futter**
- Ameisen gehen nach draußen zu Pflanzen (Blätter, Blüten, Samen), schneiden Stücke ab und bringen sie in die
  **Vorratskammer**.
- Tote Insekten (Käfer, Grashüpfer) tragen **mehrere Ameisen gemeinsam** heim; am Eingang werden sie zerlegt.

**Königin und Brut**
- Die Königin **liegt still** in ihrer Kammer, wird ständig gefüttert und legt laufend Eier.
- Ei → Larve (muss gefüttert werden) → Kokon → neue Ameise. Pflegerinnen tragen die Brut in passende Kammern
  (Eier-, Larven-, Puppenkammer), tagsüber nach oben (warm), nachts nach unten.
- **Selbstregelung:** Ist zu wenig Futter im Vorrat, legt die Königin keine Eier.

**Sorten (Kasten)**
- **Arbeiterin:** gräbt, holt Futter, trägt alles.
- **Pflegerin:** kümmert sich um Königin und Brut.
- **Soldatin:** bewacht den Eingang, kämpft.
- Welche Sorte schlüpft, regelt die Kolonie selbst (sie gleicht aus, was fehlt).

**Abfall**
- Essensreste, leere Kokons und tote Ameisen kommen in eine Abfallkammer oder auf einen Haufen draußen.

**Feinde**
- Eine **Spinne** jagt draußen Ameisen (frisst ein paar und zieht wieder ab).
- **Fremde schwarze Räuber-Ameisen** dringen ein und stehlen Brut.
- Die Kolonie wehrt sich; Soldatinnen eilen herbei. Feinde kommen erst, wenn die Kolonie groß genug ist (40 Ameisen).

**Zeit**
- Tag und Nacht (ein Tag dauert 5 Minuten). Zeitraffer bis 100×.

---

## 3. Was der Spieler heute machen kann

- **Zuschauen**, zoomen, die Kamera verschieben.
- **Tempo** ändern (Pause bis 100×).
- **Neue Kolonie** starten (neue zufällige Welt).
- **Bau-Editor:** selbst ein Nest malen (Gänge, Kammern mit Aufgabe, Eingänge, Hügel) und das Spiel damit starten.
- Das Spiel **speichert automatisch**.

Mehr Eingriffe gibt es bisher nicht.

---

## 4. Was mir wichtig ist (bitte bei allen Ideen beachten)

- **Ruhig und entspannt** bleiben. Kein Game Over, keine Niederlage, kein Zeitdruck.
- Die Ameisen sollen **echt** wirken und **selbst entscheiden**. Nichts fest Vorprogrammiertes.
- Ideen sollen sich an **echten Ameisen** orientieren (gern mit spannenden echten Fakten über Waldameisen).
- Es sollen später bis zu **1000 Ameisen** gleichzeitig flüssig laufen – Ideen sollten also nicht für jede einzelne
  Ameise sehr aufwendig sein.
- Ich mag es, **mehrere Varianten zur Auswahl** zu bekommen und dann auszusuchen.

---

## 5. Ideen, die schon im Raum stehen (gern bewerten, ausbauen, verwerfen)

1. **Duftspuren (Pheromone):** Ameisen legen Spuren zum Futter, andere folgen, es entstehen Ameisenstraßen;
   schlechte Wege verblassen.
2. **Hochzeitsflug:** Geflügelte junge Königinnen und Männchen fliegen einmal im Jahr aus; vielleicht entstehen neue
   Kolonien in der Nähe.
3. **Jahreszeiten:** Frühling (viel Brut), Sommer, Herbst (Vorräte), Winter (Winterruhe tief im Nest).
4. **Waldameisen-Verhalten:** Blattläuse an Bäumen „melken“ (Honigtau), mit Ameisensäure verteidigen, Nadeln für den
   Hügel sammeln, Sonnenbaden auf dem Hügel.
5. **Wetter und Ereignisse:** Regen, Überschwemmung, neue Feinde – aber ohne Stress.
6. **Mehr für Zuschauer:** Ameise anklicken und sehen, was sie tut; Kamera folgt einer Ameise; Statistiken und
   Geschichte der Kolonie („Tagebuch“).
7. **Sanfte Eingriffe des Spielers:** z. B. Futter hinlegen, Steine setzen, Regen machen – offen, ob das gewollt ist.
8. **Mehrere Kolonien** in einer Welt, die miteinander konkurrieren oder Grenzen haben.
9. **Bau-Editor als Spielmodus:** Nest vorgeben und schauen, wie die Kolonie damit klarkommt.

---

## 6. Wie du in diesem Chat arbeiten sollst

- **Nicht programmieren**, keinen Code. Nur Spielprinzip, Abläufe und Regeln beschreiben.
- Auf **Deutsch**, **kurz und verständlich** (ich bin kein Profi).
- Gib mir **mehrere Varianten zur Auswahl** (z. B. „Prinzip A / B / C“) und beschreibe jeweils: Was macht der Spieler?
  Was macht die Kolonie? Wie fühlt es sich an? Was ist daran spannend, ohne stressig zu sein?
- Mach **eigene Vorschläge** und gib mir Tipps. Prüfe jede Idee gegen Abschnitt 4.
- Frag nach, wenn etwas unklar ist.

**Wenn wir fertig sind**, fasse bitte zusammen:
1. Das **Spielprinzip in wenigen Sätzen** (der Kern des Spiels).
2. Die **beschlossenen Ideen**, jeweils: was genau passiert und warum es zum Spiel passt.
3. Eine **Reihenfolge**, was zuerst gebaut werden sollte.
4. Einen fertigen **Text für den Programmier-Chat**, der mit „Lies CLAUDE.md und START.md.“ beginnt.

Lass uns anfangen: Stell mir 2–3 Fragen, wie ich mir das Spiel vorstelle, und schlag mir dann die ersten Varianten
für das Spielprinzip vor.
