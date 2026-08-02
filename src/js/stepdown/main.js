/**
 * stepdown/main.js — the adult step-down / progressive-care delirium tool.
 *
 * A verbal, monitored-but-non-ICU screen built on the CAM-IMC (Beyer 2024), with an
 * arousal gate (RASS), an admission risk score (Martinez 2012), and a multicomponent
 * prevention bundle (Cochrane / HELP / AGS). Everything runs in the browser — no
 * patient data leaves the device. Reference aid only.
 */
import { wireTablist, applyGlossary, faIcon, el, $, $$ } from '../shared/dom.js';
import { initA11y } from '../shared/a11y.js';
import { makeStore } from '../shared/store.js';
import { downloadJSON, pickJSON } from '../shared/files.js';
import {
  RASS_LEVELS,
  RASS_CITES,
  CAMIMC,
  RISK,
  PREVENTION,
  EXAMPLE_ASSESSMENT,
} from './data/instruments.js';
import {
  blankAssessment,
  sanitizeAssessment,
  sanitizeSettings,
  looksLikeStepdownAssessment,
} from './state.js';
import { arousalGate, evalCamImc, evalRisk } from './scoring.js';
import { generateStepdownReport } from './report.js';
import { REFS } from './data/refs.js';

// ── State ────────────────────────────────────────────────────────────────────

let state = blankAssessment();
let settings = { facility: '' };
const settingsStore = makeStore('deliriumtool:stepdown:settings');

const hasClinicalInput = () =>
  state.rass !== '' ||
  state.camimc.acute !== '' ||
  state.camimc.inattention !== '' ||
  state.camimc.inattentionUnable ||
  state.camimc.disorientTaps.length > 0 ||
  state.camimc.disorientDone ||
  state.risk.age85 ||
  state.risk.adlDeps.length > 0 ||
  state.risk.psychoDrugs.length > 0 ||
  state.prevention.length > 0;

const nowLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const stampIfClinical = () => {
  if (!state.assessedAt && hasClinicalInput()) state.assessedAt = nowLocal();
};

/** Keep the "unable" flag and the error count mutually exclusive. */
function enforceGates() {
  if (state.camimc.inattentionUnable) state.camimc.inattention = '';
}

// ── Glossary ─────────────────────────────────────────────────────────────────

const SD_GLOSSARY = {
  'CAM-IMC': 'Confusion Assessment Method for the Intermediate Care Unit',
  'CAM-ICU': 'Confusion Assessment Method for the ICU',
  RASS: 'Richmond Agitation-Sedation Scale',
  '3D-CAM': '3-Minute Diagnostic Assessment for CAM-defined delirium',
  PCU: 'Progressive Care Unit',
  IMC: 'Intermediate Care',
  ADL: 'Activities of Daily Living',
  HELP: 'Hospital Elder Life Program',
  PICS: 'Post-Intensive Care Syndrome',
};

// ── Small helpers ─────────────────────────────────────────────────────────────

const fmtRass = (v) => (v === '0' ? '0' : v.replace('-', '−'));
const fmtWhen = (v) => (v ? v.replace('T', ' ') : '');

function zoneOf(v) {
  const n = Number(v);
  if (n >= 1) return 'agi';
  if (n === 0) return 'calm';
  if (n <= -4) return 'coma';
  return 'sed';
}

// A shape per arousal zone, so the ladder reads by icon as well as colour.
const ZONE_ICONS = {
  agi: 'triangle-exclamation',
  calm: 'circle-check',
  sed: 'moon',
  coma: 'bed-pulse',
};

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

function setVerdict(node, cls, text) {
  if (!node) return;
  const stamp = `${cls}|${text}`;
  if (node.dataset.v === stamp) return;
  node.dataset.v = stamp;
  node.className = `verdict ${cls}`;
  node.textContent = text;
}

