/**
 * templates/peds-cards.js — the pediatric bedside card set and PICU workflow
 * poster. Every clinical value renders from the pediatric tool's own data
 * modules via data/peds-content.js, so the printed cards and the interactive
 * tool cannot disagree. Validated-instrument text (RASS/SBS rows, CAPD items,
 * ps/pCAM features) is deliberately not unit-editable.
 *
 * Design system (`.pc-*`): one topic per card, sentence-case headings,
 * semantic zone colors (agitation warm → calm green → sedation cool), gate
 * rules as first-class bars at the decision point, YES/NO branching as
 * labeled pills instead of crossing arrows, and outcome chips where
 * "delirium present" is always the heaviest element on the card.
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
  SBS_LEVELS,
  RASS_CARD_DESC,
  RASS_RAIL,
  AROUSAL_ZONE,
  AROUSAL_GATE,
  SCREEN_ROUTES,
  SENSORY_REMINDER,
  CAPD_ITEMS,
  CAPD_POSITIVE,
  CAPD_FREQ,
  CAPD_DEV_DELAY_NOTE,
  PCAM,
  PSCAM,
  STIM_DECK,
  STIM_INSTRUCTIONS,
  ACT_POSITIVE,
  PREVENT_BUNDLE,
  PREVENT_MEASURES,
  WORKFLOW_STAGES,
  ROUNDS_SCRIPT,
  PCAM_SCRIPT,
  printTask,
  SBS_PROCEDURE,
} from './data/peds-content.js';
import { stimArt } from './stim-art.js';

// ── Shared card chrome ───────────────────────────────────────────────────────

function card(cls, ...kids) {
  return el('div', { class: `sheet sheet--landscape sheet--card ${cls || ''}` }, ...kids);
}

/** Card header: step chip + title + one-line purpose. */
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

// ── Card 1 · Arousal (RASS or SBS) ──────────────────────────────────────────

function arousalRows(scale) {
  return scale === 'sbs'
    ? SBS_LEVELS.map((r) => ({ v: r.v, label: r.label, desc: r.marker || '' }))
    : RASS_LEVELS.map((r) => ({ v: r.v, label: r.label, desc: RASS_CARD_DESC[r.v] || '' }));
}

function arousalRowEl(scale, r) {
  const zone = AROUSAL_ZONE[scale][r.v] || 'slate';
  return el(
    'div',
    { class: `pc-lrow tone-${zone}${r.v === '0' ? ' pc-lrow--calm' : ''}` },
    circleBox(),
    el('span', { class: 'pc-lval', text: r.v.replace('-', '−') }),
    el('span', { class: 'pc-llabel', text: r.label }),
    el('span', { class: 'pc-ldesc', text: nobreak(r.desc) }),
  );
}

function arousalCard(state) {
  const scale = state.pedsScale === 'sbs' ? 'sbs' : 'rass';
  const rows = arousalRows(scale);
  const gate = AROUSAL_GATE[scale];
  const body = el('div', { class: 'pc-body' });

  if (scale === 'rass') {
    // LOOK / TALK / TOUCH rail groups — the escalating stimulus procedure.
    for (const g of RASS_RAIL) {
      const group = el(
        'div',
        { class: `pc-lgroup tone-${g.tone}` },
        el('span', { class: 'pc-rail', text: g.label }),
        el(
          'div',
          { class: 'pc-lrows' },
          ...rows.filter((r) => g.values.includes(r.v)).map((r) => arousalRowEl(scale, r)),
        ),
      );
      group.style.flexGrow = String(g.values.length);
      body.append(group);
    }
  } else {
    body.append(
      el('div', { class: 'pc-note', text: SBS_PROCEDURE }),
      el('div', { class: 'pc-lrows pc-lrows--flat' }, ...rows.map((r) => arousalRowEl(scale, r))),
    );
  }

  body.append(
    el(
      'div',
      { class: 'pc-gates' },
      el(
        'div',
        { class: 'pc-gate pc-gate--go' },
        el('span', { class: 'pc-gate-arrow', text: '→' }),
        el('span', { text: gate.proceed }),
      ),
      el(
        'div',
        { class: 'pc-gate pc-gate--stop' },
        el('span', { class: 'pc-gate-arrow', text: '⛔' }),
        el('span', { text: gate.stop }),
      ),
    ),
    el('div', {
      class: 'pc-note',
      text: 'SBS ↔ RASS is not a validated 1:1 — each scale gates on its own floor.',
    }),
  );

  return card(
    'pc-arousal',
    cardHead(
      'navy',
      'Step 1',
      scale === 'sbs'
        ? 'Arousal — State Behavioral Scale (SBS)'
        : 'Arousal — Richmond Agitation-Sedation Scale (RASS)',
      scale === 'sbs'
        ? 'The screening gate for intubated infants & young children — score arousal before any delirium screen.'
        : 'The screening gate — score arousal before any delirium screen. Look, then talk, then touch.',
      'eye',
    ),
    body,
  );
}

