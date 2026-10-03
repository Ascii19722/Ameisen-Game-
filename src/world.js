'use strict';

// Die Welt ist ein Raster aus Zellen. Eine Zelle = ein Pixel der Pixel-Art.
// Die Kamera zeigt davon einen Ausschnitt; man kann hinein- und herauszoomen.
const W = 480;
const H = 420;
const N = W * H;

const AIR = 0;    // Luft oder gegrabener Gang
const SAND = 1;   // gewachsener Boden
const LOOSE = 2;  // von Ameisen abgelegter, lockerer Sand
const ROCK = 3;   // Stein, kann nicht gegraben werden

const SURFACE_Y = 90;          // Höhe der Erdoberfläche (darüber Himmel und Wald)
const TUNNEL_R = 2.2;          // Gänge sind ca. 4–5 Zellen breit
const MAX_DUG = (H - SURFACE_Y) * W * 0.18;   // ab hier gilt das Nest als „fertig“

// Bauplan: nur Neigungen, keine festen Wege (siehe CLAUDE.md)
const PLAN = {
  wiggle: 0.34,      // zufälliges Wackeln der Grabrichtung
  down: 0.035,       // Neigung zur Wunschrichtung
  spread: 18,        // Abstand, den neue Gänge zu bekannten Gängen halten
  chamberGap: 40,    // Mindestabstand zwischen Kammern
  stub: 9,           // Länge des Stummels zu einer Seitenkammer
  room: [32, 16],       // jede Kammer gleich groß: Breite × Höhe in Pixeln (oval, liegend; Nutzerwunsch)
  royalRoom: [46, 22],  // die Königskammer ist größer
  queenDepth: [105, 125],   // so tief gräbt die Königin ihren Schacht (Nutzerwunsch: etwa auf halber Höhe)
  royalMoves: 0,     // wie oft die Königin in eine tiefere Kammer umzieht (0 = nie, Nutzerwunsch)
};

const world = {
  cells: new Uint8Array(N),
  surface: new Int16Array(W),
  layers: [new Int16Array(W), new Int16Array(W), new Int16Array(W)],
  grain: new Float32Array(N),
  tex: new Uint8Array(N),        // 0 normal, 1 heller Sprenkel, 2 dunkler Punkt, 3 Kiesel
  tips: [],                      // Grabstellen: hier wird gerade gegraben
  chambers: [],                  // fertige Kammern {cx, cy, floor, id, royal}
  pts: [],                       // Punkte auf Gang-Mittellinien (für Abzweige)
  branchStarts: [],
  royal: null,                   // Königskammer
  entranceX: 0,
  entrances: [],                 // alle Eingänge (x-Positionen)
  dug: 0,
  time: 0,                       // Spielzeit in Sekunden (für aufgegebene Baustellen)
  moves: 0,                      // so oft ist die Königin schon umgezogen
  dirty: true,
  dirtyRect: null,
};

const idx = (x, y) => y * W + x;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const angleTo = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));

function solidAt(x, y) {
  if (y < 0) return false;
  if (x < 0 || x >= W || y >= H) return true;
  return world.cells[y * W + x] !== AIR;
}

function isUnderground(x, y) {
  return y >= world.surface[x];
}

function layerOf(x, y) {
  const l = world.layers;
  if (y < l[0][x]) return 0;
  if (y < l[1][x]) return 1;
  if (y < l[2][x]) return 2;
  return 3;
}

function columnTop(x) {
  const c = world.cells;
  for (let y = 0; y < H; y++) if (c[y * W + x] !== AIR) return y;
  return H;
}

function markDirty(x0, y0, x1, y1) {
  const r = world.dirtyRect;
  if (!r) world.dirtyRect = { x0, y0, x1, y1 };
  else { r.x0 = Math.min(r.x0, x0); r.y0 = Math.min(r.y0, y0); r.x1 = Math.max(r.x1, x1); r.y1 = Math.max(r.y1, y1); }
  world.dirty = true;
}

