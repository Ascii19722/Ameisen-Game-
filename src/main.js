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
  updatePlanner();
  updateAnts(dt);
}

function drawHud() {
  const dpr = window.devicePixelRatio || 1;
  ctx.font = `${Math.round(13 * dpr)}px monospace`;
  ctx.fillStyle = 'rgba(255, 245, 230, 0.75)';
  const text = `Ameisen ${ants.length} · gegraben ${world.dug} · Tempo ${speed}×` +
    (paused ? ' · PAUSE' : '') + '   (Leertaste: Pause · 1–4: Tempo · F: Vollbild)';
  ctx.fillText(text, 10 * dpr, canvas.height - 10 * dpr);
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
spawnAnts();
requestAnimationFrame(frame);

// Für Tests in der Konsole
window.sim = { world, ants, step, render: () => render(ctx, canvas.width, canvas.height) };
