/**
 * templates/pdf.js — "Save as PDF" for the bedside templates, generated in the
 * browser with jsPDF (no server, no data egress). It consumes the same content
 * data and customization state as the on-screen sheets, so the PDF cannot
 * carry different clinical values — only the layout engine differs. If a
 * heavily customized sheet outgrows its page, the whole document rebuilds at a
 * smaller scale until both pages fit.
 */
import { jsPDF, AcroFormCheckBox, AcroFormTextField } from 'jspdf';
import {
  TEMPLATES,
  RASS_ROWS,
  RASS_TARGETS,
  RASS_ZONES,
  STATUS,
  MNEMONIC,
  NONPHARM,
  PHARM,
  MEDS_SECTION,
  MED_TONES,
  PATHWAY,
  SPA_COLS,
  SPA_DEEPER,
  ESCALATION,
  FOOTER_CITES,
  SHEET_DISCLAIMER,
} from './data/content.js';
import { MEDS } from '../data/meds.js';
import { DELIRIUM_REFS } from '../data/refs.js';
import { isOn } from './state.js';
import { medDisplayName, medMosaicSpec } from './sheets.js';
import { asciiPdf } from '../shared/pdf-kit.js';

const TONE = {
  ink: [26, 38, 48],
  teal: [31, 110, 121],
  plum: [74, 50, 104],
  rust: [156, 79, 15],
  green: [45, 107, 67],
  red: [139, 30, 47],
  slate: [68, 85, 96],
  navy: [39, 75, 143],
  violet: [123, 45, 142],
  berry: [160, 44, 94],
  azure: [15, 94, 138],
  olive: [92, 102, 27],
};
const WEAK = {
  ink: [236, 240, 243],
  teal: [212, 237, 239],
  plum: [232, 226, 245],
  rust: [252, 235, 216],
  green: [212, 237, 224],
  red: [247, 226, 230],
  slate: [242, 246, 248],
  navy: [227, 235, 250],
  violet: [243, 229, 247],
  berry: [250, 227, 238],
  azure: [221, 238, 248],
  olive: [238, 240, 218],
};
const SUB = [160, 184, 196];
const M = 18; // page margin (pt)
// jsPDF built-in font family — set per document from the chosen print font.
let FONT = 'helvetica';

// jsPDF's built-in Helvetica is WinAnsi — map the few glyphs outside it.
const pd = (s) =>
  asciiPdf(String(s))
    .replace(/‑/g, '-')
    .replace(/₂/g, '2')
    .replace(/↓/g, 'decreased ')
    .replace(/→/g, '->')
    .replace(/☐/g, '')
    .replace(/✓/g, '');

const ov = (state, id, fallback) => state.textOverrides[id] || fallback;
const secOn = (state, id) => isOn(state.sections, id);
const itemOn = (state, id) => isOn(state.items, id);
const rassTargetDef = (state) =>
  RASS_TARGETS.find((t) => t.id === state.rassTarget) || RASS_TARGETS[1];

/** Cursor-based page painter with overflow detection for the fit loop. */
class Painter {
  constructor(doc, k, padByPage) {
    this.doc = doc;
    this.k = k; // global type scale
    this.overflowed = false;
    this.W = doc.internal.pageSize.getWidth();
    this.H = doc.internal.pageSize.getHeight();
    this.cw = this.W - 2 * M;
    this.seq = 0; // unique AcroForm field names within this document
    // Slack-to-padding, mirroring the sheet: line gaps stretch by a per-page
    // factor chosen after a measurement pass, so the page fills like the DOM.
    this.padByPage = padByPage || {};
    this.gapUnits = {}; // pad-scalable points drawn per page (at factor 1)
    this.bottoms = {}; // content bottom per page (before the footer)
  }
  page() {
    return this.doc.internal.getCurrentPageInfo().pageNumber;
  }
  padK() {
    return this.padByPage[this.page()] || 1;
  }
  /** A pad-scalable gap: records its base size and returns the scaled gap. */
  padGap(base) {
    const pg = this.page();
    this.gapUnits[pg] = (this.gapUnits[pg] || 0) + base;
    return base * this.padK();
  }
  /** Builders call this with the final content y of the page. */
  endPage(y) {
    this.bottoms[this.page()] = y;
  }
  /** Interactive checkbox over a drawn check square — the saved PDF is fillable. */
  fieldBox(x, y, size) {
    try {
      const cb = new AcroFormCheckBox();
      cb.fieldName = `chk_${++this.seq}`;
      cb.Rect = [x, y, size, size];
      cb.appearanceState = 'Off';
      cb.showWhenPrinted = true;
      this.doc.addField(cb);
    } catch {
      /* AcroForm unavailable — the drawn square still prints */
    }
  }
  /** Interactive text field over a write-in blank. */
  fieldText(x, y, w, h) {
    try {
      const tf = new AcroFormTextField();
      tf.fieldName = `txt_${++this.seq}`;
      tf.Rect = [x, y, w, h];
      tf.fontSize = Math.min(9, h * 0.7);
      tf.showWhenPrinted = true;
      this.doc.addField(tf);
    } catch {
      /* non-fatal */
    }
  }
  fs(n) {
    return n * this.k;
  }
  wrap(text, width, size, bold = false) {
    // Measure with the same face/weight the text will be drawn in.
    this.doc.setFont(FONT, bold ? 'bold' : 'normal').setFontSize(this.fs(size));
    return this.doc.splitTextToSize(pd(text), width);
  }
  text(str, x, y, { size = 8, bold = false, color = TONE.ink, align } = {}) {
    this.doc
      .setFont(FONT, bold ? 'bold' : 'normal')
      .setFontSize(this.fs(size))
      .setTextColor(...color);
    this.doc.text(pd(str), x, y, align ? { align } : undefined);
  }
  box(x, y, size, color = TONE.ink) {
    this.doc.setDrawColor(...color).setLineWidth(0.9);
    this.doc.rect(x, y, size, size);
    this.fieldBox(x, y, size);
  }
  /** Round check mark (RASS rows) — same shape as the on-screen circles. */
  circleBox(x, y, size, color = TONE.ink) {
    this.doc.setDrawColor(...color).setLineWidth(0.9);
    this.doc.circle(x + size / 2, y + size / 2, size / 2, 'S');
    this.fieldBox(x, y, size);
  }
  band(y, label, tone) {
    const h = this.fs(13);
    this.doc.setFillColor(...TONE[tone]).rect(M, y, this.cw, h, 'F');
    this.text(label.toUpperCase(), M + 6, y + h - this.fs(3.6), {
      size: 8.5,
      bold: true,
      color: [255, 255, 255],
    });
    return y + h + this.padGap(this.fs(3));
  }
  /** Medication type grows a little with the pad factor (mirrors the sheet). */
  medGrowK() {
    return Math.min(1.12, 1 + (this.padK() - 1) * 0.12);
  }
  /** One check-off line, wrapped; returns the new y. */
  checkLine(x, y, w, str, { size = 7.2, color = TONE.ink } = {}) {
    const bs = this.fs(Math.min(6.4, size * 0.9));
    const lines = this.wrap(str, w - bs - 4, size);
    this.box(x, y - bs + 1, bs, color);
    this.doc
      .setFont(FONT, 'normal')
      .setFontSize(this.fs(size))
      .setTextColor(...TONE.ink);
    this.doc.text(lines, x + bs + 3.5, y);
    return y + lines.length * this.fs(size) * 1.18 + this.padGap(this.fs(1.6));
  }
  bulletLine(x, y, w, str, { size = 7.2, prefix = '• ' } = {}) {
    const lines = this.wrap(`${prefix}${str}`, w, size);
    this.doc
      .setFont(FONT, 'normal')
      .setFontSize(this.fs(size))
      .setTextColor(...TONE.ink);
    this.doc.text(lines, x, y);
    return y + lines.length * this.fs(size) * 1.18 + this.padGap(this.fs(1.6));
  }
  footer(state, page, pages) {
    // The footer is fixed page chrome — it does not scale with the content.
    const saved = this.k;
    this.k = 1;
    const y = this.H - M + 6;
    this.doc.setDrawColor(200, 216, 223).setLineWidth(0.5);
    this.doc.line(M, y - 8, this.W - M, y - 8);
    const t = TEMPLATES.find((x) => x.id === state.template) || TEMPLATES[0];
    const src = (FOOTER_CITES[state.template] || [])
      .map((kk) => (DELIRIUM_REFS[kk] ? DELIRIUM_REFS[kk].l : ''))
      .filter(Boolean)
      .join(' · ');
    const stamp = [state.docRev.trim(), state.docDate.trim()].filter(Boolean).join(' · ');
    const leftW = 165;
    const leftLabel = this.wrap(
      `${state.facility.trim() || 'Your facility'} · ${t.name}`,
      leftW,
      6.2,
      true,
    )[0];
    // The revision/date stamp sits on its own line under the facility label.
    this.text(leftLabel, M, stamp ? y - 3.5 : y, {
      size: 6.2,
      bold: true,
      color: TONE.slate,
    });
    if (stamp) this.text(stamp, M, y + 3, { size: 5.8, color: TONE.slate });
    // Centered between the left label and the page number; the size steps
    // down until the disclaimer + sources actually fit that span.
    const center = pd(`${SHEET_DISCLAIMER} · Sources: ${src}`);
    const avail = this.W - 2 * M - (leftW + 10) - 48;
    this.doc.setFont(FONT, 'normal');
    let size = 6.2;
    const width = (s) => {
      this.doc.setFontSize(s);
      return this.doc.getTextWidth(center);
    };
    while (size > 4.4 && width(size) > avail) size -= 0.2;
    this.text(center, M + leftW + 10 + avail / 2, y, {
      size,
      color: TONE.slate,
      align: 'center',
    });
    this.text(`Page ${page} of ${pages}`, this.W - M, y, {
      size: 6.2,
      color: TONE.slate,
      align: 'right',
    });
    this.k = saved;
  }
  guard(y) {
    if (y > this.H - M - 12) this.overflowed = true;
  }
}

