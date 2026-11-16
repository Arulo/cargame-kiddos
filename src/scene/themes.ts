// Fondos con parallax generados por código (pixel art procedural).
// Cada capa es una "baldosa" de TW píxeles de ancho que se repite sin costura.
import { PB, rng } from '../gfx/pixel';

export const TW = 480;

export interface Layer {
  cv: HTMLCanvasElement;
  f: number; // factor de parallax
  drift?: number; // desplazamiento propio (nubes)
}

export interface ThemeArt {
  layers: Layer[];
}

export interface Theme {
  id: string;
  name: string;
  emoji: string;
  night: boolean;
  /** color del interior oscuro del túnel / paleta para props */
  ground: string;
  build(H: number): ThemeArt;
}

export const geom = (H: number) => ({
  walkTop: H - 42,
  roadTop: H - 31,
  groundY: H - 12,
});

type R = ReturnType<typeof rng>;

// ---------------------------------------------------------------------------
// utilidades

function wrap(fn: (x: number) => void) {
  return (x: number) => {
    fn(x);
    fn(x - TW);
    fn(x + TW);
  };
}

function skyGrad(pb: PB, cols: string[], yEnd: number) {
  const n = cols.length;
  const bh = yEnd / n;
  for (let y = 0; y < pb.h; y++) {
    const fb = Math.min(y, yEnd - 1) / bh;
    const i = Math.min(n - 1, Math.floor(fb));
    const frac = fb - i;
    for (let x = 0; x < pb.w; x++) {
      let c = cols[i];
      if (i + 1 < n && ((frac > 0.82 && (x + y) % 2 === 0) || (frac > 0.92))) c = cols[i + 1];
      pb.set(x, y, c);
    }
  }
}

function stars(pb: PB, r: R, yMax: number, n: number) {
  for (let i = 0; i < n; i++) {
    const x = r.int(0, TW - 1), y = r.int(2, yMax);
    const big = r.f() < 0.15;
    pb.set(x, y, big ? '#ffffff' : r.pick(['#c8c8f0', '#f0f0ff', '#ffe8c0']));
    if (big) {
      pb.set(x - 1, y, '#8888c0'); pb.set(x + 1, y, '#8888c0');
      pb.set(x, y - 1, '#8888c0'); pb.set(x, y + 1, '#8888c0');
    }
  }
}

function sun(pb: PB, x: number, y: number, r: number, core: string, ring: string) {
  pb.disc(x, y, r + 2, ring);
  pb.disc(x, y, r, core);
  pb.disc(x - Math.round(r / 3), y - Math.round(r / 3), Math.max(1, r / 3), '#ffffff');
}

function moon(pb: PB, x: number, y: number) {
  pb.disc(x, y, 9, '#2a2c60');
  pb.disc(x, y, 7, '#f8f0c8');
  pb.disc(x + 3, y - 2, 6, '#383c78');
  pb.set(x - 4, y + 1, '#d8d0a8');
  pb.set(x - 2, y + 4, '#d8d0a8');
}

function cloudsLayer(H: number, r: R, n: number, cols: { b: string; s: string; o: string }) {
  const pb = new PB(TW, H);
  const { walkTop } = geom(H);
  for (let i = 0; i < n; i++) {
    const cx = r.int(0, TW - 1);
    const cy = r.int(14, Math.max(16, walkTop - 80));
    const w = r.int(18, 40);
    wrap((x) => {
      for (let k = 0; k < 4; k++) {
        const px = x + Math.round((k / 3) * w) - w / 2;
        const rad = k === 1 || k === 2 ? 7 + (k % 2) * 2 : 5;
        pb.disc(px, cy - (rad - 5), rad, cols.b);
      }
      pb.rect(x - w / 2 - 3, cy, w + 6, 5, cols.b);
      pb.rect(x - w / 2 - 2, cy + 3, w + 4, 2, cols.s);
    })(cx);
  }
  pb.outline(cols.o, true);
  return pb.canvas();
}

