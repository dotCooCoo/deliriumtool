/**
 * peds/report.js — the printable assessment summary, generated in the browser
 * with jsPDF (no server, no data egress). Page 1: a de-identified identification
 * strip, a colour-coded result banner, the child context and screen side by side,
 * how the screen scored (feature status chips + the memory-pictures the child saw,
 * embedded as thumbnails), flagged risk factors, medications marked given, the
 * unit governance footer, and references. Page 2: the screen -> gate -> score ->
 * act bedside workflow with the 10-second rounds script. Reference aid only — not
 * an order set. Page 1 shrinks to fit via the shared fitToPages primitive, and it
 * shares its visual language with the adult and ED reports through
 * shared/pdf-report.js.
 */
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import {
  evalCapd,
  evalCam,
  resolveFeature,
  pictureErrors,
  arousalGate,
  capdItemPoints,
} from './scoring.js';
import { CAM_BY_SCREEN } from './data/cam.js';
import { CAPD_ITEMS } from './data/capd.js';
import { RISK_FACTORS, derivedRiskIds } from './data/risk.js';
import { MEDS } from './data/meds.js';
import { PREVENTION_LABELS, PREVENTION_ORDER } from './data/prevent.js';
import { REFS } from './data/refs.js';
import { stimArt } from '../templates/stim-art.js';
import {
  WORKFLOW_STAGES as PEDS_WORKFLOW,
  ROUNDS_SCRIPT,
  ACT_POSITIVE,
} from '../templates/data/peds-content.js';
import {
  reportHeader,
  idBlock,
  sectionBar,
  kvRow,
  statusBanner,
  statusChip,
  bullets,
  refsBlock,
  disclaimer,
  drawWorkflow,
  fitToPages,
  stampFooter,
  asciiPdf as ascii,
  RC,
} from '../shared/pdf-report.js';
import { formatStamp, fileStamp } from '../shared/time.js';

applyPlugin(jsPDF);

const SCREEN_REF = { capd: 'traube2014_capd', pcam: 'smith2011_pcam', pscam: 'smith2016_pscam' };
const MED_REF = {
  dexmed: 'phan2008_dexmed',
  risperidone: 'capino2020',
  quetiapine: 'joyce2015_quetiapine',
  olanzapine: 'capino2020',
  haloperidol: 'capino2020',
  melatonin: 'bruni2015_melatonin',
};

const SCREEN_NAMES = { capd: 'CAPD', pcam: 'pCAM-ICU', pscam: 'psCAM-ICU' };
const CAPD_SHORT = {
  eye: 'Eye contact',
  purpose: 'Purposeful actions',
  aware: 'Aware of surroundings',
  comm: 'Communicates needs',
  restless: 'Restless',
  inconsolable: 'Inconsolable',
  underactive: 'Underactive',
  slow: 'Slow to respond',
};

const DISCLAIMER =
  'Reference aid only — not a validated decision-support device or an order set. Screening is not a diagnosis. ' +
  'All medication doses are off-label and limited-evidence; verify every weight-based dose against your formulary and a pediatric pharmacist. Generated on this device; no data was transmitted.';

function ageText(months) {
  if (months == null) return '-';
  if (months < 24) return `${Math.round(months)} months`;
  return `${Math.round(months / 12)} years`;
}

function resultLine(state) {
  const gate = arousalGate(state.arousalScale, state.arousal);
  if (gate == null) return 'Not scored - arousal not recorded';
  if (gate === 'unable') return 'Unable to assess - comatose / too sedated';
  if (state.screen === 'capd') {
    const r = evalCapd(state.capd);
    if (!r.complete) return `In progress - ${r.answered}/8 items rated`;
    return `CAPD ${r.score}/32 - ${r.positive ? 'positive (>= 9)' : 'negative (< 9)'}`;
  }
  const data = CAM_BY_SCREEN[state.screen];
  if (!data) return '-';
  const resolved = {};
  for (const f of data.features)
    resolved[f.id] = resolveFeature(f, state.cam[f.id], state.arousalScale, state.arousal);
  const res = evalCam(resolved);
  if (res == null) return 'In progress';
  return `${SCREEN_NAMES[state.screen]} - ${res === 'positive' ? 'positive' : 'negative'}`;
}

