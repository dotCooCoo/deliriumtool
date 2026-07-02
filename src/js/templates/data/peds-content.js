/**
 * templates/data/peds-content.js — content for the pediatric bedside card set
 * and PICU workflow poster. Clinical values are imported directly from the
 * pediatric tool's data modules (src/js/peds/data/), so the printed cards can
 * never carry different thresholds, scripts, or wording than the interactive
 * tool — the mapping is documented in docs/CLINICAL_METHODOLOGY.md §2.10.
 * Layout-only strings (card titles, step labels) live here.
 */
import { RASS_LEVELS, SBS_LEVELS, RASS_COMATOSE, SBS_COMATOSE } from '../../peds/data/arousal.js';
import { CAPD_ITEMS, CAPD_POSITIVE, CAPD_FREQ, CAPD_DEV_DELAY_NOTE } from '../../peds/data/capd.js';
import { PCAM, PSCAM } from '../../peds/data/cam.js';
import { REFS as PEDS_REFS } from '../../peds/data/refs.js';

export { RASS_LEVELS, SBS_LEVELS, RASS_COMATOSE, SBS_COMATOSE };
export { CAPD_ITEMS, CAPD_POSITIVE, CAPD_FREQ, CAPD_DEV_DELAY_NOTE };
export { PCAM, PSCAM, PEDS_REFS };

/**
 * RASS row descriptions for the printed arousal card — the published scale
 * wording (Sessler 2002 / Ely 2003) as carried on the validated pediatric
 * assessment card distributed with ps/pCAM-ICU; the interactive tool shows
 * labels only. The ≥/< 10-second eye-contact descriptors on −1/−2 are the
 * original RASS anchors.
 */
export const RASS_CARD_DESC = {
  '+4': 'Combative, violent — immediate danger to staff',
  '+3': 'Pulls to remove tubes or catheters; aggressive',
  '+2': 'Frequent non-purposeful movement; fights ventilator',
  '+1': 'Anxious, apprehensive — movements not aggressive',
  0: 'Spontaneous attention to caregiver',
  '-1': 'Not fully alert — sustained awakening to voice; eye opening and eye contact ≥ 10 s',
  '-2': 'Briefly awakens to voice; eyes open but contact < 10 s',
  '-3': 'Movement or eye opening to voice; no eye contact',
  '-4': 'No response to voice; movement or eye opening to touch',
  '-5': 'No response to noxious stimuli',
};

/** LOOK / TALK / TOUCH assessment rail (observe first, then voice, then touch). */
export const RASS_RAIL = [
  { label: 'Look', values: ['+4', '+3', '+2', '+1', '0'], tone: 'red' },
  { label: 'Talk', values: ['-1', '-2', '-3'], tone: 'teal' },
  { label: 'Touch', values: ['-4', '-5'], tone: 'navy' },
];

/** Zone tint per arousal value (agitation warm, target highlighted, sedation cool). */
export const AROUSAL_ZONE = {
  rass: {
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
  },
  sbs: {
    '+2': 'red',
    '+1': 'rust',
    0: 'green',
    '-1': 'teal',
    '-2': 'navy',
    '-3': 'navy',
  },
};

/** Gate rules per scale — mirrors scoring.js arousalGate (screen only at ok). */
export const AROUSAL_GATE = {
  rass: {
    proceed: 'RASS ≥ −3 → proceed to Step 2 — the delirium screen',
    stop: 'RASS −4 / −5 → STOP — record "unable to assess"; reassess when the child responds to voice',
  },
  sbs: {
    proceed: 'SBS ≥ −1 → proceed to Step 2 — the delirium screen',
    stop: 'SBS −2 / −3 → STOP — record "unable to assess"; reassess when the child responds to gentle touch or voice',
  },
};

