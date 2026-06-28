// SEO/crawlability guarantees: the robots + sitemap files serve, and the home page
// carries its core search + social metadata.
/* global window */
import { test, expect } from '@playwright/test';

test('robots.txt serves and references the sitemap', async ({ request }) => {
  const r = await request.get('/robots.txt');
  expect(r.status()).toBe(200);
  const body = await r.text();
  expect(body).toMatch(/Allow: \//);
  expect(body).toContain('Sitemap: https://deliriumtool.com/sitemap.xml');
});

test('sitemap.xml serves and lists the canonical URL', async ({ request }) => {
  const r = await request.get('/sitemap.xml');
  expect(r.status()).toBe(200);
  expect(await r.text()).toContain('<loc>https://deliriumtool.com/</loc>');
});

test('home page carries core SEO + social tags and a single h1', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://deliriumtool.com/',
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /CAM-ICU/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /og-image\.png$/,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  );
  await expect(page.locator('h1')).toHaveCount(1);
});

test('home page exposes valid JSON-LD with no CSP violation', async ({ page }) => {
  await page.addInitScript(() => {
    window.__csp = [];
    window.addEventListener('securitypolicyviolation', (e) => {
      window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  await page.goto('/');
  const ld = page.locator('script[type="application/ld+json"]');
  await expect(ld).toHaveCount(1);
  const data = JSON.parse(await ld.textContent());
  expect(data['@type']).toBe('WebApplication');
  expect(data.url).toBe('https://deliriumtool.com/');
  // A data block must not trip script-src (it is not executed).
  const cspHits = await page.evaluate(() => window.__csp.filter((v) => /script-src/.test(v)));
  expect(cspHits).toEqual([]);
});
