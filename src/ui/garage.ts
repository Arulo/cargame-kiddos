import { h, btn, topbar, Mount } from './dom';
import { loadCars, removeCar } from '../storage';
import { buildCar, renderCarStatic } from '../car/build';
import { sfx } from '../audio';

export const mountGarage: Mount = (root, _p, nav) => {
  const grid = h('div', { class: 'garage-grid' });

  function render() {
    grid.innerHTML = '';
    const cars = loadCars();
    if (!cars.length) {
      grid.append(
        h('div', { class: 'empty' },
          h('div', { class: 'empty-emoji' }, '🏚️'),
          h('p', {}, 'Todavía no hay coches en el garaje.'),
          btn('🔧 ¡Arma el primero!', () => nav.go('build'), 'yellow big')),
      );
      return;
    }
    for (const c of cars) {
      const cv = renderCarStatic(buildCar(c.cfg));
      cv.className = 'pixel';
      let armed = false;
      let timer = 0;
      const del = btn('🗑', () => {
        if (!armed) {
          armed = true;
          del.innerHTML = '¿Borrar?';
          del.classList.add('red');
          timer = window.setTimeout(() => {
            armed = false;
            del.innerHTML = '🗑';
            del.classList.remove('red');
          }, 2500);
          return;
        }
        clearTimeout(timer);
        removeCar(c.id);
        sfx.whoosh();
        render();
      }, 'ghost small del', 'Borrar coche');
      const card = h('div', { class: 'car-card' },
        h('button', { class: 'car-thumb', type: 'button', 'aria-label': 'Manejar ' + c.name, onclick: () => { sfx.click(); nav.go('picker', { car: c.id }); } }, cv),
        h('div', { class: 'car-info' },
          h('div', { class: 'car-name' }, c.name),
          h('div', { class: 'car-stars' }, `⭐ ${c.stars}`)),
        h('div', { class: 'car-actions' },
          btn('🏁 Manejar', () => nav.go('picker', { car: c.id }), 'green small'),
          del),
      );
      grid.append(card);
    }
  }

  const screen = h('div', { class: 'screen garage' },
    topbar(
      btn('⬅', () => nav.go('title'), 'ghost round', 'Volver'),
      h('h1', {}, '🏠 Garaje'),
      h('div', { class: 'spacer' }),
      btn('➕ <span class="hide-sm">Nuevo</span>', () => nav.go('build'), 'yellow', 'Nuevo coche'),
    ),
    h('main', { class: 'scroll' }, grid),
  );
  root.append(screen);
  render();
  return () => {};
};
