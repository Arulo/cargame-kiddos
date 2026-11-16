// Pantalla del Taller: pestañas de piezas, grilla, arrastrar y soltar al coche.
import { h, btn, topbar, Mount, onResize } from './dom';
import { fitPixelCanvas } from '../gfx/pixel';
import { PAINTS, paint } from '../gfx/palette';
import {
  CarConfig, DEFAULT_CAR, FRONTS, REARS, CABINS, WHEELS, LIGHTS, ANTENNAS, ROOFS, EXTRAS, DECALS,
} from '../car/parts';
import { BuiltCar, buildCar, drawCar, renderCarStatic, fullBounds, IDLE_STATE } from '../car/build';
import { sfx } from '../audio';
import { addCar, randomCar, randomName } from '../storage';

type ColorSlot = keyof CarConfig['colors'];
type Key = 'front' | 'rear' | 'cabin' | 'wheels' | 'lights' | 'antenna' | 'roof' | 'extras' | 'decal';

interface Tab {
  id: Key;
  emoji: string;
  label: string;
  list: { id: string; name: string }[];
  color: ColorSlot | null;
  multi?: boolean;
  none?: string;
}

const TABS: Tab[] = [
  { id: 'wheels', emoji: '🛞', label: 'Ruedas', list: WHEELS, color: 'wheels' },
  { id: 'front', emoji: '🚗', label: 'Frente', list: FRONTS, color: 'front' },
  { id: 'rear', emoji: '🚚', label: 'Atrás', list: REARS, color: 'rear' },
  { id: 'cabin', emoji: '💺', label: 'Cabina', list: CABINS, color: 'cabin' },
  { id: 'lights', emoji: '💡', label: 'Faros', list: LIGHTS, color: null },
  { id: 'antenna', emoji: '📡', label: 'Antena', list: ANTENNAS, color: 'acc', none: 'ninguna' },
  { id: 'roof', emoji: '🎩', label: 'Techo', list: ROOFS, color: 'acc', none: 'nada' },
  { id: 'extras', emoji: '🔧', label: 'Extras', list: EXTRAS, color: 'acc', multi: true },
  { id: 'decal', emoji: '⭐', label: 'Dibujos', list: DECALS, color: 'decal', none: 'nada' },
];

interface Crop { x0: number; y0: number; x1: number; y1: number }

/** Zona del coche (espacio coche) donde "encaja" cada tipo de pieza. */
function cropFor(tab: Key, car: BuiltCar): Crop {
  switch (tab) {
    case 'wheels': {
      const w = car.wheels[1];
      const ay = w.r - 9;
      return { x0: w.x - w.r - 3, x1: w.x + w.r + 4, y0: ay - w.r - 3, y1: ay + w.r + 3 };
    }
    case 'front':
      return { x0: -3, x1: car.frontExt + 5, y0: -24, y1: car.ground + 1 };
    case 'rear':
      return { x0: -car.rearExt - 5, x1: 3, y0: -36, y1: car.ground + 1 };
    case 'cabin':
      return { x0: -24, x1: 22, y0: Math.min(-24, car.cabinMid.y * 2 + 14 - 5), y1: -10 };
    case 'lights':
      return { x0: car.light.x - 11, x1: car.light.x + 6, y0: car.light.y - 8, y1: car.light.y + 8 };
    case 'antenna':
      return { x0: car.antenna.x - 13, x1: car.antenna.x + 12, y0: car.antenna.y - 20, y1: car.antenna.y + 5 };
    case 'roof':
      return { x0: car.roof.x - 22, x1: car.roof.x + 23, y0: car.roof.y - 15, y1: car.roof.y + 7 };
    default:
      return fullBounds(car);
  }
}

function variant(cfg: CarConfig, tab: Tab, id: string): CarConfig {
  const c: CarConfig = { ...cfg, colors: { ...cfg.colors }, extras: [...cfg.extras] };
  if (tab.multi) c.extras = [id];
  else (c as unknown as Record<string, string>)[tab.id] = id;
  return c;
}

