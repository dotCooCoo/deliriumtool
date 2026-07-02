/**
 * templates/main.js — bootstrap for the bedside template designer (/templates/).
 *
 * Delegated listeners, data-* attributes, no inline handlers and no globals, so
 * the strict CSP (script-src 'self') holds. The designer edits a protocol
 * configuration (never patient data); the live preview renders the exact DOM
 * that prints. Controls are built with safe DOM APIs (createElement +
 * textContent) — no HTML strings are parsed.
 */
import {
  TEMPLATES,
  SECTIONS,
  MNEMONIC,
  NONPHARM,
  PHARM,
  PATHWAY,
  SPA_COLS,
  SPA_DEEPER,
  ESCALATION,
  FOOTER_CITES,
} from './data/content.js';
import { MEDS } from '../data/meds.js';
import { DELIRIUM_REFS } from '../data/refs.js';
import { renderSheets } from './sheets.js';
import { downloadPdf } from './pdf.js';
import {
  defaultState,
  sanitize,
  isOn,
  autosave,
  flushSave,
  loadSaved,
  clearSaved,
  buildShareUrl,
  readShareUrl,
  exportJSON,
  importJSON,
} from './state.js';
import { faIcon, applyGlossary } from '../shared/dom.js';
import { initA11y } from '../shared/a11y.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function el(tag, props, ...kids) {
  const node = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, String(v));
    }
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
}

const GLOSSARY = {
  'CAM-ICU': 'Confusion Assessment Method for the ICU',
  RASS: 'Richmond Agitation-Sedation Scale',
  SAT: 'Spontaneous Awakening Trial',
  SBT: 'Spontaneous Breathing Trial',
  PADIS: 'Pain, Agitation/sedation, Delirium, Immobility, Sleep guideline (SCCM)',
  ABCDEF:
    'The ICU Liberation bundle: Assess pain, Both SAT & SBT, Choice of sedation, Delirium, Early mobility, Family',
};

let state = null;
let shared = false;

// ── Designer controls: sections/items per template ───────────────────────────

/** Group descriptors for the active template's per-item controls. */
function controlGroups(tplId) {
  if (tplId === 'rounding') {
    return [
      {
        section: 'sec-mnemonic',
        groups: [
          {
            id: 'mnemonic',
            head: 'DELIRIUM(S) cells',
            fixedHead: true,
            items: MNEMONIC.cells.map((c) => ({ id: c.id, text: c.word, prefix: `${c.ltr} — ` })),
          },
        ],
      },
      {
        section: 'sec-nonpharm',
        groups: NONPHARM.groups.map((g) => ({
          id: g.id,
          head: g.head,
          items: g.items,
          custom: true,
        })),
      },
      {
        section: 'sec-pharm',
        groups: [
          {
            id: 'pharm',
            head: 'Guidance rows',
            fixedHead: true,
            items: [
              ...PHARM.rows.map((r) => ({ id: r.id, text: r.text, prefix: `${r.drug}: ` })),
              ...PHARM.cautions.map((c) => ({ id: c.id, text: c.text })),
            ],
          },
        ],
      },
      {
        section: 'sec-pathway',
        groups: PATHWAY.cols.map((c) => ({ id: c.id, head: c.head, items: c.items, custom: true })),
      },
    ];
  }
  return [
    {
      section: 'sec-spa-cols',
      groups: SPA_COLS.map((c) => ({
        id: c.id,
        head: c.word,
        items: c.items.map((i) => ({ id: i.id, text: i.head })),
        custom: true,
      })),
    },
    {
      section: 'sec-deeper',
      groups: SPA_DEEPER.cols.map((c) => ({ id: c.id, head: c.head, items: c.items })),
    },
    {
      section: 'sec-escalation',
      groups: ESCALATION.stages.map((s) => ({ id: s.id, head: s.head, items: s.items })),
    },
  ];
}

