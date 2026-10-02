'use strict';

// Alles wird erst in Welt-Auflösung (W×H) gezeichnet und dann ohne Glättung hochskaliert.
// Ebenen: off = fertiges Bild, scene = Wolken/Wald/Sand/Ameisen (wird je nach Tageszeit getönt),
// terrain = Sand und Tunnel (nur neu berechnet, wenn sich etwas geändert hat).
function makeLayer() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}
const off = makeLayer();
const offCtx = off.getContext('2d');
const scene = makeLayer();
const sceneCtx = scene.getContext('2d');
const terrain = makeLayer();
const terrainCtx = terrain.getContext('2d');
const terrainImage = terrainCtx.createImageData(W, H);
const terrainPixels = new Uint32Array(terrainImage.data.buffer);

const rgba = (r, g, b) =>
  (255 << 24) | (Math.max(0, Math.min(255, b | 0)) << 16) |
  (Math.max(0, Math.min(255, g | 0)) << 8) | Math.max(0, Math.min(255, r | 0));

// Bodenschichten wie im Vorbild: [Grundfarbe, heller Sprenkel]
const LAYER_COLORS = [
  [[186, 156, 122], [212, 186, 152]],   // Humus
  [[224, 198, 154], [238, 218, 180]],   // Sand
  [[206, 142, 106], [228, 172, 138]],   // Lehm
  [[178, 166, 140], [198, 188, 164]],   // grauer Untergrund
];
const TUNNEL_BROWN = [124, 86, 56];
const LOOSE_COLOR = [228, 214, 180];

function cellIsRock(x, y) {
  return x >= 0 && y >= 0 && x < W && y < H && world.cells[y * W + x] === ROCK;
}

function redrawTerrain() {
  const c = world.cells;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const cell = c[i];
      const g = world.grain[i];

      if (cell === AIR) {
        if (!isUnderground(x, y)) { terrainPixels[i] = 0; continue; }  // Himmel scheint durch
        // Gang: braun, leicht in der Farbe der Schicht; am Rand etwas heller
        const base = LAYER_COLORS[layerOf(x, y)][0];
        let edge = false;
        for (let k = 0; k < 4; k++) if (solidAt(x + DX[k], y + DY[k])) edge = true;
        const m = edge ? 0.42 : 0.25;
        const n = (g - 0.5) * 6;
        terrainPixels[i] = rgba(
          lerp(TUNNEL_BROWN[0], base[0] * 0.8, m) + n,
          lerp(TUNNEL_BROWN[1], base[1] * 0.8, m) + n,
          lerp(TUNNEL_BROWN[2], base[2] * 0.8, m) + n);
        continue;
      }

      if (cell === ROCK) {
        // grauer Stein mit gepunktetem dunklem Rand
        let rim = false;
        for (let k = 0; k < 4; k++) if (!cellIsRock(x + DX[k], y + DY[k])) rim = true;
        if (rim) {
          terrainPixels[i] = (x + y) % 2 ? rgba(72, 68, 70) : rgba(112, 110, 114);
        } else {
          const hi = !cellIsRock(x - 1, y - 1) || !cellIsRock(x - 2, y - 2) ? 22 : 0;
          const n = (g - 0.5) * 22 + hi;
          terrainPixels[i] = rgba(128 + n, 130 + n, 136 + n);
        }
        continue;
      }

      let col;
      if (cell === LOOSE) {
        const n = (g - 0.5) * 10;
        col = [LOOSE_COLOR[0] + n, LOOSE_COLOR[1] + n, LOOSE_COLOR[2] + n];
      } else {
        const L = LAYER_COLORS[layerOf(x, y)];
        const t = world.tex[i];
        const n = (g - 0.5) * 4;
        if (t === 3) {
          // Kiesel: grau mit dunklem Rand
          let rim = false;
          for (let k = 0; k < 4; k++) {
            const nx = x + DX[k], ny = y + DY[k];
            if (nx < 0 || ny < 0 || nx >= W || ny >= H || world.tex[ny * W + nx] !== 3) rim = true;
          }
          col = rim ? [84, 80, 82] : [126 + n * 3, 126 + n * 3, 132 + n * 3];
        } else if (t === 1) col = [L[1][0] + n, L[1][1] + n, L[1][2] + n];
        else if (t === 2) col = [L[0][0] * 0.55, L[0][1] * 0.5, L[0][2] * 0.45];
        else col = [L[0][0] + n, L[0][1] + n, L[0][2] + n];
      }
      terrainPixels[i] = rgba(col[0], col[1], col[2]);
    }
  }
  terrainCtx.putImageData(terrainImage, 0, 0);
  world.dirty = false;
}