// ── Card 2 · Choose the screen ───────────────────────────────────────────────

function routerCard() {
  const body = el('div', { class: 'pc-body' });
  body.append(
    el(
      'div',
      { class: 'pc-routes' },
      ...SCREEN_ROUTES.map((r, i) =>
        el(
          'div',
          { class: `pc-route tone-${r.tone}${i === 0 ? ' pc-route--default' : ''}` },
          el(
            'div',
            { class: 'pc-route-name' },
            el('span', { text: nobreak(r.name) }),
            i === 0 ? el('span', { class: 'pc-tag', text: 'default' }) : null,
          ),
          el('div', { class: 'pc-route-who', text: r.who }),
          el('div', { class: 'pc-route-how', text: r.how }),
        ),
      ),
    ),
    el(
      'div',
      { class: 'pc-note pc-note--boxed' },
      sheetIcon('triangle-exclamation', 'sh-ico pc-note-ico'),
      el('span', {
        text: 'Route by developmental age, not chronological age alone — a developmentally delayed child screens with the instrument matching their developmental level, anchored to their own baseline.',
      }),
    ),
    el('div', { class: 'pc-note', text: SENSORY_REMINDER }),
  );
  return card(
    'pc-router',
    cardHead(
      'plum',
      'Step 2',
      'Choose the delirium screen',
      'CAPD works at every age; the CAM screens add interactive point-in-time detail.',
      'magnifying-glass',
    ),
    body,
  );
}

// ── Cards 3–4 · psCAM-ICU / pCAM-ICU steppers ───────────────────────────────

/** One feature step of the CAM stepper. */
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

const scriptBlock = (text) => el('div', { class: 'pc-script', text: nobreak(text) });

function lettersRow(items) {
  return el(
    'div',
    { class: 'pc-letters' },
    ...items.map((l) => el('span', { class: 'pc-letter', text: l })),
  );
}

function camRule(name) {
  return el(
    'div',
    { class: 'pc-rule' },
    el('span', { text: `${nobreak(name)} positive = ` }),
    el('b', { text: 'Feature 1 + Feature 2 + (Feature 3 or Feature 4)' }),
  );
}

