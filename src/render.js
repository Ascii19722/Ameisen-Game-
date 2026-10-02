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
// Hinterleib, Beine und Fühler erkennt. Gezeichnet von oben, in Laufrichtung gedreht.
const ANT_RES = 6;      // bei Full-HD genau ein Bildschirm-Pixel
const ANT_SIZE = 1.25;  // Größe der Ameise in Welt-Pixeln (Faktor)
const antLayer = document.createElement('canvas');
antLayer.width = W * ANT_RES;
antLayer.height = H * ANT_RES;
const antCtx = antLayer.getContext('2d');

const ANT_BODY = '#1a120d';
const ANT_SHINE = '#5a4232';
const ANT_LEG = '#21170f';
const GRAIN = '#e6cf9c';

function ellipse(g, x, y, rx, ry) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}

// Ein Bein: Ansatz an der Brust, Knie nach außen, Fuß schwingt vor und zurück
function leg(g, baseX, side, swing, reach) {
  const kneeX = baseX + swing * 0.35, kneeY = side * 0.75;
  const footX = baseX + swing, footY = side * reach;
  g.beginPath();
  g.moveTo(baseX, side * 0.15);
  g.lineTo(kneeX, kneeY);
  g.lineTo(footX, footY);
  g.stroke();
}

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
  g.save();
  g.translate(fx * ANT_RES, fy * ANT_RES);
  g.rotate(a.angle);
  g.scale(ANT_RES * ANT_SIZE, ANT_RES * ANT_SIZE);   // ab hier in Welt-Pixeln, x zeigt nach vorne

  // Beine: Dreifuß-Gang, je drei Beine bewegen sich gleichzeitig
  const ph = a.walk * Math.PI * 2;
  const sw = Math.sin(ph) * 0.4;
  g.strokeStyle = ANT_LEG;
  g.lineWidth = 0.13;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  // vorne, Mitte, hinten – links (side -1) und rechts (side 1)
  leg(g, 0.25, -1, 0.8 + sw, 1.3);
  leg(g, 0.05, 1, 0.05 - sw, 1.45);
  leg(g, -0.15, -1, -0.8 + sw, 1.35);
  leg(g, 0.25, 1, 0.8 - sw, 1.3);
  leg(g, 0.05, -1, 0.05 + sw, 1.45);
  leg(g, -0.15, 1, -0.8 - sw, 1.35);

  // Fühler: geknickt, wippen leicht
  const f = Math.sin(ph * 0.5 + a.x) * 0.12;
  g.lineWidth = 0.1;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(1.2, side * 0.15);
    g.lineTo(1.6, side * (0.6 + f));
    g.lineTo(2.15, side * (0.48 - f));
    g.stroke();
  }

  // Körper: Hinterleib, Stielchen, Brust, Kopf – mit schmalen Taillen dazwischen
  g.fillStyle = ANT_BODY;
  ellipse(g, -1.4, 0, 0.9, 0.68);    // Hinterleib
  ellipse(g, -0.42, 0, 0.17, 0.13);  // Stielchen
  ellipse(g, 0.08, 0, 0.42, 0.26);   // Brust
  ellipse(g, 0.92, 0, 0.4, 0.38);    // Kopf
  g.lineWidth = 0.12;
  g.beginPath();
  g.moveTo(-0.6, 0); g.lineTo(-0.25, 0);   // Taille hinten
  g.moveTo(0.45, 0); g.lineTo(0.6, 0);     // Hals
  g.stroke();
  // Kiefer
  g.lineWidth = 0.1;
  g.beginPath();
  g.moveTo(1.25, -0.16); g.lineTo(1.48, -0.05);
  g.moveTo(1.25, 0.16); g.lineTo(1.48, 0.05);
  g.stroke();
  // Glanzlichter
  g.fillStyle = ANT_SHINE;
  ellipse(g, -1.25, -0.28, 0.4, 0.14);
  ellipse(g, 0.1, -0.1, 0.2, 0.07);
  ellipse(g, 0.98, -0.15, 0.15, 0.08);

  // Sandkorn zwischen den Kiefern
  if (a.carry) {
    g.fillStyle = GRAIN;
    ellipse(g, 1.75, 0, 0.36, 0.32);
  }
  g.restore();
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
