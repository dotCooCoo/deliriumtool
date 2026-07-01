/**
 * templates/data/content.js — content for the two printable bedside templates.
 *
 * Every clinical statement mirrors the interactive tool's cited content (the
 * ABCDEF bundle, the DELIRIUM(S) mnemonic, the treatment steps, and the RASS
 * wording), so the printed sheet and the on-screen tool cannot drift apart.
 * Citation keys resolve in ../../data/refs.js; the deliriogenic-medication
 * picker is driven by the shared registry in ../../data/meds.js. Sections
 * flagged `local: true` are unit-workflow defaults intended to be tailored to
 * the facility's own protocol; they carry process steps, not clinical values.
 * See docs/CLINICAL_METHODOLOGY.md for the content-to-source mapping.
 */

/** Template registry — id, display name, page orientation, page count. */
export const TEMPLATES = [
  {
    id: 'rounding',
    name: 'ICU Delirium Rounding Tool',
    desc: 'Per-patient checklist for multidisciplinary rounds — print landscape, laminate, mark with a dry-erase pen.',
    orientation: 'landscape',
    pages: 2,
    defaultTitle: 'ICU DELIRIUM ROUNDING TOOL',
    defaultSubtitle: 'Bedside nurse checklist for multidisciplinary rounds',
  },
  {
    id: 'spa',
    name: 'SPA Quick Reference',
    desc: 'Unit-level Sedation · Pain/Pharmacy · Activity poster with escalation steps — print portrait for adult ICU units.',
    orientation: 'portrait',
    pages: 2,
    defaultTitle: 'SPA Quick Reference — Delirium Prevention & Management',
    defaultSubtitle: 'High-impact, high-frequency actions for delirium prevention & management',
  },
];

/** RASS rows in the compact grouped form used on the printed sheets. */
export const RASS_ROWS = [
  { scores: ['+4', '+3'], label: '+4 / +3', desc: 'Combative / Very agitated' },
  { scores: ['+2', '+1'], label: '+2 / +1', desc: 'Agitated / Restless' },
  { scores: ['0'], label: '0', desc: 'Alert & calm' },
  { scores: ['-1'], label: '−1', desc: 'Drowsy' },
  { scores: ['-2'], label: '−2', desc: 'Light sedation' },
  { scores: ['-3'], label: '−3', desc: 'Moderate sedation' },
  { scores: ['-4', '-5'], label: '−4 / −5', desc: 'Deep sedation / Unarousable' },
];
export const RASS_CITES = ['sessler2002', 'ely2003'];

/** Selectable sedation targets — the same three bands the interactive tool offers. */
export const RASS_TARGETS = [
  { id: '0to-2', label: '0 to −2', scores: ['0', '-1', '-2'] },
  { id: '0to-1', label: '0 to −1', scores: ['0', '-1'] },
  {
    id: '-3to-4',
    label: '−3 to −4',
    scores: ['-3', '-4'],
    note: 'Deep sedation — documented indication required.',
  },
];

/** Top status strip of the rounding sheet (marked at the bedside). */
export const STATUS = {
  sedation: {
    cites: ['padis2018', 'padis2025', 'icudelirium_satsbt'],
    lines: ['Avoid deep sedation unless clinically required.', 'Daily SAT/SBT when feasible.'],
  },
  cam: {
    cites: ['camicu_worksheet', 'ely2001'],
    options: ['Positive — delirium present', 'Negative', 'Unable to assess (RASS −4/−5)'],
  },
  subtype: {
    cites: ['lacour2022', 'krewulak2018', 'hayhurst2020'],
    options: [
      'Hyperactive (agitated, RASS +1 to +4)',
      'Hypoactive (calm/lethargic, RASS 0 to −3)',
      'Mixed (fluctuates between both)',
    ],
  },
};

/**
 * DELIRIUM(S) causative-factor cells — same nine domains as the tool's
 * DELIRIUM(S) tab, with the notes shortened to bedside-card length.
 */
