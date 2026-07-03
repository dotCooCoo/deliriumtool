// The ED card set must mirror the ED tool exactly — these tests pin the shared
// imports and the card-only strings/thresholds that restate tool logic. A
// mismatch here is a clinical-safety bug (the printed card would disagree with
// the interactive screen). Mapping: docs/CLINICAL_METHODOLOGY.md §2.12.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RASS_LEVELS,
  RASS_UNABLE,
  AROUSAL_ZONE,
  AROUSAL_GATE,
  RASS_RAIL,
  DTS_FLOW,
  DTS_ERR,
  F2_ERR,
  BCAM_F2_SCRIPT,
  BCAM_F4,
  BCAM_RULE,
  FOURAT_BANDS,
  ACT_COLUMNS,
  WORKFLOW_STAGES,
  HANDOFF_SCRIPT,
  ED_FOOTER_CITES,
  ED_CITE_LABELS,
} from '../../src/js/templates/data/ed-content.js';
import { DTS, BCAM, FOURAT, ACT_POSITIVE } from '../../src/js/ed/data/instruments.js';
import { REFS as ED_REFS } from '../../src/js/ed/data/refs.js';
import { SECTIONS, TEMPLATES } from '../../src/js/templates/data/content.js';

test('arousal card covers every RASS row with a zone; rail partitions the scale', () => {
  for (const r of RASS_LEVELS) {
    assert.ok(AROUSAL_ZONE[r.v], `missing RASS zone: ${r.v}`);
  }
  // The Look/Talk/Touch rail must cover all ten rows exactly once.
  const railValues = RASS_RAIL.flatMap((g) => g.values).sort();
  assert.deepEqual(railValues, RASS_LEVELS.map((r) => r.v).sort());
  // The unable gate names the comatose floor from the instrument constant.
  assert.match(AROUSAL_GATE.stop, /−4 \/ −5/);
  assert.deepEqual(RASS_UNABLE, ['-4', '-5']);
});

test('DTS card threshold + script come from the instrument (cannot drift)', () => {
  assert.equal(DTS_ERR, DTS.attention.errorThreshold);
  assert.equal(DTS_ERR, 2);
  assert.equal(DTS_FLOW.script, DTS.attention.script);
  assert.deepEqual(DTS_FLOW.letters, DTS.attention.items);
  assert.deepEqual(DTS_FLOW.letters, ['H', 'C', 'N', 'U', 'L']);
  assert.match(DTS_FLOW.negative, /ruled out/);
});

test('bCAM card content is verbatim from the instrument', () => {
  const f2 = BCAM.features.find((f) => f.id === 'f2');
  const f4 = BCAM.features.find((f) => f.id === 'f4');
  assert.equal(F2_ERR, f2.errorThreshold);
  assert.equal(F2_ERR, 2); // literal pin — a silent instrument drift must fail CI
  assert.equal(BCAM_F2_SCRIPT, f2.script);
  assert.deepEqual(BCAM_F4.setA, f4.sets.a);
  assert.deepEqual(BCAM_F4.setB, f4.sets.b);
  assert.equal(BCAM_F4.command, f4.command);
  assert.equal(BCAM_RULE, BCAM.rule);
  assert.match(BCAM_RULE, /Feature 1 \+ Feature 2 \+ \(Feature 3 or Feature 4\)/);
});

test('4AT card bands come from the form', () => {
  assert.equal(FOURAT_BANDS, FOURAT.bands);
  assert.equal(FOURAT_BANDS[0].min, 4);
  assert.equal(FOURAT_BANDS[1].min, 1);
  assert.equal(FOURAT_BANDS[2].min, 0);
  assert.equal(FOURAT_BANDS[0].verdict, 'positive');
  assert.equal(FOURAT_BANDS[1].verdict, 'cognitive');
});

test('act columns preserve the tool blocks and stable item ids', () => {
  assert.equal(ACT_COLUMNS.length, ACT_POSITIVE.length);
  ACT_COLUMNS.forEach((col, i) => {
    assert.equal(col.head, ACT_POSITIVE[i].head);
    assert.equal(col.items.length, ACT_POSITIVE[i].items.length);
    col.items.forEach((it, j) => {
      assert.equal(it.id, `${ACT_POSITIVE[i].id}-${j}`);
      assert.equal(it.text, ACT_POSITIVE[i].items[j]);
    });
  });
});

test('workflow locked lines interpolate the instrument thresholds', () => {
  const confirm = WORKFLOW_STAGES.find((s) => s.id === 'ed-wf-confirm');
  const dtsLine = confirm.lines.find((l) => l.id === 'ed-wf-confirm-dts');
  const bcamLine = confirm.lines.find((l) => l.id === 'ed-wf-confirm-bcam');
  const fouratLine = confirm.lines.find((l) => l.id === 'ed-wf-confirm-4at');
  assert.ok(dtsLine.locked && bcamLine.locked && fouratLine.locked);
  assert.match(dtsLine.text, new RegExp(`≥ ${DTS_ERR} errors`));
  assert.match(dtsLine.text, /unable \/ refused/); // the third positivity arm
  assert.ok(bcamLine.text.includes(BCAM.rule));
  assert.match(fouratLine.text, new RegExp(`≥ ${FOURAT.bands[0].min} → possible delirium`));
  assert.match(fouratLine.text, /1–3 → possible cognitive impairment/);
  // The comatose floor line interpolates from RASS_UNABLE.
  const floor = WORKFLOW_STAGES.find((s) => s.id === 'ed-wf-gate').lines.find((l) => l.locked);
  assert.match(floor.text, /−4 \/ −5/);
});

test('workflow + handoff have stable ids for the customization controls', () => {
  const ids = [
    ...WORKFLOW_STAGES.flatMap((s) => s.lines.map((l) => l.id)),
    ...HANDOFF_SCRIPT.map((h) => h.id),
  ];
  assert.equal(ids.length, new Set(ids).size, 'duplicate control id');
  for (const id of ids) assert.match(id, /^ed-/);
});

test('footer cite keys resolve to ED registry labels', () => {
  for (const tpl of ['ed-cards', 'ed-workflow']) {
    for (const k of ED_FOOTER_CITES[tpl]) {
      assert.ok(ED_REFS[k], `unknown ED cite key: ${k}`);
      assert.ok(ED_CITE_LABELS[k], `no label for: ${k}`);
      assert.equal(ED_CITE_LABELS[k], ED_REFS[k].l);
    }
  }
});

test('the two ED templates are registered with sections', () => {
  for (const id of ['ed-cards', 'ed-workflow']) {
    assert.ok(
      TEMPLATES.find((t) => t.id === id),
      `template not registered: ${id}`,
    );
    assert.ok(SECTIONS[id]?.length, `no sections for: ${id}`);
  }
  // The card set exposes the five instrument cards.
  const cardSecs = SECTIONS['ed-cards'].map((s) => s.id);
  assert.deepEqual(cardSecs, [
    'sec-ed-pathway',
    'sec-ed-dts',
    'sec-ed-bcam',
    'sec-ed-4at',
    'sec-ed-act',
  ]);
});
