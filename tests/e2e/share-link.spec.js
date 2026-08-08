// A share link carries whatever wording the sender put in it, and the fragment
// is stripped from the address bar on load — so a recipient printing the sheet
// has nothing telling them a line is not the built-in, cited text. These tests
// pin the two things that make that visible: the marker on the sheet and the
// notice on the page. They also pin the failure case, because a link that will
// not decode used to render the previous design and look like it worked.
/* global document, window */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as ADULT from '../../src/js/templates/data/content.js';
import * as PEDS from '../../src/js/templates/data/peds-content.js';
import * as ED from '../../src/js/templates/data/ed-content.js';
import * as SD from '../../src/js/templates/data/stepdown-content.js';

const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const link = (cfg) => `/templates/#tpl=${enc({ v: 1, ...cfg })}`;

/** Every { id, <text-ish> } pair anywhere in a content module. */
function collectIds(node, out = new Map(), seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return out;
  seen.add(node);
  if (Array.isArray(node)) {
    node.forEach((n) => collectIds(n, out, seen));
    return out;
  }
  if (typeof node.id === 'string') {
    for (const key of ['text', 'head', 'word', 'label', 'title']) {
      if (typeof node[key] === 'string' && node[key].trim()) {
        out.set(node.id, node[key]);
        break;
      }
    }
  }
  Object.values(node).forEach((v) => collectIds(v, out, seen));
  return out;
}

const ALL_IDS = new Map([
  ...collectIds(ADULT),
  ...collectIds(PEDS),
  ...collectIds(ED),
  ...collectIds(SD),
]);

test.describe('a link that rewrites cited text', () => {
  test('substituted lines are marked and the footer stops crediting the sources', async ({
    page,
  }) => {
    await page.goto(
      link({
        template: 'rounding',
        textOverrides: {
          'np-clock': 'Remove clock and calendar to reduce agitation',
          'np-glasses': 'Glasses withheld overnight per unit protocol',
        },
      }),
    );
    const marked = page.locator('#sheets .sh-edited');
    await expect(marked).toHaveCount(2);
    await expect(marked.first()).toContainText('†');
    // Neither built-in line survives, so neither may pass as cited text.
    await expect(page.locator('#sheets')).not.toContainText('Clock and calendar visible');

    const feet = await page.locator('#sheets .sh-foot').count();
    await expect(page.locator('#sheets .sh-foot-edit')).toHaveCount(feet);
    await expect(page.locator('#sheets .sh-foot-edit').first()).toContainText(
      'not the cited source text',
    );
  });

  test('an untouched sheet carries no marker and no footnote', async ({ page }) => {
    await page.goto('/templates/');
    await expect(page.locator('#sheets .sh-edited')).toHaveCount(0);
    await expect(page.locator('#sheets .sh-foot-edit')).toHaveCount(0);
    await expect(page.locator('#sheets')).toContainText('Clock and calendar visible');
  });

  // The marker rides on a branded string; a transform that returns a plain
  // string drops it silently. Rather than trust that every path was found by
  // reading the code, override every id the content modules define and assert
  // nothing substituted reaches the page unmarked.
  for (const template of [
    'rounding',
    'spa',
    'peds-cards',
    'peds-workflow',
    'ed-cards',
    'ed-workflow',
    'stepdown-cards',
    'stepdown-workflow',
  ]) {
    test(`no substituted text renders unmarked on ${template}`, async ({ page }) => {
      const textOverrides = {};
      for (const id of ALL_IDS.keys()) textOverrides[id] = `ZQX ${id}`;
      await page.goto(link({ template, textOverrides, showDoses: true }));
      await page.waitForLoadState('networkidle');

      const unmarked = await page.evaluate(() => {
        const out = [];
        const walk = document.createTreeWalker(
          document.getElementById('sheets'),
          window.NodeFilter.SHOW_TEXT,
        );
        for (let n = walk.nextNode(); n; n = walk.nextNode()) {
          if (!n.nodeValue.includes('ZQX')) continue;
          if (!n.parentElement.closest('.sh-edited')) out.push(n.nodeValue.trim().slice(0, 80));
        }
        return out;
      });
      const rendered = await page.evaluate(() =>
        document.getElementById('sheets').innerText.includes('ZQX'),
      );
      expect(rendered, 'the overrides actually reached the sheet').toBeTruthy();
      expect(unmarked, 'substituted text rendered without the marker').toEqual([]);
    });
  }

  test('unit-added lines and sections are marked too', async ({ page }) => {
    await page.goto(
      link({
        template: 'rounding',
        custom: { 'np-reorient': ['Call the delirium champion'] },
        customSections: [
          { id: 'cs-1', page: 1, title: 'Local escalation', lines: ['Page ICU fellow'] },
        ],
      }),
    );
    await expect(page.locator('#sheets .sh-edited')).toHaveCount(2);
    await expect(page.locator('#sheets .sh-foot-edit').first()).toBeVisible();
  });

  test('the marker and footnote do not follow the notice into print', async ({ page }) => {
    await page.goto(
      link({ template: 'rounding', textOverrides: { 'np-clock': 'Remove the clock' } }),
    );
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('#link-notice')).toBeHidden();
    await expect(page.locator('#sheets .sh-edited').first()).toBeVisible();
    await expect(page.locator('#sheets .sh-foot-edit').first()).toBeVisible();
  });
});

