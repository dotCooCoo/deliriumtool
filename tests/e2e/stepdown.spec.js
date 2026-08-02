/* global document */
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/stepdown/');
  await page.evaluate(() => {
    localStorage.removeItem('deliriumtool:stepdown');
    localStorage.removeItem('deliriumtool:stepdown:settings');
  });
  await page.reload();
});

test('page frames the tool as a reference aid', async ({ page }) => {
  await expect(page).toHaveTitle(/Step-Down Delirium Screening/);
  await expect(page.locator('.scope-note')).toContainText('Reference aid only');
  await expect(page.locator('.scope-note')).toContainText(
    'not a validated decision-support device',
  );
  await expect(page.locator('.tab-btn')).toHaveCount(5);
});

test('the header nav marks Step-Down current in the five-tool order', async ({ page }) => {
  const nav = page.locator('.tool-nav');
  await expect(nav.locator('a')).toHaveText([
    'Adult ICU',
    'Step-Down',
    'Pediatric',
    'ED',
    'Templates',
  ]);
  await expect(nav.locator('a[aria-current="page"]')).toHaveText('Step-Down');
});

test('RASS gates the screen and drives the level-of-consciousness item', async ({ page }) => {
  // RASS −4/−5 → unassessable.
  await page.locator('input[name="sd-rass"][value="-5"]').check();
  await expect(page.locator('#camimc-verdict')).toContainText('stupor or coma');
  await expect(page.locator('#camimc-total')).toHaveText('—');
  // RASS other than 0 scores the LOC point.
  await page.locator('input[name="sd-rass"][value="+1"]').check();
  await expect(page.locator('#camimc-loc')).toContainText('Positive (+1)');
  await expect(page.locator('#camimc-total')).toHaveText('1');
  // RASS 0 → no LOC point.
  await page.locator('input[name="sd-rass"][value="0"]').check();
  await expect(page.locator('#camimc-loc')).toContainText('Negative — RASS 0');
  await expect(page.locator('#camimc-total')).toHaveText('0');
});

test('CAM-IMC positive path sums to a positive screen', async ({ page }) => {
  await page.locator('input[name="sd-rass"][value="+1"]').check(); // LOC +1
  await page.locator('#camimc-acute input[value="yes"]').check(); // +1
  await page.locator('#camimc-inatt input[value="2"]').check(); // +2
  await page.locator('#camimc-diso .errchip').nth(0).click(); // +1
  await page.locator('#camimc-diso .errchip').nth(1).click(); // +1
  await page.locator('input[data-act="disoDone"]').check();
  await expect(page.locator('#camimc-total')).toHaveText('6');
  await expect(page.locator('#camimc-verdict')).toContainText('screen positive for delirium');
});

test('CAM-IMC negative path scores zero and is complete', async ({ page }) => {
  await page.locator('input[name="sd-rass"][value="0"]').check();
  await page.locator('#camimc-acute input[value="no"]').check();
  await page.locator('#camimc-inatt input[value="0"]').check();
  await page.locator('input[data-act="disoDone"]').check();
  await expect(page.locator('#camimc-total')).toHaveText('0');
  await expect(page.locator('#camimc-verdict')).toContainText('screen negative');
});

test('"unable" on inattention scores the max and disables the picker', async ({ page }) => {
  await page.locator('input[name="sd-rass"][value="0"]').check();
  await page.locator('#camimc-acute input[value="no"]').check();
  await page.locator('input[data-act="inattUnable"]').check();
  await expect(page.locator('#camimc-inatt input[type="radio"]').first()).toBeDisabled();
  await page.locator('input[data-act="disoDone"]').check();
  await expect(page.locator('#camimc-total')).toHaveText('3');
  await expect(page.locator('#camimc-verdict')).toContainText('screen positive for delirium');
});

test('disorientation chips toggle and count as errors', async ({ page }) => {
  await page.locator('input[name="sd-rass"][value="0"]').check();
  await page.locator('#camimc-diso .errchip').nth(0).click();
  await page.locator('#camimc-diso .errchip').nth(1).click();
  await expect(page.locator('#camimc-diso .errchip.is-err')).toHaveCount(2);
  await expect(page.locator('#camimc-total')).toHaveText('2');
  // Untap one.
  await page.locator('#camimc-diso .errchip.is-err').nth(0).click();
  await expect(page.locator('#camimc-total')).toHaveText('1');
});

test('the admission risk score bands map to Low / Intermediate / High', async ({ page }) => {
  await page.locator('.tab-btn[data-tab="risk"]').click();
  await expect(page.locator('#risk-verdict')).toContainText('0/3 — Low');
  // Four of six ADLs is below the threshold — no point yet.
  const adl = page.locator('#risk-items input[data-act="adlDep"]');
  for (let i = 0; i < 4; i++) await adl.nth(i).check();
  await expect(page.locator('#risk-verdict')).toContainText('0/3 — Low');
  // The fifth ADL crosses 5 of 6 → +1.
  await adl.nth(4).check();
  await expect(page.locator('#risk-verdict')).toContainText('1/3 — Intermediate');
  // Age and a psychotropic subtotal of ≥ 2 (antipsychotic = 2) take it to High.
  await page.locator('input[data-act="riskAge"]').check();
  await page.locator('#risk-items input[data-act="psychoDrug"][data-id="antipsychotic"]').check();
  await expect(page.locator('#risk-verdict')).toContainText('3/3 — High');
});

test('the prevention bundle tracks applied components', async ({ page }) => {
  await page.locator('.tab-btn[data-tab="prevent"]').click();
  await expect(page.locator('#prevention-prog')).toContainText('0/10 applied');
  await page.locator('#prevention-list input[data-act="prevention"]').nth(0).check();
  await page.locator('#prevention-list input[data-act="prevention"]').nth(1).check();
  await expect(page.locator('#prevention-prog')).toContainText('2/10 applied · 20%');
});

