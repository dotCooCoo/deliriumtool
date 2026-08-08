/**
 * templates/primitives.js — shared DOM primitives for every printable sheet
 * and card builder. Safe-DOM only (createElement/textContent — the strict CSP
 * forbids innerHTML), and all check/blank primitives carry the class hooks the
 * capture-based PDF uses to overlay interactive form fields (.sh-box →
 * checkbox, .sh-rass-box → radio option, .sh-blank → text field).
 */
import { isOn } from './state.js';
import { el as baseEl } from '../shared/dom.js';

/**
 * Text a unit rewrote in the designer is not the text the cited sources
 * support, so a printed sheet has to say which lines are which — a laminated
 * card outlives the session it was designed in.
 *
 * Carrying an id to every builder would mean touching ~25 call sites, so the
 * substituted string is branded instead: `ov` brands what it replaced, the
 * transforms below carry the brand, and the local `el` turns it into a printed
 * marker. Anything that reaches an element as ordinary text stays unmarked.
 */
class Edited extends String {}

/** The marker printed on an edited line; the sheet footer explains it. */
export const EDIT_MARK = '†';

const edits = new Map();

/** Forget the previous render's edits — called once per renderSheets(). */
export const resetEdits = () => edits.clear();

/** What the current configuration replaced: [{ id, from, to }]. */
export const listEdits = () => [...edits].map(([id, v]) => ({ id, ...v }));

/** Carry the edited brand across a string transform. */
export const remap = (s, fn) => {
  const out = fn(String(s));
  return s instanceof Edited ? new Edited(out) : out;
};

/** Mark a string as the unit's own text rather than built-in cited content. */
export const asEdited = (s, id) => {
  edits.set(id || `added:${s}`, { from: '', to: String(s) });
  return new Edited(String(s));
};

/**
 * el() as the sheets use it: the shared builder, plus the edited-line marker.
 * Every printed builder imports `el` from here, so the marker cannot be
 * bypassed by forgetting to opt in at a call site.
 */
export function el(tag, props, ...kids) {
  const node = baseEl(tag, props, ...kids);
  if (props && props.text instanceof Edited) {
    node.classList.add('sh-edited');
    node.append(baseEl('sup', { class: 'sh-edit-mark', text: EDIT_MARK }));
  }
  return node;
}

/**
 * Short hyphenated tokens (T-A-D-A, CAM-ICU, WAT-1…) must never wrap across
 * lines on a printed card — swap their hyphens for non-breaking hyphens.
 */
export const nobreak = (s) =>
  remap(s, (t) => t.replace(/\b(\w{1,4})((?:-\w{1,4})+)\b/g, (m) => m.replace(/-/g, '‑')));

/** A printed check-off square (drawn box — marked with a dry-erase pen). */
export const box = () => el('span', { class: 'sh-box', 'aria-hidden': 'true' });

/** A round check mark as SVG — stays perfectly circular under the preview scale. */
export function circleBox() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 10 10');
  svg.setAttribute('class', 'sh-rass-box');
  svg.setAttribute('aria-hidden', 'true');
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', '5');
  c.setAttribute('cy', '5');
  c.setAttribute('r', '4.2');
  c.setAttribute('fill', 'none');
  c.setAttribute('stroke', 'currentColor');
  c.setAttribute('stroke-width', '1.3');
  svg.append(c);
  return svg;
}

/** A write-in blank. */
export const blank = (cls) => el('span', { class: `sh-blank${cls ? ' ' + cls : ''}` });

/** One check-off row: square + text. */
export const checkItem = (text, cls) =>
  el(
    'div',
    { class: `sh-item${cls ? ' ' + cls : ''}` },
    box(),
    el('span', { text: nobreak(text) }),
  );

/**
 * Built-in text, unless the unit reworded it in the designer. A replacement is
 * recorded and branded so the sheet marks it and the footer stops crediting the
 * cited sources for a line they do not support.
 */
export const ov = (state, id, fallback) => {
  const v = state.textOverrides[id];
  if (typeof v !== 'string' || !v || v === String(fallback)) return fallback;
  edits.set(id, { from: String(fallback), to: v });
  return new Edited(v);
};

export const secOn = (state, id) => isOn(state.sections, id);
export const itemOn = (state, id) => isOn(state.items, id);

/**
 * The unit's added lines for one group. These are marked like a reworded line:
 * they print under the same cited-sources footer and no source supports them.
 */
export const customLines = (state, groupId) =>
  (state.custom[groupId] || []).map((t) =>
    checkItem(asEdited(t, `added:${groupId}:${t}`), 'sh-item--custom'),
  );
