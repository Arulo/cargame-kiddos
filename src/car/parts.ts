// Catálogo de piezas. Toda la geometría está en "espacio coche":
//   x = 0  -> costura central entre frente y parte trasera (x+ hacia el frente)
//   y = 0  -> piso de la carrocería (y- hacia arriba)
// Las dos mitades del chasis SIEMPRE tienen la cubierta a y=-14 cerca del
// centro, así cualquier cabina encaja en cualquier combinación.

export const DECK = -14;

export interface HalfDef {
  id: string;
  name: string;
  /** largo desde la costura */
  L: number;
  /** distancia del eje de la rueda a la costura */
  wheel: number;
  top(d: number): number;
  bot?(d: number): number;
  /** posición del faro (frente) o la luz trasera (atrás) */
  light: { d: number; y: number };
  kind?: 'jeep' | 'pickup' | 'furgon';
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const FRONTS: HalfDef[] = [
  {
    id: 'clasico', name: 'Clásico', L: 46, wheel: 31,
    top: (d) => (d < 22 ? -14 : d < 41 ? -11 : -11 + (d - 40)),
    bot: (d) => (d >= 43 ? -(d - 42) : 0),
    light: { d: 41, y: -7 },
  },
  {
    id: 'deportivo', name: 'Deportivo', L: 50, wheel: 33,
    top: (d) => (d < 20 ? -14 : Math.round(lerp(-13, -6, (d - 20) / 30))),
    bot: (d) => (d >= 47 ? -(d - 46) : 0),
    light: { d: 44, y: -5 },
  },
  {
    id: 'todoterreno', name: 'Todoterreno', L: 44, wheel: 30,
    top: (d) => (d < 20 ? -14 : -13),
    light: { d: 41, y: -10 }, kind: 'jeep',
  },
  {
    id: 'cohete', name: 'Cohete', L: 56, wheel: 33,
    top: (d) => (d < 20 ? -14 : Math.round(lerp(-14, -4, (d - 20) / 36))),
    bot: (d) => (d > 36 ? -Math.round((d - 36) * 0.15) : 0),
    light: { d: 46, y: -5 },
  },
  {
    id: 'burbuja', name: 'Burbuja', L: 42, wheel: 28,
    top: (d) => (d < 12 ? -14 : -Math.round(Math.sqrt(Math.max(0, 1 - ((d - 12) / 31) ** 2)) * 12) - 2),
    bot: (d) => (d >= 39 ? -(d - 38) : 0),
    light: { d: 36, y: -7 },
  },
];

export const REARS: HalfDef[] = [
  {
    id: 'clasico', name: 'Clásico', L: 44, wheel: 30,
    top: (d) => (d < 22 ? -14 : d < 40 ? -12 : -12 + (d - 39)),
    bot: (d) => (d >= 42 ? -(d - 41) : 0),
    light: { d: 40, y: -9 },
  },
  {
    id: 'pickup', name: 'Pickup', L: 50, wheel: 34,
    top: (d) => (d < 20 ? -14 : -13),
    light: { d: 48, y: -10 }, kind: 'pickup',
  },
  {
    id: 'furgon', name: 'Furgón', L: 46, wheel: 31,
    top: (d) => (d < 20 ? -14 : d === 20 || d === 45 ? -31 : -32),
    light: { d: 44, y: -9 }, kind: 'furgon',
  },
  {
    id: 'deportivo', name: 'Deportivo', L: 48, wheel: 33,
    top: (d) => (d < 20 ? -14 : d < 45 ? Math.round(lerp(-14, -10, (d - 20) / 24)) : -12),
    bot: (d) => (d >= 45 ? -(d - 44) : 0),
    light: { d: 44, y: -8 },
  },
  {
    id: 'burbuja', name: 'Burbuja', L: 42, wheel: 28,
    top: (d) => (d < 12 ? -14 : -Math.round(Math.sqrt(Math.max(0, 1 - ((d - 12) / 31) ** 2)) * 12) - 2),
    bot: (d) => (d >= 39 ? -(d - 38) : 0),
    light: { d: 37, y: -7 },
  },
];

export interface CabinDef {
  id: string;
  name: string;
  /** contorno superior como polilínea [x,y], de atrás hacia adelante */
  pts?: [number, number][];
  topFn?: (x: number) => number;
  x0: number;
  x1: number;
  windows: [number, number][];
  headX: number;
  antenna?: [number, number];
  roof?: [number, number];
  special?: 'convertible';
  horn: number;
}

export const CABINS: CabinDef[] = [
  {
    id: 'sedan', name: 'Sedán', x0: -20, x1: 18,
    pts: [[-20, -14], [-13, -26], [6, -26], [18, -14]],
    windows: [[-15, -3], [0, 13]], headX: 6, horn: 440,
  },
  {
    id: 'deportiva', name: 'Deportiva', x0: -20, x1: 18,
    pts: [[-20, -14], [-9, -22], [3, -22], [18, -14]],
    windows: [[-13, -1], [1, 13]], headX: 4, horn: 560,
  },
  {
    id: 'jeep', name: 'Alta', x0: -20, x1: 16,
    pts: [[-20, -28], [-19, -29], [10, -29], [16, -14]],
    windows: [[-17, -4], [-1, 12]], headX: 5, horn: 330,
  },
  {
    id: 'burbuja', name: 'Burbuja', x0: -20, x1: 18,
    topFn: (x) => -14 - Math.round(14 * Math.sqrt(Math.max(0, 1 - ((x + 1) / 19.5) ** 2))),
    windows: [[-14, 12]], headX: 4, antenna: [-11, -26], horn: 620,
  },
  {
    id: 'convertible', name: 'Descapotable', x0: -20, x1: 16,
    pts: [[-20, -17], [16, -17]],
    windows: [], headX: 2, special: 'convertible', antenna: [-18, -18], roof: [-11, -18], horn: 494,
  },
  {
    id: 'camion', name: 'Camión', x0: -20, x1: 18,
    pts: [[-20, -32], [8, -32], [15, -15], [18, -14]],
    windows: [[-16, -2], [1, 12]], headX: 5, horn: 220,
  },
];

export function cabinTop(c: CabinDef, x: number): number {
  if (c.topFn) return c.topFn(x);
  const p = c.pts!;
  if (x <= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) {
    const [ax, ay] = p[i], [bx, by] = p[i + 1];
    if (x >= ax && x <= bx) return Math.round(bx === ax ? Math.min(ay, by) : lerp(ay, by, (x - ax) / (bx - ax)));
  }
  return p[p.length - 1][1];
}

export interface WheelDef {
  id: string;
  name: string;
  r: number;
  tire: 'liso' | 'tacos' | 'banda';
  rim: 'tapa' | 'rayos' | 'radios' | 'estrella' | 'plato';
  rimK: number;
}

export const WHEELS: WheelDef[] = [
  { id: 'chiquita', name: 'Chiquita', r: 7, tire: 'liso', rim: 'tapa', rimK: 0.55 },
  { id: 'clasica', name: 'Clásica', r: 9, tire: 'banda', rim: 'tapa', rimK: 0.45 },
  { id: 'deportiva', name: 'Deportiva', r: 9, tire: 'liso', rim: 'rayos', rimK: 0.72 },
  { id: 'radios', name: 'Radios', r: 10, tire: 'liso', rim: 'radios', rimK: 0.7 },
  { id: 'estrella', name: 'Estrella', r: 10, tire: 'liso', rim: 'estrella', rimK: 0.66 },
  { id: 'todoterreno', name: 'Todoterreno', r: 12, tire: 'tacos', rim: 'plato', rimK: 0.55 },
  { id: 'monstruo', name: 'Monstruo', r: 16, tire: 'tacos', rim: 'rayos', rimK: 0.55 },
];

export interface SimpleDef {
  id: string;
  name: string;
}

export const LIGHTS: SimpleDef[] = [
  { id: 'redondo', name: 'Redondos' },
  { id: 'cuadrado', name: 'Cuadrados' },
  { id: 'doble', name: 'Dobles' },
  { id: 'ojitos', name: 'Ojitos' },
  { id: 'rayo', name: 'Rasgados' },
];

export const ANTENNAS: SimpleDef[] = [
  { id: 'ninguna', name: 'Nada' },
  { id: 'corta', name: 'Corta' },
  { id: 'bolita', name: 'Bolita' },
  { id: 'bandera', name: 'Bandera' },
  { id: 'muelle', name: 'Muelle' },
];

export const ROOFS: SimpleDef[] = [
  { id: 'nada', name: 'Nada' },
  { id: 'sirena', name: 'Sirena' },
  { id: 'equipaje', name: 'Equipaje' },
  { id: 'surf', name: 'Tabla de surf' },
  { id: 'rally', name: 'Focos' },
  { id: 'aleta', name: 'Aleta' },
  { id: 'patito', name: 'Patito' },
  { id: 'gorro', name: 'Gorro' },
];

export const EXTRAS: SimpleDef[] = [
  { id: 'aleron', name: 'Alerón' },
  { id: 'escape', name: 'Escape' },
  { id: 'defensa', name: 'Defensa' },
  { id: 'turbo', name: 'Turbo' },
];

export const DECALS: SimpleDef[] = [
  { id: 'nada', name: 'Nada' },
  { id: 'franja', name: 'Franja' },
  { id: 'numero', name: 'Número' },
  { id: 'llamas', name: 'Llamas' },
  { id: 'rayo', name: 'Rayo' },
  { id: 'lunares', name: 'Lunares' },
  { id: 'estrellas', name: 'Estrellas' },
];

export interface CarConfig {
  front: string;
  rear: string;
  cabin: string;
  wheels: string;
  lights: string;
  antenna: string;
  roof: string;
  extras: string[];
  decal: string;
  colors: {
    front: string;
    rear: string;
    cabin: string;
    wheels: string;
    acc: string;
    decal: string;
  };
}

export const DEFAULT_CAR: CarConfig = {
  front: 'clasico',
  rear: 'clasico',
  cabin: 'sedan',
  wheels: 'clasica',
  lights: 'redondo',
  antenna: 'bolita',
  roof: 'nada',
  extras: [],
  decal: 'nada',
  colors: { front: 'rojo', rear: 'rojo', cabin: 'rojo', wheels: 'plata', acc: 'amarillo', decal: 'blanco' },
};

export function findById<T extends { id: string }>(list: T[], id: string): T {
  return list.find((x) => x.id === id) ?? list[0];
}
