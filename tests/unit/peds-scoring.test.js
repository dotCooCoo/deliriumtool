// Golden-value tests for the pediatric screens. A wrong threshold here is a
// patient-safety bug, so these pin every cut-point to the source literature
// (see docs/CLINICAL_METHODOLOGY.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAPD_POSITIVE,
  CAPD_ITEMS,
  capdItemPoints,
  evalCapd,
  arousalGate,
  evalCam,
} from '../../src/js/peds/scoring.js';

// Build a full CAPD answer map from 8 frequency indices (0=Never … 4=Always),
// in item order: eye, purpose, aware, comm (reverse), restless, inconsolable,
// underactive, slow (normal).
const capd = (arr) => Object.fromEntries(CAPD_ITEMS.map((it, i) => [it.id, arr[i]]));

test('CAPD positive cut point is 9 (Traube 2014)', () => {
  assert.equal(CAPD_POSITIVE, 9);
});

test('CAPD has 8 items; first four reverse-scored, last four normal', () => {
  assert.equal(CAPD_ITEMS.length, 8);
  assert.deepEqual(
    CAPD_ITEMS.map((i) => i.reverse),
    [true, true, true, true, false, false, false, false],
  );
});

test('capdItemPoints honors scoring direction', () => {
  assert.equal(capdItemPoints(true, 0), 4); // reverse Never = 4
  assert.equal(capdItemPoints(true, 4), 0); // reverse Always = 0
  assert.equal(capdItemPoints(false, 0), 0); // normal Never = 0
  assert.equal(capdItemPoints(false, 4), 4); // normal Always = 4
  assert.equal(capdItemPoints(true, null), null);
  assert.equal(capdItemPoints(false, ''), null);
});

test('CAPD score withheld until all 8 items answered', () => {
  const partial = capd([2, 3, 4, 4, 3, 2, 1, '']);
  const r = evalCapd(partial);
  assert.equal(r.complete, false);
  assert.equal(r.answered, 7);
  assert.equal(r.score, null);
  assert.equal(r.positive, null);
});

test('CAPD all-capacity-absent / behavior-absent extremes', () => {
  // Always purposeful/aware/communicating + never restless/inconsolable… = 0
  const none = evalCapd(capd([4, 4, 4, 4, 0, 0, 0, 0]));
  assert.equal(none.score, 0);
  assert.equal(none.positive, false);
  // Never purposeful/aware + always restless/inconsolable… = 32 (max)
  const max = evalCapd(capd([0, 0, 0, 0, 4, 4, 4, 4]));
  assert.equal(max.score, 32);
  assert.equal(max.positive, true);
});

test('CAPD threshold: 9 positive, 8 negative', () => {
  const nine = evalCapd(capd([2, 3, 4, 4, 3, 2, 1, 0])); // 2+1+0+0 + 3+2+1+0 = 9
  assert.equal(nine.score, 9);
  assert.equal(nine.positive, true);
  const eight = evalCapd(capd([2, 3, 4, 4, 3, 1, 1, 0])); // = 8
  assert.equal(eight.score, 8);
  assert.equal(eight.positive, false);
});

test('arousal gate: RASS −4/−5 unable, otherwise ok', () => {
  assert.equal(arousalGate('-5'), 'unable');
  assert.equal(arousalGate('-4'), 'unable');
  assert.equal(arousalGate('-3'), 'ok');
  assert.equal(arousalGate('0'), 'ok');
  assert.equal(arousalGate(''), null);
  assert.equal(arousalGate(null), null);
});

test('pCAM/psCAM reuse the CAM-ICU algorithm (Feature 1 & 2 & (3 or 4); RASS gate)', () => {
  assert.equal(evalCam({ rass: '-5' }), 'unable');
  assert.equal(evalCam({ f1: 'yes', f2: 'yes', f3: 'yes', rass: '-1' }), 'positive');
  assert.equal(evalCam({ f1: 'yes', f2: 'no', f3: 'yes', f4: 'yes', rass: '0' }), 'negative');
});
