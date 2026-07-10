// The chosen pathway highlights the tabs that build that document and recedes the
// ones it doesn't use, so the user knows what to fill out.
import { test, expect } from '@playwright/test';

const tab = (page, t) => page.locator(`.tabs-inner [data-tab="${t}"]`);

test('SPA pathway highlights only the tabs that build the SPA reference', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="spa"]');
  for (const t of ['cam', 'treatment', 'meds']) {
    await expect(tab(page, t)).toHaveClass(/tab-primary/);
  }
  for (const t of ['risk', 'bundle', 'mnemonic']) {
    await expect(tab(page, t)).toHaveClass(/tab-aside/);
  }
});

test('Record pathway recedes the medications tab but keeps the rest highlighted', async ({
  page,
}) => {
  await page.goto('/');
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="record"]');
  await expect(tab(page, 'meds')).toHaveClass(/tab-aside/);
  for (const t of ['risk', 'cam', 'bundle', 'mnemonic', 'treatment']) {
    await expect(tab(page, t)).toHaveClass(/tab-primary/);
  }
});
