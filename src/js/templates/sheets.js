/**
 * templates/sheets.js — renders the printable sheets from the customization
 * state. The preview IS the artifact: the same DOM prints via @media print,
 * so what the designer shows is exactly what gets laminated. All content is
 * built with safe DOM APIs (createElement + textContent) — no HTML parsing.
 */
import {
  TEMPLATES,
  RASS_ROWS,
  RASS_TARGETS,
  RASS_ZONES,
  STATUS,
  MNEMONIC,
  NONPHARM,
  PHARM,
  MEDS_SECTION,
  MED_TONES,
  PATHWAY,
  SPA_COLS,
  SPA_DEEPER,
  ESCALATION,
  FOOTER_CITES,
  SHEET_DISCLAIMER,
} from './data/content.js';
import { MEDS } from '../data/meds.js';
import { PEDS_FOOTER_CITES, PEDS_CITE_LABELS } from './data/peds-content.js';
import { renderPedsCards, renderPedsWorkflow } from './peds-cards.js';
import { DELIRIUM_REFS } from '../data/refs.js';
import { faIcon } from '../shared/dom.js';
import {
  el,
  nobreak,
  box,
  circleBox,
  blank,
  checkItem,
  ov,
  secOn,
  itemOn,
  customLines,
} from './primitives.js';
export { el, nobreak, box, circleBox, blank, checkItem, ov, secOn, itemOn };

const facilityLabel = (state) => state.facility.trim() || 'Your facility';

function tplDef(state) {
  return TEMPLATES.find((t) => t.id === state.template) || TEMPLATES[0];
}

function rassTargetDef(state) {
  return RASS_TARGETS.find((t) => t.id === state.rassTarget) || RASS_TARGETS[1];
}

/**
 * Medication display name. Brand names live in parentheses in the registry —
 * strip them unless the unit enables brand names; clinical qualifiers
 * (routes, "high dose", risk notes) always stay.
 */
export function medDisplayName(name, showBrands) {
  if (showBrands) return name;
  return name
    .replace(/\s*\(([^)]*)\)/g, (m, inner) => {
      const kept = inner
        .split(/,\s*/)
        .filter((tok) => /^(iv|im|po|qtc)\b/i.test(tok) || tok === tok.toLowerCase());
      return kept.length ? ` (${kept.join(', ')})` : '';
    })
    .trim();
}

/** Sources line for the sheet footer, e.g. "PADIS 2018 · PADIS 2025 · …". */
function sourcesLine(state) {
  const keys = FOOTER_CITES[state.template] || PEDS_FOOTER_CITES[state.template] || [];
  return keys
    .map((k) => (DELIRIUM_REFS[k] ? DELIRIUM_REFS[k].l : PEDS_CITE_LABELS[k] || ''))
    .filter(Boolean)
    .map((label) => label.replace(/ /g, '\u00a0'))
    .join(' · ');
}

export function sheetFooter(state, page, pages) {
  const stamp = [state.docRev.trim(), state.docDate.trim()].filter(Boolean).join(' · ');
  return el(
    'div',
    { class: 'sh-foot' },
    el(
      'span',
      { class: 'sh-foot-left' },
      el('div', { text: `${facilityLabel(state)} · ${tplDef(state).name}` }),
      stamp ? el('div', { class: 'sh-foot-stamp', text: stamp }) : null,
    ),
    el('span', {
      class: 'sh-foot-mid',
      text: `${SHEET_DISCLAIMER} · Sources: ${sourcesLine(state)}`,
    }),
    el('span', { class: 'sh-foot-right', text: `Page ${page} of ${pages}` }),
  );
}

/** Unit-authored sections for one page — full-width titled checklists. */
function customSections(state, page) {
  // Own-card sections authored on the peds card set (page 0) fold onto the
  // adult sheets' page 2 so switching templates never silently drops content.
  return state.customSections
    .filter((sec) => (sec.page === page || (page === 2 && sec.page === 0)) && sec.lines.length)
    .map((sec) =>
      el(
        'div',
        { class: 'sh-section' },
        band('ink', sec.title),
        el('div', { class: 'sh-custom-lines' }, ...sec.lines.map((t) => checkItem(t))),
      ),
    );
}

