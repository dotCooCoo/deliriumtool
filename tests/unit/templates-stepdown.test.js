/**
 * The step-down card set must mirror the step-down tool exactly — the printed
 * cards derive every clinical value from src/js/stepdown/data/, so a mismatch here
 * is a clinical-safety bug (the printed card would disagree with the interactive
 * screen). Mapping: docs/CLINICAL_METHODOLOGY.md §2.14.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  RASS_LEVELS,
  CAMIMC,
  RISK,
  PREVENTION,
  SD_REFS,
  RASS_UNABLE,
  CAMIMC_POSITIVE,
  CAMIMC_MAX,
  CAMIMC_ATT_SCRIPT,
  INATT_MAX,
  DISO_MAX,
  DISO_DIMS,
  ADL_THRESHOLD,
  ADL_ACTIVITIES,
  PSYCHO_THRESHOLD,
  PSYCHO_DRUGS,
  RISK_BANDS,
  PREVENTION_ITEMS,
  AROUSAL_ZONE,
  RASS_RAIL,
  AROUSAL_GATE,
  ACT_COLUMNS,
  WORKFLOW_STAGES,
  HANDOFF_SCRIPT,
  STEPDOWN_FOOTER_CITES,
  STEPDOWN_CITE_LABELS,
} from '../../src/js/templates/data/stepdown-content.js';
import { SECTIONS, TEMPLATES } from '../../src/js/templates/data/content.js';

test('arousal zone + rail cover every RASS row, and the gate names the −4/−5 floor', () => {
  for (const r of RASS_LEVELS) assert.ok(AROUSAL_ZONE[r.v], `no zone for RASS ${r.v}`);
  const railValues = RASS_RAIL.flatMap((g) => g.values).sort();
  assert.deepEqual(railValues, RASS_LEVELS.map((r) => r.v).sort());
  assert.match(AROUSAL_GATE.stop, /−4 \/ −5/);
  assert.deepEqual(RASS_UNABLE, ['-4', '-5']);
});

test('CAM-IMC cut-point and item thresholds cannot drift from the tool', () => {
  assert.equal(CAMIMC_POSITIVE, CAMIMC.positiveAt);
  assert.equal(CAMIMC_POSITIVE, 3); // literal pin — a silent instrument drift must fail CI
  assert.equal(CAMIMC_MAX, CAMIMC.maxScore);
  assert.equal(CAMIMC_MAX, 10);
  assert.equal(CAMIMC_ATT_SCRIPT, CAMIMC.inattention.script);
  assert.match(CAMIMC_ATT_SCRIPT, /ANANASBAUM/);
  assert.equal(INATT_MAX, CAMIMC.inattention.maxPoints);
  assert.equal(INATT_MAX, 3);
  assert.equal(DISO_MAX, CAMIMC.disorientation.maxPoints);
  assert.equal(DISO_MAX, 5);
  assert.equal(DISO_DIMS, CAMIMC.disorientation.dimensions);
  assert.equal(DISO_DIMS.length, 5);
});

test('admission-risk thresholds and bands mirror the tool', () => {
  assert.equal(ADL_THRESHOLD, RISK.adl.threshold);
  assert.equal(ADL_THRESHOLD, 5);
  assert.equal(ADL_ACTIVITIES, RISK.adl.activities);
  assert.equal(ADL_ACTIVITIES.length, 6);
  assert.equal(PSYCHO_THRESHOLD, RISK.psychotropic.threshold);
  assert.equal(PSYCHO_THRESHOLD, 2);
  assert.equal(PSYCHO_DRUGS.find((d) => d.id === 'antipsychotic').pts, 2); // literal pin
  assert.equal(RISK_BANDS, RISK.bands);
  assert.deepEqual(
    RISK_BANDS.map((b) => b.label),
    ['Low', 'Intermediate', 'High'],
  );
  assert.deepEqual(
    RISK_BANDS.map((b) => b.max),
    [0, 1, 3],
  );
});

test('the prevention bundle is the tool’s components verbatim', () => {
  assert.equal(PREVENTION_ITEMS, PREVENTION.components);
  assert.equal(PREVENTION_ITEMS.length, 10);
  // ids are stable and labels are the tool’s.
  for (const c of PREVENTION_ITEMS) {
    assert.ok(c.id && c.label, 'component missing id/label');
  }
});

test('workflow locked lines interpolate the cut-point and the comatose floor', () => {
  const scoreLine = WORKFLOW_STAGES.find((s) => s.id === 'sd-wf-score').lines.find(
    (l) => l.id === 'sd-wf-score-rule',
  );
  assert.ok(scoreLine.locked);
  assert.match(scoreLine.text, new RegExp(`≥ ${CAMIMC.positiveAt} → positive`));
  const floor = WORKFLOW_STAGES.find((s) => s.id === 'sd-wf-gate').lines.find(
    (l) => l.id === 'sd-wf-gate-floor',
  );
  assert.ok(floor.locked);
  assert.match(floor.text, /−4 \/ −5/);
  const riskLine = WORKFLOW_STAGES.find((s) => s.id === 'sd-wf-risk').lines.find(
    (l) => l.id === 'sd-wf-risk-rule',
  );
  assert.match(riskLine.text, new RegExp(`≥ ${RISK.adl.threshold} of 6`));
});

test('every designer-editable control id is unique and step-down-prefixed', () => {
  const ids = [
    ...WORKFLOW_STAGES.flatMap((s) => s.lines.map((l) => l.id)),
    ...HANDOFF_SCRIPT.map((h) => h.id),
    ...ACT_COLUMNS.flatMap((c) => c.items.map((it) => it.id)),
  ];
  assert.equal(ids.length, new Set(ids).size, 'duplicate control id');
  for (const id of ids) assert.match(id, /^sd-/);
});

test('act columns carry stable per-item ids', () => {
  for (const col of ACT_COLUMNS) {
    col.items.forEach((it, i) => assert.equal(it.id, `${col.id}-${i}`));
  }
});

test('footer cites resolve to a registry label for each template', () => {
  for (const tpl of ['stepdown-cards', 'stepdown-workflow']) {
    assert.ok(STEPDOWN_FOOTER_CITES[tpl]?.length);
    for (const k of STEPDOWN_FOOTER_CITES[tpl]) {
      assert.ok(SD_REFS[k], `footer cite ${k} missing from the step-down registry`);
      assert.ok(STEPDOWN_CITE_LABELS[k]);
      assert.equal(STEPDOWN_CITE_LABELS[k], SD_REFS[k].l);
    }
  }
});

test('both step-down templates are registered with their section ids', () => {
  for (const id of ['stepdown-cards', 'stepdown-workflow']) {
    assert.ok(
      TEMPLATES.find((t) => t.id === id),
      `${id} missing from TEMPLATES`,
    );
    assert.ok(SECTIONS[id]?.length, `${id} has no sections`);
  }
  assert.deepEqual(
    SECTIONS['stepdown-cards'].map((s) => s.id),
    ['sec-sd-arousal', 'sec-sd-camimc', 'sec-sd-risk', 'sec-sd-prevent', 'sec-sd-act'],
  );
  assert.deepEqual(
    SECTIONS['stepdown-workflow'].map((s) => s.id),
    ['sec-sd-wf-poster'],
  );
});
