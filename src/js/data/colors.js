/**
 * colors.js — the JS-facing palette.
 *
 * The full design-token palette lives in styles/tokens.css (:root custom
 * properties). This module mirrors only the few values JavaScript needs at
 * runtime — the status tones used by the RASS readout, risk bands, and progress
 * fills — so no hex is hard-coded in logic. Keep these in sync with tokens.css.
 *
 * The print/PDF palette is intentionally separate (tuned for paper) and lives in
 * pdf.js.
 */

/** Semantic status tones (hex), mirroring --c-ok / --c-caution / --c-danger / --c-text-2 in tokens.css. */
export const STATUS = {
  ok: '#2a7049',
  caution: '#9a5b13',
  danger: '#b3294a',
  neutral: '#475569',
};

/** Map a risk band (from scoring.riskTier) to a status tone. */
export const RISK_BAND_TONE = { low: 'ok', mod: 'caution', high: 'danger', crit: 'danger' };