interface BPal { b: string; d: string; l: string }

function building(pb: PB, r: R, x: number, base: number, w: number, h: number, p: BPal, night: boolean) {
  const top = base - h;
  pb.rect(x, top, w, h, p.b);
  pb.rect(x + w - 3, top, 3, h, p.d);
  pb.rect(x, top, 2, h, p.l);
  // cornisa
  pb.rect(x - 1, top, w + 2, 2, p.d);
  pb.rect(x - 1, top, w + 2, 1, p.l);
  // ventanas
  const cols = Math.max(1, Math.floor((w - 6) / 9));
  const rows = Math.max(1, Math.floor((h - 12) / 12));
  const gx = Math.floor((w - cols * 9 + 3) / 2);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const wx = x + gx + i * 9, wy = top + 6 + j * 12;
      const lit = night ? r.f() < 0.45 : false;
      pb.rect(wx - 1, wy - 1, 8, 9, p.d);
      pb.rect(wx, wy, 6, 7, lit ? '#f8d870' : night ? '#202848' : '#4878a8');
      if (!night) {
        pb.rect(wx, wy, 6, 1, '#285880');
        pb.set(wx + 1, wy + 2, '#a8d8f8');
        pb.set(wx + 2, wy + 1, '#a8d8f8');
      } else if (lit) {
        pb.rect(wx, wy, 6, 1, '#c8a040');
      }
    }
  // cosas en el techo
  const k = r.int(0, 3);
  if (k === 0) {
    pb.rect(x + 4, top - 8, 7, 6, '#8a6040');
    pb.rect(x + 5, top - 2, 1, 2, '#5a4030');
    pb.rect(x + 9, top - 2, 1, 2, '#5a4030');
    pb.rect(x + 4, top - 9, 7, 1, '#a87850');
  } else if (k === 1) {
    pb.rect(x + w - 8, top - 10, 1, 10, '#606070');
    pb.set(x + w - 8, top - 11, night ? '#ff4040' : '#e03030');
  } else if (k === 2) {
    pb.rect(x + 3, top - 4, 9, 4, '#a0a0b0');
    pb.rect(x + 3, top - 4, 9, 1, '#c8c8d0');
  }
}

function skyline(pb: PB, r: R, base: number, col: string, win: string, minH: number, maxH: number, night: boolean) {
  let x = 0;
  while (x < TW) {
    const w = Math.min(r.int(12, 30), TW - x);
    const h = r.int(minH, maxH);
    wrap((xx) => {
      pb.rect(xx, base - h, w, h, col);
      if (r.f() < 0.4) pb.rect(xx + Math.floor(w / 2), base - h - 6, 1, 6, col);
    })(x);
    for (let j = base - h + 4; j < base - 3; j += 5)
      for (let i = x + 2; i < x + w - 2; i += 4)
        if (r.f() < (night ? 0.25 : 0.35)) pb.set(i, j, night ? r.pick(['#f8d870', '#e8c060', win]) : win);
    x += w;
  }
}

function pine(pb: PB, x: number, base: number, h: number, c: { d: string; b: string; l: string }) {
  pb.rect(x - 1, base - Math.round(h * 0.25), 3, Math.round(h * 0.25), '#5a3820');
  const tiers = 3;
  for (let t = 0; t < tiers; t++) {
    const tb = base - Math.round(h * 0.18) - t * Math.round(h * 0.24);
    const th = Math.round(h * 0.42);
    const tw = Math.round((h * 0.34) * (1 - t * 0.22));
    pb.poly([[x - tw, tb], [x + tw + 1, tb], [x + 0.5, tb - th]], c.b);
    pb.poly([[x + 1, tb], [x + tw + 1, tb], [x + 0.5, tb - th]], c.d);
    pb.line(x - tw + 1, tb - 1, x, tb - th + 1, c.l);
  }
}

