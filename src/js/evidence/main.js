/**
 * Sources & Evidence explorer (/evidence).
 *
 * Renders the bedside-tools claim-source map: every printed statement across the
 * eight templates, the source(s) it cites, the evidence status, and the supporting
 * passage from that source — so a reviewer can validate each statement without
 * opening the full text. Data is a build-time snapshot of the internal review
 * workbook (src/js/evidence/data.json).
 *
 * claimDetail() is deliberately standalone: the same node is reused later to power
 * hover/click evidence modals on the tool pages, keyed by claim id.
 */
import { el } from '../shared/dom.js';
import { STATUS_LABEL, STATUS_SHORT, STANCE_LABEL } from '../shared/evidence-vocab.js';
import DATA from './data.json';

// Evidence-status vocabulary → badge label + class. Order also drives the filter
// row. The wording is shared with the template previews' evidence popovers; only
// the class names are this page's own.
const STATUS_CLASS = {
  fulltext: 'ev-ok',
  instrument: 'ev-inst',
  guideline: 'ev-guide',
  abstract: 'ev-info',
  web: 'ev-warn',
  notstated: 'ev-flag',
  structure: 'ev-na',
  na: 'ev-na',
  other: 'ev-na',
};
const STATUS = Object.fromEntries(
  Object.keys(STATUS_LABEL).map((k) => [
    k,
    { label: STATUS_LABEL[k], short: STATUS_SHORT[k], cls: STATUS_CLASS[k] },
  ]),
);
const statusOf = (s) => STATUS[s] || STATUS.other;

// Split a passage into text + quoted runs so the cited phrase can be emphasized
// without parsing any HTML string (CSP-safe: nodes only).
function withQuotes(text) {
  const out = [];
  const re = /[“"]([^”"]{1,400})[”"]/g;
  let last = 0,
    m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    out.push(el('mark', { class: 'ev-quote' }, m[0]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
  return out;
}

// Render a verbatim source paragraph with the cited span highlighted (deterministic:
// `highlight` is an exact substring of `context`, both sliced from the source text).
function highlightContext(context, highlight) {
  const i = highlight ? context.indexOf(highlight) : -1;
  if (i < 0) return [document.createTextNode(context)];
  const out = [];
  if (i > 0) out.push(document.createTextNode(context.slice(0, i)));
  out.push(el('mark', { class: 'ev-quote' }, highlight));
  if (i + highlight.length < context.length)
    out.push(document.createTextNode(context.slice(i + highlight.length)));
  return out;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── Methodology rendering (CLINICAL_METHODOLOGY.md, parsed to blocks) ─────────
// Repo-relative links in the doc → GitHub blob URLs (the page is served from
// /evidence/, where a relative repo path would 404).
const REPO_BLOB = 'https://github.com/dotCooCoo/deliriumtool/blob/main/';
const URL_RE = /(https?:\/\/[^\s)]+)/g;
function urlText(text) {
  const out = [];
  let last = 0,
    m;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text))) {
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    out.push(
      el(
        'a',
        { class: 'ev-link', href: m[1], target: '_blank', rel: 'noopener' },
        hostOf(m[1]) + ' ↗',
      ),
    );
    last = URL_RE.lastIndex;
  }
  if (last < text.length) out.push(document.createTextNode(text.slice(last)));
  return out.length ? out : [document.createTextNode(text)];
}

// Inline runs {text, b?/i?/code?/href?} → CSP-safe nodes (no HTML parsing).
function mdSpans(spans) {
  const frag = document.createDocumentFragment();
  (spans || []).forEach((s) => {
    if (s.href) {
      const href = /^https?:/.test(s.href) ? s.href : REPO_BLOB + s.href.replace(/^(\.\.\/)+/, '');
      frag.append(el('a', { class: 'ev-link', href, target: '_blank', rel: 'noopener' }, s.text));
    } else if (s.code) {
      frag.append(el('code', { class: 'ev-md-code', text: s.text }));
    } else if (s.b) {
      frag.append(el('strong', { text: s.text }));
    } else if (s.i) {
      frag.append(el('em', { text: s.text }));
    } else {
      urlText(s.text).forEach((n) => frag.append(n));
    }
  });
  return frag;
}