export const MNEMONIC = {
  cites: ['icudelirium_mnemonics', 'flaherty2011', 'maldonado2018'],
  cells: [
    {
      id: 'mn-d',
      ltr: 'D',
      word: 'Drugs / Withdrawal',
      tone: 'red',
      note: 'Deliriogenic agents? Dose reduction? Alcohol / benzo / opioid withdrawal — check last use & home meds.',
    },
    {
      id: 'mn-e',
      ltr: 'E',
      word: 'Eyes / Ears / Env',
      tone: 'rust',
      note: 'Glasses & hearing aids in? Whiteboard updated? Lights on daytime?',
    },
    {
      id: 'mn-l',
      ltr: 'L',
      word: 'Low O₂ / Liver',
      tone: 'teal',
      note: 'Check SpO₂, Hgb, cardiac/PE events, liver function.',
    },
    {
      id: 'mn-i1',
      ltr: 'I',
      word: 'Infection',
      tone: 'plum',
      note: 'Fever, leukocytosis, cultures pending? Occult sepsis?',
    },
    {
      id: 'mn-r',
      ltr: 'R',
      word: 'Retention',
      tone: 'slate',
      note: 'Urinary retention or constipation? Bladder scan; treat if indicated.',
    },
    {
      id: 'mn-i2',
      ltr: 'I',
      word: 'Ictal / Seizure',
      tone: 'green',
      note: 'Consider non-convulsive seizures — especially unexplained ↓LOC. Consider EEG.',
    },
    {
      id: 'mn-u',
      ltr: 'U',
      word: 'Under-hydration / Nutrition',
      tone: 'rust',
      note: 'Volume status, intake, electrolytes. Thiamine before glucose in at-risk patients.',
    },
    {
      id: 'mn-m',
      ltr: 'M',
      word: 'Metabolic',
      tone: 'teal',
      note: 'Na, Mg, Ca, glucose, BUN/Cr, acid–base. Pain / retention / constipation?',
    },
    {
      id: 'mn-s',
      ltr: '(S)',
      word: 'Subdural / Sleep',
      tone: 'plum',
      note: 'Subdural hematoma (fall or anticoagulation)? Sleep deprivation?',
    },
  ],
};

/**
 * Non-pharmacologic bundle groups — the tool's ABCDEF + sleep/orientation
 * items arranged into the six bedside categories used on the printed card.
 */
export const NONPHARM = {
  cites: ['sccm_abcdef', 'pun2019', 'marra2017', 'padis2018', 'inouye1999', 'hshieh2015'],
  groups: [
    {
      id: 'np-reorient',
      head: 'Reorientation',
      tone: 'green',
      icon: 'clock',
      items: [
        { id: 'np-clock', text: 'Clock and calendar visible' },
        { id: 'np-board', text: 'Whiteboard updated (date, team, goals)' },
        { id: 'np-verbal', text: 'Verbal reorientation each encounter' },
        { id: 'np-famvoice', text: 'Family / familiar voice involvement' },
      ],
    },
    {
      id: 'np-sensory',
      head: 'Sensory',
      tone: 'teal',
      icon: 'eye',
      items: [
        { id: 'np-glasses', text: 'Glasses in place' },
        { id: 'np-hearing', text: 'Hearing aids in place' },
        { id: 'np-language', text: 'Language barrier addressed' },
        { id: 'np-noise', text: 'Noise sources minimized' },
      ],
    },
    {
      id: 'np-sleep',
      head: 'Sleep',
      tone: 'plum',
      icon: 'moon',
      items: [
        { id: 'np-night', text: 'Nighttime light/noise reduced (quiet hours)' },
        { id: 'np-mask', text: 'Eye mask & earplugs offered' },
        { id: 'np-cluster', text: 'Care clustered to protect sleep' },
        { id: 'np-nap', text: 'Long daytime napping avoided' },
      ],
    },
    {
      id: 'np-mobility',
      head: 'Mobility',
      tone: 'rust',
      icon: 'person-walking',
      items: [
        { id: 'np-pt', text: 'Early mobility / PT–OT performed' },
        { id: 'np-hob', text: 'HOB elevated where able' },
        { id: 'np-restraints', text: 'Restraints removed or minimized' },
        { id: 'np-lines', text: 'Unneeded lines / catheters removed' },
      ],
    },
    {
      id: 'np-hydration',
      head: 'Hydration & Nutrition',
      tone: 'slate',
      icon: 'utensils',
      items: [
        { id: 'np-fluids', text: 'Adequate fluids / nutrition reviewed' },
        { id: 'np-bowel', text: 'Bowel & bladder care addressed' },
        { id: 'np-fasting', text: 'Prolonged fasting avoided' },
        { id: 'np-oral', text: 'Oral care completed' },
      ],
    },
    {
      id: 'np-engage',
      head: 'Engagement',
      tone: 'green',
      icon: 'users',
      items: [
        { id: 'np-cognitive', text: 'Cognitive stimulation offered' },
        { id: 'np-music', text: 'Preferred music / familiar media' },
        { id: 'np-family', text: 'Family present or contacted' },
        { id: 'np-tada', text: 'T-A-D-A used (Tolerate, Anticipate, Don’t Agitate)' },
      ],
    },
  ],
};