/** deliriogenic categories with at least one selected agent. */
function selectedMedCats(state) {
  return MEDS.categories
    .map((c) => ({
      id: c.id,
      label: c.label,
      tone: MED_TONES[c.id] || 'slate',
      names: c.items
        .filter((i) => state.meds[i.id])
        .map((i) => medDisplayName(i.name, state.showBrands)),
    }))
    .filter((c) => c.names.length);
}

export const sheetIcon = (icon, cls) => faIcon(`fa-${icon}`, cls || 'sh-ico');

export function band(tone, text, icon) {
  const b = el('div', { class: `sh-band tone-${tone}` });
  if (icon) b.append(sheetIcon(icon, 'sh-ico sh-band-ico'));
  b.append(el('span', { text: nobreak(text) }));
  return b;
}

// ── Rounding tool (landscape, per-patient) ───────────────────────────────────

function roundingHead(state) {
  const t = tplDef(state);
  const unit = state.unit.trim();
  // Patient / Room / Date live on a light row under the title band so the
  // printed sheet takes a dark pen.
  return [
    el(
      'div',
      { class: 'sh-head' },
      el(
        'div',
        { class: 'sh-head-titles' },
        el('div', { class: 'sh-title', text: t.defaultTitle }),
        el('div', { class: 'sh-sub', text: t.defaultSubtitle + (unit ? ` · ${unit}` : '') }),
      ),
    ),
    el(
      'div',
      { class: 'sh-head-meta' },
      el('span', {}, 'Patient: ', blank('w-lg grow')),
      el('span', {}, 'Room: ', blank('w-sm')),
      el('span', {}, 'Date: ', blank('w-md')),
    ),
  ];
}

function rassMiniTable(state) {
  const target = rassTargetDef(state);
  const rows = RASS_ROWS.map((r) => {
    const isTarget = r.scores.every((s) => target.scores.includes(s));
    const zone = RASS_ZONES[r.scores[0]] || 'ink';
    return el(
      'div',
      { class: `sh-rass-row z-${zone}${isTarget ? ' is-target' : ''}` },
      circleBox(),
      el('span', { class: 'sh-rass-score', text: r.label }),
      el('span', { class: 'sh-rass-desc', text: r.desc + (isTarget ? '  ✓ TARGET' : '') }),
    );
  });
  return el('div', { class: 'sh-rass' }, ...rows);
}

function statusStrip(state) {
  const target = rassTargetDef(state);
  const cell = (tone, head, body) =>
    el(
      'div',
      { class: `sh-cell tone-${tone}` },
      el('div', { class: 'sh-cell-head', text: head }),
      el('div', { class: 'sh-cell-body' }, ...body),
    );
  return el(
    'div',
    { class: 'sh-strip' },
    cell('teal', 'Sedation goal', [
      target.writeIn
        ? el('div', { class: 'sh-goal' }, 'Target RASS: ', blank('w-md grow'))
        : el('div', { class: 'sh-goal', text: `Target RASS: ${target.label}` }),
      ...STATUS.sedation.lines.map((t) => el('div', { class: 'sh-small', text: t })),
      target.note ? el('div', { class: 'sh-small sh-strong', text: target.note }) : null,
    ]),
    cell(
      'plum',
      'CAM-ICU result',
      STATUS.cam.options.map((t) => checkItem(t, 'sh-item--lg')),
    ),
    cell(
      'slate',
      'Delirium subtype',
      STATUS.subtype.options.map((t) => checkItem(t, 'sh-item--md')),
    ),
    cell('rust', 'RASS this assessment', [rassMiniTable(state)]),
  );
}