/** Default wording for every editable id (items + group headings). */
function defaultTexts(tplId) {
  const map = new Map();
  for (const { groups } of controlGroups(tplId)) {
    for (const g of groups) {
      if (!g.fixedHead) map.set(g.id, g.head);
      for (const item of g.items) map.set(item.id, item.text);
    }
  }
  return map;
}

const editButton = (id, label) =>
  el(
    'button',
    {
      type: 'button',
      class: 'btn btn-ghost btn-xs edit-btn',
      'data-act': 'editText',
      'data-id': id,
      'aria-label': `Reword: ${label}`,
      title: 'Reword this line',
    },
    faIcon('fa-pen'),
  );

/** Open-state of disclosure groups survives rebuilds (keyed by data-key). */
function openKeys(mount) {
  return new Set([...mount.querySelectorAll('details[open][data-key]')].map((d) => d.dataset.key));
}

function buildSectionControls() {
  const mount = $('#ctrl-sections');
  const open = openKeys(mount);
  mount.replaceChildren();
  const groupsBySection = new Map(controlGroups(state.template).map((g) => [g.section, g.groups]));
  for (const sec of SECTIONS[state.template]) {
    const secId = `sw-${sec.id}`;
    const swInput = el('input', {
      type: 'checkbox',
      id: secId,
      'data-act': 'secToggle',
      'data-id': sec.id,
    });
    swInput.checked = isOn(state.sections, sec.id);
    const head = el(
      'div',
      { class: 'sec-ctl-head' },
      el(
        'label',
        { class: 'chk sec-ctl-switch', for: secId },
        swInput,
        el('span', {}, el('strong', { text: sec.label })),
      ),
      el('span', { class: 'sec-ctl-page', text: `p.${sec.page}` }),
    );
    const wrap = el('div', { class: 'sec-ctl' }, head);
    if (sec.local) {
      wrap.append(
        el('p', {
          class: 'sec-ctl-note',
          text: 'Unit workflow — edit these steps to match your local protocol.',
        }),
      );
    }
    const groups = groupsBySection.get(sec.id);
    if (groups && groups.length) {
      const allItems = groups.flatMap((g) => g.items);
      const onCount = allItems.filter((i) => isOn(state.items, i.id)).length;
      const details = el(
        'details',
        { class: 'sec-ctl-items', 'data-key': sec.id },
        el('summary', {
          text: `Show lines (${onCount}/${allItems.length} on) — switch · reword · add`,
        }),
      );
      if (open.has(sec.id)) details.open = true;
      for (const g of groups) {
        const groupEl = el('div', { class: 'sec-ctl-group' });
        if (groups.length > 1) {
          const gh = el('div', { class: 'sec-ctl-group-head' });
          gh.append(el('span', { text: state.textOverrides[g.id] || g.head }));
          if (!g.fixedHead) gh.append(editButton(g.id, g.head));
          groupEl.append(gh);
        }
        for (const item of g.items) {
          const inputId = `it-${item.id}`;
          const input = el('input', {
            type: 'checkbox',
            id: inputId,
            'data-act': 'itemToggle',
            'data-id': item.id,
          });
          input.checked = isOn(state.items, item.id);
          const text = state.textOverrides[item.id] || item.text;
          const row = el(
            'div',
            { class: 'item-row' },
            el(
              'label',
              { class: 'chk', for: inputId },
              input,
              el('span', { text: (item.prefix || '') + text }),
            ),
            editButton(item.id, text),
          );
          groupEl.append(row);
        }
        (state.custom[g.id] || []).forEach((line, idx) => {
          groupEl.append(
            el(
              'div',
              { class: 'custom-line' },
              el('span', { class: 'custom-line-text', text: line }),
              el(
                'button',
                {
                  type: 'button',
                  class: 'btn btn-ghost btn-xs',
                  'data-act': 'removeLine',
                  'data-group': g.id,
                  'data-idx': String(idx),
                  'aria-label': `Remove custom line: ${line}`,
                },
                faIcon('fa-xmark'),
              ),
            ),
          );
        });
        if (g.custom) {
          const addInput = el('input', {
            type: 'text',
            class: 'finp custom-add-input',
            maxlength: '160',
            placeholder: 'Add a line…',
            'aria-label': `Add a custom line to ${g.head}`,
          });
          groupEl.append(
            el(
              'div',
              { class: 'custom-add' },
              addInput,
              el(
                'button',
                { type: 'button', class: 'btn btn-sm', 'data-act': 'addLine', 'data-group': g.id },
                'Add',
              ),
            ),
          );
        }
        details.append(groupEl);
      }
      wrap.append(details);
    }
    mount.append(wrap);
  }
  // Unit-authored sections.
  for (const sec of state.customSections) {
    const wrap = el(
      'div',
      { class: 'sec-ctl sec-ctl--custom' },
      el(
        'div',
        { class: 'sec-ctl-head' },
        el('strong', { text: sec.title }),
        el(
          'span',
          { class: 'sec-ctl-page' },
          `p.${sec.page} `,
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-xs',
              'data-act': 'removeSection',
              'data-sec': sec.id,
              'aria-label': `Remove section: ${sec.title}`,
            },
            faIcon('fa-xmark'),
          ),
        ),
      ),
    );
    if (!sec.lines.length) {
      wrap.append(
        el('p', {
          class: 'sec-ctl-note',
          text: 'Empty sections don’t print — add a line below to put it on the sheet.',
        }),
      );
    }
    sec.lines.forEach((line, idx) => {
      wrap.append(
        el(
          'div',
          { class: 'custom-line' },
          el('span', { class: 'custom-line-text', text: line }),
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-ghost btn-xs',
              'data-act': 'removeSecLine',
              'data-sec': sec.id,
              'data-idx': String(idx),
              'aria-label': `Remove line: ${line}`,
            },
            faIcon('fa-xmark'),
          ),
        ),
      );
    });
    const addInput = el('input', {
      type: 'text',
      class: 'finp custom-add-input',
      maxlength: '160',
      placeholder: 'Add a line…',
      'aria-label': `Add a line to ${sec.title}`,
    });
    wrap.append(
      el(
        'div',
        { class: 'custom-add' },
        addInput,
        el(
          'button',
          { type: 'button', class: 'btn btn-sm', 'data-act': 'addSecLine', 'data-sec': sec.id },
          'Add',
        ),
      ),
    );
    mount.append(wrap);
  }
}

