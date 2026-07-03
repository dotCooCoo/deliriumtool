/**
 * templates/primitives.js — shared DOM primitives for every printable sheet
 * and card builder. Safe-DOM only (createElement/textContent — the strict CSP
 * forbids innerHTML), and all check/blank primitives carry the class hooks the
 * capture-based PDF uses to overlay interactive form fields (.sh-box →
 * checkbox, .sh-rass-box → radio option, .sh-blank → text field).
 */
import { isOn } from './state.js';
import { el } from '../shared/dom.js';
export { el };

/**
 * Short hyphenated tokens (T-A-D-A, CAM-ICU, WAT-1…) must never wrap across
 * lines on a printed card — swap their hyphens for non-breaking hyphens.
 */
export const nobreak = (s) =>
  String(s).replace(/\b(\w{1,4})((?:-\w{1,4})+)\b/g, (m) => m.replace(/-/g, '‑'));

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

/** Built-in text, unless the unit reworded it in the designer. */
export const ov = (state, id, fallback) => state.textOverrides[id] || fallback;

export const secOn = (state, id) => isOn(state.sections, id);
export const itemOn = (state, id) => isOn(state.items, id);

/** The unit's added lines for one group. */
export const customLines = (state, groupId) =>
  (state.custom[groupId] || []).map((t) => checkItem(t, 'sh-item--custom'));
