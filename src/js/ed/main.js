/**
 * ed/main.js — the emergency-department delirium screening tool.
 *
 * Two guideline-backed pathways over one assessment state: the two-step
 * DTS → bCAM (Han 2013; Geriatric ED Guidelines) and the 4AT (SIGN 157;
 * NICE CG103; GED 2.0 endorses both). Everything runs in the browser —
 * no patient data leaves the device. Reference aid only.
 */
import { wireTablist, applyGlossary, el, $, $$ } from '../shared/dom.js';
import { initA11y } from '../shared/a11y.js';
import { makeStore } from '../shared/store.js';
import { downloadJSON, pickJSON } from '../shared/files.js';
import { RASS_LEVELS, DTS, BCAM, FOURAT, PATHWAYS, ACT_POSITIVE } from './data/instruments.js';
import { evalDts, arousalGate, bcamInattention, evalBcam, eval4at } from './scoring.js';
import { REFS } from './data/refs.js';

// ── State ────────────────────────────────────────────────────────────────────

const blankAssessment = () => ({
  v: 1,
  pathway: '', // '' = use the unit default from settings
  rass: '',
  lunchErrors: '',
  lunchUnable: false,
  f1: '',
  monthErrors: '',
  monthUnable: false,
  f4Set: 'a',
  f4: '', // '' | 'none' | 'errors'
  fourat: { alertness: '', amt4: '', attention: '', change: '' },
  notes: '',
  assessedAt: '',
});

let state = blankAssessment();
let settings = { facility: '', defaultPathway: 'twostep' };

const store = makeStore('deliriumtool:ed');
const settingsStore = makeStore('deliriumtool:ed:settings');

const activePathway = () =>
  state.pathway || (settings.defaultPathway === 'fourat' ? 'fourat' : 'twostep');

// ── Glossary ─────────────────────────────────────────────────────────────────

const ED_GLOSSARY = {
  DTS: 'Delirium Triage Screen',
  bCAM: 'Brief Confusion Assessment Method',
  '4AT': 'Assessment Test for Delirium & Cognitive Impairment',
  RASS: 'Richmond Agitation-Sedation Scale',
  AMT4: 'Abbreviated Mental Test - 4 items',
  ED: 'Emergency Department',
  GED: 'Geriatric Emergency Department',
};

// ── Small builders ───────────────────────────────────────────────────────────

const fmtRass = (v) => (v === '0' ? '0' : v.replace('-', '−'));

function zoneOf(v) {
  const n = Number(v);
  if (n >= 1) return 'agi';
  if (n === 0) return 'calm';
  return 'sed';
}

function radioRow({ name, value, checked, data, label, sub, cls }) {
  const input = el('input', { type: 'radio', name, value });
  for (const [k, v] of Object.entries(data || {})) input.setAttribute(`data-${k}`, v);
  if (checked) input.checked = true;
  const row = el('label', { class: cls || 'opt-row' }, input, el('span', { text: label }));
  if (sub) row.append(el('span', { class: 'opt-sub', text: sub }));
  return row;
}

function citesLine(keys) {
  const line = el('p', { class: 'cites' }, 'Sources: ');
  keys.forEach((k, i) => {
    const r = REFS[k];
    if (!r) return;
    if (i) line.append(' · ');
    line.append(el('a', { href: r.u, target: '_blank', rel: 'noopener', text: r.l }));
  });
  return line;
}

// ── Screen tab rendering ─────────────────────────────────────────────────────

function renderPathwayPick() {
  const box = $('#pathway-pick');
  box.replaceChildren(
    ...PATHWAYS.map((p) =>
      radioRow({
        name: 'ed-pathway',
        value: p.id,
        checked: activePathway() === p.id,
        data: { act: 'pathway' },
        label: p.name,
        sub: `${p.who} — ${p.how}`,
        cls: 'opt-row opt-row--pathway',
      }),
    ),
  );
}

