// Escena de conducción: fondo con parallax, física simple, eventos de ruta.
import { fitPixelCanvas } from '../gfx/pixel';
import { BuiltCar, buildCar, drawCar } from '../car/build';
import { CarConfig } from '../car/parts';
import { Theme, ThemeArt, themeById, geom, TW } from './themes';
import { trafficLight, animals, AnimalKind, cone, turtleSign, Sprite } from './props';
import { Engine, Horn, sfx } from '../audio';

export type Hint = 'horn' | 'lights' | 'gas' | 'brake' | null;
export interface Prompt {
  emoji: string;
  text: string;
  hint?: Hint;
  good?: boolean;
}

export interface DriveCallbacks {
  onPrompt?(p: Prompt | null): void;
  onStar?(total: number): void;
  onSpeed?(v01: number): void;
}

const TARGET_H = 200;

const ANIMAL_TEXT: Record<AnimalKind, { emoji: string; seen: string; sound_text: string; done: string; sound: () => void }> = {
  patos: { emoji: '🦆', seen: '¡Patitos en el camino!', sound_text: '¡Cuac, cuac!', done: '¡Los patitos se fueron volando!', sound: () => sfx.quack() },
  vacas: { emoji: '🐄', seen: '¡Vacas en el camino!', sound_text: '¡Muuuu!', done: '¡Las vacas se apartaron!', sound: () => sfx.moo() },
  cerdos: { emoji: '🐷', seen: '¡Cerditos en el camino!', sound_text: '¡Oink, oink!', done: '¡Los cerditos se fueron corriendo!', sound: () => sfx.oink() },
};
const VMAX = 210;
const ACC = 115;
const BRAKE = 330;
const DRAG = 28;

type EvType = 'semaforo' | 'patos' | 'tunel' | 'lento';
interface Ev {
  type: EvType;
  E: number;
  state: string;
  timer: number;
  violated: boolean;
  len: number;
  prompted: boolean;
  gasTime: number;
  starGiven: boolean;
  fx: number;
  kind: AnimalKind;
  fy: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string;
}

export class DriveScene {
  private ctx: CanvasRenderingContext2D;
  private layerCv = document.createElement('canvas');
  private layerCtx = this.layerCv.getContext('2d')!;
  car: BuiltCar;
  theme: Theme;
  private art: ThemeArt | null = null;
  private artH = 0;
  W = 0;
  H = 0;
  cssScale = 1;

  D = 0;
  v = 0;
  private t = 0;
  lights = false;
  gas = false;
  brake = false;
  private honking = false;
  private honkEdge = false;
  private wheelAngle = 0;
  private tilt = 0;
  private by = 0;
  private bv = 0;
  private sway = 0;
  private swayV = 0;
  private bumpIn = 50;
  private ev: Ev | null = null;
  private nextAt = 380;
  private bag: EvType[] = [];
  private animalBag: AnimalKind[] = [];
  private lastAnimal: AnimalKind | null = null;
  private particles: Particle[] = [];
  private lines: { x: number; y: number; w: number }[] = [];
  private raf = 0;
  private last = 0;
  private engine = new Engine();
  private horn = new Horn();
  private promptText = '';
  private promptUntil = 0;
  private lastErr = 0;
  stars = 0;

  constructor(
    public canvas: HTMLCanvasElement,
    cfg: CarConfig,
    themeId: string,
    private opts: { demo?: boolean; cb?: DriveCallbacks } = {},
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.car = buildCar(cfg);
    this.theme = themeById(themeId);
    if (opts.demo) this.lights = this.theme.night;
  }

  setCar(cfg: CarConfig) {
    this.car = buildCar(cfg);
  }
  setTheme(id: string) {
    this.theme = themeById(id);
    this.art = null;
    if (this.opts.demo) this.lights = this.theme.night;
  }

  resize(cssW: number, cssH: number) {
    const r = fitPixelCanvas(this.canvas, cssW, cssH, (w, h) => Math.max(1, Math.round(Math.min(h / TARGET_H, w / 360))));
    this.W = r.w;
    this.H = r.h;
    this.cssScale = r.cssScale;
    this.layerCv.width = r.w;
    this.layerCv.height = r.h;
    if (this.artH !== r.h || !this.art) {
      this.art = this.theme.build(r.h);
      this.artH = r.h;
    }
  }

