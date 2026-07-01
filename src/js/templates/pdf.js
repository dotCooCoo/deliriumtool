/**
 * templates/pdf.js — "Save as PDF" for the bedside templates, generated in the
 * browser with jsPDF (no server, no data egress). It consumes the same content
 * data and customization state as the on-screen sheets, so the PDF cannot
 * carry different clinical values — only the layout engine differs. If a
 * heavily customized sheet outgrows its page, the whole document rebuilds at a
 * smaller scale until both pages fit.
 */
import { jsPDF } from 'jspdf';
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
  MED_WARN,
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
import { medDisplayName } from './sheets.js';
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
  constructor(doc, k) {
    this.doc = doc;
    this.k = k; // global type scale
    this.overflowed = false;
    this.W = doc.internal.pageSize.getWidth();
    this.H = doc.internal.pageSize.getHeight();
    this.cw = this.W - 2 * M;
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
  }
  band(y, label, tone) {
    const h = this.fs(13);
    this.doc.setFillColor(...TONE[tone]).rect(M, y, this.cw, h, 'F');
    this.text(label.toUpperCase(), M + 6, y + h - this.fs(3.6), {
      size: 8.5,
      bold: true,
      color: [255, 255, 255],
    });
    return y + h + this.fs(3);
  }
  /** One check-off line, wrapped; returns the new y. */
  checkLine(x, y, w, str, { size = 7.2, color = TONE.ink } = {}) {
    const bs = this.fs(6.4);
    const lines = this.wrap(str, w - bs - 4, size);
    this.box(x, y - bs + 1, bs, color);
    this.doc
      .setFont(FONT, 'normal')
      .setFontSize(this.fs(size))
      .setTextColor(...TONE.ink);
    this.doc.text(lines, x + bs + 3.5, y);
    return y + lines.length * this.fs(size) * 1.18 + this.fs(1.6);
  }
  bulletLine(x, y, w, str, { size = 7.2 } = {}) {
    const lines = this.wrap(`• ${str}`, w, size);
    this.doc
      .setFont(FONT, 'normal')
      .setFontSize(this.fs(size))
      .setTextColor(...TONE.ink);
    this.doc.text(lines, x, y);
    return y + lines.length * this.fs(size) * 1.18 + this.fs(1.6);
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
    const leftLabel = this.wrap(
      `${state.facility.trim() || 'Your facility'} · ${t.name}`,
      165,
      6.2,
      true,
    )[0];
    this.text(leftLabel, M, y, {
      size: 6.2,
      bold: true,
      color: TONE.slate,
    });
    // Centered between the left label and the page number; the size steps
    // down until the disclaimer + sources actually fit that span.
    const center = pd(`${SHEET_DISCLAIMER} · Sources: ${src}`);
    const avail = this.W - 2 * M - 175 - 48;
    this.doc.setFont(FONT, 'normal');
    let size = 6.2;
    const width = (s) => {
      this.doc.setFontSize(s);
      return this.doc.getTextWidth(center);
    };
    while (size > 4.4 && width(size) > avail) size -= 0.2;
    this.text(center, M + 175 + avail / 2, y, {
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

/** Measure-then-draw a titled card of check lines; returns its height. */
function drawGroupCard(p, x, y, w, { tone, head, headBar, items, bullets, size = 7 }) {
  const pad = p.fs(4);
  const innerW = w - 2 * pad;
  // measure
  let h = pad + p.fs(9);
  for (const it of items) {
    const lines = p.wrap(it, innerW - (bullets ? 0 : p.fs(6.4) + 4), size);
    h += lines.length * p.fs(size) * 1.18 + p.fs(1.6);
  }
  h += pad * 0.7;
  // frame
  p.doc
    .setFillColor(...WEAK[tone])
    .setDrawColor(...TONE[tone])
    .setLineWidth(0.7);
  p.doc.rect(x, y, w, h, 'FD');
  // heading
  let cy = y + pad + p.fs(5.4);
  if (headBar) {
    p.doc.setFillColor(...TONE[tone]).rect(x, y, w, p.fs(10.5), 'F');
    p.text(head, x + pad, y + p.fs(7.6), { size: 7.6, bold: true, color: [255, 255, 255] });
    cy = y + p.fs(10.5) + pad + p.fs(2.4);
  } else {
    p.text(head.toUpperCase(), x + pad, cy, { size: 7.4, bold: true, color: TONE[tone] });
    cy += p.fs(8);
  }
  for (const it of items) {
    cy = bullets
      ? p.bulletLine(x + pad, cy, innerW, it, { size })
      : p.checkLine(x + pad, cy, innerW, it, { size, color: TONE[tone] });
  }
  return Math.max(h, cy - y + pad * 0.4);
}

/** A row of cards balanced to the tallest; returns the new y. */
function cardRow(p, y, cards, cols) {
  const gap = p.fs(4);
  const w = (p.cw - gap * (cols - 1)) / cols;
  let maxH = 0;
  cards.forEach((c, i) => {
    const h = drawGroupCard(p, M + i * (w + gap), y, w, c);
    maxH = Math.max(maxH, h);
  });
  return y + maxH + p.fs(4);
}

function rassLines(state) {
  const target = rassTargetDef(state);
  return RASS_ROWS.map((r) => {
    const isTarget = r.scores.every((s) => target.scores.includes(s));
    return {
      label: r.label,
      desc: r.desc + (isTarget ? '  - TARGET' : ''),
      zone: isTarget ? 'green' : RASS_ZONES[r.scores[0]] || 'ink',
      bold: isTarget,
    };
  });
}

function medCats(state) {
  return MEDS.categories
    .map((c) => ({
      label: c.label,
      tone: MED_TONES[c.id] || 'slate',
      warn: MED_WARN.includes(c.id),
      names: c.items
        .filter((i) => state.meds[i.id])
        .map((i) => medDisplayName(i.name, state.showBrands)),
    }))
    .filter((c) => c.names.length);
}

/** Small warning triangle (white, "!" in the category tone) on a colour block. */
function warnTriangle(p, x, y, size, tone) {
  p.doc.setFillColor(255, 255, 255);
  p.doc.triangle(x, y + size, x + size / 2, y, x + size, y + size, 'F');
  p.doc
    .setFont(FONT, 'bold')
    .setFontSize(size * 0.72)
    .setTextColor(...TONE[tone]);
  p.doc.text('!', x + size / 2, y + size - size * 0.16, { align: 'center' });
}

function drawMedsGrid(p, y, state, wOverride) {
  const cats = medCats(state);
  if (!cats.length) return y;
  const x = M;
  const w = wOverride || p.cw;
  p.text(MEDS_SECTION.head, x, y + p.fs(6), { size: 8.4, bold: true, color: TONE.red });
  y += p.fs(10);
  const labelW = p.fs(78);
  for (const c of cats) {
    const warnPad = c.warn ? p.fs(10) : 0;
    const lines = p.wrap(c.names.join(' · '), w - labelW - p.fs(8), 6.8);
    const catLines = p.wrap(c.label, labelW - 6 - warnPad, 6.6, true);
    const rowH = Math.max(
      p.fs(11),
      lines.length * p.fs(6.8) * 1.18 + p.fs(5),
      catLines.length * p.fs(6.6) * 1.18 + p.fs(5),
    );
    p.doc.setFillColor(...TONE[c.tone]).rect(x, y, labelW, rowH, 'F');
    p.doc.setFillColor(...WEAK[c.tone]).rect(x + labelW, y, w - labelW, rowH, 'F');
    if (c.warn) warnTriangle(p, x + 3, y + p.fs(2.6), p.fs(7), c.tone);
    p.doc.setFont(FONT, 'bold').setFontSize(p.fs(6.6)).setTextColor(255, 255, 255);
    p.doc.text(catLines, x + 3 + warnPad, y + p.fs(7));
    p.doc
      .setFont(FONT, 'normal')
      .setFontSize(p.fs(6.8))
      .setTextColor(...TONE.ink);
    p.doc.text(lines, x + labelW + p.fs(4), y + p.fs(7));
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

function buildRounding(doc, state, k) {
  const p = new Painter(doc, k);
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
  p.text(
    'Patient: ____________________   Room: ________   Date: __________',
    p.W - M - 6,
    M + p.fs(16),
    {
      size: 8,
      color: SUB,
      align: 'right',
    },
  );
  let y = M + headH + p.fs(4);

  // Status strip — four cells sized to the tallest.
  const gap = p.fs(4);
  const widths = [0.22, 0.25, 0.25, 0.28].map((f) => (p.cw - 3 * gap) * f);
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
        a + p.wrap(s, w - p.fs(6.4) - 4 - cellPad * 2, size).length * p.fs(size) * 1.2 + p.fs(2.4),
      cellPad * 2,
    );
  const camH = measList(camItems, widths[1], 8);
  const subH = measList(subItems, widths[2], 7.4);
  const rassH = rass.length * p.fs(8.2) + cellPad * 2;
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
  p.text(`Target RASS: ${target.label}`, xs[0] + cellPad, cy, {
    size: 10,
    bold: true,
    color: TONE.teal,
  });
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
    p.text(r.label, xs[3] + cellPad, c3, { size: 7.2, bold: true, color: TONE[r.zone] });
    p.text(r.desc, xs[3] + cellPad + p.fs(30), c3, {
      size: 7.2,
      bold: r.bold,
      color: TONE[r.zone],
    });
    c3 += p.fs(8.2);
  }
  y += headBarH + bodyH + p.fs(5);

  // Step 1 — DELIRIUM(S)
  if (secOn(state, 'sec-mnemonic')) {
    const cells = MNEMONIC.cells.filter((c) => itemOn(state, c.id));
    if (cells.length) {
      y = p.band(y, 'Step 1 · Identify & address causative factors — DELIRIUM(S)', 'ink');
      const cols = 5;
      for (let r = 0; r < cells.length; r += cols) {
        const row = cells.slice(r, r + cols);
        y = cardRow(
          p,
          y,
          row.map((c) => ({
            tone: c.tone,
            head: `${c.ltr}  ${ov(state, c.id, c.word)}`,
            items: ['Reviewed', c.note, ...(state.showActions ? ['Action: ______________'] : [])],
            bullets: false,
            size: 6.6,
          })),
          cols,
        );
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
    y += p.fs(13);
  }
  p.guard(y);
  p.footer(state, 1, 2);

  // Page 2
  doc.addPage('letter', 'landscape');
  y = M;
  if (secOn(state, 'sec-pharm') || secOn(state, 'sec-meds')) {
    y = p.band(y, 'Step 3 · Pharmacologic considerations', 'rust');
    const leftW = secOn(state, 'sec-meds') ? p.cw * 0.4 : p.cw;
    let leftY = y;
    if (secOn(state, 'sec-pharm')) {
      const rows = PHARM.rows.filter((r) => itemOn(state, r.id));
      const cautions = PHARM.cautions.filter((c) => itemOn(state, c.id));
      const pad = p.fs(5);
      const innerW = leftW - pad * 2;
      let cy2 = y + pad + p.fs(7);
      const startY = y;
      // measure by drawing after frame: draw frame later using a first pass measurement
      const measure = () => {
        let h = pad + p.fs(9) + p.fs(9);
        const all = [
          ...rows.map(
            (r) =>
              `${r.drug}: ${state.showDoses && r.dose ? `${r.dose} · ` : ''}${ov(state, r.id, r.text)}`,
          ),
          ...cautions.map((c) => ov(state, c.id, c.text)),
          ...(state.showDoses ? [PHARM.doseNote] : []),
        ];
        for (const s of all) h += p.wrap(s, innerW, 7).length * p.fs(7) * 1.2 + p.fs(2.4);
        return h + pad;
      };
      const cardH = measure() + p.fs(8);
      doc
        .setFillColor(...WEAK.rust)
        .setDrawColor(...TONE.rust)
        .setLineWidth(0.7);
      doc.rect(M, y, leftW, cardH, 'FD');
      p.text(PHARM.lead, M + pad, cy2, { size: 8.8, bold: true, color: TONE.red });
      cy2 += p.fs(8.5);
      const noteLines = p.wrap(PHARM.leadNote, innerW, 6.6);
      doc
        .setFont(FONT, 'normal')
        .setFontSize(p.fs(6.6))
        .setTextColor(...TONE.slate);
      doc.text(noteLines, M + pad, cy2);
      cy2 += noteLines.length * p.fs(7.6) + p.fs(2);
      for (const r of rows) {
        const body = `${state.showDoses && r.dose ? `${r.dose} · ` : ''}${ov(state, r.id, r.text)}`;
        const lines = p.wrap(`${r.drug}: ${body}`, innerW, 7);
        doc.setFont(FONT, r.warn ? 'bold' : 'normal').setFontSize(p.fs(7));
        doc.setTextColor(...(r.warn ? TONE.red : TONE.ink));
        doc.text(lines, M + pad, cy2);
        cy2 += lines.length * p.fs(7) * 1.2 + p.fs(2.4);
      }
      for (const c of cautions) {
        const lines = p.wrap(ov(state, c.id, c.text), innerW, 7);
        doc.setFont(FONT, 'bold').setFontSize(p.fs(7));
        doc.setTextColor(...(c.stop ? TONE.red : TONE.ink));
        doc.text(lines, M + pad, cy2);
        cy2 += lines.length * p.fs(7) * 1.2 + p.fs(2.4);
      }
      if (state.showDoses) {
        const lines = p.wrap(PHARM.doseNote, innerW, 6.4);
        doc
          .setFont(FONT, 'normal')
          .setFontSize(p.fs(6.4))
          .setTextColor(...TONE.slate);
        doc.text(lines, M + pad, cy2);
        cy2 += lines.length * p.fs(7.4);
      }
      leftY = Math.max(startY + cardH, cy2) + p.fs(5);
    }
    if (secOn(state, 'sec-meds')) {
      const x0 = secOn(state, 'sec-pharm') ? M + leftW + p.fs(6) : M;
      const w = secOn(state, 'sec-pharm') ? p.cw - leftW - p.fs(6) : p.cw;
      // temporarily shift margin for the grid
      const oldM = M;
      const gridY = drawMedsGridAt(p, y, state, x0, w);
      y = Math.max(leftY, gridY) + p.fs(2);
      void oldM;
    } else {
      y = leftY;
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
  p.footer(state, 2, 2);
  return p;
}

// Meds grid at an arbitrary x/width (page-2 right column of the rounding tool).
function drawMedsGridAt(p, y, state, x, w) {
  const cats = medCats(state);
  if (!cats.length) return y;
  p.text(MEDS_SECTION.head, x, y + p.fs(6), { size: 8.4, bold: true, color: TONE.red });
  y += p.fs(10);
  const labelW = p.fs(72);
  for (const c of cats) {
    const warnPad = c.warn ? p.fs(9) : 0;
    const lines = p.wrap(c.names.join(' · '), w - labelW - p.fs(8), 6.6);
    const catLines = p.wrap(c.label, labelW - 6 - warnPad, 6.2, true);
    const rowH = Math.max(
      p.fs(11),
      lines.length * p.fs(6.6) * 1.18 + p.fs(5),
      catLines.length * p.fs(6.2) * 1.18 + p.fs(5),
    );
    p.doc.setFillColor(...TONE[c.tone]).rect(x, y, labelW, rowH, 'F');
    p.doc.setFillColor(...WEAK[c.tone]).rect(x + labelW, y, w - labelW, rowH, 'F');
    if (c.warn) warnTriangle(p, x + 3, y + p.fs(2.4), p.fs(6.4), c.tone);
    p.doc.setFont(FONT, 'bold').setFontSize(p.fs(6.2)).setTextColor(255, 255, 255);
    p.doc.text(catLines, x + 3 + warnPad, y + p.fs(6.6));
    p.doc
      .setFont(FONT, 'normal')
      .setFontSize(p.fs(6.6))
      .setTextColor(...TONE.ink);
    p.doc.text(lines, x + labelW + p.fs(4), y + p.fs(6.6));
    y += rowH + p.fs(1.6);
    p.guard(y);
  }
  return y;
}

// ── SPA quick reference (portrait) ───────────────────────────────────────────

function buildSpa(doc, state, k) {
  const p = new Painter(doc, k);
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
      let maxH = 0;
      cols.forEach(({ col, items, custom }, i) => {
        const x = M + i * (w + gap);
        const pad = p.fs(5);
        const innerW = w - pad * 2;
        // measure
        let h = pad + p.fs(22);
        for (const it of items) {
          h += p.fs(9.6);
          h += p.wrap(it.desc, innerW - p.fs(8), 7.4).length * p.fs(7.4) * 1.2 + p.fs(5.5);
        }
        for (const cline of custom) {
          h += p.wrap(cline, innerW - p.fs(8), 8).length * p.fs(8) * 1.2 + p.fs(5.5);
        }
        h += pad;
        doc.setFillColor(...WEAK[col.tone]).rect(x, y, w, h, 'F');
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
        for (const it of items) {
          const bs = p.fs(7);
          p.box(x + pad, cy - bs + 1, bs, TONE[col.tone]);
          p.text(ov(state, it.id, it.head), x + pad + bs + 4, cy, { size: 8.6, bold: true });
          cy += p.fs(9.2);
          const lines = p.wrap(it.desc, innerW - p.fs(8), 7.4);
          doc
            .setFont(FONT, 'normal')
            .setFontSize(p.fs(7.4))
            .setTextColor(...TONE.slate);
          doc.text(lines, x + pad + bs + 4, cy);
          cy += lines.length * p.fs(7.4) * 1.2 + p.fs(5.5);
        }
        for (const cline of custom) {
          cy = p.checkLine(x + pad, cy, innerW, cline, { size: 8, color: TONE[col.tone] });
          cy += p.fs(2);
        }
        maxH = Math.max(maxH, Math.max(h, cy - y + pad * 0.5));
      });
      y += maxH + p.fs(6);
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
      p.text(r.label, M + 6, ry, { size: 8.4, bold: true, color: TONE[r.zone] });
      p.text(r.desc, M + 6 + p.fs(38), ry, { size: 8.4, bold: r.bold, color: TONE[r.zone] });
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
    p.text(`Target RASS: ${rassTargetDef(state).label}`, x2 + 6, gy, {
      size: 10.5,
      bold: true,
      color: TONE.teal,
    });
    gy += p.fs(10);
    for (const line of goalLines) {
      p.text(line, x2 + 6, gy, { size: 7.6, bold: line === targetNote });
      gy += p.fs(9);
    }
    y += h + p.fs(6);
  }
  y = drawCustomSections(p, y, state, 1);
  p.guard(y);
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
          bullets: true,
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
          bullets: true,
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
  let doc;
  for (const shrink of [1, 0.94, 0.88, 0.82, 0.76]) {
    doc = new jsPDF({ unit: 'pt', format: 'letter', orientation });
    const painter = rounding
      ? buildRounding(doc, state, base * shrink)
      : buildSpa(doc, state, base * shrink);
    if (!painter.overflowed) break;
  }
  doc.setProperties({
    title: rounding ? 'ICU Delirium Rounding Tool' : 'SPA Quick Reference',
    subject: 'Bedside delirium reference sheet — reference aid only',
    keywords: 'delirium, CAM-ICU, RASS, ABCDEF, ICU, reference aid',
  });
  doc.save(rounding ? 'icu-delirium-rounding-tool.pdf' : 'spa-delirium-quick-reference.pdf');
}
