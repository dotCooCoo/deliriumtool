/**
 * peds/report.js — the printable assessment summary, generated in the browser
 * with jsPDF (no server, no data egress). It prints the coded child context
 * (no name or identifiers), a colour-coded screen-result banner and how it was
 * scored, flagged risk factors, any medications marked given, the unit
 * governance footer, and a references block. Reference aid only — not an order
 * set. Shrinks to fit one page via the shared fitToPages primitive, and shares
 * its visual language (masthead, section bands, result banner) with the adult
 * and ED reports through shared/pdf-report.js.
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
import {
  reportHeader,
  sectionBar,
  kvRow,
  statusBanner,
  bullets,
  refsBlock,
  disclaimer,
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
// Short item labels for the CAPD derivation table in the report.
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

// Draw the whole report at a scale factor (fonts + spacing + margins all scale),
// so fitToPages can shrink it onto one page when the assessment is large.
function buildReport(doc, state, settings, scale) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48 * scale;
  const ctx = { M, W, H, scale };
  let y = 0;
  // Page-break guard: if a block would run into the per-page footer, start a new
  // page. Any second page makes fitToPages retry at a smaller scale until the
  // document fits one page — so a busy assessment shrinks rather than overlapping.
  const bottom = H - 34 * scale;
  const ensure = (need) => {
    if (y + need > bottom) {
      doc.addPage();
      y = M;
    }
  };
  const section = (t, color, need = 32 * scale) => {
    ensure(need);
    y = sectionBar(doc, y, t, color, ctx);
  };

  const assessorName = (state.assessor || '').trim();
  const sub = `Assessed ${formatStamp(state.assessedAt)}${assessorName ? ` by ${assessorName}` : ''}`;
  y = reportHeader(doc, {
    facility: (settings.hospital || 'Pediatric ICU').trim(),
    title: 'Pediatric Delirium — Screening Summary',
    sub,
    accent: RC.TEAL,
    W,
    M,
    scale,
  });
  y += 6 * scale;

  const st = resultStatus(state);
  y = statusBanner(doc, y, { tone: st.tone, label: st.label }, ctx);
  y += 4 * scale;

  const p = state.profile;
  section('Child context (de-identified)', RC.TEAL);
  y = kvRow(doc, y, 'Chronological age', ageText(p.ageM), ctx);
  if (p.delay) y = kvRow(doc, y, 'Developmental age', ageText(p.devM), ctx);
  y = kvRow(
    doc,
    y,
    'Baseline',
    p.baseline === 'impaired'
      ? 'Developmental delay / baseline impairment'
      : p.baseline === 'unknown'
        ? 'Unknown / not established'
        : 'Age-typical',
    ctx,
  );
  if (p.weightKg) y = kvRow(doc, y, 'Weight', `${p.weightKg} kg`, ctx);
  const aids = [p.glasses && 'glasses', p.hearing && 'hearing aids'].filter(Boolean);
  if (aids.length) y = kvRow(doc, y, 'Sensory aids', `${aids.join(', ')} (keep in place)`, ctx);
  y += 8 * scale;

  section('Screen', RC.INDIGO);
  y = kvRow(doc, y, 'Instrument', SCREEN_NAMES[state.screen] || '-', ctx);
  y = kvRow(
    doc,
    y,
    'Arousal',
    state.arousal ? `${state.arousalScale.toUpperCase()} ${state.arousal}` : '-',
    ctx,
  );
  y = kvRow(doc, y, 'Result', resultLine(state), ctx);

  // Derivation — show how the screen result was reached, not just the verdict.
  const sgate = arousalGate(state.arousalScale, state.arousal);
  if (sgate && sgate !== 'unable' && state.screen === 'capd') {
    const rated = CAPD_ITEMS.some((it) => capdItemPoints(it.reverse, state.capd[it.id]) != null);
    if (rated) {
      y += 4 * scale;
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
      y = top + 4 * 12 * scale;
    }
  } else if (sgate && sgate !== 'unable' && CAM_BY_SCREEN[state.screen]) {
    const data = CAM_BY_SCREEN[state.screen];
    y += 4 * scale;
    doc
      .setFont('helvetica', 'italic')
      .setFontSize(8 * scale)
      .setTextColor(...RC.SEC)
      .text('How scored — features (positive: 1 AND 2 AND (3 OR 4)):', M, y);
    y += 12 * scale;
    doc.setFont('helvetica', 'normal').setFontSize(9 * scale);
    data.features.forEach((f, i) => {
      const present = resolveFeature(f, state.cam[f.id], state.arousalScale, state.arousal);
      const v = present == null ? 'not assessed' : present ? 'present' : 'absent';
      const name = f.title.replace(/^Feature\s*\d+\s*[—-]\s*/, '');
      doc.setTextColor(...RC.SEC).text(ascii(`F${i + 1}  ${name}`), M, y);
      doc.setTextColor(...RC.INK).text(v, M + 250 * scale, y);
      y += 12 * scale;
    });

    // pCAM memory-pictures task: which pictures were shown and how the child
    // answered each, with errors flagged. Only when the picture task was used.
    const f2 = data.features.find((f) => f.id === 'f2');
    const picVal = state.cam.f2 && state.cam.f2.picture;
    const marks = (picVal && picVal.marks) || {};
    if (f2 && f2.picture && (Object.keys(marks).length || (picVal && picVal.performed))) {
      const nErr = pictureErrors(f2, { picture: picVal });
      y += 6 * scale;
      doc
        .setFont('helvetica', 'italic')
        .setFontSize(8 * scale)
        .setTextColor(...RC.SEC)
        .text(
          ascii(
            `Feature 2 memory-pictures task - ${nErr} error${nErr === 1 ? '' : 's'} of 10 (>= 3 = inattention). memory = shown to memorize; new = not shown:`,
          ),
          M,
          y,
        );
      y += 12 * scale;
      doc.setFont('helvetica', 'normal').setFontSize(9 * scale);
      const colW = (W - 2 * M) / 2;
      const top = y;
      f2.picture.sequence.forEach((pic, i) => {
        const ans = marks[i];
        const shown = pic.truth === 'seen' ? 'memory' : 'new';
        const err = Boolean(ans && ans !== pic.truth);
        const ansText = ans ? (ans === 'seen' ? 'Seen' : 'New') : '-';
        const x = M + Math.floor(i / 5) * colW;
        const yy = top + (i % 5) * 12 * scale;
        doc.setTextColor(...RC.SEC).text(ascii(`${i + 1}. ${pic.name} (${shown})`), x, yy);
        doc
          .setTextColor(...(err ? RC.CRIM : RC.INK))
          .text(ascii(err ? `${ansText} (X)` : ansText), x + colW - 30 * scale, yy, {
            align: 'right',
          });
      });
      y = top + 5 * 12 * scale;
    }
  }
  y += 8 * scale;

  const derived = new Set(derivedRiskIds(state.profile));
  // A profile-derived factor flags by default, but an explicit uncheck removes it.
  const flagged = RISK_FACTORS.filter((f) =>
    state.risk && state.risk[f.id] != null ? state.risk[f.id] : derived.has(f.id),
  );
  if (flagged.length) {
    section('Risk factors flagged', RC.AMBER);
    y = bullets(
      doc,
      y,
      flagged.map((f) => f.label),
      ctx,
      { cols: 2 },
    );
    y += 8 * scale;
  }

  const prev = PREVENTION_ORDER.filter((id) => state.prevention && state.prevention[id]);
  if (prev.length) {
    section('Prevention bundle addressed this shift', RC.GREEN);
    y = bullets(
      doc,
      y,
      prev.map((id) => PREVENTION_LABELS[id]),
      ctx,
      { cols: 2 },
    );
    y += 8 * scale;
  }

  const given = MEDS.filter((m) => state.medsGiven && state.medsGiven[m.id]);
  if (given.length) {
    section('Medications given this shift', RC.CRIM, 46 * scale);
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      head: [['Agent', 'Starting dose — off-label, verify against formulary']],
      body: given.map((m) => [ascii(m.name), ascii(m.dose)]),
      styles: {
        font: 'helvetica',
        fontSize: 9 * scale,
        textColor: RC.INK,
        cellPadding: 5 * scale,
      },
      headStyles: { fillColor: RC.CRIM, textColor: [255, 255, 255] },
      theme: 'grid',
    });
    y = doc.lastAutoTable.finalY + 18 * scale;
  }

  section('Unit governance', RC.NAVY);
  if (settings.protocol) y = kvRow(doc, y, 'Protocol version', settings.protocol, ctx);
  if (settings.attending) y = kvRow(doc, y, 'Attending intensivist', settings.attending, ctx);
  if (settings.nurse) y = kvRow(doc, y, 'Nurse leader', settings.nurse, ctx);
  if (settings.pharmacist) y = kvRow(doc, y, 'Pharmacist (dosing)', settings.pharmacist, ctx);
  if (settings.reviewed) y = kvRow(doc, y, 'Last reviewed', settings.reviewed, ctx);
  if (settings.nextrev) y = kvRow(doc, y, 'Next review due', settings.nextrev, ctx);
  y += 10 * scale;

  // References for what this report shows, so a printed sheet stays citable.
  const refIds = [];
  if (SCREEN_REF[state.screen]) refIds.push(SCREEN_REF[state.screen]);
  if (flagged.length) refIds.push('traube2017_outcomes', 'mody2018_benzo');
  given.forEach((m) => MED_REF[m.id] && refIds.push(MED_REF[m.id]));
  refIds.push('pandem2022');
  const uniq = [...new Set(refIds)].filter((id) => REFS[id]);
  ensure(30 * scale + uniq.length * 20 * scale);
  y = refsBlock(
    doc,
    y,
    uniq.map((id) => ({ c: REFS[id].c, u: REFS[id].u })),
    ctx,
  );
  y += 2 * scale;

  ensure(66 * scale);
  const disc =
    'Reference aid only — not a validated decision-support device or an order set. Screening is not a diagnosis. ' +
    'All medication doses are off-label and limited-evidence; verify every weight-based dose against your formulary and a pediatric pharmacist. Generated on this device; no data was transmitted.';
  disclaimer(doc, y, disc, ctx);
}

/** Build the pediatric summary jsPDF document (no save), for the browser or a
 *  verification script. */
export function buildPedsDoc(state, settings) {
  const mkDoc = () => new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const doc = fitToPages(mkDoc, (d, scale) => buildReport(d, state, settings, scale), {
    scales: [1, 0.95, 0.9, 0.85, 0.82, 0.8, 0.78, 0.76, 0.74, 0.72],
  });
  stampFooter(doc, { generated: formatStamp(), margin: 48 });
  return doc;
}

export function generateReport(state, settings) {
  buildPedsDoc(state, settings).save(`pediatric-delirium-summary_${fileStamp()}.pdf`);
}
