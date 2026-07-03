// Integrity checks on the bedside-template content and customization model:
// unique item ids, citation keys that resolve in the registry, medication
// defaults that track the shared catalog, a safe (de)serialization round-trip,
// and the verbatim printed disclaimer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TEMPLATES,
  SECTIONS,
  RASS_ROWS,
  RASS_TARGETS,
  STATUS,
  MNEMONIC,
  NONPHARM,
  PHARM,
  MEDS_SECTION,
  PATHWAY,
  SPA_COLS,
  SPA_DEEPER,
  ESCALATION,
  FOOTER_CITES,
  SHEET_DISCLAIMER,
  RASS_CITES,
} from '../../src/js/templates/data/content.js';
import { defaultState, sanitize, isOn } from '../../src/js/templates/state.js';
import { medDisplayName } from '../../src/js/templates/sheets.js';
import { toBase64Url, fromBase64Url } from '../../src/js/share.js';
import { MEDS } from '../../src/js/data/meds.js';
import { DELIRIUM_REFS } from '../../src/js/data/refs.js';

const allToggleItems = () => [
  ...MNEMONIC.cells,
  ...NONPHARM.groups.flatMap((g) => g.items),
  ...PHARM.rows,
  ...PHARM.cautions,
  ...PATHWAY.cols.flatMap((c) => c.items),
  ...SPA_COLS.flatMap((c) => c.items),
  ...SPA_DEEPER.cols.flatMap((c) => c.items),
  ...ESCALATION.stages.flatMap((s) => s.items),
];

test('templates: registry ids, sections, and page counts line up', () => {
  assert.deepEqual(
    TEMPLATES.map((t) => t.id).sort(),
    Object.keys(SECTIONS).sort(),
    'every template has a sections list',
  );
  for (const t of TEMPLATES) {
    assert.ok(['landscape', 'portrait'].includes(t.orientation));
    assert.ok(t.pages >= 1, 'template declares a page count');
    const pages = new Set(SECTIONS[t.id].map((s) => s.page));
    for (const p of pages) assert.ok(p >= 1 && p <= t.pages);
  }
});

test('templates: every toggleable item has a unique id and text', () => {
  const seen = new Set();
  for (const item of allToggleItems()) {
    assert.ok(item.id, 'item has an id');
    assert.ok(!seen.has(item.id), `duplicate item id: ${item.id}`);
    seen.add(item.id);
    assert.ok(item.text || item.head || item.word, `item ${item.id} has display text`);
  }
});

test('templates: every citation key resolves in the citation registry', () => {
  const keys = [
    ...RASS_CITES,
    ...STATUS.sedation.cites,
    ...STATUS.cam.cites,
    ...STATUS.subtype.cites,
    ...MNEMONIC.cites,
    ...NONPHARM.cites,
    ...PHARM.cites,
    ...MEDS_SECTION.cites,
    ...SPA_COLS.flatMap((c) => c.cites),
    ...SPA_DEEPER.cites,
    ...ESCALATION.cites,
    ...FOOTER_CITES.rounding,
    ...FOOTER_CITES.spa,
  ];
  for (const k of keys) {
    assert.ok(DELIRIUM_REFS[k], `citation key "${k}" missing from refs registry`);
  }
});

test('templates: each sheet footer lists every source its blocks cite (no drift)', () => {
  // The footer is the only source list a printed sheet shows, so it must carry
  // every source the sheet's blocks draw on — otherwise a printed dose/figure/
  // rule would be unattributed. FOOTER_CITES is derived from the block cites, so
  // this asserts the derivation covers the blocks each template renders.
  // PATHWAY (the nurse-care-pathway) is intentionally local/uncited, so it
  // contributes no sources.
  const roundingBlockCites = [
    ...STATUS.sedation.cites,
    ...STATUS.cam.cites,
    ...STATUS.subtype.cites,
    ...MNEMONIC.cites,
    ...NONPHARM.cites,
    ...PHARM.cites,
  ];
  for (const k of roundingBlockCites) {
    assert.ok(FOOTER_CITES.rounding.includes(k), `rounding footer missing block cite "${k}"`);
  }
  const spaBlockCites = [
    ...RASS_CITES,
    ...SPA_COLS.flatMap((c) => c.cites),
    ...SPA_DEEPER.cites,
    ...MEDS_SECTION.cites,
    ...ESCALATION.cites,
  ];
  for (const k of spaBlockCites) {
    assert.ok(FOOTER_CITES.spa.includes(k), `spa footer missing block cite "${k}"`);
  }
});

test('templates: the workflow section is the only uncited one and is marked local', () => {
  assert.equal(PATHWAY.local, true);
  const local = SECTIONS.rounding.filter((s) => s.local).map((s) => s.id);
  assert.deepEqual(local, ['sec-pathway']);
});

test('templates: RASS rows cover −5..+4 and each target maps onto real rows', () => {
  const covered = RASS_ROWS.flatMap((r) => r.scores).sort();
  assert.deepEqual(covered, ['+1', '+2', '+3', '+4', '-1', '-2', '-3', '-4', '-5', '0'].sort());
  const all = new Set(covered);
  for (const t of RASS_TARGETS) for (const s of t.scores) assert.ok(all.has(s));
});

