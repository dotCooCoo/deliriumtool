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
import { EXAMPLE_ASSESSMENT } from './data/instruments.js';
import { captureNodeToPdf } from '../shared/capture-pdf.js';
import { REFS } from './data/refs.js';

// ── State ────────────────────────────────────────────────────────────────────

const blankAssessment = () => ({
  v: 1,
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
  notes: '',
  assessedAt: '',
});

/** Normalize an untrusted snapshot (import / localStorage) into a valid state. */
function sanitizeAssessment(raw) {
  const d = blankAssessment();
  const out = { ...d };
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
  out.monthTaps = taps(raw.monthTaps, 6);
  out.monthDone = raw.monthDone === true || out.monthTaps.length > 0;
  out.monthUnable = raw.monthUnable === true;
  out.f4Set = raw.f4Set === 'b' ? 'b' : 'a';
  out.f4 = ['none', 'errors'].includes(raw.f4) ? raw.f4 : '';
  out.fourat = { ...d.fourat };
  for (const k of Object.keys(d.fourat)) {
    if (typeof raw.fourat?.[k] === 'string' && /^[0-9]+:[0-9]+$/.test(raw.fourat[k])) {
      out.fourat[k] = raw.fourat[k];
    }
  }
  out.notes = str(raw.notes, 1000);
  out.assessedAt = str(raw.assessedAt, 60);
  return out;
}

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

/**
 * Tap-to-count error chips (the peds tool's flowsheet idiom): tap each item
 * the patient misses; the count scores the task once "performed" is checked.
 */
function errorChips({ items, taps, act }) {
  const grid = el('div', { class: 'errgrid', role: 'group' });
  items.forEach((label, i) => {
    const on = taps.includes(i);
    const chip = el(
      'button',
      {
        type: 'button',
        class: `errchip${on ? ' is-err' : ''}`,
        'data-act': act,
        'data-idx': String(i),
        'aria-pressed': on ? 'true' : 'false',
      },
      el('span', { class: 'errchip-n', text: label }),
    );
    grid.append(chip);
  });
  return grid;
}

