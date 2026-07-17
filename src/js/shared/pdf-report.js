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

/**
 * Bedside identification strip: a row of labelled fields laid out left-to-right
 * (wrapping as needed), closed by a hairline. A field with a `value` is filled
 * (ink); a field without one draws a blank underline of width `blankW` to be
 * handwritten at the bedside — so the de-identified tool never has to hold a
 * name or room. fields: [{ label, value?, blankW? }]. Returns y below.
 */
export function idBlock(doc, y, fields, ctx) {
  const { M, W, scale } = ctx;
  const gap = 16 * scale;
  const lineH = 15 * scale;
  const maxX = W - M;
  doc.setFontSize(8.7 * scale);
  let x = M;
  let yy = y + 11 * scale;
  for (const f of fields) {
    const labelText = `${f.label}: `;
    const lw = doc.setFont('helvetica', 'bold').getTextWidth(labelText);
    const filled = f.value != null && f.value !== '';
    const vw = filled
      ? doc.setFont('helvetica', 'normal').getTextWidth(String(f.value))
      : (f.blankW || 120) * scale;
    if (x + lw + vw > maxX && x > M) {
      x = M;
      yy += lineH;
    }
    doc
      .setFont('helvetica', 'bold')
      .setTextColor(...SEC)
      .text(labelText, x, yy);
    if (filled) {
      doc
        .setFont('helvetica', 'normal')
        .setTextColor(...INK)
        .text(ascii(String(f.value)), x + lw, yy);
    } else {
      doc
        .setDrawColor(184, 192, 202)
        .setLineWidth(0.6 * scale)
        .line(x + lw, yy + 1.5 * scale, x + lw + vw, yy + 1.5 * scale);
    }
    x += lw + vw + gap;
  }
  yy += 8 * scale;
  doc
    .setDrawColor(224, 230, 236)
    .setLineWidth(0.8 * scale)
    .line(M, yy, W - M, yy);
  return yy + 11 * scale;
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
 * A small status pill (soft-tinted rounded rect + coloured dot + uppercase label)
 * in a verdict tone, drawn with its top-left at (x, yTop). Returns { w, h } so the
 * caller can place text beside it. Tones match statusBanner.
 */
export function statusChip(doc, x, yTop, tone, text, ctx) {
  const { scale } = ctx;
  const c = TONES[tone] || TONES.pending;
  const label = String(text).toUpperCase();
  doc.setFont('helvetica', 'bold').setFontSize(7.2 * scale);
  const tw = doc.getTextWidth(label);
  const dot = 3.4 * scale;
  const padX = 5 * scale;
  const h = 11.5 * scale;
  const w = padX + dot + 3.5 * scale + tw + padX;
  doc.setFillColor(...lighten(c, 0.8)).roundedRect(x, yTop, w, h, 2.2 * scale, 2.2 * scale, 'F');
  doc.setFillColor(...c).circle(x + padX + dot / 2, yTop + h / 2, dot / 2, 'F');
  doc
    .setTextColor(...darken(c, 0.12))
    .setFont('helvetica', 'bold')
    .setFontSize(7.2 * scale)
    .text(label, x + padX + dot + 3.5 * scale, yTop + h - 3.4 * scale);
  return { w, h };
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

const WF_TONE = { navy: NAVY, rust: AMBER, plum: PURPLE, green: GREEN, teal: TEAL, azure: INDIGO };

/**
 * Draw a numbered screen -> gate -> score/confirm -> act workflow on the current
 * page (call doc.addPage first). stages: [{ n, head, tone, lines:[{text}] }]; an
 * optional `script` checklist prints under a slate band. Returns y below.
 */
export function drawWorkflow(doc, opts, ctx) {
  const { M, W, scale } = ctx;
  let y = reportHeader(doc, {
    facility: opts.facility,
    title: opts.title,
    sub: opts.sub,
    accent: opts.accent || TEAL,
    W,
    M,
    scale,
  });
  y += 10 * scale;
  for (const s of opts.stages) {
    const c = WF_TONE[s.tone] || TEAL;
    const bandH = 19 * scale;
    doc.setFillColor(...lighten(c, 0.62)).rect(M, y, W - 2 * M, bandH, 'F');
    doc.setFillColor(...c).circle(M + 13 * scale, y + bandH / 2, 7.5 * scale, 'F');
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(9.5 * scale)
      .setTextColor(255, 255, 255)
      .text(String(s.n), M + 13 * scale, y + bandH / 2 + 3.3 * scale, { align: 'center' });
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(10.5 * scale)
      .setTextColor(...darken(c, 0.2))
      .text(ascii(s.head), M + 28 * scale, y + bandH / 2 + 3.5 * scale);
    y += bandH + 7 * scale;
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(9 * scale)
      .setTextColor(...INK);
    for (const ln of s.lines) {
      const lines = doc.splitTextToSize(ascii('•  ' + ln.text), W - 2 * M - 12 * scale);
      doc.text(lines, M + 12 * scale, y);
      y += lines.length * 12 * scale + 2.5 * scale;
    }
    y += 9 * scale;
  }
  if (opts.script && opts.script.length) {
    y = sectionBar(doc, y, opts.scriptTitle || 'Hand-off', NAVY, ctx);
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(9 * scale)
      .setTextColor(...INK);
    opts.script.forEach((it, i) => {
      const lines = doc.splitTextToSize(ascii(`${i + 1}.  ${it.text}`), W - 2 * M);
      doc.text(lines, M, y);
      y += lines.length * 12 * scale + 2.5 * scale;
    });
    y += 8 * scale;
  }
  if (opts.footer) y = disclaimer(doc, y, opts.footer, ctx);
  return y;
}
