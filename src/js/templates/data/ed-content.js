/**
 * templates/data/ed-content.js — content for the emergency-department bedside
 * card set and ED workflow poster. Clinical values are imported directly from
 * the ED tool's data modules (src/js/ed/data/), so the printed cards can never
 * carry different scripts, thresholds, or wording than the interactive tool —
 * the mapping is documented in docs/CLINICAL_METHODOLOGY.md §2.12. Layout-only
 * strings (card titles, step labels, zone tints) live here.
 */
import {
  RASS_LEVELS,
  RASS_UNABLE,
  DTS,
  BCAM,
  FOURAT,
  PATHWAYS,
  ACT_POSITIVE,
} from '../../ed/data/instruments.js';
import { REFS as ED_REFS } from '../../ed/data/refs.js';

export { RASS_LEVELS, RASS_UNABLE, DTS, BCAM, FOURAT, PATHWAYS, ACT_POSITIVE, ED_REFS };

const f2 = BCAM.features.find((f) => f.id === 'f2');
const f4 = BCAM.features.find((f) => f.id === 'f4');

/** The DTS attention threshold and the bCAM inattention threshold, interpolated
 *  from the instrument data so the printed cut can't drift from the tool. */
export const DTS_ERR = DTS.attention.errorThreshold; // ≥2 errors = positive
export const F2_ERR = f2.errorThreshold; // >1 error = inattention

/**
 * RASS zone tint per value — agitation warm, the RASS-0 "calm" row highlighted
 * (it is the only DTS-negative arousal state), drowsiness cool, and the −4/−5
 * unable floor in navy.
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

/** LOOK / TALK / TOUCH assessment rail — the escalating stimulus procedure the
 *  ED-adapted RASS anchors describe (observe, then voice, then touch). */
export const RASS_RAIL = [
  { label: 'Look', values: ['+4', '+3', '+2', '+1', '0'], tone: 'red' },
  { label: 'Talk', values: ['-1', '-2', '-3'], tone: 'teal' },
  { label: 'Touch', values: ['-4', '-5'], tone: 'navy' },
];

/** Arousal gate rules — mirrors scoring.js arousalGate + the DTS/bCAM role. */
export const AROUSAL_GATE = {
  altered:
    'Any RASS other than 0 → altered arousal — the DTS is already positive; on the bCAM this is Feature 3.',
  stop: `RASS ${RASS_UNABLE.join(' / ').replace(/-/g, '−')} → STOP — record “unable to assess”; reassess when the patient responds to voice.`,
};

/**
 * DTS flowsheet steps (Step 1, the <20-second triage rule-out). The LUNCH
 * script and the positivity rule are the validated element; the expected
 * backwards sequence is a bedside aid.
 */
export const DTS_FLOW = {
  script: DTS.attention.script,
  letters: DTS.attention.items, // ['H','C','N','U','L']
  negative:
    'RASS 0 and 0–1 errors → DTS negative — delirium ruled out (98% sensitive). Rescreen with any change in mental status.',
};

/** The bCAM Feature-2 script (months backward), verbatim from the instrument. */
export const BCAM_F2_SCRIPT = f2.script;

/** bCAM Feature-4 question sets + command, verbatim from the instrument. */
export const BCAM_F4 = {
  setA: f4.sets.a,
  setB: f4.sets.b,
  command: f4.command,
};

/**
 * The bCAM rule string, interpolated so the printed card matches the tool.
 * (Feature 2 — inattention — is the required cardinal feature.)
 */
export const BCAM_RULE = BCAM.rule;

/** 4AT bands, from the form (verdict → printed label). */
export const FOURAT_BANDS = FOURAT.bands;

/**
 * Act-on-a-positive content — regrouped from the tool's ACT_POSITIVE blocks
 * into the card's three columns (find the cause / manage without new harm /
 * document & hand off). Item ids are preserved so the designer's per-item
 * controls address the same lines.
 */
export const ACT_COLUMNS = ACT_POSITIVE.map((block) => ({
  id: block.id,
  head: block.head,
  items: block.items.map((text, i) => ({ id: `${block.id}-${i}`, text })),
  cites: block.cites,
}));

