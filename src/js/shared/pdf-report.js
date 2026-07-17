/**
 * shared/pdf-report.js — structured-document primitives for the bedside PDF
 * summaries (pediatric src/js/peds/report.js and ED src/js/ed/report.js), so the
 * two tools produce documents in the same visual language as the adult report
 * (src/js/pdf.js): a white masthead with a facility eyebrow + accent bar, pastel
 * section bands in the shared section-family palette, a colour-coded result
 * banner, key/value rows, bullet lists, a references block, and a disclaimer.
 *
 * Every draw helper takes a `ctx` of { M, W, scale } (left/right margin, page
 * width, and the shrink-to-fit scale) and returns the y-cursor after what it drew,
 * so a builder threads y straight down the page. Pagination is left to fitToPages,
 * which rebuilds at smaller scales until the document fits one page.
 */
import { lighten, darken, asciiPdf as ascii } from './pdf-kit.js';

export { fitToPages, stampFooter, asciiPdf } from './pdf-kit.js';

// Neutrals + the adult tool's muted section-family palette (src/js/pdf.js).
const INK = [31, 42, 48];
const SEC = [92, 107, 116];
const TEAL = [47, 117, 124];
const CRIM = [164, 80, 90];
const AMBER = [160, 106, 56];
const INDIGO = [82, 98, 140];
const GREEN = [70, 122, 92];
const PURPLE = [106, 90, 140];
const NAVY = [58, 71, 83];

export const RC = { INK, SEC, TEAL, CRIM, AMBER, INDIGO, GREEN, PURPLE, NAVY };

// Result-banner tones keyed to the tools' verdict classes: a positive screen
// (delirium present) reads as attention (crimson); a negative screen reassures
// (green); unable/borderline is amber; an incomplete assessment is slate.
const TONES = { pos: CRIM, neg: GREEN, warn: AMBER, cog: AMBER, pending: [96, 107, 120] };

/**
 * White masthead: facility eyebrow (accent, uppercase), document title, an
 * optional sub-line, and a full-width accent bar. Returns the y below it.
 */
export function reportHeader(doc, { facility, title, sub, accent = TEAL, W, M, scale = 1 }) {
  doc.setFillColor(255, 255, 255).rect(0, 0, W, 54 * scale, 'F');
  doc
    .setFont('helvetica', 'bold')
    .setFontSize(7.2 * scale)
    .setTextColor(...accent)
    .text(String(facility || '').toUpperCase(), M, 18 * scale);
  doc
    .setFontSize(15 * scale)
    .setTextColor(...INK)
    .text(ascii(title), M, 33 * scale);
  if (sub) {
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(8 * scale)
      .setTextColor(...SEC)
      .text(ascii(sub), M, 45 * scale);
  }
  doc.setFillColor(...accent).rect(0, 52 * scale, W, 2.4 * scale, 'F');
  return 68 * scale;
}

/** Pastel section band in a family colour, dark same-hue title. Returns y below. */
export function sectionBar(doc, y, text, rgb, ctx) {
  const { M, W, scale } = ctx;
  const h = 17 * scale;
  doc.setFillColor(...lighten(rgb, 0.62)).rect(M, y, W - 2 * M, h, 'F');
  doc
    .setFont('helvetica', 'bold')
    .setFontSize(9.5 * scale)
    .setTextColor(...darken(rgb, 0.2))
    .text(ascii(text), M + 7 * scale, y + 12 * scale);
  return y + h + 11 * scale;
}

/** Label (secondary) + wrapped value (ink) row. Returns y below the taller of the two. */
export function kvRow(doc, y, label, value, ctx, { labelW = 132 } = {}) {
  const { M, W, scale } = ctx;
  const vx = M + labelW * scale;
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(10 * scale)
    .setTextColor(...SEC)
    .text(ascii(String(label)), M, y);
  const wrapped = doc.setTextColor(...INK).splitTextToSize(ascii(String(value)), W - M - vx);
  doc.text(wrapped, vx, y);
  return y + Math.max(15 * scale, wrapped.length * 12 * scale + 3 * scale);
}

/**
 * Colour-coded result callout: a soft-tinted rounded panel with a left accent
 * stripe, a bold verdict line, and an optional detail line. Returns y below.
 */
