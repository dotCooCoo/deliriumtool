import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { rassTargetSet } from './scoring.js';

// jspdf-autotable v3 attaches doc.autoTable(...) once its plugin is applied to the
// jsPDF instance we import here. Apply it once at module load.
applyPlugin(jsPDF);

// ---- Palette (RGB) — muted, color-coded families: deep header + soft tint ----
// Neutrals
var INK = [31, 42, 48]; // #1F2A30  primary text
var SEC = [92, 107, 116]; // #5C6B74  secondary text
var LINE = [218, 226, 230]; // #DAE2E6  hairlines
var WHITE = [255, 255, 255];

// Six section families — [header] and [soft tint background]
var TEAL = [47, 117, 124],
  TEAL_T = [233, 243, 243]; // #2F757C / #E9F3F3
var CRIM = [164, 80, 90],
  CRIM_T = [250, 238, 239]; // #A4505A / #FAEEEF
var AMBER = [160, 106, 56],
  AMBER_T = [248, 238, 226]; // #A06A38 / #F8EEE2
var INDIGO = [82, 98, 140],
  INDIGO_T = [236, 239, 246]; // #52628C / #ECEFF6
var GREEN = [70, 122, 92],
  GREEN_T = [234, 243, 237]; // #467A5C / #EAF3ED
var PURPLE = [106, 90, 140],
  PURPLE_T = [240, 236, 246]; // #6A5A8C / #F0ECF6
var NAVY = [58, 71, 83]; // #3A4753  governance / footer slate

// Back-compat aliases (former brand names → muted palette) so existing draws restyle.
var CEREBRAL = TEAL,
  CLARITY = TEAL,
  GENTLE = [237, 242, 243],
  MONITOR = SEC,
  ACTION = CRIM,
  GREENOK = GREEN,
  LINEGRAY = LINE;

// Section family lookup for the ABCDEF bundle, DELIRIUM(S) factors, and SPA columns.
var FAMILIES = [TEAL, CRIM, AMBER, INDIGO, GREEN, PURPLE];
var FAMILY_T = [TEAL_T, CRIM_T, AMBER_T, INDIGO_T, GREEN_T, PURPLE_T];

// Pastel treatment: header bands are a light tint of the family color with dark
// same-hue text (deep family color stays as the checkbox outline / text accent).
function lighten(rgb, f) {
  return [
    Math.round(rgb[0] + (255 - rgb[0]) * f),
    Math.round(rgb[1] + (255 - rgb[1]) * f),
    Math.round(rgb[2] + (255 - rgb[2]) * f),
  ];
}
function darken(rgb, f) {
  return [Math.round(rgb[0] * (1 - f)), Math.round(rgb[1] * (1 - f)), Math.round(rgb[2] * (1 - f))];
}
var BAND_F = 0.62; // how light the pastel header band is vs the deep family color

// Page geometry (points)
var PW = 792,
  PH = 612,
  M = 28; // letter landscape, 28pt margins
var CW = PW - M * 2; // content width

// Sanitize text for jsPDF standard (WinAnsi) fonts — replace unsupported glyphs.
function S_(s) {
  if (s == null) return '';
  return String(s)
    .replace(/\u26A0\uFE0F?/g, '(!)') // warning sign
    .replace(/[\u2013\u2014\u2212]/g, '-') // en/em dash, minus sign
    .replace(/\u2192/g, '->') // right arrow
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u2191/g, 'up ')
    .replace(/\u2193/g, 'low ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2082/g, '2')
    .replace(/\u00B2/g, '2') // subscript/superscript 2 (O2)
    .replace(/\u2026/g, '...')
    .replace(/\u00B7/g, '\u00B7'); // middle dot is WinAnsi-ok, keep
}

// Free text for PDF cells: sanitises like S_ and neutralises line-leading checkbox
// tokens ("[ ]"/"[x]" -> "( )"/"(x)") so the checklist renderer never mistakes a
// clinician's free-text note/plan/action for an app-drawn checkbox.
function ftext(s) {
  return S_(s).replace(/^(\s*)\[([ Xx])\]/gm, '$1($2)');
}

// ---- helpers ----
function getJsPDF() {
  return jsPDF;
}
function runTable(doc, opts) {
  doc.autoTable(opts);
}

// The sedation target shown in the document body — sourced from settings so the
// body and the governance strip agree. Strips a trailing "(…)" note for the body.
function rassGoalOf(opts) {
  return S_(String((opts.settings || {}).rassTarget || '0 to -2').replace(/\s*\(.*\)\s*$/, ''));
}

// A deeper-than-light target carries its recorded indication onto the chart-facing
// SEDATION GOAL block, so a deep target never travels without its reason.
function rassIndicationOf(opts) {
  const s = opts.settings || {};
  const deep = rassTargetSet(s.rassTarget).some((n) => Number(n) <= -3);
  const ind = S_(String(s.rassIndication || '').trim());
  return deep && ind ? '\nIndication for deeper sedation: ' + ind : '';
}

// "[TARGET]" suffix for a RASS row when that row is within the configured band.
function tgtMark(opts, v) {
  return rassTargetSet((opts.settings || {}).rassTarget).indexOf(v) >= 0 ? '  [TARGET]' : '';
}

// Header: white bg, facility eyebrow + title, patient line, accent bar.
// White-label — no logo image; the document title leads.
function header(doc, logoB64, facility, title, sub, ptRight) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PW, 52, 'F');
  // facility eyebrow + title (lead at the left margin; no logo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.text((facility || '').toUpperCase(), M, 18);
  doc.setFontSize(14);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  doc.text(title, M, 32);
  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(SEC[0], SEC[1], SEC[2]);
    doc.text(sub, M, 42);
  }
  // patient/date (right)
  if (ptRight) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(SEC[0], SEC[1], SEC[2]);
    doc.text(ptRight, PW - M, 20, { align: 'right' });
  }
  // accent bar
  doc.setFillColor(TEAL[0], TEAL[1], TEAL[2]);
  doc.rect(0, 50, PW, 2.4, 'F');
  return 64;
}

// Colored section bar; returns y after bar
function sectionBar(doc, y, text, rgb, k) {
  k = k || 1;
  rgb = rgb || TEAL;
  var band = lighten(rgb, BAND_F),
    tx = darken(rgb, 0.2);
  var h = 16 * k;
  doc.setFillColor(band[0], band[1], band[2]);
  doc.rect(M, y, CW, h, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5 * k);
  doc.setTextColor(tx[0], tx[1], tx[2]);
  doc.text(text, M + 7, y + 11 * k);
  return y + h;
}

