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
  pictureErrors,
  arousalGate,
  recommendScreen,
  capdBand,
} from './scoring.js';
import { CAPD_ITEMS, CAPD_FREQ, CAPD_DEV_DELAY_NOTE } from './data/capd.js';
import { CAM_BY_SCREEN } from './data/cam.js';
import { stimArt } from '../templates/stim-art.js';
import { AROUSAL_SCALES } from './data/arousal.js';
import { RISK_FACTORS, RISK_GROUPS, derivedRiskIds } from './data/risk.js';
import { MEDS } from './data/meds.js';
import { REFS } from './data/refs.js';
import { generateReport } from './report.js';
import { faIcon, wireTablist, applyGlossary, el, $, $$ } from '../shared/dom.js';
import { localInput } from '../shared/time.js';
import { initA11y } from '../shared/a11y.js';
import {
  autosave,
  flushSave,
  loadSaved,
  clearSaved,
  exportJSON,
  importJSON,
  saveSettings,
  loadSettings,
  exportSettings,
  importSettings,
  EXAMPLE,
  EXAMPLE_SETTINGS,
} from './persist.js';

const SCREEN_NAMES = { capd: 'CAPD', pcam: 'pCAM-ICU', pscam: 'psCAM-ICU' };

// Acronym tooltips — the first occurrence per tab is wrapped in <abbr title="…">.
const PEDS_GLOSSARY = {
  CAPD: 'Cornell Assessment of Pediatric Delirium',
  'psCAM-ICU': 'Preschool Confusion Assessment Method for the ICU',
  'pCAM-ICU': 'Pediatric Confusion Assessment Method for the ICU',
  RASS: 'Richmond Agitation-Sedation Scale',
  SBS: 'State Behavioral Scale',
  'WAT-1': 'Withdrawal Assessment Tool-1',
  PICU: 'Pediatric Intensive Care Unit',
};

const state = {
  profile: { ageM: null, devM: null, delay: false, weightKg: null, band: null },
  assessedAt: '',
  assessor: '',
  activeTab: 'screen',
  screen: '',
  alternatives: [],
  arousal: '',
  arousalScale: 'rass',
  capd: {},
  cam: {},
  risk: {},
  prevention: {},
  medsGiven: {},
};

const fmtRass = (v) => String(v).replace('-', '−');
// Status glyphs so verdicts/zones read by shape, not color alone (WCAG).
const BADGE_ICONS = {
  'scr-pos': 'circle-exclamation',
  'scr-neg': 'circle-check',
  'scr-pending': 'circle-info',
  'scr-unable': 'triangle-exclamation',
};
const FV_ICONS = {
  'fv-pos': 'circle-exclamation',
  'fv-neg': 'circle-check',
  'fv-pending': 'circle-info',
};
const ZONE_ICONS = {
  agi: 'triangle-exclamation',
  calm: 'circle-check',
  sed: 'moon',
  coma: 'bed-pulse',
};
const badge = (cls, text) => {
  const b = el('span', { class: `scr-badge ${cls}` });
  if (BADGE_ICONS[cls]) b.append(svgIcon(BADGE_ICONS[cls]));
  b.append(el('span', { text }));
  return b;
};
const note = (text) => el('span', { class: 'note', text });

const svgIcon = (id) => faIcon(`fa-${id}`);

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

// ── Facility settings (Setup tab; persisted separately, survive "new child") ───
function readSettings() {
  const out = {};
  $$('[data-set]').forEach((el) => {
    out[el.dataset.set] = el.value;
  });
  return out;
}
function applySettings(obj) {
  if (!obj || typeof obj !== 'object') return;
  $$('[data-set]').forEach((el) => {
    if (typeof obj[el.dataset.set] === 'string') el.value = obj[el.dataset.set];
  });
}

// ── Restore a saved / imported / example assessment onto the workspace ─────────
function fillProfileForm() {
  const p = state.profile;
  const set = (sel, v) => {
    const e = $(sel);
    if (e) e.value = v;
  };
  // Restore the same unit the value was entered in (months vs years).
  const ageUnit = p.ageUnit === 'y' ? 'y' : 'm';
  const devUnit = p.devUnit === 'y' ? 'y' : 'm';
  set('#prof-age', p.ageM != null ? (ageUnit === 'y' ? p.ageM / 12 : p.ageM) : '');
  set('#prof-age-unit', ageUnit);
  set('#prof-baseline', p.baseline || 'typical');
  set('#prof-weight', p.weightKg != null ? p.weightKg : '');
  const dr = $('#prof-dev-row');
  if (dr) dr.hidden = p.baseline !== 'impaired';
  set('#prof-dev', p.delay && p.devM != null ? (devUnit === 'y' ? p.devM / 12 : p.devM) : '');
  set('#prof-dev-unit', devUnit);
  const g = $('[data-prof="glasses"]');
  if (g) g.checked = !!p.glasses;
  const h = $('[data-prof="hearing"]');
  if (h) h.checked = !!p.hearing;
}

