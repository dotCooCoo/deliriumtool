/**
 * peds/scoring.js — pure clinical logic for the pediatric screens. No DOM and no
 * shared state, so every function is unit-tested directly. Thresholds and sources
 * are documented in docs/CLINICAL_METHODOLOGY.md.
 */
import { CAPD_ITEMS, CAPD_POSITIVE } from './data/capd.js';
import { RASS_COMATOSE, SBS_COMATOSE } from './data/arousal.js';

export { capdBand } from './data/capd.js';

// CAPD — items 1–4 reverse-scored, 5–8 normal; each 0–4; total 0–32; ≥ 9 positive.
export function capdItemPoints(reverse, freqIndex) {
  if (freqIndex == null || freqIndex === '') return null;
  const f = Number(freqIndex);
  if (!Number.isInteger(f) || f < 0 || f > 4) return null;
  return reverse ? 4 - f : f;
}

/**
 * Evaluate CAPD from a map of itemId → frequency index (0–4). Score and result are
 * withheld until all eight items are answered.
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
 * Arousal gate by scale: a comatose-floor value → 'unable'; otherwise 'ok'; null
 * until a value is recorded. RASS floor −4/−5, SBS floor −2/−3.
 */
export function arousalGate(scale, value) {
  if (value == null || value === '') return null;
  const floor = scale === 'sbs' ? SBS_COMATOSE : RASS_COMATOSE;
  return floor.includes(String(value)) ? 'unable' : 'ok';
}

/**
 * Count errors on the pCAM-ICU memory-pictures task: for each recognition
 * picture the child's recorded answer ('seen' | 'new') is compared with the
 * picture's truth; a mismatch is an error. Unmarked pictures do not count.
 * @param {{picture:{sequence:Array<{truth:string}>}}} feature
 * @param {{picture?:{marks?:Object}}} value
 * @returns {number}
 */
export function pictureErrors(feature, value) {
  const seq = feature?.picture?.sequence || [];
  const marks = (value && value.picture && value.picture.marks) || {};
  let n = 0;
  seq.forEach((p, i) => {
    const m = marks[i];
    if (m && m !== p.truth) n += 1;
  });
  return n;
}

/**
 * Resolve one CAM feature to present (true) / absent (false) / incomplete (null)
 * from the input captured for it.
 *   judgment — 'yes' | 'no' | unset
 *   errors   — { performed:boolean, errors:number[] }; present at ≥ threshold.
 *              pCAM Feature 2 also carries a picture task
 *              ({ picture:{ performed, marks } }); either task at threshold is positive.
 *   compound — { performed, swc, unaware, inconsolable }; swc OR (unaware AND inconsolable)
 */
export function featurePresent(feature, value) {
  if (!feature) return null;
  if (feature.type === 'judgment') {
    if (value === 'yes') return true;
    if (value === 'no') return false;
    return null;
  }
  if (feature.type === 'errors') {
    if (!value) return null;
    const letterDone = Boolean(value.performed);
    const pictureDone = Boolean(feature.picture && value.picture && value.picture.performed);
    // Pending until at least one task (letters or the picture alternative) is run.
    if (!letterDone && !pictureDone) return null;
    // Letters: alternate positivity path (e.g., psCAM Feature 2 eye-opening) or
    // errors at/above threshold.
    const n = Array.isArray(value.errors) ? value.errors.length : 0;
    const letterPos = letterDone && ((feature.alt && value[feature.alt.id]) || n >= feature.threshold);
    // Picture recognition: errors at/above the picture threshold.
    const picturePos =
      pictureDone && pictureErrors(feature, value) >= feature.picture.threshold;
    return Boolean(letterPos || picturePos);
  }
  if (feature.type === 'compound') {
    if (!value || !value.performed) return null;
    return Boolean(value.swc) || (Boolean(value.unaware) && Boolean(value.inconsolable));
  }
  return null;
}

/**
 * CAM family (pCAM-ICU / psCAM-ICU) result from resolved features, each
 * true | false | null: Feature 1 AND Feature 2 AND (Feature 3 OR Feature 4).
 * Arousal is gated separately.
 * @returns {'positive'|'negative'|null} null = incomplete
 */
export function evalCam({ f1, f2, f3, f4 } = {}) {
  // Feature 1 and Feature 2 are both required (cardinal): a definitive absence
  // of either is already a negative screen, even before the other features are
  // assessed (e.g. no acute change / fluctuation → negative regardless of F2).
  if (f1 === false || f2 === false) return 'negative';
  if (f1 == null || f2 == null) return null; // a required feature is still pending
  if (f3 === true || f4 === true) return 'positive';
  if (f3 != null && f4 != null) return 'negative';
  return null;
}

/**
 * Derived instrument routing from the child profile (ages in months). CAPD is the
 * recommended default for all ages; psCAM-ICU and pCAM-ICU are offered when the
 * developmental age fits their validated band.
 * @returns {{recommended:'capd', alternatives:Array<'pscam'|'pcam'>}}
 */
export function recommendScreen({ chronoMonths, devMonths } = {}) {
  const c = Number(chronoMonths);
  const d = Number(devMonths);
  const alternatives = [];
  if (Number.isFinite(d) && d >= 6 && d <= 60) alternatives.push('pscam');
  if (Number.isFinite(c) && Number.isFinite(d) && c >= 60 && d >= 60) alternatives.push('pcam');
  return { recommended: 'capd', alternatives };
}
