/**
 * data/prevent.js — short labels for the prevention bundle and non-pharmacologic
 * measures, keyed by the data-prev id on each checkbox, so the "addressed this
 * shift" selections can be summarized on the report.
 */
export const PREVENTION_LABELS = {
  A: 'A — Assess, prevent & manage pain',
  B: 'B — Both spontaneous awakening & breathing trials',
  C: 'C — Choice of analgesia & sedation',
  D: 'D — Delirium: assess, prevent & manage',
  E: 'E — Early mobility & exercise',
  F: 'F — Family engagement & empowerment',
  sleep: 'Protect sleep / circadian rhythm',
  daynight: 'Normalize day–night',
  sensory: 'Sensory aids & engagement',
  deprescribe: 'Minimize restraints & deliriogenic meds',
};

// Stable display order (bundle A–F, then the measures).
export const PREVENTION_ORDER = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'sleep',
  'daynight',
  'sensory',
  'deprescribe',
];
