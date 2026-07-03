# deliriumtool.com

Bedside reference for ICU delirium — screening, prevention, and management at the point of care.

> **Reference aid only.** This tool supports — it does not replace — clinical
> judgment, local protocol, and prescriber/pharmacy review. It is not a validated
> decision-support device, a diagnostic instrument, or an order set. Verify every
> recommendation against the cited primary sources and your institution's policy.
> Provided "as is", without warranty.

## The four tools

**Adult ICU tool** ([deliriumtool.com](https://deliriumtool.com/)) — the main
bedside reference:

- **Risk factors** — a predisposing + precipitating checklist. The tally is a
  non-validated heuristic and points you to the validated PRE-DELIRIC /
  E-PRE-DELIRIC models.
- **CAM-ICU + RASS** — the two-step CAM-ICU flow (document the RASS, then the four
  features; Feature 3 derives from the documented RASS per the Vanderbilt
  worksheet) with motor-subtype classification.
- **ABCDEF bundle** — the ICU Liberation prevention bundle as a working checklist.
- **DELIRIUM(S)** — a causative-factor review mnemonic.
- **Treatment** — the CAM-positive algorithm: treat causes → intensify
  non-pharmacologic measures → pharmacologic safety options.
- **Medications** — pharmacologic options with cautions, plus a
  deliriogenic-medication review with per-agent toggles.
- **Documents** — print-ready PDFs generated entirely in the browser.

**Pediatric ICU tool** ([deliriumtool.com/peds](https://deliriumtool.com/peds/)) —
CAPD, pCAM-ICU, and psCAM-ICU screening with age-banded developmental anchors and
an SBS/RASS arousal gate, the pediatric prevention bundle, weight-based dosing
references, and an in-browser summary report. Same privacy model.

**ED screening tool**
([deliriumtool.com/ed](https://deliriumtool.com/ed/)) — delirium screening for
older emergency-department patients: the two-step **DTS → bCAM** pathway, the
**bCAM directly** for high-risk screening, and the **4AT** — with the
validated scripts and thresholds, an unable-to-assess gate, guideline-backed
next steps, and a de-identified print/PDF summary. Same privacy model.

**Bedside template designer**
([deliriumtool.com/templates](https://deliriumtool.com/templates/)) — customize
and print laminate-ready reference sheets: a per-patient **ICU Delirium Rounding
Tool** (landscape, marked with a dry-erase pen), a unit-level **SPA Quick
Reference** poster, a **Peds Delirium Card Set** (arousal gate, screen routing,
CAPD, ps/pCAM-ICU, action cards, and attention picture cards for the bedside
ring), a **PICU Delirium Workflow** poster with the 10-second rounds
script, an **ED Delirium Card Set** (RASS gate, DTS → bCAM flowsheets, the 4AT,
and an act-on-a-positive card), and an **ED Delirium Workflow** poster with the
disposition hand-off script. Pick which sections, lines, and deliriogenic medications
print, reword any line, add your unit's own lines and sections, set the sedation
target, and choose the print size and font — then print at 100% on Letter paper or
save the generated PDF. Every medication prints with its own check-off
square at any selection size; names are generic-only by default (brand names are
an opt-in). The configuration autosaves locally and can be shared as a link or
JSON file — it carries protocol settings only, never patient data.

## Privacy

Everything runs in your browser. The tool captures no patient identifier, sends
nothing to a server, makes no third-party network requests, and includes no
analytics. Anything you type stays on your device unless you choose to export or
share it. Shareable links carry only de-identified content and are never stored
server-side. **Do not enter PHI** into fields you intend to share.

## Run it locally

```sh
npm install
npm run dev      # builds, then serves with Wrangler at the printed localhost URL
```

After `npm run build`, the contents of `dist/` are a self-contained static site —
you can also open `dist/index.html` directly; it works offline.

### Pre-configuring protocol settings (`settings.json`)

A self-hosted copy can ship a default protocol configuration. When served over
http(s), the app reads a `settings.json` placed next to the page (e.g.
`https://your-host/settings.json`) and applies it to the Setup tab — screening
tool, RASS target, review cadence, and the governance fields. Generate one from
**Setup → Save settings** (it downloads `settings.json`), then drop it beside
`index.html`.

- These are **unit/protocol settings only — never patient data.** Values are
  validated on load: unknown keys are ignored, lengths are bounded, and dropdowns
  are constrained to their allowed options.
- To use a different filename, add a same-origin
  `<meta name="settings-src" content="my-unit.json">` to `index.html`.

## Tests

```sh
npm test         # data-accuracy unit tests + Playwright (functional, a11y, visual)
npm run test:unit
npm run test:e2e
```

The unit suite pins every clinical cut-point, band, and dose string to its cited
value (a wrong threshold is treated as a patient-safety bug); the Playwright suite
covers keyboard operation, screen-reader semantics, print/PDF output, and visual
regressions for all three tools.

## Deploy (Cloudflare)

A static site served by Cloudflare Workers (Static Assets), via Wrangler.

```sh
npm run deploy   # or connect the repository for push-to-main deploys
```

## Clinical basis

Every instrument, threshold, score band, and dose — and the primary source it maps
to — is documented in
[docs/CLINICAL_METHODOLOGY.md](docs/CLINICAL_METHODOLOGY.md), with the source
archive indexed in [references/INDEX.md](references/INDEX.md). The methodology
document also records the governance model (clinical content ownership, review
cadence, change log, and instrument-deviation register). Corrections backed by a
primary source are very welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License & attribution

This repository's own code and documentation are released under the
[MIT License](LICENSE) (© 2026 dotCooCoo) — free to use, modify, and distribute,
provided the copyright and licence notice are retained. The clinical instruments
it references (CAM-ICU, RASS, ICDSC, CAPD, pCAM-ICU, psCAM-ICU, SBS, the
ABCDEF/ICU Liberation bundle, PRE-DELIRIC, and others) are the work and copyright
of their respective authors and are used as cited; see
[docs/CLINICAL_METHODOLOGY.md](docs/CLINICAL_METHODOLOGY.md). The MIT "as is, no
warranty" terms are separate from — and do not replace — the clinical disclaimer
that this is a reference aid only, not a validated decision-support device.

## Contributing & security

- [CONTRIBUTING.md](CONTRIBUTING.md) — how to propose changes (clinical changes
  must cite a source and add a test).
- [SECURITY.md](SECURITY.md) — report a vulnerability or a clinical-correctness
  issue privately.
- [Code of Conduct](CODE_OF_CONDUCT.md).
