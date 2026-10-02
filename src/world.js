'use strict';

// Die Welt ist ein Raster aus Zellen. Eine Zelle = ein Pixel der Pixel-Art.
const W = 320;
const H = 180;
const N = W * H;

const AIR = 0;    // Luft oder gegrabener Tunnel
const SAND = 1;   // gewachsener Sand
const LOOSE = 2;  // von Ameisen abgelegter, lockerer Sand

const TUNNEL_RADIUS = 1.5;      // Tunnel sind ca. 3 Zellen breit
const MAX_DUG = N * 0.15;       // irgendwann ist das Nest "fertig"

const world = {
  cells: new Uint8Array(N),
  surface: new Int16Array(W),   // ursprüngliche Oberfläche: y der obersten Sandzelle
  grain: new Float32Array(N),   // feste Zufallswerte pro Zelle für die Sandkörnung
  plan: new Uint8Array(N),      // 1 = hier soll ein Tunnel hin
  prio: new Int32Array(N),      // Reihenfolge der Tunnelabschnitte
  todo: [],                     // geplante Zellen, die noch Sand sind
  nodes: [],                    // Punkte auf Tunnel-Mittellinien (Abzweig-Startpunkte)
  nextPrio: 0,
  entranceX: 0,
  dug: 0,
  dirty: true,
};

const idx = (x, y) => y * W + x;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));

// Außerhalb der Welt: oben Luft, an den Seiten und unten fester Rand.
function solidAt(x, y) {
  if (y < 0) return false;
  if (x < 0 || x >= W || y >= H) return true;
  return world.cells[y * W + x] !== AIR;
}

function isUnderground(x, y) {
  return y >= world.surface[x];
}

// Erste feste Zelle von oben in Spalte x.
function columnTop(x) {
  const c = world.cells;
  for (let y = 0; y < H; y++) if (c[y * W + x] !== AIR) return y;
  return H;
}

function generateWorld() {
  const c = world.cells;
  c.fill(AIR);
  world.plan.fill(0);
  world.todo.length = 0;
  world.nodes.length = 0;
  world.nextPrio = 0;
  world.dug = 0;

  const base = Math.round(H * 0.25);
  const p1 = rand(0, 6.28), p2 = rand(0, 6.28);
  for (let x = 0; x < W; x++) {
    const s = base + Math.round(Math.sin(x * 0.021 + p1) * 1.6 + Math.sin(x * 0.067 + p2) * 0.8);
    world.surface[x] = s;
    for (let y = s; y < H; y++) c[y * W + x] = SAND;
  }
  for (let i = 0; i < N; i++) world.grain[i] = Math.random();

  world.entranceX = randInt(Math.floor(W * 0.4), Math.floor(W * 0.6));
  planEntrance();
  world.dirty = true;
}

// ---------- Tunnelplanung ----------
// Die Kolonie "plant" Tunnel und Kammern. Die Ameisen graben dann Zelle für Zelle
// den Plan aus, immer von bereits offenen Stellen aus.

function markDisk(cx, cy, r, prio) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (x < 1 || y < 0 || x >= W - 1 || y >= H - 1) continue;
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy > r2) continue;
      markCell(x, y, prio);
    }
  }
}

function markCell(x, y, prio) {
  const i = idx(x, y);
  if (world.plan[i]) return;
  world.plan[i] = 1;
  world.prio[i] = prio;
  if (world.cells[i] !== AIR) world.todo.push(i);
}

// Ist um (x,y) im Abstand minD noch kein Tunnel geplant? Zellen nahe (ox,oy) zählen nicht.
function isClear(x, y, minD, ox, oy, ignoreR) {
  const r = Math.ceil(minD);
  for (let yy = Math.floor(y) - r; yy <= Math.floor(y) + r; yy++) {
    for (let xx = Math.floor(x) - r; xx <= Math.floor(x) + r; xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (!world.plan[idx(xx, yy)]) continue;
      if (Math.hypot(xx - x, yy - y) >= minD) continue;
      if (Math.hypot(xx - ox, yy - oy) <= ignoreR) continue;
      return false;
    }
  }
  return true;
}

function minDepth(x) {
  return world.surface[Math.max(0, Math.min(W - 1, Math.round(x)))] + 8;
}

function planEntrance() {
  const ex = world.entranceX;
  let x = ex, y = world.surface[ex] - 1;
  let a = Math.PI / 2;
  const len = rand(22, 30);
  for (let d = 0; d < len; d += 0.5) {
    a += rand(-0.06, 0.06);
    a = Math.max(Math.PI / 2 - 0.35, Math.min(Math.PI / 2 + 0.35, a));
    x += Math.cos(a) * 0.5;
    y += Math.sin(a) * 0.5;
    markDisk(x, y, TUNNEL_RADIUS, 0);
    if (y > minDepth(x) && d % 2 === 0) world.nodes.push({ x, y });
  }
  planChamber(x, y, 0);
  world.nextPrio = 1;

  // Die obersten Zellen des Eingangs sind schon offen.
  for (let yy = 0; yy < H; yy++) {
    for (let xx = ex - 3; xx <= ex + 3; xx++) {
      const i = idx(xx, yy);
      if (world.plan[i] && world.cells[i] !== AIR && yy <= world.surface[xx] + 2) {
        world.cells[i] = AIR;
      }
    }
  }
}

