'use strict';

// Ameisen-Arten. Jede Art kann eigene Bilder (PNG) bekommen, siehe src/bilder.js und bilder/LIESMICH.txt.
// Hat eine Art (noch) keine Bilder, wird die eingebaute Pixel-Ameise in den Ersatzfarben gezeichnet.
//
// Neue Art = neuer Eintrag. Felder:
//   name     Anzeigename
//   woerter  Suchwörter: Kommt eins davon im Datei- oder Ordnernamen vor, gehört das Bild zu dieser Art
//   groesse  Größe im Vergleich zur Waldameise (1 = gleich groß)
//   farben   Ersatzfarben für die eingebaute Ameise (front = Kopf+Brust, body = Hinterleib, leg = Beine)
//   form     Ersatzform (z. B. gW = Hinterleib-Breite, gL = Hinterleib-Länge), siehe CASTES in sprites.js
//   bild     Wie die eigenen Bilder liegen (Werte findest du im Bilder-Prüfer mit den Reglern):
//              breite  so viele Welt-Pixel ist ein Bild der Arbeiterin breit (ganzes Bild inkl. Rand)
//              boden   wo die Füße stehen, als Anteil der Bildhöhe von oben (1 = ganz unten)
//              schaut  'rechts' oder 'links' – in welche Richtung die Ameise auf dem Bild läuft
//              maul    wo getragenes Futter sitzt, [Anteil der Breite, Anteil der Höhe]
//              kasten  eigene Werte je Sorte, z. B. { queen: { breite: 12 } }
//   info     kurzer Text (für später: Infotafel in der Open World)
const ARTEN = {
  waldameise: {
    name: 'Rote Waldameise',
    woerter: ['waldameise', 'formica', 'rufa', 'woodant'],
    groesse: 1,
    info: 'Baut Hügel aus Kiefernnadeln, lebt in großen Kolonien im Wald.',
  },
  feuerameise: {
    name: 'Feuerameise',
    woerter: ['feuerameise', 'feuer', 'fireant', 'fire', 'solenopsis', 'invicta'],
    groesse: 0.75,
    farben: { front: [178, 86, 40], frontShine: [222, 136, 84], body: [92, 36, 22], shine: [150, 80, 56], leg: [130, 60, 34], far: [166, 96, 64] },
    info: 'Klein, rotbraun, sticht schmerzhaft. Baut Erdhügel ohne Nadeln.',
  },
  honigameise: {
    name: 'Honigameise',
    woerter: ['honigameise', 'honig', 'honeypot', 'honey', 'myrmecocystus'],
    groesse: 0.95,
    farben: { front: [196, 138, 70], frontShine: [232, 186, 118], body: [214, 150, 40], shine: [250, 214, 120], leg: [150, 100, 52], far: [186, 140, 90] },
    form: { gW: 1.05 },
    info: 'Manche Arbeiterinnen speichern Honig im Hinterleib und werden zu lebenden Vorratsfässern.',
  },
  bullet: {
    name: 'Bullet-Ameise (Paraponera)',
    woerter: ['bulletameise', 'bullet', 'paraponera', 'clavata', 'riesenameise', 'patronenameise'],
    groesse: 1.8,
    farben: { front: [74, 34, 22], frontShine: [128, 74, 52], body: [44, 22, 16], shine: [104, 66, 50], leg: [70, 36, 24], far: [112, 72, 54] },
    info: 'Riesig, schwarzrot, hat den schmerzhaftesten Stich aller Insekten.',
  },
};

// Sorten (Kasten) in einer Kolonie. Schlüssel = Name im Spiel, woerter = Suchwörter in Dateinamen.
// Reihenfolge zählt: „jungkoenigin“ muss vor „koenigin“ geprüft werden.
const KASTEN = {
  princess: { name: 'Junge Königin', woerter: ['jungkoenigin', 'prinzessin', 'princess', 'gefluegelt', 'winged', 'alate', 'gyne'] },
  queen: { name: 'Königin', woerter: ['koenigin', 'queen', 'regina'] },
  male: { name: 'Männchen', woerter: ['maennchen', 'drohne', 'drone', 'male'] },
  soldier: { name: 'Soldatin', woerter: ['soldatin', 'soldat', 'soldier', 'major', 'krieger', 'waechter'] },
  nurse: { name: 'Pflegerin', woerter: ['pflegerin', 'amme', 'nurse', 'brutpflege'] },
  worker: { name: 'Arbeiterin', woerter: ['arbeiterin', 'arbeiter', 'worker', 'minor', 'sammlerin'] },
};

// Ansichten
const ANSICHTEN = {
  seite: { name: 'von der Seite', woerter: ['seite', 'seitlich', 'seitenansicht', 'side', 'profil', 'profile'] },
  oben: { name: 'von oben', woerter: ['oben', 'draufsicht', 'aufsicht', 'top', 'topdown', 'vonoben'] },
};

// Animationen und wann das Spiel sie zeigt
const ANIMATIONEN = {
  laufen: { name: 'Laufen', woerter: ['laufen', 'lauf', 'gehen', 'walk', 'walking', 'run', 'rennen', 'krabbeln', 'move'] },
  stehen: { name: 'Stehen / Ruhe', woerter: ['stehen', 'steht', 'idle', 'ruhe', 'ruhen', 'still', 'stand', 'warten'] },
  graben: { name: 'Graben', woerter: ['graben', 'dig', 'digging', 'buddeln'] },
  tragen: { name: 'Tragen', woerter: ['tragen', 'traegt', 'carry', 'carrying'] },
  kaempfen: { name: 'Kämpfen', woerter: ['kaempfen', 'kampf', 'angriff', 'angreifen', 'attack', 'fight', 'beissen', 'bite', 'stechen', 'sting'] },
  fressen: { name: 'Fressen', woerter: ['fressen', 'essen', 'eat', 'feed', 'fuettern'] },
  tot: { name: 'Tot', woerter: ['tot', 'dead', 'death', 'sterben', 'leiche'] },
};
