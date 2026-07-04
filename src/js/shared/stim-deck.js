/**
 * shared/stim-deck.js — the stimulus picture deck shared by the interactive
 * pediatric tool (pCAM-ICU Feature-2 picture task) and the printed card deck.
 * All ten pictures serve the psCAM-ICU Feature-2 presentations; the two
 * five-picture sets support the pCAM-ICU memory-pictures alternative (5 to
 * memorize + 5 "other" for yes/no recognition). Artwork (keyed by id in
 * templates/stim-art.js) is original — the task procedure is the validated
 * element, not the specific pictures. Pure data, no imports, so both the data
 * layer (data/cam.js) and the print content can reference it without a cycle.
 */
export const STIM_DECK = [
  { id: 'stim-heart', name: 'Heart', set: 'memory' },
  { id: 'stim-star', name: 'Star', set: 'memory' },
  { id: 'stim-fish', name: 'Fish', set: 'memory' },
  { id: 'stim-sun', name: 'Sun', set: 'memory' },
  { id: 'stim-duck', name: 'Duck', set: 'memory' },
  { id: 'stim-balloons', name: 'Balloons', set: 'other' },
  { id: 'stim-flower', name: 'Flower', set: 'other' },
  { id: 'stim-ball', name: 'Ball', set: 'other' },
  { id: 'stim-butterfly', name: 'Butterfly', set: 'other' },
  { id: 'stim-boat', name: 'Sailboat', set: 'other' },
];
