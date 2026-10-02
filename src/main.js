'use strict';

const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
const SPEEDS = [1, 2, 4, 8];
let speed = 1;
let paused = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}
window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', e => {
  if (e.code === 'Space') { paused = !paused; e.preventDefault(); }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= SPEEDS.length) speed = SPEEDS[n - 1];
  if (e.key === 'f' || e.key === 'F') {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }
});

function step(dt) {
  updatePlanner(dt);
  updateAnts(dt);
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
  const big = `${ants.length} AMEISEN · 0 BRUT · ${nestPercent()}% NEST`;
  ctx.font = `700 ${Math.round(26 * u)}px system-ui, sans-serif`;
  const w = Math.max(ctx.measureText(big).width + 40 * u, 360 * u), h = 92 * u;

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
  ctx.fillText('KOLONIE', x + 20 * u, y + 28 * u);
  ctx.textAlign = 'right';
  ctx.fillText(`Tag ${sky.day} · ${clockText()}${paused ? ' · Pause' : ''}${speed > 1 ? ' · ' + speed + '×' : ''}`,
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
  ctx.fillText('Leertaste: Pause · 1–4: Tempo · F: Vollbild', 16 * u, canvas.height - 14 * u);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!paused) for (let k = 0; k < speed; k++) step(dt);
  render(ctx, canvas.width, canvas.height);
  drawHud();
  requestAnimationFrame(frame);
}

generateWorld();
generateSky();
spawnAnts();
requestAnimationFrame(frame);

// Für Tests in der Konsole
window.sim = { world, ants, sky, step, render: () => render(ctx, canvas.width, canvas.height) };
