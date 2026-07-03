/**
 * peds/persist.js — local-only persistence for the pediatric assessment. The
 * whole assessment is a plain in-memory object, so save/restore is a JSON
 * snapshot to localStorage (debounced autosave) plus file export/import. Nothing
 * is sent anywhere; the snapshot is de-identified by construction (coded inputs,
 * no names — the hospital/unit label is the only free text).
 */
import { makeStore } from '../shared/store.js';
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

const store = makeStore(KEY, snapshot);
export const autosave = store.autosave;
export const flushSave = store.flushSave;
export const loadSaved = store.loadSaved;

export function clearSaved() {
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
