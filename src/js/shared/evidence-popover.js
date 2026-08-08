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

/**
 * Two further comparisons, each forgiving one known difference between a
 * statement and the way the sheet prints it. A statement is tried against them
 * in order and binds at the first that finds exactly one node, so a more
 * forgiving comparison can never override an exact one.
 *
 * `printed` undoes what the sheet does for layout: hyphens inside short tokens
 * (T-A-D-A, CAM-ICU, WAT-1) are swapped for non-breaking hyphens so they cannot
 * wrap on a printed card, and a few spans use non-breaking spaces. Those
 * characters are the renderer's, not the source text's.
 *
 * `joined` drops the punctuation entirely. A statement often names a card item
 * and its description together — "Set a RASS goal every shift: Target the
 * lightest RASS…" — where the sheet prints the two as adjacent elements and the
 * colon joining them exists only in the statement.
 */
const printed = (s) =>
  norm(
    String(s == null ? '' : s)
      .replace(/\u2011/g, '-')
      .replace(/\u00a0/g, ' '),
  );
const joined = (s) =>
  printed(s)
    .toLowerCase()
    // Drop the separators and decorative glyphs a sheet adds; keep every
    // sign, comparison and percent. Stripping those would make ≥ and ≤,
    // or +4 and −4, the same key — the matcher would then be blind to
    // exactly the characters a clinical statement can least afford to have
    // confused, and two card items differing only by + and & would collide.
    .replace(/[^a-z0-9+\u2212<>=\u2264\u2265\u2260&%-]+/g, '');

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
 * Tag rendered statements in `container` that match a claim on the same tool
 * surface and wire the popover. A statement is compared to a node's text
 * exactly, then allowing for the sheet's layout substitutions, then ignoring
 * punctuation — binding at the first comparison that identifies exactly one
 * node, and left alone when none or several could be meant. Safe to call after
 * every re-render. Returns the number of matched anchors.
 */
export function wireEvidence(container, toolId, claims) {
  if (!container) return 0;
  const mine = claims.filter((c) => c.toolId === toolId);
  if (!mine.length) {
    closePopover(false);
    return 0;
  }
  // Read every node's text once, before anything is bound. Binding appends an
  // (i) button, which would otherwise become part of every ancestor's text and
  // change what a later comparison sees — making the result depend on the order
  // claims happen to be visited.
  const nodes = [];
  for (const n of container.querySelectorAll('*')) {
    if (n.classList.contains('ev-cited') || n.classList.contains('ev-i')) continue;
    nodes.push([n, n.textContent]);
  }

  const taken = new Set();
  const done = new Set();
  const pending = [];
  let matched = 0;
  for (const compare of [norm, printed, joined]) {
    const byKey = new Map();
    for (const [n, raw] of nodes) {
      if (taken.has(n)) continue;
      const k = compare(raw);
      if (!k) continue;
      const list = byKey.get(k);
      if (list) list.push(n);
      else byKey.set(k, [n]);
    }
    for (const claim of mine) {
      if (done.has(claim.id)) continue;
      const hits = (byKey.get(compare(claim.statement)) || []).filter((n) => !taken.has(n));
      if (!hits.length) continue;
      // Anchor only the tightest wrapper: drop any node that contains another
      // node carrying the same text. If that still leaves more than one, the
      // statement is not uniquely placed and binding it would be a guess.
      const tight = hits.filter((n) => !hits.some((m) => m !== n && n.contains(m)));
      if (tight.length !== 1) continue;
      const node = tight[0];
      pending.push([node, claim]);
      taken.add(node);
      done.add(claim.id);
      matched++;
    }
  }
  // Mark up only now. Appending during the passes would put the button's own
  // letter inside every ancestor's text, so a later pass would compare against
  // text this function had just altered.
  for (const [node, claim] of pending) {
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
