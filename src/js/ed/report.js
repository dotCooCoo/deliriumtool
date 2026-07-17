/**
 * ed/report.js — the printable ED screening summary, generated in the browser
 * with jsPDF (no server, no data egress). It prints the de-identified assessment
 * (pathway, arousal, screen result), a colour-coded verdict banner, any actions
 * started, free-text notes, and the instrument citations for the pathway used.
 * Reference aid only — not an order set. Shrinks to one page via fitToPages.
 *
 * The caller (ed/main.js) assembles a plain data model from the same functions
 * that build the on-screen summary, so the document and the screen never drift.
 */
import { jsPDF } from 'jspdf';
import {
  reportHeader,
  sectionBar,
  kvRow,
  statusBanner,
  bullets,
  paragraph,
  refsBlock,
  disclaimer,
  fitToPages,
  stampFooter,
  RC,
} from '../shared/pdf-report.js';
import { formatStamp } from '../shared/time.js';

const DISCLAIMER =
  'Reference aid only — not a validated decision-support device or an order set. ' +
  'A screen is not a diagnosis; a negative screen does not rule out delirium when clinical ' +
  'suspicion, concerning collateral history, or a change in mental status remains. ' +
  'Generated on this device; no patient data was transmitted.';

function buildReport(doc, model, scale) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48 * scale;
  const ctx = { M, W, H, scale };
  let y = 0;
  // Page-break guard so a busy summary shrinks (via fitToPages) rather than
  // running into the per-page footer.
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

  y = reportHeader(doc, {
    facility: model.facility,
    title: 'Emergency Department Delirium — Screening Summary',
    sub: model.sub,
    accent: RC.CRIM,
    W,
    M,
    scale,
  });
  y += 6 * scale;

  y = statusBanner(doc, y, model.verdict, ctx);
  y += 4 * scale;

  section('Assessment', RC.INDIGO);
  for (const [k, v] of model.rows) y = kvRow(doc, y, k, v, ctx);
  y += 8 * scale;

  if (model.actions.length) {
    section('Actions started', RC.AMBER);
    y = bullets(doc, y, model.actions, ctx, { cols: 1 });
    y += 8 * scale;
  }

  if (model.notes) {
    section('Notes', RC.TEAL);
    y = paragraph(doc, y, model.notes, ctx);
    y += 8 * scale;
  }

  if (model.refs.length) {
    ensure(30 * scale + model.refs.length * 20 * scale);
    y = refsBlock(doc, y, model.refs, ctx);
    y += 2 * scale;
  }

  ensure(66 * scale);
  disclaimer(doc, y, DISCLAIMER, ctx);
}

/**
 * Build the ED summary jsPDF document from a plain model (no DOM), so it can be
 * rendered in the browser or in a verification script:
 *   { facility, sub, verdict:{tone,label}, rows:[[k,v]], actions:[str], notes:str, refs:[{c,u}] }
 */
export function buildEdDoc(model) {
  const mkDoc = () => new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const doc = fitToPages(mkDoc, (d, scale) => buildReport(d, model, scale), {
    scales: [1, 0.95, 0.9, 0.86, 0.83, 0.8, 0.78, 0.76, 0.74],
  });
  stampFooter(doc, { generated: formatStamp(), margin: 48 });
  doc.setProperties({
    title: 'ED Delirium Screening Summary',
    subject: 'De-identified screening summary — reference aid only',
  });
  return doc;
}

/** Build and save the ED summary PDF. */
export function generateEdReport(model) {
  buildEdDoc(model).save('ed-delirium-summary.pdf');
}