function wavyLine(base, amp) {
  const a = new Int16Array(W);
  const p1 = rand(0, 6.28), p2 = rand(0, 6.28), p3 = rand(0, 6.28);
  for (let x = 0; x < W; x++) {
    a[x] = Math.round(base + amp * (Math.sin(x * 0.02 + p1) * 0.6 + Math.sin(x * 0.06 + p2) * 0.3 +
      Math.sin(x * 0.2 + p3) * 0.15) + (Math.random() < 0.15 ? 1 : 0));
  }
  return a;
}

function generateWorld() {
  const c = world.cells;
  c.fill(AIR);
  world.tex.fill(0);
  world.tips = [];
  world.chambers = [];
  world.pts = [];
  world.branchStarts = [];
  world.royal = null;
  world.dug = 0;
  world.time = 0;
  world.moves = 0;

  const ground = H - SURFACE_Y;
  for (let x = 0; x < W; x++) {
    world.surface[x] = SURFACE_Y;
    for (let y = SURFACE_Y; y < H; y++) c[y * W + x] = SAND;
  }
  world.layers[0] = wavyLine(SURFACE_Y + ground * 0.05, 2);
  world.layers[1] = wavyLine(SURFACE_Y + ground * 0.33, 4);
  world.layers[2] = wavyLine(SURFACE_Y + ground * 0.66, 4);

  for (let i = 0; i < N; i++) world.grain[i] = Math.random();
  makeTexture();
  world.entranceX = randInt(Math.floor(W * 0.4), Math.floor(W * 0.6));
  world.entrances = [world.entranceX];   // weitere Eingänge kommen mit der Zeit dazu
  makeRocks();
  makePlates();

  // Eingang und erste Grabstelle: die Königin gräbt zuerst tief nach unten
  carve(world.entranceX, SURFACE_Y + 1, TUNNEL_R);
  world.tips.push(newTip(world.entranceX, SURFACE_Y + 2, Math.PI / 2 + rand(-0.25, 0.25), rand(PLAN.queenDepth[0], PLAN.queenDepth[1]) / 0.8, 'queen'));
  world.dirty = true;
  world.dirtyRect = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };
}

function makeTexture() {
  const t = world.tex;
  for (let y = SURFACE_Y; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = Math.random();
      if (r < 0.055) {
        const len = randInt(1, 3);
        for (let k = 0; k < len && x + k < W; k++) t[idx(x + k, y)] = 1;
      } else if (r < 0.059) t[idx(x, y)] = 2;
    }
  }
}

// Große Steine (fest, wenige wie im Vorbild) und Kiesel (nur Muster)
function makeRock(cx, cy, rx, ry, pebble) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      if (x < 0 || x >= W || y <= SURFACE_Y + 4 || y >= H) continue;
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1 + rand(-0.15, 0.1)) continue;
      if (pebble) world.tex[idx(x, y)] = 3;
      else world.cells[idx(x, y)] = ROCK;
    }
  }
}

function makeRocks() {
  const ex = world.entranceX;
  for (let k = 0; k < 16; k++) {
    const rx = rand(3, 9), ry = rx * rand(0.55, 0.8);
    const x = rand(0, W), y = rand(SURFACE_Y + 14, H - 4);
    if (Math.abs(x - ex) < rx + 8 && y < SURFACE_Y + 40) continue;   // Eingang frei lassen
    makeRock(x, y, rx, ry, false);
  }
  for (let k = 0; k < 90; k++) makeRock(rand(0, W), rand(SURFACE_Y + 6, H - 2), rand(1, 2.4), rand(0.8, 1.6), true);
}

