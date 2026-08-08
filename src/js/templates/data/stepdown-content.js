/**
 * templates/data/stepdown-content.js — content for the adult step-down /
 * progressive-care bedside card set and workflow poster. Clinical values are
 * imported directly from the step-down tool's data modules (src/js/stepdown/data/),
 * so the printed cards can never carry different scripts, thresholds, or wording
 * than the interactive tool — the mapping is documented in
 * docs/CLINICAL_METHODOLOGY.md §2.14. Layout-only strings (card titles, step
 * labels, zone tints, workflow copy) live here.
 */
import {
  RASS_LEVELS,
  RASS_CITES,
  CAMIMC,
  RISK,
  PREVENTION,
} from '../../stepdown/data/instruments.js';
import { REFS as SD_REFS } from '../../stepdown/data/refs.js';

export { RASS_LEVELS, CAMIMC, RISK, PREVENTION, SD_REFS };

/** The −4/−5 arousal floor — mirrors scoring.js arousalGate. */
export const RASS_UNABLE = ['-4', '-5'];

/** CAM-IMC cut-point and item thresholds, interpolated from the instrument so the
 *  printed card can't drift from the tool. */
export const CAMIMC_POSITIVE = CAMIMC.positiveAt; // ≥3 of 10 = positive
export const CAMIMC_MAX = CAMIMC.maxScore; // 10
export const CAMIMC_ATT_SCRIPT = CAMIMC.inattention.script; // verbatim word-test read
export const INATT_MAX = CAMIMC.inattention.maxPoints; // up to 3
export const DISO_MAX = CAMIMC.disorientation.maxPoints; // up to 5
export const DISO_DIMS = CAMIMC.disorientation.dimensions; // the five dimensions

/** Martinez admission-risk thresholds + bands, interpolated from the tool. */
export const ADL_THRESHOLD = RISK.adl.threshold; // ≥5 of 6 ADLs
export const ADL_ACTIVITIES = RISK.adl.activities;
export const PSYCHO_THRESHOLD = RISK.psychotropic.threshold; // weighted subtotal ≥2
export const PSYCHO_DRUGS = RISK.psychotropic.drugs;
export const RISK_BANDS = RISK.bands;

/** Prevention-bundle components, verbatim from the tool. */
export const PREVENTION_ITEMS = PREVENTION.components;

/**
 * RASS zone tint per value — agitation warm, the RASS-0 "calm" row highlighted,
 * drowsiness cool, and the −4/−5 unable floor in navy. Same scheme as the ED card.
 */
export const AROUSAL_ZONE = {
  '+4': 'red',
  '+3': 'red',
  '+2': 'rust',
  '+1': 'rust',
  0: 'green',
  '-1': 'teal',
  '-2': 'teal',
  '-3': 'teal',
  '-4': 'navy',
  '-5': 'navy',
};

/** LOOK / TALK / TOUCH assessment rail — the escalating stimulus procedure. */
export const RASS_RAIL = [
  { label: 'Look', values: ['+4', '+3', '+2', '+1', '0'], tone: 'red' },
  { label: 'Talk', values: ['-1', '-2', '-3'], tone: 'teal' },
  { label: 'Touch', values: ['-4', '-5'], tone: 'navy' },
];

/** Arousal gate rules — mirrors scoring.js arousalGate + the CAM-IMC LOC item. */
export const AROUSAL_GATE = {
  altered:
    'Any RASS other than 0 → altered arousal — scores the CAM-IMC level-of-consciousness point (+1).',
  stop: `RASS ${RASS_UNABLE.join(' / ').replace(/-/g, '−')} → STOP — stupor or coma; the CAM-IMC cannot be scored now. Reassess when the patient responds to voice.`,
};

/**
 * Act-on-a-positive content — three columns (find the cause / manage without new
 * harm / document & hand off), grounded in the tool's cited prevention and
 * pharmacology guidance. Item ids are stable so the designer's per-item controls
 * address the same lines.
 */
export const ACT_COLUMNS = [
  {
    id: 'sd-cause',
    head: 'Find the cause',
    cites: ['lisibach2022', 'ags2015', 'wang2017'],
    lines: [
      'Review deliriogenic / anticholinergic medications first — minimize the burden.',
      'Look for infection, hypoxia, and metabolic causes; check pain and elimination.',
      'In post-ICU transfers, consider sedative / opioid withdrawal (onset 1–11 days).',
    ],
  },
  {
    id: 'sd-manage',
    head: 'Manage without new harm',
    cites: ['siddiqi2016', 'inouye1999_help', 'neufeld2016', 'oh2019', 'nikooie2019'],
    lines: [
      'Apply the multicomponent non-pharmacologic bundle — first-line for every patient.',
      'Antipsychotics do NOT prevent or treat delirium — do not use them routinely.',
      'Reserve short-term, low-dose antipsychotics only for severe agitation endangering the patient.',
    ],
  },
  {
    id: 'sd-report',
    head: 'Document & hand off',
    cites: ['nice_cg103'],
    lines: [
      'Document the screen used and its result; rescreen with any change in mental status.',
      'Hand off the finding, suspected cause, and plan to the receiving / covering team.',
    ],
  },
].map((b) => ({
  id: b.id,
  head: b.head,
  cites: b.cites,
  items: b.lines.map((text, i) => ({ id: `${b.id}-${i}`, text })),
}));

