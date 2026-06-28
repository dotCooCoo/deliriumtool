// Build step: produce ./dist, the directory Wrangler serves.
//
// Full build (modular source under src/): esbuild bundles src/js and src/styles
// into content-hashed files under dist/assets/ (so any change busts the browser
// cache), copies the vendored libraries, rewrites index.html to point at the
// hashed filenames, and copies the security-headers file. Output is self-contained
// and also works offline from file:// (assets are referenced relatively).

import { existsSync } from 'node:fs';
import { rm, mkdir, copyFile, cp, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const assets = join(dist, 'assets');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

await mkdir(assets, { recursive: true });
const esbuild = await import('esbuild');

const js = await esbuild.build({
  entryPoints: { app: join(src, 'js', 'main.js') },
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
  entryPoints: { app: join(src, 'styles', 'app.css') },
  bundle: true,
  minify: true,
  entryNames: '[name]-[hash]',
  assetNames: '[name]-[hash]',
  outdir: assets,
  metafile: true,
});

const pick = (meta, ext) =>
  basename(Object.keys(meta.outputs).find((f) => f.endsWith(ext) && !f.endsWith('.map')));
const jsName = pick(js.metafile, '.js');
const cssName = pick(css.metafile, '.css');

// Point the entry document at the content-hashed bundles (relative paths so the
// built dist/ also opens from file://).
let html = await readFile(join(src, 'index.html'), 'utf8');
html = html
  .replaceAll('./assets/app.js', `./assets/${jsName}`)
  .replaceAll('./assets/app.css', `./assets/${cssName}`);
await writeFile(join(dist, 'index.html'), html);

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
];
await mkdir(join(dist, 'img'), { recursive: true });
for (const name of rootImages) {
  const file = join(src, 'img', name);
  if (existsSync(file)) await copyFile(file, join(dist, 'img', name));
}
if (existsSync(join(src, 'site.webmanifest'))) {
  await copyFile(join(src, 'site.webmanifest'), join(dist, 'site.webmanifest'));
}

console.log(`Built src/ -> dist/  (${jsName}, ${cssName})`);
