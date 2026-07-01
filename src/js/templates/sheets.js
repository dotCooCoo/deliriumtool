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
import { DELIRIUM_REFS } from '../data/refs.js';
import { isOn } from './state.js';
import { faIcon } from '../shared/dom.js';

function el(tag, props, ...kids) {
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

/**
 * Short hyphenated tokens (T-A-D-A, CAM-ICU, WAT-1…) must never wrap across
 * lines on the printed card — swap their hyphens for non-breaking hyphens.
 */
const nobreak = (s) =>
  String(s).replace(/\b(\w{1,4})((?:-\w{1,4})+)\b/g, (m) => m.replace(/-/g, '‑'));

/** A printed check-off square (drawn box — marked with a dry-erase pen). */
const box = () => el('span', { class: 'sh-box', 'aria-hidden': 'true' });
/** A write-in blank. */
const blank = (cls) => el('span', { class: `sh-blank${cls ? ' ' + cls : ''}` });

const checkItem = (text, cls) =>
  el(
    'div',
    { class: `sh-item${cls ? ' ' + cls : ''}` },
    box(),
    el('span', { text: nobreak(text) }),
  );

const facilityLabel = (state) => state.facility.trim() || 'Your facility';

/** Built-in text, unless the unit reworded it in the designer. */
const ov = (state, id, fallback) => state.textOverrides[id] || fallback;

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
  const keys = FOOTER_CITES[state.template] || [];
  return keys
    .map((k) => (DELIRIUM_REFS[k] ? DELIRIUM_REFS[k].l : ''))
    .filter(Boolean)
    .join(' · ');
}

function sheetFooter(state, page, pages) {
  return el(
    'div',
    { class: 'sh-foot' },
    el('span', { class: 'sh-foot-left', text: `${facilityLabel(state)} · ${tplDef(state).name}` }),
    el('span', {
      class: 'sh-foot-mid',
      text: `${SHEET_DISCLAIMER} · Sources: ${sourcesLine(state)}`,
    }),
    el('span', { class: 'sh-foot-right', text: `Page ${page} of ${pages}` }),
  );
}

function customLines(state, groupId) {
  return (state.custom[groupId] || []).map((t) => checkItem(t, 'sh-item--custom'));
}

/** Unit-authored sections for one page — full-width titled checklists. */
function customSections(state, page) {
  return state.customSections
    .filter((sec) => sec.page === page && sec.lines.length)
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

const secOn = (state, id) => isOn(state.sections, id);
const itemOn = (state, id) => isOn(state.items, id);

const sheetIcon = (icon, cls) => faIcon(`fa-${icon}`, cls || 'sh-ico');

function band(tone, text, icon) {
  const b = el('div', { class: `sh-band tone-${tone}` });
  if (icon) b.append(sheetIcon(icon, 'sh-ico sh-band-ico'));
  b.append(el('span', { text: nobreak(text) }));
  return b;
}

// ── Rounding tool (landscape, per-patient) ───────────────────────────────────

function roundingHead(state) {
  const t = tplDef(state);
  const unit = state.unit.trim();
  return el(
    'div',
    { class: 'sh-head' },
    el(
      'div',
      { class: 'sh-head-titles' },
      el('div', { class: 'sh-title', text: t.defaultTitle }),
      el('div', { class: 'sh-sub', text: t.defaultSubtitle + (unit ? ` · ${unit}` : '') }),
    ),
    el(
      'div',
      { class: 'sh-head-fields' },
      el('span', {}, 'Patient: ', blank('w-lg')),
      el('span', {}, 'Room: ', blank('w-sm')),
      el('span', {}, 'Date: ', blank('w-md')),
    ),
  );
}

function rassMiniTable(state) {
  const target = rassTargetDef(state);
  const rows = RASS_ROWS.map((r) => {
    const isTarget = r.scores.every((s) => target.scores.includes(s));
    const zone = RASS_ZONES[r.scores[0]] || 'ink';
    return el(
      'div',
      { class: `sh-rass-row z-${zone}${isTarget ? ' is-target' : ''}` },
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
      el('div', { class: 'sh-goal', text: `Target RASS: ${target.label}` }),
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
      STATUS.subtype.options.map((t) => checkItem(t)),
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
    line.append(el('strong', {}, `${r.drug}: `));
    const text = ov(state, r.id, r.text);
    line.append(
      document.createTextNode(nobreak(state.showDoses && r.dose ? `${r.dose} · ${text}` : text)),
    );
    kids.push(line);
  });
  cautions.forEach((c) =>
    kids.push(
      el('div', {
        class: `sh-pharm-caution${c.stop ? ' is-stop' : ''}`,
        text: nobreak(ov(state, c.id, c.text)),
      }),
    ),
  );
  if (state.showDoses) kids.push(el('div', { class: 'sh-note', text: PHARM.doseNote }));
  return el('div', { class: 'sh-pharm-card' }, ...kids);
}

function medsGrid(state) {
  const cats = selectedMedCats(state);
  if (!cats.length) return null;
  const grid = el('div', { class: 'sh-meds-grid' });
  cats.forEach((c) => {
    grid.append(
      el(
        'div',
        { class: `sh-meds-row tone-${c.tone}` },
        el('div', { class: 'sh-meds-cat', text: c.label }),
        el('div', { class: 'sh-meds-list', text: c.names.join(' · ') }),
      ),
    );
  });
  return el(
    'div',
    { class: 'sh-meds' },
    el(
      'div',
      { class: 'sh-meds-head' },
      sheetIcon('pills'),
      el('span', { text: MEDS_SECTION.head }),
    ),
    grid,
  );
}

function pharmSection(state) {
  const showPharm = secOn(state, 'sec-pharm');
  const showMeds = secOn(state, 'sec-meds');
  if (!showPharm && !showMeds) return null;
  const row = el('div', { class: 'sh-pharm-grid' });
  if (showPharm) row.append(pharmCard(state));
  if (showMeds) {
    const grid = medsGrid(state);
    if (grid) row.append(grid);
  }
  return el(
    'div',
    { class: 'sh-section' },
    band('rust', 'Step 3 · Pharmacologic considerations', 'pills'),
    row,
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
    roundingHead(state),
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
        el('div', { class: 'sh-goal', text: `Target RASS: ${rassTargetDef(state).label}` }),
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
        ...items.map((i) => {
          const text = ov(state, i.id, i.text)
            .replace('{haldolDose}', doses.haldolDose)
            .replace('{quetiapineDose}', doses.quetiapineDose);
          return el('div', { class: 'sh-bullet', text: nobreak(`• ${text}`) });
        }),
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
        ...items.map((i) =>
          el('div', { class: 'sh-bullet', text: nobreak(`• ${ov(state, i.id, i.text)}`) }),
        ),
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
  return state.template === 'spa' ? renderSpa(state) : renderRounding(state);
}
