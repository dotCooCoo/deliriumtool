// Pediatric tool (/peds/): profile-first flow, theme/logo, SEO, and the screens.
/* global document, getComputedStyle */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Fill the child profile and derive a screen. Default age routes to CAPD.
async function start(page, ageMonths = 36) {
  await page.goto('/peds/');
  await page.fill('#prof-age', String(ageMonths));
  await page.click('[data-act="deriveScreen"]');
  await expect(page.locator('#workspace')).toBeVisible();
}

const nevers = (page) =>
  page.locator('#capd-items label.pseg-opt', { has: page.locator('input[value="0"]') });

const setArousal = (page, v) =>
  page.locator('#peds-arousal .ascale-opt', { has: page.locator(`input[value="${v}"]`) }).click();

test('peds page routes and carries its own SEO', async ({ page }) => {
  await page.goto('/peds/');
  await expect(page).toHaveTitle(/Pediatric/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://deliriumtool.com/peds/',
  );
  await expect(page.locator('h1')).toHaveCount(1);
});

test('peds page applies the teal theme and shows the logo', async ({ page }) => {
  await page.goto('/peds/');
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim(),
  );
  expect(primary).toBe('#0d7d84');
  await expect(page.locator('img.app-logo')).toHaveAttribute('src', /logo\.png$/);
});

test('peds page exposes valid JSON-LD for the peds URL', async ({ page }) => {
  await page.goto('/peds/');
  const data = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  expect(data['@type']).toBe('WebApplication');
  expect(data.url).toBe('https://deliriumtool.com/peds/');
});

test('peds has its own PWA manifest (installs a pediatric app, not the adult one)', async ({
  page,
}) => {
  await page.goto('/peds/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', 'site.webmanifest');
  const m = await (await page.request.get('/peds/site.webmanifest')).json();
  expect(m.start_url).toBe('/peds/');
  expect(m.scope).toBe('/peds/');
  expect(m.name).toMatch(/pediatric/i);
});

test('child profile gate requires age, then derives a screen and shows context', async ({
  page,
}) => {
  await page.goto('/peds/');
  await expect(page.locator('#workspace')).toBeHidden();
  await page.click('[data-act="deriveScreen"]'); // no age → error, no workspace
  await expect(page.locator('#prof-error')).toBeVisible();
  await expect(page.locator('#workspace')).toBeHidden();
  await page.fill('#prof-age', '14');
  await page.click('[data-act="deriveScreen"]');
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#pathway-name')).toHaveText('CAPD');
  await expect(page.locator('#child-context')).toContainText('Age 14 mo');
  await page.click('.tab-btn[data-tab="risk"]');
  await expect(page.locator('#tab-risk')).toBeVisible();
  await page.click('[data-act="reset"]');
  await expect(page.locator('#pathway-picker')).toBeVisible();
});

test('CAPD shows age-filtered anchors and scores positive', async ({ page }) => {
  await start(page, 36);
  // inline developmental anchor for this child's band
  await expect(page.locator('#capd-items .anchor-hint').first()).toContainText('Age-expected');
  await setArousal(page, '-5');
  await expect(page.locator('#screen-result')).toContainText('Unable to assess');
  await setArousal(page, '0');
  const opts = nevers(page);
  await expect(opts).toHaveCount(8);
  for (let i = 0; i < 8; i++) await opts.nth(i).click();
  await expect(page.locator('#screen-result')).toContainText('Positive');
  await expect(page.locator('#screen-result')).toContainText('/32');
  // positive routes forward, not a dead-end badge
  await expect(page.locator('#screen-result')).toContainText('WAT-1');
  await expect(page.locator('#screen-result')).toContainText('precipitants');
});

