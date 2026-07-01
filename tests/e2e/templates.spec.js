// Template designer (/templates/): SEO/PWA separation, theme/logo, the two
// sheet previews, customization flow (sections, items, meds, facility), the
// share link, persistence, print media, and accessibility.
/* global document, getComputedStyle */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.goto('/templates/');
});

test('templates page carries its own SEO and renders with no console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto('/templates/');
  await expect(page).toHaveTitle(/Bedside Template Designer/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://deliriumtool.com/templates/',
  );
  await expect(page.locator('h1')).toHaveCount(1);
  const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(data['@type']).toBe('WebApplication');
  expect(data.url).toBe('https://deliriumtool.com/templates/');
  await expect(page.locator('.sheet').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('templates page uses the dark logo and its own navy theme', async ({ page }) => {
  await expect(page.locator('img.app-logo')).toHaveAttribute('src', /logo-dark\.png$/);
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim(),
  );
  expect(primary).toBe('#274b8f');
});

test('templates has its own PWA manifest scoped to /templates/', async ({ page }) => {
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'site.webmanifest');
  const m = await (await page.request.get('/templates/site.webmanifest')).json();
  expect(m.start_url).toBe('/templates/');
  expect(m.scope).toBe('/templates/');
  expect(m.name).toMatch(/template/i);
  for (const icon of m.icons) {
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  }
});

test('rounding tool renders two landscape pages with the printed disclaimer', async ({ page }) => {
  await expect(page.locator('.sheet--landscape')).toHaveCount(2);
  await expect(page.locator('.sheet').first()).toContainText('ICU DELIRIUM ROUNDING TOOL');
  await expect(page.locator('.sh-foot').first()).toContainText(
    'Reference aid only — follow local policy & prescriber/pharmacy review',
  );
  await expect(page.locator('.sh-foot').first()).toContainText('Your facility');
});

test('switching template renders the portrait SPA sheets', async ({ page }) => {
  await page.check('input[name="template"][value="spa"]');
  await expect(page.locator('.sheet--portrait')).toHaveCount(2);
  await expect(page.locator('.sheet').first()).toContainText('SPA Quick Reference');
  await expect(page.locator('.sheet').nth(1)).toContainText('Escalation — when to act & how');
});

// The per-item checkboxes live inside <details> disclosure groups — open them all.
const openDetails = (page) =>
  page.evaluate(() => {
    document.querySelectorAll('.ctrl details').forEach((d) => {
      d.open = true;
    });
  });

test('item, section, and medication toggles update the preview', async ({ page }) => {
  const sheets = page.locator('#sheets');
  await openDetails(page);
  await expect(sheets).toContainText('Clock and calendar visible');
  await page.uncheck('#it-np-clock');
  await expect(sheets).not.toContainText('Clock and calendar visible');

  await expect(sheets).toContainText('Nurse care pathway');
  await page.uncheck('#sw-sec-pathway');
  await expect(sheets).not.toContainText('Nurse care pathway');

  await expect(sheets).toContainText('Lorazepam');
  await page.uncheck('#med-benzo-lorazepam');
  await expect(sheets).not.toContainText('Lorazepam');
});

test('facility name and sedation target flow onto the sheet', async ({ page }) => {
  await page.fill('#f-facility', 'General Hospital — MICU');
  await expect(page.locator('.sh-foot').first()).toContainText('General Hospital — MICU');
  await page.selectOption('#f-rass-target', '0to-1');
  await expect(page.locator('.sh-goal').first()).toContainText('Target RASS: 0 to −1');
});

test('custom protocol lines print with a check-off box', async ({ page }) => {
  await openDetails(page);
  // First group with an add-a-line control is the non-pharm bundle.
  const addable = page.locator('.custom-add').first();
  await addable.locator('input').fill('Quiet hours 22:00–06:00');
  await addable.locator('[data-act="addLine"]').click();
  await expect(page.locator('#sheets')).toContainText('Quiet hours 22:00–06:00');
});

test('customization persists across a reload and resets on demand', async ({ page }) => {
  await page.fill('#f-facility', 'Persist General');
  // The autosave debounce is 400 ms — wait for the write before reloading.
  await expect
    .poll(async () => page.evaluate(() => localStorage.getItem('deliriumtool:templates') || ''))
    .toContain('Persist General');
  await page.reload();
  await expect(page.locator('#f-facility')).toHaveValue('Persist General');
  page.on('dialog', (d) => d.accept());
  await page.click('[data-act="reset"]');
  await expect(page.locator('#f-facility')).toHaveValue('');
});

test('share link carries the configuration into a fresh session', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.fill('#f-facility', 'Shared Hospital');
  await page.check('input[name="template"][value="spa"]');
  await page.click('[data-act="share"]');
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain('#tpl=');
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await expect(page.locator('#f-facility')).toHaveValue('Shared Hospital');
  await expect(page.locator('.sheet--portrait')).toHaveCount(2);
});

test('print media shows only the sheets', async ({ page }) => {
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.ctrl')).toBeHidden();
  await expect(page.locator('.app-header')).toBeHidden();
  await expect(page.locator('.sheet').first()).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
});

test('designer has no serious accessibility violations (both templates)', async ({ page }) => {
  const seriousViolations = (results) =>
    results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  let results = await new AxeBuilder({ page }).analyze();
  expect(
    seriousViolations(results)
      .map((v) => v.id)
      .join(', '),
  ).toBe('');
  await page.check('input[name="template"][value="spa"]');
  results = await new AxeBuilder({ page }).analyze();
  expect(
    seriousViolations(results)
      .map((v) => v.id)
      .join(', '),
  ).toBe('');
});
