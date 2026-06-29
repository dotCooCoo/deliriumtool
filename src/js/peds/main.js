/**
 * peds/main.js — bootstrap for the pediatric tool (/peds/).
 *
 * Delegated listeners, data-* attributes, no inline handlers and no globals, so
 * the strict CSP (script-src 'self') holds. The flow starts from a de-identified
 * child profile, which derives the recommended screen and anchors every CAPD item
 * to the child's developmental age band. Controls are built with safe DOM APIs
 * (createElement + textContent) — no HTML strings are parsed. Clinical logic lives
 * in ./scoring.js and ./data/.
 */
import { evalCapd, evalCam, arousalGate, recommendScreen, capdBand } from './scoring.js';
import { CAPD_ITEMS, CAPD_FREQ, CAPD_DEV_DELAY_NOTE } from './data/capd.js';
import { CAM_BY_SCREEN } from './data/cam.js';
import { RASS_LEVELS } from './data/arousal.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

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

const SCREEN_NAMES = { capd: 'CAPD', pcam: 'pCAM-ICU', pscam: 'psCAM-ICU' };

const state = {
  profile: { ageM: null, devM: null, delay: false, weightKg: null, band: null },
  screen: '',
  alternatives: [],
  rass: '',
  capd: {},
  cam: {},
};

const fmtRass = (v) => String(v).replace('-', '−');
const badge = (cls, text) => el('span', { class: `scr-badge ${cls}`, text });
const note = (text) => el('span', { class: 'note', text });

function toMonths(value, unit) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return unit === 'y' ? n * 12 : n;
}

function ageLabel(months) {
  if (months == null) return '';
  if (months < 24) return `${Math.round(months)} mo`;
  return `${Math.round(months / 12)} yr`;
}

// ── Profile gate ──────────────────────────────────────────────────────────────
function deriveScreen() {
  const ageM = toMonths($('#prof-age').value, $('#prof-age-unit').value);
  const errEl = $('#prof-error');
  if (ageM == null) {
    if (errEl) errEl.hidden = false;
    $('#prof-age').focus();
    return;
  }
  if (errEl) errEl.hidden = true;

  const delay = $('input[data-prof="delay"]').checked;
  const devM = delay ? (toMonths($('#prof-dev').value, $('#prof-dev-unit').value) ?? ageM) : ageM;
  const weightKg = toMonths($('#prof-weight').value, 'm'); // kg, reuse positive-number parse

  state.profile = { ageM, devM, delay, weightKg, band: capdBand(devM) };
  const { recommended, alternatives } = recommendScreen({ chronoMonths: ageM, devMonths: devM });
  state.screen = recommended;
  state.alternatives = alternatives;

  document.body.dataset.screen = recommended;
  $('#pathway-picker').hidden = true;
  $('#workspace').hidden = false;
  renderHeader();
  renderCapd();
  renderCam();
  renderResult();
  window.scrollTo({ top: 0 });
}

function setScreen(key) {
  if (!SCREEN_NAMES[key]) return;
  state.screen = key;
  document.body.dataset.screen = key;
  renderHeader();
  renderCam();
  renderResult();
}

function resetToProfile() {
  state.screen = '';
  state.rass = '';
  state.capd = {};
  state.cam = {};
  $$('.pseg-opt input').forEach((i) => {
    i.checked = false;
  });
  const rass = $('#peds-rass');
  if (rass) rass.value = '';
  delete document.body.dataset.screen;
  $('#workspace').hidden = true;
  $('#pathway-picker').hidden = false;
}

// ── Header (persistent child context) ─────────────────────────────────────────
function renderHeader() {
  const nameEl = $('#pathway-name');
  if (nameEl) nameEl.textContent = SCREEN_NAMES[state.screen] || '';
  const ctx = $('#child-context');
  if (ctx) {
    const p = state.profile;
    const bits = [`Age ${ageLabel(p.ageM)}`];
    if (p.delay && p.devM != null) bits.push(`dev ~${ageLabel(p.devM)}`);
    if (p.weightKg) bits.push(`${p.weightKg} kg`);
    ctx.textContent = bits.join(' · ');
  }
  const alts = $('#screen-alts');
  if (alts) {
    alts.replaceChildren(
      ...state.alternatives
        .filter((a) => a !== state.screen)
        .map((a) =>
          el(
            'button',
            { class: 'btn btn-ghost btn-sm', 'data-act': 'switchScreen', 'data-screen': a },
            `Use ${SCREEN_NAMES[a]}`,
          ),
        ),
    );
  }
}