test('baseline mental status anchors the result to this child', async ({ page }) => {
  await page.goto('/peds/');
  await page.fill('#prof-age', '36');
  await page.selectOption('#prof-baseline', 'impaired');
  await expect(page.locator('#prof-dev-row')).toBeVisible();
  await page.fill('#prof-dev', '12');
  await page.click('[data-act="deriveScreen"]');
  await setArousal(page, '0');
  const opts = nevers(page);
  for (let i = 0; i < 8; i++) await opts.nth(i).click();
  await expect(page.locator('#screen-result')).toContainText('relative to this child');
});

test('arousal scale switches to SBS and applies its own coma floor', async ({ page }) => {
  await start(page, 8); // infant — SBS is the relevant scale
  await page.click('[data-act="arousalScale"][data-scale="sbs"]');
  await expect(page.locator('#peds-arousal .ascale-opt')).toHaveCount(6);
  await page
    .locator('#peds-arousal .ascale-opt', { has: page.locator('input[value="-2"]') })
    .click();
  await expect(page.locator('#screen-result')).toContainText('Unable to assess');
  await page
    .locator('#peds-arousal .ascale-opt', { has: page.locator('input[value="-1"]') })
    .click();
  await expect(page.locator('#screen-result')).not.toContainText('Unable to assess');
});

const camYes = (page, f) =>
  page
    .locator('#cam-features label.pseg-opt', {
      has: page.locator(`input[name="cam-${f}"][value="yes"]`),
    })
    .click();

test('pCAM-ICU runs as real feature tasks: error tally drives the result', async ({ page }) => {
  await start(page, 84); // 7 yr → CAPD recommended, pCAM offered
  await page.click('[data-act="switchScreen"][data-screen="pcam"]');
  await expect(page.locator('#pathway-name')).toHaveText('pCAM-ICU');
  await setArousal(page, '0');

  const f2 = page.locator('.cam-feat', { hasText: 'Feature 2' });
  await camYes(page, 'f1'); // acute change — judgment
  // Feature 2 inattention: 2 errors marked + performed → still ABSENT (threshold 3)
  for (const i of [0, 1])
    await page.locator(`.errchip[data-cam-err="f2"][data-idx="${i}"]`).click();
  await page.locator('input[data-cam-performed="f2"]').check();
  await expect(f2.locator('.fv-badge')).toHaveText('absent');
  await camYes(page, 'f3');
  await expect(page.locator('#screen-result')).toContainText('Negative');
  // add a 3rd error → Feature 2 present → screen flips positive
  await page.locator('.errchip[data-cam-err="f2"][data-idx="2"]').click();
  await expect(f2.locator('.fv-badge')).toHaveText('present');
  await expect(page.locator('#screen-result')).toContainText('Positive');
  await expect(page.locator('#screen-result')).toContainText('pCAM-ICU');
});

test('Risk tab auto-flags profile-derived factors and lists the rest as cards', async ({
  page,
}) => {
  await start(page, 14); // ≤ 2 yr → young age auto-flagged from the profile
  await page.click('.tab-btn[data-tab="risk"]');
  await expect(page.locator('.risk-flagged')).toContainText("Flagged from this child's profile");
  await expect(page.locator('.risk-flagged')).toContainText('Young age');
  await expect(page.locator('.risk-card.is-derived input[data-risk="age"]')).toBeChecked();
  await expect(page.locator('#tab-risk')).toContainText('Benzodiazepine exposure');
  expect(
    await page.locator('#tab-risk input[type="checkbox"][data-risk]').count(),
  ).toBeGreaterThanOrEqual(10);
});

test('Risk tab shows no profile flag for an older child with typical baseline', async ({
  page,
}) => {
  await start(page, 96); // 8 yr, typical → nothing auto-derived
  await page.click('.tab-btn[data-tab="risk"]');
  await expect(page.locator('.risk-flagged')).toHaveCount(0);
});

test('Prevention tab lists the ABCDEF bundle + non-pharmacologic measures', async ({ page }) => {
  await start(page);
  await page.click('.tab-btn[data-tab="prevent"]');
  await expect(page.locator('#tab-prevent')).toContainText('Choice of analgesia');
  await expect(page.locator('#tab-prevent')).toContainText('Protect sleep');
});

