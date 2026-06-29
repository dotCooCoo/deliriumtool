/**
 * ui.js — interactive behaviour for each tab.
 *
 * Clinical decisions are delegated to the pure functions in scoring.js; this file
 * owns the DOM (reading controls, updating readouts, rendering dynamic lists).
 * All dynamic content is built with DOM methods — never innerHTML with data — and
 * per-category colours are applied via element.style, both of which keep the
 * strict CSP (script-src/style-src 'self') intact.
 *
 * Functions are invoked through the delegated dispatcher in main.js (data-act
 * attributes), so nothing here is attached to the global scope or inline handlers.
 */
import { MEDS } from './data/meds.js';
import {
  riskTier,
  riskActions,
  inattentionPositive,
  evalCam as evalCamResult,
  rassZone,
  rassTone,
  pct,
  RISK_MAX,
} from './scoring.js';
import { S } from './state.js';
import { syncRassTarget } from './settings.js';
import { faIcon } from './shared/dom.js';

const $ = (id) => document.getElementById(id);
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ─── Assessment timestamp helpers ───────────────────────────────────────────
// The assessment carries a full date+time stamp (a datetime-local value). These
// format it for display and seed the field, and tolerate older time-only values.
const pad2 = (n) => String(n).padStart(2, '0');

// "YYYY-MM-DDTHH:MM" for a datetime-local input, in local time (optionally pinned
// to a given hour:minute, e.g. the example fill).
function localStampInput(hour, minute) {
  const d = new Date();
  if (hour != null) d.setHours(hour, minute || 0, 0, 0);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Readable + filename-safe timestamps, shared with the pediatric tool.
import { formatStamp, fileStamp } from './shared/time.js';
export { formatStamp, fileStamp };

// Default the assessment-time field to now when empty (first entry / post-reset).
export function seedAssessmentTime() {
  const ct = $('cam-time');
  if (ct && !ct.value) ct.value = localStampInput();
}
const TONE_BG = { ok: '--c-ok-weak', caution: '--c-caution-weak', danger: '--c-danger-weak' };
const TONE_FG = { ok: '--c-ok', caution: '--c-caution', danger: '--c-danger' };

// ─── Tab badges ─────────────────────────────────────────────────────────────
export function updateTabBadges() {
  const rb = $('badge-risk');
  if (rb) rb.textContent = S.risk > 0 ? String(S.risk) : '';

  const bn = $('badge-bundle');
  if (bn) {
    const all = document.querySelectorAll('.bun input').length;
    const chk = document.querySelectorAll('.bun input:checked').length;
    bn.textContent = chk > 0 ? `${chk}/${all}` : '';
  }

  const cb = $('badge-cam');
  if (cb) {
    cb.classList.remove('tone-danger', 'tone-ok', 'tone-caution');
    // Colour-coded vector icon: red (positive), green (negative), amber (unable).
    const meta = {
      positive: { label: 'CAM positive', icon: 'fa-triangle-exclamation', tone: 'danger' },
      negative: { label: 'CAM negative', icon: 'fa-circle-check', tone: 'ok' },
      unable: { label: 'CAM unable to assess', icon: 'fa-ban', tone: 'caution' },
    }[S.camResult];
    if (meta) {
      cb.classList.add('tone-' + meta.tone);
      cb.replaceChildren(faIcon(meta.icon, 'fa fa-sm'));
      cb.setAttribute('aria-label', meta.label);
      cb.title = meta.label;
    } else {
      cb.replaceChildren();
      cb.removeAttribute('aria-label');
      cb.removeAttribute('title');
    }
  }

  const mb = $('badge-mnemonic');
  if (mb) {
    const all = document.querySelectorAll('#tab-mnemonic .mnemonic-cell').length;
    const chk = document.querySelectorAll('#tab-mnemonic .mnemonic-cell input:checked').length;
    mb.textContent = chk > 0 ? `${chk}/${all}` : '';
  }
  updateTabCompletion();
}

// A clinical tab counts as "filled" once the clinician has recorded its input, so
// its pathway highlight can fade. Definitions are deliberately conservative: they
// never fade a tab that might be untouched (a blank checklist reads as not-filled),
// which keeps the guidance honest in a clinical workflow.
const TAB_FILLED = {
  // Any present risk factor recorded. (Zero checked is ambiguous — reviewed-empty vs
  // untouched — so it stays highlighted, the safe direction.)
  risk: () => document.querySelectorAll('#tab-risk .rcb:checked').length > 0,
  // A determinate CAM-ICU verdict (positive / negative / unable) has been reached.
  cam: () => !!S.camResult,
  // At least two ABCDEF cards fully addressed (genuine engagement across domains).
  bundle: () =>
    [...document.querySelectorAll('#tab-bundle .card[data-bundle]')].filter((c) => {
      const ins = c.querySelectorAll('.bun input');
      return ins.length > 0 && c.querySelectorAll('.bun input:checked').length === ins.length;
    }).length >= 2,
  // The full DELIRIUM(S) review sweep is complete (the tab's own 9/9 state).
  mnemonic: () => {
    const cells = document.querySelectorAll('#tab-mnemonic .mnemonic-cell');
    return (
      cells.length > 0 &&
      document.querySelectorAll('#tab-mnemonic .mnemonic-cell input[type="checkbox"]:checked')
        .length === cells.length
    );
  },
  // Any treatment item checked, or a treatment-plan note written.
  treatment: () =>
    document.querySelectorAll('#tab-treatment input[type="checkbox"]:checked').length > 0 ||
    (document.querySelector('#tab-treatment [data-role="plan"]')?.value.trim().length || 0) > 0,
  // The clinician has curated an individual medication this session (see toggleMed).
  meds: () => document.querySelector('#med-toggle-grid')?.dataset.curated === 'true',
};

export function updateTabCompletion() {
  document.querySelectorAll('.tab-btn[data-tab]').forEach((b) => {
    const fn = TAB_FILLED[b.dataset.tab];
    b.classList.toggle('tab-done', !!(fn && fn()));
  });
}

// ─── Risk tally ─────────────────────────────────────────────────────────────
export function recalcRisk() {
  let score = 0;
  document.querySelectorAll('.rcb:checked').forEach((cb) => {
    score += parseInt(cb.dataset.pts, 10) || 0;
  });
  S.risk = score;

  const { band, label, note } = riskTier(score);
  $('rscore').textContent = score;
  const box = $('risk-disp');
  box.className = `score-box risk-${band}`;
  $('rtier').textContent = label;
  $('rnote').textContent = note;

  const fill = $('rprog');
  const riskPct = Math.min(100, (score / RISK_MAX) * 100);
  fill.style.width = `${riskPct}%`;
  fill.style.setProperty('--pct', riskPct);

  renderRiskActions(score);
  updateTabBadges();
}

function renderRiskActions(score) {
  const host = $('rrecs');
  if (!host) return;
  host.replaceChildren();

  const alert = document.createElement('div');
  if (score <= 3) {
    alert.className = 'alert a-green';
    const strong = document.createElement('strong');
    strong.textContent = 'Few risk factors: ';
    alert.append(strong, 'Maintain standard prevention and routine CAM screening.');
  } else {
    alert.className = `alert ${score > 6 ? 'a-danger' : 'a-warn'}`;
    const strong = document.createElement('strong');
    strong.textContent = 'Suggested actions (per local protocol):';
    const ul = document.createElement('ul');
    ul.style.margin = '6px 0 0';
    ul.style.paddingLeft = '18px';
    ul.style.lineHeight = '1.8';

    const jump = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'link-jump';
    a.dataset.act = 'goTab';
    a.dataset.tab = 'bundle';
    a.textContent = 'Initiate the full ABCDEF prevention bundle →';
    jump.append(a);
    ul.append(jump);

    riskActions(score).forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      ul.append(li);
    });
    alert.append(strong, ul);
  }
  host.append(alert);
}