  start() {
    this.last = performance.now();
    if (!this.opts.demo) this.engine.start();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.update(dt);
      this.render();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.engine.stop();
    this.horn.stop();
  }

  setHorn(on: boolean) {
    if (on && !this.honking) {
      this.honkEdge = true;
      this.horn.start(this.car.horn);
    }
    if (!on) this.horn.stop();
    this.honking = on;
  }

  toggleLights() {
    this.lights = !this.lights;
    (this.lights ? sfx.lightsOn : sfx.lightsOff)();
    return this.lights;
  }

  get carX() {
    return Math.max(Math.round(this.W * 0.3), this.car.rearExt + 10);
  }

  // -------------------------------------------------------------------------
  private prompt(p: Prompt | null, hold = 0) {
    const key = p ? p.emoji + p.text : '';
    if (hold) this.promptUntil = this.t + hold;
    else if (this.t < this.promptUntil && p === null) return;
    if (key === this.promptText) return;
    this.promptText = key;
    this.opts.cb?.onPrompt?.(p);
  }

  private star(msg: string) {
    this.stars++;
    sfx.star();
    this.opts.cb?.onStar?.(this.stars);
    this.prompt({ emoji: '⭐', text: msg, good: true }, 2.4);
  }

  /** Saca los tres animales sin repetir hasta que salieron todos. */
  private nextAnimal(): AnimalKind {
    if (!this.animalBag.length) {
      const b: AnimalKind[] = ['patos', 'vacas', 'cerdos'];
      for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
      }
      // que no se repita el último de la bolsa anterior
      if (b[b.length - 1] === this.lastAnimal) [b[0], b[b.length - 1]] = [b[b.length - 1], b[0]];
      this.animalBag = b;
    }
    this.lastAnimal = this.animalBag.pop()!;
    return this.lastAnimal;
  }

  private nextType(): EvType {
    if (!this.bag.length) {
      this.bag = ['semaforo', 'patos', 'tunel', 'lento'];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop()!;
  }

  private finish(okMsg: string | null, failMsg?: string) {
    if (okMsg) this.star(okMsg);
    else if (failMsg) this.prompt({ emoji: '🙂', text: failMsg }, 2.6);
    this.ev = null;
    this.nextAt = this.D + 650 + Math.random() * 500;
  }

  private updateEvent(dt: number): { stopAt: number | null; cap: number } {
    const ev = this.ev;
    const car = this.car;
    let stopAt: number | null = null;
    let cap = VMAX;
    if (!ev) return { stopAt, cap };
    const visible = ev.E - this.D < this.W - this.carX + 10;
    const stopped = this.v < 2;
    switch (ev.type) {
      case 'semaforo': {
        const sa = ev.E - car.frontExt - 10;
        if (ev.state === 'approach') {
          stopAt = sa;
          if (visible && !ev.prompted) {
            ev.prompted = true;
            this.prompt({ emoji: '🚦', text: '¡Un semáforo! Hay que frenar', hint: 'brake' });
          }
          if (this.D >= sa - 0.8 && stopped) {
            ev.state = 'wait';
            ev.timer = 3.2;
          }
        } else if (ev.state === 'wait' || ev.state === 'yellow') {
          stopAt = sa;
          ev.timer -= dt;
          if (ev.state === 'wait') {
            if (this.gas) {
              if (!ev.violated || this.t - this.lastErr > 1.2) {
                this.lastErr = this.t;
                sfx.error();
              }
              ev.violated = true;
              this.prompt({ emoji: '✋', text: '¡Todavía no! Espera el verde' });
            } else {
              this.prompt({ emoji: '🔴', text: `Rojo… espera ${Math.max(1, Math.ceil(ev.timer))}` });
            }
            if (ev.timer <= 0) {
              ev.state = 'yellow';
              ev.timer = 0.7;
            }
          } else if (ev.timer <= 0) {
            ev.state = 'green';
            sfx.ding();
            this.prompt({ emoji: '🟢', text: '¡Verde! ¡Acelera!', hint: 'gas' });
          }
        } else if (ev.state === 'green' && this.D > ev.E + 20) {
          this.finish(ev.violated ? null : '¡Muy bien! Esperaste el verde', '¡Casi! La próxima espera al verde');
        }
        break;
      }
      case 'patos': {
        const T = ANIMAL_TEXT[ev.kind];
        const sa = ev.E - animals(ev.kind, 0, false).ax - car.frontExt - 8;
        if (ev.state === 'approach' || ev.state === 'honk') {
          stopAt = sa;
          if (visible && !ev.prompted) {
            ev.prompted = true;
            this.prompt({ emoji: T.emoji, text: T.seen });
          }
          if (ev.state === 'approach' && this.D >= sa - 0.8 && stopped) {
            ev.state = 'honk';
            this.prompt({ emoji: '📯', text: '¡Toca la bocina!', hint: 'horn' });
          }
          if (this.honkEdge && visible) {
            ev.state = 'fly';
            ev.timer = 1.6;
            T.sound();
            this.prompt({ emoji: T.emoji, text: T.sound_text });
          }
        } else if (ev.state === 'fly') {
          ev.timer -= dt;
          if (ev.kind === 'patos') {
            ev.fx += dt * 40;
            ev.fy -= dt * 60;
          } else {
            // corren hacia la vereda de enfrente
            ev.fx += dt * 55;
            ev.fy = Math.max(-26, ev.fy - dt * 30);
          }
          if (ev.timer > 1.1) stopAt = sa;
          if (ev.timer <= 0) this.finish(T.done);
        }
        break;
      }
      case 'tunel': {
        const sa = ev.E - car.frontExt - 6;
        if (ev.state === 'approach' || ev.state === 'wait') {
          if (visible && !ev.prompted) {
            ev.prompted = true;
            if (!this.lights) this.prompt({ emoji: '🌑', text: '¡Un túnel oscuro! Enciende las luces', hint: 'lights' });
          }
          if (this.lights && visible) {
            ev.state = 'ok';
            this.star('¡Luces encendidas! Ahora se ve todo');
          } else if (!this.lights) {
            stopAt = sa;
            if (ev.state === 'approach' && this.D >= sa - 0.8 && stopped) {
              ev.state = 'wait';
              this.prompt({ emoji: '💡', text: 'Toca el botón de las luces', hint: 'lights' });
            }
          }
        } else if (ev.state === 'ok' && this.D - car.rearExt > ev.E + ev.len + 10) {
          this.ev = null;
          this.nextAt = this.D + 650 + Math.random() * 500;
          if (this.lights) this.prompt({ emoji: '☀️', text: 'Ya puedes apagar las luces' }, 2.4);
        }
        break;
      }
      case 'lento': {
        const inZone = this.D + car.frontExt >= ev.E - 6 && this.D - car.rearExt <= ev.E + ev.len;
        if (ev.state === 'approach') {
          if (visible && !ev.prompted) {
            ev.prompted = true;
            this.prompt({ emoji: '🐢', text: '¡Zona lenta! Ve despacito' });
          }
          if (inZone) {
            ev.state = 'in';
            this.prompt({ emoji: '🐢', text: 'Suelta el acelerador', hint: 'brake' });
          }
        } else if (ev.state === 'in') {
          cap = 55;
          if (this.gas) ev.gasTime += dt;
          if (ev.gasTime > 1.2 && !ev.violated) {
            ev.violated = true;
            sfx.error();
            this.prompt({ emoji: '🐢', text: '¡Despacio, despacio!' });
          }
          if (!inZone) this.finish(ev.violated ? null : '¡Qué bien manejas!', '¡Casi! En la zona lenta, despacito');
        }
        break;
      }
    }
    return { stopAt, cap };
  }

  private update(dt: number) {
    this.t += dt;
    const car = this.car;
    if (this.opts.demo) this.gas = this.v < 95;

    // eventos
    if (!this.opts.demo && !this.ev && this.D >= this.nextAt && this.W > 0) {
      const type = this.nextType();
      this.ev = {
        type, E: this.D + this.W - this.carX + 70, state: 'approach', timer: 0, violated: false,
        len: type === 'tunel' ? 560 : type === 'lento' ? 460 : 0, prompted: false, gasTime: 0, starGiven: false, fx: 0, fy: 0,
        kind: type === 'patos' ? this.nextAnimal() : 'patos',
      };
    }
    const { stopAt, cap } = this.updateEvent(dt);
    this.honkEdge = false;

    // física
    let a: number;
    if (this.brake) a = -BRAKE;
    else if (this.gas) a = ACC * (1 - (this.v / VMAX) * 0.55);
    else a = -DRAG - this.v * 0.18;
    if (this.v > cap) a = Math.min(a, -150);
    let held = false;
    if (stopAt !== null) {
      const dist = stopAt - this.D;
      if (dist <= 0.5) {
        this.D = Math.max(this.D, Math.min(this.D, stopAt));
        this.v = 0;
        a = 0;
        held = true;
      } else {
        const need = (this.v * this.v) / (2 * dist);
        if (need > 55) a = Math.min(a, -need);
      }
    }
    if (!held) {
      this.v = Math.max(0, Math.min(VMAX, this.v + a * dt));
      this.D += this.v * dt;
    }
    if (this.v === 0 && a < 0) a = 0;

    this.wheelAngle += (this.v * dt) / car.wheels[0].r;

    // inclinación y suspensión
    const tiltTarget = Math.max(-2, Math.min(2.6, (-a / ACC) * 1.4));
    this.tilt += (tiltTarget - this.tilt) * Math.min(1, dt * 7);
    this.bv += (-180 * this.by - 9 * this.bv) * dt;
    this.by += this.bv * dt;
    this.bumpIn -= this.v * dt;
    if (this.bumpIn < 0) {
      const bumpy = this.ev?.type === 'lento' && this.ev.state === 'in';
      const imp = (14 + this.v * 0.22) * (0.5 + Math.random() * 0.8) * (bumpy ? 1.8 : 1);
      this.bv -= imp;
      this.swayV -= imp * 2;
      this.bumpIn = bumpy ? 16 + Math.random() * 20 : 35 + Math.random() * 80;
    }
    // antena
    const swayTarget = -this.v * 0.03 - a * 0.012;
    this.swayV += ((swayTarget - this.sway) * 70 - this.swayV * 5) * dt;
    this.sway += this.swayV * dt;

    // partículas
    const { groundY } = geom(this.H);
    const dusty = ['desierto', 'playa', 'bosque', 'golosinas'].includes(this.theme.id);
    if (dusty && this.v > 70 && Math.random() < dt * (this.v / 25)) {
      const rw = car.wheels[0];
      this.particles.push({
        x: this.D + rw.x - rw.r, y: groundY - 2, vx: -15 - Math.random() * 15, vy: -8 - Math.random() * 12,
        life: 0, max: 0.6, size: 2,
        color: this.theme.id === 'golosinas' ? ['#ff5a8a', '#58b0f8', '#ffe050', '#70d860', '#ffffff'][Math.floor(Math.random() * 5)] : this.theme.id === 'bosque' ? '#a08060' : '#e8c890',
      });
    }
    if (car.exhaust && Math.random() < dt * (this.gas ? 14 : 3)) {
      this.particles.push({
        x: this.D + car.exhaust.x, y: groundY - car.ground + car.exhaust.y - 1, vx: -25 - Math.random() * 10, vy: -6 - Math.random() * 6,
        life: 0, max: this.gas ? 0.9 : 0.6, size: 1, color: '#d8d8e0',
      });
    }
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 0.96;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);

    // líneas de velocidad
    if (this.v > VMAX * 0.75 && Math.random() < dt * 10)
      this.lines.push({ x: this.W + 5, y: 10 + Math.random() * (this.H * 0.55), w: 8 + Math.random() * 16 });
    for (const l of this.lines) l.x -= (this.v * 2.2) * dt;
    this.lines = this.lines.filter((l) => l.x + l.w > 0);

    if (!this.opts.demo) this.engine.set(this.v / VMAX, this.gas);
    this.opts.cb?.onSpeed?.(this.v / VMAX);
    if (this.t > this.promptUntil && this.promptUntil > 0) {
      this.promptUntil = 0;
      if (!this.ev) this.prompt(null);
    }
  }

  // -------------------------------------------------------------------------
  private drawSprite(s: Sprite, x: number, y: number) {
    this.ctx.drawImage(s.cv, Math.round(x - s.ax), Math.round(y - s.ay));
  }

  private render() {
    const { ctx, W, H } = this;
    if (!this.art || !W) return;
    const { walkTop, roadTop, groundY } = geom(H);
    const carX = this.carX;
    const sx = (wx: number) => Math.round(carX + (wx - this.D));

    for (const L of this.art.layers) {
      const off = ((Math.round(this.D * L.f + (L.drift ?? 0) * this.t) % TW) + TW) % TW;
      for (let x = -off; x < W; x += TW) ctx.drawImage(L.cv, x, 0);
    }

    const ev = this.ev;
    let tunnel: { x0: number; x1: number; top: number } | null = null;
    // eventos (detrás del coche)
    if (ev) {
      const ex = sx(ev.E);
      if (ev.type === 'semaforo') {
        const st = ev.state === 'green' ? 'green' : ev.state === 'yellow' ? 'yellow' : 'red';
        this.drawSprite(trafficLight(st), ex, walkTop + 4);
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(ex - 1, roadTop + 2, 3, H - roadTop - 5);
      }
      if (ev.type === 'patos') {
        const running = ev.state === 'fly';
        const frame = running && ev.kind === 'patos' ? 0 : Math.floor(this.t * (running ? 12 : 4)) % 2;
        if (running) ctx.globalAlpha = Math.max(0, Math.min(1, ev.timer / 0.6));
        this.drawSprite(animals(ev.kind, frame, running && ev.kind === 'patos'), ex + ev.fx, groundY + ev.fy);
        ctx.globalAlpha = 1;
      }
      if (ev.type === 'lento') {
        this.drawSprite(turtleSign(false), sx(ev.E - 8), walkTop + 4);
        this.drawSprite(turtleSign(true), sx(ev.E + ev.len), walkTop + 4);
        for (let k = 0; k <= ev.len; k += 50) this.drawSprite(cone(), sx(ev.E + k), roadTop + 4);
      }
      if (ev.type === 'tunel') {
        const x0 = ex, x1 = sx(ev.E + ev.len);
        const top = walkTop - 60;
        if (x1 > -40 && x0 < W + 40) {
          tunnel = { x0, x1, top };
          ctx.fillStyle = '#14141c';
          ctx.fillRect(x0, top, x1 - x0, roadTop - 2 - top);
          ctx.fillStyle = '#1c1c28';
          for (let y = top + 6; y < roadTop - 2; y += 6)
            for (let x = x0 + ((y / 6) % 2 ? 0 : 6); x < x1; x += 12) ctx.fillRect(x, y, 11, 5);
          for (let x = x0 + 30; x < x1 - 10; x += 56) {
            ctx.fillStyle = 'rgba(255,170,60,0.18)';
            ctx.fillRect(x - 5, top + 6, 13, 9);
            ctx.fillStyle = '#ffb040';
            ctx.fillRect(x, top + 9, 3, 2);
          }
          ctx.fillStyle = 'rgba(0,0,12,0.72)';
          ctx.fillRect(x0, roadTop - 2, x1 - x0, H - roadTop + 2);
        }
      }
    }

    // partículas de atrás
    for (const p of this.particles) {
      if (p.color === '#d8d8e0') continue;
      const k = p.life / p.max;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = p.color;
      const s = Math.round(p.size + k * 2);
      ctx.fillRect(sx(p.x), Math.round(p.y), s, s);
    }
    ctx.globalAlpha = 1;

    // coche en su propia capa (para teñirlo de noche / en el túnel)
    const lc = this.layerCtx;
    lc.clearRect(0, 0, W, H);
    const speed01 = this.v / VMAX;
    const idleShake = this.v < 4 && !this.opts.demo ? (Math.floor(this.t * 11) % 2) * -0.6 : 0;
    const st = {
      wheelAngle: this.wheelAngle, bounce: this.by + idleShake, tilt: this.tilt, lights: this.lights,
      brake: this.brake || (this.v > 1 && !this.gas && !!ev && ev.state === 'approach'), t: this.t, sway: this.sway, speed: speed01,
    };
    let darkness = this.theme.night ? 0.42 : 0;
    if (tunnel) {
      const c0 = carX - this.car.rearExt, c1 = carX + this.car.frontExt;
      const ov = Math.max(0, Math.min(c1, tunnel.x1) - Math.max(c0, tunnel.x0)) / (c1 - c0);
      darkness = Math.max(darkness, ov * 0.72);
    }
    const res = drawCar(lc, this.car, carX, groundY, { ...st, phase: 'body' });
    if (darkness > 0) {
      lc.globalCompositeOperation = 'source-atop';
      lc.fillStyle = `rgba(8,10,40,${darkness})`;
      lc.fillRect(0, 0, W, H);
      lc.globalCompositeOperation = 'source-over';
    }
    // luces encima del tinte
    drawCar(lc, this.car, carX, groundY, { ...st, phase: 'lights' });
    ctx.drawImage(this.layerCv, 0, 0);

    // haz de luz
    if (this.lights) {
      const strong = this.theme.night || darkness > 0.3;
      const { x, y } = res.lightPos;
      ctx.globalCompositeOperation = 'lighter';
      const len = 120;
      for (const [k, alpha] of [[1, strong ? 0.09 : 0.04], [0.6, strong ? 0.12 : 0.05]] as const) {
        ctx.fillStyle = `rgba(255,240,170,${alpha})`;
        for (let i = 2; i < len; i += 2) {
          const hh = Math.round((2 + i * 0.16) * k);
          ctx.fillRect(x + i, y - hh, 2, hh * 2 + Math.round(i * 0.06));
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // bocina: ondas
    if (this.honking) {
      ctx.fillStyle = '#ffffff';
      const fx = carX + this.car.frontExt + 4, fy = groundY - this.car.ground - 10;
      const ph = Math.floor(this.t * 8) % 3;
      for (let k = 0; k < 3; k++) {
        const r = 3 + ((k + ph) % 3) * 4;
        ctx.fillRect(fx + r, fy - r, 1, r * 2);
        ctx.fillRect(fx + r - 1, fy - r - 1, 1, 1);
        ctx.fillRect(fx + r - 1, fy + r, 1, 1);
      }
    }

    // humo
    for (const p of this.particles) {
      if (p.color !== '#d8d8e0') continue;
      const k = p.life / p.max;
      ctx.globalAlpha = 0.85 * (1 - k);
      ctx.fillStyle = p.color;
      const s = Math.round(1 + k * 4);
      ctx.fillRect(sx(p.x) - (s >> 1), Math.round(p.y) - (s >> 1), s, s);
    }
    ctx.globalAlpha = 1;

    // frente del túnel y conos cercanos
    if (tunnel) {
      const { x0, x1, top } = tunnel;
      const g = this.theme.id === 'golosinas' ? '#ffffff' : this.theme.id === 'desierto' ? '#c87850' : this.theme.id === 'playa' ? '#58a858' : this.theme.night ? '#1c3424' : '#48a048';
      const rock = this.theme.id === 'golosinas' ? '#8a5038' : this.theme.id === 'desierto' ? '#a05838' : this.theme.night ? '#3a3448' : '#7a7088';
      const rockD = this.theme.id === 'golosinas' ? '#f8a0c8' : this.theme.id === 'desierto' ? '#804028' : this.theme.night ? '#2a2438' : '#5a5068';
      ctx.fillStyle = rock;
      const span = x1 - x0;
      for (let x = x0 - 18; x < x1 + 18; x++) {
        const k = (x - (x0 - 18)) / (span + 36);
        const hh = Math.round(Math.sin(k * Math.PI) * 26 + 6);
        ctx.fillStyle = rock;
        ctx.fillRect(x, top - hh, 1, hh + 1);
        ctx.fillStyle = g;
        ctx.fillRect(x, top - hh, 1, 3);
        if ((x * 7) % 11 === 0) {
          ctx.fillStyle = rockD;
          ctx.fillRect(x, top - hh + 6, 2, 2);
        }
      }
      for (const px of [x0 - 6, x1]) {
        ctx.fillStyle = '#8a8496';
        ctx.fillRect(px, top - 4, 7, roadTop - 2 - top + 4);
        ctx.fillStyle = '#5a5468';
        for (let y = top; y < roadTop - 2; y += 5) ctx.fillRect(px, y, 7, 1);
        ctx.fillRect(px + 6, top - 4, 1, roadTop - 2 - top + 4);
        ctx.fillStyle = '#2a2438';
        ctx.fillRect(px - 1, top - 5, 9, 1);
      }
      ctx.fillStyle = '#8a8496';
      ctx.fillRect(x0 - 6, top - 4, x1 - x0 + 13, 4);
      ctx.fillStyle = '#5a5468';
      ctx.fillRect(x0 - 6, top - 1, x1 - x0 + 13, 1);
    }
    if (ev && ev.type === 'lento') {
      for (let k = 25; k <= ev.len; k += 50) this.drawSprite(cone(), sx(ev.E + k), H - 1);
    }

    // líneas de velocidad
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const l of this.lines) ctx.fillRect(Math.round(l.x), Math.round(l.y), Math.round(l.w), 1);
  }
}