// ---------- Ameisen ----------
// Ameisen liegen auf einer eigenen, feineren Ebene (ANT_RES-fach), damit man Kopf, Brust,
// Hinterleib, Beine und Fühler erkennt. Gezeichnet von oben, eckig, als Pixel-Art.
// Jede Pose (16 Richtungen × 4 Laufbilder × mit/ohne Sandkorn) wird beim Start einmal
// vorgezeichnet; danach wird nur noch kopiert. Das bleibt auch bei 1000 Ameisen schnell.
const ANT_RES = 4;      // feine Pixel (Design Nr. 4): bei Full-HD 1,5 Bildschirm-Pixel pro Ameisen-Pixel
const ANT_SIZE = 1.4;   // Größe der Ameise in Welt-Pixeln (Faktor)
const ANT_DIRS = 16;
const ANT_FRAMES = 4;
const SPRITE = 38;      // Kantenlänge eines Posen-Bildes in Ameisen-Pixeln
const antLayer = document.createElement('canvas');
antLayer.width = W * ANT_RES;
antLayer.height = H * ANT_RES;
const antCtx = antLayer.getContext('2d');

const ANT_PALETTE = {
  body: [26, 18, 13],
  shine: [84, 62, 46],
  leg: [34, 24, 16],
  grain: [250, 240, 214],
};
const pcss = c => `rgb(${c[0]},${c[1]},${c[2]})`;

function poly(g, pts) {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let k = 2; k < pts.length; k += 2) g.lineTo(pts[k], pts[k + 1]);
  g.closePath();
  g.fill();
}

// Ein Bein: Ansatz an der Brust, Knie nach außen, Fuß schwingt vor und zurück
function leg(g, baseX, side, swing, reach) {
  g.beginPath();
  g.moveTo(baseX, side * 0.15);
  g.lineTo(baseX + swing * 0.35, side * 0.75);
  g.lineTo(baseX + swing, side * reach);
  g.stroke();
}

// Zeichnet eine Ameise mit eckigen Körperteilen; x zeigt nach vorne, Einheit = Welt-Pixel
function drawAntShape(g, phase, carry) {
  const sw = Math.sin(phase) * 0.4;
  const px = 1 / (ANT_RES * ANT_SIZE);   // ein Ameisen-Pixel in diesen Einheiten
  g.lineJoin = 'miter';
  g.lineCap = 'square';

  // Beine (Dreifuß-Gang)
  g.strokeStyle = pcss(ANT_PALETTE.leg);
  g.lineWidth = px * 1.1;
  leg(g, 0.25, -1, 0.75 + sw, 1.1);
  leg(g, 0.05, 1, 0.05 - sw, 1.2);
  leg(g, -0.15, -1, -0.75 + sw, 1.15);
  leg(g, 0.25, 1, 0.75 - sw, 1.1);
  leg(g, 0.05, -1, 0.05 + sw, 1.2);
  leg(g, -0.15, 1, -0.75 - sw, 1.15);

  // Fühler, geknickt
  const f = Math.sin(phase * 0.5) * 0.1;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(1.2, side * 0.15);
    g.lineTo(1.6, side * (0.62 + f));
    g.lineTo(2.15, side * (0.5 - f));
    g.stroke();
  }

  g.fillStyle = pcss(ANT_PALETTE.body);
  // Hinterleib: kantiges Achteck
  poly(g, [-0.5, 0, -0.7, -0.58, -1.3, -0.82, -2.0, -0.66, -2.35, 0, -2.0, 0.66, -1.3, 0.82, -0.7, 0.58]);
  // Stielchen
  poly(g, [-0.6, 0, -0.42, -0.16, -0.2, 0, -0.42, 0.16]);
  // Brust: Sechseck
  poly(g, [-0.3, 0, -0.1, -0.32, 0.35, -0.38, 0.6, 0, 0.35, 0.38, -0.1, 0.32]);
  // Kopf: kantig, vorne etwas breiter
  poly(g, [0.55, 0, 0.68, -0.44, 1.1, -0.52, 1.4, -0.2, 1.4, 0.2, 1.1, 0.52, 0.68, 0.44]);
  // Kiefer
  poly(g, [1.3, -0.25, 1.62, -0.08, 1.35, -0.05]);
  poly(g, [1.3, 0.25, 1.62, 0.08, 1.35, 0.05]);

  // Glanzlichter als kleine Kanten
  g.fillStyle = pcss(ANT_PALETTE.shine);
  poly(g, [-0.85, -0.38, -1.35, -0.6, -1.9, -0.45, -1.4, -0.32]);
  poly(g, [0.85, -0.22, 1.1, -0.28, 1.2, -0.12, 0.95, -0.1]);

  if (carry) {
    // Korn mit dunklem Rand, damit es auch vor hellem Sand zu sehen ist
    g.fillStyle = pcss(ANT_PALETTE.body);
    poly(g, [1.35, -0.42, 2.2, -0.42, 2.2, 0.42, 1.35, 0.42]);
    g.fillStyle = pcss(ANT_PALETTE.grain);
    poly(g, [1.55, -0.24, 2.0, -0.24, 2.0, 0.24, 1.55, 0.24]);
  }
}

