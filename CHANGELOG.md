# Changelog

Notable changes to this project, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed — clinical accuracy

Corrections from a source-verification review of every clinical value against its
cited primary literature. Each change is recorded with its source in
`docs/CLINICAL_METHODOLOGY.md` (§6.5, revision 2026-07-01).

- **CAM-ICU Feature 3 now uses the current worksheet criterion**: positive if the
  actual RASS is anything other than 0 (alert and calm), with a live hint derived
  from the RASS documented in the same panel. The previous options (Alert vs
  Vigilant/Lethargic/Stuporous) were the superseded descriptor wording and could
  under-call Feature 3 for restless or drowsy patients.
- **CAM-ICU is enforced as a two-step assessment**: no verdict is shown until a
  RASS is documented, so a skipped RASS can no longer bypass the −4/−5
  "unable to assess" gate.
- CAM-ICU Feature 1 asks about fluctuation **in the past 24 hours** (the
  worksheet's window), not "during the day"; the Feature 4 command mirrors the
  worksheet (do not repeat the number of fingers; "add one more finger" only when
  the patient cannot move both arms).
- **psCAM-ICU Feature 2 gains the instrument's second positivity path** — eye
  contact on 8+ presentations but unable to maintain sustained eye opening despite
  verbal prompts — so a delirious child who keeps eye contact but cannot stay
  awake is no longer scored a false negative. pCAM-ICU task text now includes the
  validated memory-pictures alternative and alternate question set.
- The pediatric arousal-gate instruction now matches the validated gate: SBS −2
  **and** −3 are comatose (screen at SBS ≥ −1); CAPD developmental anchors show
  the correct column for a child at a labeled anchor age, and the
  developmental-delay caveat states the cited ~51% specificity figure.
- **Melatonin content reflects PADIS 2025**: the focused update's conditional
  recommendation for melatonin (low certainty, no dose specified) is surfaced on
  the adult tool, PDFs, and templates; the 0.5–3 mg range is labelled conventional
  sleep dosing (the cited RCT used 4 mg), and ramelteon is noted as the
  guideline-named alternative.
- Dexmedetomidine guidance attributes each indication to its guideline (weaning →
  PADIS 2018; light sedation / delirium-reduction priority over propofol → PADIS
  2025), cites the label for the 0.2–0.7 mcg/kg/hr maintenance range, and carries
  the A2B RCT caveat (no extubation benefit vs propofol; more agitation and
  bradycardia).
- The printed SPA reference is scoped to adult ICUs, prints no uncited
  acetaminophen regimen (dose defers to the local order set), carries the
  haloperidol IV off-label caution on every surface, states the hyperactive
  subtype share as "~23% of delirious cases", and uses the same 5-step mobility
  progression as the interactive tool.
- Citation corrections: the pediatric ICU Liberation collaborative is Lin JC et
  al. (previously mis-attributed to Ista E); the PICU Up! trial is Kudchadkar's
  (previously mis-attributed to Choong K); Madden's prescribing study carries its
  assigned issue (J Pediatr Intensive Care 2024;13:46–54, online 2021); eCASH is
  cited to Vincent 2016; the renal-accumulation cautions are split between Beers
  2023 and a source that actually carries the opioid-metabolite claim; the
  "bolus over continuous" item is labelled an observational association with its
  citation; glycopyrrolate no longer carries a higher-risk flag (absent from both
  cited anchors).
- New registry sources: Capino 2020 and Phan & Nahata 2008 (pediatric weight-based
  doses now cited inline), Bruni 2015 (pediatric melatonin sleep dosing), the
  Precedex label, A2B 2025, the AGS 2025 Beers Alternatives companion, Vincent
  2016, Kollef 1998, and Dean 2004.

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
  with an opt-in for brand names; the default selection mirrors the interactive
  tool's documented default classes (benzodiazepines, opioids, anticholinergics)
  with the rest of the catalog opt-in via per-category and select-all/none
  controls. The medication list prints as a mosaic of colour cards by default —
  one check-off square per medication, with the font size and column count
  adapting to the selection, the pharmacology guidance card pinned top-left,
  and a classic category-rows view as an alternative. One colour block per
  category, warning markers on the key pharmacology cautions, and icons aid
  bedside scanning. Output as browser print or a generated two-page PDF. Sheet
  content mirrors the interactive tool's cited clinical content;
  configurations autosave locally and share as a link or JSON (protocol settings
  only, never patient data).
- The main page links to the template designer alongside the pediatric tool, so
  laminated bedside sheets are discoverable from the landing screen.
- The saved template PDF is a fillable form: every check square and RASS circle
  is an interactive checkbox, and the patient header, "Action" lines, notes
  line, and write-in sedation target are text fields — so the sheet works both
  printed-and-laminated and on-screen.
- The RASS panel carries a check circle per row for marking the current level,
  and the sedation-target selector offers "No unit target — write in at the
  bedside", which prints a blank target line instead of a fixed band.
- Optional "Date created" and "Revision" fields print in the sheet footer and
  become part of the saved PDF's filename, so units can track template versions.
- The designer sidebar is grouped by task: template, unit, sections, medications
  (with their display options), and print appearance.
