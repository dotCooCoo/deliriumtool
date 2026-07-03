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
import { makeStore } from '../shared/store.js';
import { downloadJSON, pickJSON } from '../shared/files.js';
import { buildHashUrl, readHashPayload } from '../shared/share-codec.js';

const KEY = 'deliriumtool:templates';

/** Today in the user's timezone as YYYY-MM-DD (UTC would date-shift evenings). */
function localDateISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

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
    edF4Set: 'a', // bCAM Feature-4 question set on the ED card ('a' or 'b')
    design: 'a', // adult sheet design: 'a' classic, 'b' modern
    stimLayout: 'grid', // picture cards: 'grid' 4-up with cut guides, 'full' one per page
    stimStyle: 'b', // picture art: 'b' kawaii (default), 'a' classic
    facility: '',
    unit: '',
    docDate: localDateISO(), // creation date (local timezone), editable
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
/** True when a parsed JSON payload looks like a designer configuration. */
export function looksLikeConfig(raw) {
  return (
    !!raw && typeof raw === 'object' && !Array.isArray(raw) && typeof raw.template === 'string'
  );
}

export function sanitize(raw) {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const s = { ...d };
  if (
    ['rounding', 'spa', 'peds-cards', 'peds-workflow', 'ed-cards', 'ed-workflow'].includes(
      raw.template,
    )
  )
    s.template = raw.template;
  if (['rass', 'sbs'].includes(raw.pedsScale)) s.pedsScale = raw.pedsScale;
  if (['a', 'b'].includes(raw.edF4Set)) s.edF4Set = raw.edF4Set;
  if (['a', 'b'].includes(raw.design)) s.design = raw.design;
  if (['grid', 'full'].includes(raw.stimLayout)) s.stimLayout = raw.stimLayout;
  if (['a', 'b'].includes(raw.stimStyle)) s.stimStyle = raw.stimStyle;
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
        page: sec.page === 2 ? 2 : sec.page === 0 ? 0 : 1,
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
const store = makeStore(KEY);
export const autosave = store.autosave;
export const flushSave = store.flushSave;
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
  return buildHashUrl('tpl', state);
}
export function readShareUrl() {
  const raw = readHashPayload('tpl');
  return raw ? sanitize(raw) : null;
}

// ── JSON export / import ─────────────────────────────────────────────────────
export function exportJSON(state) {
  const slug = (v) =>
    v
      .trim()
      .replace(/[^A-Za-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
  const parts = [
    'delirium-template',
    state.template,
    slug(state.docRev || ''),
    slug(state.docDate || ''),
  ]
    .filter(Boolean)
    .join('_');
  downloadJSON(state, `${parts}.json`);
}
export function importJSON() {
  return pickJSON().then((raw) => {
    if (raw == null || raw.__error) return raw;
    // A valid-JSON file that isn't a designer config must not silently
    // reset the whole configuration to defaults.
    if (!looksLikeConfig(raw)) return { __error: 'shape' };
    return sanitize(raw);
  });
}
