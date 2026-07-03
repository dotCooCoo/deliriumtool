/**
 * peds/cards.js — renders the actual laminated bedside cards (the same
 * renderers the template designer uses) inside the interactive tool, annotated
 * with the LIVE assessment: the recorded arousal row is highlighted, the gate
 * taken is marked, and each card carries a result ribbon + the applicable
 * outcome chip. This makes the tool interactive with the cards and lets the
 * final report show the cards that were used. No new clinical logic — the
 * annotations read the peds tool's own scoring.js. See §2.10.
 */
import { el } from '../shared/dom.js';
import { arousalCard, capdCard, pcamCard, pscamCard, actCard } from '../templates/peds-cards.js';
import { arousalGate, evalCapd, featurePresent, evalCam } from './scoring.js';
import { CAM_BY_SCREEN } from './data/cam.js';

const SCREEN_CARD = { capd: capdCard, pcam: pcamCard, pscam: pscamCard };
const SCREEN_NAME = { capd: 'CAPD', pcam: 'pCAM-ICU', pscam: 'psCAM-ICU' };
const SHEET_W = 1008; // 10.5in @ 96dpi — the landscape card's natural width

/** The card renderers expect a template-designer state; a synthetic all-on
 *  state makes every section/item render at its default (no unit edits). */
const synthState = (state) => ({
  pedsScale: state.arousalScale === 'sbs' ? 'sbs' : 'rass',
  sections: {},
  items: {},
  textOverrides: {},
  custom: {},
  customSections: [],
});

const fmtVal = (v) => String(v).replace('-', '−');

/** The overall screen result, reused for the ribbon, the outcome chip, and the
 *  report — derived exactly like renderResult() in main.js. */
export function overallResult(state) {
  const gate = arousalGate(state.arousalScale, state.arousal);
  if (gate == null) return { status: 'pending', text: 'Awaiting arousal level' };
  if (gate === 'unable') {
    return {
      status: 'unable',
      text: `${fmtVal(state.arousal)} — comatose floor; unable to assess`,
    };
  }
  if (state.screen === 'capd') {
    const r = evalCapd(state.capd);
    if (!r.complete) return { status: 'pending', text: `CAPD ${r.answered}/8 items rated` };
    return r.positive
      ? { status: 'positive', text: `CAPD ${r.score}/32 (≥ 9) — positive` }
      : { status: 'negative', text: `CAPD ${r.score}/32 (< 9) — negative` };
  }
  const data = CAM_BY_SCREEN[state.screen];
  if (!data) return { status: 'pending', text: 'Choose a screen' };
  const resolved = {};
  for (const f of data.features) resolved[f.id] = featurePresent(f, state.cam[f.id]);
  const res = evalCam(resolved);
  const name = SCREEN_NAME[state.screen];
  if (res == null) return { status: 'pending', text: `${name} in progress` };
  return res === 'positive'
    ? { status: 'positive', text: `${name} — positive (delirium present)` }
    : { status: 'negative', text: `${name} — negative` };
}

/** The ordered list of cards this assessment traversed, for the report. */
export function cardsUsed(state) {
  const o = overallResult(state);
  const list = [
    {
      key: 'arousal',
      name: `Arousal — ${state.arousalScale === 'sbs' ? 'SBS' : 'RASS'}`,
      outcome:
        state.arousal === ''
          ? 'not yet recorded'
          : `${fmtVal(state.arousal)} — ${o.status === 'unable' ? 'unable to assess' : 'screen proceeds'}`,
    },
  ];
  if (state.screen) {
    list.push({ key: state.screen, name: SCREEN_NAME[state.screen], outcome: o.text });
  }
  if (o.status === 'positive') {
    list.push({
      key: 'act',
      name: 'Act on a positive screen',
      outcome: 'non-pharmacologic first; find & fix precipitants; rule out withdrawal',
    });
  }
  return list;
}

/** The result ribbon text for one card — the arousal card reports the gate; the
 *  screen and act cards report the overall screen outcome. */
function ribbonFor(key, state) {
  if (key === 'arousal') {
    const gate = arousalGate(state.arousalScale, state.arousal);
    const scale = state.arousalScale === 'sbs' ? 'SBS' : 'RASS';
    if (state.arousal === '') return { status: 'pending', text: 'record an arousal level' };
    if (gate === 'unable') {
      return { status: 'unable', text: `${scale} ${fmtVal(state.arousal)} — unable to assess` };
    }
    return { status: 'negative', text: `${scale} ${fmtVal(state.arousal)} — screen proceeds` };
  }
  return overallResult(state);
}

/** Annotate a rendered card with the live assessment. */
function annotate(cardEl, key, state, result) {
  // A result ribbon at the top of every card.
  const ribbon = el(
    'div',
    { class: `pc-live pc-live--${result.status}` },
    el('span', { class: 'pc-live-dot' }),
    el('span', { text: `This assessment: ${result.text}` }),
  );
  const body = cardEl.querySelector('.pc-body');
  if (body) body.prepend(ribbon);

  if (key === 'arousal' && state.arousal !== '') {
    const target = fmtVal(state.arousal);
    cardEl.querySelectorAll('.pc-lrow').forEach((row) => {
      const val = row.querySelector('.pc-lval')?.textContent?.trim();
      if (val === target) row.classList.add('is-recorded');
    });
    const gate = arousalGate(state.arousalScale, state.arousal);
    if (gate === 'unable') cardEl.querySelector('.pc-gate--stop')?.classList.add('is-taken');
    else if (gate === 'ok') cardEl.querySelector('.pc-gate--go')?.classList.add('is-taken');
  }

  // On the screen cards, emphasize the applicable outcome chip.
  if (result.status === 'positive' || result.status === 'negative') {
    const kind = result.status === 'positive' ? 'present' : 'absent';
    cardEl.querySelectorAll(`.pc-chip--${kind}`).forEach((c) => c.classList.add('is-result'));
  }

  // The whole card routes a click back to the Screening tab (data entry stays
  // on the accessible native controls).
  cardEl.setAttribute('data-jump', 'screen');
  cardEl.setAttribute('role', 'button');
  cardEl.setAttribute('tabindex', '0');
}

/** Build the scaled host for one card so the fixed landscape sheet fits the
 *  panel width. The transform is set on mount by rescaleCards(). */
function hostFor(cardEl) {
  return el('div', { class: 'pcard-wrap' }, cardEl);
}

/** Render the cards used by this assessment into `mount`. */
export function renderCards(mount, state) {
  if (!mount) return;
  const result = overallResult(state);
  const cards = [];

  cards.push(['arousal', arousalCard(synthState(state))]);
  if (state.screen && SCREEN_CARD[state.screen]) {
    cards.push([state.screen, SCREEN_CARD[state.screen](synthState(state))]);
  }
  if (result.status === 'positive') {
    cards.push(['act', actCard(synthState(state))]);
  }

  const hosts = cards.map(([key, cardEl]) => {
    annotate(cardEl, key, state, ribbonFor(key, state));
    return hostFor(cardEl);
  });

  mount.replaceChildren(...hosts);
  rescaleCards(mount);
}

/** Scale each fixed-size landscape card to fit its host width (like the
 *  designer preview's rescale). Re-run on resize. */
export function rescaleCards(mount) {
  if (!mount) return;
  for (const wrap of mount.querySelectorAll('.pcard-wrap')) {
    const card = wrap.firstElementChild;
    if (!card) continue;
    card.style.transform = 'none';
    const k = wrap.clientWidth / SHEET_W;
    card.style.transform = `scale(${k})`;
    wrap.style.height = `${Math.ceil(card.offsetHeight * k)}px`;
  }
}