function roundTree(pb: PB, x: number, base: number, h: number, c: { d: string; b: string; l: string }) {
  pb.rect(x - 1, base - h * 0.45, 3, h * 0.45, '#6a4428');
  pb.rect(x + 1, base - h * 0.45, 1, h * 0.45, '#4a2c18');
  const cy = base - h * 0.62;
  const rr = h * 0.3;
  pb.disc(x, cy, rr, c.d);
  pb.disc(x - 1, cy - 1, rr - 1, c.b);
  pb.disc(x - rr * 0.35, cy - rr * 0.35, rr * 0.35, c.l);
}

function palm(pb: PB, x: number, base: number, h: number, lean: number) {
  let px = x;
  for (let i = 0; i < h; i++) {
    px = x + Math.round(lean * (i / h) ** 2 * 10);
    pb.rect(px - 1, base - i, 3, 1, i % 4 < 2 ? '#b07840' : '#8a5830');
    pb.set(px + 1, base - i, '#6a4020');
  }
  const cx = px, cy = base - h;
  for (const [dir, droop, len] of [[-1, 0.25, 14], [1, 0.25, 14], [-1, 0.6, 11], [1, 0.6, 11], [-1, 0.05, 9], [1, 0.08, 10]]) {
    for (let t = 0; t <= len; t++) {
      const fx = cx + dir * t;
      const fy = cy - 3 + Math.round(t * t * droop * 0.08) - (t < 4 ? Math.round((4 - t) * 0.5) : 0);
      pb.set(fx, fy, '#2a8838');
      pb.set(fx, fy - 1, '#48b048');
      if (t % 2 === 0 && t > 2) pb.set(fx, fy + 1, '#1a6028');
    }
  }
  pb.disc(cx - 1, cy, 1, '#5a3418');
  pb.disc(cx + 1, cy + 1, 1, '#6a4020');
}

function umbrella(pb: PB, x: number, base: number, col: string) {
  pb.rect(x, base - 20, 1, 20, '#e8e8f0');
  for (let dx = -10; dx <= 10; dx++) {
    const t = Math.round(Math.sqrt(Math.max(0, 100 - dx * dx)) * 0.5);
    const c = Math.floor((dx + 10) / 4) % 2 === 0 ? col : '#ffffff';
    for (let y = 0; y <= t; y++) pb.set(x + dx, base - 20 - y, c);
    pb.set(x + dx, base - 20, '#c03040');
  }
}

function cactus(pb: PB, x: number, base: number, h: number) {
  const g = '#48a050', hl = '#70c868', sh = '#2c7838';
  pb.rect(x - 2, base - h, 5, h, g);
  pb.rect(x - 2, base - h, 1, h, hl);
  pb.rect(x + 2, base - h, 1, h, sh);
  pb.rect(x - 1, base - h - 1, 3, 1, g);
  // brazos
  const ay = base - Math.round(h * 0.55);
  pb.rect(x - 7, ay, 5, 3, g);
  pb.rect(x - 7, ay - 7, 3, 8, g);
  pb.rect(x - 7, ay - 7, 1, 8, hl);
  pb.rect(x + 3, ay + 3, 5, 3, g);
  pb.rect(x + 5, ay - 3, 3, 8, g);
  pb.rect(x + 7, ay - 3, 1, 8, sh);
  for (let y = base - h + 2; y < base; y += 4) pb.set(x, y, '#d8f0c0');
}

function lamp(pb: PB, x: number, base: number, h: number, night: boolean) {
  pb.rect(x, base - h, 2, h, '#404858');
  pb.rect(x, base - h, 1, h, '#5a6478');
  pb.rect(x - 1, base - 3, 4, 3, '#303848');
  pb.rect(x, base - h, 9, 2, '#404858');
  pb.rect(x + 6, base - h + 2, 5, 2, night ? '#fff0a0' : '#e8e8d0');
  pb.rect(x + 5, base - h + 1, 7, 1, '#303848');
}

