'use strict';

// Speichern im Browser (localStorage): Boden, Gänge, Kammern, Ameisen, Brut, Futter und Tageszeit.
// Gespeichert wird automatisch alle 20 Sekunden und beim Schließen.
const SAVE_KEY = 'ameisen-sim-v1';

// Lange Zahlenreihen kurz machen: [Wert, Anzahl, Wert, Anzahl, …]
function packRuns(arr) {
  const out = [];
  let v = arr[0], n = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === v) n++;
    else { out.push(v, n); v = arr[i]; n = 1; }
  }
  out.push(v, n);
  return out;
}
function unpackRuns(runs, arr) {
  let i = 0;
  for (let k = 0; k < runs.length; k += 2) { arr.fill(runs[k], i, i + runs[k + 1]); i += runs[k + 1]; }
}

function itemData(it) {
  const carrier = it.by;
  const d = { kind: it.kind, x: carrier ? carrier.x : it.x, y: carrier ? carrier.y : it.y, lvl: carrier ? 0 : it.lvl,
    room: carrier || !it.room ? -1 : world.chambers.indexOf(it.room) };
  if (it.caste) d.caste = it.caste;
  if (it.age !== undefined) { d.age = it.age; d.fed = it.fed; d.lastFed = it.lastFed; d.ph = it.ph; }
  return d;
}

function saveGame() {
  try {
    // Was gerade getragen wird, auch mitspeichern
    const carried = ants.filter(a => a.load).map(a => a.load);
    const food = colony.food.concat(carried.filter(it => !colony.food.includes(it) && listOf(it) === colony.food));
    const data = {
      v: 1,
      world: {
        cells: packRuns(world.cells), tex: packRuns(world.tex),
        surface: Array.from(world.surface), layers: world.layers.map(l => Array.from(l)),
        tips: world.tips, pts: world.pts, branchStarts: world.branchStarts,
        chambers: world.chambers.map(c => ({ cx: c.cx, cy: c.cy, floor: c.floor, royal: c.royal, role: c.role })),
        entranceX: world.entranceX, dug: world.dug,
      },
      ants: ants.map(a => ({ x: a.x, y: a.y, caste: a.caste, speed: a.speed })),
      colony: {
        food: food.map(itemData), brood: colony.brood.map(itemData), sources: colony.sources,
        queenFood: colony.queenFood, eatTimer: colony.eatTimer, layTimer: colony.layTimer,
      },
      sky: { time: sky.time, day: sky.day },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;   // z. B. Speicher voll oder gesperrt: dann eben nicht speichern
  }
}

function loadGame() {
  let data;
  try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
  if (!data || data.v !== 1) return false;
  const w = data.world;
  unpackRuns(w.cells, world.cells);
  unpackRuns(w.tex, world.tex);
  world.surface.set(w.surface);
  w.layers.forEach((l, k) => { world.layers[k] = Int16Array.from(l); });
  for (let i = 0; i < N; i++) world.grain[i] = Math.random();
  world.tips = w.tips;
  world.pts = w.pts;
  world.branchStarts = w.branchStarts;
  world.chambers = w.chambers.map((c, k) => ({ ...c, id: k }));
  world.royal = world.chambers.find(c => c.royal) || null;
  world.entranceX = w.entranceX;
  world.dug = w.dug;
  world.dirty = true;
  world.dirtyRect = { x0: 0, y0: 0, x1: W - 1, y1: H - 1 };

  ants.length = 0;
  for (const d of data.ants) {
    const a = createAnt(d.x, d.y, d.caste);
    a.speed = d.speed;
    ants.push(a);
  }
  const item = d => ({ ...d, room: d.room >= 0 ? world.chambers[d.room] : null, by: null, claim: null, feeder: null });
  const c = data.colony;
  colony.food = c.food.map(item);
  colony.brood = c.brood.map(item);
  // Lose Dinge fallen auf den Boden
  for (const it of colony.food.concat(colony.brood)) if (!it.room) dropLoose(it, it.x, Math.round(it.y));
  colony.sources = c.sources;
  colony.queenFood = c.queenFood;
  colony.eatTimer = c.eatTimer;
  colony.layTimer = c.layTimer;
  colony.sourceTimer = 0;
  sky.time = data.sky.time;
  sky.day = data.sky.day;
  return true;
}

// Alles von vorn: neue Welt, neue Königin, neue Arbeiterinnen
function newColony() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* egal */ }
  generateWorld();
  resetColony();
  generateSky();
  sky.time = 0.4;
  sky.day = 1;
  spawnAnts();
}
