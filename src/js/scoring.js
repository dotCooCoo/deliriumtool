/**
 * scoring.js — pure clinical decision logic.
 *
 * Every function here is a pure transformation of inputs to outputs with no DOM
 * access and no shared state, so each threshold can be unit-tested directly
 * against the source literature. The UI layer reads form state and calls these;
 * nothing in this file touches the document.
 *
 * Thresholds are documented in docs/CLINICAL_METHODOLOGY.md; the citations noted
 * inline map to the registry in data/refs.js. Do not change a clinical number
 * here without updating the methodology doc and the golden tests in
 * tests/unit/scoring.test.js.
 */

// ─── Risk-factor tally ──────────────────────────────────────────────────────
// A count of present risk factors (0–16), NOT a validated score — every factor
// counts +1 (a flat checklist, no implied weighting). Band cut-points are
// heuristic; for a validated ICU model the UI points to PRE-DELIRIC /
// E-PRE-DELIRIC. See docs/CLINICAL_METHODOLOGY.md §2.1.
export const RISK_MAX = 15;

/**
 * Map a risk tally to its band.
 * @returns {{band:string, tier:string, label:string, note:string}}
 *   `band` keys a CSS class (risk-<band>); `tier` is the short label printed on
 *   the PDF; `label`/`note` are the on-screen copy.
 */
export function riskTier(score) {
  if (score <= 3)
    return {
      band: 'low',
      tier: 'Few',
      label: 'Few risk factors',
      note: 'Maintain baseline prevention measures',
    };
  if (score <= 6)
    return {
      band: 'mod',
      tier: 'Several',
      label: 'Several risk factors',
      note: 'Enhanced ABCDEF bundle · monitor closely',
    };
  if (score <= 10)
    return {
      band: 'high',
      tier: 'Many',
      label: 'Many risk factors',
      note: 'Full bundle · consider geriatrics input (per local protocol)',
    };
  return {
    band: 'crit',
    tier: 'Very many',
    label: 'Very many risk factors',
    note: 'Full bundle · consider geriatrics input (per local protocol)',
  };
}

/**
 * Escalation suggestions surfaced under the score (per local protocol). The
 * geriatrics trigger is a pragmatic, non-validated threshold (geriatrics
 * co-management has the strongest delirium-prevention evidence). There is no
 * score-triggered psychiatry suggestion: psychiatry is indicated by clinical
 * features (diagnostic uncertainty, refractory agitation, comorbid psychiatric
 * illness), not by a count of risk factors at the prevention stage.
 */
export function riskActions(score) {
  const actions = [];
  if (score > 6) {
    actions.push('Consider geriatrics consultation (pragmatic threshold — per local protocol)');
  }
  actions.push('Minimize deliriogenic medications');
  actions.push('Ensure adequate analgesia and sleep hygiene');
  return actions;
}

// ─── CAM-ICU ────────────────────────────────────────────────────────────────
// Inattention is positive at > 2 errors on the SAVEAHAART letters task (or the
// 10-item Pictures ASE, > 2/10 — same cut-point). See docs §2.2.
export function inattentionPositive(errors) {
  return Number(errors) > 2;
}

/**
 * Evaluate the CAM-ICU result from the four features and the current RASS.
 *
 * The instrument is a two-step assessment: level of consciousness (RASS)
 * first, features second — so no definitive verdict is returned until a RASS
 * is documented. Arousal gate: RASS -4/-5 → 'unable' (too sedated to assess).
 * Otherwise the standard rule — Positive if Feature 1 AND Feature 2 AND
 * (Feature 3 OR 4).
 *
 * @param {{f1?:string,f2?:string,f4?:string,rass?:string}} features
 *   each feature is 'yes' | 'no' | undefined (not yet assessed). Feature 3
 *   (altered level of consciousness) is not passed - it is defined as RASS != 0
 *   and is derived here from the documented RASS so it can never contradict it.
 * @returns {'positive'|'negative'|'unable'|null} null = incomplete
 */
