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

function buildSectionControls() {
  const mount = $('#ctrl-sections');
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
        { class: 'sec-ctl-items' },
        el('summary', {
          text: `Show lines (${onCount}/${allItems.length} on) — switch · reword · add`,
        }),
      );
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
  mount.replaceChildren();
  for (const cat of MEDS.categories) {
    const onCount = cat.items.filter((i) => state.meds[i.id]).length;
    const details = el(
      'details',
      { class: 'med-cat' },
      el(
        'summary',
        {},
        el('span', { text: cat.label }),
        el('span', { class: 'med-count', text: `${onCount}/${cat.items.length}` }),
      ),
    );
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
  $('#f-rass-target').value = state.rassTarget;
  $('#f-font-scale').value = state.fontScale;
  $('#f-font-family').value = state.fontFamily;
  $('#f-actions').checked = state.showActions;
  $('#f-doses').checked = state.showDoses;
  $('#f-brands').checked = state.showBrands;
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
  rescale();
  checkFit(sheets);
}

function rescale() {
  const mount = $('#sheets');
  const avail = mount.clientWidth;
  if (!avail) return;
  $$('.sheet-wrap').forEach((wrap) => {
    const sheet = wrap.firstElementChild;
    // Clear the previous scale before measuring the sheet's natural size.
    sheet.style.transform = 'none';
    const k = Math.min(1, avail / sheet.offsetWidth);
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
    buildSectionControls();
    buildMedControls();
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
  }
}

let inputTimer = null;
function onInput(e) {
  const t = e.target;
  if (t.id !== 'f-facility' && t.id !== 'f-unit') return;
  if (t.id === 'f-facility') state.facility = t.value;
  else state.unit = t.value;
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