test('Treatment + Medications carry off-label framing and the corrected doses', async ({
  page,
}) => {
  await start(page);
  await page.click('.tab-btn[data-tab="treatment"]');
  await expect(page.locator('#tab-treatment')).toContainText('Off-label');
  await page.click('.tab-btn[data-tab="meds"]');
  await expect(page.locator('#tab-meds')).toContainText('Not an order set');
  await expect(page.locator('#tab-meds')).toContainText('Dexmedetomidine');
  await expect(page.locator('#tab-meds')).not.toContainText('0.26 mg/kg/day');
});

test('Setup tab carries pediatric institution settings + approval roles', async ({ page }) => {
  await start(page);
  await page.click('.tab-btn[data-tab="setup"]');
  await expect(page.locator('#tab-setup')).toBeVisible();
  await expect(page.locator('#set-hospital')).toBeVisible();
  await expect(page.locator('#tab-setup')).toContainText('attending intensivist');
  await expect(page.locator('#tab-setup')).toContainText('Pediatric pharmacist');
});

test('Load example data populates a worked assessment with a positive result', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#child-context')).toContainText('Age 14 mo');
  await expect(page.locator('#screen-result')).toContainText('Positive');
  // the example fills every interactive tab, not just the screen
  await page.click('.tab-btn[data-tab="risk"]');
  await expect(page.locator('input[data-risk="benzo"]')).toBeChecked();
  await page.click('.tab-btn[data-tab="prevent"]');
  await expect(page.locator('input[data-prev="A"]')).toBeChecked();
  await page.click('.tab-btn[data-tab="export"]');
  await expect(page.locator('input[data-med="dexmed"]')).toBeChecked();
  await page.click('.tab-btn[data-tab="setup"]');
  await expect(page.locator('#set-hospital')).toHaveValue(/General Children/);
});

test('Prevention selections are wired and persist across reload', async ({ page }) => {
  await start(page, 36);
  await page.click('.tab-btn[data-tab="prevent"]');
  await page.locator('input[data-prev="E"]').check();
  await page.reload();
  await page.click('.tab-btn[data-tab="prevent"]');
  await expect(page.locator('input[data-prev="E"]')).toBeChecked();
});

test('structured references render as linked numbered lists with inline superscripts', async ({
  page,
}) => {
  await start(page);
  await expect(page.locator('#tab-screen .ref-list li')).toHaveCount(7);
  await expect(page.locator('#tab-screen .ref-list li a').first()).toHaveAttribute(
    'href',
    /doi\.org|pubmed/,
  );
  await expect(page.locator('#tab-screen .cite a').first()).toHaveText('1');
  await page.click('.tab-btn[data-tab="meds"]');
  await expect(page.locator('#tab-meds .ref-list li')).toHaveCount(9);
  await expect(page.locator('#tab-meds .cite a').first()).toHaveText(/\d/);
});

test('Autosave restores the assessment after a reload', async ({ page }) => {
  await start(page, 36);
  await setArousal(page, '0');
  const opts = nevers(page);
  for (let i = 0; i < 8; i++) await opts.nth(i).click();
  await expect(page.locator('#screen-result')).toContainText('Positive');
  await page.reload();
  await expect(page.locator('#workspace')).toBeVisible();
  await expect(page.locator('#screen-result')).toContainText('Positive');
});

test('New child clears the saved assessment', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await start(page, 36);
  await page.click('[data-act="reset"]'); // Edit child → profile gate (populated)
  await expect(page.locator('#prof-age')).toHaveValue('36');
  await page.click('.profile-actions [data-act="clearAll"]');
  await expect(page.locator('#prof-age')).toHaveValue('');
});

test('the workspace has a New child reset that returns to the picker', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await start(page, 36);
  await expect(page.locator('#workspace')).toBeVisible();
  await page.click('.pathway-bar [data-act="clearAll"]'); // reset from mid-assessment
  await expect(page.locator('#pathway-picker')).toBeVisible();
  await expect(page.locator('#workspace')).toBeHidden();
});

