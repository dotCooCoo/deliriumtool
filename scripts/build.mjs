// Build step: produce ./dist, the directory Wrangler serves.
//
// Full build (modular source under src/): esbuild bundles src/js and src/styles
// into content-hashed files under dist/assets/ (so any change busts the browser
// cache), copies the vendored libraries, rewrites index.html to point at the
// hashed filenames, and copies the security-headers file. Output is self-contained
// and also works offline from file:// (assets are referenced relatively).

import { existsSync } from 'node:fs';
import { rm, mkdir, readdir, copyFile, cp, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const assets = join(dist, 'assets');

// Reset the output dir. On a Dropbox/OneDrive-synced checkout the folder handle is
// occasionally held by the sync client, which makes removing the directory itself
// fail; fall back to emptying its contents so the build still produces fresh,
// correctly-hashed output (CI builds on a clean checkout, so this only matters
// locally). esbuild then overwrites into the reused directory.
async function resetDir(dir) {
  try {
    await rm(dir, { recursive: true, force: true });
  } catch {
    for (const entry of await readdir(dir).catch(() => [])) {
      await rm(join(dir, entry), { recursive: true, force: true }).catch(() => {});
    }
  }
  await mkdir(dir, { recursive: true });
}

await resetDir(dist);
await mkdir(assets, { recursive: true });
const esbuild = await import('esbuild');

const js = await esbuild.build({
  entryPoints: {
    app: join(src, 'js', 'main.js'),
    peds: join(src, 'js', 'peds', 'main.js'),
    templates: join(src, 'js', 'templates', 'main.js'),
    ed: join(src, 'js', 'ed', 'main.js'),
  },
  bundle: true,
  format: 'iife',
  minify: true,
  sourcemap: true,
  target: ['es2020'],
  entryNames: '[name]-[hash]',
  assetNames: '[name]-[hash]',
  outdir: assets,
  metafile: true,
});

const css = await esbuild.build({
  entryPoints: {
    app: join(src, 'styles', 'app.css'),
    peds: join(src, 'styles', 'peds.css'),
    templates: join(src, 'styles', 'templates.css'),
    ed: join(src, 'styles', 'ed.css'),
  },
  bundle: true,
  minify: true,
  entryNames: '[name]-[hash]',
  assetNames: '[name]-[hash]',
  outdir: assets,
  metafile: true,
});

// Map a named esbuild entry to its content-hashed output basename.
const outName = (meta, name, ext) =>
  basename(
    Object.keys(meta.outputs).find(
      (f) => basename(f).startsWith(`${name}-`) && f.endsWith(ext) && !f.endsWith('.map'),
    ),
  );
const jsName = outName(js.metafile, 'app', '.js');
const cssName = outName(css.metafile, 'app', '.css');
const pedsJsName = outName(js.metafile, 'peds', '.js');
const pedsCssName = outName(css.metafile, 'peds', '.css');
const tplJsName = outName(js.metafile, 'templates', '.js');
const tplCssName = outName(css.metafile, 'templates', '.css');
const edJsName = outName(js.metafile, 'ed', '.js');
const edCssName = outName(css.metafile, 'ed', '.css');

// Rewrite each entry document's asset placeholders to the content-hashed names.
// Relative paths keep the built dist/ working from file://; the pediatric page
// lives at /peds/ so it references ../assets/ and layers peds.css over app.css.
async function emitPage(srcRel, outRel, subs) {
  let h = await readFile(join(src, srcRel), 'utf8');
  for (const [from, to] of subs) h = h.replaceAll(from, to);
  await mkdir(dirname(join(dist, outRel)), { recursive: true });
  await writeFile(join(dist, outRel), h);
}
await emitPage('index.html', 'index.html', [
  ['./assets/app.js', `./assets/${jsName}`],
  ['./assets/app.css', `./assets/${cssName}`],
]);
await emitPage('peds/index.html', 'peds/index.html', [
  ['../assets/peds.js', `../assets/${pedsJsName}`],
  ['../assets/peds.css', `../assets/${pedsCssName}`],
  ['../assets/app.css', `../assets/${cssName}`],
]);
await emitPage('templates/index.html', 'templates/index.html', [
  ['../assets/templates.js', `../assets/${tplJsName}`],
  ['../assets/templates.css', `../assets/${tplCssName}`],
  ['../assets/app.css', `../assets/${cssName}`],
]);
await emitPage('ed/index.html', 'ed/index.html', [
  ['../assets/ed.js', `../assets/${edJsName}`],
  ['../assets/ed.css', `../assets/${edCssName}`],
  ['../assets/app.css', `../assets/${cssName}`],
]);

if (existsSync(join(src, 'vendor'))) {
  await cp(join(src, 'vendor'), join(assets, 'vendor'), { recursive: true });
}
if (existsSync(join(src, '_headers'))) {
  await copyFile(join(src, '_headers'), join(dist, '_headers'));
}

// Root static assets: the icons referenced by index.html / the manifest, and the
// manifest itself. (The large source logos in src/img are not shipped.)
const rootImages = [
  'favicon-16.png',
  'favicon-32.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'og-image.png',
  'logo.png',
  // Pediatric-tool branding (derived from logo.png) so /peds/ has its own tab
  // icon, saved/installed icon, and social card.
  'peds-favicon-16.png',
  'peds-favicon-32.png',
  'peds-apple-touch-icon.png',
  'peds-icon-192.png',
  'peds-icon-512.png',
  'peds-og-image.png',
  // Template-designer branding (derived from logo-dark.png) so /templates/ has
  // its own tab icon, installed icon, and social card.
  'logo-dark.png',
  'templates-favicon-16.png',
  'templates-favicon-32.png',
  'templates-apple-touch-icon.png',
  'templates-icon-192.png',
  'templates-icon-512.png',
  'templates-og-image.png',
  'logo-red.png',
  'ed-favicon-16.png',
  'ed-favicon-32.png',
  'ed-apple-touch-icon.png',
  'ed-icon-192.png',
  'ed-icon-512.png',
  'ed-og-image.png',
];
await mkdir(join(dist, 'img'), { recursive: true });
for (const name of rootImages) {
  const file = join(src, 'img', name);
  if (existsSync(file)) await copyFile(file, join(dist, 'img', name));
}
// Root files served verbatim: the PWA manifest and the crawler files.
for (const name of ['site.webmanifest', 'robots.txt', 'sitemap.xml']) {
  if (existsSync(join(src, name))) await copyFile(join(src, name), join(dist, name));
}
// The pediatric tool has its own manifest so installing from /peds/ gives a
// pediatric app (its own name, theme, and start_url) rather than the adult one.
if (existsSync(join(src, 'peds', 'site.webmanifest'))) {
  await copyFile(join(src, 'peds', 'site.webmanifest'), join(dist, 'peds', 'site.webmanifest'));
}
// Likewise the template designer: installing from /templates/ gives its own app.
if (existsSync(join(src, 'ed', 'site.webmanifest'))) {
  await copyFile(join(src, 'ed', 'site.webmanifest'), join(dist, 'ed', 'site.webmanifest'));
}
if (existsSync(join(src, 'templates', 'site.webmanifest'))) {
  await copyFile(
    join(src, 'templates', 'site.webmanifest'),
    join(dist, 'templates', 'site.webmanifest'),
  );
}

console.log(`Built src/ -> dist/  (${jsName}, ${cssName})`);
