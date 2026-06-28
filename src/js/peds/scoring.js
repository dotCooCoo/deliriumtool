/**
 * peds/scoring.js — pure clinical logic for the pediatric screens.
 *
 * No DOM and no shared state, so each threshold is unit-tested directly against
 * the source literature. The CAM-ICU-family algorithm (Feature 1 AND 2 AND (3 OR
 * 4), with the RASS arousal gate) is identical to the adult tool, so pCAM-ICU and
 * psCAM-ICU reuse evalCam from the shared module. CAPD scoring is pediatric-
 * specific. Thresholds are documented in docs/CLINICAL_METHODOLOGY.md; do not
 * change a clinical number without updating that doc and the golden tests.
 *
 * Sources: CAPD — Traube et al., Crit Care Med 2014;42(3):656–663 (cut point 9).
 * pCAM-ICU — Smith et al., Crit Care Med 2011;39(1):150–157 (developmental age
 * ≥ 5 yr). psCAM-ICU — Smith et al., Crit Care Med 2016;44(3):592–600 (6 mo–5 yr).
 */
import { evalCam } from '../scoring.js';

// pCAM-ICU / psCAM-ICU share the CAM-ICU hierarchical algorithm + RASS gate.
export { evalCam };

// CAPD (Traube 2014): 8 items, each 0–4; total 0–32; ≥ 9 = positive in typically
// developing children. Items 1–4 (capacity) are reverse-scored (Never = 4 …
// Always = 0); items 5–8 (behavior) are scored Never = 0 … Always = 4.
export const CAPD_POSITIVE = 9;

// The validated cut point is higher in children with baseline developmental
// delay (specificity falls to ~51% at ≥ 9); interpret against the child's own
// baseline. Surfaced as a caveat, not auto-applied — clinician sign-off pending.
export const CAPD_DEV_DELAY_NOTE =
  'In developmental delay, specificity at ≥ 9 falls (~51%); interpret against the child’s baseline and consider a higher cut point.';

export const CAPD_FREQ = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];

export const CAPD_ITEMS = [
  { id: 'eye', text: 'Makes eye contact with the caregiver', reverse: true },
  { id: 'purpose', text: 'Actions are purposeful', reverse: true },
  { id: 'aware', text: 'Aware of surroundings', reverse: true },
  { id: 'comm', text: 'Communicates needs and wants', reverse: true },
  { id: 'restless', text: 'Restless', reverse: false },
  { id: 'inconsolable', text: 'Inconsolable', reverse: false },
  { id: 'underactive', text: 'Underactive — very little movement while awake', reverse: false },
  { id: 'slow', text: 'Takes a long time to respond to interactions', reverse: false },
];

/**
 * Points for a chosen frequency index (0 = Never … 4 = Always) given the item's
 * scoring direction. Returns null when unanswered.
 */
export function capdItemPoints(reverse, freqIndex) {
  if (freqIndex == null || freqIndex === '' || Number(freqIndex) < 0) return null;
  const f = Number(freqIndex);
  if (!Number.isInteger(f) || f < 0 || f > 4) return null;
  return reverse ? 4 - f : f;
}

/**
 * Evaluate CAPD from a map of itemId -> frequency index (0–4).
 * The score and positive/negative are withheld until all 8 items are answered —
 * a partial CAPD is not interpretable.
 * @returns {{answered:number, complete:boolean, score:number|null, positive:boolean|null}}
 */
export function evalCapd(values = {}) {
  let score = 0;
  let answered = 0;
  for (const item of CAPD_ITEMS) {
    const pts = capdItemPoints(item.reverse, values[item.id]);
    if (pts == null) continue;
    score += pts;
    answered += 1;
  }
  const complete = answered === CAPD_ITEMS.length;
  return {
    answered,
    complete,
    score: complete ? score : null,
    positive: complete ? score >= CAPD_POSITIVE : null,
  };
}

/**
 * Arousal gate shared by every pediatric screen: RASS −4/−5 (responds only to
 * physical stimulus / no response) means the child is comatose and delirium is
 * "unable to assess" — do not score a CAM as negative or over-call CAPD from
 * sedation alone. SBS −3 is the equivalent for the State Behavioral Scale.
 * @returns {'unable'|'ok'|null} null = arousal not yet recorded
 */
export function arousalGate(rass) {
  if (rass == null || rass === '') return null;
  return rass === '-4' || rass === '-5' ? 'unable' : 'ok';
}
