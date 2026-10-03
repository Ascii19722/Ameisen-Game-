'use strict';

// Feinde und Kampf. Kein Game Over: Der Königin passiert nichts, und die Kolonie erholt sich.
//  Spinne: läuft oben an der Oberfläche entlang und jagt Ameisen, die draußen unterwegs sind.
//          Ist sie verletzt oder satt, zieht sie wieder ab.
//  Räuber: schwarze fremde Ameisen in kleinen Gruppen. Sie dringen ins Nest ein, schnappen sich Brut
//          und rennen damit davon.
// Ameisen wehren sich, wenn ein Feind neben ihnen ist; Soldatinnen eilen gezielt herbei.

const ENEMY = {
  spider: { hp: 16, dmg: 1.0, speed: 5, full: 3 },   // nach 3 Ameisen ist sie satt
  raider: { hp: 4, dmg: 0.9 },
};
const ANT_HP = { worker: 3, nurse: 2, soldier: 8, queen: Infinity, raider: ENEMY.raider.hp };
const ANT_DMG = { worker: 0.6, nurse: 0.3, soldier: 2, queen: 0 };

const enemies = [];
let enemyTimer = 900;   // erster Besuch nach etwa drei Tagen

function resetEnemies() {
  enemies.length = 0;
  enemyTimer = rand(700, 1100);
}

// Oberkante zum Laufen draußen (über das Eingangsloch hinweg)
function groundTop(x) {
  const xi = Math.max(0, Math.min(W - 1, Math.round(x)));
  return Math.min(columnTop(xi), world.surface[xi]);
}
const onSurface = a => a.y < world.surface[a.x] + 1;

function spawnEnemies() {
  const fromLeft = Math.random() < 0.5, x = fromLeft ? 3 : W - 4;
  if (Math.random() < 0.4) {
    enemies.push({ type: 'spider', x, y: groundTop(x) - 1, hp: ENEMY.spider.hp, maxHp: ENEMY.spider.hp,
      state: 'come', targetX: world.entranceX + rand(-60, 60), life: 0, foe: null, walk: 0, face: fromLeft ? 1 : -1 });
  } else {
    const n = Math.min(6, 2 + Math.floor(ants.length / 40));
    for (let k = 0; k < n; k++) {
      const rx = fromLeft ? 3 + k * 3 : W - 4 - k * 3;
      const e = createAnt(rx, columnTop(rx) - 1, 'raider', null);
      Object.assign(e, { type: 'raider', state: 'come', speed: rand(7, 9) });
      enemies.push(e);
    }
  }
}

// ---------- Ameisen: kämpfen und töten ----------

function killAnt(a) {
  if (a.caste === 'queen' || a.dead) return;
  a.dead = true;
  dropLoad(a);
  endJob(a);
  // Tote Ameise bleibt liegen und wird später weggeräumt
  const c = { kind: 'corpse', caste: a.caste, art: a.art, room: null, lvl: 0, by: null, claim: null, dumped: false, age: 0 };
  colony.waste.push(c);
  dropLoose(c, a.x, a.y);
}

function killEnemy(e) {
  e.dead = true;
  if (e.type === 'raider') {
    if (e.load) { const b = e.load; e.load = null; dropLoose(b, e.x, e.y); }
    const c = { kind: 'corpse', caste: 'raider', room: null, lvl: 0, by: null, claim: null };   // wird zu Futter
    colony.food.push(c);
    dropLoose(c, e.x, e.y);
  } else {
    for (let n = 0; n < 10; n++) {   // eine erlegte Spinne gibt viel Futter
      const x = Math.max(2, Math.min(W - 3, Math.round(e.x) + randInt(-4, 4)));
      const f = { kind: 'meat', room: null, lvl: 0, by: null, claim: null };
      colony.food.push(f);
      dropLoose(f, x, groundTop(x) - 1);
    }
  }
}