function renderRass() {
  const box = $('#ed-rass');
  box.replaceChildren(
    ...RASS_LEVELS.map((r) => {
      const input = el('input', { type: 'radio', name: 'ed-rass', value: r.v, 'data-act': 'rass' });
      if (state.rass === r.v) input.checked = true;
      const row = el(
        'label',
        { class: 'ascale-opt', 'data-zone': zoneOf(r.v) },
        input,
        el('span', { class: 'ascale-v', text: fmtRass(r.v) }),
        el('span', { text: r.label }),
      );
      if (arousalGate(r.v) === 'unable') {
        row.append(el('span', { class: 'ascale-tag', text: 'unable' }));
      }
      return row;
    }),
  );
}

function segmented({ name, act, options, selected }) {
  const group = el('div', { class: 'pseg', role: 'radiogroup' });
  for (const o of options) {
    const input = el('input', { type: 'radio', name, value: String(o.value), 'data-act': act });
    if (String(selected) === String(o.value) && selected !== '') input.checked = true;
    group.append(el('label', { class: 'pseg-opt' }, input, el('span', { text: o.label })));
  }
  return group;
}

function renderTwostep() {
  const host = $('#panel-twostep');
  const gate = arousalGate(state.rass);
  const dts = evalDts(state);

  // DTS attention task (only meaningful at RASS 0).
  const lunch = $('#dts-lunch');
  lunch.replaceChildren(
    el('p', { class: 'task-script', text: DTS.attention.script }),
    el('p', { class: 'task-help', text: DTS.attention.help }),
    segmented({
      name: 'dts-lunch-err',
      act: 'lunchErrors',
      options: [
        { value: 0, label: '0 errors' },
        { value: 1, label: '1 error' },
        { value: 2, label: '2+ errors' },
      ],
      selected: state.lunchErrors,
    }),
    el(
      'label',
      { class: 'chk' },
      (() => {
        const c = el('input', { type: 'checkbox', 'data-act': 'lunchUnable' });
        c.checked = state.lunchUnable;
        return c;
      })(),
      el('span', { text: 'Unable or refused to start (counts as positive)' }),
    ),
  );
  lunch.hidden = state.rass !== '0';

  // DTS verdict banner.
  const dtsOut = $('#dts-verdict');
  dtsOut.className = 'verdict';
  if (gate === 'unable') {
    dtsOut.classList.add('v-warn');
    dtsOut.textContent =
      'RASS −4/−5 — stupor or coma. Delirium content cannot be assessed now; reassess when the patient responds to voice.';
  } else if (dts === null) {
    dtsOut.classList.add('v-pending');
    dtsOut.textContent =
      state.rass === ''
        ? 'Record the RASS to begin.'
        : 'Score the LUNCH-backwards task to complete the DTS.';
  } else if (dts === 'negative') {
    dtsOut.classList.add('v-neg');
    dtsOut.textContent = DTS.verdicts.negative;
  } else {
    dtsOut.classList.add('v-pos');
    dtsOut.textContent = DTS.verdicts.positive;
  }

  // bCAM step appears only when the DTS is positive and the gate allows it.
  const bcamCard = $('#bcam-card');
  bcamCard.hidden = !(dts === 'positive' && gate === 'ok');
  if (!bcamCard.hidden) renderBcam();
  host.hidden = activePathway() !== 'twostep';
}

