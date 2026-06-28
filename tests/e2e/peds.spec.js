// Pediatric tool (/peds/) foundation: the page routes, carries the baby-friendly
// theme + the logo, navigates the screen picker and tabs, and exposes valid SEO.
/* global document, getComputedStyle */
import { test, expect } from '@playwright/test';

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

test('peds screen picker reveals the workspace and tabs switch', async ({ page }) => {
  await page.goto('/peds/');
  await expect(page.locator('#workspace')).toBeHidden();
  await page.click('[data-pathway="capd"]');
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#pathway-name')).toHaveText(/CAPD/);
  await page.click('.tab-btn[data-tab="risk"]');
  await expect(page.locator('#tab-risk')).toBeVisible();
  await expect(page.locator('#tab-screen')).toBeHidden();
  await page.click('[data-act="reset"]');
  await expect(page.locator('#pathway-picker')).toBeVisible();
});

test('peds page exposes valid JSON-LD for the peds URL', async ({ page }) => {
  await page.goto('/peds/');
  const ld = page.locator('script[type="application/ld+json"]');
  await expect(ld).toHaveCount(1);
  const data = JSON.parse(await ld.textContent());
  expect(data['@type']).toBe('WebApplication');
  expect(data.url).toBe('https://deliriumtool.com/peds/');
});