// One methodology block: heading / paragraph / ordered|unordered list / table.
function mdBlock(b) {
  if (b.t === 'h')
    return el(
      b.level === 2 ? 'h3' : 'h4',
      { class: `ev-md-h ev-md-h${b.level}` },
      mdSpans(b.spans),
    );
  if (b.t === 'p') return el('p', { class: 'ev-md-p' }, mdSpans(b.spans));
  if (b.t === 'ul' || b.t === 'ol') {
    const list = el(b.t === 'ul' ? 'ul' : 'ol', { class: 'ev-md-list' });
    (b.items || []).forEach((it) => list.append(el('li', {}, mdSpans(it))));
    return list;
  }
  if (b.t === 'table') {
    const table = el('table', { class: 'ev-md-table' });
    table.append(
      el('thead', {}, el('tr', {}, ...(b.head || []).map((c) => el('th', {}, mdSpans(c))))),
    );
    const tbody = el('tbody', {});
    (b.rows || []).forEach((r) =>
      tbody.append(el('tr', {}, ...r.map((c) => el('td', {}, mdSpans(c))))),
    );
    table.append(tbody);
    // The wrapper scrolls sideways on a narrow screen, so it has to be
    // reachable by keyboard — a region a mouse can pan but a keyboard cannot is
    // content some readers simply cannot get to. tabindex makes it a tab stop
    // and the group role gives that stop a name to announce.
    return el(
      'div',
      { class: 'ev-md-tablewrap', tabindex: '0', role: 'group', 'aria-label': 'Table, scrollable' },
      table,
    );
  }
  return document.createTextNode('');
}

// Per-source stance → chip label + class.
const STANCE_CLASS = {
  agrees: 'st-ok',
  partial: 'st-warn',
  contradicts: 'st-flag',
  not_stated: 'st-na',
  not_addressed: 'st-na',
  background: 'st-na',
};
const STANCE = Object.fromEntries(
  Object.keys(STANCE_LABEL).map((k) => [k, { label: STANCE_LABEL[k], cls: STANCE_CLASS[k] }]),
);

// Per-paragraph scope relation to the claim.
const SCOPE = {
  'on-scope': { label: 'on-scope', cls: 'sc-ok' },
  'different-population': { label: 'different population', cls: 'sc-diff' },
  'different-setting': { label: 'different setting', cls: 'sc-diff' },
  'different-intervention': { label: 'different intervention', cls: 'sc-diff' },
  broader: { label: 'broader scope', cls: 'sc-adj' },
  narrower: { label: 'narrower scope', cls: 'sc-adj' },
  background: { label: 'background', cls: 'sc-na' },
};

// Web/guideline/label pages are mutable, so their citations carry the date the
// content was retrieved and verified. Stable journal articles (DOI / PubMed) do not.
const ACCESSED = '2026-08-02';
const isWebMutable = (u) => !!u && !/doi\.org|pubmed\.ncbi\.nlm\.nih\.gov/i.test(u);
function linkNode(u, cls) {
  const a = el(
    'a',
    { class: cls || 'ev-link', href: u, target: '_blank', rel: 'noopener' },
    hostOf(u) + ' ↗',
  );
  if (!isWebMutable(u)) return a;
  const frag = document.createDocumentFragment();
  frag.append(a, el('span', { class: 'ev-accessed', text: ` · accessed ${ACCESSED}` }));
  return frag;
}

