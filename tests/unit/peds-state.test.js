// The pediatric import sanitizer guards every snapshot that enters the app.
// Without it, a malformed / hand-edited file drives a clinically wrong screen:
// an out-of-range arousal string reads as "assessable" + "altered consciousness",
// and truthy non-booleans in a CAM feature read as positive findings. These tests
// pin the guard and prove the previously-wrong scenarios now degrade safely.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAssessment, looksLikePedsAssessment } from '../../src/js/peds/state.js';
import { EXAMPLE, EXAMPLE_PCAM } from '../../src/js/peds/persist.js';
import {
  arousalGate,
  feature3FromArousal,
  resolveFeature,
  evalCam,
  featurePresent,
} from '../../src/js/peds/scoring.js';
import { CAM_BY_SCREEN } from '../../src/js/peds/data/cam.js';

test('rejects files that are not a pediatric assessment / have no usable age', () => {
  assert.equal(sanitizeAssessment(null), null);
  assert.equal(sanitizeAssessment({ v: 1, tool: 'ed', lunchTaps: [] }), null); // ED file: no profile
  assert.equal(sanitizeAssessment({ v: 1, camimc: {} }), null); // step-down file: no profile
  assert.equal(sanitizeAssessment({ v: 1, profile: {} }), null); // no age
  assert.equal(sanitizeAssessment({ v: 1, profile: { ageM: 'banana' } }), null); // non-numeric age
  assert.equal(sanitizeAssessment({ v: 1, profile: { ageM: 99999 } }), null); // absurd age → rejected
});

test('an out-of-range arousal string no longer reads as assessable / altered consciousness', () => {
  const clean = sanitizeAssessment({
    v: 1,
    profile: { ageM: 84, devM: 84 },
    screen: 'pcam',
    arousalScale: 'rass',
    arousal: '-9', // not a real RASS level (the live radios can only emit -5..+4)
    cam: { f1: 'yes', f2: { performed: true, errors: [0, 1, 2] } },
  });
  assert.equal(clean.arousal, ''); // '-9' rejected
  // Feature 3 derives from the arousal: with no valid arousal the gate is pending,
  // so F3 is null (not "present"), and the screen is incomplete — not a bogus positive.
  assert.equal(arousalGate('rass', clean.arousal), null);
  assert.equal(feature3FromArousal('rass', clean.arousal), null);
  const def = CAM_BY_SCREEN.pcam;
  const f1 = resolveFeature(def.features[0], clean.cam.f1, 'rass', clean.arousal);
  const f2 = resolveFeature(def.features[1], clean.cam.f2, 'rass', clean.arousal);
  const f3 = resolveFeature(def.features[2], undefined, 'rass', clean.arousal);
  const f4 = resolveFeature(def.features[3], clean.cam.f4, 'rass', clean.arousal);
  assert.equal(f2, true); // three errors ≥ threshold — genuinely present
  assert.equal(f3, null); // altered LOC unknown, not present
  assert.equal(evalCam({ f1, f2, f3, f4 }), null); // incomplete, NOT 'positive'
});

test('a real comatose arousal survives and gates the screen unassessable', () => {
  const clean = sanitizeAssessment({
    v: 1,
    profile: { ageM: 84, devM: 84 },
    screen: 'pcam',
    arousalScale: 'rass',
    arousal: '-5',
  });
  assert.equal(clean.arousal, '-5');
  assert.equal(arousalGate('rass', clean.arousal), 'unable');
});

test('truthy non-boolean CAM compound flags are coerced to false', () => {
  const clean = sanitizeAssessment({
    v: 1,
    profile: { ageM: 24, devM: 24 },
    screen: 'pscam',
    arousalScale: 'rass',
    cam: { f4: { performed: true, swc: 'no', unaware: 'x', inconsolable: 1 } },
  });
  assert.deepEqual(clean.cam.f4, {
    performed: true,
    swc: false,
    unaware: false,
    inconsolable: false,
  });
  const def = CAM_BY_SCREEN.pscam;
  assert.equal(featurePresent(def.features[3], clean.cam.f4), false); // not a bogus positive
});

test('CAPD frequencies outside 0–4 (and unknown keys) are dropped', () => {
  const clean = sanitizeAssessment({
    v: 1,
    profile: { ageM: 14, devM: 14 },
    screen: 'capd',
    capd: { eye: '2', purpose: '9', aware: 'x', bogusKey: '1' },
  });
  assert.equal(clean.capd.eye, '2');
  assert.equal('purpose' in clean.capd, false);
  assert.equal('aware' in clean.capd, false);
  assert.equal('bogusKey' in clean.capd, false);
});

test('screen id, checklist keys, baseline, dev age and weight are validated', () => {
  const clean = sanitizeAssessment({
    v: 1,
    profile: { ageM: 120, devM: -3, weightKg: 'x', baseline: 'evil', glasses: 'yes', delay: 'yes' },
    screen: 'evil',
    risk: { benzo: true, notakey: true },
    prevention: { A: true, zzz: true },
    medsGiven: { dexmed: true, poison: true },
  });
  assert.equal(clean.screen, 'capd'); // unknown screen → default
  assert.equal(clean.profile.devM, 120); // negative → defaults to ageM
  assert.equal(clean.profile.weightKg, null); // non-numeric → null
  assert.equal(clean.profile.baseline, 'typical'); // unknown → default
  assert.equal(clean.profile.glasses, false); // truthy string → false
  assert.equal(clean.profile.delay, false);
  assert.deepEqual(clean.risk, { benzo: true });
  assert.deepEqual(clean.prevention, { A: true });
  assert.deepEqual(clean.medsGiven, { dexmed: true });
});

test('an explicitly-unchecked profile-derived risk factor (present false) is preserved', () => {
  const clean = sanitizeAssessment({
    v: 1,
    profile: { ageM: 14, devM: 14 },
    screen: 'capd',
    risk: { age: false, benzo: true },
  });
  assert.equal(clean.risk.age, false); // preserved → not silently re-derived after import
  assert.equal(clean.risk.benzo, true);
});

test('the worked examples pass through the sanitizer with their clinical content intact', () => {
  const a = sanitizeAssessment(EXAMPLE);
  assert.equal(a.screen, 'capd');
  assert.equal(a.arousal, '0');
  assert.equal(a.capd.eye, '1');
  assert.deepEqual(a.risk, { benzo: true, vent: true });
  const b = sanitizeAssessment(EXAMPLE_PCAM);
  assert.equal(b.screen, 'pcam');
  assert.equal(b.arousal, '-1');
  assert.equal(b.cam.f1, 'yes');
  assert.equal(b.cam.f2.picture.performed, true);
  assert.equal(Object.keys(b.cam.f2.picture.marks).length, 10);
});

test('looksLikePedsAssessment distinguishes peds files from the other tools', () => {
  assert.equal(looksLikePedsAssessment(EXAMPLE), true);
  assert.equal(looksLikePedsAssessment({ v: 1, tool: 'ed', lunchTaps: [] }), false);
  assert.equal(looksLikePedsAssessment(null), false);
});
