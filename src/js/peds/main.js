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
import {
  evalCapd,
  evalCam,
  featurePresent,
  arousalGate,
  recommendScreen,
  capdBand,
} from './scoring.js';
import { CAPD_ITEMS, CAPD_FREQ, CAPD_DEV_DELAY_NOTE } from './data/capd.js';
import { CAM_BY_SCREEN } from './data/cam.js';
import { AROUSAL_SCALES } from './data/arousal.js';
import { RISK_FACTORS, RISK_GROUPS, derivedRiskIds } from './data/risk.js';

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
  arousal: '',
  arousalScale: 'rass',
  capd: {},
  cam: {},
  risk: {},
};

const fmtRass = (v) => String(v).replace('-', '−');
const badge = (cls, text) => el('span', { class: `scr-badge ${cls}`, text });
const note = (text) => el('span', { class: 'note', text });

const SVGNS = 'http://www.w3.org/2000/svg';
function svgIcon(id) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'fa');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVGNS, 'use');
  use.setAttribute('href', `#fa-${id}`);
  svg.append(use);
  return svg;
}

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

  const baseline = $('#prof-baseline').value;
  const delay = baseline === 'impaired';
  const devM = delay ? (toMonths($('#prof-dev').value, $('#prof-dev-unit').value) ?? ageM) : ageM;
  const weightKg = toMonths($('#prof-weight').value, 'm'); // kg, reuse positive-number parse

  state.profile = { ageM, devM, delay, baseline, weightKg, band: capdBand(devM) };
  const { recommended, alternatives } = recommendScreen({ chronoMonths: ageM, devMonths: devM });
  state.screen = recommended;
  state.alternatives = alternatives;

  document.body.dataset.screen = recommended;
  $('#pathway-picker').hidden = true;
  $('#workspace').hidden = false;
  renderHeader();
  renderCapd();
  renderCam();
  renderRisk();
  renderResult();
  window.scrollTo({ top: 0 });
}

function setScreen(key) {
  if (!SCREEN_NAMES[key]) return;
  state.screen = key;
  state.cam = {};
  document.body.dataset.screen = key;
  renderHeader();
  renderCam();
  renderResult();
}

