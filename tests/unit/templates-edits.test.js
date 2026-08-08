// A printed sheet carries a cited-sources footer, so any line the designer
// supplied has to be distinguishable from the built-in text it replaced. The
// marking rides on a branded string: ov() brands what it replaced, and the
// element builder turns the brand into a printed marker. A transform that
// returns a plain string in between silently un-marks the line, which is why
// the propagation is pinned here rather than left to the rendering tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ov,
  nobreak,
  remap,
  asEdited,
  listEdits,
  resetEdits,
} from '../../src/js/templates/primitives.js';

const src = (p) =>
  readFileSync(fileURLToPath(new URL(`../../src/js/templates/${p}`, import.meta.url)), 'utf8');
const stateWith = (textOverrides) => ({ textOverrides, custom: {} });

test('built-in text passes through untouched and records nothing', () => {
  resetEdits();
  const out = ov(stateWith({}), 'np-clock', 'Clock and calendar visible');
  assert.equal(out, 'Clock and calendar visible');
  assert.equal(listEdits().length, 0);
});

test('a substitution is recorded with both the built-in and the replacement', () => {
  resetEdits();
  const out = ov(
    stateWith({ 'np-clock': 'Remove the clock' }),
    'np-clock',
    'Clock and calendar visible',
  );
  assert.equal(String(out), 'Remove the clock');
  assert.deepEqual(listEdits(), [
    { id: 'np-clock', from: 'Clock and calendar visible', to: 'Remove the clock' },
  ]);
});

test('an override identical to the built-in text is not a substitution', () => {
  resetEdits();
  const text = 'Clock and calendar visible';
  const out = ov(stateWith({ 'np-clock': text }), 'np-clock', text);
  assert.equal(listEdits().length, 0, 'no mark for text that did not change');
  assert.equal(typeof out, 'string', 'and nothing to carry downstream');
});

test('an empty or non-string override falls back rather than blanking the line', () => {
  resetEdits();
  for (const bad of ['', null, undefined, 42, {}]) {
    assert.equal(ov(stateWith({ 'np-clock': bad }), 'np-clock', 'Built-in'), 'Built-in');
  }
  assert.equal(listEdits().length, 0);
});

test('resetEdits clears the previous render', () => {
  resetEdits();
  ov(stateWith({ a: 'x' }), 'a', 'y');
  assert.equal(listEdits().length, 1);
  resetEdits();
  assert.equal(listEdits().length, 0);
});

test('nobreak carries the brand across its hyphen substitution', () => {
  resetEdits();
  const edited = ov(stateWith({ i: 'Use CAM-ICU q4h' }), 'i', 'Built-in');
  const out = nobreak(edited);
  assert.match(String(out), /CAM‑ICU/, 'hyphens still become non-breaking');
  assert.notEqual(typeof out, 'string', 'and the value stays branded');
  // Plain text must not pick up a brand on the way through.
  assert.equal(typeof nobreak('CAM-ICU'), 'string');
});

test('remap carries the brand across an arbitrary transform', () => {
  resetEdits();
  const edited = ov(stateWith({ i: '{dose} PRN' }), 'i', 'Built-in');
  const out = remap(edited, (t) => t.replace('{dose}', '0.5 mg'));
  assert.equal(String(out), '0.5 mg PRN');
  assert.notEqual(typeof out, 'string');
  assert.equal(typeof remap('plain', (t) => t.toUpperCase()), 'string');
});

test('asEdited brands and records a line the unit added', () => {
  resetEdits();
  const out = asEdited('Call the delirium champion', 'added:test');
  assert.equal(String(out), 'Call the delirium champion');
  assert.notEqual(typeof out, 'string');
  assert.deepEqual(listEdits(), [{ id: 'added:test', from: '', to: 'Call the delirium champion' }]);
});

// The brand survives assignment and function calls but not a method called on
// the result, which returns a primitive. Every such site has to route through
// remap(), so the sheet builders are checked for the shape directly.
test('no sheet builder calls a string method straight off ov()', () => {
  const offenders = [];
  for (const file of ['sheets.js', 'peds-cards.js', 'ed-cards.js', 'stepdown-cards.js']) {
    src(file)
      .split('\n')
      .forEach((line, i) => {
        // ov(...) immediately followed by `.method(` — the brand is lost there.
        if (/\bov\((?:[^()]|\([^()]*\))*\)\s*\.\s*[A-Za-z]/.test(line)) {
          offenders.push(`${file}:${i + 1}  ${line.trim()}`);
        }
      });
  }
  assert.deepEqual(offenders, [], 'wrap the transform in remap() so the line stays marked');
});