// Steinplatten an den Grenzen zwischen den Bodenschichten. Sie haben ein paar Lücken – wo, wissen
// die Ameisen nicht: Sie stoßen auf die Platte und tasten sich daran entlang, bis sie eine Lücke finden.
function makePlates() {
  for (const l of [1, 2]) {
    const gaps = [];
    const n = randInt(2, 4);
    for (let k = 0; k < n; k++) gaps.push([rand(20, W - 20), rand(5, 9)]);
    let thick = 2;
    for (let x = 0; x < W; x++) {
      if (gaps.some(([gx, gw]) => Math.abs(x - gx) < gw + rand(-1, 1))) continue;
      if (Math.random() < 0.15) thick = Math.max(2, Math.min(4, thick + (Math.random() < 0.5 ? -1 : 1)));
      const yb = world.layers[l][x];
      for (let t = 0; t < thick; t++) {
        const y = yb - 1 + t;
        if (y > SURFACE_Y + 6 && y < H - 2) world.cells[idx(x, y)] = ROCK;
      }
    }
  }
}

// ---------- Graben ----------

// Gräbt eine runde Stelle frei (Steine bleiben stehen). Liefert die Zahl der entfernten Zellen.
function carve(cx, cy, r, floorY = Infinity) {
  let n = 0;
  const r2 = r * r;
  const x0 = Math.max(1, Math.floor(cx - r)), x1 = Math.min(W - 2, Math.ceil(cx + r));
  const y0 = Math.max(SURFACE_Y - 2, Math.floor(cy - r)), y1 = Math.min(H - 2, Math.ceil(cy + r), floorY);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r2) continue;
      const i = idx(x, y);
      if (world.cells[i] === SAND || world.cells[i] === LOOSE) { world.cells[i] = AIR; n++; }
    }
  }
  if (n) { world.dug += n; markDirty(x0 - 1, y0 - 1, x1 + 1, y1 + 1); }
  return n;
}

function newTip(x, y, dir, max, kind) {
  return { x, y, dir, bias: dir, len: 0, max, kind, wall: 0, stuck: 0, blobs: null, goal: null, through: false };
}

// Weltrand und Steine: werden erst bemerkt, wenn die Ameise dagegen stößt (kein Röntgenblick)
function blockedAt(x, y, up = false) {
  const xi = Math.round(x), yi = Math.round(y);
  return xi < 3 || xi >= W - 3 || (yi < SURFACE_Y && !up) || yi >= H - 3 || world.cells[idx(xi, yi)] === ROCK;
}

// Bekannte Gänge (die Ameisen laufen darin herum und kennen sie)
function knownTunnel(x, y) {
  return x > 0 && y > 0 && x < W && y < H && y > world.surface[x] && world.cells[idx(x, y)] === AIR;
}

// Abbeißen: Die Ameise trägt nur Sand ab, der an einen schon offenen Gang grenzt und in ihrer Reichweite
// liegt – immer das Stück, das ihr am nächsten ist. So wächst ein Gang Krümel für Krümel, nie aus dem Nichts.
function diggable(x, y, floorY) {
  if (x < 1 || x >= W - 1 || y < SURFACE_Y - 2 || y >= H - 1 || y > floorY) return false;
  const c = world.cells[y * W + x];
  if (c !== SAND && c !== LOOSE) return false;
  return world.cells[y * W + x - 1] === AIR || world.cells[y * W + x + 1] === AIR ||
    world.cells[(y - 1) * W + x] === AIR || world.cells[(y + 1) * W + x] === AIR;
}

// Nächste offene Stelle (Rand zum Gang) in einer Grabscheibe, von (px, py) aus gesehen
function nearestFace(cx, cy, r, floorY, px, py, reach = Infinity) {
  let best = null, bd = reach * reach;
  const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r || !diggable(x, y, floorY)) continue;
      const d = (x - px) ** 2 + (y - py) ** 2;
      if (d < bd) { bd = d; best = [x, y]; }
    }
  }
  return best;
}

function bite(cx, cy, r, floorY, ax, ay, budget) {
  let n = 0;
  for (; n < budget; n++) {
    const f = nearestFace(cx, cy, r, floorY, ax, ay, 6.5);
    if (!f) break;
    world.cells[idx(f[0], f[1])] = AIR;
    markDirty(f[0] - 1, f[1] - 1, f[0] + 1, f[1] + 1);
  }
  world.dug += n;
  return n;
}

