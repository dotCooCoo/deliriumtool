/**
 * ed/main.js — the emergency-department delirium screening tool.
 *
 * Three guideline-backed pathways over one assessment state: the two-step
 * DTS → bCAM (Han 2013; Geriatric ED Guidelines), the bCAM directly for
 * high-risk screening (ACEP ED-DEL), and the 4AT (SIGN 157; NICE CG103
 * recommends the 4AT hospital-wide; GED 2.0 conditionally recommends both
 * instruments for ED use). Everything runs in the browser — no patient data
 * leaves the device. Reference aid only.
 */
import { wireTablist, applyGlossary, el, $, $$ } from '../shared/dom.js';
import { initA11y } from '../shared/a11y.js';
import { makeStore } from '../shared/store.js';
import { downloadJSON, pickJSON } from '../shared/files.js';
import {
  RASS_LEVELS,
  RASS_CITES,
  DTS,
  BCAM,
  FOURAT,
  PATHWAYS,
  ACT_POSITIVE,
  EXAMPLE_ASSESSMENT,
} from './data/instruments.js';
import {
  blankAssessment,
  sanitizeAssessment,
  sanitizeSettings,
  looksLikeEdAssessment,
} from './state.js';
import { evalDts, arousalGate, bcamInattention, evalBcam, eval4at } from './scoring.js';
import { captureNodeToPdf } from '../shared/capture-pdf.js';
import { REFS } from './data/refs.js';

// ── State ────────────────────────────────────────────────────────────────────

let state = blankAssessment();
let settings = { facility: '', defaultPathway: 'twostep' };

const store = makeStore('deliriumtool:ed');
const settingsStore = makeStore('deliriumtool:ed:settings');

const activePathway = () =>
  state.pathway ||
  (['twostep', 'bcam', 'fourat'].includes(settings.defaultPathway)
    ? settings.defaultPathway
    : 'twostep');

/** True once any clinical input exists (drives the assessed-at stamp and the
 *  import-overwrite confirmation). */
const hasClinicalInput = () =>
  state.rass !== '' ||
  state.lunchTaps.length > 0 ||
  state.lunchDone ||
  state.lunchUnable ||
  state.f1 !== '' ||
  state.monthTaps.length > 0 ||
  state.monthDone ||
  state.monthUnable ||
  state.f4 !== '' ||
  Object.values(state.fourat).some((v) => v !== '');

/** True once any bCAM feature has been touched (summary wording). */
const bcamStarted = () =>
  state.f1 !== '' ||
  state.monthTaps.length > 0 ||
  state.monthDone ||
  state.monthUnable ||
  state.f4 !== '';

const nowLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const stampIfClinical = () => {
  if (!state.assessedAt && hasClinicalInput()) state.assessedAt = nowLocal();
};

/**
 * Keep dependent answers consistent with the gates: the LUNCH task only
 * exists at RASS 0; a task marked "unable" has no countable taps; and once
 * the DTS is negative or the arousal gate closes on the two-step path, the
 * bCAM answers behind it are stale and must not linger in state or exports.
 * Answers under a *different pathway* are preserved deliberately (switching
 * pathways asks for confirmation, and switching back restores the work).
 */
function enforceGates() {
  if (state.rass !== '0') {
    state.lunchTaps = [];
    state.lunchDone = false;
    state.lunchUnable = false;
  }
  if (state.lunchUnable) {
    state.lunchTaps = [];
    state.lunchDone = false;
  }
  if (state.monthUnable) {
    state.monthTaps = [];
    state.monthDone = false;
  }
  const gate = arousalGate(state.rass);
  const bcamReachable =
    (activePathway() === 'twostep' && evalDts(state) === 'positive' && gate === 'ok') ||
    (activePathway() === 'bcam' && gate === 'ok');
  if (!bcamReachable && activePathway() !== 'fourat') {
    state.f1 = '';
    state.monthTaps = [];
    state.monthDone = false;
    state.monthUnable = false;
    state.f4 = '';
  }
}

// ── Glossary ─────────────────────────────────────────────────────────────────