export function evalCam({ f1, f2, f4, rass } = {}) {
  if (rass === '-4' || rass === '-5') return 'unable';
  if (rass === undefined || rass === null || rass === '') return null; // document RASS first

  const f1Set = f1 !== undefined,
    f2Set = f2 !== undefined,
    f4Set = f4 !== undefined;
  const p1 = f1 === 'yes',
    p2 = f2 === 'yes',
    p4 = f4 === 'yes';
  const p3 = rass !== '0'; // Feature 3 = altered LOC, derived from the documented RASS

  if (!f1Set || !f2Set) return null; // both required features must be answered first
  if (!p1 || !p2) return 'negative'; // a required feature is absent → cannot be positive
  if (p3 || p4) return 'positive'; // 1 & 2 positive + a secondary feature
  if (f4Set) return 'negative'; // Feature 3 negative (RASS 0) and Feature 4 assessed negative
  return null; // awaiting Feature 4
}

// ─── RASS ───────────────────────────────────────────────────────────────────
// The light-sedation target band defaults to 0 to -2 (ICU default) but is unit-
// configurable (Setup → RASS Target). The target SET drives the "at target"
// wording, the green band, and the [TARGET] markers; the physiologic descriptors
// below are fixed clinical facts. Tone is asymmetric: agitation is always
// flagged, over-sedation (deeper than goal) escalates, and being lighter than a
// deep goal is caution, not danger. See docs §2.3.
const RASS_DESC = {
  '+4': 'agitated',
  '+3': 'agitated',
  '+2': 'agitated',
  '+1': 'restless',
  0: 'alert & calm',
  '-1': 'drowsy',
  '-2': 'light sedation',
  '-3': 'moderate sedation',
  '-4': 'deep sedation',
  '-5': 'unarousable',
};

/**
 * The set of in-target RASS values (as strings) for a target band like "0 to -2"
 * (light, the ICU default), "0 to -1", or "-3 to -4" (deep — an indication-gated
 * option, never the delirium-prevention default). ASCII or unicode dash. Defaults
 * to the 0 to -2 light-sedation band when the target is unset or unparseable.
 */
export function rassTargetSet(target) {
  const nums = String(target == null ? '0 to -2' : target)
    .replace(/[‐-―−]/g, '-')
    .match(/-?\d+/g);
  if (!nums || !nums.length) return ['0', '-1', '-2'];
  const a = parseInt(nums[0], 10);
  const b = parseInt(nums[nums.length - 1], 10);
  const out = [];
  for (let n = Math.min(a, b); n <= Math.max(a, b); n++) out.push(String(n));
  return out;
}

/** Physiologic label, or "at target" when the RASS is within the configured band. */
export function rassZone(rass, target) {
  if (rass == null || rass === '') return '';
  if (rassTargetSet(target).includes(String(rass))) return 'at target';
  return RASS_DESC[rass] || '';
}

/**
 * Tone for colouring the RASS readout/band relative to the configured target:
 * 'ok' in-target, 'caution' at the edges (restless or one step off-goal),
 * 'danger' for marked agitation or over-sedation, 'none' when unset.
 */
export function rassTone(rass, target) {
  if (!rass) return 'none';
  const set = rassTargetSet(target).map(Number);
  const v = Number(rass);
  if (set.includes(v)) return 'ok';
  if (v <= -5) return 'danger'; // unarousable is always danger, even under a deep target
  if (v > 0) return v >= 2 ? 'danger' : 'caution'; // agitation is always flagged
  const deepest = Math.min(...set);
  if (v < deepest) return v <= deepest - 2 ? 'danger' : 'caution'; // over-sedation
  return 'caution'; // lighter than a deeper goal
}

// ─── Checklist completion ───────────────────────────────────────────────────
/** Percent complete (0–100, rounded) — used by the ABCDEF bundle and DELIRIUM(S) strips. */
export function pct(on, total) {
  return total ? Math.round((on / total) * 100) : 0;
}
