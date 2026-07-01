# Changelog

Notable changes to this project, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- ICU delirium bedside reference: risk factors, CAM-ICU + RASS with motor subtype,
  the ABCDEF prevention bundle, the DELIRIUM(S) mnemonic, a CAM-positive treatment
  algorithm, a medication review, and in-browser PDF generation.
- Pathway-first flow: choose the document to build up front (rounding tool,
  assessment record, or quick reference), with a reset to start over.
- Pediatric ICU tool at `/peds/`: CAPD, pCAM-ICU, and psCAM-ICU screening with
  age-banded developmental anchors, the pediatric prevention bundle, weight-based
  dosing, and an in-browser summary report.
- Bedside template designer at `/templates/`: customize and print laminate-ready
  reference sheets — a per-patient ICU Delirium Rounding Tool (landscape,
  dry-erase) and a unit-level SPA Quick Reference poster. Sections, single lines,
  and the deliriogenic-medication list are individually selectable; any line can
  be reworded and units can add their own lines and whole sections. Large print
  text is the default and every combination — including all 103 medications
  enabled — fits its two pages; a print-font choice (clean sans, Arial, Georgia)
  is verified to fit throughout. Medication names print generic-only by default
  with an opt-in for brand names; colour-coded sections, category blocks, and
  icons aid bedside scanning. Output as browser print or a generated two-page
  PDF. Sheet content mirrors the interactive tool's cited clinical content;
  configurations autosave locally and share as a link or JSON (protocol settings
  only, never patient data).