// ---- real checkboxes + color-coded checklist columns ----
// A drawn checkbox: rounded square outline in `accent`, with a checkmark if on.
function checkbox(doc, x, y, sz, accent, on) {
  accent = accent || INK;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(accent[0], accent[1], accent[2]);
  doc.setLineWidth(0.7);
  doc.roundedRect(x, y, sz, sz, 1.1, 1.1, 'FD');
  if (on) {
    doc.setLineWidth(1.1);
    doc.line(x + sz * 0.21, y + sz * 0.52, x + sz * 0.41, y + sz * 0.73);
    doc.line(x + sz * 0.41, y + sz * 0.73, x + sz * 0.8, y + sz * 0.26);
  }
}
// Pull the raw string out of an autoTable cell (cell.raw may be {content} or string).
function cellRaw(cell) {
  var r = cell && cell.raw;
  if (r && typeof r === 'object' && r.content != null) r = r.content;
  return r == null ? '' : String(r);
}
// Render a checklist cell ourselves: each "[ ]/[X] item" line becomes a real
// checkbox + text; other lines render as text (first line bold). Used as an
// autoTable didDrawCell so the table still handles columns/borders/heights.
function renderChecklistCell(doc, cell, accent) {
  var lines = cellRaw(cell).split('\n');
  var padL = cell.padding('left'),
    padT = cell.padding('top');
  var x = cell.x,
    w = cell.width,
    fs = cell.styles.fontSize;
  var lineH = fs * 1.18,
    boxSz = fs * 0.95,
    gap = 2.5;
  var cy = cell.y + padT + fs;
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i],
      m = ln.match(/^\[([ Xx])\]\s?([\s\S]*)$/);
    if (m) {
      var wrapped = doc.splitTextToSize(m[2], w - padL * 2 - boxSz - gap);
      checkbox(doc, x + padL, cy - boxSz + 1.2, boxSz, accent, m[1] !== ' ');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fs);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(wrapped, x + padL + boxSz + gap, cy);
      cy += wrapped.length * lineH;
    } else {
      var wrap2 = doc.splitTextToSize(ln, w - padL * 2);
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
      doc.setFontSize(fs);
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(wrap2, x + padL, cy);
      cy += wrap2.length * lineH;
    }
  }
}
// runTable wrapper: any body cell containing "[ ]/[X]" gets real checkboxes,
// tinted background, and an accent color (per-column via cb.accents, else TEAL).
function cbTable(doc, opts, cb) {
  cb = cb || {};
  var accents = cb.accents || null;
  var acc = function (ci) {
    return accents ? accents[ci % accents.length] : cb.accent || TEAL;
  };
  var tint = function (ci) {
    var a = acc(ci);
    var k = FAMILIES.indexOf(a);
    return k >= 0 ? FAMILY_T[k] : cb.tint || null;
  };
  var isCb = function (cell) {
    return cell.section === 'body' && /\[[ Xx]\]/.test(cellRaw(cell));
  };
  var uParse = opts.didParseCell,
    uWill = opts.willDrawCell,
    uDid = opts.didDrawCell;
  opts.didParseCell = function (d) {
    if (uParse) uParse(d);
    if (isCb(d.cell) && cb.tinted) {
      var t = tint(d.column.index);
      if (t) d.cell.styles.fillColor = t;
    }
  };
  opts.willDrawCell = function (d) {
    if (uWill) uWill(d);
    if (isCb(d.cell)) d.cell.text = []; // suppress autoTable's own text; we draw it
  };
  opts.didDrawCell = function (d) {
    if (uDid) uDid(d);
    if (isCb(d.cell)) renderChecklistCell(doc, d.cell, acc(d.column.index));
  };
  runTable(doc, opts);
}
// A manual, color-coded checklist column: accent header band + tinted body with
// real checkboxes. Full layout control (used for the ABCDEF bundle). `total`
// forces a common height so a row of columns aligns. Returns the bottom y.
function checklistColumn(doc, x, y, w, opts) {
  var accent = opts.accent || TEAL,
    tint = opts.tint || WHITE;
  var fs = opts.fontSize || 6.2,
    bandH = opts.bandH || 14,
    sc = fs / 6.2, // spacing tracks the (possibly reduced) font size
    pad = 4 * sc,
    boxSz = 6.4 * sc,
    gap = 3 * sc,
    lineH = fs * 1.2;
  var rows = (opts.items || []).map(function (it) {
    return { on: !!it.on, lines: doc.splitTextToSize(S_(it.t), w - pad * 2 - boxSz - gap) };
  });
  var bodyH = pad;
  rows.forEach(function (r) {
    bodyH += Math.max(boxSz, r.lines.length * lineH) + 3;
  });
  var totalH = opts.total || bandH + bodyH + pad;
  // body bg + outer border
  doc.setFillColor(tint[0], tint[1], tint[2]);
  doc.rect(x, y + bandH, w, totalH - bandH, 'F');
  // header band (pastel: light tint of the accent + dark same-hue text)
  var band = lighten(accent, BAND_F),
    tcol = darken(accent, 0.2);
  doc.setFillColor(band[0], band[1], band[2]);
  doc.rect(x, y, w, bandH, 'F');
  var tSize = opts.titleSize || 7.2,
    tLineH = tSize * 1.12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(tSize);
  doc.setTextColor(tcol[0], tcol[1], tcol[2]);
  var tLines = doc.splitTextToSize(S_(opts.title), w - pad * 2);
  var ty = y + (bandH - tLines.length * tLineH) / 2 + tSize - 0.5;
  doc.text(tLines, x + pad, ty);
  // items
  var iy = y + bandH + pad + fs;
  rows.forEach(function (r) {
    checkbox(doc, x + pad, iy - boxSz + 1.2, boxSz, accent, r.on);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fs);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(r.lines, x + pad + boxSz + gap, iy);
    iy += Math.max(boxSz, r.lines.length * lineH) + 3;
  });
  doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
  doc.setLineWidth(0.6);
  doc.rect(x, y, w, totalH);
  return y + totalH;
}
// Draw a row of color-coded checklist columns (computes a common height). `cols`
// = [{title, items:[{t,on}]}]; families assigned in order. Returns bottom y.
function checklistRow(doc, y, cols, fam, sk) {
  sk = sk || 1;
  fam = fam || FAMILIES;
  var n = cols.length,
    gap = 5 * sk,
    w = (CW - gap * (n - 1)) / n;
  var fs = 6.2 * sk,
    pad = 4 * sk,
    boxSz = 6.4 * sk,
    igap = 3 * sk,
    lineH = fs * 1.2;
  // common band height sized to the longest wrapped title so headers don't clip
  var tSize = 7.2 * sk,
    tLineH = tSize * 1.12,
    bandH = 14 * sk;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(tSize);
  cols.forEach(function (c) {
    var tl = doc.splitTextToSize(S_(c.title), w - pad * 2);
    bandH = Math.max(bandH, tl.length * tLineH + 7 * sk);
  });
  var maxH = 0;
  cols.forEach(function (c) {
    var h = bandH + pad;
    (c.items || []).forEach(function (it) {
      var ls = doc.splitTextToSize(S_(it.t), w - pad * 2 - boxSz - igap);
      h += Math.max(boxSz, ls.length * lineH) + 3 * sk;
    });
    h += pad;
    if (h > maxH) maxH = h;
  });
  for (var i = 0; i < n; i++) {
    var ci = i % fam.length;
    checklistColumn(doc, M + i * (w + gap), y, w, {
      title: cols[i].title,
      accent: fam[ci],
      tint: FAMILY_T[FAMILIES.indexOf(fam[ci])] || WHITE,
      items: cols[i].items,
      total: maxH,
      bandH: bandH,
      fontSize: fs,
    });
  }
  return y + maxH;
}

function footer(doc) {
  // Centered disclaimer only; the generation stamp (left) + page numbers (right)
  // are added per-page in stampPageNumbers. Facility + document title already
  // appear in the header, so they are not repeated here.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(150, 150, 160);
  var txt =
    'Reference aid only \u2014 follow local policy & prescriber/pharmacy review  \u00B7  Sources: PADIS 2018+2025, ICU Liberation, Beers 2023, NICE CG103';
  doc.text(txt, PW / 2, PH - 14, { align: 'center' });
}