/**
 * Pharmacologic considerations — the tool's Step-3 guidance in bedside form.
 * Dose figures print only when "example starting doses" is enabled; the
 * default defers to the local order set.
 */
export const PHARM = {
  cites: ['padis2025', 'mindusa2018', 'haldol_label', 'mends2', 'padis2018'],
  lead: 'Reserve for severe distress or imminent safety risk only',
  leadNote:
    'Antipsychotics do not treat or shorten delirium — medication does not treat the underlying cause.',
  rows: [
    {
      id: 'ph-haldol',
      drug: 'Haloperidol',
      text: 'Per local order set · baseline EKG, monitor QTc (caution > 500 ms) · avoid in Parkinson / Lewy body disease · IV route off-label',
      dose: '0.25–0.5 mg q4–6h PRN',
    },
    {
      id: 'ph-quetiapine',
      drug: 'Quetiapine',
      text: 'PO per local order set · lowest dose, shortest duration · monitor QTc & orthostasis',
      dose: '12.5–25 mg q12h PO',
    },
    {
      id: 'ph-dexmed',
      drug: 'Dexmedetomidine',
      text: 'Ventilated patients when agitation prevents weaning · monitor bradycardia / hypotension',
      dose: '0.2–0.7 mcg/kg/hr',
    },
    {
      id: 'ph-benzo',
      drug: 'Benzodiazepines',
      warn: true,
      text: 'Alcohol / benzo withdrawal only — may worsen delirium',
    },
  ],
  cautions: [
    {
      id: 'ph-discharge',
      text: 'No antipsychotics at discharge without a psychiatric indication.',
      stop: true,
    },
    {
      id: 'ph-abrupt',
      text: 'Do NOT stop abruptly: benzos · opioids · SSRIs · steroids · antiepileptics · dexmedetomidine.',
    },
  ],
  doseNote:
    'Example starting doses from the literature — follow local order sets and prescriber/pharmacy review.',
};

/** Heading + citations for the deliriogenic-medication grid (list = data/meds.js). */
export const MEDS_SECTION = {
  head: 'Deliriogenic medications — review & limit',
  cites: ['beers2023', 'padis2018', 'acb_boustani'],
};

/** Sheet tone per medication category — one distinct colour block each. */
export const MED_TONES = {
  benzo: 'red',
  opioids: 'rust',
  antichol: 'plum',
  sedatives: 'navy',
  antipsych: 'violet',
  antidep: 'berry',
  antimicro: 'teal',
  cardiac: 'slate',
  steroids: 'green',
  gi: 'azure',
  other: 'olive',
};

/** Categories that print a warning marker (antipsychotics: also a Step-3
 *  treatment option — the deliriogenic entries are the high-dose / typical
 *  agents, see the Step-3 cautions). */
export const MED_WARN = ['antipsych'];

/** RASS zone tone per row (agitation warm, targets green, sedation cool). */
export const RASS_ZONES = {
  '+4': 'red',
  '+3': 'red',
  '+2': 'rust',
  '+1': 'rust',
  0: 'ink',
  '-1': 'ink',
  '-2': 'ink',
  '-3': 'slate',
  '-4': 'slate',
  '-5': 'slate',
};

/**
 * Nurse care pathway — unit workflow (process steps, not clinical values).
 * `local: true`: these defaults are meant to be edited to the local protocol.
 */
