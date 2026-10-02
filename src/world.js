'use strict';

// Die Welt ist ein Raster aus Zellen. Eine Zelle = ein Pixel der Pixel-Art.
const W = 320;
const H = 180;
const N = W * H;

const AIR = 0;    // Luft oder gegrabener Tunnel
const SAND = 1;   // gewachsener Boden
const LOOSE = 2;  // von Ameisen abgelegter, lockerer Sand
const ROCK = 3;   // Stein, kann nicht gegraben werden

const SURFACE_Y = Math.round(H * 0.3);
const TUNNEL_RADIUS = 1.2;      // Gänge sind 2–3 Zellen breit
const MAX_DUG = N * 0.12;       // irgendwann ist das Nest "fertig"

const world = {
  cells: new Uint8Array(N),
  surface: new Int16Array(W),   // ursprüngliche Oberfläche: y der obersten Bodenzelle
  layers: [new Int16Array(W), new Int16Array(W), new Int16Array(W)], // Schichtgrenzen pro Spalte
  grain: new Float32Array(N),   // feste Zufallswerte pro Zelle
  tex: new Uint8Array(N),       // Muster: 0 normal, 1 heller Sprenkel, 2 dunkler Punkt, 3 Kiesel
  plan: new Uint8Array(N),      // 1 = hier soll ein Gang hin
  prio: new Int32Array(N),      // Reihenfolge der Abschnitte
  todo: [],                     // geplante Zellen, die noch Boden sind
  nodes: [],                    // Punkte auf Gang-Mittellinien (Abzweig-Startpunkte)
  trunk: null,                  // Spitze des Hauptgangs {x, y, dir, done}
  planWait: 0,                  // Pause des Planers nach einem Fehlversuch
  planFails: 0,
  complete: false,              // Nest fertig geplant
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

// Bodenschicht: 0 Humus, 1 Sand, 2 Lehm, 3 grauer Untergrund
function layerOf(x, y) {
  const l = world.layers;
  if (y < l[0][x]) return 0;
  if (y < l[1][x]) return 1;
  if (y < l[2][x]) return 2;
  return 3;
}

// Erste feste Zelle von oben in Spalte x.
function columnTop(x) {
  const c = world.cells;
  for (let y = 0; y < H; y++) if (c[y * W + x] !== AIR) return y;
  return H;
}

function wavyLine(base, amp) {
  const a = new Int16Array(W);
  const p1 = rand(0, 6.28), p2 = rand(0, 6.28), p3 = rand(0, 6.28);
  for (let x = 0; x < W; x++) {
    a[x] = Math.round(base + amp * (Math.sin(x * 0.03 + p1) * 0.6 + Math.sin(x * 0.081 + p2) * 0.3 +
      Math.sin(x * 0.23 + p3) * 0.15) + (Math.random() < 0.15 ? 1 : 0));
  }
  return a;
}

function generateWorld() {
  const c = world.cells;
  c.fill(AIR);
  world.plan.fill(0);
  world.tex.fill(0);
  world.todo.length = 0;
  world.nodes.length = 0;
  world.nextPrio = 0;
  world.dug = 0;
  world.planWait = 0;
  world.planFails = 0;
  world.complete = false;

  const ground = H - SURFACE_Y;
  for (let x = 0; x < W; x++) {
    world.surface[x] = SURFACE_Y;
    for (let y = SURFACE_Y; y < H; y++) c[y * W + x] = SAND;
  }
  world.layers[0] = wavyLine(SURFACE_Y + ground * 0.08, 1.5);
  world.layers[1] = wavyLine(SURFACE_Y + ground * 0.42, 3);
  world.layers[2] = wavyLine(SURFACE_Y + ground * 0.76, 3);

  for (let i = 0; i < N; i++) world.grain[i] = Math.random();
  makeTexture();

  world.entranceX = randInt(Math.floor(W * 0.35), Math.floor(W * 0.65));
  makeRocks();
  planEntrance();
  world.dirty = true;
}

// Helle Sprenkel als kleine Striche, dazu ein paar dunkle Punkte
function makeTexture() {
  const t = world.tex;
  for (let y = SURFACE_Y; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const r = Math.random();
      if (r < 0.055) {
        const len = randInt(1, 3);
        for (let k = 0; k < len && x + k < W; k++) t[idx(x + k, y)] = 1;
      } else if (r < 0.059) {
        t[idx(x, y)] = 2;
      }
    }
  }
}

