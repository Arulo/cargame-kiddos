// Paletas en "rampas" de 5 tonos: contorno, sombra, base, luz, brillo.
export interface Ramp {
  o: string;
  d: string;
  b: string;
  l: string;
  h: string;
}

export interface Paint {
  id: string;
  name: string;
  ramp: Ramp;
}

export const PAINTS: Paint[] = [
  { id: 'rojo', name: 'Rojo', ramp: { o: '#3a0a12', d: '#a01828', b: '#e03838', l: '#ff7860', h: '#ffc8b0' } },
  { id: 'naranja', name: 'Naranja', ramp: { o: '#3a1606', d: '#b84a10', b: '#f07c20', l: '#ffb050', h: '#ffe0a0' } },
  { id: 'amarillo', name: 'Amarillo', ramp: { o: '#3a2a06', d: '#c08a10', b: '#f8c830', l: '#fff070', h: '#fffcc8' } },
  { id: 'verde', name: 'Verde', ramp: { o: '#0a2a12', d: '#188038', b: '#38b848', l: '#88e070', h: '#d0ffb0' } },
  { id: 'celeste', name: 'Celeste', ramp: { o: '#082838', d: '#1878b0', b: '#38b8e8', l: '#88e0ff', h: '#d8f8ff' } },
  { id: 'azul', name: 'Azul', ramp: { o: '#0a1038', d: '#2038a0', b: '#3868e0', l: '#78a8ff', h: '#c8e0ff' } },
  { id: 'violeta', name: 'Violeta', ramp: { o: '#200a38', d: '#6020a0', b: '#9048d8', l: '#c088ff', h: '#ecd0ff' } },
  { id: 'rosa', name: 'Rosa', ramp: { o: '#3a0a28', d: '#b02878', b: '#f058a8', l: '#ff98d0', h: '#ffd8f0' } },
  { id: 'blanco', name: 'Blanco', ramp: { o: '#282838', d: '#9898b0', b: '#d8d8e8', l: '#f8f8ff', h: '#ffffff' } },
  { id: 'negro', name: 'Negro', ramp: { o: '#08080c', d: '#18181f', b: '#303040', l: '#585870', h: '#9090a8' } },
  { id: 'dorado', name: 'Dorado', ramp: { o: '#2a1a04', d: '#a07010', b: '#e0b030', l: '#ffe070', h: '#fffbd0' } },
  { id: 'plata', name: 'Plata', ramp: { o: '#202028', d: '#686878', b: '#a8a8b8', l: '#d8d8e8', h: '#ffffff' } },
];

const byId = new Map(PAINTS.map((p) => [p.id, p]));
export const paint = (id: string): Ramp => (byId.get(id) ?? PAINTS[0]).ramp;

export const METAL: Ramp = { o: '#202028', d: '#686878', b: '#a8a8b8', l: '#d8d8e8', h: '#ffffff' };
export const DARKMETAL: Ramp = { o: '#0c0c12', d: '#2a2a34', b: '#44444f', l: '#6a6a78', h: '#9a9aa8' };
export const RUBBER: Ramp = { o: '#060608', d: '#141418', b: '#24242c', l: '#383844', h: '#4c4c5a' };
export const GLASS: Ramp = { o: '#101828', d: '#285878', b: '#58a0d0', l: '#98d0f0', h: '#e0f8ff' };
export const SKIN = { o: '#4a2410', d: '#c07850', b: '#f0b890', h: '#ffe0c8' };
export const HAIR = '#5a3418';
export const WELL = '#141418';
