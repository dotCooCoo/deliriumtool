/**
 * shared/dom.js — small DOM primitives shared by the adult and pediatric tools.
 * faIcon builds a sprite icon element (FontAwesome <use>) for JS-rendered UI —
 * never emoji, and CSP-safe (no HTML string is parsed).
 */
const SVGNS = 'http://www.w3.org/2000/svg';

export function faIcon(id, cls) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', cls || 'fa');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVGNS, 'use');
  use.setAttribute('href', '#' + id);
  svg.appendChild(use);
  return svg;
}

/**
 * wireTablist — turn a `.tabs-inner` bar of `.tab-btn[data-tab]` buttons into an
 * ARIA tablist with roving focus and Arrow/Home/End keyboard navigation; the
 * matching `#tab-<name>` panels get role=tabpanel + aria-labelledby. `onSwitch(tab)`
 * is the tool's existing tab-switch function (which keeps aria-selected and the
 * roving tabindex in step on a normal click).
 */
export function wireTablist(onSwitch) {
  const bar = document.querySelector('.tabs-inner');
  if (!bar) return;
  bar.setAttribute('role', 'tablist');
  const btns = [...bar.querySelectorAll('.tab-btn')];
  btns.forEach((b) => {
    b.setAttribute('role', 'tab');
    if (!b.id) b.id = `tabbtn-${b.dataset.tab}`;
    const on = b.classList.contains('active');
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(`tab-${b.dataset.tab}`);
    if (panel) {
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', b.id);
      if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '0');
    }
  });
  bar.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const n =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? btns.length - 1
          : e.key === 'ArrowRight'
            ? (i + 1) % btns.length
            : (i - 1 + btns.length) % btns.length;
    btns[n].focus();
    onSwitch(btns[n].dataset.tab);
  });
}
