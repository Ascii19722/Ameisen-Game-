'use strict';

// Kolonie: Königin, Brut (Ei → Larve → Kokon → neue Ameise) und Futter.
// Futter wächst an der Oberfläche (Blätter, Blüten, Samen). Arbeiterinnen holen es in die
// Vorratskammer, füttern daraus die Königin und die Larven und tragen die Brut in ihre Kammern.

const EGG_TIME = 90;          // Sekunden, bis aus dem Ei eine Larve schlüpft
const LARVA_FEEDS = 3;        // so oft muss eine Larve gefüttert werden
const LARVA_FEED_GAP = 20;    // frühestens so oft hat eine Larve wieder Hunger
const LARVA_MIN_AGE = 60;
const COCOON_TIME = 90;       // Kokon → neue Ameise
const QUEEN_EAT = 45;         // die Königin isst alle 45 s eine Portion
const LAY_GAP = 25;           // so oft legt sie ein Ei, wenn sie satt ist
const MAX_ANTS = 1000;

// Platz am Kammerboden in Welt-Pixeln: Abstand nebeneinander und Höhe beim Stapeln
const ITEM_W = { egg: 2, larva: 4, cocoon: 4, leaf: 2, petal: 2, seed: 2, meat: 2, crumb: 2, shell: 3 };
const ITEM_H = { egg: 0.8, larva: 0.9, cocoon: 1.6, leaf: 0.7, petal: 0.7, seed: 0.7, meat: 0.8, crumb: 0.6, shell: 0.9 };

// Tote Insekten an der Oberfläche: zu schwer für eine Ameise, mehrere tragen sie gemeinsam zum Eingang
const PREY = {
  beetle: { need: 3, portions: 8 },
  grasshopper: { need: 4, portions: 12 },
};
const PREY_SPEED = 2.5;
// Brut-Größe je Sorte (Pflegerin < Arbeiterin < Soldatin)
const BROOD_SIZE = { nurse: 0.8, worker: 1, soldier: 1.35 };
// Gewünschter Anteil der Sorten an der Kolonie
const CASTE_SHARE = { nurse: 0.15, soldier: 0.08 };

const SOURCE_FOOD = { plant: 'leaf', flower: 'petal', seeds: 'seed' };

// Kammer-Aufgaben in der Reihenfolge, in der sie gebraucht werden
const ROLE_ORDER = ['food', 'eggs', 'larvae', 'pupae', 'food', 'larvae', 'pupae', 'reserve'];
// Fehlt eine Kammer, kommt das Ding in die nächstbeste
const ROLE_FALLBACK = {
  eggs: ['eggs', 'queen'],
  larvae: ['larvae', 'eggs', 'queen'],
  pupae: ['pupae', 'larvae', 'eggs', 'queen'],
  food: ['food', 'queen'],
  waste: ['waste'],   // ohne Abfallkammer kommt Abfall nach draußen auf den Abfallhaufen
};

const colony = {
  food: [],      // Futterstücke {kind, x, y, room, lvl, by, claim}
  brood: [],     // Brut {kind: egg/larva/cocoon, x, y, room, lvl, age, fed, lastFed, by, claim, feeder, ph}
  sources: [],   // Futterpflanzen an der Oberfläche {x, kind, amount, max}
  queenFood: 3,
  eatTimer: QUEEN_EAT,
  layTimer: 15,
  sourceTimer: 0,
  waste: [],     // Abfall {kind: crumb/shell, x, y, room, lvl, by, claim, dumped, age}
  prey: [],      // tote Insekten {x, y, kind, need, portions, carriers, moving, wait}
  preyTimer: 60,
  dumpX: 0,      // Abfallhaufen draußen
};

function resetColony() {
  colony.food = [];
  colony.brood = [];
  colony.sources = [];
  colony.queenFood = 3;
  colony.eatTimer = QUEEN_EAT;
  colony.layTimer = 15;
  colony.sourceTimer = 0;
  colony.waste = [];
  colony.prey = [];
  colony.preyTimer = 60;
  colony.dumpX = Math.round(world.entranceX + (Math.random() < 0.5 ? -1 : 1) * rand(60, 90));
  for (let k = 0; k < 5; k++) addSource();
}