// Protocol governance block (from the Setup tab) \u2014 printed on the generated documents.
function governanceStrip(doc, y, st, k) {
  if (!st) return y;
  k = k || 1;
  y = sectionBar(doc, y, 'PROTOCOL & GOVERNANCE', NAVY, k);
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 6.8 * k,
      cellPadding: 3.5 * k,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      textColor: INK,
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: CW / 4 },
      1: { cellWidth: CW / 4 },
      2: { cellWidth: CW / 4 },
      3: { cellWidth: CW / 4 },
    },
    body: [
      [
        'Protocol version: ' + S_(st.version || '-'),
        'Screening: ' + S_(st.screen || '-') + (st.camfreq ? ' (' + S_(st.camfreq) + ')' : ''),
        'Target RASS: ' + S_(st.rassTarget || '-'),
        'Reviewed: ' +
          S_(st.lastRev || '-') +
          (st.nextRev ? '  \u00B7  Next due: ' + S_(st.nextRev) : ''),
      ],
      [
        { content: 'Medical Director: ' + S_(st.director || '-'), colSpan: 2 },
        { content: 'CNO / Nurse Leader: ' + S_(st.cno || '-'), colSpan: 2 },
      ],
    ],
  });
  y = doc.lastAutoTable.finalY;
  if (st.footer) {
    cbTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      theme: 'grid',
      styles: {
        fontSize: 6.5 * k,
        cellPadding: 3.5 * k,
        lineColor: LINEGRAY,
        lineWidth: 0.5,
        textColor: MONITOR,
        valign: 'top',
      },
      body: [['Disclaimer: ' + S_(st.footer)]],
    });
    y = doc.lastAutoTable.finalY;
  }
  return y;
}
// Stamp "Page X of N" on every page after the document is fully built.
function stampPageNumbers(doc, generatedAt) {
  var n = doc.internal.getNumberOfPages();
  for (var i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 160);
    doc.text('Page ' + i + ' of ' + n, PW - M, PH - 14, { align: 'right' });
    // Generation timestamp (bottom-left) so a user can tell two prints apart.
    if (generatedAt) doc.text('Generated ' + generatedAt, M, PH - 14, { align: 'left' });
  }
}