// Kanten hart machen: halbdurchsichtige Pixel entweder ganz oder gar nicht,
// Farbe auf die nächste Palettenfarbe runden. So wird es echte Pixel-Art.
function pixelate(g) {
  const img = g.getImageData(0, 0, SPRITE, SPRITE);
  const d = img.data;
  const pal = Object.values(ANT_PALETTE);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    const a = d[i + 3] / 255;
    const r = d[i] / a, gg = d[i + 1] / a, b = d[i + 2] / a;
    let best = pal[0], bd = Infinity;
    for (const c of pal) {
      const e = (c[0] - r) ** 2 + (c[1] - gg) ** 2 + (c[2] - b) ** 2;
      if (e < bd) { bd = e; best = c; }
    }
    d[i] = best[0]; d[i + 1] = best[1]; d[i + 2] = best[2]; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

const antSprites = [];   // [carry][richtung][laufbild]
function buildAntSprites() {
  for (let c = 0; c < 2; c++) {
    antSprites[c] = [];
    for (let k = 0; k < ANT_DIRS; k++) {
      antSprites[c][k] = [];
      for (let f = 0; f < ANT_FRAMES; f++) {
        const cv = document.createElement('canvas');
        cv.width = SPRITE; cv.height = SPRITE;
        const g = cv.getContext('2d', { willReadFrequently: true });
        g.translate(SPRITE / 2, SPRITE / 2);
        g.rotate(k / ANT_DIRS * Math.PI * 2);
        g.scale(ANT_RES * ANT_SIZE, ANT_RES * ANT_SIZE);
        drawAntShape(g, f / ANT_FRAMES * Math.PI * 2, c === 1);
        pixelate(g);
        antSprites[c][k][f] = cv;
      }
    }
  }
}
buildAntSprites();

function antPosition(a) {
  let fx = a.x, fy = a.y;
  if (a.path && a.pi < a.path.length) {
    const n = a.path[a.pi];
    fx += (n % W - a.x) * a.t;
    fy += (((n / W) | 0) - a.y) * a.t;
  }
  return [fx + 0.5, fy + 0.5];
}

function drawAnt(g, a) {
  const [fx, fy] = antPosition(a);
  const turn = a.angle / (Math.PI * 2) * ANT_DIRS;
  const k = ((Math.round(turn) % ANT_DIRS) + ANT_DIRS) % ANT_DIRS;
  const f = Math.floor(a.walk * ANT_FRAMES) % ANT_FRAMES;
  const img = antSprites[a.carry ? 1 : 0][k][f];
  g.drawImage(img, Math.round(fx * ANT_RES - SPRITE / 2), Math.round(fy * ANT_RES - SPRITE / 2));
}

// ---------- Bildschirm ----------

function render(screenCtx, cw, ch) {
  if (world.dirty) redrawTerrain();
  sceneCtx.clearRect(0, 0, W, H);
  drawSkyForeground(sceneCtx);
  sceneCtx.drawImage(terrain, 0, 0);
  applyLight(sceneCtx, W, H);

  drawSkyBackground(offCtx, performance.now());
  offCtx.drawImage(scene, 0, 0);

  antCtx.clearRect(0, 0, antLayer.width, antLayer.height);
  for (const a of ants) drawAnt(antCtx, a);
  applyLight(antCtx, antLayer.width, antLayer.height);

  screenCtx.fillStyle = '#140d08';
  screenCtx.fillRect(0, 0, cw, ch);
  const s = Math.min(cw / W, ch / H);
  const ox = Math.floor((cw - W * s) / 2), oy = Math.floor((ch - H * s) / 2);
  const dw = Math.round(W * s), dh = Math.round(H * s);
  screenCtx.imageSmoothingEnabled = false;
  screenCtx.drawImage(off, ox, oy, dw, dh);
  screenCtx.drawImage(antLayer, ox, oy, dw, dh);
}
