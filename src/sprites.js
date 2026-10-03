'use strict';

// Ameisen von der Seite, als Pixel-Art. Jede Pose wird beim Start einmal vorgezeichnet
// (8 Laufbilder je Sorte, mit/ohne Sandkorn) und danach nur noch kopiert und gedreht.
// Einheit beim Zeichnen: 1 = ein Welt-Pixel × Größe der Sorte; x zeigt nach vorne,
// die Füße stehen bei y = 1.05 (Boden).

const SPRITE_RES = 4;      // Sprite-Pixel pro Welt-Pixel
const SPRITE_SIZE = 64;    // Kantenlänge eines Posen-Bildes
const SPRITE_GROUND = Math.round(SPRITE_SIZE * 0.62);   // Bodenlinie im Bild
const WALK_FRAMES = 8;

const C = {
  plate: [96, 58, 36], eye: [10, 6, 4], ocelli: [150, 120, 90], scar: [90, 70, 56],
  grain: [250, 240, 214], grainEdge: [120, 96, 70],
};
const rgbCss = c => `rgb(${c[0]},${c[1]},${c[2]})`;

// Rote Waldameise (Formica rufa): Kopf und Brust rostrot, Hinterleib schwarzbraun, Beine dunkelrot.
// front = Farbe von Kopf, Brust und Knoten; body = Hinterleib.
const RUFA = { front: [170, 70, 38], frontShine: [214, 120, 80], body: [38, 26, 22], shine: [92, 70, 60],
  leg: [112, 48, 30], far: [150, 84, 58] };

// Die Ameisen-Sorten mit Körperbau nach echten Ameisen (siehe CLAUDE.md)
const CASTES = {
  worker: { size: 1.4, ...RUFA,
    gW: 0.85, gL: 1, thW: 0.85, headW: 0.9, headL: 1, legLen: 1.1, eye: 0.8 },
  queen: { size: 2.1, ...RUFA,
    gW: 1.35, gL: 1.6, thW: 1.2, headW: 1.05, headL: 1, legLen: 1, eye: 1.3,
    thorax: 'queen', stubs: true, plates: 5, ocelli: true },
  // Soldatin S17: groß, riesiger eckiger Kopf, Säbel-Kiefer, zwei Knoten (in Waldameisen-Farben, etwas dunkler)
  soldier: { size: 1.75, ...RUFA, front: [146, 56, 30], frontShine: [190, 100, 66],
    gW: 0.95, gL: 1, thW: 0.95, headW: 1.6, headL: 1.4, legLen: 0.95, eye: 0.9,
    headSquare: true, saber: 1.3, nodes: 2 },
  // Räuber: fremde schwarze Ameise (Feind) – gut von den roten Waldameisen zu unterscheiden
  raider: { size: 1.5, body: [30, 30, 34], shine: [96, 96, 108], leg: [24, 24, 28], far: [70, 70, 78],
    gW: 0.9, gL: 1, thW: 0.9, headW: 1, headL: 1, legLen: 1.1, eye: 0.9 },
  // Pflegerin P7: klein, junge Arbeiterin (noch etwas heller)
  nurse: { size: 1.05, ...RUFA, front: [192, 100, 62], frontShine: [228, 150, 108], body: [62, 46, 40],
    gW: 0.9, gL: 1, thW: 0.9, headW: 0.95, headL: 1, legLen: 1.05, eye: 0.8 },
};

function sPoly(g, p) {
  g.beginPath();
  g.moveTo(p[0], p[1]);
  for (let k = 2; k < p.length; k += 2) g.lineTo(p[k], p[k + 1]);
  g.closePath();
  g.fill();
}
function sLine(g, p) {
  g.beginPath();
  g.moveTo(p[0], p[1]);
  for (let k = 2; k < p.length; k += 2) g.lineTo(p[k], p[k + 1]);
  g.stroke();
}
function sEll(cx, cy, rx, ry, rot = 0, n = 14) {
  const a = [];
  for (let k = 0; k < n; k++) {
    const t = k / n * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    a.push(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot));
  }
  return a;
}

