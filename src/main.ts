import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import './styles/breakpoints.css';
import './styles/main.css';
import { unlockAudio } from './audio';
import { Nav, Screen, Mount } from './ui/dom';
import { mountTitle } from './ui/title';
import { mountBuild } from './ui/build';
import { mountGarage } from './ui/garage';
import { mountPicker } from './ui/picker';
import { mountDrive } from './ui/drive';

const screens: Record<Screen, Mount> = {
  title: mountTitle,
  build: mountBuild,
  garage: mountGarage,
  picker: mountPicker,
  drive: mountDrive,
};

const root = document.getElementById('app')!;
let cleanup: (() => void) | null = null;

const nav: Nav = {
  go(s, params = {}) {
    cleanup?.();
    (document.activeElement as HTMLElement | null)?.blur?.();
    root.innerHTML = '';
    window.scrollTo(0, 0);
    root.scrollTop = 0;
    cleanup = screens[s](root, params, nav);
    const q = new URLSearchParams(params);
    history.replaceState(null, '', `#${s}${q.toString() ? '?' + q : ''}`);
  },
};

// iOS: audio sólo después de un toque; evitar zoom con gestos y menú contextual.
window.addEventListener('pointerdown', unlockAudio, { capture: true });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// Breakpoint actual (para depurar con ?debug=1)
const BP = [
  { name: 'phone', q: '(max-height: 499px)' },
  { name: 'tablet-xl', q: '(min-height: 900px)' },
  { name: 'tablet', q: '(min-height: 500px)' },
];
function updateBp() {
  const bp = BP.find((b) => matchMedia(b.q).matches)?.name ?? 'tablet';
  document.documentElement.dataset.bp = bp;
  const badge = document.getElementById('debug-bp');
  if (badge) badge.textContent = `${bp} · ${innerWidth}×${innerHeight} @${devicePixelRatio}x`;
}
if (new URLSearchParams(location.search).has('debug')) {
  const b = document.createElement('div');
  b.id = 'debug-bp';
  document.body.append(b);
}
addEventListener('resize', updateBp);
updateBp();

// Arranque: respetar la pantalla del hash (útil al recargar)
const [hs, hq] = location.hash.slice(1).split('?');
const start = (hs as Screen) in screens ? (hs as Screen) : 'title';
const params = Object.fromEntries(new URLSearchParams(hq ?? ''));
nav.go(start === 'drive' || start === 'picker' ? (params.car ? start : 'garage') : start, params);
