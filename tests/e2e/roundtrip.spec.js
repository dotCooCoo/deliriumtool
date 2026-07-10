import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Assessments are session-only — a reload starts fresh — so handoff runs
// through JSON export/import. These tests pin the lossless guarantee on that
// path: what a file carries out must come back identically.

const parseFile = (path) => {
  const o = JSON.parse(readFileSync(path, 'utf8'));
  // activeTab is UI position, not assessment data — exports from different
  // tabs must still compare equal.
  delete o.activeTab;
  return o;
};

// PEDS — export → import → export must round-trip the assessment losslessly.
test('peds export/import is lossless', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  await page.click('.tab-btn[data-tab="risk"]');
  for (const cb of await page.locator('#tab-risk input[data-risk]').all()) await cb.check();
  await page.click('.tab-btn[data-tab="prevent"]');
  for (const cb of await page.locator('#tab-prevent input[data-prev]').all()) await cb.check();

  const dl1 = page.waitForEvent('download');
  await page.click('[data-act="exportJSON"]');
  const file1 = await (await dl1).path();

  await page.click('.pathway-bar [data-act="clearAll"]'); // new child → picker
  await expect(page.locator('#pathway-picker')).toBeVisible();

  const chooser = page.waitForEvent('filechooser');
  await page.click('[data-act="importJSON"]');
  await (await chooser).setFiles(file1);
  await expect(page.locator('#workspace')).toBeVisible();
  // The import restores the tab that was active at export time.
  await expect(page.locator('.tab-btn[data-tab="prevent"]')).toHaveClass(/active/);

  const dl2 = page.waitForEvent('download');
  await page.click('[data-act="exportJSON"]');
  const file2 = await (await dl2).path();
  expect(parseFile(file2)).toEqual(parseFile(file1));
});

// ADULT — export → import → export must round-trip the assessment losslessly.
test('adult export/import is lossless', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/');
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="full"]');
  await page.click('[data-act="autofill"]');

  const dl1 = page.waitForEvent('download');
  await page.click('[data-act="exportJSON"]');
  const file1 = await (await dl1).path();

  await page.click('[data-act="reset"]'); // back to the picker, everything cleared
  await expect(page.locator('#pathway-picker')).toBeVisible();
  await page.click('[data-pathway="full"]'); // fresh workspace so Load is reachable

  const chooser = page.waitForEvent('filechooser');
  await page.click('[data-act="importJSON"]');
  await (await chooser).setFiles(file1);

  const dl2 = page.waitForEvent('download');
  await page.click('[data-act="exportJSON"]');
  const file2 = await (await dl2).path();
  expect(parseFile(file2)).toEqual(parseFile(file1));
});

// ADULT — a stored CAM verdict is re-derived from features + RASS on import,
// so a hand-edited or stale file cannot display a result its inputs don't support.
test('adult import re-derives the CAM verdict from its features', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="full"]');
  const chooser = page.waitForEvent('filechooser');
  await page.click('[data-act="importJSON"]');
  await (
    await chooser
  ).setFiles({
    name: 'assessment.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        v: 1,
        pathway: 'full',
        s: { cam: { 1: 'no', 2: 'no' }, camResult: 'positive', rass: '0' },
        controls: {},
      }),
    ),
  });
  // The tab strip can sit off-screen on the mobile profile — activate via DOM.
  await page.locator('[data-tab="cam"]').evaluate((el) => el.click());
  // Feature 1 and 2 are both "no" → the verdict must be Negative, not the stored "positive".
  await expect(page.locator('#cam-res-txt')).toContainText('Negative');
});
