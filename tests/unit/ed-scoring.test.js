// Golden-value tests for the ED screens. A wrong threshold here is a
// patient-safety bug — every rule pins to Han 2013 / the Vanderbilt DTS+bCAM
// manuals and the official 4AT v1.2 form (docs/CLINICAL_METHODOLOGY.md §2.11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evalDts, arousalGate, bcamInattention, evalBcam, eval4at } from '../../src/js/ed/scoring.js';
import { DTS, BCAM, FOURAT, RASS_LEVELS, RASS_UNABLE, PATHWAYS } from '../../src/js/ed/data/instruments.js';
import { REFS } from '../../src/js/ed/data/refs.js';

test('DTS: RASS other than 0 is positive; RASS 0 needs the LUNCH task', () => {
  assert.equal(evalDts({}), null);
  assert.equal(evalDts({ rass: '-1' }), 'positive');
  assert.equal(evalDts({ rass: '+2' }), 'positive');
  assert.equal(evalDts({ rass: '0' }), null); // attention still pending
  assert.equal(evalDts({ rass: '0', lunchErrors: 0 }), 'negative');
  assert.equal(evalDts({ rass: '0', lunchErrors: 1 }), 'negative');
  assert.equal(evalDts({ rass: '0', lunchErrors: 2 }), 'positive'); // ≥2 errors
  assert.equal(evalDts({ rass: '0', lunchUnable: true }), 'positive'); // refusal/unable
  assert.equal(DTS.attention.errorThreshold, 2);
});

test('arousal gate: RASS −4/−5 cannot be assessed for delirium content', () => {
  assert.deepEqual(RASS_UNABLE, ['-4', '-5']);
  assert.equal(arousalGate('-4'), 'unable');
  assert.equal(arousalGate('-5'), 'unable');
  assert.equal(arousalGate('-3'), 'ok');
  assert.equal(arousalGate('0'), 'ok');
  assert.equal(arousalGate(''), null);
});

test('bCAM inattention: >1 error on months backwards, refusal counts as positive', () => {
  assert.equal(bcamInattention({}), null);
  assert.equal(bcamInattention({ monthErrors: 0 }), false);
  assert.equal(bcamInattention({ monthErrors: 1 }), false);
  assert.equal(bcamInattention({ monthErrors: 2 }), true);
  assert.equal(bcamInattention({ monthUnable: true }), true);
});

test('bCAM algorithm: F1 AND F2 AND (F3 OR F4); F2 is the required cardinal feature', () => {
  // Fully positive path via F3 (RASS ≠ 0).
  assert.equal(evalBcam({ f1: 'yes', f2: true, rass: '-1' }), 'positive');
  // Cardinal rule: features 1 + 3 + 4 without inattention = NEGATIVE.
  assert.equal(evalBcam({ f1: 'yes', f2: false, rass: '-1', f4AnyError: true }), 'negative');
  // F3 negative → decided by F4 (any error).
  assert.equal(evalBcam({ f1: 'yes', f2: true, rass: '0', f4AnyError: true }), 'positive');
  assert.equal(evalBcam({ f1: 'yes', f2: true, rass: '0', f4AnyError: false }), 'negative');
  assert.equal(evalBcam({ f1: 'yes', f2: true, rass: '0' }), null); // F4 pending
  // F1 negative rules delirium out regardless.
  assert.equal(evalBcam({ f1: 'no', f2: true, rass: '-1' }), 'negative');
  // No-informant path: assume F1 positive when F2 and a secondary feature are.
  assert.equal(evalBcam({ f1: 'assume', f2: true, rass: '+1' }), 'positive');
  // Incomplete states stay null.
  assert.equal(evalBcam({ f2: true, rass: '-1' }), null);
  assert.equal(evalBcam({ f1: 'yes', rass: '-1' }), null);
});

test('bCAM feature 4: any error is positive; both question sets have 4 questions', () => {
  const f4 = BCAM.features.find((f) => f.id === 'f4');
  assert.equal(f4.sets.a.length, 4);
  assert.equal(f4.sets.b.length, 4);
  assert.match(f4.command, /Hold up this many fingers/);
});

test('4AT: item values and score bands match the v1.2 form', () => {
  // Item point values.
  const byId = Object.fromEntries(FOURAT.items.map((i) => [i.id, i]));
  assert.deepEqual(
    byId.alertness.options.map((o) => o.v),
    [0, 0, 4],
  );
  assert.deepEqual(
    byId.amt4.options.map((o) => o.v),
    [0, 1, 2],
  );
  assert.deepEqual(
    byId.attention.options.map((o) => o.v),
    [0, 1, 2],
  );
  assert.deepEqual(
    byId.change.options.map((o) => o.v),
    [0, 4],
  );
  // Withheld until complete.
  assert.equal(eval4at({ alertness: 0, amt4: 0, attention: 0 }).complete, false);
  // Bands: 0 unlikely; 1–3 cognitive impairment; ≥4 possible delirium. Max 12.
  assert.equal(eval4at({ alertness: 0, amt4: 0, attention: 0, change: 0 }).band.verdict, 'negative');
  assert.equal(eval4at({ alertness: 0, amt4: 1, attention: 0, change: 0 }).band.verdict, 'cognitive');
  assert.equal(
    eval4at({ alertness: 0, amt4: 2, attention: 1, change: 0 }).band.verdict,
    'cognitive',
  );
  assert.equal(eval4at({ alertness: 0, amt4: 0, attention: 0, change: 4 }).band.verdict, 'positive');
  assert.equal(eval4at({ alertness: 4, amt4: 0, attention: 0, change: 0 }).band.verdict, 'positive');
  const max = eval4at({ alertness: 4, amt4: 2, attention: 2, change: 4 });
  assert.equal(max.score, 12);
  assert.equal(max.band.verdict, 'positive');
});

test('RASS carries all ten levels and every citation key resolves', () => {
  assert.equal(RASS_LEVELS.length, 10);
  const keys = [
    ...DTS.cites,
    ...BCAM.cites,
    ...FOURAT.cites,
    ...PATHWAYS.flatMap((p) => p.cites),
  ];
  for (const k of keys) assert.ok(REFS[k], `unknown citation key: ${k}`);
});