/** Height of a titled card of check lines at the current pad factor. */
function measureGroupCard(p, w, { head, headBar, items, bullets, size = 7 }) {
  const pad = p.fs(4);
  const innerW = w - 2 * pad;
  const prefix = bullets === 'plain' ? '' : '• ';
  const headLines = p.wrap(headBar ? head : head.toUpperCase(), innerW, headBar ? 7.6 : 7.4, true);
  const barH = p.fs(4.2) + headLines.length * p.fs(7.6) * 1.18;
  let h = headBar ? barH + pad + p.fs(2.4) : pad + p.fs(5.4) + headLines.length * p.fs(8);
  for (const it of items) {
    const lines = p.wrap(
      bullets ? `${prefix}${it}` : it,
      innerW - (bullets ? 0 : p.fs(6.4) + 4),
      size,
    );
    h += lines.length * p.fs(size) * 1.18 + p.fs(1.6) * p.padK();
  }
  return h + pad * 0.7;
}

/** Measure-then-draw a titled card of check lines; returns its height. */
function drawGroupCard(p, x, y, w, opts) {
  const { tone, head, headBar, items, bullets, size = 7, minH = 0 } = opts;
  const pad = p.fs(4);
  const innerW = w - 2 * pad;
  const prefix = bullets === 'plain' ? '' : '• ';
  // Long category labels wrap instead of clipping at the card edge.
  const headLines = p.wrap(headBar ? head : head.toUpperCase(), innerW, headBar ? 7.6 : 7.4, true);
  const barH = p.fs(4.2) + headLines.length * p.fs(7.6) * 1.18;
  const h = Math.max(measureGroupCard(p, w, opts), minH);
  // frame
  p.doc
    .setFillColor(...WEAK[tone])
    .setDrawColor(...TONE[tone])
    .setLineWidth(0.7);
  p.doc.rect(x, y, w, h, 'FD');
  // heading
  let cy = y + pad + p.fs(5.4);
  if (headBar) {
    p.doc.setFillColor(...TONE[tone]).rect(x, y, w, barH, 'F');
    p.doc.setFont(FONT, 'bold').setFontSize(p.fs(7.6)).setTextColor(255, 255, 255);
    p.doc.text(headLines, x + pad, y + p.fs(7.6));
    cy = y + barH + pad + p.fs(2.4);
  } else {
    p.doc
      .setFont(FONT, 'bold')
      .setFontSize(p.fs(7.4))
      .setTextColor(...TONE[tone]);
    p.doc.text(headLines, x + pad, cy);
    cy += headLines.length * p.fs(8);
  }
  for (const it of items) {
    if (/^Action: _+$/.test(it)) {
      // Write-in line with an interactive text field instead of a check row.
      p.text('Action:', x + pad, cy, { size, bold: false, color: TONE.slate });
      const lx = x + pad + p.fs(24);
      p.doc.setDrawColor(...TONE[tone]).setLineWidth(0.6);
      p.doc.line(lx, cy + 1, x + w - pad, cy + 1);
      p.fieldText(lx, cy - p.fs(size), x + w - pad - lx, p.fs(size + 2));
      cy += p.fs(size) * 1.18 + p.padGap(p.fs(1.6));
      continue;
    }
    cy = bullets
      ? p.bulletLine(x + pad, cy, innerW, it, { size, prefix })
      : p.checkLine(x + pad, cy, innerW, it, { size, color: TONE[tone] });
  }
  return Math.max(h, cy - y + pad * 0.4);
}