function addSource() {
  const ex = world.entranceX;
  for (let k = 0; k < 12; k++) {
    const x = Math.round(ex + (Math.random() < 0.5 ? -1 : 1) * rand(50, 200));
    if (x < 6 || x >= W - 6 || colony.sources.some(s => Math.abs(s.x - x) < 14)) continue;
    const max = randInt(6, 14);
    colony.sources.push({ x, kind: ['plant', 'flower', 'seeds'][randInt(0, 2)], amount: max, max });
    return;
  }
}

function assignRole(ch) {
  if (ch.royal) { ch.role = 'queen'; return; }
  // Abfallkammer: abseits, weit weg vom Eingang
  if (!world.chambers.some(c => c.role === 'waste') && world.chambers.length >= 5 && Math.abs(ch.cx - world.entranceX) > 50) {
    ch.role = 'waste';
    return;
  }
  const n = world.chambers.filter(c => c.role && c.role !== 'queen' && c.role !== 'waste').length;
  ch.role = n < ROLE_ORDER.length ? ROLE_ORDER[n] : ['food', 'larvae', 'pupae', 'reserve'][n % 4];
}

const isWaste = item => item.kind === 'crumb' || item.kind === 'shell';
const roleOf = item => item.kind === 'egg' ? 'eggs' : item.kind === 'larva' ? 'larvae' : item.kind === 'cocoon' ? 'pupae' : isWaste(item) ? 'waste' : 'food';
const listOf = item => (item.kind === 'egg' || item.kind === 'larva' || item.kind === 'cocoon') ? colony.brood : isWaste(item) ? colony.waste : colony.food;

// Wärme: Tagsüber ist es oben warm, nachts und morgens unten. Gibt es mehrere Larven- oder
// Puppenkammern, kommt die Brut in die wärmste.
const isWarmDay = () => sky.time > 0.3 && sky.time < 0.75;
function warmRoom(role) {
  if (role !== 'larvae' && role !== 'pupae') return null;
  const list = world.chambers.filter(c => c.role === role);
  if (list.length < 2) return null;
  list.sort((a, b) => a.cy - b.cy);
  return isWarmDay() ? list[0] : list[list.length - 1];
}

// Die Kammer-Aufgabe, die für dieses Ding gerade gilt (erste vorhandene aus der Ausweich-Liste)
function bestRole(role) {
  for (const r of ROLE_FALLBACK[role]) if (world.chambers.some(c => c.role === r)) return r;
  return null;
}
function roomFor(role) {
  const r = bestRole(role);
  if (!r) return null;
  const warm = warmRoom(r);
  if (warm) return warm;
  let best = null, bn = Infinity;
  for (const c of world.chambers) {
    if (c.role !== r) continue;
    const n = colony.food.filter(f => f.room === c).length + colony.brood.filter(b => b.room === c).length + Math.random();
    if (n < bn) { bn = n; best = c; }
  }
  return best;
}
function misplaced(item) {
  if (isWaste(item)) return item.dumped ? false : bestRole('waste') ? !item.room || item.room.role !== 'waste' : !item.dumped;
  if (!item.room || item.room.role !== bestRole(roleOf(item))) return true;
  const warm = warmRoom(item.room.role);
  return !!warm && warm !== item.room;
}

// Abfall entsteht beim Fressen (Reste) und beim Schlüpfen (leere Kokonhülle)
function makeWaste(kind, x, y) {
  if (colony.waste.length > 60) return;
  const w = { kind, room: null, lvl: 0, by: null, claim: null, dumped: false, age: 0 };
  colony.waste.push(w);
  dropLoose(w, Math.round(x), Math.round(y));
}

function addPrey() {
  const ex = world.entranceX;
  for (let k = 0; k < 10; k++) {
    const x = Math.round(ex + (Math.random() < 0.5 ? -1 : 1) * rand(45, 180));
    if (x < 8 || x >= W - 8 || colony.prey.some(p => Math.abs(p.x - x) < 20)) continue;
    const kind = Math.random() < 0.6 ? 'beetle' : 'grasshopper';
    colony.prey.push({ x, y: columnTop(x) - 1, kind, need: PREY[kind].need, portions: PREY[kind].portions, carriers: [], moving: false, wait: 0 });
    return;
  }
}

// ---------- Ablegen mit Schwerkraft ----------

// Stellen am Kammerboden (Luft mit festem Boden darunter)
function floorSpots(room) {
  const out = [];
  for (let x = Math.round(room.cx - 14); x <= room.cx + 14; x++) {
    if (x < 1 || x >= W - 1) continue;
    for (let y = room.floor; y >= room.floor - 3; y--) {
      if (world.cells[idx(x, y)] === AIR && solidAt(x, y + 1)) { out.push([x, y]); break; }
    }
  }
  return out;
}

