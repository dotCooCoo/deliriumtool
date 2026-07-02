/**
 * templates/stim-art.js — original stimulus-picture artwork for the pediatric
 * card deck. Bright, flat, single-object illustrations (child-salient, no
 * text) drawn as inline SVG so they print crisply at any size with no
 * external assets. The validated element of the ps/pCAM-ICU picture tasks is
 * the procedure, not the specific pictures; units may substitute their own
 * validated set (noted on the instructions card).
 */

const NS = 'http://www.w3.org/2000/svg';

/** Build an SVG element tree from [tag, attrs] tuples. */
function svg(nodes) {
  const root = document.createElementNS(NS, 'svg');
  root.setAttribute('viewBox', '0 0 100 100');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('focusable', 'false');
  for (const [tag, attrs] of nodes) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    root.appendChild(n);
  }
  return root;
}

const DRAWINGS = {
  'stim-heart': () =>
    svg([
      [
        'path',
        {
          d: 'M50 88 C20 66 8 48 8 32 C8 18 19 10 30 10 C38 10 46 15 50 23 C54 15 62 10 70 10 C81 10 92 18 92 32 C92 48 80 66 50 88Z',
          fill: '#e63a5f',
          stroke: '#a51e3e',
          'stroke-width': '3',
        },
      ],
      [
        'path',
        {
          d: 'M63 52 C50 43 45 35 45 28 C45 22 50 19 54 19 C57 19 60 21 62 24 C64 21 67 19 70 19 C74 19 79 22 79 28 C79 35 74 43 63 52Z',
          fill: '#ffb3c2',
          stroke: '#a51e3e',
          'stroke-width': '2',
        },
      ],
    ]),

  'stim-star': () =>
    svg([
      [
        'path',
        {
          d: 'M50 6 L61 36 L94 37 L68 57 L77 89 L50 70 L23 89 L32 57 L6 37 L39 36 Z',
          fill: '#ffcf3e',
          stroke: '#c98a12',
          'stroke-width': '3',
          'stroke-linejoin': 'round',
        },
      ],
      ['circle', { cx: '42', cy: '47', r: '3.5', fill: '#7a5200' }],
      ['circle', { cx: '58', cy: '47', r: '3.5', fill: '#7a5200' }],
      [
        'path',
        {
          d: 'M42 58 Q50 65 58 58',
          fill: 'none',
          stroke: '#7a5200',
          'stroke-width': '3',
          'stroke-linecap': 'round',
        },
      ],
    ]),

  'stim-fish': () =>
    svg([
      [
        'ellipse',
        {
          cx: '45',
          cy: '50',
          rx: '30',
          ry: '19',
          fill: '#4aa8e0',
          stroke: '#1f6a9e',
          'stroke-width': '3',
        },
      ],
      [
        'path',
        {
          d: 'M70 50 L92 32 L88 50 L92 68 Z',
          fill: '#7ac143',
          stroke: '#4d8a22',
          'stroke-width': '3',
          'stroke-linejoin': 'round',
        },
      ],
      [
        'path',
        {
          d: 'M38 33 Q48 20 56 32 L48 38 Z',
          fill: '#7ac143',
          stroke: '#4d8a22',
          'stroke-width': '2.5',
          'stroke-linejoin': 'round',
        },
      ],
      ['circle', { cx: '28', cy: '46', r: '4', fill: '#12324d' }],
      [
        'path',
        {
          d: 'M20 56 Q24 60 28 56',
          fill: 'none',
          stroke: '#12324d',
          'stroke-width': '2.5',
          'stroke-linecap': 'round',
        },
      ],
      [
        'path',
        {
          d: 'M46 44 Q52 50 46 58 M56 42 Q62 50 56 58',
          fill: 'none',
          stroke: '#2b83bd',
          'stroke-width': '2.5',
          'stroke-linecap': 'round',
        },
      ],
      [
        'circle',
        { cx: '12', cy: '30', r: '3', fill: 'none', stroke: '#9ec9e8', 'stroke-width': '2' },
      ],
      [
        'circle',
        { cx: '8', cy: '20', r: '2', fill: 'none', stroke: '#9ec9e8', 'stroke-width': '2' },
      ],
    ]),

  'stim-sun': () =>
    svg([
      [
        'path',
        {
          d: 'M50 4 L50 16 M50 84 L50 96 M4 50 L16 50 M84 50 L96 50 M17 17 L26 26 M74 74 L83 83 M83 17 L74 26 M26 74 L17 83',
          stroke: '#f0a02f',
          'stroke-width': '5',
          'stroke-linecap': 'round',
          fill: 'none',
        },
      ],
      [
        'circle',
        { cx: '50', cy: '50', r: '24', fill: '#ffcf3e', stroke: '#c98a12', 'stroke-width': '3' },
      ],
      ['circle', { cx: '42', cy: '46', r: '3', fill: '#7a5200' }],
      ['circle', { cx: '58', cy: '46', r: '3', fill: '#7a5200' }],
      [
        'path',
        {
          d: 'M41 57 Q50 64 59 57',
          fill: 'none',
          stroke: '#7a5200',
          'stroke-width': '3',
          'stroke-linecap': 'round',
        },
      ],
    ]),

  'stim-duck': () =>
    svg([
      [
        'ellipse',
        {
          cx: '46',
          cy: '62',
          rx: '28',
          ry: '18',
          fill: '#ffcf3e',
          stroke: '#c98a12',
          'stroke-width': '3',
        },
      ],
      [
        'circle',
        { cx: '66', cy: '36', r: '15', fill: '#ffcf3e', stroke: '#c98a12', 'stroke-width': '3' },
      ],
      [
        'path',
        {
          d: 'M80 34 L95 38 L80 43 Z',
          fill: '#f0a02f',
          stroke: '#b3701a',
          'stroke-width': '2.5',
          'stroke-linejoin': 'round',
        },
      ],
      ['circle', { cx: '68', cy: '31', r: '3.5', fill: '#5a3d00' }],
      [
        'path',
        {
          d: 'M34 56 Q22 60 26 70 Q38 70 40 60 Z',
          fill: '#f0c95e',
          stroke: '#c98a12',
          'stroke-width': '2.5',
        },
      ],
      [
        'path',
        {
          d: 'M18 84 Q46 92 74 84',
          fill: 'none',
          stroke: '#4aa8e0',
          'stroke-width': '3',
          'stroke-linecap': 'round',
        },
      ],
    ]),

  'stim-balloons': () =>
    svg([
      [
        'ellipse',
        {
          cx: '32',
          cy: '32',
          rx: '17',
          ry: '20',
          fill: '#7ac143',
          stroke: '#4d8a22',
          'stroke-width': '3',
        },
      ],
      [
        'ellipse',
        {
          cx: '68',
          cy: '28',
          rx: '16',
          ry: '19',
          fill: '#e63a5f',
          stroke: '#a51e3e',
          'stroke-width': '3',
        },
      ],
      [
        'ellipse',
        {
          cx: '50',
          cy: '52',
          rx: '17',
          ry: '20',
          fill: '#4aa8e0',
          stroke: '#1f6a9e',
          'stroke-width': '3',
        },
      ],
      ['ellipse', { cx: '26', cy: '26', rx: '4.5', ry: '6', fill: '#fff', opacity: '.7' }],
      ['ellipse', { cx: '62', cy: '22', rx: '4', ry: '5.5', fill: '#fff', opacity: '.7' }],
      ['ellipse', { cx: '44', cy: '46', rx: '4.5', ry: '6', fill: '#fff', opacity: '.7' }],
      [
        'path',
        {
          d: 'M32 52 C30 68 44 70 46 88 M68 47 C70 66 52 70 50 88 M50 72 L48 88',
          fill: 'none',
          stroke: '#666e75',
          'stroke-width': '2',
        },
      ],
      [
        'path',
        {
          d: 'M48 86 L38 80 L42 90 L36 96 L48 92 L60 96 L54 90 L58 80 Z',
          fill: '#e63a5f',
          stroke: '#a51e3e',
          'stroke-width': '2',
          'stroke-linejoin': 'round',
        },
      ],
    ]),

  'stim-flower': () =>
    svg([
      [
        'ellipse',
        {
          cx: '50',
          cy: '22',
          rx: '11',
          ry: '14',
          fill: '#b06ad4',
          stroke: '#7b2d8e',
          'stroke-width': '2.5',
        },
      ],
      [
        'ellipse',
        {
          cx: '76',
          cy: '41',
          rx: '11',
          ry: '14',
          transform: 'rotate(72 76 41)',
          fill: '#b06ad4',
          stroke: '#7b2d8e',
          'stroke-width': '2.5',
        },
      ],
      [
        'ellipse',
        {
          cx: '66',
          cy: '71',
          rx: '11',
          ry: '14',
          transform: 'rotate(144 66 71)',
          fill: '#b06ad4',
          stroke: '#7b2d8e',
          'stroke-width': '2.5',
        },
      ],
      [
        'ellipse',
        {
          cx: '34',
          cy: '71',
          rx: '11',
          ry: '14',
          transform: 'rotate(216 34 71)',
          fill: '#b06ad4',
          stroke: '#7b2d8e',
          'stroke-width': '2.5',
        },
      ],
      [
        'ellipse',
        {
          cx: '24',
          cy: '41',
          rx: '11',
          ry: '14',
          transform: 'rotate(288 24 41)',
          fill: '#b06ad4',
          stroke: '#7b2d8e',
          'stroke-width': '2.5',
        },
      ],
      [
        'circle',
        { cx: '50', cy: '47', r: '13', fill: '#ffcf3e', stroke: '#c98a12', 'stroke-width': '3' },
      ],
      [
        'path',
        {
          d: 'M50 60 L50 92',
          stroke: '#4d8a22',
          'stroke-width': '4',
          'stroke-linecap': 'round',
          fill: 'none',
        },
      ],
      [
        'path',
        {
          d: 'M50 78 Q38 74 34 64 Q46 66 50 74 Z',
          fill: '#7ac143',
          stroke: '#4d8a22',
          'stroke-width': '2',
        },
      ],
    ]),

  'stim-ball': () =>
    svg([
      [
        'circle',
        { cx: '50', cy: '50', r: '38', fill: '#ffcf3e', stroke: '#2b3440', 'stroke-width': '3' },
      ],
      ['path', { d: 'M50 12 A38 38 0 0 1 50 88 A58 58 0 0 0 50 12Z', fill: '#e63a5f' }],
      ['path', { d: 'M50 12 A38 38 0 0 0 50 88 A58 58 0 0 1 50 12Z', fill: '#4aa8e0' }],
      [
        'path',
        {
          d: 'M50 12 A58 58 0 0 1 50 88 M50 12 A58 58 0 0 0 50 88',
          fill: 'none',
          stroke: '#2b3440',
          'stroke-width': '2.5',
        },
      ],
      [
        'circle',
        { cx: '50', cy: '50', r: '38', fill: 'none', stroke: '#2b3440', 'stroke-width': '3' },
      ],
      ['ellipse', { cx: '36', cy: '30', rx: '6', ry: '9', fill: '#fff', opacity: '.5' }],
    ]),

  'stim-butterfly': () =>
    svg([
      [
        'path',
        {
          d: 'M47 50 C30 28 10 24 8 40 C6 54 28 60 47 55Z',
          fill: '#4aa8e0',
          stroke: '#1f6a9e',
          'stroke-width': '2.5',
        },
      ],
      [
        'path',
        {
          d: 'M53 50 C70 28 90 24 92 40 C94 54 72 60 53 55Z',
          fill: '#4aa8e0',
          stroke: '#1f6a9e',
          'stroke-width': '2.5',
        },
      ],
      [
        'path',
        {
          d: 'M47 55 C32 62 20 78 32 84 C42 88 48 70 49 58Z',
          fill: '#7ac143',
          stroke: '#4d8a22',
          'stroke-width': '2.5',
        },
      ],
      [
        'path',
        {
          d: 'M53 55 C68 62 80 78 68 84 C58 88 52 70 51 58Z',
          fill: '#7ac143',
          stroke: '#4d8a22',
          'stroke-width': '2.5',
        },
      ],
      [
        'ellipse',
        {
          cx: '50',
          cy: '55',
          rx: '5',
          ry: '18',
          fill: '#5a4632',
          stroke: '#3c2e20',
          'stroke-width': '2',
        },
      ],
      [
        'circle',
        { cx: '50', cy: '34', r: '7', fill: '#5a4632', stroke: '#3c2e20', 'stroke-width': '2' },
      ],
      [
        'path',
        {
          d: 'M46 28 Q40 18 34 16 M54 28 Q60 18 66 16',
          fill: 'none',
          stroke: '#3c2e20',
          'stroke-width': '2.5',
          'stroke-linecap': 'round',
        },
      ],
      ['circle', { cx: '34', cy: '16', r: '2.5', fill: '#3c2e20' }],
      ['circle', { cx: '66', cy: '16', r: '2.5', fill: '#3c2e20' }],
    ]),

  'stim-boat': () =>
    svg([
      [
        'path',
        {
          d: 'M50 10 L50 62',
          stroke: '#5a4632',
          'stroke-width': '3.5',
          'stroke-linecap': 'round',
          fill: 'none',
        },
      ],
      [
        'path',
        {
          d: 'M50 12 L86 58 L50 58 Z',
          fill: '#e63a5f',
          stroke: '#a51e3e',
          'stroke-width': '2.5',
          'stroke-linejoin': 'round',
        },
      ],
      [
        'path',
        {
          d: 'M46 20 L46 58 L16 58 Z',
          fill: '#fff',
          stroke: '#1f6a9e',
          'stroke-width': '2.5',
          'stroke-linejoin': 'round',
        },
      ],
      [
        'path',
        {
          d: 'M12 64 L88 64 L76 82 L24 82 Z',
          fill: '#4aa8e0',
          stroke: '#1f6a9e',
          'stroke-width': '3',
          'stroke-linejoin': 'round',
        },
      ],
      [
        'path',
        {
          d: 'M6 92 Q18 86 30 92 T54 92 T78 92 T96 90',
          fill: 'none',
          stroke: '#9ec9e8',
          'stroke-width': '3',
          'stroke-linecap': 'round',
        },
      ],
    ]),
};

/** The drawing for a deck entry id (null if unknown). */
export function stimArt(id) {
  const make = DRAWINGS[id];
  return make ? make() : null;
}