test('screen switching works both ways (to psCAM-ICU and back to CAPD)', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]'); // CAPD recommended, psCAM-ICU applicable
  await expect(page.locator('#pathway-name')).toHaveText('CAPD');
  await page.click('[data-act="switchScreen"][data-screen="pscam"]');
  await expect(page.locator('#pathway-name')).toHaveText('psCAM-ICU');
  // the switch back to CAPD must still be offered
  await expect(page.locator('[data-act="switchScreen"][data-screen="capd"]')).toBeVisible();
  await page.click('[data-act="switchScreen"][data-screen="capd"]');
  await expect(page.locator('#pathway-name')).toHaveText('CAPD');
});

test('CAM feature entries survive switching screens and back', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  await page.click('[data-act="switchScreen"][data-screen="pscam"]');
  await page.click('.tab-btn[data-tab="screen"]');
  await page.locator('label.pseg-opt:has([data-cam-judgment="f1"][value="yes"])').click();
  await page.click('[data-act="switchScreen"][data-screen="capd"]');
  await page.click('[data-act="switchScreen"][data-screen="pscam"]');
  await expect(page.locator('[data-cam-judgment="f1"][value="yes"]')).toBeChecked();
});

test('New child clears the sensory-aid checkboxes', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/peds/');
  await page.fill('#prof-age', '14');
  await page.check('[data-prof="glasses"]');
  await page.click('[data-act="deriveScreen"]');
  await page.click('.pathway-bar [data-act="clearAll"]');
  await expect(page.locator('[data-prof="glasses"]')).not.toBeChecked();
});

test('an unchecked profile-derived risk factor stays unchecked across reload', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]'); // 14mo -> "young age" auto-flagged
  await page.click('.tab-btn[data-tab="risk"]');
  await expect(page.locator('#tab-risk input[data-risk="age"]')).toBeChecked();
  await page.uncheck('#tab-risk input[data-risk="age"]');
  await page.reload();
  await page.click('.tab-btn[data-tab="risk"]');
  await expect(page.locator('#tab-risk input[data-risk="age"]')).not.toBeChecked();
});

test('Edit child then re-derive keeps the recorded arousal', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]'); // arousal RASS 0
  await page.click('.tab-btn[data-tab="screen"]');
  await expect(page.locator('input[data-screen-input="arousal"][value="0"]')).toBeChecked();
  await page.click('[data-act="reset"]'); // Edit child
  await page.click('[data-act="deriveScreen"]'); // re-derive
  await page.click('.tab-btn[data-tab="screen"]');
  await expect(page.locator('input[data-screen-input="arousal"][value="0"]')).toBeChecked();
});

test('skip-link targets the workspace once a child is loaded, the picker on reset', async ({
  page,
}) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/peds/');
  await expect(page.locator('#skip-link')).toHaveAttribute('href', '#pathway-picker');
  await page.click('[data-act="loadExample"]');
  await expect(page.locator('#skip-link')).toHaveAttribute('href', '#workspace');
  await page.click('.pathway-bar [data-act="clearAll"]');
  await expect(page.locator('#skip-link')).toHaveAttribute('href', '#pathway-picker');
});

test('loading the example asks before replacing an in-progress assessment', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]'); // fresh — no prompt
  await expect(page.locator('#workspace')).toBeVisible();
  await page.click('[data-act="reset"]'); // Edit child → picker (assessment still in state)
  let asked = false;
  page.once('dialog', (d) => {
    asked = true;
    d.accept();
  });
  await page.click('[data-act="loadExample"]'); // now guarded
  expect(asked).toBe(true);
});

test('the active tab is restored after a reload', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  await page.click('.tab-btn[data-tab="prevent"]');
  await expect(page.locator('.tab-btn[data-tab="prevent"]')).toHaveClass(/active/);
  await page.reload();
  await expect(page.locator('.tab-btn[data-tab="prevent"]')).toHaveClass(/active/);
});