function buildMedControls() {
  const mount = $('#ctrl-meds');
  const open = openKeys(mount);
  mount.replaceChildren();
  for (const cat of MEDS.categories) {
    const onCount = cat.items.filter((i) => state.meds[i.id]).length;
    const details = el(
      'details',
      { class: 'med-cat', 'data-key': cat.id },
      el(
        'summary',
        {},
        el('span', { text: cat.label }),
        el('span', { class: 'med-count', text: `${onCount}/${cat.items.length}` }),
      ),
    );
    if (open.has(cat.id)) details.open = true;
    details.append(
      el(
        'div',
        { class: 'med-quick' },
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-xs',
            'data-act': 'medAll',
            'data-cat': cat.id,
          },
          'All',
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'btn btn-ghost btn-xs',
            'data-act': 'medNone',
            'data-cat': cat.id,
          },
          'None',
        ),
      ),
    );
    for (const item of cat.items) {
      const inputId = `med-${item.id}`;
      const input = el('input', {
        type: 'checkbox',
        id: inputId,
        'data-act': 'medToggle',
        'data-id': item.id,
      });
      input.checked = !!state.meds[item.id];
      details.append(
        el('label', { class: 'chk', for: inputId }, input, el('span', { text: item.name })),
      );
    }
    mount.append(details);
  }
}

