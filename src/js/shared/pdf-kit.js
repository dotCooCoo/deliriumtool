/**
 * shared/pdf-kit.js — primitives shared by the adult (src/js/pdf.js) and pediatric
 * (src/js/peds/report.js) PDF builders, so the shrink-to-fit and glyph handling
 * live in one place.
 *
 * fitToPages rebuilds a jsPDF document at progressively smaller scales until it
 * fits within maxPages — page count is the reliable fit signal across Node and
 * the browser, and it self-corrects as content changes. asciiPdf maps the few
 * Unicode glyphs the app uses to the WinAnsi set jsPDF's built-in Helvetica can
 * render.
 */
export function fitToPages(mkDoc, build, { scales = [1, 0.95, 0.9, 0.85], maxPages = 1 } = {}) {
  let doc;
  for (const scale of scales) {
    doc = mkDoc();
    build(doc, scale);
    if (doc.internal.getNumberOfPages() <= maxPages) break; // fits (last scale wins regardless)
  }
  return doc;
}

export const asciiPdf = (s) =>
  String(s).replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[−–]/g, '-').replace(/≈/g, '~');

// Tint a section-family RGB toward white (header bands) or toward black (text).
export function lighten(rgb, f) {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * f),
    Math.round(rgb[1] + (255 - rgb[1]) * f),
    Math.round(rgb[2] + (255 - rgb[2]) * f),
  ];
}
export function darken(rgb, f) {
  return [Math.round(rgb[0] * (1 - f)), Math.round(rgb[1] * (1 - f)), Math.round(rgb[2] * (1 - f))];
}

// Stamp "Page X of N" (right) and an optional generation timestamp (left) on the
// footer of every page, after the document is fully built.
export function stampFooter(doc, { generated, margin = 54 } = {}) {
  const n = doc.internal.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(7).setTextColor(150, 150, 160);
    doc.text(`Page ${i} of ${n}`, W - margin, H - 14, { align: 'right' });
    if (generated) doc.text(`Generated ${generated}`, margin, H - 14, { align: 'left' });
  }
}