// ============================================================
// DOCUMENT 1 — FULL ICU DELIRIUM ROUNDING TOOL
// ============================================================
function buildFull(doc, opts, k) {
  k = k || 1; // page-1 scale, chosen by buildFullFitted so the checklist fits one page
  var facility = opts.facility,
    dt = opts.dt,
    meds = opts.meds || [],
    logo = opts.logoB64;
  var ASMT = opts.assessment || {};
  function _tk(on) {
    return on ? '[X]' : '[ ]';
  }
  function _rmark(label, vals) {
    var hit = vals.indexOf(ASMT.rass) >= 0;
    return (hit ? '>> ' : '') + label + (hit ? '  <<' : '');
  }
  var blank = '__________________';

  // ---------- PAGE 1 ----------
  var y = header(
    doc,
    logo,
    facility,
    'ICU Delirium Rounding Tool',
    'Bedside nurse checklist for multidisciplinary rounds',
    'Patient: ' + blank + '   Room: ______   Date: ' + dt,
  );

  // Assessment row (4 cells) via table
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 7 * k,
      cellPadding: 4 * k,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      textColor: INK,
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: CW / 4 },
      1: { cellWidth: CW / 4 },
      2: { cellWidth: CW / 4 },
      3: { cellWidth: CW / 4 },
    },
    body: [
      [
        {
          content:
            'SEDATION GOAL\n\nTarget RASS: ' +
            rassGoalOf(opts) +
            rassIndicationOf(opts) +
            '\nAvoid deep sedation unless clinically required.\nDaily SAT/SBT when feasible.',
        },
        {
          content:
            'CAM-ICU RESULT\n\n' +
            _tk(ASMT.cam === 'positive') +
            ' Positive - delirium present\n' +
            _tk(ASMT.cam === 'negative') +
            ' Negative\n' +
            _tk(ASMT.cam === 'unable') +
            ' Unable to assess (RASS -4/-5)',
        },
        {
          content:
            'DELIRIUM SUBTYPE\n(predominant motor behaviour this shift)\n\n' +
            _tk(ASMT.sub === 'hyper') +
            ' Hyperactive\n' +
            _tk(ASMT.sub === 'hypo') +
            ' Hypoactive\n' +
            _tk(ASMT.sub === 'mixed') +
            ' Mixed - alternating features',
        },
        {
          content:
            'RASS THIS ASSESSMENT' +
            (ASMT.rass ? ': ' + ASMT.rass : '') +
            '\n\n' +
            _rmark('+4/+3 Combative / Very Agitated', ['+4', '+3']) +
            '\n' +
            _rmark('+2/+1 Agitated / Restless', ['+2', '+1']) +
            '\n' +
            _rmark('0 Alert & Calm' + tgtMark(opts, '0'), ['0']) +
            '\n' +
            _rmark('-1 Drowsy' + tgtMark(opts, '-1'), ['-1']) +
            '\n' +
            _rmark('-2 Light Sedation' + tgtMark(opts, '-2'), ['-2']) +
            '\n' +
            _rmark('-3 Moderate Sedation' + tgtMark(opts, '-3'), ['-3']) +
            '\n' +
            _rmark('-4 Deep Sedation' + tgtMark(opts, '-4'), ['-4']) +
            '\n' +
            _rmark('-5 Unarousable' + tgtMark(opts, '-5'), ['-5']),
        },
      ],
    ],
    didParseCell: function (d) {
      // bold the first line (label) by splitting — emulate with header-ish styling
      if (d.cell.raw && d.cell.text.length) {
        d.cell.styles.fontStyle = 'normal';
      }
    },
  });
  y = doc.lastAutoTable.finalY;

  // THIS ASSESSMENT — completion status + free-text notes (reflects the tool)
  y = sectionBar(doc, y, 'THIS ASSESSMENT  ·  STATUS & NOTES', MONITOR, k);
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 6.8 * k,
      cellPadding: 3.5 * k,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      textColor: INK,
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: CW / 4 },
      1: { cellWidth: CW / 4 },
      2: { cellWidth: CW / 4 },
      3: { cellWidth: CW / 4 },
    },
    body: [
      [
        'Risk factors: ' +
          (ASMT.risk || 0) +
          '/16 (' +
          (ASMT.riskTier || '-') +
          ') — count of present factors, not a validated score',
        'ABCDEF bundle: ' + (ASMT.bundleOn || 0) + '/' + (ASMT.bundleAll || 0),
        'DELIRIUM(S) reviewed: ' + (ASMT.mnemOn || 0) + '/' + (ASMT.mnemAll || 0),
        'Treatment steps: ' +
          (ASMT.treatOn || 0) +
          '/' +
          (ASMT.treatAll || 0) +
          (ASMT.consults && ASMT.consults.length
            ? '\nConsults: ' + S_(ASMT.consults.join(', '))
            : ''),
      ],
    ],
  });
  y = doc.lastAutoTable.finalY;
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 6.8 * k,
      cellPadding: 3.5 * k,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      textColor: INK,
      valign: 'top',
    },
    body: [
      [
        'ASSESSMENT NOTES:  ' +
          (ASMT.notes
            ? ftext(ASMT.notes)
            : '________________________________________________________________') +
          (ASMT.plan ? '\n\nTREATMENT PLAN:  ' + ftext(ASMT.plan) : ''),
      ],
    ],
  });
  y = doc.lastAutoTable.finalY;

  // STEP 1 — DELIRIUM(S) mnemonic (9 cells, 1 row)
  y = sectionBar(
    doc,
    y,
    'STEP 1  ·  IDENTIFY & ADDRESS CAUSATIVE FACTORS (DELIRIUM(S) MNEMONIC)',
    INDIGO,
    k,
  );
  var mnem = [
    [
      'D — Drugs / Withdrawal',
      'Deliriogenic agents? Dose reduction? Withdrawal (alcohol/benzo/opioid) — treat to RASS, not CIWA, in the ICU.',
    ],
    ['E — Eyes/Ears/Env', 'Glasses & hearing aids in? Whiteboard updated? Daytime lights?'],
    ['L — Low O2/Liver', 'Check SpO2, Hgb, cardiac/PE events, liver function.'],
    ['I — Infection', 'Fever, leukocytosis, cultures pending? Occult sepsis?'],
    [
      'R — Retention',
      'Urinary retention or constipation? Bladder scan; disimpact / catheterize if indicated.',
    ],
    [
      'I — Ictal/Seizure',
      'Non-convulsive seizures/status? Esp. unexplained low LOC. Consider EEG.',
    ],
    [
      'U — Under-hydration / Nutrition',
      'Volume status, intake, electrolytes. Parenteral thiamine BEFORE glucose. At-risk (malnutrition/alcohol use): 100-300 mg IV daily (ESPEN). Suspected Wernicke (guidelines diverge, low-certainty): EFNS 200 mg IV TID or RCP 500 mg IV TID x 2-3 days then 250 mg taper.',
    ],
    ['M — Metabolic', 'Na, Mg, Ca, glucose, BUN/Cr, acid-base.'],
    [
      'S — Subdural / Sleep',
      'Subdural hematoma (recent fall or anticoagulation)? Sleep deprivation?',
    ],
  ];
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 6.3 * k,
      cellPadding: 3 * k,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      valign: 'top',
      textColor: INK,
    },
    body: [
      mnem.map(function (mm, i) {
        var d = (ASMT.mnemDomains && ASMT.mnemDomains[i]) || {};
        return {
          content:
            mm[0] +
            '\n' +
            mm[1] +
            '\n\n' +
            _tk(d.reviewed) +
            ' Reviewed   Action: ' +
            (d.action ? ftext(d.action) : '______'),
          styles: {},
        };
      }),
    ],
    columnStyles: (function () {
      var cs = {};
      for (var i = 0; i < 9; i++) cs[i] = { cellWidth: CW / 9 };
      return cs;
    })(),
    didParseCell: function (d) {
      var t = d.cell.text.join('\n');
      // make the letter/title line bold-ish by drawing later is complex; keep simple
    },
  });
  y = doc.lastAutoTable.finalY;

  // STEP 2 — ABCDEF non-pharmacologic bundle (6 color-coded columns, real checkboxes)
  y = sectionBar(
    doc,
    y,
    'STEP 2  ·  NON-PHARMACOLOGIC BUNDLE (ABCDEF) — APPLY TO ALL PATIENTS',
    TEAL,
    k,
  );
  var bundleCols =
    ASMT.bundle && ASMT.bundle.length
      ? ASMT.bundle.map(function (c) {
          return {
            title: c.hdr,
            items: c.items.map(function (it) {
              return { t: it.t, on: it.on };
            }),
          };
        })
      : [
          {
            title: 'A — Pain',
            items: [
              { t: 'NRS or CPOT routinely' },
              { t: 'Adequate analgesia' },
              { t: 'Non-pharm strategies' },
              { t: 'Multimodal; limit opioids' },
            ],
          },
          {
            title: 'B — SAT & SBT',
            items: [
              { t: 'SAT done / contraind.' },
              { t: 'SBT done / contraind.' },
              { t: 'Coordinated with RT' },
              { t: 'Fail SAT -> restart sedation at half dose' },
            ],
          },
          {
            title: 'C — Choice of Analgesia/Sedation',
            items: [
              { t: 'Target RASS set (' + rassGoalOf(opts) + ')' },
              { t: 'Benzos minimized; dex preferred' },
              { t: 'Analgesia-first' },
              { t: 'Bolus over infusion' },
            ],
          },
          {
            title: 'D — Delirium: Assess/Prevent/Manage',
            items: [
              { t: 'CAM-ICU this shift' },
              { t: 'RASS documented' },
              { t: 'Precipitants addressed' },
              { t: 'Family educated' },
            ],
          },
          {
            title: 'E — Early Mobility',
            items: [
              { t: 'Mobility assessed' },
              { t: 'PT/OT or exercises' },
              { t: 'Lines/restraints removed' },
              { t: 'HOB elevated' },
            ],
          },
          {
            title: 'F — Family Engagement',
            items: [
              { t: 'Family present/contacted' },
              { t: 'Educated on delirium' },
              { t: 'Familiar objects; T-A-D-A' },
              { t: 'Glasses/hearing aids' },
            ],
          },
        ];
  y = checklistRow(doc, y, bundleCols, null, k);

  // Sleep & orientation strip
  y = sectionBar(doc, y, 'SLEEP & ORIENTATION MEASURES', GREENOK, k);
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 6.6 * k,
      cellPadding: 3 * k,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      textColor: INK,
    },
    body: [
      (ASMT.sleep && ASMT.sleep.length
        ? ASMT.sleep
        : [
            { t: 'Nighttime light/noise reduction per unit quiet-hours protocol' },
            { t: 'Eye mask & earplugs offered' },
            { t: 'Orientation board / whiteboard updated' },
            { t: 'Non-urgent procedures clustered to protect sleep' },
            { t: 'Clock and calendar visible' },
            { t: 'Verbal reorientation each encounter' },
            { t: 'Oral care completed; adequate hydration reviewed' },
          ]
      ).map(function (it) {
        return _tk(it.on) + ' ' + S_(it.t);
      }),
    ],
    columnStyles: (function () {
      var n = ASMT.sleep && ASMT.sleep.length ? ASMT.sleep.length : 7;
      var cs = {};
      for (var i = 0; i < n; i++) cs[i] = { cellWidth: CW / n };
      return cs;
    })(),
  });
  y = doc.lastAutoTable.finalY;
  y = governanceStrip(doc, y, opts.settings, k);

  footer(doc);

  // ---------- PAGE 2 ----------
  doc.addPage('letter', 'landscape');
  y = header(
    doc,
    logo,
    facility,
    'ICU Delirium Rounding Tool — Page 2',
    'Pharmacologic guidance · Deliriogenic medications · Nurse care pathway',
    'Patient: ' + blank + '   Date: ' + dt,
  );

  y = sectionBar(
    doc,
    y,
    'STEP 3  ·  PHARMACOLOGIC CONSIDERATIONS (SAFETY INDICATION ONLY)',
    ACTION,
  );
  if (ASMT.rx && ASMT.rx.length) {
    cbTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      theme: 'grid',
      styles: {
        fontSize: 6.6,
        cellPadding: 3.5,
        lineColor: LINEGRAY,
        lineWidth: 0.5,
        textColor: INK,
        valign: 'top',
      },
      body: [
        [
          'SAFETY CHECKLIST\n' +
            ASMT.rx
              .map(function (it) {
                return (it.on ? '[X] ' : '[ ] ') + S_(it.t);
              })
              .join('\n'),
        ],
      ],
    });
    y = doc.lastAutoTable.finalY;
  }
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 4,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      textColor: INK,
      valign: 'top',
    },
    head: [['Drug', 'Typical Dose', 'Key Notes']],
    headStyles: { fillColor: CEREBRAL, textColor: 255, fontSize: 7.2 },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold' },
      1: { cellWidth: 200 },
      2: { cellWidth: CW - 310 },
    },
    body: [
      [
        'Haloperidol',
        '0.25-0.5mg q4-6h PRN; lowest effective dose, cap per local protocol',
        'Elderly more sensitive (EPS/QTc rise with dose); EKG baseline; monitor QTc (caution >500ms); avoid Parkinson/Lewy body; dementia-mortality boxed warning',
      ],
      [
        'Quetiapine',
        '12.5-25mg q12h PO; lowest dose, shortest duration',
        'Sedating; orthostatic hypotension; QTc prolongation',
      ],
      [
        'Dexmedetomidine',
        '0.2-0.7 mcg/kg/hr IV infusion',
        'MV adults: agitation preventing weaning, or when light sedation/delirium reduction is a priority (PADIS 2025, over propofol); monitor bradycardia/hypotension',
      ],
      [
        'Lorazepam (specific use)',
        'Per CIWA protocol',
        'Rescue / ETOH withdrawal ONLY — may worsen delirium',
      ],
      [
        'Melatonin',
        '0.5-3mg nightly',
        'May be considered for sleep/circadian support; low-certainty ICU evidence (Pro-MEDIC RCT; 2025 ICU meta-analysis); not a treatment for established delirium and prevention evidence is mixed',
      ],
    ],
  });
  y = doc.lastAutoTable.finalY + 4;
  // danger / framing note (wrapped)
  var dnText =
    'Antipsychotics are for short-term control of dangerous agitation only — they do NOT treat or shorten delirium (MIND-USA negative). No antipsychotics at discharge without a psychiatric indication; reassess daily and document a stop/taper plan. Reduce doses for renal/hepatic impairment and frail elderly. Doses shown are conventional/expert starting references, not guideline-calibrated; dexmedetomidine is a sedative infusion for ventilated patients, not a PRN antipsychotic-equivalent.   Do NOT stop abruptly: benzodiazepines · opioids · SSRIs · steroids · antiepileptics · dexmedetomidine.';
  var dnLines = doc.splitTextToSize(dnText, CW - 12);
  var dnH = dnLines.length * 8 + 6;
  doc.setFillColor(255, 237, 233);
  doc.rect(M, y, CW, dnH, 'F');
  doc.setTextColor(ACTION[0], ACTION[1], ACTION[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(dnLines, M + 6, y + 9);
  y += dnH + 6;

  // Deliriogenic medications — manual 2-column tiles (robust)
  y = sectionBar(doc, y, 'DELIRIOGENIC MEDICATIONS TO REVIEW & LIMIT DAILY', AMBER);
  y += 6;
  var medColors = {
    benzo: ACTION,
    opioids: [226, 80, 47],
    antichol: CEREBRAL,
    sedatives: [0, 71, 184],
    antipsych: CLARITY,
    antidep: [30, 111, 208],
    antimicro: [20, 136, 200],
    cardiac: [58, 70, 84],
    steroids: [19, 32, 94],
    gi: [44, 127, 184],
    other: MONITOR,
  };
  var tcolW = (CW - 8) / 2,
    tgap = 8;
  var colY = [y, y]; // bottom-y tracker for each of 2 columns
  if (!meds.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(MONITOR[0], MONITOR[1], MONITOR[2]);
    doc.text(
      'No medications selected for review. Enable categories on the Medications tab to populate this section.',
      M + 4,
      y + 6,
    );
    y += 16;
  } else {
    meds.forEach(function (c) {
      var col = colY[0] <= colY[1] ? 0 : 1;
      var tx = M + col * (tcolW + tgap);
      var bottom = drawMedTile(
        doc,
        tx,
        colY[col],
        tcolW,
        c.label,
        c.items,
        medColors[c.id] || CEREBRAL,
      );
      colY[col] = bottom + 5;
    });
    y = Math.max(colY[0], colY[1]);
  }

  // STEP 4 — Nurse care pathway (7 steps in 5 columns). New page if insufficient room.
  if (y > PH - 96) {
    doc.addPage('letter', 'landscape');
    y = header(
      doc,
      logo,
      facility,
      'ICU Delirium Rounding Tool — Nurse Care Pathway',
      'Report each step status during rounds',
      'Patient: ' + blank + '   Date: ' + dt,
    );
  } else {
    y += 6;
  }
  y = sectionBar(
    doc,
    y,
    'STEP 4  \u00B7  NURSE CARE PATHWAY (7 STEPS) — REPORT EACH STEP STATUS DURING ROUNDS',
    PURPLE,
  );
  var pathway = ASMT.pathway && ASMT.pathway.length ? ASMT.pathway : null;
  if (pathway) {
    cbTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      theme: 'grid',
      styles: {
        fontSize: 6.0,
        cellPadding: 3,
        lineColor: LINEGRAY,
        lineWidth: 0.5,
        valign: 'top',
        textColor: INK,
      },
      head: [
        pathway.map(function (c) {
          return c.hdr;
        }),
      ],
      headStyles: { fillColor: CEREBRAL, textColor: 255, fontSize: 6.6 },
      columnStyles: (function () {
        var cs = {};
        for (var i = 0; i < pathway.length; i++) cs[i] = { cellWidth: CW / pathway.length };
        return cs;
      })(),
      body: [
        pathway.map(function (c) {
          return c.items
            .map(function (it) {
              return (it.on ? '[X] ' : '[ ] ') + S_(it.t);
            })
            .join('\n');
        }),
      ],
    });
  } else {
    cbTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      theme: 'grid',
      styles: {
        fontSize: 6.3,
        cellPadding: 3,
        lineColor: LINEGRAY,
        lineWidth: 0.5,
        valign: 'top',
        textColor: INK,
      },
      head: [
        [
          '1 \u00B7 Deter',
          '2 \u00B7 Detect',
          '3 \u00B7 Do (Acute)',
          '4-6 \u00B7 Daily Care',
          '7 \u00B7 Discharge',
        ],
      ],
      headStyles: { fillColor: CEREBRAL, textColor: 255, fontSize: 6.6 },
      columnStyles: {
        0: { cellWidth: CW / 5 },
        1: { cellWidth: CW / 5 },
        2: { cellWidth: CW / 5 },
        3: { cellWidth: CW / 5 },
        4: { cellWidth: CW / 5 },
      },
      body: [
        [
          '[ ] No deliriogenic drugs added today\n[ ] No abrupt med discontinuation\n[ ] Lines/devices limited to essential\n[ ] Bundle applied (Step 2)',
          '[ ] CAM-ICU completed this shift\n[ ] RASS documented\n[ ] Baseline mental status known\n[ ] Provider notified if first positive CAM',
          '[ ] Fall-prevention active\n[ ] Devices removed/disguised\n[ ] Family teaching done\n[ ] T-A-D-A approach applied\n[ ] Plan individualized',
          '[ ] CAM once per shift + PRN\n[ ] Comfort/calm/consistent\n[ ] Toileting/hydration\n[ ] Adequate nutrition\n[ ] Sleep/wake cycle maintained\n[ ] Meds reassessed & documented',
          '[ ] Delirium course/cause documented\n[ ] Unnecessary psychotropics stopped\n[ ] Successful strategies documented\n[ ] Follow-up if unresolved\n[ ] Family & patient educated',
        ],
      ],
    });
  }

  footer(doc);
}