// Result → banner tone: positive reads as attention, negative reassures, an
// unassessable/incomplete screen stays neutral.
function resultStatus(state) {
  const label = resultLine(state);
  const gate = arousalGate(state.arousalScale, state.arousal);
  if (gate === 'unable') return { tone: 'warn', label };
  if (gate == null) return { tone: 'pending', label };
  if (/\bpositive\b/i.test(label)) return { tone: 'pos', label };
  if (/\bnegative\b/i.test(label)) return { tone: 'neg', label };
  return { tone: 'pending', label };
}

// Draw the CAPD item-points derivation (two columns of four). Returns y below.
function capdDerivation(doc, y, state, ctx) {
  const { M, W, scale } = ctx;
  const rated = CAPD_ITEMS.some((it) => capdItemPoints(it.reverse, state.capd[it.id]) != null);
  if (!rated) return y;
  doc
    .setFont('helvetica', 'italic')
    .setFontSize(8 * scale)
    .setTextColor(...RC.SEC)
    .text('How scored — points per item (0-4; total >= 9 = positive):', M, y);
  y += 12 * scale;
  const colW = (W - 2 * M) / 2;
  const top = y;
  doc.setFont('helvetica', 'normal').setFontSize(9 * scale);
  CAPD_ITEMS.forEach((it, i) => {
    const pts = capdItemPoints(it.reverse, state.capd[it.id]);
    const x = M + Math.floor(i / 4) * colW;
    const yy = top + (i % 4) * 12 * scale;
    doc.setTextColor(...RC.SEC).text(ascii(`${it.n}. ${CAPD_SHORT[it.id]}`), x, yy);
    doc
      .setTextColor(...RC.INK)
      .text(pts == null ? '-' : String(pts), x + colW - 30 * scale, yy, { align: 'right' });
  });
  return top + 4 * 12 * scale;
}

