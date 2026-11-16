// Particles, floating score text and screen shake: the feedback layer. A
// burst is a handful of sparks with a lifetime; a floater is a short-lived
// label that drifts upward; shake offsets the whole scene for a few frames.

export function createFx() {
  return {
    particles: [],
    floaters: [],
    shake: 0,

    burst(x, y, color, count, speed) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        this.particles.push({
          x,
          y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v,
          life: 0.4 + Math.random() * 0.4,
          maxLife: 0.8,
          size: 1.5 + Math.random() * 2.5,
          color,
        });
      }
    },
    ring(x, y, color) {
      this.particles.push({
        x, y, vx: 0, vy: 0, life: 0.35, maxLife: 0.35,
        size: 6, color, ring: true,
      });
    },
    floater(x, y, text, color) {
      this.floaters.push({ x, y, text, color, life: 0.9, maxLife: 0.9 });
    },
    addShake(amount) {
      this.shake = Math.min(14, this.shake + amount);
    },
    update(dt) {
      for (const p of this.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const f of this.floaters) {
        f.y -= 34 * dt;
        f.life -= dt;
      }
      this.floaters = this.floaters.filter((f) => f.life > 0);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 42);
    },
    offset() {
      if (this.shake <= 0) return { x: 0, y: 0 };
      return {
        x: (Math.random() - 0.5) * this.shake,
        y: (Math.random() - 0.5) * this.shake,
      };
    },
  };
}