function renderBcam() {
  const f1 = $('#bcam-f1');
  f1.replaceChildren(
    segmented({
      name: 'bcam-f1',
      act: 'f1',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
        { value: 'assume', label: 'No informant — assume present' },
      ],
      selected: state.f1,
    }),
  );

  const f2 = $('#bcam-f2');
  const f2feature = BCAM.features.find((f) => f.id === 'f2');
  f2.replaceChildren(
    el('p', { class: 'task-script', text: f2feature.script }),
    el('p', { class: 'task-help', text: f2feature.help }),
    segmented({
      name: 'bcam-f2-err',
      act: 'monthErrors',
      options: [
        { value: 0, label: '0 errors' },
        { value: 1, label: '1 error' },
        { value: 2, label: '2+ errors' },
      ],
      selected: state.monthErrors,
    }),
    el(
      'label',
      { class: 'chk' },
      (() => {
        const c = el('input', { type: 'checkbox', 'data-act': 'monthUnable' });
        c.checked = state.monthUnable;
        return c;
      })(),
      el('span', { text: 'Unable or refused to start (counts as positive)' }),
    ),
  );

  // Feature 3 — derived from the recorded RASS.
  const f3 = $('#bcam-f3');
  const altered = state.rass !== '' && state.rass !== '0';
  f3.textContent = altered
    ? `Positive — RASS ${fmtRass(state.rass)} (anything other than 0).`
    : 'Negative — RASS 0. Feature 4 decides.';

  // Feature 4 — question set + any-error result.
  const f4feature = BCAM.features.find((f) => f.id === 'f4');
  const setPick = $('#bcam-f4-set');
  setPick.replaceChildren(
    segmented({
      name: 'bcam-f4-set',
      act: 'f4Set',
      options: [
        { value: 'a', label: 'Question set A' },
        { value: 'b', label: 'Question set B' },
      ],
      selected: state.f4Set,
    }),
  );
  const qs = $('#bcam-f4-questions');
  qs.replaceChildren(
    ...f4feature.sets[state.f4Set === 'b' ? 'b' : 'a'].map((q) => el('li', { text: q })),
    el('li', { class: 'f4-command', text: f4feature.command }),
  );
  const f4out = $('#bcam-f4');
  f4out.replaceChildren(
    segmented({
      name: 'bcam-f4-res',
      act: 'f4',
      options: [
        { value: 'none', label: 'No errors' },
        { value: 'errors', label: '1 or more errors' },
      ],
      selected: state.f4,
    }),
  );

  const verdict = evalBcam({
    f1: state.f1 || undefined,
    f2: bcamInattention(state),
    rass: state.rass,
    f4AnyError: state.f4 === '' ? null : state.f4 === 'errors',
  });
  const out = $('#bcam-verdict');
  out.className = 'verdict';
  if (verdict === null) {
    out.classList.add('v-pending');
    out.textContent = 'Complete Feature 1, Feature 2, and (if the RASS is 0) Feature 4 to score.';
  } else if (verdict === 'positive') {
    out.classList.add('v-pos');
    out.textContent = `${BCAM.verdicts.positive} ${BCAM.rule}. See “Act on a positive”.`;
  } else {
    out.classList.add('v-neg');
    out.textContent = BCAM.verdicts.negative;
  }
}

function render4at() {
  const host = $('#panel-fourat');
  const box = $('#fourat-items');
  box.replaceChildren(
    ...FOURAT.items.map((item) => {
      const fs = el(
        'fieldset',
        { class: 'pseg-row' },
        el('legend', { class: 'pseg-legend', text: item.title }),
        el('p', { class: 'task-help', text: item.help }),
      );
      const group = el('div', { class: 'pseg pseg--stack', role: 'radiogroup' });
      item.options.forEach((o, i) => {
        const input = el('input', {
          type: 'radio',
          name: `fourat-${item.id}`,
          value: `${o.v}:${i}`,
          'data-act': 'fourat',
          'data-item': item.id,
        });
        if (state.fourat[item.id] === `${o.v}:${i}`) input.checked = true;
        group.append(
          el(
            'label',
            { class: 'pseg-opt' },
            input,
            el('span', { text: `${o.label} — ${o.v} point${o.v === 1 ? '' : 's'}` }),
          ),
        );
      });
      fs.append(group);
      return fs;
    }),
  );

  const values = Object.fromEntries(
    FOURAT.items.map((i) => [
      i.id,
      state.fourat[i.id] === '' ? '' : Number(String(state.fourat[i.id]).split(':')[0]),
    ]),
  );
  const res = eval4at(values);
  const out = $('#fourat-verdict');
  out.className = 'verdict';
  if (!res.complete) {
    out.classList.add('v-pending');
    out.textContent = 'Rate all four items to score the 4AT.';
  } else if (res.band.verdict === 'positive') {
    out.classList.add('v-pos');
    out.textContent = `4AT ${res.score}/12 — ${res.band.label}. A score of 4 or more suggests delirium but is not diagnostic. See “Act on a positive”.`;
  } else if (res.band.verdict === 'cognitive') {
    out.classList.add('v-cog');
    out.textContent = `4AT ${res.score}/12 — ${res.band.label}. More detailed cognitive testing and informant history-taking are required.`;
  } else {
    out.classList.add('v-neg');
    out.textContent = `4AT ${res.score}/12 — ${res.band.label} (delirium still possible if the item-4 information is incomplete).`;
  }
  host.hidden = activePathway() !== 'fourat';
}

