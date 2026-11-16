// Mini motor de pixel-art: un buffer de píxeles con primitivas simples.
// Todo se dibuja a resolución nativa (1 píxel = 1 píxel) y luego se escala
// con image-rendering: pixelated.

const cache = new Map<string, number>();

/** Convierte '#rrggbb' / '#rrggbbaa' al formato ABGR de ImageData (little-endian). */
export function C(c: string): number {
  let v = cache.get(c);
  if (v !== undefined) return v;
  let s = c.replace('#', '');
  if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  const a = s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255;
  v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  cache.set(c, v);
  return v;
}

type Col = string | number;
const val = (c: Col) => (typeof c === 'number' ? c : C(c));

export class PB {
  readonly d: Uint32Array;
  constructor(public w: number, public h: number) {
    this.d = new Uint32Array(w * h);
  }
  inb(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }
  set(x: number, y: number, c: Col) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inb(x, y)) return;
    this.d[y * this.w + x] = val(c);
  }
  get(x: number, y: number) {
    x = Math.round(x);
    y = Math.round(y);
    return this.inb(x, y) ? this.d[y * this.w + x] : 0;
  }
  has(x: number, y: number) {
    return (this.get(x, y) >>> 24) > 0;
  }
  rect(x: number, y: number, w: number, h: number, c: Col) {
    const v = val(c);
    const x0 = Math.round(x), y0 = Math.round(y);
    const x1 = Math.round(x + w), y1 = Math.round(y + h);
    for (let j = y0; j < y1; j++)
      for (let i = x0; i < x1; i++) if (this.inb(i, j)) this.d[j * this.w + i] = v;
  }
  /** Círculo relleno con forma "amigable" para pixel art. */
  disc(cx: number, cy: number, r: number, c: Col) {
    const v = val(c);
    const rr = r * r + r * 0.8;
    const R = Math.ceil(r);
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= rr) this.set(cx + dx, cy + dy, v);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: Col) {
    const v = val(c);
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, v);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** Relleno de polígono por scanline. */
  poly(pts: [number, number][], c: Col) {
    const v = val(c);
    let minY = Infinity, maxY = -Infinity;
    for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, v);
      }
    }
  }
  /** Agrega un contorno de 1px alrededor de todo lo opaco. */
  outline(c: Col, wrapX = false) {
    const v = val(c);
    const src = this.d.slice();
    const w = this.w, h = this.h;
    const op = (x: number, y: number) => {
      if (wrapX) x = (x + w) % w;
      if (x < 0 || y < 0 || x >= w || y >= h) return false;
      return (src[y * w + x] >>> 24) > 0;
    };
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if ((src[y * w + x] >>> 24) > 0) continue;
        if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) this.d[y * w + x] = v;
      }
  }
  /** Mezcla el píxel existente con un color (t=0..1). */
  mix(x: number, y: number, c: string, t: number) {
    x = Math.round(x); y = Math.round(y);
    if (!this.inb(x, y)) return;
    const i = y * this.w + x;
    const o = this.d[i];
    if ((o >>> 24) === 0) return;
    const n = C(c);
    const ch = (v: number, s: number) => (v >>> s) & 255;
    const m = (s: number) => Math.round(ch(o, s) * (1 - t) + ch(n, s) * t);
    this.d[i] = ((255 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)) >>> 0;
  }
  blit(o: PB, ox = 0, oy = 0) {
    for (let y = 0; y < o.h; y++)
      for (let x = 0; x < o.w; x++) {
        const v = o.d[y * o.w + x];
        if ((v >>> 24) > 0) this.set(x + ox, y + oy, v);
      }
  }
  canvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    const ctx = cv.getContext('2d')!;
    const img = new ImageData(new Uint8ClampedArray(this.d.buffer.slice(0) as ArrayBuffer), this.w, this.h);
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    f,
    int: (a: number, b: number) => Math.floor(a + f() * (b - a + 1)),
    pick: <T>(arr: T[]) => arr[Math.floor(f() * arr.length)],
  };
}

/**
 * Ajusta un canvas para que cada "píxel de juego" sea un múltiplo entero de
 * píxeles reales de pantalla. Devuelve la resolución interna.
 */
export function fitPixelCanvas(
  canvas: HTMLCanvasElement,
  cssW: number,
  cssH: number,
  scaleFor: (devW: number, devH: number) => number,
) {
  const dpr = window.devicePixelRatio || 1;
  const devW = Math.max(1, Math.floor(cssW * dpr));
  const devH = Math.max(1, Math.floor(cssH * dpr));
  const scale = Math.max(1, scaleFor(devW, devH));
  const w = Math.floor(devW / scale);
  const h = Math.floor(devH / scale);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  canvas.style.width = (w * scale) / dpr + 'px';
  canvas.style.height = (h * scale) / dpr + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { w, h, scale, cssScale: scale / dpr };
}
