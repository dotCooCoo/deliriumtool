/**
 * data/cam.js — pCAM-ICU and psCAM-ICU. Same hierarchical algorithm
 * (Feature 1 AND Feature 2 AND (Feature 3 OR Feature 4)); the attention/cognition
 * tasks differ by developmental age — pCAM is interactive/verbal, psCAM is
 * observational. Tasks and sources: docs/CLINICAL_METHODOLOGY.md.
 */

export const CAM_RULE = 'Delirium = Feature 1 AND Feature 2 AND (Feature 3 OR Feature 4)';

// pCAM-ICU — developmental age ≥ 5 yr (interactive/verbal tasks)
export const PCAM = {
  tool: 'pCAM-ICU',
  ageNote: 'developmental age ≥ 5 yr',
  features: [
    {
      id: 'f1',
      title: 'Feature 1 — Acute change or fluctuating mental status',
      help: 'Acute change from the mental-status baseline, OR fluctuation over the past 24 h.',
    },
    {
      id: 'f2',
      title: 'Feature 2 — Inattention',
      help: 'Vigilance-A: read “A B A D B A D A A Y”, child squeezes on every A — or Memory Pictures (show 5, then 5 + 5). Positive at ≥ 3 errors.',
    },
    {
      id: 'f3',
      title: 'Feature 3 — Altered level of consciousness',
      help: 'Anything other than alert and calm (any validated sedation scale).',
    },
    {
      id: 'f4',
      title: 'Feature 4 — Disorganized thinking',
      help: 'Yes/no questions (Is sugar sweet? Is ice cream hot? Do birds fly? Is an ant bigger than an elephant?) + a 2-step finger command. Positive at ≥ 2 errors.',
    },
  ],
};

// psCAM-ICU — developmental age 6 mo – 5 yr (observational tasks)
export const PSCAM = {
  tool: 'psCAM-ICU',
  ageNote: 'developmental age 6 mo – 5 yr',
  features: [
    {
      id: 'f1',
      title: 'Feature 1 — Acute change or fluctuating mental status',
      help: 'Acute change from baseline, OR fluctuation over the past 24 h.',
    },
    {
      id: 'f2',
      title: 'Feature 2 — Inattention (observational)',
      help: 'Move a series of 10 pictures / mirror / favorite toy side-to-side across the face. Inattention if the child LACKS eye contact to ≥ 3 of 10 — or, if eye contact to ≥ 8, cannot sustain eye-opening through ≥ 5.',
    },
    {
      id: 'f3',
      title: 'Feature 3 — Altered level of consciousness',
      help: 'Anything other than alert and calm.',
    },
    {
      id: 'f4',
      title: 'Feature 4 — Disorganized brain (observational)',
      help: 'Either a sleep–wake cycle disturbance (sleeps by day / little at night / hard to settle / hard to wake), OR unawareness AND inconsolability.',
    },
  ],
};

export const CAM_BY_SCREEN = { pcam: PCAM, pscam: PSCAM };