test.describe('where a configuration came from', () => {
  test('a link that edits lines is disclosed with a matching count', async ({ page }) => {
    await page.goto(
      link({
        template: 'rounding',
        textOverrides: { 'np-clock': 'Remove the clock', 'np-glasses': 'No glasses' },
      }),
    );
    const notice = page.locator('#link-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('2 lines were edited or added');
    await expect(notice).toContainText('dagger');
    await notice.getByRole('button', { name: 'Dismiss' }).click();
    await expect(notice).toBeHidden();
  });

  test('a link with no edits says so rather than implying some', async ({ page }) => {
    await page.goto(link({ template: 'spa', facility: 'St Probe General' }));
    const notice = page.locator('#link-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('Every clinical line is the built-in text');
  });

  test('an ordinary visit shows no notice', async ({ page }) => {
    await page.goto('/templates/');
    await expect(page.locator('#link-notice')).toBeHidden();
  });
});

test.describe('a damaged link', () => {
  test('the designer says the link failed instead of showing the saved design', async ({
    page,
  }) => {
    const good = enc({ v: 1, template: 'spa', facility: 'Sender General' });
    await page.goto(`/templates/#tpl=${good}`);
    await expect(page.locator('#sheets')).toContainText('Sender General');

    await page.goto(`/templates/#tpl=${good.slice(0, good.length - 10)}`);
    const notice = page.locator('#link-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toHaveClass(/is-error/);
    await expect(notice).toContainText('damaged');
    // The autosaved design from the good link renders — and is not passed off
    // as the damaged one.
    await expect(page.locator('#sheets')).toContainText('Sender General');
  });

  test('the adult tool says a damaged setup link was not applied', async ({ page }) => {
    const good = enc({ v: 1, pathway: 'full', settings: {}, meds: null });
    await page.goto(`/#cfg=${good.slice(0, good.length - 8)}`);
    const notice = page.locator('#link-notice');
    await expect(notice).toBeVisible();
    await expect(notice).toHaveClass(/is-error/);
    await expect(notice).toContainText('damaged');
  });

  test('the adult tool discloses a setup link that did apply', async ({ page }) => {
    await page.goto(`/#cfg=${enc({ v: 1, pathway: 'full', settings: {}, meds: null })}`);
    await expect(page.locator('#link-notice')).toContainText('shared setup link');
    await expect(page.locator('#link-notice')).not.toHaveClass(/is-error/);
  });
});

// A share link pasted into the address bar of an already-open tool changes only
// the fragment, so the page does not reload — the link used to do nothing at all.
test.describe('a link pasted while the tool is already open', () => {
  test('the designer applies it', async ({ page }) => {
    await page.goto('/templates/');
    await expect(page.locator('#sheets')).toContainText('Clock and calendar visible');
    await page.goto(
      link({ template: 'rounding', textOverrides: { 'np-clock': 'Remove the clock' } }),
    );
    await expect(page.locator('#sheets .sh-edited')).toHaveCount(1);
    await expect(page.locator('#link-notice')).toContainText('one line was edited');
  });

  test('the adult tool applies it without discarding the assessment', async ({ page }) => {
    await page.goto('/');
    await page.goto(`/#cfg=${enc({ v: 1, pathway: 'full', settings: {}, meds: null })}`);
    await expect(page.locator('#link-notice')).toContainText('shared setup link');
    await expect(page.locator('#workspace')).toBeVisible();
  });
});

// The notice is the only thing standing between a recipient and a sheet whose
// wording is not the built-in text, so it has to survive an axe scan in both
// tones — including the contrast of its own text on its own background.
test.describe('the notice itself is accessible', () => {
  const serious = (r) =>
    r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');

  test('in its caution tone on the designer', async ({ page }) => {
    await page.goto(
      link({ template: 'rounding', textOverrides: { 'np-clock': 'Remove the clock' } }),
    );
    await expect(page.locator('#link-notice')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('#link-notice').analyze();
    expect(
      serious(results)
        .map((v) => v.id)
        .join(', '),
    ).toBe('');
  });

  test('in its error tone on the adult tool', async ({ page }) => {
    const good = enc({ v: 1, pathway: 'full', settings: {}, meds: null });
    await page.goto(`/#cfg=${good.slice(0, good.length - 8)}`);
    await expect(page.locator('#link-notice.is-error')).toBeVisible();
    const results = await new AxeBuilder({ page }).include('#link-notice').analyze();
    expect(
      serious(results)
        .map((v) => v.id)
        .join(', '),
    ).toBe('');
  });
});