function mnemonicSection(state) {
  const cells = MNEMONIC.cells.filter((c) => itemOn(state, c.id));
  if (!cells.length) return null;
  const grid = el('div', { class: 'sh-mnem-grid' });
  cells.forEach((c) => {
    const cellEl = el(
      'div',
      { class: `sh-mnem-cell tone-${c.tone}` },
      el(
        'div',
        { class: 'sh-mnem-head' },
        el('span', { class: 'sh-mnem-ltr', text: c.ltr }),
        el('span', { class: 'sh-mnem-word', text: nobreak(ov(state, c.id, c.word)) }),
      ),
      checkItem('Reviewed', 'sh-item--tight'),
      el('div', { class: 'sh-note', text: nobreak(c.note) }),
    );
    if (state.showActions) cellEl.append(el('div', { class: 'sh-action' }, 'Action: ', blank()));
    grid.append(cellEl);
  });
  return el(
    'div',
    { class: 'sh-section' },
    band('ink', 'Step 1 · Identify & address causative factors — DELIRIUM(S)', 'magnifying-glass'),
    grid,
  );
}

function nonpharmSection(state) {
  const groups = NONPHARM.groups
    .map((g) => {
      const items = g.items.filter((i) => itemOn(state, i.id));
      const custom = customLines(state, g.id);
      if (!items.length && !custom.length) return null;
      const head = el('div', { class: 'sh-group-head' });
      if (g.icon) head.append(sheetIcon(g.icon));
      head.append(el('span', { text: nobreak(ov(state, g.id, g.head)) }));
      return el(
        'div',
        { class: `sh-group tone-${g.tone}` },
        head,
        ...items.map((i) => checkItem(ov(state, i.id, i.text))),
        ...custom,
      );
    })
    .filter(Boolean);
  if (!groups.length) return null;
  return el(
    'div',
    { class: 'sh-section' },
    band('green', 'Step 2 · Non-pharmacologic bundle — first-line, apply to all patients', 'leaf'),
    el('div', { class: 'sh-group-grid' }, ...groups),
  );
}

function notesSection() {
  return el('div', { class: 'sh-notes' }, el('strong', {}, 'Rounds notes / plan: '), blank('grow'));
}

function pharmCard(state) {
  const rows = PHARM.rows.filter((r) => itemOn(state, r.id));
  const cautions = PHARM.cautions.filter((c) => itemOn(state, c.id));
  const kids = [
    el('div', { class: 'sh-pharm-lead', text: PHARM.lead }),
    el('div', { class: 'sh-note', text: PHARM.leadNote }),
  ];
  rows.forEach((r) => {
    const line = el('div', { class: `sh-pharm-row${r.warn ? ' is-warn' : ''}` });
    if (r.warn) line.append(sheetIcon('triangle-exclamation', 'sh-ico sh-warn-inline'));
    line.append(el('strong', {}, `${r.drug}: `));
    const text = ov(state, r.id, r.text);
    line.append(
      document.createTextNode(nobreak(state.showDoses && r.dose ? `${r.dose} · ${text}` : text)),
    );
    kids.push(line);
  });
  cautions.forEach((c) => {
    const line = el('div', { class: `sh-pharm-caution${c.stop ? ' is-stop' : ''}` });
    if (c.stop) line.append(sheetIcon('triangle-exclamation', 'sh-ico sh-warn-inline'));
    line.append(el('span', { text: nobreak(ov(state, c.id, c.text)) }));
    kids.push(line);
  });
  if (state.showDoses) kids.push(el('div', { class: 'sh-note', text: PHARM.doseNote }));
  return el('div', { class: 'sh-pharm-card' }, ...kids);
}

/**
 * Sizing model for the medication mosaic: one medication per line whenever it
 * can stay legible, with the font scaling down continuously as the selection
 * grows (8.6pt at ≤30 agents → 6.5pt floor at ~72); beyond that each card
 * wraps its list so even the full catalog fits.
 */
export function medMosaicSpec(cats) {
  const count = cats.reduce((a, c) => a + c.names.length, 0);
  // Always one medication per line so each agent keeps a check-off square —
  // the font and the column width both scale down as the selection grows.
  const colw = Math.max(1.5, Math.min(2.7, Math.round((2.7 - (count - 12) * 0.015) * 100) / 100));
  const size = Math.max(6.4, Math.min(8.6, Math.round((8.6 - (count - 30) * 0.03) * 10) / 10));
  // Cap the column count by the content (~13 lines per column incl. each
  // card's heading) so a small selection forms a few full columns instead of
  // being balanced thinly across every column the width could fit. The
  // unified cap counts the pinned guidance card as ~12 lines of column 0, so
  // medications start flowing beneath it as the selection grows.
  const units = count + cats.length * 2;
  const cols = Math.max(1, Math.ceil(units / 13));
  const colsUnified = Math.max(2, Math.ceil((units + 12) / 13));
  return { mode: 'lines', size, cls: count <= 30 ? 'lg' : 'dyn', colw, cols, colsUnified, count };
}

