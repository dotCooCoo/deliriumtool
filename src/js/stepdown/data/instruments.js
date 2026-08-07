/**
 * stepdown/data/instruments.js — cited clinical data for the step-down / progressive-care
 * tool. DOM-free: verbatim scripts, thresholds, score bands, and per-object `cites` keys
 * that resolve in data/refs.js. The scoring functions in scoring.js consume these; the
 * printable templates (if added) mirror them so nothing can drift.
 *
 * Every threshold below is transcribed from the archived full text (see
 * references/INDEX.md → Adult Stepdown).
 */

// ── Richmond Agitation-Sedation Scale ────────────────────────────────────────
export const RASS_LEVELS = [
  {
    v: '+4',
    label: '+4 Combative',
    desc: 'Overtly combative or violent; immediate danger to staff',
  },
  { v: '+3', label: '+3 Very agitated', desc: 'Pulls or removes tubes/catheters; aggressive' },
  { v: '+2', label: '+2 Agitated', desc: 'Frequent non-purposeful movement' },
  { v: '+1', label: '+1 Restless', desc: 'Anxious or apprehensive; movements not aggressive' },
  { v: '0', label: '0 Alert & calm', desc: '' },
  { v: '-1', label: '−1 Drowsy', desc: 'Not fully alert; sustained (>10 s) awakening to voice' },
  {
    v: '-2',
    label: '−2 Light sedation',
    desc: 'Briefly (<10 s) awakens with eye contact to voice',
  },
  {
    v: '-3',
    label: '−3 Moderate sedation',
    desc: 'Movement or eye opening to voice; no eye contact',
  },
  {
    v: '-4',
    label: '−4 Deep sedation',
    desc: 'No response to voice; moves to physical stimulation',
  },
  { v: '-5', label: '−5 Unarousable', desc: 'No response to voice or physical stimulation' },
];
export const RASS_CITES = ['sessler2002_rass', 'ely2003_rass', 'han2015_rass', 'chester2012_mrass'];

// ── CAM-IMC (Confusion Assessment Method for Intermediate Care Unit) ──────────
// Additive 0–10 point screen validated in a monitored, non-intubated (step-down)
// population; positive at ≥3 points (Beyer 2024). Deliberately does NOT gate on a
// negative acute-change item — disorientation or inattention can drive positivity.
export const CAMIMC = {
  name: 'CAM-IMC',
  full: 'Confusion Assessment Method for Intermediate Care Unit',
  positiveAt: 3,
  maxScore: 10,
  cites: ['beyer2024_camimc'],
  acute: {
    points: 1,
    prompt:
      'Acute change from the patient’s mental-status baseline, or fluctuation over the past 24 h?',
    help: 'Anchor the baseline from family/collateral or the admission record. Scores 1 point if present.',
  },
  loc: {
    points: 1,
    note: 'Read from the RASS above — any value other than 0 scores 1 point.',
  },
  inattention: {
    maxPoints: 3,
    script:
      'Read the 10-letter word “ANANASBAUM” (or “CASABLANCA”) aloud, letter by letter, and squeeze my hand each time you hear the letter A.',
    help: 'One point per error, to a maximum of 3. The item alone is positive at ≥3 errors.',
    options: [
      { v: 0, label: '0 errors' },
      { v: 1, label: '1 error' },
      { v: 2, label: '2 errors' },
      { v: 3, label: '≥3 errors' },
    ],
    unableLabel: 'Unable / no attempt (scores 3)',
  },
  disorientation: {
    maxPoints: 5,
    help: 'One point per error across five dimensions. The item alone is positive at ≥2 errors.',
    dimensions: ['Age', 'Date of birth', 'Place', 'Year', 'Situational awareness'],
  },
  verdicts: {
    positive:
      'screen positive for delirium (≥3). A positive screen suggests delirium but is not diagnostic; evaluate the cause and confirm clinically.',
    negative:
      'screen negative (<3). Normal arousal does not exclude delirium — rescreen with any change in mental status.',
    unable:
      'RASS −4/−5 — stupor or coma. Delirium content cannot be assessed now; reassess when the patient responds to voice.',
  },
};

