/**
 * citations.js — renders inline citation superscripts and per-tab numbered
 * reference lists from the single registry in data/refs.js.
 *
 *   Inline:  <a class="cite" data-ref="padis2025"></a>   → [n] linking to the source
 *   List:    <ol class="auto-refs" data-refs="ely2001,..."></ol>
 *
 * Within each panel the numbering follows order of first appearance of the inline
 * citations, then any list-only sources.
 */
import { DELIRIUM_REFS as R } from './data/refs.js';

// Build a reference list item with DOM methods (no innerHTML) so registry text is
// always inserted as inert text, never parsed as markup.
function refItem(id) {
  const li = document.createElement('li');
  const r = R[id];
  if (!r) return li;
  li.id = `ref-${id}`;
  const label = document.createElement('strong');
  label.textContent = `${r.l}.`;
  const link = document.createElement('a');
  link.href = r.u;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = r.u;
  li.append(label, ` ${r.c} `, link);
  return li;
}

function numberPanel(panel) {
  const seen = {};
  const order = [];

  const cites = panel.querySelectorAll('a.cite[data-ref]');
  cites.forEach((a) => {
    const id = (a.getAttribute('data-ref') || '').trim();
    if (R[id] && !(id in seen)) {
      seen[id] = order.length + 1;
      order.push(id);
    }
  });

  const listEl = panel.querySelector('.auto-refs[data-refs]');
  if (listEl) {
    (listEl.getAttribute('data-refs') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((id) => {
        if (R[id] && !(id in seen)) {
          seen[id] = order.length + 1;
          order.push(id);
        }
      });
  }

  cites.forEach((a) => {
    const id = (a.getAttribute('data-ref') || '').trim();
    const r = R[id];
    if (!r) return;
    a.href = r.u;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = `${r.l} — ${r.c}`;
    a.textContent = `[${seen[id]}]`;
    a.setAttribute('aria-label', `Reference ${seen[id]}: ${r.l}`);
  });

  if (listEl) {
    listEl.replaceChildren();
    order.forEach((id) => listEl.append(refItem(id)));
  }
}

/** Number and link every citation across all tab panels. */
export function initCitations(root = document) {
  root.querySelectorAll('.tab-panel').forEach(numberPanel);
}