export function clearRisk() {
  if (document.querySelector('.rcb:checked') && !window.confirm('Clear all risk factors?')) return;
  document.querySelectorAll('.rcb').forEach((cb) => {
    cb.checked = false;
    cb.closest('.chk')?.classList.remove('done'); // also clear the strikethrough styling
  });
  recalcRisk();
}

// ─── CAM-ICU ────────────────────────────────────────────────────────────────
export function setCam(f, v) {
  S.cam[f] = v;
  ['y', 'n'].forEach((suffix) => {
    const el = $(`c${f}${suffix}`);
    if (!el) return;
    const selected = v === (suffix === 'y' ? 'yes' : 'no');
    el.className = `cam-ans btn btn-sm ${selected ? 'btn-primary' : 'btn-sec'}`;
    el.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  evalCam();
  updateTabBadges();
}

export function updateCam2() {
  const field = $('cam2-err');
  const raw = (field?.value || '').trim();
  if (raw === '') {
    // Cleared — un-set Feature 2 instead of leaving the prior Yes/No answer stuck.
    S.cam[2] = undefined;
    ['y', 'n'].forEach((suffix) => {
      const el = $(`c2${suffix}`);
      if (el) {
        el.className = 'cam-ans btn btn-sm btn-sec';
        el.setAttribute('aria-pressed', 'false');
      }
    });
    evalCam();
    updateTabBadges();
    return;
  }
  let v = parseInt(raw, 10);
  if (Number.isNaN(v)) return;
  v = Math.max(0, Math.min(10, v)); // clamp typed out-of-range values to 0–10
  if (field) field.value = String(v);
  setCam(2, inattentionPositive(v) ? 'yes' : 'no');
}

export function updateCam4() {
  const v = $('cam4').value;
  if (v) setCam(4, v === 'abnormal' ? 'yes' : 'no');
}

function updateCamStrip() {
  const dots = document.querySelectorAll('#cam-strip .cstep');
  if (dots.length < 3) return;
  const on = cssVar('--c-primary');
  const off = cssVar('--c-border-strong');
  dots[0].style.background = S.cam[1] !== undefined ? on : off;
  dots[1].style.background = S.cam[2] !== undefined ? on : off;
  dots[2].style.background = S.cam[3] !== undefined || S.cam[4] !== undefined ? on : off;
}

export function evalCam() {
  updateCamStrip();
  const result = evalCamResult({
    f1: S.cam[1],
    f2: S.cam[2],
    f3: S.cam[3],
    f4: S.cam[4],
    rass: S.rass,
  });
  S.camResult = result;

  const box = $('cam-res-box');
  const icon = $('cam-res-icon');
  const title = $('cam-res-txt');
  const sub = $('cam-res-sub');
  const guid = $('cam-guid');

  const show = (tone, ic, t, subtxt, guidCls, guidText) => {
    box.style.setProperty(
      '--sb',
      tone === 'neutral' ? cssVar('--c-surface-2') : cssVar(TONE_BG[tone]),
    );
    icon.replaceChildren(faIcon(ic, 'fa fa-lg'));
    title.textContent = t;
    title.style.color = tone === 'neutral' ? cssVar('--c-text-2') : cssVar(TONE_FG[tone]);
    sub.textContent = subtxt;
    if (guidText) {
      guid.className = `alert ${guidCls}`;
      guid.textContent = guidText;
      guid.style.display = 'block';
    } else {
      guid.style.display = 'none';
    }
  };

  if (result === 'unable') {
    show(
      'caution',
      'fa-ban',
      'Unable to Assess',
      `RASS ${S.rass}: patient too sedated. Stop CAM-ICU; reassess when RASS ≥ -3.`,
      'a-warn',
      'Unable to assess: at RASS -4/-5 the patient cannot participate. Document as "unable to assess" and reattempt once arousal improves.',
    );
  } else if (result === 'positive') {
    show(
      'danger',
      'fa-triangle-exclamation',
      'CAM Positive — Delirium Present',
      'Initiate delirium management protocol',
      'a-danger',
      'Action required: document in chart, notify provider, initiate treatment protocol, identify and treat underlying causes.',
    );
  } else if (result === 'negative') {
    show(
      'ok',
      'fa-circle-check',
      'CAM Negative — No Delirium',
      'Continue prevention measures',
      'a-green',
      'Continue: maintain the ABCDEF bundle, scheduled CAM screening, and all prevention measures.',
    );
  } else {
    // incomplete
    const needBoth = S.cam[1] === undefined || S.cam[2] === undefined;
    show(
      'neutral',
      'fa-minus',
      'Incomplete',
      needBoth
        ? 'Answer Features 1 and 2 first'
        : 'Features 1 & 2 positive — assess Feature 3 or 4',
      '',
      '',
    );
  }
}

export function updateRass() {
  const v = $('rass').value;
  S.rass = v;
  const target = $('set-rass')?.value;

  const band = $('rass-band');
  if (band) {
    band.querySelectorAll('[data-r]').forEach((s) => {
      const r = s.dataset.r;
      s.className = 'rb-' + rassTone(r, target); // colour the band relative to the target
      const isCur = r === v;
      s.style.height = isCur ? '16px' : '9px';
      s.style.outline = isCur ? `2px solid ${cssVar('--c-text')}` : 'none';
      s.style.outlineOffset = '1px';
    });
  }

  const cur = $('rass-band-cur');
  if (cur) {
    if (v) {
      cur.textContent = `RASS ${String(v).replace('-', '−')} — ${rassZone(v, target)}`;
      const tone = rassTone(v, target);
      cur.style.color = tone === 'none' ? cssVar('--c-text') : cssVar(TONE_FG[tone]);
    } else {
      // No RASS selected — show the configured target, not a hardcoded value.
      syncRassTarget();
      cur.style.color = cssVar('--c-text');
    }
  }

  const messages = {
    '+4': ['a-danger', 'Immediate intervention required.'],
    '+3': ['a-danger', 'High agitation — assess for pharmacologic intervention.'],
    '+2': ['a-warn', 'Agitated — intensify non-pharmacologic measures first.'],
    '+1': ['a-warn', 'Monitor closely — reassess in 1 hour.'],
    0: ['a-green', 'Goal achieved — continue current management.'],
    '-1': ['a-teal', 'Within acceptable light-sedation range.'],
    '-2': ['a-teal', 'Light sedation — ensure SAT/SBT still being performed.'],
    '-3': ['a-warn', 'Moderate sedation — review necessity daily.'],
    '-4': ['a-danger', 'Deep sedation — SAT indicated; deep sedation increases delirium risk.'],
    '-5': ['a-danger', 'Unarousable — neurological assessment needed.'],
  };
  const note = $('rass-note');
  if (note) {
    const m = messages[v];
    note.replaceChildren();
    if (m) {
      // Colour the advisory to match the (target-aware) band; keep the wording.
      const advisoryTone = { ok: 'a-green', caution: 'a-warn', danger: 'a-danger' };
      note.className = `alert ${advisoryTone[rassTone(v, target)] || 'a-warn'}`;
      note.textContent = m[1];
    } else {
      note.className = '';
    }
  }

  evalCam();
  updateTabBadges();
}

export function setSub(t) {
  S.sub = t;
  const map = { hy: 'hyper', ho: 'hypo', mx: 'mixed' };
  ['hy', 'ho', 'mx'].forEach((suffix) => {
    const el = $(`sub-${suffix}`);
    if (el) el.className = `btn btn-sm ${map[suffix] === t ? 'btn-primary' : 'btn-sec'}`;
  });
  const notes = {
    hyper:
      'Hyperactive (~23% of delirious cases, least common — la Cour 2022): agitation, pulling at lines, combativeness. Address safety; antipsychotics only for short-term control of dangerous agitation, not to treat delirium.',
    hypo: 'Hypoactive (~50% of delirious cases, most common — la Cour 2022): withdrawal, somnolence, reduced responsiveness. Frequently missed and associated with poor outcomes. Treat the underlying cause; avoid antipsychotics.',
    mixed:
      'Mixed (~28% of delirious cases — la Cour 2022): alternating hyperactive and hypoactive features; associated with the longest duration and length of stay. These figures are the proportion among patients with delirium, not population prevalence.',
  };
  const noteEl = $('sub-note');
  if (noteEl) noteEl.textContent = notes[t] || '';
}

export function saveCam() {
  // Logging stamps the present moment into the log; the editable assessment-time
  // field is left untouched so a manually entered value is preserved.
  const t = formatStamp();
  const r =
    S.camResult === 'positive'
      ? 'POSITIVE'
      : S.camResult === 'negative'
        ? 'NEGATIVE'
        : S.camResult === 'unable'
          ? 'UNABLE TO ASSESS'
          : 'INCOMPLETE';
  S.log.push({ time: t, result: r, rass: S.rass || 'N/R', sub: S.sub || 'N/R' });
  renderCamLog();
  $('cam-log')?.closest('details')?.setAttribute('open', ''); // reveal the new row as feedback
}

export function renderCamLog() {
  const el = $('cam-log');
  if (!el) return;
  el.replaceChildren();
  if (!S.log.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'No assessments logged this session.';
    el.append(p);
    return;
  }
  const toneFor = (r) =>
    r === 'POSITIVE'
      ? 'danger'
      : r === 'NEGATIVE'
        ? 'ok'
        : r === 'UNABLE TO ASSESS'
          ? 'caution'
          : 'neutral';
  S.log.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'log-item';

    const left = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = e.result;
    const tone = toneFor(e.result);
    if (tone !== 'neutral') strong.style.color = cssVar(TONE_FG[tone]);
    left.append(strong, ` · ${e.time}`);

    const mid = document.createElement('span');
    mid.className = 'log-who';
    mid.textContent = `RASS ${e.rass} · ${e.sub}`;

    const del = document.createElement('button');
    del.className = 'btn btn-sec btn-sm';
    del.dataset.act = 'delCamLog';
    del.dataset.i = String(i);
    del.setAttribute('aria-label', 'Delete this assessment');
    del.replaceChildren(faIcon('fa-xmark', 'fa fa-sm'));

    row.append(left, mid, del);
    el.append(row);
  });
}

