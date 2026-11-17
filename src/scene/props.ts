// Sprites de los eventos de la ruta: semáforo, patitos, conos, carteles.
import { PB } from '../gfx/pixel';

export interface Sprite {
  cv: HTMLCanvasElement;
  ax: number; // ancla x (centro)
  ay: number; // ancla y (base)
}

const toSprite = (pb: PB, ax: number, ay: number): Sprite => ({ cv: pb.canvas(), ax, ay });

const cache = new Map<string, Sprite>();
function memo(key: string, fn: () => Sprite) {
  let s = cache.get(key);
  if (!s) cache.set(key, (s = fn()));
  return s;
}

export function trafficLight(state: 'red' | 'yellow' | 'green'): Sprite {
  return memo('tl' + state, () => {
    const pb = new PB(15, 62);
    pb.rect(6, 20, 3, 42, '#3a4050');
    pb.rect(6, 20, 1, 42, '#5a6070');
    pb.rect(4, 58, 7, 4, '#2a3040');
    pb.rect(2, 1, 11, 22, '#2a2a34');
    pb.rect(3, 2, 9, 20, '#3a3a48');
    const on = { red: 0, yellow: 1, green: 2 }[state];
    const cols = [
      ['#e02030', '#4a1018', '#ff8080'],
      ['#f8c020', '#4a3a10', '#fff0a0'],
      ['#30d050', '#103a18', '#a0ffb0'],
    ];
    for (let i = 0; i < 3; i++) {
      const cy = 6 + i * 6;
      pb.disc(7, cy, 2, i === on ? cols[i][0] : cols[i][1]);
      if (i === on) pb.set(6, cy - 1, cols[i][2]);
      pb.rect(4, cy - 3, 7, 1, '#2a2a34');
    }
    pb.outline('#101018');
    return toSprite(pb, 7, 61);
  });
}

function duckBody(pb: PB, x: number, y: number, big: boolean, frame: number, fly: boolean) {
  const body = big ? '#f8f8f0' : '#f8d020';
  const shade = big ? '#c8c8c0' : '#d0a010';
  const beak = '#f07010';
  const s = big ? 1.5 : 1;
  const bw = Math.round(6 * s), bh = Math.round(4 * s);
  pb.disc(x, y - bh - 1, Math.max(2, bw * 0.75), body);
  pb.rect(x - bw, y - bh - 1, bw * 2, bh, body);
  pb.rect(x - bw, y - 2, bw * 2, 1, shade);
  // cola
  pb.set(x - bw - 1, y - bh - 2, body);
  // cabeza
  const hx = x + bw - 1, hy = y - bh - Math.round(5 * s) - 2;
  pb.disc(hx, hy, big ? 3.4 : 2.4, big ? '#f8f8f0' : '#f8d020');
  pb.rect(hx + (big ? 3 : 2), hy, big ? 4 : 3, 2, beak);
  pb.set(hx + (big ? 1 : 1), hy - 1, '#101018');
  // ala
  if (fly) {
    pb.poly([[x - 2, y - bh - 1], [x + 2, y - bh - 1], [x - 4, y - bh - 7 * s]], shade);
  } else {
    pb.rect(x - 2, y - bh, Math.round(4 * s) + 1, 2, shade);
  }
  // patas
  if (!fly) {
    const f = frame % 2;
    pb.rect(x - 2 + f, y - 1, 2, 1, beak);
    pb.rect(x + 1 - f, y - 1, 2, 1, beak);
  }
}

export function ducks(frame: number, fly: boolean): Sprite {
  return memo('duck' + frame + fly, () => {
    const pb = new PB(66, 34);
    duckBody(pb, 44, 32, true, frame, fly);
    duckBody(pb, 24, 32 - (frame % 2 ? 1 : 0), false, frame + 1, fly);
    duckBody(pb, 9, 32 - (frame % 2 ? 0 : 1), false, frame, fly);
    pb.outline('#202028');
    return toSprite(pb, 33, 33);
  });
}

export function cone(): Sprite {
  return memo('cone', () => {
    const pb = new PB(9, 12);
    pb.poly([[2, 10], [7, 10], [5, 1], [4, 1]], '#f07020');
    pb.rect(3, 4, 3, 2, '#ffffff');
    pb.rect(1, 10, 7, 2, '#e05010');
    pb.outline('#3a1808');
    return toSprite(pb, 4, 11);
  });
}

export function turtleSign(end: boolean): Sprite {
  return memo('ts' + end, () => {
    const pb = new PB(19, 40);
    pb.rect(8, 14, 2, 26, '#5a6070');
    pb.poly([[9.5, 0], [19, 9.5], [9.5, 19], [0, 9.5]], '#202028');
    pb.poly([[9.5, 1.5], [17.5, 9.5], [9.5, 17.5], [1.5, 9.5]], '#f8c820');
    // tortuga
    pb.disc(9, 10, 3, '#2a8838');
    pb.rect(6, 12, 7, 1, '#2a8838');
    pb.disc(13, 9, 1, '#58b048');
    pb.set(6, 13, '#58b048');
    pb.set(12, 13, '#58b048');
    pb.set(8, 9, '#58b048');
    if (end) pb.line(3, 15, 15, 3, '#d02030');
    return toSprite(pb, 9, 39);
  });
}

