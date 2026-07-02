/**
 * templates/state.js — the template customization model.
 *
 * The state is a facility's protocol configuration only (template choice,
 * header text, section/item/medication selection) — never patient data. It
 * autosaves to localStorage, exports/imports as JSON, and shares as a URL
 * fragment (`#tpl=`), so a charge nurse can hand the exact configuration to a
 * colleague without anything touching a server.
 */
import { MEDS } from '../data/meds.js';
import { toBase64Url, fromBase64Url } from '../share.js';

const KEY = 'deliriumtool:templates';

export const FONT_SCALES = [
  { id: '90', label: 'Compact' },
  { id: '100', label: 'Standard' },
  { id: '110', label: 'Large' },
];

export function defaultMeds() {
  // The shared catalog's documented defaults: the three classes with the
  // strongest, most actionable ICU delirium signal — benzodiazepines, opioids,
  // and anticholinergics (PADIS 2018; AGS Beers 2023 / ACB) — start selected;
  // the rest of the catalog is opt-in. Matches the interactive tool.
  const meds = {};
  MEDS.categories.forEach((c) =>
    c.items.forEach((i) => {
      meds[i.id] = !!i.on;
    }),
  );
  return meds;
}

export function defaultState() {
  return {
    v: 1,
    template: 'rounding',
    pedsScale: 'rass', // arousal scale on the peds cards (RASS or SBS)
    facility: '',
    unit: '',
    docDate: new Date().toISOString().slice(0, 10), // creation date, editable
    docRev: '',
    rassTarget: '0to-2',
    fontScale: '110',
    fontFamily: 'sans',
    showActions: true,
    showDoses: false,
    showBrands: false,
    medLayout: 'mosaic',
    // Sparse override maps: an id is only present when it differs from the default (on).
    sections: {},
    items: {},
    // Free-text protocol lines the unit adds under a group (never patient data).
    custom: {},
    // Reworded built-in lines/headings, keyed by item or group id.
    textOverrides: {},
    // Unit-authored sections: { id, page, title, lines[] } appended to that page.
    customSections: [],
    meds: defaultMeds(),
  };
}

/** Section/item visibility — absent means on. */
export const isOn = (map, id) => map[id] !== false;

/** Normalize an untrusted snapshot (import/share/localStorage) into a valid state. */
export function sanitize(raw) {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const s = { ...d };
  if (['rounding', 'spa', 'peds-cards', 'peds-workflow'].includes(raw.template))
    s.template = raw.template;
  if (['rass', 'sbs'].includes(raw.pedsScale)) s.pedsScale = raw.pedsScale;
  if (typeof raw.facility === 'string') s.facility = raw.facility.slice(0, 120);
  if (typeof raw.unit === 'string') s.unit = raw.unit.slice(0, 120);
  // An empty stored date keeps the default (today) — the field auto-fills so
  // every sheet carries a creation date unless the unit sets its own.
  if (typeof raw.docDate === 'string' && raw.docDate.trim()) s.docDate = raw.docDate.slice(0, 20);
  if (typeof raw.docRev === 'string') s.docRev = raw.docRev.slice(0, 24);
  if (['0to-1', '0to-2', '-3to-4', 'none'].includes(raw.rassTarget)) s.rassTarget = raw.rassTarget;
  if (['90', '100', '110'].includes(String(raw.fontScale))) s.fontScale = String(raw.fontScale);
  if (['sans', 'classic', 'serif'].includes(raw.fontFamily)) s.fontFamily = raw.fontFamily;
  s.showActions = raw.showActions !== false;
  s.showDoses = raw.showDoses === true;
  s.showBrands = raw.showBrands === true;
  if (['mosaic', 'rows'].includes(raw.medLayout)) s.medLayout = raw.medLayout;
  const boolMap = (m) => {
    const out = {};
    if (m && typeof m === 'object') {
      for (const [k, v] of Object.entries(m)) if (v === false) out[String(k).slice(0, 60)] = false;
    }
    return out;
  };
  s.sections = boolMap(raw.sections);
  s.items = boolMap(raw.items);
  s.custom = {};
  if (raw.custom && typeof raw.custom === 'object') {
    for (const [k, v] of Object.entries(raw.custom)) {
      if (Array.isArray(v)) {
        const lines = v
          .filter((t) => typeof t === 'string')
          .map((t) => t.slice(0, 160))
          .slice(0, 8);
        if (lines.length) s.custom[String(k).slice(0, 60)] = lines;
      }
    }
  }
  s.textOverrides = {};
  if (raw.textOverrides && typeof raw.textOverrides === 'object') {
    for (const [k, v] of Object.entries(raw.textOverrides)) {
      if (typeof v === 'string' && v.trim()) {
        s.textOverrides[String(k).slice(0, 60)] = v.slice(0, 200);
      }
    }
  }
  s.customSections = [];
  if (Array.isArray(raw.customSections)) {
    for (const sec of raw.customSections.slice(0, 4)) {
      if (!sec || typeof sec !== 'object' || typeof sec.title !== 'string') continue;
      const lines = (Array.isArray(sec.lines) ? sec.lines : [])
        .filter((t) => typeof t === 'string' && t.trim())
        .map((t) => t.slice(0, 160))
        .slice(0, 8);
      s.customSections.push({
        id: typeof sec.id === 'string' ? sec.id.slice(0, 24) : `cs-${s.customSections.length + 1}`,
        page: sec.page === 2 ? 2 : 1,
        title: sec.title.slice(0, 60),
        lines,
      });
    }
  }
  s.meds = defaultMeds();
  if (raw.meds && typeof raw.meds === 'object') {
    for (const k of Object.keys(s.meds)) {
      if (typeof raw.meds[k] === 'boolean') s.meds[k] = raw.meds[k];
    }
  }
  return s;
}

// ── Local persistence (debounced autosave; flushed on page hide) ─────────────
let timer = null;
export function autosave(state) {
  clearTimeout(timer);
  timer = setTimeout(() => flushSave(state), 400);
}
export function flushSave(state) {
  clearTimeout(timer);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode / quota) — non-fatal */
  }
}
export function loadSaved() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return raw ? sanitize(raw) : null;
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

// ── Share via URL fragment (config only; Referrer-Policy: no-referrer) ───────
export function buildShareUrl(state) {
  return `${location.origin}${location.pathname}#tpl=${toBase64Url(JSON.stringify(state))}`;
}
export function readShareUrl() {
  const m = /[#&]tpl=([^&]+)/.exec(location.hash);
  if (!m) return null;
  try {
    return sanitize(JSON.parse(fromBase64Url(m[1])));
  } catch {
    return null;
  }
}

// ── JSON export / import ─────────────────────────────────────────────────────
export function exportJSON(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'delirium-template-config.json';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}
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
          resolve(sanitize(JSON.parse(r.result)));
        } catch {
          resolve({ __error: 'parse' });
        }
      };
      r.readAsText(f);
    };
    inp.click();
  });
}
