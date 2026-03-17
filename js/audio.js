export class AudioManager {
  constructor() {
    this.ctx = null;
  }

  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freq, duration, type = "sine", volume = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      this.ctx.currentTime + duration,
    );
    osc.stop(this.ctx.currentTime + duration);
  }

  playShoot() {
    this.playTone(520, 0.1, "square", 0.25);
  }

  playExplosionShot() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc2.type = "triangle";
    osc1.frequency.setValueAtTime(320, now);
    osc2.frequency.setValueAtTime(210, now);
    osc1.frequency.exponentialRampToValueAtTime(90, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(70, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);
  }

  playHit() {
    this.playTone(240, 0.12, "triangle", 0.2);
    setTimeout(() => this.playTone(160, 0.08, "triangle", 0.15), 60);
  }

  playDamage() {
    this.playTone(90, 0.3, "sawtooth", 0.4);
  }

  playDestroy() {
    if (!this.ctx) return;
    // short percussive burst for destruction
    this.playTone(600, 0.06, "square", 0.22);
    setTimeout(() => this.playTone(420, 0.08, "sawtooth", 0.18), 40);
    setTimeout(() => this.playTone(300, 0.1, "triangle", 0.14), 90);
  }

  playCoin() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.ctx.destination);

    // short bell-ish tone using two detuned oscillators
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    o1.type = "sine";
    o2.type = "sine";
    o1.frequency.value = 1200;
    o2.frequency.value = 1600;
    o2.detune.value = 40;

    o1.connect(gain);
    o2.connect(gain);

    // quick envelope
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    o1.start(now);
    o2.start(now);
    o1.stop(now + 0.5);
    o2.stop(now + 0.5);
  }

  playSpawn() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = 320;
    g.gain.value = 0.0001;
    o.connect(g).connect(this.ctx.destination);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    o.start(now);
    o.frequency.setValueAtTime(320, now);
    o.frequency.exponentialRampToValueAtTime(720, now + 0.18);
    o.stop(now + 0.38);
  }
}