/** A row of cards balanced to the tallest; returns the new y. */
function cardRow(p, y, cards, cols) {
  const gap = p.fs(4);
  const w = (p.cw - gap * (cols - 1)) / cols;
  // Equal-height rows like the sheet's grid: measure every card first.
  const rowH = Math.max(...cards.map((c) => measureGroupCard(p, w, c)));
  cards.forEach((c, i) => {
    drawGroupCard(p, M + i * (w + gap), y, w, { ...c, minH: rowH });
  });
  return y + rowH + p.padGap(p.fs(4));
}

function rassLines(state) {
  const target = rassTargetDef(state);
  return RASS_ROWS.map((r) => {
    const isTarget = target.scores.length > 0 && r.scores.every((s) => target.scores.includes(s));
    return {
      label: r.label,
      desc: r.desc,
      target: isTarget,
      zone: isTarget ? 'green' : RASS_ZONES[r.scores[0]] || 'ink',
      bold: isTarget,
    };
  });
}

/** "✓ TARGET" marker after a target row's description (ZapfDingbats check). */
function targetMark(p, x, y, size) {
  p.doc.setFont('zapfdingbats', 'normal').setFontSize(p.fs(size));
  p.doc.setTextColor(...TONE.green);
  p.doc.text('4', x, y);
  p.doc.setFont(FONT, 'bold').setFontSize(p.fs(size));
  p.doc.text('TARGET', x + p.fs(size) * 0.9, y);
}

function medCats(state) {
  return MEDS.categories
    .map((c) => ({
      label: c.label,
      tone: MED_TONES[c.id] || 'slate',
      names: c.items
        .filter((i) => state.meds[i.id])
        .map((i) => medDisplayName(i.name, state.showBrands)),
    }))
    .filter((c) => c.names.length);
}

/** Inline box+name pairs wrapping within a width; returns the height used. */
function drawInlineMeds(p, x, y, w, names, size, tone, dryRun) {
  const bs = p.fs(Math.min(6, size * 0.85));
  const gapX = p.fs(6);
  const lineH = p.fs(size) * 1.35;
  p.doc.setFont(FONT, 'normal').setFontSize(p.fs(size));
  let cx = x;
  let cy = y;
  for (const n of names) {
    const tw = p.doc.getTextWidth(pd(n));
    const itemW = bs + 3 + tw;
    if (cx + itemW > x + w && cx > x) {
      cx = x;
      cy += lineH;
    }
    if (!dryRun) {
      p.box(cx, cy - bs + 1, bs, TONE[tone]);
      p.doc
        .setFont(FONT, 'normal')
        .setFontSize(p.fs(size))
        .setTextColor(...TONE.ink);
      p.doc.text(pd(n), cx + bs + 3, cy);
    }
    cx += itemW + gapX;
  }
  return cy - y + lineH * 0.5;
}

/** Small warning triangle (red, white "!") beside a caution line. */
function warnTriangle(p, x, y, size) {
  p.doc.setFillColor(...TONE.red);
  p.doc.triangle(x, y + size, x + size / 2, y, x + size, y + size, 'F');
  p.doc
    .setFont(FONT, 'bold')
    .setFontSize(size * 0.72)
    .setTextColor(255, 255, 255);
  p.doc.text('!', x + size / 2, y + size - size * 0.16, { align: 'center' });
}

/** The Step-3 guidance card ("Reserve for severe distress…"); returns its height. */
function drawPharmCardAt(p, x, y, w, state) {
  const doc = p.doc;
  const rows = PHARM.rows.filter((r) => itemOn(state, r.id));
  const cautions = PHARM.cautions.filter((c) => itemOn(state, c.id));
  const pad = p.fs(5);
  const innerW = w - pad * 2;
  const leadLines = p.wrap(PHARM.lead, innerW, 8.8, true);
  const measure = () => {
    let h = pad + leadLines.length * p.fs(9) + p.fs(9);
    const all = [
      ...rows.map(
        (r) =>
          `${r.drug}: ${state.showDoses && r.dose ? `${r.dose} · ` : ''}${ov(state, r.id, r.text)}`,
      ),
      ...cautions.map((c) => ov(state, c.id, c.text)),
      ...(state.showDoses ? [PHARM.doseNote] : []),
    ];
    for (const s of all) h += p.wrap(s, innerW, 7).length * p.fs(7) * 1.2 + p.fs(2.4) * p.padK();
    return h + pad;
  };
  const cardH = measure() + p.fs(8);
  doc
    .setFillColor(...WEAK.rust)
    .setDrawColor(...TONE.rust)
    .setLineWidth(0.7);
  doc.rect(x, y, w, cardH, 'FD');
  let cy2 = y + pad + p.fs(7);
  doc
    .setFont(FONT, 'bold')
    .setFontSize(p.fs(8.8))
    .setTextColor(...TONE.red);
  doc.text(leadLines, x + pad, cy2);
  cy2 += leadLines.length * p.fs(8.5);
  const noteLines = p.wrap(PHARM.leadNote, innerW, 6.6);
  doc
    .setFont(FONT, 'normal')
    .setFontSize(p.fs(6.6))
    .setTextColor(...TONE.slate);
  doc.text(noteLines, x + pad, cy2);
  cy2 += noteLines.length * p.fs(7.6) + p.fs(2);
  for (const r of rows) {
    const body = `${state.showDoses && r.dose ? `${r.dose} · ` : ''}${ov(state, r.id, r.text)}`;
    const warnPad = r.warn ? p.fs(9) : 0;
    if (r.warn) warnTriangle(p, x + pad, cy2 - p.fs(5.6), p.fs(6.6));
    const lines = p.wrap(`${r.drug}: ${body}`, innerW - warnPad, 7);
    doc.setFont(FONT, r.warn ? 'bold' : 'normal').setFontSize(p.fs(7));
    doc.setTextColor(...(r.warn ? TONE.red : TONE.ink));
    doc.text(lines, x + pad + warnPad, cy2);
    cy2 += lines.length * p.fs(7) * 1.2 + p.padGap(p.fs(2.4));
  }
  for (const c of cautions) {
    const warnPad = c.stop ? p.fs(9) : 0;
    if (c.stop) warnTriangle(p, x + pad, cy2 - p.fs(5.6), p.fs(6.6));
    const lines = p.wrap(ov(state, c.id, c.text), innerW - warnPad, 7);
    doc.setFont(FONT, 'bold').setFontSize(p.fs(7));
    doc.setTextColor(...(c.stop ? TONE.red : TONE.ink));
    doc.text(lines, x + pad + warnPad, cy2);
    cy2 += lines.length * p.fs(7) * 1.2 + p.padGap(p.fs(2.4));
  }
  if (state.showDoses) {
    const lines = p.wrap(PHARM.doseNote, innerW, 6.4);
    doc
      .setFont(FONT, 'normal')
      .setFontSize(p.fs(6.4))
      .setTextColor(...TONE.slate);
    doc.text(lines, x + pad, cy2);
    cy2 += lines.length * p.fs(7.4);
  }
  return Math.max(cardH, cy2 - y);
}

