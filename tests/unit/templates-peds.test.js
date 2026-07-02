// The peds card set must mirror the pediatric tool exactly — these tests pin
// the shared imports and the card-only strings that restate tool logic
// (gates, routing, thresholds). A mismatch here is a clinical-safety bug.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RASS_LEVELS,
  SBS_LEVELS,
  RASS_CARD_DESC,
  RASS_RAIL,
  AROUSAL_ZONE,
  AROUSAL_GATE,
  SCREEN_ROUTES,
  CAPD_ITEMS,
  CAPD_POSITIVE,
  CAPD_FREQ,
  PCAM,
  PSCAM,
  STIM_DECK,
  STIM_INSTRUCTIONS,
  PEDS_FOOTER_CITES,
  PEDS_CITE_LABELS,
  PEDS_REFS,
} from '../../src/js/templates/data/peds-content.js';
import { RASS_COMATOSE, SBS_COMATOSE } from '../../src/js/peds/data/arousal.js';
import { recommendScreen } from '../../src/js/peds/scoring.js';

test('arousal card covers every scale row with a description and zone', () => {
  for (const r of RASS_LEVELS) {
    assert.ok(RASS_CARD_DESC[r.v], `missing RASS description: ${r.v}`);
    assert.ok(AROUSAL_ZONE.rass[r.v], `missing RASS zone: ${r.v}`);
  }
  for (const r of SBS_LEVELS) {
    assert.ok(r.marker, `missing SBS marker: ${r.v}`);
    assert.ok(AROUSAL_ZONE.sbs[r.v], `missing SBS zone: ${r.v}`);
  }
  const railValues = RASS_RAIL.flatMap((g) => g.values);
  assert.deepEqual(
    railValues.sort(),
    RASS_LEVELS.map((r) => r.v).sort(),
    'LOOK/TALK/TOUCH rail must cover the whole scale exactly once',
  );
});

test('gate bars restate the comatose floors from the tool', () => {
  assert.deepEqual(RASS_COMATOSE, ['-4', '-5']);
  assert.deepEqual(SBS_COMATOSE, ['-2', '-3']);
  assert.match(AROUSAL_GATE.rass.proceed, /≥ −3/);
  assert.match(AROUSAL_GATE.rass.stop, /−4 \/ −5/);
  assert.match(AROUSAL_GATE.sbs.proceed, /≥ −1/);
  assert.match(AROUSAL_GATE.sbs.stop, /−2 \/ −3/);
});

test('screen routing card matches recommendScreen boundaries', () => {
  // CAPD is the default at every age; the card says so.
  assert.equal(SCREEN_ROUTES[0].name, 'CAPD');
  assert.match(SCREEN_ROUTES[0].who, /Every age/);
  // psCAM band 6–60 months (dev), pCAM ≥ 60 months chrono AND dev.
  assert.deepEqual(recommendScreen({ chronoMonths: 36, devMonths: 36 }).alternatives, ['pscam']);
  assert.deepEqual(recommendScreen({ chronoMonths: 72, devMonths: 72 }).alternatives, ['pcam']);
  assert.deepEqual(recommendScreen({ chronoMonths: 72, devMonths: 24 }).alternatives, ['pscam']);
  assert.match(SCREEN_ROUTES[1].who, /6 months – 5 years/);
  assert.match(SCREEN_ROUTES[2].who, /≥ 5 years/);
});

test('CAPD card values come from the tool module', () => {
  assert.equal(CAPD_POSITIVE, 9);
  assert.equal(CAPD_ITEMS.length, 8);
  assert.equal(CAPD_FREQ.length, 5);
  assert.deepEqual(
    CAPD_ITEMS.map((i) => i.reverse),
    [true, true, true, true, false, false, false, false],
  );
});

test('CAM cards carry the validated tasks and thresholds', () => {
  const pcamF2 = PCAM.features.find((f) => f.id === 'f2');
  assert.equal(pcamF2.items.join(''), 'ABADBADAAY');
  assert.equal(pcamF2.threshold, 3);
  const pcamF4 = PCAM.features.find((f) => f.id === 'f4');
  assert.equal(pcamF4.threshold, 2);
  const pscamF2 = PSCAM.features.find((f) => f.id === 'f2');
  assert.equal(pscamF2.items.length, 10);
  assert.equal(pscamF2.threshold, 3);
  assert.ok(pscamF2.alt, 'psCAM Feature 2 alternate positivity path must be present');
});

test('stimulus deck: 10 unique pictures split 5 memory / 5 other', () => {
  assert.equal(STIM_DECK.length, 10);
  assert.equal(new Set(STIM_DECK.map((s) => s.id)).size, 10);
  assert.equal(STIM_DECK.filter((s) => s.set === 'memory').length, 5);
  assert.equal(STIM_DECK.filter((s) => s.set === 'other').length, 5);
  // The psCAM instructions are the tool's task text verbatim.
  const pscamF2 = PSCAM.features.find((f) => f.id === 'f2');
  assert.equal(STIM_INSTRUCTIONS.pscam, pscamF2.task);
});

test('every peds footer citation resolves to a registry entry and a label', () => {
  for (const keys of Object.values(PEDS_FOOTER_CITES)) {
    for (const k of keys) {
      assert.ok(PEDS_REFS[k], `unknown peds citation key: ${k}`);
      assert.ok(PEDS_CITE_LABELS[k], `missing footer label: ${k}`);
    }
  }
});