function pcamCard() {
  const f = Object.fromEntries(PCAM.features.map((x) => [x.id, x]));
  const body = el(
    'div',
    { class: 'pc-body pc-stepper' },
    camRule('pCAM-ICU'),
    featureStep(
      1,
      'Acute change or fluctuating mental status',
      [scriptBlock(f.f1.help)],
      [
        branch('Yes', el('span', { text: 'continue to Feature 2' })),
        branch('No', outcomeChip('absent', 'Stop — delirium absent')),
      ],
    ),
    featureStep(
      2,
      'Inattention — letters task',
      [
        scriptBlock(PCAM_SCRIPT),
        lettersRow(f.f2.items),
        el('div', { class: 'pc-note', text: printTask(f.f2.task) }),
        el('div', { class: 'pc-th', text: f.f2.verdict }),
      ],
      [
        branch('Yes', el('span', { text: `≥ ${f.f2.threshold} errors — continue to Feature 3` })),
        branch('No', outcomeChip('absent', 'Stop — delirium absent')),
      ],
    ),
    featureStep(
      3,
      'Altered level of consciousness',
      [scriptBlock(f.f3.help)],
      [
        branch('Yes', outcomeChip('present', 'DELIRIUM PRESENT')),
        branch('No', el('span', { text: 'continue to Feature 4' })),
      ],
    ),
    featureStep(
      4,
      'Disorganized thinking — questions & command',
      [
        el('ol', { class: 'pc-qs' }, ...f.f4.items.map((q) => el('li', { text: nobreak(q) }))),
        el('div', { class: 'pc-note', text: printTask(f.f4.task) }),
        el('div', { class: 'pc-th', text: f.f4.verdict }),
      ],
      [
        branch('Yes', outcomeChip('present', 'DELIRIUM PRESENT')),
        branch('No', outcomeChip('absent', 'Delirium absent')),
      ],
    ),
  );
  return card(
    'pc-cam',
    cardHead(
      'navy',
      'pCAM-ICU',
      'Pediatric CAM-ICU — chronological & developmental age ≥ 5 years',
      'Verbal attention and command tasks. Screen only after the arousal gate.',
      'clipboard-list',
    ),
    body,
  );
}

function pscamCard() {
  const f = Object.fromEntries(PSCAM.features.map((x) => [x.id, x]));
  const body = el(
    'div',
    { class: 'pc-body pc-stepper' },
    camRule('psCAM-ICU'),
    featureStep(
      1,
      'Acute change or fluctuating mental status',
      [scriptBlock(f.f1.help)],
      [
        branch('Yes', el('span', { text: 'continue to Feature 2' })),
        branch('No', outcomeChip('absent', 'Stop — delirium absent')),
      ],
    ),
    featureStep(
      2,
      'Inattention — ten picture presentations',
      [
        scriptBlock(printTask(f.f2.task)),
        el(
          'div',
          { class: 'pc-dual' },
          el(
            'div',
            { class: 'pc-th' },
            el('b', { text: 'Path 1: ' }),
            el('span', {
              text: `no eye contact on ${f.f2.threshold} or more of the 10 presentations → inattention present.`,
            }),
          ),
          el(
            'div',
            { class: 'pc-th' },
            el('b', { text: 'Path 2: ' }),
            el('span', { text: `${f.f2.alt.label} → inattention present.` }),
          ),
        ),
      ],
      [
        branch('Yes', el('span', { text: 'either path — continue to Feature 3' })),
        branch('No', outcomeChip('absent', 'Stop — delirium absent')),
      ],
    ),
    featureStep(
      3,
      'Altered level of consciousness',
      [scriptBlock(f.f3.help)],
      [
        branch('Yes', outcomeChip('present', 'DELIRIUM PRESENT')),
        branch('No', el('span', { text: 'continue to Feature 4' })),
      ],
    ),
    featureStep(
      4,
      'Disorganized brain — observed, not asked',
      [
        el(
          'div',
          { class: 'pc-dual' },
          el('div', { class: 'pc-th' }, el('b', { text: f.f4.help })),
          ...f.f4.parts.map((part) =>
            el(
              'div',
              { class: 'pc-th' },
              el('b', {
                text:
                  part.id === 'swc' ? 'Either: ' : part.id === 'unaware' ? 'Or both — ' : 'and — ',
              }),
              el('span', { text: part.label }),
            ),
          ),
        ),
      ],
      [
        branch('Yes', outcomeChip('present', 'DELIRIUM PRESENT')),
        branch('No', outcomeChip('absent', 'Delirium absent')),
      ],
    ),
  );
  return card(
    'pc-cam',
    cardHead(
      'azure',
      'psCAM-ICU',
      'Preschool CAM-ICU — developmental age 6 months – 5 years',
      'Age-adapted observational tasks — use the picture cards in this set. Screen only after the arousal gate.',
      'clipboard-list',
    ),
    body,
  );
}