function reflectFields() {
  $('#f-facility').value = state.facility;
  $('#f-unit').value = state.unit;
  $('#f-doc-date').value = state.docDate;
  $('#f-doc-rev').value = state.docRev;
  $('#f-rass-target').value = state.rassTarget;
  $('#f-font-scale').value = state.fontScale;
  $('#f-font-family').value = state.fontFamily;
  $('#f-actions').checked = state.showActions;
  $('#f-doses').checked = state.showDoses;
  $('#f-brands').checked = state.showBrands;
  $('#f-med-layout').value = state.medLayout;
  $$('input[name="template"]').forEach((r) => {
    r.checked = r.value === state.template;
  });
}

function buildRefs() {
  const mount = $('#tpl-refs');
  if (!mount) return;
  mount.replaceChildren();
  const keys = [...new Set([...FOOTER_CITES.rounding, ...FOOTER_CITES.spa])];
  for (const k of keys) {
    const ref = DELIRIUM_REFS[k];
    if (!ref) continue;
    mount.append(el('li', {}, el('a', { href: ref.u, target: '_blank', rel: 'noopener' }, ref.c)));
  }
}

// ── Preview ──────────────────────────────────────────────────────────────────

function renderPreview() {
  const mount = $('#sheets');
  mount.className = `sheets fs-${state.fontScale} ff-${state.fontFamily}`;
  const sheets = renderSheets(state);
  mount.replaceChildren(
    ...sheets.map((s, i) =>
      el(
        'div',
        { class: 'sheet-wrap', role: 'img', 'aria-label': `Print preview — page ${i + 1}` },
        s,
      ),
    ),
  );
  packUnifiedMosaic(sheets);
  autoFitMeds(sheets);
  rescale();
  checkFit(sheets);
}

/**
 * The unified Step-3 mosaic packs like the PDF: explicit columns, the guidance
 * card first, then each medication card into the currently shortest column —
 * so the space beneath the guidance card is actually used (CSS multicol
 * balances columns and leaves it empty). Runs post-mount because packing
 * needs measured card heights.
 */
function packUnifiedMosaic(sheets) {
  for (const sheet of sheets) {
    const host = sheet.querySelector('.sh-pharm-mosaic');
    if (!host) continue;
    const cards = [...host.children];
    const nCols = Math.min(
      parseInt(host.style.getPropertyValue('--med-cols'), 10) || 4,
      Math.max(
        2,
        Math.floor(
          host.clientWidth /
            ((parseFloat(host.style.getPropertyValue('--med-colw')) || 2.35) * 96 * 0.9),
        ),
      ),
    );
    const cols = Array.from({ length: nCols }, () => el('div', { class: 'sh-mos-col' }));
    host.classList.add('packed');
    host.replaceChildren(...cols);
    const heights = cols.map(() => 0);
    for (const card of cards) {
      let ci = 0;
      for (let i = 1; i < nCols; i++) if (heights[i] < heights[ci] - 4) ci = i;
      cols[ci].append(card);
      heights[ci] = cols[ci].offsetHeight;
    }
  }
}

/**
 * Self-correcting fit, mirroring the PDF's shrink-until-fit: an overflowing
 * page first compacts its medication mosaic (type + column width), then steps
 * the whole page's type scale down to a floor — so a customized protocol keeps
 * fitting its two pages, and the warning only fires past the floor. When a
 * page has slack instead, the medication type grows to use it (capped so it
 * never dwarfs the rest of the sheet).
 */
