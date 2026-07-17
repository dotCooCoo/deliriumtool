/**
 * peds/persist.js — save/load for the pediatric assessment. The whole
 * assessment is a plain in-memory object and is session-only: a reload starts
 * fresh, and handoff happens through JSON file export/import. Facility
 * settings keep their own localStorage key. Nothing is sent anywhere; the
 * snapshot is de-identified by construction (coded inputs, no names — the
 * hospital/unit label is the only free text).
 */
import { downloadJSON, pickJSON } from '../shared/files.js';

const KEY = 'deliriumtool:peds';
const SETTINGS_KEY = 'deliriumtool:peds:settings';
const SNAPSHOT_KEYS = [
  'profile',
  'assessedAt',
  'assessor',
  'activeTab',
  'screen',
  'alternatives',
  'arousal',
  'arousalScale',
  'capd',
  'cam',
  'risk',
  'prevention',
  'medsGiven',
];

export function snapshot(state) {
  const out = { v: 1 };
  for (const k of SNAPSHOT_KEYS) out[k] = state[k];
  return out;
}

/**
 * Remove any assessment snapshot an earlier version autosaved to localStorage.
 * The assessment no longer persists across reloads, so a leftover snapshot is
 * only a stale copy of patient inputs on a possibly shared workstation.
 */
export function scrubAutosave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
}

export function exportJSON(state) {
  downloadJSON(snapshot(state), 'peds-delirium-assessment.json');
}
export function importJSON() {
  return pickJSON();
}

// ── Facility settings (separate localStorage key; survive "new child") ─────────
let setTimer = null;
export function saveSettings(obj) {
  clearTimeout(setTimer);
  setTimer = setTimeout(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj));
    } catch {
      /* non-fatal */
    }
  }, 400);
}
export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
  } catch {
    return null;
  }
}
export function exportSettings(obj) {
  downloadJSON(obj, 'peds-delirium-settings.json');
}
export function importSettings() {
  return pickJSON();
}

// A de-identified worked example — a 14-month-old, CAPD-positive — so the tool
// can be explored and the report previewed without entering a real child.
export const EXAMPLE_SETTINGS = {
  hospital: "General Children's Hospital — PICU",
  protocol: 'v1.0 — example',
  scale: 'rass',
  freq: 'Once per shift',
  reviewed: '2026-01-15',
  nextrev: '2026-07-15',
};

export const EXAMPLE = {
  v: 1,
  assessor: 'J. Rivera, RN',
  profile: {
    ageM: 14,
    devM: 14,
    delay: false,
    baseline: 'typical',
    weightKg: 11,
    band: '1yr',
    glasses: false,
    hearing: false,
  },
  screen: 'capd',
  alternatives: ['pscam'],
  arousal: '0',
  arousalScale: 'rass',
  capd: {
    eye: '1',
    purpose: '1',
    aware: '2',
    comm: '2',
    restless: '3',
    inconsolable: '2',
    underactive: '1',
    slow: '2',
  },
  cam: {},
  risk: { benzo: true, vent: true },
  prevention: { A: true, C: true, D: true, F: true, sleep: true },
  medsGiven: { dexmed: true, melatonin: true },
};

// A second worked example — a 7-year-old on pCAM-ICU — so the picture attention
// task (memory pictures + Seen/New) can be explored without hunting for the
// right age/screen. Feature 2 is scored by the pictures (3 errors) and the
// recorded RASS −1 makes Feature 3 (altered LOC) present, so the screen lands
// positive with the picture task filled in.
export const EXAMPLE_PCAM = {
  v: 1,
  assessor: 'J. Rivera, RN',
  profile: {
    ageM: 84,
    devM: 84,
    ageUnit: 'y',
    delay: false,
    baseline: 'typical',
    weightKg: 23,
    band: null,
    glasses: false,
    hearing: false,
  },
  screen: 'pcam',
  alternatives: ['pcam'],
  arousal: '-1',
  arousalScale: 'rass',
  capd: {},
  cam: {
    f1: 'yes',
    f2: {
      performed: false,
      errors: [],
      // Recognition answers: memory pictures at indices 0, 2 called "new" and
      // the distractor at 4 called "seen" → 3 errors → inattention present.
      picture: {
        performed: true,
        marks: {
          0: 'new',
          1: 'new',
          2: 'new',
          3: 'seen',
          4: 'seen',
          5: 'new',
          6: 'seen',
          7: 'seen',
          8: 'new',
          9: 'new',
        },
      },
    },
  },
  risk: { benzo: true, vent: true },
  prevention: { A: true, D: true, F: true },
  medsGiven: { dexmed: true },
};
