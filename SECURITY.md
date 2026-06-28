# Security policy

## Reporting

Please report security issues **privately** through a
[private security advisory](../../security/advisories/new) on this repository
(the **Security** tab → "Report a vulnerability"). Don't open a public issue for a
security problem.

Include what you found, how to reproduce it, and the impact. This is a small,
volunteer-maintained project, so please allow a little time for a response.

## Scope

In scope:

- Cross-site scripting / DOM injection, or any way to run untrusted script in the page.
- Any way to exfiltrate data a user has entered. The tool is designed so this is
  impossible (all client-side, no network egress) — a report that breaks that
  assumption is especially valuable.
- Vulnerabilities in third-party code that ships to the browser.
- Weaknesses in the deploy configuration (CSP, security headers).
- **Clinical correctness** — a wrong threshold, dose, score, or citation. These are
  treated as security-class issues; please include the primary source. If it isn't
  sensitive, you may instead file a "clinical correction" issue.

## Data handling

- All computation runs client-side. The tool transmits nothing and stores nothing
  on a server.
- No patient identifier is collected; no analytics or third-party requests run at runtime.
- Anything entered stays in the browser unless the user exports or shares it.
  Shareable links carry only de-identified content in the URL fragment and are
  never sent to or stored on a server.

## Supported versions

This is a continuously deployed static site; the supported version is whatever is
live. There are no long-term-support branches.
