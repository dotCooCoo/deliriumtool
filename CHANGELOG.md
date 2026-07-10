# Changelog

Notable changes to this project, following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Pediatric tool (`/peds/`): the pCAM-ICU inattention screen (Feature 2) now runs
  the validated memory-pictures attention task on screen, alongside the
  squeeze-on-A letters. Show the five memory pictures, then step through the ten
  recognition pictures marking **Seen / New** for each; errors are counted against
  the picture set as you go, and either task reaching three errors makes Feature 2
  positive. It uses the same picture set as the printed pediatric cards.
- Pediatric tool: a **Present to child** view for the picture task — tap any
  picture (or the button) to show it full-size in a modal you can turn toward the
  bed, stepping through the memory pictures and then the recognition pictures with
  Seen / New picked right there. Works on a phone in portrait and landscape, and is
  keyboard- and screen-reader-accessible.
- Pediatric report: when the picture task is used, the summary now lists each
  recognition picture, whether it was a memory or new picture, and the child's
  answer, with errors flagged and the total shown against the ≥ 3-error cut.
- Pediatric tool: a second worked example — **"pCAM-ICU example (school age)"** —
  loads a filled pCAM-ICU assessment that lands directly on the picture attention
  task, so it can be explored without hunting for the right age and screen. The
  example shortcuts now sit above the age field.

### Changed

- Assessments are now **session-only**: refreshing or reopening a tool starts a
  fresh assessment instead of restoring the previous one, and patient inputs are
  never written to browser storage — nothing lingers for the next user of a
  shared workstation. Use **Save** (JSON file) to hand off or keep an
  assessment; unit/protocol settings and template-designer configurations still
  persist locally. Any assessment snapshot stored by an earlier version is
  removed the first time the updated tool loads.
- Clearer wording for saving and loading a file: the buttons that were labelled
  "Export" / "Import" now read **Save** / **Load** across the ICU, pediatric, ED,
  and template tools.
- Pediatric tool: when more than one screen applies to a child, the header now
  shows an explicit **"Other screens: Switch to …"** control instead of a faint
  link, so the pCAM-ICU screen (and its picture attention task) is easy to reach.
- Pediatric tool: the chronological-age unit now defaults to **years** (was
  months), and a plain-language readback under the field echoes the entered age
  ("→ 7 years old" / "→ 7 months old — an infant") so a mis-set unit is caught
  before it routes a child to the wrong screen.

### Fixed

- ED bedside card set: the printed screening cards are now numbered by position
  (DTS = Step 1, bCAM = Step 2), matching the interactive ED tool, and renumber
  themselves if a card is hidden — previously they read "Step 1" then "Step 3".

### Removed

- Pediatric tool: the in-tool "Bedside cards" tab and the report's "Bedside cards
  used" list. The printable bedside cards remain available in the template
  designer (`/templates/`).

## [0.6.4] - 2026-07-03

### Fixed

- On the SPA Quick Reference, the escalation stages now renumber sequentially
  when a stage is hidden (all its items switched off), so the remaining stages
  read 1, 2, 3 with no gap. The nurse-care-pathway columns keep their fixed
  prevention-bundle step numbers.


## [0.6.3] - 2026-07-03

### Changed

- Printed reference sheets now list **every** source their content draws on: the
  footer source list is derived from the blocks each sheet renders, so a printed
  dose, prevalence figure, or scoring rule is always attributed (previously some
  block-level sources were dropped from the footer).
- Added foundational primary-source citations for values already in the tool
  (no clinical value changed): the original CAM (Inouye 1990) behind the
  four-feature algorithm every screen uses; the DSM-5-TR diagnostic standard
  behind the "screen, not a diagnosis" framing; the ICU-specific risk-factor
  review (Zaal 2015) and cardiac-surgery rule (Rudolph 2009); the deliriogenic-
  drug review (Clegg & Young 2011) and the benzodiazepine primary trial
  (Pandharipande 2006); the early-mobility RCT (Schweickert 2009); the pediatric
  RASS validation (Kerson 2016); and 3D-CAM (Marcantonio 2014) for the ward
  pathway. Wired several already-referenced sources (CAM-ICU training manual,
  Balas 2014, the pediatric PICU-liberation and delirium-algorithm papers) into
  the sections that rely on them.


## [0.6.2] - 2026-07-03

### Fixed