/**
 * A page reference as it should read.
 *
 * "p. " is added ONLY to a bare page number or range. Every other recorded form
 * already states what it is — a manuscript page ("ms. p.8"), an electronic
 * article locator ("e838 (p. 14)"), a labelled section ("§5.12 QT Prolongation",
 * "Abstract", "Table 1"), or a value that spells the word out ("Page 17") — and
 * prefixing those produced "p. ms. p.8" and "p. Abstract". Anything unrecognized
 * prints as recorded, so a new form can never gain a prefix that contradicts it.
 */
const BARE_PAGE = /^(\d+(\s*[-–—]\s*\d+)?|[ivxlcdm]+(\s*[-–—]\s*[ivxlcdm]+)?|\d+\s+of\s+\d+)$/i;
function pageLabel(page) {
  const v = String(page).trim();
  return BARE_PAGE.test(v) ? `p. ${v}` : v;
}

// One relevant paragraph: scope tag + verbatim source paragraph with the cited span
// highlighted + an optional relevance/scope note.
function paragraphBlock(pg) {
  const sc = SCOPE[pg.scope] || SCOPE['on-scope'];
  const box = el('div', { class: 'ev-para' });
  const meta = el('div', { class: 'ev-para-meta' });
  meta.append(el('span', { class: `ev-scope ${sc.cls}`, text: sc.label }));
  if (pg.page) meta.append(el('span', { class: 'ev-srcblock-pg', text: pageLabel(pg.page) }));
  if (pg.docUrl) {
    meta.append(
      el(
        'a',
        { class: 'ev-doc-link', href: pg.docUrl, target: '_blank', rel: 'noopener' },
        'view in source ↗',
      ),
    );
  }
  box.append(meta);
  // A passage is quoted only when it has been read against the source, so there
  // is no approximate-extraction state to warn about. Content that cannot be
  // transcribed — a table in a scanned page, a source that is not held here —
  // carries no passage at all; the source keeps its stance and its note instead.
  box.append(
    el('blockquote', { class: 'ev-srcblock-q' }, ...highlightContext(pg.context, pg.highlight)),
  );
  if (pg.note) box.append(el('p', { class: 'ev-para-note', text: pg.note }));
  return box;
}