export const PATHWAY = {
  local: true,
  head: 'Nurse care pathway — report each step status during rounds',
  cols: [
    {
      id: 'pw-deter',
      head: '1 · Deter',
      tone: 'teal',
      items: [
        { id: 'pw-nodrugs', text: 'No deliriogenic drugs added today' },
        { id: 'pw-noabrupt', text: 'No abrupt medication discontinuation' },
        { id: 'pw-devices', text: 'Devices / lines limited to essential' },
        { id: 'pw-bundle', text: 'Prevention bundle applied' },
      ],
    },
    {
      id: 'pw-detect',
      head: '2 · Detect',
      tone: 'plum',
      items: [
        { id: 'pw-cam', text: 'CAM-ICU completed this shift' },
        { id: 'pw-rass', text: 'RASS documented' },
        { id: 'pw-baseline', text: 'Baseline mental status known' },
        { id: 'pw-notify', text: 'Provider notified if first positive CAM' },
      ],
    },
    {
      id: 'pw-do',
      head: '3 · Do (acute)',
      tone: 'rust',
      items: [
        { id: 'pw-falls', text: 'Fall prevention active' },
        { id: 'pw-disguise', text: 'Devices removed or disguised' },
        { id: 'pw-teach', text: 'Family teaching done' },
        { id: 'pw-tada', text: 'T-A-D-A approach applied' },
        { id: 'pw-plan', text: 'Plan individualized in the EHR' },
        { id: 'pw-handoff', text: 'Nurse–assistant handoff completed' },
      ],
    },
    {
      id: 'pw-daily',
      head: '4–6 · Daily care',
      tone: 'green',
      items: [
        { id: 'pw-freq', text: 'CAM-ICU per unit frequency + PRN' },
        { id: 'pw-comfort', text: 'Comfort / calm / consistent' },
        { id: 'pw-toilet', text: 'Toileting completed' },
        { id: 'pw-nutrition', text: 'Adequate nutrition & hydration' },
        { id: 'pw-sleepwake', text: 'Sleep–wake cycle maintained' },
        { id: 'pw-medresponse', text: 'Med response assessed & documented' },
      ],
    },
    {
      id: 'pw-dc',
      head: '7 · Discharge',
      tone: 'slate',
      items: [
        { id: 'pw-course', text: 'Delirium course & cause documented' },
        { id: 'pw-psychstop', text: 'Unnecessary psychotropics stopped' },
        { id: 'pw-strategies', text: 'Successful strategies documented' },
        { id: 'pw-followup', text: 'Follow-up arranged if not resolved' },
        { id: 'pw-educated', text: 'Family & patient educated' },
      ],
    },
  ],
};

