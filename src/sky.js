'use strict';

// Himmel, Wald, Wolken und Tag/Nacht. Alles nur Optik, ohne Einfluss auf die Ameisen.

const DAY_LENGTH = 300;   // Sekunden Spielzeit für einen ganzen Tag (bei Tempo 1×)

const sky = {
  time: 0.3,              // 0 = Mitternacht, 0.25 Sonnenaufgang, 0.5 Mittag, 0.75 Sonnenuntergang
  day: 1,
  stars: [],
  clouds: [],
  farForest: null,
  nearForest: null,
};

// Farben über den Tag: [Zeit, Himmel oben, Himmel am Horizont, Licht-Tönung (r,g,b,Stärke)]
const SKY_KEYS = [
  [0.00, [8, 12, 34],    [24, 32, 66],    [12, 18, 52, 0.50]],
  [0.20, [18, 24, 60],   [56, 56, 98],    [20, 24, 64, 0.42]],
  [0.25, [72, 92, 150],  [242, 152, 100], [255, 140, 70, 0.18]],
  [0.31, [112, 172, 226], [204, 224, 238], [255, 200, 140, 0.04]],
  [0.50, [118, 184, 236], [208, 234, 246], [255, 255, 255, 0.0]],
  [0.69, [112, 172, 226], [210, 222, 232], [255, 200, 140, 0.04]],
  [0.75, [70, 76, 138],  [246, 128, 78],  [255, 110, 60, 0.20]],
  [0.80, [18, 24, 60],   [60, 48, 92],    [20, 24, 64, 0.42]],
  [1.00, [8, 12, 34],    [24, 32, 66],    [12, 18, 52, 0.50]],
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
  for (let k = 0; k < 70; k++) {
    sky.stars.push({ x: randInt(0, W - 1), y: randInt(0, 40), b: rand(0.4, 1), p: rand(0, 6.28) });
  }
  sky.clouds = [];
  for (let k = 0; k < 7; k++) sky.clouds.push(makeCloud(rand(0, W)));
  sky.farForest = makeForest(true);
  sky.nearForest = makeForest(false);
}

function makeCloud(x) {
  const w = randInt(16, 34), h = randInt(6, 10);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  // aus ein paar Kreisen zusammengesetzt, Unterseite flach
  const blobs = [];
  for (let k = 0; k < 4 + randInt(0, 3); k++) {
    blobs.push({ x: rand(4, w - 4), y: rand(h * 0.45, h - 3), r: rand(2.5, h * 0.55) });
  }
  for (let y = 0; y < h; y++) {
    for (let xx = 0; xx < w; xx++) {
      let inside = false, shade = false;
      for (const b of blobs) {
        const d = Math.hypot(xx - b.x, y - b.y);
        if (d <= b.r) { inside = true; if (y - b.y > b.r * 0.35) shade = true; }
      }
      if (!inside || y >= h - 1) continue;
      g.fillStyle = shade ? 'rgb(214,224,236)' : 'rgb(250,252,255)';
      g.fillRect(xx, y, 1, 1);
    }
  }
  return { img: c, x, y: rand(3, 17), speed: rand(0.6, 2.2) };
}

// Waldsilhouette als Bild in Weltgröße, steht auf der Oberfläche.
function makeForest(far) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const base = far ? [96, 128, 124] : [44, 76, 50];
  const light = far ? [108, 140, 134] : [64, 102, 62];
  const dark = far ? [86, 116, 114] : [32, 58, 40];
  let x = randInt(-4, 2);
  while (x < W + 6) {
    const xi = Math.max(0, Math.min(W - 1, Math.round(x)));
    const ground = world.surface[xi] + 1;
    const pine = Math.random() < (far ? 0.65 : 0.5);
    const hgt = far ? randInt(10, 20) : randInt(14, 28);
    if (pine) drawPine(g, Math.round(x), ground, hgt, base, light, dark);
    else drawLeafTree(g, Math.round(x), ground, hgt, base, light, dark);
    x += far ? rand(3, 7) : rand(6, 16);
    if (!far && Math.random() < 0.18) x += rand(10, 30);   // Lichtungen
  }
  return c;
}

function pix(g, col, x, y) {
  g.fillStyle = css(col);
  g.fillRect(x, y, 1, 1);
}

