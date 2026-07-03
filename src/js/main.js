/**
 * main.js — application bootstrap and the single event dispatcher.
 *
 * Every interactive element carries a data-act attribute; one delegated listener
 * per event type routes it to a handler. There are NO inline handlers and no
 * globals, so the strict CSP (script-src 'self') holds. This module also owns the
 * pathway-first flow, tab navigation, PDF open/print, save/load/share, autosave +
 * restore, and the acronym tooltips.
 */
import { DeliriumPDF } from './pdf.js';
import * as ui from './ui.js';
import {
  S,
  assignKeys,
  autosave,
  flushSave,
  loadAutosave,
  restore,
  clearAll,
  exportJSON,
  importJSON,
  applyMeds,
} from './state.js';
import { initCitations } from './citations.js';
import { initA11y } from './shared/a11y.js';
import { applyGlossary } from './shared/dom.js';
import {
  initSettings,
  applySettings,
  saveSettings,
  loadSettings,
  settingsObject,
  syncRassTarget,
  flash,
} from './settings.js';
import { buildShareUrl, readShareUrl, copyToClipboard } from './share.js';
import { MEDS } from './data/meds.js';

const $ = (id) => document.getElementById(id);
const root = document; // controls live throughout the document

const PATHWAY_NAMES = {
  full: 'ICU Delirium Rounding Tool',
  spa: 'Simplified SPA Quick Reference',
  record: 'Delirium Assessment Record',
};

const TAB_ORDER = ['risk', 'cam', 'bundle', 'mnemonic', 'treatment', 'meds', 'settings', 'export'];

// Tabs whose input does NOT shape each document. They are de-emphasized — never
// hidden, since they carry the safety guidance — so the tabs that build the
// chosen document stand out. Setup and Generate feed/serve every document.
const PATHWAY_ASIDE = {
  full: [],
  record: ['meds'],
  spa: ['risk', 'bundle', 'mnemonic'],
};

const TAB_LABELS = {
  risk: 'Risk',
  cam: 'CAM',
  bundle: 'Bundle',
  mnemonic: 'DELIRIUM(S)',
  treatment: 'Treatment',
  meds: 'Medications',
};

// Land on the first clinical tab that actually feeds the chosen document.
function startTabFor(pathway) {
  const aside = PATHWAY_ASIDE[pathway] || [];
  return TAB_ORDER.find((t) => TAB_LABELS[t] && !aside.includes(t)) || 'cam';
}

// Reflect the chosen pathway in the workspace: sync the selector, de-emphasize
// the non-contributing tabs, and caption which tabs build this document.
function applyPathwayView(pathway) {
  const aside = PATHWAY_ASIDE[pathway] || [];
  document.querySelectorAll('.tab-btn').forEach((b) => {
    const t = b.dataset.tab;
    b.classList.toggle('tab-aside', aside.includes(t));
    // Highlight the clinical tabs that actually build this document.
    b.classList.toggle('tab-primary', !!TAB_LABELS[t] && !aside.includes(t));
  });
  const uses = TAB_ORDER.filter((t) => TAB_LABELS[t] && !aside.includes(t)).map(
    (t) => TAB_LABELS[t],
  );
  const usesEl = $('pathway-uses');
  if (usesEl) usesEl.textContent = uses.length ? `Builds from ${uses.join(' · ')}` : '';
  const sel = $('pathway-select');
  if (sel) sel.value = pathway;
}

// Ring the Generate-tab card for the chosen document.
function emphasizeExportCard() {
  document.querySelectorAll('.export-card[data-doc]').forEach((c) => {
    c.classList.toggle('is-selected', c.dataset.doc === S.pathway);
  });
}

// Move keyboard focus to the active tab after programmatic navigation that would
// otherwise drop focus to <body> (choosing a pathway, an in-content jump link).
function focusActiveTab() {
  document.querySelector('.tab-btn.active')?.focus();
}

// Has the user entered anything worth protecting from a destructive overwrite?
function hasAssessmentData() {
  return Boolean(
    S.risk > 0 ||
    S.camResult ||
    S.sub ||
    (S.log && S.log.length) ||
    ui.getFacilityName() ||
    $('rass')?.value ||
    $('cam-notes')?.value.trim() ||
    document.querySelector('[data-role="plan"]')?.value.trim() ||
    document.querySelector(
      '.rcb:checked, #tab-bundle .bun input:checked, #tab-mnemonic .mnemonic-cell input:checked, #tab-treatment .chk input:checked',
    ),
  );
}