function lampGlow(pb: PB, x: number, base: number, h: number, bottom: number) {
  const hx = x + 8, hy = base - h + 4;
  for (let y = hy; y < bottom; y++) {
    const k = (y - hy) / (bottom - hy);
    const half = Math.round(2 + k * 16);
    for (let dx = -half; dx <= half; dx++) {
      const t = 0.32 * (1 - k * 0.6) * (Math.abs(dx) > half - 2 ? 0.5 : 1);
      if ((dx + y) % 2 === 0 || t > 0.2) pb.mix(hx + dx, y, '#f8e090', t);
    }
  }
}

// ---------------------------------------------------------------------------
// carretera

interface RoadOpts {
  verge: 'walk' | 'boards' | 'grass' | 'sand';
  asphalt: string;
  asphaltD: string;
  asphaltL: string;
  line: string;
  night?: boolean;
}

function roadBase(H: number, r: R, o: RoadOpts) {
  const pb = new PB(TW, H);
  const { walkTop, roadTop } = geom(H);
  // banquina / vereda
  for (let y = walkTop; y < roadTop; y++)
    for (let x = 0; x < TW; x++) {
      let c = '#c8c8d0';
      switch (o.verge) {
        case 'walk':
          c = o.night ? '#4a4c68' : '#c8c8d4';
          if (x % 16 === 0 || y === walkTop + 5) c = o.night ? '#3a3c58' : '#a8a8b8';
          if (y === walkTop) c = o.night ? '#5a5c78' : '#e0e0e8';
          break;
        case 'boards':
          c = x % 8 === 0 ? '#8a5a30' : y === walkTop ? '#e0a868' : (x + y) % 11 === 0 ? '#b07840' : '#c89058';
          break;
        case 'grass':
          c = y === walkTop ? '#78d058' : (x * 7 + y * 3) % 13 === 0 ? '#3a9030' : '#58b040';
          break;
        case 'sand':
          c = y === walkTop ? '#f8d8a0' : (x * 5 + y * 7) % 11 === 0 ? '#d0a060' : '#e8c080';
          break;
      }
      pb.set(x, y, c);
    }
  // cordón
  pb.rect(0, roadTop - 2, TW, 2, o.night ? '#5a5c70' : '#9898a8');
  pb.rect(0, roadTop - 2, TW, 1, o.night ? '#7a7c90' : '#d0d0d8');
  // asfalto
  for (let y = roadTop; y < H; y++)
    for (let x = 0; x < TW; x++) {
      const n = (x * 13 + y * 7 + ((x * y) % 5)) % 17;
      pb.set(x, y, n === 0 ? o.asphaltL : n === 3 ? o.asphaltD : o.asphalt);
    }
  pb.rect(0, roadTop, TW, 1, o.asphaltD);
  // líneas
  for (let x = 0; x < TW; x += 40) pb.rect(x, roadTop + 5, 16, 2, o.line);
  pb.rect(0, H - 3, TW, 1, o.line);
  void r;
  return pb;
}

// ---------------------------------------------------------------------------
// temas

