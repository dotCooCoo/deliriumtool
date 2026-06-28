# Contributing

Thanks for helping improve a tool clinicians rely on. Issues and pull requests are welcome.

## Ground rules

- **Clinical changes must cite a primary source and add a test.** Any change to a
  score, threshold, dose, criterion, or recommendation needs a citation
  (DOI/PubMed), a golden-value test, and a matching update to
  `docs/CLINICAL_METHODOLOGY.md`.
- **No PHI, ever.** Don't put patient data in issues, screenshots, test fixtures, or commits.
- **Keep it client-side.** No analytics, no third-party runtime requests, no server
  dependency for core function.
- **Accessibility is part of "done".** Keyboard-operable, real labels, WCAG 2.1 AA contrast.

## Develop locally

```sh
npm install
npm run dev       # Wrangler dev server
npm run build     # produce dist/
npm test          # data-accuracy unit tests + Playwright (functional, a11y, visual)
```

## Pull requests

- Branch from `main` and open a PR. A Cloudflare preview deploy is built for each PR —
  use it to check your change.
- Keep PRs focused; describe what changed and the clinical or UX reason.
- Make sure `npm test` passes. For clinical content, include the source.

## Reporting

- Bugs and feature ideas: open an issue.
- Clinical corrections: use the "Clinical correction" issue template (include a citation).
- Security or anything sensitive: see [SECURITY.md](SECURITY.md) — report it privately.