// ============================================================
// DOCUMENT 2 — SPA QUICK REFERENCE
// ============================================================
function buildSpa(doc, opts) {
  var facility = opts.facility,
    dt = opts.dt,
    meds = opts.meds || [],
    logo = opts.logoB64;
  var ASMT = opts.assessment || {};
  function _tk(on) {
    return on ? '[X]' : '[ ]';
  }
  function _rmark(label, vals) {
    var hit = vals.indexOf(ASMT.rass) >= 0;
    return (hit ? '>> ' : '') + label + (hit ? '  <<' : '');
  }
  var blank = '__________________';

  var y = header(
    doc,
    logo,
    facility,
    'SPA Quick Reference — Delirium Prevention & Management',
    'High-impact, high-frequency actions for delirium prevention & management · For all inpatient units',
    'Patient: ' + blank + '   Unit: ______   Date: ' + dt,
  );

  // 3 SPA columns
  var S = [
    [
      'Target RASS ' + rassGoalOf(opts),
      'Set a RASS goal every shift. Avoid moderate-to-deep sedation (RASS -3 or lower) unless clinically required.',
    ],
    [
      'Lightest sedative possible',
      'Prefer dexmedetomidine or propofol over benzodiazepines. Benzos increase delirium risk.',
    ],
    [
      'Bolus over continuous infusion',
      'When safe, use intermittent bolus dosing rather than continuous drips.',
    ],
    [
      'Daily SAT/SBT',
      'Spontaneous Awakening + Breathing Trial daily when feasible. Coordinate with RT.',
    ],
    [
      'CAM-ICU & RASS each shift',
      'Document RASS; complete CAM-ICU once per shift and with any change in mental status.',
    ],
  ];
  var P = [
    [
      'Multimodal pain management',
      'Scheduled acetaminophen, NSAIDs (if appropriate), regional/neuraxial techniques to limit opioids.',
    ],
    [
      'Review medication list daily',
      'Can any deliriogenic drug be stopped/reduced/substituted? Benzos, anticholinergics, antihistamines, high-dose steroids.',
    ],
    ['Treat pain before sedation', 'Analgesia-first; uncontrolled pain drives agitation.'],
    [
      'Avoid meperidine entirely',
      'Highest delirium risk of all opioids. Do not use in delirium-risk patients.',
    ],
    [
      'Consider melatonin for sleep',
      '0.5-3mg nightly; may help sleep but ICU benefit is low-certainty; not a treatment for delirium.',
    ],
  ];
  var A = [
    [
      'Mobilize — remove barriers',
      'Get the patient up. D/C foley, central lines, restraints as soon as safe. Immobility drives delirium.',
    ],
    [
      'PT/OT consult early',
      'Order PT & OT at admission for at-risk ICU patients. Earlier is better.',
    ],
    [
      'Glasses, hearing aids, orient',
      'Sensory deprivation is reversible. Update orientation board every shift.',
    ],
    [
      'Engage family & caregivers',
      'Familiar faces reorient. Teach T-A-D-A (Tolerate, Anticipate, Dont Agitate).',
    ],
    [
      'Protect sleep — day/night',
      'Dim lights per unit quiet-hours protocol, cluster cares, eye masks/earplugs. Restore circadian rhythm.',
    ],
  ];
  function spaColCell(letter, word, tagline, items) {
    return { letter: letter, word: word, tagline: tagline, items: items };
  }
  var spaColors = { S: TEAL, P: AMBER, A: INDIGO };
  var colW = (CW - 16) / 3,
    gap = 8;
  var cols = [
    spaColCell('S', 'Sedation', 'Lightest, non-deliriogenic, targeted', S),
    spaColCell('P', 'Pain / Pharmacy', 'Multimodal, review meds daily', P),
    spaColCell('A', 'Activity / Awareness', 'Mobilize, remove devices, orient', A),
  ];
  var maxBottom = y;
  for (var ci = 0; ci < 3; ci++) {
    var cx = M + ci * (colW + gap);
    var bottom = drawChecklistColumn(
      doc,
      cx,
      y,
      colW,
      22,
      cols[ci].letter,
      cols[ci].word,
      cols[ci].tagline,
      cols[ci].items,
      spaColors[cols[ci].letter],
    );
    if (bottom > maxBottom) maxBottom = bottom;
  }
  // outer borders for the three columns down to the common bottom
  doc.setDrawColor(LINEGRAY[0], LINEGRAY[1], LINEGRAY[2]);
  doc.setLineWidth(0.5);
  for (var cb = 0; cb < 3; cb++) {
    var bx = M + cb * (colW + gap);
    doc.rect(bx, y, colW, maxBottom - y);
  }
  y = maxBottom + 8;

  // Assessment strip (CAM / RASS / Subtype / Sedation goal)
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 6.6,
      cellPadding: 4,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      valign: 'top',
      textColor: INK,
    },
    columnStyles: {
      0: { cellWidth: CW / 4 },
      1: { cellWidth: CW / 4 },
      2: { cellWidth: CW / 4 },
      3: { cellWidth: CW / 4 },
    },
    body: [
      [
        'CAM-ICU RESULT\n' +
          _tk(ASMT.cam === 'positive') +
          ' Positive\n' +
          _tk(ASMT.cam === 'negative') +
          ' Negative\n' +
          _tk(ASMT.cam === 'unable') +
          ' Unable to assess (RASS -4/-5)',
        'RASS THIS ASSESSMENT' +
          (ASMT.rass ? ': ' + ASMT.rass : '') +
          '\n' +
          _rmark('+4/+3 Combative/Very Agitated', ['+4', '+3']) +
          '\n' +
          _rmark('+2/+1 Agitated/Restless', ['+2', '+1']) +
          '\n' +
          _rmark('0 Alert & Calm' + tgtMark(opts, '0'), ['0']) +
          '\n' +
          _rmark('-1 Drowsy' + tgtMark(opts, '-1'), ['-1']) +
          '\n' +
          _rmark('-2 Light Sedation' + tgtMark(opts, '-2'), ['-2']) +
          '\n' +
          _rmark('-3 Moderate Sedation' + tgtMark(opts, '-3'), ['-3']) +
          '\n' +
          _rmark('-4 Deep Sedation' + tgtMark(opts, '-4'), ['-4']) +
          '\n' +
          _rmark('-5 Unarousable' + tgtMark(opts, '-5'), ['-5']),
        'DELIRIUM SUBTYPE\n' +
          _tk(ASMT.sub === 'hyper') +
          ' Hyperactive (~23%, least common)\n' +
          _tk(ASMT.sub === 'hypo') +
          ' Hypoactive (most common, often missed)\n' +
          _tk(ASMT.sub === 'mixed') +
          ' Mixed - alternating',
        'SEDATION GOAL\nTarget RASS: ' +
          rassGoalOf(opts) +
          rassIndicationOf(opts) +
          '\nAvoid deep sedation unless required.\nDaily SAT/SBT when feasible.\nDocument goal each shift.',
      ],
    ],
  });
  y = doc.lastAutoTable.finalY;
  if (ASMT.notes || ASMT.plan) {
    cbTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      theme: 'grid',
      styles: {
        fontSize: 6.6,
        cellPadding: 3.5,
        lineColor: LINEGRAY,
        lineWidth: 0.5,
        textColor: INK,
        valign: 'top',
      },
      body: [
        [
          'ASSESSMENT NOTES:  ' +
            ftext(ASMT.notes || '-') +
            (ASMT.plan ? '\nPLAN:  ' + ftext(ASMT.plan) : ''),
        ],
      ],
    });
    y = doc.lastAutoTable.finalY;
  }
  y = governanceStrip(doc, y, opts.settings);

  footer(doc);

  // ---------- PAGE 2 ----------
  doc.addPage('letter', 'landscape');
  y = header(
    doc,
    logo,
    facility,
    'SPA Reference — Deeper Guidance & Medication Review',
    'Key actions per domain · Deliriogenic medications · Escalation',
    'Date: ' + dt,
  );

  y = sectionBar(doc, y, 'DEEPER GUIDANCE — KEY ACTIONS PER DOMAIN', AMBER);
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 6.4,
      cellPadding: 4,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      valign: 'top',
      textColor: INK,
    },
    head: [
      [
        'S — Sedation: What to Do',
        'P — Pain/Pharmacy: What to Check',
        'A — Activity/Awareness: Priorities',
      ],
    ],
    headStyles: { fillColor: CLARITY, textColor: 255, fontSize: 6.8 },
    columnStyles: { 0: { cellWidth: CW / 3 }, 1: { cellWidth: CW / 3 }, 2: { cellWidth: CW / 3 } },
    body: [
      [
        'Dexmedetomidine preferred in ventilated patients; reduces delirium vs benzos; monitor bradycardia/hypotension.\n\nPropofol acceptable short-term; daily cost/benefit.\n\nAvoid midazolam/lorazepam for routine sedation.\n\nException: benzos first-line for alcohol/benzo withdrawal (CIWA).\n\nHaloperidol 0.25-0.5mg IV/IM q4-6h PRN for hyperactive delirium w/ safety risk; lowest effective dose, cap per local protocol; check QTc; elderly are more sensitive (EPS/QTc; dementia-mortality boxed warning).\n\nQuetiapine 12.5-25mg PO q12h if oral available; monitor QTc & orthostasis.',
        'Scheduled acetaminophen 650-975mg q6h (if no hepatic contraindication) as a multimodal, opioid-sparing adjunct.\n\nRegional anesthesia (nerve blocks, epidurals) preferred for surgical patients.\n\nPain assessment routinely / per unit protocol - NRS if able to self-report, CPOT or BPS if not.\n\nPharmacy consult for any CAM-positive patient or high anticholinergic/sedative burden (polypharmacy >= 5 meds is a common practice heuristic).\n\nElectrolytes Na, K, Mg, Ca, Phos, glucose - check and correct per clinical indication.\n\nCheck for infection/occult sepsis in new delirium.',
        'Every device = barrier to mobility. Remove the urinary catheter as early as clinically feasible. CVC reassess daily. Restraints: least restrictive.\n\n4-level mobility: passive ROM -> edge-of-bed -> chair -> ambulate. Target chair daily.\n\nT-A-D-A: Tolerate seemingly dangerous (but not truly harmful) behaviors, Anticipate triggers, Dont Agitate.\n\nOrientation board: date, team, daily goal each shift.\n\nSleep hygiene: dim lights per unit quiet-hours protocol, cluster vitals/labs, ear protection.',
      ],
    ],
  });
  y = doc.lastAutoTable.finalY;

  // Med review band (compact, all categories inline)
  y = sectionBar(doc, y, 'DELIRIOGENIC MEDICATIONS TO REVIEW & LIMIT DAILY', AMBER);
  var medBody = meds.map(function (c) {
    return [
      {
        content: S_(c.label),
        styles: { fontStyle: 'bold', fillColor: GENTLE, textColor: CEREBRAL },
      },
      S_(c.items.join('  \u00B7  ')),
    ];
  });
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 6.1,
      cellPadding: 2.5,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      valign: 'top',
      textColor: INK,
    },
    columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: CW - 150 } },
    body: medBody,
  });
  y = doc.lastAutoTable.finalY;

  // Escalation 4 steps
  y = sectionBar(doc, y, 'ESCALATION — WHEN TO ACT & HOW', CRIM);
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 6.3,
      cellPadding: 3,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      valign: 'top',
      textColor: INK,
    },
    head: [
      [
        'Step 1 · All Patients',
        'Step 2 · CAM Positive',
        'Step 3 · Persistent >1 Shift',
        'Step 4 · Safety Risk Only',
      ],
    ],
    headStyles: { fillColor: CEREBRAL, textColor: 255, fontSize: 6.6 },
    columnStyles: {
      0: { cellWidth: CW / 4 },
      1: { cellWidth: CW / 4 },
      2: { cellWidth: CW / 4 },
      3: { cellWidth: CW / 4 },
    },
    body: [
      [
        'Apply SPA measures on admission\nCAM-ICU once per shift + RASS each shift\nMedication review & bundle in place',
        'Notify provider; document in chart\nIntensify all SPA measures\nTreat reversible causes: labs, meds, infection, pain\nConsider 1:1 sitter; family presence',
        'Geriatrics or psychiatry consult\nPharmacy medication optimization\nReassess sedation strategy\nBrain imaging if focal neuro signs',
        'Document safety indication first\nHaloperidol 0.25-0.5mg — short-term agitation control only (not a treatment for delirium; MIND-USA negative)\nCheck QTc; lowest dose, shortest duration\nReassess daily; taper/stop plan; none at discharge without psych Rx',
      ],
    ],
    didParseCell: function (d) {
      if (d.section === 'head') {
        var colors = [GREENOK, CEREBRAL, [19, 32, 94], ACTION];
        d.cell.styles.fillColor = colors[d.column.index];
      }
    },
  });

  footer(doc);
}

