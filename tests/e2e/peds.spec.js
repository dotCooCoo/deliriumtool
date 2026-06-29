// Pediatric tool (/peds/): profile-first flow, theme/logo, SEO, and the screens.
/* global document, getComputedStyle */
import { test, expect } from '@playwright/test';

// Fill the child profile and derive a screen. Default age routes to CAPD.
async function start(page, ageMonths = 36) {
  await page.goto('/peds/');
  await page.fill('#prof-age', String(ageMonths));
  await page.click('[data-act="deriveScreen"]');
  await expect(page.locator('#workspace')).toBeVisible();
}

const nevers = (page) =>
  page.locator('#capd-items label.pseg-opt', { has: page.locator('input[value="0"]') });

const setArousal = (page, v) =>
  page.locator('#peds-arousal .ascale-opt', { has: page.locator(`input[value="${v}"]`) }).click();

test('peds page routes and carries its own SEO', async ({ page }) => {
  await page.goto('/peds/');
  await expect(page).toHaveTitle(/Pediatric/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://deliriumtool.com/peds/',
  );
  await expect(page.locator('h1')).toHaveCount(1);
});

test('peds page applies the teal theme and shows the logo', async ({ page }) => {
  await page.goto('/peds/');
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim(),
  );
  expect(primary).toBe('#0d7d84');
  await expect(page.locator('img.app-logo')).toHaveAttribute('src', /logo\.png$/);
});

test('peds page exposes valid JSON-LD for the peds URL', async ({ page }) => {
  await page.goto('/peds/');
  const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(data['@type']).toBe('WebApplication');
  expect(data.url).toBe('https://deliriumtool.com/peds/');
});

test('child profile gate requires age, then derives a screen and shows context', async ({
  page,
}) => {
  await page.goto('/peds/');
  await expect(page.locator('#workspace')).toBeHidden();
  await page.click('[data-act="deriveScreen"]'); // no age → error, no workspace
  await expect(page.locator('#prof-error')).toBeVisible();
  await expect(page.locator('#workspace')).toBeHidden();
  await page.fill('#prof-age', '14');
  await page.click('[data-act="deriveScreen"]');
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#pathway-name')).toHaveText('CAPD');
  await expect(page.locator('#child-context')).toContainText('Age 14 mo');
  await page.click('.tab-btn[data-tab="risk"]');
  await expect(page.locator('#tab-risk')).toBeVisible();
  await page.click('[data-act="reset"]');
  await expect(page.locator('#pathway-picker')).toBeVisible();
});

test('CAPD shows age-filtered anchors and scores positive', async ({ page }) => {
  await start(page, 36);
  // inline developmental anchor for this child's band
  await expect(page.locator('#capd-items .anchor-hint').first()).toContainText('Age-expected');
  await setArousal(page, '-5');
  await expect(page.locator('#screen-result')).toContainText('Unable to assess');
  await setArousal(page, '0');
  const opts = nevers(page);
  await expect(opts).toHaveCount(8);
  for (let i = 0; i < 8; i++) await opts.nth(i).click();
  await expect(page.locator('#screen-result')).toContainText('Positive');
  await expect(page.locator('#screen-result')).toContainText('/32');
  // positive routes forward, not a dead-end badge
  await expect(page.locator('#screen-result')).toContainText('WAT-1');
  await expect(page.locator('#screen-result')).toContainText('precipitants');
});

test('baseline mental status anchors the result to this child', async ({ page }) => {
  await page.goto('/peds/');
  await page.fill('#prof-age', '36');
  await page.selectOption('#prof-baseline', 'impaired');
  await expect(page.locator('#prof-dev-row')).toBeVisible();
  await page.fill('#prof-dev', '12');
  await page.click('[data-act="deriveScreen"]');
  await setArousal(page, '0');
  const opts = nevers(page);
  for (let i = 0; i < 8; i++) await opts.nth(i).click();
  await expect(page.locator('#screen-result')).toContainText('relative to this child');
});

test('arousal scale switches to SBS and applies its own coma floor', async ({ page }) => {
  await start(page, 8); // infant — SBS is the relevant scale
  await page.click('[data-act="arousalScale"][data-scale="sbs"]');
  await expect(page.locator('#peds-arousal .ascale-opt')).toHaveCount(6);
  await page
    .locator('#peds-arousal .ascale-opt', { has: page.locator('input[value="-2"]') })
    .click();
  await expect(page.locator('#screen-result')).toContainText('Unable to assess');
  await page
    .locator('#peds-arousal .ascale-opt', { has: page.locator('input[value="-1"]') })
    .click();
  await expect(page.locator('#screen-result')).not.toContainText('Unable to assess');
});

const camYes = (page, f) =>
  page
    .locator('#cam-features label.pseg-opt', {
      has: page.locator(`input[name="cam-${f}"][value="yes"]`),
    })
    .click();

test('pCAM-ICU runs as real feature tasks: error tally drives the result', async ({ page }) => {
  await start(page, 84); // 7 yr → CAPD recommended, pCAM offered
  await page.click('[data-act="switchScreen"][data-screen="pcam"]');
  await expect(page.locator('#pathway-name')).toHaveText('pCAM-ICU');
  await setArousal(page, '0');

  const f2 = page.locator('.cam-feat', { hasText: 'Feature 2' });
  await camYes(page, 'f1'); // acute change — judgment
  // Feature 2 inattention: 2 errors marked + performed → still ABSENT (threshold 3)
  for (const i of [0, 1])
    await page.locator(`.errchip[data-cam-err="f2"][data-idx="${i}"]`).click();
  await page.locator('input[data-cam-performed="f2"]').check();
  await expect(f2.locator('.fv-badge')).toHaveText('absent');
  await camYes(page, 'f3');
  await expect(page.locator('#screen-result')).toContainText('Negative');
  // add a 3rd error → Feature 2 present → screen flips positive
  await page.locator('.errchip[data-cam-err="f2"][data-idx="2"]').click();
  await expect(f2.locator('.fv-badge')).toHaveText('present');
  await expect(page.locator('#screen-result')).toContainText('Positive');
  await expect(page.locator('#screen-result')).toContainText('pCAM-ICU');
});

test('Risk tab lists modifiable + patient risk factors', async ({ page }) => {
  await start(page);
  await page.click('.tab-btn[data-tab="risk"]');
  await expect(page.locator('#tab-risk')).toContainText('Benzodiazepine exposure');
  expect(
    await page.locator('#tab-risk input[type="checkbox"][data-risk]').count(),
  ).toBeGreaterThanOrEqual(10);
});

test('Prevention tab lists the ABCDEF bundle + non-pharmacologic measures', async ({ page }) => {
  await start(page);
  await page.click('.tab-btn[data-tab="prevent"]');
  await expect(page.locator('#tab-prevent')).toContainText('Choice of analgesia');
  await expect(page.locator('#tab-prevent')).toContainText('Protect sleep');
});

test('Treatment + Medications carry off-label framing and the corrected doses', async ({
  page,
}) => {
  await start(page);
  await page.click('.tab-btn[data-tab="treatment"]');
  await expect(page.locator('#tab-treatment')).toContainText('Off-label');
  await page.click('.tab-btn[data-tab="meds"]');
  await expect(page.locator('#tab-meds')).toContainText('Not an order set');
  await expect(page.locator('#tab-meds')).toContainText('Dexmedetomidine');
  await expect(page.locator('#tab-meds')).not.toContainText('0.26 mg/kg/day');
});