- The bedside-template designer now scales a page's type down to fit whenever
  its content would run past the footer — including cards whose content sits in
  a fixed-height panel, which the fit check previously couldn't see (so a dense
  card, such as the 4AT, could print under its own footer). Every template
  auto-scales to fit; the overflow warning appears only when a page cannot fit
  even at the smallest size.


## [0.6.1] - 2026-07-03

### Changed

- CAM-ICU Feature 3 (altered level of consciousness) is now read directly from
  the documented RASS instead of a separate dropdown, so it can never disagree
  with the RASS on record. A screen with an altered RASS reads positive without
  a redundant second entry.

### Fixed

- The "Full Rounding Tool" PDF no longer prints a blank page: the protocol &
  governance block flows onto a page with room instead of overflowing onto its
  own near-empty sheet.
- The not-found (404) page now renders with its styling under the strict
  content-security policy instead of unstyled.
- Printing the ED Delirium Card Set no longer overlaps the 4AT card's guidance
  with the page footer.
- The pediatric tool keeps keyboard focus while marking CAM-ICU inattention
  errors instead of dropping it after each mark.
- Editing a child's age to a materially different child now clears instrument
  answers that no longer apply, instead of showing a stale verdict.
- Switching the pediatric arousal scale (RASS <-> SBS) confirms before clearing
  an already-recorded level.
- The pediatric bedside cards re-fit to the window on resize for a freshly
  started assessment, not only a restored one.
- The template designer rejects an imported assessment JSON from another tool
  instead of silently overwriting the current template.
- Saving a template PDF reports a problem instead of failing silently.
- The adult risk note reads "max 15" to match the fifteen-factor checklist.

### Accessibility

- The pediatric age-unit selectors have accessible names.
- The pediatric "0 - alert and calm" arousal row meets AA contrast.
- Card and section titles are exposed as headings for screen-reader navigation.
- Tab panels are no longer redundant keyboard stops.


## [0.6.0] - 2026-07-03

### Changed

- The **ED Delirium Card Set** now prints as portrait pocket cards, matching
  the format of the real DTS/bCAM/4AT instruments, and combines the arousal
  ladder and the DTS onto one "Step 1 · DTS" card — a tighter five-card set
  (pathways · Step 1 DTS · bCAM · 4AT · act) instead of six landscape cards.
  The ED workflow poster stays landscape.


## [0.5.2] - 2026-07-03

### Fixed

- The site footer (the "Source on GitHub" badge and cross-tool links) no
  longer appears when printing a page to PDF.
- The ED summary's corner mark is now a magnifier icon instead of the letters
  "ED", so the header no longer reads "ED" twice next to the title.


## [0.5.1] - 2026-07-03

### Fixed

- Pediatric CAM screens (pCAM-ICU / psCAM-ICU) now read as negative as soon as
  Feature 1 (acute change or fluctuating course) is marked absent, without
  waiting for the inattention feature — absence of a required feature is already
  a negative screen.


## [0.5.0] - 2026-07-03

### Added

- **Bedside cards in the pediatric tool.** The pediatric tool now renders the
  actual laminated bedside cards on a new "Bedside cards" tab — the arousal
  gate card, the screen you're using (CAPD / pCAM-ICU / psCAM-ICU), and the
  act-on-a-positive card when a screen is positive — with your recorded values
  highlighted on them (the arousal row, the gate taken, and a per-card result
  ribbon). They're the same cards you can print from the template designer, and
  tapping one jumps back to Screening. The generated report gains a "Bedside
  cards used" section naming each card and its outcome.


## [0.4.0] - 2026-07-03

### Added

- **ED templates in the bedside designer** — an **ED Delirium Card Set**
  (landscape cards: a RASS gate card, the DTS triage-rule-out flowsheet, the
  bCAM confirmatory stepper, the 4AT single-step card, and an act-on-a-positive
  card) and an **ED Delirium Workflow** poster (screen → gate → confirm → act,
  with the disposition hand-off script). Card content is imported from the ED
  tool's data modules, so the printed cards and the interactive tool can't
  disagree; validated scripts, thresholds, and the RASS anchors are locked, and
  the bCAM Feature-4 question set is selectable. Prints or saves as a PDF like
  the other templates.

## [0.3.0] - 2026-07-03

### Added