// ============================================================
// DOCUMENT 3 — ONE-PAGE COMPLETED ASSESSMENT RECORD
// ============================================================
function buildRecord(doc, opts) {
  var facility = opts.facility,
    dt = opts.dt,
    logo = opts.logoB64;
  var ASMT = opts.assessment || {};
  function _tk(on) {
    return on ? '[X]' : '[ ]';
  }
  function _rmark(label, vals) {
    var hit = vals.indexOf(ASMT.rass) >= 0;
    return (hit ? '>> ' : '') + label + (hit ? '  <<' : '');
  }

  var y = header(
    doc,
    logo,
    facility,
    'Delirium Assessment Record',
    'Completed CAM-ICU / RASS assessment & prevention status',
    'Patient: __________   Date: ' + dt,
  );

  y = sectionBar(doc, y, 'ASSESSMENT', TEAL);
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 5,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      textColor: INK,
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: CW / 4 },
      1: { cellWidth: CW / 4 },
      2: { cellWidth: CW / 4 },
      3: { cellWidth: CW / 4 },
    },
    body: [
      [
        {
          content:
            'CAM-ICU RESULT\n\n' +
            _tk(ASMT.cam === 'positive') +
            ' Positive - delirium present\n' +
            _tk(ASMT.cam === 'negative') +
            ' Negative\n' +
            _tk(ASMT.cam === 'unable') +
            ' Unable to assess (RASS -4/-5)',
        },
        {
          content:
            'RASS THIS ASSESSMENT' +
            (ASMT.rass ? ': ' + ASMT.rass : '') +
            '\n\n' +
            _rmark('+4/+3 Combative / Very Agitated', ['+4', '+3']) +
            '\n' +
            _rmark('+2/+1 Agitated / Restless', ['+2', '+1']) +
            '\n' +
            _rmark('0 Alert & Calm' + tgtMark(opts, '0'), ['0']) +
            '\n' +
            _rmark('-1 Drowsy' + tgtMark(opts, '-1'), ['-1']) +
            '\n' +
            _rmark('-2 Light Sedation' + tgtMark(opts, '-2'), ['-2']) +
            '\n' +
            _rmark('-3 Moderate Sedation' + tgtMark(opts, '-3'), ['-3']) +
            '\n' +
            _rmark('-4 Deep Sedation' + tgtMark(opts, '-4'), ['-4']) +
            '\n' +
            _rmark('-5 Unarousable' + tgtMark(opts, '-5'), ['-5']),
        },
        {
          content:
            'DELIRIUM SUBTYPE\n\n' +
            _tk(ASMT.sub === 'hyper') +
            ' Hyperactive\n' +
            _tk(ASMT.sub === 'hypo') +
            ' Hypoactive\n' +
            _tk(ASMT.sub === 'mixed') +
            ' Mixed - alternating',
        },
        {
          content:
            'RISK & PREVENTION\n\nRisk factors: ' +
            (ASMT.risk || 0) +
            '/16 (' +
            (ASMT.riskTier || '-') +
            ') — count of present factors, not a validated score\nABCDEF bundle: ' +
            (ASMT.bundleOn || 0) +
            '/' +
            (ASMT.bundleAll || 0) +
            '\nDELIRIUM(S) reviewed: ' +
            (ASMT.mnemOn || 0) +
            '/' +
            (ASMT.mnemAll || 0) +
            '\nTreatment steps: ' +
            (ASMT.treatOn || 0) +
            '/' +
            (ASMT.treatAll || 0) +
            '\nConsults: ' +
            (ASMT.consults && ASMT.consults.length ? S_(ASMT.consults.join(', ')) : 'none'),
        },
      ],
    ],
  });
  y = doc.lastAutoTable.finalY;

  y = sectionBar(doc, y, 'DELIRIUM(S) CAUSATIVE FACTORS - REVIEW STATUS', INDIGO);
  var mnem = [
    'D - Drugs / Withdrawal',
    'E - Eyes / Ears / Env',
    'L - Low O2 / Liver',
    'I - Infection',
    'R - Retention',
    'I - Ictal / Seizure',
    'U - Under-hydration / Nutrition',
    'M - Metabolic',
    'S - Subdural / Sleep',
  ];
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 6.5,
      cellPadding: 3,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      valign: 'top',
      textColor: INK,
    },
    body: [
      mnem.map(function (m, i) {
        var d = (ASMT.mnemDomains && ASMT.mnemDomains[i]) || {};
        return {
          content: m + '\n\n' + _tk(d.reviewed) + ' Reviewed\n' + (d.action ? ftext(d.action) : ''),
        };
      }),
    ],
    columnStyles: (function () {
      var cs = {};
      for (var i = 0; i < 9; i++) cs[i] = { cellWidth: CW / 9 };
      return cs;
    })(),
  });
  y = doc.lastAutoTable.finalY;

  y = sectionBar(doc, y, 'ASSESSMENT NOTES & TREATMENT PLAN', GREENOK);
  cbTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 5,
      lineColor: LINEGRAY,
      lineWidth: 0.5,
      textColor: INK,
      valign: 'top',
    },
    body: [
      [
        {
          content:
            'NOTES:  ' +
            (ASMT.notes
              ? ftext(ASMT.notes)
              : '________________________________________________________________'),
        },
      ],
      [
        {
          content:
            'PLAN:  ' +
            (ASMT.plan
              ? ftext(ASMT.plan)
              : '________________________________________________________________'),
        },
      ],
    ],
  });
  y = doc.lastAutoTable.finalY;
  y = governanceStrip(doc, y, opts.settings);

  footer(doc);
}

