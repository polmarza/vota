/*
  Copia recortada de taste-skill system.js (propuestas-diseno/taste/1-ventana/assets/system.js).
  Solo quedan las partes que usa la web: la cabecera (menú del móvil), la barra de acción del móvil,
  el tono de la página y la carga de los momentos (assets/moments). El resto del kit (pestañas, FAQ,
  horarios, formularios, efectos, fragmentos de UI, avisos de maqueta) no se usa y se ha quitado.
  Las funciones que quedan son las del kit, sin cambios.
*/
import { ready as momentsReady } from './moments/moments.js';

function nav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const toggle = nav.querySelector('.nav__toggle');
  const bars = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const cross = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const setOpen = open => {
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-locked', open);
    if (toggle) { toggle.setAttribute('aria-expanded', String(open)); toggle.innerHTML = open ? cross : bars; }
  };
  toggle?.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  nav.querySelectorAll('.nav__item').forEach(item => {
    if (!item.querySelector('.nav__menu')) return;
    let btn = item.querySelector('.nav__expand');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'nav__expand';
      btn.type = 'button';
      btn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      item.querySelector('.nav__link').after(btn);
    }
    const label = item.querySelector('.nav__link')?.textContent.trim() || 'section';
    btn.setAttribute('aria-label', `Show ${label} links`);
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const open = !item.classList.contains('is-expanded');
      item.classList.toggle('is-expanded', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (nav.classList.contains('is-open')) { setOpen(false); toggle?.focus(); return; }
    if (nav.contains(document.activeElement)) document.activeElement.blur();
  });
  // a tap on any link in the open sheet closes it (a top-level word, a menu link, an action, an
  // in-page #anchor alike), so the page it leads to is never left under the sheet
  nav.addEventListener('click', e => {
    if (nav.classList.contains('is-open') && e.target.closest?.('a[href]')) setOpen(false);
  });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) setOpen(false); });
}

let probe;
function rgb(value) {
  value = (value || '').trim();
  if (!value) return null;
  probe = probe || document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  probe.canvas.width = probe.canvas.height = 1;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = '#000';
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return d[3] ? [d[0], d[1], d[2]] : null;
}

/* ------------------------------------------------------------------ phone action bar
   The bar repeats the page's main actions at a phone's foot, so it waits until the hero's main button has
   scrolled off the top, and steps away while a link or button on the screen does what one of its own does (the
   same address, or the same words): one screen never shows one action twice. Hidden it is inert (nothing in it
   takes the focus or is read), and it never hides while the focus is in it. Without script it is always there,
   and every section pads for it (system.css, --bar). */
function actionbar() {
  const bar = document.querySelector('body > nav.actionbar');
  if (!bar) return;
  const set = shown => {
    const v = shown ? 'shown' : 'hidden';
    if (bar.dataset.bar === v) return;
    bar.dataset.bar = v;
    bar.inert = !shown;
  };
  if (!('IntersectionObserver' in window)) { set(true); return; }
  set(false);
  const words = el => (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const own = [...bar.querySelectorAll('a[href], button')];
  const hrefs = new Set(own.filter(a => a.tagName === 'A').map(a => a.href));
  const labels = new Set(own.map(words).filter(Boolean));
  const twins = [...document.querySelectorAll('a[href], button')].filter(el => !bar.contains(el) && ((el.tagName === 'A' && hrefs.has(el.href)) || labels.has(words(el))));
  const hero = document.querySelector('main > :is(.hero, .section--hero)');
  const lead = hero ? hero.querySelector('.btn--primary') || hero.querySelector('.btn') || hero : null;
  let past = !lead; // no hero: only the twins on the screen decide
  const onScreen = new Set();
  const update = () => {
    const show = past && !onScreen.size;
    if (!show && bar.contains(document.activeElement)) return;
    set(show);
  };
  if (lead) new IntersectionObserver(es => {
    for (const e of es) past = !e.isIntersecting && e.boundingClientRect.top < 0;
    update();
  }).observe(lead);
  // a twin under the bar's own strip is hidden by it, so it counts once it is above the strip
  if (twins.length) {
    const io = new IntersectionObserver(es => {
      for (const e of es) { if (e.isIntersecting) onScreen.add(e.target); else onScreen.delete(e.target); }
      update();
    }, { rootMargin: '0px 0px -64px 0px' });
    twins.forEach(t => io.observe(t));
  }
  bar.addEventListener('focusout', () => setTimeout(update));
  update();
}

/* ------------------------------------------------------------------ page tone
   <html data-tone="dark|light"> from the palette's base, so a dark footer stays dark on a dark page
   (system.css .footer--dark) instead of turning into the light inverse */
function tone() {
  const c = rgb(getComputedStyle(document.documentElement).getPropertyValue('--p-bg'));
  if (!c) return;
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  document.documentElement.dataset.tone = L < 0.18 ? 'dark' : 'light';
}

/* ------------------------------------------------------------------ moments
   moments.js se importa de forma estática (arriba) para que Vite lo empaquete; monta los
   [data-moment] de la página por su cuenta. */
function init() {
  try { tone(); } catch (e) { console.warn('system.js: tone', e); }
  nav();
  // a bar that could not be wired stays shown, as without script, and the hero pads for it again
  try { actionbar(); } catch (e) { console.warn('system.js: actionbar', e); const b = document.querySelector('body > nav.actionbar'); if (b) { b.dataset.bar = 'always'; b.inert = false; } }
  momentsReady.finally(() => { document.documentElement.dataset.ready = '1'; });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();

export default { init };
