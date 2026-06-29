/**
 * gen-sprite.mjs — generate each page's inline SVG icon sprite from the vendored
 * Font Awesome Free package, so the sprites are not hand-maintained. Edit the icon
 * lists below and run `npm run icons`; it rewrites the `<svg class="sprite">…</svg>`
 * block in each page in place. Icons are inlined (no runtime request, CSP-safe).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FA = path.join(ROOT, 'node_modules/@fortawesome/fontawesome-free/svgs');
const STYLES = ['solid', 'regular', 'brands'];

// Icons each page uses, by Font Awesome name (the sprite id is `fa-<name>`).
const PAGES = [
  {
    file: 'src/index.html',
    icons: [
      'arrow-up-right-from-square',
      'ban',
      'bolt',
      'brain',
      'circle-check',
      'clipboard-list',
      'diagram-project',
      'download',
      'file-pdf',
      'gear',
      'github',
      'hospital',
      'leaf',
      'magnifying-glass',
      'minus',
      'pills',
      'print',
      'triangle-exclamation',
      'xmark',
    ],
  },
  {
    file: 'src/peds/index.html',
    icons: [
      'baby',
      'child-reaching',
      'brain',
      'magnifying-glass',
      'gauge-high',
      'triangle-exclamation',
      'circle-exclamation',
      'circle-check',
      'circle-info',
      'leaf',
      'moon',
      'people-group',
      'hand-holding-heart',
      'heart',
      'bed-pulse',
      'pills',
      'capsules',
      'clipboard-check',
      'file-pdf',
      'gear',
      'arrow-left',
      'chevron-right',
      'xmark',
      'syringe',
      'github',
    ],
  },
];

function readIcon(name) {
  for (const style of STYLES) {
    const p = path.join(FA, style, `${name}.svg`);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  throw new Error(`Font Awesome icon not found: ${name}`);
}

function symbolFor(name) {
  const svg = readIcon(name);
  const viewBox = /viewBox="([^"]+)"/.exec(svg)[1];
  const d = [...svg.matchAll(/<path[^>]*\bd="([^"]+)"/g)].map((m) => m[1]).join(' ');
  return `      <symbol id="fa-${name}" viewBox="${viewBox}"><path fill="currentColor" d="${d}" /></symbol>`;
}

for (const { file, icons } of PAGES) {
  const abs = path.join(ROOT, file);
  const html = fs.readFileSync(abs, 'utf8');
  // Match the sprite <svg …class="sprite"…> … </svg> (class may sit anywhere in
  // the tag), keeping its opening tag and any <defs> wrapper.
  const rx = /(<svg[^>]*\bclass="[^"]*\bsprite\b[^"]*"[^>]*>)([\s\S]*?)(<\/svg>)/;
  const m = rx.exec(html);
  if (!m || !m[2].includes('<symbol')) {
    console.error(`No sprite block found in ${file}`);
    process.exit(1);
  }
  const symbols = icons.map(symbolFor).join('\n');
  const inner = m[2].includes('<defs')
    ? `\n      <defs>\n${symbols}\n      </defs>\n    `
    : `\n${symbols}\n    `;
  fs.writeFileSync(abs, html.replace(rx, m[1] + inner + m[3]));
  console.log(`Regenerated ${icons.length} icons in ${file}`);
}
