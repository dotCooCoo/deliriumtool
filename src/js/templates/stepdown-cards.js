/**
 * templates/stepdown-cards.js — the adult step-down / progressive-care bedside
 * card set and workflow poster. Every clinical value renders from the step-down
 * tool's own data modules via data/stepdown-content.js, so the printed cards and
 * the interactive tool cannot disagree. Validated-instrument text (RASS anchors,
 * the CAM-IMC scripts and cut-point, the Martinez risk thresholds, the prevention
 * bundle) is deliberately not unit-editable.
 *
 * Reuses the shared card design system (`.pc-*`): one topic per card, semantic
 * zone colors, gate rules as first-class bars, and outcome chips.
 */
import {
  el,
  nobreak,
  circleBox,
  box,
  blank,
  checkItem,
  ov,
  secOn,
  itemOn,
  customLines,
} from './primitives.js';
import {
  sheetFooter,
  sheetIcon,
  AROUSAL_ZONE_ICON,
  pairColumnSheets,
  withNotes,
} from './sheets.js';
import {
  RASS_LEVELS,
  CAMIMC,
  RISK,
  PREVENTION,
  AROUSAL_ZONE,
  RASS_RAIL,
  AROUSAL_GATE,
  CAMIMC_POSITIVE,
  CAMIMC_MAX,
  CAMIMC_ATT_SCRIPT,
  INATT_MAX,
  DISO_MAX,
  DISO_DIMS,
  ADL_THRESHOLD,
  ADL_ACTIVITIES,
  PSYCHO_THRESHOLD,
  PSYCHO_DRUGS,
  RISK_BANDS,
  PREVENTION_ITEMS,
  ACT_COLUMNS,
  WORKFLOW_STAGES,
  HANDOFF_SCRIPT,
} from './data/stepdown-content.js';

// ── Shared card chrome (mirrors ed-cards.js / peds-cards.js) ─────────────────

// One card renders as a bordered column; renderStepdownCards pairs two columns
// per landscape sheet so the screening steps (and the risk/prevention pair) sit
// side by side rather than each taking a whole page.
function card(cls, ...kids) {
  return el('div', { class: `pc-col ${cls || ''}` }, ...kids);
}

function cardHead(tone, chipText, title, sub, icon) {
  return el(
    'div',
    { class: `pc-head tone-${tone}` },
    el('span', { class: 'pc-stepchip', text: chipText }),
    el(
      'div',
      { class: 'pc-head-text' },
      el(
        'div',
        { class: 'pc-title' },
        icon ? sheetIcon(icon, 'sh-ico pc-title-ico') : null,
        el('span', { text: title }),
      ),
      sub ? el('div', { class: 'pc-sub', text: sub }) : null,
    ),
  );
}

const outcomeChip = (kind, text) => el('span', { class: `pc-chip pc-chip--${kind}`, text });
const scriptBlock = (text) => el('div', { class: 'pc-script', text: nobreak(text) });

function featureStep(n, title, kids) {
  return el(
    'div',
    { class: 'pc-step' },
    el('div', { class: 'pc-step-n', text: String(n) }),
    el(
      'div',
      { class: 'pc-step-body' },
      el('div', { class: 'pc-step-title', text: title }),
      ...kids,
    ),
  );
}

// A compact, fillable score picker — a wrapping row of check-off options. Pass
// box() for independent errors that each score a point (disorientation), or
// circleBox() for a single graded pick (inattention: the options are mutually
// exclusive, so they become the sheet's one radio group in the fillable PDF).
function scoreSet(mk, labels) {
  return el(
    'div',
    { class: 'pc-scoreset' },
    ...labels.map((label) =>
      el('span', { class: 'pc-scoreset-opt' }, mk(), el('span', { text: nobreak(label) })),
    ),
  );
}

function arousalRowEl(r) {
  const zone = AROUSAL_ZONE[r.v] || 'slate';
  return el(
    'div',
    { class: `pc-lrow tone-${zone}${r.v === '0' ? ' pc-lrow--calm' : ''}` },
    circleBox(),
    sheetIcon(AROUSAL_ZONE_ICON[zone], 'sh-ico pc-lrow-ico'),
    el('span', { class: 'pc-lval', text: r.v.replace('-', '−') }),
    el('span', { class: 'pc-llabel', text: r.label }),
    el('span', { class: 'pc-ldesc', text: nobreak(r.desc || '') }),
  );
}