test('importing a wrong-shape file shows an error instead of failing silently', async ({
  page,
}) => {
  await page.goto('/peds/');
  let alerted = '';
  page.on('dialog', (d) => {
    alerted = d.message();
    d.accept();
  });
  page.on('filechooser', (fc) =>
    fc.setFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"not":"a peds assessment"}'),
    }),
  );
  await page.click('[data-act="importJSON"]');
  await page.waitForTimeout(400);
  expect(alerted).toContain("isn't a saved pediatric assessment");
});

test('Documents tab lists medications given and generates a PDF', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  await page.click('.tab-btn[data-tab="export"]');
  await expect(page.locator('#meds-given')).toContainText('Dexmedetomidine');
  expect(await page.locator('#meds-given input[data-med]').count()).toBe(7);
  await expect(page.locator('#meds-given input[data-med="dexmed"]')).toBeChecked();
  // the assessment time is seeded to now and the filename is timestamped
  await expect(page.locator('#peds-assessed')).not.toHaveValue('');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-act="generateReport"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^pediatric-delirium-summary_\d{4}-\d{2}-\d{2}_\d{4}\.pdf$/,
  );
});

test('accessibility options apply and persist (text size, contrast, motion)', async ({ page }) => {
  await page.goto('/peds/');
  await expect(page.locator('.a11y-panel')).toBeHidden();
  await page.click('.a11y-btn');
  await expect(page.locator('.a11y-panel')).toBeVisible();
  await page.click('.a11y-seg-opt[data-a11y-text="xl"]');
  await page.check('#a11y-contrast');
  await page.check('#a11y-motion');
  await expect(page.locator('html')).toHaveAttribute('data-text', 'xl');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-text', 'xl');
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
});

test('the peds tabs are an ARIA tablist with arrow-key navigation', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  await expect(page.locator('.tabs-inner')).toHaveAttribute('role', 'tablist');
  const first = page.locator('.tab-btn[data-tab="screen"]');
  await expect(first).toHaveAttribute('role', 'tab');
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.tab-btn[data-tab="risk"]')).toBeFocused();
  await expect(page.locator('.tab-btn[data-tab="risk"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#tab-risk')).toBeVisible();
});

test('the peds checklist tabs show completion-count badges', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  await expect(page.locator('.tab-btn[data-tab="risk"] .tab-badge')).toBeVisible();
  await expect(page.locator('.tab-btn[data-tab="prevent"] .tab-badge')).toBeVisible();
  await expect(page.locator('.tab-btn[data-tab="export"] .tab-badge')).toHaveText('2');
});

test('age entered in years round-trips as years after reload', async ({ page }) => {
  await page.goto('/peds/');
  await page.fill('#prof-age', '3');
  await page.selectOption('#prof-age-unit', 'y'); // 3 years
  await page.click('[data-act="deriveScreen"]');
  await page.reload();
  await expect(page.locator('#prof-age')).toHaveValue('3');
  await expect(page.locator('#prof-age-unit')).toHaveValue('y');
});

test('glasses or hearing aids default the sensory-aids prevention item on', async ({ page }) => {
  await page.goto('/peds/');
  await page.fill('#prof-age', '36');
  await page.check('[data-prof="glasses"]');
  await page.click('[data-act="deriveScreen"]');
  await page.click('.tab-btn[data-tab="prevent"]');
  await expect(page.locator('[data-prev="sensory"]')).toBeChecked();
});

test('peds acronyms get a glossary tooltip on first use', async ({ page }) => {
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  const ab = page.locator('#tab-screen abbr', { hasText: 'CAPD' }).first();
  await expect(ab).toHaveAttribute('title', /Cornell Assessment of Pediatric Delirium/);
});

