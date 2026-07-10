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
  await expect(page.locator('.preview-bar')).toBeHidden();
  await expect(page.locator('.preview-note')).toBeHidden();
  await expect(page.locator('.tpl-lead')).toBeHidden();
  await expect(page.locator('.tpl-footer')).toBeHidden();
  await expect(page.locator('.sheet').first()).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
});

test('defaults to Large text and generic-only names; brand toggle restores them', async ({
  page,
}) => {
  await expect(page.locator('#f-font-scale')).toHaveValue('110');
  const sheets = page.locator('#sheets');
  await expect(sheets).toContainText('Lorazepam');
  await expect(sheets).not.toContainText('(Ativan)');
  await page.check('#f-brands');
  await expect(sheets).toContainText('Lorazepam (Ativan)');
});

test('disclosure groups stay open and keep focus when toggling inside them', async ({ page }) => {
  // Medication category: open it, toggle an agent — the menu must stay open.
  const benzo = page.locator('.med-cat[data-key="benzo"]');
  await benzo.locator('summary').click();
  await page.uncheck('#med-benzo-lorazepam');
  await expect(benzo).toHaveAttribute('open', '');
  await expect(page.locator('#med-benzo-lorazepam')).toBeVisible();
  await expect(page.locator('#med-benzo-lorazepam')).toBeFocused();
  // The All/None quick buttons keep it open too.
  await benzo.locator('[data-act="medNone"]').click();
  await expect(page.locator('.med-cat[data-key="benzo"]')).toHaveAttribute('open', '');
  // Section line lists behave the same.
  const sec = page.locator('.sec-ctl-items[data-key="sec-nonpharm"]');
  await sec.locator('summary').click();
  await page.uncheck('#it-np-clock');
  await expect(page.locator('.sec-ctl-items[data-key="sec-nonpharm"]')).toHaveAttribute('open', '');
});

test('medication list defaults to mosaic cards and can switch to category rows', async ({
  page,
}) => {
  await expect(page.locator('#f-med-layout')).toHaveValue('mosaic');
  await expect(page.locator('.sh-med-card').first()).toBeVisible();
  await expect(page.locator('.sh-meds-row')).toHaveCount(0);
  await page.selectOption('#f-med-layout', 'rows');
  await expect(page.locator('.sh-meds-row').first()).toBeVisible();
  await expect(page.locator('.sh-med-card')).toHaveCount(0);
  await expect(page.locator('#fit-warn')).toBeHidden();
});

test('global select all/none and the meds heading behave on both templates', async ({ page }) => {
  for (const tpl of ['rounding', 'spa']) {
    await page.check(`input[name="template"][value="${tpl}"]`);
    await page.click('[data-act="medNoneGlobal"]');
    await expect(page.locator('.sh-med-card'), `${tpl}: none selected`).toHaveCount(0);
    await page.click('[data-act="medAllGlobal"]');
    await expect(page.locator('.sh-med-card'), `${tpl}: all selected`).toHaveCount(11);
    await expect(page.locator('#fit-warn'), `${tpl}: fits with all`).toBeHidden();
  }
  // At full selection the rounding layout separates so the medications get
  // narrow columns — they keep their own heading.
  await page.check('input[name="template"][value="rounding"]');
  await expect(page.locator('.sheet .sh-meds-head', { hasText: 'review & limit' })).toHaveCount(1);
  // At the default selection the rounding sheet unifies: the guidance card is
  // pinned top-left and the meds heading moves into the Step-3 band so it can
  // never land mid-column.
  await openDetails(page);
  await page.click('[data-act="medNoneGlobal"]');
  for (const cat of ['benzo', 'opioids', 'antichol']) {
    await openDetails(page);
    await page.click(`[data-act="medAll"][data-cat="${cat}"]`);
  }
  await expect(page.locator('.sh-band', { hasText: 'review & limit' })).toBeVisible();
  await expect(page.locator('.sheet .sh-meds-head', { hasText: 'review & limit' })).toHaveCount(0);
  // SPA always keeps its own heading above the cards.
  await page.check('input[name="template"][value="spa"]');
  await expect(page.locator('.sheet .sh-meds-head', { hasText: 'review & limit' })).toHaveCount(1);
});

