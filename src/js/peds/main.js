/**
 * peds/main.js — bootstrap + screening logic for the pediatric tool (/peds/).
 *
 * Mirrors the adult tool's pattern: delegated listeners, every interactive
 * element carries a data-* attribute, no inline handlers and no globals — so the
 * strict CSP (script-src 'self') holds. This entry owns the screen picker, tab
 * navigation, and the bedside screen (arousal gate + CAPD or pCAM/psCAM). The
 * clinical logic lives in ./scoring.js and is unit-tested; this file only builds
 * controls and reads them back. Controls are built with safe DOM APIs
 * (createElement + textContent) — no HTML strings are ever parsed.
 */
import { evalCapd, evalCam, arousalGate } from './scoring.js';
import { CAPD_ITEMS, CAPD_FREQ, CAPD_DEV_DELAY_NOTE } from './data/capd.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Tiny element builder. Text and attributes only — never HTML — so there is no
// injection sink even though all inputs here are static constants.
function el(tag, props, ...kids) {
  const node = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, String(v));
    }
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
}

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
const note = (text) => el('span', { class: 'note', text });

// ── Control rendering (safe DOM construction) ──────────────────────────────────
function renderRass() {
  const sel = $('#peds-rass');
  if (!sel) return;
  for (const [v, label] of RASS_OPTS) sel.append(el('option', { value: v, text: label }));
}

function segRow(legend, name, dataKey, options) {
  const group = el('div', { class: 'pseg', role: 'radiogroup' });
  for (const o of options) {
    const input = el('input', { type: 'radio', name, value: o.value });
    input.setAttribute(`data-${dataKey}`, o.key);
    group.append(el('label', { class: 'pseg-opt' }, input, el('span', { text: o.label })));
  }
  return el(
    'fieldset',
    { class: 'pseg-row' },
    el('legend', { class: 'pseg-legend', text: legend }),
    group,
  );
}

function renderCapd() {
  const box = $('#capd-items');
  if (!box) return;
  box.replaceChildren(
    ...CAPD_ITEMS.map((item) =>
      segRow(
        item.text,
        `capd-${item.id}`,
        'capd',
        CAPD_FREQ.map((label, i) => ({ value: i, key: item.id, label })),
      ),
    ),
  );
}

function renderCam() {
  const box = $('#cam-features');
  if (!box) return;
  box.replaceChildren(
    ...CAM_FEATURES.map((f) =>
      segRow(f.label, `cam-${f.id}`, 'cam', [
        { value: 'yes', key: f.id, label: 'Yes' },
        { value: 'no', key: f.id, label: 'No' },
      ]),
    ),
  );
}

// ── Result ──────────────────────────────────────────────────────────────────
function setResult(badgeCls, badgeText, ...rest) {
  const out = $('#screen-result');
  if (!out) return;
  out.replaceChildren(
    el('span', { class: `scr-badge ${badgeCls}`, text: badgeText }),
    ' ',
    ...rest,
  );
}

function renderResult() {
  const screen = document.body.dataset.screen;
  const gate = arousalGate('rass', state.rass);

  if (gate == null)
    return setResult('scr-pending', 'Awaiting', 'Select an arousal level to begin.');
  if (gate === 'unable') {
    return setResult(
      'scr-unable',
      'Unable to assess',
      `RASS ${fmtRass(state.rass)} — comatose / too sedated to screen. Record “unable to assess” and reassess when the child responds to voice (RASS ≥ −3).`,
    );
  }

  if (screen === 'capd') {
    const r = evalCapd(state.capd);
    if (!r.complete) {
      return setResult('scr-pending', `${r.answered}/8`, 'Rate all eight CAPD items to score.');
    }
    return r.positive
      ? setResult(
          'scr-pos',
          'Positive',
          `CAPD ${r.score}/32 (≥ 9) — delirium screen positive. `,
          note(CAPD_DEV_DELAY_NOTE),
        )
      : setResult(
          'scr-neg',
          'Negative',
          `CAPD ${r.score}/32 (< 9). `,
          note(
            `Delirium fluctuates — rescreen at least each shift and after any acute change. ${CAPD_DEV_DELAY_NOTE}`,
          ),
        );
  }

  const tool = screen === 'pcam' ? 'pCAM-ICU' : 'psCAM-ICU';
  const res = evalCam({ ...state.cam });
  if (res == null) {
    return setResult(
      'scr-pending',
      'In progress',
      `Answer Feature 1 and 2 (and a secondary feature) to complete the ${tool}.`,
    );
  }
  if (res === 'unable') {
    return setResult('scr-unable', 'Unable to assess', 'Too sedated — reassess when RASS ≥ −3.');
  }
  if (res === 'positive') {
    return setResult(
      'scr-pos',
      'Positive',
      `${tool} positive — delirium present (Feature 1 + 2 + [3 or 4]).`,
    );
  }
  return setResult(
    'scr-neg',
    'Negative',
    `${tool} negative. `,
    note('Delirium fluctuates — rescreen each shift and after any acute change.'),
  );
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