// Großer Stein (fest) oder Kiesel (nur Muster im Boden, kann weggegraben werden)
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
  const place = (count, rmin, rmax, pebble) => {
    for (let k = 0; k < count; k++) {
      const rx = rand(rmin, rmax), ry = rx * rand(0.55, 0.8);
      const x = rand(0, W), y = rand(SURFACE_Y + 10, H - 2);
      if (Math.abs(x - ex) < rx + 5 && y < SURFACE_Y + 25) continue;  // Eingang frei lassen
      makeRock(x, y, rx, ry, pebble);
    }
  };
  place(16, 3, 7, false);    // große Steine
  place(45, 1, 2.2, true);   // Kiesel
}

// ---------- Gangplanung ----------
// Die Kolonie "plant" Gänge und Kammern. Die Ameisen graben dann Zelle für Zelle
// den Plan aus, immer von bereits offenen Stellen aus.
// Aufbau wie im Vorbild: ein langer Zickzack-Hauptgang nach unten,
// davon kurze Seitengänge mit runden Kammern am Ende.

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
  if (world.plan[i] || world.cells[i] === ROCK) return;
  world.plan[i] = 1;
  world.prio[i] = prio;
  if (world.cells[i] !== AIR) world.todo.push(i);
}

function rockNear(x, y, r) {
  for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) {
    for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      if (world.cells[idx(xx, yy)] === ROCK) return true;
    }
  }
  return false;
}

// Ist um (x,y) im Abstand minD noch kein Gang geplant? Zellen nahe (ox,oy) zählen nicht.
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

function inDigArea(x, y) {
  return x >= 5 && x <= W - 6 && y >= SURFACE_Y + 4 && y <= H - 5;
}

// Geht von (x,y) in Richtung a und liefert die Punkte, bis etwas im Weg ist.
function tracePath(x, y, a, len, wiggle, minClear) {
  const ox = x, oy = y;
  const pts = [];
  for (let d = 0; d < len; d += 0.5) {
    a += rand(-wiggle, wiggle);
    x += Math.cos(a) * 0.5;
    y += Math.sin(a) * 0.5;
    if (!inDigArea(x, y) || rockNear(x, y, 1.5)) break;
    if (!isClear(x, y, minClear, ox, oy, minClear + 2)) break;
    pts.push(x, y);
  }
  return pts;
}

function markPath(pts, prio, addNodes) {
  for (let k = 0; k < pts.length; k += 2) {
    markDisk(pts[k], pts[k + 1], TUNNEL_RADIUS, prio);
    if (addNodes && k % 6 === 0) world.nodes.push({ x: pts[k], y: pts[k + 1] });
  }
}

function planEntrance() {
  const ex = world.entranceX;
  const pts = [];
  for (let y = SURFACE_Y - 1; y < SURFACE_Y + 9; y += 0.5) pts.push(ex, y);
  markPath(pts, 0, false);
  world.trunk = { x: ex, y: SURFACE_Y + 9, dir: Math.random() < 0.5 ? -1 : 1, done: false };
  world.nextPrio = 1;

  // Der Eingang ist schon ein Stück offen.
  for (let y = SURFACE_Y; y <= SURFACE_Y + 2; y++) {
    for (let x = ex - 2; x <= ex + 2; x++) if (world.plan[idx(x, y)]) world.cells[idx(x, y)] = AIR;
  }
}

function planChamber(ex, ey, prio) {
  const rx = rand(4, 6.5), ry = rand(3, 4.2);
  const cx = ex + rand(-1.5, 1.5);
  const cy = ey + rand(-1, 1);
  if (!inDigArea(cx - rx, cy - ry) || !inDigArea(cx + rx, cy + ry)) return false;
  for (let y = Math.floor(cy - ry - 3); y <= Math.ceil(cy + ry + 3); y++) {
    for (let x = Math.floor(cx - rx - 3); x <= Math.ceil(cx + rx + 3); x++) {
      const i = idx(x, y);
      if (world.cells[i] === ROCK && Math.hypot((x - cx) / rx, (y - cy) / ry) < 1.1) return false;
      if (world.plan[i] && world.prio[i] !== prio && Math.hypot(x - ex, y - ey) > 5) return false;
    }
  }
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      // Boden etwas flacher als die Decke
      const k = dy > 0 ? dx * dx + Math.pow(Math.abs(dy), 2.6) : dx * dx + dy * dy;
      if (k <= 1) markCell(x, y, prio);
    }
  }
  return true;
}