// Draw the CAM feature verdicts as status chips (one row per feature, chip
// right-aligned), plus the memory-pictures the child saw as thumbnails when the
// picture task was run. Returns y below.
function camDerivation(doc, y, state, thumbs, ctx) {
  const { M, W, scale } = ctx;
  const data = CAM_BY_SCREEN[state.screen];
  doc
    .setFont('helvetica', 'italic')
    .setFontSize(8 * scale)
    .setTextColor(...RC.SEC)
    .text('How scored — features (positive: 1 AND 2 AND (3 OR 4)):', M, y);
  y += 14 * scale;

  const chipWidth = (label) => {
    doc.setFont('helvetica', 'bold').setFontSize(7.2 * scale);
    return (
      5 * scale + 3.4 * scale + 3.5 * scale + doc.getTextWidth(label.toUpperCase()) + 5 * scale
    );
  };
  data.features.forEach((f, i) => {
    const present = resolveFeature(f, state.cam[f.id], state.arousalScale, state.arousal);
    const tone = present == null ? 'pending' : present ? 'pos' : 'neg';
    const text = present == null ? 'not assessed' : present ? 'present' : 'absent';
    const name = f.title.replace(/^Feature\s*\d+\s*[—-]\s*/, '');
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(9 * scale)
      .setTextColor(...RC.INK)
      .text(`F${i + 1}`, M + 2 * scale, y);
    doc
      .setFont('helvetica', 'normal')
      .setTextColor(...RC.SEC)
      .text(ascii(name), M + 22 * scale, y);
    statusChip(doc, W - M - chipWidth(text), y - 8.5 * scale, tone, text, ctx);
    y += 15.5 * scale;
  });
  y += 4 * scale;

  // Memory-pictures task: the ten pictures the child saw, embedded as thumbnails,
  // with the child's answer and any error flagged. Only when the task was run.
  const f2 = data.features.find((f) => f.id === 'f2');
  const picVal = state.cam.f2 && state.cam.f2.picture;
  const marks = (picVal && picVal.marks) || {};
  if (!(f2 && f2.picture && (Object.keys(marks).length || (picVal && picVal.performed)))) return y;

  const nErr = pictureErrors(f2, { picture: picVal });
  const headLines = doc
    .setFont('helvetica', 'italic')
    .setFontSize(8 * scale)
    .setTextColor(...RC.SEC)
    .splitTextToSize(
      ascii(
        `Feature 2 memory-pictures - ${nErr} error${nErr === 1 ? '' : 's'} of 10 (>= 3 = inattention). memory = shown to the child, new = not shown:`,
      ),
      W - 2 * M,
    );
  doc.text(headLines, M, y);
  y += headLines.length * 10 * scale + 3 * scale;
  const seq = f2.picture.sequence;
  const picCols = W - 2 * M > 470 * scale ? 2 : 1;
  const rowsPer = Math.ceil(seq.length / picCols);
  const colW = (W - 2 * M) / picCols;
  const top = y;
  const ts = 13 * scale;
  seq.forEach((pic, i) => {
    const x = M + Math.floor(i / rowsPer) * colW;
    const yy = top + (i % rowsPer) * 15.5 * scale;
    const imgY = yy - ts + 3 * scale;
    if (thumbs[pic.id]) {
      doc.addImage(thumbs[pic.id], 'PNG', x, imgY, ts, ts);
    } else {
      doc
        .setDrawColor(205, 211, 219)
        .setLineWidth(0.5 * scale)
        .roundedRect(x, imgY, ts, ts, 1.6 * scale, 1.6 * scale, 'S');
    }
    const shown = pic.truth === 'seen' ? 'memory' : 'new';
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(8.5 * scale)
      .setTextColor(...RC.INK)
      .text(ascii(`${i + 1}. ${pic.name} (${shown})`), x + ts + 5 * scale, yy);
    const ans = marks[i];
    const err = Boolean(ans && ans !== pic.truth);
    const ansText = ans ? (ans === 'seen' ? 'Seen' : 'New') : '-';
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(8.5 * scale)
      .setTextColor(...(err ? RC.CRIM : ans ? RC.GREEN : RC.SEC))
      .text(ascii(err ? `${ansText} (X)` : ansText), x + colW - 10 * scale, yy, { align: 'right' });
  });
  return top + rowsPer * 15.5 * scale + 6 * scale;
}