// Legt ein Ding in eine Kammer: erst einzeln mit Abstand, wenn kein Platz mehr ist, aufeinander
function placeItem(item, room) {
  const spots = floorSpots(room);
  if (!spots.length) { dropLoose(item, Math.round(room.cx), room.floor); return; }
  const others = listOf(item).filter(o => o !== item && o.room === room && !o.by);
  const sp = ITEM_W[item.kind];
  const free = spots.filter(([x]) => !others.some(o => Math.abs(o.x - x) < sp));
  let spot, lvl = 0;
  if (free.length) {
    free.sort((a, b) => Math.abs(a[0] - room.cx) - Math.abs(b[0] - room.cx));
    spot = free[randInt(0, Math.min(3, free.length - 1))];
  } else {
    let bn = Infinity;
    for (const s of spots) {
      const n = others.filter(o => Math.abs(o.x - s[0]) < 1.5).length;
      if (n < bn) { bn = n; spot = s; }
    }
    lvl = bn;
  }
  item.x = spot[0];
  item.y = spot[1] - lvl * ITEM_H[item.kind];
  item.lvl = lvl;
  item.room = room;
  item.by = null;
}

// Fällt irgendwo hin (z. B. wenn eine Ameise es fallen lässt): rutscht nach unten bis auf festen Boden
function dropLoose(item, x, y) {
  while (y < H - 2 && !solidAt(x, y + 1)) y++;
  item.x = x;
  item.y = y;
  item.lvl = 0;
  item.room = null;
  item.by = null;
}

// Wird ein Ding aufgehoben, rutschen die darüber liegenden nach
function liftItem(item) {
  if (item.room) {
    for (const o of listOf(item)) {
      if (o !== item && o.room === item.room && !o.by && Math.abs(o.x - item.x) < 1.5 && o.lvl > item.lvl) {
        o.lvl--;
        o.y += ITEM_H[o.kind];
      }
    }
  }
  item.room = null;
}

function removeItem(item) {
  const list = listOf(item), k = list.indexOf(item);
  if (k >= 0) list.splice(k, 1);
}

function foodCount() { return colony.food.filter(f => !f.by).length; }
function foodTarget() { return 8 + Math.round(ants.length * 0.25) + colony.brood.filter(b => b.kind === 'larva').length; }
function freeFood() {
  let loose = null;
  for (const f of colony.food) {
    if (f.by || f.claim) continue;
    if (f.room) return f;
    loose = loose || f;
  }
  return loose;
}
function larvaHungry(l) {
  return l.kind === 'larva' && !l.by && !l.feeder && !l.claim && l.fed < LARVA_FEEDS && l.age - l.lastFed >= LARVA_FEED_GAP;
}

// ---------- Aufgaben der Arbeiterinnen ----------
// Jede Aufgabe hat zwei Teile: etwas holen (fetch) und es irgendwo abgeben (deliver).

// Welche Sorte wird aus dem neuen Ei? Die, von der gerade am meisten fehlt.
function chooseCaste() {
  const n = ants.length + colony.brood.length;
  if (n < 20) return Math.random() < 0.2 ? 'nurse' : 'worker';
  const have = c => ants.filter(a => a.caste === c).length + colony.brood.filter(b => b.caste === c).length;
  const lackN = CASTE_SHARE.nurse - have('nurse') / n, lackS = CASTE_SHARE.soldier - have('soldier') / n;
  if (lackN > 0 && lackN >= lackS && Math.random() < 0.6) return 'nurse';
  if (lackS > 0 && Math.random() < 0.6) return 'soldier';
  return 'worker';
}

