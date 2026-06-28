// Flat ESLint config. Browser globals for the app (src/), Node globals for build
// scripts and tests. Prettier owns formatting, so eslint-config-prettier is
// applied last to switch off any stylistic rules that would conflict.
import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'dist/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
      'coverage/',
      'scratch/',
      '.wrangler/',
      '.playwright-mcp/',
    ],
  },
  js.configs.recommended,
  {
    // Browser application code.
    files: ['src/**/*.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.browser } },
  },
  {
    // The PDF generator is an extracted, self-contained module that keeps the
    // original's palette aliases verbatim; don't fail on intentionally-unused ones.
    files: ['src/js/pdf.js'],
    rules: { 'no-unused-vars': 'off', 'no-useless-assignment': 'off' },
  },
  {
    // Build scripts, tests, and config run under Node.
    files: ['scripts/**/*.mjs', 'tests/**/*.js', 'playwright.config.js', 'eslint.config.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: { ...globals.node } },
  },
  prettier,
];
