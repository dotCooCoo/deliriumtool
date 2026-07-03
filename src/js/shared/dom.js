/**
 * shared/dom.js — small DOM primitives shared by the adult and pediatric tools.
 * faIcon builds a sprite icon element (FontAwesome <use>) for JS-rendered UI —
 * never emoji, and CSP-safe (no HTML string is parsed).
 */
const SVGNS = 'http://www.w3.org/2000/svg';

/** Element builder: el('div', { class: 'x', text: 'y' }, ...children). */
export function el(tag, props, ...kids) {
  const node = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, String(v));
    }
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
}

/** querySelector / querySelectorAll shorthands. */
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => Array.from(document.querySelectorAll(sel));

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

const GLOSSARY_SKIP_TAGS = new Set([
  'A',
  'ABBR',
  'BUTTON',
  'SCRIPT',
  'STYLE',
  'INPUT',
  'TEXTAREA',
  'SELECT',
  'OPTION',
  'SUMMARY',
  'SVG',
  'USE',
  'PATH',
  'G',
  'SYMBOL',
  'DEFS',
  'H1',
  'CODE',
]);

/**
 * applyGlossary — wrap the first occurrence (per root) of each glossary term in an
 * <abbr title="definition"> so acronyms get a hover/long-press explanation. Walks
 * text nodes only and skips interactive / icon / heading tags, so it never touches
 * controls or breaks the markup. `glossary` is term→definition; `roots` is a list
 * of container elements (typically the tab panels).
 */
export function applyGlossary(glossary, roots) {
  const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);
  if (!terms.length) return;
  // Escape every regex metacharacter in each term before building the alternation.
  const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${terms.map(escapeRe).join('|')})`);
  const walk = (node, done) => {
    for (let n = node.firstChild; n; ) {
      const next = n.nextSibling;
      if (n.nodeType === 3) {
        const txt = n.nodeValue;
        const m = re.exec(txt);
        if (m && !done[m[1]]) {
          done[m[1]] = 1;
          const term = m[1];
          const idx = m.index;
          const ab = document.createElement('abbr');
          ab.title = glossary[term];
          ab.textContent = term;
          const frag = document.createDocumentFragment();
          if (idx > 0) frag.appendChild(document.createTextNode(txt.slice(0, idx)));
          frag.appendChild(ab);
          if (idx + term.length < txt.length) {
            frag.appendChild(document.createTextNode(txt.slice(idx + term.length)));
          }
          n.parentNode.replaceChild(frag, n);
        }
      } else if (n.nodeType === 1 && !GLOSSARY_SKIP_TAGS.has(n.tagName.toUpperCase())) {
        walk(n, done);
      }
      n = next;
    }
  };
  roots.forEach((p) => walk(p, {}));
}
