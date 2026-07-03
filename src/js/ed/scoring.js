/**
 * ed/scoring.js — pure scoring for the ED screens. Golden-value unit tests in
 * tests/unit/ed-scoring.test.js pin every rule; a wrong threshold here is a
 * patient-safety bug (sources: Han 2013 + Vanderbilt manuals; 4AT v1.2 form —
 * docs/CLINICAL_METHODOLOGY.md §2.11).
 */
import { RASS_UNABLE, FOURAT } from './data/instruments.js';

/**
 * DTS: positive when RASS ≠ 0, or ≥2 errors spelling LUNCH backwards, or the
 * patient refuses / cannot start. Returns null until the RASS is recorded
 * (the attention task adds nothing once the RASS is abnormal).
 */
export function evalDts({ rass, lunchErrors, lunchUnable }) {
  if (rass === undefined || rass === null || rass === '') return null;
  if (rass !== '0') return 'positive';
  if (lunchUnable) return 'positive';
  if (lunchErrors === undefined || lunchErrors === null || lunchErrors === '') return null;
  return Number(lunchErrors) >= 2 ? 'positive' : 'negative';
}

/** RASS −4/−5 = stupor/coma — content assessment impossible; reassess later. */
export function arousalGate(rass) {
  if (rass === undefined || rass === null || rass === '') return null;
  return RASS_UNABLE.includes(String(rass)) ? 'unable' : 'ok';
}

/**
 * bCAM feature 2 (inattention): >1 error on months-backwards, or refusal /
 * inability (the manual scores that as 6 errors). Null until assessed.
 */
export function bcamInattention({ monthErrors, monthUnable }) {
  if (monthUnable) return true;
  if (monthErrors === undefined || monthErrors === null || monthErrors === '') return null;
  return Number(monthErrors) >= 2;
}

/**
 * bCAM: Feature 1 AND Feature 2 AND (Feature 3 OR Feature 4). Feature 2 is
 * the required cardinal feature (1 + 3 + 4 without 2 is negative). Feature 3
 * derives from the RASS (anything other than 0). If Feature 1 is unknown (no
 * baseline informant) but Features 2 and 3-or-4 are positive, the manual says
 * to assume Feature 1 positive — callers pass f1: 'assume' for that state.
 * Returns 'positive' | 'negative' | null (incomplete).
 */
export function evalBcam({ f1, f2, rass, f4AnyError }) {
  if (rass === undefined || rass === null || rass === '') return null;
  if (f2 === null || f2 === undefined) return null;
  if (f2 === false) return 'negative'; // cardinal feature absent
  const f3 = String(rass) !== '0';
  const f4 = f4AnyError === undefined || f4AnyError === null ? null : Boolean(f4AnyError);
  const secondary = f3 === true ? true : f4;
  if (f1 === 'no') return 'negative';
  if (f1 === 'yes' || f1 === 'assume') {
    if (secondary === true) return 'positive';
    if (secondary === false) return 'negative';
    return null; // F3 negative and F4 not yet assessed
  }
  return null; // F1 unanswered
}

/**
 * 4AT: sum of the four item scores (0–12). Score and band are withheld until
 * all four items are rated. Bands per the form: ≥4 possible delirium ±
 * cognitive impairment; 1–3 possible cognitive impairment; 0 unlikely.
 */
export function eval4at(values) {
  const ids = FOURAT.items.map((i) => i.id);
  const nums = ids.map((id) => values?.[id]);
  if (nums.some((v) => v === undefined || v === null || v === '')) {
    return { complete: false, score: null, band: null };
  }
  const score = nums.reduce((a, v) => a + Number(v), 0);
  const band = FOURAT.bands.find((b) => score >= b.min);
  return { complete: true, score, band };
}
