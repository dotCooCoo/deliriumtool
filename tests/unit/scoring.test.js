// Golden-value tests for the clinical decision logic. A wrong threshold here is a
// patient-safety bug, so these pin every cut-point to the source literature
// (see docs/CLINICAL_METHODOLOGY.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  riskTier,
  riskActions,
  inattentionPositive,
  evalCam,
  rassZone,
  rassTone,
  rassTargetSet,
  pct,
  RISK_MAX,
} from '../../src/js/scoring.js';

test('risk tally maxes at 15 (flat +1 per factor)', () => {
  // Mechanical ventilation was removed from the tally (PADIS 2018: strong
  // evidence it does not alter delirium risk), leaving 15 factors.
  assert.equal(RISK_MAX, 15);
});

test('risk tier band boundaries: Few 0-3 / Several 4-6 / Many 7-10 / Very many 11+', () => {
  assert.equal(riskTier(0).tier, 'Few');
  assert.equal(riskTier(3).tier, 'Few');
  assert.equal(riskTier(4).tier, 'Several');
  assert.equal(riskTier(6).tier, 'Several');
  assert.equal(riskTier(7).tier, 'Many');
  assert.equal(riskTier(10).tier, 'Many');
  assert.equal(riskTier(11).tier, 'Very many');
  assert.equal(riskTier(15).tier, 'Very many');
  assert.equal(riskTier(2).band, 'low');
  assert.equal(riskTier(11).band, 'crit');
});

test('risk escalation: geriatrics > 6 (pragmatic); never psychiatry-by-score', () => {
  assert.ok(!riskActions(6).some((a) => /geriatrics/i.test(a)));
  assert.ok(riskActions(7).some((a) => /geriatrics/i.test(a)));
  assert.ok(!riskActions(20).some((a) => /psychiatry/i.test(a))); // no score triggers psychiatry
});

test('CAM-ICU inattention is positive at > 2 errors', () => {
  assert.equal(inattentionPositive(0), false);
  assert.equal(inattentionPositive(2), false);
  assert.equal(inattentionPositive(3), true);
  assert.equal(inattentionPositive(10), true);
});

test('CAM-ICU arousal gate: RASS -4/-5 → unable to assess', () => {
  assert.equal(evalCam({ f1: 'yes', f2: 'yes', f3: 'yes', rass: '-4' }), 'unable');
  assert.equal(evalCam({ f1: 'yes', f2: 'yes', f3: 'yes', rass: '-5' }), 'unable');
});

test('CAM-ICU positive requires 1 AND 2 AND (3 OR 4)', () => {
  assert.equal(evalCam({ f1: 'yes', f2: 'yes', f3: 'yes', rass: '-1' }), 'positive');
  assert.equal(evalCam({ f1: 'yes', f2: 'yes', f4: 'yes', rass: '0' }), 'positive');
  assert.equal(evalCam({ f1: 'no', f2: 'yes', f3: 'yes', rass: '-1' }), 'negative'); // F1 absent
  assert.equal(evalCam({ f1: 'yes', f2: 'no', f3: 'yes', rass: '-1' }), 'negative'); // F2 absent
  assert.equal(evalCam({ f1: 'yes', f2: 'yes', f3: 'no', f4: 'no', rass: '0' }), 'negative'); // both secondaries negative
});

test('CAM-ICU is a two-step assessment: no verdict until a RASS is documented', () => {
  // Training manual p.6: Step 1 = level of consciousness (RASS), Step 2 = features.
  assert.equal(evalCam({ f1: 'yes', f2: 'yes', f3: 'yes' }), null);
  assert.equal(evalCam({ f1: 'no', f2: 'no' }), null);
  assert.equal(evalCam({ f1: 'yes', f2: 'yes', f3: 'yes', rass: '' }), null);
});

test('CAM-ICU incomplete states return null', () => {
  assert.equal(evalCam({}), null);
  assert.equal(evalCam({ f1: 'yes', rass: '0' }), null); // F2 not assessed
  assert.equal(evalCam({ f1: 'yes', f2: 'yes', rass: '0' }), null); // awaiting a secondary feature
});

test('RASS zones', () => {
  assert.equal(rassZone('0'), 'at target');
  assert.equal(rassZone('-2'), 'at target');
  assert.equal(rassZone('+4'), 'agitated');
  assert.equal(rassZone('-5'), 'unarousable');
  assert.equal(rassZone(''), '');
});

test('RASS tones: ok at target, caution at edges, danger beyond', () => {
  assert.equal(rassTone('0'), 'ok');
  assert.equal(rassTone('-2'), 'ok');
  assert.equal(rassTone('+1'), 'caution');
  assert.equal(rassTone('-3'), 'caution');
  assert.equal(rassTone('+4'), 'danger');
  assert.equal(rassTone('-5'), 'danger');
  assert.equal(rassTone(''), 'none');
});

test('RASS target set parses the configured band (default 0 to -2)', () => {
  assert.deepEqual(rassTargetSet(), ['-2', '-1', '0']);
  assert.deepEqual(rassTargetSet('0 to -2 (light — ICU default)'), ['-2', '-1', '0']);
  assert.deepEqual(rassTargetSet('0 to -1 (general ward)'), ['-1', '0']);
  assert.deepEqual(rassTargetSet('-3 to -4 (deep — indication required)'), ['-4', '-3']);
});

test('RASS zone/tone follow a deeper (indication-gated) target band', () => {
  const t = '-3 to -4';
  assert.equal(rassZone('-4', t), 'at target');
  assert.equal(rassZone('0', t), 'alert & calm');
  assert.equal(rassTone('-4', t), 'ok');
  assert.equal(rassTone('-3', t), 'ok');
  assert.equal(rassTone('-2', t), 'caution'); // lighter than a deep goal
  assert.equal(rassTone('-5', t), 'danger'); // unarousable is always danger
  assert.equal(rassTone('0', t), 'caution'); // lighter than a deep goal, not danger
  assert.equal(rassTone('+2', t), 'danger'); // agitation always flagged
});

test('checklist percentage rounds and guards divide-by-zero', () => {
  assert.equal(pct(0, 10), 0);
  assert.equal(pct(5, 10), 50);
  assert.equal(pct(10, 10), 100);
  assert.equal(pct(1, 3), 33);
  assert.equal(pct(0, 0), 0);
});
