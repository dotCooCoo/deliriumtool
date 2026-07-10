// Accessibility checks with axe-core. The gate is "no serious or critical
// violations" on the picker and on every tab of the workspace, plus keyboard
// navigation of the tab bar.
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TABS = ['risk', 'cam', 'bundle', 'mnemonic', 'treatment', 'meds', 'settings', 'export'];

const seriousViolations = (results) =>
  results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('tool picker has no serious accessibility violations', async ({ page }) => {
  const results = await new AxeBuilder({ page }).analyze();
  const serious = seriousViolations(results);
  expect(serious.map((v) => v.id).join(', ')).toBe('');
});

test('pathway picker has no serious accessibility violations', async ({ page }) => {
  await page.click('[data-act="chooseTool"]');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = seriousViolations(results);
  expect(serious.map((v) => v.id).join(', ')).toBe('');
});

test('every workspace tab has no serious accessibility violations', async ({ page }) => {
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="full"]');
  for (const tab of TABS) {
    await page.click(`[data-tab="${tab}"]`);
    const results = await new AxeBuilder({ page }).include('#main').analyze();
    const serious = seriousViolations(results);
    expect(serious.map((v) => v.id).join(', '), `tab "${tab}"`).toBe('');
  }
});

test('tab bar is keyboard navigable with arrow keys', async ({ page }) => {
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="full"]');
  await page.locator('.tab-btn[data-tab="risk"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.tab-btn[data-tab="cam"]')).toBeFocused();
  await expect(page.locator('#tab-cam')).toBeVisible();
});