/** Type tier for the medication grid — fewer selected agents print larger. */
function medDensity(cats) {
  const count = cats.reduce((a, c) => a + c.names.length, 0);
  if (count <= 30) return { cards: true, list: 8.4, cat: 8, labelW: 96, pad: 6 };
  if (count <= 60) return { list: 7.4, cat: 7, labelW: 86, pad: 5.5 };
  return { list: 6.8, cat: 6.6, labelW: 78, pad: 5 };
}

/**
 * Medication mosaic: colour cards greedily packed into the shortest column so
 * different-sized categories re-flow to fill the segment. Font size and
 * column count both follow the selection (medMosaicSpec); short selections
 * list one medication per line, dense ones wrap each card's list.
 * `startCol0` reserves column 0 from that y (used when the pharmacology
 * guidance card is pinned top-left). Returns the new y.
 */
function drawMedCards(p, x, y, w, cats, spec, startCol0 = null) {
  const gap = p.fs(4);
  const colWTarget = (spec.minColw ? Math.max(spec.colw, spec.minColw) : spec.colw) * 72;
  // Width decides how many columns fit; the content cap keeps a small
  // selection in a few full columns — the same rule as the sheet's
  // column-count cap (the unified cap counts the pinned guidance card).
  const contentCap = (startCol0 !== null ? spec.colsUnified : spec.cols) || 5;
  const cols = Math.max(
    startCol0 !== null ? 2 : 1,
    Math.min(5, Math.floor(w / colWTarget), contentCap),
  );
  const colW = (w - gap * (cols - 1)) / cols;
  const colY = Array(cols).fill(y);
  if (startCol0 !== null) colY[0] = startCol0;
  // Dense selections stop growing with the Large setting so the full catalog
  // keeps fitting (mirrors the sheet's --med-k cap); slack grows the type a
  // little, like the sheet's grow phase.
  const sizeEff =
    (spec.cls === 'dyn' ? spec.size * (Math.min(p.k, 1.04) / p.k) : spec.size) * p.medGrowK();
  for (const c of cats) {
    let ci = 0;
    for (let i = 1; i < cols; i++) if (colY[i] < colY[ci] - 0.5) ci = i;
    // One check-off line per medication (a drawn square beside every name).
    const h = drawGroupCard(p, x + ci * (colW + gap), colY[ci], colW, {
      tone: c.tone,
      head: c.label,
      headBar: true,
      items: c.names,
      bullets: false,
      size: sizeEff,
    });
    colY[ci] += h + gap;
    p.guard(colY[ci]);
  }
  return Math.max(...colY);
}

function drawMedsGrid(p, y, state, wOverride) {
  const cats = medCats(state);
  if (!cats.length) return y;
  const x = M;
  const w = wOverride || p.cw;
  const dz = medDensity(cats);
  p.text(MEDS_SECTION.head, x, y + p.fs(6), { size: 8.4, bold: true, color: TONE.red });
  y += p.fs(10);
  if (state.medLayout !== 'rows') {
    return drawMedCards(p, x, y, w, cats, medMosaicSpec(cats)) + p.fs(2);
  }
  const labelW = p.fs(dz.labelW);
  for (const c of cats) {
    const listX = x + labelW + p.fs(4);
    const listW = w - labelW - p.fs(10);
    const listH = drawInlineMeds(
      p,
      listX,
      y + p.fs(dz.cat + 0.6),
      listW,
      c.names,
      dz.list,
      c.tone,
      true,
    );
    const catLines = p.wrap(c.label, labelW - 6, dz.cat, true);
    const rowH = Math.max(
      p.fs(11),
      listH + p.fs(dz.pad),
      catLines.length * p.fs(dz.cat) * 1.18 + p.fs(dz.pad),
    );
    p.doc.setFillColor(...TONE[c.tone]).rect(x, y, labelW, rowH, 'F');
    p.doc.setFillColor(...WEAK[c.tone]).rect(x + labelW, y, w - labelW, rowH, 'F');
    p.doc.setFont(FONT, 'bold').setFontSize(p.fs(dz.cat)).setTextColor(255, 255, 255);
    p.doc.text(catLines, x + 3, y + p.fs(dz.cat + 0.6));
    drawInlineMeds(p, listX, y + p.fs(dz.cat + 0.6), listW, c.names, dz.list, c.tone, false);
    y += rowH + p.fs(1.6);
    p.guard(y);
  }
  return y + p.fs(2);
}

function drawCustomSections(p, y, state, page) {
  for (const sec of state.customSections.filter((s) => s.page === page && s.lines.length)) {
    y = p.band(y, sec.title, 'ink');
    const cols = 3;
    const gap = p.fs(4);
    const w = (p.cw - gap * (cols - 1)) / cols;
    let maxY = y;
    sec.lines.forEach((line, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const yy = y + row * p.fs(12) + p.fs(6);
      const ny = p.checkLine(M + col * (w + gap), yy, w, line, { size: 7.4 });
      maxY = Math.max(maxY, ny);
    });
    y = maxY + p.fs(3);
    p.guard(y);
  }
  return y;
}

// ── Rounding tool (landscape) ────────────────────────────────────────────────

/**
 * DELIRIUM(S) cells styled like the sheet: white card with a tone border, the
 * big tone letter beside the title-case word, a bold Reviewed check, a slate
 * note, and the Action write-in bottom-justified so the blanks align across
 * the row.
 */
function drawMnemonicRow(p, y, cells, cols, state) {
  const gap = p.fs(4);
  const w = (p.cw - gap * (cols - 1)) / cols;
  const pad = p.fs(4);
  const innerW = w - 2 * pad;
  const meas = cells.map((c) => {
    const word = ov(state, c.id, c.word);
    const headLines = p.wrap(word, innerW - p.fs(14), 7.8, true);
    const noteLines = p.wrap(c.note, innerW, 6.6);
    const h =
      pad +
      Math.max(headLines.length * p.fs(7.8) * 1.12, p.fs(9)) +
      p.fs(3) +
      p.fs(8.5) + // Reviewed row
      p.fs(1.5) * p.padK() +
      noteLines.length * p.fs(6.6) * 1.2 +
      p.fs(3) * p.padK() +
      (state.showActions ? p.fs(9) : 0) +
      pad;
    return { word, headLines, noteLines, h };
  });
  const rowH = Math.max(...meas.map((m) => m.h));
  cells.forEach((c, i) => {
    const x = M + i * (w + gap);
    const m = meas[i];
    p.doc
      .setFillColor(255, 255, 255)
      .setDrawColor(...TONE[c.tone])
      .setLineWidth(0.9);
    p.doc.rect(x, y, w, rowH, 'FD');
    let cy = y + pad + p.fs(6.4);
    // Big tone letter + the word beside it, both in the cell's tone.
    p.text(c.ltr, x + pad, cy, { size: 9.5, bold: true, color: TONE[c.tone] });
    p.doc.setFont(FONT, 'bold').setFontSize(p.fs(9.5));
    const ltrW = Math.max(p.fs(9), p.doc.getTextWidth(pd(c.ltr)) + p.fs(3));
    p.doc
      .setFont(FONT, 'bold')
      .setFontSize(p.fs(7.8))
      .setTextColor(...TONE[c.tone]);
    p.doc.text(m.headLines, x + pad + ltrW, cy);
    cy += Math.max(m.headLines.length * p.fs(7.8) * 1.12, p.fs(9)) + p.fs(3);
    // Reviewed — bold, with a tone check square.
    const bs = p.fs(6);
    p.box(x + pad, cy - bs + 1, bs, TONE[c.tone]);
    p.text('Reviewed', x + pad + bs + 3.5, cy, { size: 7, bold: true });
    cy += p.fs(8.5) + p.padGap(p.fs(1.5));
    p.doc
      .setFont(FONT, 'normal')
      .setFontSize(p.fs(6.6))
      .setTextColor(...TONE.slate);
    p.doc.text(m.noteLines, x + pad, cy);
    if (state.showActions) {
      // Bottom-justified write-in so the blanks align across the row.
      const ay = y + rowH - pad - 1;
      p.text('Action:', x + pad, ay, { size: 6.6, color: TONE.slate });
      const lx = x + pad + p.fs(22);
      p.doc.setDrawColor(...TONE[c.tone]).setLineWidth(0.6);
      p.doc.line(lx, ay + 1, x + w - pad, ay + 1);
      p.fieldText(lx, ay - p.fs(7), x + w - pad - lx, p.fs(8.5));
    }
  });
  return y + rowH + p.padGap(p.fs(4));
}