function city(night: boolean): Theme['build'] {
  return (H) => {
    const r = rng(night ? 77 : 42);
    const { walkTop, roadTop } = geom(H);
    const sky = new PB(TW, H);
    skyGrad(sky, night
      ? ['#080a24', '#10123a', '#181c4c', '#22245a', '#30306a']
      : ['#4aa0f0', '#62b2f8', '#80c4f8', '#a0d6fa', '#c4e8fa'], walkTop);
    if (night) {
      stars(sky, r, walkTop - 50, 70);
      moon(sky, 380, 30);
    } else sun(sky, 400, 34, 9, '#fff4a0', '#ffe070');

    const far = new PB(TW, H);
    skyline(far, r, walkTop, night ? '#1a2048' : '#a4c4e4', night ? '#283070' : '#c0d8f0', 30, Math.min(100, walkTop - 40), night);

    const mid = new PB(TW, H);
    const pals: BPal[] = night
      ? [
          { b: '#4a3040', d: '#30202c', l: '#5c3c4c' },
          { b: '#3a4058', d: '#282c40', l: '#4a5070' },
          { b: '#2c4848', d: '#1c3030', l: '#3a5c5c' },
          { b: '#483858', d: '#30243c', l: '#5a4870' },
        ]
      : [
          { b: '#d86848', d: '#a84830', l: '#f08868' },
          { b: '#e8c890', d: '#c0a068', l: '#f8e0b0' },
          { b: '#58a8a0', d: '#3a8078', l: '#80c8c0' },
          { b: '#e898a8', d: '#c07080', l: '#f8c0c8' },
          { b: '#9890d0', d: '#7068a8', l: '#b8b0e8' },
        ];
    let x = 0;
    while (x < TW - 30) {
      const w = r.int(34, 60);
      const ww = Math.min(w, TW - x - 4);
      if (ww < 24) break;
      const h = r.int(44, Math.min(116, walkTop - 30));
      const p = r.pick(pals);
      const seed = r.int(0, 1e6);
      wrap((xx) => building(mid, rng(seed), xx, walkTop + 2, ww, h, p, night))(x);
      x += ww + r.int(3, 8);
    }
    mid.outline(night ? '#0c0c1c' : '#2a2a40', true);

    const road = roadBase(H, r, {
      verge: 'walk', night,
      asphalt: night ? '#2a2a3a' : '#4c4c58', asphaltD: night ? '#202030' : '#40404c', asphaltL: night ? '#343448' : '#5c5c6a',
      line: night ? '#a8a8b8' : '#f0f0f0',
    });
    for (const lx of [40, 200, 360]) {
      wrap((xx) => lamp(road, xx, walkTop + 4, 58, night))(lx);
    }
    for (const tx of [120, 280, 440]) {
      wrap((xx) => {
        road.rect(xx - 5, walkTop + 1, 11, 4, night ? '#3a3040' : '#a07050');
        roundTree(road, xx, walkTop + 1, 34, night ? { d: '#12301c', b: '#1c4428', l: '#285838' } : { d: '#2a7838', b: '#3a9848', l: '#68c060' });
      })(tx);
    }
    wrap((xx) => {
      road.rect(xx, walkTop - 3, 5, 7, '#d02830');
      road.rect(xx - 1, walkTop - 1, 7, 2, '#d02830');
      road.rect(xx + 1, walkTop - 4, 3, 1, '#f04848');
    })(320);
    road.outline(night ? '#0c0c1c' : '#2a2a40', true);
    if (night) for (const lx of [40, 200, 360]) wrap((xx) => lampGlow(road, xx, walkTop + 4, 58, H))(lx);

    const layers: Layer[] = [
      { cv: sky.canvas(), f: 0.02 },
    ];
    if (!night) layers.push({ cv: cloudsLayer(H, r, 6, { b: '#ffffff', s: '#dceaf8', o: '#a8c8e8' }), f: 0.06, drift: 4 });
    layers.push({ cv: far.canvas(), f: 0.15 }, { cv: mid.canvas(), f: 0.45 }, { cv: road.canvas(), f: 1 });
    void roadTop;
    return { layers };
  };
}

