import { sfx } from '../audio';

type Kid = Node | string | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, unknown> = {},
  ...kids: Kid[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = String(v);
    else if (k === 'style') el.setAttribute('style', String(v));
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids) if (kid) el.append(kid);
  return el;
}

export function btn(label: string, onClick: () => void, cls = '', title?: string) {
  const b = h('button', { class: 'btn ' + cls, type: 'button', 'aria-label': title ?? label });
  b.innerHTML = label;
  b.addEventListener('click', () => {
    sfx.click();
    onClick();
  });
  return b;
}

export function topbar(...kids: Kid[]) {
  return h('header', { class: 'topbar' }, ...kids);
}

export type Screen = 'title' | 'build' | 'garage' | 'picker' | 'drive';
export interface Nav {
  go(s: Screen, params?: Record<string, string>): void;
}
export type Mount = (root: HTMLElement, params: Record<string, string>, nav: Nav) => () => void;

/** Observa el tamaño de un elemento y llama a fn (también una vez al inicio). */
export function onResize(el: HTMLElement, fn: (w: number, h: number) => void) {
  const ro = new ResizeObserver(() => fn(el.clientWidth, el.clientHeight));
  ro.observe(el);
  return () => ro.disconnect();
}
