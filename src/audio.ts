// Sonidos sintetizados con WebAudio (estilo chiptune, sin archivos).
// iOS sólo habilita el audio después de un toque: unlockAudio() se llama
// en el primer pointerdown.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = localStorage.getItem('tt-muted') === '1';

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  localStorage.setItem('tt-muted', m ? '1' : '0');
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02);
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.15, slideTo?: number, delay = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.1, filter = 1200, delay = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filter;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export const sfx = {
  click: () => tone(900, 0.05, 'square', 0.06),
  tab: () => { tone(660, 0.05, 'square', 0.07); tone(990, 0.06, 'square', 0.06, undefined, 0.04); },
  pop: () => { tone(380, 0.09, 'square', 0.12, 900); noise(0.05, 0.05, 3000); },
  clank: () => { tone(220, 0.06, 'square', 0.1, 120); tone(1400, 0.05, 'triangle', 0.06, undefined, 0.02); },
  paint: () => { noise(0.25, 0.08, 2500); tone(500, 0.15, 'sine', 0.06, 900); },
  error: () => tone(180, 0.15, 'square', 0.1, 140),
  ding: () => { tone(1320, 0.12, 'triangle', 0.15); tone(1760, 0.22, 'triangle', 0.12, undefined, 0.08); },
  star: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.09, undefined, i * 0.07)),
  fanfare: () => [392, 523, 659, 784, 659, 784].forEach((f, i) => tone(f, i === 5 ? 0.35 : 0.12, 'square', 0.08, undefined, i * 0.1)),
  quack: () => { tone(620, 0.09, 'sawtooth', 0.08, 380); tone(600, 0.09, 'sawtooth', 0.08, 360, 0.14); },
  moo: () => { tone(200, 0.7, 'sawtooth', 0.1, 120); tone(100, 0.7, 'square', 0.04, 70); },
  oink: () => { [0, 0.18].forEach((d) => { tone(330, 0.1, 'square', 0.08, 220, d); noise(0.08, 0.05, 900, d); }); },
  lightsOn: () => tone(1200, 0.04, 'square', 0.06),
  lightsOff: () => tone(700, 0.04, 'square', 0.06),
  whoosh: () => noise(0.3, 0.06, 900),
};

/** Bocina: suena mientras se mantiene apretado. */
export class Horn {
  private oscs: OscillatorNode[] = [];
  private g: GainNode | null = null;
  start(freq: number) {
    if (!ctx || !master || this.g) return;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2400;
    g.connect(f).connect(master);
    for (const k of [1, 1.26]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq * k;
      o.connect(g);
      o.start();
      this.oscs.push(o);
    }
    this.g = g;
  }
  stop() {
    if (!ctx || !this.g) return;
    const g = this.g;
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.03);
    const os = this.oscs;
    setTimeout(() => os.forEach((o) => o.stop()), 200);
    this.oscs = [];
    this.g = null;
  }
}

/** Motor: zumbido que sube con la velocidad. */
export class Engine {
  private o1: OscillatorNode | null = null;
  private o2: OscillatorNode | null = null;
  private g: GainNode | null = null;
  private f: BiquadFilterNode | null = null;
  start() {
    if (!ctx || !master || this.o1) return;
    this.g = ctx.createGain();
    this.g.gain.value = 0.0001;
    this.g.gain.setTargetAtTime(0.05, ctx.currentTime, 0.2);
    this.f = ctx.createBiquadFilter();
    this.f.type = 'lowpass';
    this.f.frequency.value = 380;
    this.o1 = ctx.createOscillator();
    this.o1.type = 'sawtooth';
    this.o1.frequency.value = 42;
    this.o2 = ctx.createOscillator();
    this.o2.type = 'square';
    this.o2.frequency.value = 21;
    const g2 = ctx.createGain();
    g2.gain.value = 0.5;
    this.o1.connect(this.f);
    this.o2.connect(g2).connect(this.f);
    this.f.connect(this.g).connect(master);
    this.o1.start();
    this.o2.start();
  }
  set(speed01: number, gas: boolean) {
    if (!ctx || !this.o1 || !this.o2 || !this.g || !this.f) return;
    const t = ctx.currentTime;
    const base = 40 + speed01 * 90 + (gas ? 14 : 0);
    this.o1.frequency.setTargetAtTime(base, t, 0.1);
    this.o2.frequency.setTargetAtTime(base / 2, t, 0.1);
    this.f.frequency.setTargetAtTime(320 + speed01 * 700 + (gas ? 200 : 0), t, 0.1);
    this.g.gain.setTargetAtTime(0.04 + speed01 * 0.03 + (gas ? 0.015 : 0), t, 0.1);
  }
  stop() {
    if (!ctx || !this.g) return;
    this.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
    const a = this.o1, b = this.o2;
    setTimeout(() => { a?.stop(); b?.stop(); }, 300);
    this.o1 = this.o2 = null;
    this.g = null;
  }
}