- **ED Delirium Screening tool** at `/ed/` — emergency-department screening
  for older adults with three guideline-backed pathways: the two-step
  **DTS → bCAM** (a <20-second, 98%-sensitive triage rule-out, then the
  highly specific bCAM with the validated scripts, question sets, and the
  inattention cardinal rule), the **bCAM directly** for high-risk screening
  (ACEP ED-DEL option), and the **4AT** (the form's verbatim items and
  0 / 1–3 / ≥4 score bands). The attention tasks are tap-to-count flowsheets;
  the RASS rows carry the ED-adapted behavioral anchors from the instrument
  worksheets; RASS −4/−5 gates as unable to assess, and stale answers are
  cleared when a gate closes. Around the screens: checkable
  act-on-a-positive guidance (ADEPT / ED-DEL), unit setup with a default
  pathway, example data, and a designed summary document (assessor, editable
  time, verdict) that prints or saves as a PDF, plus JSON export/import with
  strict validation. Every instrument card cites its sources inline and the
  Sources list renders from the citation registry; scoring and sanitizers
  pass strict validation.

## [0.2.0] - 2026-07-02

### Added

- The picture-cards instructions card keys both sets visually — labeled
  miniatures of the five memory-set and five other-set pictures, drawn in
  whichever art style is selected — and the kawaii set is now the default.

- On wide screens the designer's preview and options columns scroll
  independently — scrolling the print preview no longer moves the
  customization sidebar, and vice versa.

- Peds card set options: the attention picture cards can print **one picture
  per page** (hold the page itself up to the child) or 4-up with cut guides,
  and in two art styles — **Set A (classic)** or **Set B (kawaii)**. The card
  set prints landscape (the bedside ring-deck format), and the CAPD card's
  per-item score blanks and total line now sit as proper write-on underlines.

- A "Sheet design" dropdown for the adult templates: **Design A — classic**
  (the current look) or **Design B — modern** — white cards with accent
  borders and sentence-case tone headings in place of tinted fills and caps
  bars, matching the pediatric card system. The choice prints, saves to the
  PDF, and shares with the rest of the unit configuration.

- Pediatric bedside templates in the designer: a **Peds Delirium Card Set**
  (arousal gate card with RASS or SBS, screen-routing card, CAPD card,
  psCAM-ICU and pCAM-ICU cards, act-on-a-positive and prevention-bundle
  cards, plus attention picture cards with cut guides — original colorful
  artwork) and a **PICU Delirium Workflow** poster (screen → gate → score →
  act, with the 10-second rounds script). Card content imports directly from
  the pediatric tool's data modules, so the printed cards and the interactive
  tool cannot disagree; validated-instrument text is not editable.

### Changed

- The "Print appearance" controls (sheet design, text size, font) sit above
  the Sections panel in the designer sidebar.

- "Save PDF" now captures the sheet itself: the PDF embeds a print-resolution
  image of the exact on-screen sheet (identical to the browser print output —
  fonts, icons, spacing and auto-scaling included) with the interactive
  checkboxes, RASS radio group, and write-in text fields overlaid at their
  rendered positions. Sheet and PDF can no longer differ.
- The "Date created" field auto-fills with today's date when the designer
  loads (still optional — clear it and the footer and filename omit it), and
  the saved filename uses readable segments, e.g.
  `icu-delirium-rounding-tool_Rev-B_2026-07-02.pdf`.


- The saved template PDF now mirrors the on-screen sheet: leftover page space
  becomes padding between the check rows and slightly larger medication type
  (exactly like the live preview), card rows share equal heights, the
  DELIRIUM(S) cells use the sheet's white-card style with the colored letter
  and bottom-aligned Action blanks, target RASS rows carry the same green
  "TARGET" check marks, and long headings wrap instead of clipping.

### Fixed

- On the adult tool the Accessibility options sit centered above the
  "Auto-fill example data" button, beside the facility field.
- The adult tool's header lays out as one row again — the title block
  shrinks (its subtitle wraps) so the facility field, example-data button,
  and Accessibility options keep their place on the right; on narrow
  screens the controls wrap together as one right-aligned cluster.
- The Accessibility options button sits with the header controls on every
  page instead of wrapping onto a line of its own, and template-scoped
  designer controls hide their labels with them (no orphaned label text on
  the adult templates).

- The RASS levels in the saved template PDF are a radio-button group: picking
  a level marks it with a dot and clears the others, instead of allowing
  several independent check marks on a mutually exclusive scale.

- Ticking a checkbox in the saved template PDF now shows a visible check mark —
  the check glyph was previously rendered far outside its box, so marking a
  field looked like nothing happened.
- Section header bars (the medication category bars, pathway columns, and card
  headings) no longer touch or overlap the first line beneath them; every
  wrapped heading advances by the same line height the text is drawn with.


## [0.1.0] - 2026-07-02

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
