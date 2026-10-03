'use strict';

// Eigene Bilder (PNG) für Ameisen und Pflanzen, z. B. aus Claude Design.
//
// Woher die Bilder kommen:
//   • Als Programm (.exe): automatisch aus dem Ordner „Bilder\Ameisen-Game“ auf dem PC
//     (und aus dem Ordner „bilder“ im Spiel). Siehe electron/preload.js.
//   • Im Browser (index.html): aus dem Ordner „bilder“ im Spiel. Die Liste der Dateien steht in
//     bilder/liste.js (wird von „Bilderliste erstellen.bat“ geschrieben – ein Browser darf Ordner nicht selbst lesen).
//
// Was auf einem Bild ist, wird am Datei- und Ordnernamen erkannt (Groß/klein und Umlaute egal):
//   Art (siehe ARTEN), Sorte (KASTEN), Ansicht (ANSICHTEN), Animation (ANIMATIONEN) und die letzte Zahl
//   im Dateinamen = Nummer des Bildes in der Animation.
//   Beispiel: „Feuerameise/Soldat_Seite_Laufen_03.png“ → Feuerameise, Soldatin, Seite, Laufen, Bild 3.
//   Fehlt etwas im Namen, gilt: Arbeiterin, von der Seite, Laufen, Bild 1.
//   Pflanzen: Pflanzen-Name (PFLANZEN) + Zustand (voll/halb/leer) + Nummer.
// Was erkannt wurde, zeigt der Bilder-Prüfer (tools/bilder-pruefer.html).

const BILDER = {
  dateien: [],     // alle gefundenen Dateien: {datei, quelle, url, typ, art, kaste, ansicht, anim, zustand, nr, fehler, img}
  ameisen: {},     // ameisen[art][kaste][ansicht][anim] = [Dateien, nach Nummer sortiert]
  pflanzen: {},    // pflanzen[art][zustand] = [Dateien]
  quellen: [],     // durchsuchte Ordner {name, pfad, anzahl}
};

// Text vereinfachen und in Wörter zerlegen: „FeuerAmeise_Laufen-03.png“ → feuer, ameise, laufen, 03 …
function nameWoerter(text) {
  const t = text.replace(/\.png$/i, '')
    .replace(/([a-zäöü])([A-ZÄÖÜ])/g, '$1 $2')   // „FeuerAmeise“ → „Feuer Ameise“
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  const woerter = t.split(/[^a-z0-9]+/).filter(Boolean);
  // auch zusammengesetzt prüfen („feuer ameise“ → „feuerameise“) und ohne Zahlen („laufen03“ → „laufen“)
  const mehr = [];
  for (let i = 0; i + 1 < woerter.length; i++) mehr.push(woerter[i] + woerter[i + 1]);
  for (const w of woerter) { const ohne = w.replace(/[0-9]+/g, ''); if (ohne && ohne !== w) mehr.push(ohne); }
  return woerter.concat(mehr);
}

// Passt ein Suchwort? Kurze Wörter (bis 4 Buchstaben) müssen genau passen, längere dürfen der Anfang sein
// („laufen“ passt zu „laufanimation“ nicht, „lauf“ schon … „feuerameise“ passt zu „feuerameisen“).
function wortPasst(woerter, such) {
  for (const w of woerter) if (such.length <= 4 ? w === such : w.startsWith(such)) return true;
  return false;
}
function finde(woerter, liste) {
  for (const [key, def] of Object.entries(liste)) if (def.woerter.some(s => wortPasst(woerter, s))) return key;
  return null;
}

// Was ist auf diesem Bild? (nur aus dem Namen)
function bildErkennen(datei) {
  const pfad = nameWoerter(datei);
  const name = datei.split('/').pop();
  const zahlen = name.replace(/\.png$/i, '').match(/[0-9]+/g);
  const nr = zahlen ? parseInt(zahlen[zahlen.length - 1], 10) : 1;
  const art = finde(pfad, ARTEN);
  if (art) {
    return { typ: 'ameise', art, kaste: finde(pfad, KASTEN) || 'worker', ansicht: finde(pfad, ANSICHTEN) || 'seite',
      anim: finde(pfad, ANIMATIONEN) || 'laufen', nr };
  }
  const pflanze = finde(pfad, PFLANZEN);
  if (pflanze) return { typ: 'pflanze', art: pflanze, zustand: finde(pfad, ZUSTAENDE) || 'voll', nr };
  if (PFLANZEN_WOERTER.some(s => wortPasst(pfad, s))) return { typ: 'unbekannt', fehler: 'Pflanze erkannt, aber nicht welche (Name aus pflanzen.js fehlt)' };
  if (finde(pfad, KASTEN) || finde(pfad, ANIMATIONEN)) return { typ: 'unbekannt', fehler: 'Ameise erkannt, aber nicht welche Art (Name aus arten.js fehlt)' };
  return { typ: 'unbekannt', fehler: 'nicht erkannt' };
}