export const mountBuild: Mount = (root, _params, nav) => {
  const cfg: CarConfig = structuredClone(DEFAULT_CAR);
  let car = buildCar(cfg);
  let tab = TABS[0];
  let hintShown = true;

  // ---------------------------------------------------------------- escenario
  const cv = h('canvas', { class: 'pixel' });
  const hint = h('div', { class: 'stage-hint' }, 'Arrastra las piezas hasta el coche 👉');
  const stage = h('section', { class: 'stage' }, cv, hint);
  let W = 0, H = 0;
  let bgCv: HTMLCanvasElement | null = null;
  const st = { by: 0, bv: 0, spin: 0, spinV: 0, t: 0 };
  let sparkles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
  let dragTab: Tab | null = null;
  let dragOver = false;

  const carPos = () => ({
    sx: Math.round(W / 2 - (car.frontExt - car.rearExt) / 2),
    sy: H - Math.max(14, Math.round(H * 0.17)),
  });

  function makeBg() {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    const floorY = carPos().sy - 4;
    g.fillStyle = '#283062';
    g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 20) {
      g.fillStyle = '#232a58';
      g.fillRect(x, 0, 1, floorY);
      g.fillStyle = '#2e3670';
      g.fillRect(x + 1, 0, 1, floorY);
    }
    // franja de luz arriba
    g.fillStyle = '#3a4488';
    g.fillRect(0, 0, W, 6);
    g.fillStyle = '#ffe9a0';
    for (let x = 12; x < W; x += 48) g.fillRect(x, 2, 24, 2);
    // herramientas colgadas
    g.fillStyle = '#1d2350';
    g.fillRect(8, 14, Math.min(W - 16, 120), 26);
    g.fillStyle = '#a8a8b8';
    g.fillRect(16, 18, 2, 16); g.fillRect(14, 18, 6, 3);
    g.fillRect(30, 18, 3, 12); g.fillStyle = '#c05030'; g.fillRect(28, 28, 7, 8);
    g.fillStyle = '#e0b030'; g.fillRect(46, 20, 12, 4); g.fillRect(50, 24, 4, 12);
    g.fillStyle = '#a8a8b8'; g.fillRect(66, 18, 2, 18); g.fillRect(64, 32, 6, 4);
    // piso
    g.fillStyle = '#4a5080';
    g.fillRect(0, floorY, W, H - floorY);
    g.fillStyle = '#6a72a8';
    g.fillRect(0, floorY, W, 1);
    g.fillStyle = '#424878';
    for (let x = 0; x < W; x += 16) g.fillRect(x, floorY + 1, 1, H - floorY);
    for (let y = floorY + 6; y < H; y += 6) g.fillRect(0, y, W, 1);
    // plataforma
    const { sx, sy } = carPos();
    const pw = 84;
    g.fillStyle = '#2a2e50';
    g.fillRect(sx - pw, sy - 1, pw * 2, 4);
    g.fillStyle = '#ffd23f';
    for (let x = sx - pw; x < sx + pw; x += 8) g.fillRect(x, sy, 4, 2);
    bgCv = c;
  }

  function stageResize(w: number, hh: number) {
    const r = fitPixelCanvas(cv, w, hh, (dw, dh) => Math.max(1, Math.floor(Math.min(dw / 190, dh / 128))));
    W = r.w;
    H = r.h;
    makeBg();
  }

  function toCss(px: number, py: number) {
    const rect = cv.getBoundingClientRect();
    const k = rect.width / cv.width;
    return { x: rect.left + px * k, y: rect.top + py * k };
  }

  function cropScreen(t: Tab) {
    const c = cropFor(t.id, car);
    const { sx, sy } = carPos();
    const base = sy - car.ground;
    return { x0: sx + c.x0, y0: base + c.y0, x1: sx + c.x1, y1: base + c.y1 };
  }

  let raf = 0, last = performance.now();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    st.t += dt;
    st.bv += (-160 * st.by - 7 * st.bv) * dt;
    st.by += st.bv * dt;
    st.spinV *= Math.pow(0.15, dt);
    st.spin += st.spinV * dt;
    for (const s of sparkles) {
      s.life += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 60 * dt;
    }
    sparkles = sparkles.filter((s) => s.life < 0.7);
    const ctx = cv.getContext('2d')!;
    if (bgCv && W) {
      ctx.drawImage(bgCv, 0, 0);
      const { sx, sy } = carPos();
      drawCar(ctx, car, sx, sy, { ...IDLE_STATE, bounce: st.by, wheelAngle: st.spin, t: st.t, sway: Math.sin(st.t * 2) * 0.6 + st.by * 1.5 });
      if (dragTab) {
        const r = cropScreen(dragTab);
        const on = Math.floor(st.t * 8) % 2;
        ctx.fillStyle = dragOver ? 'rgba(255,220,60,0.28)' : 'rgba(255,220,60,0.12)';
        ctx.fillRect(Math.round(r.x0), Math.round(r.y0), Math.round(r.x1 - r.x0), Math.round(r.y1 - r.y0));
        ctx.fillStyle = dragOver ? '#ffe040' : '#c8a830';
        for (let x = Math.round(r.x0); x < r.x1; x++) {
          if ((x + on) % 4 < 2) {
            ctx.fillRect(x, Math.round(r.y0), 1, 1);
            ctx.fillRect(x, Math.round(r.y1) - 1, 1, 1);
          }
        }
        for (let y = Math.round(r.y0); y < r.y1; y++) {
          if ((y + on) % 4 < 2) {
            ctx.fillRect(Math.round(r.x0), y, 1, 1);
            ctx.fillRect(Math.round(r.x1) - 1, y, 1, 1);
          }
        }
      }
      for (const s of sparkles) {
        const k = 1 - s.life / 0.7;
        ctx.fillStyle = k > 0.5 ? '#ffffff' : '#ffe040';
        const x = Math.round(s.x), y = Math.round(s.y);
        ctx.fillRect(x, y, 1, 1);
        if (k > 0.3) {
          ctx.fillRect(x - 1, y, 3, 1);
          ctx.fillRect(x, y - 1, 1, 3);
        }
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function celebrate(t: Tab) {
    const r = cropScreen(t);
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 50;
      sparkles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: Math.random() * 0.2 });
    }
    st.bv -= 70;
    if (t.id === 'wheels') st.spinV = 25;
  }

  // ---------------------------------------------------------------- panel
  const tabsEl = h('nav', { class: 'tabs' });
  const grid = h('div', { class: 'grid' });
  const colors = h('div', { class: 'colors' });
  const panel = h('aside', { class: 'panel' }, tabsEl, grid, colors);

  function renderTabs() {
    tabsEl.innerHTML = '';
    for (const t of TABS) {
      const b = h('button', { class: 'tab' + (t === tab ? ' on' : ''), type: 'button', 'aria-label': t.label },
        h('span', { class: 'tab-emoji' }, t.emoji), h('span', { class: 'tab-label' }, t.label));
      b.addEventListener('click', () => {
        if (tab === t) return;
        tab = t;
        sfx.tab();
        renderTabs();
        renderGrid();
        renderColors();
        grid.scrollTop = 0;
      });
      tabsEl.append(b);
    }
    tabsEl.querySelector('.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function isSelected(t: Tab, id: string) {
    if (t.multi) return cfg.extras.includes(id);
    return (cfg as unknown as Record<string, string>)[t.id] === id;
  }

  function thumb(t: Tab, id: string) {
    const vcar = buildCar(variant(cfg, t, id));
    return renderCarStatic(vcar, cropFor(t.id, vcar));
  }

  function equip(t: Tab, id: string, fromDrag: boolean) {
    if (t.multi) {
      const has = cfg.extras.includes(id);
      if (has && !fromDrag) cfg.extras = cfg.extras.filter((x) => x !== id);
      else if (!has) cfg.extras = [...cfg.extras, id];
    } else {
      (cfg as unknown as Record<string, string>)[t.id] = id;
    }
    car = buildCar(cfg);
    makeBg();
    (t.id === 'wheels' ? sfx.clank : sfx.pop)();
    celebrate(t);
    if (hintShown) {
      hintShown = false;
      hint.classList.add('gone');
    }
    renderGrid();
  }

  function renderGrid() {
    grid.innerHTML = '';
    for (const opt of tab.list) {
      const t = tab;
      const th = thumb(t, opt.id);
      const sel = isSelected(t, opt.id);
      const item = h('button', { class: 'item' + (sel ? ' on' : ''), type: 'button', 'aria-label': opt.name },
        th, h('span', { class: 'name' }, opt.name),
        t.none === opt.id ? h('span', { class: 'none' }, '🚫') : null,
        sel ? h('span', { class: 'check' }, '✓') : null);
      attachDrag(item, th, t, opt.id);
      grid.append(item);
    }
  }

  function renderColors() {
    colors.innerHTML = '';
    if (!tab.color) {
      colors.append(h('div', { class: 'colors-note' }, '💡 Los faros se encienden al manejar'));
      return;
    }
    const slot = tab.color;
    for (const p of PAINTS) {
      const sw = h('button', {
        class: 'swatch' + (cfg.colors[slot] === p.id ? ' on' : ''), type: 'button', 'aria-label': p.name,
        style: `--sw:${p.ramp.b};--sw2:${p.ramp.d};--sw3:${p.ramp.l}`,
      });
      sw.addEventListener('click', () => {
        cfg.colors[slot] = p.id;
        sfx.paint();
        car = buildCar(cfg);
        st.bv -= 30;
        renderGrid();
        renderColors();
      });
      colors.append(sw);
    }
    if (slot === 'front' || slot === 'rear' || slot === 'cabin') {
      const all = btn('🪣 <span>Todo</span>', () => {
        const c = cfg.colors[slot];
        cfg.colors.front = cfg.colors.rear = cfg.colors.cabin = c;
        sfx.paint();
        car = buildCar(cfg);
        st.bv -= 50;
        renderGrid();
      }, 'small bucket', 'Pintar todo el coche');
      colors.append(all);
    }
    void paint;
  }

  // ---------------------------------------------------------------- arrastrar
  function attachDrag(item: HTMLElement, thumbCv: HTMLCanvasElement, t: Tab, id: string) {
    let pid = -1, sx = 0, sy = 0, dragging = false, type = '';
    let ghost: HTMLElement | null = null;
    const overStage = (x: number, y: number) => {
      const r = stage.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const place = (x: number, y: number) => {
      if (ghost) ghost.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${dragOver ? 1.15 : 1})`;
    };
    item.addEventListener('pointerdown', (e) => {
      if (pid !== -1) return;
      pid = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      type = e.pointerType;
      dragging = false;
      try { item.setPointerCapture(pid); } catch { /* */ }
      item.classList.add('press');
    });
    item.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragging) {
        if (Math.hypot(dx, dy) < 8) return;
        if (type !== 'mouse' && Math.abs(dy) > Math.abs(dx) * 1.3) return;
        dragging = true;
        const copy = document.createElement('canvas');
        copy.width = thumbCv.width;
        copy.height = thumbCv.height;
        copy.getContext('2d')!.drawImage(thumbCv, 0, 0);
        const size = item.getBoundingClientRect().width;
        ghost = h('div', { class: 'drag-ghost', style: `width:${size}px;height:${size}px` }, copy);
        document.body.append(ghost);
        dragTab = t;
        sfx.click();
      }
      const over = overStage(e.clientX, e.clientY);
      if (over !== dragOver) {
        dragOver = over;
        stage.classList.toggle('drop', over);
      }
      place(e.clientX, e.clientY);
    });
    const end = (e: PointerEvent, cancelled: boolean) => {
      if (e.pointerId !== pid) return;
      pid = -1;
      item.classList.remove('press');
      if (dragging) {
        const g = ghost;
        ghost = null;
        if (!cancelled && dragOver) {
          const r = cropScreen(t);
          const c = toCss((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2);
          if (g) {
            g.style.transition = 'transform .16s ease-in, opacity .16s';
            g.style.transform = `translate(${c.x}px, ${c.y}px) translate(-50%, -50%) scale(.4)`;
            g.style.opacity = '0';
            setTimeout(() => g.remove(), 180);
          }
          setTimeout(() => equip(t, id, true), 120);
        } else if (g) {
          g.style.transition = 'opacity .2s';
          g.style.opacity = '0';
          setTimeout(() => g.remove(), 220);
        }
        dragTab = null;
        dragOver = false;
        stage.classList.remove('drop');
      } else if (!cancelled) {
        equip(t, id, false);
      }
      dragging = false;
    };
    item.addEventListener('pointerup', (e) => end(e, false));
    item.addEventListener('pointercancel', (e) => end(e, true));
    item.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------------------------------------------------------------- guardar
  function openSave() {
    sfx.fanfare();
    const prev = renderCarStatic(car);
    prev.className = 'pixel save-preview';
    const input = h('input', { class: 'name-input', type: 'text', maxlength: '24', value: randomName(cfg), 'aria-label': 'Nombre del coche' });
    const close = () => modal.remove();
    const modal = h('div', { class: 'modal' },
      h('div', { class: 'modal-box' },
        h('h2', {}, '¡Qué coche tan genial!'),
        prev,
        h('div', { class: 'name-row' },
          input,
          btn('🎲', () => { input.value = randomName(cfg); }, 'round', 'Otro nombre')),
        h('div', { class: 'modal-actions' },
          btn('🔧 Seguir armando', close, 'ghost'),
          btn('🏁 ¡A manejar!', () => {
            const saved = addCar(input.value.trim() || randomName(cfg), structuredClone(cfg));
            close();
            nav.go('picker', { car: saved.id });
          }, 'green big')),
      ));
    root.append(modal);
  }

  const screen = h('div', { class: 'screen build' },
    topbar(
      btn('⬅', () => nav.go('title'), 'ghost round', 'Volver'),
      h('h1', {}, '🔧 Taller'),
      h('div', { class: 'spacer' }),
      btn('🎲 <span class="hide-sm">Sorpresa</span>', () => {
        Object.assign(cfg, randomCar());
        car = buildCar(cfg);
        makeBg();
        sfx.whoosh();
        st.bv -= 80;
        st.spinV = 20;
        renderGrid();
        renderColors();
      }, 'ghost', 'Coche sorpresa'),
      btn('✅ ¡Listo!', openSave, 'green'),
    ),
    h('main', { class: 'build-main' }, stage, panel),
  );
  root.append(screen);
  renderTabs();
  renderGrid();
  renderColors();
  const off = onResize(stage, stageResize);
  raf = requestAnimationFrame(frame);
  return () => {
    off();
    cancelAnimationFrame(raf);
    document.querySelectorAll('.drag-ghost').forEach((g) => g.remove());
  };
};