function buildRounding(doc, state, k, padByPage) {
  const p = new Painter(doc, k, padByPage);
  const t = TEMPLATES[0];

  // Page 1 header
  const headH = p.fs(26);
  doc.setFillColor(...TONE.ink).rect(M, M, p.cw, headH, 'F');
  p.text(t.defaultTitle, M + 7, M + p.fs(11.6), { size: 12, bold: true, color: [255, 255, 255] });
  p.text(
    t.defaultSubtitle + (state.unit.trim() ? ` · ${state.unit.trim()}` : ''),
    M + 7,
    M + p.fs(20.6),
    {
      size: 7.4,
      color: SUB,
    },
  );
  // Patient / Room / Date on a light row under the band (pen- and form-friendly).
  const metaY = M + headH + p.fs(9);
  const lineY = metaY + 1.5;
  const roomX = p.W - M - 150;
  const dateX = p.W - M - 72;
  doc.setDrawColor(...TONE.ink).setLineWidth(0.7);
  p.text('Patient:', M, metaY, { size: 8.5, bold: true });
  doc.line(M + 34, lineY, roomX - 12, lineY);
  p.fieldText(M + 34, metaY - p.fs(7), roomX - 12 - (M + 34), p.fs(9));
  p.text('Room:', roomX, metaY, { size: 8.5, bold: true });
  doc.line(roomX + 27, lineY, dateX - 10, lineY);
  p.fieldText(roomX + 27, metaY - p.fs(7), dateX - 10 - (roomX + 27), p.fs(9));
  p.text('Date:', dateX, metaY, { size: 8.5, bold: true });
  doc.line(dateX + 22, lineY, p.W - M, lineY);
  p.fieldText(dateX + 22, metaY - p.fs(7), p.W - M - (dateX + 22), p.fs(9));
  let y = metaY + p.fs(5);

  // Status strip — four cells sized to the tallest.
  const gap = p.fs(4);
  const widths = [0.192, 0.235, 0.274, 0.299].map((f) => (p.cw - 3 * gap) * f);
  const xs = [
    M,
    M + widths[0] + gap,
    M + widths[0] + widths[1] + 2 * gap,
    M + widths[0] + widths[1] + widths[2] + 3 * gap,
  ];
  const headBarH = p.fs(11);
  const target = rassTargetDef(state);
  const rass = rassLines(state);
  const cellPad = p.fs(4);
  const camItems = STATUS.cam.options;
  const subItems = STATUS.subtype.options;
  const sedLines = [...STATUS.sedation.lines, ...(target.note ? [target.note] : [])];
  const sedH =
    p.fs(11) +
    sedLines.reduce((a, s) => a + p.wrap(s, widths[0] - cellPad * 2, 7.2).length * p.fs(8.4), 0) +
    cellPad * 2;
  const measList = (items, w, size) =>
    items.reduce(
      (a, s) =>
        a +
        p.wrap(s, w - p.fs(6.4) - 4 - cellPad * 2, size).length * p.fs(size) * 1.2 +
        p.fs(2.4) * p.padK(),
      cellPad * 2,
    );
  const camH = measList(camItems, widths[1], 8);
  const subH = measList(subItems, widths[2], 7.4);
  const rassH = rass.length * (p.fs(8.2) + p.fs(0.6) * p.padK()) + cellPad * 2 + p.fs(2);
  const bodyH = Math.max(sedH, camH, subH, rassH);
  const cellHeads = ['Sedation goal', 'CAM-ICU result', 'Delirium subtype', 'RASS this assessment'];
  const cellTones = ['teal', 'plum', 'slate', 'rust'];
  cellHeads.forEach((head, i) => {
    const x = xs[i];
    const w = widths[i];
    doc
      .setFillColor(...WEAK[cellTones[i]])
      .setDrawColor(...TONE[cellTones[i]])
      .setLineWidth(0.7);
    doc.rect(x, y, w, headBarH + bodyH, 'FD');
    doc.setFillColor(...TONE[cellTones[i]]).rect(x, y, w, headBarH, 'F');
    p.text(head.toUpperCase(), x + 4, y + p.fs(7.8), {
      size: 7.4,
      bold: true,
      color: [255, 255, 255],
    });
  });
  let cy = y + headBarH + cellPad + p.fs(6);
  p.text(`Target RASS: ${target.writeIn ? '' : target.label}`, xs[0] + cellPad, cy, {
    size: 10,
    bold: true,
    color: TONE.teal,
  });
  if (target.writeIn) {
    const tx = xs[0] + cellPad + p.fs(52);
    const tw = widths[0] - cellPad * 2 - p.fs(52);
    doc.setDrawColor(...TONE.teal).setLineWidth(0.8);
    doc.line(tx, cy + 1.5, tx + tw, cy + 1.5);
    p.fieldText(tx, cy - p.fs(8), tw, p.fs(10));
  }
  let sy = cy + p.fs(9);
  for (const line of sedLines) {
    const strong = line === target.note;
    const lines = p.wrap(line, widths[0] - cellPad * 2, 7.2, strong);
    doc
      .setFont(FONT, strong ? 'bold' : 'normal')
      .setFontSize(p.fs(7.2))
      .setTextColor(...TONE.ink);
    doc.text(lines, xs[0] + cellPad, sy);
    sy += lines.length * p.fs(8.4);
  }
  let c1 = y + headBarH + cellPad + p.fs(6.4);
  for (const s of camItems)
    c1 = p.checkLine(xs[1] + cellPad, c1, widths[1] - cellPad * 2, s, { size: 8 });
  let c2 = y + headBarH + cellPad + p.fs(6.2);
  for (const s of subItems)
    c2 = p.checkLine(xs[2] + cellPad, c2, widths[2] - cellPad * 2, s, { size: 7.4 });
  let c3 = y + headBarH + cellPad + p.fs(6);
  for (const r of rass) {
    const bs = p.fs(5.4);
    p.circleBox(xs[3] + cellPad, c3 - bs + 1, bs, TONE[r.zone]);
    p.text(r.label, xs[3] + cellPad + bs + 3, c3, { size: 7.2, bold: true, color: TONE[r.zone] });
    const dx = xs[3] + cellPad + bs + 3 + p.fs(30);
    p.text(r.desc, dx, c3, {
      size: 7.2,
      bold: r.bold,
      color: TONE[r.zone],
    });
    if (r.target) {
      p.doc.setFont(FONT, r.bold ? 'bold' : 'normal').setFontSize(p.fs(7.2));
      targetMark(p, dx + p.doc.getTextWidth(pd(r.desc)) + 4, c3, 7.2);
    }
    c3 += p.fs(8.2) + p.padGap(p.fs(0.6));
  }
  y += headBarH + bodyH + p.padGap(p.fs(5));

  // Step 1 — DELIRIUM(S)
  if (secOn(state, 'sec-mnemonic')) {
    const cells = MNEMONIC.cells.filter((c) => itemOn(state, c.id));
    if (cells.length) {
      y = p.band(y, 'Step 1 · Identify & address causative factors — DELIRIUM(S)', 'ink');
      const cols = 5;
      for (let r = 0; r < cells.length; r += cols) {
        y = drawMnemonicRow(p, y, cells.slice(r, r + cols), cols, state);
      }
    }
  }

  // Step 2 — non-pharmacologic bundle
  if (secOn(state, 'sec-nonpharm')) {
    const groups = NONPHARM.groups
      .map((g) => {
        const items = g.items
          .filter((i) => itemOn(state, i.id))
          .map((i) => ov(state, i.id, i.text));
        const custom = state.custom[g.id] || [];
        if (!items.length && !custom.length) return null;
        return {
          tone: g.tone,
          head: ov(state, g.id, g.head),
          items: [...items, ...custom],
          size: 6.6,
        };
      })
      .filter(Boolean);
    if (groups.length) {
      y = p.band(
        y,
        'Step 2 · Non-pharmacologic bundle — first-line, apply to all patients',
        'green',
      );
      y = cardRow(p, y, groups, groups.length);
    }
  }

  y = drawCustomSections(p, y, state, 1);

  if (secOn(state, 'sec-notes')) {
    p.text('Rounds notes / plan:', M, y + p.fs(7), { size: 8.4, bold: true });
    doc.setDrawColor(...TONE.slate).setLineWidth(0.6);
    doc.line(M + p.fs(80), y + p.fs(7.6), p.W - M, y + p.fs(7.6));
    p.fieldText(M + p.fs(80), y, p.W - M - (M + p.fs(80)), p.fs(9));
    y += p.fs(13);
  }
  p.guard(y);
  p.endPage(y);
  p.footer(state, 1, 2);

  // Page 2
  doc.addPage('letter', 'landscape');
  y = M;
  if (secOn(state, 'sec-pharm') || secOn(state, 'sec-meds')) {
    const showPharm = secOn(state, 'sec-pharm');
    const cats = secOn(state, 'sec-meds') ? medCats(state) : [];
    const unified =
      state.medLayout !== 'rows' && showPharm && cats.length > 0 && medMosaicSpec(cats).count <= 60;
    y = p.band(
      y,
      unified
        ? `Step 3 · Pharmacologic considerations · ${MEDS_SECTION.head}`
        : 'Step 3 · Pharmacologic considerations',
      'rust',
    );
    if (unified) {
      // Unified mosaic: the guidance card is pinned top-left; the medication
      // cards pack around it, using the space beneath.
      const spec = medMosaicSpec(cats);
      spec.minColw = 2.35;
      const gap = p.fs(4);
      const colWTarget = Math.max(spec.colw, spec.minColw) * 72;
      const cols = Math.max(2, Math.min(5, Math.floor(p.cw / colWTarget)));
      const colW = (p.cw - gap * (cols - 1)) / cols;
      const ph = drawPharmCardAt(p, M, y, colW, state);
      y = drawMedCards(p, M, y, p.cw, cats, spec, y + ph + gap) + p.fs(2);
    } else {
      const leftW = cats.length ? p.cw * 0.4 : p.cw;
      let leftY = y;
      if (showPharm) leftY = y + drawPharmCardAt(p, M, y, leftW, state) + p.fs(5);
      if (cats.length) {
        const x0 = showPharm ? M + leftW + p.fs(6) : M;
        const w = showPharm ? p.cw - leftW - p.fs(6) : p.cw;
        const gridY = drawMedsGridAt(p, y, state, x0, w);
        y = Math.max(leftY, gridY) + p.fs(2);
      } else {
        y = leftY;
      }
    }
  }
  if (secOn(state, 'sec-pathway')) {
    const cols = PATHWAY.cols
      .map((col) => {
        const items = col.items
          .filter((i) => itemOn(state, i.id))
          .map((i) => ov(state, i.id, i.text));
        const custom = state.custom[col.id] || [];
        if (!items.length && !custom.length) return null;
        return {
          tone: col.tone,
          head: ov(state, col.id, col.head),
          headBar: true,
          items: [...items, ...custom],
          size: 6.8,
        };
      })
      .filter(Boolean);
    if (cols.length) {
      y = p.band(y, `Step 4 · ${PATHWAY.head}`, 'slate');
      y = cardRow(p, y, cols, cols.length);
    }
  }
  y = drawCustomSections(p, y, state, 2);
  p.guard(y);
  p.endPage(y);
  p.footer(state, 2, 2);
  return p;
}

