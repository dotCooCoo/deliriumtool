// Functional end-to-end flows: the tool switchboard, pathway picker, live
// scoring, CAM-ICU logic, reset, sharing, and PDF generation. Each test starts
// from a cleared localStorage so it sees the first-run experience.
import { test, expect } from '@playwright/test';

/* global document, getComputedStyle -- available inside page.evaluate() (browser context) */

// Each test runs in an isolated browser context (empty localStorage by default).
// The landing asks for a care setting first; these flows exercise the adult
// tool, so the hook steps through its card to the document picker.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.click('[data-act="chooseTool"]');
});

test('starts on the tool picker, not the workspace', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#tool-picker')).toBeVisible();
  await expect(page.locator('#pathway-picker')).toBeHidden();
  await expect(page.locator('#workspace')).toBeHidden();
});

test('the switchboard routes to the pediatric, ED, and templates tools', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.tool-card[href="./peds/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="./ed/"]')).toBeVisible();
  await expect(page.locator('.tool-card[href="./templates/"]')).toBeVisible();
});

test('choosing Adult ICU reveals the document picker; All tools returns', async ({ page }) => {
  await expect(page.locator('#pathway-picker')).toBeVisible();
  await expect(page.locator('#tool-picker')).toBeHidden();
  await expect(page.locator('#skip-link')).toHaveAttribute('href', '#pathway-picker');
  await page.click('[data-act="allTools"]');
  await expect(page.locator('#tool-picker')).toBeVisible();
  await expect(page.locator('#pathway-picker')).toBeHidden();
  await expect(page.locator('#skip-link')).toHaveAttribute('href', '#tool-picker');
});

test('choosing a pathway reveals the workspace', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#pathway-select')).toHaveValue('full');
  await expect(page.locator('#pathway-picker')).toBeHidden();
});

test('switching the pathway re-tailors the workspace without resetting', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.locator('#tab-risk .rcb').nth(0).check();
  await expect(page.locator('.tab-btn.tab-aside')).toHaveCount(0); // full uses every tab
  await page.selectOption('#pathway-select', 'spa');
  // SPA ignores Risk/Bundle/DELIRIUM(S) — those tabs are de-emphasized, not hidden
  await expect(page.locator('.tab-btn[data-tab="risk"]')).toHaveClass(/tab-aside/);
  await expect(page.locator('.tab-btn[data-tab="risk"]')).toBeVisible();
  // …and the tabs that build SPA are highlighted
  await expect(page.locator('.tab-btn[data-tab="cam"]')).toHaveClass(/tab-primary/);
  await expect(page.locator('#rscore')).toHaveText('1'); // work preserved, not reset
});

test('Log assessment stamps now and keeps a manually edited assessment time', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="cam"]');
  // A year that can never be "now" — keeps the assertion time-of-day independent.
  await page.fill('#cam-time', '2020-06-01T03:15');
  await page.click('[data-act="saveCam"]');
  await expect(page.locator('#cam-time')).toHaveValue('2020-06-01T03:15'); // edit preserved
  await expect(page.locator('#cam-log')).not.toContainText('2020'); // log used "now", not the field's year
});

test('changing the RASS target updates the on-screen echoes', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="settings"]');
  await page.selectOption('#set-rass', { index: 1 });
  const expected = (await page.locator('#set-rass').inputValue())
    .replace(/\s*\(.*\)\s*$/, '')
    .trim();
  await page.click('[data-tab="bundle"]');
  await expect(page.locator('.rass-echo').first()).toHaveText(expected);
  await page.click('[data-tab="cam"]');
  await expect(page.locator('#rass-band-cur')).toHaveText(`TARGET ${expected}`);
});

test('the medication selection returns to the authored defaults on reload', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="meds"]');
  const defaults = await page.locator('#med-active-count').textContent();
  await page.click('[data-act="setAllMeds"][data-on="false"]'); // turn every med off
  await expect(page.locator('#med-active-count')).not.toHaveText(defaults);
  await page.reload(); // a reload starts fresh — the curated set is gone
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="meds"]');
  await expect(page.locator('#med-active-count')).toHaveText(defaults);
});

test('clearing the inattention error count un-sets Feature 2', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="cam"]');
  await page.fill('#cam2-err', '5');
  await expect(page.locator('#c2y')).toHaveClass(/btn-primary/); // >2 errors → Feature 2 present
  await page.fill('#cam2-err', '');
  await expect(page.locator('#c2y')).not.toHaveClass(/btn-primary/); // cleared, not stuck
});

