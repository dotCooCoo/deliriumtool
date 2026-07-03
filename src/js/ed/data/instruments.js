/**
 * ed/data/instruments.js — the three ED screening instruments, with wording
 * carried from the validated sources (verbatim where the instrument is
 * scripted). Sources: Han 2013 + the Vanderbilt DTS/bCAM flowsheets and
 * training manuals; the official 4AT v1.2 form (free to use). Mapping:
 * docs/CLINICAL_METHODOLOGY.md §2.11.
 */

/**
 * RASS rows with the ED-adapted behavioral anchors printed on the DTS and
 * bCAM worksheets (Vanderbilt manuals; scale: Sessler 2002). The 0 vs −1
 * boundary decides DTS positivity and −3 vs −4 decides the unable gate, so
 * the anchors are load-bearing.
 */
export const RASS_LEVELS = [
  { v: '+4', label: 'Combative', desc: 'Overtly combative, violent, immediate danger to staff' },
  { v: '+3', label: 'Very agitated', desc: 'Pulls or removes tube(s) or catheter(s); aggressive' },
  { v: '+2', label: 'Agitated', desc: 'Frequent non-purposeful movement' },
  { v: '+1', label: 'Restless', desc: 'Anxious but movements not aggressive or vigorous' },
  { v: '0', label: 'Alert & calm', desc: '' },
  {
    v: '-1',
    label: 'Mildly drowsy',
    desc: 'Not fully alert, but has sustained awakening (eye-opening / eye contact) to voice (>10 seconds)',
  },
  {
    v: '-2',
    label: 'Moderately drowsy',
    desc: 'Briefly awakens with eye contact to voice (<10 seconds)',
  },
  {
    v: '-3',
    label: 'Very drowsy',
    desc: 'Movement or eye opening to voice (but no eye contact)',
  },
  {
    v: '-4',
    label: 'Arousable to pain only',
    desc: 'No response to voice, but movement or eye opening to physical stimulation',
  },
  { v: '-5', label: 'Unarousable', desc: 'No response to voice or physical stimulation' },
];

/** Citations for the arousal card: the scale + the ED-adapted worksheets. */
export const RASS_CITES = ['sessler2002_rass', 'dts_manual', 'bcam_manual'];

/** RASS −4/−5 = stupor/coma — cannot assess delirium content; reassess later. */
export const RASS_UNABLE = ['-4', '-5'];

/**
 * Delirium Triage Screen — the <20-second, highly sensitive rule-OUT
 * (98% sensitive; Han 2013). Designed for the nurse's triage assessment.
 */
export const DTS = {
  name: 'DTS',
  fullName: 'Delirium Triage Screen',
  cites: ['han2013_dts_bcam', 'dts_manual'],
  arousal: {
    title: 'Altered level of consciousness',
    help: 'Score the RASS. A RASS of 0 (normal level of consciousness) is negative; any RASS other than 0 makes the DTS positive.',
  },
  attention: {
    title: 'Inattention — spell "LUNCH" backwards',
    script: 'Say: “Can you spell the word LUNCH backwards?”',
    help: 'Tap each letter the patient misses (a missing letter is one error; two switched letters are two errors). Stop the task after a significant pause or perseveration on a letter (>15 seconds). Refusal or inability to start counts as positive.',
    items: ['H', 'C', 'N', 'U', 'L'], // the expected backwards sequence
    errorThreshold: 2, // ≥2 errors = inattention
  },
  verdicts: {
    negative:
      'DTS negative — delirium ruled out (98% sensitive). No further delirium testing needed now; rescreen with any change in mental status.',
    positive: 'DTS positive — not diagnostic. Confirm with the bCAM (highly specific rule-in).',
  },
};

/**
 * Brief Confusion Assessment Method — the <2-minute, highly specific rule-IN
 * (physician 84%/95.8%; non-physician 78%/96.9%; Han 2013). Positive =
 * Feature 1 AND Feature 2 AND (Feature 3 OR Feature 4). Inattention
 * (Feature 2) is the required cardinal feature.
 */