// Pflegerinnen kümmern sich nur um Königin und Brut, Arbeiterinnen machen alles
function colonyTask(a) {
  if (!world.royal) return false;
  const nurse = a.caste === 'nurse';
  if (a.caste === 'soldier') return preyTask(a);
  const queen = ants.find(q => q.caste === 'queen');
  // 1. Die Königin hat Hunger
  const feeders = ants.filter(b => b.job && b.job.type === 'queen').length;
  if (queen && colony.queenFood < 3 && feeders < (colony.queenFood < 1 ? 3 : 2)) {
    const f = freeFood();
    if (f && startJob(a, { type: 'queen', item: f, queen })) return true;
  }
  // 2. Brut in die richtige Kammer tragen
  if (Math.random() < 0.7) {
    const b = colony.brood.find(it => !it.by && !it.claim && !it.feeder && misplaced(it));
    if (b) { const room = roomFor(roleOf(b)); if (room && startJob(a, { type: 'move', item: b, room })) return true; }
  }
  // 3. Eine hungrige Larve füttern
  if (Math.random() < 0.8) {
    const l = colony.brood.find(larvaHungry), f = l && freeFood();
    if (f && startJob(a, { type: 'larva', item: f, larva: l })) return true;
  }
  if (nurse) return false;
  if (Math.random() < 0.7 && preyTask(a)) return true;
  // Abfall wegräumen
  if (Math.random() < 0.4) {
    const w = colony.waste.find(it => !it.by && !it.claim && misplaced(it));
    if (w) {
      const room = roomFor('waste');
      if (startJob(a, room ? { type: 'move', item: w, room } : { type: 'move', item: w, dumpX: colony.dumpX + randInt(-3, 3) })) return true;
    }
  }
  // 4. Loses Futter in die Vorratskammer bringen
  if (Math.random() < 0.5) {
    const f = colony.food.find(it => !it.by && !it.claim && misplaced(it));
    if (f) { const room = roomFor('food'); if (room && startJob(a, { type: 'move', item: f, room })) return true; }
  }
  // 5. Futter holen, wenn der Vorrat knapp ist
  const foragers = ants.filter(b => b.job && b.job.type === 'forage').length;
  if (foodCount() + foragers < foodTarget() && foragers < Math.ceil(ants.length * 0.35) && Math.random() < 0.8) {
    const list = colony.sources.filter(s => s.amount > 0);
    if (list.length) {
      const s = list[randInt(0, list.length - 1)];
      if (startJob(a, { type: 'forage', source: s })) return true;
    }
  }
  return false;
}

// Beute: tote Insekten gemeinsam heimtragen (auch Soldatinnen helfen)
function preyTask(a) {
  const p = colony.prey.find(q => q.carriers.length < q.need && !q.moving);
  return !!p && startJob(a, { type: 'prey', prey: p });
}

function startJob(a, job) {
  a.job = job;
  job.phase = 'fetch';
  if (job.item) job.item.claim = a;
  if (job.larva) job.larva.feeder = a;
  if (job.prey) job.prey.carriers.push(a);
  if (routeJob(a)) return true;
  endJob(a);
  return false;
}

function endJob(a) {
  const j = a.job;
  if (!j) return;
  if (j.item && j.item.claim === a) j.item.claim = null;
  if (j.larva && j.larva.feeder === a) j.larva.feeder = null;
  if (j.prey) {
    const k = j.prey.carriers.indexOf(a);
    if (k >= 0) j.prey.carriers.splice(k, 1);
  }
  a.job = null;
}

// Was die Ameise gerade trägt, fällt herunter (Aufgabe abgebrochen)
function dropLoad(a) {
  const it = a.load;
  if (!it) return;
  a.load = null;
  if (!listOf(it).includes(it)) listOf(it).push(it);
  dropLoose(it, a.x, a.y);
}

// Weg zum aktuellen Ziel der Aufgabe suchen
function routeJob(a) {
  const j = a.job, start = idx(a.x, a.y);
  let goal = -1;
  if (j.phase === 'fetch') {
    if (j.source || j.prey) {
      const sx = Math.round(j.source ? j.source.x : j.prey.x), top = columnTop(sx), r = j.prey ? 3 : 1;
      goal = bfs(start, i => { const x = i % W, y = (i / W) | 0; return Math.abs(x - sx) <= r && y < columnTop(x) && y >= columnTop(x) - 2; }, N);
    } else {
      const it = j.item;
      goal = bfs(start, i => { const x = i % W, y = (i / W) | 0; return Math.abs(x - it.x) <= 2 && Math.abs(y - it.y) <= 3; }, N);
    }
  } else {
    let tx, ty, r = 2.5;
    if (j.type === 'queen') { tx = j.queen.x; ty = j.queen.y; r = 3.5; }
    else if (j.type === 'larva') { tx = j.larva.x; ty = j.larva.y; }
    else if (j.dumpX !== undefined) {   // Abfallhaufen draußen
      const dx = j.dumpX;
      goal = bfs(start, i => { const x = i % W, y = (i / W) | 0; return Math.abs(x - dx) <= 1 && y < columnTop(x) && y >= columnTop(x) - 2; }, N);
      if (!setPath(a, goal)) return false;
      a.state = j.phase;
      return true;
    }
    else { tx = j.room.cx; ty = j.room.floor; r = 6; }
    goal = bfs(start, i => { const x = i % W, y = (i / W) | 0; return Math.abs(x - tx) <= r && Math.abs(y - ty) <= 2.5; }, N);
  }
  if (!setPath(a, goal)) return false;
  a.state = j.phase;
  return true;
}

