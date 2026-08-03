// Integrity checks on the /evidence data snapshot (src/js/evidence/data.json).
// This guards the claim-source map against silent drift: a dropped claim, an
// unknown status, a highlight that no longer matches its source paragraph, or a
// malformed methodology block. The passages are deterministic slices of the
// source text, so the highlight MUST be a literal substring of its context.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DATA = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../src/js/evidence/data.json', import.meta.url)), 'utf8'),
);

// Status vocabulary rendered by the page (src/js/evidence/main.js STATUS map).
const STATUSES = new Set([
  'fulltext',
  'instrument',
  'guideline',
  'abstract',
  'web',
  'notstated',
  'structure',
  'na',
  'other',
]);
const STANCES = new Set([
  'agrees',
  'partial',
  'contradicts',
  'not_stated',
  'not_addressed',
  'background',
]);
const SCOPES = new Set([
  'on-scope',
  'different-population',
  'different-setting',
  'different-intervention',
  'broader',
  'narrower',
  'background',
]);

test('evidence data: expected shape and non-empty collections', () => {
  for (const k of ['tools', 'claims', 'references', 'methodology']) {
    assert.ok(Array.isArray(DATA[k]) && DATA[k].length, `${k} present and non-empty`);
  }
});

test('claims: unique ids, core fields, known status, resolvable tool', () => {
  const toolIds = new Set(DATA.tools.map((t) => t.id));
  const ids = new Set();
  for (const c of DATA.claims) {
    assert.ok(c.id && c.statement && c.status && c.toolId, `claim has core fields: ${c.id}`);
    assert.ok(!ids.has(c.id), `duplicate claim id: ${c.id}`);
    ids.add(c.id);
    assert.ok(STATUSES.has(c.status), `claim ${c.id} has known status (${c.status})`);
    assert.ok(toolIds.has(c.toolId), `claim ${c.id} maps to a real tool (${c.toolId})`);
  }
});

test('every full-text-verified / instrument claim shows its verbatim text', () => {
  // A claim marked full-text-verified (or validated-instrument) must actually
  // present the wording — via a per-source paragraph or a claim-level passage.
  // Operational / guideline / web / site-content claims are cited by note and
  // need no passage, so they are exempt.
  const showsText = (c) =>
    (c.perSource || []).some((e) => (e.paragraphs || []).length) || !!(c.context || c.passage);
  const gaps = DATA.claims.filter(
    (c) => (c.status === 'fulltext' || c.status === 'instrument') && !showsText(c),
  );
  assert.deepEqual(
    gaps.map((c) => c.id),
    [],
    'a full-text-verified / instrument claim must show its passage',
  );
});

test('per-source passages: valid stance/scope and highlight is a literal substring', () => {
  for (const c of DATA.claims) {
    for (const e of c.perSource || []) {
      assert.ok(STANCES.has(e.stance || 'background'), `stance valid on ${c.id}/${e.label}`);
      for (const pg of e.paragraphs || []) {
        assert.ok(SCOPES.has(pg.scope), `scope valid on ${c.id}/${e.label} (${pg.scope})`);
        assert.ok(pg.context && pg.context.length, `paragraph has context on ${c.id}/${e.label}`);
        if (pg.highlight) {
          assert.ok(
            pg.context.includes(pg.highlight),
            `highlight is a verbatim slice of its paragraph on ${c.id}/${e.label}`,
          );
        }
      }
    }
  }
});

test('the manually-authored PICU arousal-gate claim keeps its on-scope passages', () => {
  const c = DATA.claims.find((x) => x.id === 'picu-wf-r5');
  assert.ok(c, 'picu-wf-r5 present');
  const withParas = (c.perSource || []).filter((e) => (e.paragraphs || []).length);
  assert.ok(withParas.length >= 4, 'four sources carry passages');
  assert.ok(
    withParas.every((e) => e.paragraphs.every((p) => p.scope === 'on-scope' && !p.flag)),
    'all its passages are on-scope and unflagged',
  );
});

test('references: each has a source label; links are absolute URLs', () => {
  for (const r of DATA.references) {
    assert.ok(r.source, 'reference has a source label');
    if (r.link) assert.match(r.link, /^https?:\/\//, `reference link is absolute: ${r.source}`);
  }
});

test('methodology blocks are well-formed', () => {
  const seenSections = [];
  for (const b of DATA.methodology) {
    assert.ok(['h', 'p', 'ul', 'ol', 'table'].includes(b.t), `known block type: ${b.t}`);
    if (b.t === 'h') {
      assert.ok(b.level === 2 || b.level === 3, 'heading level is 2 or 3');
      assert.ok(Array.isArray(b.spans) && b.spans.length, 'heading has spans');
      if (b.level === 2) seenSections.push(b.spans.map((s) => s.text).join(''));
    }
    if (b.t === 'p') assert.ok(Array.isArray(b.spans), 'paragraph has spans');
    if (b.t === 'ul' || b.t === 'ol') assert.ok((b.items || []).length, 'list has items');
    if (b.t === 'table') {
      assert.ok((b.head || []).length, 'table has a header row');
      assert.ok((b.rows || []).length, 'table has body rows');
    }
  }
  // the full document was folded in (intended use → pediatric tool)
  assert.ok(
    seenSections.some((t) => /Intended use/.test(t)),
    'includes Intended use',
  );
  assert.ok(
    seenSections.some((t) => /Citation registry/.test(t)),
    'includes Citation registry',
  );
  assert.ok(
    seenSections.some((t) => /Known limitations/.test(t)),
    'includes Known limitations',
  );
});
