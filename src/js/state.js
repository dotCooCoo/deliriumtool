/**
 * state.js — the in-progress assessment state and its local persistence.
 *
 * Most of the assessment lives in the DOM (checkboxes, selects, textareas); the
 * few derived/transient values live on the exported `S` singleton. This module
 * serialises both so a reload or handoff never loses work, plus JSON
 * export/import. Persistence is LOCAL ONLY — nothing is sent to a server.
 */

import { MEDS, resetMeds } from './data/meds.js';
import { evalCam } from './scoring.js';

const AUTOSAVE_KEY = 'deliriumtool:assessment';

const ALLOWED_PATHWAYS = ['full', 'spa', 'record'];
const VALID_RASS = new Set(['+4', '+3', '+2', '+1', '0', '-1', '-2', '-3', '-4', '-5']);
const MAX_TEXT = 5000;

// Coerce an untrusted value to a length-bounded string. Defends the import,
// share, and autosave-restore paths against type confusion and oversized data.
function asText(v, max = MAX_TEXT) {
  if (typeof v === 'number' && Number.isFinite(v)) v = String(v);
  return typeof v === 'string' ? v.slice(0, max) : '';
}

/** Apply a serialized [{id, on[]}] med selection onto the MEDS model (strict). */
export function applyMeds(meds) {
  if (!Array.isArray(meds)) return;
  meds.forEach((c) => {
    if (!c || typeof c !== 'object' || !Array.isArray(c.on)) return;
    const cat = MEDS.categories.find((x) => x.id === c.id);
    if (cat) cat.items.forEach((it, i) => (it.on = c.on[i] === true));
  });
}

/** Transient/derived state not captured by a single form control. */
export const S = {
  pathway: null, // 'full' | 'spa' | 'record'
  risk: 0,
  cam: {}, // feature number -> 'yes' | 'no'
  camResult: null, // 'positive' | 'negative' | 'unable' | null
  rass: null,
  sub: null,
  log: [],
};

/**
 * Give every persistent control in `root` a stable key (data-k) from its panel
 * id and document order, so serialize/restore round-trips reliably. The DOM is
 * static per build, so these keys are stable across reloads.
 */
export function assignKeys(root) {
  root.querySelectorAll('.tab-panel').forEach((panel) => {
    const pid = panel.id || 'p';
    let i = 0;
    panel.querySelectorAll('input, select, textarea').forEach((el) => {
      el.dataset.k = `${pid}:${i++}`;
    });
  });
}

function controlValue(el) {
  return el.type === 'checkbox' ? el.checked : el.value;
}

/** Capture the full assessment (form controls + S + facility) as a plain object. */
export function serialize(root) {
  const controls = {};
  root.querySelectorAll('[data-k]').forEach((el) => {
    controls[el.dataset.k] = controlValue(el);
  });
  const fac = document.getElementById('facility-input');
  return {
    v: 1,
    pathway: S.pathway,
    activeTab: document.querySelector('.tab-btn.active')?.dataset.tab || null,
    facility: fac ? fac.value : '',
    // The CAM session log is a deliberate scratchpad — not persisted (see the tab copy).
    s: { risk: S.risk, cam: S.cam, camResult: S.camResult, rass: S.rass, sub: S.sub },
    meds: MEDS.categories.map((c) => ({ id: c.id, on: c.items.map((i) => i.on) })),
    controls,
  };
}

/**
 * Apply a serialized object back onto the DOM + S — defensively, since the source
 * may be a hand-edited JSON file or a crafted share link. Unknown/own-only keys,
 * wrong types, and oversized strings are ignored, and S fields are coerced to
 * their expected shapes rather than blindly assigned (no Object.assign of
 * untrusted data, so a `__proto__` key cannot pollute the prototype).
 */
export function restore(root, data) {
  if (!data || typeof data !== 'object') return;

  const controls = data.controls && typeof data.controls === 'object' ? data.controls : null;
  if (controls) {
    root.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k;
      if (!Object.prototype.hasOwnProperty.call(controls, k)) return;
      const v = controls[k];
      if (el.type === 'checkbox') el.checked = v === true;
      else el.value = asText(v);
    });
  }

  const s = data.s && typeof data.s === 'object' && !Array.isArray(data.s) ? data.s : {};
  S.risk = Number.isFinite(s.risk) ? Math.max(0, Math.min(99, Math.trunc(s.risk))) : 0;
  S.cam = {};
  if (s.cam && typeof s.cam === 'object' && !Array.isArray(s.cam)) {
    ['1', '2', '3', '4'].forEach((k) => {
      if (s.cam[k] === 'yes' || s.cam[k] === 'no') S.cam[k] = s.cam[k];
    });
  }
  S.rass = VALID_RASS.has(s.rass) ? s.rass : null;
  // The CAM verdict is always re-derived from the restored features + RASS —
  // a hand-edited or stale export cannot display a result its features do
  // not support.
  S.camResult = evalCam({
    f1: S.cam[1],
    f2: S.cam[2],
    f3: S.cam[3],
    f4: S.cam[4],
    rass: S.rass ?? undefined,
  });
  S.sub = ['hyper', 'hypo', 'mixed'].includes(s.sub) ? s.sub : null;
  S.log = []; // the CAM log is session scratch — don't carry it across a load/import

  if (ALLOWED_PATHWAYS.includes(data.pathway)) S.pathway = data.pathway;
  applyMeds(data.meds);

  const fac = document.getElementById('facility-input');
  if (fac && typeof data.facility === 'string') fac.value = asText(data.facility, 200);
}

let saveTimer = null;
/** Debounced autosave to localStorage. */
export function autosave(root) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serialize(root)));
    } catch {
      /* storage unavailable (private mode / quota) — non-fatal */
    }
  }, 400);
}

/** Synchronous save (used on page hide so the last edit survives a quick reload). */
export function flushSave(root) {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(serialize(root)));
  } catch {
    /* non-fatal */
  }
}

export function loadAutosave() {
  try {
    return JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || 'null');
  } catch {
    return null;
  }
}

/** Clear the saved assessment and reset every control + S to empty. */
export function clearAll(root) {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch {
    /* non-fatal */
  }
  root.querySelectorAll('[data-k]').forEach((el) => {
    if (el.closest('#tab-settings')) return; // keep unit/protocol governance config
    if (el.type === 'checkbox') el.checked = false;
    else el.value = '';
  });
  const fac = document.getElementById('facility-input');
  if (fac) fac.value = '';
  resetMeds(); // restore the authored default on/off (not all-on)
  S.pathway = null;
  S.risk = 0;
  S.cam = {};
  S.camResult = null;
  S.rass = null;
  S.sub = null;
  S.log = [];
}

/** Export the current assessment as a downloadable JSON file (local only). */
export function exportJSON(root) {
  const json = JSON.stringify(serialize(root), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'delirium-assessment.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

/** Import an assessment JSON file chosen by the user; resolves to the parsed object. */
export function importJSON() {
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
          resolve({ __error: 'parse' }); // distinguish a bad file from a cancel (null)
        }
      };
      r.readAsText(f);
    };
    inp.click();
  });
}