// Meds grid at an arbitrary x/width (page-2 right column of the rounding tool).
function drawMedsGridAt(p, y, state, x, w) {
  const cats = medCats(state);
  if (!cats.length) return y;
  // Same density tiers, slightly tighter — this variant shares its page half.
  const dz = medDensity(cats);
  const listSize = dz.list - 0.2;
  const catSize = dz.cat - 0.2;
  p.text(MEDS_SECTION.head, x, y + p.fs(6), { size: 8.4, bold: true, color: TONE.red });
  y += p.fs(10);
  if (state.medLayout !== 'rows') return drawMedCards(p, x, y, w, cats, medMosaicSpec(cats));
  const labelW = p.fs(dz.labelW - 6);
  for (const c of cats) {
    const listX = x + labelW + p.fs(4);
    const listW = w - labelW - p.fs(10);
    const listH = drawInlineMeds(
      p,
      listX,
      y + p.fs(catSize + 0.6),
      listW,
      c.names,
      listSize,
      c.tone,
      true,
    );
    const catLines = p.wrap(c.label, labelW - 6, catSize, true);
    const rowH = Math.max(
      p.fs(11),
      listH + p.fs(dz.pad),
      catLines.length * p.fs(catSize) * 1.18 + p.fs(dz.pad),
    );
    p.doc.setFillColor(...TONE[c.tone]).rect(x, y, labelW, rowH, 'F');
    p.doc.setFillColor(...WEAK[c.tone]).rect(x + labelW, y, w - labelW, rowH, 'F');
    p.doc.setFont(FONT, 'bold').setFontSize(p.fs(catSize)).setTextColor(255, 255, 255);
    p.doc.text(catLines, x + 3, y + p.fs(catSize + 0.6));
    drawInlineMeds(p, listX, y + p.fs(catSize + 0.6), listW, c.names, listSize, c.tone, false);
    y += rowH + p.fs(1.6);
    p.guard(y);
  }
  return y;
}