function drawSideAnt(g, ph, p, carry) {
  const px = 1 / (SPRITE_RES * p.size);
  g.lineCap = 'square';
  g.lineJoin = 'miter';
  const by = 0.22 + Math.sin(ph * 2) * 0.025;   // Körper nah am Boden, wippt leicht

  // Dreifuß-Gang: je drei Beine schwingen gemeinsam nach vorne, die anderen schieben
  const footPos = (i, far) => {
    const f = ph + ((i + (far ? 1 : 0)) % 2) * Math.PI;
    return [Math.sin(f) * 0.3 * p.legLen, Math.cos(f) > 0 ? Math.cos(f) * 0.2 : 0];
  };
  const legs = far => {
    g.strokeStyle = rgbCss(far ? p.far : p.leg);
    g.lineWidth = px * 1.2;
    [[0.42, 0.45, 1], [0.15, 0, 0], [-0.12, -0.45, -1]].forEach(([ax, fx, kd], i) => {
      const [sw, up] = footPos(i, far), L = p.legLen;
      const footX = ax + fx * L + sw, footY = 1.05 - up;
      const hipY = by + 0.12;
      const kneeX = (ax + footX) / 2 + kd * 0.1, kneeY = Math.min(hipY, footY) - 0.2 * L + up * 0.2;
      sLine(g, [ax, hipY, kneeX, kneeY, footX, footY]);
    });
  };
  legs(true);

  // Fühler
  g.strokeStyle = rgbCss(p.leg);
  g.lineWidth = px * 1.05;
  const hx = 0.55 + 0.42 * p.headL, hy = by - 0.18;
  const tw = Math.sin(ph * 1.3) * 0.12;
  sLine(g, [hx + 0.1, hy - 0.25, hx + 0.2 + tw * 0.5, hy - 0.8, hx + 0.75 + tw, hy - 0.6 + Math.sin(ph * 0.9) * 0.14]);

  // Hinterleib
  g.fillStyle = rgbCss(p.body);
  const gr = -0.12, gx = -1.3 * p.gL, gy = by - 0.08;
  const gaster = sEll(gx, gy, 0.92 * p.gL, 0.62 * p.gW, gr, 18);
  sPoly(g, gaster);
  if (p.plates) {
    g.save();
    g.beginPath();
    g.moveTo(gaster[0], gaster[1]);
    for (let k = 2; k < gaster.length; k += 2) g.lineTo(gaster[k], gaster[k + 1]);
    g.closePath();
    g.clip();
    g.fillStyle = rgbCss(C.plate);
    for (let k = 1; k < p.plates; k++) {
      const x = gx + 0.92 * p.gL - (1.84 * p.gL) * k / p.plates;
      sPoly(g, [x, -2, x - 0.12, -2, x - 0.06, 2, x + 0.06, 2]);
    }
    g.restore();
    g.fillStyle = rgbCss(p.body);
  }
  // Knoten (Soldatin: zwei) – ab hier Kopf-und-Brust-Farbe
  g.fillStyle = rgbCss(p.front || p.body);
  if (p.nodes === 2) {
    sPoly(g, sEll(-0.58, by - 0.1, 0.13, 0.2));
    sPoly(g, sEll(-0.36, by - 0.14, 0.14, 0.22));
  } else sPoly(g, sEll(-0.45, by - 0.12, 0.17, 0.24));
  // Brust
  const t = p.thW;
  if (p.thorax === 'queen') {   // große, gewölbte Flugbrust mit Abschnitten und Flügelnarbe
    sPoly(g, [-0.36, by + 0.14, -0.32, by - 0.3 * t, -0.05, by - 0.58 * t, 0.32, by - 0.6 * t, 0.56, by - 0.36 * t,
      0.66, by + 0.02, 0.42, by + 0.2, -0.05, by + 0.22]);
    g.fillStyle = rgbCss(p.shine);
    sPoly(g, [0, by - 0.5 * t, 0.06, by - 0.5 * t, 0.06, by - 0.08, 0, by - 0.08]);
    sPoly(g, [-0.22, by - 0.36 * t, -0.16, by - 0.36 * t, -0.16, by - 0.05, -0.22, by - 0.05]);
    g.fillStyle = rgbCss(C.scar);
    sPoly(g, sEll(-0.02, by - 0.32 * t, 0.09, 0.06, 0, 6));
    g.fillStyle = rgbCss(p.front || p.body);
  } else {
    sPoly(g, [-0.32, by + 0.12, -0.25, by - 0.28 * t, 0.12, by - 0.4 * t, 0.48, by - 0.28 * t, 0.62, by + 0.02,
      0.4, by + 0.18, -0.05, by + 0.2]);
  }
  // Kopf und Kiefer
  if (p.headSquare) {   // großer eckiger Kopf
    const L = 0.46 * p.headL, Hh = 0.36 * p.headW;
    sPoly(g, [hx - L, hy - Hh * 0.7, hx - L * 0.6, hy - Hh, hx + L * 0.7, hy - Hh, hx + L, hy - Hh * 0.5,
      hx + L, hy + Hh * 0.6, hx + L * 0.6, hy + Hh, hx - L * 0.5, hy + Hh * 0.9, hx - L, hy + Hh * 0.4]);
  } else sPoly(g, sEll(hx, hy, 0.42 * p.headL, 0.36 * p.headW, 0.25));
  g.fillStyle = rgbCss(p.leg);
  if (p.saber) {   // lange, offene Säbel-Kiefer, Spitze nach innen
    const j = p.saber, x0 = hx + 0.4 * p.headL;
    sPoly(g, [x0, hy + 0.05, x0 + 0.55 * j, hy - 0.12, x0 + 0.85 * j, hy + 0.18, x0 + 0.7 * j, hy + 0.2, x0 + 0.45 * j, hy + 0.06, x0 - 0.02, hy + 0.22]);
  } else sPoly(g, [hx + 0.32 * p.headL, hy + 0.08, hx + 0.57 * p.headL, hy + 0.2, hx + 0.3 * p.headL, hy + 0.26]);
  // Glanz, Auge, Punktaugen
  g.fillStyle = rgbCss(p.shine);
  sPoly(g, sEll(gx + 0.15, gy - 0.38 * p.gW, 0.42 * p.gL, 0.12, gr, 10));
  g.fillStyle = rgbCss(p.frontShine || p.shine);
  sPoly(g, sEll(hx + 0.05, hy - 0.2 * p.headW, 0.16, 0.07, 0.25, 8));
  if (p.front) {   // dunkler Fleck oben auf dem Kopf (typisch für die Rote Waldameise)
    g.fillStyle = rgbCss(p.body);
    sPoly(g, sEll(hx - 0.12, hy - 0.26 * p.headW, 0.14, 0.07, 0.2, 8));
  }
  g.fillStyle = rgbCss(C.eye);
  const er = 0.07 * p.eye;
  sPoly(g, sEll(hx + 0.15, hy - 0.04, er, er * 1.1, 0, 8));
  if (p.ocelli) {
    g.fillStyle = rgbCss(C.ocelli);
    for (const ox of [-0.12, -0.02, 0.08]) sPoly(g, sEll(hx + ox, hy - 0.3 * p.headW, 0.04, 0.04, 0, 6));
  }
  // Sandkorn zwischen den Kiefern
  if (carry) {
    g.fillStyle = rgbCss(C.grainEdge);
    sPoly(g, sEll(hx + 0.75, hy + 0.15, 0.32, 0.28, 0, 10));
    g.fillStyle = rgbCss(C.grain);
    sPoly(g, sEll(hx + 0.75, hy + 0.15, 0.22, 0.19, 0, 10));
  }
  legs(false);
}

