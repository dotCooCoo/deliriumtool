# Tests

Two layers, plus on-demand visual checks. The goal is that a wrong clinical number
cannot ship.

## Unit — data accuracy (`tests/unit/`, Node's built-in `node:test`)

- `scoring.test.js` — golden-value tests for the clinical computations: the
  risk-factor tally band boundaries, the CAM-ICU positive/negative/unable logic and
  its RASS arousal gate, the inattention cut-point, RASS zones/tones, and the
  checklist completion math.
- `data-integrity.test.js` — invariants on the static data: 11 medication
  categories / 104 agents with unique ids and required fields, and every citation
  carrying a label, citation text, and an http(s) URL.
- `headers.test.js` — `src/_headers` keeps a strict CSP (`script-src 'self'`,
  `object-src 'none'`, no inline, no external origins) and the expected hardening
  headers.

Run: `npm run test:unit`

## End-to-end (`tests/e2e/`, Playwright, desktop + mobile)

- `functional.spec.js` — the real flows: pathway picker → workspace, live risk
  tiering, CAM-ICU evaluating positive and gating to "unable" at RASS −4/−5,
  autosave surviving a reload, reset returning to the picker, and PDF download.
- `accessibility.spec.js` — `@axe-core/playwright` scan of the picker and every tab
  with no serious or critical violations, plus arrow-key navigation of the tab bar.

Run: `npm run test:e2e` (builds and serves `dist/` automatically). This is the gate
that also runs in CI.

## Visual (`tests/e2e/visual.spec.js`, tagged `@visual`)

Screenshot regression of the picker and key tabs. Baselines are platform-specific,
so they are generated locally and are not committed or part of the CI gate.

- `npm run test:visual:update` — (re)generate the baselines, after an intentional UI
  change.
- `npm run test:visual` — compare against the baselines.
