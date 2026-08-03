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

// Codegen: a trimmed evidence dataset for the tool pages' evidence popovers —
// statements, status, each source's citation + stance, and the synthesis, WITHOUT
// the full verbatim paragraphs (those stay on /evidence, one click away). Keeps the
// /templates bundle light (~0.6 MB vs ~3 MB for the full claim data). Regenerated
// on every build so it cannot drift from src/js/evidence/data.json.
{
  const full = JSON.parse(await readFile(join(src, 'js', 'evidence', 'data.json'), 'utf8'));
  const lite = full.claims.map((c) => ({
    id: c.id,
    toolId: c.toolId,
    section: c.section || '',
    statement: c.statement,
    status: c.status,
    synthesis: c.synthesis || '',
    discrepancy: !!c.discrepancy,
    perSource: (c.perSource || []).map((e) => ({
      label: e.label || '',
      cite: e.cite || '',
      stance: e.stance || 'background',
      note: e.note || '',
      docUrl: e.docUrl || '',
      passages: (e.paragraphs || []).length,
    })),
    links: c.links || [],
    sources: c.sources || [],
    citations: c.citations || [],
    notes: c.notes || '',
  }));
  await writeFile(join(src, 'js', 'evidence', 'claims-lite.json'), JSON.stringify(lite));
}

const esbuild = await import('esbuild');

