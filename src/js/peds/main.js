/**
 * peds/main.js — bootstrap for the pediatric tool (/peds/).
 *
 * Mirrors the adult tool's pattern: one delegated listener per event type, every
 * interactive element carries a data-* attribute, no inline handlers and no
 * globals — so the strict CSP (script-src 'self') holds here too. This entry owns
 * the screen picker and tab navigation; the clinical modules (scoring, risk,
 * prevention, weight-based dosing, and the printable report) are layered on in
 * subsequent steps and will plug into the same dispatcher.
 */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SCREENS = {
  capd: 'CAPD — all ages',
  pcam: 'pCAM-ICU — ≥ 5 years',
  pscam: 'psCAM-ICU — 6 mo–5 yr',
};

function chooseScreen(key) {
  const name = SCREENS[key];
  if (!name) return;
  const nameEl = $('#pathway-name');
  if (nameEl) nameEl.textContent = name;
  document.body.dataset.screen = key;
  $('#pathway-picker').hidden = true;
  $('#workspace').hidden = false;
  window.scrollTo({ top: 0, behavior: 'instant' in document.body.style ? 'instant' : 'auto' });
}

function resetToPicker() {
  $('#workspace').hidden = true;
  $('#pathway-picker').hidden = false;
  delete document.body.dataset.screen;
}

function showTab(tab) {
  $$('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  // Panels are shown via the .active class (display:block); see layout.css.
  $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
}

document.addEventListener('click', (e) => {
  const pathwayBtn = e.target.closest('[data-pathway]');
  if (pathwayBtn) {
    chooseScreen(pathwayBtn.dataset.pathway);
    return;
  }
  const tabBtn = e.target.closest('.tab-btn[data-tab]');
  if (tabBtn) {
    showTab(tabBtn.dataset.tab);
    return;
  }
  const actBtn = e.target.closest('[data-act]');
  if (actBtn && actBtn.dataset.act === 'reset') {
    resetToPicker();
  }
});