test('no horizontal overflow at extreme accessibility settings (largest text on a phone)', async ({
  page,
}) => {
  await page.addInitScript(
    (v) => localStorage.setItem('deliriumtool:a11y', v),
    JSON.stringify({ text: 'xl', contrast: 'high', motion: 'reduce' }),
  );
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/peds/');
  await page.click('[data-act="loadExample"]');
  const tabs = await page
    .locator('.tab-btn[data-tab]')
    .evaluateAll((els) => els.map((e) => e.dataset.tab));
  for (const t of tabs) {
    await page.click(`.tab-btn[data-tab="${t}"]`);
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(over, `horizontal overflow on the ${t} tab`).toBeLessThanOrEqual(2);
  }
});

test('the assessment generates a report PDF with a de-identified filename', async ({ page }) => {
  // Include a pCAM picture-task answer so the report's picture-results path runs.
  await start(page, 84);
  await page.click('[data-act="switchScreen"][data-screen="pcam"]');
  await setArousal(page, '0');
  await camYes(page, 'f1');
  await page.locator('.cam-pic-opt[data-cam-pic="f2"][data-idx="0"][data-ans="new"]').click();
  await page.locator('input[data-cam-pic-performed="f2"]').check();
  await page.click('.tab-btn[data-tab="export"]');
  const download = page.waitForEvent('download');
  await page.click('[data-act="generateReport"]');
  expect((await download).suggestedFilename()).toMatch(/pediatric-delirium-summary/);
});

test('profile screen has no serious a11y violations (labeled unit selects, contrast)', async ({
  page,
}) => {
  await page.goto('/peds/');
  // Reveal the developmental-age row so both unit <select>s are in scope.
  await page.selectOption('#prof-baseline', 'impaired');
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  expect(serious.map((v) => v.id).join(','), JSON.stringify(serious, null, 2)).toBe('');
});

test('marking a CAM error keeps keyboard focus on the control', async ({ page }) => {
  await start(page, 84); // 7 yr → CAPD recommended, pCAM offered
  await page.click('[data-act="switchScreen"][data-screen="pcam"]');
  await setArousal(page, '0');
  await camYes(page, 'f1'); // Feature 1 present → Feature 2 error chips appear
  const chip = page.locator('.errchip[data-cam-err="f2"][data-idx="0"]');
  await chip.focus();
  await chip.press('Enter'); // toggles the error and rebuilds the feature list
  await expect(page.locator('.errchip[data-cam-err="f2"][data-idx="0"]')).toBeFocused();
});

test('pCAM Feature 2 offers the memory-pictures task; either task can score inattention', async ({
  page,
}) => {
  await start(page, 84); // 7 yr → pCAM offered
  await page.click('[data-act="switchScreen"][data-screen="pcam"]');
  await setArousal(page, '0');
  await camYes(page, 'f1'); // Feature 1 present → Feature 2 tasks appear

  const f2 = page.locator('.cam-feat', { has: page.locator('.cam-pic') });
  // Both tasks are offered under Feature 2: the letters and the picture alternative.
  await expect(f2.locator('.errchip[data-cam-err="f2"]')).toHaveCount(10);
  await expect(f2.locator('.cam-pic-memory .cam-pic-cell')).toHaveCount(5);
  await expect(f2.locator('.cam-pic-pad .cam-pic-row')).toHaveCount(10);

  // Call three memory pictures "New" — three recognition errors (indices 0, 2, 3
  // are memory pictures, whose truth is "seen").
  for (const idx of [0, 2, 3]) {
    await page
      .locator(`.cam-pic-opt[data-cam-pic="f2"][data-idx="${idx}"][data-ans="new"]`)
      .click();
  }
  await page.locator('input[data-cam-pic-performed="f2"]').check();
  await expect(f2.locator('.cam-perf').last()).toContainText('3 errors');
  // Feature 2 resolves present from the picture task alone (letters never run).
  await expect(f2.locator('.feat-verdict').last()).toHaveClass(/fv-pos/);
});