function taskFooter({ doneAct, done, doneLabel, unableAct, unable }) {
  const doneInput = el('input', { type: 'checkbox', 'data-act': doneAct });
  doneInput.checked = done;
  const unableInput = el('input', { type: 'checkbox', 'data-act': unableAct });
  unableInput.checked = unable;
  return el(
    'div',
    { class: 'task-footer' },
    el('label', { class: 'chk' }, doneInput, el('span', { text: doneLabel })),
    el(
      'label',
      { class: 'chk' },
      unableInput,
      el('span', { text: 'Unable or refused to start (counts as positive)' }),
    ),
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
  const gate = arousalGate(state.rass);
  const dts = evalDts(state);
  const pathway = activePathway();

  // Arousal card lead adapts to the pathway.
  $('#arousal-lead').textContent =
    pathway === 'bcam'
      ? 'Score the RASS first — it is bCAM Feature 3 (any RASS other than 0 is positive). RASS −4/−5 is stupor or coma — record “unable to assess” and reassess when the patient responds to voice.'
      : 'Score the RASS first. A RASS other than 0 makes the DTS positive on its own; at RASS 0, the LUNCH-backwards task decides. RASS −4/−5 is stupor or coma — record “unable to assess” and reassess when the patient responds to voice.';
  $('#card-arousal').hidden = pathway === 'fourat';

  // DTS attention task (only meaningful at RASS 0, only on the two-step path).
  const dtsCard = $('#dts-card');
  dtsCard.hidden = pathway !== 'twostep';
  if (pathway === 'twostep') {
    const lunch = $('#dts-lunch');
    lunch.replaceChildren(
      el('p', { class: 'task-script', text: DTS.attention.script }),
      el('p', { class: 'task-help', text: DTS.attention.help }),
      el('p', { class: 'task-expected', text: 'Expected: H · C · N · U · L' }),
      errorChips({ items: DTS.attention.items, taps: state.lunchTaps, act: 'lunchTap' }),
      taskFooter({
        doneAct: 'lunchDone',
        done: state.lunchDone,
        doneLabel: `Task performed — ${state.lunchTaps.length} error${state.lunchTaps.length === 1 ? '' : 's'}`,
        unableAct: 'lunchUnable',
        unable: state.lunchUnable,
      }),
    );
    lunch.hidden = state.rass !== '0';

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
          : 'Run the LUNCH-backwards task and check “Task performed” to complete the DTS.';
    } else if (dts === 'negative') {
      dtsOut.classList.add('v-neg');
      dtsOut.textContent = DTS.verdicts.negative;
    } else {
      dtsOut.classList.add('v-pos');
      dtsOut.textContent = DTS.verdicts.positive;
    }
  }

  // bCAM: after a positive DTS on the two-step path, or directly on the bCAM path.
  const bcamCard = $('#bcam-card');
  const showBcam =
    (pathway === 'twostep' && dts === 'positive' && gate === 'ok') ||
    (pathway === 'bcam' && state.rass !== '' && gate === 'ok');
  bcamCard.hidden = !showBcam;
  if (pathway === 'bcam' && gate === 'unable') {
    // Surface the gate on the arousal card for the direct-bCAM path.
    const out = $('#bcam-verdict');
    out.className = 'verdict v-warn';
    out.textContent =
      'RASS −4/−5 — stupor or coma. Delirium content cannot be assessed now; reassess when the patient responds to voice.';
    bcamCard.hidden = false;
    $('#bcam-body').hidden = true;
    return;
  }
  if (showBcam) {
    $('#bcam-body').hidden = false;
    renderBcam();
  }
  $('#panel-twostep').hidden = pathway === 'fourat';
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
    errorChips({ items: f2feature.items, taps: state.monthTaps, act: 'monthTap' }),
    taskFooter({
      doneAct: 'monthDone',
      done: state.monthDone,
      doneLabel: `Task performed — ${state.monthTaps.length} error${state.monthTaps.length === 1 ? '' : 's'}`,
      unableAct: 'monthUnable',
      unable: state.monthUnable,
    }),
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
  if (activePathway() !== 'fourat') {
    lines.push(['RASS', state.rass === '' ? '—' : fmtRass(state.rass)]);
    const gate = arousalGate(state.rass);
    const dts = evalDts(state);
    if (activePathway() === 'twostep')
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
    if ((dts === 'positive' || activePathway() === 'bcam') && gate === 'ok') {
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

function overallVerdict() {
  const pathway = activePathway();
  if (pathway === 'fourat') {
    const values = Object.fromEntries(
      FOURAT.items.map((i) => [
        i.id,
        state.fourat[i.id] === '' ? '' : Number(String(state.fourat[i.id]).split(':')[0]),
      ]),
    );
    const res = eval4at(values);
    if (!res.complete) return { cls: 'v-pending', text: 'Assessment incomplete.' };
    if (res.band.verdict === 'positive')
      return { cls: 'v-pos', text: `4AT ${res.score}/12 — possible delirium. Evaluate the cause.` };
    if (res.band.verdict === 'cognitive')
      return { cls: 'v-cog', text: `4AT ${res.score}/12 — possible cognitive impairment.` };
    return { cls: 'v-neg', text: `4AT ${res.score}/12 — delirium unlikely.` };
  }
  const gate = arousalGate(state.rass);
  if (gate === 'unable')
    return { cls: 'v-warn', text: 'Unable to assess (RASS −4/−5) — reassess later.' };
  const dts = evalDts(state);
  if (pathway === 'twostep') {
    if (dts === null) return { cls: 'v-pending', text: 'Assessment incomplete.' };
    if (dts === 'negative') return { cls: 'v-neg', text: 'DTS negative — delirium ruled out.' };
  }
  const bcam = evalBcam({
    f1: state.f1 || undefined,
    f2: bcamInattention(state),
    rass: state.rass,
    f4AnyError: state.f4 === '' ? null : state.f4 === 'errors',
  });
  if (bcam === 'positive') return { cls: 'v-pos', text: 'bCAM POSITIVE — delirium present.' };
  if (bcam === 'negative') return { cls: 'v-neg', text: 'bCAM negative — delirium not detected.' };
  return { cls: 'v-pending', text: 'Assessment incomplete.' };
}

function renderSummary() {
  const box = $('#summary-body');
  if (!box) return;
  const fac = $('#summary-facility');
  if (fac) {
    fac.textContent = [settings.facility || 'Your facility', state.assessedAt]
      .filter(Boolean)
      .join(' · ');
  }
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
  const banner = $('#summary-verdict');
  if (banner) {
    const v = overallVerdict();
    banner.className = `verdict sumdoc-verdict ${v.cls}`;
    banner.textContent = v.text;
  }
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
      if (t.value !== '0') {
        // The LUNCH task only applies at RASS 0 — drop stale answers.
        state.lunchTaps = [];
        state.lunchDone = false;
        state.lunchUnable = false;
      }
      break;
    case 'lunchDone':
      state.lunchDone = t.checked;
      break;
    case 'lunchUnable':
      state.lunchUnable = t.checked;
      break;
    case 'f1':
      state.f1 = t.value;
      break;
    case 'monthDone':
      state.monthDone = t.checked;
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
  if (btn.dataset.act === 'lunchTap' || btn.dataset.act === 'monthTap') {
    const key = btn.dataset.act === 'lunchTap' ? 'lunchTaps' : 'monthTaps';
    const i = Number(btn.dataset.idx);
    state[key] = state[key].includes(i) ? state[key].filter((x) => x !== i) : [...state[key], i];
    if (!state.assessedAt) state.assessedAt = new Date().toLocaleString();
    renderAll();
    return;
  }
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
        state = sanitizeAssessment(raw);
        renderAll();
        announce('Assessment imported.');
      });
      break;
    case 'print':
      window.print();
      break;
    case 'example':
      state = {
        ...blankAssessment(),
        ...EXAMPLE_ASSESSMENT,
        monthTaps: [...EXAMPLE_ASSESSMENT.monthTaps],
        fourat: { ...EXAMPLE_ASSESSMENT.fourat },
        monthDone: true,
        assessedAt: new Date().toLocaleString(),
      };
      renderAll();
      announce('Example data loaded.');
      break;
    case 'savepdf':
      captureNodeToPdf($('#summary-doc'), {
        filename: 'ed-delirium-summary.pdf',
        title: 'ED Delirium Screening Summary',
        subject: 'De-identified screening summary — reference aid only',
      }).then(
        () => announce('Summary PDF saved.'),
        () => announce('Could not generate the PDF.'),
      );
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
    state = sanitizeAssessment(saved);
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
