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

const GRASS = [rgba(92, 136, 58), rgba(112, 158, 66), rgba(74, 116, 50)];

function sandColor(x, y, i, loose) {
  const d = loose ? 0 : y - world.surface[x];
  const k = Math.min(1, d / 130);
  const g = world.grain[i];
  // Grundfarbe: oben heller, tiefer dunkler, dazu leichte Schichten
  let r = 224 - 50 * k, gg = 184 - 50 * k, b = 124 - 40 * k;
  const band = Math.sin(y * 0.33 + Math.sin(x * 0.04) * 1.5) * 5;
  const n = (g - 0.5) * 16 + band;
  r += n; gg += n; b += n * 0.7;
  if (loose) { r += 6; gg += 6; b += 4; }
  if (g > 0.985) { r -= 38; gg -= 36; b -= 28; }        // dunkle Körner
  else if (g < 0.012) { r += 22; gg += 22; b += 20; }   // helle Körner
  return [r, gg, b];
}

function redrawTerrain() {
  const c = world.cells;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const cell = c[i];
      if (cell === AIR) {
        if (!isUnderground(x, y)) {
          terrainPixels[i] = 0;   // durchsichtig: dahinter liegt der Himmel
        } else {
          // Tunnel: dunkles Braun, Boden etwas heller
          const n = (world.grain[i] - 0.5) * 10;
          const floor = solidAt(x, y + 1) ? 10 : 0;
          terrainPixels[i] = rgba(112 + n + floor, 77 + n + floor, 47 + n * 0.7 + floor * 0.6);
        }
        continue;
      }
      let [r, g, b] = sandColor(x, y, i, cell === LOOSE);
      // Rand zu Tunneln abdunkeln, Kante zum Himmel aufhellen
      let rim = false, sky = false;
      for (let k = 0; k < 4; k++) {
        const nx = x + DX[k], ny = y + DY[k];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || c[ny * W + nx] !== AIR) continue;
        if (isUnderground(nx, ny)) rim = true; else sky = true;
      }
      if (rim) { r *= 0.8; g *= 0.78; b *= 0.76; }
      else if (sky && !solidAt(x, y - 1)) { r += 12; g += 12; b += 8; }
      terrainPixels[i] = rgba(r, g, b);
    }
  }
  drawGrass();
  terrainCtx.putImageData(terrainImage, 0, 0);
  world.dirty = false;
}

// Grashalme auf unberührtem Boden (nicht auf dem Sandhügel)
function drawGrass() {
  for (let x = 0; x < W; x++) {
    const top = world.surface[x];
    if (columnTop(x) !== top || world.cells[idx(x, top)] !== SAND) continue;
    const g = world.grain[idx(x, top)];
    const h = g < 0.35 ? 0 : g < 0.75 ? 1 : g < 0.93 ? 2 : 3;
    for (let k = 1; k <= h; k++) terrainPixels[idx(x, top - k)] = GRASS[(x + k) % 3];
  }
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