// Die Grabstelle sucht sich ihr nächstes Stück (Wunschrichtung, Wackeln, Abstand, Steine ertasten).
// Liefert false, wenn gerade kein Stück da ist (Stein im Weg oder Gang zu Ende).
function planStep(tip) {
  let c = (Math.random() - 0.5) * PLAN.wiggle;
  // Gänge schlängeln sich in sanften Kurven (jeder Gang mit eigenem Takt), nichts ist schnurgerade
  if (tip.phase === undefined) tip.phase = Math.random() * 6.28;
  if (tip.kind !== 'stub') c += Math.sin(tip.len * 0.09 + tip.phase) * 0.05 + Math.sin(tip.len * 0.023 + tip.phase * 2) * 0.03;
  const side = tip.kind === 'branch' || tip.kind === 'exit';
  const want = side ? tip.bias : Math.PI / 2;
  if (tip.kind !== 'stub' && !tip.stuck) c += angleTo(tip.dir, want) * PLAN.down * (side ? 0.9 : 1);
  // Abstand zu bekannten Gängen halten
  if (tip.len > 3) {
    for (const sd of [-1, 1]) {
      const a = tip.dir + sd * 0.75;
      for (let dd = TUNNEL_R + 3; dd <= PLAN.spread; dd += 2) {
        if (knownTunnel(Math.round(tip.x + Math.cos(a) * dd), Math.round(tip.y + Math.sin(a) * dd))) {
          c -= sd * 0.12 * (1 - dd / (PLAN.spread + 1));
          break;
        }
      }
    }
  }
  tip.dir += c;
  if (tip.kind !== 'exit' && Math.sin(tip.dir) < -0.35) tip.dir += 0.2 * Math.sign(Math.cos(tip.dir) || 1);

  // Stößt die Ameise an einen Stein, tastet sie sich zur Seite entlang
  const front = a => {
    for (const off of [-TUNNEL_R, 0, TUNNEL_R]) {
      if (blockedAt(tip.x + Math.cos(a) * (TUNNEL_R + 0.9) - Math.sin(a) * off,
        tip.y + Math.sin(a) * (TUNNEL_R + 0.9) + Math.cos(a) * off, tip.kind === 'exit')) return true;
    }
    return false;
  };
  if (front(tip.dir)) {
    if (!tip.wall) tip.wall = Math.random() < 0.5 ? -1 : 1;
    tip.dir += tip.wall * rand(0.35, 0.6);
    tip.stuck++;
    if (tip.stuck > 80) endTip(tip, false);   // lange an Stein oder Platte entlanggetastet: aufgeben
    return false;
  }
  if (tip.stuck) { tip.stuck = Math.max(0, tip.stuck - 1); if (!tip.stuck && Math.random() < 0.3) tip.wall = 0; }

  const nx = tip.x + Math.cos(tip.dir) * 0.8, ny = tip.y + Math.sin(tip.dir) * 0.8;
  // Trifft der Gang auf einen anderen: meistens aufhören, selten durchbrechen (Schleife)
  if (tip.len > 8 && tip.kind !== 'stub' && !tip.through) {
    const hx = nx + Math.cos(tip.dir) * (TUNNEL_R + 2), hy = ny + Math.sin(tip.dir) * (TUNNEL_R + 2);
    if (knownTunnel(Math.round(hx), Math.round(hy))) {
      if (Math.random() < 0.15) { tip.through = true; tip.max = tip.len + 5; }
      else { endTip(tip, false); return false; }
    }
  }
  tip.goal = [nx, ny, TUNNEL_R * rand(0.9, 1.1)];
  return true;
}