// ── Control rendering ─────────────────────────────────────────────────────────
function renderRass() {
  const sel = $('#peds-rass');
  if (!sel) return;
  for (const { v, label } of RASS_LEVELS) {
    sel.append(el('option', { value: v, text: `${fmtRass(v)} · ${label}` }));
  }
}

function segRow(legend, name, dataKey, options, hint) {
  const group = el('div', { class: 'pseg', role: 'radiogroup' });
  for (const o of options) {
    const input = el('input', { type: 'radio', name, value: o.value });
    input.setAttribute(`data-${dataKey}`, o.key);
    group.append(el('label', { class: 'pseg-opt' }, input, el('span', { text: o.label })));
  }
  const fs = el(
    'fieldset',
    { class: 'pseg-row' },
    el('legend', { class: 'pseg-legend', text: legend }),
  );
  if (hint) fs.append(el('p', { class: 'anchor-hint', text: hint }));
  fs.append(group);
  return fs;
}

function renderCapd() {
  const box = $('#capd-items');
  if (!box) return;
  const band = state.profile.band;
  box.replaceChildren(
    ...CAPD_ITEMS.map((item) => {
      const anchor = band ? item.anchors[band] : null;
      const hint = anchor ? `${item.reverse ? 'Age-expected' : 'Concerning'}: ${anchor}` : null;
      return segRow(
        item.text,
        `capd-${item.id}`,
        'capd',
        CAPD_FREQ.map((label, i) => ({ value: i, key: item.id, label })),
        hint,
      );
    }),
  );
}

function renderCam() {
  const box = $('#cam-features');
  if (!box) return;
  const data = CAM_BY_SCREEN[state.screen];
  if (!data) {
    box.replaceChildren();
    return;
  }
  box.replaceChildren(
    ...data.features.map((f) =>
      segRow(
        f.title,
        `cam-${f.id}`,
        'cam',
        [
          { value: 'yes', key: f.id, label: 'Yes' },
          { value: 'no', key: f.id, label: 'No' },
        ],
        f.help,
      ),
    ),
  );
}

// ── Result ────────────────────────────────────────────────────────────────────
function setResult(badgeCls, badgeText, ...rest) {
  const out = $('#screen-result');
  if (!out) return;
  out.replaceChildren(badge(badgeCls, badgeText), ' ', ...rest);
}

function devDelayNote() {
  return state.profile.delay ? [' ', note(CAPD_DEV_DELAY_NOTE)] : [];
}

function renderResult() {
  const screen = state.screen;
  const gate = arousalGate('rass', state.rass);

  if (gate == null) {
    return setResult('scr-pending', 'Awaiting', 'Record an arousal level (RASS) to begin.');
  }
  if (gate === 'unable') {
    return setResult(
      'scr-unable',
      'Unable to assess',
      `RASS ${fmtRass(state.rass)} — comatose / too sedated to screen. Reassess when the child responds to voice (RASS ≥ −3).`,
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
          `CAPD ${r.score}/32 (≥ 9) — delirium screen positive.`,
          ...devDelayNote(),
        )
      : setResult('scr-neg', 'Negative', `CAPD ${r.score}/32 (< 9).`, ...devDelayNote());
  }

  const tool = SCREEN_NAMES[screen];
  const res = evalCam({ ...state.cam });
  if (res == null) {
    return setResult(
      'scr-pending',
      'In progress',
      `Answer Feature 1 and 2 (and a secondary feature) to complete the ${tool}.`,
    );
  }
  return res === 'positive'
    ? setResult(
        'scr-pos',
        'Positive',
        `${tool} positive — delirium present (Feature 1 + 2 + [3 or 4]).`,
      )
    : setResult('scr-neg', 'Negative', `${tool} negative.`);
}

function showTab(tab) {
  $$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
}

// ── Dispatch ──────────────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'deriveScreen') return deriveScreen();
    if (a === 'reset') return resetToProfile();
    if (a === 'switchScreen') return setScreen(act.dataset.screen);
  }
  const tabBtn = e.target.closest('.tab-btn[data-tab]');
  if (tabBtn) showTab(tabBtn.dataset.tab);
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.prof === 'delay') {
    const row = $('#prof-dev-row');
    if (row) row.hidden = !t.checked;
    return;
  }
  if (t.dataset.screenInput === 'rass') state.rass = t.value;
  else if (t.dataset.capd != null) state.capd[t.dataset.capd] = t.value;
  else if (t.dataset.cam != null) state.cam[t.dataset.cam] = t.value;
  else return;
  renderResult();
});

renderRass();