/** The supporting-evidence detail for one claim. Reused by the page and (later) modals. */
export function claimDetail(claim) {
  const wrap = el('div', { class: 'ev-detail' });

  // Site-customized rows carry no citation by design — explain why, don't leave it bare.
  if (claim.status === 'na') {
    wrap.append(
      el(
        'div',
        { class: 'ev-sitenote' },
        el('span', { class: 'ev-synth-k', text: 'Site content' }),
        el('span', {
          text: 'A locally-customized care-pathway item (e.g. a write-in field or unit-specific step) that each site adapts to its own protocol — it carries no central citation to review by design.',
        }),
      ),
    );
  }

  // Enhanced mode: per-source passages + agreement/discrepancy synthesis.
  if (claim.perSource && claim.perSource.length) {
    if (claim.synthesis) {
      wrap.append(
        el(
          'div',
          { class: `ev-synth${claim.discrepancy ? ' is-discrepancy' : ''}` },
          el('span', {
            class: 'ev-synth-k',
            text: claim.discrepancy ? 'Why this source' : 'Synthesis',
          }),
          el('span', { text: claim.synthesis }),
        ),
      );
    }
    if (claim.perSource.some((e) => e.context)) {
      wrap.append(
        el('p', {
          class: 'ev-hl-legend',
          text: 'Cited text is highlighted within its verbatim surrounding paragraph, sliced from the source.',
        }),
      );
    }
    claim.perSource.forEach((e) => {
      const st = STANCE[e.stance] || STANCE.background;
      const block = el('div', { class: 'ev-srcblock' });
      const head = el('div', { class: 'ev-srcblock-hd' });
      head.append(el('span', { class: 'ev-srcblock-name', text: e.label }));
      head.append(el('span', { class: `ev-stance ${st.cls}`, text: st.label }));
      if (e.page) head.append(el('span', { class: 'ev-srcblock-pg', text: pageLabel(e.page) }));
      if (e.verified)
        head.append(
          el('span', {
            class: 'ev-verified',
            title: 'Cited text located verbatim in the source',
            text: '✓ verbatim',
          }),
        );
      block.append(head);
      if (e.cite) block.append(el('p', { class: 'ev-srcblock-cite', text: e.cite }));
      if (e.paragraphs && e.paragraphs.length) {
        e.paragraphs.forEach((pg) => block.append(paragraphBlock(pg)));
      } else if (e.context) {
        block.append(
          el('blockquote', { class: 'ev-srcblock-q' }, ...highlightContext(e.context, e.highlight)),
        );
      } else if (e.passage) {
        block.append(el('blockquote', { class: 'ev-srcblock-q' }, ...withQuotes(e.passage)));
      } else if (e.note) {
        block.append(el('p', { class: 'ev-srcblock-note', text: e.note }));
      }
      wrap.append(block);
    });
    const links = (claim.links || []).filter((u) => /^https?:/.test(u));
    if (links.length) {
      const lrow = el('div', { class: 'ev-links' }, el('span', { class: 'ev-k', text: 'Links' }));
      links.forEach((u) => lrow.append(linkNode(u)));
      wrap.append(lrow);
    }
    return wrap;
  }

  // Fallback (single-source or not yet enhanced): the primary passage.
  if (claim.sources.length) {
    const srow = el('div', { class: 'ev-sources' }, el('span', { class: 'ev-k', text: 'Cites' }));
    claim.sources.forEach((s) => srow.append(el('span', { class: 'ev-src', text: s })));
    wrap.append(srow);
  }
  if (claim.anchor || claim.passage) {
    const block = el('figure', { class: 'ev-passage' });
    if (claim.anchor) block.append(el('figcaption', { class: 'ev-anchor', text: claim.anchor }));
    if (claim.passage) block.append(el('blockquote', {}, ...withQuotes(claim.passage)));
    wrap.append(block);
  }
  if (claim.citations.length) {
    const cl = el('div', { class: 'ev-cites' }, el('span', { class: 'ev-k', text: 'Citation' }));
    const ol = el('ol', { class: 'ev-cite-list' });
    claim.citations.forEach((c) => ol.append(el('li', { text: c })));
    cl.append(ol);
    wrap.append(cl);
  }
  const links = (claim.links || []).filter((u) => /^https?:/.test(u));
  if (links.length) {
    const lrow = el('div', { class: 'ev-links' }, el('span', { class: 'ev-k', text: 'Source' }));
    links.forEach((u) =>
      lrow.append(
        el('a', { class: 'ev-link', href: u, target: '_blank', rel: 'noopener' }, hostOf(u) + ' ↗'),
      ),
    );
    wrap.append(lrow);
  }
  if (claim.notes && claim.status !== 'na')
    wrap.append(el('p', { class: 'ev-notes', text: claim.notes }));
  return wrap;
}

// One claim card (native <details> = accessible, CSP-safe expand).
function claimCard(claim) {
  const st = statusOf(claim.status);
  const card = el('details', { class: 'ev-card', id: claim.id });
  card.dataset.status = claim.status;
  card.dataset.tool = claim.toolId;
  card.dataset.search = [claim.statement, claim.section, claim.sources.join(' '), claim.passage]
    .join(' ')
    .toLowerCase();

  const summary = el('summary', { class: 'ev-sum' });
  summary.append(
    el('span', { class: 'ev-stmt', text: claim.statement }),
    el('span', { class: `ev-badge ${st.cls}`, title: st.label, text: st.short }),
  );
  card.append(summary, claimDetail(claim));
  return card;
}

// ── Build the page ──────────────────────────────────────────────────────────
const root = document.getElementById('ev-root');
const claims = DATA.claims;
const tools = DATA.tools;
const byTool = (id) => claims.filter((c) => c.toolId === id);

