/**
 * data/capd.js — Cornell Assessment of Pediatric Delirium (CAPD): the 8 items,
 * their scoring direction, and the developmental anchor points. Anchors are shown
 * inline, one age band per child: items 1–4 (reverse-scored) describe age-expected
 * behavior; items 5–8 (normal-scored) describe the concerning pattern per age.
 * Thresholds and sources: docs/CLINICAL_METHODOLOGY.md.
 */

export const CAPD_POSITIVE = 9; // total 0–32; ≥ 9 = positive
export const CAPD_FREQ = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];

// Surfaced at the result when baseline developmental delay is flagged.
export const CAPD_DEV_DELAY_NOTE =
  'In developmental delay, specificity at ≥ 9 falls; interpret against the child’s own baseline.';

// Developmental-age bands for the anchor table. The dev-age → band cut points are
// pragmatic (for showing the right inline hint) and do not change any score.
export const CAPD_BANDS = [
  { id: 'nb', label: 'Newborn', maxMonths: 1 },
  { id: '4wk', label: '4 weeks', maxMonths: 1.5 },
  { id: '6wk', label: '6 weeks', maxMonths: 2 },
  { id: '8wk', label: '8 weeks', maxMonths: 7 },
  { id: '28wk', label: '28 weeks', maxMonths: 12 },
  { id: '1yr', label: '1 year', maxMonths: 24 },
  { id: '2yr', label: '2 years+', maxMonths: Infinity },
];

/** Map a developmental age in months to its anchor band id (null if unknown). */
export function capdBand(devAgeMonths) {
  if (devAgeMonths == null || devAgeMonths === '') return null;
  const m = Number(devAgeMonths);
  if (!Number.isFinite(m) || m < 0) return null;
  return (CAPD_BANDS.find((b) => m < b.maxMonths) || CAPD_BANDS[CAPD_BANDS.length - 1]).id;
}

export const CAPD_ITEMS = [
  {
    id: 'eye',
    n: 1,
    text: 'Does the child make eye contact with the caregiver?',
    reverse: true,
    anchors: {
      nb: 'Fixates on a face',
      '4wk': 'Holds gaze briefly; follows ~90°',
      '6wk': 'Holds gaze',
      '8wk': 'Follows object past midline; focused attention',
      '28wk': 'Holds gaze; prefers primary parent; looks at speaker',
      '1yr': 'Holds gaze; prefers primary parent; looks at speaker',
      '2yr': 'Holds gaze; prefers primary parent; looks at speaker',
    },
  },
  {
    id: 'purpose',
    n: 2,
    text: "Are the child's actions purposeful?",
    reverse: true,
    anchors: {
      nb: 'Moves head side to side, dominated by primitive reflexes',
      '4wk': 'Reaches (with some discoordination)',
      '6wk': 'Reaches',
      '8wk': 'Symmetric movements; passively grasps a handed object',
      '28wk': 'Reaches with coordinated, smooth movement',
      '1yr': 'Reaches and manipulates objects; changes position; if mobile may try to get up',
      '2yr': 'Reaches and manipulates objects; if mobile may try to get up and walk',
    },
  },
  {
    id: 'aware',
    n: 3,
    text: 'Is the child aware of his/her surroundings?',
    reverse: true,
    anchors: {
      nb: 'Calm awake time',
      '4wk': "Awake-alert time; turns to caretaker's voice",
      '6wk': "Increasing awake-alert time; turns to caretaker's voice",
      '8wk': 'Facial brightening or smile in response; coos',
      '28wk': 'Strongly prefers mother/familiars; differentiates novel vs familiar objects',
      '1yr': 'Prefers familiars; upset when separated; comforted by a favorite object',
      '2yr': 'Prefers familiars; upset when separated; comforted by a favorite object',
    },
  },
  {
    id: 'comm',
    n: 4,
    text: 'Does the child communicate needs and wants?',
    reverse: true,
    anchors: {
      nb: 'Cries when hungry or uncomfortable',
      '4wk': 'Cries when hungry or uncomfortable',
      '6wk': 'Cries when hungry or uncomfortable',
      '8wk': 'Cries when hungry or uncomfortable',
      '28wk': 'Vocalizes/indicates about needs (hunger, discomfort, curiosity)',
      '1yr': 'Uses single words or signs',
      '2yr': '3–4 word sentences or signs; may indicate toilet needs',
    },
  },
  {
    id: 'restless',
    n: 5,
    text: 'Is the child restless?',
    reverse: false,
    anchors: {
      nb: 'No sustained awake-alert state',
      '4wk': 'No sustained calm state',
      '6wk': 'No sustained calm state',
      '8wk': 'No sustained calm state',
      '28wk': 'No sustained calm state',
      '1yr': 'No sustained calm state',
      '2yr': 'No sustained calm state',
    },
  },
  {
    id: 'inconsolable',
    n: 6,
    text: 'Is the child inconsolable?',
    reverse: false,
    anchors: {
      nb: 'Not soothed by rocking, singing, feeding, comforting',
      '4wk': 'Not soothed by rocking, singing, feeding, comforting',
      '6wk': 'Not soothed by rocking, singing, feeding, comforting',
      '8wk': 'Not soothed by rocking, singing, comforting',
      '28wk': 'Not soothed by usual methods (singing, holding, talking)',
      '1yr': 'Not soothed by usual methods (singing, holding, talking, reading)',
      '2yr': 'Not soothed by usual methods (may tantrum but can organize)',
    },
  },
  {
    id: 'underactive',
    n: 7,
    text: 'Is the child underactive — very little movement while awake?',
    reverse: false,
    anchors: {
      nb: 'Little if any flexed-then-relaxed movement (should be sleeping comfortably most of the time)',
      '4wk': 'Little if any reaching, kicking, grasping (still discoordinated)',
      '6wk': 'Little if any reaching, kicking, grasping (beginning to coordinate)',
      '8wk': 'Little if any purposive grasping; head/arm control',
      '28wk': 'Little if any reaching, grasping, moving in bed',
      '1yr': 'Little if any play; efforts to sit/pull up; if mobile, crawl/walk',
      '2yr': 'Little if any elaborate play; if able, stand/walk/jump',
    },
  },
  {
    id: 'slow',
    n: 8,
    text: 'Does it take the child a long time to respond to interactions?',
    reverse: false,
    anchors: {
      nb: 'Not making sounds; reflexes not active as expected (grasp, suck, Moro)',
      '4wk': 'Not making sounds; reflexes not active as expected',
      '6wk': 'Not kicking or crying with noxious stimuli',
      '8wk': 'Not cooing, smiling, or focusing gaze in response',
      '28wk': 'Not babbling or smiling/laughing in social interactions',
      '1yr': 'Not following simple directions; if verbal, not engaging in simple dialogue',
      '2yr': 'Not following 1–2 step commands; if verbal, not engaging in complex dialogue',
    },
  },
];
