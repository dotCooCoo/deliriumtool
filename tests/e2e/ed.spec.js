import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/ed/');
  await page.evaluate(() => {
    localStorage.removeItem('deliriumtool:ed');
    localStorage.removeItem('deliriumtool:ed:settings');
  });
  await page.reload();
});

test('page frames the tool as a reference aid with both pathways', async ({ page }) => {
  await expect(page).toHaveTitle(/ED Delirium Screening/);
  await expect(page.locator('.scope-note')).toContainText('Reference aid only');
  await expect(page.locator('#pathway-pick .opt-row')).toHaveCount(2);
  // Two-step is the default pathway.
  await expect(page.locator('input[name="ed-pathway"][value="twostep"]')).toBeChecked();
});

test('DTS rules out at RASS 0 with 0–1 LUNCH errors; bCAM never appears', async ({ page }) => {
  await page.locator('input[name="ed-rass"][value="0"]').check();
  await expect(page.locator('#dts-lunch')).toBeVisible();
  await page.locator('input[name="dts-lunch-err"][value="1"]').check();
  await expect(page.locator('#dts-verdict')).toContainText('delirium ruled out');
  await expect(page.locator('#bcam-card')).toBeHidden();
  // ≥2 errors flips it positive.
  await page.locator('input[name="dts-lunch-err"][value="2"]').check();
  await expect(page.locator('#dts-verdict')).toContainText('Confirm with the bCAM');
  await expect(page.locator('#bcam-card')).toBeVisible();
});

test('RASS −4/−5 gates the assessment as unable', async ({ page }) => {
  await page.locator('input[name="ed-rass"][value="-5"]').check();
  await expect(page.locator('#dts-verdict')).toContainText('stupor or coma');
  await expect(page.locator('#bcam-card')).toBeHidden();
});

test('bCAM: full positive path, and the inattention cardinal rule', async ({ page }) => {
  await page.locator('input[name="ed-rass"][value="-1"]').check();
  await expect(page.locator('#bcam-card')).toBeVisible();
  await expect(page.locator('#bcam-f3')).toContainText('Positive — RASS −1');
  await page.locator('input[name="bcam-f1"][value="yes"]').check();
  await page.locator('input[name="bcam-f2-err"][value="2"]').check();
  await expect(page.locator('#bcam-verdict')).toContainText('delirium present');
  // Cardinal rule: F1 + F3 positive but 0–1 month errors → negative.
  await page.locator('input[name="bcam-f2-err"][value="0"]').check();
  await expect(page.locator('#bcam-verdict')).toContainText('not detected');
});

test('bCAM feature 4 decides when the RASS is 0, and question sets alternate', async ({ page }) => {
  await page.locator('input[name="ed-rass"][value="0"]').check();
  await page.locator('input[name="dts-lunch-err"][value="2"]').check();
  await page.locator('input[name="bcam-f1"][value="assume"]').check();
  await page.locator('input[name="bcam-f2-err"][value="2"]').check();
  await expect(page.locator('#bcam-verdict')).toContainText('Complete');
  await expect(page.locator('#bcam-f4-questions')).toContainText('Will a stone float on water?');
  await page.locator('input[name="bcam-f4-set"][value="b"]').check();
  await expect(page.locator('#bcam-f4-questions')).toContainText('Will a leaf float on water?');
  await page.locator('input[name="bcam-f4-res"][value="errors"]').check();
  await expect(page.locator('#bcam-verdict')).toContainText('delirium present');
  await page.locator('input[name="bcam-f4-res"][value="none"]').check();
  await expect(page.locator('#bcam-verdict')).toContainText('not detected');
});

test('4AT pathway scores and bands correctly', async ({ page }) => {
  await page.locator('input[name="ed-pathway"][value="fourat"]').check();
  await expect(page.locator('#panel-twostep')).toBeHidden();
  await expect(page.locator('#fourat-verdict')).toContainText('Rate all four items');
  // 0 + 1 + 0 + 0 = 1 → possible cognitive impairment.
  await page.locator('input[name="fourat-alertness"]').first().check();
  await page.locator('input[name="fourat-amt4"]').nth(1).check();
  await page.locator('input[name="fourat-attention"]').first().check();
  await page.locator('input[name="fourat-change"]').first().check();
  await expect(page.locator('#fourat-verdict')).toContainText('1/12');
  await expect(page.locator('#fourat-verdict')).toContainText('cognitive impairment');
  // Acute change alone (4 points) → possible delirium.
  await page.locator('input[name="fourat-change"]').nth(1).check();
  await expect(page.locator('#fourat-verdict')).toContainText('5/12');
  await expect(page.locator('#fourat-verdict')).toContainText('possible delirium');
});

test('assessment persists across reload and resets on demand', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.locator('input[name="ed-rass"][value="-2"]').check();
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator('input[name="ed-rass"][value="-2"]')).toBeChecked();
  await page.locator('.tab-btn[data-tab="export"]').click();
  await page.locator('[data-act="reset"]').click();
  await expect(page.locator('input[name="ed-rass"][value="-2"]')).not.toBeChecked();
});

test('summary reflects the assessment and only the summary prints', async ({ page }) => {
  await page.locator('input[name="ed-rass"][value="0"]').check();
  await page.locator('input[name="dts-lunch-err"][value="0"]').check();
  await page.locator('.tab-btn[data-tab="export"]').click();
  await expect(page.locator('#summary-body')).toContainText('Negative — delirium ruled out');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#summary-body')).toBeVisible();
  await expect(page.locator('.tabs')).toBeHidden();
  await expect(page.locator('#tab-screen')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
});

test('setup default pathway persists and drives the screen', async ({ page }) => {
  await page.locator('.tab-btn[data-tab="setup"]').click();
  await page.locator('input[name="ed-default-pathway"][value="fourat"]').check();
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator('input[name="ed-pathway"][value="fourat"]')).toBeChecked();
  await expect(page.locator('#panel-fourat')).toBeVisible();
});

test('adult landing page links to the ED tool', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('a.peds-switch[href="./ed/"]');
  await expect(card).toContainText('ED Delirium Screening');
  await card.evaluate((el) => el.click());
  await expect(page).toHaveURL(/\/ed\//);
});

test('ED tool has no serious accessibility violations', async ({ page }) => {
  await page.locator('input[name="ed-rass"][value="-1"]').check();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious.map((v) => v.id).join(', ')).toBe('');
});