// Status counts for the legend/filters.
const counts = {};
claims.forEach((c) => (counts[c.status] = (counts[c.status] || 0) + 1));

// Controls: search + status filter chips.
const controls = el('div', { class: 'ev-controls' });
const search = el('input', {
  type: 'search',
  id: 'ev-search',
  class: 'ev-search',
  placeholder: 'Search statements, sources, passages…',
  'aria-label': 'Search the evidence table',
  autocomplete: 'off',
});
const chips = el('div', {
  class: 'ev-chips',
  role: 'group',
  'aria-label': 'Filter by evidence status',
});
const active = new Set();
Object.keys(STATUS).forEach((key) => {
  if (!counts[key]) return;
  const chip = el('button', {
    type: 'button',
    class: `ev-chip ${STATUS[key].cls}`,
    'aria-pressed': 'false',
  });
  chip.dataset.status = key;
  chip.append(
    el('span', { class: 'ev-chip-dot' }),
    el('span', { text: STATUS[key].short }),
    el('span', { class: 'ev-chip-n', text: String(counts[key]) }),
  );
  chips.append(chip);
});
const resultCount = el('p', {
  class: 'ev-count',
  id: 'ev-count',
  role: 'status',
  'aria-live': 'polite',
});
controls.append(el('div', { class: 'ev-search-wrap' }, search, resultCount), chips);

// Left rail: jump nav by tool + reference/methodology links.
const rail = el('nav', { class: 'ev-rail', 'aria-label': 'Jump to a tool' });
const railList = el('ul', { class: 'ev-rail-list' });
tools.forEach((t) => {
  const n = byTool(t.id).length;
  if (!n) return;
  railList.append(
    el(
      'li',
      {},
      el(
        'a',
        { class: 'ev-rail-link', href: `#tool-${t.id}` },
        el('span', { text: t.label }),
        el('span', { class: 'ev-rail-n', text: String(n) }),
      ),
    ),
  );
});
rail.append(
  el('p', { class: 'ev-rail-h', text: 'Tools' }),
  railList,
  el('p', { class: 'ev-rail-h ev-rail-h2', text: 'More' }),
  el(
    'ul',
    { class: 'ev-rail-list' },
    el(
      'li',
      {},
      el(
        'a',
        { class: 'ev-rail-link', href: '#ev-methodology' },
        el('span', { text: 'Methodology' }),
      ),
    ),
    el(
      'li',
      {},
      el(
        'a',
        { class: 'ev-rail-link', href: '#ev-references' },
        el('span', { text: 'Reference list' }),
        el('span', { class: 'ev-rail-n', text: String(DATA.references.length) }),
      ),
    ),
  ),
);

// Main column: one section per tool → grouped by the tool's own sections.
const main = el('div', { class: 'ev-main' });
tools.forEach((t) => {
  const list = byTool(t.id);
  if (!list.length) return;
  const sec = el('section', {
    class: 'ev-tool',
    id: `tool-${t.id}`,
    'aria-labelledby': `h-${t.id}`,
  });
  sec.append(
    el(
      'div',
      { class: 'ev-tool-hd' },
      el('h2', { id: `h-${t.id}`, class: 'ev-tool-title', text: t.label }),
      el('span', { class: 'ev-tool-n', text: `${list.length} statements` }),
    ),
  );
  // group by section, preserving row order
  const groups = [];
  const seen = new Map();
  list.forEach((c) => {
    const key = c.section || '—';
    if (!seen.has(key)) {
      seen.set(key, { key, items: [] });
      groups.push(seen.get(key));
    }
    seen.get(key).items.push(c);
  });
  groups.forEach((g) => {
    const grp = el('div', { class: 'ev-group' });
    grp.append(el('h3', { class: 'ev-group-h', text: g.key }));
    g.items.forEach((c) => grp.append(claimCard(c)));
    sec.append(grp);
  });
  main.append(sec);
});

