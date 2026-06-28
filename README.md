# deliriumtool.com

Bedside reference for ICU delirium — screening, prevention, and management at the point of care.

> **Reference aid only.** This tool supports — it does not replace — clinical
> judgment, local protocol, and prescriber/pharmacy review. It is not a validated
> decision-support device, a diagnostic instrument, or an order set. Verify every
> recommendation against the cited primary sources and your institution's policy.
> Provided "as is", without warranty.

## What it does

- **Risk factors** — a predisposing + precipitating checklist. The tally is a
  non-validated heuristic and points you to the validated PRE-DELIRIC /
  E-PRE-DELIRIC models.
- **CAM-ICU + RASS** — the four-feature CAM-ICU flow with RASS level and motor-subtype.
- **ABCDEF bundle** — the ICU Liberation prevention bundle as a working checklist.
- **DELIRIUM(S)** — a causative-factor review mnemonic.
- **Treatment** — the CAM-positive algorithm: treat causes → intensify non-pharm →
  pharmacologic safety options.
- **Medications** — pharmacologic options with cautions, plus a deliriogenic-medication review.
- **Documents** — print-ready PDFs generated entirely in the browser.

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

## Tests

```sh
npm test         # data-accuracy unit tests + Playwright (functional, a11y, visual)
npm run test:unit
npm run test:e2e
```

## Deploy (Cloudflare)

A static site served by Cloudflare Workers (Static Assets), via Wrangler.

```sh
npm run deploy   # or connect the repository for push-to-main deploys
```

## Clinical basis

Instruments, thresholds, and citations are documented in
[docs/CLINICAL_METHODOLOGY.md](docs/CLINICAL_METHODOLOGY.md), with a citation index
in [references/INDEX.md](references/INDEX.md). Corrections backed by a primary
source are very welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## License & attribution

This repository's own code and documentation are released under the
[MIT License](LICENSE) (© 2026 dotCooCoo) — free to use, modify, and distribute,
provided the copyright and licence notice are retained. The clinical instruments
it references (CAM-ICU, RASS, ICDSC, the ABCDEF/ICU Liberation bundle,
PRE-DELIRIC, and others) are the work and copyright of their respective authors
and are used as cited; see
[docs/CLINICAL_METHODOLOGY.md](docs/CLINICAL_METHODOLOGY.md). The MIT "as is, no
warranty" terms are separate from — and do not replace — the clinical disclaimer
that this is a reference aid only, not a validated decision-support device.

## Contributing & security

- [CONTRIBUTING.md](CONTRIBUTING.md) — how to propose changes (clinical changes
  must cite a source and add a test).
- [SECURITY.md](SECURITY.md) — report a vulnerability or a clinical-correctness
  issue privately.
- [Code of Conduct](CODE_OF_CONDUCT.md).
