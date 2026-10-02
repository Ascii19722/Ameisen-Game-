'use strict';

// Die Welt wird in Welt-Auflösung (W×H) gezeichnet und von der Kamera vergrößert auf den
// Bildschirm gebracht (ohne Glättung → Pixel-Art). Ebenen:
//   terrain = Boden, Gänge, Steine, Sandhügel (nur geänderte Stellen werden neu berechnet)
//   scene   = Wolken, Wald und terrain (wird je nach Tageszeit getönt)
//   off     = Himmel + scene
//   antLayer= Ameisen in Bildschirm-Auflösung (Seitenansicht, gedreht)
function makeLayer(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
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
const antLayer = makeLayer(16, 16);
const antCtx = antLayer.getContext('2d');

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
function nearTunnel(x, y) {
  for (let k = 0; k < 4; k++) {
    const nx = x + DX[k], ny = y + DY[k];
    if (nx >= 0 && ny >= 0 && nx < W && ny < H && world.cells[ny * W + nx] === AIR && isUnderground(nx, ny)) return true;
  }
  return false;
}

function cellColor(x, y) {
  const i = y * W + x;
  const cell = world.cells[i];
  const g = world.grain[i];

  if (cell === AIR) {
    if (!isUnderground(x, y)) return 0;   // Himmel scheint durch
    // Gang: braun mit Schichtfarbe, bröckliger Rand (helle Krümel am Boden, dunklere Ränder)
    const base = LAYER_COLORS[layerOf(x, y)][0];
    let edge = false;
    for (let k = 0; k < 4; k++) if (solidAt(x + DX[k], y + DY[k])) edge = true;
    const m = edge ? 0.42 : 0.25;
    let n = (g - 0.5) * 6;
    if (edge && g < 0.3) n += 14;                         // Krümel
    if (solidAt(x, y + 1) && g > 0.65) n += 10;           // Sandkrümel am Gangboden
    return rgba(lerp(TUNNEL_BROWN[0], base[0] * 0.8, m) + n,
      lerp(TUNNEL_BROWN[1], base[1] * 0.8, m) + n,
      lerp(TUNNEL_BROWN[2], base[2] * 0.8, m) + n);
  }

  if (cell === ROCK) {   // grauer Stein mit gepunktetem dunklem Rand
    let rim = false;
    for (let k = 0; k < 4; k++) if (!cellIsRock(x + DX[k], y + DY[k])) rim = true;
    if (rim) return (x + y) % 2 ? rgba(72, 68, 70) : rgba(112, 110, 114);
    const hi = !cellIsRock(x - 1, y - 1) || !cellIsRock(x - 2, y - 2) ? 22 : 0;
    const n = (g - 0.5) * 22 + hi;
    return rgba(128 + n, 130 + n, 136 + n);
  }

  let col;
  if (cell === LOOSE) {
    const n = (g - 0.5) * 10;
    col = [LOOSE_COLOR[0] + n, LOOSE_COLOR[1] + n, LOOSE_COLOR[2] + n];
  } else {
    const L = LAYER_COLORS[layerOf(x, y)];
    const t = world.tex[i];
    const n = (g - 0.5) * 4;
    if (t === 3) {   // Kiesel
      let rim = false;
      for (let k = 0; k < 4; k++) {
        const nx = x + DX[k], ny = y + DY[k];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || world.tex[ny * W + nx] !== 3) rim = true;
      }
      col = rim ? [84, 80, 82] : [126 + n * 3, 126 + n * 3, 132 + n * 3];
    } else if (t === 1) col = [L[1][0] + n, L[1][1] + n, L[1][2] + n];
    else if (t === 2) col = [L[0][0] * 0.55, L[0][1] * 0.5, L[0][2] * 0.45];
    else col = [L[0][0] + n, L[0][1] + n, L[0][2] + n];
    // bröckliger Rand am Gang: ausgebrochene, dunklere Stücke
    if (nearTunnel(x, y)) {
      const k = g < 0.45 ? 0.62 : 0.8;
      col = [col[0] * k, col[1] * k * 0.97, col[2] * k * 0.94];
    }
  }
  return rgba(col[0], col[1], col[2]);
}

// Nur den geänderten Bereich neu berechnen
function redrawTerrain() {
  const r = world.dirtyRect || { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
  const x0 = Math.max(0, r.x0), y0 = Math.max(0, r.y0), x1 = Math.min(W - 1, r.x1), y1 = Math.min(H - 1, r.y1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) terrainPixels[y * W + x] = cellColor(x, y);
  terrainCtx.putImageData(terrainImage, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  world.dirty = false;
  world.dirtyRect = null;
}

// ---------- Ameisen ----------

function antWorldPos(a) {
  let fx = a.x, fy = a.y;
  if (a.path && a.pi < a.path.length) {
    const n = a.path[a.pi];
    fx += (n % W - a.x) * a.t;
    fy += (((n / W) | 0) - a.y) * a.t;
  }
  // Füße auf den Boden setzen: halbe Zelle in Richtung Boden verschieben
  return [fx + 0.5 - Math.sin(a.rot) * 0.5, fy + 0.5 + Math.cos(a.rot) * 0.5];
}

function drawAnts(g, cam, cw, ch) {
  const s = cam.zoom;
  const k = s / SPRITE_RES;   // Sprite-Pixel → Bildschirm
  g.imageSmoothingEnabled = false;
  for (const a of ants) {
    const [wx, wy] = antWorldPos(a);
    const sx = (wx - cam.x) * s + cw / 2, sy = (wy - cam.y) * s + ch / 2;
    if (sx < -60 || sy < -60 || sx > cw + 60 || sy > ch + 60) continue;
    const frame = Math.floor(a.walk) % WALK_FRAMES;
    const img = antSprites[a.caste][a.carry ? 1 : 0][frame];
    // Beim Umdrehen wird der Körper kurz schmal (dreht sich zu uns und wieder weg)
    const squash = a.turn > 0 ? Math.max(0.15, Math.abs(a.turn / 0.2 * 2 - 1)) : 1;
    g.save();
    g.translate(sx, sy);
    g.rotate(a.rot);
    g.scale(a.face * squash, 1);
    g.drawImage(img, -SPRITE_SIZE * k / 2, -SPRITE_GROUND * k, SPRITE_SIZE * k, SPRITE_SIZE * k);
    g.restore();
  }
}

// ---------- Bildschirm ----------

function render(screenCtx, cw, ch, cam) {
  if (world.dirty) redrawTerrain();
  sceneCtx.clearRect(0, 0, W, H);
  drawSkyForeground(sceneCtx);
  sceneCtx.drawImage(terrain, 0, 0);
  applyLight(sceneCtx, W, H);
  drawSkyBackground(offCtx, performance.now());
  offCtx.drawImage(scene, 0, 0);

  screenCtx.fillStyle = '#140d08';
  screenCtx.fillRect(0, 0, cw, ch);
  const s = cam.zoom;
  screenCtx.imageSmoothingEnabled = false;
  screenCtx.drawImage(off, cw / 2 - cam.x * s, ch / 2 - cam.y * s, W * s, H * s);

  if (antLayer.width !== cw || antLayer.height !== ch) { antLayer.width = cw; antLayer.height = ch; }
  antCtx.clearRect(0, 0, cw, ch);
  drawAnts(antCtx, cam, cw, ch);
  applyLight(antCtx, cw, ch);
  screenCtx.drawImage(antLayer, 0, 0);
}
