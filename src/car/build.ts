// Compositor: arma el sprite del coche a partir de la configuración y
// expone los "enchufes" (sockets) para efectos dinámicos.
import { PB } from '../gfx/pixel';
import { paint, Ramp, METAL, DARKMETAL, RUBBER, GLASS, SKIN, HAIR, WELL } from '../gfx/palette';
import {
  CarConfig, HalfDef, CabinDef, WheelDef, FRONTS, REARS, CABINS, WHEELS, findById, cabinTop, DECK,
} from './parts';

export const BW = 168;
export const BH = 116;
export const OX = 84;
export const OY = 70;

export interface WheelInst {
  x: number; // relativo a la costura
  r: number;
  frames: HTMLCanvasElement[];
}

export interface BuiltCar {
  cfg: CarConfig;
  body: HTMLCanvasElement;
  /** filas por debajo del piso hasta el suelo */
  ground: number;
  wheels: WheelInst[];
  light: { x: number; y: number; style: string };
  tail: { x: number; y: number };
  antenna: { x: number; y: number; type: string; ramp: Ramp };
  roof: { x: number; y: number; type: string };
  exhaust: { x: number; y: number } | null;
  frontExt: number;
  rearExt: number;
  topY: number;
  cabinMid: { x: number; y: number };
  horn: number;
}

// ---------------------------------------------------------------------------
// Ruedas

const wheelCache = new Map<string, HTMLCanvasElement[]>();
const WHEEL_FRAMES = 16;

function wheelFrame(w: WheelDef, ramp: Ramp, angle: number): HTMLCanvasElement {
  const r = w.r;
  const s = 2 * r + 5;
  const c = r + 2;
  const pb = new PB(s, s);
  // goma
  for (let dy = -r - 1; dy <= r + 1; dy++)
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r + 0.35) continue;
      const lightSide = (-dx - dy) / (r * 1.41);
      let col = RUBBER.b;
      if (dist > r - 1.3) col = lightSide > 0.35 ? RUBBER.l : lightSide < -0.4 ? RUBBER.d : RUBBER.b;
      pb.set(c + dx, c + dy, col);
    }
  // banda blanca
  const rr = Math.max(2, Math.round(r * w.rimK));
  if (w.tire === 'banda') {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > rr + 0.6 && dist <= rr + 2.2) pb.set(c + dx, c + dy, dist > rr + 1.6 ? '#c8c8d0' : '#f4f4f8');
      }
  }
  // tacos (giran con la rueda)
  if (w.tire === 'tacos') {
    const n = Math.round(r * 1.5);
    for (let k = 0; k < n; k++) {
      const a = angle + (k * Math.PI * 2) / n;
      const cx = Math.cos(a), sy = Math.sin(a);
      pb.set(c + cx * (r + 0.9), c + sy * (r + 0.9), RUBBER.l);
      pb.set(c + cx * (r - 1.2), c + sy * (r - 1.2), RUBBER.o);
    }
  } else {
    // pequeña marca para que se note el giro
    const a = angle + 0.4;
    pb.set(c + Math.cos(a) * (r - 1), c + Math.sin(a) * (r - 1), RUBBER.h);
  }
  // llanta
  const rim = (rad: number, col: string) => pb.disc(c, c, rad, col);
  const spokes = (n: number, col: string, wide: boolean, len = rr) => {
    for (let k = 0; k < n; k++) {
      const a = angle + (k * Math.PI * 2) / n;
      const ex = c + Math.cos(a) * len, ey = c + Math.sin(a) * len;
      pb.line(c, c, ex, ey, col);
      if (wide) pb.line(c + Math.cos(a + 0.35), c + Math.sin(a + 0.35), ex, ey, col);
    }
  };
  switch (w.rim) {
    case 'tapa': {
      rim(rr, ramp.d);
      rim(rr - 1, ramp.b);
      for (let k = 0; k < 4; k++) {
        const a = angle + (k * Math.PI) / 2;
        pb.set(c + Math.cos(a) * rr * 0.55, c + Math.sin(a) * rr * 0.55, ramp.d);
      }
      pb.set(c - 1, c - 1, ramp.h);
      break;
    }
    case 'rayos':
      rim(rr, ramp.o);
      spokes(5, ramp.l, true, rr - 0.5);
      for (let dy = -rr; dy <= rr; dy++)
        for (let dx = -rr; dx <= rr; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > rr - 0.8 && d <= rr + 0.4) pb.set(c + dx, c + dy, dx + dy < 0 ? ramp.l : ramp.b);
        }
      break;
    case 'radios':
      rim(rr, '#20202a');
      spokes(8, METAL.l, false, rr);
      for (let dy = -rr - 1; dy <= rr + 1; dy++)
        for (let dx = -rr - 1; dx <= rr + 1; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > rr - 0.6 && d <= rr + 0.6) pb.set(c + dx, c + dy, ramp.b);
        }
      break;
    case 'estrella': {
      rim(rr, ramp.d);
      const pts: [number, number][] = [];
      for (let k = 0; k < 10; k++) {
        const a = angle - Math.PI / 2 + (k * Math.PI) / 5;
        const rad = k % 2 === 0 ? rr - 0.2 : rr * 0.42;
        pts.push([c + 0.5 + Math.cos(a) * rad, c + 0.5 + Math.sin(a) * rad]);
      }
      pb.poly(pts, ramp.l);
      break;
    }
    case 'espiral': {
      rim(rr, '#ffffff');
      for (let arm = 0; arm < 2; arm++)
        for (let t = 0; t <= 1; t += 0.02) {
          const a = angle + arm * Math.PI + t * Math.PI * 3;
          const rad = t * (rr - 0.4);
          pb.set(c + Math.cos(a) * rad, c + Math.sin(a) * rad, ramp.b);
          pb.set(c + Math.cos(a) * rad + 0.6, c + Math.sin(a) * rad, ramp.b);
        }
      for (let dy = -rr - 1; dy <= rr + 1; dy++)
        for (let dx = -rr - 1; dx <= rr + 1; dx++) {
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d > rr - 0.6 && d <= rr + 0.5) pb.set(c + dx, c + dy, ramp.d);
        }
      break;
    }
    case 'agujeros': {
      rim(rr, ramp.b);
      for (let dy = -rr; dy <= rr; dy++)
        for (let dx = -rr; dx <= rr; dx++)
          if (dx * dx + dy * dy <= rr * rr && dx + dy < -rr * 0.6) pb.set(c + dx, c + dy, ramp.l);
      const n = rr >= 6 ? 6 : 4;
      for (let k = 0; k < n; k++) {
        const a = angle + (k * Math.PI * 2) / n;
        const hx = c + Math.cos(a) * rr * 0.58, hy = c + Math.sin(a) * rr * 0.58;
        pb.disc(hx, hy, rr >= 6 ? 1.1 : 0.6, '#18181f');
      }
      break;
    }
    case 'plato':
      rim(rr, ramp.b);
      for (let dy = -rr; dy <= rr; dy++)
        for (let dx = -rr; dx <= rr; dx++)
          if (dx * dx + dy * dy <= rr * rr && dx + dy < -rr * 0.7) pb.set(c + dx, c + dy, ramp.l);
      for (let k = 0; k < 5; k++) {
        const a = angle + (k * Math.PI * 2) / 5;
        pb.set(c + Math.cos(a) * rr * 0.55, c + Math.sin(a) * rr * 0.55, ramp.d);
      }
      break;
  }
  pb.disc(c, c, r >= 12 ? 1.4 : 1, METAL.d);
  pb.set(c, c, METAL.h);
  pb.outline(RUBBER.o);
  return pb.canvas();
}

