/**
 * shared/dom.js — small DOM primitives shared by the adult and pediatric tools.
 * faIcon builds a sprite icon element (FontAwesome <use>) for JS-rendered UI —
 * never emoji, and CSP-safe (no HTML string is parsed).
 */
const SVGNS = 'http://www.w3.org/2000/svg';

export function faIcon(id, cls) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', cls || 'fa');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVGNS, 'use');
  use.setAttribute('href', '#' + id);
  svg.appendChild(use);
  return svg;
}