function beach(H: number): ThemeArt {
  const r = rng(9);
  const { walkTop } = geom(H);
  const sky = new PB(TW, H);
  skyGrad(sky, ['#38a8f0', '#58bcf8', '#7ccef8', '#a0e0fc', '#c8f2ff'], walkTop);
  sun(sky, 120, 30, 10, '#fff8b0', '#ffe878');
  const sea = new PB(TW, H);
  const hz = walkTop - 34;
  for (let y = hz; y < walkTop + 2; y++)
    for (let x = 0; x < TW; x++) {
      const k = (y - hz) / 36;
      let c = y === hz ? '#c0ecfc' : k < 0.25 ? '#68c4ec' : k < 0.6 ? '#3ca0dc' : '#2884c8';
      sea.set(x, y, c);
    }
  for (let i = 0; i < 70; i++) {
    const x = r.int(0, TW - 1), y = r.int(hz + 3, walkTop - 1);
    sea.rect(x, y, r.int(2, 5), 1, y < hz + 12 ? '#a8e4fc' : '#d8f4ff');
  }
  // islita y velero
  sea.poly([[300, hz + 1], [318, hz - 9], [334, hz - 6], [352, hz + 1]], '#5aa058');
  sea.poly([[318, hz - 9], [326, hz - 8], [334, hz - 6], [326, hz - 4]], '#78c070');
  palm(sea, 326, hz - 4, 12, 0.6);
  sea.rect(150, hz + 4, 14, 3, '#f8f8f8');
  sea.rect(152, hz + 6, 10, 1, '#c03030');
  sea.poly([[157, hz + 3], [157, hz - 12], [166, hz + 2]], '#ffffff');
  sea.poly([[155, hz + 3], [155, hz - 8], [149, hz + 2]], '#f8d8d8');

  const mid = new PB(TW, H);
  for (let y = walkTop - 9; y < walkTop + 2; y++)
    for (let x = 0; x < TW; x++)
      mid.set(x, y, y === walkTop - 9 ? '#f8e8b0' : (x + y) % 7 === 0 ? '#e0c070' : '#f0d890');
  // espuma
  for (let x = 0; x < TW; x++) if ((x >> 3) % 2 === 0) mid.set(x, walkTop - 10, '#ffffff');
  for (const [px, h, lean] of [[40, 50, 1], [70, 38, -0.6], [250, 56, 0.8], [400, 44, -1]] as const)
    wrap((xx) => palm(mid, xx, walkTop - 3, h, lean))(px);
  for (const [ux, col] of [[140, '#e83848'], [320, '#3878e0'], [460, '#f0a020']] as const)
    wrap((xx) => {
      umbrella(mid, xx, walkTop - 2, col);
      mid.rect(xx + 3, walkTop - 4, 12, 2, r.pick(['#ff70a0', '#60c0f0', '#a0e060']));
    })(ux);
  wrap((xx) => {
    mid.rect(xx, walkTop - 22, 22, 18, '#f8f0e0');
    mid.rect(xx, walkTop - 22, 22, 18, '#f8f0e0');
    for (let i = 0; i < 22; i += 4) mid.rect(xx + i, walkTop - 22, 2, 18, '#60b0e0');
    mid.poly([[xx - 3, walkTop - 22], [xx + 25, walkTop - 22], [xx + 11, walkTop - 32]], '#e05050');
    mid.rect(xx + 8, walkTop - 14, 6, 10, '#8a5a30');
  })(190);
  mid.outline('#2a3040', true);

  const road = roadBase(H, r, { verge: 'boards', asphalt: '#50505c', asphaltD: '#444450', asphaltL: '#60606c', line: '#f8f0d0' });
  for (let x = 0; x < TW; x += 24) {
    wrap((xx) => {
      road.rect(xx, walkTop - 8, 2, 10, '#8a5a30');
      road.rect(xx, walkTop - 8, 1, 10, '#b07840');
    })(x);
  }
  for (let x = 0; x < TW; x++) road.set(x, walkTop - 6 + Math.round(Math.sin((x % 24) / 24 * Math.PI) * 2), '#e8d8b0');
  road.outline('#2a3040', true);
  return {
    layers: [
      { cv: sky.canvas(), f: 0.02 },
      { cv: cloudsLayer(H, r, 4, { b: '#ffffff', s: '#e0f0fc', o: '#a8d0ec' }), f: 0.05, drift: 3 },
      { cv: sea.canvas(), f: 0.12 },
      { cv: mid.canvas(), f: 0.45 },
      { cv: road.canvas(), f: 1 },
    ],
  };
}