test('setup facility persists across reload and prints on the summary', async ({ page }) => {
  await page.locator('.tab-btn[data-tab="setup"]').click();
  await page.locator('#sd-facility').fill('7 West Step-Down');
  await page.waitForTimeout(700); // outlast the autosave debounce
  await page.reload();
  await page.locator('.tab-btn[data-tab="setup"]').click();
  await expect(page.locator('#sd-facility')).toHaveValue('7 West Step-Down');
  await page.locator('.tab-btn[data-tab="export"]').click();
  await expect(page.locator('#summary-body')).toContainText('7 West Step-Down');
});

test('example data loads a positive assessment and the summary reflects it', async ({ page }) => {
  await page.locator('[data-act="example"]').click();
  await expect(page.locator('#camimc-verdict')).toContainText('screen positive for delirium');
  await page.locator('.tab-btn[data-tab="export"]').click();
  await expect(page.locator('#summary-verdict')).toContainText('screen positive for delirium');
  await expect(page.locator('#summary-body')).toContainText('CAM-IMC');
});

test('summary reflects notes/assessor and only the summary prints', async ({ page }) => {
  await page.locator('input[name="sd-rass"][value="0"]').check();
  await page.locator('#camimc-acute input[value="no"]').check();
  await page.locator('#camimc-inatt input[value="0"]').check();
  await page.locator('input[data-act="disoDone"]').check();
  await page.locator('.tab-btn[data-tab="export"]').click();
  await expect(page.locator('#summary-verdict')).toContainText('screen negative');
  await expect(page.locator('#summary-body')).toContainText('CAM-IMC0/10 — negative');
  await page.locator('#sd-notes').fill('handoff note');
  await page.locator('#sd-assessor').fill('N. One, RN');
  await expect(page.locator('#summary-body')).toContainText('handoff note');
  await expect(page.locator('#summary-body')).toContainText('N. One, RN');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#summary-body')).toBeVisible();
  await expect(page.locator('.tabs')).toBeHidden();
  await expect(page.locator('#tab-screen')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
});

test('a reload starts a fresh assessment; reset clears on demand', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.locator('input[name="sd-rass"][value="-2"]').check();
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator('input[name="sd-rass"][value="-2"]')).not.toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('deliriumtool:stepdown'))).toBeNull();
  // Reset clears an in-progress assessment and returns to Screening.
  await page.locator('input[name="sd-rass"][value="-2"]').check();
  await page.locator('.tab-btn[data-tab="export"]').click();
  await page.locator('[data-act="reset"]').click();
  await expect(page.locator('input[name="sd-rass"][value="-2"]')).not.toBeChecked();
  await expect(page.locator('#tab-screen')).toHaveClass(/active/);
});

test('the summary saves as a PDF with the expected filename', async ({ page }) => {
  await page.locator('[data-act="example"]').click();
  await page.locator('.tab-btn[data-tab="export"]').click();
  const download = page.waitForEvent('download');
  await page.locator('[data-act="savepdf"]').click();
  expect((await download).suggestedFilename()).toMatch(
    /^stepdown-delirium-summary_\d{4}-\d{2}-\d{2}_\d{4}\.pdf$/,
  );
});

test('import rejects files from the other tools and roundtrips its own', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.locator('[data-act="example"]').click();
  await page.locator('.tab-btn[data-tab="export"]').click();
  const download = page.waitForEvent('download');
  await page.locator('[data-act="export"]').click();
  const path = await (await download).path();
  // The exported snapshot is this tool's own shape.
  const st = JSON.parse(readFileSync(path, 'utf8'));
  expect(st.tool).toBe('stepdown');
  await page.locator('[data-act="reset"]').click();
  await page.locator('.tab-btn[data-tab="export"]').click();
  await expect(page.locator('#summary-verdict')).not.toContainText('positive');
  // Re-import restores the positive verdict.
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-act="import"]').click();
  await (await chooser).setFiles(path);
  await expect(page.locator('#summary-verdict')).toContainText('screen positive for delirium');
  // A pediatric-style v:1 export must be refused.
  const chooser2 = page.waitForEvent('filechooser');
  await page.locator('[data-act="import"]').click();
  await (
    await chooser2
  ).setFiles({
    name: 'peds.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ v: 1, profile: { ageM: 30 }, capd: {} })),
  });
  await expect(page.locator('#sd-live')).toContainText('not a saved step-down assessment');
});

test('keyboard focus survives the re-render after every selection', async ({ page }) => {
  const rass = page.locator('input[name="sd-rass"][value="-1"]');
  await rass.focus();
  await rass.press(' ');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const a = document.activeElement;
        return a ? `${a.dataset?.act}:${a.value ?? ''}` : 'body';
      }),
    )
    .toBe('rass:-1');
});

test('every source citation resolves to a link', async ({ page }) => {
  const items = page.locator('#src-list li');
  await expect(items).toHaveCount(19); // one <li> per refs.js registry entry
  // Each entry ends in a resolvable external link.
  await expect(page.locator('#src-list li a').first()).toHaveAttribute('href', /^https?:\/\//);
  await expect(page.locator('#camimc-cites a')).toContainText('Beyer 2024');
});

test('the step-down tool has no serious accessibility violations', async ({ page }) => {
  await page.locator('input[name="sd-rass"][value="-1"]').check();
  await page.locator('#camimc-acute input[value="yes"]').check();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious.map((v) => v.id).join(', ')).toBe('');
});
