/**
 * shared/evidence-vocab.js — the words the two evidence surfaces use for a
 * claim's status and for each source's stance.
 *
 * The /evidence page and the (i) popovers on the template previews describe the
 * same claim data. They held separate copies of this wording, so relabelling a
 * stance on one surface would have left the other saying something else about
 * the same source. The strings live here; each surface keeps its own CSS class
 * names, which are presentational and legitimately differ.
 */

/** Claim evidence status — the long form, for a badge with room for it. */
export const STATUS_LABEL = {
  fulltext: 'Full-text verified',
  instrument: 'Validated instrument',
  guideline: 'Guideline text',
  abstract: 'Abstract',
  web: 'Web / resource page',
  notstated: 'Not stated in cited source',
  structure: 'Operational structure',
  na: 'Site-customized (no citation)',
  other: 'Other',
};

/** The same statuses, shortened for a chip or a dense card badge. */
export const STATUS_SHORT = {
  fulltext: 'Full text',
  instrument: 'Instrument',
  guideline: 'Guideline',
  abstract: 'Abstract',
  web: 'Web page',
  notstated: 'Not stated',
  structure: 'Operational',
  na: 'Site content',
  other: 'Other',
};

/** What one cited source does with the claim it is attached to. */
export const STANCE_LABEL = {
  agrees: 'agrees',
  partial: 'partial',
  contradicts: 'differs',
  not_stated: 'not in source',
  not_addressed: 'not re-addressed',
  background: 'context',
};
