import { h, btn, Mount, onResize } from './dom';
import { DriveScene } from '../scene/drive';
import { THEMES } from '../scene/themes';
import { loadCars, randomCar } from '../storage';
import { isMuted, setMuted } from '../audio';

export const mountTitle: Mount = (root, _p, nav) => {
  const cars = loadCars();
  const cfg = cars.length && Math.random() < 0.6 ? cars[Math.floor(Math.random() * cars.length)].cfg : randomCar();
  const theme = THEMES[Math.floor(Math.random() * THEMES.length)].id;

  const cv = h('canvas', { class: 'pixel' });
  const bg = h('div', { class: 'title-bg' }, cv);
  const scene = new DriveScene(cv, cfg, theme, { demo: true });

  const mute = btn(isMuted() ? '🔇' : '🔊', () => {
    setMuted(!isMuted());
    mute.innerHTML = isMuted() ? '🔇' : '🔊';
  }, 'ghost round', 'Sonido');

  const ui = h(
    'div',
    { class: 'title-ui' },
    h('div', { class: 'logo' }, h('span', { class: 'l1' }, 'TALLER'), h('span', { class: 'l2' }, 'TURBO')),
    h('p', { class: 'subtitle' }, 'Arma tu coche y sal a pasear'),
    h(
      'div',
      { class: 'title-buttons' },
      btn('🔧 Construir', () => nav.go('build'), 'yellow big'),
      btn(`🏠 Garaje${cars.length ? ` <small>(${cars.length})</small>` : ''}`, () => nav.go('garage'), 'big'),
    ),
  );
  const screen = h('div', { class: 'screen title' }, bg, ui, h('div', { class: 'corner' }, mute));
  root.append(screen);

  const off = onResize(bg, (w, hh) => scene.resize(w, hh));
  scene.start();
  return () => {
    off();
    scene.stop();
  };
};