function jobArrive(a) {
  const j = a.job;
  if (j.phase === 'fetch' && j.prey) {   // an der Beute warten, bis genug Helferinnen da sind
    if (!colony.prey.includes(j.prey)) { endJob(a); decide(a); return; }
    a.state = 'haul';
    a.mx = j.prey.x - a.x; a.my = 0;
    return;
  }
  if (j.phase === 'fetch') {
    const ok = j.source ? j.source.amount > 0 : (listOf(j.item).includes(j.item) && !j.item.by && j.item.claim === a);
    if (!ok) { endJob(a); decide(a); return; }
    a.state = 'pick';
    a.timer = j.source ? rand(1, 1.6) : 0.4;   // Blatt abschneiden dauert länger
    if (!j.source) { a.mx = j.item.x - a.x; a.my = j.item.y - a.y; }
  } else {
    a.state = 'give';
    a.timer = j.type === 'move' || j.type === 'forage' ? 0.3 : 0.8;
  }
}

function jobTimer(a) {
  const j = a.job;
  if (a.state === 'pick') {
    if (j.source) {
      if (j.source.amount <= 0) { endJob(a); decide(a); return; }
      j.source.amount--;
      a.load = { kind: SOURCE_FOOD[j.source.kind], x: a.x, y: a.y, room: null, lvl: 0, by: a, claim: null };
      j.room = roomFor('food');
      if (!j.room) { a.load = null; endJob(a); decide(a); return; }
    } else {
      liftItem(j.item);
      j.item.by = a;
      a.load = j.item;
    }
    j.phase = 'deliver';
    if (!routeJob(a)) { dropLoad(a); endJob(a); decide(a); }
    return;
  }
  // Abgeben
  const it = a.load;
  a.load = null;
  if (j.type === 'queen') {
    colony.queenFood += 2;   // ein großes Stück reicht für zwei Mahlzeiten
    removeItem(it);
    if (Math.random() < 0.3) makeWaste('crumb', j.queen.x, j.queen.y);
  } else if (j.type === 'larva') {
    if (colony.brood.includes(j.larva) && j.larva.kind === 'larva') { j.larva.fed++; j.larva.lastFed = j.larva.age; }
    removeItem(it);
    if (Math.random() < 0.25) makeWaste('crumb', a.x, a.y);
  } else if (j.dumpX !== undefined) {
    if (!listOf(it).includes(it)) listOf(it).push(it);
    dropLoose(it, j.dumpX, columnTop(j.dumpX) - 1);
    it.dumped = true;
    it.age = 0;
  } else {
    if (!listOf(it).includes(it)) listOf(it).push(it);
    placeItem(it, j.room);
  }
  endJob(a);
  decide(a);
}

// ---------- Königin und Brut über die Zeit ----------

