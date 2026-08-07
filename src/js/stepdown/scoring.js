/**
 * stepdown/scoring.js — pure, DOM-free scoring for the step-down tool. Kept free of
 * the DOM so the golden-value unit tests can exercise it directly (tests/unit).
 */
import { CAMIMC, RISK } from './data/instruments.js';

/** Arousal gate: '' → no score yet; RASS −4/−5 → 'unable'; otherwise 'ok'. */
export const arousalGate = (rass) => {
  if (rass === '' || rass == null) return 'none';
  if (rass === '-4' || rass === '-5') return 'unable';
  return 'ok';
};

/**
 * Number of inattention errors a snapshot encodes: the max when marked unable, a
 * non-negative integer when answered, or null when unanswered / not a valid count
 * (a corrupted import). A null keeps the item unscored and the screen incomplete
 * rather than propagating NaN into the total.
 */
export function inattentionErrors(s) {
  if (s.camimc.inattentionUnable) return CAMIMC.inattention.maxPoints;
  const raw = s.camimc.inattention;
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * CAM-IMC additive score (0–10), positive at ≥3. Returns the running total even
 * before every item is answered, plus `complete` (all four items resolvable) and
 * `positive` (true once the total reaches the cut-point; null while still < cut-point
 * and incomplete). RASS −4/−5 makes the screen unassessable.
 */
export function evalCamImc(s) {
  const gate = arousalGate(s.rass);
  if (gate === 'unable') {
    return { complete: false, unable: true, score: null, positive: null, parts: null };
  }
  const c = s.camimc;
  const acutePts = c.acute === 'yes' ? CAMIMC.acute.points : 0;
  const locPts = s.rass !== '' && s.rass !== '0' ? CAMIMC.loc.points : 0;
  const inatt = inattentionErrors(s);
  const inattPts = inatt == null ? 0 : Math.min(inatt, CAMIMC.inattention.maxPoints);
  const disoPts = Math.min((c.disorientTaps || []).length, CAMIMC.disorientation.maxPoints);
  const score = acutePts + locPts + inattPts + disoPts;

  const acuteDone = c.acute === 'yes' || c.acute === 'no';
  // A present-but-invalid inattention value (inatt == null while not blank) leaves
  // the item unresolved, so the screen stays incomplete instead of scoring wrong.
  const inattDone = c.inattentionUnable || (c.inattention !== '' && inatt != null);
  const disoDone = c.disorientDone === true;
  const locDone = s.rass !== '';
  const complete = acuteDone && inattDone && disoDone && locDone;

  const positive = score >= CAMIMC.positiveAt ? true : complete ? false : null;
  return {
    complete,
    unable: false,
    score,
    positive,
    parts: { acutePts, locPts, inattPts, disoPts },
  };
}

/** Martinez admission risk: 0–3 points banded to predicted incidence. */
export function evalRisk(s) {
  let score = 0;
  if (s.risk.age85) score += 1;
  const adlCount = (s.risk.adlDeps || []).length;
  if (adlCount >= RISK.adl.threshold) score += 1;
  const psychoSubtotal = RISK.psychotropic.drugs
    .filter((d) => (s.risk.psychoDrugs || []).includes(d.id))
    .reduce((a, d) => a + d.pts, 0);
  if (psychoSubtotal >= RISK.psychotropic.threshold) score += 1;
  const band = RISK.bands.find((b) => score <= b.max) || RISK.bands[RISK.bands.length - 1];
  return { score, band, adlCount, psychoSubtotal };
}