export function delCamLog(i) {
  S.log.splice(i, 1);
  renderCamLog();
}

// ─── Prevention bundle ──────────────────────────────────────────────────────
export function updBundle() {
  const all = document.querySelectorAll('.bun input');
  const chk = document.querySelectorAll('.bun input:checked');
  const percent = pct(chk.length, all.length);

  const lbl = $('bpct-lbl');
  if (lbl) lbl.textContent = `${chk.length}/${all.length} items · ${percent}%`;

  const fill = $('bfill');
  if (fill) {
    fill.style.width = `${percent}%`;
    fill.style.setProperty('--pct', percent);
    fill.classList.toggle('is-complete', percent === 100);
  }

  // Per-letter status tiles, keyed by the card's data-bundle attribute.
  document.querySelectorAll('#tab-bundle .card[data-bundle]').forEach((card) => {
    const letter = card.dataset.bundle;
    const cell = document.querySelector(`#bundle-letters [data-letter="${letter}"]`);
    if (!cell) return;
    const ins = card.querySelectorAll('.bun input');
    if (!ins.length) return;
    const on = card.querySelectorAll('.bun input:checked').length;
    cell.classList.toggle('on', on === ins.length);
  });

  updateTabBadges();
}

export function markAllBundle() {
  document.querySelectorAll('.bun input').forEach((cb) => {
    cb.checked = true;
    cb.closest('.chk')?.classList.add('done');
  });
  updBundle();
}