test('print font options apply to the sheet and the sheet still fits', async ({ page }) => {
  await page.selectOption('#f-font-family', 'serif');
  const family = await page
    .locator('.sheet')
    .first()
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/Georgia/);
  await expect(page.locator('#fit-warn')).toBeHidden();
});

test('everything enabled fits both pages at Large on both templates', async ({ page }) => {
  // Enable every medication category (the quick "All" buttons rebuild the panel).
  await openDetails(page);
  const catCount = await page.locator('[data-act="medAll"]').count();
  for (let i = 0; i < catCount; i++) {
    await openDetails(page);
    await page.locator('[data-act="medAll"]').nth(i).click();
  }
  await expect(page.locator('.sh-med-card')).toHaveCount(11);
  for (const tpl of ['rounding', 'spa']) {
    await page.check(`input[name="template"][value="${tpl}"]`);
    await expect(page.locator('#fit-warn'), `template ${tpl}`).toBeHidden();
    const over = await page.evaluate(() =>
      [...document.querySelectorAll('.sheet')].map((s) => s.scrollHeight - s.clientHeight),
    );
    expect(
      over.every((o) => o <= 0),
      `template ${tpl} overflow ${over}`,
    ).toBe(true);
  }
});

test('lines can be reworded and custom sections added', async ({ page }) => {
  await openDetails(page);
  await page.locator('[data-act="editText"][data-id="np-clock"]').click();
  const editBox = page.locator('.edit-input');
  await editBox.fill('Clock visible from the bed');
  await editBox.press('Enter');
  await expect(page.locator('#sheets')).toContainText('Clock visible from the bed');
  await expect(page.locator('#sheets')).not.toContainText('Clock and calendar visible');

  await page.fill('#f-newsec-title', 'Unit huddle checklist');
  await page.selectOption('#f-newsec-page', '2');
  await page.click('[data-act="addSection"]');
  const secBlock = page.locator('.sec-ctl--custom', { hasText: 'Unit huddle checklist' });
  await secBlock.locator('.custom-add-input').fill('Review sitter needs');
  await secBlock.locator('[data-act="addSecLine"]').click();
  await expect(page.locator('.sheet').nth(1)).toContainText('Unit huddle checklist');
  await expect(page.locator('.sheet').nth(1)).toContainText('Review sitter needs');
});

