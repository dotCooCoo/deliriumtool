/**
 * stepdown/report.js — the printable step-down screening summary, generated in the
 * browser with jsPDF (no server, no data egress). Page 1: a de-identified
 * identification strip with blanks to hand-write at the bedside, a colour-coded
 * verdict banner, then a two-column body — the CAM-IMC score broken down feature by
 * feature and the admission-risk criteria on the left, the applied prevention bundle
 * and any notes on the right — closed by the instrument citations. Page 2: the
 * screen -> gate -> score -> risk -> act bedside workflow with the transfer hand-off.
 * Reference aid only; page 1 shrinks to fit via fitToPages.
 *
 * The caller (stepdown/main.js) assembles a plain data model from the same functions
 * that build the on-screen summary, so the document and the screen never drift.
 */
import { jsPDF } from 'jspdf';
import {
  reportHeader,
  idBlock,
  sectionBar,
  kvRow,
  statusBanner,
  bullets,
  paragraph,
  refsBlock,
  disclaimer,
  drawWorkflow,
  fitToPages,
  stampFooter,
  RC,
  REPORT_DISCLAIMER,
} from '../shared/pdf-report.js';
import { formatStamp, fileStamp } from '../shared/time.js';
import {
  WORKFLOW_STAGES,
  HANDOFF_SCRIPT,
  ACT_COLUMNS,
} from '../templates/data/stepdown-content.js';

const DISCLAIMER =
  'Reference aid only — not a validated decision-support device or an order set. ' +
  'A screen is not a diagnosis; a negative screen does not rule out delirium when clinical ' +
  'suspicion or a change in mental status remains. ' +
  'Generated on this device; no patient data was transmitted.';

function buildSummary(doc, model, scale) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 46 * scale;
  const ctx = { M, W, H, scale };

  let y = reportHeader(doc, {
    facility: model.facility,
    title: 'Step-Down Delirium — Screening Summary',
    sub: model.sub,
    accent: RC.PURPLE,
    W,
    M,
    scale,
  });
  y += 4 * scale;
  y = idBlock(
    doc,
    y,
    [
      { label: 'Patient', blankW: 170 },
      { label: 'Room', blankW: 64 },
      { label: 'Date', value: model.date },
      { label: 'Assessed by', value: model.assessor || null, blankW: 150 },
    ],
    ctx,
  );
  y = statusBanner(doc, y, model.verdict, ctx);
  y += 8 * scale;

  // Two-column body: screen + risk on the left, prevention + notes on the right.
  const colGap = 22 * scale;
  const colW = (W - 2 * M - colGap) / 2;
  const colCtx = (x) => ({ ...ctx, M: x, W: 2 * x + colW });
  const L = colCtx(M);
  const R = colCtx(M + colW + colGap);
  const topY = y;

  let yL = sectionBar(
    doc,
    topY,
    `CAM-IMC screen  —  ${model.screen.total}  ${model.screen.result}`,
    RC.INDIGO,
    L,
  );
  for (const [k, v] of model.screen.rows) yL = kvRow(doc, yL, k, v, L, { labelW: 92 });
  yL += 9 * scale;
  yL = sectionBar(
    doc,
    yL,
    `Admission risk  —  ${model.risk.score}  ${model.risk.band}`,
    RC.AMBER,
    L,
  );
  for (const [k, v] of model.risk.rows) yL = kvRow(doc, yL, k, v, L, { labelW: 108 });

  let yR = sectionBar(
    doc,
    topY,
    `Prevention bundle  —  ${model.prevention.count} applied`,
    RC.GREEN,
    R,
  );
  if (model.prevention.items.length) {
    yR = bullets(doc, yR, model.prevention.items, R, { cols: 1 });
  } else {
    yR = paragraph(doc, yR, 'No prevention components recorded.', R);
  }
  if (model.notes) {
    yR += 9 * scale;
    yR = sectionBar(doc, yR, 'Notes', RC.TEAL, R);
    yR = paragraph(doc, yR, model.notes, R);
  }

  y = Math.max(yL, yR) + 12 * scale;
  if (model.refs.length) y = refsBlock(doc, y, model.refs, ctx);
  y += 4 * scale;
  if (y + 40 * scale > H - 40) {
    doc.addPage();
    y = M;
  }
  disclaimer(doc, y, DISCLAIMER, ctx);
}

// Page 2: the step-down workflow poster, landscape so the five stages sit in a
// row. The stages, hand-off script, and first-move list all render from the same
// step-down content module the templates designer uses, so this page and the
// printable workflow template cannot drift.
function buildWorkflowPage(doc) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  drawWorkflow(
    doc,
    {
      chip: 'Step-Down',
      title: 'Step-down delirium workflow — screen · gate · score · risk · act',
      sub: 'For the monitored, non-intubated patient. Post at the nurses’ station.',
      stages: WORKFLOW_STAGES,
      loop: {
        pill: 'Unable to assess',
        text: 'RASS −4/−5 — stupor or coma. Record it, and reassess when the patient responds to voice.',
      },
      leftBox: {
        head: 'On transfer / hand-off of a positive screen (say these four)',
        items: HANDOFF_SCRIPT.map((h) => h.text),
      },
      rightBox: {
        head: 'If the screen is positive — first moves',
        items: ACT_COLUMNS[0].items.map((it) => it.text),
      },
    },
    { M: 32, W, H },
  );
}

/**
 * Build the step-down summary jsPDF document from a plain model (no DOM):
 *   { facility, sub, date, assessor, verdict:{tone,label,detail},
 *     screen:{ total, result, rows:[[k,v]] }, risk:{ score, band, rows:[[k,v]] },
 *     prevention:{ count, items:[str] }, notes:str, refs:[{c,u}] }
 */
export function buildStepdownDoc(model) {
  const mkDoc = () =>
    new jsPDF({ unit: 'pt', format: 'letter', orientation: 'landscape', compress: true });
  const doc = fitToPages(mkDoc, (d, scale) => buildSummary(d, model, scale), {
    scales: [1, 0.95, 0.9, 0.86, 0.83, 0.8, 0.78, 0.76, 0.74],
    maxPages: 1,
  });
  doc.addPage('letter', 'landscape');
  buildWorkflowPage(doc);
  stampFooter(doc, { generated: formatStamp(), margin: 46, disclaimer: REPORT_DISCLAIMER });
  doc.setProperties({
    title: 'Step-Down Delirium Screening Summary',
    subject: 'De-identified screening summary — reference aid only',
  });
  return doc;
}

/** Build and save the step-down summary PDF. */
export function generateStepdownReport(model) {
  buildStepdownDoc(model).save(`stepdown-delirium-summary_${fileStamp()}.pdf`);
}