// ─── DELIRIUM(S) mnemonic ───────────────────────────────────────────────────
export function buildLetterStrip() {
  const strip = $('mnemonic-letters');
  const cells = document.querySelectorAll('#tab-mnemonic .mnemonic-cell');
  if (!strip || !cells.length || strip.childElementCount) return;
  cells.forEach((cell) => {
    const ltr = cell.querySelector('.mnemonic-ltr');
    const pill = document.createElement('div');
    pill.textContent = ltr ? ltr.textContent.trim() : '';
    strip.append(pill);
  });
}

export function updMnemonic() {
  const cells = document.querySelectorAll('#tab-mnemonic .mnemonic-cell');
  const strip = $('mnemonic-letters');
  let done = 0;
  cells.forEach((cell, i) => {
    const cb = cell.querySelector('input[type="checkbox"]');
    const on = !!(cb && cb.checked);
    if (on) done++;
    cell.classList.toggle('reviewed', on);
    const pill = strip ? strip.children[i] : null;
    if (pill) pill.classList.toggle('on', on);
  });
  const total = cells.length;
  const lbl = $('mnem-count');
  if (lbl) lbl.textContent = `${done}/${total} reviewed`;
  const fill = $('mfill');
  if (fill) {
    const mnemPct = pct(done, total);
    fill.style.width = `${mnemPct}%`;
    fill.style.setProperty('--pct', mnemPct);
    fill.classList.toggle('is-complete', done === total && total > 0);
  }
  updateTabBadges();
}