// ---------------------------------------------------------------------------
// Vacas y cerditos (vista lateral, mirando a la derecha)

function cow(pb: PB, x: number, base: number, frame: number, small: boolean) {
  const s = small ? 0.7 : 1;
  const bw = Math.round(22 * s), bh = Math.round(10 * s), leg = Math.round(6 * s);
  const top = base - leg - bh;
  const white = '#f8f8f0', shade = '#c8c8c8', black = '#202028', pink = '#f0a0a8';
  // patas (alternan al caminar)
  const lx = [x + 1, x + 4, x + bw - 6, x + bw - 3];
  lx.forEach((px, i) => {
    const up = (i + frame) % 2 === 0 ? 1 : 0;
    pb.rect(px, base - leg - up, 2, leg, white);
    pb.rect(px, base - 2 - up, 2, 2, black);
  });
  // cuerpo
  pb.rect(x, top + 1, bw, bh - 1, white);
  pb.rect(x + 1, top, bw - 2, 1, white);
  pb.rect(x, top + bh - 2, bw, 2, shade);
  // manchas
  pb.disc(x + Math.round(5 * s), top + Math.round(4 * s), 2.2 * s, black);
  pb.disc(x + Math.round(14 * s), top + Math.round(3 * s), 2.6 * s, black);
  pb.disc(x + Math.round(10 * s), top + Math.round(7 * s), 1.6 * s, black);
  // ubre
  if (!small) pb.rect(x + bw - 9, top + bh, 4, 2, pink);
  // cola
  pb.line(x - 1, top + 1, x - 2, top + 6, black);
  pb.rect(x - 3, top + 6, 2, 2, black);
  // cabeza
  const hx = x + bw - 2, hy = top - Math.round(3 * s);
  const hw = Math.round(8 * s), hh = Math.round(8 * s);
  pb.rect(hx, hy, hw, hh, white);
  pb.rect(hx + hw - 3, hy + hh - 3, 4, 4, pink);
  pb.set(hx + hw, hy + hh - 2, '#c06070');
  pb.set(hx + hw - 3, hy + 2, black);
  pb.rect(hx - 1, hy, 2, 2, black); // oreja
  pb.set(hx + 1, hy - 1, '#e8d8b0'); // cuerno
  pb.set(hx + 4, hy - 1, '#e8d8b0');
  pb.set(hx + 4, hy - 2, '#e8d8b0');
}

function pig(pb: PB, x: number, base: number, frame: number, small: boolean) {
  const s = small ? 0.65 : 1;
  const bw = Math.round(16 * s), bh = Math.round(9 * s), leg = Math.round(3 * s) + 1;
  const top = base - leg - bh;
  const pk = '#f8a8b8', sh = '#d87890', hl = '#ffd0d8', dk = '#a04860';
  [x + 2, x + bw - 4].forEach((px, i) => {
    const up = (i + frame) % 2 === 0 ? 1 : 0;
    pb.rect(px, base - leg - up, 2, leg, sh);
    pb.rect(px + 1 + (i ? -1 : 0), base - leg, 2, leg - up, pk);
  });
  pb.rect(x + 1, top, bw - 2, bh, pk);
  pb.rect(x, top + 1, bw, bh - 2, pk);
  pb.rect(x + 2, top + 1, bw - 5, 1, hl);
  pb.rect(x + 1, top + bh - 2, bw - 2, 1, sh);
  // cola enrulada
  pb.set(x - 1, top + 2, dk); pb.set(x - 2, top + 1, dk); pb.set(x - 2, top + 3, dk); pb.set(x - 3, top + 2, dk);
  // cabeza + hocico
  const hx = x + bw - 3, hy = top - 1;
  const hs = Math.round(7 * s);
  pb.rect(hx, hy, hs, hs, pk);
  pb.rect(hx + hs, hy + Math.round(hs / 2) - 1, 2, 3, '#f07890');
  pb.set(hx + hs + 1, hy + Math.round(hs / 2), dk);
  pb.set(hx + hs - 2, hy + 2, '#202028');
  pb.set(hx + 1, hy - 1, sh);
  pb.set(hx + 2, hy - 2, sh);
  pb.set(hx + 2, hy - 1, pk);
}

export type AnimalKind = 'patos' | 'vacas' | 'cerdos';

export function animals(kind: AnimalKind, frame: number, run: boolean): Sprite {
  if (kind === 'patos') return ducks(frame, run);
  return memo(kind + frame + run, () => {
    const pb = new PB(72, 34);
    if (kind === 'vacas') {
      cow(pb, 32, 33, frame, false);
      cow(pb, 6, 33, frame + 1, true);
    } else {
      pig(pb, 44, 33, frame, false);
      pig(pb, 26, 33, frame + 1, true);
      pig(pb, 9, 33, frame, true);
    }
    pb.outline('#202028');
    return toSprite(pb, 36, 33);
  });
}