function updateColony(dt) {
  const queen = ants.find(q => q.caste === 'queen');
  if (world.royal && queen) {
    colony.eatTimer -= dt;
    if (colony.eatTimer <= 0) { colony.eatTimer = QUEEN_EAT; colony.queenFood = Math.max(0, colony.queenFood - 1); }
    colony.layTimer -= dt;
    const r = world.royal;
    const inRoom = Math.abs(queen.x - r.cx) < 12 && Math.abs(queen.y - r.floor) < 5 && !queen.path;
    if (colony.layTimer <= 0 && inRoom) {
      colony.layTimer = LAY_GAP * rand(0.8, 1.2);
      if (colony.queenFood > 0.5 && colony.brood.length < 6 + ants.length * 0.5 && ants.length < MAX_ANTS) {
        colony.queenFood -= 0.25;
        const egg = { kind: 'egg', caste: chooseCaste(), age: 0, fed: 0, lastFed: -999, by: null, claim: null, feeder: null, ph: Math.random() * 8 };
        colony.brood.push(egg);
        dropLoose(egg, queen.x, queen.y);
        egg.room = r;   // liegt bei der Königin, bis jemand es abholt
      }
    }
  }
  for (let k = colony.brood.length - 1; k >= 0; k--) {
    const b = colony.brood[k];
    if (b.by) continue;   // getragene Brut wartet
    b.age += dt;
    if (b.kind === 'egg' && b.age >= EGG_TIME) {
      b.kind = 'larva'; b.age = 0; b.fed = 0; b.lastFed = -999;
    } else if (b.kind === 'larva' && b.fed >= LARVA_FEEDS && b.age >= LARVA_MIN_AGE && !b.feeder && !b.claim) {
      b.kind = 'cocoon'; b.age = 0;
    } else if (b.kind === 'cocoon' && b.age >= COCOON_TIME && !b.claim) {
      colony.brood.splice(k, 1);
      const by = Math.round(b.y);
      if (world.cells[idx(b.x, by)] === AIR && ants.length < MAX_ANTS) ants.push(createAnt(b.x, by, b.caste || 'worker'));
      makeWaste('shell', b.x, by);
    }
  }
  // Abfall draußen zerfällt mit der Zeit, in der Abfallkammer langsamer
  for (let k = colony.waste.length - 1; k >= 0; k--) {
    const w = colony.waste[k];
    if (w.by) continue;
    w.age += dt;
    if ((w.dumped && w.age > 400) || (w.room && w.age > 1500)) { liftItem(w); colony.waste.splice(k, 1); }
  }
  updatePrey(dt);
  // Abgeerntete Pflanzen verschwinden, neue wachsen nach
  colony.sources = colony.sources.filter(s => s.amount > 0 || ants.some(a => a.job && a.job.source === s));
  colony.sourceTimer += dt;
  if (colony.sourceTimer > 25 && colony.sources.length < 8) { colony.sourceTimer = 0; addSource(); }
}

// Tote Insekten: tauchen ab und zu auf; sind genug Helferinnen da, wandert die Beute zum Eingang.
// Dort wird sie in Stücke zerlegt, die dann einzeln in die Vorratskammer kommen.
function updatePrey(dt) {
  colony.preyTimer -= dt;
  if (colony.preyTimer <= 0) {
    colony.preyTimer = rand(80, 160);
    if (colony.prey.length < 2 && world.royal) addPrey();
  }
  for (let k = colony.prey.length - 1; k >= 0; k--) {
    const p = colony.prey[k];
    const here = p.carriers.filter(a => a.state === 'haul');
    if (!p.moving) {
      if (here.length >= p.need) p.moving = true;
      else if (here.length) {
        p.wait += dt;
        if (p.wait > 40) {   // zu lange niemand gekommen: aufgeben, später nochmal
          p.wait = 0;
          for (const a of p.carriers.slice()) { if (a.state === 'haul') { endJob(a); decide(a); } }
        }
      }
      continue;
    }
    const ex = world.entranceX, dir = Math.sign(ex - p.x);
    p.x += dir * PREY_SPEED * dt;
    p.y = columnTop(Math.round(p.x)) - 1;
    here.forEach((a, i) => {   // Trägerinnen laufen links und rechts neben der Beute mit
      const off = (i % 2 ? 1 : -1) * (3 + (i >> 1) * 4);
      a.x = Math.max(1, Math.min(W - 2, Math.round(p.x + off)));
      a.y = columnTop(a.x) - 1;
      a.mx = dir; a.my = 0;
      a.walk += PREY_SPEED * dt * 1.6;
    });
    if (Math.abs(p.x - ex) < 6) {
      // Am Eingang zerlegen: Stücke liegen neben dem Eingang und werden einzeln hineingetragen
      for (let n = 0; n < p.portions; n++) {
        let x = ex + (Math.random() < 0.5 ? -1 : 1) * randInt(4, 9);
        if (isEntranceColumn(x)) x = ex + 10;
        const f = { kind: 'meat', room: null, lvl: 0, by: null, claim: null };
        colony.food.push(f);
        dropLoose(f, x, columnTop(x) - 1);
      }
      colony.prey.splice(k, 1);
      for (const a of p.carriers.slice()) { endJob(a); decide(a); }
    }
  }
}

function broodCount() { return colony.brood.length; }