function forest(H: number): ThemeArt {
  const r = rng(5);
  const { walkTop } = geom(H);
  const sky = new PB(TW, H);
  skyGrad(sky, ['#4aa4e8', '#62b4f0', '#82c6f0', '#a4d6f0', '#c4e6f0'], walkTop);
  sun(sky, 300, 30, 8, '#fff8b0', '#ffe878');
  const far = new PB(TW, H);
  const mountains = (base: number, col: string, hi: string, snow: boolean, n: number, hmin: number, hmax: number) => {
    for (let i = 0; i < n; i++) {
      const cx = Math.round((i + r.f() * 0.5) * (TW / n));
      const h = r.int(hmin, hmax), w = Math.round(h * 1.4);
      wrap((xx) => {
        far.poly([[xx - w, base], [xx + w, base], [xx, base - h]], col);
        far.poly([[xx - w, base], [xx, base - h], [xx - w * 0.3, base]], hi);
        if (snow) far.poly([[xx - h * 0.25, base - h * 0.75], [xx + h * 0.27, base - h * 0.75], [xx, base - h]], '#f0f6ff');
      })(cx);
    }
  };
  mountains(walkTop, '#90b0d4', '#a4c0e0', true, 4, 50, Math.min(90, walkTop - 30));
  mountains(walkTop, '#6c90b8', '#7ca0c8', false, 6, 30, 50);
  const mid = new PB(TW, H);
  mid.rect(0, walkTop - 6, TW, 8, '#2a6838');
  const pals = [
    { d: '#1a5030', b: '#2a7040', l: '#3a9050' },
    { d: '#145028', b: '#1e6434', l: '#34844a' },
    { d: '#2a5a28', b: '#3a7a34', l: '#58a048' },
  ];
  for (let i = 0; i < 26; i++) {
    const x = Math.round((i / 26) * TW + r.int(-5, 5));
    const h = r.int(40, Math.min(92, walkTop - 30));
    const p = r.pick(pals);
    wrap((xx) => pine(mid, xx, walkTop - 2, h, p))(x);
  }
  mid.outline('#0c2418', true);
  const road = roadBase(H, r, { verge: 'grass', asphalt: '#4c4c58', asphaltD: '#40404c', asphaltL: '#5c5c6a', line: '#f0f0f0' });
  // cerca
  for (let x = 0; x < TW; x += 16)
    wrap((xx) => {
      road.rect(xx, walkTop - 9, 3, 12, '#a87040');
      road.rect(xx, walkTop - 9, 1, 12, '#c89058');
    })(x);
  road.rect(0, walkTop - 6, TW, 2, '#c89058');
  road.rect(0, walkTop - 1, TW, 2, '#a87040');
  // flores, hongos, arbustos
  for (let i = 0; i < 18; i++) {
    const x = r.int(0, TW - 1), y = walkTop + r.int(2, 7);
    const c = r.pick(['#f04060', '#f8d020', '#ffffff', '#a060f0']);
    wrap((xx) => {
      road.set(xx, y, c);
      road.set(xx, y + 1, '#2a7028');
    })(x);
  }
  for (const mx of [60, 260, 410])
    wrap((xx) => {
      road.rect(xx - 1, walkTop + 2, 3, 4, '#f0e8d8');
      road.rect(xx - 3, walkTop - 1, 7, 3, '#e03030');
      road.set(xx - 1, walkTop - 1, '#ffffff');
      road.set(xx + 2, walkTop, '#ffffff');
    })(mx);
  for (const bx of [150, 330])
    wrap((xx) => {
      road.disc(xx, walkTop - 2, 7, '#2a7838');
      road.disc(xx + 7, walkTop, 5, '#3a9848');
      road.disc(xx - 2, walkTop - 4, 3, '#68c060');
    })(bx);
  road.outline('#1a3020', true);
  return {
    layers: [
      { cv: sky.canvas(), f: 0.02 },
      { cv: cloudsLayer(H, r, 5, { b: '#ffffff', s: '#dceaf8', o: '#a8c8e8' }), f: 0.06, drift: 4 },
      { cv: far.canvas(), f: 0.12 },
      { cv: mid.canvas(), f: 0.45 },
      { cv: road.canvas(), f: 1 },
    ],
  };
}

