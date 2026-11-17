import { buildCar, renderCarStatic } from './car/build';
import { DEFAULT_CAR, CarConfig } from './car/parts';
const list: Partial<CarConfig>[] = [
  { front: 'camion', rear: 'volquete', cabin: 'camion', wheels: 'tractor', lights: 'cuadrado' },
  { front: 'tiburon', rear: 'aleta', cabin: 'carrera', wheels: 'agujeros', lights: 'enojados', decal: 'numero', number: 3 },
  { front: 'bus', rear: 'limusina', cabin: 'furgo', wheels: 'espiral', lights: 'corazon', decal: 'llamas' },
  { front: 'deportivo', rear: 'deportivo', cabin: 'cupula', wheels: 'espiral', lights: 'estrella', decal: 'numero', number: 8 },
  { front: 'clasico', rear: 'limusina', cabin: 'sedan', wheels: 'agujeros', lights: 'redondo', decal: 'llamas' },
  { front: 'cohete', rear: 'aleta', cabin: 'deportiva', wheels: 'monstruo', lights: 'rayo', decal: 'llamas' },
];
const cols = ['rojo', 'azul', 'amarillo', 'verde', 'negro', 'violeta'];
list.forEach((l, i) => {
  const cfg: CarConfig = { ...DEFAULT_CAR, ...l, colors: { ...DEFAULT_CAR.colors, front: cols[i], rear: cols[i], cabin: cols[(i + 2) % 6], decal: i === 1 ? 'blanco' : 'amarillo' } } as CarConfig;
  const cv = renderCarStatic(buildCar(cfg));
  cv.style.width = cv.width * 4 + 'px';
  document.body.appendChild(cv);
});
