/**
 * peds/state.js — the pediatric import sanitizer, kept DOM-free so the golden-value
 * tests can exercise it directly. Every snapshot that enters the app from outside
 * (import) passes through sanitizeAssessment() first, so a malformed or hand-edited
 * file degrades to an incomplete assessment rather than driving a clinically wrong
 * screen: the arousal is allow-listed against the recorded scale's levels (an
 * out-of-range value can no longer read as "assessable" / "altered consciousness"),
 * CAM feature flags are coerced to real booleans (a truthy string can no longer read
 * as a positive finding), CAPD items to a 0–4 frequency, and every checklist key to
 * a known id. Mirrors ed/state.js and stepdown/state.js.
 */
import { RASS_LEVELS, SBS_LEVELS } from './data/arousal.js';
import { CAPD_ITEMS } from './data/capd.js';
import { CAM_BY_SCREEN } from './data/cam.js';
import { RISK_FACTORS } from './data/risk.js';
import { PREVENTION_ORDER } from './data/prevent.js';
import { MEDS } from './data/meds.js';

const SCREENS = ['capd', 'pcam', 'pscam'];
const BASELINES = ['typical', 'impaired'];
const AGE_UNITS = ['m', 'y'];
const FREQ = ['0', '1', '2', '3', '4'];
const CAPD_IDS = CAPD_ITEMS.map((i) => i.id);
const RISK_IDS = RISK_FACTORS.map((f) => f.id);
const MED_IDS = MEDS.map((m) => m.id);
const arousalValues = (scale) =>
  new Set((scale === 'sbs' ? SBS_LEVELS : RASS_LEVELS).map((l) => l.v));

const bool = (v) => v === true;
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v, min, max) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

/** True when a snapshot looks like this tool's export (not ed/stepdown/adult). */
export const looksLikePedsAssessment = (raw) =>
  !!raw &&
  typeof raw === 'object' &&
  raw.v === 1 &&
  raw.profile != null &&
  ('arousalScale' in raw || 'capd' in raw || 'screen' in raw);

function sanitizeCapd(raw) {
  const out = {};
  if (raw && typeof raw === 'object') {
    for (const id of CAPD_IDS) {
      if (FREQ.includes(String(raw[id]))) out[id] = String(raw[id]);
    }
  }
  return out;
}

/** Validate one CAM feature's captured value against its declared type. */
function sanitizeFeature(feature, value) {
  if (!feature) return undefined;
  if (feature.type === 'judgment') {
    return value === 'yes' || value === 'no' ? value : undefined;
  }
  if (value == null || typeof value !== 'object') return undefined;
  if (feature.type === 'errors') {
    const n = Array.isArray(feature.items) ? feature.items.length : 10;
    const errors = Array.isArray(value.errors)
      ? [...new Set(value.errors.map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x < n))]
      : [];
    const out = { performed: bool(value.performed), errors };
    if (feature.alt && value[feature.alt.id] === true) out[feature.alt.id] = true;
    if (feature.picture && value.picture && typeof value.picture === 'object') {
      const seqLen = Array.isArray(feature.picture.sequence) ? feature.picture.sequence.length : 10;
      const src =
        value.picture.marks && typeof value.picture.marks === 'object' ? value.picture.marks : {};
      const marks = {};
      for (const k of Object.keys(src)) {
        const i = Number(k);
        if (
          Number.isInteger(i) &&
          i >= 0 &&
          i < seqLen &&
          (src[k] === 'seen' || src[k] === 'new')
        ) {
          marks[i] = src[k];
        }
      }
      out.picture = { performed: bool(value.picture.performed), marks };
    }
    return out;
  }
  if (feature.type === 'compound') {
    const out = { performed: bool(value.performed) };
    for (const part of feature.parts || []) out[part.id] = bool(value[part.id]);
    return out;
  }
  return undefined;
}

function sanitizeCam(screen, raw) {
  const def = CAM_BY_SCREEN[screen];
  if (!def || !raw || typeof raw !== 'object') return {};
  const out = {};
  for (const feature of def.features) {
    if (feature.type === 'arousal') continue; // Feature 3 is derived from the arousal, not stored
    const v = sanitizeFeature(feature, raw[feature.id]);
    if (v !== undefined) out[feature.id] = v;
  }
  return out;
}

// Keep known keys with a real boolean value, preserving an explicit `false` — a
// profile-derived risk factor the user turned off must not be silently re-derived,
// and any truthy non-boolean is coerced to false rather than reading as checked.
const boolMap = (raw, ids) => {
  const out = {};
  if (raw && typeof raw === 'object')
    for (const id of ids) if (id in raw) out[id] = raw[id] === true;
  return out;
};

/**
 * Normalize an untrusted pediatric snapshot (import) into a valid assessment, or
 * return null if it is not a pediatric assessment / has no usable chronological
 * age. applyState() recomputes the CAPD band and the applicable screens from the
 * sanitized profile.
 */
export function sanitizeAssessment(raw) {
  if (!raw || typeof raw !== 'object' || !raw.profile || typeof raw.profile !== 'object') {
    return null;
  }
  const p = raw.profile;
  const ageM = num(p.ageM, 0, 1200); // 0–100 years, in months
  if (ageM == null) return null; // no usable age → reject the file (matches the import guard)
  const screen = SCREENS.includes(raw.screen) ? raw.screen : 'capd';
  const arousalScale = raw.arousalScale === 'sbs' ? 'sbs' : 'rass';
  const arousalOk = arousalValues(arousalScale);
  const out = {
    v: 1,
    profile: {
      ageM,
      devM: num(p.devM, 0, 1200) ?? ageM,
      delay: bool(p.delay),
      baseline: BASELINES.includes(p.baseline) ? p.baseline : 'typical',
      weightKg: num(p.weightKg, 0, 400),
      glasses: bool(p.glasses),
      hearing: bool(p.hearing),
      band: null, // recomputed by applyState from devM
    },
    screen,
    arousalScale,
    arousal: typeof raw.arousal === 'string' && arousalOk.has(raw.arousal) ? raw.arousal : '',
    capd: sanitizeCapd(raw.capd),
    cam: sanitizeCam(screen, raw.cam),
    risk: boolMap(raw.risk, RISK_IDS),
    prevention: boolMap(raw.prevention, PREVENTION_ORDER),
    medsGiven: boolMap(raw.medsGiven, MED_IDS),
    assessor: str(raw.assessor, 120),
    activeTab: typeof raw.activeTab === 'string' ? raw.activeTab.slice(0, 40) : 'screen',
    assessedAt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw.assessedAt) ? raw.assessedAt : '',
  };
  if (AGE_UNITS.includes(p.ageUnit)) out.profile.ageUnit = p.ageUnit;
  return out;
}
