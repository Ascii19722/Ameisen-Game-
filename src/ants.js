'use strict';

const ANT_COUNT = 30;
const ants = [];
const reserved = new Map();   // Zelle -> Ameise, die sie gerade abgräbt

// ---------- Wegfindung (Breitensuche auf dem Raster) ----------
// Ameisen laufen nur an Wänden, Böden und Decken entlang, nie frei durch die Luft.

const bfsPrev = new Int32Array(N);
const bfsMark = new Uint32Array(N);
const bfsQueue = new Int32Array(N);
let bfsStamp = 0;
let bfsCount = 0;
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];

function isWalkable(x, y) {
  if (world.cells[y * W + x] !== AIR || y < 1) return false;
  for (let k = 0; k < 8; k++) if (solidAt(x + DX[k], y + DY[k])) return true;
  return false;
}

function bfs(start, isGoal, maxNodes) {
  bfsStamp++;
  let head = 0, tail = 0;
  bfsQueue[tail++] = start;
  bfsMark[start] = bfsStamp;
  bfsPrev[start] = -1;
  while (head < tail) {
    const i = bfsQueue[head++];
    if (isGoal(i)) { bfsCount = tail; return i; }
    if (tail >= maxNodes) continue;
    const x = i % W, y = (i / W) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = x + DX[k], ny = y + DY[k];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = ny * W + nx;
      if (bfsMark[j] === bfsStamp || !isWalkable(nx, ny)) continue;
      // nicht diagonal durch eine Ecke quetschen
      if (k >= 4 && solidAt(nx, y) && solidAt(x, ny)) continue;
      bfsMark[j] = bfsStamp;
      bfsPrev[j] = i;
      bfsQueue[tail++] = j;
    }
  }
  bfsCount = tail;
  return -1;
}

function buildPath(goal) {
  const path = [];
  for (let i = goal; bfsPrev[i] !== -1; i = bfsPrev[i]) path.push(i);
  return path.reverse();
}

// ---------- Ameisen ----------

function createAnt(x, y) {
  return {
    x, y,               // aktuelle Zelle
    path: null, pi: 0,  // Weg und Position darin
    t: 0,               // Fortschritt zur nächsten Zelle (0..1)
    dx: 1, dy: 0,       // Blickrichtung
    speed: rand(6, 9),  // Zellen pro Sekunde
    state: 'rest',
    timer: rand(0, 3),
    target: -1,
    dropX: 0,
    carry: false,
    walk: Math.random(), // für die Beinbewegung
  };
}

function spawnAnts() {
  ants.length = 0;
  reserved.clear();
  const ex = world.entranceX;
  for (let k = 0; k < ANT_COUNT; k++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = ex + side * randInt(3, 18);
    ants.push(createAnt(x, columnTop(x) - 1));
  }
}

function setPath(a, goal) {
  if (goal < 0) return false;
  a.path = buildPath(goal);
  a.pi = 0;
  a.t = 0;
  return true;
}

function releaseTarget(a) {
  if (a.target >= 0 && reserved.get(a.target) === a) reserved.delete(a.target);
  a.target = -1;
}

// Was macht die Ameise als Nächstes?
function decide(a) {
  releaseTarget(a);
  if (Math.random() < 0.75) {
    const t = findDigTask(reserved);
    if (t >= 0) {
      const tx = t % W, ty = (t / W) | 0;
      const goal = bfs(idx(a.x, a.y), i => {
        const x = i % W, y = (i / W) | 0;
        return Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1;
      }, N);
      if (setPath(a, goal)) {
        a.target = t;
        reserved.set(t, a);
        a.state = 'toDig';
        return;
      }
    }
  }
  if (Math.random() < 0.3) {
    a.state = 'rest';
    a.timer = rand(0.5, 3);
    return;
  }
  wander(a);
}

function wander(a) {
  const start = idx(a.x, a.y);
  // Ameisen oben auf der Oberfläche gehen gern zurück ins Nest.
  if (!isUnderground(a.x, a.y) && Math.random() < 0.6) {
    const goal = bfs(start, i => {
      const x = i % W, y = (i / W) | 0;
      return y >= world.surface[x] + 6;
    }, N);
    if (setPath(a, goal)) { a.state = 'wander'; return; }
  }
  bfs(start, () => false, 600);
  if (bfsCount > 20) {
    setPath(a, bfsQueue[randInt(20, bfsCount - 1)]);
    a.state = 'wander';
  } else {
    a.state = 'rest';
    a.timer = rand(0.5, 1.5);
  }
}