// ── SPA quick reference (portrait) ───────────────────────────────────────────

function buildSpa(doc, state, k, padByPage) {
  const p = new Painter(doc, k, padByPage);
  const t = TEMPLATES[1];

  const header = (title, sub) => {
    const headH = p.fs(sub ? 30 : 24);
    doc.setFillColor(...TONE.ink).rect(M, M, p.cw, headH, 'F');
    p.text(title, M + 7, M + p.fs(13), { size: 12.5, bold: true, color: [255, 255, 255] });
    if (sub) p.text(sub, M + 7, M + p.fs(23.5), { size: 7.4, color: SUB });
    return M + headH + p.fs(5);
  };

  const unit = state.unit.trim() || 'For adult ICU patients';
  let y = header(t.defaultTitle, `${t.defaultSubtitle} · ${unit}`);

  if (secOn(state, 'sec-spa-cols')) {
    const cols = SPA_COLS.map((col) => {
      const items = col.items.filter((i) => itemOn(state, i.id));
      const custom = state.custom[col.id] || [];
      if (!items.length && !custom.length) return null;
      return { col, items, custom };
    }).filter(Boolean);
    if (cols.length) {
      const gap = p.fs(5);
      const w = (p.cw - gap * (cols.length - 1)) / cols.length;
      const pad = p.fs(5);
      const innerW = w - pad * 2;
      // Row-aligned layout: every row takes the height of its tallest item so
      // the check squares line up across the three columns. Heads wrap, and
      // the row padding stretches with the page's pad factor.
      const headLines = (it) => p.wrap(ov(state, it.id, it.head), innerW - p.fs(8), 8.6, true);
      const itemH = (it) =>
        headLines(it).length * p.fs(9.2) +
        p.wrap(it.desc, innerW - p.fs(8), 7.4).length * p.fs(7.4) * 1.2 +
        p.fs(5.5) * p.padK();
      const rows = Math.max(...cols.map((c) => c.items.length));
      const rowHs = [];
      for (let r = 0; r < rows; r++) {
        rowHs.push(Math.max(...cols.map((c) => (c.items[r] ? itemH(c.items[r]) : 0))));
        p.padGap(p.fs(5.5)); // register the row's stretchable padding
      }
      const customHs = cols.map((c) =>
        c.custom.reduce(
          (a, cl) => a + p.wrap(cl, innerW - p.fs(8), 8).length * p.fs(8) * 1.2 + p.fs(4),
          0,
        ),
      );
      const cardH =
        pad + p.fs(26) + rowHs.reduce((a, b) => a + b, 0) + Math.max(...customHs, 0) + pad;
      cols.forEach(({ col, items, custom }, i) => {
        const x = M + i * (w + gap);
        doc.setFillColor(...WEAK[col.tone]).rect(x, y, w, cardH, 'F');
        // letter disc + word
        doc
          .setFillColor(...TONE[col.tone])
          .circle(x + pad + p.fs(7), y + pad + p.fs(7), p.fs(7), 'F');
        p.text(col.ltr, x + pad + p.fs(7), y + pad + p.fs(10), {
          size: 10.5,
          bold: true,
          color: [255, 255, 255],
          align: 'center',
        });
        p.text(ov(state, col.id, col.word), x + pad + p.fs(17), y + pad + p.fs(6.5), {
          size: 10.5,
          bold: true,
        });
        p.text(col.tagline, x + pad + p.fs(17), y + pad + p.fs(14.5), {
          size: 7,
          color: TONE.slate,
        });
        let cy = y + pad + p.fs(26);
        items.forEach((it, r) => {
          const bs = p.fs(7);
          p.box(x + pad, cy - bs + 1, bs, TONE[col.tone]);
          const hl = headLines(it);
          doc
            .setFont(FONT, 'bold')
            .setFontSize(p.fs(8.6))
            .setTextColor(...TONE.ink);
          doc.text(hl, x + pad + bs + 4, cy);
          const lines = p.wrap(it.desc, innerW - p.fs(8), 7.4);
          doc
            .setFont(FONT, 'normal')
            .setFontSize(p.fs(7.4))
            .setTextColor(...TONE.slate);
          doc.text(lines, x + pad + bs + 4, cy + hl.length * p.fs(9.2));
          cy += rowHs[r];
        });
        for (const cline of custom) {
          cy = p.checkLine(x + pad, cy, innerW, cline, { size: 8, color: TONE[col.tone] });
          cy += p.fs(2);
        }
        p.guard(cy);
      });
      y += cardH + p.padGap(p.fs(6));
    }
  }

  if (secOn(state, 'sec-rass')) {
    const gap = p.fs(5);
    const w1 = p.cw * 0.58;
    const w2 = p.cw - w1 - gap;
    const rass = rassLines(state);
    const targetNote = rassTargetDef(state).note;
    const goalLines = [
      ...STATUS.sedation.lines,
      'Document goal each shift.',
      ...(targetNote ? [targetNote] : []),
    ];
    const headBarH = p.fs(12);
    const bodyH = rass.length * p.fs(10) + p.fs(8);
    const goalH = p.fs(12) + goalLines.length * p.fs(9) + p.fs(10);
    const h = headBarH + Math.max(bodyH, goalH);
    // RASS cell
    doc
      .setFillColor(...WEAK.rust)
      .setDrawColor(...TONE.rust)
      .setLineWidth(0.7);
    doc.rect(M, y, w1, h, 'FD');
    doc.setFillColor(...TONE.rust).rect(M, y, w1, headBarH, 'F');
    p.text('RASS — THIS ASSESSMENT', M + 5, y + p.fs(8.4), {
      size: 8.4,
      bold: true,
      color: [255, 255, 255],
    });
    let ry = y + headBarH + p.fs(9);
    for (const r of rass) {
      const bs = p.fs(6);
      p.circleBox(M + 6, ry - bs + 1, bs, TONE[r.zone]);
      p.text(r.label, M + 6 + bs + 3, ry, { size: 8.4, bold: true, color: TONE[r.zone] });
      const dx = M + 6 + bs + 3 + p.fs(38);
      p.text(r.desc, dx, ry, {
        size: 8.4,
        bold: r.bold,
        color: TONE[r.zone],
      });
      if (r.target) {
        p.doc.setFont(FONT, r.bold ? 'bold' : 'normal').setFontSize(p.fs(8.4));
        targetMark(p, dx + p.doc.getTextWidth(pd(r.desc)) + 4, ry, 8.4);
      }
      ry += p.fs(10);
    }
    // goal cell
    const x2 = M + w1 + gap;
    doc
      .setFillColor(...WEAK.teal)
      .setDrawColor(...TONE.teal)
      .setLineWidth(0.7);
    doc.rect(x2, y, w2, h, 'FD');
    doc.setFillColor(...TONE.teal).rect(x2, y, w2, headBarH, 'F');
    p.text('SEDATION GOAL', x2 + 5, y + p.fs(8.4), {
      size: 8.4,
      bold: true,
      color: [255, 255, 255],
    });
    let gy = y + headBarH + p.fs(10);
    const tgt = rassTargetDef(state);
    p.text(`Target RASS: ${tgt.writeIn ? '' : tgt.label}`, x2 + 6, gy, {
      size: 10.5,
      bold: true,
      color: TONE.teal,
    });
    if (tgt.writeIn) {
      const tx = x2 + 6 + p.fs(56);
      const tw = w2 - 12 - p.fs(56);
      doc.setDrawColor(...TONE.teal).setLineWidth(0.8);
      doc.line(tx, gy + 1.5, tx + tw, gy + 1.5);
      p.fieldText(tx, gy - p.fs(8.5), tw, p.fs(10.5));
    }
    gy += p.fs(10);
    for (const line of goalLines) {
      p.text(line, x2 + 6, gy, { size: 7.6, bold: line === targetNote });
      gy += p.fs(9);
    }
    y += h + p.padGap(p.fs(6));
  }
  y = drawCustomSections(p, y, state, 1);
  p.guard(y);
  p.endPage(y);
  p.footer(state, 1, 2);

  // Page 2
  doc.addPage('letter', 'portrait');
  y = header('Deeper Guidance, Medications & Escalation', null);
  if (secOn(state, 'sec-deeper')) {
    const doses = {
      h: state.showDoses ? '0.25-0.5 mg q4-6h PRN ' : '(per local order set) ',
      q: state.showDoses ? '12.5-25 mg PO q12h ' : '(per local order set) ',
    };
    const cols = SPA_DEEPER.cols
      .map((col) => {
        const items = col.items
          .filter((i) => itemOn(state, i.id))
          .map((i) =>
            ov(state, i.id, i.text)
              .replace('{haldolDose}', doses.h)
              .replace('{quetiapineDose}', doses.q),
          );
        if (!items.length) return null;
        return {
          tone: col.tone,
          head: ov(state, col.id, col.head),
          headBar: true,
          items,
          bullets: false,
          size: 7,
        };
      })
      .filter(Boolean);
    if (cols.length) y = cardRow(p, y, cols, cols.length);
  }
  if (secOn(state, 'sec-meds')) y = drawMedsGrid(p, y, state);
  if (secOn(state, 'sec-escalation')) {
    const stages = ESCALATION.stages
      .map((s) => {
        const items = s.items
          .filter((i) => itemOn(state, i.id))
          .map((i) => ov(state, i.id, i.text));
        if (!items.length) return null;
        return {
          tone: s.tone,
          head: ov(state, s.id, s.head),
          headBar: true,
          items,
          bullets: false,
          size: 7,
        };
      })
      .filter(Boolean);
    if (stages.length) {
      p.text(ESCALATION.head, M, y + p.fs(6), { size: 8.4, bold: true, color: TONE.red });
      y += p.fs(10);
      y = cardRow(p, y, stages, stages.length);
    }
  }
  y = drawCustomSections(p, y, state, 2);
  p.guard(y);
  p.endPage(y);
  p.footer(state, 2, 2);
  return p;
}

