/**
 * peds/main.js — bootstrap + screening logic for the pediatric tool (/peds/).
 *
 * Mirrors the adult tool's pattern: delegated listeners, every interactive
 * element carries a data-* attribute, no inline handlers and no globals — so the
 * strict CSP (script-src 'self') holds. This entry owns the screen picker, tab
 * navigation, and the bedside screen (arousal gate + CAPD or pCAM/psCAM). The
 * clinical logic lives in ./scoring.js and is unit-tested; this file only renders
 * controls and reads them back.
 */
import {
  evalCapd,
  evalCam,
  arousalGate,
  CAPD_ITEMS,
  CAPD_FREQ,
  CAPD_DEV_DELAY_NOTE,
} from './scoring.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SCREENS = {
  capd: 'CAPD — all ages',
  pcam: 'pCAM-ICU — ≥ 5 years',
  pscam: 'psCAM-ICU — 6 mo–5 yr',
};

const RASS_OPTS = [
  ['+4', '+4 · combative'],
  ['+3', '+3 · very agitated'],
  ['+2', '+2 · agitated'],
  ['+1', '+1 · restless'],
  ['0', '0 · alert & calm'],
  ['-1', '−1 · drowsy'],
  ['-2', '−2 · light sedation'],
  ['-3', '−3 · moderate sedation'],
  ['-4', '−4 · deep sedation'],
  ['-5', '−5 · unarousable'],
];

const CAM_FEATURES = [
  {
    id: 'f1',
    label: 'Feature 1 — Acute change or fluctuating course of mental status from baseline',
  },
  { id: 'f2', label: 'Feature 2 — Inattention (age-appropriate attention task)' },
  { id: 'f3', label: 'Feature 3 — Altered level of consciousness (RASS other than 0)' },
  { id: 'f4', label: 'Feature 4 — Disorganized thinking' },
];

const state = { rass: '', capd: {}, cam: {} };

const fmtRass = (v) => String(v).replace('-', '−');
const badge = (cls, text) => `<span class="scr-badge ${cls}">${text}</span>`;

// ── Control rendering (static content only — safe to set as innerHTML) ──────
function renderRass() {
  const el = $('#peds-rass');
  if (!el) return;
  el.insertAdjacentHTML(
    'beforeend',
    RASS_OPTS.map(([v, l]) => `<option value="${v}">${l}</option>`).join(''),
  );
}

function segRow(legend, name, dataKey, options) {
  const opts = options
    .map(
      (o) =>
        `<label class="pseg-opt"><input type="radio" name="${name}" value="${o.value}" data-${dataKey}="${o.key}" /><span>${o.label}</span></label>`,
    )
    .join('');
  return `<fieldset class="pseg-row"><legend class="pseg-legend">${legend}</legend><div class="pseg" role="radiogroup">${opts}</div></fieldset>`;
}

function renderCapd() {
  const el = $('#capd-items');
  if (!el) return;
  el.innerHTML = CAPD_ITEMS.map((item) =>
    segRow(
      item.text,
      `capd-${item.id}`,
      'capd',
      CAPD_FREQ.map((label, i) => ({ value: i, key: item.id, label })),
    ),
  ).join('');
}

function renderCam() {
  const el = $('#cam-features');
  if (!el) return;
  el.innerHTML = CAM_FEATURES.map((f) =>
    segRow(f.label, `cam-${f.id}`, 'cam', [
      { value: 'yes', key: f.id, label: 'Yes' },
      { value: 'no', key: f.id, label: 'No' },
    ]),
  ).join('');
}

// ── Result ──────────────────────────────────────────────────────────────────
function renderResult() {
  const el = $('#screen-result');
  if (!el) return;
  const screen = document.body.dataset.screen;
  const gate = arousalGate(state.rass);

  if (gate == null) {
    el.innerHTML = `${badge('scr-pending', 'Awaiting')} Select an arousal level to begin.`;
    return;
  }
  if (gate === 'unable') {
    el.innerHTML = `${badge('scr-unable', 'Unable to assess')} RASS ${fmtRass(state.rass)} — comatose / too sedated to screen. Record “unable to assess” and reassess when the child responds to voice (RASS ≥ −3).`;
    return;
  }

  if (screen === 'capd') {
    const r = evalCapd(state.capd);
    if (!r.complete) {
      el.innerHTML = `${badge('scr-pending', `${r.answered}/8`)} Rate all eight CAPD items to score.`;
      return;
    }
    el.innerHTML = r.positive
      ? `${badge('scr-pos', 'Positive')} CAPD ${r.score}/32 (≥ 9) — delirium screen positive. <span class="note">${CAPD_DEV_DELAY_NOTE}</span>`
      : `${badge('scr-neg', 'Negative')} CAPD ${r.score}/32 (&lt; 9). <span class="note">Delirium fluctuates — rescreen at least each shift and after any acute change. ${CAPD_DEV_DELAY_NOTE}</span>`;
    return;
  }

  const tool = screen === 'pcam' ? 'pCAM-ICU' : 'psCAM-ICU';
  const res = evalCam({ ...state.cam, rass: state.rass });
  if (res == null) {
    el.innerHTML = `${badge('scr-pending', 'In progress')} Answer Feature 1 and 2 (and a secondary feature) to complete the ${tool}.`;
  } else if (res === 'unable') {
    el.innerHTML = `${badge('scr-unable', 'Unable to assess')} Too sedated — reassess when RASS ≥ −3.`;
  } else if (res === 'positive') {
    el.innerHTML = `${badge('scr-pos', 'Positive')} ${tool} positive — delirium present (Feature 1 + 2 + [3 or 4]).`;
  } else {
    el.innerHTML = `${badge('scr-neg', 'Negative')} ${tool} negative. <span class="note">Delirium fluctuates — rescreen each shift and after any acute change.</span>`;
  }
}

// ── Navigation ────────────────────────────────────────────────────────────────
function chooseScreen(key) {
  if (!SCREENS[key]) return;
  const nameEl = $('#pathway-name');
  if (nameEl) nameEl.textContent = SCREENS[key];
  document.body.dataset.screen = key;
  $('#pathway-picker').hidden = true;
  $('#workspace').hidden = false;
  renderResult();
  window.scrollTo({ top: 0 });
}

function clearScreen() {
  state.rass = '';
  state.capd = {};
  state.cam = {};
  const rass = $('#peds-rass');
  if (rass) rass.value = '';
  $$('.pseg-opt input').forEach((i) => {
    i.checked = false;
  });
}

function resetToPicker() {
  clearScreen();
  $('#workspace').hidden = true;
  $('#pathway-picker').hidden = false;
  delete document.body.dataset.screen;
  renderResult();
}

function showTab(tab) {
  $$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
}

// ── Dispatch ──────────────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const pathwayBtn = e.target.closest('[data-pathway]');
  if (pathwayBtn) return chooseScreen(pathwayBtn.dataset.pathway);
  const tabBtn = e.target.closest('.tab-btn[data-tab]');
  if (tabBtn) return showTab(tabBtn.dataset.tab);
  const actBtn = e.target.closest('[data-act]');
  if (actBtn && actBtn.dataset.act === 'reset') resetToPicker();
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.screenInput === 'rass') state.rass = t.value;
  else if (t.dataset.capd != null) state.capd[t.dataset.capd] = t.value;
  else if (t.dataset.cam != null) state.cam[t.dataset.cam] = t.value;
  else return;
  renderResult();
});

renderRass();
renderCapd();
renderCam();
renderResult();