test('Clear all risk factors asks before wiping', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.locator('#tab-risk .rcb').first().check();
  await expect(page.locator('#rscore')).toHaveText('1');
  page.once('dialog', (d) => d.dismiss()); // cancel the confirm
  await page.click('[data-act="clearRisk"]');
  await expect(page.locator('#rscore')).toHaveText('1'); // not cleared
});

test('risk tally adds points and bands correctly', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  const boxes = page.locator('#tab-risk .rcb');
  await boxes.nth(0).check(); // every factor is +1 (flat checklist)
  await expect(page.locator('#rscore')).toHaveText('1');
  await expect(page.locator('#rtier')).toHaveText('Few risk factors');
  await boxes.nth(1).check();
  await boxes.nth(2).check();
  await boxes.nth(3).check(); // 4 -> Several
  await expect(page.locator('#rscore')).toHaveText('4');
  await expect(page.locator('#rtier')).toHaveText('Several risk factors');
});

test('CAM-ICU evaluates positive with 1 AND 2 AND (3 OR 4)', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="cam"]');
  await page.selectOption('#rass', '-1'); // step 1: document level of consciousness
  await page.click('#c1y'); // Feature 1 present
  await page.fill('#cam2-err', '3'); // inattention > 2 -> Feature 2 present
  await expect(page.locator('#cam-res-txt')).toContainText('Positive');
  await expect(page.locator('#badge-cam')).toHaveClass(/tone-danger/); // red, positive
  await expect(page.locator('#badge-cam svg use')).toHaveCount(1); // vector icon, not text
});

test('RASS -4/-5 gates CAM to "Unable to Assess"', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="cam"]');
  await page.click('#c1y');
  await page.fill('#cam2-err', '3');
  await page.selectOption('#rass', '-5');
  await expect(page.locator('#cam-res-txt')).toContainText('Unable to Assess');
});

test('a reload starts a fresh assessment at the tool picker', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.locator('#tab-risk .rcb').nth(0).check();
  await page.click('[data-tab="export"]');
  await page.fill('#facility-input', 'Ward 9');
  await page.waitForTimeout(600); // past the old autosave debounce interval
  await page.reload();
  await expect(page.locator('#tool-picker')).toBeVisible(); // fresh, not resumed
  await expect(page.locator('#workspace')).toBeHidden();
  await expect(page.locator('#facility-input')).toHaveValue('');
  // Nothing lingers for the next user of a shared workstation.
  expect(await page.evaluate(() => localStorage.getItem('deliriumtool:assessment'))).toBeNull();
});

test('reset clears the assessment and returns to the picker', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.locator('#tab-risk .rcb').nth(0).check();
  page.once('dialog', (d) => d.accept());
  await page.click('[data-act="reset"]');
  await expect(page.locator('#pathway-picker')).toBeVisible();
  await expect(page.locator('#workspace')).toBeHidden();
});

test('generates a PDF download for every document', async ({ page }) => {
  await page.click('[data-pathway="record"]');
  await page.click('[data-tab="export"]');
  await page.fill('#facility-input', 'Test Hospital'); // avoids the missing-facility confirm
  // Exercise all three builders so a render error in any document is caught.
  for (const doc of ['full', 'spa', 'record']) {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click(`[data-act="openDoc"][data-doc="${doc}"]`),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  }
});

test('a deeper RASS target reveals the indication gate', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="settings"]');
  await expect(page.locator('#set-rass-indication')).toBeHidden(); // light default: no gate
  await page.selectOption('#set-rass', { index: 2 }); // deep band (≤ −3)
  await expect(page.locator('#set-rass-indication')).toBeVisible();
  await expect(page.locator('#rass-deep-note')).toBeVisible();
  await page.selectOption('#set-rass', { index: 0 }); // back to light default
  await expect(page.locator('#set-rass-indication')).toBeHidden();
});

test('the pathway picker shows the adult/ICU scope panel with redirects', async ({ page }) => {
  await expect(page.locator('.scope-note')).toBeVisible(); // before any pathway is chosen
  await expect(page.locator('.scope-note')).toContainText('adult ICU');
  await expect(page.locator('.scope-redirects')).toContainText('bCAM');
  await expect(page.locator('.scope-redirects')).toContainText('pCAM-ICU');
});

