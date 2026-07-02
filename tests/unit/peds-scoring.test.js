// Golden-value tests for the pediatric screens. A wrong threshold here is a
// patient-safety bug, so these pin every cut-point and the routing logic
// (see docs/CLINICAL_METHODOLOGY.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAPD_POSITIVE, CAPD_ITEMS, CAPD_BANDS } from '../../src/js/peds/data/capd.js';
import {
  capdItemPoints,
  evalCapd,
  arousalGate,
  evalCam,
  featurePresent,
  recommendScreen,
  capdBand,
} from '../../src/js/peds/scoring.js';

const capd = (arr) => Object.fromEntries(CAPD_ITEMS.map((it, i) => [it.id, arr[i]]));

test('CAPD positive cut point is 9', () => {
  assert.equal(CAPD_POSITIVE, 9);
});

test('CAPD has 8 items; first four reverse-scored; every item has an anchor per band', () => {
  assert.equal(CAPD_ITEMS.length, 8);
  assert.deepEqual(
    CAPD_ITEMS.map((i) => i.reverse),
    [true, true, true, true, false, false, false, false],
  );
  for (const item of CAPD_ITEMS) {
    for (const band of CAPD_BANDS) {
      assert.ok(item.anchors[band.id], `missing anchor: ${item.id}/${band.id}`);
    }
  }
});

test('capdItemPoints honors scoring direction', () => {
  assert.equal(capdItemPoints(true, 0), 4);
  assert.equal(capdItemPoints(true, 4), 0);
  assert.equal(capdItemPoints(false, 0), 0);
  assert.equal(capdItemPoints(false, 4), 4);
  assert.equal(capdItemPoints(true, null), null);
});

test('CAPD score withheld until all 8 items answered; threshold 9 pos / 8 neg', () => {
  const partial = capd([2, 3, 4, 4, 3, 2, 1, '']);
  assert.equal(evalCapd(partial).complete, false);
  assert.equal(evalCapd(partial).score, null);
  const nine = evalCapd(capd([2, 3, 4, 4, 3, 2, 1, 0]));
  assert.equal(nine.score, 9);
  assert.equal(nine.positive, true);
  const eight = evalCapd(capd([2, 3, 4, 4, 3, 1, 1, 0]));
  assert.equal(eight.score, 8);
  assert.equal(eight.positive, false);
});

test('arousal gate: RASS −4/−5 unable; SBS −2/−3 unable; otherwise ok', () => {
  assert.equal(arousalGate('rass', '-5'), 'unable');
  assert.equal(arousalGate('rass', '-4'), 'unable');
  assert.equal(arousalGate('rass', '-3'), 'ok');
  assert.equal(arousalGate('rass', '0'), 'ok');
  assert.equal(arousalGate('sbs', '-3'), 'unable');
  assert.equal(arousalGate('sbs', '-2'), 'unable');
  assert.equal(arousalGate('sbs', '-1'), 'ok');
  assert.equal(arousalGate('rass', ''), null);
});

test('capdBand maps developmental age (months) to the anchor band', () => {
  assert.equal(capdBand(0.5), 'nb');
  assert.equal(capdBand(1.2), '4wk');
  assert.equal(capdBand(1.8), '6wk');
  assert.equal(capdBand(3), '8wk');
  assert.equal(capdBand(9), '28wk');
  assert.equal(capdBand(18), '1yr');
  assert.equal(capdBand(40), '2yr');
  assert.equal(capdBand(null), null);
});

test('capdBand: a child at a labeled anchor age sees that column, not the previous one', () => {
  // The source defines point-age columns (28 wk ≈ 6.44 mo, etc.); each band
  // starts at the age it is labeled with.
  assert.equal(capdBand(6.5), '28wk'); // ~28-week-old gets the 28-week anchors
  assert.equal(capdBand(1), '4wk'); // ~4 weeks
  assert.equal(capdBand(1.4), '6wk'); // ~6 weeks
  assert.equal(capdBand(1.9), '8wk'); // ~8 weeks
  assert.equal(capdBand(12), '1yr');
  assert.equal(capdBand(24), '2yr');
});

test('CAM algorithm over resolved features: F1 AND F2 AND (F3 OR F4)', () => {
  assert.equal(evalCam({ f1: true, f2: true, f3: true }), 'positive');
  assert.equal(evalCam({ f1: true, f2: true, f3: false, f4: true }), 'positive');
  assert.equal(evalCam({ f1: true, f2: false }), 'negative');
  assert.equal(evalCam({ f1: true, f2: true, f3: false, f4: false }), 'negative');
  assert.equal(evalCam({ f1: true }), null);
});

test('featurePresent resolves judgment / error-tally / compound features', () => {
  const judg = { type: 'judgment' };
  assert.equal(featurePresent(judg, 'yes'), true);
  assert.equal(featurePresent(judg, 'no'), false);
  assert.equal(featurePresent(judg, undefined), null);

  const err = { type: 'errors', threshold: 3 };
  assert.equal(featurePresent(err, { performed: true, errors: [0, 1, 2] }), true);
  assert.equal(featurePresent(err, { performed: true, errors: [0, 1] }), false);
  assert.equal(featurePresent(err, { performed: false, errors: [0, 1, 2] }), null); // not performed
  assert.equal(featurePresent(err, null), null);

  // psCAM Feature 2's second positivity path (Smith 2016): eye contact kept on
  // 8+ presentations but eye opening not sustained without verbal prompts.
  const errAlt = { type: 'errors', threshold: 3, alt: { id: 'eyeOpen' } };
  assert.equal(featurePresent(errAlt, { performed: true, errors: [0], eyeOpen: true }), true);
  assert.equal(featurePresent(errAlt, { performed: true, errors: [0], eyeOpen: false }), false);
  assert.equal(featurePresent(errAlt, { performed: false, errors: [], eyeOpen: true }), null);

  const comp = { type: 'compound' };
  assert.equal(featurePresent(comp, { performed: true, swc: true }), true);
  assert.equal(featurePresent(comp, { performed: true, unaware: true, inconsolable: true }), true);
  assert.equal(featurePresent(comp, { performed: true, unaware: true }), false); // needs both
  assert.equal(featurePresent(comp, { performed: true }), false);
  assert.equal(featurePresent(comp, { performed: false, swc: true }), null);
});

test('recommendScreen: CAPD default; psCAM 6–60 mo dev; pCAM needs chrono AND dev ≥ 60 mo', () => {
  assert.equal(recommendScreen({ chronoMonths: 8, devMonths: 8 }).recommended, 'capd');
  assert.deepEqual(recommendScreen({ chronoMonths: 8, devMonths: 8 }).alternatives, ['pscam']);
  assert.deepEqual(recommendScreen({ chronoMonths: 84, devMonths: 84 }).alternatives, ['pcam']);
  // chronologically 7 yr but developmentally 2 yr → psCAM, never pCAM
  assert.deepEqual(recommendScreen({ chronoMonths: 84, devMonths: 24 }).alternatives, ['pscam']);
  assert.deepEqual(recommendScreen({ chronoMonths: 2, devMonths: 2 }).alternatives, []);
});