// ---- manual block helpers (robust; avoid autotable fill/overprint collisions) ----
// Draws a column with a colored header band + white body with wrapped check-items.
// Returns the y-coordinate at the bottom of the drawn content.
function drawChecklistColumn(doc, x, y, w, headerH, letter, word, tagline, items, headColor) {
  // header band (pastel: light tint of the column color + dark same-hue text)
  var band = lighten(headColor, BAND_F),
    tcol = darken(headColor, 0.22),
    tag = darken(headColor, 0.05);
  doc.setFillColor(band[0], band[1], band[2]);
  doc.rect(x, y, w, headerH, 'F');
  if (letter) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(tcol[0], tcol[1], tcol[2]);
    doc.setFontSize(14);
    doc.text(letter, x + 7, y + headerH - 6);
    doc.setFontSize(9);
    doc.text(word, x + 26, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.4);
    doc.setTextColor(tag[0], tag[1], tag[2]);
    doc.text(tagline, x + 26, y + 18);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(tcol[0], tcol[1], tcol[2]);
    doc.setFontSize(7.6);
    doc.text(word, x + 7, y + headerH - 5);
  }
  var cy = y + headerH + 7;
  doc.setTextColor(INK[0], INK[1], INK[2]);
  for (var i = 0; i < items.length; i++) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    var lblLines = doc.splitTextToSize(S_(items[i][0]), w - 22);
    checkbox(doc, x + 6, cy - 5.2, 6.2, headColor, false);
    doc.text(lblLines, x + 15, cy);
    cy += lblLines.length * 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(70, 70, 80);
    var descLines = doc.splitTextToSize(S_(items[i][1]), w - 22);
    doc.text(descLines, x + 15, cy);
    cy += descLines.length * 7.4 + 4;
    doc.setTextColor(INK[0], INK[1], INK[2]);
  }
  return cy;
}