function resetToProfile() {
  state.screen = '';
  state.arousal = '';
  state.arousalScale = 'rass';
  state.capd = {};
  state.cam = {};
  $$('.pseg-opt input, .ascale-opt input').forEach((i) => {
    i.checked = false;
  });
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
function arousalZone(v, comatose) {
  if (comatose.includes(String(v))) return 'coma';
  const n = Number(v);
  if (n >= 1) return 'agi';
  if (n === 0) return 'calm';
  return 'sed';
}

function renderArousalToggle() {
  const wrap = $('#arousal-scale');
  if (!wrap) return;
  wrap.replaceChildren(
    ...Object.values(AROUSAL_SCALES).map((s) => {
      const on = state.arousalScale === s.id;
      return el(
        'button',
        {
          type: 'button',
          class: `ascale-tab${on ? ' is-on' : ''}`,
          'data-act': 'arousalScale',
          'data-scale': s.id,
          'aria-pressed': on ? 'true' : 'false',
        },
        s.label,
      );
    }),
  );
}

function renderArousal() {
  renderArousalToggle();
  const box = $('#peds-arousal');
  if (!box) return;
  const scale = AROUSAL_SCALES[state.arousalScale];
  box.replaceChildren(
    ...scale.levels.map(({ v, label, marker }) => {
      const input = el('input', { type: 'radio', name: 'peds-arousal', value: v });
      input.setAttribute('data-screen-input', 'arousal');
      if (state.arousal === v) input.checked = true;
      const labelEl = el('span', { class: 'ascale-label' }, el('span', { text: label }));
      if (marker) labelEl.append(el('span', { class: 'ascale-marker', text: marker }));
      const row = el(
        'label',
        { class: 'ascale-opt', 'data-zone': arousalZone(v, scale.comatose) },
        input,
        el('span', { class: 'ascale-v', text: fmtRass(v) }),
        labelEl,
      );
      if (scale.comatose.includes(String(v))) {
        row.append(el('span', { class: 'ascale-tag', text: 'unable' }));
      }
      return row;
    }),
  );
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

// CAM state helpers — the model is the source of truth; every render reflects it.
function ensureCam(fid) {
  if (!state.cam[fid]) state.cam[fid] = { performed: false, errors: [] };
  return state.cam[fid];
}
function toggleCamError(fid, idx) {
  const f = ensureCam(fid);
  const at = f.errors.indexOf(idx);
  if (at >= 0) f.errors.splice(at, 1);
  else f.errors.push(idx);
  renderCam();
  renderResult();
}
function checkboxEl(dataKey, dataVal, checked, extra) {
  const c = el('input', { type: 'checkbox' });
  c.setAttribute(`data-${dataKey}`, dataVal);
  if (extra) for (const [k, v] of Object.entries(extra)) c.setAttribute(k, v);
  if (checked) c.checked = true;
  return c;
}

function featVerdict(present, text) {
  const cls = present == null ? 'fv-pending' : present ? 'fv-pos' : 'fv-neg';
  const label = present == null ? 'awaiting' : present ? 'present' : 'absent';
  return el(
    'p',
    { class: `feat-verdict ${cls}` },
    el('span', { class: 'fv-badge', text: label }),
    el('span', { text: ' ' + text }),
  );
}

function renderFeature(f) {
  const present = featurePresent(f, state.cam[f.id]);
  const fs = el(
    'fieldset',
    { class: 'cam-feat' },
    el('legend', { class: 'cam-feat-title', text: f.title }),
  );

  if (f.type === 'judgment') {
    if (f.help) fs.append(el('p', { class: 'anchor-hint', text: f.help }));
    const group = el('div', { class: 'pseg', role: 'radiogroup' });
    for (const o of [
      { v: 'yes', l: 'Yes' },
      { v: 'no', l: 'No' },
    ]) {
      const input = el('input', { type: 'radio', name: `cam-${f.id}`, value: o.v });
      input.setAttribute('data-cam-judgment', f.id);
      if (state.cam[f.id] === o.v) input.checked = true;
      group.append(el('label', { class: 'pseg-opt' }, input, el('span', { text: o.l })));
    }
    fs.append(group);
    return fs;
  }

  if (f.type === 'errors') {
    const cur = state.cam[f.id] || { performed: false, errors: [] };
    fs.append(el('p', { class: 'anchor-hint', text: f.task }));
    const compact = f.itemKind === 'letter' || f.itemKind === 'count';
    const grid = el('div', { class: compact ? 'errgrid' : 'errlist' });
    f.items.forEach((label, i) => {
      const on = cur.errors.includes(i);
      const chip = el('button', {
        type: 'button',
        class: `errchip${on ? ' is-err' : ''}${compact ? '' : ' errchip-row'}`,
        'data-cam-err': f.id,
        'data-idx': i,
        'aria-pressed': on ? 'true' : 'false',
      });
      chip.append(el('span', { class: 'errchip-n', text: compact ? label : String(i + 1) }));
      if (!compact) chip.append(el('span', { class: 'errchip-t', text: label }));
      grid.append(chip);
    });
    fs.append(grid);
    const n = cur.errors.length;
    fs.append(
      el(
        'label',
        { class: 'chk cam-perf' },
        checkboxEl('cam-performed', f.id, cur.performed),
        el('span', { text: `Task performed — ${n} error${n === 1 ? '' : 's'}` }),
      ),
    );
    fs.append(featVerdict(present, f.verdict));
    return fs;
  }

  // compound (psCAM Feature 4)
  const cur = state.cam[f.id] || { performed: false };
  fs.append(el('p', { class: 'anchor-hint', text: f.help }));
  const list = el('div', { class: 'cam-parts' });
  for (const p of f.parts) {
    list.append(
      el(
        'label',
        { class: 'chk' },
        checkboxEl('cam-part', f.id, cur[p.id], { 'data-part': p.id }),
        el('span', { text: p.label }),
      ),
    );
  }
  fs.append(list);
  fs.append(
    el(
      'label',
      { class: 'chk cam-perf' },
      checkboxEl('cam-performed', f.id, cur.performed),
      el('span', { text: 'Assessed' }),
    ),
  );
  fs.append(featVerdict(present, f.verdict));
  return fs;
}

function renderCam() {
  const box = $('#cam-features');
  if (!box) return;
  const data = CAM_BY_SCREEN[state.screen];
  if (!data) {
    box.replaceChildren();
    return;
  }
  box.replaceChildren(...data.features.map(renderFeature));
}

// ── Risk (reactive to the child profile) ──────────────────────────────────────
function riskCard(f, isDerived) {
  const cb = el('input', { type: 'checkbox' });
  cb.setAttribute('data-risk', f.id);
  if (isDerived || state.risk[f.id]) cb.checked = true;
  const top = el(
    'label',
    { class: 'risk-card-top' },
    cb,
    el('strong', { class: 'risk-card-label', text: f.label }),
    el('span', {
      class: `ev-tag${f.evidence === 'established' ? ' ev-est' : ''}`,
      text: f.evidence,
    }),
  );
  if (isDerived) top.append(el('span', { class: 'risk-from', text: 'from profile' }));
  return el(
    'div',
    { class: `risk-card${isDerived ? ' is-derived' : ''}` },
    top,
    el('p', { class: 'risk-detail', text: f.detail }),
  );
}

function renderRisk() {
  const box = $('#risk-content');
  if (!box) return;
  const derived = new Set(derivedRiskIds(state.profile));
  const kids = [];
  if (derived.size) {
    const flagged = RISK_FACTORS.filter((f) => derived.has(f.id));
    kids.push(
      el(
        'div',
        { class: 'risk-flagged' },
        el(
          'div',
          { class: 'risk-flagged-head' },
          svgIcon('circle-exclamation'),
          el('span', { text: " Flagged from this child's profile" }),
        ),
        el(
          'div',
          { class: 'risk-flagged-list' },
          ...flagged.map((f) => el('span', { class: 'risk-chip', text: f.label })),
        ),
      ),
    );
  }
  for (const g of RISK_GROUPS) {
    const grid = el(
      'div',
      { class: 'risk-grid' },
      ...RISK_FACTORS.filter((f) => f.group === g.id).map((f) => riskCard(f, derived.has(f.id))),
    );
    kids.push(el('div', { class: 'card' }, el('div', { class: 'card-head' }, g.title), grid));
  }
  box.replaceChildren(...kids);
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

// Anchor the result to this child's stated baseline, not a generic norm.
function baselineQualifier() {
  const b = state.profile.baseline;
  if (b === 'impaired') return ' — relative to this child’s own baseline';
  if (b === 'unknown')
    return ' — confirm against the child’s usual state (baseline not established)';
  return '';
}

// A positive screen routes forward: rule out withdrawal, then act on precipitants.
function positiveActions() {
  return [
    el(
      'div',
      { class: 'result-actions' },
      el(
        'p',
        { class: 'wat1-prompt' },
        svgIcon('triangle-exclamation'),
        el('span', {
          text: ' Withdrawal can mimic delirium — if the child is on or weaning prolonged opioids or benzodiazepines, assess for iatrogenic withdrawal (e.g. WAT-1).',
        }),
      ),
      el(
        'p',
        { class: 'act-next' },
        svgIcon('hand-holding-heart'),
        el('span', {
          text: ' Next — review and minimize modifiable precipitants in Risk Factors and Prevention.',
        }),
      ),
    ),
  ];
}

function renderResult() {
  const screen = state.screen;
  const scaleLabel = AROUSAL_SCALES[state.arousalScale].label;
  const gate = arousalGate(state.arousalScale, state.arousal);

  if (gate == null) {
    return setResult('scr-pending', 'Awaiting', 'Record an arousal level to begin.');
  }
  if (gate === 'unable') {
    const floor = state.arousalScale === 'sbs' ? 'SBS ≥ −1' : 'RASS ≥ −3';
    return setResult(
      'scr-unable',
      'Unable to assess',
      `${scaleLabel} ${fmtRass(state.arousal)} — comatose / too sedated to screen. Reassess when the child responds to voice (${floor}).`,
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
          `CAPD ${r.score}/32 (≥ 9) — delirium screen positive${baselineQualifier()}.`,
          ...devDelayNote(),
          ...positiveActions(),
        )
      : setResult(
          'scr-neg',
          'Negative',
          `CAPD ${r.score}/32 (< 9)${baselineQualifier()}.`,
          ...devDelayNote(),
        );
  }

  const tool = SCREEN_NAMES[screen];
  const data = CAM_BY_SCREEN[screen];
  const resolved = {};
  for (const f of data.features) resolved[f.id] = featurePresent(f, state.cam[f.id]);
  const res = evalCam(resolved);
  if (res == null) {
    return setResult(
      'scr-pending',
      'In progress',
      `Complete Feature 1, Feature 2, and a secondary feature to score the ${tool}.`,
    );
  }
  return res === 'positive'
    ? setResult(
        'scr-pos',
        'Positive',
        `${tool} positive — delirium present (Feature 1 + 2 + [3 or 4])${baselineQualifier()}.`,
        ...positiveActions(),
      )
    : setResult('scr-neg', 'Negative', `${tool} negative${baselineQualifier()}.`);
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
    if (a === 'arousalScale') {
      state.arousalScale = act.dataset.scale;
      state.arousal = '';
      renderArousal();
      renderResult();
      return;
    }
  }
  const errchip = e.target.closest('[data-cam-err]');
  if (errchip) return toggleCamError(errchip.dataset.camErr, Number(errchip.dataset.idx));
  const tabBtn = e.target.closest('.tab-btn[data-tab]');
  if (tabBtn) showTab(tabBtn.dataset.tab);
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.prof === 'baseline') {
    const row = $('#prof-dev-row');
    if (row) row.hidden = t.value !== 'impaired';
    return;
  }
  if (t.dataset.risk) {
    state.risk[t.dataset.risk] = t.checked;
    return;
  }
  if (t.dataset.screenInput === 'arousal') {
    state.arousal = t.value;
  } else if (t.dataset.capd != null) {
    state.capd[t.dataset.capd] = t.value;
  } else if (t.dataset.camJudgment) {
    state.cam[t.dataset.camJudgment] = t.value;
  } else if (t.dataset.camPerformed) {
    ensureCam(t.dataset.camPerformed).performed = t.checked;
    renderCam();
  } else if (t.dataset.camPart) {
    ensureCam(t.dataset.camPart)[t.dataset.part] = t.checked;
    renderCam();
  } else {
    return;
  }
  renderResult();
});

renderArousal();
