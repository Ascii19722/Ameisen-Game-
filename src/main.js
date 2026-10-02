'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const SPEEDS = [1, 2, 4, 8, 16];
let speed = 1;
let paused = false;
const cam = { x: 0, y: 0, zoom: 1 };   // Kamera: Mittelpunkt in Welt-Pixeln und Zoom

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  if (world.dug !== undefined && cam.zoom) clampCam();
}
window.addEventListener('resize', resize);
resize();

// ---------- Kamera: zoomen und verschieben ----------
const keys = new Set();
function minZoom() { return Math.min(canvas.width / W, canvas.height / H); }   // ganze Welt sichtbar
function maxZoom() { return canvas.height / 40; }                              // ganz nah dran
function clampCam() {
  cam.zoom = Math.max(minZoom(), Math.min(maxZoom(), cam.zoom));
  const hw = canvas.width / 2 / cam.zoom, hh = canvas.height / 2 / cam.zoom;
  cam.x = hw * 2 >= W ? W / 2 : Math.max(hw, Math.min(W - hw, cam.x));
  cam.y = hh * 2 >= H ? H / 2 : Math.max(hh, Math.min(H - hh, cam.y));
}
function resetCam() {
  cam.zoom = canvas.width / 320;           // Start: Ausschnitt wie früher, Eingang und Nest im Blick
  cam.x = world.entranceX;
  cam.y = SURFACE_Y + 30;
  clampCam();
}
// Zoomen um einen Bildschirmpunkt: die Stelle unter der Maus bleibt stehen
function zoomAt(factor, sx, sy) {
  const wx = cam.x + (sx - canvas.width / 2) / cam.zoom, wy = cam.y + (sy - canvas.height / 2) / cam.zoom;
  cam.zoom *= factor;
  clampCam();
  cam.x = wx - (sx - canvas.width / 2) / cam.zoom;
  cam.y = wy - (sy - canvas.height / 2) / cam.zoom;
  clampCam();
}
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const dpr = window.devicePixelRatio || 1;
  zoomAt(Math.pow(1.0015, -e.deltaY), e.offsetX * dpr, e.offsetY * dpr);
}, { passive: false });
let drag = null;
canvas.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.style.cursor = 'grabbing'; });
window.addEventListener('mouseup', () => { drag = null; canvas.style.cursor = 'grab'; });
window.addEventListener('mousemove', e => {
  if (!drag) return;
  const dpr = window.devicePixelRatio || 1;
  cam.x -= (e.clientX - drag.x) * dpr / cam.zoom;
  cam.y -= (e.clientY - drag.y) * dpr / cam.zoom;
  drag = { x: e.clientX, y: e.clientY };
  clampCam();
});
canvas.style.cursor = 'grab';

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { paused = !paused; e.preventDefault(); }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= SPEEDS.length) speed = SPEEDS[n - 1];
  if (e.key === 'f' || e.key === 'F') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }
  if (e.key === '+' || e.key === '=') zoomAt(1.25, canvas.width / 2, canvas.height / 2);
  if (e.key === '-') zoomAt(0.8, canvas.width / 2, canvas.height / 2);
  if (e.key === '0') resetCam();
  if (e.key === 'n' || e.key === 'N') askNewColony();
  keys.add(e.key.toLowerCase());
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

function moveCam(dt) {
  const v = 500 / cam.zoom * dt * (canvas.width / 1920);
  if (keys.has('arrowleft') || keys.has('a')) cam.x -= v * 3;
  if (keys.has('arrowright') || keys.has('d')) cam.x += v * 3;
  if (keys.has('arrowup') || keys.has('w')) cam.y -= v * 3;
  if (keys.has('arrowdown') || keys.has('s')) cam.y += v * 3;
  clampCam();
}