/** SPA columns — page 1 action cards. */
export const SPA_COLS = [
  {
    id: 'spa-s',
    ltr: 'S',
    word: 'Sedation',
    tone: 'teal',
    icon: 'gauge-high',
    tagline: 'Lightest, non-deliriogenic, targeted',
    cites: ['padis2018', 'padis2025', 'mends2', 'icudelirium_satsbt'],
    items: [
      {
        id: 's-target',
        head: 'Set a RASS goal every shift',
        desc: 'Target the lightest RASS that meets the clinical goal; avoid deep sedation (−3 or lower) unless required.',
      },
      {
        id: 's-lightest',
        head: 'Lightest sedative possible',
        desc: 'Prefer dexmedetomidine or propofol over benzodiazepines — benzodiazepines increase delirium risk.',
      },
      {
        id: 's-bolus',
        head: 'Bolus over continuous',
        desc: 'When safe, consider intermittent dosing rather than continuous infusions.',
      },
      {
        id: 's-satsbt',
        head: 'Daily SAT / SBT',
        desc: 'Awakening + breathing trial daily when feasible; coordinate with respiratory therapy.',
      },
      {
        id: 's-screen',
        head: 'CAM-ICU & RASS each shift',
        desc: 'Document RASS; complete the CAM-ICU once per shift and with any mental-status change.',
      },
    ],
  },
  {
    id: 'spa-p',
    ltr: 'P',
    word: 'Pain / Pharmacy',
    tone: 'rust',
    icon: 'pills',
    tagline: 'Multimodal, review meds daily',
    cites: ['padis2018', 'beers2023', 'promedic2022', 'melatonin_meta2025'],
    items: [
      {
        id: 'p-multimodal',
        head: 'Multimodal pain management',
        desc: 'Analgesia first — scheduled acetaminophen, NSAIDs where appropriate, regional techniques to limit opioids.',
      },
      {
        id: 'p-review',
        head: 'Review medications daily',
        desc: 'Can any deliriogenic drug be stopped or reduced? Benzodiazepines, anticholinergics, steroids.',
      },
      {
        id: 'p-painfirst',
        head: 'Treat pain before sedation',
        desc: 'Uncontrolled pain drives agitation — assess and treat pain first.',
      },
      {
        id: 'p-meperidine',
        head: 'Avoid meperidine',
        desc: 'Highest delirium risk of the opioids — avoid in at-risk patients.',
      },
      {
        id: 'p-melatonin',
        head: 'Melatonin — evidence mixed',
        desc: 'May support sleep; delirium-prevention evidence is low-certainty. Follow local practice.',
      },
    ],
  },
  {
    id: 'spa-a',
    ltr: 'A',
    word: 'Activity / Awareness',
    tone: 'green',
    icon: 'person-walking',
    tagline: 'Mobilize, remove devices, orient',
    cites: ['sccm_abcdef', 'hodgson2014', 'icudelirium_mobility', 'hshieh2015', 'inouye1999'],
    items: [
      {
        id: 'a-mobilize',
        head: 'Mobilize — remove barriers',
        desc: 'Get the patient up; discontinue catheters, lines, and restraints when safe.',
      },
      {
        id: 'a-ptot',
        head: 'PT / OT consult early',
        desc: 'Involve PT & OT at admission for at-risk ICU patients — earlier is better.',
      },
      {
        id: 'a-sensory',
        head: 'Glasses, hearing aids, orient',
        desc: 'Sensory deprivation is reversible; update the orientation board every shift.',
      },
      {
        id: 'a-family',
        head: 'Engage family & caregivers',
        desc: 'Familiar faces reorient; teach T-A-D-A (Tolerate, Anticipate, Don’t Agitate).',
      },
      {
        id: 'a-sleep',
        head: 'Protect sleep — day / night',
        desc: 'Dim lights per quiet-hours protocol, cluster cares, offer eye masks and earplugs.',
      },
    ],
  },
];

/** SPA page 2 — deeper guidance bullets per column. */
export const SPA_DEEPER = {
  cites: ['padis2025', 'mends2', 'haldol_label', 'hodgson2014', 'icudelirium_mobility'],
  cols: [
    {
      id: 'dp-s',
      head: 'S — Sedation',
      tone: 'teal',
      items: [
        {
          id: 'dp-s-dexmed',
          text: 'Dexmedetomidine preferred in ventilated patients — reduces delirium vs benzodiazepines; monitor bradycardia / hypotension.',
        },
        { id: 'dp-s-propofol', text: 'Propofol acceptable short-term; reassess need daily.' },
        { id: 'dp-s-benzo', text: 'Avoid midazolam / lorazepam for routine sedation.' },
        {
          id: 'dp-s-withdrawal',
          text: 'Exception: benzodiazepines are first-line for alcohol / benzodiazepine withdrawal.',
        },
      ],
    },
    {
      id: 'dp-p',
      head: 'P — Pain / Pharmacy',
      tone: 'rust',
      items: [
        {
          id: 'dp-p-haldol',
          text: 'Haloperidol {haldolDose}for hyperactive delirium with safety risk — baseline EKG, monitor QTc; avoid in Parkinson / Lewy body disease.',
        },
        {
          id: 'dp-p-quetiapine',
          text: 'Quetiapine {quetiapineDose}when the oral route is available — monitor QTc and orthostasis.',
        },
        { id: 'dp-p-apap', text: 'Scheduled acetaminophen as an opioid-sparing adjunct.' },
        {
          id: 'dp-p-consult',
          text: 'Pharmacy consult for CAM-positive patients or a high sedative burden.',
        },
        {
          id: 'dp-p-workup',
          text: 'Check electrolytes; evaluate for infection / occult sepsis in new delirium.',
        },
      ],
    },
    {
      id: 'dp-a',
      head: 'A — Activity / Awareness',
      tone: 'green',
      items: [
        {
          id: 'dp-a-devices',
          text: 'Every device is a barrier to mobility — remove urinary catheters early; least-restrictive restraints.',
        },
        {
          id: 'dp-a-progression',
          text: 'Mobility progression: passive ROM → active ROM → sit / edge of bed → stand / transfer → ambulate.',
        },
        { id: 'dp-a-tada', text: 'T-A-D-A: Tolerate, Anticipate triggers, Don’t Agitate.' },
        {
          id: 'dp-a-orient',
          text: 'Orientation board updated each shift; protect sleep; cluster cares.',
        },
      ],
    },
  ],
};

