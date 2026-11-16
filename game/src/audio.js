// All sound is synthesized with WebAudio: no audio files, nothing to load,
// nothing over the network. The context is created on the first user gesture
// (browsers refuse audio before one) and every effect is a short oscillator
// envelope. M toggles mute.

export function createAudio() {
  const audio = {
    ctx: null,
    master: null,
    muted: false,
    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    },
    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.22;
      return this.muted;
    },
    tone(freq, dur, type, vol, slideTo) {
      if (!this.ctx || this.muted) return;
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },
    shoot() {
      this.tone(720 + Math.random() * 120, 0.07, 'square', 0.12, 340);
    },
    kill(combo) {
      const base = 520 + Math.min(combo, 12) * 22;
      this.tone(base, 0.09, 'triangle', 0.22, base * 1.5);
      this.tone(base * 1.5, 0.12, 'sine', 0.14, base * 2);
    },
    hurt() {
      this.tone(160, 0.35, 'sawtooth', 0.3, 55);
      this.tone(90, 0.3, 'triangle', 0.25, 40);
    },
    pickup() {
      this.tone(660, 0.08, 'sine', 0.2);
      setTimeout(() => this.tone(880, 0.1, 'sine', 0.2), 70);
      setTimeout(() => this.tone(1320, 0.14, 'sine', 0.16), 140);
    },
    waveClear() {
      [523, 659, 784, 1047].forEach((f, i) =>
        setTimeout(() => this.tone(f, 0.16, 'triangle', 0.2), i * 90),
      );
    },
    gameOver() {
      [392, 330, 262, 196].forEach((f, i) =>
        setTimeout(() => this.tone(f, 0.3, 'triangle', 0.22), i * 170),
      );
    },
    click() {
      this.tone(980, 0.05, 'sine', 0.15, 700);
    },
  };
  return audio;
}