function step(dt) {
  updatePlan(dt);
  updateAnts(dt);
  updateColony(dt);
  updateEnemies(dt);
  updateSky(dt);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Anzeige oben links im Stil des Vorbilds: helle Karte mit Kolonie-Werten und Nest-Balken
function drawHud() {
  const u = canvas.height / 1080;   // Maßstab: bei Full-HD 1
  const x = Math.round(24 * u), y = Math.round(24 * u);
  const big = `${ants.length} AMEISEN · ${broodCount()} BRUT · ${foodCount()} FUTTER`;
  ctx.font = `700 ${Math.round(26 * u)}px system-ui, sans-serif`;
  const nS = ants.filter(a => a.caste === 'soldier').length, nP = ants.filter(a => a.caste === 'nurse').length;
  const small = `KOLONIE · ${nS} SOLDATINNEN · ${nP} PFLEGERINNEN${enemies.length ? ' · ANGRIFF!' : ''}`;
  const clock = `Tag ${sky.day} · ${clockText()}${paused ? ' · Pause' : ''}${speed > 1 ? ' · ' + speed + '×' : ''}`;
  const bigW = ctx.measureText(big).width;
  ctx.font = `600 ${Math.round(15 * u)}px system-ui, sans-serif`;
  const smallW = ctx.measureText(small + '    ' + clock).width;
  const w = Math.max(bigW, smallW) + 40 * u, h = 92 * u;

  ctx.fillStyle = 'rgba(240, 233, 220, 0.94)';
  roundRect(x, y, w, h, 10 * u);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120, 100, 80, 0.35)';
  ctx.lineWidth = 2 * u;
  ctx.stroke();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#7a6a5a';
  ctx.font = `600 ${Math.round(15 * u)}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(small, x + 20 * u, y + 28 * u);
  ctx.textAlign = 'right';
  ctx.fillText(clock,
    x + w - 20 * u, y + 28 * u);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#3e3128';
  ctx.font = `700 ${Math.round(26 * u)}px system-ui, sans-serif`;
  ctx.fillText(big, x + 20 * u, y + 62 * u);

  // Nest-Balken
  const bx = x + 20 * u, by = y + 74 * u, bw = w - 40 * u, bh = 4 * u;
  ctx.fillStyle = 'rgba(120, 100, 80, 0.25)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = '#b5704a';
  ctx.fillRect(bx, by, bw * nestPercent() / 100, bh);

  // Tastenhilfe klein unten links
  ctx.font = `${Math.round(13 * u)}px system-ui, sans-serif`;
  ctx.fillStyle = 'rgba(60, 45, 35, 0.6)';
  ctx.fillText('Mausrad/+−: Zoom · Ziehen/Pfeile/WASD: verschieben · 0: zurück · N: neue Kolonie · Leertaste: Pause · 1–5: Tempo · F: Vollbild',
    16 * u, canvas.height - 14 * u);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) for (let k = 0; k < speed; k++) step(dt);
  moveCam(dt);
  render(ctx, canvas.width, canvas.height, cam);
  drawHud();
  updateTempoButtons();
  requestAnimationFrame(frame);
}

// Neue Kolonie nur nach Rückfrage – das alte Nest ist danach weg
function askNewColony() {
  if (!confirm('Neue Kolonie starten? Das jetzige Nest geht dabei verloren.')) return;
  newColony();
  resetCam();
}
// Zeitknöpfe: Pause und Tempo; der aktive Knopf ist hervorgehoben
const tempoButtons = document.querySelectorAll('#tempo button');
tempoButtons.forEach(b => b.addEventListener('click', () => {
  const v = +b.dataset.s;
  if (v === 0) paused = !paused;
  else { speed = v; paused = false; }
  b.blur();
}));
function updateTempoButtons() {
  tempoButtons.forEach(b => {
    const v = +b.dataset.s;
    b.classList.toggle('an', v === 0 ? paused : !paused && v === speed);
  });
}

document.getElementById('neu').addEventListener('click', e => { e.currentTarget.blur(); askNewColony(); });

// Start: gespeicherte Kolonie laden, sonst eine neue gründen
generateWorld();
resetColony();
generateSky();
spawnAnts();
loadGame();
resetCam();
setInterval(saveGame, 20000);
window.addEventListener('beforeunload', saveGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
requestAnimationFrame(frame);

// Für Tests in der Konsole
window.sim = { world, ants, colony, saveGame, loadGame, newColony, sky, cam, step, render: () => render(ctx, canvas.width, canvas.height, cam), zoomAt, resetCam };
