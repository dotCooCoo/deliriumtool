/**
 * peds/persist.js — local-only persistence for the pediatric assessment. The
 * whole assessment is a plain in-memory object, so save/restore is a JSON
 * snapshot to localStorage (debounced autosave) plus file export/import. Nothing
 * is sent anywhere; the snapshot is de-identified by construction (coded inputs,
 * no names — the hospital/unit label is the only free text).
 */
const KEY = 'deliriumtool:peds';
const SETTINGS_KEY = 'deliriumtool:peds:settings';
const SNAPSHOT_KEYS = [
  'profile',
  'screen',
  'alternatives',
  'arousal',
  'arousalScale',
  'capd',
  'cam',
  'risk',
  'medsGiven',
];

export function snapshot(state) {
  const out = { v: 1 };
  for (const k of SNAPSHOT_KEYS) out[k] = state[k];
  return out;
}

let timer = null;
export function autosave(state) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(snapshot(state)));
    } catch {
      /* storage unavailable (private mode / quota) — non-fatal */
    }
  }, 400);
}

// Save immediately (used on page hide so a quick reload never loses the last edit).
export function flushSave(state) {
  clearTimeout(timer);
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot(state)));
  } catch {
    /* non-fatal */
  }
}

export function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* non-fatal */
  }
}

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

function pickJSON() {
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return resolve(null);
      const r = new FileReader();
      r.onload = () => {
        try {
          resolve(JSON.parse(r.result));
        } catch {
          resolve({ __error: 'parse' });
        }
      };
      r.readAsText(f);
    };
    inp.click();
  });
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
};

export const EXAMPLE = {
  v: 1,
  profile: { ageM: 14, devM: 14, delay: false, baseline: 'typical', weightKg: 11, band: '1yr' },
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
  risk: {},
  medsGiven: { dexmed: true, melatonin: true },
};