// Hauptgang ein Stück weiter nach unten, abwechselnd nach links und rechts geneigt
function extendTrunk() {
  const t = world.trunk;
  if (!t || t.done) return false;
  for (let attempt = 0; attempt < 20; attempt++) {
    const dir = attempt % 2 === 0 ? -t.dir : t.dir;
    // erst schräg wie im Vorbild, bei Hindernissen auch steiler
    const lean = attempt < 8 ? rand(0.55, 0.95) : rand(0.1, 1.1);
    const a = Math.PI / 2 - dir * lean;
    const pts = tracePath(t.x, t.y, a, rand(14, 26), 0.05, 5);
    if (pts.length < (attempt < 8 ? 12 : 8)) continue;
    const prio = world.nextPrio++;
    markPath(pts, prio, true);
    t.x = pts[pts.length - 2];
    t.y = pts[pts.length - 1];
    t.dir = dir;
    if (t.y > H - 16) {
      planChamber(t.x, t.y, prio);
      t.done = true;
    }
    return true;
  }
  // nicht weitergekommen: später nochmal versuchen, nach ein paar Fehlversuchen Kammer und Schluss
  t.fails = (t.fails || 0) + 1;
  if (t.fails >= 4) {
    planChamber(t.x, t.y, world.nextPrio++);
    t.done = true;
  }
  return false;
}

// Kurzer Seitengang mit Kammer am Ende
function addBranch() {
  if (world.nodes.length === 0) return false;
  for (let attempt = 0; attempt < 25; attempt++) {
    const n = world.nodes[randInt(0, world.nodes.length - 1)];
    // nicht an der Spitze des Hauptgangs abzweigen, sonst versperrt der Seitengang den Weg nach unten
    const t = world.trunk;
    if (t && !t.done && Math.hypot(n.x - t.x, n.y - t.y) < 14) continue;
    const side = Math.random() < 0.5 ? -1 : 1;
    const a = side > 0 ? rand(-0.45, 0.5) : Math.PI - rand(-0.45, 0.5);
    const pts = tracePath(n.x, n.y, a, rand(8, 18), 0.07, 8);
    if (pts.length < 12) continue;
    const prio = world.nextPrio++;
    // Abzweigpunkte in der Nähe verbrauchen, damit Seitengänge nicht dicht nebeneinander starten
    world.nodes = world.nodes.filter(m => Math.hypot(m.x - n.x, m.y - n.y) > 9);
    markPath(pts, prio, Math.random() < 0.6);
    const endX = pts[pts.length - 2], endY = pts[pts.length - 1];
    if (Math.random() < 0.85) planChamber(endX + Math.cos(a) * 3, endY + Math.sin(a) * 2, prio);
    return true;
  }
  return false;
}

// Neue Gänge planen, wenn die Ameisen fast alles ausgegraben haben.
// Findet sich lange kein Platz mehr, gilt das Nest als fertig.
function updatePlanner(dt) {
  if (world.complete || world.todo.length >= 100) return;
  if (world.dug >= MAX_DUG) { world.complete = true; return; }
  world.planWait -= dt;
  if (world.planWait > 0) return;
  const t = world.trunk;
  let ok;
  if (t && !t.done && (world.nodes.length < 6 || Math.random() < 0.45)) ok = extendTrunk() || addBranch();
  else ok = addBranch() || extendTrunk();
  if (ok) {
    world.planFails = 0;
  } else {
    world.planWait = 3;
    if (++world.planFails >= 15) world.complete = true;
  }
}

function touchesOpen(i) {
  const x = i % W, y = (i / W) | 0;
  return !solidAt(x + 1, y) || !solidAt(x - 1, y) || !solidAt(x, y + 1) || !solidAt(x, y - 1);
}

// Sucht eine geplante Bodenzelle, die schon an einen offenen Gang grenzt.
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
  if (world.cells[i] === AIR || world.cells[i] === ROCK) return false;
  world.cells[i] = AIR;
  world.dug++;
  world.dirty = true;
  return true;
}

function nestPercent() {
  if (world.complete && world.todo.length === 0) return 100;
  return Math.min(99, Math.round(world.dug / MAX_DUG * 100));
}

// ---------- Abgelegter Sand ----------

function isEntranceColumn(x) {
  return columnTop(x) > world.surface[x];
}

// Legt ein Sandkorn oben auf Spalte x und lässt es abrutschen, bis der Haufen stabil ist.
// Nur ein Teil der Körner bleibt liegen, sonst würde der Haufen riesig.
function placeGrain(x) {
  if (Math.random() > 0.2) return;
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
