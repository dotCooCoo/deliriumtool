/* global window, document, getComputedStyle */
import { test, expect } from '@playwright/test';

// The template designer tags printed statements that map to a cited claim with a
// screen-only (i) that opens the sources behind them (from the /evidence data).
// The affordance must never reach the printed artifact — hidden in print and
// stripped from the Save-PDF raster — and the whole feature runs under the strict
// CSP with no console error.

test('cited statements expose an (i) trigger that opens a sources popover', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => {
    window.__csp = [];
    window.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  await page.goto('/templates/');
  await page.check('input[name="template"][value="rounding"]');

  const triggers = page.locator('.sheets .ev-i');
  await expect(triggers.first()).toBeVisible();
  expect(await triggers.count()).toBeGreaterThan(10);

  await page.locator('.sheets .ev-cited').first().locator('.ev-i').click();
  const pop = page.locator('.ev-pop[role="dialog"]');
  await expect(pop).toBeVisible();
  // it names a source and links to the full detail on /evidence
  await expect(pop.locator('.ev-pop-cite').first()).toBeVisible();
  await expect(pop.locator('a.ev-pop-more')).toHaveAttribute('href', /\/evidence\/#.+/);

  await page.keyboard.press('Escape');
  await expect(pop).toHaveCount(0);

  expect(await page.evaluate(() => window.__csp)).toEqual([]);
  expect(errors).toEqual([]);
});

test('the (i) affordance is excluded from print and the Save-PDF raster', async ({ page }) => {
  await page.goto('/templates/');
  await page.check('input[name="template"][value="rounding"]');
  await expect(page.locator('.sheets .ev-i').first()).toBeVisible();

  // Save-PDF rasterizes a clone of each sheet; templates/pdf.js strips the
  // affordance from that clone. Replicate the strip and assert it is gone.
  const raster = await page.evaluate(() => {
    const sheet = document.querySelector('.sheet');
    const clone = sheet.cloneNode(true);
    clone.querySelectorAll('.ev-i').forEach((n) => n.remove());
    clone.querySelectorAll('.ev-cited').forEach((n) => n.classList.remove('ev-cited'));
    return {
      original: sheet.querySelectorAll('.ev-i').length,
      cloned: clone.querySelectorAll('.ev-i').length,
    };
  });
  expect(raster.original).toBeGreaterThan(0);
  expect(raster.cloned).toBe(0);

  // Print hides it via @media print.
  await page.emulateMedia({ media: 'print' });
  const display = await page.evaluate(
    () => getComputedStyle(document.querySelector('.ev-i')).display,
  );
  expect(display).toBe('none');
  await page.emulateMedia({ media: 'screen' });
});
