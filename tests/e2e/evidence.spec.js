import { test, expect } from '@playwright/test';

// The /evidence page ("Sources & Evidence") renders the claim-source map and the
// folded-in clinical methodology entirely client-side, under the strict CSP
// (script-src 'self'). These checks cover discovery (the sitewide footer link),
// the statement explorer (search + status filters + deep-link), and the
// methodology section — with no console error or CSP violation.

test('every tool page footer links to the evidence page', async ({ page }) => {
  for (const path of ['/', '/stepdown/', '/peds/', '/ed/', '/templates/']) {
    await page.goto(path);
    const link = page.locator('.site-footer a[href="/evidence/"]');
    await expect(link, `footer link on ${path}`).toHaveCount(1);
    await expect(link).toHaveText(/Sources & Evidence/);
  }
});

test('the footer link navigates to the evidence page', async ({ page }) => {
  await page.goto('/');
  await page.locator('.site-footer a[href="/evidence/"]').click();
  await expect(page).toHaveURL(/\/evidence\/$/);
  await expect(page.locator('h1, .app-title, .page-title').first()).toBeVisible();
});

test('the explorer lists every statement and renders without CSP violations', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(() => {
    window.__csp = [];
    window.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`),
    );
  });
  await page.goto('/evidence/');
  const cards = page.locator('.ev-card');
  const total = await cards.count();
  expect(total).toBeGreaterThan(200);
  await expect(page.locator('#ev-count')).toHaveText(new RegExp(`of ${total} statements`));
  expect(await page.evaluate(() => window.__csp)).toEqual([]);
  expect(errors).toEqual([]);
});

test('search narrows the visible statements', async ({ page }) => {
  await page.goto('/evidence/');
  const count = page.locator('#ev-count');
  const before = Number((await count.textContent()).match(/^(\d+)/)[1]);
  await page.locator('#ev-search').fill('CAM-ICU');
  const after = Number((await count.textContent()).match(/^(\d+)/)[1]);
  expect(after).toBeGreaterThan(0);
  expect(after).toBeLessThan(before);
});

test('a status chip filters to that evidence status', async ({ page }) => {
  await page.goto('/evidence/');
  const chip = page.locator('.ev-chip[data-status="notstated"]');
  await expect(chip).toHaveCount(1);
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  const visible = page.locator('.ev-card:not([hidden])');
  const n = await visible.count();
  expect(n).toBeGreaterThan(0);
  for (const c of await visible.all()) {
    await expect(c).toHaveAttribute('data-status', 'notstated');
  }
});

test('a deep link opens the named claim', async ({ page }) => {
  await page.goto('/evidence/#picu-wf-r5');
  const card = page.locator('#picu-wf-r5');
  await expect(card).toHaveAttribute('open', '');
  // its verbatim on-scope passages are shown
  await expect(card.locator('.ev-srcblock-q').first()).toBeVisible();
});

test('the methodology section is folded in with its citation-registry tables', async ({ page }) => {
  await page.goto('/evidence/');
  const method = page.locator('#ev-methodology');
  await expect(method).toHaveCount(1);
  await expect(page.locator('.ev-rail-link[href="#ev-methodology"]')).toHaveCount(1);
  // instrument logic + a citation registry with clickable DOIs
  await expect(method.getByRole('heading', { name: /Instruments implemented/ })).toBeVisible();
  await expect(method.locator('.ev-md-table').first()).toBeVisible();
  await expect(method.locator('.ev-md-table a').first()).toBeVisible();
});