export function wheelFrames(w: WheelDef, colorId: string): HTMLCanvasElement[] {
  const key = w.id + '|' + colorId;
  let f = wheelCache.get(key);
  if (!f) {
    f = [];
    const ramp = paint(colorId);
    for (let i = 0; i < WHEEL_FRAMES; i++) f.push(wheelFrame(w, ramp, (i / WHEEL_FRAMES) * Math.PI * 2));
    wheelCache.set(key, f);
  }
  return f;
}

// ---------------------------------------------------------------------------
// Carrocería

function shadeColumn(pb: PB, X: number, top: number, bot: number, r: Ramp, edge: boolean) {
  for (let y = top; y < bot; y++) {
    const rel = y - top, fb = bot - 1 - y;
    let c = r.b;
    if (rel === 0) c = r.h;
    else if (rel === 1) c = r.l;
    else if (fb <= 1) c = r.d;
    else if (fb === 2) c = (X + y) & 1 ? r.d : r.b;
    else if (y === -6 && top < -9) c = r.d; // línea de puerta
    else if (y === -5 && top < -9) c = r.l;
    if (edge && c === r.b) c = (X + y) & 1 ? r.d : r.b;
    pb.set(X, OY + y, c);
  }
}

function drawHalf(def: HalfDef, ramp: Ramp, dir: 1 | -1): PB {
  const pb = new PB(BW, BH);
  const X = (d: number) => (dir === 1 ? OX + d : OX - 1 - d);
  for (let d = 0; d < def.L; d++) {
    const top = def.top(d);
    const bot = def.bot ? def.bot(d) : 0;
    shadeColumn(pb, X(d), top, bot, ramp, d >= def.L - 1);
  }
  // detalles por tipo
  if (def.kind === 'pickup') {
    for (let d = 22; d < def.L - 2; d++) pb.set(X(d), OY - 11, ramp.d);
    for (let y = -12; y < -1; y++) pb.set(X(def.L - 4), OY + y, ramp.d);
  }
  if (def.kind === 'furgon') {
    for (let y = -30; y < -1; y++) pb.set(X(33), OY + y, ramp.d);
    pb.rect(X(36) - 2, OY - 17, 3, 1, METAL.d);
    // ventanita
    for (let d = 23; d < 31; d++) for (let y = -28; y < -22; y++) pb.set(X(d), OY + y, y === -28 ? GLASS.d : GLASS.b);
  }
  if (def.kind === 'truck') {
    // parrilla
    for (let y = -17; y < -3; y++) {
      pb.set(X(def.L - 1), OY + y, y % 2 ? METAL.l : METAL.d);
      pb.set(X(def.L - 2), OY + y, y % 2 ? METAL.b : METAL.o);
    }
    pb.rect(X(def.L - 3), OY - 3, 4, 3, DARKMETAL.b);
    for (let d = 22; d < def.L - 3; d += 4) pb.set(X(d), OY - 15, ramp.d);
  }
  if (def.kind === 'shark') {
    // boca con dientes
    for (let d = 36; d < def.L - 1; d++) {
      const b = def.bot ? def.bot(d) : 0;
      pb.set(X(d), OY + b - 4, ramp.o);
      pb.set(X(d), OY + b - 3, '#ffffff');
      if (d % 2 === 0) pb.set(X(d), OY + b - 2, '#ffffff');
      else pb.set(X(d), OY + b - 2, '#8a1020');
    }
    // agallas
    for (const d of [25, 28, 31]) for (let y = -11; y < -6; y++) pb.set(X(d), OY + y, ramp.d);
  }
  if (def.kind === 'bus') {
    pb.rect(X(def.L - 1), OY - 2, 2, 2, DARKMETAL.b);
    for (let d = 2; d < def.L - 2; d += 6) pb.set(X(d), OY - 10, ramp.l);
  }
  if (def.kind === 'volquete') {
    for (let d = 20; d < def.L; d++) pb.set(X(d), OY - 13, ramp.o);
    for (let d = 26; d < def.L - 2; d += 7) for (let y = -27; y < -13; y++) pb.set(X(d), OY + y, ramp.d);
    for (let d = 21; d < def.L; d++) pb.set(X(d), OY - 26, ramp.l);
    pb.rect(X(def.L - 1) - (dir === 1 ? 0 : 1), OY - 12, 2, 12, DARKMETAL.b);
  }
  if (def.kind === 'fin') {
    for (let d = 31; d < def.L - 1; d++) pb.set(X(d), OY + def.top(d) + 2, ramp.l);
  }
  if (def.kind === 'limo') {
    // puerta trasera extra con manija (sin ventanas)
    for (let y = -12; y < -2; y++) pb.set(X(34), OY + y, ramp.d);
    pb.rect(X(31) - 1, OY - 10, 3, 1, METAL.l);
    pb.rect(X(31) - 1, OY - 9, 3, 1, METAL.d);
  }
  if (def.kind === 'jeep') {
    for (let y = -11; y < -3; y += 2) pb.set(X(def.L - 1), OY + y, ramp.o);
  }
  return pb;
}