// ─── Medications ────────────────────────────────────────────────────────────
function getMedItem(id) {
  for (const cat of MEDS.categories) {
    for (const item of cat.items) if (item.id === id) return item;
  }
  return null;
}

export function toggleMed(id) {
  const item = getMedItem(id);
  if (item) {
    item.on = !item.on;
    // Toggling an individual drug is a genuine review action — mark the Medications
    // tab curated so its pathway highlight can fade (bulk enable/disable-all and
    // restored selections deliberately do not set this).
    const grid = $('med-toggle-grid');
    if (grid) grid.dataset.curated = 'true';
    renderMedToggles();
  }
}

export function toggleCatAll(catId) {
  const cat = MEDS.categories.find((c) => c.id === catId);
  if (!cat) return;
  // Match the label, which reads "Enable all" until EVERY item is on.
  const allOn = cat.items.every((i) => i.on);
  cat.items.forEach((i) => {
    i.on = !allOn;
  });
  renderMedToggles();
}

export function setAllMeds(on) {
  MEDS.categories.forEach((cat) => cat.items.forEach((i) => (i.on = on)));
  renderMedToggles();
}

export function renderMedToggles() {
  const container = $('med-toggle-grid');
  if (!container) return;
  container.replaceChildren();

  MEDS.categories.forEach((cat) => {
    const block = document.createElement('div');
    block.className = 'med-cat-block';

    const hdr = document.createElement('div');
    hdr.className = 'med-cat-hdr';
    hdr.style.borderLeftColor = cat.hdrBg; // category accent (element.style → CSP-safe)
    const name = document.createElement('span');
    name.textContent = cat.label;
    const allOn = cat.items.every((i) => i.on);
    const toggleAll = document.createElement('button');
    toggleAll.type = 'button';
    toggleAll.className = 'cat-toggle-all';
    toggleAll.dataset.act = 'toggleCatAll';
    toggleAll.dataset.cat = cat.id;
    toggleAll.textContent = allOn ? 'Disable all' : 'Enable all';
    hdr.append(name, toggleAll);

    const wrap = document.createElement('div');
    wrap.className = 'med-items-wrap';
    cat.items
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `med-toggle-pill ${item.on ? 'on' : 'off'}`;
        pill.dataset.act = 'toggleMed';
        pill.dataset.med = item.id;
        pill.setAttribute('role', 'switch');
        pill.setAttribute('aria-checked', String(item.on));
        if (item.on) pill.style.borderColor = cat.hdrBg;
        const dot = document.createElement('span');
        dot.className = 'pill-dot';
        if (item.on) dot.style.background = cat.hdrBg;
        pill.append(dot, document.createTextNode(' ' + item.name));
        if (item.risk === 'high') {
          const flag = document.createElement('span');
          flag.className = 'pill-flag';
          flag.append(
            faIcon('fa-triangle-exclamation', 'fa fa-sm'),
            document.createTextNode(' higher-risk'),
          );
          pill.append(flag);
        }
        wrap.append(pill);
      });

    block.append(hdr, wrap);
    container.append(block);
  });

  const counts = MEDS.categories.reduce(
    (acc, c) => {
      c.items.forEach((i) => {
        acc.total++;
        if (i.on) acc.on++;
      });
      return acc;
    },
    { on: 0, total: 0 },
  );
  const countEl = $('med-active-count');
  if (countEl) countEl.textContent = `${counts.on} active · ${counts.total - counts.on} off`;
  updateExportMedSummary();
}