/** The colour cards of the mosaic — one check-off line per medication. */
function medCardEls(cats, spec) {
  void spec;
  return cats.map((c) =>
    el(
      'div',
      { class: `sh-med-card tone-${c.tone}` },
      el('div', { class: 'sh-med-card-head', text: c.label }),
      ...c.names.map((n) =>
        el(
          'div',
          { class: 'sh-med-line' },
          el('span', { class: 'sh-med-box', 'aria-hidden': 'true' }),
          el('span', { text: n }),
        ),
      ),
    ),
  );
}

const medsHead = () =>
  el('div', { class: 'sh-meds-head' }, sheetIcon('pills'), el('span', { text: MEDS_SECTION.head }));

function medsGrid(state) {
  const cats = selectedMedCats(state);
  if (!cats.length) return null;
  // Fewer selected agents → larger type. The mosaic (default) packs colour
  // cards into balanced columns; "Category rows" is the classic layout.
  const spec = medMosaicSpec(cats);
  let grid;
  if (state.medLayout === 'rows') {
    grid = el('div', { class: 'sh-meds-grid' });
    cats.forEach((c) => {
      grid.append(
        el(
          'div',
          { class: `sh-meds-row tone-${c.tone}` },
          el('div', { class: 'sh-meds-cat', text: c.label }),
          el(
            'div',
            { class: 'sh-meds-list' },
            ...c.names.map((n) =>
              el(
                'span',
                { class: 'sh-med-inline' },
                el('span', { class: 'sh-med-box', 'aria-hidden': 'true' }),
                el('span', { text: n }),
              ),
            ),
          ),
        ),
      );
    });
  } else {
    grid = el('div', { class: 'sh-meds-cards' }, ...medCardEls(cats, spec));
  }
  const wrap = el('div', { class: `sh-meds meds-${spec.cls}` }, medsHead(), grid);
  wrap.style.setProperty('--med-fs', `${spec.size}pt`);
  wrap.style.setProperty('--med-colw', `${spec.colw}in`);
  wrap.style.setProperty('--med-cols', spec.cols);
  return wrap;
}

function pharmSection(state) {
  const showPharm = secOn(state, 'sec-pharm');
  const showMeds = secOn(state, 'sec-meds');
  if (!showPharm && !showMeds) return null;
  const cats = showMeds ? selectedMedCats(state) : [];
  let body;
  // Unify only while the guidance card's wide columns don't cost the (larger)
  // medication list too much width; big selections separate again so the meds
  // can use narrow columns.
  const unified =
    state.medLayout !== 'rows' && showPharm && cats.length > 0 && medMosaicSpec(cats).count <= 60;
  if (unified) {
    // One unified mosaic: the guidance card is pinned top-left and the
    // medication cards flow after it, filling the space beneath. The meds
    // heading lives in the band so it can't land mid-column.
    const spec = medMosaicSpec(cats);
    body = el(
      'div',
      { class: `sh-meds sh-pharm-mosaic meds-${spec.cls}` },
      pharmCard(state),
      ...medCardEls(cats, spec),
    );
    body.style.setProperty('--med-fs', `${spec.size}pt`);
    // The guidance card needs reading width — never narrower than 2.35in.
    body.style.setProperty('--med-colw', `${Math.max(spec.colw, 2.35)}in`);
    body.style.setProperty('--med-cols', spec.colsUnified);
  } else {
    body = el('div', { class: 'sh-pharm-grid' });
    if (showPharm) body.append(pharmCard(state));
    if (showMeds) {
      const grid = medsGrid(state);
      if (grid) body.append(grid);
    }
  }
  return el(
    'div',
    { class: 'sh-section' },
    band(
      'rust',
      unified
        ? `Step 3 · Pharmacologic considerations · ${MEDS_SECTION.head}`
        : 'Step 3 · Pharmacologic considerations',
      'pills',
    ),
    body,
  );
}