function cutWell(pb: PB, cx: number, r: number, ramp: Ramp, mark?: Set<number>) {
  const axle = r - 9;
  const R = r + 1.5;
  for (let y = -16; y < 0; y++)
    for (let x = Math.floor(cx - R - 2); x <= cx + R + 2; x++) {
      if (!pb.has(x, OY + y)) continue;
      const d = Math.hypot(x - cx, y - axle);
      if (d <= R) pb.set(x, OY + y, WELL);
      else if (d <= R + 1) pb.set(x, OY + y, ramp.d);
      else continue;
      mark?.add((OY + y) * BW + x);
    }
}

function decalLayer(cfg: CarConfig, F: HalfDef, R: HalfDef): PB {
  const pb = new PB(BW, BH);
  const ramp = paint(cfg.colors.decal);
  const fx = (d: number) => OX + d;
  switch (cfg.decal) {
    case 'franja':
      for (let x = OX - R.L; x < OX + F.L; x++) {
        pb.set(x, OY - 9, ramp.b);
        pb.set(x, OY - 8, ramp.b);
      }
      break;
    case 'numero': {
      const cx = OX + 8, cy = OY - 7;
      pb.disc(cx, cy, 5.5, ramp.o === '#282838' ? '#202030' : ramp.d);
      pb.disc(cx, cy, 4.6, '#f8f8f8');
      const n = Math.max(0, Math.min(9, cfg.number ?? 7));
      DIGITS[n].forEach((row, j) =>
        [...row].forEach((ch, i) => ch === '#' && pb.set(cx - 2 + i, cy - 3 + j, cfg.colors.decal === 'blanco' ? '#d02030' : ramp.d)),
      );
      break;
    }
    case 'llamas': {
      // lenguas de fuego horizontales: nacen en la trompa y terminan en punta sobre la puerta
      const cols = ['#a80c10', '#e82818', '#ff8a10', '#ffd820', '#fff6b0'];
      const P = 3.4;
      for (let d = -2; d < F.L + 2; d++) {
        const dist = F.L - d;
        for (let y = -13; y <= -2; y++) {
          const ph = ((((y + 13 + dist * 0.06) / P) % 1) + 1) % 1;
          const tri = 1 - Math.abs(2 * ph - 1);
          const len = 16 + 32 * Math.pow(tri, 1.25);
          if (dist >= len) continue;
          const k = dist / len;
          pb.set(fx(d), OY + y, cols[k > 0.86 ? 0 : k > 0.66 ? 1 : k > 0.4 ? 2 : k > 0.16 ? 3 : 4]);
        }
      }
      break;
    }
    case 'rayo': {
      const pts: [number, number][] = [
        [OX - 30, OY - 9], [OX - 2, OY - 11], [OX - 4, OY - 7], [OX + 30, OY - 9],
        [OX + 2, OY - 4], [OX + 4, OY - 8],
      ];
      pb.poly(pts, ramp.b);
      break;
    }
    case 'lunares':
      for (let x = OX - R.L + 4; x < OX + F.L - 2; x += 7)
        for (let y = OY - 12; y < OY - 1; y += 6) pb.disc(x + (((y / 6) | 0) % 2) * 3, y, 1.2, ramp.b);
      break;
    case 'estrellas':
      for (const [x, y] of [[-34, -9], [-18, -6], [-4, -9], [12, -6], [26, -9]]) {
        const cx = OX + x, cy = OY + y;
        pb.set(cx, cy - 2, ramp.l); pb.set(cx, cy + 2, ramp.l);
        pb.rect(cx - 2, cy, 5, 1, ramp.l); pb.rect(cx - 1, cy - 1, 3, 3, ramp.h);
      }
      break;
  }
  return pb;
}