export function updateExportMedSummary() {
  let on = 0;
  let total = 0;
  MEDS.categories.forEach((c) =>
    c.items.forEach((i) => {
      total++;
      if (i.on) on++;
    }),
  );
  const mc = $('export-med-count');
  if (mc) mc.textContent = `${on} active · ${total - on} off`; // mirror the Meds-tab badge
  const fac = $('facility-input');
  const fc = $('export-facility');
  if (fc) fc.textContent = (fac && fac.value.trim()) || '(not set)';
}

// ─── Assessment snapshot for the PDF (robust data-* anchors) ────────────────
export function getFacilityName() {
  const fac = $('facility-input');
  // Empty → '' so the PDF prints a blank header instead of the literal placeholder.
  return fac && fac.value.trim() ? fac.value.trim() : '';
}

export function gatherAssessment() {
  const tier = riskTier(S.risk || 0).tier;

  const mnemDomains = [];
  document.querySelectorAll('#tab-mnemonic .mnemonic-cell').forEach((cell) => {
    const cb = cell.querySelector('input[type="checkbox"]');
    const ta = cell.querySelector('textarea');
    mnemDomains.push({ reviewed: !!(cb && cb.checked), action: ta ? ta.value.trim() : '' });
  });

  const consults = [];
  const consultCard = document.querySelector('#tab-treatment [data-role="consults"]');
  if (consultCard) {
    consultCard.querySelectorAll('.chk input:checked').forEach((cb) => {
      const sp = cb.closest('.chk')?.querySelector('span');
      if (sp) consults.push(sp.textContent.trim());
    });
  }

  const itemsFrom = (root) =>
    [...root.querySelectorAll('.chk input[type="checkbox"]')].map((cb) => ({
      t: cb.closest('.chk')?.querySelector('span')?.textContent.trim() || '',
      on: !!cb.checked,
    }));

  const bundle = [];
  document.querySelectorAll('#tab-bundle .card[data-bundle]').forEach((card) => {
    const items = [...card.querySelectorAll('.bun input[type="checkbox"]')].map((cb) => ({
      t: cb.closest('.chk')?.querySelector('span')?.textContent.trim() || '',
      on: !!cb.checked,
    }));
    if (items.length) {
      bundle.push({
        hdr: card.querySelector('.card-head')?.textContent.trim().replace(/\s+/g, ' ') || '',
        items,
      });
    }
  });

  const sleepCard = document.querySelector('#tab-bundle [data-role="sleep"]');
  const sleep = sleepCard ? itemsFrom(sleepCard) : [];

  const pathway = [];
  document.querySelectorAll('#tab-treatment .pathway-col').forEach((col) => {
    const items = itemsFrom(col);
    if (items.length)
      pathway.push({ hdr: col.querySelector('.pathway-hdr')?.textContent.trim() || '', items });
  });

  const rxCard = document.querySelector('#tab-treatment [data-role="rx"]');
  const rx = rxCard ? itemsFrom(rxCard) : [];

  return {
    bundle,
    sleep,
    pathway,
    rx,
    cam: S.camResult || null,
    rass: S.rass || '',
    sub: S.sub || '',
    risk: S.risk || 0,
    riskTier: tier,
    bundleOn: document.querySelectorAll('.bun input:checked').length,
    bundleAll: document.querySelectorAll('.bun input').length,
    mnemDomains,
    mnemOn: mnemDomains.filter((d) => d.reviewed).length,
    mnemAll: mnemDomains.length,
    treatOn: document.querySelectorAll('#tab-treatment .treat-step .chk input:checked').length,
    treatAll: document.querySelectorAll('#tab-treatment .treat-step .chk input').length,
    consults,
    notes: ($('cam-notes')?.value || '').trim(),
    plan: (document.querySelector('#tab-treatment [data-role="plan"]')?.value || '').trim(),
    time: $('cam-time')?.value || '',
  };
}