// ── Ward delirium risk (Martinez 2012) ───────────────────────────────────────
// Three admission variables, 0–3 points, banded to predicted incidence. A
// vulnerability screen for direct step-down admits, not a diagnosis.
export const RISK = {
  name: 'Admission delirium risk',
  cites: ['martinez2012', 'nice_cg103'],
  intro:
    'A validated ward prediction rule for direct admits: three admission variables banded to predicted incidence. Use it to target the prevention bundle.',
  items: [{ id: 'age85', label: 'Age ≥ 85', pts: 1 }],
  // Dependence in ≥5 of the six ADLs Martinez assessed, each scored dichotomously.
  adl: {
    label: 'Dependence in activities of daily living',
    threshold: 5,
    help: 'Check each activity the patient depends on others for. This criterion scores 1 point at 5 of 6.',
    activities: [
      'Personal hygiene and grooming',
      'Dressing and undressing',
      'Getting on or off the toilet',
      'Ambulation',
      'Bowel and bladder control',
      'Self-feeding',
    ],
  },
  // Weighted drug classes; the criterion scores +1 at a subtotal of ≥2. Benzodiazepines
  // were recorded in the study but not weighted, so they are not scored here.
  psychotropic: {
    id: 'psychotropic',
    label: 'Psychotropic-drug burden',
    threshold: 2,
    help: 'Check each class the patient takes. Antidepressant, antidementia, and anticonvulsant score 1 each; antipsychotic scores 2. This criterion scores 1 point at a subtotal of ≥ 2.',
    drugs: [
      { id: 'antidepressant', label: 'Antidepressant', pts: 1 },
      { id: 'antidementia', label: 'Antidementia', pts: 1 },
      { id: 'anticonvulsant', label: 'Anticonvulsant', pts: 1 },
      { id: 'antipsychotic', label: 'Antipsychotic', pts: 2 },
    ],
  },
  // Bands keyed by total score (0–3).
  bands: [
    { max: 0, label: 'Low', note: 'Predicted incidence ~4%. Maintain baseline prevention.' },
    {
      max: 1,
      label: 'Intermediate',
      note: 'Predicted incidence ~14–23%. Apply the prevention bundle.',
    },
    {
      max: 3,
      label: 'High',
      note: 'Predicted incidence ~43–64%. Apply the full bundle and screen every shift.',
    },
  ],
};

// ── Multicomponent non-pharmacologic prevention ──────────────────────────────
// HELP-style bundle; the components are the study columns pooled by the Cochrane
// non-ICU review (Siddiqi 2016), reinforced by the AGS postoperative guideline.
export const PREVENTION = {
  name: 'Multicomponent prevention bundle',
  // Bundle sources (siddiqi/inouye/hshieh/ags) plus the antipsychotic-review
  // sources for the "do not use antipsychotics" guidance carried in this section.
  cites: [
    'siddiqi2016',
    'inouye1999_help',
    'hshieh2015',
    'ags2015',
    'neufeld2016',
    'oh2019',
    'nikooie2019',
    // the sleep component is the one bundle element with its own non-ICU review
    'tamrat2014_sleep',
  ],
  intro:
    'A multicomponent non-pharmacologic bundle reduced incident delirium in non-ICU inpatients (Cochrane RR 0.69). Antipsychotics do NOT prevent delirium — do not use them prophylactically.',
  components: [
    { id: 'orient', label: 'Reorientation — clock, calendar, whiteboard, familiar objects' },
    { id: 'sensory', label: 'Glasses and hearing aids in place' },
    { id: 'mobilise', label: 'Early mobilisation; remove restraints/lines that impede it' },
    {
      id: 'sleep',
      label: 'Sleep protocol — cluster care, reduce night noise/light, offer eye mask/earplugs',
    },
    { id: 'hydrate', label: 'Hydration and nutrition reviewed' },
    { id: 'meds', label: 'Deliriogenic / anticholinergic medications reviewed and minimised' },
    { id: 'pain', label: 'Pain assessed and treated without over-sedation' },
    { id: 'elimination', label: 'Bowel/bladder care; avoid unnecessary urinary catheters' },
    { id: 'workup', label: 'Infection, hypoxia, and metabolic causes identified and treated' },
    { id: 'family', label: 'Family engaged; delirium education provided' },
  ],
};

// A representative, non-identifying sample used by the "Load example" button.
export const EXAMPLE_ASSESSMENT = {
  v: 1,
  tool: 'stepdown',
  rass: '+1',
  camimc: {
    acute: 'yes',
    inattention: '2',
    inattentionUnable: false,
    disorientTaps: [3, 4],
    disorientDone: true,
  },
  risk: { age85: true, adlDeps: [0, 1, 2, 3, 4], psychoDrugs: ['antidepressant', 'antipsychotic'] },
  prevention: [
    'orient',
    'sensory',
    'mobilise',
    'sleep',
    'hydrate',
    'meds',
    'pain',
    'elimination',
    'workup',
    'family',
  ],
  assessor: 'A. Nurse, RN',
  notes:
    'Post-ICU transfer, day 2. Reoriented; family at bedside; non-pharmacologic bundle in place.',
  assessedAt: '',
};
