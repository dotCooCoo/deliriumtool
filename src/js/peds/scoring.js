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
 * CAM family (pCAM-ICU / psCAM-ICU): Feature 1 AND Feature 2 AND (Feature 3 OR
 * Feature 4). Each feature is 'yes' | 'no' | unset; arousal is gated separately.
 * @returns {'positive'|'negative'|null} null = incomplete
 */
export function evalCam({ f1, f2, f3, f4 } = {}) {
  const set = (x) => x !== undefined && x !== '';
  if (!set(f1) || !set(f2)) return null;
  if (f1 !== 'yes' || f2 !== 'yes') return 'negative';
  if (f3 === 'yes' || f4 === 'yes') return 'positive';
  if (set(f3) && set(f4)) return 'negative';
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