// Eine Ameise arbeitet an einer Grabstelle: beißt bis zu `budget` Krümel ab. Liefert die Zahl der Krümel.
function digStep(tip, ax, ay, budget) {
  if (tip.kind === 'room') return digRoomStep(tip, ax, ay, budget);
  let n = 0;
  for (let guard = 0; guard < 8 && n < budget && world.tips.includes(tip); guard++) {
    if (!tip.goal && !planStep(tip)) break;
    const g = tip.goal;
    n += bite(g[0], g[1], g[2], Infinity, ax, ay, budget - n);
    if (nearestFace(g[0], g[1], g[2], Infinity, g[0], g[1])) {
      if (n < budget) break;   // Rest ist außer Reichweite: nächste Ameise macht weiter
      continue;
    }
    // Stück fertig abgetragen: Grabstelle rückt vor
    tip.x = g[0];
    tip.y = g[1];
    tip.goal = null;
    tip.len++;
    if (tip.len % 3 === 0 && tip.kind !== 'stub') world.pts.push([tip.x, tip.y, tip.dir]);
    // Ausgang erreicht die Oberfläche: neuer Eingang
    if (tip.kind === 'exit' && tip.y <= world.surface[Math.round(tip.x)] + 1) {
      world.entrances.push(Math.round(tip.x));
      removeTip(tip);
      break;
    }
    if (tip.len >= tip.max) endTip(tip, !tip.through);
  }
  if (n) tip.touched = world.time;
  return n;
}

function removeTip(tip) {
  const k = world.tips.indexOf(tip);
  if (k >= 0) world.tips.splice(k, 1);
}

// Ende eines Gangs: vielleicht eine Kammer, wenn Platz ist
function endTip(tip, reached) {
  removeTip(tip);
  if (tip.through || tip.kind === 'exit') return;
  const cx = tip.x + Math.cos(tip.dir) * (PLAN.room[0] / 2 - 3), cy = tip.y + Math.sin(tip.dir) * 3;
  // Seitengänge enden fast immer in einer Kammer (auch wenn ein Stein sie aufhält, sofern sie lang genug sind)
  const side = tip.kind === 'branch' && (reached || tip.len > 25) && Math.random() < 0.6;   // nicht jeder Gang braucht eine Kammer
  const wantRoom = tip.kind === 'queen' || tip.kind === 'stub' || side || (reached && Math.random() < 0.5);
  if (tip.forQueen) {   // Gang für die neue Königskammer: am Ende kommt immer eine Kammer
    startRoom(cx, cy, false, tip.x, tip.y);
    world.tips[world.tips.length - 1].forQueen = true;
    return;
  }
  if (wantRoom && (tip.kind === 'queen' || chamberSpace(cx, cy, tip.x, tip.y))) {
    startRoom(cx, cy, tip.kind === 'queen', tip.x, tip.y);
  }
}

function chamberSpace(cx, cy, ax, ay) {
  for (const c of world.chambers) if (Math.hypot((c.cx - cx) * 0.8, (c.cy - cy) * 1.3) < PLAN.chamberGap) return false;
  for (const t of world.tips) if (t.kind === 'room' && Math.hypot((t.cx - cx) * 0.8, (t.cy - cy) * 1.3) < PLAN.chamberGap) return false;
  let n = 0;
  const [rw, rh] = PLAN.room;
  for (let y = Math.floor(cy - rh); y <= cy + 3; y++) {
    for (let x = Math.floor(cx - rw / 2); x <= cx + rw / 2; x++) {
      if (x < 2 || y < SURFACE_Y + 4 || x >= W - 2 || y >= H - 2) return false;
      // der eigene Zugangsgang (hinter dem Eingang der Kammer) zählt nicht
      const d = Math.hypot(x - ax, y - ay), behind = (x - ax) * (cx - ax) + (y - ay) * (cy - ay) < 0;
      if (d < 7 || (behind && d < 15)) continue;
      if (knownTunnel(x, y)) n++;
    }
  }
  return n < 10;
}