/** Age routing — mirrors scoring.js recommendScreen. */
export const SCREEN_ROUTES = [
  {
    id: 'route-capd',
    name: 'CAPD',
    who: 'Every age — the default screen',
    how: 'Observational: rate the child over the shift against age-expected behavior. Works at any developmental age, including deep developmental delay.',
    tone: 'plum',
  },
  {
    id: 'route-pscam',
    name: 'psCAM-ICU',
    who: 'Developmental age 6 months – 5 years',
    how: 'Interactive point-in-time screen with age-adapted observational tasks (picture presentations).',
    tone: 'azure',
  },
  {
    id: 'route-pcam',
    name: 'pCAM-ICU',
    who: 'Chronological AND developmental age ≥ 5 years',
    how: 'Interactive point-in-time screen with verbal attention and command tasks.',
    tone: 'navy',
  },
];

/** SBS administration note (Curley 2006 form). */
export const SBS_PROCEDURE =
  'Score the child’s response to your voice, then gentle touch, then noxious stimulus, per unit practice (Curley 2006).';

export const SENSORY_REMINDER =
  'Before any screen: glasses / corrective lenses and hearing aids in place, per the child profile.';

/**
 * Stimulus picture deck. All ten pictures serve the psCAM-ICU Feature-2
 * presentations; the two five-picture sets support the pCAM-ICU
 * memory-pictures alternative (5 to memorize + 5 "other" for yes/no
 * recognition). Artwork is original (drawn for this site) — the task
 * procedure is the validated element, not the specific pictures.
 */
export const STIM_DECK = [
  { id: 'stim-heart', name: 'Heart', set: 'memory' },
  { id: 'stim-star', name: 'Star', set: 'memory' },
  { id: 'stim-fish', name: 'Fish', set: 'memory' },
  { id: 'stim-sun', name: 'Sun', set: 'memory' },
  { id: 'stim-duck', name: 'Duck', set: 'memory' },
  { id: 'stim-balloons', name: 'Balloons', set: 'other' },
  { id: 'stim-flower', name: 'Flower', set: 'other' },
  { id: 'stim-ball', name: 'Ball', set: 'other' },
  { id: 'stim-butterfly', name: 'Butterfly', set: 'other' },
  { id: 'stim-boat', name: 'Sailboat', set: 'other' },
];

/**
 * The pCAM-ICU Feature-2 script, verbatim from the validated instrument card
 * (Smith 2011; Vanderbilt pCAM-ICU pocket card).
 */
export const PCAM_SCRIPT =
  'Say: “Squeeze my hand when I say A. Let’s practice: A, B. Squeeze only on A.”';

/**
 * The interactive tool's task text says "tap" for its tap-to-count controls;
 * the printed card says "count". Everything else stays verbatim (pinned by
 * unit test).
 */
export const printTask = (task) =>
  task.replace(/Tap each/g, 'Count each').replace(/tap each/g, 'count each');

export const STIM_INSTRUCTIONS = {
  title: 'Using the picture cards',
  pscamHead: 'psCAM-ICU — Feature 2 (any 10 pictures)',
  pscam: printTask(PSCAM.features.find((f) => f.id === 'f2').task),
  pcamHead: 'pCAM-ICU — memory-pictures alternative',
  pcam: 'Say: “Here are some pictures. You need to remember them.” Show the 5 memory-set pictures, 2–3 seconds each. Then say: “Here are some more pictures. Tell me yes or no (or nod) if the picture you see was one you needed to remember.” Show all 10 pictures, saying the name of each and showing it 2–3 seconds. An error is “no” to a memory picture or “yes” to an other-set picture; same ≥ 3-error cut as the letters task.',
  memoryList: 'Memory set: Heart · Star · Fish · Sun · Duck',
  otherList: 'Other set: Balloons · Flower · Ball · Butterfly · Sailboat',
  note: 'Original artwork — units may substitute their validated picture set per local practice. Set membership is deliberately not printed on the card faces.',
};

/**
 * Act-on-a-positive pathway — the tool's result actions and treatment steps
 * (Screening result strings + Treatment tab, PANDEM-aligned).
 */
