/**
 * peds/report.js — the printable assessment summary, generated in the browser
 * with jsPDF (no server, no data egress). It prints the coded child context
 * (no name or identifiers), the screen result, flagged risk factors, any
 * medications marked given, the unit governance footer, and a references block.
 * Reference aid only — not an order set. Shrinks to fit one page via the shared
 * fitToPages primitive.
 */
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { evalCapd, evalCam, featurePresent, arousalGate } from './scoring.js';
import { CAM_BY_SCREEN } from './data/cam.js';
import { RISK_FACTORS, derivedRiskIds } from './data/risk.js';
import { MEDS } from './data/meds.js';
import { PREVENTION_LABELS, PREVENTION_ORDER } from './data/prevent.js';
import { REFS } from './data/refs.js';
import { fitToPages, asciiPdf as ascii, lighten, darken, stampFooter } from '../shared/pdf-kit.js';
import { formatStamp, fileStamp } from '../shared/time.js';

applyPlugin(jsPDF);

const SCREEN_REF = { capd: 'traube2014_capd', pcam: 'smith2011_pcam', pscam: 'smith2016_pscam' };
const MED_REF = {
  risperidone: 'campbell2020_risperidone',
  quetiapine: 'joyce2015_quetiapine',
  haloperidol: 'haldol_label',
  melatonin: 'melatonin_meta2025',
};

const INK = [31, 42, 48];
const SEC = [92, 107, 116];
const TEAL = [13, 125, 132]; // peds brand teal (header rule)
// Adult tool's muted section-family palette (src/js/pdf.js), reused for section variety.
const A_TEAL = [47, 117, 124];
const CRIM = [164, 80, 90];
const AMBER = [160, 106, 56];
const INDIGO = [82, 98, 140];
const GREEN = [70, 122, 92];
const NAVY = [58, 71, 83];
const SCREEN_NAMES = { capd: 'CAPD', pcam: 'pCAM-ICU', pscam: 'psCAM-ICU' };

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
  for (const f of data.features) resolved[f.id] = featurePresent(f, state.cam[f.id]);
  const res = evalCam(resolved);
  if (res == null) return 'In progress';
  return `${SCREEN_NAMES[state.screen]} - ${res === 'positive' ? 'positive' : 'negative'}`;
}

