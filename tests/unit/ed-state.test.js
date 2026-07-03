// The ED state sanitizers guard every snapshot that enters the app (imports,
// localStorage). A hole here renders impossible clinical verdicts — e.g. a
// crafted 4AT encoding scoring "25/12".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blankAssessment,
  sanitizeAssessment,
  sanitizeSettings,
  looksLikeEdAssessment,
} from '../../src/js/ed/state.js';
import { EXAMPLE_ASSESSMENT, FOURAT } from '../../src/js/ed/data/instruments.js';
import { eval4at } from '../../src/js/ed/scoring.js';

test('sanitizeAssessment rejects 4AT encodings that are not on the form', () => {
  const out = sanitizeAssessment({
    v: 1,
    tool: 'ed',
    pathway: 'fourat',
    fourat: { alertness: '9:9', amt4: '7:1', attention: '5:0', change: '4:1' },
  });
  assert.equal(out.fourat.alertness, '');
  assert.equal(out.fourat.amt4, '');
  assert.equal(out.fourat.attention, '');
  assert.equal(out.fourat.change, '4:1'); // the one real encoding survives
});

test('sanitizeAssessment accepts every real 4AT option encoding', () => {
  for (const item of FOURAT.items) {
    item.options.forEach((o, idx) => {
      const enc = `${o.v}:${idx}`;
      const out = sanitizeAssessment({ v: 1, fourat: { [item.id]: enc } });
      assert.equal(out.fourat[item.id], enc, `${item.id} ${enc}`);
    });
  }
});

test('sanitizeAssessment bounds taps, whitelists enums, and types strings', () => {
  const out = sanitizeAssessment({
    v: 1,
    pathway: 'nonsense',
    rass: '99',
    lunchTaps: [0, 0, 4, 9, -1, 'x'],
    monthTaps: [5, 6, 2],
    monthDone: 'yes', // not boolean true — must not auto-confirm
    f1: 'maybe',
    f4: 'lots',
    actions: ['act-causes-0', 'bogus-9'],
    assessor: 42,
    notes: { a: 1 },
    assessedAt: 'yesterday',
  });
  assert.equal(out.pathway, '');
  assert.equal(out.rass, '');
  assert.deepEqual(out.lunchTaps, [0, 4]);
  assert.deepEqual(out.monthTaps, [5, 2]);
  assert.equal(out.monthDone, false);
  assert.equal(out.f1, '');
  assert.equal(out.f4, '');
  assert.deepEqual(out.actions, ['act-causes-0']);
  assert.equal(out.assessor, '');
  assert.equal(out.notes, '');
  assert.equal(out.assessedAt, '');
});

test('looksLikeEdAssessment distinguishes ED exports from other v:1 files', () => {
  assert.equal(looksLikeEdAssessment(blankAssessment()), true);
  assert.equal(looksLikeEdAssessment({ v: 1, tool: 'ed' }), true);
  // A peds/adult export is also {v:1,...} but has no ED markers.
  assert.equal(looksLikeEdAssessment({ v: 1, profile: { ageM: 30 } }), false);
  assert.equal(looksLikeEdAssessment(null), false);
  assert.equal(looksLikeEdAssessment([1, 2]), false);
});

test('the example assessment survives its own sanitizer intact', () => {
  const out = sanitizeAssessment(EXAMPLE_ASSESSMENT);
  assert.equal(out.rass, '-1');
  assert.equal(out.f1, 'yes');
  assert.deepEqual(out.monthTaps, [0, 2, 4]);
  assert.equal(out.monthDone, true);
  assert.equal(out.f4, 'errors');
  // Its 4AT encodings are real form options and score a positive band.
  const values = Object.fromEntries(
    Object.entries(out.fourat).map(([k, v]) => [k, Number(v.split(':')[0])]),
  );
  const res = eval4at(values);
  assert.equal(res.complete, true);
  assert.equal(res.band.verdict, 'positive');
});

test('sanitizeSettings type-checks the facility and whitelists the pathway', () => {
  assert.deepEqual(sanitizeSettings({ facility: { a: 1 }, defaultPathway: 'x' }), {
    facility: '',
    defaultPathway: 'twostep',
  });
  assert.deepEqual(sanitizeSettings({ facility: 'Mercy ED', defaultPathway: 'bcam' }), {
    facility: 'Mercy ED',
    defaultPathway: 'bcam',
  });
  assert.deepEqual(sanitizeSettings(null), { facility: '', defaultPathway: 'twostep' });
});
