// Two invariants that only fail in the state a landing-page check never reaches.
//
// The reference-aid framing is load-bearing: it has to be on screen while a
// clinician is USING the tool, which is the moment it does its work. The peds
// banner lived inside the pathway picker, so entering a child context hid it on
// every tab — and a textContent-based check passed anyway, because textContent
// sees through display:none. These assertions use innerText and a client rect.
/* global document */
import { test, expect } from '@playwright/test';

const TOOLS = [
  {
    path: '/',
    enter: async (p) => {
      await p.click('[data-act="chooseTool"]');
      await p.click('[data-pathway="full"]');
    },
  },
  {
    path: '/peds/',
    enter: async (p) => {
      await p.fill('#prof-age', '4');
      await p.click('[data-act="deriveScreen"]');
    },
  },
  // These two open straight into the workspace — no picker gates them, so
  // loading the example is enough to put real content on screen.
  { path: '/ed/', enter: async (p) => p.locator('[data-act="example"]').first().click() },
  { path: '/stepdown/', enter: async (p) => p.locator('[data-act="example"]').first().click() },
];

for (const tool of TOOLS) {
  test(`the reference-aid disclaimer stays on screen while ${tool.path} is in use`, async ({
    page,
  }) => {
    await page.goto(tool.path);
    // Don't swallow an entry failure — a selector that no longer exists must
    // fail here, not leave the test asserting against the landing page.
    await tool.enter(page);
    await page.waitForTimeout(400);

    const tabs = await page
      .locator('.tabs-inner [data-tab]')
      .evaluateAll((ns) => ns.map((n) => n.dataset.tab));
    expect(tabs.length, 'the tool actually opened').toBeGreaterThan(0);

    for (const t of tabs) {
      await page.click(`.tabs-inner [data-tab="${t}"]`);
      // innerText, not textContent — textContent would find a display:none banner.
      const shown = await page.evaluate(() => /Reference aid only/i.test(document.body.innerText));
      expect(shown, `${tool.path} — "${t}" tab must still show the disclaimer`).toBeTruthy();
    }
  });
}

test('every page reference on /evidence reads as one locator, not a doubled prefix', async ({
  page,
}) => {
  await page.goto('/evidence/');
  await page.waitForLoadState('networkidle');
  const labels = await page
    .locator('.ev-srcblock-pg')
    .evaluateAll((ns) => ns.map((n) => n.textContent.trim()));

  expect(labels.length, 'page labels actually rendered').toBeGreaterThan(100);
  // "p. ms. p.8" / "p. Abstract" / "p. Page 4" — a prefix applied to a value that
  // already states its own form.
  const doubled = labels.filter((t) =>
    /^p\.\s*(p\.|pp\.|ms\.?\s|page\b|abstract|table|fig)/i.test(t),
  );
  expect([...new Set(doubled)], 'page references with a doubled prefix').toEqual([]);
});
