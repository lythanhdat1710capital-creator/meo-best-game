// The game itself: states, waves, bullets, collisions, scoring, combo and
// power-ups. The world owns the rules; render.js only draws what is here.
//
// States: 'title' -> 'playing' -> 'waveclear' -> 'playing' ... -> 'gameover'.
// The lantern has flames; an enemy that reaches it burns one. The player is
// a wisp that flies anywhere in the arena and shoots bolts of light at the
// mouse. Kills build a combo multiplier; a wave cleared pays a bonus.

import {
  COMBO_MAX, COMBO_STEP, COMBO_WINDOW, ENEMIES, LANTERN, PLAYER,
  POWERUPS, VIEW, kindsForWave, spawnInterval, waveBudget,
} from './config.js';
import { buildWaveQueue, reachesLantern, spawnEnemy, updateEnemy } from './enemies.js';
import { chance, makeRng, pick, range } from './random.js';
import { createFx } from './particles.js';

const BEST_KEY = 'lanternkeeper-best';

export function createWorld(rngSeed) {
  const rng = makeRng(rngSeed);
  const world = {
    state: 'title',
    time: 0,
    rng,
    fx: createFx(),
    player: { x: VIEW.width / 2, y: VIEW.height - 110, fireTimer: 0 },
    bullets: [],
    enemies: [],
    powerups: [],
    wave: 0,
    spawnQueue: [],
    spawnTimer: 0,
    score: 0,
    best: Number(localStorage.getItem(BEST_KEY) || 0),
    flames: LANTERN.flames,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    power: { spread: 0, rapid: 0, shield: 0 },
    banner: null, // { title, sub, timer }
    waveKills: 0,
    shotsFired: 0,
    stars: [],

    start() {
      this.state = 'playing';
      this.score = 0;
      this.flames = LANTERN.flames;
      this.combo = 0;
      this.multiplier = 1;
      this.comboTimer = 0;
      this.bullets = [];
      this.enemies = [];
      this.powerups = [];
      this.power = { spread: 0, rapid: 0, shield: 0 };
      this.wave = 0;
      this.waveKills = 0;
      this.shotsFired = 0;
      this.nextWave();
    },

    nextWave() {
      this.wave += 1;
      this.spawnQueue = buildWaveQueue(this.rng, this.wave, waveBudget(this.wave));
      this.spawnTimer = 0.8;
      this.banner = {
        title: `WAVE ${this.wave}`,
        sub: this.wave === 1 ? 'They come for the light.' : pick(this.rng, [
          'Hold the line.',
          'They grow bolder.',
          'The dark thickens.',
          'Keep the flame alive.',
        ]),
        timer: 1.6,
      };
    },

    update(dt, input, audio) {
      this.time += dt;
      this.fx.update(dt);
      if (this.banner) {
        this.banner.timer -= dt;
        if (this.banner.timer <= 0) this.banner = null;
      }
      if (this.state === 'waveclear') {
        this.waveclearTimer -= dt;
        if (this.waveclearTimer <= 0) {
          this.state = 'playing';
          this.nextWave();
        }
        return;
      }
      if (this.state !== 'playing') return;

      // Combo decay.
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) {
          this.combo = 0;
          this.multiplier = 1;
        }
      }
      for (const key of ['spread', 'rapid', 'shield']) {
        if (this.power[key] > 0) this.power[key] -= dt;
      }

      this.updatePlayer(dt, input, audio);
      this.updateSpawns(dt);
      this.updateBullets(dt, audio);
      this.updateEnemies(dt, audio);
      this.updatePowerups(dt, audio);

      if (this.state === 'playing' && this.spawnQueue.length === 0 && this.enemies.length === 0) {
        this.clearWave(audio);
      }
    },

    updatePlayer(dt, input, audio) {
      const p = this.player;
      const mx = input.axisX();
      const my = input.axisY();
      const len = Math.hypot(mx, my);
      if (len > 0) {
        p.x = Math.max(18, Math.min(VIEW.width - 18, p.x + (mx / len) * PLAYER.speed * dt));
        p.y = Math.max(18, Math.min(VIEW.height - 18, p.y + (my / len) * PLAYER.speed * dt));
      }
      p.fireTimer -= dt;
      const interval = PLAYER.fireInterval * (this.power.rapid > 0 ? 0.5 : 1);
      if (input.firing() && p.fireTimer <= 0) {
        p.fireTimer = interval;
        this.fire(input, audio);
      }
    },

    fire(input, audio) {
      const p = this.player;
      const dx = input.mouseX - p.x;
      const dy = input.mouseY - p.y;
      const aim = Math.atan2(dy, dx);
      const angles = this.power.spread > 0 ? [-0.22, 0, 0.22] : [0];
      for (const off of angles) {
        const a = aim + off;
        this.bullets.push({
          x: p.x + Math.cos(a) * 16,
          y: p.y + Math.sin(a) * 16,
          vx: Math.cos(a) * PLAYER.bulletSpeed,
          vy: Math.sin(a) * PLAYER.bulletSpeed,
          radius: PLAYER.bulletRadius,
          life: 1.4,
        });
      }
      this.shotsFired += 1;
      audio.shoot();
    },

    updateSpawns(dt) {
      if (this.spawnQueue.length === 0) return;
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = spawnInterval(this.wave);
        const kind = this.spawnQueue.shift();
        this.enemies.push(spawnEnemy(this.rng, kind, this.wave));
      }
    },

    updateBullets(dt, audio) {
      for (const b of this.bullets) {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
      }
      this.bullets = this.bullets.filter(
        (b) => b.life > 0 && b.x > -20 && b.x < VIEW.width + 20 && b.y > -20 && b.y < VIEW.height + 20,
      );
      // Bullet vs enemy.
      for (const b of this.bullets) {
        for (const e of this.enemies) {
          if (e.hp <= 0) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < e.radius + b.radius) {
            b.life = 0;
            e.hp -= 1;
            e.flash = 0.12;
            this.fx.burst(b.x, b.y, '#ffe9a8', 4, 90);
            if (e.hp <= 0) this.killEnemy(e, audio);
            break;
          }
        }
      }
      this.bullets = this.bullets.filter((b) => b.life > 0);
      this.enemies = this.enemies.filter((e) => e.hp > 0);
    },

    killEnemy(enemy, audio) {
      const mult = this.multiplier;
      this.score += enemy.score * mult;
      this.waveKills += 1;
      this.combo += 1;
      this.comboTimer = COMBO_WINDOW;
      this.multiplier = Math.min(COMBO_MAX, 1 + Math.floor(this.combo / COMBO_STEP));
      this.fx.burst(enemy.x, enemy.y, enemy.color, 14, 170);
      this.fx.ring(enemy.x, enemy.y, enemy.color);
      this.fx.floater(enemy.x, enemy.y - 10, `+${enemy.score * mult}`, '#ffe9a8');
      audio.kill(this.combo);
      if (enemy.kind === 'splitter') {
        for (let i = 0; i < 2; i++) {
          const child = spawnEnemy(this.rng, 'wisp', this.wave);
          child.x = enemy.x + range(this.rng, -14, 14);
          child.y = enemy.y + range(this.rng, -14, 14);
          child.speed *= 1.25;
          this.enemies.push(child);
        }
      }
      if (chance(this.rng, 0.12)) this.dropPowerup(enemy.x, enemy.y);
    },

    dropPowerup(x, y) {
      const types = ['spread', 'rapid', 'shield', 'flame'];
      const weights = [0.3, 0.3, 0.25, 0.15];
      let roll = this.rng();
      let type = 'spread';
      for (let i = 0; i < types.length; i++) {
        if (roll < weights[i]) { type = types[i]; break; }
        roll -= weights[i];
      }
      if (type === 'flame' && this.flames >= LANTERN.flames) type = 'spread';
      this.powerups.push({
        type,
        x,
        y,
        vx: range(this.rng, -12, 12),
        vy: range(this.rng, -12, 12),
        life: 9,
        bob: range(this.rng, 0, Math.PI * 2),
      });
    },

    updateEnemies(dt, audio) {
      for (const e of this.enemies) updateEnemy(e, dt, this.time);
      const p = this.player;
      for (const e of this.enemies) {
        if (e.hp <= 0) continue;
        // Body-block: the wisp purifies an enemy it touches, for half points.
        const pd = Math.hypot(e.x - p.x, e.y - p.y);
        if (pd < e.radius + PLAYER.radius) {
          e.hp = 0;
          const gained = Math.max(1, Math.floor((e.score * this.multiplier) / 2));
          this.score += gained;
          this.fx.burst(e.x, e.y, '#ffffff', 10, 140);
          this.fx.floater(e.x, e.y - 10, `+${gained}`, '#ffffff');
          audio.kill(0);
          if (e.kind === 'splitter') {
            for (let i = 0; i < 2; i++) {
              const child = spawnEnemy(this.rng, 'wisp', this.wave);
              child.x = e.x + range(this.rng, -14, 14);
              child.y = e.y + range(this.rng, -14, 14);
              this.enemies.push(child);
            }
          }
          continue;
        }
        if (reachesLantern(e)) {
          e.hp = 0;
          if (this.power.shield > 0) {
            this.fx.burst(LANTERN.x, LANTERN.y, '#9dff8a', 16, 180);
            this.fx.floater(LANTERN.x, LANTERN.y - 40, 'SHIELD HELD', '#9dff8a');
          } else {
            this.flames -= 1;
            this.combo = 0;
            this.multiplier = 1;
            this.comboTimer = 0;
            this.fx.burst(LANTERN.x, LANTERN.y, '#ff6b6b', 22, 220);
            this.fx.addShake(9);
            audio.hurt();
            if (this.flames <= 0) {
              this.gameOver(audio);
              return;
            }
          }
        }
      }
      this.enemies = this.enemies.filter((e) => e.hp > 0);
    },

    updatePowerups(dt, audio) {
      const p = this.player;
      for (const pu of this.powerups) {
        pu.life -= dt;
        pu.bob += dt * 3;
        // Drift toward the player when close: a small magnet.
        const dx = p.x - pu.x;
        const dy = p.y - pu.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 110) {
          pu.vx += (dx / d) * 260 * dt;
          pu.vy += (dy / d) * 260 * dt;
        }
        pu.x += pu.vx * dt;
        pu.y += pu.vy * dt;
        pu.vx *= 0.96;
        pu.vy *= 0.96;
        if (d < 28) {
          pu.life = 0;
          this.applyPowerup(pu.type, audio);
        }
      }
      this.powerups = this.powerups.filter((pu) => pu.life > 0);
    },

    applyPowerup(type, audio) {
      if (type === 'flame') {
        this.flames = Math.min(LANTERN.flames, this.flames + 1);
        this.fx.floater(this.player.x, this.player.y - 20, '+1 FLAME', '#ff9d5c');
      } else {
        this.power[type] = POWERUPS[type].duration;
        this.fx.floater(this.player.x, this.player.y - 20, POWERUPS[type].label, POWERUPS[type].color);
      }
      this.fx.ring(this.player.x, this.player.y, POWERUPS[type].color);
      audio.pickup();
    },

    clearWave(audio) {
      const bonus = 50 * this.wave + this.flames * 25;
      this.score += bonus;
      this.banner = { title: `WAVE ${this.wave} CLEARED`, sub: `Bonus +${bonus}`, timer: 2.2 };
      audio.waveClear();
      this.state = 'waveclear';
      this.waveclearTimer = 1.4;
    },

    gameOver(audio) {
      this.state = 'gameover';
      this.banner = null;
      this.fx.burst(LANTERN.x, LANTERN.y, '#ffd166', 40, 260);
      this.fx.addShake(12);
      if (this.score > this.best) {
        this.best = this.score;
        localStorage.setItem(BEST_KEY, String(this.best));
      }
      audio.gameOver();
    },
  };

  // Precompute a still starfield so the sky does not shimmer every frame.
  for (let i = 0; i < 90; i++) {
    world.stars.push({
      x: range(rng, 0, VIEW.width),
      y: range(rng, 0, VIEW.height * 0.62),
      r: range(rng, 0.5, 1.8),
      phase: range(rng, 0, Math.PI * 2),
      speed: range(rng, 0.4, 1.4),
    });
  }
  return world;
}