function autoFitMeds(sheets) {
  for (const sheet of sheets) {
    const meds = sheet.querySelector('.sh-meds');
    // Fit is judged in the sheet's own coordinate space (offsetTop is immune
    // to the preview transform, and unlike scrollHeight it also reports free
    // space below the content, not just overflow past the edge).
    const padB = parseFloat(getComputedStyle(sheet).paddingBottom) || 0;
    // The footer rides at the page bottom (margin-top auto) — exclude it and
    // treat its top edge as the limit the content may grow to.
    const foot = sheet.querySelector(':scope > .sh-foot');
    const limit = () => sheet.clientHeight - padB - (foot ? foot.offsetHeight + 2 : 0);
    const contentBottom = () => {
      let m = 0;
      for (const c of sheet.children) {
        if (c === foot) continue;
        m = Math.max(m, c.offsetTop + c.offsetHeight);
      }
      return m;
    };
    // Strict: platform font metrics differ by a pixel or two — shrink until
    // the content is fully inside the page on every platform.
    const over = () => contentBottom() > limit() || sheet.scrollHeight > sheet.clientHeight;
    let guard = 40;
    while (over() && guard-- > 0) {
      if (meds) {
        const cur = parseFloat(meds.style.getPropertyValue('--med-shrink')) || 1;
        if (cur > 0.8) {
          meds.style.setProperty('--med-shrink', (cur - 0.03).toFixed(2));
          const curW = parseFloat(meds.style.getPropertyValue('--med-colw')) || 2.05;
          if (curW > 1.35) meds.style.setProperty('--med-colw', `${(curW - 0.04).toFixed(2)}in`);
          continue;
        }
      }
      const fit = parseFloat(sheet.style.getPropertyValue('--fs-fit')) || 1;
      if (fit <= 0.86) break;
      sheet.style.setProperty('--fs-fit', (fit - 0.02).toFixed(2));
    }
    // Grow phase: give free space back to the medication list — capped near
    // the neighboring sections' type size so the sheet reads uniformly (extra
    // slack becomes line padding, not ever-larger names). Growth keeps 4px of
    // headroom so platform font-rounding differences can never push the page
    // past its edge.
    const snug = () => contentBottom() > limit() - 4;
    const growVar = (target, name, step, cap) => {
      let g = 10;
      while (g-- > 0) {
        const cur = parseFloat(target.style.getPropertyValue(name)) || 1;
        if (cur >= cap) break;
        target.style.setProperty(name, (cur + step).toFixed(2));
        if (snug()) {
          target.style.setProperty(name, cur.toFixed(2));
          break;
        }
      }
    };
    if (meds && !snug()) {
      growVar(meds, '--med-shrink', 0.04, 1.12);
      // Remaining slack becomes breathing room between check-off lines.
      growVar(meds, '--med-pad', 0.15, 2.2);
    }
    // Every section's check rows share the leftover space as padding.
    if (!snug()) growVar(sheet, '--item-pad', 0.12, 2);
  }
}

function rescale() {
  const mount = $('#sheets');
  const avail = mount.clientWidth;
  if (!avail) return;
  $$('.sheet-wrap').forEach((wrap) => {
    const sheet = wrap.firstElementChild;
    // Clear the previous scale before measuring the sheet's natural size.
    sheet.style.transform = 'none';
    // Fill the preview column exactly — scale up as well as down.
    const k = avail / sheet.offsetWidth;
    sheet.style.transform = `scale(${k})`;
    wrap.style.height = `${Math.ceil(sheet.offsetHeight * k)}px`;
  });
}

function checkFit(sheets) {
  const warn = $('#fit-warn');
  const over = sheets
    .map((s, i) => (s.scrollHeight > s.clientHeight + 2 ? i + 1 : 0))
    .filter(Boolean);
  warn.hidden = !over.length;
  if (over.length) {
    $('#fit-warn-text').textContent =
      `Content overflows page ${over.join(' & ')} — switch off some items or choose a smaller text size.`;
  }
}

function announce(msg) {
  const live = $('#tpl-status');
  live.textContent = msg;
  setTimeout(() => {
    if (live.textContent === msg) live.textContent = '';
  }, 4000);
}

function update({ rebuildControls = false } = {}) {
  if (rebuildControls) {
    // Rebuilding replaces the focused control — put focus back where it was
    // so keyboard users aren't dropped out of the panel.
    const focusId = document.activeElement && document.activeElement.id;
    buildSectionControls();
    buildMedControls();
    if (focusId) {
      const again = document.getElementById(focusId);
      if (again) again.focus();
    }
  }
  renderPreview();
  autosave(state);
}

