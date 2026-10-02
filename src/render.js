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

// ---------- Ameisen-Sprites ----------
const ANT_BODY = '#140c08';
const ANT_HEAD = '#0c0705';
const ANT_LEG = '#3a2618';
const ANT_FEEL = '#5a3a24';
const GRAIN = '#e0bf86';

function px(color, x, y) {
  sceneCtx.fillStyle = color;
  sceneCtx.fillRect(x, y, 1, 1);
}

function drawAnt(a) {
  let fx = a.x, fy = a.y;
  if (a.path && a.pi < a.path.length) {
    const n = a.path[a.pi];
    fx += (n % W - a.x) * a.t;
    fy += (((n / W) | 0) - a.y) * a.t;
  }
  const x = Math.round(fx), y = Math.round(fy);
  const phase = Math.floor(a.walk * 2) & 1;

  if (Math.abs(a.dx) >= Math.abs(a.dy)) {
    // waagrecht: Körper 4 Pixel lang, Beine zur festen Seite hin
    const f = a.dx < 0 ? -1 : 1;
    const legSide = solidAt(a.x, a.y - 1) && !solidAt(a.x, a.y + 1) ? -1 : 1;
    px(ANT_BODY, x - 2 * f, y);
    px(ANT_BODY, x - f, y);
    px(ANT_BODY, x, y);
    px(ANT_HEAD, x + f, y);
    if (phase) { px(ANT_LEG, x - f, y + legSide); px(ANT_LEG, x + f, y + legSide); }
    else px(ANT_LEG, x, y + legSide);
    px(ANT_FEEL, x + 2 * f, y - legSide);
    if (a.carry) px(GRAIN, x + 2 * f, y);
  } else {
    // senkrecht
    const f = a.dy < 0 ? -1 : 1;
    const legSide = solidAt(a.x - 1, a.y) && !solidAt(a.x + 1, a.y) ? -1 : 1;
    px(ANT_BODY, x, y - 2 * f);
    px(ANT_BODY, x, y - f);
    px(ANT_BODY, x, y);
    px(ANT_HEAD, x, y + f);
    if (phase) { px(ANT_LEG, x + legSide, y - f); px(ANT_LEG, x + legSide, y + f); }
    else px(ANT_LEG, x + legSide, y);
    px(ANT_FEEL, x - legSide, y + 2 * f);
    if (a.carry) px(GRAIN, x, y + 2 * f);
  }
}

// ---------- Bildschirm ----------

function render(screenCtx, cw, ch) {
  if (world.dirty) redrawTerrain();
  sceneCtx.clearRect(0, 0, W, H);
  drawSkyForeground(sceneCtx);
  sceneCtx.drawImage(terrain, 0, 0);
  for (const a of ants) drawAnt(a);
  applyLight(sceneCtx);

  drawSkyBackground(offCtx, performance.now());
  offCtx.drawImage(scene, 0, 0);

  screenCtx.fillStyle = '#140d08';
  screenCtx.fillRect(0, 0, cw, ch);
  const s = Math.min(cw / W, ch / H);
  const ox = Math.floor((cw - W * s) / 2), oy = Math.floor((ch - H * s) / 2);
  screenCtx.imageSmoothingEnabled = false;
  screenCtx.drawImage(off, ox, oy, Math.round(W * s), Math.round(H * s));
}