/**
 * Every source cited anywhere on the step-down templates — for the /templates
 * page's Sources list. (The printed-sheet footers show the shorter
 * STEPDOWN_FOOTER_CITES subset.) Computed from the content so it can't drift.
 */
export const STEPDOWN_ALL_CITES = [
  ...new Set([
    ...RASS_CITES,
    ...CAMIMC.cites,
    ...RISK.cites,
    ...PREVENTION.cites,
    ...ACT_COLUMNS.flatMap((c) => c.cites),
  ]),
];

/**
 * Workflow poster stages — the tool's screen → gate → score → risk → act flow.
 * Lines carrying validated thresholds are locked (always printed, never
 * unit-editable) and interpolate from the instrument constants so they cannot drift.
 */
export const WORKFLOW_STAGES = [
  {
    id: 'sd-wf-screen',
    n: '1',
    head: 'Screen the verbal patient',
    tone: 'navy',
    lines: [
      {
        id: 'sd-wf-screen-who',
        text: 'For the monitored, non-intubated (step-down / progressive-care) patient. Under ICU-level sedation, use the CAM-ICU instead.',
      },
      {
        id: 'sd-wf-screen-tool',
        locked: true,
        text: `Score arousal (RASS), then run the CAM-IMC — additive 0–${CAMIMC.maxScore}, positive at ≥ ${CAMIMC.positiveAt}.`,
      },
    ],
  },
  {
    id: 'sd-wf-gate',
    n: '2',
    head: 'Arousal — the gate',
    tone: 'rust',
    lines: [
      {
        id: 'sd-wf-gate-rass',
        text: 'Score the RASS first. Any RASS other than 0 scores the CAM-IMC level-of-consciousness point.',
      },
      {
        id: 'sd-wf-gate-floor',
        locked: true,
        text: `RASS ${RASS_UNABLE.join(' / ').replace(/-/g, '−')} → stupor / coma — record “unable to assess”; reassess when the patient responds to voice.`,
      },
    ],
  },
  {
    id: 'sd-wf-score',
    n: '3',
    head: 'CAM-IMC — score',
    tone: 'plum',
    lines: [
      {
        id: 'sd-wf-score-rule',
        locked: true,
        text: `CAM-IMC = acute change (+1) + altered LOC / RASS ≠ 0 (+1) + inattention (up to ${CAMIMC.inattention.maxPoints}) + disorientation (up to ${CAMIMC.disorientation.maxPoints}); ≥ ${CAMIMC.positiveAt} → positive.`,
      },
      {
        id: 'sd-wf-score-note',
        text: 'Disorientation or inattention can drive a positive result on their own — a negative acute-change item does not veto it.',
      },
    ],
  },
  {
    id: 'sd-wf-risk',
    n: '4',
    head: 'Risk & prevent',
    tone: 'teal',
    lines: [
      {
        id: 'sd-wf-risk-rule',
        locked: true,
        text: `Admission risk: age ≥ 85, ADL dependence ≥ ${RISK.adl.threshold} of 6, psychotropic subtotal ≥ ${RISK.psychotropic.threshold} — one point each → ${RISK.bands.map((b) => b.label).join(' / ')}.`,
      },
      {
        id: 'sd-wf-risk-bundle',
        text: 'Apply the multicomponent non-pharmacologic prevention bundle to every at-risk patient, every shift.',
      },
    ],
  },
  {
    id: 'sd-wf-act',
    n: '5',
    head: 'Act on the result',
    tone: 'green',
    lines: [
      {
        id: 'sd-wf-act-negative',
        text: 'Negative → document it; normal arousal does not exclude delirium — rescreen with any change.',
      },
      {
        id: 'sd-wf-act-positive',
        text: 'Positive → find the cause (review meds first), manage without new harm, and hand the finding off.',
      },
    ],
  },
];

/** Hand-off script — say these when transferring or handing off a positive screen. */
export const HANDOFF_SCRIPT = [
  { id: 'sd-hs-result', text: 'Screen used and result (CAM-IMC score / band)' },
  { id: 'sd-hs-cause', text: 'Suspected cause(s) and what was ruled out' },
  { id: 'sd-hs-done', text: 'Interventions started (bundle, medication changes)' },
  { id: 'sd-hs-followup', text: 'Reassessment / follow-up plan for the receiving team' },
];

/** Footer cite labels for the step-down registry (mirrors ED_CITE_LABELS). */
export const STEPDOWN_CITE_LABELS = Object.fromEntries(
  Object.entries(SD_REFS).map(([k, r]) => [k, r.l]),
);

/** Footer citation keys per step-down template (resolve in the step-down registry). */
export const STEPDOWN_FOOTER_CITES = {
  'stepdown-cards': [
    'beyer2024_camimc',
    'sessler2002_rass',
    'martinez2012',
    'siddiqi2016',
    'ags2015',
    'neufeld2016',
    'nice_cg103',
  ],
  // The poster covers screening, the arousal gate, CAM-IMC scoring, risk and
  // act. It carries no antipsychotic line, so the two antipsychotic reviews are
  // not listed here; they belong to the card set's act-on-a-positive column,
  // which does make that statement.
  'stepdown-workflow': ['beyer2024_camimc', 'martinez2012', 'siddiqi2016', 'nice_cg103'],
};
