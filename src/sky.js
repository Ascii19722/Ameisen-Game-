'use strict';

// Himmel, Wald, Wolken und Tag/Nacht. Alles nur Optik, ohne Einfluss auf die Ameisen.

const DAY_LENGTH = 300;   // Sekunden Spielzeit für einen ganzen Tag (bei Tempo 1×)

const sky = {
  time: 0.4,              // 0 = Mitternacht, 0.25 Sonnenaufgang, 0.5 Mittag, 0.75 Sonnenuntergang
  day: 1,
  stars: [],
  clouds: [],
  forest: null,           // Bild mit Bäumen, Halmen, Blumen, Büschen und Gras
};

// Farben über den Tag: [Zeit, Himmel oben, Himmel am Horizont, Licht-Tönung (r,g,b,Stärke)]
// Tagsüber der warme lila-orange Himmel wie im Vorbild.
const SKY_KEYS = [
  [0.00, [12, 12, 32],   [36, 32, 64],    [14, 16, 48, 0.50]],
  [0.20, [28, 24, 58],   [78, 56, 92],    [24, 22, 62, 0.40]],
  [0.27, [80, 58, 108],  [246, 160, 112], [255, 140, 90, 0.10]],
  [0.35, [88, 62, 106],  [240, 164, 118], [255, 255, 255, 0.0]],
  [0.50, [98, 76, 126],  [244, 178, 132], [255, 255, 255, 0.0]],
  [0.65, [88, 62, 106],  [240, 164, 118], [255, 255, 255, 0.0]],
  [0.75, [64, 40, 82],   [236, 124, 88],  [255, 110, 70, 0.12]],
  [0.80, [28, 24, 58],   [78, 52, 88],    [24, 22, 62, 0.40]],
  [1.00, [12, 12, 32],   [36, 32, 64],    [14, 16, 48, 0.50]],
];

const lerp = (a, b, k) => a + (b - a) * k;
const lerpArr = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));

function skyColors(t) {
  let k = 0;
  while (k < SKY_KEYS.length - 2 && SKY_KEYS[k + 1][0] <= t) k++;
  const a = SKY_KEYS[k], b = SKY_KEYS[k + 1];
  const f = (t - a[0]) / (b[0] - a[0]);
  return { top: lerpArr(a[1], b[1], f), horizon: lerpArr(a[2], b[2], f), light: lerpArr(a[3], b[3], f) };
}

// Wie dunkel ist es? 0 = Tag, 1 = tiefe Nacht
function nightness(t) {
  const d = Math.abs(t - 0.5);        // 0 mittags, 0.5 um Mitternacht
  return Math.max(0, Math.min(1, (d - 0.24) / 0.06));
}

const css = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

// ---------- Erzeugen ----------

function generateSky() {
  sky.stars = [];
  for (let k = 0; k < 80; k++) {
    sky.stars.push({ x: randInt(0, W - 1), y: randInt(0, SURFACE_Y - 20), b: rand(0.4, 1), p: rand(0, 6.28) });
  }
  sky.clouds = [];
  for (let k = 0; k < 6; k++) sky.clouds.push(makeCloud(rand(0, W)));
  sky.forest = makeForest();
}

// Wolke aus runden weißen Bällchen
function makeCloud(x) {
  const w = randInt(18, 34), h = 12;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const puffs = [];
  const n = randInt(3, 6);
  for (let k = 0; k < n; k++) {
    const r = rand(2.2, 3.8);
    puffs.push({ x: lerp(r + 1, w - r - 1, n === 1 ? 0.5 : k / (n - 1)) + rand(-1, 1), y: h - r - 1 - rand(0, 3), r });
  }
  for (let y = 0; y < h; y++) {
    for (let xx = 0; xx < w; xx++) {
      for (const p of puffs) {
        const dx = xx + 0.5 - p.x, dy = y + 0.5 - p.y;
        const d = Math.hypot(dx, dy);
        if (d > p.r) continue;
        g.fillStyle = d > p.r - 1 && dy > 0 ? 'rgb(228,222,226)' : 'rgb(252,250,246)';
        g.fillRect(xx, y, 1, 1);
        break;
      }
    }
  }
  return { img: c, x, y: rand(1, 18), speed: rand(0.8, 2.4) };
}

function pix(g, col, x, y) {
  g.fillStyle = css(col);
  g.fillRect(x, y, 1, 1);
}

function fillCircle(g, cx, cy, r, colorAt) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r * r) continue;
      pix(g, colorAt(dx / r, dy / r), x, y);
    }
  }
}

// Wald in mehreren Schichten: hinten blass, vorne kräftig grün.
const FOREST_LAYERS = [
  { crown: [196, 178, 120], trunk: [206, 150, 116], count: 22, r: [7, 11], h: [26, 34] },
  { crown: [164, 170, 104], trunk: [176, 120, 92],  count: 18, r: [7, 11], h: [22, 32] },
  { crown: [128, 160, 88],  trunk: [134, 92, 66],   count: 14, r: [6, 10], h: [18, 30] },
];