/**
 * Workflow poster stages — the tool's screen → gate → confirm → act flow.
 * Lines carrying validated thresholds are locked (always printed, never
 * unit-editable) and interpolate from the instrument constants so they cannot
 * drift.
 */
export const WORKFLOW_STAGES = [
  {
    id: 'ed-wf-screen',
    n: '1',
    head: 'Screen every older adult',
    tone: 'navy',
    lines: [
      {
        id: 'ed-wf-screen-who',
        text: 'Screen older ED patients per your department’s policy — most ED delirium is hypoactive and quiet, and is missed without a screen.',
      },
      {
        id: 'ed-wf-screen-pathway',
        locked: true,
        text: 'Pick one pathway: two-step DTS → bCAM, the bCAM directly (high-risk), or the 4AT.',
      },
    ],
  },
  {
    id: 'ed-wf-gate',
    n: '2',
    head: 'Arousal — the gate',
    tone: 'rust',
    lines: [
      {
        id: 'ed-wf-gate-rass',
        text: 'Score the RASS first. Any RASS other than 0 is altered arousal.',
      },
      {
        id: 'ed-wf-gate-floor',
        locked: true,
        text: `RASS ${RASS_UNABLE.join(' / ').replace(/-/g, '−')} → stupor / coma — record “unable to assess”; reassess when the patient responds to voice.`,
      },
    ],
  },
  {
    id: 'ed-wf-confirm',
    n: '3',
    head: 'Screen & confirm',
    tone: 'plum',
    lines: [
      {
        id: 'ed-wf-confirm-dts',
        locked: true,
        text: `DTS (<20 s): altered arousal, ≥ ${DTS_ERR} errors spelling LUNCH backwards, or unable / refused → positive → confirm with the bCAM.`,
      },
      {
        id: 'ed-wf-confirm-bcam',
        locked: true,
        text: `bCAM (<2 min): ${BCAM_RULE}.`,
      },
      {
        id: 'ed-wf-confirm-4at',
        locked: true,
        text: `4AT: alertness + AMT4 + months-backward + acute change; ≥ ${FOURAT.bands[0].min} → possible delirium, ${FOURAT.bands[1].min}–${FOURAT.bands[0].min - 1} → possible cognitive impairment.`,
      },
    ],
  },
  {
    id: 'ed-wf-act',
    n: '4',
    head: 'Act on the result',
    tone: 'green',
    lines: [
      {
        id: 'ed-wf-act-negative',
        text: 'Negative → document it; rescreen with any change in mental status.',
      },
      {
        id: 'ed-wf-act-positive',
        text: 'Positive → find the cause (review meds first), manage without new harm, and hand the finding off at disposition — a positive ED screen predicts 6-month mortality.',
      },
    ],
  },
];

/** Hand-off script — say these at disposition for every positive screen. */
export const HANDOFF_SCRIPT = [
  { id: 'ed-hs-result', text: 'Screen used and result (DTS/bCAM or 4AT)' },
  { id: 'ed-hs-cause', text: 'Suspected cause(s) and what was ruled out' },
  { id: 'ed-hs-done', text: 'Interventions started in the ED' },
  {
    id: 'ed-hs-followup',
    text: 'Reassessment / follow-up plan for the admitting or receiving team',
  },
];

/** Footer cite labels for the ED registry (mirrors PEDS_CITE_LABELS). */
export const ED_CITE_LABELS = Object.fromEntries(Object.entries(ED_REFS).map(([k, r]) => [k, r.l]));

/** Footer citation keys per ED template (resolve in the ED registry). */
export const ED_FOOTER_CITES = {
  'ed-cards': [
    'han2013_dts_bcam',
    'dts_manual',
    'bcam_manual',
    'fourat_form',
    'sessler2002_rass',
    'ged2_2026',
    'adept2020',
  ],
  'ed-workflow': [
    'han2013_dts_bcam',
    'fourat_form',
    'ged2_2026',
    'sign157',
    'nice_cg103',
    'adept2020',
    'han2010',
  ],
};