export const ACT_POSITIVE = {
  first: [
    {
      id: 'act-withdrawal',
      text: 'Withdrawal can mimic delirium — if the child is on or weaning prolonged opioids or benzodiazepines, assess for iatrogenic withdrawal (e.g. WAT-1).',
    },
    {
      id: 'act-notify',
      text: 'Tell the team on rounds: target arousal, actual arousal, screen result, and today’s plan.',
    },
    {
      id: 'act-causes',
      text: 'Find and fix precipitants: pain, hypoxia, sepsis, metabolic derangement, new medications.',
    },
  ],
  bundle: [
    {
      id: 'act-benzo',
      text: 'Switch benzodiazepine sedation to dexmedetomidine; target light, goal-directed sedation.',
    },
    { id: 'act-antichol', text: 'Deprescribe anticholinergics; minimize restraints.' },
    {
      id: 'act-sleep',
      text: 'Restore sleep and day–night rhythm; mobilize early; maximize family presence.',
    },
  ],
  escalate: [
    {
      id: 'act-drug',
      text: 'Drugs treat symptoms only — if agitation threatens safety and non-pharm has failed, consider a short course of an atypical antipsychotic at the lowest effective dose, reassessed daily (off-label, limited evidence).',
    },
    {
      id: 'act-ecg',
      text: 'Before and during any antipsychotic: baseline 12-lead ECG (QTc), electrolytes (K, Mg, Ca), review of QT-prolonging drugs.',
    },
    { id: 'act-consult', text: 'Consider psychiatry / pharmacy consult per unit practice.' },
  ],
};

/** Prevention bundle — the tool's ABCDEF lines (Prevention tab), condensed heads kept. */
export const PREVENT_BUNDLE = [
  {
    id: 'prev-a',
    ltr: 'A',
    head: 'Assess, prevent & manage pain',
    text: 'Validated pediatric scales (FLACC, FACES, or self-report by age); analgesia-first.',
    tone: 'teal',
  },
  {
    id: 'prev-b',
    ltr: 'B',
    head: 'Both spontaneous awakening & breathing trials',
    text: 'Protocolized, nurse-driven sedation minimization; watch for iatrogenic withdrawal (WAT-1) when weaning.',
    tone: 'azure',
  },
  {
    id: 'prev-c',
    ltr: 'C',
    head: 'Choice of analgesia & sedation',
    text: 'Light, goal-directed (SBS −1 to 0 / unit RASS target); minimize benzodiazepines, prefer dexmedetomidine.',
    tone: 'navy',
  },
  {
    id: 'prev-d',
    ltr: 'D',
    head: 'Delirium: assess, prevent & manage',
    text: 'Screen at least each shift with CAPD or pCAM/psCAM; address precipitants.',
    tone: 'plum',
  },
  {
    id: 'prev-e',
    ltr: 'E',
    head: 'Early mobility & exercise',
    text: 'Developmentally appropriate (passive ROM → active play → sit → stand → ambulate); involve PT/OT/child-life.',
    tone: 'green',
  },
  {
    id: 'prev-f',
    ltr: 'F',
    head: 'Family engagement & empowerment',
    text: 'Caregiver presence, comfort, familiar voice/objects; educate families to recognize delirium.',
    tone: 'rust',
  },
];

export const PREVENT_MEASURES = [
  {
    id: 'prev-sleep',
    text: 'Protect sleep / circadian rhythm — cluster night care, reduce noise and light, avoid sleep-fragmenting sedatives.',
  },
  {
    id: 'prev-daynight',
    text: 'Normalize day–night — daytime light and activity; dim, quiet nights; age-appropriate orientation.',
  },
  {
    id: 'prev-sensory',
    text: 'Sensory aids & engagement — glasses, hearing aids; familiar comfort objects, music, play, child-life.',
  },
  {
    id: 'prev-meds',
    text: 'Minimize restraints & deliriogenic meds — deprescribe anticholinergics; reduce physical restraints.',
  },
];

/**
 * Workflow poster stages — mirrors the tool's screen→gate→score→act flow.
 * Lines carrying validated values (comatose floors, age routing, positivity
 * thresholds) are locked: always printed, never unit-editable. Thresholds
 * interpolate from the tool constants so they cannot drift.
 */