function syncAssessed() {
  const af = $('#peds-assessed');
  if (af) af.value = state.assessedAt || '';
  const ab = $('#peds-assessor');
  if (ab) ab.value = state.assessor || '';
}

function applyState(snap) {
  if (!snap || !snap.profile || snap.profile.ageM == null) return;
  // Recompute the CAPD developmental band from devM rather than trusting a saved or
  // hand-edited value, so the age-banded anchor hints never silently disappear.
  state.profile = { ...snap.profile, band: capdBand(snap.profile.devM) };
  state.screen = snap.screen || 'capd';
  // Recompute the applicable screens from the profile (incl. the recommended) so a
  // restored or example assessment can always switch between screens, both ways.
  const rec = recommendScreen({ chronoMonths: snap.profile.ageM, devMonths: snap.profile.devM });
  state.alternatives = [rec.recommended, ...rec.alternatives];
  state.arousal = typeof snap.arousal === 'string' ? snap.arousal : '';
  state.arousalScale = snap.arousalScale === 'sbs' ? 'sbs' : 'rass';
  state.capd = snap.capd && typeof snap.capd === 'object' ? snap.capd : {};
  state.cam = snap.cam && typeof snap.cam === 'object' ? snap.cam : {};
  state.risk = snap.risk && typeof snap.risk === 'object' ? snap.risk : {};
  state.medsGiven = snap.medsGiven && typeof snap.medsGiven === 'object' ? snap.medsGiven : {};
  state.prevention = snap.prevention && typeof snap.prevention === 'object' ? snap.prevention : {};
  state.assessedAt = snap.assessedAt || localInput();
  state.assessor = typeof snap.assessor === 'string' ? snap.assessor : '';
  state.activeTab = typeof snap.activeTab === 'string' ? snap.activeTab : 'screen';
  fillProfileForm();
  document.body.dataset.screen = state.screen;
  $('#pathway-picker').hidden = true;
  $('#workspace').hidden = false;
  $('#skip-link')?.setAttribute('href', '#workspace');
  renderHeader();
  renderArousal();
  renderCapd();
  renderCam();
  renderRisk();
  renderMedsGiven();
  reflectPrevention();
  syncAssessed();
  renderResult();
  decorateHeads();
  updateTabBadges();
  showTab(state.activeTab);
}

function clearAll() {
  state.profile = { ageM: null, devM: null, delay: false, weightKg: null, band: null };
  state.screen = '';
  state.alternatives = [];
  state.arousal = '';
  state.arousalScale = 'rass';
  state.capd = {};
  state.cam = {};
  state.risk = {};
  state.medsGiven = {};
  state.prevention = {};
  state.assessedAt = '';
  state.assessor = '';
  clearSaved();
  reflectPrevention();
  syncAssessed();
  showTab('screen');
  ['#prof-age', '#prof-dev', '#prof-weight'].forEach((s) => {
    const e = $(s);
    if (e) e.value = '';
  });
  ['[data-prof="glasses"]', '[data-prof="hearing"]'].forEach((s) => {
    const e = $(s);
    if (e) e.checked = false;
  });
  const b = $('#prof-baseline');
  if (b) b.value = 'typical';
  const dr = $('#prof-dev-row');
  if (dr) dr.hidden = true;
  delete document.body.dataset.screen;
  $('#workspace').hidden = true;
  $('#pathway-picker').hidden = false;
  $('#skip-link')?.setAttribute('href', '#pathway-picker');
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
  if (!state.assessedAt) state.assessedAt = localInput();

  const baseline = $('#prof-baseline').value;
  const delay = baseline === 'impaired';
  const devM = delay ? (toMonths($('#prof-dev').value, $('#prof-dev-unit').value) ?? ageM) : ageM;
  const weightKg = toMonths($('#prof-weight').value, 'm'); // kg, reuse positive-number parse

  const glasses = !!$('[data-prof="glasses"]')?.checked;
  const hearing = !!$('[data-prof="hearing"]')?.checked;
  // Remember whether age / developmental age were entered in months or years so the
  // form round-trips the same way it was filled in.
  const ageUnit = $('#prof-age-unit').value === 'y' ? 'y' : 'm';
  const devUnit = $('#prof-dev-unit').value === 'y' ? 'y' : 'm';
  const prevScreen = state.screen;
  const prevAgeM = state.profile?.ageM;
  state.profile = {
    ageM,
    devM,
    delay,
    baseline,
    weightKg,
    band: capdBand(devM),
    glasses,
    hearing,
    ageUnit,
    devUnit,
  };
  const wasFresh = !prevScreen; // a first derive vs re-deriving via "Edit child"
  const { recommended, alternatives } = recommendScreen({ chronoMonths: ageM, devMonths: devM });
  state.screen = recommended;
  // Keep every applicable screen (incl. the recommended) so the header can always
  // offer the others — switching to an alternative must still let you switch back.
  state.alternatives = [recommended, ...alternatives];
  // A minor "Edit child" tweak (same age, same recommended screen) keeps the
  // assessment; but changing the age or landing on a different screen means a
  // materially different child, so clear the instrument answers that no longer
  // apply — otherwise the Result would show a stale verdict for a child never
  // observed with that instrument.
  const childChanged = !wasFresh && (recommended !== prevScreen || ageM !== prevAgeM);
  if (wasFresh) {
    state.arousalScale = readSettings().scale === 'sbs' ? 'sbs' : 'rass';
  }
  if (wasFresh || childChanged) {
    state.arousal = '';
    state.capd = {};
    state.cam = {};
    // A child who uses glasses or hearing aids → default the sensory-aids item on.
    if (glasses || hearing) state.prevention.sensory = true;
  }

  document.body.dataset.screen = recommended;
  $('#pathway-picker').hidden = true;
  $('#workspace').hidden = false;
  $('#skip-link')?.setAttribute('href', '#workspace');
  renderHeader();
  renderArousal();
  renderCapd();
  renderCam();
  renderRisk();
  renderMedsGiven();
  reflectPrevention();
  syncAssessed();
  renderResult();
  decorateHeads();
  updateTabBadges();
  autosave(state);
  window.scrollTo({ top: 0 });
}