// ── Card 1 · Arousal (RASS) + gate ──────────────────────────────────────────

function arousalCard() {
  const body = el('div', { class: 'pc-body' });
  for (const g of RASS_RAIL) {
    body.append(
      el(
        'div',
        { class: `pc-lgroup tone-${g.tone}` },
        el('span', { class: 'pc-rail', text: g.label }),
        el(
          'div',
          { class: 'pc-lrows' },
          ...RASS_LEVELS.filter((r) => g.values.includes(r.v)).map((r) => arousalRowEl(r)),
        ),
      ),
    );
  }
  body.append(
    el(
      'div',
      { class: 'pc-gate pc-gate--stop' },
      el('span', { class: 'pc-gate-arrow', text: '⛔' }),
      el('span', { text: AROUSAL_GATE.stop }),
    ),
    el(
      'div',
      { class: 'pc-gate pc-gate--go' },
      el('span', { class: 'pc-gate-arrow', text: '→' }),
      el('span', { text: AROUSAL_GATE.altered }),
    ),
  );
  return card(
    'pc-arousal',
    cardHead(
      'navy',
      'Step 1 · RASS',
      'Arousal — Richmond Agitation-Sedation Scale',
      'Score arousal first (Look, then Talk, then Touch). It is the CAM-IMC’s level-of-consciousness item.',
      'eye',
    ),
    body,
  );
}

// ── Card 2 · CAM-IMC (additive score) ───────────────────────────────────────

function camimcCard() {
  const inatt = CAMIMC.inattention;
  const body = el(
    'div',
    { class: 'pc-body pc-stepper' },
    el(
      'div',
      { class: 'pc-rule' },
      el('span', { text: 'CAM-IMC positive = ' }),
      el('b', { text: `total ≥ ${CAMIMC_POSITIVE} of ${CAMIMC_MAX}` }),
    ),
    featureStep(1, 'Acute change or fluctuating course (+1)', [
      scriptBlock(CAMIMC.acute.prompt),
      el('div', { class: 'pc-note', text: CAMIMC.acute.help }),
      scoreSet(box, ['Present → +1']),
    ]),
    featureStep(2, 'Altered level of consciousness (+1)', [
      el('div', { class: 'pc-note', text: CAMIMC.loc.note }),
      scoreSet(box, ['RASS ≠ 0 → +1']),
    ]),
    featureStep(3, `Inattention (0–${INATT_MAX})`, [
      scriptBlock(CAMIMC_ATT_SCRIPT),
      el('div', { class: 'pc-note', text: inatt.help }),
      scoreSet(circleBox, [...inatt.options.map((o) => o.label), inatt.unableLabel]),
    ]),
    featureStep(4, `Disorientation (0–${DISO_MAX})`, [
      el('div', { class: 'pc-note', text: CAMIMC.disorientation.help }),
      scoreSet(box, DISO_DIMS),
      el('div', { class: 'pc-th', text: 'One box per error — +1 each, max 5.' }),
    ]),
    el(
      'div',
      { class: 'pc-4at-total' },
      el('span', { text: `Total (0–${CAMIMC_MAX}):` }),
      blank('w-sm'),
      outcomeChip('present', `≥ ${CAMIMC_POSITIVE} → positive`),
      outcomeChip('absent', `< ${CAMIMC_POSITIVE} → negative`),
    ),
  );
  return card(
    'pc-camimc',
    cardHead(
      'plum',
      'Step 2 · CAM-IMC',
      'CAM-IMC — additive delirium screen',
      'For the verbal, non-intubated patient. Disorientation or inattention can drive a positive on their own.',
      'clipboard-list',
    ),
    body,
  );
}

// ── Card 3 · Admission risk (Martinez) ──────────────────────────────────────