function chooseDropColumn() {
  // meist nah am Eingang, selten weiter weg: so entsteht ein Hügel mit Krater
  const ex = world.entranceX;
  for (let k = 0; k < 5; k++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = Math.max(3, Math.min(W - 4, ex + side * (3 + Math.floor(Math.random() * Math.random() * 60))));
    if (!isEntranceColumn(x)) return x;
  }
  return -1;
}

function startCarry(a) {
  a.carry = true;
  a.state = 'carry';
  a.dropX = chooseDropColumn();
  if (a.dropX < 0) a.dropX = world.entranceX + 10;
  const top = columnTop(a.dropX);
  const goal = bfs(idx(a.x, a.y), i => {
    const x = i % W, y = (i / W) | 0;
    return Math.abs(x - a.dropX) <= 1 && y < top;
  }, N);
  if (!setPath(a, goal)) {
    // kein Weg gefunden: Korn fallen lassen und weitermachen
    a.carry = false;
    decide(a);
  }
}

function arrive(a) {
  a.path = null;
  switch (a.state) {
    case 'toDig':
      if (world.cells[a.target] !== AIR &&
          Math.abs(a.target % W - a.x) <= 1 && Math.abs(((a.target / W) | 0) - a.y) <= 1) {
        a.dx = a.target % W - a.x;
        a.dy = ((a.target / W) | 0) - a.y;
        a.state = 'digging';
        a.timer = rand(0.6, 1.2);
      } else {
        decide(a);
      }
      break;
    case 'carry':
      a.state = 'dropping';
      a.timer = 0.3;
      break;
    default:
      decide(a);
  }
}

function finishTimer(a) {
  switch (a.state) {
    case 'digging': {
      const t = a.target;
      releaseTarget(a);
      if (digCell(t)) {
        // manchmal gleich eine Nachbarzelle mitnehmen
        const tx = t % W, ty = (t / W) | 0;
        for (let k = 0; k < 4; k++) {
          const nx = tx + DX[k], ny = ty + DY[k];
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = idx(nx, ny);
          if (world.plan[j] && world.cells[j] !== AIR && !reserved.has(j) && Math.random() < 0.5) {
            digCell(j);
            break;
          }
        }
        startCarry(a);
      } else {
        decide(a);
      }
      break;
    }
    case 'dropping':
      placeGrain(a.dropX);
      a.carry = false;
      decide(a);
      break;
    default:
      decide(a);
  }
}

function replan(a) {
  a.path = null;
  if (a.carry) startCarry(a);
  else decide(a);
}

function updateAnt(a, dt) {
  // Verschüttet? Dann nach oben herauskrabbeln.
  if (world.cells[idx(a.x, a.y)] !== AIR) {
    while (a.y > 0 && world.cells[idx(a.x, a.y)] !== AIR) a.y--;
    a.t = 0;
    if (a.state !== 'digging' && a.state !== 'dropping') replan(a);
  }

  if (a.timer > 0) {
    a.timer -= dt;
    if (a.state === 'digging') a.walk += dt * 6;
    if (a.timer <= 0) finishTimer(a);
    return;
  }
  if (!a.path) { arrive(a); return; }

  let step = a.speed * dt;
  while (step > 0 && a.path && a.pi < a.path.length) {
    const next = a.path[a.pi];
    if (world.cells[next] !== AIR) { replan(a); return; }
    a.dx = next % W - a.x;
    a.dy = ((next / W) | 0) - a.y;
    const need = 1 - a.t;
    if (step >= need) {
      a.x = next % W;
      a.y = (next / W) | 0;
      a.t = 0;
      a.pi++;
      step -= need;
      a.walk += need;
    } else {
      a.t += step;
      a.walk += step;
      step = 0;
    }
  }
  if (a.path && a.pi >= a.path.length) arrive(a);
}

function updateAnts(dt) {
  for (const a of ants) updateAnt(a, dt);
}