// ─── Pathway-first flow ─────────────────────────────────────────────────────
function showWorkspace(pathway) {
  S.pathway = pathway;
  $('pathway-picker').hidden = true;
  $('workspace').hidden = false;
  $('skip-link')?.setAttribute('href', '#workspace');
  applyPathwayView(pathway);
  ui.seedAssessmentTime(); // default the assessment time to now (first entry / post-reset)
}

function choosePathway(pathway) {
  if (!PATHWAY_NAMES[pathway]) return;
  showWorkspace(pathway);
  switchTab(startTabFor(pathway));
  focusActiveTab();
  autosave(root);
}

// Change the target document without leaving the workspace (non-destructive —
// no Reset needed). Keeps the current tab; just re-tailors the view.
function switchPathwayTo(pathway) {
  if (!PATHWAY_NAMES[pathway]) return;
  S.pathway = pathway;
  applyPathwayView(pathway);
  emphasizeExportCard();
  autosave(root);
}

function resetAll() {
  if (!window.confirm('Reset and clear this assessment? This cannot be undone.')) return;
  clearAll(root);
  ui.refreshAll();
  $('workspace').hidden = true;
  $('pathway-picker').hidden = false;
  $('skip-link')?.setAttribute('href', '#pathway-picker');
  if (location.hash) history.replaceState(null, '', location.pathname);
  $('pathway-picker')?.focus(); // don't strand keyboard focus
}

// ─── Tabs ───────────────────────────────────────────────────────────────────
function switchTab(tab) {
  let activeBtn = null;
  document.querySelectorAll('.tab-btn').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
    if (on) activeBtn = b;
  });
  document.querySelectorAll('.tab-panel').forEach((p) => {
    p.classList.toggle('active', p.id === `tab-${tab}`);
  });
  // Keep the active tab visible in the horizontal strip and open the panel at its top.
  activeBtn?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  window.scrollTo({ top: 0 });
  if (tab === 'export') {
    ui.updateExportMedSummary();
    emphasizeExportCard();
  }
}

// ─── PDF ────────────────────────────────────────────────────────────────────
function pdfPayload() {
  const assessment = ui.gatherAssessment();
  return {
    facility: ui.getFacilityName(),
    // A full assessment timestamp (date + time): the entered value, or now.
    dt:
      ui.formatStamp(assessment.time) +
      (assessment.assessor ? '   Assessed by: ' + assessment.assessor.trim() : ''),
    meds: ui.selectedMeds(),
    assessment,
    settings: ui.gatherSettings(),
    // Generation time (now) — printed in the footer + used in the filename so a
    // user can tell two prints apart.
    generatedAt: ui.formatStamp(),
    generatedAtFile: ui.fileStamp(),
  };
}

function openDoc(type, btn) {
  if (
    !ui.getFacilityName() &&
    !window.confirm(
      'No facility name is set — it prints on the PDF header. Generate the PDF anyway?',
    )
  ) {
    return;
  }
  try {
    DeliriumPDF.generate(type || 'full', pdfPayload());
    if (btn) {
      // Brief disable = visible acknowledgement + guards against a duplicate file.
      btn.disabled = true;
      setTimeout(() => {
        btn.disabled = false;
      }, 1200);
    }
  } catch (e) {
    console.error(e);
    window.alert('Could not generate the PDF: ' + e.message);
  }
}

// ─── Save / load / share ────────────────────────────────────────────────────
async function importAssessment() {
  const data = await importJSON();
  if (!data) return; // user cancelled the picker
  if (data.__error || !(data.controls || data.s)) {
    window.alert('That file could not be read as a saved delirium assessment.');
    return;
  }
  try {
    restore(root, data);
    ui.refreshAll();
    syncRassTarget();
    if (data.pathway && PATHWAY_NAMES[data.pathway]) {
      showWorkspace(data.pathway);
      switchTab(TAB_ORDER.includes(data.activeTab) ? data.activeTab : startTabFor(data.pathway));
    }
    autosave(root);
  } catch (e) {
    console.error(e);
    window.alert('That file could not be loaded as an assessment.');
  }
}

