// Responsive guarantees: no horizontal overflow at phone/tablet widths, and the
// medication reference table reflows to stacked, labelled cards on a phone.
/* global document, window, getComputedStyle */
import { test, expect } from '@playwright/test';

const TABS = ['risk', 'cam', 'bundle', 'mnemonic', 'treatment', 'meds', 'settings', 'export'];
const noOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

for (const width of [360, 768]) {
  test(`no horizontal overflow across tabs at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await noOverflow(page), `tool picker @ ${width}`).toBeTruthy();
    await page.click('[data-act="chooseTool"]');
    expect(await noOverflow(page), `pathway picker @ ${width}`).toBeTruthy();
    await page.click('[data-pathway="full"]');
    for (const t of TABS) {
      await page.click(`.tabs-inner [data-tab="${t}"]`);
      expect(await noOverflow(page), `${t} @ ${width}`).toBeTruthy();
    }
  });
}

test('medication table reflows to stacked labelled cards on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/');
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="full"]');
  await page.click('.tabs-inner [data-tab="meds"]');
  const head = page.locator('#tab-meds .mt thead').first();
  // The header collapses (clipped) so each row can stack as a label/value card.
  expect(await head.evaluate((el) => el.getBoundingClientRect().height)).toBeLessThan(3);
  // Each value cell surfaces its column name via the data-label ::before.
  const label = await page
    .locator('#tab-meds .mt td[data-label="Notes"]')
    .first()
    .evaluate((el) => getComputedStyle(el, '::before').content);
  expect(label).toContain('Notes');
});
