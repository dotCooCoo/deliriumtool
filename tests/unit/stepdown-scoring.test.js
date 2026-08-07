/**
 * Golden-value tests for the step-down scoring engine. These pin the CAM-IMC
 * additive rule (Beyer 2024), the arousal gate, and the Martinez admission-risk
 * bands to their sources, so a silent change to a threshold fails CI.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { blankAssessment } from '../../src/js/stepdown/state.js';
import {
  arousalGate,
  evalCamImc,
  evalRisk,
  inattentionErrors,
} from '../../src/js/stepdown/scoring.js';
import { CAMIMC, RISK } from '../../src/js/stepdown/data/instruments.js';

const cam = (over = {}) => {
  const s = blankAssessment();
  if (over.rass !== undefined) s.rass = over.rass;
  Object.assign(s.camimc, over.camimc || {});
  if (over.risk) Object.assign(s.risk, over.risk);
  return s;
};

test('CAM-IMC cut-point and range are the published values', () => {
  assert.equal(CAMIMC.positiveAt, 3);
  assert.equal(CAMIMC.maxScore, 10);
  assert.equal(CAMIMC.inattention.maxPoints, 3);
  assert.equal(CAMIMC.disorientation.maxPoints, 5);
  assert.equal(CAMIMC.disorientation.dimensions.length, 5);
});

test('arousal gate: RASS -4/-5 is unassessable, others score', () => {
  assert.equal(arousalGate(''), 'none');
  assert.equal(arousalGate('-4'), 'unable');
  assert.equal(arousalGate('-5'), 'unable');
  assert.equal(arousalGate('-3'), 'ok');
  assert.equal(arousalGate('0'), 'ok');
  assert.equal(arousalGate('+1'), 'ok');
});

test('a blank assessment is incomplete and unscored', () => {
  const r = evalCamImc(blankAssessment());
  assert.equal(r.complete, false);
  assert.equal(r.score, 0);
  assert.equal(r.positive, null);
  assert.equal(r.unable, false);
});

test('RASS -4/-5 makes the CAM-IMC unassessable', () => {
  const r = evalCamImc(cam({ rass: '-4' }));
  assert.equal(r.unable, true);
  assert.equal(r.score, null);
  assert.equal(r.positive, null);
});

test('a fully positive screen sums acute + LOC + inattention + disorientation', () => {
  const s = cam({
    rass: '+1', // altered LOC -> +1
    camimc: { acute: 'yes', inattention: '2', disorientTaps: [0, 1], disorientDone: true },
  });
  const r = evalCamImc(s);
  assert.deepEqual(r.parts, { acutePts: 1, locPts: 1, inattPts: 2, disoPts: 2 });
  assert.equal(r.score, 6);
  assert.equal(r.complete, true);
  assert.equal(r.positive, true);
});

test('a fully negative screen scores 0 and is complete', () => {
  const s = cam({ rass: '0', camimc: { acute: 'no', inattention: '0', disorientDone: true } });
  const r = evalCamImc(s);
  assert.equal(r.score, 0);
  assert.equal(r.complete, true);
  assert.equal(r.positive, false);
});

test('altered level of consciousness is read from the RASS alone', () => {
  const s = cam({ rass: '-2', camimc: { acute: 'no', inattention: '0', disorientDone: true } });
  const r = evalCamImc(s);
  assert.equal(r.parts.locPts, 1);
  assert.equal(r.score, 1);
  assert.equal(r.positive, false); // 1 < 3
});

test('"unable" on the inattention task scores the maximum 3 points', () => {
  const s = cam({
    rass: '0',
    camimc: { acute: 'no', inattentionUnable: true, disorientDone: true },
  });
  assert.equal(inattentionErrors(s), 3);
  const r = evalCamImc(s);
  assert.equal(r.parts.inattPts, 3);
  assert.equal(r.score, 3);
  assert.equal(r.positive, true); // reaches the cut-point
});

test('a corrupted inattention value scores no points and keeps the screen incomplete', () => {
  // The sanitizer restricts inattention to '0'–'3'; a hand-edited import could carry
  // anything. It must not turn the additive total into NaN or read as "answered".
  assert.equal(inattentionErrors(cam({ camimc: { inattention: 'x' } })), null);
  assert.equal(inattentionErrors(cam({ camimc: { inattention: '' } })), null);
  assert.equal(inattentionErrors(cam({ camimc: { inattention: '2' } })), 2);
  const s = cam({
    rass: '0',
    camimc: { acute: 'no', inattention: 'x', disorientDone: true },
  });
  const r = evalCamImc(s);
  assert.equal(r.parts.inattPts, 0); // not NaN
  assert.equal(Number.isNaN(r.score), false);
  assert.equal(r.complete, false); // the invalid item is treated as unanswered
});

test('the screen reads positive as soon as the total reaches the cut-point', () => {
  // acute(1) + LOC(1) + inattention(3) = 5 before disorientation is even done.
  const s = cam({ rass: '+1', camimc: { acute: 'yes', inattention: '3' } });
  const r = evalCamImc(s);
  assert.equal(r.score, 5);
  assert.equal(r.complete, false);
  assert.equal(r.positive, true);
});

test('disorientation contribution never exceeds five points', () => {
  const s = cam({
    rass: '0',
    camimc: { acute: 'no', inattention: '0', disorientTaps: [0, 1, 2, 3, 4], disorientDone: true },
  });
  const r = evalCamImc(s);
  assert.equal(r.parts.disoPts, 5);
  assert.equal(r.score, 5);
});

test('Martinez admission risk bands map score 0-3 to Low / Intermediate / High', () => {
  assert.equal(evalRisk(cam({ risk: {} })).band.label, 'Low');
  assert.equal(evalRisk(cam({ risk: { age85: true } })).score, 1);
  assert.equal(evalRisk(cam({ risk: { age85: true } })).band.label, 'Intermediate');
  const high = evalRisk(
    cam({ risk: { age85: true, adlDeps: [0, 1, 2, 3, 4], psychoDrugs: ['antipsychotic'] } }),
  );
  assert.equal(high.score, 3);
  assert.equal(high.band.label, 'High');
  assert.equal(RISK.bands.length, 3);
});

test('the ADL criterion scores only at 5 of 6 dependencies', () => {
  assert.equal(evalRisk(cam({ risk: { adlDeps: [0, 1, 2, 3] } })).score, 0); // 4 of 6 → no point
  assert.equal(evalRisk(cam({ risk: { adlDeps: [0, 1, 2, 3, 4] } })).score, 1); // 5 of 6 → +1
  assert.equal(RISK.adl.threshold, 5);
  assert.equal(RISK.adl.activities.length, 6);
});

test('the psychotropic criterion scores at a weighted subtotal of ≥ 2', () => {
  assert.equal(evalRisk(cam({ risk: { psychoDrugs: ['antidepressant'] } })).score, 0); // 1 < 2
  assert.equal(evalRisk(cam({ risk: { psychoDrugs: ['antipsychotic'] } })).score, 1); // antipsychotic weighted 2
  assert.equal(
    evalRisk(cam({ risk: { psychoDrugs: ['antidepressant', 'anticonvulsant'] } })).score,
    1,
  ); // 1 + 1
  assert.equal(RISK.psychotropic.threshold, 2);
  assert.equal(RISK.psychotropic.drugs.find((d) => d.id === 'antipsychotic').pts, 2);
});