const DIGITS = [
  ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
];

function applyMask(target: PB, decal: PB, skip: Set<number>) {
  for (let i = 0; i < target.d.length; i++) {
    if (skip.has(i)) continue;
    if ((target.d[i] >>> 24) > 0 && (decal.d[i] >>> 24) > 0) target.d[i] = decal.d[i];
  }
}

function drawCabin(def: CabinDef, ramp: Ramp): PB {
  const pb = new PB(BW, BH);
  if (def.special === 'casco') {
    for (let x = def.x0; x <= def.x1; x++) shadeColumn(pb, OX + x, -17, DECK, ramp, false);
    // arco de seguridad
    pb.rect(OX - 8, OY - 27, 2, 10, METAL.d);
    pb.rect(OX - 8, OY - 27, 1, 10, METAL.l);
    // piloto con casco
    pb.rect(OX - 3, OY - 21, 7, 4, '#202030');
    pb.disc(OX + def.headX, OY - 24, 3.6, ramp.b);
    pb.disc(OX + def.headX - 1, OY - 25, 1.6, ramp.l);
    pb.rect(OX + def.headX + 1, OY - 25, 3, 2, '#1a2838');
    pb.set(OX + def.headX + 2, OY - 25, '#80c8f0');
    pb.rect(OX + def.headX - 3, OY - 22, 7, 1, '#ffffff');
    // volante y parabrisas chico
    pb.line(OX + 6, OY - 21, OX + 8, OY - 18, '#202028');
    pb.poly([[OX + 11, OY - 21], [OX + 12, OY - 21], [OX + 15, OY - 17], [OX + 13, OY - 17]], GLASS.l);
    pb.outline(ramp.o);
    return pb;
  }
  if (def.special === 'convertible') {
    for (let x = def.x0; x <= def.x1; x++) shadeColumn(pb, OX + x, -17, DECK, ramp, false);
    // asiento
    pb.rect(OX - 9, OY - 25, 4, 8, '#7a3418');
    pb.rect(OX - 9, OY - 25, 1, 8, '#a85030');
    // conductor
    pb.rect(OX - 2, OY - 21, 7, 4, '#3060c0');
    pb.disc(OX + def.headX, OY - 24, 3, SKIN.b);
    pb.rect(OX + def.headX - 3, OY - 27, 6, 2, HAIR);
    pb.set(OX + def.headX - 3, OY - 25, HAIR);
    pb.set(OX + def.headX + 2, OY - 24, '#202028');
    // bufanda
    pb.rect(OX + def.headX - 5, OY - 21, 4, 1, '#ff4060');
    // volante
    pb.line(OX + 7, OY - 21, OX + 9, OY - 18, '#202028');
    // parabrisas
    pb.poly([[OX + 10, OY - 25], [OX + 12, OY - 25], [OX + 15, OY - 17], [OX + 13, OY - 17]], GLASS.l);
    pb.line(OX + 10, OY - 25, OX + 13, OY - 17, METAL.d);
    pb.outline(ramp.o);
    return pb;
  }
  for (let x = def.x0; x <= def.x1; x++) {
    const t = cabinTop(def, x);
    if (t >= DECK) continue;
    shadeColumn(pb, OX + x, t, DECK, ramp, false);
  }
  // ventanas
  const win = new Set<number>();
  const wb = -18;
  for (const [xa, xb] of def.windows) {
    for (let x = xa; x <= xb; x++) {
      const wt = def.thinFrame ? cabinTop(def, x) + 1 : Math.max(cabinTop(def, x - 2), cabinTop(def, x), cabinTop(def, x + 2)) + 2;
      if (wt > wb) continue;
      for (let y = wt; y <= wb; y++) {
        let c = GLASS.b;
        if (y === wt) c = GLASS.d;
        else if (x === xa) c = GLASS.d;
        else if (((x - y) % 9 + 9) % 9 < 2) c = GLASS.l;
        pb.set(OX + x, OY + y, c);
        win.add(x * 1000 + (y + 500));
      }
    }
  }
  // cabecita del conductor dentro de la ventana delantera
  const hx = def.headX, hy = wb - 2;
  const inWin = (x: number, y: number) => win.has(x * 1000 + (y + 500));
  for (let dy = -4; dy <= 3; dy++)
    for (let dx = -3; dx <= 3; dx++) {
      const x = hx + dx, y = hy + dy;
      if (!inWin(x, y)) continue;
      const d2 = dx * dx + (dy + 0.5) * (dy + 0.5);
      if (d2 > 11) continue;
      let c = SKIN.b;
      if (dy <= -2 || (dx <= -2 && dy <= 0)) c = HAIR;
      if (dx === 2 && dy === -1) c = '#202028';
      if (dx === 2 && dy === 1) c = SKIN.d;
      pb.set(OX + x, OY + y, c);
    }
  // reflejo
  for (const [xa] of def.windows) pb.set(OX + xa + 2, OY + wb - 3, GLASS.h);
  pb.outline(ramp.o);
  return pb;
}

