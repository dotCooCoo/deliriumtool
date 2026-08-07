/**
 * evidence-popover.js — a small, accessible popover that surfaces the cited
 * sources behind a bedside statement, driven by the /evidence claim data.
 *
 * wireEvidence(container, toolId, claims) tags rendered statements that match a
 * claim (exact text, same tool surface) with an (i) affordance and opens the
 * popover on click / Enter / Space. The affordance is screen-only: it is
 * absolutely positioned (no layout impact on the auto-fit sheets), hidden in
 * print, and removed from the Save-PDF raster — so it never reaches the printed
 * artifact.
 *
 * The popover is a concise view — evidence status, each source's citation +
 * stance, and the synthesis — with a link to /evidence#<id> for the full
 * verbatim passages.
 */
import { el } from './dom.js';
import { STATUS_LABEL, STANCE_LABEL } from './evidence-vocab.js';

// Only the two ends of the scale get colour; the rest read as neutral chips.
const STATUS_MOD = { fulltext: 'is-ok', instrument: 'is-ok', notstated: 'is-flag', web: 'is-warn' };
const STANCE_MOD = {
  agrees: 'is-ok',
  partial: 'is-warn',
  contradicts: 'is-flag',
  not_stated: 'is-flag',
  not_addressed: '',
  background: '',
};
const STANCE = Object.fromEntries(
  Object.keys(STANCE_LABEL).map((k) => [k, { l: STANCE_LABEL[k], m: STANCE_MOD[k] }]),
);

// The evidence page — the popover's "full detail" target.
const EVIDENCE_URL = '/evidence/';

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return u;
  }
}

let openPop = null;
function closePopover(refocus) {
  if (!openPop) return;
  const { node, anchor, onDoc, onKey, onScroll } = openPop;
  document.removeEventListener('keydown', onKey, true);
  document.removeEventListener('pointerdown', onDoc, true);
  window.removeEventListener('resize', onScroll);
  window.removeEventListener('scroll', onScroll, true);
  node.remove();
  openPop = null;
  if (refocus && anchor && anchor.isConnected) (anchor.querySelector('.ev-i') || anchor).focus();
}

function sourceRow(e) {
  const st = STANCE[e.stance] || STANCE.background;
  const row = el('div', { class: 'ev-pop-src' });
  const hd = el('div', { class: 'ev-pop-src-hd' });
  hd.append(el('span', { class: 'ev-pop-src-name', text: e.label }));
  hd.append(el('span', { class: `ev-pop-stance ${st.m}`, text: st.l }));
  if (e.passages) {
    hd.append(
      el('span', {
        class: 'ev-pop-src-n',
        text: `${e.passages} passage${e.passages === 1 ? '' : 's'}`,
      }),
    );
  }
  row.append(hd);
  if (e.cite) row.append(el('p', { class: 'ev-pop-cite', text: e.cite }));
  if (/^https?:/.test(e.docUrl || '')) {
    row.append(
      el(
        'a',
        { class: 'ev-pop-link', href: e.docUrl, target: '_blank', rel: 'noopener' },
        hostOf(e.docUrl) + ' ↗',
      ),
    );
  }
  return row;
}

function buildBody(claim) {
  const body = el('div', { class: 'ev-pop-body' });
  body.append(
    el('span', {
      class: `ev-pop-badge ${STATUS_MOD[claim.status] || ''}`,
      text: STATUS_LABEL[claim.status] || 'Other',
    }),
  );
  if (claim.synthesis) {
    body.append(
      el(
        'div',
        { class: `ev-pop-synth${claim.discrepancy ? ' is-discrepancy' : ''}` },
        el('span', {
          class: 'ev-pop-k',
          text: claim.discrepancy ? 'Why this source' : 'Synthesis',
        }),
        el('span', { text: claim.synthesis }),
      ),
    );
  }
  if (claim.status === 'na') {
    body.append(
      el('p', {
        class: 'ev-pop-note',
        text: 'A locally-customized care-pathway item — it carries no central citation to review by design.',
      }),
    );
  }
  (claim.perSource || []).forEach((e) => body.append(sourceRow(e)));
  if (!(claim.perSource && claim.perSource.length) && claim.sources && claim.sources.length) {
    const row = el('div', { class: 'ev-pop-src' });
    row.append(
      el(
        'div',
        { class: 'ev-pop-src-hd' },
        el('span', { class: 'ev-pop-src-name', text: 'Cites' }),
      ),
    );
    row.append(el('p', { class: 'ev-pop-cite', text: claim.sources.join('; ') }));
    body.append(row);
  }
  if (claim.notes && claim.status !== 'na')
    body.append(el('p', { class: 'ev-pop-note', text: claim.notes }));
  body.append(
    el(
      'a',
      {
        class: 'ev-pop-more',
        href: `${EVIDENCE_URL}#${encodeURIComponent(claim.id)}`,
        target: '_blank',
        rel: 'noopener',
      },
      'Full detail & verbatim passages ↗',
    ),
  );
  return body;
}