// ── Card 5 · CAPD ────────────────────────────────────────────────────────────

function capdCard() {
  const legend = el(
    'div',
    { class: 'pc-capd-legend' },
    el(
      'div',
      { class: 'pc-capd-legend-row' },
      el('b', { text: 'Items 1–4 (scored 4→0): ' }),
      el('span', { text: CAPD_FREQ.map((fq, i) => `${fq} = ${4 - i}`).join(' · ') }),
    ),
    el(
      'div',
      { class: 'pc-capd-legend-row' },
      el('b', { text: 'Items 5–8 (scored 0→4): ' }),
      el('span', { text: CAPD_FREQ.map((fq, i) => `${fq} = ${i}`).join(' · ') }),
    ),
  );
  const rows = CAPD_ITEMS.map((it, i) =>
    el(
      'div',
      { class: 'pc-capd-row' },
      el('span', { class: 'pc-capd-n', text: String(i + 1) }),
      el('span', { class: 'pc-capd-q', text: nobreak(it.text) }),
      el('span', {
        class: `pc-capd-dir ${it.reverse ? 'pc-capd-dir--rev' : ''}`,
        text: it.reverse ? 'scored 4→0' : 'scored 0→4',
      }),
      el(
        'span',
        { class: 'pc-capd-score' },
        el('span', { class: 'pc-capd-score-lbl', text: 'score' }),
        blank('w-sm'),
      ),
    ),
  );
  const body = el(
    'div',
    { class: 'pc-body' },
    el('div', {
      class: 'pc-note',
      text: 'Rate the child over the shift against age-expected behavior — anchor to the child’s own developmental baseline. Score all eight items.',
    }),
    legend,
    el('div', { class: 'pc-capd-rows' }, ...rows),
    el(
      'div',
      { class: 'pc-capd-total' },
      el('span', { text: 'Total (0–32):' }),
      blank('w-sm'),
      outcomeChip('present', `≥ ${CAPD_POSITIVE} = positive screen`),
      outcomeChip('absent', `< ${CAPD_POSITIVE} = negative`),
    ),
    el(
      'div',
      { class: 'pc-note pc-note--boxed' },
      sheetIcon('triangle-exclamation', 'sh-ico pc-note-ico'),
      el('span', { text: CAPD_DEV_DELAY_NOTE }),
    ),
  );
  return card(
    'pc-capd',
    cardHead(
      'plum',
      'CAPD',
      'Cornell Assessment of Pediatric Delirium',
      'Observational screen for every age — eight items, rated over the shift. Screen only after the arousal gate.',
      'clipboard-list',
    ),
    body,
  );
}

// ── Card 6 · Act on a positive ───────────────────────────────────────────────

function actCard(state) {
  const block = (tone, groupId, head, items) =>
    el(
      'div',
      { class: `pc-act tone-${tone}` },
      el('div', { class: 'pc-act-head', text: head }),
      ...items
        .filter((it) => itemOn(state, it.id))
        .map((it) => checkItem(ov(state, it.id, it.text))),
      ...customLines(state, groupId),
    );
  const body = el(
    'div',
    { class: 'pc-body' },
    block('rust', 'act-first', 'First — same hour', ACT_POSITIVE.first),
    block('green', 'act-bundle', 'Bundle levers — this is the treatment', ACT_POSITIVE.bundle),
    block('red', 'act-escalate', 'Escalation — drugs treat symptoms only', ACT_POSITIVE.escalate),
    el(
      'div',
      { class: 'pc-act-contact' },
      el('span', { text: 'Unit escalation contact:' }),
      blank('grow'),
    ),
  );
  return card(
    'pc-actcard',
    cardHead(
      'green',
      'Positive?',
      'Act on a positive screen',
      'Non-pharmacologic treatment first; no agent is FDA-approved for pediatric delirium.',
      'clipboard-list',
    ),
    body,
  );
}

