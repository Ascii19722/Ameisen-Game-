'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const SPEEDS = [1, 2, 4, 8, 16];
let speed = 1;
let paused = false;
const cam = { x: 0, y: 0, zoom: 1 };   // Kamera: Mittelpunkt in Welt-Pixeln und Zoom

// Bildschirm-Pixel pro CSS-Pixel. Höchstens so viele Pixel wie bei Full-HD: Bei 4K-Bildschirmen müsste
// sonst die vierfache Fläche gezeichnet werden (das Bild wird dann ohne Glättung hochskaliert).
let pxScale = 1;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  pxScale = Math.min(dpr, Math.sqrt(1920 * 1080 / (window.innerWidth * window.innerHeight)));
  canvas.width = Math.round(window.innerWidth * pxScale);
  canvas.height = Math.round(window.innerHeight * pxScale);
  clampCam();
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
  zoomAt(Math.pow(1.0015, -e.deltaY), e.offsetX * pxScale, e.offsetY * pxScale);
}, { passive: false });
let drag = null;
canvas.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.style.cursor = 'grabbing'; });
window.addEventListener('mouseup', () => { drag = null; canvas.style.cursor = 'grab'; });
window.addEventListener('mousemove', e => {
  if (!drag) return;
  cam.x -= (e.clientX - drag.x) * pxScale / cam.zoom;
  cam.y -= (e.clientY - drag.y) * pxScale / cam.zoom;
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
  if (e.key === 'i' || e.key === 'I') perf.show = !perf.show;
  keys.add(e.key.toLowerCase());
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

function moveCam(dt) {
  const v = 1500 / cam.zoom * dt * (canvas.width / 1920);
  if (keys.has('arrowleft') || keys.has('a')) cam.x -= v;
  if (keys.has('arrowright') || keys.has('d')) cam.x += v;
  if (keys.has('arrowup') || keys.has('w')) cam.y -= v;
  if (keys.has('arrowdown') || keys.has('s')) cam.y += v;
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
  ctx.fillText(clock, x + w - 20 * u, y + 28 * u);

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
  ctx.fillText('Mausrad/+−: Zoom · Ziehen/Pfeile/WASD: verschieben · 0: zurück · N: neue Kolonie · Leertaste: Pause · 1–5: Tempo · F: Vollbild · I: Leistung',
    16 * u, canvas.height - 14 * u);
}

// Leistungsanzeige (Taste I): Bilder pro Sekunde und wie lange Rechnen und Zeichnen dauern
const perf = { show: false, fps: 60, sim: 0, draw: 0 };
function drawPerf() {
  const u = canvas.height / 1080;
  const text = `${Math.round(perf.fps)} Bilder/s · Rechnen ${perf.sim.toFixed(1)} ms · Zeichnen ${perf.draw.toFixed(1)} ms · ${ants.length} Ameisen`;
  ctx.font = `600 ${Math.round(15 * u)}px system-ui, sans-serif`;
  const w = ctx.measureText(text).width + 24 * u;
  ctx.fillStyle = 'rgba(240, 233, 220, 0.94)';
  roundRect(canvas.width - w - 24 * u, canvas.height - 56 * u, w, 30 * u, 8 * u);
  ctx.fill();
  ctx.fillStyle = '#3e3128';
  ctx.textAlign = 'left';
  ctx.fillText(text, canvas.width - w - 12 * u, canvas.height - 36 * u);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  perf.fps += ((now - last > 0 ? 1000 / (now - last) : 60) - perf.fps) * 0.05;
  last = now;
  // Zeitraffer: bis 16 Rechenschritte pro Bild, darüber werden die Schritte größer (sonst ruckelt es)
  const t0 = performance.now();
  if (!paused) {
    const n = Math.min(speed, 16), sub = dt * speed / n;
    for (let k = 0; k < n; k++) step(sub);
  }
  const t1 = performance.now();
  moveCam(dt);
  render(ctx, canvas.width, canvas.height, cam);
  drawHud();
  if (perf.show) drawPerf();
  updateTempoButtons();
  const t2 = performance.now();
  perf.sim += (t1 - t0 - perf.sim) * 0.05;
  perf.draw += (t2 - t1 - perf.draw) * 0.05;
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
// Schieber für den Zeitraffer (1× bis 100×)
const warp = document.getElementById('warp'), warpText = document.getElementById('warpText');
warp.addEventListener('input', () => { speed = +warp.value; paused = false; });
warp.addEventListener('change', () => warp.blur());
function updateTempoButtons() {
  tempoButtons.forEach(b => {
    const v = +b.dataset.s;
    b.classList.toggle('an', v === 0 ? paused : !paused && v === speed);
  });
  if (+warp.value !== speed) warp.value = speed;
  warpText.textContent = speed + '×';
}

// Bau-Editor: erst speichern, dann wechseln (von dort geht es mit „Zurück zum Spiel“ wieder hierher)
document.getElementById('editor').addEventListener('click', () => { saveGame(); location.href = 'tools/bau-editor.html'; });
document.getElementById('bilder').addEventListener('click', () => { saveGame(); location.href = 'tools/bilder-pruefer.html'; });

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