function makeForest() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const ground = SURFACE_Y;

  FOREST_LAYERS.forEach((L, li) => {
    for (let k = 0; k < L.count; k++) {
      const x = rand(-6, W + 6);
      const r = rand(L.r[0], L.r[1]);
      const cy = ground - rand(L.h[0], L.h[1]);
      // dünner Stamm
      g.fillStyle = css(L.trunk);
      g.fillRect(Math.round(x), Math.round(cy), li === 2 ? 2 : 1, ground - Math.round(cy));
      // Krone aus 1–3 Kreisen, oben links etwas heller
      const blobs = randInt(1, 3);
      for (let b = 0; b < blobs; b++) {
        const bx = x + rand(-r * 0.5, r * 0.5), by = cy + rand(-r * 0.3, r * 0.2), br = r * rand(0.7, 1);
        fillCircle(g, bx, by, br, (dx, dy) =>
          dx + dy < -0.9 ? L.crown.map(v => v + 10) : (dx + dy > 0.9 ? L.crown.map(v => v - 10) : L.crown));
      }
    }
  });

  // ein paar kräftig grüne Bäume ganz vorne
  for (let k = 0; k < 3; k++) {
    const x = rand(10, W - 10), r = rand(6, 9), cy = ground - rand(28, 36);
    g.fillStyle = 'rgb(104,70,50)';
    g.fillRect(Math.round(x), Math.round(cy), 2, ground - Math.round(cy));
    for (let b = 0; b < 3; b++) {
      fillCircle(g, x + rand(-r * 0.6, r * 0.6), cy + rand(-r * 0.4, r * 0.3), r * rand(0.7, 1), (dx, dy) =>
        dx + dy < -0.8 ? [96, 172, 84] : (dx + dy > 0.8 ? [58, 128, 62] : [74, 150, 72]));
    }
    // kleine helle Früchte/Blätter
    for (let s = 0; s < 4; s++) pix(g, [196, 226, 160], Math.round(x + rand(-r, r)), Math.round(cy + rand(-r * 0.6, r * 0.6)));
  }

  // gelbe Halme im Zickzack
  for (let k = 0; k < 14; k++) {
    let x = Math.round(rand(0, W)), y = ground - 1;
    const hgt = randInt(10, 22);
    for (let s = 0; s < hgt; s++) {
      pix(g, s > hgt - 6 ? [236, 214, 72] : [196, 186, 70], x, y - s);
      if (s % 4 === 3) x += Math.random() < 0.5 ? -1 : 1;
    }
  }

  // Pusteblumen: dünner Stiel mit weißer Kugel
  for (let k = 0; k < 7; k++) {
    const x = Math.round(rand(0, W)), hgt = randInt(9, 16);
    g.fillStyle = 'rgb(108,150,80)';
    g.fillRect(x, ground - hgt, 1, hgt);
    fillCircle(g, x + 0.5, ground - hgt, 1.8, () => [246, 244, 236]);
  }

  // Büsche am Boden
  for (let k = 0; k < 9; k++) {
    const x = rand(0, W), r = rand(2.5, 4.5);
    fillCircle(g, x, ground - r * 0.5, r, (dx, dy) => dy < -0.4 ? [78, 154, 74] : [56, 126, 60]);
    if (Math.random() < 0.6) pix(g, [230, 236, 220], Math.round(x), Math.round(ground - r));
  }

  // Grasstreifen mit Halmen und kleinen weißen Blüten
  for (let x = 0; x < W; x++) {
    pix(g, [64, 128, 52], x, ground - 1);
    const hgt = randInt(0, 3);
    const col = [[72, 140, 56], [96, 166, 70], [58, 118, 48]][randInt(0, 2)];
    for (let s = 1; s <= hgt; s++) pix(g, col, x, ground - 1 - s);
    if (Math.random() < 0.05) {
      pix(g, [90, 150, 70], x, ground - 2);
      pix(g, [90, 150, 70], x, ground - 3);
      pix(g, [250, 250, 244], x, ground - 4);
    }
  }
  return c;
}

// ---------- Ablauf ----------

function updateSky(dt) {
  sky.time += dt / DAY_LENGTH;
  if (sky.time >= 1) { sky.time -= 1; sky.day++; }
  for (const c of sky.clouds) {
    c.x += c.speed * dt;
    if (c.x > W + 2) Object.assign(c, makeCloud(-c.img.width - rand(0, 40)));
  }
}

function clockText() {
  const m = Math.floor(sky.time * 24 * 60);
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(Math.floor(m % 60 / 10) * 10).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ---------- Zeichnen ----------

// Hintergrund: Himmelsverlauf, Sterne, Mond
function drawSkyBackground(g, now) {
  const t = sky.time;
  const col = skyColors(t);
  for (let y = 0; y < SURFACE_Y; y++) {
    const k = Math.min(1, y / (SURFACE_Y - 4));
    g.fillStyle = css(lerpArr(col.top, col.horizon, k));
    g.fillRect(0, y, W, 1);
  }

  const night = nightness(t);
  if (night > 0) {
    for (const s of sky.stars) {
      const a = night * s.b * (0.7 + 0.3 * Math.sin(now * 0.002 + s.p));
      g.fillStyle = `rgba(255,250,225,${a.toFixed(3)})`;
      g.fillRect(s.x, s.y, 1, 1);
    }
    drawMoon(g, (t + 0.5) % 1);
  }
}

function drawMoon(g, t) {
  if (t < 0.2 || t > 0.8) return;
  const p = (t - 0.2) / 0.6;
  const x = lerp(-8, W + 8, p);
  const y = SURFACE_Y - 10 - Math.sin(Math.PI * p) * (SURFACE_Y - 18);
  fillCircle(g, x, y, 3.5, (dx, dy) => (dx > 0.2 && dy < 0.1 ? [204, 206, 214] : [236, 236, 240]));
}

// Wolken und Wald liegen vor dem Himmel, aber hinter dem Boden.
function drawSkyForeground(g) {
  for (const c of sky.clouds) g.drawImage(c.img, Math.round(c.x), Math.round(c.y));
  g.drawImage(sky.forest, 0, 0);
}

// Tageslicht über alles legen, was schon auf g gezeichnet ist (nicht über den Himmel).
function applyLight(g, w, h) {
  const l = skyColors(sky.time).light;
  if (l[3] <= 0.005) return;
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = `rgba(${l[0] | 0},${l[1] | 0},${l[2] | 0},${l[3].toFixed(3)})`;
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over';
}