test('Save PDF downloads a two-page document for either template', async ({ page }) => {
  // The creation date defaults to today and rides along in the filename.
  const download = page.waitForEvent('download');
  await page.click('.preview-bar [data-act="pdf"]');
  expect((await download).suggestedFilename()).toMatch(
    /^icu-delirium-rounding-tool_\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  await page.check('input[name="template"][value="spa"]');
  const download2 = page.waitForEvent('download');
  await page.click('.preview-bar [data-act="pdf"]');
  expect((await download2).suggestedFilename()).toMatch(
    /^spa-delirium-quick-reference_\d{4}-\d{2}-\d{2}\.pdf$/,
  );
});

test('designer has no serious accessibility violations (adult templates)', async ({ page }) => {
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

// ── Peds card set + workflow poster ──────────────────────────────────────────

test('peds card set renders all ten pages with the arousal gate and picture deck', async ({
  page,
}) => {
  await page.check('input[name="template"][value="peds-cards"]');
  await expect(page.locator('.sheet')).toHaveCount(10);
  // Arousal card: full RASS ladder with fillable circles and both gate bars.
  const arousal = page.locator('.sheet').first();
  await expect(arousal.locator('.pc-lrow')).toHaveCount(10);
  await expect(arousal.locator('.sh-rass-box')).toHaveCount(10);
  await expect(arousal.locator('.pc-gate--go')).toContainText('RASS ≥ −3');
  await expect(arousal.locator('.pc-gate--stop')).toContainText('unable to assess');
  // Picture deck: 10 stimulus cards + the instructions cell across 3 pages.
  await expect(page.locator('.pc-stim')).toHaveCount(11);
  await expect(page.locator('.pc-stim--instr')).toHaveCount(1);
  // Protocol content is editable; validated-instrument text is not — the
  // sidebar offers act/prevention/picture toggles but nothing for the CAPD
  // items, CAM features, or arousal rows.
  await expect(page.locator('#ctrl-sections details')).toHaveCount(2);
  await expect(page.locator('button[data-act="editText"][data-id="act-consult"]')).toBeAttached();
  expect(await page.locator('input[data-act="itemToggle"][data-id^="capd"]').count()).toBe(0);
  // Picture cards toggle but are not reword-able.
  expect(await page.locator('button[data-act="editText"][data-id^="stim-"]').count()).toBe(0);
});

test('peds card set is a full builder: toggles, rewording, unit lines, own-card sections', async ({
  page,
}) => {
  await page.check('input[name="template"][value="peds-cards"]');
  // The picture deck is fixed — the printed procedure needs all ten pictures.
  await expect(page.locator('.pc-stim')).toHaveCount(11);
  expect(await page.locator('input[data-act="itemToggle"][data-id^="stim-"]').count()).toBe(0);
  // Reword an act line inline (the group lives in a collapsed disclosure).
  await page
    .locator('#ctrl-sections details')
    .first()
    .evaluate((d) => {
      d.open = true;
    });
  await page
    .locator('button[data-act="editText"][data-id="act-consult"]')
    .evaluate((el) => el.click());
  await page.locator('.edit-input').fill('Call the PICU delirium champion first.');
  await page.locator('.edit-input').press('Enter');
  await expect(page.locator('.pc-act').last()).toContainText('delirium champion');
  // Add a unit line to a block.
  const addLine = page.locator('button[data-act="addLine"][data-group="act-first"]');
  await addLine.evaluate((b, v) => {
    b.parentElement.querySelector('.custom-add-input').value = v;
  }, 'Page the fellow if CAPD ≥ 9 twice.');
  await addLine.evaluate((b) => b.click());
  await expect(page.locator('.pc-act').first()).toContainText('Page the fellow');
  // A custom section prints as its own card page.
  await page.fill('#f-newsec-title', 'Unit huddle checklist');
  await page.click('[data-act="addSection"]');
  const secBtn = page.locator('button[data-act="addSecLine"]').first();
  await secBtn.evaluate((b, v) => {
    b.parentElement.querySelector('.custom-add-input').value = v;
  }, 'Confirm CAPD documented in EHR');
  await secBtn.evaluate((b) => b.click());
  await expect(page.locator('.sheet')).toHaveCount(11);
  await expect(page.locator('.pc-custom')).toContainText('Unit huddle checklist');
});

test('workflow poster lines toggle and reword like the sheets', async ({ page }) => {
  await page.check('input[name="template"][value="peds-workflow"]');
  await page
    .locator('input[data-act="itemToggle"][data-id="wf-screen-why"]')
    .evaluate((el) => el.click());
  await expect(page.locator('.pc-stage').first()).not.toContainText('point prevalence');
});

test('peds arousal card switches to SBS with its own gate values', async ({ page }) => {
  await page.check('input[name="template"][value="peds-cards"]');
  await page.selectOption('#f-peds-scale', 'sbs');
  const arousal = page.locator('.sheet').first();
  await expect(arousal.locator('.pc-lrow')).toHaveCount(6);
  await expect(arousal.locator('.pc-gate--go')).toContainText('SBS ≥ −1');
  await expect(arousal.locator('.pc-gate--stop')).toContainText('SBS −2 / −3');
});

test('peds templates hide adult-only controls and show the scale picker', async ({ page }) => {
  await page.check('input[name="template"][value="peds-cards"]');
  await expect(page.locator('#f-peds-scale')).toBeVisible();
  await expect(page.locator('section[aria-labelledby="h-meds"]')).toBeHidden();
  await expect(page.locator('#f-rass-target')).toBeHidden();
  await page.check('input[name="template"][value="rounding"]');
  await expect(page.locator('#f-peds-scale')).toBeHidden();
  // Labels of template-scoped controls hide with them (no orphaned text).
  await expect(page.locator('label[for="f-peds-scale"]')).toBeHidden();
  await expect(page.locator('label[for="f-stim-layout"]')).toBeHidden();
  await expect(page.locator('label[for="f-stim-style"]')).toBeHidden();
  await expect(page.locator('section[aria-labelledby="h-meds"]')).toBeVisible();
});

test('the accessibility button sits in the header actions cluster', async ({ page }) => {
  await expect(page.locator('.app-header-actions .a11y-wrap')).toHaveCount(1);
});

test('PICU workflow poster renders one landscape page with the rounds script', async ({ page }) => {
  await page.check('input[name="template"][value="peds-workflow"]');
  await expect(page.locator('.sheet')).toHaveCount(1);
  await expect(page.locator('.sheet')).toHaveClass(/sheet--landscape/);
  await expect(page.locator('.pc-stage')).toHaveCount(4);
  await expect(page.locator('.pc-rounds').first()).toContainText('say these four things');
});

test('peds card set saves a PDF named for the card set', async ({ page }) => {
  await page.check('input[name="template"][value="peds-cards"]');
  const download = page.waitForEvent('download');
  await page.click('.preview-bar [data-act="pdf"]');
  expect((await download).suggestedFilename()).toMatch(
    /^peds-delirium-card-set-rass_\d{4}-\d{2}-\d{2}\.pdf$/,
  );
});

test('Design B swaps the adult sheet design from the dropdown and fits everything', async ({
  page,
}) => {
  await expect(page.locator('#sheets')).not.toHaveClass(/design-b/);
  await page.selectOption('#f-design', 'b');
  await expect(page.locator('#sheets')).toHaveClass(/design-b/);
  // Same metrics as Design A — everything enabled still fits both templates.
  for (const tpl of ['rounding', 'spa']) {
    await page.check(`input[name="template"][value="${tpl}"]`);
    await page.waitForTimeout(400);
    const overflow = await page.$$eval('.sheet', (sheets) =>
      sheets.map((sh) => sh.scrollHeight - sh.clientHeight).filter((d) => d > 2),
    );
    expect(overflow, `template=${tpl}`).toEqual([]);
  }
  // Design B is adult-only: the peds card system is already the modern design.
  await page.check('input[name="template"][value="peds-cards"]');
  await expect(page.locator('#sheets')).not.toHaveClass(/design-b/);
  await expect(page.locator('#f-design')).toBeHidden();
  // The choice survives reload.
  await page.check('input[name="template"][value="rounding"]');
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator('#f-design')).toHaveValue('b');
  await expect(page.locator('#sheets')).toHaveClass(/design-b/);
});

test('preview and options panes scroll independently on wide screens', async ({ page }) => {
  const width = page.viewportSize().width;
  test.skip(width < 981, 'single-column layout scrolls as one document');
  const before = await page.$eval('.ctrl', (el) => el.scrollTop);
  await page.locator('.preview').hover();
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(200);
  expect(await page.$eval('.preview', (el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.$eval('.ctrl', (el) => el.scrollTop)).toBe(before);
  const pBefore = await page.$eval('.preview', (el) => el.scrollTop);
  await page.locator('.ctrl').hover();
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(200);
  expect(await page.$eval('.ctrl', (el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.$eval('.preview', (el) => el.scrollTop)).toBe(pBefore);
});

test('peds cards are landscape pages that fit at every size, font, and scale', async ({ page }) => {
  await page.check('input[name="template"][value="peds-cards"]');
  for (const scale of ['rass', 'sbs']) {
    await page.selectOption('#f-peds-scale', scale);
    for (const fs of ['90', '100', '110']) {
      await page.selectOption('#f-font-scale', fs);
      await page.waitForTimeout(250);
      const bad = await page.$$eval('.sheet', (sheets) =>
        sheets
          .map((sh, i) => ({
            i,
            landscape: sh.offsetWidth > sh.offsetHeight,
            overflow: sh.scrollHeight > sh.clientHeight + 2,
          }))
          .filter((r) => !r.landscape || r.overflow),
      );
      expect(bad, `scale=${scale} fs=${fs}: ${JSON.stringify(bad)}`).toEqual([]);
    }
  }
});

test('picture cards offer one-per-page layout and the kawaii style set', async ({ page }) => {
  await page.check('input[name="template"][value="peds-cards"]');
  await expect(page.locator('.sheet')).toHaveCount(10);
  // One picture per page: instructions page + 10 picture pages.
  await page.selectOption('#f-stim-layout', 'full');
  await expect(page.locator('.sheet')).toHaveCount(18);
  await expect(page.locator('.pc-stimfull')).toHaveCount(10);
  // Kawaii is the default; the classic set redraws every picture with the
  // count and pages identical.
  await expect(page.locator('#f-stim-style')).toHaveValue('b');
  await page.selectOption('#f-stim-style', 'a');
  await expect(page.locator('.sheet')).toHaveCount(18);
  await page.selectOption('#f-stim-layout', 'grid');
  await expect(page.locator('.sheet')).toHaveCount(10);
  // The instructions card keys both sets with labeled miniatures.
  await expect(page.locator('.pc-stim-mini')).toHaveCount(10);
  await expect(page.locator('.pc-stim-setlbl').first()).toContainText('show these five first');
  // The choices persist across reload.
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator('#f-stim-style')).toHaveValue('a');
});

test('workflow poster section switch removes the poster', async ({ page }) => {
  await page.check('input[name="template"][value="peds-workflow"]');
  await expect(page.locator('.sheet')).toHaveCount(1);
  await page.uncheck('#sw-sec-wf-poster');
  await expect(page.locator('.sheet')).toHaveCount(0);
  await page.check('#sw-sec-wf-poster');
  await expect(page.locator('.sheet')).toHaveCount(1);
});

test('workflow poster validated lines are locked (no toggle, no reword)', async ({ page }) => {
  await page.check('input[name="template"][value="peds-workflow"]');
  expect(await page.locator('[data-id="wf-score-positive"]').count()).toBe(0);
  expect(await page.locator('[data-id="wf-gate-floor"]').count()).toBe(0);
  await expect(page.locator('.pc-stage-line', { hasText: 'CAPD ≥ 9' })).toBeVisible();
});

test('peds selections survive reload and the poster passes the axe scan', async ({ page }) => {
  await page.check('input[name="template"][value="peds-cards"]');
  await page.selectOption('#f-peds-scale', 'sbs');
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.locator('input[name="template"][value="peds-cards"]')).toBeChecked();
  await expect(page.locator('#f-peds-scale')).toHaveValue('sbs');
  await page.check('input[name="template"][value="peds-workflow"]');
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious.map((v) => v.id).join(', ')).toBe('');
});

test('peds card set has no serious accessibility violations', async ({ page }) => {
  await page.check('input[name="template"][value="peds-cards"]');
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(serious.map((v) => v.id).join(', ')).toBe('');
});

test('ED card set renders five portrait cards with the RASS gate and DTS→bCAM flow', async ({
  page,
}) => {
  await page.check('input[name="template"][value="ed-cards"]');
  await expect(page.locator('.sheet')).toHaveCount(5);
  await expect(page.locator('.sheet').first()).toHaveClass(/sheet--portrait/);
  // Pathways card surfaces all three guideline-backed options.
  await expect(page.locator('.pc-router .pc-route')).toHaveCount(3);
  await expect(page.locator('.pc-router')).toContainText('bCAM directly');
  // Combined Step 1 card: the full RASS ladder + the unable gate + the LUNCH task.
  const dts = page.locator('.pc-dtsgate');
  // Sequential steps number DTS → bCAM as 1 → 2 (no gap).
  await expect(dts.locator('.pc-stepchip')).toHaveText('Step 1 · DTS');
  await expect(page.locator('.pc-bcam .pc-stepchip')).toHaveText('Step 2 · bCAM');
  await expect(dts.locator('.pc-lrow')).toHaveCount(10);
  await expect(dts.locator('.pc-gate--stop')).toContainText('unable to assess');
  await expect(dts.locator('.pc-letter')).toHaveCount(5);
  await expect(dts).toContainText('DTS negative — delirium ruled out');
  // bCAM stepper: four features, the rule, and DELIRIUM PRESENT as an outcome chip.
  await expect(page.locator('.pc-bcam .pc-step')).toHaveCount(4);
  await expect(page.locator('.pc-bcam .pc-rule')).toContainText(
    'Feature 1 + Feature 2 + (Feature 3 or Feature 4)',
  );
  await expect(page.locator('.pc-bcam .pc-chip--present').first()).toContainText(
    'DELIRIUM PRESENT',
  );
  // 4AT card: four scored items and the three bands.
  await expect(page.locator('.pc-4at-row')).toHaveCount(4);
  await expect(page.locator('.pc-4at-total .pc-chip')).toHaveCount(3);
  // Validated-instrument text is not editable; only the act card + workflow are.
  expect(await page.locator('button[data-act="editText"][data-id^="f2"]').count()).toBe(0);
});

test('ED card set: no card overflows one portrait page, even with a long facility', async ({
  page,
}) => {
  await page.check('input[name="template"][value="ed-cards"]');
  await page.fill('#f-facility', 'Metropolitan Regional Medical Center Emergency Department');
  await expect(page.locator('#fit-warn')).toBeHidden();
  // The .sheet clips overflow, so scrollHeight is blind to content spilling onto
  // the footer at print size. Measure the deepest body child against the footer
  // top under print media — that is what actually collides on a printed page.
  await page.emulateMedia({ media: 'print' });
  const over = await page.evaluate(() =>
    [...document.querySelectorAll('.sheet')].map((s) => {
      const foot = s.querySelector('.sh-foot');
      const body = s.querySelector('.pc-body');
      if (!foot || !body) return -999;
      const footTop = foot.getBoundingClientRect().top;
      let maxBottom = 0;
      body.querySelectorAll('*').forEach((el) => {
        const b = el.getBoundingClientRect().bottom;
        if (b > maxBottom) maxBottom = b;
      });
      return Math.round(maxBottom - footTop);
    }),
  );
  await page.emulateMedia({ media: 'screen' });
  expect(
    over.every((o) => o <= 0),
    `content overlaps footer by (px, want all <=0): ${over}`,
  ).toBe(true);
});

test('ED card set: bCAM Feature-4 question set swaps and persists across reload', async ({
  page,
}) => {
  await page.check('input[name="template"][value="ed-cards"]');
  await expect(page.locator('.pc-bcam .pc-setbadge')).toContainText('Set A');
  await expect(page.locator('.pc-bcam .pc-qs')).toContainText('Will a stone float on water?');
  await page.selectOption('#f-ed-f4set', 'b');
  await expect(page.locator('.pc-bcam .pc-setbadge')).toContainText('Set B');
  await expect(page.locator('.pc-bcam .pc-qs')).toContainText('Will a leaf float on water?');
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.locator('#f-ed-f4set')).toHaveValue('b');
  await expect(page.locator('.pc-bcam .pc-setbadge')).toContainText('Set B');
});

test('ED card set is a builder: act toggles, unit lines, own-card sections', async ({ page }) => {
  await page.check('input[name="template"][value="ed-cards"]');
  await page
    .locator('#ctrl-sections details')
    .first()
    .evaluate((d) => {
      d.open = true;
    });
  // Toggle an act line off — it disappears from the act card.
  const firstItem = page.locator('input[data-act="itemToggle"][data-id^="act-"]').first();
  const before = await page.locator('.pc-actcard .sh-item').count();
  await firstItem.evaluate((el) => el.click());
  await expect(page.locator('.pc-actcard .sh-item')).toHaveCount(before - 1);
  // A custom section prints as its own card page (own-page, like peds).
  await page.fill('#f-newsec-title', 'ED delirium pathway contact');
  await page.click('[data-act="addSection"]');
  const secBtn = page.locator('button[data-act="addSecLine"]').first();
  await secBtn.evaluate((b, v) => {
    b.parentElement.querySelector('.custom-add-input').value = v;
  }, 'Page geriatrics for a positive screen');
  await secBtn.evaluate((b) => b.click());
  await expect(page.locator('.sheet')).toHaveCount(6);
  await expect(page.locator('.pc-custom')).toContainText('ED delirium pathway contact');
});

test('ED card set renumbers the sequential steps when the DTS card is hidden', async ({ page }) => {
  await page.check('input[name="template"][value="ed-cards"]');
  await expect(page.locator('.pc-bcam .pc-stepchip')).toHaveText('Step 2 · bCAM');
  await expect(page.locator('.pc-bcam .pc-step').nth(2)).toContainText('from Step 1');
  // Hide the DTS card — bCAM is now the first shown step.
  await page.locator('#sw-sec-ed-dts').uncheck();
  await expect(page.locator('.pc-dtsgate')).toHaveCount(0);
  await expect(page.locator('.pc-bcam .pc-stepchip')).toHaveText('Step 1 · bCAM');
  // Its Feature-3 cross-reference no longer points at a missing step.
  await expect(page.locator('.pc-bcam .pc-step').nth(2)).toContainText('the RASS score');
});

test('ED workflow poster renders one landscape page with the hand-off script', async ({ page }) => {
  await page.check('input[name="template"][value="ed-workflow"]');
  await expect(page.locator('.sheet')).toHaveCount(1);
  await expect(page.locator('.sheet')).toHaveClass(/sheet--landscape/);
  await expect(page.locator('.pc-stage')).toHaveCount(4);
  await expect(page.locator('.pc-rounds').first()).toContainText('hand off a positive screen');
  // A locked threshold line always prints and is not editable.
  await expect(page.locator('.pc-flow')).toContainText('LUNCH backwards');
  expect(
    await page.locator('input[data-act="itemToggle"][data-id="ed-wf-confirm-dts"]').count(),
  ).toBe(0);
});

test('ED templates hide adult-only controls and the peds scale picker', async ({ page }) => {
  await page.check('input[name="template"][value="ed-cards"]');
  await expect(page.locator('#f-ed-f4set')).toBeVisible();
  await expect(page.locator('#f-peds-scale')).toBeHidden();
  await expect(page.locator('#f-design')).toBeHidden();
  await expect(page.locator('section[aria-labelledby="h-meds"]')).toBeHidden();
  await expect(page.locator('#f-rass-target')).toBeHidden();
  await page.check('input[name="template"][value="rounding"]');
  await expect(page.locator('#f-ed-f4set')).toBeHidden();
  await expect(page.locator('label[for="f-ed-f4set"]')).toBeHidden();
});

test('ED templates Save PDF with readable filenames', async ({ page }) => {
  await page.check('input[name="template"][value="ed-cards"]');
  const dl = page.waitForEvent('download');
  await page.locator('button:has-text("Save PDF")').click();
  expect((await dl).suggestedFilename()).toMatch(/^ed-delirium-card-set/);
});

test('ED templates have no serious accessibility violations', async ({ page }) => {
  for (const tpl of ['ed-cards', 'ed-workflow']) {
    await page.check(`input[name="template"][value="${tpl}"]`);
    await page.waitForTimeout(400);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious.map((v) => v.id).join(', '), `template ${tpl}`).toBe('');
  }
});

test('every template auto-scales so no page overflows its footer', async ({ page }) => {
  // The fit engine must see content that overflows a fixed-height card panel
  // (.pc-body), not just content that grows the sheet — and shrink to fit.
  const overflow = () =>
    page.evaluate(() => {
      const limit = (s) => {
        const pb = parseFloat(getComputedStyle(s).paddingBottom) || 0;
        const f = s.querySelector(':scope > .sh-foot');
        return s.clientHeight - pb - (f ? f.offsetHeight + 2 : 0);
      };
      const bottom = (s) => {
        const f = s.querySelector(':scope > .sh-foot');
        let m = 0;
        for (const c of s.children) {
          if (c === f) continue;
          m = Math.max(m, c.offsetTop + Math.max(c.offsetHeight, c.scrollHeight));
        }
        return m;
      };
      return [...document.querySelectorAll('.sheet')].map((s) => Math.round(bottom(s) - limit(s)));
    });
  for (const tpl of ['rounding', 'spa', 'peds-cards', 'peds-workflow', 'ed-cards', 'ed-workflow']) {
    await page.check(`input[name="template"][value="${tpl}"]`);
    await page.selectOption('#f-font-scale', '110'); // largest print size = most height pressure
    const over = await overflow();
    expect(
      over.every((o) => o <= 1),
      `${tpl} content overflows footer by ${over}`,
    ).toBe(true);
    await expect(page.locator('#fit-warn')).toBeHidden();
  }
});

test('escalation stages renumber sequentially when a stage is hidden (no gap)', async ({
  page,
}) => {
  await page.check('input[name="template"][value="spa"]');
  const stageHeads = () =>
    page
      .locator('.sh-group-head--bar')
      .allTextContents()
      .then((hs) => hs.filter((h) => h.includes('·')));
  expect((await stageHeads()).map((h) => parseInt(h, 10))).toEqual([1, 2, 3, 4]);
  // Hide the second stage ("2 · CAM positive") by toggling off all its items.
  await page
    .locator('#ctrl-sections details')
    .evaluateAll((ds) => ds.forEach((d) => (d.open = true)));
  for (const id of ['esc-notify', 'esc-intensify', 'esc-causes']) {
    await page
      .locator(`input[data-act="itemToggle"][data-id="${id}"]`)
      .first()
      .evaluate((el) => {
        if (el.checked) el.click();
      });
  }
  const after = await stageHeads();
  expect(after.map((h) => parseInt(h, 10))).toEqual([1, 2, 3]); // renumbered, no gap
  expect(after.join(' ')).toContain('2 · Persistent'); // stage 3 became stage 2
});
