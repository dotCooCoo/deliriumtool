/**
 * templates/ed-cards.js — the emergency-department bedside card set and ED
 * workflow poster. Every clinical value renders from the ED tool's own data
 * modules via data/ed-content.js, so the printed cards and the interactive
 * tool cannot disagree. Validated-instrument text (RASS anchors, DTS/bCAM
 * scripts and rules, 4AT items) is deliberately not unit-editable.
 *
 * Reuses the pediatric card design system (`.pc-*`): one topic per card,
 * semantic zone colors, gate rules as first-class bars at the decision point,
 * YES/NO branching as labeled pills, and outcome chips where "delirium
 * present" is the heaviest element on the card.
 */
import {
  el,
  nobreak,
  circleBox,
  blank,
  checkItem,
  ov,
  secOn,
  itemOn,
  customLines,
} from './primitives.js';
import { sheetFooter, sheetIcon } from './sheets.js';
import {
  RASS_LEVELS,
  DTS,
  FOURAT,
  AROUSAL_ZONE,
  RASS_RAIL,
  AROUSAL_GATE,
  DTS_FLOW,
  DTS_ERR,
  F2_ERR,
  BCAM_F2_SCRIPT,
  BCAM_F4,
  BCAM_RULE,
  FOURAT_BANDS,
  ACT_COLUMNS,
  WORKFLOW_STAGES,
  HANDOFF_SCRIPT,
} from './data/ed-content.js';

// ── Shared card chrome (mirrors peds-cards.js) ──────────────────────────────

