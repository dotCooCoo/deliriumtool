/**
 * stepdown/state.js — the assessment model and its sanitizers, kept DOM-free so the
 * golden-value tests can exercise them directly. Every snapshot that enters the app
 * from outside (import, localStorage) passes through sanitizeAssessment() first.
 */
import { RASS_LEVELS, CAMIMC, RISK, PREVENTION } from './data/instruments.js';

export const blankAssessment = () => ({
  v: 1,
  tool: 'stepdown', // distinguishes exports from the other tools' v:1 files
  rass: '',
  camimc: {
    acute: '', // '' | 'yes' | 'no'
    inattention: '', // '' | '0' | '1' | '2' | '3'
    inattentionUnable: false,
    disorientTaps: [], // indexes of the disorientation dimensions scored as errors
    disorientDone: false,
  },
  risk: { age85: false, adlDeps: [], psychoDrugs: [] }, // adlDeps: dependent-ADL indexes; psychoDrugs: drug-class ids
  prevention: [], // checked prevention-component ids
  assessor: '',
  notes: '',
  assessedAt: '', // datetime-local string, editable on the summary
});

const PREV_IDS = new Set(PREVENTION.components.map((c) => c.id));
const DISO_N = CAMIMC.disorientation.dimensions.length;
const PSY_IDS = new Set(RISK.psychotropic.drugs.map((d) => d.id));

/** True when a snapshot looks like this tool's export (not ed/peds/adult). */
export const looksLikeStepdownAssessment = (raw) =>
  !!raw && typeof raw === 'object' && raw.v === 1 && (raw.tool === 'stepdown' || 'camimc' in raw);

/** Normalize an untrusted snapshot (import / localStorage) into a valid state. */
export function sanitizeAssessment(raw) {
  const out = blankAssessment();
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const idxSet = (v, n) =>
    Array.isArray(v)
      ? [...new Set(v.map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x < n))]
      : [];

  out.rass = RASS_LEVELS.some((r) => r.v === raw.rass) ? raw.rass : '';

  const c = raw.camimc || {};
  out.camimc.acute = ['yes', 'no'].includes(c.acute) ? c.acute : '';
  out.camimc.inattention = ['0', '1', '2', '3'].includes(String(c.inattention))
    ? String(c.inattention)
    : '';
  out.camimc.inattentionUnable = c.inattentionUnable === true;
  out.camimc.disorientTaps = idxSet(c.disorientTaps, DISO_N);
  out.camimc.disorientDone = c.disorientDone === true;

  const rk = raw.risk || {};
  out.risk.age85 = rk.age85 === true;
  out.risk.adlDeps = idxSet(rk.adlDeps, RISK.adl.activities.length);
  out.risk.psychoDrugs = Array.isArray(rk.psychoDrugs)
    ? [...new Set(rk.psychoDrugs.filter((x) => PSY_IDS.has(x)))]
    : [];

  out.prevention = Array.isArray(raw.prevention)
    ? [...new Set(raw.prevention.filter((x) => PREV_IDS.has(x)))]
    : [];

  out.assessor = str(raw.assessor, 120);
  out.notes = str(raw.notes, 1000);
  out.assessedAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw.assessedAt) ? raw.assessedAt : '';
  return out;
}

/** Normalize untrusted unit settings (localStorage). */
export function sanitizeSettings(raw) {
  const out = { facility: '' };
  if (raw && typeof raw === 'object' && typeof raw.facility === 'string') {
    out.facility = raw.facility.slice(0, 120);
  }
  return out;
}