test.describe('light-only theme', () => {
  test.use({ colorScheme: 'dark' }); // simulate an OS dark preference

  test('stays light even when the OS prefers dark mode', async ({ page }) => {
    // The tool is intentionally light-only: a dark OS used to flip the palette
    // and made native <select> option headers unreadable.
    const v = await page.evaluate(() => ({
      scheme: getComputedStyle(document.documentElement).colorScheme,
      bg: getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim(),
    }));
    expect(v.scheme).toBe('light');
    expect(v.bg).toBe('#f6f8fb'); // light token, not the former dark #0e1320
  });
});

test('serves the strict security headers from the _headers policy', async ({ page }) => {
  const res = await page.goto('/');
  const h = res.headers();
  expect(h['content-security-policy']).toContain("script-src 'self'");
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['x-content-type-options']).toBe('nosniff');
});

test('risk tally reaches 15/15 and fills the progress bar', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  const boxes = page.locator('#tab-risk .rcb');
  const n = await boxes.count();
  // 15 factors: mechanical ventilation was removed (PADIS 2018 — strong
  // evidence it does not alter delirium risk).
  expect(n).toBe(15);
  for (let i = 0; i < n; i++) await boxes.nth(i).check();
  await expect(page.locator('#rscore')).toHaveText('15');
  const width = await page.locator('#rprog').evaluate((el) => el.style.width);
  expect(width).toBe('100%');
});

test('auto-fill example populates the medication and setup tabs too', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.click('[data-act="autofill"]');
  await page.click('[data-tab="meds"]');
  await expect(page.locator('#med-active-count')).not.toHaveText(/^0 active/);
  await page.click('[data-tab="settings"]');
  await expect(page.locator('#set-director')).not.toHaveValue('');
  await expect(page.locator('#set-cno')).not.toHaveValue('');
});

test('settings load ignores manipulated values', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'deliriumtool:settings',
      JSON.stringify({
        'set-rass': 'HACKED — not a real option', // out-of-range <select> value
        'set-director': 'A'.repeat(5000), // over-long free text
        evil: 'should be ignored', // key not in the allowlist
      }),
    );
  });
  await page.reload();
  await page.click('[data-act="chooseTool"]');
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="settings"]');
  await expect(page.locator('#set-rass')).not.toHaveValue(/HACKED/); // rejected → keeps a valid option
  const dir = await page.locator('#set-director').inputValue();
  expect(dir.length).toBeLessThanOrEqual(2000); // bounded
});

test('exported PDF filename carries a generation timestamp', async ({ page }) => {
  await page.click('[data-pathway="record"]');
  await page.click('[data-tab="export"]');
  await page.fill('#facility-input', 'Test');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-act="openDoc"][data-doc="full"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(/_\d{4}-\d{2}-\d{2}_\d{4}\.pdf$/);
});

test('CAM result status uses a vector sprite icon, not an emoji', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="cam"]');
  await page.selectOption('#rass', '-1');
  await page.click('#c1y');
  await page.fill('#cam2-err', '3');
  await expect(page.locator('#cam-res-icon svg use')).toHaveCount(1);
});

test('the assessment is never written to localStorage', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.locator('#tab-risk .rcb').nth(0).check();
  await page.click('[data-tab="export"]');
  await page.fill('#facility-input', 'Flush Test Hospital');
  await page.waitForTimeout(600); // outlast the old autosave debounce interval
  await page.evaluate("dispatchEvent(new Event('pagehide'))"); // the old flush trigger
  const saved = await page.evaluate(() => localStorage.getItem('deliriumtool:assessment'));
  expect(saved).toBeNull();
});

test('auto-fill asks before overwriting notes-only work', async ({ page }) => {
  await page.click('[data-pathway="full"]');
  await page.click('[data-tab="cam"]');
  await page.fill('#cam-notes', 'Drowsy overnight; reviewing meds.');
  let asked = false;
  page.once('dialog', (d) => {
    asked = true;
    d.accept();
  });
  await page.click('[data-act="autofill"]');
  expect(asked).toBe(true);
});

test('the accessibility options control is available and opens', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.a11y-btn')).toBeVisible();
  await page.click('.a11y-btn');
  await expect(page.locator('.a11y-panel')).toBeVisible();
});

// The accessibility options join the header controls row on every page
// instead of wrapping onto an orphan line of their own.
test('accessibility button sits in the header actions cluster (adult + peds)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.app-header-actions .a11y-wrap')).toHaveCount(1);
  await page.goto('/peds/');
  await expect(page.locator('.app-header-actions .a11y-wrap')).toHaveCount(1);
});