function setScreen(key) {
  if (!SCREEN_NAMES[key]) return;
  state.screen = key;
  // Keep entered CAM features when switching screens — the alternatives only ever
  // offer CAPD plus one applicable CAM screen, so switching must not lose work.
  document.body.dataset.screen = key;
  renderHeader();
  renderCam();
  renderResult();
  autosave(state);
}

// "Edit child" — return to the (populated) profile form, keeping the assessment.
function resetToProfile() {
  fillProfileForm();
  $('#workspace').hidden = true;
  $('#pathway-picker').hidden = false;
  $('#skip-link')?.setAttribute('href', '#pathway-picker');
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
    const others = state.alternatives.filter((a) => a !== state.screen);
    // Make switching screens obvious: a labelled "Other screens:" group with a
    // clear button per applicable screen (the pCAM-ICU picture task lives behind
    // this switch, so a faint control here hides the whole feature).
    alts.replaceChildren(
      ...(others.length ? [el('span', { class: 'screen-alts__label', text: 'Other screens:' })] : []),
      ...others.map((a) =>
        el(
          'button',
          {
            class: 'btn btn-sec btn-sm scr-switch',
            'data-act': 'switchScreen',
            'data-screen': a,
            title: `Switch this child's screen to ${SCREEN_NAMES[a]}`,
          },
          `Switch to ${SCREEN_NAMES[a]}`,
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
      const zone = arousalZone(v, scale.comatose);
      const row = el(
        'label',
        { class: 'ascale-opt', 'data-zone': zone },
        input,
        svgIcon(ZONE_ICONS[zone]),
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

function segRow(legend, name, dataKey, options, hint, selected) {
  const group = el('div', { class: 'pseg', role: 'radiogroup' });
  for (const o of options) {
    const input = el('input', { type: 'radio', name, value: o.value });
    input.setAttribute(`data-${dataKey}`, o.key);
    if (selected != null && String(o.value) === String(selected)) input.checked = true;
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
        state.capd[item.id],
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
  autosave(state);
}
function ensureCamPicture(fid) {
  const f = ensureCam(fid);
  if (!f.picture) f.picture = { performed: false, marks: {} };
  if (!f.picture.marks) f.picture.marks = {};
  return f.picture;
}
// Record the child's answer for one recognition picture. Inline, tapping the
// current answer again clears it (toggle); from the present modal a pick always
// sets. Errors are derived (answer vs. the picture's truth).
function setCamPicture(fid, idx, ans, { toggle = true } = {}) {
  const pic = ensureCamPicture(fid);
  if (toggle && pic.marks[idx] === ans) delete pic.marks[idx];
  else pic.marks[idx] = ans;
  renderCam();
  renderResult();
  autosave(state);
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
    el('span', { class: 'fv-badge' }, svgIcon(FV_ICONS[cls]), el('span', { text: label })),
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
    // When a picture alternative is offered, label the two tasks so the clinician
    // sees they are alternatives (either at threshold makes the feature positive).
    if (f.picture && f.taskLabel) {
      fs.append(el('p', { class: 'cam-subhead', text: f.taskLabel }));
    }
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
    if (f.alt) {
      fs.append(
        el(
          'label',
          { class: 'chk' },
          checkboxEl('cam-part', f.id, Boolean(cur[f.alt.id]), { 'data-part': f.alt.id }),
          el('span', { text: f.alt.label }),
        ),
      );
    }
    const n = cur.errors.length;
    fs.append(
      el(
        'label',
        { class: 'chk cam-perf' },
        checkboxEl('cam-performed', f.id, cur.performed),
        el('span', { text: `Task performed — ${n} error${n === 1 ? '' : 's'}` }),
      ),
    );
    if (f.picture) fs.append(renderPictureTask(f, cur));
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

// A picture "chip" that shows the artwork and, on tap, opens the present modal
// at that picture. data-pos indexes the present playlist: the memory pictures
// first, then the ten recognition pictures.
function pictureButton(f, id, name, pos, cls) {
  const art = stimArt(id, 'b');
  return el(
    'button',
    {
      type: 'button',
      class: `cam-pic-art ${cls} cam-pic-artbtn`,
      'data-cam-present': f.id,
      'data-pos': pos,
      'aria-label': `Show ${name} to the child`,
    },
    art || el('span', { text: name }),
  );
}

// The memory-pictures alternative to the squeeze-on-A letters (pCAM Feature 2):
// show the five memory pictures, then step through all ten and mark whether the
// child recognised each. Tapping any picture (or "Present to child") opens a
// large modal to turn toward the bed and pick Seen/New there; the same marks can
// be set inline. Errors (a wrong "seen"/"new" call) are scored live and feed the
// same Feature-2 verdict as the letters.
function renderPictureTask(f, cur) {
  const pic = cur.picture || { performed: false, marks: {} };
  const marks = pic.marks || {};
  const memLen = f.picture.memory.length;
  const wrap = el('div', { class: 'cam-pic' });
  wrap.append(
    el(
      'div',
      { class: 'cam-pic-head' },
      el('p', { class: 'cam-subhead', text: 'Pictures — for children who can’t squeeze' }),
      el(
        'button',
        {
          type: 'button',
          class: 'btn btn-sm cam-pic-present',
          'data-cam-present': f.id,
          'data-pos': 0,
        },
        svgIcon('eye'),
        el('span', { text: 'Present to child' }),
      ),
    ),
  );

  wrap.append(el('p', { class: 'anchor-hint', text: f.picture.memoryNote }));
  const mem = el('div', { class: 'cam-pic-memory' });
  f.picture.memory.forEach((c, i) => {
    mem.append(
      el(
        'div',
        { class: 'cam-pic-cell' },
        pictureButton(f, c.id, c.name, i, ''),
        el('span', { class: 'cam-pic-name', text: c.name }),
      ),
    );
  });
  wrap.append(mem);

  wrap.append(el('p', { class: 'anchor-hint', text: f.picture.recognitionNote }));
  const pad = el('div', { class: 'cam-pic-pad' });
  f.picture.sequence.forEach((p, i) => {
    const row = el('div', { class: 'cam-pic-row' });
    row.append(el('span', { class: 'cam-pic-idx', text: String(i + 1) }));
    row.append(pictureButton(f, p.id, p.name, memLen + i, 'cam-pic-art--sm'));
    row.append(el('span', { class: 'cam-pic-name', text: p.name }));
    const choose = el('div', {
      class: 'cam-pic-choose',
      role: 'group',
      'aria-label': `${p.name} — did the child see it before?`,
    });
    for (const o of [
      { v: 'seen', l: 'Seen' },
      { v: 'new', l: 'New' },
    ]) {
      const on = marks[i] === o.v;
      choose.append(
        el(
          'button',
          {
            type: 'button',
            class: `cam-pic-opt${on ? ' is-on' : ''}`,
            'data-cam-pic': f.id,
            'data-idx': i,
            'data-ans': o.v,
            'aria-pressed': on ? 'true' : 'false',
          },
          el('span', { text: o.l }),
        ),
      );
    }
    row.append(choose);
    pad.append(row);
  });
  wrap.append(pad);

  const nErr = pictureErrors(f, { picture: pic });
  wrap.append(
    el(
      'label',
      { class: 'chk cam-perf' },
      checkboxEl('cam-pic-performed', f.id, pic.performed),
      el('span', { text: `Picture task performed — ${nErr} error${nErr === 1 ? '' : 's'}` }),
    ),
  );
  return wrap;
}

// ── Picture present modal ────────────────────────────────────────────────────
// A large, one-picture-at-a-time view to turn toward the child. The playlist is
// the five memory pictures (memorize), then the ten recognition pictures where
// Seen/New is picked in the modal and auto-advances. Modal state is transient UI
// (not part of the serialized assessment); it lives in a body-level root so the
// feature list re-rendering underneath never destroys it.
let presentCtx = null; // { fid, f, steps, pos } while open, else null
let presentReturnFocus = null;

function presentSteps(f) {
  const mem = f.picture.memory.map((c) => ({ kind: 'memorize', id: c.id, name: c.name }));
  const rec = f.picture.sequence.map((p, i) => ({ kind: 'recognize', id: p.id, name: p.name, idx: i }));
  return mem.concat(rec);
}

function presentRoot() {
  let root = document.getElementById('cam-present-root');
  if (!root) {
    root = el('div', { id: 'cam-present-root' });
    document.body.append(root);
  }
  return root;
}

function openPresent(fid, pos) {
  const f = (CAM_BY_SCREEN[state.screen]?.features || []).find((x) => x.id === fid);
  if (!f || !f.picture) return;
  const steps = presentSteps(f);
  presentReturnFocus = document.activeElement;
  presentCtx = { fid, f, steps, pos: Math.max(0, Math.min(pos, steps.length - 1)) };
  document.body.classList.add('cam-modal-open');
  renderPresent();
}

function closePresent() {
  presentCtx = null;
  presentRoot().replaceChildren();
  document.body.classList.remove('cam-modal-open');
  // The trigger was likely rebuilt by renderCam; return focus to the task's
  // Present button, falling back to the original trigger if it still exists.
  const back = document.querySelector('.cam-pic-present');
  if (back) back.focus();
  else if (presentReturnFocus && document.contains(presentReturnFocus)) presentReturnFocus.focus();
  presentReturnFocus = null;
}

function presentNav(delta) {
  if (!presentCtx) return;
  const next = presentCtx.pos + delta;
  if (next < 0) return;
  if (next >= presentCtx.steps.length) return closePresent(); // "Done" past the last
  presentCtx.pos = next;
  renderPresent();
}

function presentSelect(ans) {
  if (!presentCtx) return;
  const step = presentCtx.steps[presentCtx.pos];
  if (step.kind !== 'recognize') return;
  setCamPicture(presentCtx.fid, step.idx, ans, { toggle: false });
  if (presentCtx.pos >= presentCtx.steps.length - 1) {
    ensureCamPicture(presentCtx.fid).performed = true; // finishing the last picture completes the task
    renderCam();
    renderResult();
    autosave(state);
    return closePresent();
  }
  presentCtx.pos += 1;
  renderPresent();
}

function renderPresent() {
  const root = presentRoot();
  if (!presentCtx) {
    root.replaceChildren();
    return;
  }
  const { fid, f, steps, pos } = presentCtx;
  const step = steps[pos];
  const isRec = step.kind === 'recognize';
  const marks = (state.cam[fid] && state.cam[fid].picture && state.cam[fid].picture.marks) || {};
  const phaseText = isRec
    ? `Recognition — ${step.idx + 1} of ${f.picture.sequence.length}`
    : `Memorize — ${pos + 1} of ${f.picture.memory.length}`;

  const box = el('div', {
    class: 'cam-modal-box',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Picture attention task',
  });
  box.append(
    el(
      'div',
      { class: 'cam-modal-head' },
      el('span', { class: 'cam-modal-phase', text: phaseText }),
      el(
        'button',
        { type: 'button', class: 'cam-modal-close', 'data-present-close': '1', 'aria-label': 'Close' },
        svgIcon('xmark'),
      ),
    ),
    el('div', { class: 'cam-modal-art' }, stimArt(step.id, 'b') || el('span', { text: step.name })),
    el('div', { class: 'cam-modal-name', text: step.name }),
  );
  if (isRec) {
    box.append(el('p', { class: 'cam-modal-ask', text: 'Did the child see this one before?' }));
    const choose = el('div', { class: 'cam-modal-choose', role: 'group', 'aria-label': 'Answer' });
    for (const o of [
      { v: 'seen', l: 'Seen' },
      { v: 'new', l: 'New' },
    ]) {
      const on = marks[step.idx] === o.v;
      choose.append(
        el(
          'button',
          {
            type: 'button',
            class: `cam-pic-opt cam-modal-opt${on ? ' is-on' : ''}`,
            'data-present-ans': o.v,
            'aria-pressed': on ? 'true' : 'false',
          },
          el('span', { text: o.l }),
        ),
      );
    }
    box.append(choose);
  } else {
    box.append(el('p', { class: 'cam-modal-ask', text: 'Show this picture, then move to the next.' }));
  }

  const last = pos === steps.length - 1;
  const backBtn = el(
    'button',
    { type: 'button', class: 'btn btn-ghost btn-sm', 'data-present-nav': '-1' },
    svgIcon('arrow-left'),
    el('span', { text: 'Back' }),
  );
  if (pos === 0) backBtn.disabled = true;
  box.append(
    el(
      'div',
      { class: 'cam-modal-nav' },
      backBtn,
      el(
        'button',
        { type: 'button', class: 'btn btn-primary btn-sm', 'data-present-nav': '1' },
        el('span', { text: last ? 'Done' : 'Next' }),
        last ? null : svgIcon('chevron-right'),
      ),
    ),
  );

  root.replaceChildren(el('div', { class: 'cam-modal', 'data-present-overlay': '1' }, box));
  (box.querySelector('.cam-modal-opt') ||
    box.querySelector('[data-present-nav="1"]') ||
    box.querySelector('.cam-modal-close'))?.focus();
}

// Keep Tab focus inside the open modal (dialog focus trap).
function presentTrapTab(e) {
  const box = document.querySelector('#cam-present-root .cam-modal-box');
  if (!box) return;
  const items = [...box.querySelectorAll('button:not([disabled])')];
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// Capture enough of the focused control's identity to re-focus its replacement
// after the feature list is rebuilt (marking one error rebuilds the whole list,
// which would otherwise drop keyboard focus to <body> mid-task).
function camFocusKey(box) {
  const a = document.activeElement;
  if (!a || !box.contains(a)) return null;
  for (const attr of [
    'data-cam-err',
    'data-cam-pic',
    'data-cam-pic-performed',
    'data-cam-part',
    'data-cam-performed',
    'data-cam-judgment',
  ]) {
    if (a.hasAttribute(attr)) {
      let sel = `[${attr}="${a.getAttribute(attr)}"]`;
      for (const extra of ['data-idx', 'data-ans', 'data-part', 'value']) {
        if (a.hasAttribute(extra)) sel += `[${extra}="${a.getAttribute(extra)}"]`;
      }
      return sel;
    }
  }
  return null;
}

function renderCam() {
  const box = $('#cam-features');
  if (!box) return;
  const data = CAM_BY_SCREEN[state.screen];
  if (!data) {
    box.replaceChildren();
    return;
  }
  const focusSel = camFocusKey(box);
  box.replaceChildren(...data.features.map(renderFeature));
  if (focusSel) box.querySelector(focusSel)?.focus();
}

// ── Risk (reactive to the child profile) ──────────────────────────────────────
function riskCard(f, isDerived) {
  const cb = el('input', { type: 'checkbox' });
  cb.setAttribute('data-risk', f.id);
  // A profile-derived factor is checked by default, but an explicit uncheck wins.
  cb.checked = state.risk[f.id] != null ? state.risk[f.id] : isDerived;
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
  const card = el(
    'div',
    { class: `risk-card${isDerived ? ' is-derived' : ''}` },
    top,
    el('p', { class: 'risk-detail', text: f.detail }),
  );
  if (isDerived) card.append(el('span', { class: 'risk-from', text: 'from profile' }));
  return card;
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

function renderMedsGiven() {
  const box = $('#meds-given');
  if (!box) return;
  box.replaceChildren(
    ...MEDS.map((m) => {
      const cb = el('input', { type: 'checkbox' });
      cb.setAttribute('data-med', m.id);
      if (state.medsGiven[m.id]) cb.checked = true;
      return el(
        'label',
        { class: 'chk' },
        cb,
        el(
          'span',
          {},
          el('strong', { text: m.name }),
          el('span', { class: 'med-dose', text: ` — ${m.dose}` }),
        ),
      );
    }),
  );
}

// Structured references: render each tab's numbered, linked reference list from
// its data-refs ids, then resolve inline <sup class="cite" data-ref="…"> markers
// to the matching superscript numbers (anchored to the list). Per-tab numbering.
function renderRefs() {
  $$('.tab-panel').forEach((panel) => {
    const list = panel.querySelector('.ref-list[data-refs]');
    if (!list) return;
    const ids = list.dataset.refs
      .split(',')
      .map((s) => s.trim())
      .filter((id) => REFS[id]);
    const num = {};
    list.replaceChildren(
      ...ids.map((id, i) => {
        num[id] = i + 1;
        return el(
          'li',
          { id: `${panel.id}-ref-${i + 1}` },
          el('a', { href: REFS[id].u, target: '_blank', rel: 'noopener', text: REFS[id].c }),
        );
      }),
    );
    panel.querySelectorAll('.cite[data-ref]').forEach((sup) => {
      const refIds = sup.dataset.ref
        .split(',')
        .map((s) => s.trim())
        .filter((id) => num[id]);
      if (!refIds.length) return;
      const kids = [];
      refIds.forEach((id, j) => {
        if (j) kids.push(document.createTextNode(','));
        kids.push(el('a', { href: `#${panel.id}-ref-${num[id]}`, text: String(num[id]) }));
      });
      sup.replaceChildren(...kids);
    });
  });
}

// Prevention checkboxes are static markup — reflect saved state onto them.
function reflectPrevention() {
  $$('[data-prev]').forEach((el) => {
    el.checked = !!state.prevention[el.dataset.prev];
  });
}

// Give every card head a matching icon (decorative) for a consistent visual system.
const HEAD_ICONS = [
  [/arousal/i, 'gauge-high'],
  [/CAPD|pCAM|psCAM|features/i, 'brain'],
  [/^\s*Result/i, 'circle-check'],
  [/Step 1/i, 'magnifying-glass'],
  [/Step 2/i, 'leaf'],
  [/Step 3/i, 'syringe'],
  [/risk factors/i, 'triangle-exclamation'],
  [/Modifiable/i, 'triangle-exclamation'],
  [/Patient/i, 'circle-info'],
  [/Prevention|bundle/i, 'leaf'],
  [/Non-pharmacolog/i, 'moon'],
  [/Treatment/i, 'syringe'],
  [/monitoring/i, 'gauge-high'],
  [/Sedation/i, 'pills'],
  [/Deliriogenic/i, 'triangle-exclamation'],
  [/Documents/i, 'file-pdf'],
];
function decorateHeads() {
  for (const head of $$('.card-head')) {
    // Card titles are visual headings — expose them to assistive tech.
    head.setAttribute('role', 'heading');
    head.setAttribute('aria-level', '2');
    if (head.querySelector('.fa')) continue;
    const match = HEAD_ICONS.find(([re]) => re.test(head.textContent));
    if (match) head.prepend(svgIcon(match[1]));
  }
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
      el(
        'p',
        { class: 'act-next' },
        svgIcon('file-pdf'),
        el('span', {
          text: ' When ready, generate a one-page summary in Generate Documents.',
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
  $$('.tab-btn').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
  state.activeTab = tab;
  if (state.profile.ageM != null) autosave(state); // remember where the user is
}

// Completion-count badges on the checklist tabs (Risk, Prevention, meds given).
function updateTabBadges() {
  const setBadge = (tab, n) => {
    const btn = $(`.tab-btn[data-tab="${tab}"]`);
    if (!btn) return;
    let b = btn.querySelector('.tab-badge');
    if (!n) {
      if (b) b.remove();
      return;
    }
    if (!b) {
      b = el('span', { class: 'tab-badge' });
      btn.append(b);
    }
    b.textContent = String(n);
    b.setAttribute('aria-label', `${n} selected`);
  };
  const derived = new Set(derivedRiskIds(state.profile));
  const flagged = RISK_FACTORS.filter((f) =>
    state.risk[f.id] != null ? state.risk[f.id] : derived.has(f.id),
  ).length;
  setBadge('risk', flagged);
  setBadge('prevent', Object.values(state.prevention).filter(Boolean).length);
  setBadge('export', Object.values(state.medsGiven).filter(Boolean).length);
}

// ── Dispatch ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const jump = e.target.closest('[data-jump]');
  if (jump) {
    e.preventDefault();
    showTab(jump.dataset.jump);
  }
});
// Present modal keyboard: Esc closes, arrows step, Tab is trapped inside.
document.addEventListener('keydown', (e) => {
  if (!presentCtx) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    return closePresent();
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    return presentNav(1);
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    return presentNav(-1);
  }
  if (e.key === 'Tab') presentTrapTab(e);
});
document.addEventListener('click', (e) => {
  const jump = e.target.closest('[data-jump]');
  if (jump) {
    showTab(jump.dataset.jump);
    return;
  }
  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act;
    if (a === 'deriveScreen') return deriveScreen();
    if (a === 'reset') return resetToProfile();
    if (a === 'switchScreen') return setScreen(act.dataset.screen);
    if (a === 'arousalScale') {
      const next = act.dataset.scale;
      if (next === state.arousalScale) return;
      // RASS and SBS aren't 1:1, so the recorded level can't carry across —
      // confirm before discarding an already-entered arousal.
      if (
        state.arousal !== '' &&
        !confirm('Switch arousal scale? The recorded arousal level will be cleared.')
      ) {
        renderArousal(); // re-sync the toggle back to the unchanged scale
        return;
      }
      state.arousalScale = next;
      state.arousal = '';
      renderArousal();
      renderResult();
      autosave(state);
      return;
    }
    if (a === 'loadExample') {
      if (
        state.profile.ageM != null &&
        !confirm('Replace the current assessment with the example data?')
      ) {
        return;
      }
      applySettings(EXAMPLE_SETTINGS);
      saveSettings(readSettings());
      applyState(EXAMPLE);
      autosave(state);
      return;
    }
    if (a === 'clearAll') {
      if (state.profile.ageM != null && !confirm('Clear this assessment and start a new child?')) {
        return;
      }
      return clearAll();
    }
    if (a === 'exportJSON') return exportJSON(state);
    if (a === 'importJSON') {
      importJSON().then((data) => {
        if (!data || data.__error || !data.profile || data.profile.ageM == null) {
          alert(
            "That file isn't a saved pediatric assessment (it may be a settings file or from another tool).",
          );
          return;
        }
        applyState(data);
        autosave(state);
      });
      return;
    }
    if (a === 'saveSettings') return exportSettings(readSettings());
    if (a === 'loadSettings') {
      importSettings().then((data) => {
        if (!data || data.__error || data.profile) {
          alert("That file isn't a saved settings file (it looks like a full assessment).");
          return;
        }
        applySettings(data);
        saveSettings(readSettings());
      });
      return;
    }
    if (a === 'generateReport') {
      const empty = $('#export-empty');
      if (state.profile.ageM == null) {
        if (empty) empty.hidden = false;
        return;
      }
      if (empty) empty.hidden = true;
      generateReport(state, readSettings());
      return;
    }
  }
  // Present modal: open, close, navigate, and pick Seen/New.
  if (e.target.closest('[data-present-close]') || e.target.matches('[data-present-overlay]'))
    return closePresent();
  const pnav = e.target.closest('[data-present-nav]');
  if (pnav) return presentNav(Number(pnav.dataset.presentNav));
  const pans = e.target.closest('[data-present-ans]');
  if (pans) return presentSelect(pans.dataset.presentAns);
  const presentOpen = e.target.closest('[data-cam-present]');
  if (presentOpen)
    return openPresent(presentOpen.dataset.camPresent, Number(presentOpen.dataset.pos));
  const errchip = e.target.closest('[data-cam-err]');
  if (errchip) return toggleCamError(errchip.dataset.camErr, Number(errchip.dataset.idx));
  const picbtn = e.target.closest('[data-cam-pic]');
  if (picbtn)
    return setCamPicture(picbtn.dataset.camPic, Number(picbtn.dataset.idx), picbtn.dataset.ans);
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
  if (t.dataset.set) {
    saveSettings(readSettings());
    return;
  }
  if (t.dataset.risk) {
    state.risk[t.dataset.risk] = t.checked;
    updateTabBadges();
    autosave(state);
    return;
  }
  if (t.dataset.med) {
    state.medsGiven[t.dataset.med] = t.checked;
    updateTabBadges();
    autosave(state);
    return;
  }
  if (t.dataset.assessed != null) {
    state.assessedAt = t.value;
    autosave(state);
    return;
  }
  if (t.dataset.assessor != null) {
    state.assessor = t.value;
    autosave(state);
    return;
  }
  if (t.dataset.prev) {
    state.prevention[t.dataset.prev] = t.checked;
    updateTabBadges();
    autosave(state);
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
  } else if (t.dataset.camPicPerformed) {
    ensureCamPicture(t.dataset.camPicPerformed).performed = t.checked;
    renderCam();
  } else if (t.dataset.camPart) {
    ensureCam(t.dataset.camPart)[t.dataset.part] = t.checked;
    renderCam();
  } else {
    return;
  }
  renderResult();
  autosave(state);
});

window.addEventListener('pagehide', () => {
  if (state.profile.ageM != null) flushSave(state);
});

applySettings(loadSettings());
const saved = loadSaved();
if (saved && saved.profile && saved.profile.ageM != null) {
  applyState(saved);
} else {
  renderArousal();
  decorateHeads();
}
renderRefs();
initA11y(); // user-configurable text size / contrast / motion controls
wireTablist(showTab); // ARIA tablist + Arrow/Home/End keyboard navigation
updateTabBadges();
applyGlossary(PEDS_GLOSSARY, document.querySelectorAll('.tab-panel'));
