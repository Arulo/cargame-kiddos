import { h, btn, Mount, onResize } from './dom';
import { DriveScene, Prompt, Hint } from '../scene/drive';
import { getCar, addStars } from '../storage';

export const mountDrive: Mount = (root, params, nav) => {
  const saved = getCar(params.car);
  if (!saved) {
    setTimeout(() => nav.go('garage'));
    return () => {};
  }
  const cv = h('canvas', { class: 'pixel' });
  const view = h('div', { class: 'drive-view' }, cv);
  const promptEl = h('div', { class: 'prompt hidden' });
  const starsEl = h('div', { class: 'stars' }, '⭐ 0');
  const speedFill = h('div', { class: 'speed-fill' });
  const speed = h('div', { class: 'speed' }, h('span', {}, '🏎️'), h('div', { class: 'speed-bar' }, speedFill));

  const hold = (label: string, cls: string, aria: string, on: (v: boolean) => void) => {
    const b = h('button', { class: 'btn ' + cls, type: 'button', 'aria-label': aria });
    b.innerHTML = label;
    let pid = -1;
    b.addEventListener('pointerdown', (e) => {
      pid = e.pointerId;
      try { b.setPointerCapture(pid); } catch { /* */ }
      b.classList.add('pressed');
      on(true);
    });
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      b.classList.remove('pressed');
      on(false);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    return b;
  };

  let scene: DriveScene;
  let earned = 0;
  const brake = hold('<span class="pe">🛑</span><span class="pl">Frenar</span>', 'pedal red', 'Frenar', (v) => (scene.brake = v));
  const gas = hold('<span class="pe">⏩</span><span class="pl">Acelerar</span>', 'pedal green', 'Acelerar', (v) => (scene.gas = v));
  const horn = hold('<span class="pe">📯</span>', 'round-big yellow', 'Bocina', (v) => scene.setHorn(v));
  const lights = h('button', { class: 'btn round-big', type: 'button', 'aria-label': 'Luces' });
  lights.innerHTML = '<span class="pe">💡</span>';
  lights.addEventListener('pointerdown', () => {
    const on = scene.toggleLights();
    lights.classList.toggle('lit', on);
  });

  const hintEls: Record<Exclude<Hint, null>, HTMLElement> = { horn, lights, gas, brake };
  const setPrompt = (p: Prompt | null) => {
    Object.values(hintEls).forEach((el) => el.classList.remove('hint'));
    if (!p) {
      promptEl.classList.add('hidden');
      return;
    }
    promptEl.innerHTML = '';
    promptEl.append(h('span', { class: 'pe' }, p.emoji), h('span', {}, p.text));
    promptEl.classList.toggle('good', !!p.good);
    promptEl.classList.remove('hidden');
    promptEl.classList.remove('pop');
    void promptEl.offsetWidth;
    promptEl.classList.add('pop');
    if (p.hint) hintEls[p.hint].classList.add('hint');
  };

  let lastSpeed = -1;
  scene = new DriveScene(cv, saved.cfg, params.theme ?? 'ciudad', {
    cb: {
      onPrompt: setPrompt,
      onStar: (n) => {
        earned = n;
        starsEl.textContent = `⭐ ${n}`;
        starsEl.classList.remove('bump');
        void starsEl.offsetWidth;
        starsEl.classList.add('bump');
      },
      onSpeed: (v) => {
        const q = Math.round(v * 40);
        if (q !== lastSpeed) {
          lastSpeed = q;
          speedFill.style.width = `${(q / 40) * 100}%`;
        }
      },
    },
  });

  const leave = () => {
    addStars(saved.id, earned);
    earned = 0;
    nav.go('garage');
  };

  const screen = h('div', { class: 'screen drive' },
    view,
    h('div', { class: 'hud-top' },
      btn('⬅', leave, 'ghost round', 'Volver al garaje'),
      h('div', { class: 'car-chip' }, saved.name),
      h('div', { class: 'spacer' }),
      speed,
      starsEl),
    promptEl,
    h('div', { class: 'hud-bottom' },
      h('div', { class: 'hud-col' }, lights, brake),
      h('div', { class: 'hud-col right' }, horn, gas)),
  );
  root.append(screen);

  // teclado (para probar en la compu)
  const keys = (e: KeyboardEvent, down: boolean) => {
    if (e.repeat) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') scene.gas = down;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') scene.brake = down;
    if (e.key === ' ' || e.key === 'h') scene.setHorn(down);
    if ((e.key === 'l' || e.key === 'L') && down) lights.classList.toggle('lit', scene.toggleLights());
  };
  const kd = (e: KeyboardEvent) => keys(e, true);
  const ku = (e: KeyboardEvent) => keys(e, false);
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);

  const off = onResize(view, (w, hh) => scene.resize(w, hh));
  scene.start();
  setTimeout(() => setPrompt({ emoji: '⏩', text: 'Mantén apretado Acelerar', hint: 'gas' }), 400);
  const firstGo = setInterval(() => {
    if (scene.v > 30) {
      clearInterval(firstGo);
      setPrompt(null);
    }
  }, 200);

  return () => {
    clearInterval(firstGo);
    addStars(saved.id, earned);
    off();
    scene.stop();
    window.removeEventListener('keydown', kd);
    window.removeEventListener('keyup', ku);
  };
};