function position(node, anchor) {
  const r = anchor.getBoundingClientRect();
  const pw = node.offsetWidth;
  const ph = node.offsetHeight;
  const m = 8;
  const left = Math.min(Math.max(m, r.left), window.innerWidth - pw - m);
  let top = r.bottom + m;
  if (top + ph > window.innerHeight - m && r.top - ph - m > 0) top = r.top - ph - m;
  top = Math.max(m, Math.min(top, window.innerHeight - ph - m));
  node.style.left = `${left + window.scrollX}px`;
  node.style.top = `${top + window.scrollY}px`;
}

function openPopover(anchor, claim) {
  closePopover(false);
  const node = el('div', {
    class: 'ev-pop',
    role: 'dialog',
    'aria-label': `Evidence for: ${claim.statement}`,
  });
  const head = el('div', { class: 'ev-pop-hd' });
  head.append(el('p', { class: 'ev-pop-stmt', text: claim.statement }));
  const close = el(
    'button',
    { type: 'button', class: 'ev-pop-x', 'aria-label': 'Close evidence' },
    '×',
  );
  head.append(close);
  node.append(head, buildBody(claim));
  document.body.appendChild(node);
  position(node, anchor);

  const onKey = (ev) => {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      closePopover(true);
    }
  };
  const onDoc = (ev) => {
    if (!node.contains(ev.target) && ev.target !== anchor && !anchor.contains(ev.target))
      closePopover(false);
  };
  const onScroll = () => position(node, anchor);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onDoc, true);
  window.addEventListener('resize', onScroll);
  window.addEventListener('scroll', onScroll, true);
  close.addEventListener('click', () => closePopover(true));
  openPop = { node, anchor, onDoc, onKey, onScroll };
  close.focus();
}

/**
 * Tag rendered statements in `container` that match a claim (same tool surface,
 * exact text) and wire the popover. Safe to call after every re-render. Returns
 * the number of matched anchors.
 */
export function wireEvidence(container, toolId, claims) {
  if (!container) return 0;
  const byStatement = new Map();
  for (const c of claims) if (c.toolId === toolId) byStatement.set(norm(c.statement), c);
  if (!byStatement.size) {
    closePopover(false);
    return 0;
  }
  let matched = 0;
  for (const node of container.querySelectorAll('*')) {
    if (node.classList.contains('ev-cited') || node.classList.contains('ev-i')) continue;
    const text = norm(node.textContent);
    const claim = byStatement.get(text);
    if (!claim) continue;
    // Anchor only the tightest wrapper: if a descendant already carries the same
    // full text, that descendant is the better anchor (skip this outer node).
    let hasTighter = false;
    for (const child of node.querySelectorAll('*')) {
      if (norm(child.textContent) === text) {
        hasTighter = true;
        break;
      }
    }
    if (hasTighter) continue;
    // The (i) is the interactive trigger — a real <button>, so it is
    // keyboard-operable and valid inside a list/table. The statement element
    // itself stays a plain, unmodified node (no role/tabindex), preserving
    // list/heading/table semantics; it is also mouse-clickable via delegation.
    node.classList.add('ev-cited');
    node.dataset.evidence = claim.id;
    node.appendChild(
      el(
        'button',
        { type: 'button', class: 'ev-i', 'aria-label': `Show evidence for: ${claim.statement}` },
        'i',
      ),
    );
    matched++;
  }
  if (!container.__evWired) {
    container.__evWired = true;
    const byId = new Map(claims.map((c) => [c.id, c]));
    // A native <button> raises a click on Enter/Space, so mouse and keyboard
    // both flow through this one delegated handler.
    container.addEventListener('click', (e) => {
      const host = e.target.closest && e.target.closest('.ev-cited');
      if (!host) return;
      const claim = byId.get(host.dataset.evidence);
      if (claim) openPopover(host, claim);
    });
  }
  return matched;
}
