/**
 * data/cam.js — pCAM-ICU and psCAM-ICU. Same hierarchical algorithm
 * (Feature 1 AND Feature 2 AND (Feature 3 OR Feature 4)), but Features 2 and 4
 * are performed tasks scored by error count, not a single yes/no. Each feature
 * declares a `type` the screen renders and scores:
 *   judgment — a clinician yes/no (acute change, altered level of consciousness)
 *   errors   — a task whose items are marked right/wrong; present at ≥ threshold
 *   compound — psCAM disorganized brain: sleep–wake OR (unaware AND inconsolable)
 * Tasks and sources: docs/CLINICAL_METHODOLOGY.md.
 */

// pCAM-ICU — developmental age ≥ 5 yr (interactive / verbal tasks)
export const PCAM = {
  tool: 'pCAM-ICU',
  features: [
    {
      id: 'f1',
      type: 'judgment',
      title: 'Feature 1 — Acute change or fluctuating mental status',
      help: 'Acute change from the mental-status baseline, OR fluctuation over the past 24 h.',
    },
    {
      id: 'f2',
      type: 'errors',
      threshold: 3,
      title: 'Feature 2 — Inattention',
      task: 'Read the letters aloud, about one per second. The child squeezes your hand on every “A”. Tap each miss — a squeeze on a non-A, or a failure to squeeze on an A. (Alternative for children who cannot squeeze: the memory-pictures version — show 5 pictures to memorize, then 10 yes/no recognition pictures; same ≥ 3-error cut.)',
      items: ['A', 'B', 'A', 'D', 'B', 'A', 'D', 'A', 'A', 'Y'],
      itemKind: 'letter',
      verdict: '≥ 3 errors → inattention present',
    },
    {
      id: 'f3',
      type: 'judgment',
      title: 'Feature 3 — Altered level of consciousness',
      help: 'Anything other than alert and calm.',
    },
    {
      id: 'f4',
      type: 'errors',
      threshold: 2,
      title: 'Feature 4 — Disorganized thinking',
      task: 'Ask each question (alternate set: Is a rock hard? / Do rabbits fly? / Is ice cream cold? / Is a giraffe smaller than a mouse?); tap each wrong answer. Then give the 2-step command and tap it if not completed.',
      items: [
        'Is sugar sweet?',
        'Is ice cream hot?',
        'Do birds fly?',
        'Is an ant bigger than an elephant?',
        '2-step command: “hold up this many fingers” (show 2), then “now do that with the other hand” — do not repeat the number of fingers; if the child cannot use both hands, ask them to “add one more finger.”',
      ],
      itemKind: 'prompt',
      verdict: '≥ 2 errors → disorganized thinking present',
    },
  ],
};

// psCAM-ICU — developmental age 6 mo – 5 yr (observational tasks)
export const PSCAM = {
  tool: 'psCAM-ICU',
  features: [
    {
      id: 'f1',
      type: 'judgment',
      title: 'Feature 1 — Acute change or fluctuating mental status',
      help: 'Acute change from baseline, OR fluctuation over the past 24 h.',
    },
    {
      id: 'f2',
      type: 'errors',
      threshold: 3,
      title: 'Feature 2 — Inattention',
      task: 'Move a picture, mirror, or favorite toy side-to-side across the child’s face, ten times, talking to the child throughout as ongoing stimulation. Tap each presentation the child does NOT make eye contact with.',
      items: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      itemKind: 'count',
      // Second validated positivity path (Smith 2016 Fig. 2 / worksheet criterion 2):
      // eye contact on 8+ presentations still scores present if the child cannot
      // keep their eyes open without continual verbal prompting.
      alt: {
        id: 'eyeOpen',
        label:
          'Eye contact on 8+ presentations BUT unable to maintain sustained eye opening for at least half the assessment despite verbal prompts',
      },
      verdict:
        '≥ 3 presentations with no eye contact, OR unable to maintain eye opening despite prompts → inattention present',
    },
    {
      id: 'f3',
      type: 'judgment',
      title: 'Feature 3 — Altered level of consciousness',
      help: 'Anything other than alert and calm.',
    },
    {
      id: 'f4',
      type: 'compound',
      title: 'Feature 4 — Disorganized brain',
      help: 'Present if EITHER a sleep–wake disturbance, OR (unawareness AND inconsolability).',
      parts: [
        {
          id: 'swc',
          label:
            'Sleep–wake disturbance (sleeps by day / little at night / hard to settle or wake)',
        },
        { id: 'unaware', label: 'Unaware of surroundings or caregiver' },
        { id: 'inconsolable', label: 'Inconsolable' },
      ],
      verdict: 'Sleep–wake disturbance, OR (unaware AND inconsolable) → present',
    },
  ],
};

export const CAM_BY_SCREEN = { pcam: PCAM, pscam: PSCAM };