// Grab-Bewegungen für eine Kammer: liegendes Oval mit fester Größe, Boden leicht abgeflacht,
// Rand durch zufällige kleine Abweichungen unregelmäßig (gegraben hat Macken).
function roomBlobs(cx, floor, royal) {
  const [w, h] = royal ? PLAN.royalRoom : PLAN.room;
  const a = w / 2 - 2, b = h / 2 - 2, my = floor - h / 2 + 2;   // Mitte etwas tiefer → Boden wird vom floor abgeschnitten
  const blobs = [];
  for (let gy = -b; gy <= b + 0.01; gy += 2.2) {
    for (let gx = -a; gx <= a + 0.01; gx += 2.2) {
      if ((gx / a) ** 2 + (gy / b) ** 2 > 1.05) continue;
      blobs.push([cx + gx + rand(-0.6, 0.6), my + gy + rand(-0.6, 0.6), rand(1.9, 2.6)]);
    }
  }
  return blobs;
}

// Eine Kammer entsteht aus vielen kleinen Grab-Bewegungen; der Boden wird flachgetreten
// Die Grab-Bewegungen starten am Gang (ex, ey) und arbeiten sich von dort in die Kammer hinein.
function startRoom(cx, cy, royal, ex, ey) {
  const floor = Math.round(cy + 1);
  const blobs = roomBlobs(cx, floor, royal);
  blobs.sort((a, b) => Math.hypot(a[0] - ex, a[1] - ey) - Math.hypot(b[0] - ex, b[1] - ey));
  const tip = newTip(cx, cy, 0, blobs.length, 'room');
  Object.assign(tip, { cx, cy, floor, blobs, royal, ex, ey });
  world.tips.push(tip);
}

function digRoomStep(tip, ax, ay, budget) {
  let n = 0;
  for (let guard = 0; guard < 8 && n < budget && tip.blobs.length; guard++) {
    const b = tip.blobs[0];
    n += bite(b[0], b[1], b[2], tip.floor, ax, ay, budget - n);
    if (nearestFace(b[0], b[1], b[2], tip.floor, b[0], b[1])) {
      if (n < budget) break;
      continue;
    }
    tip.blobs.shift();
  }
  if (n) tip.touched = world.time;
  if (!tip.blobs.length) finishRoom(tip);
  return n;
}

function finishRoom(tip) {
  removeTip(tip);
  const ch = { cx: tip.cx, cy: tip.cy, floor: tip.floor, id: world.chambers.length, royal: tip.royal };
  world.chambers.push(ch);
  if (tip.royal) world.royal = ch;
  if (tip.forQueen && world.royal && ch.cy > world.royal.cy + 15) moveRoyal(ch);
  else assignRole(ch);
}

// Neue, tiefere (sicherere) Königskammer: die alte bekommt eine andere Aufgabe,
// die Königin wird von Arbeiterinnen hinunter begleitet (siehe queenDecide in ants.js)
function moveRoyal(ch) {
  const old = world.royal;
  old.royal = false;
  old.role = null;
  assignRole(old);
  ch.royal = true;
  ch.role = 'queen';
  world.royal = ch;
  world.moves++;
  colony.moveQueen = true;
}

// Die Königskammer bleibt ein eigener, ruhiger Raum: dort beginnen keine neuen Gänge
const nearRoyal = p => world.royal && Math.hypot(p[0] - world.royal.cx, (p[1] - world.royal.cy) * 1.3) < 30;