// ── Card 7 · Prevention bundle ───────────────────────────────────────────────

function preventCard(state) {
  const body = el(
    'div',
    { class: 'pc-body' },
    el(
      'div',
      { class: 'pc-bundle' },
      ...PREVENT_BUNDLE.filter((b) => itemOn(state, b.id)).map((b) =>
        el(
          'div',
          { class: `pc-bcell tone-${b.tone}` },
          el(
            'div',
            { class: 'pc-bhead' },
            el('span', { class: 'pc-bltr', text: b.ltr }),
            el('span', { text: nobreak(b.head) }),
          ),
          el('div', { class: 'pc-btext', text: nobreak(ov(state, b.id, b.text)) }),
          checkItem('Addressed this shift'),
        ),
      ),
    ),
    el(
      'div',
      { class: 'pc-measures' },
      ...PREVENT_MEASURES.filter((m) => itemOn(state, m.id)).map((m) =>
        checkItem(ov(state, m.id, m.text)),
      ),
      ...customLines(state, 'prev-measures'),
    ),
    el('div', {
      class: 'pc-note',
      text: 'Non-pharmacologic, multicomponent prevention is first-line; routine pharmacologic prophylaxis is not recommended. Sleep aids (e.g. melatonin) are not established for delirium prevention in children.',
    }),
  );
  return card(
    'pc-prevent',
    cardHead(
      'teal',
      'Every shift',
      'Prevention — the pediatric ABCDEF bundle',
      'Benzodiazepine minimization above all; check each element every shift.',
      'leaf',
    ),
    body,
  );
}

// ── Cards 8+ · Stimulus picture deck ─────────────────────────────────────────

function stimInstructionCell() {
  return el(
    'div',
    { class: 'pc-stim pc-stim--instr' },
    el('div', { class: 'pc-stim-instr-title', text: STIM_INSTRUCTIONS.title }),
    el('div', { class: 'pc-stim-instr-head', text: STIM_INSTRUCTIONS.pscamHead }),
    el('div', { class: 'pc-stim-instr-text', text: STIM_INSTRUCTIONS.pscam }),
    el('div', { class: 'pc-stim-instr-head', text: STIM_INSTRUCTIONS.pcamHead }),
    el('div', { class: 'pc-stim-instr-text', text: STIM_INSTRUCTIONS.pcam }),
    el('div', { class: 'pc-stim-instr-text', text: STIM_INSTRUCTIONS.memoryList }),
    el('div', { class: 'pc-stim-instr-text', text: STIM_INSTRUCTIONS.otherList }),
    el('div', { class: 'pc-stim-instr-note', text: STIM_INSTRUCTIONS.note }),
  );
}

function stimCell(entry, style) {
  // Picture only — naming the object or marking its set on the face would cue
  // the recognition task's answer. Set membership lives on the instructions
  // cell (and in the clinician's hands via the card order).
  return el(
    'div',
    { class: 'pc-stim' },
    el('div', { class: 'pc-stim-art' }, stimArt(entry.id, style)),
  );
}

