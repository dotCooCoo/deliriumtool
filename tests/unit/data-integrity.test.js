// Integrity checks on the static clinical data. These guard the medication
// catalog and citation registry against silent drift (a dropped drug, a missing
// citation, a malformed URL).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MEDS } from '../../src/js/data/meds.js';
import { DELIRIUM_REFS } from '../../src/js/data/refs.js';

test('medication catalog: 11 categories, 103 agents, unique ids, required fields', () => {
  assert.equal(MEDS.categories.length, 11);
  const ids = new Set();
  let count = 0;
  for (const cat of MEDS.categories) {
    assert.ok(cat.id && cat.label, 'category has id + label');
    assert.ok(Array.isArray(cat.items) && cat.items.length, `category ${cat.id} has items`);
    for (const item of cat.items) {
      assert.ok(item.id && item.name, `item has id + name in ${cat.id}`);
      assert.ok(!ids.has(item.id), `duplicate medication id: ${item.id}`);
      ids.add(item.id);
      count++;
    }
  }
  assert.equal(count, 103);
});

test('medication tiers & defaults: higher-risk flagged + long tail off by default', () => {
  const items = MEDS.categories.flatMap((c) => c.items);
  // dexmedetomidine is delirium-sparing (PADIS 2025 / MENDS2) — must NOT be in the list
  assert.ok(!items.some((i) => /dexmed/i.test(i.id)), 'dexmedetomidine delisted');
  // metoclopramide is a D2 antagonist — lives under GI/antiemetics, not anticholinergics
  const mcpCat = MEDS.categories.find((c) => c.items.some((i) => /metoclopramide/.test(i.id)));
  assert.equal(mcpCat.id, 'gi');
  // higher-risk flags present (benzodiazepines, strong anticholinergics, meperidine)
  assert.ok(items.filter((i) => i.risk === 'high').length >= 20, 'higher-risk agents flagged');
  assert.ok(
    items.some((i) => i.id === 'opi-meperidine' && i.risk === 'high'),
    'meperidine flagged high',
  );
  // benzodiazepines on by default; the long tail (e.g. antimicrobials) off (opt-in)
  assert.ok(
    MEDS.categories.find((c) => c.id === 'benzo').items.every((i) => i.on),
    'benzodiazepines on by default',
  );
  assert.ok(
    MEDS.categories.find((c) => c.id === 'antimicro').items.every((i) => !i.on),
    'antimicrobials off by default',
  );
});

test('citation registry: every source has a label, citation, and an http(s) URL', () => {
  const ids = Object.keys(DELIRIUM_REFS);
  assert.ok(ids.length >= 38, 'expected the full citation registry');
  for (const id of ids) {
    const r = DELIRIUM_REFS[id];
    assert.ok(r.l && r.l.trim(), `${id} has a label`);
    assert.ok(r.c && r.c.trim(), `${id} has a citation`);
    assert.match(r.u, /^https?:\/\//, `${id} has an http(s) URL`);
  }
});