// Dateiliste einlesen und Bilder laden
function bilderLaden() {
  let liste = [];
  try {
    if (window.ameisenBilder) {   // Programm (.exe): Ordner werden direkt gelesen
      const r = window.ameisenBilder.liste();
      liste = r.dateien;
      BILDER.quellen = r.quellen;
    } else if (Array.isArray(window.BILDER_LISTE)) {   // Browser: Liste aus bilder/liste.js
      liste = window.BILDER_LISTE.map(d => ({ datei: d, quelle: 'bilder', url: 'bilder/' + d.split('/').map(encodeURIComponent).join('/') }));
      BILDER.quellen = [{ name: 'bilder', pfad: 'Ordner „bilder“ im Spiel (bilder/liste.js)', anzahl: liste.length }];
    }
  } catch (e) {
    console.warn('Bilder konnten nicht gelesen werden:', e);
  }
  // Seiten in Unterordnern (tools/…) brauchen „../“ vor relativen Pfaden
  const vorne = location.pathname.includes('/tools/') ? '../' : '';
  for (const d of liste) {
    const e = Object.assign({ datei: d.datei, quelle: d.quelle, url: /^[a-z]+:/i.test(d.url) ? d.url : vorne + d.url }, bildErkennen(d.datei));
    BILDER.dateien.push(e);
    if (e.typ === 'unbekannt') continue;
    e.img = new Image();
    e.img.onerror = () => { e.fehler = 'Datei konnte nicht geladen werden'; };
    e.img.src = e.url;
    if (e.typ === 'ameise') {
      const a = BILDER.ameisen[e.art] || (BILDER.ameisen[e.art] = {});
      const k = a[e.kaste] || (a[e.kaste] = {});
      const v = k[e.ansicht] || (k[e.ansicht] = {});
      (v[e.anim] || (v[e.anim] = [])).push(e);
    } else {
      const p = BILDER.pflanzen[e.art] || (BILDER.pflanzen[e.art] = {});
      (p[e.zustand] || (p[e.zustand] = [])).push(e);
    }
  }
  const sortieren = l => l.sort((a, b) => a.nr - b.nr || a.datei.localeCompare(b.datei));
  for (const a of Object.values(BILDER.ameisen)) for (const k of Object.values(a)) for (const v of Object.values(k)) for (const l of Object.values(v)) sortieren(l);
  for (const p of Object.values(BILDER.pflanzen)) for (const l of Object.values(p)) sortieren(l);
}

const bildBereit = e => e.img && e.img.complete && e.img.naturalWidth > 0;

// Welche Bilder hat die Animation? Fehlt die gewünschte, wird Laufen genommen (oder irgendeine);
// „ersatz“ sagt dann, dass es nicht die gewünschte ist.
function animBilder(art, kaste, ansicht, anim, ersatzErlaubt = true) {
  const a = BILDER.ameisen[art];
  const v = a && a[kaste] && a[kaste][ansicht];
  if (!v) return null;
  let l = v[anim], ersatz = false;
  if (!l) {
    if (!ersatzErlaubt) return null;
    l = v.laufen || Object.values(v)[0];
    ersatz = true;
  }
  const bereit = l ? l.filter(bildBereit) : [];
  return bereit.length ? { liste: bereit, ersatz } : null;
}

// Wie liegt das Bild? (Werte aus arten.js, sonst Standard)
function bildMasse(art, kaste) {
  const b = Object.assign({ breite: 7, boden: 0.85, schaut: 'rechts', maul: [0.92, 0.6] }, (ARTEN[art] && ARTEN[art].bild) || {});
  const eigen = b.kasten && b.kasten[kaste];
  // ohne eigenen Wert: so viel größer wie die eingebaute Sorte (z. B. Königin größer als Arbeiterin)
  const faktor = CASTES[kaste] ? CASTES[kaste].size / CASTES.worker.size : 1;
  return Object.assign({}, b, { breite: b.breite * faktor }, eigen || {});
}

// Das passende Bild für eine Ameise: welche Animation gerade läuft, folgt aus ihrem Zustand
function ameisenAnim(a) {
  if (a.foe) return 'kaempfen';
  if (a.state === 'digging') return 'graben';
  if (a.carry || a.load) return 'tragen';
  if (a.path) return 'laufen';
  return 'stehen';
}
function ameisenBild(a, now) {
  const art = a.art || 'waldameise';
  const anim = ameisenAnim(a);
  const r = animBilder(art, a.caste, 'seite', anim);
  if (!r) return null;
  const l = r.liste;
  // Laufen, Graben, Tragen, Kämpfen: Bildwechsel im Takt der Schritte; Stehen: langsam nach der Uhr
  // (gibt es kein Stehen-Bild, steht sie still auf dem ersten Laufbild)
  const takt = anim === 'stehen' ? (r.ersatz ? 0 : now / 250) : a.walk * l.length / WALK_FRAMES;
  return { img: l[Math.floor(takt) % l.length].img, masse: bildMasse(art, a.caste) };
}

// Tote Ameise: nur, wenn es ein eigenes „tot“-Bild gibt (sonst die eingebaute, auf dem Rücken)
function leichenBild(item) {
  const art = item.art || 'waldameise';
  const r = animBilder(art, item.caste, 'seite', 'tot', false);
  return r && { img: r.liste[0].img, masse: bildMasse(art, item.caste) };
}

// Pflanze: Zustand nach der restlichen Futtermenge, Bildwechsel nach der Uhr
function pflanzenBild(s, now) {
  const p = BILDER.pflanzen[s.kind];
  if (!p) return null;
  const f = s.amount / s.max;
  const reihe = f > 0.6 ? ['voll', 'halb', 'leer'] : f > 0.25 ? ['halb', 'voll', 'leer'] : ['leer', 'halb', 'voll'];
  for (const z of reihe) {
    const l = p[z] && p[z].filter(bildBereit);
    if (l && l.length) {
      const def = PFLANZEN[s.kind];
      return { img: l[Math.floor(now / 1000 * (def.tempo || 4) + s.x) % l.length].img, hoehe: def.hoehe || 20 };
    }
  }
  return null;
}
const hatPflanzenBilder = kind => !!BILDER.pflanzen[kind];

bilderLaden();