function planChamber(ex, ey, prio) {
  const rx = rand(5, 10), ry = rand(2.5, 4);
  const cx = ex + rand(-rx * 0.5, rx * 0.5);
  const cy = ey + 1 - ry;
  if (cx - rx < 6 || cx + rx > W - 7 || cy - ry < minDepth(cx) || cy + ry > H - 6) return false;
  // Platz frei?
  for (let y = Math.floor(cy - ry - 2); y <= Math.ceil(cy + ry + 2); y++) {
    for (let x = Math.floor(cx - rx - 2); x <= Math.ceil(cx + rx + 2); x++) {
      const i = idx(x, y);
      if (world.plan[i] && world.prio[i] !== prio && Math.hypot(x - ex, y - ey) > 6) return false;
    }
  }
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      // Boden etwas flacher als die Decke
      const k = dy > 0 ? dx * dx + dy * dy * 0.6 : dx * dx + dy * dy;
      if (k <= 1 && y <= ey + 1) markCell(x, y, prio);
    }
  }
  return true;
}

function tryAddSegment() {
  if (world.nodes.length === 0) return false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const n = world.nodes[randInt(0, world.nodes.length - 1)];
    let a;
    const r = Math.random();
    if (r < 0.35) a = Math.PI / 2 + rand(-0.5, 0.5);   // nach unten
    else if (r < 0.675) a = rand(0.05, 0.6);           // nach rechts, leicht abwärts
    else a = Math.PI - rand(0.05, 0.6);                // nach links, leicht abwärts
    const len = rand(14, 42);
    const pts = [];
    let x = n.x, y = n.y;
    for (let d = 0; d < len; d += 0.5) {
      a += rand(-0.08, 0.08);
      x += Math.cos(a) * 0.5;
      y += Math.sin(a) * 0.5;
      if (x < 6 || x > W - 7 || y < minDepth(x) || y > H - 6) break;
      if (!isClear(x, y, 6, n.x, n.y, 8)) break;
      pts.push(x, y);
    }
    if (pts.length < 24) continue;

    const prio = world.nextPrio++;
    for (let k = 0; k < pts.length; k += 2) {
      markDisk(pts[k], pts[k + 1], TUNNEL_RADIUS, prio);
      if (k % 8 === 0) world.nodes.push({ x: pts[k], y: pts[k + 1] });
    }
    const endX = pts[pts.length - 2], endY = pts[pts.length - 1];
    if (Math.random() < 0.6) planChamber(endX, endY, prio);
    return true;
  }
  return false;
}

function updatePlanner() {
  if (world.todo.length < 120 && world.dug < MAX_DUG) tryAddSegment();
}

function touchesOpen(i) {
  const x = i % W, y = (i / W) | 0;
  return !solidAt(x + 1, y) || !solidAt(x - 1, y) || !solidAt(x, y + 1) || !solidAt(x, y - 1);
}

// Sucht eine geplante Sandzelle, die schon an einen offenen Gang grenzt.
function findDigTask(reserved) {
  const t = world.todo;
  const cands = [];
  let best = Infinity;
  let w = 0;
  for (let k = 0; k < t.length; k++) {
    const i = t[k];
    if (world.cells[i] === AIR) continue;
    t[w++] = i;
    if (reserved.has(i) || !touchesOpen(i)) continue;
    cands.push(i);
    if (world.prio[i] < best) best = world.prio[i];
  }
  t.length = w;
  const near = cands.filter(i => world.prio[i] <= best + 3);
  return near.length ? near[randInt(0, near.length - 1)] : -1;
}

function digCell(i) {
  if (world.cells[i] === AIR) return false;
  world.cells[i] = AIR;
  world.dug++;
  world.dirty = true;
  return true;
}

// ---------- Abgelegter Sand ----------

function isEntranceColumn(x) {
  return columnTop(x) > world.surface[x];
}

// Legt ein Sandkorn oben auf Spalte x und lässt es abrutschen, bis der Hügel stabil ist.
// Nur ein Teil der Körner bleibt liegen, sonst würde der Hügel riesig.
function placeGrain(x) {
  if (Math.random() > 0.3) return;
  const top = columnTop(x);
  if (top <= 6 || isEntranceColumn(x)) return;
  world.cells[idx(x, top - 1)] = LOOSE;
  for (let step = 0; step < 40; step++) {
    const h = columnTop(x);
    if (world.cells[idx(x, h)] !== LOOSE) break;
    const dirs = Math.random() < 0.5 ? [-1, 1] : [1, -1];
    let moved = false;
    for (const d of dirs) {
      const nx = x + d;
      if (nx < 1 || nx >= W - 1 || isEntranceColumn(nx)) continue;
      const nh = columnTop(nx);
      if (nh > h + 1 || (nh > h && Math.random() < 0.4)) {
        world.cells[idx(x, h)] = AIR;
        world.cells[idx(nx, nh - 1)] = LOOSE;
        x = nx;
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
  world.dirty = true;
}