/** Build and download the active template as a two-page PDF. */
export function downloadPdf(state) {
  const rounding = state.template !== 'spa';
  const orientation = rounding ? 'landscape' : 'portrait';
  FONT = state.fontFamily === 'serif' ? 'times' : 'helvetica';
  // User text-size choice × template factor — the same composition as the CSS.
  const base = (Number(state.fontScale) / 100) * (rounding ? 1 : 1.15);
  const build = (k, padByPage) => {
    const d = new jsPDF({ unit: 'pt', format: 'letter', orientation });
    const painter = rounding
      ? buildRounding(d, state, k, padByPage)
      : buildSpa(d, state, k, padByPage);
    return { d, painter };
  };
  let doc;
  let fitted = null;
  for (const shrink of [1, 0.94, 0.88, 0.82, 0.76]) {
    fitted = build(base * shrink);
    doc = fitted.d;
    if (!fitted.painter.overflowed) {
      // Grow phase (mirrors the sheet): leftover page space becomes padding
      // between the check rows. Gaps scale linearly and never re-wrap text,
      // so one measurement pass gives the exact per-page factor.
      if (shrink === 1) {
        const m = fitted.painter;
        const usable = m.H - M - 14; // above the footer chrome
        const padByPage = {};
        let grew = false;
        for (const pg of Object.keys(m.bottoms)) {
          const slack = usable - m.bottoms[pg] - 4;
          const units = m.gapUnits[pg] || 0;
          if (slack > 4 && units > 0) {
            padByPage[pg] = Math.min(3.2, 1 + slack / units);
            grew = true;
          }
        }
        if (grew) {
          let padded = build(base, padByPage);
          if (padded.painter.overflowed) {
            // Type growth can re-wrap a line — halve the growth and retry once.
            const halved = {};
            for (const pg of Object.keys(padByPage)) halved[pg] = 1 + (padByPage[pg] - 1) / 2;
            padded = build(base, halved);
          }
          if (!padded.painter.overflowed) doc = padded.d;
        }
      }
      break;
    }
  }
  doc.setProperties({
    title: rounding ? 'ICU Delirium Rounding Tool' : 'SPA Quick Reference',
    subject: 'Bedside delirium reference sheet — reference aid only',
    keywords: 'delirium, CAM-ICU, RASS, ABCDEF, ICU, reference aid',
  });
  // Optional revision/date ride along in the filename for version tracking.
  const slug = (t) =>
    t
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const suffix = [state.docRev, state.docDate]
    .map((t) => slug(t || ''))
    .filter(Boolean)
    .join('_');
  const fname = rounding ? 'icu-delirium-rounding-tool' : 'spa-delirium-quick-reference';
  doc.save(`${fname}${suffix ? `_${suffix}` : ''}.pdf`);
}
