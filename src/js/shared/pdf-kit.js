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