async function shareConfig(btn) {
  // Share the de-identified configuration only (pathway + settings + med selection) —
  // never the assessment fields, so the link can't carry PHI.
  const meds = MEDS.categories.map((c) => ({ id: c.id, on: c.items.map((i) => i.on) }));
  const url = buildShareUrl({ pathway: S.pathway, settings: settingsObject(), meds });
  const ok = await copyToClipboard(url);
  flash(btn, ok ? 'Setup link copied ✓' : 'Copy failed', 1800);
  if (!ok) window.prompt('Copy this setup link (no assessment data):', url);
}

function applySharedConfig(cfg) {
  if (!cfg) return;
  if (cfg.settings) applySettings(cfg.settings);
  applyMeds(cfg.meds);
  ui.renderMedToggles(); // repaint the med pills + export count to match the shared selection
  if (cfg.pathway && PATHWAY_NAMES[cfg.pathway]) {
    showWorkspace(cfg.pathway);
    switchTab(startTabFor(cfg.pathway));
  }
  // Apply the shared config once — don't let the #cfg hash re-overwrite local edits on reload.
  if (location.hash) history.replaceState(null, '', location.pathname);
}

// ─── Delegated dispatch ─────────────────────────────────────────────────────
const onClick = {
  choosePathway: (el) => choosePathway(el.dataset.pathway),
  reset: () => resetAll(),
  goTab: (el) => {
    switchTab(el.dataset.tab);
    focusActiveTab();
  },
  clearRisk: () => ui.clearRisk(),
  setCam: (el) => ui.setCam(Number(el.dataset.f), el.dataset.v),
  setSub: (el) => ui.setSub(el.dataset.sub),
  saveCam: () => ui.saveCam(),
  delCamLog: (el) => ui.delCamLog(Number(el.dataset.i)),
  markAllBundle: () => ui.markAllBundle(),
  toggleMed: (el) => ui.toggleMed(el.dataset.med),
  toggleCatAll: (el) => ui.toggleCatAll(el.dataset.cat),
  setAllMeds: (el) => ui.setAllMeds(el.dataset.on === 'true'),
  autofill: () => {
    if (
      hasAssessmentData() &&
      !window.confirm('Replace the current assessment with example data? This cannot be undone.')
    ) {
      return;
    }
    ui.autofillExample();
  },
  openDoc: (el) => openDoc(el.dataset.doc, el),
  generateCurrent: () => {
    switchTab('export');
    focusActiveTab();
  },
  saveSettings: (el) => saveSettings(el),
  loadSettings: (el) => loadSettings(el),
  exportJSON: (el) => {
    exportJSON(root);
    flash(el, 'Saved ✓');
  },
  importJSON: () => importAssessment(),
  share: (el) => shareConfig(el),
};

const onChange = {
  switchPathway: (el) => switchPathwayTo(el.value),
  syncRass: () => {
    syncRassTarget();
    ui.updateRass(); // re-color the RASS band/zones relative to the new target
  },
  risk: () => ui.recalcRisk(),
  bundle: () => ui.updBundle(),
  mnemonic: () => ui.updMnemonic(),
  rass: () => ui.updateRass(),
};

const onInput = {
  cam2: () => ui.updateCam2(),
};

// Click-driven acts that mutate the assessment but fire no change/input event, so
// they must trigger autosave explicitly (otherwise the work is lost on reload).
const MUTATING_ACTS = new Set([
  'clearRisk',
  'setCam',
  'setSub',
  'markAllBundle',
  'toggleMed',
  'toggleCatAll',
  'setAllMeds',
  'autofill',
]);

function wireDispatch() {
  document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn) {
      switchTab(tabBtn.dataset.tab);
      return;
    }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = onClick[el.dataset.act];
    if (fn) {
      if (el.tagName === 'A' && el.getAttribute('href') === '#') e.preventDefault();
      fn(el);
      if (MUTATING_ACTS.has(el.dataset.act)) autosave(root);
    }
  });

  document.addEventListener('change', (e) => {
    const t = e.target;
    const chk = t.closest('.chk');
    if (chk && t.type === 'checkbox') chk.classList.toggle('done', t.checked);
    const el = t.closest('[data-act]');
    if (el && onChange[el.dataset.act]) onChange[el.dataset.act](el);
    autosave(root);
  });

  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-act]');
    if (el && onInput[el.dataset.act]) onInput[el.dataset.act](el);
    autosave(root);
  });
}