function card(cls, ...kids) {
  return el('div', { class: `sheet sheet--landscape sheet--card ${cls || ''}` }, ...kids);
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
const branch = (answer, ...kids) =>
  el(
    'div',
    { class: 'pc-branch' },
    el('span', { class: `pc-pill pc-pill--${answer === 'Yes' ? 'yes' : 'no'}`, text: answer }),
    ...kids,
  );
const scriptBlock = (text) => el('div', { class: 'pc-script', text: nobreak(text) });

/**
 * The interactive tool's help text says "tap each" for its tap-to-count
 * controls; on a printed, dry-erase card the assessor marks/counts instead.
 * Everything else stays verbatim (pinned by unit test).
 */
const printHelp = (text) =>
  text.replace(/Tap each/g, 'Mark each').replace(/tap each/g, 'mark each');

// ── Card 1 · Arousal (RASS gate) ────────────────────────────────────────────

function arousalRowEl(r) {
  const zone = AROUSAL_ZONE[r.v] || 'slate';
  return el(
    'div',
    { class: `pc-lrow tone-${zone}${r.v === '0' ? ' pc-lrow--calm' : ''}` },
    circleBox(),
    el('span', { class: 'pc-lval', text: r.v.replace('-', '−') }),
    el('span', { class: 'pc-llabel', text: r.label }),
    el('span', { class: 'pc-ldesc', text: nobreak(r.desc || '') }),
  );
}

function arousalCard() {
  const body = el('div', { class: 'pc-body' });
  for (const g of RASS_RAIL) {
    const group = el(
      'div',
      { class: `pc-lgroup tone-${g.tone}` },
      el('span', { class: 'pc-rail', text: g.label }),
      el(
        'div',
        { class: 'pc-lrows' },
        ...RASS_LEVELS.filter((r) => g.values.includes(r.v)).map((r) => arousalRowEl(r)),
      ),
    );
    group.style.flexGrow = String(g.values.length);
    body.append(group);
  }
  body.append(
    el(
      'div',
      { class: 'pc-gates' },
      el(
        'div',
        { class: 'pc-gate pc-gate--go' },
        el('span', { class: 'pc-gate-arrow', text: '→' }),
        el('span', { text: AROUSAL_GATE.altered }),
      ),
      el(
        'div',
        { class: 'pc-gate pc-gate--stop' },
        el('span', { class: 'pc-gate-arrow', text: '⛔' }),
        el('span', { text: AROUSAL_GATE.stop }),
      ),
    ),
  );
  return card(
    'pc-arousal',
    cardHead(
      'navy',
      'Step 1',
      'Arousal — Richmond Agitation-Sedation Scale (RASS)',
      'Score arousal first. Look, then talk, then touch. RASS 0 is the only unaltered state.',
      'eye',
    ),
    body,
  );
}

// ── Card 2 · DTS (triage rule-out) ──────────────────────────────────────────

function lettersRow(items) {
  return el(
    'div',
    { class: 'pc-letters' },
    ...items.map((l) => el('span', { class: 'pc-letter', text: l })),
  );
}

function dtsCard() {
  const body = el(
    'div',
    { class: 'pc-body pc-stepper' },
    el(
      'div',
      { class: 'pc-step' },
      el('div', { class: 'pc-step-n', text: 'A' }),
      el(
        'div',
        { class: 'pc-step-body' },
        el('div', { class: 'pc-step-title', text: 'Altered level of consciousness' }),
        scriptBlock('Score the RASS (Step 1 card).'),
        el(
          'div',
          { class: 'pc-branches' },
          branch('Yes', outcomeChip('present', 'RASS ≠ 0 → DTS positive → bCAM')),
          branch('No', el('span', { text: 'RASS 0 → do the LUNCH task below' })),
        ),
      ),
    ),
    el(
      'div',
      { class: 'pc-step' },
      el('div', { class: 'pc-step-n', text: 'B' }),
      el(
        'div',
        { class: 'pc-step-body' },
        el('div', { class: 'pc-step-title', text: 'Inattention — spell LUNCH backwards' }),
        scriptBlock(DTS_FLOW.script),
        lettersRow(DTS_FLOW.letters),
        el('div', { class: 'pc-note', text: printHelp(DTS.attention.help) }),
        el(
          'div',
          { class: 'pc-branches' },
          branch(
            'Yes',
            outcomeChip('present', `≥ ${DTS_ERR} errors or unable → DTS positive → bCAM`),
          ),
          branch('No', outcomeChip('absent', '0–1 errors → DTS negative — delirium ruled out')),
        ),
      ),
    ),
    el(
      'div',
      { class: 'pc-note pc-note--boxed' },
      sheetIcon('circle-info', 'sh-ico pc-note-ico'),
      el('span', { text: DTS_FLOW.negative }),
    ),
  );
  return card(
    'pc-dts',
    cardHead(
      'teal',
      'Step 2 · DTS',
      'Delirium Triage Screen — the <20-second rule-out',
      '98% sensitive; a negative DTS rules delirium out. Any positive goes to the bCAM.',
      'magnifying-glass',
    ),
    body,
  );
}

// ── Card 3 · bCAM (confirmatory rule-in) ────────────────────────────────────

function camRule() {
  // Derive the emphasised clause from the instrument rule so it can't drift.
  const clause = BCAM_RULE.replace(/^bCAM positive = /, '');
  return el(
    'div',
    { class: 'pc-rule' },
    el('span', { text: 'bCAM positive = ' }),
    el('b', { text: clause }),
  );
}

function featureStep(n, title, kids, branches) {
  return el(
    'div',
    { class: 'pc-step' },
    el('div', { class: 'pc-step-n', text: String(n) }),
    el(
      'div',
      { class: 'pc-step-body' },
      el('div', { class: 'pc-step-title', text: title }),
      ...kids,
      branches ? el('div', { class: 'pc-branches' }, ...branches) : null,
    ),
  );
}

function bcamCard(state) {
  const setKey = state.edF4Set === 'b' ? 'setB' : 'setA';
  const questions = BCAM_F4[setKey];
  const body = el(
    'div',
    { class: 'pc-body pc-stepper' },
    camRule(),
    featureStep(
      1,
      'Altered mental status or fluctuating course',
      [
        scriptBlock(
          'Ask a proxy: “Has the patient been more confused to you lately?” Acute change or fluctuation in 24 h counts.',
        ),
        el('div', {
          class: 'pc-note',
          text: 'No proxy available? If Feature 2 and (Feature 3 or 4) are positive, it is safer to assume Feature 1 is positive.',
        }),
      ],
      [
        branch('Yes', el('span', { text: 'continue to Feature 2' })),
        branch('No', outcomeChip('absent', 'Stop — bCAM negative')),
      ],
    ),
    featureStep(
      2,
      'Inattention — months backward (cardinal feature)',
      [
        scriptBlock(BCAM_F2_SCRIPT),
        el('div', {
          class: 'pc-note',
          text: 'December → July. Each missing/switched month is an error; refusal or inability is positive.',
        }),
      ],
      [
        branch('Yes', el('span', { text: `≥ ${F2_ERR} errors — continue to Feature 3` })),
        branch('No', outcomeChip('absent', 'Stop — bCAM negative')),
      ],
    ),
    featureStep(
      3,
      'Altered level of consciousness',
      [scriptBlock('Positive when the RASS is anything other than 0 (from Step 1).')],
      [
        branch('Yes', outcomeChip('present', 'DELIRIUM PRESENT')),
        branch('No', el('span', { text: 'RASS 0 → continue to Feature 4' })),
      ],
    ),
    featureStep(
      4,
      'Disorganized thinking — questions & command',
      [
        el(
          'div',
          { class: 'pc-f4sets' },
          el('span', { class: 'pc-setbadge', text: `Set ${state.edF4Set === 'b' ? 'B' : 'A'}` }),
          el('span', { class: 'pc-f4sets-note', text: 'alternate the set on consecutive days' }),
        ),
        el('ol', { class: 'pc-qs' }, ...questions.map((q) => el('li', { text: nobreak(q) }))),
        el('div', { class: 'pc-note', text: nobreak(BCAM_F4.command) }),
        el('div', {
          class: 'pc-th',
          text: 'Any error (incomprehensible sounds or no attempt included) = Feature 4 positive.',
        }),
      ],
      [
        branch('Yes', outcomeChip('present', 'DELIRIUM PRESENT')),
        branch('No', outcomeChip('absent', 'bCAM negative')),
      ],
    ),
  );
  return card(
    'pc-bcam',
    cardHead(
      'navy',
      'Step 3 · bCAM',
      'Brief Confusion Assessment Method — the <2-minute rule-in',
      'Confirms a positive DTS. Feature 2 (inattention) is required — 1 + 3 + 4 without it is negative.',
      'clipboard-list',
    ),
    body,
  );
}

// ── Card 4 · 4AT (single-step alternative) ──────────────────────────────────

function fouratCard() {
  const rows = FOURAT.items.map((item) =>
    el(
      'div',
      { class: 'pc-4at-row' },
      el('span', { class: 'pc-4at-title', text: item.title }),
      el(
        'div',
        { class: 'pc-4at-opts' },
        ...item.options.map((o) =>
          el(
            'div',
            { class: 'pc-4at-opt' },
            circleBox(),
            el('span', { class: 'pc-4at-lbl', text: nobreak(o.label) }),
            el('span', { class: 'pc-4at-pts', text: `${o.v}` }),
          ),
        ),
      ),
    ),
  );
  const bandChip = (b) =>
    outcomeChip(
      b.verdict === 'positive' ? 'present' : b.verdict === 'negative' ? 'absent' : 'maybe',
      b.label,
    );
  const body = el(
    'div',
    { class: 'pc-body' },
    el('div', {
      class: 'pc-note',
      text: 'Items 1–3 are rated on observation; item 4 needs an informant or records. Total 0–12.',
    }),
    el('div', { class: 'pc-4at-rows' }, ...rows),
    el(
      'div',
      { class: 'pc-4at-total' },
      el('span', { text: 'Total (0–12):' }),
      blank('w-sm'),
      ...FOURAT_BANDS.map(bandChip),
    ),
    el(
      'div',
      { class: 'pc-note pc-note--boxed' },
      sheetIcon('circle-info', 'sh-ico pc-note-ico'),
      el('span', { text: FOURAT.notes[0] }),
    ),
  );
  return card(
    'pc-4at',
    cardHead(
      'plum',
      'Alt · 4AT',
      '4AT — rapid delirium & cognitive-impairment screen',
      'A single ~2-minute test; no special training required. Use instead of DTS → bCAM per unit policy.',
      'clipboard-list',
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

export function renderEdCards(state) {
  const sheets = [];
  if (secOn(state, 'sec-ed-arousal')) sheets.push(arousalCard());
  if (secOn(state, 'sec-ed-dts')) sheets.push(dtsCard());
  if (secOn(state, 'sec-ed-bcam')) sheets.push(bcamCard(state));
  if (secOn(state, 'sec-ed-4at')) sheets.push(fouratCard());
  if (secOn(state, 'sec-ed-act')) sheets.push(actCard(state));
  for (const sec of state.customSections.filter((x) => x.lines.length)) {
    sheets.push(
      card(
        'pc-custom',
        cardHead('ink', 'Unit', sec.title, 'Local protocol content — the unit’s responsibility.'),
        el('div', { class: 'pc-body pc-custom-lines' }, ...sec.lines.map((t) => checkItem(t))),
      ),
    );
  }
  const pages = sheets.length;
  sheets.forEach((s, i) => s.append(sheetFooter(state, i + 1, pages)));
  return sheets;
}

// ── Workflow poster (landscape) ─────────────────────────────────────────────

export function renderEdWorkflow(state) {
  if (!secOn(state, 'sec-ed-wf-poster')) return [];
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
      text: 'At disposition — hand off a positive screen (say these four)',
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
      'ED',
      'Emergency-department delirium workflow — screen · gate · confirm · act',
      'Every older adult. Post at the physician and triage stations.',
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
