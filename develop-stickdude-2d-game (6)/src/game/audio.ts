import type { Surface } from './world';

const r = (a: number, b: number) => a + Math.random() * (b - a);

export class Sfx {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  musicGain: GainNode | null = null;
  noiseBuf: AudioBuffer | null = null;
  timer: number | undefined;
  drone: OscillatorNode[] = [];
  muted = false;
  theme = 0;
  boss = false;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    this.ctx = c;
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(c.destination);
    this.musicGain = c.createGain();
    this.musicGain.gain.value = 0.55;
    this.musicGain.connect(this.master);
    const len = c.sampleRate * 1.5;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.7;
  }

  noise(dur: number, type: BiquadFilterType, f: number, q: number, vol: number, f2?: number, delay = 0) {
    const c = this.ctx;
    if (!c || !this.master || !this.noiseBuf) return;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = r(0.8, 1.2);
    const flt = c.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f, t);
    if (f2) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
    flt.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.03);
  }

  tone(f: number, dur: number, type: OscillatorType, vol: number, f2?: number, delay = 0) {
    const c = this.ctx;
    if (!c || !this.master) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  step(s: Surface) {
    const v = r(0.5, 0.8);
    switch (s) {
      case 'stone':
        this.noise(0.07, 'bandpass', r(1400, 2100), 1.2, v * 0.9);
        this.tone(r(110, 150), 0.06, 'sine', v * 0.35, 70);
        break;
      case 'grass':
        this.noise(0.13, 'highpass', 3000, 0.5, v * 0.3);
        this.noise(0.09, 'bandpass', r(700, 1000), 0.8, v * 0.3);
        break;
      case 'wood':
        this.tone(r(150, 190), 0.09, 'triangle', v * 0.5, 90);
        this.noise(0.05, 'bandpass', 700, 2, v * 0.5);
        break;
      case 'cave':
        this.noise(0.09, 'bandpass', r(1000, 1300), 1.5, v * 0.8);
        this.tone(90, 0.1, 'sine', 0.25, 50);
        this.noise(0.25, 'bandpass', 1400, 2, v * 0.15, undefined, 0.1);
        break;
    }
  }
  land(s: Surface, hard: boolean) {
    this.step(s);
    this.noise(0.14, 'lowpass', 600, 1, hard ? 0.9 : 0.4);
    if (hard) this.tone(70, 0.18, 'sine', 0.5, 40);
  }
  jump() { this.noise(0.12, 'bandpass', 500, 1, 0.25, 1600); this.tone(260, 0.12, 'sine', 0.12, 420); }
  djump() { this.noise(0.18, 'highpass', 1500, 1, 0.3, 5000); this.tone(420, 0.18, 'triangle', 0.18, 840); }
  dash() { this.noise(0.22, 'bandpass', 3000, 0.8, 0.55, 600); this.tone(180, 0.2, 'sawtooth', 0.08, 90); }
  slash() { this.noise(0.14, 'highpass', 1200, 0.7, 0.5, 5000); }
  hit() { this.noise(0.1, 'bandpass', 900, 1, 0.7); this.tone(160, 0.1, 'square', 0.18, 60); }
  kill() { this.noise(0.35, 'lowpass', 1500, 1, 0.8, 200); this.tone(220, 0.35, 'sawtooth', 0.15, 50); }
  hurt() { this.noise(0.3, 'lowpass', 1200, 1, 0.9, 150); this.tone(300, 0.3, 'sawtooth', 0.25, 70); }
  death() { this.tone(300, 1.4, 'sawtooth', 0.25, 30); this.noise(1.2, 'lowpass', 900, 1, 0.7, 60); }
  spell() { this.tone(300, 0.35, 'sine', 0.3, 900); this.noise(0.3, 'bandpass', 1800, 2, 0.3, 4000); }
  ritual() {
    [196, 294, 392].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.18, f * 1.5, i * 0.04));
    this.noise(0.4, 'bandpass', 380, 2, 0.22, 1500);
  }
  sacrifice() {
    this.tone(190, 0.55, 'sawtooth', 0.25, 45);
    this.noise(0.55, 'lowpass', 1600, 0.8, 0.65, 200);
  }
  heal() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 'sine', 0.2, undefined, i * 0.08)); }
  focus() { this.tone(200, 0.9, 'sine', 0.1, 500); }
  shard() { this.tone(1200 + r(0, 400), 0.1, 'square', 0.07, 1800); }
  rest() { [262, 330, 392, 523].forEach((f, i) => this.tone(f, 1.4, 'sine', 0.15, undefined, i * 0.1)); }
  pickup() { [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.2, undefined, i * 0.12)); }
  shock() { this.tone(120, 0.3, 'sine', 0.6, 40); this.noise(0.3, 'lowpass', 500, 1, 0.8, 80); }
  roar() { this.tone(90, 1.0, 'sawtooth', 0.28, 45); this.noise(0.9, 'lowpass', 700, 2, 0.6, 120); }
  blip(hi = 1) { this.tone(r(300, 420) * hi, 0.04, 'square', 0.035); }
  ui() { this.tone(660, 0.07, 'triangle', 0.15, 880); }
  orb() { this.tone(500, 0.2, 'sine', 0.15, 250); }

  setMusic(theme: number, boss = false) {
    if (!this.ctx || !this.musicGain) { this.theme = theme; this.boss = boss; return; }
    this.theme = theme;
    this.boss = boss;
    if (this.timer) clearInterval(this.timer);
    this.drone.forEach(o => { try { o.stop(); } catch { /* ignore */ } });
    this.drone = [];
    const c = this.ctx;
    const roots = [196, 164.8, 130.8, 146.8, 110];
    const root = roots[theme % roots.length] * (boss ? 0.75 : 1);
    const dg = c.createGain();
    dg.gain.value = boss ? 0.09 : 0.06;
    dg.connect(this.musicGain);
    [0.5, 0.501, 0.75].forEach(m => {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = root * m;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 260;
      o.connect(f);
      f.connect(dg);
      o.start();
      this.drone.push(o);
    });
    const scale = [1, 1.2, 1.333, 1.5, 1.8, 2, 2.4];
    const play = () => {
      if (!this.ctx || !this.musicGain) return;
      const t = c.currentTime;
      const fr = root * scale[Math.floor(Math.random() * scale.length)] * (Math.random() < 0.3 ? 2 : 1);
      const o = c.createOscillator();
      o.type = boss ? 'sawtooth' : 'triangle';
      o.frequency.value = fr;
      const g = c.createGain();
      const len = boss ? 0.5 : 3.2;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(boss ? 0.07 : 0.09, t + (boss ? 0.04 : 0.9));
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = boss ? 1400 : 900;
      o.connect(f);
      f.connect(g);
      g.connect(this.musicGain);
      o.start(t);
      o.stop(t + len + 0.1);
      if (boss) this.tone(root * 0.5, 0.18, 'sine', 0.35, root * 0.25);
    };
    play();
    this.timer = window.setInterval(play, boss ? 420 : 1900);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.drone.forEach(o => { try { o.stop(); } catch { /* ignore */ } });
    this.drone = [];
  }
}