const ED_GLOSSARY = {
  DTS: 'Delirium Triage Screen',
  bCAM: 'Brief Confusion Assessment Method',
  '4AT': 'Assessment Test for Delirium & Cognitive Impairment',
  RASS: 'Richmond Agitation-Sedation Scale',
  AMT4: 'Abbreviated Mental Test - 4 items',
  ED: 'Emergency Department',
  GED: 'Geriatric Emergency Department',
  ADEPT: 'Assess, Diagnose, Evaluate, Prevent, Treat',
  'ED-DEL': 'Delirium in the Older Emergency Department Patient (ACEP change package)',
  ACEP: 'American College of Emergency Physicians',
  SIGN: 'Scottish Intercollegiate Guidelines Network',
  NICE: 'National Institute for Health and Care Excellence',
  'CAM-ICU': 'Confusion Assessment Method for the ICU',
};

// ── Small builders ───────────────────────────────────────────────────────────

const fmtRass = (v) => (v === '0' ? '0' : v.replace('-', '−'));
const fmtWhen = (v) => (v ? v.replace('T', ' ') : '');

function zoneOf(v) {
  const n = Number(v);
  if (n >= 1) return 'agi';
  if (n === 0) return 'calm';
  return 'sed';
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

/**
 * Update a verdict banner only when it actually changed — these are aria-live
 * regions, and rewriting identical text re-announces it to screen readers on
 * every unrelated interaction.
 */
function setVerdict(node, cls, text) {
  const stamp = `${cls}|${text}`;
  if (node.dataset.v === stamp) return;
  node.dataset.v = stamp;
  node.className = `verdict ${cls}`;
  node.textContent = text;
}

/**
 * Re-render wrapper that keeps keyboard focus alive: the renderers rebuild
 * controls with replaceChildren, which would otherwise drop focus to <body>
 * after every selection.
 */
function focusKeyOf(node) {
  if (!node || node === document.body) return null;
  const act = node.dataset?.act;
  if (!act) return null;
  const parts = [act];
  if (node.name) parts.push(node.name, node.value);
  if (node.dataset.idx) parts.push(node.dataset.idx);
  if (node.dataset.item) parts.push(node.dataset.item);
  if (node.dataset.id) parts.push(node.dataset.id);
  return parts;
}

function restoreFocus(key) {
  if (!key) return;
  const [act, ...rest] = key;
  const candidates = $$(`[data-act="${act}"]`).filter((n) => {
    const k = focusKeyOf(n);
    return k && k.join('\u001f') === [act, ...rest].join('\u001f');
  });
  if (candidates[0]) candidates[0].focus({ preventScroll: true });
}

// ── Screen tab rendering ─────────────────────────────────────────────────────

function renderPathwayPick() {
  const box = $('#pathway-pick');
  box.replaceChildren(
    ...PATHWAYS.map((p) => {
      const input = el('input', {
        type: 'radio',
        name: 'ed-pathway',
        value: p.id,
        'data-act': 'pathway',
      });
      if (activePathway() === p.id) input.checked = true;
      return el(
        'label',
        { class: 'opt-row opt-row--pathway' },
        input,
        el('span', { text: p.name }),
        el('span', { class: 'opt-sub', text: `${p.who} — ${p.how}` }),
      );
    }),
  );
}

function renderRass() {
  const box = $('#ed-rass');
  box.replaceChildren(
    ...RASS_LEVELS.map((r) => {
      const input = el('input', { type: 'radio', name: 'ed-rass', value: r.v, 'data-act': 'rass' });
      if (state.rass === r.v) input.checked = true;
      const text = el('span', { class: 'ascale-text' }, el('strong', { text: r.label }));
      if (r.desc) text.append(el('span', { class: 'ascale-desc', text: r.desc }));
      const row = el(
        'label',
        { class: 'ascale-opt', 'data-zone': zoneOf(r.v) },
        input,
        el('span', { class: 'ascale-v', text: fmtRass(r.v) }),
        text,
      );
      if (arousalGate(r.v) === 'unable') {
        row.append(el('span', { class: 'ascale-tag', text: 'unable' }));
      }
      return row;
    }),
  );
}

function errorChips({ items, taps, act, label, disabled }) {
  const grid = el('div', { class: 'errgrid', role: 'group', 'aria-label': label });
  items.forEach((chipLabel, i) => {
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
      el('span', { class: 'errchip-n', text: chipLabel }),
    );
    if (disabled) chip.disabled = true;
    grid.append(chip);
  });
  return grid;
}

