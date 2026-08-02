/**
 * The ED and step-down summary PDFs each carry the bedside workflow poster as a
 * second, landscape page (mirroring the pediatric report). These builders take a
 * plain data model — no DOM — so the page structure is asserted here without a
 * browser. jsPDF renders headless in Node.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEdDoc } from '../../src/js/ed/report.js';
import { buildStepdownDoc } from '../../src/js/stepdown/report.js';

const edModel = {
  facility: 'Test ED',
  sub: 'Emergency department',
  date: 'Jul 31, 2026',
  assessor: 'A. Nurse, RN',
  verdict: { tone: 'red', label: 'bCAM positive — delirium present' },
  rows: [
    ['Pathway', 'DTS → bCAM'],
    ['RASS', '+1'],
  ],
  actions: ['Reviewed medications'],
  notes: 'Post-fall, acute confusion per family.',
  refs: [{ c: 'Han 2013', u: 'https://pubmed.ncbi.nlm.nih.gov/' }],
};

const sdModel = {
  facility: 'Test Step-Down',
  sub: 'Adult step-down / progressive care',
  date: 'Jul 31, 2026',
  assessor: 'A. Nurse, RN',
  verdict: { tone: 'amber', label: 'CAM-IMC positive — evaluate', detail: '' },
  screen: {
    unable: false,
    total: '4/10',
    result: 'POSITIVE',
    rows: [
      ['Acute change', 'Present (+1)'],
      ['Altered LOC', 'RASS +1 (+1)'],
    ],
  },
  risk: {
    score: '2/3',
    band: 'High',
    rows: [['Age ≥ 85', 'Yes (+1)']],
  },
  prevention: { count: '3 of 10', items: ['Reorientation'] },
  notes: 'Post-ICU transfer, day 2.',
  refs: [{ c: 'Beyer 2024', u: 'https://pubmed.ncbi.nlm.nih.gov/' }],
};

const orientation = (doc, page) => {
  doc.setPage(page);
  return doc.internal.pageSize.getWidth() > doc.internal.pageSize.getHeight()
    ? 'landscape'
    : 'portrait';
};

test('ED summary appends a workflow page (two pages total)', () => {
  const doc = buildEdDoc(edModel);
  assert.equal(doc.internal.getNumberOfPages(), 2, 'summary + workflow');
});

test('step-down summary appends a workflow page; both pages landscape like the ED/peds reports', () => {
  const doc = buildStepdownDoc(sdModel);
  assert.equal(doc.internal.getNumberOfPages(), 2, 'summary + workflow');
  assert.equal(orientation(doc, 1), 'landscape', 'summary page is landscape');
  assert.equal(orientation(doc, 2), 'landscape', 'workflow page is landscape');
});