function riskCard() {
  const optRow = (label, pts) =>
    el(
      'div',
      { class: 'pc-4at-opt' },
      box(),
      el('span', { class: 'pc-4at-lbl', text: nobreak(label) }),
      pts ? el('span', { class: 'pc-4at-pts', text: pts }) : null,
    );
  const criterion = (title, help, opts) =>
    el(
      'div',
      { class: 'pc-4at-row' },
      el('span', { class: 'pc-4at-title', text: title }),
      help ? el('span', { class: 'pc-4at-help', text: help }) : null,
      el('div', { class: 'pc-4at-opts' }, ...opts),
    );
  const bandRange = ['0', '1', '2–3'];
  const body = el(
    'div',
    { class: 'pc-body' },
    el('div', { class: 'pc-note', text: RISK.intro }),
    el(
      'div',
      { class: 'pc-4at-rows' },
      criterion('Age ≥ 85 (+1)', '', [optRow('Yes', '+1')]),
      criterion(
        `Dependence in ≥ ${ADL_THRESHOLD} of 6 ADLs (+1)`,
        'one box per activity the patient depends on others for',
        ADL_ACTIVITIES.map((a) => optRow(a)),
      ),
      criterion(
        `Psychotropic subtotal ≥ ${PSYCHO_THRESHOLD} (+1)`,
        'antidepressant / antidementia / anticonvulsant 1 each; antipsychotic 2',
        PSYCHO_DRUGS.map((d) => optRow(d.label, `+${d.pts}`)),
      ),
    ),
    el(
      'div',
      { class: 'pc-4at-total' },
      el('span', { text: 'Score (0–3):' }),
      blank('w-sm'),
      ...RISK_BANDS.map((b, i) =>
        outcomeChip(
          b.label === 'High' ? 'present' : b.label === 'Intermediate' ? 'maybe' : 'absent',
          `${bandRange[i]} · ${b.label}`,
        ),
      ),
    ),
    el(
      'div',
      { class: 'pc-body pc-th' },
      ...RISK_BANDS.map((b) => el('div', { text: nobreak(`${b.label} — ${b.note}`) })),
    ),
  );
  return card(
    'pc-risk',
    cardHead(
      'teal',
      'Risk',
      'Admission delirium risk (Martinez)',
      'Three admission variables, 0–3 points, banded to predicted incidence. Use it to target prevention.',
      'triangle-risk',
    ),
    body,
  );
}

// ── Card 4 · Prevention bundle ──────────────────────────────────────────────

function preventCard(state) {
  const body = el(
    'div',
    { class: 'pc-body' },
    el('div', { class: 'pc-note', text: PREVENTION.intro }),
    el(
      'div',
      { class: 'pc-measures' },
      ...PREVENTION_ITEMS.filter((c) => itemOn(state, `sd-prev-${c.id}`)).map((c) =>
        checkItem(ov(state, `sd-prev-${c.id}`, c.label)),
      ),
      ...customLines(state, 'sd-prev'),
    ),
  );
  return card(
    'pc-prevent',
    cardHead(
      'green',
      'Prevent',
      'Multicomponent prevention bundle',
      'First-line for every at-risk patient — document each shift.',
      'circle-check',
    ),
    body,
  );
}

// ── Card 5 · Act on a positive ──────────────────────────────────────────────

function actCard(state) {
  const tones = ['rust', 'green', 'navy'];
  const blocks = ACT_COLUMNS.map((col, i) =>
    el(
      'div',
      { class: `pc-act tone-${tones[i] || 'navy'}` },
      el('div', { class: 'pc-act-head', text: col.head }),
      ...col.items
        .filter((it) => itemOn(state, it.id))
        .map((it) => checkItem(ov(state, it.id, it.text))),
      ...customLines(state, col.id),
    ),
  );
  const body = el(
    'div',
    { class: 'pc-body' },
    ...blocks,
    el(
      'div',
      { class: 'pc-act-contact' },
      el('span', { text: 'Delirium / geriatrics escalation contact:' }),
      blank('grow'),
    ),
  );
  return card(
    'pc-actcard',
    cardHead(
      'green',
      'Positive?',
      'Act on a positive screen',
      'A screen is a finding, not a diagnosis — find the cause, manage without new harm, and hand it off.',
      'clipboard-list',
    ),
    body,
  );
}