function segmented({ name, act, options, selected, label, stack, extra }) {
  const group = el('div', {
    class: `pseg${stack ? ' pseg--stack' : ''}`,
    role: 'radiogroup',
    'aria-label': label || name,
  });
  for (const o of options) {
    const input = el('input', { type: 'radio', name, value: String(o.value), 'data-act': act });
    if (String(selected) === String(o.value) && selected !== '') input.checked = true;
    for (const [k, v] of Object.entries(extra || {})) input.setAttribute(k, v);
    group.append(el('label', { class: 'pseg-opt' }, input, el('span', { text: o.label })));
  }
  return group;
}

// ── Focus preservation across re-render ──────────────────────────────────────

function focusKeyOf(node) {
  if (!node || node === document.body) return null;
  const act = node.dataset?.act;
  if (!act) return null;
  const parts = [act];
  if (node.name) parts.push(node.name, node.value);
  if (node.dataset.idx) parts.push(node.dataset.idx);
  if (node.dataset.id) parts.push(node.dataset.id);
  return parts;
}

function restoreFocus(key) {
  if (!key) return;
  const [act, ...rest] = key;
  const candidates = $$(`[data-act="${act}"]`).filter((n) => {
    const k = focusKeyOf(n);
    return k && k.join('') === [act, ...rest].join('');
  });
  if (candidates[0]) candidates[0].focus({ preventScroll: true });
}

// ── Screening tab ─────────────────────────────────────────────────────────────