export function gatherSettings() {
  const v = (id) => ($(id)?.value || '').trim();
  return {
    version: v('proto-ver'),
    screen: v('set-screen'),
    camfreq: v('set-camfreq'),
    rassTarget: v('set-rass'),
    rassIndication: v('set-rass-indication'),
    director: v('set-director'),
    cno: v('set-cno'),
    lastRev: v('set-lastrev'),
    nextRev: v('set-nextrev'),
    footer: v('set-footer'),
  };
}

/** Active (toggled-on) medications grouped by category, for the PDF. */
export function selectedMeds() {
  return MEDS.categories
    .map((c) => ({
      id: c.id,
      label: c.label,
      items: c.items.filter((i) => i.on).map((i) => i.name),
    }))
    .filter((c) => c.items.length > 0);
}

// ─── Recompute every derived readout (after a restore) ──────────────────────
export function refreshAll() {
  // A fresh load / reset / import is not this session's med curation — clear the flag
  // so a restored non-default selection doesn't read as "reviewed".
  const mg = $('med-toggle-grid');
  if (mg) delete mg.dataset.curated;
  recalcRisk();
  // Re-apply CAM feature button states from S.cam.
  [1, 2, 3, 4].forEach((f) => {
    if (S.cam[f] !== undefined) setCam(f, S.cam[f]);
  });
  if ($('rass') && S.rass) $('rass').value = S.rass;
  updateRass();
  if (S.sub) setSub(S.sub);
  document.querySelectorAll('.chk input[type="checkbox"]').forEach((cb) => {
    cb.closest('.chk')?.classList.toggle('done', cb.checked);
  });
  updBundle();
  updMnemonic();
  renderCamLog();
  renderMedToggles();
  updateTabBadges();
}