// ── Inline rewording of built-in lines ───────────────────────────────────────

function startEdit(btn) {
  const id = btn.dataset.id;
  const defaults = defaultTexts(state.template);
  const fallback = defaults.get(id) || '';
  const row = btn.parentElement;
  const input = el('input', {
    type: 'text',
    class: 'finp edit-input',
    maxlength: '200',
    'aria-label': 'Reworded text (clear to restore the default)',
  });
  input.value = state.textOverrides[id] || fallback;
  const commit = () => {
    const v = input.value.trim();
    if (!v || v === fallback) delete state.textOverrides[id];
    else state.textOverrides[id] = v.slice(0, 200);
    update({ rebuildControls: true });
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') update({ rebuildControls: true });
  });
  input.addEventListener('blur', commit);
  row.replaceChildren(input);
  input.focus();
  input.select();
}

// ── Events ───────────────────────────────────────────────────────────────────

function onChange(e) {
  const t = e.target;
  const act = t.dataset.act;
  if (t.name === 'template') {
    state.template = t.value;
    update({ rebuildControls: true });
    return;
  }
  if (act === 'secToggle') {
    if (t.checked) delete state.sections[t.dataset.id];
    else state.sections[t.dataset.id] = false;
    update();
    return;
  }
  if (act === 'itemToggle') {
    if (t.checked) delete state.items[t.dataset.id];
    else state.items[t.dataset.id] = false;
    update();
    return;
  }
  if (act === 'medToggle') {
    state.meds[t.dataset.id] = t.checked;
    update({ rebuildControls: true });
    return;
  }
  switch (t.id) {
    case 'f-rass-target':
      state.rassTarget = t.value;
      update();
      break;
    case 'f-font-scale':
      state.fontScale = t.value;
      update();
      break;
    case 'f-font-family':
      state.fontFamily = t.value;
      update();
      break;
    case 'f-actions':
      state.showActions = t.checked;
      update();
      break;
    case 'f-doses':
      state.showDoses = t.checked;
      update();
      break;
    case 'f-brands':
      state.showBrands = t.checked;
      update();
      break;
    case 'f-med-layout':
      state.medLayout = t.value;
      update();
      break;
  }
}

let inputTimer = null;
const INPUT_FIELDS = {
  'f-facility': 'facility',
  'f-unit': 'unit',
  'f-doc-date': 'docDate',
  'f-doc-rev': 'docRev',
};
function onInput(e) {
  const key = INPUT_FIELDS[e.target.id];
  if (!key) return;
  state[key] = e.target.value;
  clearTimeout(inputTimer);
  inputTimer = setTimeout(() => update(), 200);
}

