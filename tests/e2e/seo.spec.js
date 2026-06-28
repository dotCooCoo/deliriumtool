// SEO/crawlability guarantees: the robots + sitemap files serve, and the home page
// carries its core search + social metadata.
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
