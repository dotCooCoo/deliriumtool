# Contributing

Thanks for helping improve a tool clinicians rely on. Issues and pull requests are welcome.

## Ground rules

- **Clinical changes must cite a primary source and add a test.** Any change to a
  score, threshold, dose, criterion, or recommendation — in the adult tool, the
  pediatric tool (`/peds/`), or the template designer (`/templates/`) — needs a
  citation (DOI/PubMed), a golden-value test, a matching update to
  `docs/CLINICAL_METHODOLOGY.md`, and a row in that document's change log (§6.5).
  Never change a clinical number without changing its citation together with it.
- **Print surfaces must match the screen.** The PDFs and template sheets are the
  artifacts that travel; a caution or correction that lands on screen must land on
  every surface that prints the same content.
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
npm run icons     # regenerate the icon sprites from Font Awesome
```

### Icons

Icons are an inline SVG sprite in each page (no runtime request, CSP-safe). The sprites
are **generated**, not hand-edited, from the vendored `@fortawesome/fontawesome-free`
package: add or remove a Font Awesome name in the per-page icon list in
`scripts/gen-sprite.mjs`, run `npm run icons`, and reference it as `#fa-<name>`.

## Pull requests

- Branch from `main` and open a PR. A Cloudflare preview deploy is built for each PR —
  use it to check your change.
- Keep PRs focused; describe what changed and the clinical or UX reason.
- Make sure `npm test` passes. For clinical content, include the source.

## Reporting

- Bugs and feature ideas: open an issue.
- Clinical corrections: use the "Clinical correction" issue template (include a citation).
- Security or anything sensitive: see [SECURITY.md](SECURITY.md) — report it privately.