export const BCAM = {
  name: 'bCAM',
  fullName: 'Brief Confusion Assessment Method',
  cites: ['han2013_dts_bcam', 'bcam_manual'],
  features: [
    {
      id: 'f1',
      title: 'Feature 1 — Altered mental status or fluctuating course',
      type: 'judgment',
      help: 'Ask someone who knows the patient: “Has the patient been more confused to you lately?” Either an acute change from baseline OR fluctuation during the past 24 hours counts. If no baseline information is available and Features 2 and 3-or-4 are positive, it is safer to assume Feature 1 is positive.',
    },
    {
      id: 'f2',
      title: 'Feature 2 — Inattention (months backwards)',
      type: 'errors',
      script: 'Say: “Can you name the months backwards from December to July?”',
      help: 'Tap each month the patient misses (a missing month is one error; two switched months are two errors). Stop after a pause or perseveration of more than 15 seconds. Refusal or inability to start counts as positive.',
      items: ['Dec', 'Nov', 'Oct', 'Sep', 'Aug', 'Jul'], // the expected backwards sequence
      errorThreshold: 2, // >1 error = inattention present
    },
    {
      id: 'f3',
      title: 'Feature 3 — Altered level of consciousness',
      type: 'derived',
      help: 'Positive when the RASS is anything other than 0. (Carried over from the arousal assessment.)',
    },
    {
      id: 'f4',
      title: 'Feature 4 — Disorganized thinking',
      type: 'errors-any',
      help: 'Ask the four yes/no questions, then give the command. ANY error makes Feature 4 positive; incomprehensible sounds or no attempt to answer also count as positive. Alternate the question sets on consecutive days.',
      sets: {
        a: [
          'Will a stone float on water?',
          'Are there fish in the sea?',
          'Does one pound weigh more than two pounds?',
          'Can you use a hammer to pound a nail?',
        ],
        b: [
          'Will a leaf float on water?',
          'Are there elephants in the sea?',
          'Do two pounds weigh more than one pound?',
          'Can you use a hammer to cut wood?',
        ],
      },
      command:
        'Say: “Hold up this many fingers” (hold up two fingers), then “Now do the same thing with the other hand” (do not demonstrate). If the patient cannot move both arms, say “Add one more finger.”',
    },
  ],
  rule: 'bCAM positive = Feature 1 + Feature 2 + (Feature 3 or Feature 4)',
  verdicts: {
    positive: 'bCAM positive — delirium present.',
    negative: 'bCAM negative — delirium not detected by this assessment.',
  },
};

/**
 * 4AT v1.2 (MacLullich, Ryan, Cash — free to use). Four items, total 0–12;
 * items 1–3 are rated on observation at assessment, item 4 needs an
 * informant or records. No special training required.
 */
export const FOURAT = {
  name: '4AT',
  fullName: '4AT — Assessment Test for Delirium & Cognitive Impairment',
  cites: ['fourat_form', 'bellelli2014', 'shenkin2019', 'tieges2021'],
  items: [
    {
      id: 'alertness',
      title: '[1] Alertness',
      help: 'Includes patients who may be markedly drowsy (eg. difficult to rouse and/or obviously sleepy during assessment) or agitated/hyperactive. Observe the patient; if asleep, attempt to wake with speech or a gentle touch on the shoulder. Ask the patient to state their name and address to assist rating. Altered level of alertness is very likely to be delirium in general hospital settings.',
      options: [
        { v: 0, label: 'Normal (fully alert, but not agitated, throughout assessment)' },
        { v: 0, label: 'Mild sleepiness for <10 seconds after waking, then normal', key: 'mild' },
        { v: 4, label: 'Clearly abnormal' },
      ],
    },
    {
      id: 'amt4',
      title: '[2] AMT4',
      help: 'Ask: age, date of birth, place (name of the hospital or building), current year.',
      options: [
        { v: 0, label: 'No mistakes' },
        { v: 1, label: '1 mistake' },
        { v: 2, label: '2 or more mistakes / untestable' },
      ],
    },
    {
      id: 'attention',
      title: '[3] Attention — months backwards',
      help: 'Say: “Please tell me the months of the year in backwards order, starting at December.” One prompt of “What is the month before December?” is permitted.',
      options: [
        { v: 0, label: 'Achieves 7 months or more correctly' },
        { v: 1, label: 'Starts but scores <7 months / refuses to start' },
        { v: 2, label: 'Untestable (cannot start because unwell, drowsy, inattentive)' },
      ],
    },
    {
      id: 'change',
      title: '[4] Acute change or fluctuating course',
      help: 'Evidence of significant change or fluctuation in alertness, cognition, or other mental function (e.g. paranoia, hallucinations) arising over the last 2 weeks and still evident in the last 24 hours. Requires information from an informant, staff, or records.',
      options: [
        { v: 0, label: 'No' },
        { v: 4, label: 'Yes' },
      ],
    },
  ],
  bands: [
    { min: 4, label: '≥ 4: possible delirium ± cognitive impairment', verdict: 'positive' },
    { min: 1, label: '1–3: possible cognitive impairment', verdict: 'cognitive' },
    { min: 0, label: '0: delirium or severe cognitive impairment unlikely', verdict: 'negative' },
  ],
  notes: [
    'A score of 4 or more suggests delirium but is not diagnostic: a more detailed assessment of mental status may be required.',
    'A score of 1–3 suggests cognitive impairment — more detailed cognitive testing and informant history-taking are required.',
    'A score of 0 does not definitively exclude delirium, especially if the item-4 information is incomplete.',
    'Account for communication difficulties (hearing impairment, dysphasia, lack of common language) when rating.',
  ],
};