function pathwaySection(state) {
  const cols = PATHWAY.cols
    .map((col) => {
      const items = col.items.filter((i) => itemOn(state, i.id));
      const custom = customLines(state, col.id);
      if (!items.length && !custom.length) return null;
      return el(
        'div',
        { class: `sh-group tone-${col.tone}` },
        el('div', {
          class: 'sh-group-head sh-group-head--bar',
          text: nobreak(ov(state, col.id, col.head)),
        }),
        ...items.map((i) => checkItem(ov(state, i.id, i.text))),
        ...custom,
      );
    })
    .filter(Boolean);
  if (!cols.length) return null;
  return el(
    'div',
    { class: 'sh-section' },
    band('slate', `Step 4 · ${PATHWAY.head}`, 'clipboard-list'),
    el('div', { class: 'sh-group-grid sh-group-grid--5' }, ...cols),
  );
}

function renderRounding(state) {
  const page1 = el(
    'div',
    { class: 'sheet sheet--landscape' },
    ...roundingHead(state),
    statusStrip(state),
    secOn(state, 'sec-mnemonic') ? mnemonicSection(state) : null,
    secOn(state, 'sec-nonpharm') ? nonpharmSection(state) : null,
    ...customSections(state, 1),
    secOn(state, 'sec-notes') ? notesSection() : null,
    sheetFooter(state, 1, 2),
  );
  const page2 = el(
    'div',
    { class: 'sheet sheet--landscape' },
    pharmSection(state),
    secOn(state, 'sec-pathway') ? pathwaySection(state) : null,
    ...customSections(state, 2),
    sheetFooter(state, 2, 2),
  );
  return [page1, page2];
}

// ── SPA quick reference (portrait, unit-level) ───────────────────────────────

function spaHead(state, deeper) {
  const t = tplDef(state);
  const unit = state.unit.trim() || 'For adult ICU patients';
  return el(
    'div',
    { class: 'sh-head' },
    el(
      'div',
      { class: 'sh-head-titles' },
      el('div', {
        class: 'sh-title',
        text: deeper ? 'Deeper Guidance, Medications & Escalation' : t.defaultTitle,
      }),
      deeper ? null : el('div', { class: 'sh-sub', text: `${t.defaultSubtitle} · ${unit}` }),
    ),
  );
}

function spaColumns(state) {
  const cols = SPA_COLS.map((col) => {
    const items = col.items.filter((i) => itemOn(state, i.id));
    const custom = customLines(state, col.id);
    if (!items.length && !custom.length) return null;
    const wordRow = el('div', { class: 'spa-word' });
    if (col.icon) wordRow.append(sheetIcon(col.icon));
    wordRow.append(el('span', { text: nobreak(ov(state, col.id, col.word)) }));
    return el(
      'div',
      { class: `spa-col tone-${col.tone}` },
      el(
        'div',
        { class: 'spa-col-head' },
        el('span', { class: 'spa-ltr', text: col.ltr }),
        el('div', {}, wordRow, el('div', { class: 'spa-tagline', text: col.tagline })),
      ),
      ...items.map((i) =>
        el(
          'div',
          { class: 'spa-item' },
          box(),
          el(
            'div',
            {},
            el('div', { class: 'spa-item-head', text: nobreak(ov(state, i.id, i.head)) }),
            el('div', { class: 'spa-item-desc', text: nobreak(i.desc) }),
          ),
        ),
      ),
      ...custom.map((c) => el('div', { class: 'spa-item spa-item--custom' }, c)),
    );
  }).filter(Boolean);
  if (!cols.length) return null;
  return el('div', { class: 'spa-cols' }, ...cols);
}