async function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  switch (btn.dataset.act) {
    case 'print':
      window.print();
      break;
    case 'pdf':
      downloadPdf(state);
      announce('PDF saved.');
      break;
    case 'editText':
      startEdit(btn);
      break;
    case 'medAll':
    case 'medNone': {
      const cat = MEDS.categories.find((c) => c.id === btn.dataset.cat);
      if (!cat) break;
      const on = btn.dataset.act === 'medAll';
      cat.items.forEach((i) => {
        state.meds[i.id] = on;
      });
      update({ rebuildControls: true });
      break;
    }
    case 'medAllGlobal':
    case 'medNoneGlobal': {
      const on = btn.dataset.act === 'medAllGlobal';
      MEDS.categories.forEach((c) =>
        c.items.forEach((i) => {
          state.meds[i.id] = on;
        }),
      );
      update({ rebuildControls: true });
      announce(on ? 'All medications selected.' : 'All medications deselected.');
      break;
    }
    case 'share': {
      const url = buildShareUrl(state);
      let ok = true;
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        ok = false;
      }
      announce(ok ? 'Share link copied to clipboard.' : 'Could not copy — check permissions.');
      break;
    }
    case 'export':
      exportJSON(state);
      announce('Configuration exported.');
      break;
    case 'import': {
      const got = await importJSON();
      if (!got) break;
      if (got.__error) {
        announce('That file could not be read as a template configuration.');
        break;
      }
      state = got;
      reflectFields();
      update({ rebuildControls: true });
      announce('Configuration imported.');
      break;
    }
    case 'reset':
      if (
        !window.confirm('Reset the designer to its defaults? Your customization will be cleared.')
      )
        break;
      clearSaved();
      state = defaultState();
      reflectFields();
      update({ rebuildControls: true });
      announce('Designer reset to defaults.');
      break;
    case 'addLine': {
      const input = btn.parentElement.querySelector('.custom-add-input');
      const text = (input.value || '').trim().slice(0, 160);
      if (!text) break;
      const g = btn.dataset.group;
      state.custom[g] = [...(state.custom[g] || []), text].slice(0, 8);
      input.value = '';
      update({ rebuildControls: true });
      break;
    }
    case 'removeLine': {
      const g = btn.dataset.group;
      const idx = Number(btn.dataset.idx);
      const lines = (state.custom[g] || []).filter((_, i) => i !== idx);
      if (lines.length) state.custom[g] = lines;
      else delete state.custom[g];
      update({ rebuildControls: true });
      break;
    }
    case 'addSection': {
      const title = ($('#f-newsec-title').value || '').trim().slice(0, 60);
      if (!title) {
        announce('Give the section a title first.');
        break;
      }
      if (state.customSections.length >= 4) {
        announce('Up to four custom sections are supported.');
        break;
      }
      const page = $('#f-newsec-page').value === '2' ? 2 : 1;
      const id = `cs-${Date.now().toString(36)}`;
      state.customSections.push({ id, page, title, lines: [] });
      $('#f-newsec-title').value = '';
      update({ rebuildControls: true });
      announce(`Section "${title}" added to page ${page} — now add its lines.`);
      break;
    }
    case 'removeSection':
      state.customSections = state.customSections.filter((s) => s.id !== btn.dataset.sec);
      update({ rebuildControls: true });
      break;
    case 'addSecLine': {
      const input = btn.parentElement.querySelector('.custom-add-input');
      const text = (input.value || '').trim().slice(0, 160);
      if (!text) break;
      const sec = state.customSections.find((s) => s.id === btn.dataset.sec);
      if (!sec) break;
      sec.lines = [...sec.lines, text].slice(0, 8);
      input.value = '';
      update({ rebuildControls: true });
      break;
    }
    case 'removeSecLine': {
      const sec = state.customSections.find((s) => s.id === btn.dataset.sec);
      if (!sec) break;
      sec.lines = sec.lines.filter((_, i) => i !== Number(btn.dataset.idx));
      update({ rebuildControls: true });
      break;
    }
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────────

function init() {
  const fromShare = readShareUrl();
  if (fromShare) {
    state = fromShare;
    shared = true;
    history.replaceState(null, '', location.pathname + location.search);
  } else {
    state = loadSaved() || defaultState();
  }
  state = sanitize(state);

  initA11y();
  reflectFields();
  buildSectionControls();
  buildMedControls();
  buildRefs();
  renderPreview();
  if (shared) announce('Shared configuration loaded.');

  document.addEventListener('change', onChange);
  document.addEventListener('input', onInput);
  document.addEventListener('click', onClick);
  window.addEventListener('resize', rescale);
  window.addEventListener('pagehide', () => flushSave(state));
  // A descriptive PDF filename when the browser prints to file.
  const baseTitle = document.title;
  window.addEventListener('beforeprint', () => {
    const t = TEMPLATES.find((x) => x.id === state.template);
    document.title = `${t ? t.name : 'Bedside template'} — deliriumtool.com`;
  });
  window.addEventListener('afterprint', () => {
    document.title = baseTitle;
  });

  applyGlossary(GLOSSARY, [$('.ctrl'), $('.tpl-footer')].filter(Boolean));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
