'use strict';

const WORKER_COUNT = 30;
const ants = [];

// ---------- Wegfindung (Breitensuche auf dem Raster) ----------
// Ameisen laufen an Böden, Wänden und Decken entlang, nie frei durch die Luft.

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
      if (k >= 4 && solidAt(nx, y) && solidAt(x, ny)) continue;   // nicht durch Ecken quetschen
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

function createAnt(x, y, caste) {
  return {
    caste, x, y,
    path: null, pi: 0, t: 0,
    mx: 1, my: 0,           // letzte Bewegungsrichtung
    rot: 0,                 // Drehung des Körpers (Füße zeigen zum Boden)
    face: 1,                // 1 = schaut nach „vorne“ entlang des Bodens, -1 = andersherum
    turn: 0,                // Restzeit der Umdreh-Bewegung
    speed: caste === 'queen' ? 3 : caste === 'nurse' ? rand(5, 7) : rand(6, 9),
    state: 'rest',
    timer: rand(0, 2),
    tip: null,
    dropX: 0,
    carry: false,           // trägt Sand
    load: null,             // trägt Futter oder Brut
    job: null,              // Aufgabe für die Kolonie (siehe colony.js)
    walk: Math.random() * 8,
  };
}

function spawnAnts() {
  ants.length = 0;
  const ex = world.entranceX;
  for (let k = 0; k < WORKER_COUNT; k++) {
    const x = ex + (Math.random() < 0.5 ? -1 : 1) * randInt(4, 26);
    ants.push(createAnt(x, columnTop(x) - 1, 'worker'));
  }
  ants.push(createAnt(ex + 2, SURFACE_Y - 1, 'queen'));
}

function setPath(a, goal) {
  if (goal < 0) return false;
  a.path = buildPath(goal);
  a.pi = 0;
  a.t = 0;
  return true;
}

function antsAt(tip) {
  let n = 0;
  for (const a of ants) if (a.tip === tip) n++;
  return n;
}

// Wo gräbt die Ameise an einer Grabstelle? Kurz vor der Spitze, in Grabrichtung.
// Wo gräbt die Ameise an einer Grabstelle? An der offenen Sandwand, die dem nächsten Stück am nächsten ist.
function tipFront(tip) {
  let d = null, floorY = Infinity;
  if (tip.kind === 'room') { d = tip.blobs[0]; floorY = tip.floor; }
  else d = tip.goal;
  if (d) {
    const f = nearestFace(d[0], d[1], d[2], floorY, d[0], d[1]);
    if (f) return f;
  }
  return [tip.x + Math.cos(tip.dir) * 1.5, tip.y + Math.sin(tip.dir) * 1.5];
}

function decide(a) {
  a.tip = null;
  if (a.job) { dropLoad(a); endJob(a); }
  if (a.caste === 'queen') { queenDecide(a); return; }
  if (a.caste === 'soldier') { soldierDecide(a); return; }
  if (a.caste === 'nurse') {   // Pflegerin: bei der Brut bleiben, selten graben
    if (colonyTask(a)) return;
    if (Math.random() < 0.8) {
      if (Math.random() < 0.5) { a.state = 'rest'; a.timer = rand(1, 4); return; }
      wander(a, 150);
      return;
    }
  }
  // Erst schauen, ob die Kolonie etwas braucht (Futter, Brut, Königin), sonst graben
  if (Math.random() < 0.9 && colonyTask(a)) return;
  // Eine Grabstelle aussuchen, an der noch Platz ist
  const open = world.tips.filter(t => antsAt(t) < (t.kind === 'room' || t.kind === 'queen' ? 6 : 4));
  if (open.length && Math.random() < 0.85) {
    const tip = open[randInt(0, open.length - 1)];
    const [fx, fy] = tipFront(tip);
    const goal = bfs(idx(a.x, a.y), i => {
      const x = i % W, y = (i / W) | 0;
      return Math.hypot(x - fx, y - fy) < TUNNEL_R + 2.5;
    }, N);
    if (setPath(a, goal)) { a.tip = tip; a.state = 'toDig'; return; }
  }
  if (Math.random() < 0.35) { a.state = 'rest'; a.timer = rand(0.5, 3); return; }
  wander(a, 600);
}

