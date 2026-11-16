// Enemies: what they are, how they spawn, and how they move. Every enemy
// wants the lantern at the centre of the arena; a darter zigzags on its way
// in, a splitter bursts into two wisps when it dies, a brute just keeps
// coming. Movement is pure pursuit plus a per-enemy wobble phase.

import { ENEMIES, LANTERN, VIEW, kindsForWave } from './config.js';
import { pick, range } from './random.js';

export function spawnEnemy(rng, kind, wave) {
  const def = ENEMIES[kind];
  const side = Math.floor(rng() * 4);
  let x;
  let y;
  const m = 24;
  if (side === 0) { x = range(rng, m, VIEW.width - m); y = -m; }
  else if (side === 1) { x = VIEW.width + m; y = range(rng, m, VIEW.height - m); }
  else if (side === 2) { x = range(rng, m, VIEW.width - m); y = VIEW.height + m; }
  else { x = -m; y = range(rng, m, VIEW.height - m); }
  const speedScale = 1 + Math.min(0.6, (wave - 1) * 0.05);
  return {
    kind,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed * speedScale * range(rng, 0.9, 1.1),
    radius: def.radius,
    score: def.score,
    color: def.color,
    wobble: range(rng, 0, Math.PI * 2),
    wobbleSpeed: range(rng, 1.5, 3),
    flash: 0, // hit flash timer, seconds
  };
}

// Build the spawn queue for a wave: spend the wave's budget on kinds it
// allows, shuffled so the wave never arrives in a tidy line.
export function buildWaveQueue(rng, wave, budget) {
  const kinds = kindsForWave(wave);
  const queue = [];
  let left = budget;
  while (left > 0) {
    const affordable = kinds.filter((k) => ENEMIES[k].cost <= left);
    const kind = pick(rng, affordable);
    queue.push(kind);
    left -= ENEMIES[kind].cost;
  }
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

export function updateEnemy(enemy, dt, time) {
  const dx = LANTERN.x - enemy.x;
  const dy = LANTERN.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  let vx = (dx / dist) * enemy.speed;
  let vy = (dy / dist) * enemy.speed;
  if (enemy.kind === 'darter') {
    // Zigzag: a perpendicular sine wave on top of the pursuit.
    const px = -dy / dist;
    const py = dx / dist;
    const sway = Math.sin(time * enemy.wobbleSpeed + enemy.wobble) * 70;
    vx += px * sway;
    vy += py * sway;
  }
  enemy.x += vx * dt;
  enemy.y += vy * dt;
  enemy.wobble += dt;
  if (enemy.flash > 0) enemy.flash -= dt;
}

export function reachesLantern(enemy) {
  const dx = LANTERN.x - enemy.x;
  const dy = LANTERN.y - enemy.y;
  return Math.hypot(dx, dy) < LANTERN.radius + enemy.radius * 0.6;
}
