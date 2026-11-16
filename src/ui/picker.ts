import { h, btn, topbar, Mount } from './dom';
import { THEMES, TW, geom } from '../scene/themes';
import { getCar } from '../storage';
import { buildCar, drawCar, IDLE_STATE } from '../car/build';
import { sfx } from '../audio';

export const mountPicker: Mount = (root, params, nav) => {
  const saved = getCar(params.car);
  if (!saved) {
    setTimeout(() => nav.go('garage'));
    return () => {};
  }
  const car = buildCar(saved.cfg);
  const grid = h('div', { class: 'theme-grid' });
  const PH = 120, PW = 200;

  for (const t of THEMES) {
    const cv = document.createElement('canvas');
    cv.width = PW;
    cv.height = PH;
    cv.className = 'pixel';
    const ctx = cv.getContext('2d')!;
    const art = t.build(PH);
    for (const L of art.layers) {
      const off = Math.round(37 * L.f * 10) % TW;
      ctx.drawImage(L.cv, -off, 0);
      ctx.drawImage(L.cv, TW - off, 0);
    }
    const { groundY } = geom(PH);
    drawCar(ctx, car, 70, groundY, { ...IDLE_STATE, lights: t.night });
    if (t.night) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,240,170,0.08)';
      ctx.fillRect(70 + car.light.x, groundY - car.ground + car.light.y - 6, 70, 14);
      ctx.globalCompositeOperation = 'source-over';
    }
    const card = h('button', { class: 'theme-card', type: 'button', 'aria-label': t.name }, cv,
      h('span', { class: 'theme-name' }, `${t.emoji} ${t.name}`));
    card.addEventListener('click', () => {
      sfx.ding();
      nav.go('drive', { car: saved.id, theme: t.id });
    });
    grid.append(card);
  }

  root.append(h('div', { class: 'screen picker' },
    topbar(
      btn('⬅', () => nav.go('garage'), 'ghost round', 'Volver'),
      h('h1', {}, '¿Por dónde paseamos?'),
      h('div', { class: 'spacer' }),
      h('div', { class: 'car-chip' }, saved.name),
    ),
    h('main', { class: 'scroll' }, grid),
  ));
  return () => {};
};
