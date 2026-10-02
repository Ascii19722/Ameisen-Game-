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
  black: [26, 18, 13], shine: [84, 62, 46], leg: [34, 24, 16], far: [58, 44, 34],
  grey: [52, 48, 50], greyShine: [112, 106, 110], greyLeg: [40, 38, 40], greyFar: [82, 78, 80],
  plate: [96, 58, 36], eye: [10, 6, 4], ocelli: [150, 120, 90], scar: [90, 70, 56],
  grain: [250, 240, 214], grainEdge: [120, 96, 70],
};
const rgbCss = c => `rgb(${c[0]},${c[1]},${c[2]})`;

// Die Ameisen-Sorten mit Körperbau nach echten Ameisen (siehe CLAUDE.md)
const CASTES = {
  worker: { size: 1.4, body: C.black, shine: C.shine, leg: C.leg, far: C.far,
    gW: 0.85, gL: 1, thW: 0.85, headW: 0.9, headL: 1, legLen: 1.1, eye: 0.8 },
  queen: { size: 2.1, body: C.black, shine: C.shine, leg: C.leg, far: C.far,
    gW: 1.35, gL: 1.6, thW: 1.2, headW: 1.05, headL: 1, legLen: 1, eye: 1.3,
    thorax: 'queen', stubs: true, plates: 5, ocelli: true },
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
  // Knoten
  sPoly(g, sEll(-0.45, by - 0.12, 0.17, 0.24));
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
    g.fillStyle = rgbCss(p.body);
  } else {
    sPoly(g, [-0.32, by + 0.12, -0.25, by - 0.28 * t, 0.12, by - 0.4 * t, 0.48, by - 0.28 * t, 0.62, by + 0.02,
      0.4, by + 0.18, -0.05, by + 0.2]);
  }
  // Kopf und Kiefer
  sPoly(g, sEll(hx, hy, 0.42 * p.headL, 0.36 * p.headW, 0.25));
  g.fillStyle = rgbCss(p.leg);
  sPoly(g, [hx + 0.32 * p.headL, hy + 0.08, hx + 0.57 * p.headL, hy + 0.2, hx + 0.3 * p.headL, hy + 0.26]);
  // Glanz, Auge, Punktaugen
  g.fillStyle = rgbCss(p.shine);
  sPoly(g, sEll(gx + 0.15, gy - 0.38 * p.gW, 0.42 * p.gL, 0.12, gr, 10));
  sPoly(g, sEll(hx + 0.05, hy - 0.2 * p.headW, 0.16, 0.07, 0.25, 8));
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

// Halbdurchsichtige Kanten entfernen und auf feste Farben runden → echte Pixel-Art
function pixelateSprite(g, palette) {
  const img = g.getImageData(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    const a = d[i + 3] / 255, r = d[i] / a, gg = d[i + 1] / a, b = d[i + 2] / a;
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
    const palette = [p.body, p.shine, p.leg, p.far, C.plate, C.eye, C.ocelli, C.scar, C.grain, C.grainEdge];
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
        pixelateSprite(g, palette);
        antSprites[name][carry][f] = cv;
      }
    }
  }
}
buildSideSprites();