test('pCAM Feature 2 present modal shows pictures large and records Seen/New into the task', async ({
  page,
}) => {
  await start(page, 84);
  await page.click('[data-act="switchScreen"][data-screen="pcam"]');
  await setArousal(page, '0');
  await camYes(page, 'f1');

  // "Present to child" opens the modal at the memory phase.
  await page.click('.cam-pic-present');
  const modal = page.locator('.cam-modal-box');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Memorize — 1 of 5');
  // Step through the five memory pictures into recognition.
  for (let i = 0; i < 5; i++) await modal.locator('[data-present-nav="1"]').click();
  await expect(modal).toContainText('Recognition — 1 of 10');
  // The open dialog is accessible.
  const axe = await new AxeBuilder({ page }).include('.cam-modal').analyze();
  expect(
    axe.violations.filter((v) => ['serious', 'critical'].includes(v.impact)).map((v) => v.id),
  ).toEqual([]);
  // Picking an answer records it and auto-advances to the next picture.
  await modal.locator('[data-present-ans="new"]').click();
  await expect(modal).toContainText('Recognition — 2 of 10');
  // Esc closes; the pick is reflected on the inline recognition pad.
  await page.keyboard.press('Escape');
  await expect(page.locator('.cam-modal-box')).toBeHidden();
  await expect(
    page.locator('.cam-pic-opt[data-cam-pic="f2"][data-idx="0"][data-ans="new"]'),
  ).toHaveAttribute('aria-pressed', 'true');

  // Tapping a recognition picture opens the modal at that picture (pos 7 = 3rd).
  await page.locator('.cam-pic-artbtn[data-pos="7"]').click();
  await expect(page.locator('.cam-modal-box')).toContainText('Recognition — 3 of 10');
});

test('present modal fits a landscape phone without scrolling (picture beside controls)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 740, height: 360 });
  await start(page, 84);
  await page.click('[data-act="switchScreen"][data-screen="pcam"]');
  await setArousal(page, '0');
  await camYes(page, 'f1');
  await page.click('.cam-pic-present');
  for (let i = 0; i < 5; i++) await page.locator('[data-present-nav="1"]').click();
  const box = page.locator('.cam-modal-box');
  await expect(box).toContainText('Recognition — 1 of 10');
  // Nothing scrolls, and every control sits within the viewport.
  const fit = await page.evaluate(() => {
    const b = document.querySelector('.cam-modal-box');
    const inView = (sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
    };
    return {
      boxScrolls: b.scrollHeight > b.clientHeight + 1,
      head: inView('.cam-modal-head'),
      art: inView('.cam-modal-art'),
      choose: inView('.cam-modal-choose'),
      nav: inView('.cam-modal-nav'),
    };
  });
  expect(fit).toEqual({ boxScrolls: false, head: true, art: true, choose: true, nav: true });
});

test('applicable screens are offered as a clear labelled switch in the header', async ({ page }) => {
  await start(page, 84); // 7 yr → CAPD recommended, pCAM-ICU offered
  const alts = page.locator('#screen-alts');
  await expect(alts).toContainText('Other screens:');
  const sw = alts.locator('[data-act="switchScreen"][data-screen="pcam"]');
  await expect(sw).toBeVisible();
  await expect(sw).toHaveText(/Switch to pCAM-ICU/);
  await sw.click();
  await expect(page.locator('#pathway-name')).toHaveText('pCAM-ICU');
  // The picture task (with its Present-to-child modal) is now reachable.
  await expect(page.locator('.cam-pic-present')).toBeVisible();
});

test('editing the child to a different age clears stale instrument answers', async ({ page }) => {
  await start(page, 8); // 8 mo → CAPD
  await setArousal(page, '0');
  await page
    .locator('#capd-items label.pseg-opt', { has: page.locator('input[value="4"]') })
    .first()
    .click();
  await expect(page.locator('#capd-items input[value="4"]').first()).toBeChecked();
  await page.click('[data-act="reset"]'); // Edit child — back to the profile form
  await page.fill('#prof-age', '20'); // a different child (still CAPD)
  await page.click('[data-act="deriveScreen"]');
  await expect(page.locator('#capd-items input[value="4"]').first()).not.toBeChecked();
});