function spaRassRow(state) {
  return el(
    'div',
    { class: 'spa-bottom' },
    el(
      'div',
      { class: 'sh-cell tone-rust spa-rass' },
      el('div', { class: 'sh-cell-head', text: 'RASS — this assessment' }),
      el('div', { class: 'sh-cell-body' }, rassMiniTable(state)),
    ),
    el(
      'div',
      { class: 'sh-cell tone-teal spa-goal' },
      el('div', { class: 'sh-cell-head', text: 'Sedation goal' }),
      el(
        'div',
        { class: 'sh-cell-body' },
        rassTargetDef(state).writeIn
          ? el('div', { class: 'sh-goal' }, 'Target RASS: ', blank('w-md grow'))
          : el('div', { class: 'sh-goal', text: `Target RASS: ${rassTargetDef(state).label}` }),
        ...STATUS.sedation.lines.map((t) => el('div', { class: 'sh-small', text: t })),
        el('div', { class: 'sh-small', text: 'Document goal each shift.' }),
        rassTargetDef(state).note
          ? el('div', { class: 'sh-small sh-strong', text: rassTargetDef(state).note })
          : null,
      ),
    ),
  );
}

function spaDeeper(state) {
  const doses = {
    haldolDose: state.showDoses ? '0.25–0.5 mg q4–6h PRN ' : '(per local order set) ',
    quetiapineDose: state.showDoses ? '12.5–25 mg PO q12h ' : '(per local order set) ',
  };
  const cols = SPA_DEEPER.cols
    .map((col) => {
      const items = col.items.filter((i) => itemOn(state, i.id));
      if (!items.length) return null;
      return el(
        'div',
        { class: `sh-group tone-${col.tone}` },
        el('div', {
          class: 'sh-group-head sh-group-head--bar',
          text: nobreak(ov(state, col.id, col.head)),
        }),
        ...items.map((i) =>
          checkItem(
            ov(state, i.id, i.text)
              .replace('{haldolDose}', doses.haldolDose)
              .replace('{quetiapineDose}', doses.quetiapineDose),
          ),
        ),
      );
    })
    .filter(Boolean);
  if (!cols.length) return null;
  const kids = [el('div', { class: 'sh-group-grid sh-group-grid--3' }, ...cols)];
  if (state.showDoses) kids.push(el('div', { class: 'sh-note', text: PHARM.doseNote }));
  return el('div', { class: 'sh-section' }, ...kids);
}

function escalationSection(state) {
  const stages = ESCALATION.stages
    .map((s) => {
      const items = s.items.filter((i) => itemOn(state, i.id));
      if (!items.length) return null;
      return el(
        'div',
        { class: `sh-group tone-${s.tone}` },
        el('div', {
          class: 'sh-group-head sh-group-head--bar',
          text: nobreak(ov(state, s.id, s.head)),
        }),
        ...items.map((i) => checkItem(ov(state, i.id, i.text))),
      );
    })
    .filter(Boolean);
  if (!stages.length) return null;
  return el(
    'div',
    { class: 'sh-section' },
    el('div', { class: 'sh-meds-head', text: ESCALATION.head }),
    el('div', { class: 'sh-group-grid sh-group-grid--4' }, ...stages),
  );
}

function renderSpa(state) {
  const page1 = el(
    'div',
    { class: 'sheet sheet--portrait' },
    spaHead(state, false),
    secOn(state, 'sec-spa-cols') ? spaColumns(state) : null,
    secOn(state, 'sec-rass') ? spaRassRow(state) : null,
    ...customSections(state, 1),
    sheetFooter(state, 1, 2),
  );
  const page2 = el(
    'div',
    { class: 'sheet sheet--portrait' },
    spaHead(state, true),
    secOn(state, 'sec-deeper') ? spaDeeper(state) : null,
    secOn(state, 'sec-meds') ? medsGrid(state) : null,
    secOn(state, 'sec-escalation') ? escalationSection(state) : null,
    ...customSections(state, 2),
    sheetFooter(state, 2, 2),
  );
  return [page1, page2];
}

/** Render the active template's sheets (array of .sheet elements). */
export function renderSheets(state) {
  if (state.template === 'peds-cards') return renderPedsCards(state);
  if (state.template === 'peds-workflow') return renderPedsWorkflow(state);
  return state.template === 'spa' ? renderSpa(state) : renderRounding(state);
}