// Draw the whole report at a scale factor (fonts + spacing + margins all scale),
// so fitToPages can shrink it onto one page when the assessment is large.
function buildReport(doc, state, settings, scale) {
  const M = 54 * scale;
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = M;
  const ensure = (need) => {
    if (y + need > H - M) {
      doc.addPage();
      y = M;
    }
  };

  doc
    .setFont('helvetica', 'bold')
    .setFontSize(16 * scale)
    .setTextColor(...INK)
    .text('Pediatric Delirium Screening — Summary', M, y);
  y += 18 * scale;
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(10 * scale)
    .setTextColor(...SEC)
    .text(
      `${(settings.hospital || 'Pediatric ICU').trim()}  ·  Assessed ${formatStamp(state.assessedAt)}`,
      M,
      y,
    );
  y += 10 * scale;
  doc
    .setDrawColor(...TEAL)
    .setLineWidth(2 * scale)
    .line(M, y, W - M, y);
  y += 22 * scale;

  // A pastel header band in the section-family color, with the title in a darkened
  // shade of the same family — mirrors the adult tool's sectionBar.
  const sectionTitle = (t, color = A_TEAL) => {
    ensure(40 * scale);
    const h = 17 * scale;
    doc.setFillColor(...lighten(color, 0.62)).rect(M, y, W - 2 * M, h, 'F');
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(9.5 * scale)
      .setTextColor(...darken(color, 0.2))
      .text(t, M + 7 * scale, y + 12 * scale);
    y += h + 7 * scale;
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(10 * scale)
      .setTextColor(...INK);
  };
  const row = (label, value) => {
    ensure(16 * scale);
    doc.setTextColor(...SEC).text(label, M, y);
    doc.setTextColor(...INK).text(ascii(String(value)), M + 160 * scale, y);
    y += 15 * scale;
  };
  const bullet = (text) => {
    ensure(15 * scale);
    doc.setTextColor(...INK).text(ascii(`•  ${text}`), M, y);
    y += 14 * scale;
  };

  const p = state.profile;
  sectionTitle('Child context (de-identified)', A_TEAL);
  row('Chronological age', ageText(p.ageM));
  if (p.delay) row('Developmental age', ageText(p.devM));
  row(
    'Baseline',
    p.baseline === 'impaired'
      ? 'Developmental delay / baseline impairment'
      : p.baseline === 'unknown'
        ? 'Unknown / not established'
        : 'Age-typical',
  );
  if (p.weightKg) row('Weight', `${p.weightKg} kg`);
  y += 8 * scale;

  sectionTitle('Screen', INDIGO);
  row('Instrument', SCREEN_NAMES[state.screen] || '-');
  row('Arousal', state.arousal ? `${state.arousalScale.toUpperCase()} ${state.arousal}` : '-');
  row('Result', resultLine(state));
  y += 8 * scale;

  const derived = new Set(derivedRiskIds(state.profile));
  const flagged = RISK_FACTORS.filter((f) => derived.has(f.id) || (state.risk && state.risk[f.id]));
  if (flagged.length) {
    sectionTitle('Risk factors flagged', AMBER);
    flagged.forEach((f) => bullet(f.label));
    y += 8 * scale;
  }

  const prev = PREVENTION_ORDER.filter((id) => state.prevention && state.prevention[id]);
  if (prev.length) {
    sectionTitle('Prevention bundle addressed this shift', GREEN);
    prev.forEach((id) => bullet(PREVENTION_LABELS[id]));
    y += 8 * scale;
  }

  const given = MEDS.filter((m) => state.medsGiven && state.medsGiven[m.id]);
  if (given.length) {
    sectionTitle('Medications given this shift', CRIM);
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      head: [['Agent', 'Starting dose — off-label, verify against formulary']],
      body: given.map((m) => [ascii(m.name), ascii(m.dose)]),
      styles: { font: 'helvetica', fontSize: 9 * scale, textColor: INK, cellPadding: 5 * scale },
      headStyles: { fillColor: CRIM, textColor: [255, 255, 255] },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 18 * scale;
  }

  sectionTitle('Unit governance', NAVY);
  if (settings.protocol) row('Protocol version', settings.protocol);
  if (settings.attending) row('Attending intensivist', settings.attending);
  if (settings.nurse) row('Nurse leader', settings.nurse);
  if (settings.pharmacist) row('Pharmacist (dosing)', settings.pharmacist);
  y += 10 * scale;

  // References for what this report shows, so a printed sheet stays citable.
  const refIds = [];
  if (SCREEN_REF[state.screen]) refIds.push(SCREEN_REF[state.screen]);
  if (flagged.length) refIds.push('traube2017_outcomes', 'mody2018_benzo');
  given.forEach((m) => MED_REF[m.id] && refIds.push(MED_REF[m.id]));
  refIds.push('pandem2022');
  const uniq = [...new Set(refIds)].filter((id) => REFS[id]);
  if (uniq.length) {
    sectionTitle('References', NAVY);
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(8 * scale)
      .setTextColor(...SEC);
    uniq.forEach((id, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${ascii(REFS[id].c)}  ${REFS[id].u}`, W - 2 * M);
      ensure(lines.length * 10 * scale + 4);
      doc.text(lines, M, y);
      y += lines.length * 10 * scale + 5 * scale;
    });
    y += 8 * scale;
  }

  ensure(48 * scale);
  doc
    .setDrawColor(220, 236, 234)
    .setLineWidth(1)
    .line(M, y, W - M, y);
  y += 14 * scale;
  doc
    .setFont('helvetica', 'italic')
    .setFontSize(8 * scale)
    .setTextColor(...SEC);
  const disc =
    'Reference aid only — not a validated decision-support device or an order set. Screening is not a diagnosis. ' +
    'All medication doses are off-label and limited-evidence; verify every weight-based dose against your formulary and a pediatric pharmacist. Generated on this device; no data was transmitted.';
  doc.text(doc.splitTextToSize(ascii(disc), W - 2 * M), M, y);
}

export function generateReport(state, settings) {
  const mkDoc = () => new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const doc = fitToPages(mkDoc, (d, scale) => buildReport(d, state, settings, scale));
  stampFooter(doc, { generated: formatStamp() });
  doc.save(`pediatric-delirium-summary_${fileStamp()}.pdf`);
}