// Methodology & clinical basis — CLINICAL_METHODOLOGY.md folded in as structured
// blocks so the whole basis is on the page (nothing to download to review it).
if (DATA.methodology && DATA.methodology.length) {
  const mSec = el('section', {
    class: 'ev-method',
    id: 'ev-methodology',
    'aria-labelledby': 'h-method',
  });
  mSec.append(
    el(
      'div',
      { class: 'ev-tool-hd' },
      el('h2', { id: 'h-method', class: 'ev-tool-title', text: 'Methodology & clinical basis' }),
    ),
  );
  const body = el('div', { class: 'ev-md' });
  DATA.methodology.forEach((b) => body.append(mdBlock(b)));
  mSec.append(body);
  main.append(mSec);
}

// Reference index.
const refSec = el('section', {
  class: 'ev-refs',
  id: 'ev-references',
  'aria-labelledby': 'h-refs',
});
refSec.append(
  el(
    'div',
    { class: 'ev-tool-hd' },
    el('h2', { id: 'h-refs', class: 'ev-tool-title', text: 'Reference list' }),
    el('span', { class: 'ev-tool-n', text: `${DATA.references.length} sources` }),
  ),
);
const refList = el('ol', { class: 'ev-ref-list' });
DATA.references.forEach((r) => {
  const li = el('li', { class: 'ev-ref' });
  const head = el('div', { class: 'ev-ref-head' });
  head.append(el('span', { class: 'ev-ref-name', text: r.source }));
  head.append(
    el('span', {
      class: `ev-arch ${r.archived ? 'is-yes' : 'is-no'}`,
      text: r.archived ? 'archived' : 'not archived',
    }),
  );
  if (r.statements != null)
    head.append(
      el('span', {
        class: 'ev-ref-uses',
        text: `${r.statements} statement${r.statements === 1 ? '' : 's'}`,
      }),
    );
  li.append(head);
  if (r.citation) li.append(el('p', { class: 'ev-ref-cite', text: r.citation }));
  if (/^https?:/.test(r.link || '')) {
    li.append(el('div', { class: 'ev-ref-link' }, linkNode(r.link)));
  }
  refList.append(li);
});
refSec.append(refList);
main.append(refSec);

root.append(controls, el('div', { class: 'ev-layout' }, rail, main));

// ── Interactivity: search + status filters ──────────────────────────────────
const allCards = Array.from(root.querySelectorAll('.ev-card'));
function apply() {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  allCards.forEach((card) => {
    const okStatus = active.size === 0 || active.has(card.dataset.status);
    const okText = !q || card.dataset.search.includes(q);
    const vis = okStatus && okText;
    card.hidden = !vis;
    if (vis) shown++;
  });
  // hide empty groups + tool sections
  root.querySelectorAll('.ev-group').forEach((g) => {
    g.hidden = !g.querySelector('.ev-card:not([hidden])');
  });
  root.querySelectorAll('.ev-tool').forEach((s) => {
    s.hidden = !s.querySelector('.ev-card:not([hidden])');
  });
  resultCount.textContent = `${shown} of ${allCards.length} statements`;
}
search.addEventListener('input', apply);
chips.addEventListener('click', (e) => {
  const chip = e.target.closest('.ev-chip');
  if (!chip) return;
  const s = chip.dataset.status;
  if (active.has(s)) active.delete(s);
  else active.add(s);
  chip.setAttribute('aria-pressed', active.has(s) ? 'true' : 'false');
  chip.classList.toggle('is-on', active.has(s));
  apply();
});
apply();

// Deep-link: open + reveal the card named in the URL hash.
function openHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  const card = id && document.getElementById(id);
  if (card && card.classList.contains('ev-card')) {
    card.open = true;
    card.scrollIntoView({ block: 'center' });
  }
}
window.addEventListener('hashchange', openHash);
openHash();
