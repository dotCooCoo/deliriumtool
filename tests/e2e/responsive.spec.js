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

// The loop above walks the adult tool only, which is how a sideways-scrolling
// /evidence/ shipped: its mobile grid track was a bare `1fr`, so a wide
// reference table set the whole page's minimum width. Every surface now carries
// the same guarantee, at the narrowest width the layout claims to support.
const SURFACES = ['/', '/peds/', '/ed/', '/stepdown/', '/templates/', '/evidence/'];
for (const width of [320, 360, 768]) {
  for (const path of SURFACES) {
    test(`no horizontal overflow on ${path} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      expect(await noOverflow(page), `${path} @ ${width}`).toBeTruthy();
    });
  }
}

test('every printable template reflows without scrolling the page sideways', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/templates/');
  for (const tpl of [
    'rounding',
    'spa',
    'peds-cards',
    'peds-workflow',
    'ed-cards',
    'ed-workflow',
    'stepdown-cards',
    'stepdown-workflow',
  ]) {
    await page.check(`input[name="template"][value="${tpl}"]`);
    expect(await noOverflow(page), `${tpl} @ 360`).toBeTruthy();
  }
});

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