// Neue Grabstellen nach dem Bauplan: erst tief, dann (mit größerem Nest) in die Breite
function updatePlan(dt) {
  world.time += dt;
  // Baustellen, an denen lange nichts mehr weitergeht (Stein, Weltrand, unerreichbar), werden aufgegeben
  for (const t of world.tips.slice()) {
    if (t.touched === undefined) t.touched = world.time;
    if (world.time - t.touched < 150) continue;
    if (t.kind === 'queen') endTip(t, true);
    else if (t.kind === 'room' && t.blobs.length < t.max - 8) finishRoom(t);   // halb fertige Kammer zählt
    else if (t.royal && !t.retried) {   // Königskammer nie aufgeben: direkt am Schachtende neu anlegen
      removeTip(t);
      startRoom(t.ex, t.ey, true, t.ex, t.ey);
      const n = world.tips[world.tips.length - 1];
      n.retried = true;
    } else if (t.royal) finishRoom(t);
    else removeTip(t);
  }
  if (world.dug >= MAX_DUG) return;
  const nest = 1 + world.dug / 500;
  const busy = world.tips.filter(t => t.kind !== 'room').length;
  // Abzweig
  // Seitengänge gibt es schon früh, während die Königin noch nach unten gräbt (Nutzerwunsch: erst zur Seite)
  if (busy < (world.royal ? Math.min(3 + nest / 4, 10) : 2) && world.pts.length > 20 && Math.random() < dt * 0.8 * Math.min(1, nest / 3)) {
    const p = world.pts[randInt(0, world.pts.length - 1)];
    if (!nearRoyal(p) && !world.branchStarts.some(b => Math.hypot(b[0] - p[0], b[1] - p[1]) < 24)) {
      // fast waagerecht nach links oder rechts, nur leicht abwärts
      const sd = Math.random() < 0.5 ? -1 : 1;
      let dir = sd > 0 ? rand(0.03, 0.25) : Math.PI - rand(0.03, 0.25);
      // Von einem waagerechten Gang zweigt ein schräger ab (meist nach unten)
      if (Math.abs(Math.sin(p[2])) < 0.5) dir = p[2] + (Math.random() < 0.75 ? 1 : -1) * Math.sign(Math.cos(p[2]) || 1) * rand(0.6, 1.1);
      let free = true;
      for (let dd = 6; dd <= PLAN.spread + 8; dd += 2) {
        const qx = Math.round(p[0] + Math.cos(dir) * dd), qy = Math.round(p[1] + Math.sin(dir) * dd);
        if (qx < 3 || qy < SURFACE_Y + 4 || qx >= W - 3 || qy >= H - 3 || knownTunnel(qx, qy)) { free = false; break; }
      }
      if (free) {
        world.branchStarts.push(p);
        // meist ein langer Seitengang nach außen, selten einer in die Tiefe
        const deep = world.royal && Math.random() < 0.15;
        world.tips.push(newTip(p[0], p[1], dir, deep ? rand(30, 90) : rand(60, 150), deep ? 'deep' : 'branch'));
      }
    }
  }
  if (!world.royal) return;
  // Wächst die Kolonie, graben sie weiter unten eine neue, sicherere Königskammer
  if (world.moves < PLAN.royalMoves && ants.length >= 60 * (world.moves + 1) && world.royal.cy < H - 60 && !colony.moveQueen &&
      !world.tips.some(t => t.forQueen) && Math.random() < dt * 0.05) {
    // eine der tiefsten Stellen (zufällig, damit ein Fehlversuch nicht immer wieder gleich endet)
    const deepest = world.pts.filter(p => !nearRoyal(p) && p[1] < H - 15).sort((p, q) => q[1] - p[1]).slice(0, 8);
    const d = deepest.length ? deepest[randInt(0, deepest.length - 1)] : null;
    if (d) {
      const t = newTip(d[0], d[1], Math.PI / 2 + rand(-0.3, 0.3), Math.max(25, (world.royal.cy + 45 - d[1]) / 0.8), 'deep');
      t.forQueen = true;
      world.tips.push(t);
    }
  }
  // Mit wachsender Kolonie neue Ausgänge nach oben – dort, wo Futter wächst und noch kein Eingang ist
  const ents = world.entrances;
  if (ents.length < Math.min(4, 1 + Math.floor(ants.length / 50)) && !world.tips.some(t => t.kind === 'exit') && Math.random() < dt * 0.05) {
    const far = colony.sources.filter(q => q.amount > 0 && Math.min(...ents.map(e => Math.abs(e - q.x))) > 40);
    if (far.length) {
      const q = far[randInt(0, far.length - 1)];
      let best = null, bd = Infinity;
      for (const p of world.pts) {
        if (p[1] > SURFACE_Y + 80 || nearRoyal(p)) continue;
        const d = Math.abs(p[0] - q.x) + (p[1] - SURFACE_Y) * 0.5;
        if (d < bd) { bd = d; best = p; }
      }
      if (best && Math.abs(best[0] - q.x) < 90) {
        let dir = Math.atan2(SURFACE_Y - best[1], q.x - best[0]);
        dir = Math.max(-Math.PI + 0.6, Math.min(-0.6, dir));   // eher nach oben als zur Seite
        const t = newTip(best[0], best[1], dir, (best[1] - SURFACE_Y) / 0.8 * 2 + 20, 'exit');
        t.bias = dir;
        world.tips.push(t);
      }
    }
  }
  // Seitenkammer über einen kurzen Stummel – nur draußen an Seitengängen, nicht am Hauptschacht
  if (world.tips.length < 2 + nest / 4 && world.pts.length > 30 && Math.random() < dt * 0.12 * Math.min(1, nest / 4)) {
    const p = world.pts[randInt(0, world.pts.length - 1)];
    const sd = Math.random() < 0.5 ? -1 : 1, dir = p[2] + sd * Math.PI / 2 * rand(0.8, 1.2) - 0.2 * sd;
    const cx = p[0] + Math.cos(dir) * (PLAN.stub + 10), cy = p[1] + Math.sin(dir) * (PLAN.stub + 3);
    if (Math.abs(p[0] - world.entranceX) >= 35 && !nearRoyal(p) && chamberSpace(cx, cy, p[0], p[1])) world.tips.push(newTip(p[0], p[1], dir, PLAN.stub, 'stub'));
  }
  // Gräbt gerade niemand mehr: an der tiefsten Stelle neu ansetzen
  if (!world.tips.length && world.pts.length && Math.random() < dt * 0.5) {
    let d = null;
    for (const p of world.pts) if (!nearRoyal(p) && (!d || p[1] > d[1])) d = p;
    if (d) world.tips.push(newTip(d[0], d[1], Math.PI / 2 + rand(-0.4, 0.4), rand(40, 100), 'deep'));
  }
}