const distTo = (a, e) => Math.hypot(a.x - e.x, (a.y - e.y) * 1.3);

// Wird jeden Schritt für jede Ameise aufgerufen. true = die Ameise kämpft gerade.
function antCombat(a, dt) {
  if (a.caste === 'queen') return false;
  if (a.foe && (a.foe.dead || distTo(a, a.foe) > (a.foe.type === 'spider' ? 5 : 3.5))) {
    a.foe = null;
    a.state = 'rest';
    a.timer = 0.2;
    return true;
  }
  if (!a.foe) {
    if (!enemies.length) { if (a.hp < a.maxHp) a.hp = Math.min(a.maxHp, a.hp + dt * 0.05); return false; }
    for (const e of enemies) {
      if (!e.dead && distTo(a, e) < (e.type === 'spider' ? 4 : 2.5)) { a.foe = e; break; }
    }
    if (!a.foe) return false;
    // Alles fallen lassen und kämpfen
    dropLoad(a);
    endJob(a);
    a.path = null;
    a.tip = null;
    a.carry = false;
    a.state = 'fight';
    a.timer = 0;
  }
  const e = a.foe;
  a.mx = e.x - a.x; a.my = e.y - a.y;
  a.walk += dt * 18;
  e.hp -= ANT_DMG[a.caste] * dt;
  if (e.hp <= 0 && !e.dead) killEnemy(e);
  return true;
}

// Soldatinnen (und nahe Arbeiterinnen) laufen zum nächsten Feind
function attackEnemy(a, range) {
  let best = null, bd = range;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = distTo(a, e);
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) return false;
  const tx = Math.round(best.x), ty = Math.round(best.y);
  const goal = bfs(idx(a.x, a.y), i => { const x = i % W, y = (i / W) | 0; return Math.abs(x - tx) <= 2 && Math.abs(y - ty) <= 2; }, N);
  if (!setPath(a, goal)) return false;
  a.state = 'attack';
  // Nicht bis ans Ende laufen: nach ein paar Schritten neu schauen, wo der Feind jetzt ist
  if (a.path.length > 12) a.path.length = 12;
  return true;
}

// ---------- Feinde bewegen ----------

function updateSpider(e, dt) {
  e.life += dt;
  if (e.state !== 'leave' && (e.life > 120 || e.hp < e.maxHp * 0.45 || (e.eaten || 0) >= ENEMY.spider.full)) e.state = 'leave';
  // beißt eine Ameise neben sich
  if (e.foe && (e.foe.dead || distTo(e.foe, e) > 4)) e.foe = null;
  if (!e.foe && e.state !== 'leave') {
    for (const a of ants) if (a.caste !== 'queen' && onSurface(a) && distTo(a, e) < 3.5) { e.foe = a; break; }
  }
  if (e.foe) {
    e.walk += dt * 6;
    e.foe.hp -= ENEMY.spider.dmg * dt;
    if (e.foe.hp <= 0) { killAnt(e.foe); e.foe = null; e.eaten = (e.eaten || 0) + 1; }
    return;
  }
  // jagt Ameisen in der Nähe, sonst streift sie herum
  if (e.state === 'come') {
    let near = null, nd = 35;
    for (const a of ants) {
      if (a.caste === 'queen' || !onSurface(a)) continue;
      const d = Math.abs(a.x - e.x);
      if (d < nd) { nd = d; near = a; }
    }
    if (near) e.targetX = near.x;
    else if (Math.abs(e.x - e.targetX) < 2) e.targetX = world.entranceX + rand(-80, 80);
  } else e.targetX = e.x < W / 2 ? -10 : W + 10;
  const dir = Math.sign(e.targetX - e.x);
  if (dir) e.face = dir;
  e.x += dir * ENEMY.spider.speed * dt;
  e.walk += ENEMY.spider.speed * dt * 0.8;
  if (e.x < 1 || e.x > W - 2) { e.gone = true; return; }
  e.y = groundTop(e.x) - 1;
}

