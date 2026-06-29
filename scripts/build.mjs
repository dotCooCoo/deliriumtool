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
  entryPoints: { app: join(src, 'js', 'main.js'), peds: join(src, 'js', 'peds', 'main.js') },
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
  entryPoints: { app: join(src, 'styles', 'app.css'), peds: join(src, 'styles', 'peds.css') },
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

console.log(`Built src/ -> dist/  (${jsName}, ${cssName})`);
