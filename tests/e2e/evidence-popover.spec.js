// Evidence popovers on the template previews.
//
// A preview statement is bound to its /evidence claim by exact text match
// (src/js/shared/evidence-popover.js), so a reworded statement does not show
// stale sources — the binding just stops happening, silently. These tests make
// that silence visible: every template must bind a meaningful number of its
// statements, and an opened popover must show the passage the snapshot holds.
import { test, expect } from '@playwright/test';

// Minimum bindings per template, set a little below the counts observed when
// the snapshot and the content modules agree (rounding 56, spa 20, peds-cards
// 11, peds-workflow 10, ed-cards 9, ed-workflow 12, stepdown-cards 11,
// stepdown-workflow 6). Ordinary editing does not trip these; wholesale drift —
// a renamed field, a regenerated snapshot, a reworded statement set — does.
const MIN_BOUND = {
  rounding: 45,
  spa: 16,
  'peds-cards': 9,
  'peds-workflow': 8,
  'ed-cards': 7,
  'ed-workflow': 9,
  'stepdown-cards': 9,
  'stepdown-workflow': 5,
};

test.beforeEach(async ({ page }) => {
  await page.goto('/templates/');
  await expect(page.locator('.sheet').first()).toBeVisible();
});

for (const [template, min] of Object.entries(MIN_BOUND)) {
  test(`${template}: preview statements bind to their evidence claims`, async ({ page }) => {
    await page.check(`input[name="template"][value="${template}"]`);
    await expect(page.locator('.sheet').first()).toBeVisible();
    const bound = page.locator('#sheets .ev-cited');
    await expect
      .poll(() => bound.count(), {
        message: `${template} bound too few statements — the evidence snapshot and the printed wording have drifted apart`,
        timeout: 10000,
      })
      .toBeGreaterThanOrEqual(min);
    // every bound statement carries its claim id and a keyboard-operable trigger
    const first = bound.first();
    await expect(first).toHaveAttribute('data-evidence', /\w/);
    await expect(first.locator('button.ev-i')).toHaveCount(1);
  });
}

test('opening a popover shows the cited source and its passage', async ({ page }) => {
  await page.locator('#sheets .ev-cited button.ev-i').first().click();
  const pop = page.locator('.ev-pop');
  await expect(pop).toBeVisible();
  // the popover is built from the snapshot, so it must name a source and show text
  await expect(pop).not.toBeEmpty();
  const text = (await pop.innerText()).trim();
  expect(text.length).toBeGreaterThan(40);
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
});
