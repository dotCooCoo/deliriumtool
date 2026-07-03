/**
 * ed/state.js — the assessment model and its sanitizers, kept DOM-free so the
 * golden-value tests can exercise them directly. Every snapshot that enters
 * the app from outside (import, localStorage) passes through here.
 */
import { RASS_LEVELS, DTS, BCAM, FOURAT, ACT_POSITIVE } from './data/instruments.js';

export const blankAssessment = () => ({
  v: 1,
  tool: 'ed', // distinguishes exports from the other tools' v:1 files
  pathway: '', // '' = use the unit default from settings
  rass: '',
  lunchTaps: [], // tapped misses on the LUNCH-backwards letters
  lunchDone: false,
  lunchUnable: false,
  f1: '',
  monthTaps: [], // tapped misses on the months-backwards sequence
  monthDone: false,
  monthUnable: false,
  f4Set: 'a',
  f4: '', // '' | 'none' | 'errors'
  fourat: { alertness: '', amt4: '', attention: '', change: '' },
  actions: [], // checked act-on-positive item ids
  assessor: '',
  notes: '',
  assessedAt: '', // datetime-local string, editable on the summary
});

const MONTH_ITEMS = BCAM.features.find((f) => f.id === 'f2').items;
const ACTION_IDS = new Set(ACT_POSITIVE.flatMap((b) => b.items.map((_, i) => `${b.id}-${i}`)));

/** Valid encodings for a 4AT item are `${points}:${optionIndex}` pairs that
 *  exist on the form — anything else (e.g. a crafted '9:9') is discarded. */
const fouratValid = (id, v) => {
  const item = FOURAT.items.find((i) => i.id === id);
  return item.options.some((o, idx) => `${o.v}:${idx}` === v);
};

/** True when a snapshot looks like this tool's export (not peds/adult). */
export const looksLikeEdAssessment = (raw) =>
  !!raw && typeof raw === 'object' && raw.v === 1 && (raw.tool === 'ed' || 'lunchTaps' in raw);

/** Normalize an untrusted snapshot (import / localStorage) into a valid state. */
export function sanitizeAssessment(raw) {
  const out = blankAssessment();
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const taps = (v, n) =>
    Array.isArray(v)
      ? [...new Set(v.map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x < n))]
      : [];
  out.pathway = ['twostep', 'bcam', 'fourat'].includes(raw.pathway) ? raw.pathway : '';
  out.rass = RASS_LEVELS.some((r) => r.v === raw.rass) ? raw.rass : '';
  out.lunchTaps = taps(raw.lunchTaps, DTS.attention.items.length);
  out.lunchDone = raw.lunchDone === true;
  out.lunchUnable = raw.lunchUnable === true;
  out.f1 = ['yes', 'no', 'assume'].includes(raw.f1) ? raw.f1 : '';
  out.monthTaps = taps(raw.monthTaps, MONTH_ITEMS.length);
  out.monthDone = raw.monthDone === true;
  out.monthUnable = raw.monthUnable === true;
  out.f4Set = raw.f4Set === 'b' ? 'b' : 'a';
  out.f4 = ['none', 'errors'].includes(raw.f4) ? raw.f4 : '';
  for (const k of Object.keys(out.fourat)) {
    if (typeof raw.fourat?.[k] === 'string' && fouratValid(k, raw.fourat[k])) {
      out.fourat[k] = raw.fourat[k];
    }
  }
  out.actions = Array.isArray(raw.actions)
    ? [...new Set(raw.actions.filter((a) => ACTION_IDS.has(a)))]
    : [];
  out.assessor = str(raw.assessor, 120);
  out.notes = str(raw.notes, 1000);
  out.assessedAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw.assessedAt) ? raw.assessedAt : '';
  return out;
}

/** Normalize untrusted unit settings (localStorage). */
export function sanitizeSettings(raw) {
  const out = { facility: '', defaultPathway: 'twostep' };
  if (raw && typeof raw === 'object') {
    if (typeof raw.facility === 'string') out.facility = raw.facility.slice(0, 120);
    if (['twostep', 'bcam', 'fourat'].includes(raw.defaultPathway)) {
      out.defaultPathway = raw.defaultPathway;
    }
  }
  return out;
}
