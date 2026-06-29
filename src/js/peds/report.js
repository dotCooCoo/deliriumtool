/**
 * peds/report.js — the printable assessment summary, generated in the browser
 * with jsPDF (no server, no data egress). It prints the coded child context
 * (no name or identifiers), the screen result, flagged risk factors, any
 * medications marked given, and the unit's governance footer. Reference aid only
 * — not an order set.
 */
import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import { evalCapd, evalCam, featurePresent, arousalGate } from './scoring.js';
import { CAM_BY_SCREEN } from './data/cam.js';
import { RISK_FACTORS, derivedRiskIds } from './data/risk.js';
import { MEDS } from './data/meds.js';
import { PREVENTION_LABELS, PREVENTION_ORDER } from './data/prevent.js';
import { REFS } from './data/refs.js';

const SCREEN_REF = { capd: 'traube2014_capd', pcam: 'smith2011_pcam', pscam: 'smith2016_pscam' };
const MED_REF = {
  risperidone: 'campbell2020_risperidone',
  quetiapine: 'joyce2015_quetiapine',
  haloperidol: 'haldol_label',
  melatonin: 'melatonin_meta2025',
};

applyPlugin(jsPDF);

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

// jsPDF's built-in Helvetica is WinAnsi-encoded; map the few math/Unicode glyphs
// used elsewhere in the app to ASCII so they render correctly in the PDF.
const ascii = (s) =>
  String(s).replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[−–]/g, '-').replace(/≈/g, '~');

function ageText(months) {
  if (months == null) return '—';
  if (months < 24) return `${Math.round(months)} months`;
  return `${Math.round(months / 12)} years`;
}

function resultLine(state) {
  const gate = arousalGate(state.arousalScale, state.arousal);
  if (gate == null) return 'Not scored — arousal not recorded';
  if (gate === 'unable') return 'Unable to assess — comatose / too sedated';
  if (state.screen === 'capd') {
    const r = evalCapd(state.capd);
    if (!r.complete) return `In progress — ${r.answered}/8 items rated`;
    return `CAPD ${r.score}/32 — ${r.positive ? 'positive (≥ 9)' : 'negative (< 9)'}`;
  }
  const data = CAM_BY_SCREEN[state.screen];
  if (!data) return '—';
  const resolved = {};
  for (const f of data.features) resolved[f.id] = featurePresent(f, state.cam[f.id]);
  const res = evalCam(resolved);
  if (res == null) return 'In progress';
  return `${SCREEN_NAMES[state.screen]} — ${res === 'positive' ? 'positive' : 'negative'}`;
}

export function generateReport(state, settings, dateStr) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const M = 54;
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
    .setFontSize(16)
    .setTextColor(...INK);
  doc.text('Pediatric Delirium Screening — Summary', M, y);
  y += 18;
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(10)
    .setTextColor(...SEC);
  doc.text(`${(settings.hospital || 'Pediatric ICU').trim()}  ·  ${dateStr}`, M, y);
  y += 10;
  doc
    .setDrawColor(...TEAL)
    .setLineWidth(2)
    .line(M, y, W - M, y);
  y += 22;

  const sectionTitle = (t, color = A_TEAL) => {
    ensure(40);
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(11)
      .setTextColor(...color)
      .text(t, M, y);
    y += 15;
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(10)
      .setTextColor(...INK);
  };
  const row = (label, value) => {
    ensure(16);
    doc.setTextColor(...SEC).text(label, M, y);
    doc.setTextColor(...INK).text(ascii(String(value)), M + 160, y);
    y += 15;
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
  y += 8;

  sectionTitle('Screen', INDIGO);
  row('Instrument', SCREEN_NAMES[state.screen] || '—');
  row('Arousal', state.arousal ? `${state.arousalScale.toUpperCase()} ${state.arousal}` : '—');
  row('Result', resultLine(state));
  y += 8;

  const derived = new Set(derivedRiskIds(state.profile));
  const flagged = RISK_FACTORS.filter((f) => derived.has(f.id) || (state.risk && state.risk[f.id]));
  if (flagged.length) {
    sectionTitle('Risk factors flagged', AMBER);
    flagged.forEach((f) => {
      ensure(15);
      doc.setTextColor(...INK).text(ascii(`•  ${f.label}`), M, y);
      y += 14;
    });
    y += 8;
  }

  const prev = PREVENTION_ORDER.filter((id) => state.prevention && state.prevention[id]);
  if (prev.length) {
    sectionTitle('Prevention bundle addressed this shift', GREEN);
    prev.forEach((id) => {
      ensure(15);
      doc.setTextColor(...INK).text(ascii(`•  ${PREVENTION_LABELS[id]}`), M, y);
      y += 14;
    });
    y += 8;
  }

  const given = MEDS.filter((m) => state.medsGiven && state.medsGiven[m.id]);
  if (given.length) {
    sectionTitle('Medications given this shift', CRIM);
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      head: [['Agent', 'Starting dose — off-label, verify against formulary']],
      body: given.map((m) => [ascii(m.name), ascii(m.dose)]),
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, cellPadding: 5 },
      headStyles: { fillColor: CRIM, textColor: [255, 255, 255] },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 18;
  }

  sectionTitle('Unit governance', NAVY);
  if (settings.protocol) row('Protocol version', settings.protocol);
  if (settings.attending) row('Attending intensivist', settings.attending);
  if (settings.nurse) row('Nurse leader', settings.nurse);
  if (settings.pharmacist) row('Pharmacist (dosing)', settings.pharmacist);
  y += 10;

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
      .setFontSize(8)
      .setTextColor(...SEC);
    uniq.forEach((id, i) => {
      const lines = doc.splitTextToSize(`${i + 1}. ${ascii(REFS[id].c)}  ${REFS[id].u}`, W - 2 * M);
      ensure(lines.length * 10 + 4);
      doc.text(lines, M, y);
      y += lines.length * 10 + 5;
    });
    y += 8;
  }

  ensure(48);
  doc
    .setDrawColor(...[220, 236, 234])
    .setLineWidth(1)
    .line(M, y, W - M, y);
  y += 14;
  doc
    .setFont('helvetica', 'italic')
    .setFontSize(8)
    .setTextColor(...SEC);
  const disc =
    'Reference aid only — not a validated decision-support device or an order set. Screening is not a diagnosis. ' +
    'All medication doses are off-label and limited-evidence; verify every weight-based dose against your formulary and a pediatric pharmacist. Generated on this device; no data was transmitted.';
  doc.text(doc.splitTextToSize(disc, W - 2 * M), M, y);

  doc.save('pediatric-delirium-summary.pdf');
}