export const WORKFLOW_STAGES = [
  {
    id: 'wf-screen',
    n: '1',
    head: 'Screen every child',
    tone: 'navy',
    lines: [
      {
        id: 'wf-screen-shift',
        text: 'Every PICU child, at least once per shift and with any mental-status change.',
      },
      {
        id: 'wf-screen-why',
        text: 'Delirium is common (~25% point prevalence) and mostly hypoactive or mixed — easily missed without a screen.',
      },
    ],
  },
  {
    id: 'wf-gate',
    n: '2',
    head: 'Arousal first — the gate',
    tone: 'rust',
    lines: [
      {
        id: 'wf-gate-scales',
        text: 'Score RASS (older / verbal) or SBS (intubated infants & young children).',
      },
      {
        id: 'wf-gate-floor',
        locked: true,
        text: `Comatose floor (RASS ${RASS_COMATOSE.join('/').replace(/-/g, '−')} · SBS ${SBS_COMATOSE.join('/').replace(/-/g, '−')}) → record "unable to assess"; reassess when the child responds.`,
      },
    ],
  },
  {
    id: 'wf-score',
    n: '3',
    head: 'Score the screen',
    tone: 'plum',
    lines: [
      {
        id: 'wf-score-capd',
        text: 'CAPD — default for every age (observational, over the shift).',
      },
      {
        id: 'wf-score-routes',
        locked: true,
        text: 'psCAM-ICU — dev. age 6 mo–5 yr · pCAM-ICU — chronological and dev. age ≥ 5 yr: point-in-time interactive screens.',
      },
      {
        id: 'wf-score-positive',
        locked: true,
        text: `Positive: CAPD ≥ ${CAPD_POSITIVE}, or CAM Feature 1 + 2 + (3 or 4).`,
      },
    ],
  },
  {
    id: 'wf-act',
    n: '4',
    head: 'Act on the result',
    tone: 'green',
    lines: [
      {
        id: 'wf-act-negative',
        text: 'Negative → keep the prevention bundle going; rescreen next shift.',
      },
      {
        id: 'wf-act-positive',
        text: 'Positive → rule out withdrawal (WAT-1); find and fix precipitants; bundle levers first — drugs treat symptoms only.',
      },
    ],
  },
];

/** Rounds script — the "10-second" delirium report for every patient. */
export const ROUNDS_SCRIPT = [
  { id: 'rs-target', text: 'Target arousal (unit RASS / SBS goal for this child)' },
  { id: 'rs-actual', text: 'Actual arousal (this shift’s RASS / SBS)' },
  { id: 'rs-screen', text: 'Screen result (CAPD score or ps/pCAM-ICU ±)' },
  { id: 'rs-plan', text: 'Sedation, analgesia & delirium plan for today' },
];

/** Short footer labels for the peds citation keys (registry: peds refs.js). */
export const PEDS_CITE_LABELS = {
  traube2014_capd: 'Traube 2014 (CAPD)',
  smith2011_pcam: 'Smith 2011 (pCAM-ICU)',
  smith2016_pscam: 'Smith 2016 (psCAM-ICU)',
  curley2006_sbs: 'Curley 2006 (SBS)',
  sessler2002_rass: 'Sessler 2002 (RASS)',
  gupta2021_capd_mv: 'Gupta 2021',
  pandem2022: 'SCCM PANDEM 2022',
  lin2023_liberation: 'Lin 2023 (ICU Liberation)',
  traube2017_prevalence: 'Traube 2017',
  mody2018_benzo: 'Mody 2018',
};

/** Footer citation keys per peds template (resolve in the peds registry). */
export const PEDS_FOOTER_CITES = {
  'peds-cards': [
    'sessler2002_rass',
    'curley2006_sbs',
    'traube2014_capd',
    'gupta2021_capd_mv',
    'smith2011_pcam',
    'smith2016_pscam',
    'pandem2022',
  ],
  'peds-workflow': [
    'pandem2022',
    'sessler2002_rass',
    'curley2006_sbs',
    'traube2014_capd',
    'smith2011_pcam',
    'smith2016_pscam',
    'lin2023_liberation',
  ],
};