// Ziel für die Räuber: Zellen neben freier Brut
function broodGoal() {
  const s = new Set();
  for (const b of colony.brood) {
    if (b.by) continue;
    const bx = Math.round(b.x), by = Math.round(b.y);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) s.add(idx(bx + dx, by + dy));
  }
  return s;
}

function planRaider(e) {
  const start = idx(e.x, e.y);
  let goal = -1;
  if (e.state === 'come') {
    if (e.y > world.surface[e.x] + 3) { e.state = 'raid'; return planRaider(e); }
    const ex = world.entranceX;
    goal = bfs(start, i => { const x = i % W, y = (i / W) | 0; return Math.abs(x - ex) <= 4 && y >= world.surface[x] + 6; }, N);
  } else if (e.state === 'raid') {
    const s = broodGoal();
    if (s.size) goal = bfs(start, i => s.has(i), N);
    if (goal < 0) { e.state = 'flee'; return planRaider(e); }
  } else {
    goal = bfs(start, i => { const x = i % W, y = (i / W) | 0; return (x <= 3 || x >= W - 4) && y < columnTop(x); }, N);
    if (goal < 0) { e.gone = true; return; }
  }
  if (!setPath(e, goal)) e.gone = true;
}

function raiderArrive(e) {
  e.path = null;
  if (e.state === 'raid') {
    // Brut schnappen und abhauen
    let best = null, bd = 4;
    for (const b of colony.brood) {
      if (b.by) continue;
      const d = Math.hypot(b.x - e.x, b.y - e.y);
      if (d < bd) { bd = d; best = b; }
    }
    if (best) { liftItem(best); best.by = e; e.load = best; e.state = 'flee'; }
  } else if (e.state === 'flee' && (e.x <= 3 || e.x >= W - 4)) {
    if (e.load) { removeItem(e.load); e.load = null; }   // Brut ist verloren
    e.gone = true;
  }
}

function updateRaider(e, dt) {
  if (world.cells[idx(e.x, e.y)] !== AIR) { while (e.y > 0 && world.cells[idx(e.x, e.y)] !== AIR) e.y--; e.path = null; }
  if (!isWalkable(e.x, e.y) && e.y < H - 2 && world.cells[idx(e.x, e.y + 1)] === AIR) { e.y++; e.t = 0; e.path = null; return; }
  orient(e, dt);
  // kämpfen, wenn eine Ameise daneben ist
  if (e.foe && (e.foe.dead || distTo(e.foe, e) > 3.5)) e.foe = null;
  if (!e.foe) {
    for (const a of ants) if (a.caste !== 'queen' && distTo(a, e) < 2.5) { e.foe = a; break; }
  }
  if (e.foe) {
    e.mx = e.foe.x - e.x; e.my = e.foe.y - e.y;
    e.walk += dt * 18;
    e.foe.hp -= ENEMY.raider.dmg * dt;
    if (e.foe.hp <= 0) { killAnt(e.foe); e.foe = null; }
    return;
  }
  if (!e.path) { planRaider(e); return; }
  const r = moveAlong(e, dt);
  if (r === 'blocked') e.path = null;
  else if (r === 'arrived') raiderArrive(e);
}

function updateEnemies(dt) {
  if (world.royal && ants.length >= 40) {   // erst wenn die Kolonie stark genug ist
    enemyTimer -= dt;
    if (enemyTimer <= 0) { enemyTimer = rand(500, 900); spawnEnemies(); }
  }
  for (const e of enemies) {
    if (e.type === 'spider') updateSpider(e, dt);
    else updateRaider(e, dt);
  }
  for (let k = enemies.length - 1; k >= 0; k--) {
    const e = enemies[k];
    if (e.dead || e.gone) {
      if (e.gone && e.load) { removeItem(e.load); e.load = null; }
      enemies.splice(k, 1);
    }
  }
}
