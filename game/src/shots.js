// Deterministic screenshot setups for the maker's own shots. A URL such as
// ?shot=play&seed=7 freezes the game in a lively mid-wave moment so the
// screenshot is the same every time it is taken. This is a maker tool only;
// normal play never passes ?shot=, and the game runs live instead.
//
//   ?shot=start      title screen
//   ?shot=play       mid-wave action, wave 3, combo running
//   ?shot=waveclear  wave-clear banner over a quiet arena
//   ?shot=end        game-over screen with a score
// ?seed=N reseeds the starfield and the spawn dice.

import { ENEMIES, LANTERN, PLAYER, VIEW, waveBudget } from './config.js';
import { buildWaveQueue, spawnEnemy } from './enemies.js';

export function readShotParams() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot'),
    seed: Number(q.get('seed') || 7),
  };
}

export function applyShot(world, shot, audio) {
  if (!shot) return false;
  if (shot === 'start') {
    world.state = 'title';
    return true;
  }
  if (shot === 'play') {
    world.start();
    world.wave = 3;
    world.score = 1250;
    world.combo = 9;
    world.multiplier = 3;
    world.comboTimer = 2.0;
    world.flames = 4;
    world.power.spread = 7;
    world.spawnQueue = ['wisp', 'darter', 'splitter', 'brute', 'wisp'];
    const spots = [
      ['wisp', 150, 120], ['darter', 820, 140], ['splitter', 700, 470],
      ['brute', 240, 430], ['wisp', 480, 90], ['darter', 120, 330],
      ['wisp', 860, 380],
    ];
    for (const [kind, x, y] of spots) {
      const e = spawnEnemy(world.rng, kind, 3);
      e.x = x;
      e.y = y;
      world.enemies.push(e);
    }
    world.player.x = 430;
    world.player.y = 430;
    world.bullets.push(
      { x: 470, y: 410, vx: 380, vy: -380, radius: PLAYER.bulletRadius, life: 1 },
      { x: 450, y: 400, vx: 540, vy: -120, radius: PLAYER.bulletRadius, life: 1 },
      { x: 460, y: 425, vx: 300, vy: -450, radius: PLAYER.bulletRadius, life: 1 },
    );
    world.fx.burst(620, 200, ENEMIES.wisp.color, 10, 120);
    world.fx.floater(620, 180, '+30', '#ffe9a8');
    world.powerups.push({
      type: 'rapid', x: 620, y: 480, vx: 0, vy: 0, life: 8, bob: 0,
    });
    world.banner = null;
    return true;
  }
  if (shot === 'waveclear') {
    world.start();
    world.wave = 4;
    world.score = 2180;
    world.flames = 5;
    world.spawnQueue = [];
    world.enemies = [];
    world.state = 'waveclear';
    world.waveclearTimer = 99;
    // Banner timer 1.5: fully faded in (the banner fades in from 2.2 and
    // out below 0.6, so a frozen 99 would render it invisible).
    world.banner = { title: 'WAVE 4 CLEARED', sub: 'Bonus +325', timer: 1.5 };
    return true;
  }
  if (shot === 'end') {
    world.start();
    world.wave = 6;
    world.score = 3420;
    world.best = 3420;
    world.waveKills = 87;
    world.shotsFired = 412;
    world.flames = 0;
    world.spawnQueue = buildWaveQueue(world.rng, 6, waveBudget(6));
    world.banner = null;
    world.state = 'gameover';
    return true;
  }
  return false;
}