// Halbdurchsichtige Kanten entfernen und auf feste Farben runden → echte Pixel-Art.
// unpremul: Farbe vorher durch die Deckkraft teilen (so sind die Ameisen-Bilder entstanden)
function pixelate(g, w, h, palette, unpremul = false) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    const a = unpremul ? d[i + 3] / 255 : 1, r = d[i] / a, gg = d[i + 1] / a, b = d[i + 2] / a;
    let best = palette[0], bd = Infinity;
    for (const c of palette) {
      const e = (c[0] - r) ** 2 + (c[1] - gg) ** 2 + (c[2] - b) ** 2;
      if (e < bd) { bd = e; best = c; }
    }
    d[i] = best[0]; d[i + 1] = best[1]; d[i + 2] = best[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

const antSprites = {};   // antSprites[caste][carry ? 1 : 0][frame]
function buildSideSprites() {
  for (const [name, p] of Object.entries(CASTES)) {
    const palette = [p.body, p.shine, p.leg, p.far, p.front, p.frontShine, C.plate, C.eye, C.ocelli, C.scar, C.grain, C.grainEdge].filter(Boolean);
    antSprites[name] = [[], []];
    for (let carry = 0; carry < 2; carry++) {
      for (let f = 0; f < WALK_FRAMES; f++) {
        const cv = document.createElement('canvas');
        cv.width = SPRITE_SIZE;
        cv.height = SPRITE_SIZE;
        const g = cv.getContext('2d', { willReadFrequently: true });
        g.translate(SPRITE_SIZE / 2, SPRITE_GROUND - 1.05 * SPRITE_RES * p.size);
        g.scale(SPRITE_RES * p.size, SPRITE_RES * p.size);
        drawSideAnt(g, f / WALK_FRAMES * Math.PI * 2, p, carry === 1);
        pixelate(g, SPRITE_SIZE, SPRITE_SIZE, palette, true);
        antSprites[name][carry][f] = cv;
      }
    }
  }
}
buildSideSprites();

// ---------- Brut und Futter ----------
// Kleine Bilder, Mitte bei (ITEM_SPR/2, ITEM_SPR/2), gleicher Maßstab wie eine Arbeiterin.
const ITEM_SPR = 32;
const PREY_SCALE = 2.4;
const ITEM_SCALE = SPRITE_RES * 1.4;
const BC = {
  cream: [244, 232, 200], creamD: [214, 198, 160], white: [255, 252, 240],
  larva: [246, 232, 190], larvaD: [214, 192, 140], larvaHead: [150, 110, 70], mouth: [90, 60, 40],
  coc: [244, 236, 214], cocD: [208, 194, 160],
  leaf: [92, 150, 60], leafD: [56, 104, 40], leafL: [150, 196, 96],
  petal: [236, 130, 160], petalL: [252, 196, 210],
  seed: [140, 96, 52], seedL: [196, 150, 96],
  meat: [150, 84, 60], meatL: [196, 128, 96], crumb: [110, 92, 70], crumbL: [146, 126, 100],
  beetle: [38, 44, 52], beetleL: [92, 110, 128], beetleLeg: [30, 28, 30],
  hopper: [110, 150, 60], hopperD: [74, 110, 40], hopperL: [168, 198, 100],
};
// Halbe Höhe in Einheiten: damit liegt das Ding mit der Unterseite auf dem Boden
const ITEM_HALF = { egg: 0.3, larva: 0.42, cocoon: 0.62, leaf: 0.3, petal: 0.28, seed: 0.28, meat: 0.3, crumb: 0.22, shell: 0.45, corpse: 0.45, beetle: 0.72 * PREY_SCALE, grasshopper: 0.52 * PREY_SCALE };

function drawLarva(g, ph) {   // Stil L4: gelblich, Ringe, kleiner Kopf, windet sich
  const n = 7, bend = 0.35 + Math.sin(ph) * 0.35, head = Math.sin(ph * 1.7) * 0.3, k = 1.1, segL = 1.1 * 2 * k / n;
  const pts = [];
  let x = -1.1 * k, y = 0.3, a = -0.1;
  for (let i = 0; i < n; i++) {
    const thick = 0.42 * (1 - Math.abs(i - (n - 1) * 0.45) / (n * 0.9)) * k * 1.1;
    pts.push([x, y - thick * 0.6, thick]);
    a -= bend / n * 1.6;
    x += Math.cos(a) * segL;
    y += Math.sin(a) * segL * 0.8;
  }
  pts[n - 1][1] -= head * 0.45 * k;
  pts[n - 2][1] -= head * 0.2 * k;
  g.fillStyle = rgbCss(BC.larva);
  for (const [x2, y2, r2] of pts) sPoly(g, sEll(x2, y2, r2, r2 * 0.9));
  g.fillStyle = rgbCss(BC.larvaD);
  for (let i = 1; i < n - 1; i++) { const [x2, y2, r2] = pts[i]; sPoly(g, [x2 - 0.03, y2 - r2, x2 + 0.03, y2 - r2, x2 + 0.03, y2 + r2 * 0.6, x2 - 0.03, y2 + r2 * 0.6]); }
  const [hx, hy] = pts[n - 1];
  g.fillStyle = rgbCss(BC.larvaHead);
  sPoly(g, sEll(hx + 0.1 * k, hy + 0.02, 0.13 * k, 0.12 * k));
  g.fillStyle = rgbCss(BC.mouth);
  sPoly(g, sEll(hx + 0.22 * k, hy + 0.06, 0.05 * k, 0.05 * k, 0, 6));
}

const ITEM_DRAW = {
  egg: g => {   // Ei Nr. 2: cremefarben, oval, kleiner Glanz
    g.fillStyle = rgbCss(BC.cream); sPoly(g, sEll(0, 0, 0.42, 0.3));
    g.fillStyle = rgbCss(BC.white); sPoly(g, sEll(-0.12, -0.1, 0.12, 0.08, 0, 8));
  },
  cocoon: g => {   // Kokon Nr. 13: beige, länglich, hellere Oberseite
    g.fillStyle = rgbCss(BC.cocD);
    sPoly(g, [-1.2, 0, -1, -0.5, -0.3, -0.62, 0.5, -0.58, 1.05, -0.35, 1.2, 0, 1.05, 0.35, 0.5, 0.58, -0.3, 0.62, -1, 0.5]);
    g.fillStyle = rgbCss(BC.coc);
    sPoly(g, [-1, -0.05, -0.8, -0.4, -0.2, -0.48, 0.5, -0.44, 0.95, -0.25, 0.9, -0.05]);
  },
  leaf: g => {   // Blattstück
    g.fillStyle = rgbCss(BC.leaf); sPoly(g, [-0.7, 0.1, -0.3, -0.28, 0.4, -0.3, 0.75, 0, 0.3, 0.28, -0.4, 0.26]);
    g.fillStyle = rgbCss(BC.leafL); sPoly(g, [-0.55, 0.02, 0.6, -0.04, 0.6, 0.04, -0.55, 0.08]);
    g.fillStyle = rgbCss(BC.leafD); sPoly(g, [0.1, 0.12, 0.5, 0.06, 0.3, 0.24]);
  },
  petal: g => {   // Blütenblatt
    g.fillStyle = rgbCss(BC.petal); sPoly(g, sEll(0, 0, 0.55, 0.28, -0.2));
    g.fillStyle = rgbCss(BC.petalL); sPoly(g, sEll(-0.12, -0.08, 0.25, 0.1, -0.2, 8));
  },
  meat: g => {   // Stück von einem Insekt
    g.fillStyle = rgbCss(BC.meat); sPoly(g, [-0.5, 0.25, -0.4, -0.2, 0.1, -0.32, 0.5, -0.1, 0.45, 0.28]);
    g.fillStyle = rgbCss(BC.meatL); sPoly(g, sEll(-0.1, -0.1, 0.2, 0.08, 0, 8));
  },
  crumb: g => {   // Essensreste (Abfall)
    g.fillStyle = rgbCss(BC.crumb); sPoly(g, [-0.35, 0.2, -0.25, -0.15, 0.15, -0.22, 0.38, 0.05, 0.2, 0.22]);
    g.fillStyle = rgbCss(BC.crumbL); sPoly(g, sEll(-0.05, -0.05, 0.1, 0.06, 0, 6));
  },
  shell: g => {   // leere, aufgerissene Kokonhülle
    g.fillStyle = rgbCss(BC.cocD);
    sPoly(g, [-0.9, 0.4, -0.95, 0, -0.6, -0.35, 0, -0.42, 0.3, -0.3, 0.1, 0, 0.5, 0.05, 0.8, 0.4]);
    g.fillStyle = rgbCss(BC.coc); sPoly(g, [-0.7, 0, -0.5, -0.25, 0, -0.32, 0.15, -0.2, -0.2, -0.05]);
  },
  seed: g => {   // Samenkorn
    g.fillStyle = rgbCss(BC.seed); sPoly(g, sEll(0, 0, 0.45, 0.28, 0.3));
    g.fillStyle = rgbCss(BC.seedL); sPoly(g, sEll(-0.12, -0.1, 0.18, 0.08, 0.3, 8));
  },
};

// Toter Käfer auf dem Rücken, Beine nach oben
function drawBeetle(g) {
  g.strokeStyle = rgbCss(BC.beetleLeg);
  g.lineWidth = 0.14;
  for (const x of [-0.6, 0, 0.6]) sLine(g, [x, -0.3, x + 0.25, -0.9, x + 0.1, -1.2]);
  g.fillStyle = rgbCss(BC.beetle);
  sPoly(g, sEll(0, 0, 1.4, 0.7, 0, 18));
  sPoly(g, sEll(1.45, 0.15, 0.4, 0.35, 0, 10));
  g.fillStyle = rgbCss(BC.beetleL);
  sPoly(g, sEll(-0.3, 0.3, 0.7, 0.15, 0, 10));
}
// Toter Grashüpfer auf der Seite
function drawHopper(g) {
  g.fillStyle = rgbCss(BC.hopperD);
  sPoly(g, [-0.6, 0, 0.6, -0.9, 1.0, -0.8, 0.0, 0.1]);       // großes Sprungbein
  g.fillStyle = rgbCss(BC.hopper);
  sPoly(g, sEll(-0.3, 0.1, 1.9, 0.42, 0, 18));
  sPoly(g, sEll(1.7, -0.05, 0.42, 0.4, 0, 10));
  g.fillStyle = rgbCss(BC.hopperL);
  sPoly(g, sEll(-0.5, -0.1, 1.2, 0.12, 0, 10));
  g.fillStyle = rgbCss(C.eye);
  sPoly(g, sEll(1.85, -0.12, 0.1, 0.1, 0, 6));
  g.strokeStyle = rgbCss(BC.hopperD);
  g.lineWidth = 0.08;
  sLine(g, [2.0, -0.3, 2.6, -1.0]);
}

const itemSprites = {};   // itemSprites[kind][frame]
function buildItemSprites() {
  const palette = [...Object.values(BC), C.eye];
  const make = (fn, size = ITEM_SPR, pal = palette) => {
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.translate(size / 2, size / 2);
    g.scale(ITEM_SCALE, ITEM_SCALE);
    fn(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    pixelate(g, size, size, pal);
    return cv;
  };
  for (const [kind, fn] of Object.entries(ITEM_DRAW)) itemSprites[kind] = [make(fn)];
  // Beute ist viel größer als eine Ameise
  itemSprites.beetle = [make(g => { g.scale(PREY_SCALE, PREY_SCALE); drawBeetle(g); }, 96)];
  itemSprites.grasshopper = [make(g => { g.scale(PREY_SCALE, PREY_SCALE); drawHopper(g); }, 96)];
  // Tote Ameisen: auf dem Rücken, Beine nach oben
  for (const c of ['worker', 'nurse', 'soldier', 'raider']) {
    const p = CASTES[c], f = p.size / 1.4;
    itemSprites['corpse_' + c] = [make(g => { g.scale(f, -f); g.translate(0, -0.25); drawSideAnt(g, 0, p, false); }, 64,
      [p.body, p.shine, p.leg, p.far, p.front, p.frontShine, C.eye].filter(Boolean))];
  }
  itemSprites.larva = [];
  for (let f = 0; f < 6; f++) itemSprites.larva.push(make(g => drawLarva(g, f / 6 * Math.PI * 2)));
}
buildItemSprites();

// ---------- Spinne (Feind) von der Seite, 8 Beine, Laufbilder ----------
const SPIDER_W = 128, SPIDER_H = 96, SPIDER_GROUND = 72, SPIDER_SCALE = SPRITE_RES * 1.4 * 2.6;
const SP = { body: [52, 40, 34], dark: [30, 22, 18], light: [128, 102, 78], far: [86, 70, 58], eye: [200, 60, 40] };
function drawSpiderPose(g, ph) {
  const legs = far => {
    g.strokeStyle = rgbCss(far ? SP.far : SP.dark);
    g.lineWidth = 0.13;
    g.lineCap = 'round';
    [[2.0, 0.55], [1.1, 0.4], [-0.2, 0.25], [-1.4, 0.1]].forEach(([fx, hx], i) => {
      const f = ph + ((i + (far ? 1 : 0)) % 2) * Math.PI;
      const sw = Math.sin(f) * 0.35, up = Math.cos(f) > 0 ? Math.cos(f) * 0.3 : 0;
      const footX = fx + sw + (far ? -0.2 : 0), footY = -up;
      const kneeX = (hx + footX) / 2 + (fx > 0 ? 0.3 : -0.3), kneeY = -2.4 - up * 0.5;
      sLine(g, [hx, -1.3, kneeX, kneeY, footX, footY]);
    });
  };
  legs(true);
  g.fillStyle = rgbCss(SP.body);
  sPoly(g, sEll(-1.1, -1.55, 1.15, 0.85, -0.15, 18));   // Hinterleib
  sPoly(g, sEll(0.55, -1.35, 0.7, 0.5, 0, 14));         // Kopfbrust
  g.fillStyle = rgbCss(SP.light);                       // Zeichnung auf dem Hinterleib
  for (const x of [-1.7, -1.2, -0.7]) sPoly(g, [x - 0.15, -2.15, x + 0.15, -2.15, x, -1.85]);
  sPoly(g, sEll(0.5, -1.7, 0.35, 0.08, 0, 8));
  g.fillStyle = rgbCss(SP.dark);                        // Kieferklauen und Taster
  sPoly(g, [1.15, -1.3, 1.45, -1.1, 1.3, -0.85, 1.1, -1.05]);
  g.fillStyle = rgbCss(SP.eye);
  sPoly(g, sEll(1.05, -1.6, 0.09, 0.09, 0, 6));
  sPoly(g, sEll(0.85, -1.72, 0.07, 0.07, 0, 6));
  legs(false);
}
const spiderSprites = [];
(function buildSpider() {
  const pal = Object.values(SP);
  for (let f = 0; f < 8; f++) {
    const cv = document.createElement('canvas');
    cv.width = SPIDER_W;
    cv.height = SPIDER_H;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.translate(SPIDER_W / 2, SPIDER_GROUND);
    g.scale(SPIDER_SCALE, SPIDER_SCALE);
    drawSpiderPose(g, f / 8 * Math.PI * 2);
    g.setTransform(1, 0, 0, 1, 0, 0);
    pixelate(g, SPIDER_W, SPIDER_H, pal);
    spiderSprites.push(cv);
  }
})();
