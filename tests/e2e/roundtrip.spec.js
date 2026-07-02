import { test, expect } from '@playwright/test';

// PEDS — the saved snapshot must survive restore + re-save losslessly.
test('peds save/load is lossless across reload', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  await page.click('.tab-btn[data-tab="risk"]');
  for (const cb of await page.locator('#tab-risk input[data-risk]').all()) await cb.check();
  await page.click('.tab-btn[data-tab="prevent"]');
  for (const cb of await page.locator('#tab-prevent input[data-prev]').all()) await cb.check();
  await page.waitForTimeout(600);
  const S1 = await page.evaluate(() => localStorage.getItem('deliriumtool:peds'));
  await page.reload();
  await expect(page.locator('#workspace')).toBeVisible();
  await page.click('.tab-btn[data-tab="export"]');
  const med = page.locator('#meds-given input[data-med]').first();
  await med.click();
  await med.click(); // net no change → forces a re-save
  await page.waitForTimeout(600);
  const S2 = await page.evaluate(() => localStorage.getItem('deliriumtool:peds'));
  // activeTab is UI position, not assessment data, and the test changes tabs after
  // reload — compare the assessment payload, which must round-trip losslessly.
  const assessment = (s) => {
    const o = JSON.parse(s);
    delete o.activeTab;
    return o;
  };
  expect(assessment(S2)).toEqual(assessment(S1));
});

// PEDS — profile incl. sensory aids survives reload.
test('peds profile (age/baseline/weight/glasses/hearing) survives reload', async ({ page }) => {
  await page.goto('/peds/');
  await page.fill('#prof-age', '30');
  await page.selectOption('#prof-baseline', 'impaired');
  await page.fill('#prof-dev', '18');
  await page.fill('#prof-weight', '12');
  await page.check('[data-prof="glasses"]');
  await page.check('[data-prof="hearing"]');
  await page.click('[data-act="deriveScreen"]');
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.locator('#workspace')).toBeVisible();
  await page.click('[data-act="reset"]'); // Edit child → form shows restored values
  await expect(page.locator('#prof-age')).toHaveValue('30');
  await expect(page.locator('#prof-baseline')).toHaveValue('impaired');
  await expect(page.locator('#prof-dev')).toHaveValue('18');
  await expect(page.locator('#prof-weight')).toHaveValue('12');
  await expect(page.locator('[data-prof="glasses"]')).toBeChecked();
  await expect(page.locator('[data-prof="hearing"]')).toBeChecked();
});

// PEDS — assessor persists (it's in the snapshot).
test('peds assessor persists across reload', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  await page.click('.tab-btn[data-tab="export"]');
  await page.fill('#peds-assessor', 'K. Patel, RN');
  await page.locator('#peds-assessor').press('Tab'); // blur → fires change → autosave
  await page.waitForTimeout(600);
  await page.reload();
  await page.click('.tab-btn[data-tab="export"]');
  await expect(page.locator('#peds-assessor')).toHaveValue('K. Patel, RN');
});

// ADULT — the saved snapshot must survive restore + re-save losslessly.
test('adult save/load is lossless across reload', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/');
  await page.click('[data-pathway="full"]');
  await page.click('[data-act="autofill"]');
  await page.waitForTimeout(600);
  const S1 = await page.evaluate(() => localStorage.getItem('deliriumtool:assessment'));
  await page.reload();
  const rb = page.locator('.rcb').first();
  await rb.click();
  await rb.click(); // net no change → re-save
  await page.waitForTimeout(600);
  const S2 = await page.evaluate(() => localStorage.getItem('deliriumtool:assessment'));
  expect(JSON.parse(S2)).toEqual(JSON.parse(S1));
});

// ADULT — a stored CAM verdict is re-derived from features + RASS on restore,
// so a hand-edited or stale save cannot display a result its inputs don't support.
test('adult restore re-derives the CAM verdict from its features', async ({ page }) => {
  // Seed the autosave before any app instance runs (a live page's pagehide
  // flush would overwrite a value injected after load).
  await page.addInitScript(() => {
    localStorage.setItem(
      'deliriumtool:assessment',
      JSON.stringify({
        v: 1,
        pathway: 'full',
        s: { cam: { 1: 'no', 2: 'no' }, camResult: 'positive', rass: '0' },
        controls: {},
      }),
    );
  });
  await page.goto('/');
  // The tab strip can sit off-screen on the mobile profile — activate via DOM.
  await page.locator('[data-tab="cam"]').evaluate((el) => el.click());
  // Feature 1 and 2 are both "no" → the verdict must be Negative, not the stored "positive".
  await expect(page.locator('#cam-res-txt')).toContainText('Negative');
});

// ADULT — assessor round-trip (probe whether it persists).
test('adult assessor persists across reload', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/');
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="cam"]'); // the assessor field lives in the CAM tab
  await page.fill('#cam-assessor', 'M. Lee, MD');
  await page.locator('#cam-assessor').press('Tab');
  await page.waitForTimeout(600);
  await page.reload();
  await page.click('[data-tab="cam"]');
  await expect(page.locator('#cam-assessor')).toHaveValue('M. Lee, MD');
});