// ── Assembly ─────────────────────────────────────────────────────────────────

export function renderStepdownCards(state) {
  const cols = [];
  // The dense cards (arousal + CAM-IMC screens, and the full risk worksheet)
  // never take a notes line — only the roomy protocol cards do.
  if (secOn(state, 'sec-sd-arousal')) cols.push(arousalCard());
  if (secOn(state, 'sec-sd-camimc')) cols.push(camimcCard());
  if (secOn(state, 'sec-sd-risk')) cols.push(riskCard());
  if (secOn(state, 'sec-sd-prevent')) cols.push(withNotes(preventCard(state), state));
  if (secOn(state, 'sec-sd-act')) cols.push(withNotes(actCard(state), state));
  for (const sec of state.customSections.filter((x) => x.lines.length)) {
    cols.push(
      card(
        'pc-custom',
        cardHead('ink', 'Unit', sec.title, 'Local protocol content — the unit’s responsibility.'),
        el('div', { class: 'pc-body pc-custom-lines' }, ...sec.lines.map((t) => checkItem(t))),
      ),
    );
  }
  // Two columns per landscape page; an odd final column fills its page alone.
  return pairColumnSheets(cols, state);
}

// ── Workflow poster (landscape) ─────────────────────────────────────────────

export function renderStepdownWorkflow(state) {
  if (!secOn(state, 'sec-sd-wf-poster')) return [];
  const stages = el(
    'div',
    { class: 'pc-flow' },
    ...WORKFLOW_STAGES.flatMap((st, i) => {
      const stage = el(
        'div',
        { class: `pc-stage tone-${st.tone}` },
        el(
          'div',
          { class: 'pc-stage-head' },
          el('span', { class: 'pc-stage-n', text: st.n }),
          el('span', { text: nobreak(st.head) }),
        ),
        ...st.lines
          .filter((l) => l.locked || itemOn(state, l.id))
          .map((l) =>
            el('div', {
              class: 'pc-stage-line',
              text: nobreak(l.locked ? l.text : ov(state, l.id, l.text)),
            }),
          ),
        ...customLines(state, st.id),
      );
      return i < WORKFLOW_STAGES.length - 1
        ? [stage, el('div', { class: 'pc-flow-arrow', text: '→' })]
        : [stage];
    }),
  );

  const loop = el(
    'div',
    { class: 'pc-loopbar' },
    el('span', { class: 'pc-pill pc-pill--no', text: 'Unable to assess' }),
    el('span', {
      text: 'RASS −4/−5 — stupor or coma. Record it, and reassess when the patient responds to voice.',
    }),
  );

  const handoff = el(
    'div',
    { class: 'pc-rounds tone-navy' },
    el('div', {
      class: 'pc-act-head',
      text: 'On transfer / hand-off of a positive screen (say these four)',
    }),
    el(
      'ol',
      { class: 'pc-qs' },
      ...HANDOFF_SCRIPT.filter((r) => itemOn(state, r.id)).map((r) =>
        el('li', { text: nobreak(ov(state, r.id, r.text)) }),
      ),
    ),
  );

  const positive = el(
    'div',
    { class: 'pc-rounds tone-green' },
    el('div', { class: 'pc-act-head', text: 'If the screen is positive — first moves' }),
    ...ACT_COLUMNS[0].items.map((it) => checkItem(it.text)),
  );

  const sheet = el(
    'div',
    { class: 'sheet sheet--landscape pc-poster' },
    cardHead(
      'navy',
      'Step-Down',
      'Step-down delirium workflow — screen · gate · score · risk · act',
      'For the monitored, non-intubated patient. Post at the nurses’ station.',
      'gauge-high',
    ),
    el(
      'div',
      { class: 'pc-body' },
      stages,
      loop,
      el('div', { class: 'pc-poster-cols' }, handoff, positive),
    ),
  );
  sheet.append(sheetFooter(state, 1, 1));
  return [sheet];
}