function drawHeadlight(pb: PB, style: string, x: number, y: number, ramp: Ramp) {
  const lens = '#f4ecc8';
  switch (style) {
    case 'cuadrado':
      pb.rect(x - 2, y - 2, 4, 4, METAL.o);
      pb.rect(x - 1, y - 1, 3, 2, lens);
      pb.set(x - 1, y - 1, '#ffffff');
      break;
    case 'doble':
      pb.rect(x - 1, y - 4, 3, 3, METAL.o);
      pb.rect(x - 1, y + 0, 3, 3, METAL.o);
      pb.set(x, y - 3, lens);
      pb.set(x, y + 1, lens);
      break;
    case 'ojitos':
      pb.disc(x, y - 1, 3, '#202028');
      pb.disc(x, y - 1, 2.2, '#ffffff');
      pb.rect(x + 1, y - 1, 2, 2, '#101018');
      pb.set(x + 1, y - 1, '#ffffff');
      pb.rect(x - 2, y - 4, 5, 1, ramp.d);
      break;
    case 'rayo':
      pb.poly([[x - 5, y + 2], [x + 0, y - 2], [x + 4, y - 2], [x - 1, y + 2]], METAL.o);
      pb.poly([[x - 3, y + 1], [x + 0, y - 1], [x + 2, y - 1], [x - 1, y + 1]], lens);
      break;
    case 'enojados':
      pb.disc(x, y - 1, 3, '#202028');
      pb.disc(x, y - 1, 2.2, '#ffffff');
      pb.rect(x + 1, y - 1, 2, 2, '#101018');
      pb.set(x + 1, y - 1, '#ffffff');
      pb.line(x - 3, y - 5, x + 3, y - 3, '#101018');
      pb.line(x - 3, y - 4, x + 3, y - 2, '#101018');
      pb.line(x - 3, y - 6, x + 3, y - 4, ramp.d);
      break;
    case 'estrella': {
      const tmp = new PB(BW, BH);
      const pts: [number, number][] = [];
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        const rad = k % 2 === 0 ? 4 : 1.8;
        pts.push([x + 0.5 + Math.cos(a) * rad, y + 0.5 + Math.sin(a) * rad]);
      }
      tmp.poly(pts, '#f8d020');
      tmp.set(x, y, '#ffffff');
      tmp.set(x, y - 1, '#fff8c0');
      tmp.outline('#3a2a06');
      pb.blit(tmp);
      break;
    }
    case 'corazon': {
      const H = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
      const tmp = new PB(BW, BH);
      H.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && tmp.set(x - 3 + i, y - 3 + j, '#f03060')));
      tmp.set(x - 2, y - 2, '#ffb0c0');
      tmp.set(x - 1, y - 2, '#ff7090');
      tmp.outline('#3a0a18');
      pb.blit(tmp);
      break;
    }
    default:
      pb.disc(x, y, 2, METAL.o);
      pb.disc(x, y, 1, lens);
      pb.set(x - 1, y - 1, '#ffffff');
  }
}