const js = await esbuild.build({
  entryPoints: {
    app: join(src, 'js', 'main.js'),
    peds: join(src, 'js', 'peds', 'main.js'),
    templates: join(src, 'js', 'templates', 'main.js'),
    ed: join(src, 'js', 'ed', 'main.js'),
    stepdown: join(src, 'js', 'stepdown', 'main.js'),
    evidence: join(src, 'js', 'evidence', 'main.js'),
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
    stepdown: join(src, 'styles', 'stepdown.css'),
    evidence: join(src, 'styles', 'evidence.css'),
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
const stepdownJsName = outName(js.metafile, 'stepdown', '.js');
const stepdownCssName = outName(css.metafile, 'stepdown', '.css');
const evJsName = outName(js.metafile, 'evidence', '.js');
const evCssName = outName(css.metafile, 'evidence', '.css');

// The cross-tool header nav is generated here from one list so every page
// carries the same links in the same order, with aria-current marking the page
// being viewed. Hrefs are relative so dist/ keeps working from file://.
const TOOLS = [
  { key: 'adult', dir: '', label: 'Adult ICU' },
  { key: 'stepdown', dir: 'stepdown/', label: 'Step-Down' },
  { key: 'peds', dir: 'peds/', label: 'Pediatric' },
  { key: 'ed', dir: 'ed/', label: 'ED' },
  { key: 'templates', dir: 'templates/', label: 'Templates' },
];
function toolNav(currentKey) {
  const up = currentKey === 'adult' ? './' : '../';
  const links = TOOLS.map((t) => {
    const href = t.key === currentKey ? './' : `${up}${t.dir}`;
    const current = t.key === currentKey ? ' aria-current="page"' : '';
    return `<a href="${href}"${current}>${t.label}</a>`;
  }).join('');
  return `<nav class="tool-nav" aria-label="Delirium tools">${links}</nav>`;
}

// Rewrite each entry document's asset placeholders to the content-hashed names
// and expand the <!--#tool-nav--> marker into the shared header nav.
// Relative paths keep the built dist/ working from file://; the pediatric page
// lives at /peds/ so it references ../assets/ and layers peds.css over app.css.
// The FontAwesome icon sprite is authored once (src/partials/icon-sprite.html) and
// injected into every page at its <!--#sprite--> marker, so no page can omit or
// drift an icon. It stays inline (not an external sprite.svg) to satisfy the strict
// self-only CSP and keep the built site working offline / from file://.
const iconSprite = (await readFile(join(src, 'partials', 'icon-sprite.html'), 'utf8')).trim();

async function emitPage(srcRel, outRel, subs) {
  let h = await readFile(join(src, srcRel), 'utf8');
  for (const [from, to] of subs) h = h.replaceAll(from, to);
  h = h.replaceAll('<!--#sprite-->', iconSprite);
  await mkdir(dirname(join(dist, outRel)), { recursive: true });
  await writeFile(join(dist, outRel), h);
}
await emitPage('index.html', 'index.html', [
  ['./assets/app.js', `./assets/${jsName}`],
  ['./assets/app.css', `./assets/${cssName}`],
  ['<!--#tool-nav-->', toolNav('adult')],
]);
await emitPage('peds/index.html', 'peds/index.html', [
  ['../assets/peds.js', `../assets/${pedsJsName}`],
  ['../assets/peds.css', `../assets/${pedsCssName}`],
  ['../assets/app.css', `../assets/${cssName}`],
  ['<!--#tool-nav-->', toolNav('peds')],
]);
await emitPage('templates/index.html', 'templates/index.html', [
  ['../assets/templates.js', `../assets/${tplJsName}`],
  ['../assets/templates.css', `../assets/${tplCssName}`],
  ['../assets/app.css', `../assets/${cssName}`],
  ['<!--#tool-nav-->', toolNav('templates')],
]);
await emitPage('ed/index.html', 'ed/index.html', [
  ['../assets/ed.js', `../assets/${edJsName}`],
  ['../assets/ed.css', `../assets/${edCssName}`],
  ['../assets/app.css', `../assets/${cssName}`],
  ['<!--#tool-nav-->', toolNav('ed')],
]);
await emitPage('stepdown/index.html', 'stepdown/index.html', [
  ['../assets/stepdown.js', `../assets/${stepdownJsName}`],
  ['../assets/stepdown.css', `../assets/${stepdownCssName}`],
  ['../assets/app.css', `../assets/${cssName}`],
  ['<!--#tool-nav-->', toolNav('stepdown')],
]);
await emitPage('evidence/index.html', 'evidence/index.html', [
  ['../assets/evidence.js', `../assets/${evJsName}`],
  ['../assets/evidence.css', `../assets/${evCssName}`],
  ['../assets/app.css', `../assets/${cssName}`],
  ['<!--#tool-nav-->', toolNav('evidence')],
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
  // Step-down / progressive-care branding (derived from logo-purple.png) so
  // /stepdown/ has its own tab icon, installed icon, and social card.
  'logo-purple.png',
  'stepdown-favicon-16.png',
  'stepdown-favicon-32.png',
  'stepdown-apple-touch-icon.png',
  'stepdown-icon-192.png',
  'stepdown-icon-512.png',
  'stepdown-og-image.png',
];
await mkdir(join(dist, 'img'), { recursive: true });
for (const name of rootImages) {
  const file = join(src, 'img', name);
  if (existsSync(file)) await copyFile(file, join(dist, 'img', name));
}
// Root files served verbatim: the PWA manifest and the crawler files.
for (const name of [
  'site.webmanifest',
  'robots.txt',
  'sitemap.xml',
  '404.html',
  '404.css',
  'settings.json',
]) {
  if (existsSync(join(src, name))) await copyFile(join(src, name), join(dist, name));
}
// The pediatric tool has its own manifest so installing from /peds/ gives a
// pediatric app (its own name, theme, and start_url) rather than the adult one.
if (existsSync(join(src, 'peds', 'site.webmanifest'))) {
  await copyFile(join(src, 'peds', 'site.webmanifest'), join(dist, 'peds', 'site.webmanifest'));
}
// Likewise the ED tool and the template designer: installing from /ed/ or
// /templates/ gives its own app.
if (existsSync(join(src, 'ed', 'site.webmanifest'))) {
  await copyFile(join(src, 'ed', 'site.webmanifest'), join(dist, 'ed', 'site.webmanifest'));
}
if (existsSync(join(src, 'templates', 'site.webmanifest'))) {
  await copyFile(
    join(src, 'templates', 'site.webmanifest'),
    join(dist, 'templates', 'site.webmanifest'),
  );
}
if (existsSync(join(src, 'stepdown', 'site.webmanifest'))) {
  await copyFile(
    join(src, 'stepdown', 'site.webmanifest'),
    join(dist, 'stepdown', 'site.webmanifest'),
  );
}

console.log(`Built src/ -> dist/  (${jsName}, ${cssName})`);