test('state: medication defaults track the documented catalog defaults', () => {
  const s = defaultState();
  const catalog = MEDS.categories.flatMap((c) => c.items);
  assert.deepEqual(Object.keys(s.meds).sort(), catalog.map((i) => i.id).sort());
  // The three documented default classes (PADIS 2018; Beers 2023/ACB):
  // benzodiazepines, opioids, anticholinergics on; the long tail opt-in.
  for (const item of catalog) {
    assert.equal(s.meds[item.id], !!item.on, `default for ${item.id} tracks the catalog`);
  }
  assert.equal(s.meds['benzo-lorazepam'], true);
  assert.equal(s.meds['opi-morphine'], true);
  assert.equal(s.meds['ach-diphenhydramine'], true);
  assert.equal(s.meds['mic-cefepime'], false);
});

test('state: sanitize accepts a valid snapshot unchanged and rejects garbage', () => {
  const s = defaultState();
  s.template = 'spa';
  s.facility = 'General Hospital';
  s.items['np-clock'] = false;
  s.custom['np-sleep'] = ['Quiet hours 22:00–06:00'];
  s.meds['benzo-lorazepam'] = false;
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(s))), s);

  const junk = sanitize({
    template: 'nope',
    facility: 42,
    fontScale: '9000',
    items: { evil: 'string', ok: false },
    custom: { g: [1, 2, { a: 1 }, 'fine'.repeat(100)] },
    meds: { 'not-a-med': true },
  });
  assert.equal(junk.template, 'rounding');
  assert.equal(junk.facility, '');
  assert.equal(junk.fontScale, '110');
  assert.deepEqual(junk.items, { ok: false });
  assert.equal(junk.custom.g.length, 1);
  assert.ok(junk.custom.g[0].length <= 160);
  assert.ok(!('not-a-med' in junk.meds));
  assert.equal(isOn(junk.items, 'anything-else'), true);
});

test('defaults: Large text, generic-only names, clean sans', () => {
  const s = defaultState();
  assert.equal(s.fontScale, '110');
  assert.equal(s.fontFamily, 'sans');
  assert.equal(s.showBrands, false);
  assert.equal(s.showDoses, false);
});

test('medDisplayName strips brand names but keeps clinical qualifiers', () => {
  assert.equal(medDisplayName('Lorazepam (Ativan)', false), 'Lorazepam');
  assert.equal(medDisplayName('Solifenacin (VESIcare)', false), 'Solifenacin');
  assert.equal(medDisplayName('Haloperidol (high dose)', false), 'Haloperidol (high dose)');
  assert.equal(
    medDisplayName('Metronidazole (IV, high dose)', false),
    'Metronidazole (IV, high dose)',
  );
  assert.equal(medDisplayName('Pregabalin (Lyrica, high dose)', false), 'Pregabalin (high dose)');
  assert.equal(
    medDisplayName('Ondansetron (IV, QTc concern)', false),
    'Ondansetron (IV, QTc concern)',
  );
  assert.equal(medDisplayName('Lorazepam (Ativan)', true), 'Lorazepam (Ativan)');
});

test('sanitize: reworded lines and custom sections survive; junk is bounded', () => {
  const s = defaultState();
  s.fontFamily = 'serif';
  s.textOverrides['np-clock'] = 'Clock visible from the bed';
  s.customSections.push({ id: 'cs-1', page: 2, title: 'Unit huddle', lines: ['Review sitters'] });
  assert.deepEqual(sanitize(JSON.parse(JSON.stringify(s))), s);

  const junk = sanitize({
    fontFamily: 'comic-sans',
    textOverrides: { ok: 'fine', bad: 42, huge: 'x'.repeat(999) },
    customSections: [
      { id: 'a', page: 9, title: 'T', lines: ['one', 2, 'x'.repeat(999)] },
      'not-a-section',
    ],
  });
  assert.equal(junk.fontFamily, 'sans');
  assert.deepEqual(Object.keys(junk.textOverrides).sort(), ['huge', 'ok']);
  assert.ok(junk.textOverrides.huge.length <= 200);
  assert.equal(junk.customSections.length, 1);
  assert.equal(junk.customSections[0].page, 1);
  assert.equal(junk.customSections[0].lines.length, 2);
});

test('share codec: base64url round-trips unicode payloads', () => {
  const payload = JSON.stringify({ t: 'RASS −2 · “quiet hours” · ☐' });
  assert.equal(fromBase64Url(toBase64Url(payload)), payload);
  assert.ok(!/[+/=]/.test(toBase64Url(payload)), 'URL-safe alphabet only');
});

test('sheet disclaimer is verbatim (load-bearing framing)', () => {
  assert.equal(
    SHEET_DISCLAIMER,
    'Reference aid only — follow local policy & prescriber/pharmacy review',
  );
});
