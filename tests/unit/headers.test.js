// The strict Content-Security-Policy is a security control, not a nicety — this
// test fails the build if it ever regresses (inline scripts, eval, or an
// external origin sneaking in).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const headers = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../src/_headers'),
  'utf8',
);
const csp = (headers.match(/Content-Security-Policy:.*/) || [''])[0];

test('CSP is present and strict', () => {
  assert.ok(csp.includes("default-src 'self'"), "default-src 'self'");
  assert.ok(csp.includes("script-src 'self'"), "script-src 'self'");
  assert.ok(csp.includes("object-src 'none'"), "object-src 'none'");
  assert.ok(csp.includes("frame-ancestors 'none'"), "frame-ancestors 'none'");
  assert.ok(!/unsafe-inline/.test(csp), 'no unsafe-inline');
  assert.ok(!/unsafe-eval/.test(csp), 'no unsafe-eval');
  assert.ok(!/https?:\/\//.test(csp), 'no external origins allowed in CSP');
});

test('hardening headers are present', () => {
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/);
  assert.match(headers, /Referrer-Policy:\s*no-referrer/);
  assert.match(headers, /Strict-Transport-Security:/);
  assert.match(headers, /Permissions-Policy:/);
});