function drawPine(g, x, ground, h, base, light, dark) {
  const top = ground - h;
  for (let y = top; y < ground - 2; y++) {
    const r = y - top;
    // Stufen wie Tannenzweige
    const half = Math.floor((r % 5) * 0.5 + r * 0.22);
    for (let dx = -half; dx <= half; dx++) {
      const col = dx < 0 && dx > -half + 1 ? light : (dx === half ? dark : base);
      pix(g, col, x + dx, y);
    }
  }
  for (let y = ground - 3; y < ground; y++) pix(g, dark, x, y);
}

function drawLeafTree(g, x, ground, h, base, light, dark) {
  const trunkTop = ground - Math.floor(h * 0.4);
  for (let y = trunkTop; y < ground; y++) pix(g, dark, x, y);
  const r = Math.max(3, h * 0.35);
  const cy = ground - h + r;
  for (let k = 0; k < 3; k++) {
    const bx = x + rand(-r * 0.6, r * 0.6), by = cy + rand(-1, r * 0.5), br = r * rand(0.6, 0.9);
    for (let yy = Math.floor(by - br); yy <= Math.ceil(by + br); yy++) {
      for (let xx = Math.floor(bx - br); xx <= Math.ceil(bx + br); xx++) {
        const d = Math.hypot(xx - bx, yy - by);
        if (d > br) continue;
        const col = (xx - bx) + (yy - by) < -br * 0.5 ? light : (d > br - 1 && yy > by ? dark : base);
        pix(g, col, xx, yy);
      }
    }
  }
}

// ---------- Ablauf ----------

function updateSky(dt) {
  sky.time += dt / DAY_LENGTH;
  if (sky.time >= 1) { sky.time -= 1; sky.day++; }
  for (const c of sky.clouds) {
    c.x += c.speed * dt;
    if (c.x > W + 2) { Object.assign(c, makeCloud(-c.img.width - rand(0, 40))); }
  }
}

function clockText() {
  const m = Math.floor(sky.time * 24 * 60);
  const hh = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(Math.floor(m % 60 / 10) * 10).padStart(2, '0');
  return `Tag ${sky.day}, ${hh}:${mm}`;
}

// ---------- Zeichnen ----------

// Hintergrund: Himmelsverlauf, Sterne, Sonne, Mond
function drawSkyBackground(g, now) {
  const t = sky.time;
  const col = skyColors(t);
  const horizon = Math.round(H * 0.25);
  for (let y = 0; y < horizon + 4; y++) {
    const k = Math.pow(Math.min(1, y / horizon), 1.6);
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
  }

  // Sonne (tagsüber) und Mond (nachts) auf einem Bogen über den Himmel
  drawOrb(g, t, horizon, 4, [255, 238, 168], [255, 220, 140]);
  drawOrb(g, (t + 0.5) % 1, horizon, 3, [232, 234, 240], null);
}

function drawOrb(g, t, horizon, r, color, glow) {
  if (t < 0.2 || t > 0.8) return;
  const p = (t - 0.2) / 0.6;
  const x = Math.round(lerp(-8, W + 8, p));
  const y = Math.round(horizon + 6 - Math.sin(Math.PI * p) * (horizon - 6));
  if (glow) {
    g.fillStyle = `rgba(${glow[0]},${glow[1]},${glow[2]},0.25)`;
    disc(g, x, y, r + 2);
  }
  g.fillStyle = css(color);
  disc(g, x, y, r);
  if (!glow) {   // Mondkrater
    g.fillStyle = 'rgb(196,200,212)';
    g.fillRect(x - 1, y - 1, 1, 1);
    g.fillRect(x + 1, y + 1, 1, 1);
  }
}

function disc(g, cx, cy, r) {
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
    g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

// Wolken und Wald liegen vor dem Himmel, aber hinter dem Sand.
function drawSkyForeground(g) {
  for (const c of sky.clouds) g.drawImage(c.img, Math.round(c.x), Math.round(c.y));
  g.drawImage(sky.farForest, 0, 0);
  g.drawImage(sky.nearForest, 0, 1);
}

// Tageslicht über alles legen, was schon auf g gezeichnet ist (nicht über den Himmel).
function applyLight(g) {
  const l = skyColors(sky.time).light;
  if (l[3] <= 0.005) return;
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = `rgba(${l[0] | 0},${l[1] | 0},${l[2] | 0},${l[3].toFixed(3)})`;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
}