// ── Act tab ──────────────────────────────────────────────────────────────────

function renderAct() {
  const box = $('#act-blocks');
  if (!box || box.childElementCount) return;
  box.replaceChildren(
    ...ACT_POSITIVE.map((b) =>
      el(
        'section',
        { class: 'card act-card' },
        el('h3', { text: b.head }),
        el('ul', {}, ...b.items.map((t) => el('li', { text: t }))),
        citesLine(b.cites),
      ),
    ),
  );
}

// ── Summary tab ──────────────────────────────────────────────────────────────

function summaryLines() {
  const lines = [];
  const pathway = PATHWAYS.find((p) => p.id === activePathway());
  lines.push(['Facility / unit', settings.facility || '—']);
  lines.push(['Assessed', state.assessedAt || '—']);
  lines.push(['Pathway', pathway.name]);
  if (activePathway() === 'twostep') {
    lines.push(['RASS', state.rass === '' ? '—' : fmtRass(state.rass)]);
    const gate = arousalGate(state.rass);
    const dts = evalDts(state);
    lines.push([
      'DTS',
      gate === 'unable'
        ? 'Unable to assess (RASS −4/−5) — reassess later'
        : dts === null
          ? 'Incomplete'
          : dts === 'positive'
            ? 'Positive — bCAM performed'
            : 'Negative — delirium ruled out',
    ]);
    if (dts === 'positive' && gate === 'ok') {
      const verdict = evalBcam({
        f1: state.f1 || undefined,
        f2: bcamInattention(state),
        rass: state.rass,
        f4AnyError: state.f4 === '' ? null : state.f4 === 'errors',
      });
      lines.push([
        'bCAM',
        verdict === null
          ? 'Incomplete'
          : verdict === 'positive'
            ? 'POSITIVE — delirium present'
            : 'Negative',
      ]);
    }
  } else {
    const values = Object.fromEntries(
      FOURAT.items.map((i) => [
        i.id,
        state.fourat[i.id] === '' ? '' : Number(String(state.fourat[i.id]).split(':')[0]),
      ]),
    );
    const res = eval4at(values);
    lines.push(['4AT', res.complete ? `${res.score}/12 — ${res.band.label}` : 'Incomplete']);
  }
  if (state.notes.trim()) lines.push(['Notes', state.notes.trim()]);
  return lines;
}

function renderSummary() {
  const box = $('#summary-body');
  if (!box) return;
  box.replaceChildren(
    ...summaryLines().map(([k, v]) =>
      el(
        'div',
        { class: 'sum-row' },
        el('span', { class: 'sum-k', text: k }),
        el('span', { text: v }),
      ),
    ),
  );
}

// ── Rendering root ───────────────────────────────────────────────────────────

function renderAll() {
  renderPathwayPick();
  renderRass();
  renderTwostep();
  render4at();
  renderAct();
  renderSummary();
  store.autosave(state);
}

