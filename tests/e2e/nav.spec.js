import { test, expect } from '@playwright/test';

// The shared header nav is generated at build time (scripts/build.mjs) so all
// four pages carry the same links in the same order, with aria-current marking
// the page being viewed.

const PAGES = [
  { path: '/', current: 'Adult ICU' },
  { path: '/peds/', current: 'Pediatric' },
  { path: '/ed/', current: 'ED' },
  { path: '/templates/', current: 'Templates' },
];
const LABELS = ['Adult ICU', 'Pediatric', 'ED', 'Templates'];

for (const { path, current } of PAGES) {
  test(`${path} carries the tool nav with the current page marked`, async ({ page }) => {
    await page.goto(path);
    const nav = page.locator('.tool-nav');
    await expect(nav).toBeVisible();
    await expect(nav.locator('a')).toHaveText(LABELS);
    await expect(nav.locator('a[aria-current="page"]')).toHaveText(current);
  });
}

test('the nav navigates between tools', async ({ page }) => {
  const navLink = (name) => page.locator('.tool-nav').getByRole('link', { name, exact: true });
  await page.goto('/');
  await navLink('Pediatric').click();
  await expect(page).toHaveURL(/\/peds\/$/);
  await navLink('ED').click();
  await expect(page).toHaveURL(/\/ed\/$/);
  await navLink('Templates').click();
  await expect(page).toHaveURL(/\/templates\/$/);
  await navLink('Adult ICU').click();
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
});

test('the switchboard cards route to each tool page', async ({ page }) => {
  await page.goto('/');
  await page.click('.tool-card[href="./ed/"]');
  await expect(page).toHaveURL(/\/ed\/$/);
  await expect(page.locator('h1')).toContainText('ED Delirium Screening');
});