// Die Königin zieht in ihre Kammer, sobald es eine gibt, und bleibt dort
function queenDecide(a) {
  const r = world.royal;
  if (r) {
    const inRoom = Math.abs(a.x - r.cx) < 9 && Math.abs(a.y - r.floor) < 4;
    if (!inRoom) {
      const goal = bfs(idx(a.x, a.y), i => {
        const x = i % W, y = (i / W) | 0;
        return Math.abs(x - r.cx) < 4 && y === r.floor;
      }, N);
      if (setPath(a, goal)) { a.state = 'toRoyal'; return; }
    } else {
      // Meist ruhig in der Kammer liegen, ab und zu ein paar Schritte
      if (Math.random() < 0.7) { a.state = 'rest'; a.timer = rand(3, 8); return; }
      wander(a, 120);
      return;
    }
  }
  a.state = 'rest';
  a.timer = rand(1, 3);
}

// Soldatin: bewacht den Eingang, läuft oben und im oberen Gang Streife
function soldierDecide(a) {
  const ex = world.entranceX;
  if (Math.random() < 0.5) {
    const tx = ex + randInt(-25, 25), top = columnTop(tx);
    const goal = bfs(idx(a.x, a.y), i => {
      const x = i % W, y = (i / W) | 0;
      return Math.abs(x - tx) <= 2 && y < top && y >= top - 2;
    }, N);
    if (setPath(a, goal)) { a.state = 'guard'; return; }
  }
  if (Math.random() < 0.5) { a.state = 'rest'; a.timer = rand(3, 8); return; }
  wander(a, 300);
}

function wander(a, nodes) {
  const start = idx(a.x, a.y);
  // Wer oben herumläuft, geht gern zurück ins Nest
  if (!isUnderground(a.x, a.y) && Math.random() < 0.6 && a.caste !== 'queen') {
    const goal = bfs(start, i => {
      const x = i % W, y = (i / W) | 0;
      return y >= world.surface[x] + 10;
    }, N);
    if (setPath(a, goal)) { a.state = 'wander'; return; }
  }
  bfs(start, () => false, nodes);
  if (bfsCount > 12) {
    setPath(a, bfsQueue[randInt(Math.min(10, bfsCount - 1), bfsCount - 1)]);
    a.state = 'wander';
  } else {
    a.state = 'rest';
    a.timer = rand(0.5, 1.5);
  }
}

// Sand nach oben tragen: meist nah am Eingang, selten weiter weg → Hügel
function chooseDropColumn() {
  const ex = world.entranceX;
  for (let k = 0; k < 6; k++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = Math.max(3, Math.min(W - 4, ex + side * (4 + Math.floor(Math.random() * Math.random() * 40))));
    if (!isEntranceColumn(x)) return x;
  }
  return -1;
}

function startCarry(a) {
  a.carry = true;
  a.state = 'carry';
  a.dropX = chooseDropColumn();
  if (a.dropX < 0) a.dropX = world.entranceX + 12;
  const top = columnTop(a.dropX);
  const goal = bfs(idx(a.x, a.y), i => {
    const x = i % W, y = (i / W) | 0;
    return Math.abs(x - a.dropX) <= 1 && y < top;
  }, N);
  if (!setPath(a, goal)) { a.carry = false; decide(a); }
}