// ── Events ───────────────────────────────────────────────────────────────────

function onChange(e) {
  const t = e.target;
  const act = t.dataset.act;
  if (!act) return;
  if (!state.assessedAt) state.assessedAt = new Date().toLocaleString();
  switch (act) {
    case 'pathway':
      state.pathway = t.value;
      break;
    case 'rass':
      state.rass = t.value;
      break;
    case 'lunchErrors':
      state.lunchErrors = t.value;
      break;
    case 'lunchUnable':
      state.lunchUnable = t.checked;
      break;
    case 'f1':
      state.f1 = t.value;
      break;
    case 'monthErrors':
      state.monthErrors = t.value;
      break;
    case 'monthUnable':
      state.monthUnable = t.checked;
      break;
    case 'f4Set':
      state.f4Set = t.value;
      break;
    case 'f4':
      state.f4 = t.value;
      break;
    case 'fourat':
      state.fourat = { ...state.fourat, [t.dataset.item]: t.value };
      break;
    case 'facility':
      settings.facility = t.value.slice(0, 120);
      settingsStore.autosave(settings);
      break;
    case 'defaultPathway':
      settings.defaultPathway = t.value;
      settingsStore.autosave(settings);
      break;
    case 'notes':
      state.notes = t.value.slice(0, 1000);
      break;
    default:
      return;
  }
  renderAll();
}

function onClick(e) {
  const tabBtn = e.target.closest('.tab-btn[data-tab]');
  if (tabBtn) {
    showTab(tabBtn.dataset.tab);
    return;
  }
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  switch (btn.dataset.act) {
    case 'reset':
      if (!window.confirm('Start a new assessment? The current one will be cleared.')) return;
      state = blankAssessment();
      store.clearSaved();
      renderAll();
      break;
    case 'export':
      downloadJSON(state, 'ed-delirium-assessment.json');
      break;
    case 'import':
      pickJSON().then((raw) => {
        if (raw == null) return;
        if (raw.__error || typeof raw !== 'object' || raw.v !== 1) {
          announce('That file could not be read as an ED assessment.');
          return;
        }
        state = {
          ...blankAssessment(),
          ...raw,
          fourat: { ...blankAssessment().fourat, ...(raw.fourat || {}) },
        };
        renderAll();
        announce('Assessment imported.');
      });
      break;
    case 'print':
      window.print();
      break;
    default:
  }
}

function announce(text) {
  const region = $('#ed-live');
  if (region) region.textContent = text;
}

// ── Init ─────────────────────────────────────────────────────────────────────

function restore() {
  const saved = store.loadSaved();
  if (saved && typeof saved === 'object' && saved.v === 1) {
    state = {
      ...blankAssessment(),
      ...saved,
      fourat: { ...blankAssessment().fourat, ...(saved.fourat || {}) },
    };
  }
  const savedSettings = settingsStore.loadSaved();
  if (savedSettings && typeof savedSettings === 'object') {
    settings = { ...settings, ...savedSettings };
  }
  const fac = $('#ed-facility');
  if (fac) fac.value = settings.facility;
  $$('input[name="ed-default-pathway"]').forEach((r) => {
    r.checked = r.value === settings.defaultPathway;
  });
}

function showTab(id) {
  $$('.tab-btn').forEach((b) => {
    const on = b.dataset.tab === id;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${id}`));
  if (id === 'export') renderSummary();
}

initA11y();
restore();
renderAll();
applyGlossary(ED_GLOSSARY, document.querySelectorAll('.tab-panel'));
wireTablist(showTab);
document.addEventListener('change', onChange);
document.addEventListener('input', (e) => {
  if (e.target.dataset.act === 'notes' || e.target.dataset.act === 'facility') onChange(e);
});
document.addEventListener('click', onClick);
window.addEventListener('pagehide', () => {
  store.flushSave(state);
  settingsStore.flushSave(settings);
});
