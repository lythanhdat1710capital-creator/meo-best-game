// Everything the player sees, drawn on one canvas: the night sky, the
// lantern and its glow, the wisp, the shadow enemies, bullets, particles,
// the HUD, and the title / wave-clear / game-over screens. No DOM, no
// images: every shape is drawn from the palette in config.js.

import { LANTERN, PALETTE, POWERUPS, VIEW } from './config.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const renderer = {
    draw(world, input) {
      const off = world.fx.offset();
      ctx.save();
      ctx.translate(off.x, off.y);
      this.drawSky(world);
      this.drawLantern(world);
      this.drawPowerups(world);
      this.drawEnemies(world);
      this.drawBullets(world);
      this.drawPlayer(world, input);
      this.drawFx(world);
      ctx.restore();
      this.drawHud(world);
      if (world.state === 'title') this.drawTitle(world);
      if (world.state === 'gameover') this.drawGameOver(world);
      if (world.banner) this.drawBanner(world);
    },

    drawSky(world) {
      const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
      g.addColorStop(0, PALETTE.skyTop);
      g.addColorStop(1, PALETTE.skyBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      // Stars.
      for (const s of world.stars) {
        const a = 0.35 + 0.3 * Math.sin(world.time * s.speed + s.phase);
        ctx.globalAlpha = Math.max(0.08, a);
        ctx.fillStyle = '#cfd4ff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Moon.
      ctx.fillStyle = '#f4ead0';
      ctx.beginPath();
      ctx.arc(846, 78, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.skyTop;
      ctx.beginPath();
      ctx.arc(856, 70, 26, 0, Math.PI * 2);
      ctx.fill();
      // Hills.
      ctx.fillStyle = PALETTE.hillFar;
      ctx.beginPath();
      ctx.moveTo(0, 520);
      ctx.quadraticCurveTo(180, 452, 360, 508);
      ctx.quadraticCurveTo(560, 556, 760, 496);
      ctx.quadraticCurveTo(880, 468, 960, 500);
      ctx.lineTo(960, 600);
      ctx.lineTo(0, 600);
      ctx.fill();
      ctx.fillStyle = PALETTE.hillNear;
      ctx.beginPath();
      ctx.moveTo(0, 566);
      ctx.quadraticCurveTo(240, 520, 480, 560);
      ctx.quadraticCurveTo(720, 596, 960, 552);
      ctx.lineTo(960, 600);
      ctx.lineTo(0, 600);
      ctx.fill();
      // Lantern light wash over the ground.
      const wash = ctx.createRadialGradient(
        LANTERN.x, LANTERN.y, 10, LANTERN.x, LANTERN.y, LANTERN.glowRadius,
      );
      wash.addColorStop(0, 'rgba(255, 209, 102, 0.16)');
      wash.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    },

    drawLantern(world) {
      const flicker = 1 + Math.sin(world.time * 7) * 0.06 + Math.sin(world.time * 13.7) * 0.04;
      const shielded = world.power.shield > 0;
      // Outer glow.
      const glow = ctx.createRadialGradient(
        LANTERN.x, LANTERN.y, 6, LANTERN.x, LANTERN.y, 110 * flicker,
      );
      glow.addColorStop(0, shielded ? 'rgba(157, 255, 138, 0.35)' : 'rgba(255, 209, 102, 0.4)');
      glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(LANTERN.x, LANTERN.y, 110 * flicker, 0, Math.PI * 2);
      ctx.fill();
      // Stone base.
      ctx.fillStyle = '#3a3550';
      ctx.beginPath();
      ctx.ellipse(LANTERN.x, LANTERN.y + 30, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(LANTERN.x - 22, LANTERN.y + 12, 44, 18);
      // Glass.
      ctx.fillStyle = 'rgba(255, 233, 168, 0.9)';
      ctx.beginPath();
      ctx.ellipse(LANTERN.x, LANTERN.y - 2, 20, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      // Flame.
      const flameH = 20 * flicker;
      ctx.fillStyle = '#ff9d5c';
      ctx.beginPath();
      ctx.moveTo(LANTERN.x, LANTERN.y - 8 - flameH);
      ctx.quadraticCurveTo(LANTERN.x + 9, LANTERN.y - 6, LANTERN.x + 5, LANTERN.y + 6);
      ctx.quadraticCurveTo(LANTERN.x, LANTERN.y + 12, LANTERN.x - 5, LANTERN.y + 6);
      ctx.quadraticCurveTo(LANTERN.x - 9, LANTERN.y - 6, LANTERN.x, LANTERN.y - 8 - flameH);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.ellipse(LANTERN.x, LANTERN.y + 2, 4, 7 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cap and handle.
      ctx.fillStyle = '#2c2844';
      ctx.fillRect(LANTERN.x - 24, LANTERN.y - 30, 48, 7);
      ctx.strokeStyle = '#2c2844';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(LANTERN.x, LANTERN.y - 30, 12, Math.PI, 0);
      ctx.stroke();
      if (shielded) {
        ctx.strokeStyle = 'rgba(157, 255, 138, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(LANTERN.x, LANTERN.y, LANTERN.radius + 14, 0, Math.PI * 2);
        ctx.stroke();
      }
    },

    drawPlayer(world, input) {
      const p = world.player;
      if (world.state === 'gameover') return;
      const aim = Math.atan2(input.mouseY - p.y, input.mouseX - p.x);
      // Trail glow.
      const glow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34);
      glow.addColorStop(0, 'rgba(255, 255, 240, 0.55)');
      glow.addColorStop(1, 'rgba(255, 255, 240, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 34, 0, Math.PI * 2);
      ctx.fill();
      // Aim tick.
      ctx.strokeStyle = 'rgba(255, 233, 168, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(aim) * 16, p.y + Math.sin(aim) * 16);
      ctx.lineTo(p.x + Math.cos(aim) * 24, p.y + Math.sin(aim) * 24);
      ctx.stroke();
      // Wisp body.
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();
      // Eyes looking toward the aim.
      ctx.fillStyle = '#1a1636';
      const ex = Math.cos(aim) * 3;
      const ey = Math.sin(aim) * 3;
      ctx.beginPath();
      ctx.arc(p.x - 4 + ex, p.y - 2 + ey, 2.2, 0, Math.PI * 2);
      ctx.arc(p.x + 4 + ex, p.y - 2 + ey, 2.2, 0, Math.PI * 2);
      ctx.fill();
    },

    drawEnemies(world) {
      for (const e of world.enemies) {
        const wob = Math.sin(e.wobble * 2.2) * 0.12;
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.scale(1 + wob, 1 - wob);
        // Shadow body.
        ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#241f3d';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        // Eyes, glowing toward the lantern.
        const ang = Math.atan2(LANTERN.y - e.y, LANTERN.x - e.x);
        const ex = Math.cos(ang) * 3;
        const ey = Math.sin(ang) * 3;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(-4 + ex, -2 + ey, 2.4, 0, Math.PI * 2);
        ctx.arc(4 + ex, -2 + ey, 2.4, 0, Math.PI * 2);
        ctx.fill();
        // Brutes wear their health as a ring.
        if (e.maxHp > 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, e.radius + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * e.hp) / e.maxHp);
          ctx.stroke();
        }
        ctx.restore();
      }
    },

    drawBullets(world) {
      for (const b of world.bullets) {
        ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
        ctx.beginPath();
        ctx.arc(b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.radius + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffe9a8';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    drawPowerups(world) {
      for (const pu of world.powerups) {
        const bobY = Math.sin(pu.bob) * 4;
        const def = POWERUPS[pu.type];
        const blink = pu.life < 3 ? (Math.sin(world.time * 12) > 0 ? 1 : 0.35) : 1;
        ctx.globalAlpha = blink;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(pu.x, pu.y + bobY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = def.color;
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const glyph = { spread: '✦', rapid: '≫', shield: '⛨', flame: '🔥' }[pu.type];
        ctx.fillText(glyph, pu.x, pu.y + bobY + 0.5);
        ctx.globalAlpha = 1;
      }
    },

    drawFx(world) {
      for (const p of world.fx.particles) {
        const a = Math.max(0, p.life / p.maxLife);
        if (p.ring) {
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = a;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 6 + (1 - a) * 26, 0, Math.PI * 2);
          ctx.stroke();
          continue;
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      for (const f of world.fx.floaters) {
        ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    },

    drawHud(world) {
      ctx.textBaseline = 'alphabetic';
      // Score.
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.ink;
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText(String(world.score).padStart(6, '0'), 20, 38);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, 20, 58);
      // Combo.
      if (world.multiplier > 1) {
        ctx.fillStyle = PALETTE.gold;
        ctx.font = 'bold 18px system-ui, sans-serif';
        ctx.fillText(`COMBO ×${world.multiplier}`, 20, 84);
        const w = 90 * (world.comboTimer / 2.5);
        ctx.fillStyle = 'rgba(255, 209, 102, 0.25)';
        ctx.fillRect(20, 92, 90, 4);
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(20, 92, w, 4);
      }
      // Wave.
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.ink;
      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillText(`WAVE ${Math.max(1, world.wave)}`, VIEW.width / 2, 36);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '12px system-ui, sans-serif';
      const left = world.enemies.length + world.spawnQueue.length;
      ctx.fillText(world.state === 'title' ? 'defend the lantern' : `${left} shadows remain`, VIEW.width / 2, 56);
      // Flames.
      ctx.textAlign = 'right';
      ctx.font = '20px system-ui, sans-serif';
      let flames = '';
      for (let i = 0; i < LANTERN.flames; i++) flames += i < world.flames ? '🔥' : '·';
      ctx.fillText(flames, VIEW.width - 20, 38);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('LANTERN', VIEW.width - 20, 58);
      // Active power-ups.
      let py = 84;
      ctx.textAlign = 'right';
      ctx.font = 'bold 13px system-ui, sans-serif';
      for (const key of ['spread', 'rapid', 'shield']) {
        if (world.power[key] > 0) {
          ctx.fillStyle = POWERUPS[key].color;
          ctx.fillText(`${POWERUPS[key].label} ${Math.ceil(world.power[key])}s`, VIEW.width - 20, py);
          py += 18;
        }
      }
      // Bottom hint.
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(143, 140, 184, 0.8)';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('WASD / arrows to fly · mouse to aim · hold click or Space to shoot · P pause · M mute', VIEW.width / 2, VIEW.height - 12);
    },

    drawBanner(world) {
      const b = world.banner;
      const a = Math.min(1, b.timer > 1.8 ? (2.2 - b.timer) / 0.4 : b.timer / 0.6);
      ctx.globalAlpha = Math.max(0, a);
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.goldSoft;
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText(b.title, VIEW.width / 2, VIEW.height / 2 - 60);
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '18px system-ui, sans-serif';
      ctx.fillText(b.sub, VIEW.width / 2, VIEW.height / 2 - 28);
      ctx.globalAlpha = 1;
    },

    dimScreen() {
      ctx.fillStyle = 'rgba(5, 4, 15, 0.72)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    },

    drawTitle(world) {
      this.dimScreen();
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 64px system-ui, sans-serif';
      ctx.fillText('LANTERNKEEPER', VIEW.width / 2, 168);
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('Hold the light. The shadows are coming.', VIEW.width / 2, 206);
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '16px system-ui, sans-serif';
      const lines = [
        'Fly with WASD or the arrow keys. Aim with the mouse.',
        'Hold click or Space to shoot bolts of light.',
        'Shadows that reach the lantern burn one of its flames.',
        'Chain kills for a combo multiplier. Catch falling power-ups.',
        'Body-block a shadow to purify it for half points.',
      ];
      lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 262 + i * 26));
      ctx.fillStyle = PALETTE.goldSoft;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('CLICK OR PRESS ENTER TO BEGIN', VIEW.width / 2, 430);
      if (world.best > 0) {
        ctx.fillStyle = PALETTE.dim;
        ctx.font = '15px system-ui, sans-serif';
        ctx.fillText(`Best score: ${world.best}`, VIEW.width / 2, 466);
      }
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('P pauses · M mutes · your best score is kept on this browser', VIEW.width / 2, 540);
    },

    drawGameOver(world) {
      this.dimScreen();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff8a8a';
      ctx.font = 'bold 52px system-ui, sans-serif';
      ctx.fillText('THE LIGHT FADES', VIEW.width / 2, 180);
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(`The shadows took the lantern on wave ${world.wave}.`, VIEW.width / 2, 220);
      ctx.fillStyle = PALETTE.goldSoft;
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillText(`SCORE ${world.score}`, VIEW.width / 2, 292);
      ctx.fillStyle = world.score >= world.best && world.score > 0 ? PALETTE.gold : PALETTE.dim;
      ctx.font = '17px system-ui, sans-serif';
      ctx.fillText(
        world.score >= world.best && world.score > 0 ? '★ NEW BEST ★' : `Best: ${world.best}`,
        VIEW.width / 2,
        326,
      );
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`${world.waveKills} shadows banished · ${world.shotsFired} bolts fired`, VIEW.width / 2, 360);
      ctx.fillStyle = PALETTE.goldSoft;
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('PRESS R OR CLICK TO TRY AGAIN', VIEW.width / 2, 428);
    },
  };
  return renderer;
}
