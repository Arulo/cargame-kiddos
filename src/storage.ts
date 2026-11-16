// Garaje guardado en el dispositivo (localStorage).
import { CarConfig, DEFAULT_CAR, FRONTS, REARS, CABINS, WHEELS, LIGHTS, ANTENNAS, ROOFS, EXTRAS, DECALS } from './car/parts';
import { PAINTS } from './gfx/palette';

export interface SavedCar {
  id: string;
  name: string;
  cfg: CarConfig;
  stars: number;
  created: number;
}

const KEY = 'taller-turbo-garaje-v1';

export function loadCars(): SavedCar[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SavedCar[];
    return list.map((c) => ({ ...c, cfg: { ...DEFAULT_CAR, ...c.cfg, colors: { ...DEFAULT_CAR.colors, ...c.cfg.colors } } }));
  } catch {
    return [];
  }
}

function saveAll(list: SavedCar[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addCar(name: string, cfg: CarConfig): SavedCar {
  const car: SavedCar = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, cfg, stars: 0, created: Date.now() };
  const list = loadCars();
  list.unshift(car);
  saveAll(list);
  return car;
}

export function getCar(id: string) {
  return loadCars().find((c) => c.id === id) ?? null;
}

export function addStars(id: string, n: number) {
  if (!n) return;
  const list = loadCars();
  const c = list.find((x) => x.id === id);
  if (c) {
    c.stars += n;
    saveAll(list);
  }
}

export function removeCar(id: string) {
  saveAll(loadCars().filter((c) => c.id !== id));
}

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export function randomCar(): CarConfig {
  const body = pick(PAINTS).id;
  const second = Math.random() < 0.5 ? body : pick(PAINTS).id;
  const extras = EXTRAS.filter(() => Math.random() < 0.3).map((e) => e.id);
  return {
    front: pick(FRONTS).id,
    rear: pick(REARS).id,
    cabin: pick(CABINS).id,
    wheels: pick(WHEELS).id,
    lights: pick(LIGHTS).id,
    antenna: pick(ANTENNAS).id,
    roof: pick(ROOFS).id,
    extras,
    decal: pick(DECALS).id,
    colors: {
      front: body,
      rear: body,
      cabin: second,
      wheels: pick(['plata', 'dorado', 'blanco', 'negro', body]),
      acc: pick(PAINTS).id,
      decal: pick(PAINTS).id,
    },
  };
}

const NOUNS = ['Rayo', 'Trueno', 'Cohete', 'Tiburón', 'Dragón', 'Bólido', 'Tornado', 'Cometa', 'Halcón', 'Tigre', 'Relámpago', 'Volcán'];
const ADJ = ['Veloz', 'Turbo', 'Loco', 'Feliz', 'Salvaje', 'Supersónico', 'Valiente', 'Galáctico', 'Saltarín', 'Mágico'];
const COLOR_ADJ: Record<string, string> = {
  rojo: 'Rojo', naranja: 'Naranja', amarillo: 'Amarillo', verde: 'Verde', celeste: 'Celeste', azul: 'Azul',
  violeta: 'Violeta', rosa: 'Rosa', blanco: 'Blanco', negro: 'Negro', dorado: 'Dorado', plata: 'Plateado',
};

export function randomName(cfg: CarConfig) {
  const adj = Math.random() < 0.5 ? COLOR_ADJ[cfg.colors.front] ?? pick(ADJ) : pick(ADJ);
  return `El ${pick(NOUNS)} ${adj}`;
}