function drawRoofItem(pb: PB, type: string, x: number, y: number, acc: Ramp) {
  // y = primera fila por encima del techo
  switch (type) {
    case 'sirena':
      pb.rect(x - 3, y - 1, 7, 2, DARKMETAL.b);
      pb.rect(x - 2, y - 4, 2, 3, '#c01828');
      pb.rect(x, y - 4, 1, 3, '#d8d8e8');
      pb.rect(x + 1, y - 4, 2, 3, '#1840c0');
      pb.set(x - 2, y - 4, '#ff8090');
      pb.set(x + 1, y - 4, '#80a0ff');
      break;
    case 'equipaje':
      pb.rect(x - 10, y, 21, 1, METAL.d);
      pb.rect(x - 9, y - 6, 11, 6, '#8a5028');
      pb.rect(x - 9, y - 6, 11, 1, '#b87040');
      pb.rect(x - 6, y - 6, 1, 6, '#3a2010');
      pb.rect(x - 1, y - 6, 1, 6, '#3a2010');
      pb.rect(x - 5, y - 8, 4, 1, '#3a2010');
      pb.rect(x + 3, y - 4, 6, 4, acc.b);
      pb.rect(x + 3, y - 4, 6, 1, acc.l);
      break;
    case 'surf': {
      pb.poly([[x - 18, y - 1], [x - 17, y - 3], [x + 12, y - 3], [x + 19, y - 1], [x + 12, y + 0], [x - 17, y + 0]], acc.b);
      pb.rect(x - 16, y - 3, 28, 1, acc.l);
      pb.rect(x - 16, y - 2, 30, 1, '#ffffff');
      pb.rect(x - 3, y - 2, 1, 1, acc.d);
      pb.rect(x - 15, y + 1, 1, 1, DARKMETAL.b);
      pb.rect(x + 10, y + 1, 1, 1, DARKMETAL.b);
      break;
    }
    case 'rally':
      pb.rect(x - 9, y - 1, 19, 2, DARKMETAL.b);
      for (const dx of [-6, 0, 6]) {
        pb.disc(x + dx, y - 3, 2, METAL.o);
        pb.disc(x + dx, y - 3, 1, '#f4ecc8');
      }
      break;
    case 'aleta':
      pb.poly([[x - 6, y + 1], [x + 4, y + 1], [x - 4, y - 10]], acc.b);
      pb.line(x - 5, y, x - 4, y - 9, acc.l);
      break;
    case 'patito':
      pb.disc(x, y - 3, 3, '#f8d020');
      pb.disc(x + 3, y - 7, 2, '#f8d020');
      pb.rect(x + 5, y - 7, 2, 1, '#f07010');
      pb.set(x + 3, y - 8, '#101018');
      pb.rect(x - 2, y - 4, 3, 1, '#fff070');
      break;
    case 'gorro':
      pb.poly([[x - 4, y + 1], [x + 4, y + 1], [x, y - 10]], acc.b);
      pb.line(x - 2, y - 2, x + 2, y - 4, '#ffffff');
      pb.line(x - 1, y - 5, x + 1, y - 6, '#ffffff');
      pb.disc(x, y - 11, 1.4, '#ffffff');
      break;
  }
}

function drawExtras(pb: PB, cfg: CarConfig, F: HalfDef, R: HalfDef, acc: Ramp) {
  const has = (id: string) => cfg.extras.includes(id);
  if (has('turbo')) {
    const x = OX + 28, t = F.top(28);
    pb.rect(x - 4, OY + t - 5, 9, 5, METAL.b);
    pb.rect(x - 4, OY + t - 5, 9, 1, METAL.h);
    for (let i = -3; i <= 3; i += 2) pb.rect(x + i, OY + t - 4, 1, 3, METAL.d);
    pb.rect(x - 3, OY + t - 8, 7, 3, DARKMETAL.b);
    pb.rect(x - 2, OY + t - 8, 5, 1, DARKMETAL.l);
  }
  if (has('defensa')) {
    const x = OX + F.L;
    pb.rect(x - 1, OY - 9, 2, 9, METAL.b);
    pb.rect(x + 1, OY - 9, 1, 9, METAL.d);
    pb.rect(x - 2, OY - 6, 4, 1, METAL.l);
    pb.rect(x - 2, OY - 2, 4, 1, METAL.d);
  }
  if (has('escape')) {
    const x = OX - 1 - R.L;
    pb.rect(x - 2, OY - 3, 9, 2, METAL.b);
    pb.rect(x - 2, OY - 3, 9, 1, METAL.l);
    pb.rect(x - 2, OY - 3, 1, 2, '#202028');
  }
  if (has('aleron')) {
    const dPost = R.L - 7;
    const t = R.top(dPost);
    const xp = OX - 1 - dPost;
    pb.rect(xp, OY + t - 5, 1, 5, DARKMETAL.b);
    pb.rect(xp - 6, OY + t - 5, 1, 5, DARKMETAL.b);
    pb.rect(xp - 10, OY + t - 8, 15, 3, acc.b);
    pb.rect(xp - 10, OY + t - 8, 15, 1, acc.l);
    pb.rect(xp - 10, OY + t - 6, 15, 1, acc.d);
  }
}

/**
 * Posición de la rueda delantera: se corre hacia atrás según su tamaño para
 * que siempre se vea la trompa (al menos 5 px) y el faro delantero.
 */
function frontWheelX(F: HalfDef, r: number) {
  let maxFront = F.L - 5;
  if (F.light.y > -12) maxFront = Math.min(maxFront, F.light.d - 4);
  return Math.max(20, Math.min(F.wheel, maxFront - r));
}

