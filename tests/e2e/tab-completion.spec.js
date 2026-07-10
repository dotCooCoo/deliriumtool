// Once the user records a tab's input, that tab's pathway highlight fades (and shows
// a check), shifting attention to the tabs still needing input. Runs on every project
// (desktop + mobile) so the behaviour is verified across layouts.
import { test, expect } from '@playwright/test';

const tab = (page, t) => page.locator(`.tabs-inner [data-tab="${t}"]`);
const CLINICAL = ['risk', 'cam', 'bundle', 'mnemonic', 'treatment', 'meds'];

test('a fresh pathway marks no tabs as filled', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="full"]');
  for (const t of CLINICAL) await expect(tab(page, t)).not.toHaveClass(/tab-done/);
});

test('a fully filled assessment fades every clinical tab', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="full"]');
  await page.click('[data-act="autofill"]');
  for (const t of CLINICAL) await expect(tab(page, t)).toHaveClass(/tab-done/);
});

test('a tab fades only once its own input is recorded', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="spa"]');
  await page.click('.tabs-inner [data-tab="cam"]');
  await page.selectOption('#rass', '-4'); // determinate CAM result (unable to assess)
  await expect(tab(page, 'cam')).toHaveClass(/tab-done/);
  await expect(tab(page, 'treatment')).not.toHaveClass(/tab-done/);
  await expect(tab(page, 'meds')).not.toHaveClass(/tab-done/);
});

test('reset clears the filled state', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/');
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="full"]');
  await page.click('[data-act="autofill"]');
  await expect(tab(page, 'cam')).toHaveClass(/tab-done/);
  await page.click('[data-act="reset"]');
  await expect(tab(page, 'cam')).not.toHaveClass(/tab-done/);
});