function stimPages(state) {
  const style = state.stimStyle === 'b' ? 'b' : 'a';
  const cells = () => STIM_DECK.map((entry) => stimCell(entry, style));
  if (state.stimLayout === 'full') {
    // One picture per page — hold the card itself up to the child.
    const pages = [
      card(
        'pc-stimpage',
        cardHead(
          'azure',
          'Pictures',
          'Attention picture cards',
          'One picture per page. Laminate for bedside reuse.',
          'eye',
        ),
        el('div', { class: 'pc-body' }, el('div', { class: 'pc-stimgrid' }, stimInstructionCell())),
      ),
      ...cells().map((cell, i) =>
        card(
          'pc-stimpage',
          cardHead(
            'azure',
            'Pictures',
            `Picture ${i + 1} of ${STIM_DECK.length}`,
            'Laminate for bedside reuse.',
            'eye',
          ),
          el('div', { class: 'pc-body' }, el('div', { class: 'pc-stimfull' }, cell)),
        ),
      ),
    ];
    return pages;
  }
  const all = [stimInstructionCell(), ...cells()];
  const pages = [];
  for (let i = 0; i < all.length; i += 4) {
    pages.push(el('div', { class: 'pc-stimgrid' }, ...all.slice(i, i + 4)));
  }
  return pages.map((grid, i) =>
    card(
      'pc-stimpage',
      cardHead(
        'azure',
        'Pictures',
        `Attention picture cards ${i + 1} of ${pages.length}`,
        'Cut along the dashed guides. Laminate for bedside reuse.',
        'eye',
      ),
      el('div', { class: 'pc-body' }, grid),
    ),
  );
}

// ── Assembly ─────────────────────────────────────────────────────────────────

export function renderPedsCards(state) {
  const sheets = [];
  if (secOn(state, 'sec-pc-arousal')) sheets.push(arousalCard(state));
  if (secOn(state, 'sec-pc-router')) sheets.push(routerCard());
  if (secOn(state, 'sec-pc-capd')) sheets.push(capdCard());
  if (secOn(state, 'sec-pc-pscam')) sheets.push(pscamCard());
  if (secOn(state, 'sec-pc-pcam')) sheets.push(pcamCard());
  if (secOn(state, 'sec-pc-act')) sheets.push(actCard(state));
  if (secOn(state, 'sec-pc-prevent')) sheets.push(preventCard(state));
  for (const sec of state.customSections.filter((x) => x.lines.length)) {
    sheets.push(
      card(
        'pc-custom',
        cardHead('ink', 'Unit', sec.title, 'Local protocol content — the unit’s responsibility.'),
        el('div', { class: 'pc-body pc-custom-lines' }, ...sec.lines.map((t) => checkItem(t))),
      ),
    );
  }
  if (secOn(state, 'sec-pc-stim')) sheets.push(...stimPages(state));
  const pages = sheets.length;
  sheets.forEach((s, i) => s.append(sheetFooter(state, i + 1, pages)));
  return sheets;
}

// ── Workflow poster (landscape) ─────────────────────────────────────────────

export function renderPedsWorkflow(state) {
  if (!secOn(state, 'sec-wf-poster')) return [];
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
      text: 'Comatose floor (RASS −4/−5 · SBS −2/−3) — record it, keep the prevention bundle going, reassess when the child responds to voice.',
    }),
  );

  const script = el(
    'div',
    { class: 'pc-rounds tone-navy' },
    el('div', { class: 'pc-act-head', text: 'On rounds — say these four things (10 seconds)' }),
    el(
      'ol',
      { class: 'pc-qs' },
      ...ROUNDS_SCRIPT.filter((r) => itemOn(state, r.id)).map((r) =>
        el('li', { text: nobreak(ov(state, r.id, r.text)) }),
      ),
    ),
  );

  const positive = el(
    'div',
    { class: 'pc-rounds tone-green' },
    el('div', { class: 'pc-act-head', text: 'If the screen is positive — first moves' }),
    ...ACT_POSITIVE.first.map((it) => checkItem(it.text)),
  );

  const sheet = el(
    'div',
    { class: 'sheet sheet--landscape pc-poster' },
    cardHead(
      'navy',
      'PICU',
      'Pediatric delirium workflow — screen · gate · score · act',
      'Every child, every shift. Post at the charting station.',
      'gauge-high',
    ),
    el(
      'div',
      { class: 'pc-body' },
      stages,
      loop,
      el('div', { class: 'pc-poster-cols' }, script, positive),
    ),
  );
  sheet.append(sheetFooter(state, 1, 1));
  return [sheet];
}