export function buildCar(cfg: CarConfig): BuiltCar {
  const F = findById(FRONTS, cfg.front);
  const R = findById(REARS, cfg.rear);
  const CB = findById(CABINS, cfg.cabin);
  const W = findById(WHEELS, cfg.wheels);
  const rf = paint(cfg.colors.front), rr = paint(cfg.colors.rear), rc = paint(cfg.colors.cabin);
  const acc = paint(cfg.colors.acc);

  const front = drawHalf(F, rf, 1);
  const rear = drawHalf(R, rr, -1);
  const fWheel = frontWheelX(F, W.r);
  const fwx = OX + fWheel, rwx = OX - 1 - R.wheel;
  const wells = new Set<number>();
  cutWell(front, fwx, W.r, rf, wells);
  cutWell(rear, rwx, W.r, rr, wells);
  cutWell(front, rwx, W.r, rf, wells);
  cutWell(rear, fwx, W.r, rr, wells);
  if (cfg.decal !== 'nada') {
    const dec = decalLayer(cfg, F, R);
    applyMask(front, dec, wells);
    applyMask(rear, dec, wells);
  }
  front.outline(rf.o);
  rear.outline(rr.o);

  const body = new PB(BW, BH);
  body.blit(rear);
  body.blit(front);

  // luces
  const lx = OX + F.light.d, ly = OY + F.light.y;
  drawHeadlight(body, cfg.lights, lx, ly, rf);
  const tx = OX - 1 - R.light.d, ty = OY + R.light.y;
  body.rect(tx - 1, ty - 1, 2, 4, '#3a0810');
  body.rect(tx - 1, ty - 1, 2, 3, '#b01020');
  body.set(tx - 1, ty - 1, '#ff6070');

  // cabina
  const cab = drawCabin(CB, rc);
  body.blit(cab);

  // techo
  let roofY = 0, rx0 = 0, rx1 = 0;
  if (!CB.special) {
    roofY = 0;
    for (let x = CB.x0; x <= CB.x1; x++) roofY = Math.min(roofY, cabinTop(CB, x));
    rx0 = 999; rx1 = -999;
    for (let x = CB.x0; x <= CB.x1; x++) if (cabinTop(CB, x) === roofY) { rx0 = Math.min(rx0, x); rx1 = Math.max(rx1, x); }
  }
  const roofPos = CB.roof ?? [Math.round((rx0 + rx1) / 2), roofY - 1];
  const antPos = CB.antenna ?? [rx0 + 2, roofY - 1];
  const extrasPb = new PB(BW, BH);
  drawRoofItem(extrasPb, cfg.roof, OX + roofPos[0], OY + roofPos[1], acc);
  drawExtras(extrasPb, cfg, F, R, acc);
  extrasPb.outline(acc.o === '#282838' ? '#202028' : '#101018');
  body.blit(extrasPb);

  let topY = 0;
  for (let i = 0; i < body.d.length; i++) if ((body.d[i] >>> 24) > 0) { topY = Math.floor(i / BW) - OY; break; }

  const frames = wheelFrames(W, cfg.colors.wheels);
  let horn = CB.horn;
  if (W.r >= 12) horn *= 0.8;

  return {
    cfg,
    body: body.canvas(),
    ground: 2 * W.r - 8,
    wheels: [
      { x: -1 - R.wheel, r: W.r, frames },
      { x: fWheel, r: W.r, frames },
    ],
    light: { x: F.light.d + 2, y: F.light.y, style: cfg.lights },
    tail: { x: -1 - R.light.d - 1, y: R.light.y },
    antenna: { x: antPos[0], y: antPos[1], type: cfg.antenna, ramp: acc },
    roof: { x: roofPos[0], y: roofPos[1], type: cfg.roof },
    exhaust: cfg.extras.includes('escape') ? { x: -1 - R.L - 3, y: -2 } : null,
    frontExt: F.L + (cfg.extras.includes('defensa') ? 2 : 0),
    rearExt: R.L + (cfg.extras.includes('escape') ? 3 : 0),
    topY: Math.min(topY, antPos[1] - 14),
    cabinMid: { x: -1, y: Math.round((roofY + DECK) / 2) || -20 },
    horn,
  };
}

// ---------------------------------------------------------------------------
// Dibujo dinámico

export interface CarState {
  wheelAngle: number;
  bounce: number;
  tilt: number;
  lights: boolean;
  brake: boolean;
  t: number;
  sway: number;
  speed: number; // 0..1
  /** 'body' = sin luces, 'lights' = sólo luces encendidas */
  phase?: 'all' | 'body' | 'lights';
}

export const IDLE_STATE: CarState = {
  wheelAngle: 0, bounce: 0, tilt: 0, lights: false, brake: false, t: 0, sway: 0, speed: 0,
};

/**
 * Dibuja el coche con la costura en (sx) y el suelo en la fila (sy).
 * Devuelve la función de desplazamiento vertical para ubicar efectos.
 */