function taskFooter({ doneAct, done, doneLabel, unableAct, unable }) {
  const doneInput = el('input', { type: 'checkbox', 'data-act': doneAct });
  doneInput.checked = done;
  if (unable) doneInput.disabled = true;
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

function segmented({ name, act, options, selected, label }) {
  const group = el('div', { class: 'pseg', role: 'radiogroup', 'aria-label': label || name });
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

  // Panel visibility first — nothing below may early-return past this.
  $('#panel-twostep').hidden = pathway === 'fourat';
  $('#card-arousal').hidden = pathway === 'fourat';

  $('#arousal-lead').textContent =
    pathway === 'bcam'
      ? 'Score the RASS first — it is bCAM Feature 3 (any RASS other than 0 is positive). RASS −4/−5 is stupor or coma — record “unable to assess” and reassess when the patient responds to voice.'
      : 'Score the RASS first. A RASS other than 0 makes the DTS positive on its own; at RASS 0, the LUNCH-backwards task decides. RASS −4/−5 is stupor or coma — record “unable to assess” and reassess when the patient responds to voice.';

  // DTS attention task (only meaningful at RASS 0, only on the two-step path).
  const dtsCard = $('#dts-card');
  dtsCard.hidden = pathway !== 'twostep';
  if (pathway === 'twostep') {
    const lunch = $('#dts-lunch');
    lunch.replaceChildren(
      el('p', { class: 'task-script', text: DTS.attention.script }),
      el('p', { class: 'task-help', text: DTS.attention.help }),
      el('p', { class: 'task-expected', text: 'Expected: H · C · N · U · L' }),
      errorChips({
        items: DTS.attention.items,
        taps: state.lunchTaps,
        act: 'lunchTap',
        label: 'Letters missed — LUNCH backwards',
        disabled: state.lunchUnable,
      }),
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
    if (gate === 'unable') {
      setVerdict(
        dtsOut,
        'v-warn',
        'RASS −4/−5 — stupor or coma. Delirium content cannot be assessed now; reassess when the patient responds to voice.',
      );
    } else if (dts === null) {
      setVerdict(
        dtsOut,
        'v-pending',
        state.rass === ''
          ? 'Record the RASS to begin.'
          : 'Run the LUNCH-backwards task and check “Task performed” to complete the DTS.',
      );
    } else if (dts === 'negative') {
      setVerdict(dtsOut, 'v-neg', DTS.verdicts.negative);
    } else {
      setVerdict(dtsOut, 'v-pos', DTS.verdicts.positive);
    }
  }

  // bCAM: after a positive DTS on the two-step path, or directly on the bCAM path.
  const bcamCard = $('#bcam-card');
  const showBcam =
    (pathway === 'twostep' && dts === 'positive' && gate === 'ok') ||
    (pathway === 'bcam' && state.rass !== '' && gate === 'ok');
  if (pathway === 'bcam' && gate === 'unable') {
    bcamCard.hidden = false;
    $('#bcam-body').hidden = true;
    setVerdict(
      $('#bcam-verdict'),
      'v-warn',
      'RASS −4/−5 — stupor or coma. Delirium content cannot be assessed now; reassess when the patient responds to voice.',
    );
    $('#bcam-act-jump').hidden = true;
  } else {
    bcamCard.hidden = !showBcam;
    if (showBcam) {
      $('#bcam-body').hidden = false;
      renderBcam();
    }
  }
}

function renderBcam() {
  const f1help = $('#bcam-f1-help');
  if (f1help) f1help.textContent = BCAM.features.find((f) => f.id === 'f1').help;
  const f4help = $('#bcam-f4-help');
  if (f4help) f4help.textContent = BCAM.features.find((f) => f.id === 'f4').help;
  const f1 = $('#bcam-f1');
  f1.replaceChildren(
    segmented({
      name: 'bcam-f1',
      act: 'f1',
      label: 'Feature 1 result',
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
    errorChips({
      items: f2feature.items,
      taps: state.monthTaps,
      act: 'monthTap',
      label: 'Months missed — December backwards to July',
      disabled: state.monthUnable,
    }),
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

  // Feature 4 — not required when Feature 3 already satisfies the algorithm.
  const f4fs = $('#bcam-f4-fieldset');
  f4fs.classList.toggle('feature--optional', altered);
  const f4note = $('#bcam-f4-optional');
  f4note.hidden = !altered;

  const f4feature = BCAM.features.find((f) => f.id === 'f4');
  $('#bcam-f4-set').replaceChildren(
    segmented({
      name: 'bcam-f4-set',
      act: 'f4Set',
      label: 'Question set',
      options: [
        { value: 'a', label: 'Question set A' },
        { value: 'b', label: 'Question set B' },
      ],
      selected: state.f4Set,
    }),
  );
  $('#bcam-f4-questions').replaceChildren(
    ...f4feature.sets[state.f4Set === 'b' ? 'b' : 'a'].map((q) => el('li', { text: q })),
    el('li', { class: 'f4-command', text: f4feature.command }),
  );
  $('#bcam-f4').replaceChildren(
    segmented({
      name: 'bcam-f4-res',
      act: 'f4',
      label: 'Feature 4 result',
      options: [
        { value: 'none', label: 'No errors' },
        { value: 'errors', label: '1 or more errors' },
        { value: 'unable', label: 'Incomprehensible / no attempt (counts as positive)' },
      ],
      selected: state.f4,
    }),
  );

  const verdict = evalBcam({
    f1: state.f1 || undefined,
    f2: bcamInattention(state),
    rass: state.rass,
    f4AnyError: state.f4 === '' ? null : state.f4 !== 'none',
  });
  const out = $('#bcam-verdict');
  if (verdict === null) {
    setVerdict(
      out,
      'v-pending',
      'Complete Feature 1, Feature 2, and (if the RASS is 0) Feature 4 to score.',
    );
  } else if (verdict === 'positive') {
    setVerdict(out, 'v-pos', `${BCAM.verdicts.positive} Find the cause — see the next steps.`);
  } else {
    setVerdict(
      out,
      'v-neg',
      `${BCAM.verdicts.negative} Rescreen with any change in mental status.`,
    );
  }
  $('#bcam-act-jump').hidden = verdict !== 'positive';
}

function fouratValues() {
  return Object.fromEntries(
    FOURAT.items.map((i) => [
      i.id,
      state.fourat[i.id] === '' ? '' : Number(String(state.fourat[i.id]).split(':')[0]),
    ]),
  );
}

function render4at() {
  const host = $('#panel-fourat');
  const note = $('#fourat-note');
  if (note) note.textContent = FOURAT.notes.join(' ');
  const box = $('#fourat-items');
  box.replaceChildren(
    ...FOURAT.items.map((item) => {
      const fs = el(
        'fieldset',
        { class: 'pseg-row' },
        el('legend', { class: 'pseg-legend', text: item.title }),
        el('p', { class: 'task-help', text: item.help }),
      );
      const group = el('div', {
        class: 'pseg pseg--stack',
        role: 'radiogroup',
        'aria-label': `${item.title} rating`,
      });
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

  const res = eval4at(fouratValues());
  const out = $('#fourat-verdict');
  if (!res.complete) {
    setVerdict(out, 'v-pending', 'Rate all four items to score the 4AT.');
  } else if (res.band.verdict === 'positive') {
    setVerdict(
      out,
      'v-pos',
      `4AT ${res.score}/12 — ${res.band.label}. A score of 4 or more suggests delirium but is not diagnostic. Find the cause — see the next steps.`,
    );
  } else if (res.band.verdict === 'cognitive') {
    setVerdict(
      out,
      'v-cog',
      `4AT ${res.score}/12 — ${res.band.label}. More detailed cognitive testing and informant history-taking are required.`,
    );
  } else {
    setVerdict(
      out,
      'v-neg',
      `4AT ${res.score}/12 — ${res.band.label} (delirium still possible if the item-4 information is incomplete). Rescreen with any change in mental status.`,
    );
  }
  $('#fourat-act-jump').hidden = !(res.complete && res.band.verdict === 'positive');
  host.hidden = activePathway() !== 'fourat';
}

// ── Act tab ──────────────────────────────────────────────────────────────────

function renderAct() {
  const box = $('#act-blocks');
  box.replaceChildren(
    ...ACT_POSITIVE.map((b) =>
      el(
        'section',
        { class: 'card act-card' },
        el('h2', { text: b.head }),
        el(
          'ul',
          { class: 'act-list' },
          ...b.items.map((t, i) => {
            const id = `${b.id}-${i}`;
            const input = el('input', { type: 'checkbox', 'data-act': 'action', 'data-id': id });
            if (state.actions.includes(id)) input.checked = true;
            return el(
              'li',
              {},
              el('label', { class: 'chk act-chk' }, input, el('span', { text: t })),
            );
          }),
        ),
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
  lines.push(['Assessor', state.assessor || '—']);
  lines.push(['Assessed', fmtWhen(state.assessedAt) || '—']);
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
              ? 'Positive'
              : 'Negative — delirium ruled out',
      ]);
    if (activePathway() === 'bcam' && gate === 'unable') {
      lines.push(['bCAM', 'Unable to assess (RASS −4/−5) — reassess later']);
    }
    if ((dts === 'positive' || activePathway() === 'bcam') && gate === 'ok') {
      const verdict = evalBcam({
        f1: state.f1 || undefined,
        f2: bcamInattention(state),
        rass: state.rass,
        f4AnyError: state.f4 === '' ? null : state.f4 !== 'none',
      });
      lines.push([
        'bCAM',
        verdict === null
          ? bcamStarted()
            ? 'In progress'
            : 'Not yet performed'
          : verdict === 'positive'
            ? 'POSITIVE — delirium present'
            : 'Negative',
      ]);
    }
  } else {
    const res = eval4at(fouratValues());
    lines.push(['4AT', res.complete ? `${res.score}/12 — ${res.band.label}` : 'Incomplete']);
  }
  if (state.actions.length) {
    const heads = ACT_POSITIVE.filter((b) =>
      b.items.some((_, i) => state.actions.includes(`${b.id}-${i}`)),
    ).map((b) => b.head.split(' — ')[0]);
    lines.push(['Actions started', `${state.actions.length} (${heads.join('; ')})`]);
  }
  if (state.notes.trim()) lines.push(['Notes', state.notes.trim()]);
  return lines;
}

function overallVerdict() {
  const pathway = activePathway();
  if (pathway === 'fourat') {
    const res = eval4at(fouratValues());
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
    f4AnyError: state.f4 === '' ? null : state.f4 !== 'none',
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
    fac.textContent = [settings.facility || 'Your facility', fmtWhen(state.assessedAt)]
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
    const stamp = `${v.cls}|${v.text}`;
    if (banner.dataset.v !== stamp) {
      banner.dataset.v = stamp;
      banner.className = `verdict sumdoc-verdict ${v.cls}`;
      banner.textContent = v.text;
    }
  }
  // Keep the editable fields in sync without clobbering active typing.
  const notes = $('#ed-notes');
  if (notes && document.activeElement !== notes) notes.value = state.notes;
  const assessor = $('#ed-assessor');
  if (assessor && document.activeElement !== assessor) assessor.value = state.assessor;
  const when = $('#ed-assessed');
  if (when && document.activeElement !== when) when.value = state.assessedAt;
}

// ── Sources footer (rendered from the citation registry — no hand copies) ────

function renderSources() {
  const fill = (sel, keys) => {
    const node = $(sel);
    if (node) node.replaceChildren(...citesLine(keys).childNodes);
  };
  fill('#arousal-cites', RASS_CITES);
  fill('#dts-cites', DTS.cites);
  fill('#bcam-cites', BCAM.cites);
  fill('#fourat-cites', FOURAT.cites);
  const list = $('#src-list');
  if (!list) return;
  list.replaceChildren(
    ...Object.values(REFS).map((r) =>
      el('li', {}, `${r.c} `, el('a', { href: r.u, target: '_blank', rel: 'noopener', text: r.l })),
    ),
  );
}

// ── Rendering root ───────────────────────────────────────────────────────────

function renderAll() {
  const focusKey = focusKeyOf(document.activeElement);
  renderPathwayPick();
  renderRass();
  renderTwostep();
  render4at();
  renderAct();
  renderSummary();
  applyGlossary(ED_GLOSSARY, document.querySelectorAll('#tab-screen, #tab-act'));
  restoreFocus(focusKey);
  store.autosave(state);
}

// ── Events ───────────────────────────────────────────────────────────────────

const CLINICAL_ACTS = new Set([
  'pathway',
  'rass',
  'lunchDone',
  'lunchUnable',
  'f1',
  'monthDone',
  'monthUnable',
  'f4Set',
  'f4',
  'fourat',
]);

function onChange(e) {
  const t = e.target;
  const act = t.dataset.act;
  if (!act) return;
  switch (act) {
    case 'pathway':
      if (
        hasClinicalInput() &&
        t.value !== activePathway() &&
        !window.confirm(
          'Switch the screening pathway? The summary will report the newly selected pathway; answers already recorded stay saved and reappear if you switch back.',
        )
      ) {
        renderAll();
        return;
      }
      state.pathway = t.value;
      break;
    case 'rass':
      state.rass = t.value;
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
    case 'action': {
      const id = t.dataset.id;
      state.actions = t.checked
        ? [...new Set([...state.actions, id])]
        : state.actions.filter((x) => x !== id);
      break;
    }
    case 'facility':
      settings.facility = t.value.slice(0, 120);
      settingsStore.autosave(settings);
      renderSummary();
      return;
    case 'defaultPathway':
      // Pin an in-progress assessment to the pathway it was scored under —
      // changing the unit default must not silently rewrite its summary.
      if (hasClinicalInput() && state.pathway === '') state.pathway = activePathway();
      settings.defaultPathway = t.value;
      settingsStore.autosave(settings);
      break;
    case 'assessor':
      state.assessor = t.value.slice(0, 120);
      store.autosave(state);
      renderSummary();
      return;
    case 'assessedAt':
      state.assessedAt = t.value;
      store.autosave(state);
      renderSummary();
      return;
    case 'notes':
      state.notes = t.value.slice(0, 1000);
      store.autosave(state);
      renderSummary();
      return;
    default:
      return;
  }
  if (CLINICAL_ACTS.has(act)) {
    enforceGates();
    stampIfClinical();
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
    if (key === 'lunchTaps') state.lunchUnable = false;
    if (key === 'monthTaps') state.monthUnable = false;
    enforceGates();
    stampIfClinical();
    renderAll();
    return;
  }
  switch (btn.dataset.act) {
    case 'goto-act':
      showTab('act');
      $('#tab-act').focus();
      break;
    case 'reset':
      if (!window.confirm('Start a new assessment? The current one will be cleared.')) return;
      state = blankAssessment();
      store.clearSaved();
      renderAll();
      showTab('screen');
      break;
    case 'export':
      downloadJSON(state, 'ed-delirium-assessment.json');
      break;
    case 'import':
      pickJSON().then((raw) => {
        if (raw == null) return;
        if (raw.__error || !looksLikeEdAssessment(raw)) {
          announce('That file is not a saved ED assessment.');
          window.alert(
            'That file could not be read as an ED assessment. (Files saved from the ICU or pediatric tools cannot be loaded here.)',
          );
          return;
        }
        if (
          hasClinicalInput() &&
          !window.confirm('Replace the in-progress assessment with the loaded one?')
        ) {
          return;
        }
        state = sanitizeAssessment(raw);
        renderAll();
        announce('Assessment loaded.');
      });
      break;
    case 'print':
      window.print();
      break;
    case 'example':
      state = sanitizeAssessment(EXAMPLE_ASSESSMENT);
      state.assessedAt = nowLocal();
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
  if (looksLikeEdAssessment(saved)) {
    state = sanitizeAssessment(saved);
  }
  settings = sanitizeSettings(settingsStore.loadSaved());
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
renderSources();
applyGlossary(ED_GLOSSARY, document.querySelectorAll('.tab-panel'));
wireTablist(showTab);
document.addEventListener('change', onChange);
document.addEventListener('input', (e) => {
  const act = e.target.dataset?.act;
  if (act === 'notes' || act === 'facility' || act === 'assessor') onChange(e);
});
document.addEventListener('click', onClick);
window.addEventListener('pagehide', () => {
  store.flushSave(state);
  settingsStore.flushSave(settings);
});
