/**
 * settings.js — protocol/governance settings persistence.
 *
 * Auto-restores from localStorage and, when served over http/https, from a
 * settings.json next to the page (so a unit can ship a configured protocol).
 * Save/Load also write/read a settings.json file for moving a configuration
 * between machines. These are unit/protocol settings only — never patient data.
 */
import { rassTargetSet } from './scoring.js';

const LS_KEY = 'deliriumtool:settings';

export const SETTINGS_IDS = [
  'proto-ver',
  'set-screen',
  'set-camfreq',
  'set-rass',
  'set-rass-indication',
  'set-director',
  'set-cno',
  'set-lastrev',
  'set-nextrev',
  'set-footer',
];

export function settingsObject() {
  const o = {};
  SETTINGS_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) o[id] = el.value;
  });
  return o;
}

export function applySettings(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return;
  SETTINGS_IDS.forEach((id) => {
    if (o[id] == null) return;
    const el = document.getElementById(id);
    if (!el) return;
    // Untrusted source (imported file, fetched settings.json, or a crafted share
    // link): coerce to a bounded, trimmed string.
    const v = String(o[id]).slice(0, 2000).trim();
    // For <select> controls, only accept a value the control actually offers — so a
    // crafted file can't inject an out-of-range screening tool or sedation target.
    if (el.tagName === 'SELECT' && !Array.from(el.options).some((opt) => opt.value === v)) return;
    el.value = v;
  });
  syncRassTarget();
}

// Mirror the configured RASS target into the on-screen echoes (the RASS-scale
// band label + tooltip, and the bundle checklist item) so they never drift from
// the Setup value. The PDF reads the same setting, so all of them stay aligned.
export function syncRassTarget() {
  const sel = document.getElementById('set-rass');
  if (!sel) return;
  const raw = sel.value || '0 to -2';
  const val = raw.replace(/\s*\(.*\)\s*$/, '').trim();
  const band = document.getElementById('rass-band-cur');
  if (band) band.textContent = `TARGET ${val}`;
  const scale = document.getElementById('rass-band');
  if (scale) scale.title = `Target sedation band: RASS ${val}`;
  document.querySelectorAll('.rass-echo').forEach((s) => {
    s.textContent = val;
  });
  // Mark the in-target rows in the patient RASS dropdown to match the band.
  const set = rassTargetSet(raw);
  document.querySelectorAll('#rass option').forEach((opt) => {
    if (!opt.value) return;
    const base = opt.textContent.replace(/\s*✓ TARGET$/, '');
    opt.textContent = set.includes(opt.value) ? `${base} ✓ TARGET` : base;
  });
  // A deeper-than-light target (RASS ≤ −3) reveals the indication field + caution,
  // so it can never be saved/shared as a bare delirium-prevention default.
  const deep = set.some((n) => Number(n) <= -3);
  const gate = document.getElementById('rass-deep-gate');
  const note = document.getElementById('rass-deep-note');
  if (gate) gate.hidden = !deep;
  if (note) note.hidden = !deep;
}

// Briefly swap a button's label to a status message, then restore it. Re-entrancy
// safe: a rapid second click won't capture the transient label as the "original".
export function flash(btn, msg, ms = 1500) {
  if (!btn) return;
  // Snapshot the original child nodes (not just text) so an icon SVG survives the swap.
  if (btn._flashTimer) clearTimeout(btn._flashTimer);
  else btn._flashNodes = Array.from(btn.childNodes);
  btn.replaceChildren(document.createTextNode(msg));
  btn._flashTimer = setTimeout(() => {
    btn.replaceChildren(...btn._flashNodes);
    btn._flashTimer = null;
  }, ms);
}

function persistLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(settingsObject()));
  } catch {
    /* non-fatal */
  }
}

function downloadJSON(name, json) {
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 0);
}

export async function saveSettings(btn) {
  const json = JSON.stringify(settingsObject(), null, 2);
  persistLocal();
  try {
    if (window.showSaveFilePicker) {
      if (!window._settingsFileHandle) {
        window._settingsFileHandle = await window.showSaveFilePicker({
          suggestedName: 'settings.json',
          types: [{ description: 'JSON file', accept: { 'application/json': ['.json'] } }],
        });
      }
      const w = await window._settingsFileHandle.createWritable();
      await w.write(json);
      await w.close();
    } else {
      downloadJSON('settings.json', json);
    }
    flash(btn, 'Saved ✓');
  } catch (e) {
    if (e && e.name === 'AbortError') return; // user cancelled the picker
    try {
      downloadJSON('settings.json', json);
      flash(btn, 'Saved ✓');
    } catch (e2) {
      alert('Could not save settings: ' + e2.message);
    }
  }
}

export async function loadSettings(btn) {
  const commit = (text) => {
    try {
      applySettings(JSON.parse(text));
      persistLocal();
      flash(btn, 'Loaded ✓');
    } catch (e) {
      alert('Invalid settings file: ' + e.message);
    }
  };
  try {
    if (window.showOpenFilePicker) {
      const picks = await window.showOpenFilePicker({
        types: [{ description: 'JSON file', accept: { 'application/json': ['.json'] } }],
      });
      window._settingsFileHandle = picks[0];
      commit(await (await picks[0].getFile()).text());
    } else {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.json,application/json';
      inp.onchange = () => {
        const f = inp.files && inp.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => commit(r.result);
        r.readAsText(f);
      };
      inp.click();
    }
  } catch (e) {
    if (e && e.name !== 'AbortError') alert('Could not load settings: ' + e.message);
  }
}

// The provisioning file defaults to settings.json next to the page; a self-hosted
// copy can point elsewhere via <meta name="settings-src" content="...">. Same-origin
// only — absolute/protocol-relative URLs are ignored (the CSP also blocks them).
function settingsSrc() {
  const meta = document.querySelector('meta[name="settings-src"]');
  const src = ((meta && meta.content) || '').trim();
  if (!src || /^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith('//')) return 'settings.json';
  return src;
}

export function initSettings() {
  try {
    applySettings(JSON.parse(localStorage.getItem(LS_KEY) || '{}'));
  } catch {
    /* non-fatal */
  }
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    fetch(settingsSrc(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((o) => {
        if (o && typeof o === 'object') {
          const clean = {};
          Object.keys(o).forEach((k) => {
            if (o[k] != null && o[k] !== '') clean[k] = o[k];
          });
          if (Object.keys(clean).length) {
            applySettings(clean);
            persistLocal();
          }
        }
      })
      .catch(() => {
        /* no settings.json next to the page — keep local */
      });
  }
}