/** The two screening pathways the unit can default to. */
export const PATHWAYS = [
  {
    id: 'twostep',
    name: 'Two-step: DTS → bCAM',
    who: 'Vanderbilt / Geriatric ED Guidelines pathway',
    how: 'A <20-second, 98%-sensitive triage rule-out (DTS); positives get the <2-minute, highly specific bCAM to rule delirium in.',
    cites: ['han2013_dts_bcam', 'geda2014', 'ged2_2026'],
  },
  {
    id: 'bcam',
    name: 'bCAM directly',
    who: 'High-risk patients / skip the triage screen (ACEP ED-DEL option)',
    how: 'Go straight to the <2-minute, highly specific bCAM — the ED-DEL program\u2019s option when screening high-risk patients only (age 65+ or a dementia history).',
    cites: ['han2013_dts_bcam', 'eddel_toolkit'],
  },
  {
    id: 'fourat',
    name: '4AT',
    who: 'SIGN 157 pathway (ED); NICE CG103 recommends the 4AT hospital-wide',
    how: 'A single ~2-minute test scoring alertness, AMT4, attention, and acute change; no special training required; usable in most patients including many who are untestable on interview items.',
    cites: ['fourat_form', 'sign157', 'nice_cg103', 'ged2_2026'],
  },
];

/**
 * Act on a positive screen — ADEPT-aligned first moves (assess, diagnose,
 * evaluate, prevent, treat) with the ED-DEL program framing. A screen is not
 * a diagnosis: evaluate for causes and confirm clinically.
 */
export const ACT_POSITIVE = [
  {
    id: 'act-causes',
    head: 'Look for the cause — delirium is a symptom',
    items: [
      'Review medications first (new, changed, or deliriogenic drugs; anticholinergics, benzodiazepines, opioids) and consider withdrawal (alcohol, benzodiazepines).',
      'Screen for infection, hypoxia, hypoglycemia, metabolic derangement, and neurologic causes as clinically indicated.',
      'Check for pain, urinary retention, and constipation — common, reversible precipitants.',
    ],
    cites: ['adept2020', 'eddel_toolkit'],
  },
  {
    id: 'act-nonpharm',
    head: 'Non-pharmacologic management first',
    items: [
      'Reorient frequently; involve family or a sitter; keep glasses and hearing aids on.',
      'Minimize tethers (catheters, telemetry, restraints) and disruptions; mobilize when safe.',
      'Avoid new psychoactive medications where possible; treat pain adequately.',
    ],
    cites: ['adept2020', 'eddel_toolkit'],
  },
  {
    id: 'act-communicate',
    head: 'Document & communicate',
    items: [
      'Document the screen result, the suspected causes, and the interventions started.',
      'Hand the result off explicitly at disposition — delirium found in the ED changes inpatient management and follow-up.',
      'A positive screen in the ED independently predicts mortality — treat it as a finding that matters.',
    ],
    cites: ['han2010', 'eddel_toolkit'],
  },
];

/**
 * Example data for the "Load example data" button — a realistic
 * bCAM-positive presentation (drowsy, inattentive, disorganized).
 */
export const EXAMPLE_ASSESSMENT = {
  v: 1,
  tool: 'ed',
  pathway: 'twostep',
  rass: '-1',
  lunchTaps: [],
  lunchDone: false,
  lunchUnable: false,
  f1: 'yes',
  monthTaps: [0, 2, 4],
  monthDone: true,
  monthUnable: false,
  f4Set: 'a',
  f4: 'errors',
  fourat: { alertness: '4:2', amt4: '2:2', attention: '1:1', change: '4:1' },
  actions: [],
  assessor: 'A. Example, RN',
  notes: 'Example data — drowsy, inattentive, disorganized; onset this morning per family.',
};
