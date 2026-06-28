// Visual-regression snapshots of the key screens (desktop + mobile per the
// Playwright projects). These are tagged @visual and run on demand — baselines
// are platform-specific, so they are generated locally with
// `npm run test:visual:update` and are not part of the deterministic CI gate.
import { test, expect } from '@playwright/test';

test('pathway picker @visual', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('picker.png', { fullPage: true });
});

test('risk tab @visual', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-pathway="full"]');
  await expect(page).toHaveScreenshot('risk.png', { fullPage: true });
});

test('CAM tab with example data @visual', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-pathway="full"]');
  await page.click('[data-act="autofill"]');
  await page.click('[data-tab="cam"]');
  await expect(page).toHaveScreenshot('cam.png', { fullPage: true });
});
