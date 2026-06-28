// PDF generation invariants. jsPDF runs headless in Node, and generate() exposes
// the built doc via opts._returnDoc, so we can assert page counts + metadata
// without a browser. (Rendered-content validation is done via Playwright.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeliriumPDF } from '../../src/js/pdf.js';

const baseOpts = {
  dt: 'Jun 27, 2026, 08:01 PM',
  facility: 'Test ICU',
  meds: [{ label: 'Benzodiazepines', items: ['Lorazepam (Ativan)'] }],
  settings: {
    rassTarget: '0 to -2 (light — ICU default)',
    screen: 'CAM-ICU',
    camfreq: 'Once per shift',
    director: 'Dr X',
    cno: 'RN Y',
  },
  _returnDoc: true,
};
const gen = (kind, assessment = {}) => DeliriumPDF.generate(kind, { ...baseOpts, assessment });

test('full rounding tool fits on two pages (dynamic measure-and-fit)', () => {
  // The dense page 1 would otherwise spill the governance row onto a near-blank
  // 3rd page; buildFullFitted measures and scales it so a typical assessment fits.
  assert.ok(gen('full').internal.getNumberOfPages() <= 2, 'full doc should fit on two pages');
});

test('a populated full assessment still fits on two pages', () => {
  const a = {
    cam: 'positive',
    rass: '-2',
    sub: 'mixed',
    risk: 12,
    riskTier: 'Very many',
    bundleOn: 20,
    bundleAll: 32,
    mnemOn: 9,
    mnemAll: 9,
    notes: 'Reviewed at the bedside on rounds; plan discussed with the team.',
    mnemDomains: Array.from({ length: 9 }, () => ({ reviewed: true, action: 'addressed' })),
  };
  assert.ok(
    gen('full', a).internal.getNumberOfPages() <= 2,
    'populated full doc should still fit on two pages',
  );
});

test('SPA = 2 pages, record = 1 page', () => {
  assert.equal(gen('spa').internal.getNumberOfPages(), 2);
  assert.equal(gen('record').internal.getNumberOfPages(), 1);
});

test('every generated PDF carries Title metadata', () => {
  for (const kind of ['full', 'spa', 'record']) {
    assert.match(gen(kind).output(), /\/Title/, `${kind} should set PDF Title metadata`);
  }
});