function renderRass() {
  const box = $('#sd-rass');
  if (!box) return;
  box.replaceChildren(
    ...RASS_LEVELS.map((r) => {
      const input = el('input', { type: 'radio', name: 'sd-rass', value: r.v, 'data-act': 'rass' });
      if (state.rass === r.v) input.checked = true;
      const text = el('span', { class: 'ascale-text' }, el('strong', { text: r.label }));
      if (r.desc) text.append(el('span', { class: 'ascale-desc', text: r.desc }));
      const zone = zoneOf(r.v);
      const row = el(
        'label',
        { class: 'ascale-opt', 'data-zone': zone },
        input,
        faIcon(`fa-${ZONE_ICONS[zone]}`),
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

function renderCamImc() {
  const res = evalCamImc(state);

  // Acute change / fluctuation.
  const acute = $('#camimc-acute');
  if (acute) {
    acute.replaceChildren(
      segmented({
        name: 'camimc-acute',
        act: 'acute',
        label: 'Acute change or fluctuation',
        options: [
          { value: 'yes', label: 'Yes (+1)' },
          { value: 'no', label: 'No' },
        ],
        selected: state.camimc.acute,
      }),
    );
  }

  // Altered LOC — derived from the RASS.
  const loc = $('#camimc-loc');
  if (loc) {
    const altered = state.rass !== '' && state.rass !== '0';
    loc.textContent =
      state.rass === ''
        ? 'Record the RASS above — any value other than 0 scores 1 point.'
        : altered
          ? `Positive (+1) — RASS ${fmtRass(state.rass)} (anything other than 0).`
          : 'Negative — RASS 0.';
  }

  // Inattention — 10-letter word test.
  const inatt = $('#camimc-inatt');
  if (inatt) {
    const unableInput = el('input', { type: 'checkbox', 'data-act': 'inattUnable' });
    unableInput.checked = state.camimc.inattentionUnable;
    const seg = segmented({
      name: 'camimc-inatt',
      act: 'inatt',
      label: 'Inattention errors',
      options: CAMIMC.inattention.options.map((o) => ({ value: o.v, label: o.label })),
      selected: state.camimc.inattention,
    });
    if (state.camimc.inattentionUnable) {
      seg.querySelectorAll('input').forEach((i) => (i.disabled = true));
    }
    inatt.replaceChildren(
      el('p', { class: 'task-script', text: CAMIMC.inattention.script }),
      el('p', { class: 'task-help', text: CAMIMC.inattention.help }),
      seg,
      el(
        'label',
        { class: 'chk' },
        unableInput,
        el('span', { text: CAMIMC.inattention.unableLabel }),
      ),
    );
  }

  // Disorientation — five dimensions, one point per error; done toggle.
  const diso = $('#camimc-diso');
  if (diso) {
    const grid = el('div', {
      class: 'errgrid',
      role: 'group',
      'aria-label': 'Disorientation errors',
    });
    CAMIMC.disorientation.dimensions.forEach((dim, i) => {
      const on = state.camimc.disorientTaps.includes(i);
      grid.append(
        el(
          'button',
          {
            type: 'button',
            class: `errchip${on ? ' is-err' : ''}`,
            'data-act': 'disoErr',
            'data-idx': String(i),
            'aria-pressed': on ? 'true' : 'false',
          },
          el('span', { text: dim }),
        ),
      );
    });
    const doneInput = el('input', { type: 'checkbox', 'data-act': 'disoDone' });
    doneInput.checked = state.camimc.disorientDone;
    diso.replaceChildren(
      el('p', { class: 'task-help', text: CAMIMC.disorientation.help }),
      el('p', {
        class: 'task-expected',
        text: 'Tap each dimension the patient answers incorrectly.',
      }),
      grid,
      el(
        'label',
        { class: 'chk' },
        doneInput,
        el('span', {
          text: `Item assessed — ${state.camimc.disorientTaps.length} error${state.camimc.disorientTaps.length === 1 ? '' : 's'}`,
        }),
      ),
    );
  }

  // Live running total.
  const total = $('#camimc-total');
  if (total) {
    total.textContent = res.unable ? '—' : `${res.score}`;
  }

  // Verdict.
  const out = $('#camimc-verdict');
  if (res.unable) {
    setVerdict(out, 'v-warn', CAMIMC.verdicts.unable);
  } else if (res.positive === true) {
    setVerdict(out, 'v-pos', `CAM-IMC ${res.score}/10 — ${CAMIMC.verdicts.positive}`);
  } else if (res.complete && res.positive === false) {
    setVerdict(out, 'v-neg', `CAM-IMC ${res.score}/10 — ${CAMIMC.verdicts.negative}`);
  } else {
    setVerdict(
      out,
      'v-pending',
      state.rass === ''
        ? 'Record the RASS to begin.'
        : 'Complete all four features (acute change, arousal, inattention, disorientation) to score.',
    );
  }
}

// ── Risk tab ──────────────────────────────────────────────────────────────────

function renderRisk() {
  const box = $('#risk-items');
  if (box) {
    const ageInput = el('input', { type: 'checkbox', 'data-act': 'riskAge' });
    ageInput.checked = state.risk.age85;

    const adlGrid = el('div', { class: 'chk-list' });
    RISK.adl.activities.forEach((a, i) => {
      const inp = el('input', { type: 'checkbox', 'data-act': 'adlDep', 'data-idx': String(i) });
      if (state.risk.adlDeps.includes(i)) inp.checked = true;
      adlGrid.append(el('label', { class: 'chk' }, inp, el('span', { text: a })));
    });
    const n = state.risk.adlDeps.length;
    const met = n >= RISK.adl.threshold;
    const adlCount = el('p', {
      class: `adl-count${met ? ' is-met' : ''}`,
      role: 'status',
      'aria-live': 'polite',
      text: `${n} of 6 dependent — scores +1 at ${RISK.adl.threshold} of 6${met ? ' (+1 applied)' : ''}`,
    });

    const psy = RISK.psychotropic;
    const psychoGrid = el('div', { class: 'chk-list' });
    psy.drugs.forEach((d) => {
      const inp = el('input', { type: 'checkbox', 'data-act': 'psychoDrug', 'data-id': d.id });
      if (state.risk.psychoDrugs.includes(d.id)) inp.checked = true;
      psychoGrid.append(
        el('label', { class: 'chk' }, inp, el('span', { text: `${d.label} (+${d.pts})` })),
      );
    });
    const psySub = psy.drugs
      .filter((d) => state.risk.psychoDrugs.includes(d.id))
      .reduce((a, d) => a + d.pts, 0);
    const psyMet = psySub >= psy.threshold;
    const psyCount = el('p', {
      class: `adl-count${psyMet ? ' is-met' : ''}`,
      role: 'status',
      'aria-live': 'polite',
      text: `Subtotal ${psySub} — scores +1 at ${psy.threshold}${psyMet ? ' (+1 applied)' : ''}`,
    });

    box.replaceChildren(
      el('label', { class: 'chk' }, ageInput, el('span', { text: `${RISK.items[0].label} (+1)` })),
      el(
        'fieldset',
        { class: 'pseg-row' },
        el('legend', { class: 'pseg-legend', text: `${RISK.adl.label} — 5 of 6 scores +1` }),
        el('p', { class: 'task-help', text: RISK.adl.help }),
        adlGrid,
        adlCount,
      ),
      el(
        'fieldset',
        { class: 'pseg-row' },
        el('legend', { class: 'pseg-legend', text: `${psy.label} — subtotal ≥ 2 scores +1` }),
        el('p', { class: 'task-help', text: psy.help }),
        psychoGrid,
        psyCount,
      ),
    );
  }
  const res = evalRisk(state);
  const out = $('#risk-verdict');
  const cls =
    res.band.label === 'High' ? 'v-pos' : res.band.label === 'Intermediate' ? 'v-warn' : 'v-neg';
  setVerdict(out, cls, `Risk ${res.score}/3 — ${res.band.label}. ${res.band.note}`);
}

// ── Prevention tab ────────────────────────────────────────────────────────────

function renderPrevention() {
  const box = $('#prevention-list');
  if (box) {
    box.replaceChildren(
      ...PREVENTION.components.map((c) => {
        const input = el('input', { type: 'checkbox', 'data-act': 'prevention', 'data-id': c.id });
        if (state.prevention.includes(c.id)) input.checked = true;
        return el('label', { class: 'chk bun' }, input, el('span', { text: c.label }));
      }),
    );
  }
  const n = state.prevention.length;
  const total = PREVENTION.components.length;
  const pct = total ? Math.round((n / total) * 100) : 0;
  const prog = $('#prevention-prog');
  if (prog) prog.textContent = `${n}/${total} applied · ${pct}%`;
  const fill = $('#prevention-fill');
  if (fill) {
    fill.style.width = `${pct}%`;
    fill.style.setProperty('--pct', pct);
    fill.classList.toggle('is-complete', total > 0 && n === total);
  }
  const markBtn = $('#prevention-markall');
  if (markBtn) markBtn.textContent = n === total && total > 0 ? 'Clear all' : 'Mark all';
}

// ── Summary tab ────────────────────────────────────────────────────────────────

function summaryLines() {
  const lines = [];
  lines.push(['Facility / unit', settings.facility || '—']);
  lines.push(['Assessor', state.assessor || '—']);
  lines.push(['Assessed', fmtWhen(state.assessedAt) || '—']);
  lines.push(['RASS', state.rass === '' ? '—' : fmtRass(state.rass)]);

  const cam = evalCamImc(state);
  lines.push([
    'CAM-IMC',
    cam.unable
      ? 'Unable to assess (RASS −4/−5) — reassess later'
      : cam.complete
        ? `${cam.score}/10 — ${cam.positive ? 'POSITIVE' : 'negative'}`
        : cam.positive
          ? `${cam.score}/10 — POSITIVE`
          : 'Incomplete',
  ]);

  const risk = evalRisk(state);
  lines.push(['Admission risk', `${risk.score}/3 — ${risk.band.label}`]);
  lines.push([
    'Prevention bundle',
    `${state.prevention.length}/${PREVENTION.components.length} applied`,
  ]);
  if (state.notes.trim()) lines.push(['Notes', state.notes.trim()]);
  return lines;
}

function overallVerdict() {
  const cam = evalCamImc(state);
  if (cam.unable)
    return { cls: 'v-warn', tone: 'warn', text: 'Unable to assess (RASS −4/−5) — reassess later.' };
  if (cam.positive === true)
    return {
      cls: 'v-pos',
      tone: 'pos',
      text: `CAM-IMC ${cam.score}/10 — screen positive for delirium. Evaluate the cause.`,
    };
  if (cam.complete && cam.positive === false)
    return {
      cls: 'v-neg',
      tone: 'neg',
      text: `CAM-IMC ${cam.score}/10 — screen negative. Rescreen with any change.`,
    };
  return { cls: 'v-pending', tone: 'pending', text: 'Assessment incomplete.' };
}

function reportModel() {
  const v = overallVerdict();
  const cam = evalCamImc(state);
  const risk = evalRisk(state);

  const c = state.camimc;
  const screen = cam.unable
    ? { unable: true, total: '—', result: 'Unable to assess', rows: [] }
    : {
        unable: false,
        total: `${cam.score}/10`,
        result: cam.complete
          ? cam.positive
            ? 'POSITIVE'
            : 'Negative'
          : cam.positive
            ? 'POSITIVE'
            : 'Incomplete',
        rows: [
          [
            'Acute change',
            c.acute === 'yes' ? 'Present (+1)' : c.acute === 'no' ? 'Absent (0)' : '—',
          ],
          [
            'Altered LOC',
            state.rass === ''
              ? '—'
              : state.rass !== '0'
                ? `RASS ${fmtRass(state.rass)} (+1)`
                : 'RASS 0 (0)',
          ],
          [
            'Inattention',
            c.inattentionUnable
              ? 'Unable (+3)'
              : c.inattention === ''
                ? '—'
                : `${c.inattention} error${c.inattention === '1' ? '' : 's'} (+${cam.parts.inattPts})`,
          ],
          [
            'Disorientation',
            c.disorientDone ? `${c.disorientTaps.length} of 5 errors (+${cam.parts.disoPts})` : '—',
          ],
        ],
      };

  const riskBlock = {
    score: `${risk.score}/3`,
    band: risk.band.label,
    rows: [
      ['Age ≥ 85', state.risk.age85 ? 'Yes (+1)' : 'No (0)'],
      [
        'ADL dependence',
        `${state.risk.adlDeps.length} of 6${state.risk.adlDeps.length >= RISK.adl.threshold ? ' (+1)' : ' (0)'}`,
      ],
      [
        'Psychotropic burden',
        state.risk.psychoDrugs.length
          ? `Subtotal ${risk.psychoSubtotal}${risk.psychoSubtotal >= RISK.psychotropic.threshold ? ' (+1)' : ' (0)'}`
          : '—',
      ],
    ],
  };

  const preventionItems = PREVENTION.components
    .filter((comp) => state.prevention.includes(comp.id))
    .map((comp) => comp.label);

  const citeKeys = new Set([...RASS_CITES, ...CAMIMC.cites, ...RISK.cites, ...PREVENTION.cites]);
  const refs = [...citeKeys]
    .map((k) => REFS[k])
    .filter(Boolean)
    .map((r) => ({ c: r.c, u: r.u }));

  return {
    facility: settings.facility || 'Your facility',
    sub: 'Adult step-down / progressive care',
    date: fmtWhen(state.assessedAt),
    assessor: state.assessor,
    verdict: { tone: v.tone, label: v.text },
    screen,
    risk: riskBlock,
    prevention: {
      count: `${state.prevention.length} of ${PREVENTION.components.length}`,
      items: preventionItems,
    },
    notes: state.notes.trim(),
    refs,
  };
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
  const notes = $('#sd-notes');
  if (notes && document.activeElement !== notes) notes.value = state.notes;
  const assessor = $('#sd-assessor');
  if (assessor && document.activeElement !== assessor) assessor.value = state.assessor;
  const when = $('#sd-assessed');
  if (when && document.activeElement !== when) when.value = state.assessedAt;
}

// ── Sources footer ─────────────────────────────────────────────────────────────

function renderSources() {
  const fill = (sel, keys) => {
    const node = $(sel);
    if (node) node.replaceChildren(...citesLine(keys).childNodes);
  };
  fill('#camimc-cites', CAMIMC.cites);
  fill('#arousal-cites', RASS_CITES);
  fill('#risk-cites', RISK.cites);
  fill('#prevention-cites', PREVENTION.cites);
  const list = $('#src-list');
  if (!list) return;
  list.replaceChildren(
    ...Object.values(REFS).map((r) =>
      el('li', {}, `${r.c} `, el('a', { href: r.u, target: '_blank', rel: 'noopener', text: r.l })),
    ),
  );
}

// ── Rendering root ─────────────────────────────────────────────────────────────

// Verdict glyph + tone per screen result, so a tab shows its state at a glance.
const VERDICT_BADGE = {
  'v-pos': { icon: 'fa-triangle-exclamation', tone: 'danger', label: 'Screen positive' },
  'v-neg': { icon: 'fa-circle-check', tone: 'ok', label: 'Screen negative' },
  'v-warn': { icon: 'fa-ban', tone: 'caution', label: 'Unable to assess' },
};

function setVerdictBadge(node, cls) {
  if (!node) return;
  node.className = 'tab-badge';
  const meta = VERDICT_BADGE[cls];
  if (meta) {
    node.classList.add('tone-' + meta.tone);
    node.replaceChildren(faIcon(meta.icon, 'fa fa-sm'));
    node.setAttribute('aria-label', meta.label);
    node.title = meta.label;
  } else {
    node.replaceChildren();
    node.removeAttribute('aria-label');
    node.removeAttribute('title');
  }
}

function updateTabBadges() {
  setVerdictBadge($('#tab-badge-screen'), overallVerdict().cls);

  const rb = $('#tab-badge-risk');
  if (rb) {
    const engaged =
      state.risk.age85 || state.risk.adlDeps.length > 0 || state.risk.psychoDrugs.length > 0;
    rb.className = 'tab-badge';
    if (engaged) {
      const risk = evalRisk(state);
      const tone =
        risk.band.label === 'High' ? 'danger' : risk.band.label === 'Low' ? 'ok' : 'caution';
      rb.classList.add('tone-' + tone);
      rb.textContent = `${risk.score}/3`;
    } else {
      rb.textContent = '';
    }
  }

  const pb = $('#tab-badge-prevent');
  if (pb) {
    const n = state.prevention.length;
    pb.textContent = n > 0 ? `${n}/${PREVENTION.components.length}` : '';
  }
}

function renderAll() {
  const focusKey = focusKeyOf(document.activeElement);
  renderRass();
  renderCamImc();
  renderRisk();
  renderPrevention();
  renderSummary();
  updateTabBadges();
  applyGlossary(SD_GLOSSARY, document.querySelectorAll('#tab-screen, #tab-risk, #tab-prevent'));
  restoreFocus(focusKey);
}

// ── Events ─────────────────────────────────────────────────────────────────────

const CLINICAL_ACTS = new Set([
  'rass',
  'acute',
  'inatt',
  'inattUnable',
  'disoDone',
  'riskAge',
  'adlDep',
  'psychoDrug',
]);

function onChange(e) {
  const t = e.target;
  const act = t.dataset.act;
  if (!act) return;
  switch (act) {
    case 'rass':
      state.rass = t.value;
      break;
    case 'acute':
      state.camimc.acute = t.value;
      break;
    case 'inatt':
      state.camimc.inattention = t.value;
      break;
    case 'inattUnable':
      state.camimc.inattentionUnable = t.checked;
      break;
    case 'disoDone':
      state.camimc.disorientDone = t.checked;
      break;
    case 'riskAge':
      state.risk.age85 = t.checked;
      break;
    case 'adlDep': {
      const i = Number(t.dataset.idx);
      state.risk.adlDeps = t.checked
        ? [...new Set([...state.risk.adlDeps, i])]
        : state.risk.adlDeps.filter((x) => x !== i);
      break;
    }
    case 'psychoDrug': {
      const id = t.dataset.id;
      state.risk.psychoDrugs = t.checked
        ? [...new Set([...state.risk.psychoDrugs, id])]
        : state.risk.psychoDrugs.filter((x) => x !== id);
      break;
    }
    case 'prevention': {
      const id = t.dataset.id;
      state.prevention = t.checked
        ? [...new Set([...state.prevention, id])]
        : state.prevention.filter((x) => x !== id);
      break;
    }
    case 'facility':
      settings.facility = t.value.slice(0, 120);
      settingsStore.autosave(settings);
      renderSummary();
      return;
    case 'assessor':
      state.assessor = t.value.slice(0, 120);
      renderSummary();
      return;
    case 'assessedAt':
      state.assessedAt = t.value;
      renderSummary();
      return;
    case 'notes':
      state.notes = t.value.slice(0, 1000);
      renderSummary();
      return;
    default:
      return;
  }
  if (CLINICAL_ACTS.has(act) || act === 'prevention') {
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
  if (btn.dataset.act === 'disoErr') {
    const i = Number(btn.dataset.idx);
    const taps = state.camimc.disorientTaps;
    state.camimc.disorientTaps = taps.includes(i) ? taps.filter((x) => x !== i) : [...taps, i];
    enforceGates();
    stampIfClinical();
    renderAll();
    return;
  }
  switch (btn.dataset.act) {
    case 'markAllPrev': {
      const all = PREVENTION.components.map((c) => c.id);
      const filling = state.prevention.length < all.length;
      state.prevention = filling ? all : [];
      enforceGates();
      stampIfClinical();
      renderAll();
      announce(filling ? 'All prevention components applied.' : 'Prevention components cleared.');
      break;
    }
    case 'reset':
      if (!window.confirm('Start a new assessment? The current one will be cleared.')) return;
      state = blankAssessment();
      renderAll();
      showTab('screen');
      break;
    case 'export':
      downloadJSON(state, 'stepdown-delirium-assessment.json');
      break;
    case 'import':
      pickJSON().then((raw) => {
        if (raw == null) return;
        if (raw.__error || !looksLikeStepdownAssessment(raw)) {
          announce('That file is not a saved step-down assessment.');
          window.alert(
            'That file could not be read as a step-down assessment. (Files saved from the ICU, ED, or pediatric tools cannot be loaded here.)',
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
    case 'example':
      state = sanitizeAssessment(EXAMPLE_ASSESSMENT);
      state.assessedAt = nowLocal();
      renderAll();
      announce('Example data loaded.');
      break;
    case 'savepdf':
      try {
        generateStepdownReport(reportModel());
        announce('Summary PDF saved.');
      } catch {
        announce('Could not generate the PDF.');
      }
      break;
    default:
  }
}

function announce(text) {
  const region = $('#sd-live');
  if (region) region.textContent = text;
}

// ── Init ───────────────────────────────────────────────────────────────────────

function restoreSettings() {
  settings = sanitizeSettings(settingsStore.loadSaved());
  const fac = $('#sd-facility');
  if (fac) fac.value = settings.facility;
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
// Every visit starts a fresh assessment — nothing restores on reload. Remove any
// snapshot left behind by earlier versions. Unit settings (facility) do persist.
try {
  localStorage.removeItem('deliriumtool:stepdown');
} catch {
  /* non-fatal */
}
restoreSettings();
renderAll();
renderSources();
applyGlossary(SD_GLOSSARY, document.querySelectorAll('.tab-panel'));
wireTablist(showTab);
document.addEventListener('change', onChange);
document.addEventListener('input', (e) => {
  const act = e.target.dataset?.act;
  if (act === 'notes' || act === 'facility' || act === 'assessor') onChange(e);
});
document.addEventListener('click', onClick);
window.addEventListener('pagehide', () => {
  settingsStore.flushSave(settings);
});
