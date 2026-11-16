import { buildCar, renderCarStatic } from './car/build';
import { DEFAULT_CAR, FRONTS, REARS, CABINS, WHEELS, LIGHTS, ROOFS, DECALS, ANTENNAS, CarConfig } from './car/parts';
import { PAINTS } from './gfx/palette';

const cfgs: CarConfig[] = [];
for (let i = 0; i < 12; i++) {
  const p = (arr: { id: string }[], k: number) => arr[(i * k + i) % arr.length].id;
  const col = PAINTS[i % PAINTS.length].id;
  cfgs.push({
    ...DEFAULT_CAR,
    front: p(FRONTS, 1), rear: p(REARS, 2), cabin: p(CABINS, 1), wheels: p(WHEELS, 3),
    lights: p(LIGHTS, 1), roof: p(ROOFS, 1), decal: p(DECALS, 1), antenna: p(ANTENNAS, 2),
    extras: i % 3 === 0 ? ['aleron', 'escape', 'defensa', 'turbo'] : i % 3 === 1 ? ['escape'] : [],
    colors: { front: col, rear: col, cabin: PAINTS[(i + 3) % PAINTS.length].id, wheels: 'plata', acc: 'amarillo', decal: 'blanco' },
  });
}
for (const c of cfgs) {
  const car = buildCar(c);
  const cv = renderCarStatic(car);
  cv.style.width = cv.width * 3 + 'px';
  document.body.appendChild(cv);
}

import { DriveScene } from './scene/drive';
const q = new URLSearchParams(location.search);
if (q.get('drive')) {
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;overflow:hidden;background:#000';
  const cv = document.createElement('canvas');
  cv.style.imageRendering = 'pixelated';
  document.body.appendChild(cv);
  const s = new DriveScene(cv, cfgs[Number(q.get('car') ?? 0)], q.get('drive')!, {});
  s.resize(innerWidth, innerHeight);
  s.lights = q.get('lights') === '1';
  s.D = Number(q.get('d') ?? 0);
  (s as any).nextAt = Number(q.get('next') ?? 380);
  if (q.get('ev')) (s as any).bag = [q.get('ev')];
  s.gas = true;
  s.start();
  (window as any).scene = s;
}

if (q.get('icon')) {
  const N = Number(q.get('icon'));
  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;background:transparent';
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  cv.id = 'icon';
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // fondo: cielo + piso
  ctx.fillStyle = '#4aa0f0'; ctx.fillRect(0, 0, N, N);
  ctx.fillStyle = '#62b2f8'; ctx.fillRect(0, N * 0.35, N, N);
  ctx.fillStyle = '#80c4f8'; ctx.fillRect(0, N * 0.5, N, N);
  ctx.fillStyle = '#4c4c58'; ctx.fillRect(0, N * 0.72, N, N);
  ctx.fillStyle = '#f0f0f0';
  for (let x = 0; x < N; x += N / 5) ctx.fillRect(x, N * 0.84, N / 10, N / 40);
  const car = buildCar({ ...DEFAULT_CAR, wheels: 'todoterreno', roof: 'nada', antenna: 'bolita', decal: 'franja', colors: { ...DEFAULT_CAR.colors, decal: 'amarillo', cabin: 'rojo' } });
  const img = renderCarStatic(car);
  const k = Math.max(1, Math.floor((N * 0.78) / img.width));
  const w = img.width * k, hh = img.height * k;
  ctx.drawImage(img, Math.round((N - w) / 2), Math.round(N * 0.76 - hh + 2 * k), w, hh);
  document.body.appendChild(cv);
}