export function drawCar(ctx: CanvasRenderingContext2D, car: BuiltCar, sx: number, sy: number, st: CarState) {
  const left = sx - OX;
  const top = sy - OY - car.ground;
  const bounce = Math.round(st.bounce);
  const off = (x: number) => bounce + Math.round((st.tilt * x) / 40);
  const phase = st.phase ?? 'all';
  const L = car.light;
  const lx = sx + L.x, ly = sy - car.ground + L.y + off(L.x);
  const exhaustPos = car.exhaust ? { x: sx + car.exhaust.x, y: sy - car.ground + car.exhaust.y + off(car.exhaust.x) } : null;
  if (phase !== 'lights') {
  // carrocería, columna por columna (permite inclinar sin perder el pixel art)
  for (let x = 0; x < BW; x++) ctx.drawImage(car.body, x, 0, 1, BH, left + x, top + off(x - OX), 1, BH);

  // ruedas
  const idx = Math.floor((((st.wheelAngle / (Math.PI * 2)) % 1) + 1) % 1 * car.wheels[0].frames.length);
  for (const w of car.wheels) {
    const fr = w.frames[idx];
    const c = w.r + 2;
    // suspensión visible en ruedas grandes
    if (w.r >= 12) {
      ctx.fillStyle = '#2a2a34';
      ctx.fillRect(sx + w.x - 1, sy - car.ground + off(w.x), 3, w.r - 9 + 2);
    }
    ctx.drawImage(fr, sx + w.x - c, sy - w.r - 1 - c);
  }

  // antena (con física de resorte)
  const a = car.antenna;
  if (a.type !== 'ninguna') {
    const bx = sx + a.x, by = sy - car.ground + a.y + off(a.x);
    const len = a.type === 'corta' ? 6 : a.type === 'muelle' ? 11 : a.type === 'bandera' ? 13 : 15;
    let tipX = bx, tipY = by;
    for (let i = 0; i <= len; i++) {
      const k = i / len;
      const ox = Math.round(st.sway * k * k);
      let col = '#30303a';
      let w = 1;
      if (a.type === 'muelle') {
        col = i % 2 ? '#d8d8e8' : '#686878';
        w = i % 2 ? 2 : 1;
      }
      ctx.fillStyle = col;
      ctx.fillRect(bx + ox - (w === 2 ? 1 : 0), by - i, w, 1);
      tipX = bx + ox;
      tipY = by - i;
    }
    if (a.type === 'bolita' || a.type === 'muelle') {
      ctx.fillStyle = '#101018';
      ctx.fillRect(tipX - 1, tipY - 3, 3, 3);
      ctx.fillStyle = a.type === 'muelle' ? a.ramp.b : '#e03040';
      ctx.fillRect(tipX - 1, tipY - 2, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tipX - 1, tipY - 2, 1, 1);
    }
    if (a.type === 'bandera') {
      const wave = st.speed > 0.05 ? st.t * 14 : 0;
      for (let c = 0; c < 7; c++) {
        const dy = Math.round(Math.sin(wave + c * 0.9) * (st.speed > 0.05 ? 1 : 0.4));
        ctx.fillStyle = c === 0 ? '#30303a' : a.ramp.o;
        ctx.fillRect(tipX - 1 - c, tipY + dy, 1, 6);
        ctx.fillStyle = a.ramp.b;
        ctx.fillRect(tipX - 1 - c, tipY + 1 + dy, 1, 4);
        if (c % 3 === 1) {
          ctx.fillStyle = a.ramp.l;
          ctx.fillRect(tipX - 1 - c, tipY + 1 + dy, 1, 1);
        }
      }
    }
  }

  }
  if (phase === 'body') return { lightPos: { x: lx, y: ly }, exhaustPos };
  // luces
  if (st.lights) {
    ctx.fillStyle = 'rgba(255,248,200,0.35)';
    ctx.fillRect(lx - 3, ly - 3, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(lx - 2, ly - 1, 3, 2);
  }
  const T = car.tail;
  const tx = sx + T.x, ty = sy - car.ground + T.y + off(T.x);
  if (st.brake || st.lights) {
    ctx.fillStyle = st.brake ? '#ff3040' : '#e02030';
    ctx.fillRect(tx, ty, 2, 3);
    if (st.brake) {
      ctx.fillStyle = 'rgba(255,40,60,0.35)';
      ctx.fillRect(tx - 3, ty - 2, 6, 7);
    }
  }
  // sirena / focos
  const R = car.roof;
  const rx = sx + R.x, ry = sy - car.ground + R.y + off(R.x);
  if (st.lights && R.type === 'sirena') {
    const on = Math.floor(st.t * 6) % 2 === 0;
    ctx.fillStyle = on ? 'rgba(255,40,60,0.45)' : 'rgba(40,90,255,0.45)';
    ctx.fillRect(rx + (on ? -6 : 0), ry - 7, 7, 7);
    ctx.fillStyle = on ? '#ff6070' : '#6090ff';
    ctx.fillRect(rx + (on ? -2 : 1), ry - 4, 2, 3);
  }
  if (st.lights && R.type === 'rally') {
    for (const dx of [-6, 0, 6]) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx + dx - 1, ry - 4, 2, 2);
      ctx.fillStyle = 'rgba(255,248,200,0.3)';
      ctx.fillRect(rx + dx - 3, ry - 6, 6, 6);
    }
  }
  return { lightPos: { x: lx, y: ly }, exhaustPos };
}

/** Render estático (para miniaturas y garaje). Devuelve un canvas recortado. */
export function renderCarStatic(car: BuiltCar, crop?: { x0: number; y0: number; x1: number; y1: number }) {
  const cv = document.createElement('canvas');
  const H = BH + 30;
  cv.width = BW;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const sy = H - 4;
  drawCar(ctx, car, OX, sy, IDLE_STATE);
  const c = crop ?? fullBounds(car);
  // crop está en espacio coche (y relativo al suelo de la carrocería)
  const base = sy - car.ground;
  const out = document.createElement('canvas');
  const w = Math.max(1, Math.round(c.x1 - c.x0));
  const h = Math.max(1, Math.round(c.y1 - c.y0));
  out.width = w;
  out.height = h;
  out.getContext('2d')!.drawImage(cv, OX + c.x0, base + c.y0, w, h, 0, 0, w, h);
  return out;
}

export function fullBounds(car: BuiltCar) {
  return {
    x0: -car.rearExt - 4,
    x1: car.frontExt + 5,
    y0: car.topY - 3,
    y1: car.ground + 2,
  };
}

export { WELL };