// Draws a medication tile: colored label band + gentle body with category drug list.
function drawMedTile(doc, x, y, w, label, items, color) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  var body = S_(items.join('  \u00B7  '));
  var bodyLines = doc.splitTextToSize(body, w - 12);
  var bandH = 11,
    bodyH = bodyLines.length * 7.2 + 7;
  var totalH = bandH + bodyH;
  // gentle body bg
  doc.setFillColor(GENTLE[0], GENTLE[1], GENTLE[2]);
  doc.rect(x, y + bandH, w, bodyH, 'F');
  // colored band
  doc.setFillColor(color[0], color[1], color[2]);
  doc.rect(x, y, w, bandH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(255, 255, 255);
  doc.text(S_(label).toUpperCase(), x + 4, y + 7.8);
  // body text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(40, 45, 60);
  doc.text(bodyLines, x + 4, y + bandH + 7);
  // border
  doc.setDrawColor(LINEGRAY[0], LINEGRAY[1], LINEGRAY[2]);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, totalH);
  return y + totalH;
}

// Page 1 of the full tool is dense; build it at progressively smaller scales
// (floored at 0.85 for legibility) until the checklist fits one page — no stray
// near-blank 3rd page, and it self-corrects as content changes. Page count is
// the reliable fit signal across Node + browser. Returns the chosen doc.
function buildFullFitted(mkDoc, opts) {
  var scales = [1, 0.95, 0.9, 0.85];
  var doc;
  for (var i = 0; i < scales.length; i++) {
    doc = mkDoc();
    buildFull(doc, opts, scales[i]);
    if (doc.internal.getNumberOfPages() <= 2) break; // fits (last scale wins regardless)
  }
  return doc;
}

// ---- public entry ----
function generate(kind, opts) {
  var jsPDF = getJsPDF();
  // Fresh doc factory: compress (smaller downloads) + viewer metadata (no PHI).
  // buildFullFitted may build several to find the page-fit scale.
  var mkDoc = function () {
    var d = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter', compress: true });
    d.setProperties({
      title:
        kind === 'spa'
          ? 'Simplified SPA Delirium Quick Reference'
          : kind === 'record'
            ? 'Delirium Assessment Record'
            : 'ICU Delirium Rounding Tool',
      subject: 'Bedside ICU delirium screening, prevention, and management reference',
      creator: 'deliriumtool.com',
      keywords: 'delirium, CAM-ICU, RASS, ABCDEF, ICU, reference aid',
    });
    return d;
  };
  var doc;
  if (kind === 'spa') {
    doc = mkDoc();
    buildSpa(doc, opts);
  } else if (kind === 'record') {
    doc = mkDoc();
    buildRecord(doc, opts);
  } else {
    doc = buildFullFitted(mkDoc, opts);
  }
  stampPageNumbers(doc, opts.generatedAt);
  var stamp = opts && opts.generatedAtFile ? '_' + opts.generatedAtFile : '';
  var fname =
    (kind === 'spa'
      ? 'SPA_Delirium_Quick_Reference'
      : kind === 'record'
        ? 'Delirium_Assessment_Record'
        : 'ICU_Delirium_Rounding_Tool') +
    stamp +
    '.pdf';
  if (opts && opts._returnDoc) return doc; // for node testing
  doc.save(fname);
}

export const DeliriumPDF = {
  generate,
  _buildFull: buildFull,
  _buildSpa: buildSpa,
  _buildRecord: buildRecord,
};