function buildSummary(doc, state, settings, scale, thumbs) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36 * scale;
  const ctx = { M, W, H, scale };

  // Full-width header, identity strip, and verdict banner.
  let y = reportHeader(doc, {
    facility: (settings.hospital || 'Pediatric ICU').trim(),
    title: 'Pediatric Delirium — Screening Summary',
    accent: RC.TEAL,
    W,
    M,
    scale,
  });
  y += 4 * scale;
  const assessorName = (state.assessor || '').trim();
  y = idBlock(
    doc,
    y,
    [
      { label: 'Patient', blankW: 160 },
      { label: 'Room', blankW: 56 },
      { label: 'Date', value: formatStamp(state.assessedAt) },
      { label: 'Assessed by', value: assessorName || null, blankW: 130 },
    ],
    ctx,
  );
  const st = resultStatus(state);
  y = statusBanner(doc, y, { tone: st.tone, label: st.label }, ctx);
  y += 8 * scale;

  // Two-column body (landscape).
  const colGap = 24 * scale;
  const colW = (W - 2 * M - colGap) / 2;
  const colCtx = (x, w) => ({ ...ctx, M: x, W: 2 * x + w });
  const L = colCtx(M, colW);
  const R = colCtx(M + colW + colGap, colW);
  const topY = y;
  const p = state.profile;
  const sgate = arousalGate(state.arousalScale, state.arousal);

  // Left column: child context, screen, and how the screen scored.
  let yL = sectionBar(doc, topY, 'Child context (de-identified)', RC.TEAL, L);
  yL = kvRow(doc, yL, 'Chronological age', ageText(p.ageM), L, { labelW: 100 });
  if (p.delay) yL = kvRow(doc, yL, 'Developmental age', ageText(p.devM), L, { labelW: 100 });
  yL = kvRow(
    doc,
    yL,
    'Baseline',
    p.baseline === 'impaired'
      ? 'Developmental delay / baseline impairment'
      : p.baseline === 'unknown'
        ? 'Unknown / not established'
        : 'Age-typical',
    L,
    { labelW: 100 },
  );
  if (p.weightKg) yL = kvRow(doc, yL, 'Weight', `${p.weightKg} kg`, L, { labelW: 100 });
  const aids = [p.glasses && 'glasses', p.hearing && 'hearing aids'].filter(Boolean);
  if (aids.length)
    yL = kvRow(doc, yL, 'Sensory aids', `${aids.join(', ')} (keep in place)`, L, { labelW: 100 });
  yL += 8 * scale;
  yL = sectionBar(doc, yL, 'Screen', RC.INDIGO, L);
  yL = kvRow(doc, yL, 'Instrument', SCREEN_NAMES[state.screen] || '-', L, { labelW: 72 });
  yL = kvRow(
    doc,
    yL,
    'Arousal',
    state.arousal ? `${state.arousalScale.toUpperCase()} ${state.arousal}` : '-',
    L,
    { labelW: 72 },
  );
  yL = kvRow(doc, yL, 'Result', resultLine(state), L, { labelW: 72 });
  if (sgate && sgate !== 'unable' && state.screen === 'capd') {
    yL = capdDerivation(doc, yL + 6 * scale, state, L) + 4 * scale;
  } else if (sgate && sgate !== 'unable' && CAM_BY_SCREEN[state.screen]) {
    yL = camDerivation(doc, yL + 6 * scale, state, thumbs, L) + 4 * scale;
  }

  // Right column: risk, prevention, medications, governance, references.
  const derived = new Set(derivedRiskIds(state.profile));
  const flagged = RISK_FACTORS.filter((f) =>
    state.risk && state.risk[f.id] != null ? state.risk[f.id] : derived.has(f.id),
  );
  let yR = topY;
  if (flagged.length) {
    yR = sectionBar(doc, yR, 'Risk factors flagged', RC.AMBER, R);
    yR = bullets(
      doc,
      yR,
      flagged.map((f) => f.label),
      R,
      { cols: 1 },
    );
    yR += 8 * scale;
  }
  const prev = PREVENTION_ORDER.filter((id) => state.prevention && state.prevention[id]);
  if (prev.length) {
    yR = sectionBar(doc, yR, 'Prevention bundle addressed this shift', RC.GREEN, R);
    yR = bullets(
      doc,
      yR,
      prev.map((id) => PREVENTION_LABELS[id]),
      R,
      { cols: 1 },
    );
    yR += 8 * scale;
  }
  const given = MEDS.filter((m) => state.medsGiven && state.medsGiven[m.id]);
  if (given.length) {
    yR = sectionBar(doc, yR, 'Medications given this shift', RC.CRIM, R);
    doc.autoTable({
      startY: yR,
      margin: { left: R.M, right: M },
      head: [['Agent', 'Starting dose — verify vs formulary']],
      body: given.map((m) => [ascii(m.name), ascii(m.dose)]),
      styles: {
        font: 'helvetica',
        fontSize: 8.5 * scale,
        textColor: RC.INK,
        cellPadding: 4 * scale,
      },
      headStyles: { fillColor: RC.CRIM, textColor: [255, 255, 255] },
      theme: 'grid',
    });
    yR = doc.lastAutoTable.finalY + 12 * scale;
  }
  yR = sectionBar(doc, yR, 'Unit governance', RC.NAVY, R);
  const gov = (label, value) => {
    if (value) yR = kvRow(doc, yR, label, value, R, { labelW: 112 });
  };
  gov('Protocol version', settings.protocol);
  gov('Attending intensivist', settings.attending);
  gov('Nurse leader', settings.nurse);
  gov('Pharmacist (dosing)', settings.pharmacist);
  gov('Last reviewed', settings.reviewed);
  gov('Next review due', settings.nextrev);
  yR += 8 * scale;
  const refIds = [];
  if (SCREEN_REF[state.screen]) refIds.push(SCREEN_REF[state.screen]);
  if (flagged.length) refIds.push('traube2017_outcomes', 'mody2018_benzo');
  given.forEach((m) => MED_REF[m.id] && refIds.push(MED_REF[m.id]));
  refIds.push('pandem2022');
  const uniq = [...new Set(refIds)].filter((id) => REFS[id]);
  yR = refsBlock(
    doc,
    yR,
    uniq.map((id) => ({ c: REFS[id].c, u: REFS[id].u })),
    R,
  );

  y = Math.max(yL, yR) + 12 * scale;
  // If the disclaimer would run into the footer, spill to a second page so
  // fitToPages retries at a smaller scale until page 1 fits on its own.
  if (y + 40 * scale > H - 28 * scale) {
    doc.addPage();
    y = M;
  }
  disclaimer(doc, y, DISCLAIMER, ctx);
}