function desert(H: number): ThemeArt {
  const r = rng(13);
  const { walkTop } = geom(H);
  const sky = new PB(TW, H);
  skyGrad(sky, ['#e87848', '#f09058', '#f8a868', '#fcc480', '#ffe0a8'], walkTop);
  sun(sky, 200, 44, 13, '#fff0b0', '#ffd070');
  const far = new PB(TW, H);
  for (const [cx, w, h] of [[60, 50, 46], [200, 36, 60], [330, 70, 38], [440, 30, 52]] as const) {
    wrap((xx) => {
      far.poly([[xx - w / 2 - 8, walkTop], [xx - w / 2, walkTop - h], [xx + w / 2, walkTop - h], [xx + w / 2 + 8, walkTop]], '#c86848');
      for (let y = walkTop - h + 6; y < walkTop; y += 7) far.rect(xx - w / 2 - 3, y, w + 6, 2, '#b05838');
      far.rect(xx - w / 2, walkTop - h, w, 2, '#e08860');
      far.poly([[xx + w / 2 - 6, walkTop - h], [xx + w / 2, walkTop - h], [xx + w / 2 + 8, walkTop], [xx + w / 2 - 2, walkTop]], '#a04c34');
    })(cx);
  }
  const mid = new PB(TW, H);
  for (let x = 0; x < TW; x++) {
    const h = Math.round(14 + Math.sin((x / TW) * Math.PI * 4) * 7 + Math.sin((x / TW) * Math.PI * 10) * 3);
    for (let y = walkTop - h; y < walkTop + 2; y++) {
      const crest = y - (walkTop - h);
      mid.set(x, y, crest === 0 ? '#f8d890' : crest < 3 ? '#f0c070' : (x + y) % 9 === 0 ? '#d09048' : '#e8b060');
    }
  }
  for (const [cx, h] of [[80, 34], [300, 26], [420, 40]] as const) wrap((xx) => cactus(mid, xx, walkTop - 4, h))(cx);
  mid.outline('#5a3020', true);
  const road = roadBase(H, r, { verge: 'sand', asphalt: '#5a4e4c', asphaltD: '#4c4240', asphaltL: '#6a5e5a', line: '#f8e8a0' });
  for (const [cx, h] of [[30, 18], [250, 14]] as const) wrap((xx) => cactus(road, xx, walkTop + 3, h))(cx);
  for (const rx of [120, 190, 380])
    wrap((xx) => {
      road.disc(xx, walkTop + 2, 4, '#9a7a68');
      road.disc(xx - 1, walkTop + 1, 2, '#c0a090');
      road.rect(xx - 4, walkTop + 3, 9, 3, '#9a7a68');
    })(rx);
  road.outline('#3a2418', true);
  return {
    layers: [
      { cv: sky.canvas(), f: 0.02 },
      { cv: cloudsLayer(H, r, 3, { b: '#fff4e0', s: '#f8d8b0', o: '#e8a878' }), f: 0.05, drift: 2 },
      { cv: far.canvas(), f: 0.12 },
      { cv: mid.canvas(), f: 0.4 },
      { cv: road.canvas(), f: 1 },
    ],
  };
}

export const THEMES: Theme[] = [
  { id: 'ciudad', name: 'Ciudad', emoji: '🏙️', night: false, ground: '#6a6a78', build: city(false) },
  { id: 'playa', name: 'Playa', emoji: '🏖️', night: false, ground: '#c8a068', build: beach },
  { id: 'bosque', name: 'Bosque', emoji: '🌲', night: false, ground: '#4a8040', build: forest },
  { id: 'desierto', name: 'Desierto', emoji: '🌵', night: false, ground: '#c88050', build: desert },
  { id: 'noche', name: 'Ciudad de noche', emoji: '🌙', night: true, ground: '#3a3a50', build: city(true) },
];

export const themeById = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];