export function statusBanner(doc, y, { tone, label, detail }, ctx) {
  const { M, W, scale } = ctx;
  const c = TONES[tone] || TONES.pending;
  const cw = W - 2 * M;
  const padX = 13 * scale;
  const innerW = cw - padX - 10 * scale;
  const labelLines = doc
    .setFont('helvetica', 'bold')
    .setFontSize(11 * scale)
    .splitTextToSize(ascii(label || ''), innerW);
  const detailLines = detail
    ? doc
        .setFont('helvetica', 'normal')
        .setFontSize(9 * scale)
        .splitTextToSize(ascii(detail), innerW)
    : [];
  const h =
    11 * scale +
    labelLines.length * 13.5 * scale +
    (detailLines.length ? 3 * scale + detailLines.length * 11.5 * scale : 0) +
    9 * scale;
  doc.setFillColor(...lighten(c, 0.85)).roundedRect(M, y, cw, h, 3 * scale, 3 * scale, 'F');
  doc.setFillColor(...c).rect(M, y, 4 * scale, h, 'F');
  let ty = y + 22 * scale;
  doc
    .setFont('helvetica', 'bold')
    .setFontSize(11 * scale)
    .setTextColor(...darken(c, 0.15))
    .text(labelLines, M + padX, ty);
  ty += labelLines.length * 13.5 * scale;
  if (detailLines.length) {
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(9 * scale)
      .setTextColor(...INK)
      .text(detailLines, M + padX, ty + 2 * scale);
  }
  return y + h + 13 * scale;
}

/**
 * Bullet list. cols:2 lays a short list column-major (single line each) to use the
 * right half; cols:1 wraps each item full width (for longer items). Returns y below.
 */
export function bullets(doc, y, items, ctx, { cols = 2 } = {}) {
  const { M, W, scale } = ctx;
  if (!items.length) return y;
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(9.5 * scale)
    .setTextColor(...INK);
  if (cols === 1) {
    let yy = y;
    for (const t of items) {
      const lines = doc.splitTextToSize(ascii('•  ' + t), W - 2 * M);
      doc.text(lines, M, yy);
      yy += lines.length * 12.5 * scale + 2 * scale;
    }
    return yy + 3 * scale;
  }
  const colW = (W - 2 * M) / cols;
  const rows = Math.ceil(items.length / cols);
  items.forEach((t, i) => {
    const col = Math.floor(i / rows);
    const r = i % rows;
    doc.text(ascii('•  ' + t), M + col * colW, y + r * 14 * scale);
  });
  return y + rows * 14 * scale + 4 * scale;
}

/** Free paragraph of body text (ink). Returns y below. */
export function paragraph(doc, y, text, ctx, { size = 9.5 } = {}) {
  const { M, W, scale } = ctx;
  const lines = doc
    .setFont('helvetica', 'normal')
    .setFontSize(size * scale)
    .setTextColor(...INK)
    .splitTextToSize(ascii(String(text)), W - 2 * M);
  doc.text(lines, M, y);
  return y + lines.length * (size + 3) * scale + 4 * scale;
}

/** Numbered references block under a slate section band. entries: [{ c, u }]. */
export function refsBlock(doc, y, entries, ctx) {
  const { M, W, scale } = ctx;
  if (!entries.length) return y;
  y = sectionBar(doc, y, 'References', NAVY, ctx);
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(7.5 * scale)
    .setTextColor(...SEC);
  entries.forEach((e, i) => {
    const line = `${i + 1}. ${ascii(e.c)}${e.u ? '  ' + e.u : ''}`;
    const lines = doc.splitTextToSize(line, W - 2 * M);
    doc.text(lines, M, y, { lineHeightFactor: 1.15 });
    y += lines.length * 8.9 * scale + 3 * scale;
  });
  return y + 6 * scale;
}

/** Hairline + italic disclaimer. Returns y below. */
export function disclaimer(doc, y, text, ctx) {
  const { M, W, scale } = ctx;
  doc
    .setDrawColor(220, 236, 234)
    .setLineWidth(1)
    .line(M, y, W - M, y);
  y += 13 * scale;
  const lines = doc
    .setFont('helvetica', 'italic')
    .setFontSize(8 * scale)
    .setTextColor(...SEC)
    .splitTextToSize(ascii(text), W - 2 * M);
  doc.text(lines, M, y);
  return y + lines.length * 10 * scale;
}
