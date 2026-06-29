/**
 * data/arousal.js — the arousal scales that gate the screen. RASS for older /
 * verbal children; SBS (State Behavioral Scale) for intubated infants and young
 * children. The comatose floor of each scale puts the screen in "unable to
 * assess". SBS↔RASS is not a validated 1:1 — each is gated on its own floor.
 * Levels and sources: docs/CLINICAL_METHODOLOGY.md.
 */

export const RASS_LEVELS = [
  { v: '+4', label: 'Combative' },
  { v: '+3', label: 'Very agitated' },
  { v: '+2', label: 'Agitated' },
  { v: '+1', label: 'Restless' },
  { v: '0', label: 'Alert & calm' },
  { v: '-1', label: 'Drowsy' },
  { v: '-2', label: 'Light sedation' },
  { v: '-3', label: 'Moderate sedation' },
  { v: '-4', label: 'Deep sedation' },
  { v: '-5', label: 'Unarousable' },
];

export const SBS_LEVELS = [
  {
    v: '+2',
    label: 'Agitated',
    marker: 'Unsafe (biting ETT, pulling lines); cannot console; thrashing',
  },
  {
    v: '+1',
    label: 'Restless & difficult to calm',
    marker: 'Does not consistently calm despite a 5-min attempt',
  },
  {
    v: '0',
    label: 'Awake & able to calm',
    marker: 'Responds to voice without external stimulus; calms with comfort',
  },
  {
    v: '-1',
    label: 'Responsive to gentle touch or voice',
    marker: 'Attends but drifts off; calms when stimulus removed',
  },
  {
    v: '-2',
    label: 'Responsive to noxious stimuli',
    marker: 'Responds only to noxious; unable to attend',
  },
  {
    v: '-3',
    label: 'Unresponsive',
    marker: 'No spontaneous respiratory effort; no response to noxious',
  },
];

// Comatose floors → "unable to assess for delirium" (screen above these).
export const RASS_COMATOSE = ['-4', '-5'];
export const SBS_COMATOSE = ['-2', '-3'];

export const AROUSAL_SCALES = {
  rass: { id: 'rass', label: 'RASS', levels: RASS_LEVELS, comatose: RASS_COMATOSE },
  sbs: { id: 'sbs', label: 'SBS', levels: SBS_LEVELS, comatose: SBS_COMATOSE },
};