// ─── Accessibility: tablist roving focus + aria-live regions ─────────────────
function wireA11y() {
  const bar = document.querySelector('.tabs-inner');
  if (bar) {
    bar.setAttribute('role', 'tablist');
    const btns = [...bar.querySelectorAll('.tab-btn')];
    btns.forEach((b) => {
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', b.classList.contains('active') ? 'true' : 'false');
      b.tabIndex = b.classList.contains('active') ? 0 : -1;
      if (!b.id) b.id = `tabbtn-${b.dataset.tab}`;
      const panel = $(`tab-${b.dataset.tab}`);
      if (panel) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', b.id);
      }
    });
    bar.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const n =
        e.key === 'Home'
          ? 0
          : e.key === 'End'
            ? btns.length - 1
            : e.key === 'ArrowRight'
              ? (i + 1) % btns.length
              : (i - 1 + btns.length) % btns.length;
      btns[n].focus();
      switchTab(btns[n].dataset.tab);
    });
  }
  const rb = $('cam-res-box');
  if (rb) {
    rb.setAttribute('role', 'status');
    rb.setAttribute('aria-live', 'polite');
    rb.setAttribute('aria-atomic', 'true');
  }
  ['rass-note', 'cam-guid', 'pathway-uses'].forEach((id) =>
    $(id)?.setAttribute('aria-live', 'polite'),
  );
  document.querySelectorAll('table.mt th').forEach((th) => th.setAttribute('scope', 'col'));
}

// ─── Acronym tooltips (wrap the first occurrence per tab in <abbr>) ──────────
const GLOSSARY = {
  'CAM-ICU': 'Confusion Assessment Method for the ICU',
  'CIWA-Ar': 'Clinical Institute Withdrawal Assessment for Alcohol, revised',
  ICDSC: 'Intensive Care Delirium Screening Checklist',
  eCASH: 'early Comfort using Analgesia, minimal Sedatives, maximal Humane care',
  RASS: 'Richmond Agitation-Sedation Scale',
  CPOT: 'Critical-Care Pain Observation Tool',
  NMS: 'Neuroleptic Malignant Syndrome',
  SAT: 'Spontaneous Awakening Trial',
  SBT: 'Spontaneous Breathing Trial',
  GFR: 'Glomerular Filtration Rate',
  DTs: 'Delirium Tremens',
};
function wireGlossary() {
  applyGlossary(GLOSSARY, document.querySelectorAll('.tab-panel'));
}

// ─── Boot ───────────────────────────────────────────────────────────────────
function init() {
  assignKeys(root);
  ui.initUI();
  initCitations();
  wireGlossary();
  wireA11y();
  wireDispatch();
  initA11y(); // user-configurable text size / contrast / motion controls
  // Flush the debounced autosave on hide so a quick reload/close never loses the last edit.
  window.addEventListener('pagehide', () => flushSave(root));
  const shared = readShareUrl();
  initSettings({ shareActive: !!shared }); // a shared #cfg link wins over settings.json

  const fac = $('facility-input');
  if (fac) {
    fac.addEventListener('blur', () => {
      fac.value = fac.value.trim();
    });
    fac.addEventListener('input', () => ui.updateExportMedSummary());
  }

  // Card and section titles are visual headings — expose them to assistive tech
  // so screen-reader users can navigate the workspace by heading.
  root.querySelectorAll('.card-head, .sec-title').forEach((h) => {
    h.setAttribute('role', 'heading');
    h.setAttribute('aria-level', '2');
  });

  // Resume an in-progress assessment, apply a shared config, or show the picker.
  const saved = loadAutosave();
  if (saved) {
    restore(root, saved);
    ui.refreshAll();
    syncRassTarget();
  }
  if (shared) {
    applySharedConfig(shared);
  } else if (saved && saved.pathway && PATHWAY_NAMES[saved.pathway]) {
    showWorkspace(saved.pathway);
    switchTab(TAB_ORDER.includes(saved.activeTab) ? saved.activeTab : startTabFor(saved.pathway));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