// ─── Demo data ──────────────────────────────────────────────────────────────
export function autofillExample() {
  const fac = $('facility-input');
  if (fac) fac.value = 'Example Medical Center';

  document.querySelectorAll('.rcb').forEach((cb, i) => {
    cb.checked = i < 7;
  });
  recalcRisk();

  setCam(1, 'yes');
  const err = $('cam2-err');
  if (err) err.value = '3';
  updateCam2();
  const loc = $('cam4');
  if (loc) loc.value = 'abnormal';
  updateCam4();
  setCam(3, 'yes');

  const rass = $('rass');
  if (rass) rass.value = '-1';
  updateRass();
  setSub('hypo');
  const ct = $('cam-time');
  if (ct && !ct.value) ct.value = localStampInput(8, 30);
  const notes = $('cam-notes');
  if (notes)
    notes.value =
      'Acute change from baseline per night-shift RN and family; inattentive on the letters task (3 errors), lethargic. No focal deficits. Reviewing medications; ruling out infection and urinary retention.';
  saveCam();

  markAllBundle();

  document.querySelectorAll('#tab-mnemonic .mnemonic-cell').forEach((cell) => {
    const cb = cell.querySelector('input[type="checkbox"]');
    if (cb) {
      cb.checked = true;
      cb.closest('.chk')?.classList.add('done');
    }
    const ta = cell.querySelector('textarea');
    if (ta && !ta.value) ta.value = 'Reviewed — addressed / no acute contributor.';
  });
  updMnemonic();

  document.querySelectorAll('#tab-treatment .chk input[type="checkbox"]').forEach((cb) => {
    cb.checked = true;
    cb.closest('.chk')?.classList.add('done');
  });
  const plan = document.querySelector('#tab-treatment [data-role="plan"]');
  if (plan && !plan.value)
    plan.value =
      'Non-pharmacologic bundle in place; 1:1 sitter, non-essential devices removed, family present for reorientation. No antipsychotic required. Reassess CAM-ICU each shift and de-escalate as mental status improves.';

  // Medications — a realistic subset this example patient is on (not the whole list).
  const exampleMeds = ['Lorazepam', 'Fentanyl', 'Diphenhydramine'];
  MEDS.categories.forEach((cat) =>
    cat.items.forEach((it) => {
      it.on = exampleMeds.some((n) => it.name.includes(n));
    }),
  );
  renderMedToggles();
  // The demo represents a fully reviewed patient, so mark the meds tab curated too.
  const medGrid = $('med-toggle-grid');
  if (medGrid) medGrid.dataset.curated = 'true';

  // Setup / governance — fill the empty fields so the Setup tab and the printed
  // governance block show a complete example (the selects already default sensibly).
  const setIfEmpty = (id, val) => {
    const el = $(id);
    if (el && !el.value) el.value = val;
  };
  const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const now = new Date();
  setIfEmpty('proto-ver', '1.0');
  setIfEmpty('set-director', 'A. Director, MD — ICU Medical Director');
  setIfEmpty('set-cno', 'B. Lead, RN — Nurse Leader');
  setIfEmpty('set-lastrev', isoDate(now));
  setIfEmpty(
    'set-nextrev',
    isoDate(new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())),
  );

  updateTabBadges();
  updateExportMedSummary();
}

// ─── Initial render ─────────────────────────────────────────────────────────
export function initUI() {
  seedAssessmentTime();
  buildLetterStrip();
  renderMedToggles();
  recalcRisk();
  updMnemonic();
  updBundle();
  updateTabBadges();
}