function arrive(a) {
  a.path = null;
  if (a.job) { jobArrive(a); return; }
  switch (a.state) {
    case 'toDig': {
      const tip = a.tip;
      if (tip && world.tips.includes(tip)) {
        const [fx, fy] = tipFront(tip);
        if (Math.hypot(a.x - fx, a.y - fy) < TUNNEL_R + 4) {
          a.state = 'digging';
          a.timer = rand(0.5, 0.9);
          a.mx = fx - a.x; a.my = fy - a.y;
          return;
        }
      }
      decide(a);
      break;
    }
    case 'carry':
      a.state = 'dropping';
      a.timer = 0.3;
      break;
    default:
      decide(a);
  }
}

function finishTimer(a) {
  if (a.job && (a.state === 'pick' || a.state === 'give')) { jobTimer(a); return; }
  switch (a.state) {
    case 'digging': {
      const tip = a.tip;
      let n = 0;
      // Ein Maul voll Sand abbeißen (nur an der offenen Wand, in Reichweite der Ameise)
      if (tip && world.tips.includes(tip)) n = digStep(tip, a.x, a.y, 12);
      a.tip = null;
      if (n > 0) startCarry(a); else decide(a);
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
  if (a.job) {
    if (!routeJob(a)) decide(a);
    return;
  }
  if (a.carry) startCarry(a); else decide(a);
}

// Körper zum Boden ausrichten: Füße zeigen zur festen Seite. Umdrehen, wenn sich die Laufrichtung umkehrt.
function orient(a, dt) {
  let sx = 0, sy = 0;
  for (let k = 0; k < 8; k++) {
    if (solidAt(a.x + DX[k], a.y + DY[k])) { const l = Math.hypot(DX[k], DY[k]); sx += DX[k] / l; sy += DY[k] / l; }
  }
  if (sx || sy) {
    const target = Math.atan2(sy, sx) - Math.PI / 2;
    a.rot += angleTo(a.rot, target) * Math.min(1, dt * 10);
  }
  const tx = Math.cos(a.rot), ty = Math.sin(a.rot);
  const d = a.mx * tx + a.my * ty;
  if (Math.abs(d) > 0.3) {
    const f = d > 0 ? 1 : -1;
    if (f !== a.face) { a.face = f; a.turn = 0.2; }
  }
  if (a.turn > 0) a.turn = Math.max(0, a.turn - dt);
}

function updateAnt(a, dt) {
  // Verschüttet? Nach oben herauskrabbeln.
  if (world.cells[idx(a.x, a.y)] !== AIR) {
    while (a.y > 0 && world.cells[idx(a.x, a.y)] !== AIR) a.y--;
    a.t = 0;
    if (a.timer <= 0) replan(a);
  }
  // Nichts mehr unter den Füßen (Kammer um sie herum ausgegraben)? Dann fällt sie herunter.
  if (!isWalkable(a.x, a.y) && a.y < H - 2 && world.cells[idx(a.x, a.y + 1)] === AIR) {
    a.y++;
    a.t = 0;
    if (a.path) replan(a);
    return;
  }
  orient(a, dt);

  if (a.timer > 0) {
    a.timer -= dt;
    if (a.state === 'digging' || a.state === 'pick') a.walk += dt * 10;
    if (a.timer <= 0) finishTimer(a);
    return;
  }
  if (!a.path) { arrive(a); return; }

  let step = a.speed * dt;
  while (step > 0 && a.path && a.pi < a.path.length) {
    const next = a.path[a.pi];
    if (world.cells[next] !== AIR) { replan(a); return; }
    a.mx = next % W - a.x;
    a.my = ((next / W) | 0) - a.y;
    const need = 1 - a.t;
    if (step >= need) {
      a.x = next % W;
      a.y = (next / W) | 0;
      a.t = 0;
      a.pi++;
      step -= need;
      a.walk += need * 1.6;
    } else {
      a.t += step;
      a.walk += step * 1.6;
      step = 0;
    }
  }
  if (a.path && a.pi >= a.path.length) arrive(a);
}

function updateAnts(dt) {
  for (const a of ants) updateAnt(a, dt);
}