function buildWorkflowPage(doc) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  drawWorkflow(
    doc,
    {
      chip: 'PICU',
      title: 'Pediatric delirium workflow — screen · gate · score · act',
      sub: 'Every child, every shift. Post at the charting station.',
      stages: PEDS_WORKFLOW,
      loop: {
        pill: 'Unable to assess',
        text: 'Comatose floor (RASS −4/−5 · SBS −2/−3) — record it, keep the prevention bundle going, reassess when the child responds to voice.',
      },
      leftBox: {
        head: 'On rounds — say these four things (10 seconds)',
        items: ROUNDS_SCRIPT.map((r) => r.text),
      },
      rightBox: {
        head: 'If the screen is positive — first moves',
        items: ACT_POSITIVE.first.map((it) => it.text),
      },
      footer: 'Reference aid only — follow local policy and prescriber / pharmacy review.',
    },
    { M: 32, W, H },
  );
}

/** Build the pediatric summary jsPDF document (no save). thumbs: id -> PNG data
 *  URL for the memory-pictures (empty when unavailable). */
export function buildPedsDoc(state, settings, thumbs = {}) {
  const mkDoc = () =>
    new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape', compress: true });
  const doc = fitToPages(mkDoc, (d, scale) => buildSummary(d, state, settings, scale, thumbs), {
    scales: [1, 0.95, 0.9, 0.85, 0.82, 0.8, 0.78, 0.76, 0.74, 0.72],
    maxPages: 1,
  });
  doc.addPage('letter', 'landscape');
  buildWorkflowPage(doc);
  stampFooter(doc, { generated: formatStamp(), margin: 48 });
  return doc;
}

// Rasterize a stimulus SVG to a small PNG data URL (browser only). The picture
// artwork is inline SVG; jsPDF embeds raster images, so it is drawn to a canvas.
async function rasterizeStim(id, style, px) {
  const el = stimArt(id, style);
  if (!el) return null;
  const xml = new XMLSerializer().serializeToString(el);
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('stim raster failed'));
    img.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  const cx = canvas.getContext('2d');
  cx.drawImage(img, 0, 0, px, px);
  return canvas.toDataURL('image/png');
}

// Pre-rasterize the ten memory-pictures for the report, but only when the pCAM
// picture task was actually run. Returns id -> data URL (empty on any failure).
async function rasterizeThumbs(state) {
  const data = CAM_BY_SCREEN[state.screen];
  const f2 = data && data.features.find((f) => f.id === 'f2');
  if (!f2 || !f2.picture) return {};
  const picVal = state.cam.f2 && state.cam.f2.picture;
  const used = picVal && (picVal.performed || (picVal.marks && Object.keys(picVal.marks).length));
  if (!used) return {};
  const thumbs = {};
  for (const pic of f2.picture.sequence) {
    try {
      const url = await rasterizeStim(pic.id, 'a', 96);
      if (url) thumbs[pic.id] = url;
    } catch {
      /* skip a single failed thumbnail — the report falls back to a blank box */
    }
  }
  return thumbs;
}

export async function generateReport(state, settings) {
  let thumbs;
  try {
    thumbs = await rasterizeThumbs(state);
  } catch {
    thumbs = {};
  }
  buildPedsDoc(state, settings, thumbs).save(`pediatric-delirium-summary_${fileStamp()}.pdf`);
}
