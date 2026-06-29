/**
 * data/risk.js — reported associations for pediatric ICU delirium, as a review
 * aid (not a validated predictive score). Each factor carries an evidence tag;
 * where the child profile already implies a factor, a `derive` key lets the Risk
 * tab flag it automatically instead of asking the nurse to re-enter it.
 * Sources: docs/CLINICAL_METHODOLOGY.md.
 */

export const RISK_GROUPS = [
  { id: 'modifiable', title: 'Modifiable — review and minimize' },
  { id: 'patient', title: 'Patient / illness factors' },
];

export const RISK_FACTORS = [
  {
    id: 'benzo',
    group: 'modifiable',
    label: 'Benzodiazepine exposure',
    evidence: 'established',
    detail:
      'The strongest, most consistent modifiable factor — dose-dependent and temporally linked (causal OR ≈ 3.3). Avoid as continuous sedation; reserve for specific indications.',
  },
  {
    id: 'deepsed',
    group: 'modifiable',
    label: 'Deep sedation',
    evidence: 'established',
    detail: 'Deeper sedation raises risk; target light, goal-directed sedation.',
  },
  {
    id: 'anticholinergic',
    group: 'modifiable',
    label: 'Anticholinergic burden',
    evidence: 'moderate',
    detail:
      'Deliriogenic; track and minimize cumulative exposure (e.g. diphenhydramine, scopolamine).',
  },
  {
    id: 'vent',
    group: 'modifiable',
    label: 'Mechanical ventilation',
    evidence: 'established',
    detail: 'Independently associated; risk compounds with sedation and immobility.',
  },
  {
    id: 'restraints',
    group: 'modifiable',
    label: 'Physical restraints',
    evidence: 'moderate',
    detail:
      'Associated with delirium (partly confounded by indication); reduce as part of the bundle.',
  },
  {
    id: 'immobility',
    group: 'modifiable',
    label: 'Immobility / device tethering',
    evidence: 'limited',
    detail: 'Addressed by early mobility.',
  },
  {
    id: 'age',
    group: 'patient',
    label: 'Young age (≤ 2 yr)',
    evidence: 'established',
    detail: 'Highest prevalence in infants and toddlers.',
    derive: 'age',
  },
  {
    id: 'devdelay',
    group: 'patient',
    label: 'Developmental delay / baseline impairment',
    evidence: 'established',
    detail: "Independent predictor; screen with CAPD anchored to the child's own baseline.",
    derive: 'delay',
  },
  {
    id: 'severity',
    group: 'patient',
    label: 'Greater severity of illness',
    evidence: 'established',
    detail: 'Organ dysfunction, vasoactive support.',
  },
  {
    id: 'coma',
    group: 'patient',
    label: 'Prior coma',
    evidence: 'established',
    detail: 'Independently associated with subsequent delirium.',
  },
  {
    id: 'los',
    group: 'patient',
    label: 'Prolonged PICU stay',
    evidence: 'established',
    detail: 'Both a risk marker and an outcome (delirium also prolongs stay).',
  },
];

/** Factor ids the child profile already implies, auto-flagged on the Risk tab. */
export function derivedRiskIds({ ageM, delay } = {}) {
  const ids = [];
  if (Number.isFinite(ageM) && ageM <= 24) ids.push('age');
  if (delay) ids.push('devdelay');
  return ids;
}