/** SPA page 2 — escalation ladder. */
export const ESCALATION = {
  head: 'Escalation — when to act & how',
  cites: ['padis2025', 'nice_cg103', 'projectbeta'],
  stages: [
    {
      id: 'esc-1',
      head: '1 · All patients',
      tone: 'teal',
      items: [
        { id: 'esc-apply', text: 'Apply S·P·A on admission' },
        { id: 'esc-screen', text: 'CAM-ICU + RASS each shift' },
        { id: 'esc-medreview', text: 'Medication review' },
      ],
    },
    {
      id: 'esc-2',
      head: '2 · CAM positive',
      tone: 'rust',
      items: [
        { id: 'esc-notify', text: 'Notify provider; document' },
        { id: 'esc-intensify', text: 'Intensify S·P·A measures' },
        { id: 'esc-causes', text: 'Treat reversible causes' },
      ],
    },
    {
      id: 'esc-3',
      head: '3 · Persistent > 1 shift',
      tone: 'green',
      items: [
        { id: 'esc-sitter', text: '1:1 sitter; family presence' },
        { id: 'esc-consult', text: 'Geriatrics / psychiatry consult' },
        { id: 'esc-sedation', text: 'Reassess sedation strategy' },
      ],
    },
    {
      id: 'esc-4',
      head: '4 · Safety risk only',
      tone: 'ink',
      items: [
        { id: 'esc-document', text: 'Document the indication first' },
        { id: 'esc-lowest', text: 'Lowest dose, shortest duration; monitor QTc' },
        { id: 'esc-taper', text: 'Taper / stop; none at discharge without psych indication' },
      ],
    },
  ],
};

/**
 * Designer sections per template — drives the "Sections" controls and which
 * blocks render. Fixed sections (status strip, headers) are not listed; they
 * always print.
 */
export const SECTIONS = {
  rounding: [
    { id: 'sec-mnemonic', label: 'Causative factors — DELIRIUM(S)', page: 1 },
    { id: 'sec-nonpharm', label: 'Non-pharmacologic bundle', page: 1 },
    { id: 'sec-notes', label: 'Rounds notes line', page: 1 },
    { id: 'sec-pharm', label: 'Pharmacologic considerations', page: 2 },
    { id: 'sec-meds', label: 'Deliriogenic medications', page: 2 },
    { id: 'sec-pathway', label: 'Nurse care pathway', page: 2, local: true },
  ],
  spa: [
    { id: 'sec-spa-cols', label: 'S · P · A action cards', page: 1 },
    { id: 'sec-rass', label: 'RASS table + sedation goal', page: 1 },
    { id: 'sec-deeper', label: 'Deeper guidance', page: 2 },
    { id: 'sec-meds', label: 'Deliriogenic medications', page: 2 },
    { id: 'sec-escalation', label: 'Escalation ladder', page: 2 },
  ],
};

/** Footer source-line citation keys, per template (labels resolve in refs.js). */
export const FOOTER_CITES = {
  rounding: ['padis2018', 'padis2025', 'sccm_abcdef', 'camicu_worksheet', 'beers2023'],
  spa: ['padis2018', 'padis2025', 'sccm_abcdef', 'beers2023', 'nice_cg103'],
};

/** The disclaimer printed on every sheet (load-bearing — keep verbatim). */
export const SHEET_DISCLAIMER =
  'Reference aid only — follow local policy & prescriber/pharmacy review';