function nestPercent() {
  return Math.min(100, Math.round(world.dug / MAX_DUG * 100));
}

// ---------- Abgelegter Sand (Hügel am Eingang) ----------

function isEntranceColumn(x) {
  return columnTop(x) > world.surface[x];
}

// Eine Ladung Sand oben ablegen (mehrere Krümel); er rutscht ab wie echter Sand → Hügel
function placeGrain(x, count = 1) {
  for (let k = 0; k < count; k++) placeOneGrain(x);
}
// Neben einem Eingangsloch bleibt eine Spalte frei, damit der Eingang durch den Hügel nicht zu eng wird
const nearHole = x => isEntranceColumn(x) || isEntranceColumn(x - 1) || isEntranceColumn(x + 1);

function placeOneGrain(x) {
  const top = columnTop(x);
  if (top <= 10 || nearHole(x)) return;
  world.cells[idx(x, top - 1)] = LOOSE;
  let y0 = top - 1, y1 = top - 1, x0 = x, x1 = x;
  for (let step = 0; step < 60; step++) {
    const h = columnTop(x);
    if (world.cells[idx(x, h)] !== LOOSE) break;
    const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
    let moved = false;
    for (const d of dirs) {
      const nx = x + d;
      if (nx < 1 || nx >= W - 1 || nearHole(nx)) continue;
      const nh = columnTop(nx);
      // flacher Hügel: Sand rutscht leicht ab und verteilt sich auch auf ebenem Boden ein Stück
      if (nh > h + 1 || (nh > h && Math.random() < 0.9) || (nh === h && Math.random() < 0.3)) {
        world.cells[idx(x, h)] = AIR;
        world.cells[idx(nx, nh - 1)] = LOOSE;
        x = nx;
        x0 = Math.min(x0, nx); x1 = Math.max(x1, nx); y1 = Math.max(y1, nh);
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
  markDirty(x0 - 4, y0 - 1, x1 + 4, y1 + 1);   // breiter, damit der Gang durch den Hügel neu gezeichnet wird
}
