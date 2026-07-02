# Clinical Methodology & Evidence Base

**Project:** Delirium Bedside Reference Tool (deliriumtool.com)
**Scope of this document:** A transparent account of every clinical instrument, threshold, score band, and decision rule *as actually implemented in the application*, together with the primary-source citations each maps to. It is written so that clinicians, pharmacists, and quality reviewers can audit the evidence base directly.

---

## 1. Intended use — and what this tool is *not*

This is a **reference aid only**. It supports — and does not replace — clinical judgment, local protocol, and prescriber/pharmacy review. It is **not a standalone order set** and **not a validated clinical decision-support device**. All medication decisions must be verified against current institutional policy.

These statements are surfaced to the user throughout the application:

- The persistent banner above every tab reads: *"Reference aid only. This tool supports — and does not replace — clinical judgment, local protocol, and prescriber/pharmacy review. It is not a standalone order set or a validated decision-support device. Verify all medication decisions against current institutional policy."*
- Every generated PDF footer carries: *"Reference aid only — follow local policy & prescriber/pharmacy review."*
- The Medications tab states plainly: *"No agent has FDA approval for delirium treatment."*

**Setting.** The tool is **ICU-focused** — it is built around CAM-ICU, RASS, and the ABCDEF/ICU Liberation bundle. The application advises: *"on the ward, use a ward-validated screen (4AT / 3D-CAM)."* The CAM-ICU, RASS, and ABCDEF elements are not validated for, and should not be transplanted unmodified onto, general-ward populations.

**Data handling.** The tool runs entirely in the browser. The CAM assessment log is a session scratchpad that clears on reload and is not saved to any record; protocol-governance settings are stored locally. No patient data is transmitted or persisted server-side.

---

## 2. Instruments implemented

Each subsection documents the instrument, the exact logic/thresholds *as implemented*, and the primary-source citation IDs (see the registry in §3 for full citations).

### 2.1 Risk-factor tally (admission / q24h)

A simple **count of present risk factors**. The application is emphatic — in the UI subtitle, the score caption, and the band caption — that this is *"a count of present risk factors (not a validated score)"* and *"a checklist tally, not a validated prediction score."* For a validated ICU model it directs users to **E-PRE-DELIRIC** (at admission) or **PRE-DELIRIC** (after 24 h).

**Scoring:** 16 checkboxes, maximum **16 points**. Every factor scores **+1** — a flat checklist count with no weighting. (The earlier +2 on dementia was removed so a non-validated tally cannot imply a calibration it does not have.)

| Group | Factor (points) |
|---|---|
| Predisposing — Cognitive/Psychiatric | Dementia / cognitive impairment (+1); Prior delirium episode (+1); Depression / psychiatric history (+1) |
| Predisposing — Functional/Sensory | Visual impairment (+1); Hearing impairment (+1); Functional dependence / immobility (+1) |
| Predisposing — Demographics/Comorbidities | Age ≥ 70 (+1); Severe illness (APACHE > 16) (+1); Dehydration / poor nutrition (+1); Alcohol / substance use disorder (+1) |
| Precipitating | Surgery / general anesthesia (+1); Mechanical ventilation (+1); Physical restraints in use (+1); Urinary catheter (+1); Metabolic abnormality (+1); Sleep / circadian disruption (+1) |

**Band boundaries and actions** (range 0–16):

| Score | Band | Guidance | Escalation logic |
|---|---|---|---|
| 0–3 | Few risk factors | Maintain baseline prevention measures | Standard prevention + routine CAM |
| 4–6 | Several risk factors | Enhanced ABCDEF bundle · monitor closely | Initiate full ABCDEF bundle |
| 7–10 | Many risk factors | Full bundle · consider geriatrics input (per local protocol) | Geriatrics suggested when score > 6 (pragmatic, non-validated threshold) |
| 11–16 | Very many risk factors | Full bundle · consider geriatrics input (per local protocol) | No score-triggered psychiatry — psychiatry is indicated by clinical features (diagnostic uncertainty, refractory agitation, comorbid psychiatric illness), not by a risk-factor count |

The band cut-points are labelled *"(heuristic)"* in the interface.

**Citations mapped (Risk tab):** `predeliric2012`, `epredeliric2015` (cited inline as the validated alternatives); supporting reference list also carries `inouye1993`, `marcantonio1994`, `inouye_charpentier1996`, `pisani2009`. All factors now count +1 (a flat checklist); there is no weighting and no single published score behind the tally or its band cut-points — they are pragmatic, which is why the tool routes clinicians to the validated models (E-PRE-DELIRIC / PRE-DELIRIC). The geriatrics-consult threshold is likewise a pragmatic, non-validated prompt; there is no score-triggered psychiatry suggestion.

### 2.2 CAM-ICU (Confusion Assessment Method for the ICU)

Implemented as the standard four-feature algorithm with an arousal gate. Performed once per shift and with any acute mental-status change.

**Decision logic:**

1. **Arousal gate first.** If RASS is **−4 or −5**, the result is **"Unable to assess"** (patient too sedated); the tool instructs re-assessment when RASS ≥ −3.
2. **Feature 1 — Acute onset or fluctuating course** *(required)*. Anchored against the patient's mental-status baseline (Feature 1 cannot be scored without collateral/baseline).
3. **Feature 2 — Inattention** *(required)*. Letters task ("SAVEAHAART", 10 letters, ~1 every 3 s; squeeze on each "A"). **Cut-point: > 2 errors = positive** (error entry constrained to 0–10). The **Pictures ASE** alternative is the validated 10-item recognition task (show 5 pictures to memorise, then 10 recognition pictures, yes/no), **scored out of 10 with the same > 2-error cut-point** — so the threshold is genuinely equivalent across modalities. (The on-screen text previously described it loosely as "5 cards," which has been corrected to the validated /10 form; cited to `camicu_worksheet`.)
4. **Feature 3 — Altered level of consciousness.** Alert/normal = negative; vigilant / lethargic / stuporous = positive.
5. **Feature 4 — Disorganized thinking.** Four yes/no questions plus a command; **positive if combined errors > 1.**

**Result rule (displayed and enforced):** **Positive if Feature 1 AND Feature 2 AND (Feature 3 OR Feature 4).** Features 1 and 2 must both be answered before any result; if either is absent the screen is Negative; if 1 and 2 are positive but both secondary features are assessed and negative the screen is Negative; otherwise "Incomplete" until a secondary feature is assessed.

The result panel reinforces that *"A positive CAM-ICU is a screen, not a diagnosis — confirm clinically and exclude mimics,"* and provides a delirium-vs-mimics differential (dementia, depression, receptive aphasia/focal stroke, non-convulsive seizures, catatonia, intoxication/withdrawal). **ICDSC** (`icdsc_bergeron`) is the validated adult-ICU alternative screen — PADIS endorses CAM-ICU and ICDSC, and the Setup "Screening Tool" selector offers these two. CAM-ICU is validated for the adult ICU only; the pathway picker carries a prominent scope panel directing out-of-ICU users to the setting-appropriate validated tool (§4, item 2).

**Citations mapped (CAM tab):** `camicu_worksheet`, `ely2001`, `ely2003`, `sessler2002`, `hayhurst2016`, `icudelirium_monitoring`, `nice_cg103`. (CAM-ICU validation → `ely2001`; worksheet/Pictures-ASE operationalisation → `camicu_worksheet`, `icudelirium_monitoring`; accuracy limitations → `hayhurst2016`.)

### 2.3 RASS (Richmond Agitation-Sedation Scale)

**Range:** the full **+4 to −5** scale (+4 Combative, +3 Very Agitated, +2 Agitated, +1 Restless, 0 Alert & Calm, −1 Drowsy, −2 Light Sedation, −3 Moderate Sedation, −4 Deep Sedation, −5 Unarousable).

**Target band:** **0 to −2** (light sedation — the ICU default, and the only target savable/shareable as a default). The Setup tab also offers *0 to −1 (general ward)* and a deeper *−3 to −4 (deep — indication required)* band. The deep band is **indication-gated**: selecting it reveals a required "indication for deeper sedation" field and a caution that deeper sedation is *associated with* longer ventilation, more delirium, and higher mortality (observational evidence + one small RCT; PADIS conditional, low-certainty). (RASS −2 is *light* sedation and −3 *moderate* per the scale anchors, so the earlier "−2 to −3 (moderate sedation)" label was corrected — a light −2 target is never gated.)

**Colour/zoning of the RASS strip — follows the configured target band.** Green (at target) = every RASS inside the configured band; amber (caution) = restless/agitation short of intervention and the level one step off-goal; red = marked agitation (+2/+3/+4) and over-sedation (≥ 2 levels below the band); **RASS −5 (unarousable) is always red**, regardless of the configured target, so a deep target cannot mask an over-sedated patient. For the 0 to −2 default this is green 0/−1/−2, amber +1 and −3, red +2/+3/+4 and −4/−5. The patient-RASS dropdown's ✓ TARGET markers and the printed `[TARGET]` rows are driven by the same band, so a reconfigured target stays consistent on screen and in the PDF. RASS −4/−5 also triggers the CAM-ICU "unable to assess" gate (§2.2). Per-level prompts are provided (e.g., −4 *"Deep sedation — SAT indicated; deep sedation increases delirium risk,"* −5 *"Unarousable — neurological assessment needed"*).

**Citations mapped:** `sessler2002` (original RASS validation), `ely2003` (RASS reliability/validity over time in ICU), with `rass_mdcalc` available in the registry as a scoring-procedure reference.

### 2.4 Delirium motor subtype

A three-option classifier (Hyperactive / Hypoactive / Mixed) with teaching notes. The percentages are the **proportion of patients *with* delirium by motor subtype** (la Cour 2022: hypoactive 50.3% / mixed 27.7% / hyperactive 22.7%) — **not** the population prevalence of delirium (Krewulak 2018: ~31% overall, a different denominator). The on-screen and PDF wording now states this denominator explicitly and avoids the bare word "prevalence."

| Subtype | Description (proportion of delirious cases — la Cour 2022) |
|---|---|
| Hyperactive | "~23% of delirious cases, least common"; agitation, line-pulling, combativeness |
| Hypoactive | "~50% of delirious cases, most common"; somnolence, reduced responsiveness; "frequently missed and associated with poor outcomes" |
| Mixed | "~28% of delirious cases"; alternating features; "associated with the longest duration and length of stay" |

**Citations mapped (Mnemonic tab reference list):** `lacour2022` (motor-subtype distribution scoping review — the source of the proportions), `krewulak2018` (overall-prevalence meta-analysis — the distinct population denominator), `hayhurst2020` (subtype and post-critical-illness cognition). The figures are approximate, drawn from these cited reviews rather than exact single-source constants.

### 2.5 ABCDEF / ICU Liberation prevention bundle

Non-pharmacologic, first-line for all patients, documented each shift. A live completion percentage and per-letter status indicator are computed from the checked items.

| Letter | Element | Notable embedded logic |
|---|---|---|
| **A** | Assess, Prevent & Manage Pain | NRS if able to self-report; CPOT/BPS if not |
| **B** | Both SAT & SBT | Includes a full SAT/SBT safety screen and failure criteria (e.g., SAT contraindications; SAT failure → restart sedation at **half** prior dose; SBT proceed criteria SpO₂ > 88% on FiO₂ < 50% & PEEP < 8, pH > 7.15, etc.) |
| **C** | Choice of Analgesia & Sedation | **eCASH** framing; target RASS 0 to −2; benzodiazepines minimized, dexmedetomidine preferred; analgesia-first; bolus over continuous infusion |
| **D** | Delirium: Assess, Prevent & Manage | CAM-ICU this shift; RASS documented; precipitants addressed; family education |
| **E** | Early Mobility & Exercise | Safety screen ("reddest parameter wins") covering respiratory/cardiovascular/neuro/lines, then a 5-step progression (passive ROM → active ROM → sit/edge of bed → stand/transfer → ambulate) |
| **F** | Family Engagement & Empowerment | Presence, education, familiar objects/T-A-D-A, glasses/hearing aids, music |

A separate **Sleep & Orientation Measures** card (quiet-hours, eye mask/earplugs, orientation board, clustered cares, clock/calendar, reorientation, oral care/hydration) accompanies the bundle.

**Citations mapped (Bundle tab):** `sccm_abcdef`, `pun2019` (ICU Liberation Collaborative, >15,000 adults), `marra2017`, `padis2018`, `padis2025`, `inouye1999` (HELP RCT), `hshieh2015` (non-pharm meta-analysis), `icudelirium_satsbt`, `hodgson2014` (mobilization safety criteria — cited inline at element E), `nice_cg103`. eCASH is cited inline to `padis2025`; eye mask/earplugs to `padis2018`.

### 2.6 DELIRIUM(S) mnemonic (causative-factor review)

Nine review domains, each with a "Reviewed" toggle, a prompt, and a free-text action field; a progress strip tracks domains reviewed.

| Letter | Domain | Prompt highlights |
|---|---|---|
| **D** | Drugs / Withdrawal | Deliriogenic agents; dose reduction; alcohol/benzo/opioid withdrawal — "in the ICU treat to RASS, not CIWA" |
| **E** | Eyes / Ears / Environment | Glasses & hearing aids; whiteboard; daytime lights |
| **L** | Low O₂ / Liver | SpO₂, Hgb, cardiac/PE events, liver function |
| **I** | Infection | Fever, leukocytosis, cultures, occult sepsis |
| **R** | Retention | Urinary retention/constipation; bladder scan; disimpact/catheterize |
| **I** | Ictal / Seizure | Non-convulsive seizures/status; consider EEG with unexplained ↓LOC |
| **U** | Under-hydration / Nutrition | Volume/electrolytes; **parenteral thiamine before glucose** — at-risk 100–300 mg IV daily (`espen_icu`); suspected Wernicke, guidelines diverge (low-certainty): EFNS 200 mg IV TID (`efns_wernicke`) or RCP 500 mg IV TID × 2–3 days then 250 mg taper (`rcp_wernicke`) |
| **M** | Metabolic | Na, Mg, Ca, glucose, BUN/Cr, acid-base |
| **(S)** | Subdural / Sleep | Subdural hematoma (fall/anticoagulation); sleep deprivation |

**Citations mapped:** `icudelirium_mnemonics` (the Vanderbilt DELIRIUM(S) differential), `flaherty2011`, `maldonado2018` (delirium pathophysiology), `inouye_charpentier1996` (precipitating-factor model), `espen_icu` / `efns_wernicke` / `rcp_wernicke` (the at-risk and divergent Wernicke thiamine regimens), plus the subtype sources `lacour2022`, `krewulak2018`, `hayhurst2020`.

### 2.7 Treatment algorithm

Applies when CAM-ICU is positive. The governing principle is *"Non-pharmacological interventions are the cornerstone of treatment. Pharmacologic therapy is reserved for patient safety concerns only."*

**Visual decision tree:** entry for the acutely agitated patient (RASS +2 to +4) → rule out/treat reversible causes (pain, hypoxia, hypoglycaemia, alcohol/benzo withdrawal, urinary retention, new deliriogenic med) → **verbal de-escalation first** → branch on CAM-ICU result (Negative → continue prevention; Unable to assess at RASS −4/−5 → re-screen when RASS ≥ −3; Positive → management) → **Dr. DRE** (Diseases, Drug removal, Remove Environmental contributors) → intensify ABCDEF → safety-risk decision determining whether short, lowest-dose pharmacotherapy is warranted.

**Working checklist (Steps 1–3):**

- **Step 1 — Identify & treat the underlying cause:** electrolytes; occult infection/sepsis; oxygenation/ventilation; retention/constipation/pain; **alcohol/benzo withdrawal titrated to RASS** (*"CIWA-Ar is not validated in intubated / sedated / delirious patients"*); brain imaging if focal neuro signs.
- **Step 2 — Intensify non-pharmacologic measures:** full ABCDEF; family/volunteer presence; 1:1 sitter if active safety risk; geriatric/psychiatric consult.
- **Step 3 — Pharmacologic (safety indication only):** antipsychotics *"do not treat or shorten delirium (PADIS: no recommendation for or against)"*; requires documented safety indication, baseline QTc (haloperidol caution if > 500 ms), lowest effective dose, daily reassessment for discontinuation, **no scheduled antipsychotics at discharge without a psychiatric indication**, and a "do NOT stop abruptly" list (benzodiazepines, opioids, SSRIs, steroids, antiepileptics).

**Supporting frameworks:** **T-A-D-A** (Tolerate / Anticipate / Don't Agitate); a **7-step Nurse Care Pathway** (1 Deter · 2 Detect · 3 Do (Acute) · 4–6 Daily · 7 Discharge); and a note that restraints are the last resort after de-escalation, environment, device removal, and 1:1 observation, re-evaluated daily.

**Citations mapped (Treatment tab):** `projectbeta` (verbal de-escalation, APA Project BETA — inline at the de-escalation node), `hayhurst2016` (Dr. DRE), `ciwa_mdcalc` (CIWA-Ar reference), `padis2025` / `padis2018` (antipsychotic stance and prevention), `mindusa2018` (haloperidol/ziprasidone RCT), `nice_ng10` (restraints / management of aggression), `hshieh2015`, `balas2014`.

### 2.8 Medication tables and deliriogenic-medication list

**Pharmacologic options table (safety indication only) — doses as shown:**

| Drug | Typical dose | Key notes (abridged) |
|---|---|---|
| Haloperidol | 0.25–0.5 mg q4–6h PRN; lowest effective dose, cap per local protocol | Elderly more sensitive (EPS/QTc); ECG baseline; QTc caution > 500 ms; avoid Parkinson/Lewy; dementia-mortality boxed warning; IV route off-label (higher QT/Torsades); stop & escalate if NMS |
| Quetiapine | 12.5–25 mg q12h PO; lowest dose, shortest duration | Sedating; orthostatic hypotension; QTc prolongation; antipsychotic-class boxed warning |
| Dexmedetomidine | 0.2–0.7 mcg/kg/hr IV infusion | In ventilated adults, suggested over propofol when light sedation/delirium reduction is a priority (PADIS 2025); monitor bradycardia/hypotension |
| Lorazepam *(specific use)* | Per CIWA protocol | Rescue / alcohol withdrawal **only** — may worsen delirium |
| Melatonin | 0.5–3 mg nightly | Sleep/circadian support; low-certainty ICU evidence; not a treatment for established delirium; prevention evidence mixed |

These doses are **conventional / expert starting references** for short-term agitation control, **not RCT- or guideline-calibrated doses for delirium** (no agent is guideline-recommended to treat delirium): haloperidol low-dose is off-label, quetiapine 12.5–25 mg is a conservative starting fraction, and dexmedetomidine 0.2–0.7 mcg/kg/hr is a **sedative infusion for ventilated patients, not a PRN antipsychotic-equivalent** — so the three are not interchangeable.

**Deliriogenic-medication review list:** **11 categories containing 103 individual agents**, each independently toggleable. The three classes with the strongest / most-actionable ICU delirium signal — **benzodiazepines, opioids, and anticholinergics** — are **enabled by default**; the rest of the list is available but **off by default (opt-in)** to reduce alert fatigue. Toggling an agent adds/removes it from the printed documents.

| Category | Agent count |
|---|---|
| Benzodiazepines | 9 |
| Opioids / Analgesics | 10 |
| Anticholinergics | 15 |
| Sedatives / Hypnotics | 7 |
| Antipsychotics (high-dose / typical) | 6 |
| Antidepressants / Mood (anticholinergic) | 8 |
| Antimicrobials | 13 |
| Cardiovascular / Cardiac | 8 |
| Corticosteroids / Immunosuppressants | 7 |
| GI / Antiemetics / H2 blockers | 6 |
| Other / Miscellaneous | 14 |
| **Total** | **103** |

The list is explicitly framed as *"a medication-review prompt, not a list of equally harmful drugs"*: risk varies by agent, dose, route, renal/hepatic function, interactions, and temporal association. A citation-backed **higher-risk** marker (a binary flag, not an invented ordinal tier) is shown on the agents with the clearest evidence — **benzodiazepines** (PADIS), **strong anticholinergics** (AGS Beers / Anticholinergic Cognitive Burden), and **meperidine** (Beers; normeperidine accumulation). **Dexmedetomidine is not on the list** — it is the preferred, delirium-sparing sedative (PADIS 2025 / MENDS2); its only caution (rebound on abrupt withdrawal after a prolonged infusion) lives on the treatment tab's "do NOT stop abruptly" list. **Metoclopramide** is grouped under GI / antiemetics (it is a D2 antagonist, not an anticholinergic). Renal/hepatic-accumulation cautions are included (meperidine → normeperidine in renal failure; morphine/hydromorphone metabolites neurotoxic at GFR < 30; gabapentin/pregabalin ~50% dose reduction at CrCl < 60). Beers Criteria are noted to apply to adults ≥ 65.

**Citations mapped (Medications tab):** `beers2023` (AGS Beers Criteria 2023), `acb_boustani` (Anticholinergic Cognitive Burden scale — anchor for the anticholinergic higher-risk flag), `padis2025`, `padis2018`, `haldol_label` (haloperidol prescribing information), `mends2` (MENDS2 dexmedetomidine vs propofol), `mindusa2018`, `promedic2022` (Pro-MEDIC prophylactic-melatonin RCT), `melatonin_meta2025` (2025 ICU melatonin systematic review / meta-analysis).

### 2.9 Printable bedside templates (/templates/)

The template designer produces two laminate-ready sheets — an **ICU Delirium Rounding Tool**
(per-patient landscape checklist marked with a dry-erase pen) and an **SPA Quick Reference**
(unit-level portrait poster: Sedation · Pain/Pharmacy · Activity). The designer edits protocol
configuration only (facility name, section/item selection, medication selection, sedation
target, added local-protocol lines); no assessment or patient data is entered or printed.

**Content provenance rule:** every clinical statement on the sheets **mirrors the interactive
tool's cited content** — the sheets introduce no new clinical values. The mapping:

| Sheet block | Mirrors | Citations |
|---|---|---|
| Sedation goal / target RASS | §2.3, §2.5 (eCASH light-sedation framing) | `padis2018`, `padis2025`, `icudelirium_satsbt` |
| CAM-ICU result options (incl. RASS −4/−5 unable-to-assess) | §2.2 | `camicu_worksheet`, `ely2001` |
| Delirium subtype (hyperactive / hypoactive / mixed) | §2.4 | `lacour2022`, `krewulak2018`, `hayhurst2020` |
| RASS mini-table (compact grouped rows) | §2.3 | `sessler2002`, `ely2003` |
| Causative factors — DELIRIUM(S), nine cells | §2.6 (notes shortened to card length; the thiamine dosing detail stays on the web tool, the card says only "thiamine before glucose in at-risk patients") | `icudelirium_mnemonics`, `flaherty2011`, `maldonado2018` |
| Non-pharmacologic bundle (six bedside groups) | §2.5 items regrouped for bedside scanning (Reorientation / Sensory / Sleep / Mobility / Hydration & Nutrition / Engagement) | `sccm_abcdef`, `pun2019`, `marra2017`, `padis2018`, `inouye1999`, `hshieh2015` |
| Pharmacologic considerations | §2.7 Step 3 + §2.8; **doses print only when "example starting doses" is switched on** — the default defers to the local order set | `padis2025`, `mindusa2018`, `haldol_label`, `mends2`, `padis2018` |
| Deliriogenic medications grid | §2.8 registry — the designer's picker toggles the same per-agent flags | `beers2023`, `padis2018`, `acb_boustani` |
| SPA columns + deeper guidance + escalation ladder | §2.5, §2.7, §2.8 statements recast as poster actions | per-column keys in `src/js/templates/data/content.js` |
| Nurse care pathway (rounding sheet, step 4) | **Local unit workflow — the only uncited section.** It carries process steps (documentation, handoff, teaching), not clinical values, is flagged "unit workflow — edit to match your local protocol" in the designer, and is fully editable/removable. | — |

**Presentation rules.** Medication names print **generic-only by default** — brand names in
the registry are stripped for the sheet (clinical qualifiers such as routes and "high dose"
always remain) and reappear only when the unit enables "show brand names". The designer's
default medication selection mirrors the interactive tool's documented defaults — the three
classes with the strongest, most actionable ICU delirium signal (**benzodiazepines, opioids,
anticholinergics**; PADIS 2018, AGS Beers 2023/ACB, §2.8) — with the rest of the shared
catalog opt-in via per-category and select-all/none controls. The printed list is a mosaic of
colour cards, one check-off square per medication, with the type size and column count
scaling to the selection so the full catalog still fits; a classic category-rows view remains
available.
The two pharmacology caution lines with the strongest bedside consequence — benzodiazepines
as withdrawal rescue only, and no antipsychotics at discharge without a psychiatric
indication — carry a printed warning marker. The sedation-target
selector offers exactly the interactive tool's three bands (0 to −2 light/ICU default; 0 to −1
general ward; −3 to −4 deep, which prints a "documented indication required" caveat). "Save as
PDF" renders the same content data through a second layout engine (jsPDF), so the PDF cannot
carry different clinical values than the on-screen sheet. Reworded lines, added lines, and
unit-authored sections are local protocol content — like the nurse care pathway, they carry no
citation and are the unit's responsibility.

Each printed sheet carries the verbatim reference-aid disclaimer and a footer source line
naming the primary guidelines. Unit tests enforce that every citation key in the template
content resolves in the registry, that the medication defaults track the shared catalog, that
brand-name stripping preserves clinical qualifiers, and that the disclaimer text stays
verbatim (`tests/unit/templates-data.test.js`).

---

## 3. Citation registry

Every source in the application's citation registry, reproduced as the tool stores it. Inline citations and per-tab reference lists are generated from this single registry. Identifiers marked **† not locally archived** are cited by canonical URL only (see §4).

| ID | Citation | DOI / URL |
|---|---|---|
| `camicu_worksheet` | Ely EW; Vanderbilt University. CAM-ICU Worksheet. ICUDelirium.org. | https://www.icudelirium.org/resource-downloads/cam-icu-worksheet |
| `camicu_manual` | Ely EW; Vanderbilt University. The Complete CAM-ICU Training Manual (rev. 2016). | https://www.icudelirium.org/resource-downloads/cam-icu-training-manual |
| `icudelirium_monitoring` | Vanderbilt CIBS Center. Monitoring Delirium in the ICU. | https://www.icudelirium.org/medical-professionals/delirium/monitoring-delirium-in-the-icu |
| `ely2001` | Ely EW, Inouye SK, Bernard GR, et al. Delirium in mechanically ventilated patients: validity and reliability of the CAM-ICU. JAMA. 2001;286(21):2703-2710. | https://doi.org/10.1001/jama.286.21.2703 |
| `icdsc_bergeron` | Bergeron N, Dubois MJ, Dumont M, Dial S, Skrobik Y. Intensive Care Delirium Screening Checklist: evaluation of a new screening tool. Intensive Care Med. 2001;27(5):859-864. (8-item checklist; ≥ 4 = positive.) | https://doi.org/10.1007/s001340100909 |
| `sessler2002` **†** | Sessler CN, Gosnell MS, Grap MJ, et al. The Richmond Agitation-Sedation Scale (RASS): validity and reliability in adult ICU patients. Am J Respir Crit Care Med. 2002;166(10):1338-1344. | https://pubmed.ncbi.nlm.nih.gov/12421743/ |
| `ely2003` | Ely EW, Truman B, Shintani A, et al. Monitoring sedation status over time in ICU patients: reliability and validity of the RASS. JAMA. 2003;289(22):2983-2991. | https://doi.org/10.1001/jama.289.22.2983 |
| `hayhurst2016` | Hayhurst CJ, Pandharipande PP, Hughes CG. ICU delirium: a review of diagnosis, prevention, and treatment. Anesthesiology. 2016;125(6):1229-1241. | https://doi.org/10.1097/ALN.0000000000001378 |
| `sccm_abcdef` | Society of Critical Care Medicine. ICU Liberation Bundle (A-F). | https://sccm.org/clinical-resources/iculiberation-home/abcdef-bundles |
| `pun2019` | Pun BT, Balas MC, Barnes-Daly MA, et al. Caring for critically ill patients with the ABCDEF bundle: ICU Liberation Collaborative in over 15,000 adults. Crit Care Med. 2019;47(1):3-14. | https://doi.org/10.1097/CCM.0000000000003482 |
| `marra2017` | Marra A, Ely EW, Pandharipande PP, Patel MB. The ABCDEF bundle in critical care. Crit Care Clin. 2017;33(2):225-243. | https://doi.org/10.1016/j.ccc.2016.12.005 |
| `padis2018` | Devlin JW, Skrobik Y, Gélinas C, et al. Clinical practice guidelines for the prevention and management of pain, agitation/sedation, delirium, immobility, and sleep disruption in adult ICU patients (PADIS). Crit Care Med. 2018;46(9):e825-e873. | https://pubmed.ncbi.nlm.nih.gov/30113379/ |
| `padis2025` | Lewis K, Balas MC, Stollings JL, et al. A focused update to the PADIS guidelines. Crit Care Med. 2025;53(3):e711-e727. | https://doi.org/10.1097/CCM.0000000000006574 |
| `inouye1999` | Inouye SK, Bogardus ST Jr, Charpentier PA, et al. A multicomponent intervention to prevent delirium in hospitalized older patients (HELP). N Engl J Med. 1999;340(9):669-676. | https://doi.org/10.1056/NEJM199903043400901 |
| `hshieh2015` | Hshieh TT, Yue J, Oh E, et al. Effectiveness of multicomponent nonpharmacological delirium interventions: a meta-analysis. JAMA Intern Med. 2015;175(4):512-520. | https://doi.org/10.1001/jamainternmed.2014.7779 |
| `nice_cg103` | NICE. Delirium: prevention, diagnosis and management. Clinical guideline CG103 (updated 2023). | https://www.nice.org.uk/guidance/cg103 |
| `icudelirium_satsbt` | Vanderbilt CIBS Center. Both SAT and SBT (Wake Up and Breathe). | https://www.icudelirium.org/medical-professionals/both-sat-and-sbt |
| `icudelirium_mobility` | Vanderbilt CIBS Center. Early Mobility and Exercise. | https://www.icudelirium.org/medical-professionals/early-mobility-and-exercise |
| `hodgson2014` | Hodgson CL, Stiller K, Needham DM, et al. Expert consensus and recommendations on safety criteria for active mobilization of mechanically ventilated critically ill adults. Crit Care. 2014;18(6):658. | https://ccforum.biomedcentral.com/articles/10.1186/s13054-014-0658-y |
| `icudelirium_mnemonics` | Vanderbilt CIBS Center. Terminology and Mnemonics: DELIRIUM(S) differential diagnosis. | https://www.icudelirium.org/medical-professionals/terminology-mnemonics |
| `flaherty2011` | Flaherty JH. The evaluation and management of delirium among older persons. Med Clin North Am. 2011;95(3):555-577. | https://pubmed.ncbi.nlm.nih.gov/21549878/ |
| `maldonado2018` | Maldonado JR. Delirium pathophysiology: an updated hypothesis of the etiology of acute brain failure. Int J Geriatr Psychiatry. 2018;33(11):1428-1457. | https://doi.org/10.1002/gps.4823 |
| `inouye_charpentier1996` | Inouye SK, Charpentier PA. Precipitating factors for delirium in hospitalized elderly persons: predictive model and interrelationship with baseline vulnerability. JAMA. 1996;275(11):852-857. | https://pubmed.ncbi.nlm.nih.gov/8596223/ |
| `lacour2022` | la Cour KN, Andersen-Ranberg NC, Weihe S, et al. Distribution of delirium motor subtypes in the ICU: a systematic scoping review. Crit Care. 2022;26:53. | https://doi.org/10.1186/s13054-022-03931-3 |
| `krewulak2018` **†** | Krewulak KD, Stelfox HT, Leigh JP, Ely EW, Fiest KM. Incidence and prevalence of delirium subtypes in an adult ICU: a systematic review and meta-analysis. Crit Care Med. 2018;46(12):2029-2035. | https://doi.org/10.1097/CCM.0000000000003402 |
| `hayhurst2020` | Hayhurst CJ, Patel MB, McNeil JB, et al. Association of hypoactive and hyperactive delirium with cognitive function after critical illness. Crit Care Med. 2020;48(6):e480-e488. | https://doi.org/10.1097/CCM.0000000000004313 |
| `pisani2009` | Pisani MA, Kong SY, Kasl SV, et al. Days of delirium are associated with 1-year mortality in an older ICU population. Am J Respir Crit Care Med. 2009;180(11):1092-1097. | https://doi.org/10.1164/rccm.200904-0537OC |
| `beers2023` | 2023 AGS Beers Criteria Update Expert Panel. AGS 2023 updated Beers Criteria for potentially inappropriate medication use in older adults. J Am Geriatr Soc. 2023;71(7):2052-2081. | https://pubmed.ncbi.nlm.nih.gov/37139824/ |
| `haldol_label` | Haloperidol prescribing information (boxed warnings, QTc/Torsades, Parkinson/Lewy). DailyMed, U.S. NLM. | https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8397a841-f240-4767-9dcd-781e6d3f7c7f |
| `mends2` | Hughes CG, Mailloux PT, Devlin JW, et al. Dexmedetomidine or propofol for sedation in mechanically ventilated adults with sepsis (MENDS2). N Engl J Med. 2021;384(15):1424-1436. | https://doi.org/10.1056/NEJMoa2024922 |
| `promedic2022` **†** | Wibrow B, Martinez FE, Myers E, et al. Prophylactic melatonin for delirium in intensive care (Pro-MEDIC): an RCT. Intensive Care Med. 2022;48(4):414-425. | https://doi.org/10.1007/s00134-022-06638-9 |
| `melatonin_meta2025` | Tang BHY, Manalo J, Chowdhury SR, et al. Melatonin use in the ICU: a systematic review and meta-analysis. Crit Care Med. 2025;53(9):e1714-e1724. (32 RCTs, n=3895; may reduce delirium / improve sleep — low certainty.) | https://doi.org/10.1097/CCM.0000000000006767 |
| `mindusa2018` | Girard TD, Exline MC, Carson SS, et al. Haloperidol and ziprasidone for treatment of delirium in critical illness (MIND-USA). N Engl J Med. 2018;379(26):2506-2516. | https://doi.org/10.1056/NEJMoa1808217 |
| `balas2014` | Balas MC, Vasilevskis EE, Olsen KM, et al. Effectiveness and safety of the ABCDE bundle. Crit Care Med. 2014;42(5):1024-1036. | https://pubmed.ncbi.nlm.nih.gov/24394627/ |
| `projectbeta` | Richmond JS, Berlin JS, Fishkind AB, et al. Verbal de-escalation of the agitated patient: consensus statement of the APA Project BETA. West J Emerg Med. 2012;13(1):17-25. | https://pmc.ncbi.nlm.nih.gov/articles/PMC3298202/ |
| `nice_ng10` | NICE. Violence and aggression: short-term management in mental health, health and community settings. NG10. | https://www.nice.org.uk/guidance/ng10 |
| `inouye1993` **†** | Inouye SK, Viscoli CM, Horwitz RI, et al. A predictive model for delirium in hospitalized elderly based on admission characteristics. Ann Intern Med. 1993;119(6):474-481. | https://pubmed.ncbi.nlm.nih.gov/8357112/ |
| `marcantonio1994` **†** | Marcantonio ER, Goldman L, Mangione CM, et al. A clinical prediction rule for delirium after elective noncardiac surgery. JAMA. 1994;271(2):134-139. | https://pubmed.ncbi.nlm.nih.gov/8264068/ |
| `predeliric2012` | van den Boogaard M, Pickkers P, Slooter AJC, et al. Development and validation of PRE-DELIRIC. BMJ. 2012;344:e420. | https://doi.org/10.1136/bmj.e420 |
| `epredeliric2015` | Wassenaar A, van den Boogaard M, van Achterberg T, et al. Multinational development and validation of an early (admission) delirium prediction model for ICU patients (E-PRE-DELIRIC). Intensive Care Med. 2015;41(6):1048-1056. | https://doi.org/10.1007/s00134-015-3777-2 |
| `ciwa_mdcalc` | CIWA-Ar (Clinical Institute Withdrawal Assessment for Alcohol, revised). MDCalc. | https://www.mdcalc.com/calc/1736/ciwa-ar-alcohol-withdrawal |
| `rass_mdcalc` | Richmond Agitation-Sedation Scale (RASS) — scoring procedure. MDCalc. | https://www.mdcalc.com/calc/1872/richmond-agitation-sedation-scale-rass |
| `efns_wernicke` | Galvin R, Bråthen G, Ivashynka A, et al. EFNS guidelines for diagnosis, therapy and prevention of Wernicke encephalopathy. Eur J Neurol. 2010;17(12):1408-1418. (Thiamine 200 mg IV TID, before carbohydrate; Level C.) | https://doi.org/10.1111/j.1468-1331.2010.03153.x |
| `rcp_wernicke` | Thomson AD, Cook CCH, Touquet R, Henry JA. The Royal College of Physicians report on alcohol: guidelines for managing Wernicke's encephalopathy in the accident and emergency department. Alcohol Alcohol. 2002;37(6):513-521. (Higher-dose regimen, e.g. 500 mg IV TID × 2–3 days then taper.) | https://doi.org/10.1093/alcalc/37.6.513 |
| `espen_icu` | Singer P, Blaser AR, Berger MM, et al. ESPEN guideline on clinical nutrition in the intensive care unit. Clin Nutr. 2019;38(1):48-79. (Thiamine in refeeding / at-risk critically ill.) | https://doi.org/10.1016/j.clnu.2018.08.037 |
| `acb_boustani` | Boustani M, Campbell N, Munger S, Maidment I, Fox C. Impact of anticholinergics on the aging brain (Anticholinergic Cognitive Burden scale). Aging Health. 2008;4(3):311-320. | https://doi.org/10.2217/1745509X.4.3.311 |

*Edition/year details are reproduced as they appear in the source registry; where a source is a living web resource (e.g., the SCCM/Vanderbilt pages, NICE guidelines, DailyMed label) it carries the version/update designation the registry records and is otherwise undated.*

---

## 4. Known limitations

These are stated by the tool itself or follow directly from how it is implemented:

1. **The risk-factor tally is a non-validated heuristic.** It is a count of present factors, not a calibrated probability. Every factor counts **+1** (a flat checklist — no weighting), and the band boundaries are explicitly labelled heuristic. For validated ICU prediction the tool directs clinicians to **E-PRE-DELIRIC** (admission) and **PRE-DELIRIC** (after 24 h). The only score-linked escalation prompt (geriatrics above a count of 6) is pragmatic and labelled as such; there is no score-triggered psychiatry suggestion.
2. **Adult-ICU scope (a prominent panel at the pathway picker, not just prose).** CAM-ICU, RASS, and ABCDEF are validated for the **adult ICU**; **ICDSC** is the in-ICU alternative screen. They are not validated for other settings — the picker panel directs users to the setting-appropriate validated tool: **ED → bCAM (DTS → bCAM) or 4AT**; **general / step-down ward → 3D-CAM or 4AT**; **paediatric ICU → pCAM-ICU (≥ 5 yr) / psCAM-ICU (6 mo–5 yr) / CAPD (all ages)**; **pregnancy →** the adult ICU screens apply but medication safety/dosing must be adjusted. The framing is "developed and validated in the adult ICU; use the setting-appropriate tool elsewhere," not a claim that these instruments were disproven outside the ICU.
3. **CAM-ICU is a screen, not a diagnosis.** The tool flags reduced accuracy in primary neurologic injury/TBI, aphasia, and deep sedation; requires scoring against the patient's baseline; and notes that missed cases are predominantly hypoactive — hence screen every shift.
4. **CIWA-Ar is not validated in intubated/sedated/delirious patients.** For withdrawal in the ICU the tool directs titration to RASS rather than CIWA.
5. **The deliriogenic list is a review prompt, not a risk ranking.** Of 103 agents, the strongest classes (benzodiazepines, opioids, anticholinergics) are on by default and the rest are opt-in; benzodiazepines, strong anticholinergics, and meperidine carry a citation-backed *higher-risk* flag. Actual risk still varies by agent, dose, route, organ function, interactions, and temporal association. Beers Criteria apply to adults ≥ 65.
6. **No pharmacotherapy is FDA-approved for delirium.** Antipsychotics do not treat or shorten delirium (PADIS gives no recommendation for or against); the tool restricts them to short-term control of dangerous agitation with documented indication, QTc monitoring, daily reassessment, and no discharge continuation without a psychiatric indication. Doses shown are generic starting-point references ("cap per local protocol"), not orders.
7. **Not a record system.** The CAM log is a session scratchpad that clears on reload and is not saved to any chart; the PDFs are generated locally. The tool is not a substitute for the medical record or for a sanctioned order set.
8. **Subtype figures are the proportion of delirious cases** (la Cour 2022), not population prevalence (Krewulak 2018); they are approximate, drawn from the cited reviews, and should not be quoted as exact constants.
9. **Reference-archive completeness.** A small number of registry sources are cited by canonical URL but not held in the local archive (Sessler 2002 RASS; Inouye 1993; Marcantonio 1994; Krewulak 2018; the Pro-MEDIC main RCT — for which only the statistical-analysis plan and an editorial are archived).

---

## 5. Questions for clinical reviewers

**Resolved in the current revision** (recorded in the change log, §6.5 — each still welcomes a confirming sign-off):

1. **Risk-factor weighting** — flattened to all +1 (the dementia +2 was removed) so the unvalidated tally cannot imply a calibration. (Whether *APACHE > 16* / *age ≥ 70* are the right operationalisations remains a fair review point.)
2. **Risk-band escalation** — the score-triggered psychiatry suggestion was removed (psychiatry follows clinical features, not a count); geriatrics above 6 is kept, relabelled "pragmatic, not validated."
3. **CAM-ICU inattention cut-point** — the Pictures ASE wording was corrected to the validated 10-item recognition task (> 2/10), so the > 2-error cut-point is genuinely equivalent across modalities.
5. **Subtype wording** — restated as the *proportion of delirious cases* (la Cour 2022), explicitly distinguished from population prevalence (Krewulak 2018).
6. **Deliriogenic-list breadth/defaults** — higher-risk agents now flagged (benzodiazepines, strong anticholinergics, meperidine); the long tail defaults off (opt-in); dexmedetomidine delisted; metoclopramide recategorised.
8. **Thiamine guidance** — now cited (EFNS Wernicke guideline) with the short ~3–5-day course stated.

**Addressed this revision — with residual points a reviewer may still weigh (pending CCO):**

4. **RASS target and caution zoning** — *resolved (pending CCO):* the light **0 to −2** is the only savable/shareable default; the mislabeled "−2 to −3 (moderate sedation)" option was corrected to a **−3 to −4 (deep — indication required)** band that is indication-gated (required reason + association-worded caution), and RASS −5 is now always flagged danger so a deep target cannot mask over-sedation. (Whether the amber/red zoning edges are exactly right remains a fair reviewer point.)
7. **Dosing references** — *resolved (pending CCO):* labelled "conventional / expert starting references, not guideline-calibrated for delirium" (rather than chasing named sources), with the note that dexmedetomidine is a sedative infusion for ventilated patients — not a PRN antipsychotic-equivalent — so the agents are not interchangeable.
9. **Melatonin** — *resolved (pending CCO):* kept as a low-risk sleep/circadian adjunct, not a delirium treatment/prevention agent; the "low-certainty ICU evidence" claim was re-anchored from a "(PADIS 2025)" label to the dedicated evidence (`promedic2022` + `melatonin_meta2025`), and the overstated SPA prompt ("supports circadian rhythm; minimal adverse effects") was softened.
10. **Out-of-scope gate** — *resolved (pending CCO):* a prominent (non-blocking) adult/ICU scope panel now sits at the pathway picker with setting-specific redirects (ED → bCAM/4AT; ward → 3D-CAM/4AT; paeds → pCAM-ICU/psCAM-ICU/CAPD; pregnancy → adjust drug safety); ICDSC was kept as the in-ICU alternative and the Setup screening-tool selector trimmed to the two adult-ICU screens (CAM-ICU, ICDSC) so it no longer implies ward/ED validity.


## 6. Governance & maintenance

This section defines who owns the clinical content, how often it is reviewed, what triggers an out-of-cycle review, how each change is recorded, and how the validated published instruments (CAM-ICU, RASS) are attributed and kept distinct from the tool's home-grown checklist tally. It governs the **source content** in this repository. It is separate from the **per-deployment sign-off** an adopting unit records in the Setup tab (Protocol Version, Medical Director, CNO/Nurse Leader, Last Reviewed, Next Review Due, Footer Disclaimer) — see §6.2.

### 6.1 Roles & ownership

This section names the people accountable for the clinical content and sets the sign-off discipline by which **no clinical value, threshold, band, cut-point, dose, instrument logic, or citation reaches a release without recorded approval.** It names a single accountable **Clinical Content Owner (CCO)**; a **Deputy CCO** who preserves that accountability when the owner is unavailable; a **Non-Device CDS Boundary Owner** answerable for the device/non-device posture; and an advisory **reviewer panel** mapped to the tool's content domains.

These roles are a **self-imposed internal-review discipline — not a regulatory determination, clearance, or any claim of FDA status.** (The tool is an internal, non-distributed reference aid outside FDA premarket reach; see `INTENDED_USE.md` §10.) This section governs the **source content** in this repository and is kept separate from the **per-deployment sign-off** an adopting unit records in the Setup tab (see the two-layer table below and §6.2). Every field marked `[TBD]` / `[ ]` is completed by whoever takes the role.

**Accountability at a glance.**

| Role | Accountable for | Typically held by | Minimum |
|---|---|---|---|
| Clinical Content Owner (CCO) | Accuracy and provenance of all clinical content **and** the risk controls it implements (`docs/HAZARD_ANALYSIS.md`); approves every §6.5 change-log row; signs every §6.2 / §6.3 review; confirms the §6.7 non-device CDS design check | A practising intensivist, ICU clinical pharmacist, or geriatrician with current adult-ICU involvement | 1 (with 1 named Deputy) |
| Deputy CCO | Acts with full CCO authority during the CCO's absence, recusal, or a vacancy; maintains continuity | A second clinician meeting the CCO criteria, from a different discipline where possible | 1 |
| Non-Device CDS Boundary Owner | The device / non-device boundary call (FDA non-device CDS criterion 1); signs **before** any device-signal, added-autonomy, intended-use, or distribution change ships | The CCO or a separately named individual; co-signs with the technical maintainer | 1 (may be the CCO) |
| Reviewer panel (advisory) | Domain review and recorded sign-off of the rows mapped to their discipline | Critical-care medicine, critical-care pharmacy, critical-care nursing, geriatrics/psychiatry | Core triad + the reviewer(s) mapped to the affected domain |

#### Clinical Content Owner (CCO)

A **single named clinician — not a committee —** is accountable for the clinical content of the tool. Accountability runs to the **risk controls** in the hazard analysis (`docs/HAZARD_ANALYSIS.md`), not to the numbers alone: where a clinical value, label, or scope statement is the mitigation for an identified hazard (e.g. the "pragmatic, not validated" framing of the §2.1 tally, the antipsychotic "short-term agitation/safety control only — not a delirium treatment" caveat, the RASS deep-target indication gate, the adult-ICU scope panel), the CCO owns that the control is present, faithful to its source, and adequate.

**Scope of accountability.** The CCO is accountable for the accuracy and provenance of every:

- clinical value, threshold, score band, **cut-point**, and drug dose;
- instrument logic reproduced from a validated source (CAM-ICU, RASS) and every **disclosed deviation** from it (§6.6 modification register);
- citation and its assigned **evidence tier / grade** (§6.4 — V / G / R / P), and any re-tiering; and
- risk control in the hazard analysis that any of the above implements.

The CCO approves every change-log entry (§6.5), signs each scheduled and triggered review (§6.2, §6.3), confirms the non-device CDS design check (§6.7), and attests at each review that every output still **supports rather than directs** (CDS criterion 3) and keeps its **basis independently reviewable** — citation and tier visible at the point of use (CDS criterion 4). Until the CCO — or the Deputy acting in role — has signed, the affected content keeps its "pending" status and **must not be represented as clinically endorsed** in any deployment. The §6.5 rows dated 2026-06-27 are in exactly this state.

**Required competence (CCO and Deputy).**

- [ ] Current, unrestricted clinical licence / registration.
- [ ] Board certification (or national equivalent) in critical-care medicine, critical-care pharmacy (e.g. BCCCP), geriatric medicine, or a directly relevant specialty.
- [ ] Active involvement in adult ICU care during the appointment term.
- [ ] No unmanaged conflict of interest in the drugs, devices, or instruments the tool covers (see the conflict-of-interest rule below).

```
Clinical Content Owner
  Name / credentials   : [TBD — e.g. intensivist (board-cert. critical care) / ICU pharmacist (PharmD, BCCCP) / geriatrician]
  Competence basis     : [TBD — current scope of practice / board status in a content domain]
  Affiliation          : [TBD]
  Contact              : [TBD]
  Conflicts of interest: [TBD — declare relevant industry / financial relationships, or "none"]
  Appointed (date)     : [TBD]
  Term ends (date)     : [TBD — default 2 years from appointment, renewable]
```

#### Deputy Clinical Content Owner (continuity)

A **named Deputy** holds the CCO's authority so accountability never lapses. The Deputy meets the same competence criteria as the CCO (a different discipline where possible) and may sign change-log entries, reviews, and attestations whenever the CCO is unavailable, on a recused entry (declared conflict), or while the CCO seat is unfilled.

```
Deputy Clinical Content Owner
  Name / credentials   : [TBD — second qualifying clinician, different discipline where possible]
  Competence basis     : [TBD]
  Affiliation          : [TBD]
  Contact              : [TBD]
  Conflicts of interest: [TBD — declare, or "none"]
  Appointed (date)     : [TBD]
  Term ends (date)     : [TBD]
```

**Vacancy / fail-safe rule.** If neither the CCO nor an activated Deputy is in post, clinical-content changes are **frozen**: no clinical value, threshold, band, cut-point, dose, instrument logic, or citation may ship to a release until the role is reassigned. Entries already marked `[CCO — pending]` (§6.5) remain unapproved while the seat is empty; they do not age into approval by default.

#### Non-Device CDS Boundary Owner (regulatory posture)

A single named person is accountable for the **device / non-device boundary call** — non-device CDS criterion 1, "no device data stream." The non-device posture holds **only while every input is manual clinician entry**; ingesting a device signal fails criterion 1 regardless of how well the other criteria are met (see the device-data-stream boundary in `CDS_NONDEVICE_MAPPING.md`). The Boundary Owner reviews and signs off **before** any change that could:

- acquire, auto-fill, or analyze a **device signal** — a bedside monitor feed (continuous SpO₂ / HR / BP), a processed-EEG depth-of-sedation index (BIS / SedLine-type), raw or processed EEG, or an in-vitro-diagnostic / lab-analyzer feed;
- add **autonomy** — issue an order or prescription, or compute a score / probability intended to be acted on without independent review;
- change the **intended use, intended users, or care setting** (`INTENDED_USE.md` §1–3); or
- change **distribution** — external release, or offering the tool for use outside the holding unit.

Each such change triggers a **fresh device / non-device assessment before it ships** (`INTENDED_USE.md` §10; the "FDA CDS guidance" trigger row in §6.3). Because these are usually code or architecture changes, the Boundary Owner co-signs with the technical maintainer, who confirms no device signal is ingested. This role may be held by the CCO or held separately; record which.

```
Non-Device CDS Boundary Owner
  Name / role                              : [TBD]
  Also the CCO?                            : [ ] yes   [ ] no
  Technical maintainer (co-sign on input /
    architecture change)                   : [TBD]
  Contact                                  : [TBD]
  Appointed (date)                         : [TBD]
```

#### Reviewer panel (advisory, domain-specific)

The CCO (or Deputy) convenes reviewers covering the tool's content domains. The minimum standing panel is **critical-care medicine + critical-care pharmacy + critical-care nursing**, with **geriatrics and/or psychiatry** input for medication, escalation, and antipsychotic content. Each reviewer holds current licensure and recognised expertise in the domain they sign for. Reviewers advise; final accountability and sign-off remain with the CCO. A change to an in-scope content domain **may not be signed off (§6.5) without the mapped reviewer's sign-off in addition to the CCO's.** Panel composition, disclosures, and recusals are recorded with each scheduled review (§6.2).

```
Reviewer panel (this cycle)
  Critical-care medicine  : [TBD — name, credentials]            COI on file: [ ]   recusals: [TBD / none]
  Critical-care pharmacy  : [TBD — name, credentials, e.g. BCCCP] COI on file: [ ]   recusals: [TBD / none]
  Critical-care nursing   : [TBD — name, credentials, e.g. CNS / educator] COI on file: [ ]  recusals: [TBD / none]
  Geriatrics / psychiatry : [TBD — name, credentials]            COI on file: [ ]   recusals: [TBD / none]
  Cycle / review date     : [TBD]
```

**Reviewer-to-content-domain mapping.** This binds the panel to the areas actually carried in the tool, including those revised on 2026-06-27.

| Content domain (tool sections) | Required reviewer(s) | Examples of what they sign for |
|---|---|---|
| Sedation depth — RASS target & gating (§2.3) | Critical-care medicine + nursing | The 0 to −2 default; the −3 to −4 indication-gated band; RASS −5 always flagged danger |
| Antipsychotics, dosing references, deliriogenic list, thiamine & melatonin (§2.7, §2.8, §2.6 "U") | Critical-care pharmacy (lead) + geriatrics/psychiatry | "Short-term agitation control only"; conventional/expert dose labelling; Beers / anticholinergic flags; ESPEN/EFNS/RCP thiamine divergence; melatonin re-anchoring |
| Instruments & provenance (§2.2, §2.4, §6.6) | Critical-care medicine (instrument lead) | CAM-ICU feature logic & Pictures-ASE wording; ICDSC; motor-subtype denominator; adult-ICU scope & redirects |
| Prevention bundle & non-pharmacologic care (§2.5, §2.6) | Nursing (lead) + critical-care medicine | ABCDEF elements; sleep/orientation measures; DELIRIUM(S) review prompts |
| Risk-factor tally & escalation prompts (§2.1) | Critical-care medicine + geriatrics | Flat +1 tally; geriatrics-consult prompt; removal of the score-triggered psychiatry suggestion |

**Quorum and decision rule.**

- A **scheduled (annual) full review** is quorate only with the CCO (or Deputy) **and** the core triad — critical-care medicine, pharmacy, and nursing; geriatrics/psychiatry is also required when any medication or escalation row is in scope.
- A **triggered / out-of-cycle review** (§6.3) is quorate with the CCO (or Deputy) **and** the reviewer(s) mapped to the affected domain(s).
- The CCO holds final accountability. Unresolved reviewer disagreement is recorded in the change-log row (§6.5), not silently overridden.

#### Conflict-of-interest disclosure & recusal

Because the tool carries drug selection, dosing references, and a deliriogenic-medication list — and may, in future, touch device feeds — every person who signs content or a boundary call (CCO, Deputy, Boundary Owner, and each reviewer) discloses relevant interests **before** signing: payments, consulting / advisory / speaker roles, equity, grants, royalties, or patents involving any pharmaceutical or medical-device manufacturer, and authorship of any cited source. "None" is a valid disclosure and is recorded. Disclosures are refreshed at each scheduled review (§6.2) and whenever they change. A declared interest does not bar panel membership; it bars signing the conflicted item. A conflicted individual **recuses** from signing the affected row — for example, anyone with ties to an antipsychotic, dexmedetomidine, or melatonin manufacturer recuses from the §2.7 / §2.8 drug-content sign-off — and the recusal and the substitute signer are noted in the change-log row (§6.5) and the register below.

```
Conflict-of-interest register
| Person (role)          | Date  | Relevant interests (pharma / device / cited-source authorship) | Affected items | Recusal / substitute |
|------------------------|-------|----------------------------------------------------------------|----------------|----------------------|
| [TBD — CCO]            | [TBD] | [TBD / none]                                                   | [TBD / n/a]    | [TBD / none]         |
| [TBD — Deputy CCO]     | [TBD] | [TBD / none]                                                   | [TBD / n/a]    | [TBD / none]         |
| [TBD — Boundary Owner] | [TBD] | [TBD / none]                                                   | [TBD / n/a]    | [TBD / none]         |
| [TBD — reviewer]       | [TBD] | [TBD / none]                                                   | [TBD / n/a]    | [TBD / none]         |
```

#### Term, renewal & succession (so the role survives turnover)

- **Term.** Default **2 years**, renewable. Reviewer terms are staggered so the whole panel never turns over at once.
- **Deputy at all times.** A Deputy is named whenever a CCO is in post. On a CCO vacancy the Deputy becomes acting CCO until a successor is appointed.
- **Continuity / fail-safe.** While there is no CCO and no acting Deputy, clinical content is **frozen** (see the vacancy rule above): no §6.5 rows are signed and no new clinical values ship until a qualified owner is in place; pending rows stay pending.
- **Handover.** The outgoing CCO records open items for the successor — unsigned §6.5 rows and open entries in the §6.6 modification register.
- **Retention.** Signed attestations, reviewer sign-offs, and the COI register are retained alongside the change log so the accountability trail is auditable.

#### Accountability map — which role attests to which held-to criterion

Each held-to property (a self-imposed standard, not a regulatory claim) has one answerable role and one place the attestation is recorded.

| Held-to criterion / property | Accountable role | Recorded in |
|---|---|---|
| Crit 1 — no device data stream (inputs stay manual) | Non-Device CDS Boundary Owner (+ technical maintainer) | §6.7 check; fresh device/non-device assessment on any input / autonomy / intended-use / distribution change |
| Crit 2 — displays medical info / cited reference material | CCO | §6.2 ledger; citation registry (§3) |
| Crit 3 — supports, does not direct | CCO | §6.7 check, logged in §6.2 / §6.5 |
| Crit 4 — basis independently reviewable (citation + tier visible) | CCO | §6.7 check; tiers per §6.4 |
| Evidence-grade / tier assignment (V / G / R / P) | CCO | §6.4 scheme; "Tier" column of the change log (§6.5) |
| Risk controls adequate, residual risk acceptable | CCO | `docs/HAZARD_ANALYSIS.md`; §6.5 sign-off |
| Conflict-of-interest disclosure & recusal | CCO, Deputy, Boundary Owner, each reviewer | COI register (above); refreshed each cycle (§6.2) |

#### Two governance layers — do not conflate them

| Layer | Who owns it | Where it lives | What it covers |
|---|---|---|---|
| Source-content governance | Clinical Content Owner + Non-Device CDS Boundary Owner + reviewer panel (this repo) | This document + the change log (§6.5) + the COI register | The evidence base: every instrument, threshold, band, cut-point, dose, citation, and grade shipped in the code, the risk controls they implement, and the device/non-device boundary the content is built against |
| Deployment-instance sign-off | The adopting unit's Medical Director / CNO | Setup tab fields, saved to that unit's local `settings.json` | One unit's local adoption: protocol version label, who approved *this deployment*, that unit's own review dates and footer |

The Setup-tab "Last Reviewed / Next Review Due" fields are the **local unit's** sign-off on its own configured protocol. They are not the source-content review and must not be read as evidence that the underlying clinical content — or the non-device boundary it is built against — was reviewed on those dates. The source-content review dates live in §6.2.

#### CCO sign-off attestation — content revision 2026-06-27

The 2026-06-27 clinical-content changes are recorded in §6.5 and currently carry `[CCO — pending]`. Until this attestation is signed, that revision is **unapproved content** and must be labelled as awaiting clinical sign-off in any deployment; adopters must not treat it as clinician-approved.

```
CCO sign-off attestation
  Revision                : 2026-06-27 (all §6.5 rows dated 2026-06-27)
  Signed by               : [TBD — CCO, or activated Deputy]   Name / credentials: [TBD]
  Attestation
    [ ] each listed clinical value, threshold, band, cut-point, dose, and citation
        has been reviewed against its cited source and is accurate as implemented;
    [ ] each affected risk control (docs/HAZARD_ANALYSIS.md) remains adequate and the
        residual risk is acceptable for a reference aid (not a validated device);
    [ ] each output still supports rather than directs and keeps its basis
        independently reviewable (CDS criteria 3-4, §6.7);
    [ ] in-app text (src/index.html, pdf.js) and this document agree (§6.5 "Synced?").
  Conflicts declared      : [TBD / none]
  Signature / record      : [TBD]
  Date signed             : [TBD]
  Effect on signing       : replace "[CCO - pending]" in each 2026-06-27 §6.5 row with the
                            signer's name and this date, and set §6.2 "Last full review"
                            accordingly. Until signed, the revision stays unapproved.
```

**Dated sign-off — 2026-06-27 §6.5 entries.** A domain may not be marked approved until both the CCO (or Deputy) and the mapped reviewer have signed. Record names and dates; `[ ]` until signed.

| Domain — §6.5 entries covered | Tier(s) | Mapped reviewer | CCO / Deputy sign-off (name, date) | Reviewer sign-off (name, date) | Status |
|---|---|---|---|---|---|
| Sedation depth — RASS target re-gated (0 to −2 default; −3 to −4 indication-gated; −5 always danger) | P (label/UX) + V (scale) | Critical-care medicine + nursing | [TBD] | [TBD] | [ ] pending |
| Antipsychotic stance; conventional/expert dosing labelling; deliriogenic-list delisting/flags/defaults; thiamine ESPEN/EFNS/RCP divergence (×2 entries); melatonin re-anchoring | G + P | Pharmacy (lead) + geriatrics/psychiatry | [TBD] | [TBD] | [ ] pending |
| Instruments & provenance — CAM-ICU Pictures-ASE /10 correction; motor-subtype denominator; adult-ICU scope panel + redirects + trimmed Setup selector | V + G | Critical-care medicine (instrument lead) | [TBD] | [TBD] | [ ] pending |
| Risk-factor tally flattened to +1; score-triggered psychiatry consult removed (geriatrics > 6 relabelled pragmatic) | P | Critical-care medicine + geriatrics | [TBD] | [TBD] | [ ] pending |

#### Appointment & sign-off register

Record each appointment and the review it covers; this is the auditable record of who held each role and when.

| Date | Role | Name / credentials | Action (appointed / renewed / stepped down / signed review or attestation) | Cycle / revision covered | Conflicts declared |
|---|---|---|---|---|---|
| [TBD] | CCO | [TBD] | [TBD] | [TBD] | [TBD] |
| [TBD] | Deputy CCO | [TBD] | [TBD] | [TBD] | [TBD] |
| [TBD] | Non-Device CDS Boundary Owner | [TBD] | [TBD] | [TBD] | [TBD] |
| [TBD] | Reviewer — critical-care medicine | [TBD] | [TBD] | [TBD] | [TBD] |
| [TBD] | Reviewer — critical-care pharmacy | [TBD] | [TBD] | [TBD] | [TBD] |
| [TBD] | Reviewer — critical-care nursing | [TBD] | [TBD] | [TBD] | [TBD] |
| [TBD] | Reviewer — geriatrics / psychiatry | [TBD] | [TBD] | [TBD] | [TBD] |

### 6.2 Review status — "last reviewed / next review due"

Maintain this block at the top of this document and update it at every scheduled or triggered review. `Next review due` is the **earlier** of the annual anniversary and the next expected source cycle (§6.3).

```
Content version    : 2026.06
Last full review   : pending first CCO clinical sign-off (content revised 2026-06-27 — see change log §6.5)
Next review due    : on first CCO sign-off, then earlier of annual anniversary or next source cycle (AGS Beers next edition expected ~2026)
Base cadence       : Annual full review, plus event-driven reviews on any in-scope source update (§6.3)
```

**Per-section review ledger.** A full review touches every row; a triggered review touches only the affected rows but the date is still logged so no section silently ages.

| Tool section (this doc) | Primary sources | Last reviewed | Reviewer |
|---|---|---|---|
| §2.1 Risk-factor tally | Pragmatic (non-validated); PRE-DELIRIC / E-PRE-DELIRIC as validated alternatives | [date] | [name] |
| §2.2 CAM-ICU | Ely 2001; CAM-ICU Worksheet/Manual; ICUDelirium monitoring | [date] | [name] |
| §2.3 RASS | Sessler 2002; Ely 2003 | [date] | [name] |
| §2.4 Motor subtype | la Cour 2022; Krewulak 2018; Hayhurst 2020 | [date] | [name] |
| §2.5 ABCDEF bundle | SCCM ICU Liberation; PADIS 2018/2025; Pun 2019; HELP; Hshieh 2015 | [date] | [name] |
| §2.6 DELIRIUM(S) mnemonic | ICUDelirium mnemonics; Maldonado 2018; Flaherty 2011 | [date] | [name] |
| §2.7 Treatment algorithm | PADIS 2018/2025; MIND-USA; Project BETA; NICE NG10 | [date] | [name] |
| §2.8 Medications & deliriogenic list | AGS Beers 2023; PADIS 2018/2025; MENDS2; haloperidol PI; Pro-MEDIC | [date] | [name] |

### 6.3 Review cadence — source-cycle triggers

The base cadence is an **annual full review**. In addition, any publication in the table below triggers an **out-of-cycle review** of the rows it governs, within the stated window. When a trigger fires, update the affected content *and its citation together* (per the project's hard invariant), log a change-log row (§6.5), and reset the relevant ledger dates (§6.2).

| Source | Governs (tool sections) | Cadence / what to watch | Action on update |
|---|---|---|---|
| **PADIS** (SCCM) — `padis2018`, `padis2025` | §2.5, §2.7, §2.8, dosing table, RASS target rationale | Irregular; full guideline 2018, focused update 2025. Watch SCCM for the next focused update or full revision | Re-review sedation/analgesia choice, antipsychotic stance, dexmedetomidine niche, and dose anchors; confirm "no recommendation for/against antipsychotics to treat delirium" still holds |
| **AGS Beers Criteria** — `beers2023` | §2.8 deliriogenic list, the ≥ 65 framing | ~Every 3 years (2023 current; next update expected ~2026 — watch JAGS) | Reconcile the 11-category / 103-agent list and anticholinergic flags against the new edition; bump the citation year |
| **CAM-ICU** — `ely2001`, `camicu_worksheet`, `camicu_manual`, `icudelirium_monitoring` | §2.2 (feature logic, SAVEAHAART, Pictures-ASE) | Instrument owned by Vanderbilt CIBS Center (Ely). Worksheet/Manual last rev. 2016. Watch icudelirium.org for worksheet/manual revisions and any change to the Pictures-ASE / ASE operationalisation | Re-verify the four-feature algorithm and cut-points are reproduced faithfully; confirm the Pictures-ASE remains the validated 10-item > 2/10 task |
| **RASS** — `sessler2002`, `ely2003` | §2.3 scale anchors, arousal gate | Scale is fixed/validated and stable; effectively no revision cadence. Watch only the procedural reference (`rass_mdcalc`) and PADIS-driven target-band guidance | Confirm the +4…−5 anchors are verbatim; the configurable target band is local, not part of the validated scale |
| **NICE** — `nice_cg103` (delirium), `nice_ng10` (violence/aggression) | §2.2, §2.5, §2.7 | NICE runs rolling surveillance; CG103 last updated 2023. Watch nice.org.uk for CG103/NG10 status changes | Re-review prevention and de-escalation/restraint content; update the "(updated YYYY)" designation |
| **FDA Clinical Decision Support guidance** (final, Jan 2026; 4-criterion non-device CDS structure) | Whole-tool design discipline; the §6.7 design gate | Watch FDA for revisions to the CDS guidance and adjacent software-function policy | Re-run the §6.7 non-device CDS design check against every output (supports-not-directs; basis independently reviewable) |
| **SCCM ICU Liberation pages** — `sccm_abcdef`; **ICUDelirium.org** Vanderbilt pages | §2.5, §2.6, §2.2 | Living web resources; no fixed cadence. Check at each annual review | Re-confirm bundle elements and mnemonic content match the current pages |
| **Thiamine (ESPEN / EFNS / RCP)** | §2.6 "U" domain (at-risk 100–300 mg/day; Wernicke EFNS 200 mg TID vs RCP 500 mg TID) | Now cited: `espen_icu`, `efns_wernicke`, `rcp_wernicke`. Guidelines diverge on the Wernicke dose and the evidence is low-certainty | On update, re-confirm the divergence note still reflects current ESPEN / EFNS / RCP (and BAP) guidance |
| **Fixed trials** — `mindusa2018` (MIND-USA), `mends2` (MENDS2), `promedic2022` (Pro-MEDIC), `pun2019`, `hshieh2015` | §2.7, §2.8 | No cadence (single studies). Watch only for a practice-changing replication or pooled analysis | If superseded, log the change and re-grade the affected recommendation |

### 6.4 Evidence-tier / grade scheme

Every numeric or directive output carries a tier so a reviewer can see at a glance whether it rests on a validated instrument, a guideline, a label, or a pragmatic choice. The tier is recorded in the change log (§6.5) and should be surfaceable to the clinician (citation + grade visible — FDA non-device CDS criterion 4).

| Tier | Meaning | Examples in this tool | Maintenance rule |
|---|---|---|---|
| **V — Validated instrument** | Published, psychometrically validated, reproduced faithfully | CAM-ICU, RASS, PRE-DELIRIC / E-PRE-DELIRIC (as referrals) | Reproduce verbatim. Any deviation from the source algorithm/cut-point must be re-tiered **P** and labelled as a modification (§6.6) |
| **G — Guideline recommendation** | From a society/national guideline; carry the source's own strength/certainty where stated | PADIS, NICE CG103/NG10, AGS Beers, SCCM ABCDEF | Track the guideline's GRADE strength + certainty; re-review on each guideline revision (§6.3) |
| **R — Regulatory / label** | Drug label or regulatory guidance | Haloperidol PI (boxed warnings, QTc), FDA CDS guidance | Update when the label/guidance changes |
| **P — Pragmatic / non-validated** | Home-grown; explicitly unvalidated | Risk-factor tally (flat +1 per factor, no weighting), band cut-points 0–3 / 4–6 / 7–10 / 11–16, geriatrics-consult > 6 escalation | **Must be flattened/relabelled or carry an explicit "pragmatic, not validated" note.** A P-tier number may never be presented as a calibrated score |

**Governing rule.** Anywhere the tool emits a number that drives an action (weighted scores, escalation thresholds, cut-points), that number is **P** unless it traces to a **V** instrument or a **G/R** source. P-tier numbers stay flattened or explicitly caveated; V-tier instruments stay faithful and attributed (§6.6).

### 6.5 Clinical-content change log

Record every change to a clinical value, threshold, band, dose, instrument logic, or citation. One row per change. The CCO signs each row. "App text synced?" confirms the in-app wording (`src/index.html`, `pdf.js`) and this methodology doc were updated together, so the cited number and the displayed number can never diverge.

**Columns:** `Date | Section/Item | What changed | Why (clinical rationale) | Source(s) | Tier/grade | Owner | App text synced?`

```
| Date | Section / item | What changed | Why | Source(s) | Tier | Owner | Synced? |
|------|----------------|--------------|-----|-----------|------|-------|---------|
```

**Entries — content revision 2026-06-27** (code, PDFs, and this document updated together; **pending CCO clinical sign-off** — fill the Owner cell on sign-off):

| Date | Section / item | What changed | Why | Source(s) | Tier | Owner | Synced? |
|---|---|---|---|---|---|---|---|
| 2026-06-27 | §2.1 Risk-factor tally weights | Flattened all factors to **+1** (removed the dementia +2); max 17 → 16 | A non-validated tally that weighted one factor implied a calibration the "unvalidated" framing disclaims | Pragmatic | P | [CCO — pending] | [x] |
| 2026-06-27 | §2.1 Escalation | Removed the score-triggered **psychiatry** suggestion (and the score-tied CAM-frequency); kept geriatrics > 6, relabelled "pragmatic" | Psychiatry follows clinical features, not a risk-factor count; the > 10 trigger was uncited | Pragmatic | P | [CCO — pending] | [x] |
| 2026-06-27 | §2.2 CAM-ICU — Pictures ASE | Corrected the on-screen wording from "5 cards" to the validated **10-item recognition** task (> 2/10); cut-point unchanged | `> 2/5` (40%) is not the validated `> 2/10` (20%) bar; the code already scored /10, so only the label was wrong | `camicu_worksheet`, `ely2001` | V | [CCO — pending] | [x] |
| 2026-06-27 | §2.4 Motor subtype | Reworded "~23% / ~50%" to *proportion of delirious cases* (hypo ~50 / mixed ~28 / hyper ~23), distinct from population prevalence | la Cour 2022 reports subtype distribution among delirious patients; ~31% overall (Krewulak 2018) is a different denominator | `lacour2022`, `krewulak2018` | G | [CCO — pending] | [x] |
| 2026-06-27 | §2.7 / §2.8 Antipsychotics | Reinforced "short-term agitation/safety control only — not a delirium treatment" on the SPA PDF and dosing-table banner | MIND-USA negative; PADIS gives no recommendation for/against antipsychotics to *treat* delirium | `mindusa2018`, `padis2025` | G | [CCO — pending] | [x] |
| 2026-06-27 | §2.6 "U" — thiamine | Cited the thiamine regimens and split the divergence: at-risk 100–300 mg IV/day (ESPEN); suspected Wernicke EFNS 200 mg IV TID vs RCP 500 mg IV TID × 2–3 days then taper (low-certainty; guidelines diverge) | One underpowered evidence base behind any Wernicke dose, so the honest signal is divergence, not a single number | `espen_icu`, `efns_wernicke`, `rcp_wernicke` | G | [CCO — pending] | [x] |
| 2026-06-27 | §2.6 "U" — thiamine (citation correction) | Corrected a mis-attribution found in review: 500 mg IV TID had been labelled EFNS, but EFNS is 200 mg TID (Galvin 2010); the 500 mg TID is RCP (Thomson 2002) and the at-risk range is ESPEN (Singer 2019). Dose unchanged — source labels fixed and verified against PubMed | Dose and citation must agree (regulatory-grade sourcing) | `efns_wernicke`, `rcp_wernicke`, `espen_icu` | G | [CCO — pending] | [x] |
| 2026-06-27 | §2.8 Deliriogenic list | Delisted **dexmedetomidine**; moved **metoclopramide** to GI/antiemetics; added *higher-risk* flags (benzodiazepines, strong anticholinergics, meperidine); defaulted the long tail off (opt-in); 104 → 103 agents | Dexmedetomidine contradicted the tool's own preferred-agent framing; the flat all-on list caused alert fatigue and lacked provenance | `padis2025`, `mends2`, `beers2023`, `acb_boustani` | G | [CCO — pending] | [x] |
| 2026-06-27 | §2.8 Melatonin (citation correction) | Re-anchored the "low-certainty ICU evidence" claim from a "(PADIS 2025)" label to the dedicated evidence (Pro-MEDIC RCT + 2025 ICU melatonin meta-analysis); softened the overstated SPA prompt to a low-certainty sleep benefit, not a delirium treatment | PADIS-2025 support for the melatonin claim was unconfirmed; the dedicated meta-analysis is the correct, verifiable anchor (found in review) | `promedic2022`, `melatonin_meta2025` | G | [CCO — pending] | [x] |
| 2026-06-27 | §2.8 Dosing references | Labelled the pharmacologic-options doses "conventional / expert starting references, not guideline-calibrated for delirium" (screen + PDF + methodology); noted dexmedetomidine is a sedative infusion, not a PRN antipsychotic-equivalent | None of these is a guideline-recommended delirium dose and the agents are not interchangeable — honest provenance | conventional/expert | P | [CCO — pending] | [x] |
| 2026-06-27 | §2.3 RASS target | Corrected the mislabeled "−2 to −3 (moderate sedation)" option to **−3 to −4 (deep — indication required)** (RASS −2 is light, −3 moderate); kept 0 to −2 (light) as the only savable/shareable default; added an indication-gated reason field + association-worded caution; made RASS −5 (unarousable) always danger | The "−2 to −3 (moderate)" label was wrong and gating it would block a legitimate light −2; the depth-harm evidence is association (observational + 1 small RCT + conditional PADIS), not causation; a deep target must not mask over-sedation | `sessler2002`, `ely2003`, `padis2018` | P (label/UX) + V (scale) | [CCO — pending] | [x] |
| 2026-06-27 | §2.2 / §4 Adult-ICU scope | Added a prominent (non-blocking) scope panel to the pathway picker with setting-specific redirects (ED → bCAM/4AT; ward → 3D-CAM/4AT; paeds → pCAM-ICU ≥5 / psCAM-ICU 6mo–5 / CAPD all-ages; pregnancy → adjust drug safety); kept ICDSC as the in-ICU alternative and trimmed the Setup screening-tool selector to CAM-ICU + ICDSC | CAM-ICU/RASS/ABCDEF are validated in the adult ICU only; the scope guidance was prose-only and the Setup selector implied ward/ED validity it did not drive | `ely2001`, `camicu_worksheet`, `icdsc_bergeron`, `padis2018` | V (instruments) + G | [CCO — pending] | [x] |

### 6.6 Instrument provenance & attribution

CAM-ICU and RASS are **validated, published instruments** with named authors. They must be attributed correctly and reproduced faithfully, and they must stay **visually and functionally separate** from the tool's home-grown risk-factor tally so no clinician conflates the unvalidated checklist with the validated screens.

**CAM-ICU (Confusion Assessment Method for the ICU).** Developed by E. Wesley Ely and colleagues, Vanderbilt University (CIBS Center / icudelirium.org); validated in `ely2001`. Operationalisation (worksheet, training manual, Pictures-ASE) per `camicu_worksheet`, `camicu_manual`, `icudelirium_monitoring`. Reproduce the four-feature algorithm and its cut-points without alteration. The Pictures-ASE is implemented as the validated 10-item recognition task scored `> 2/10` (20%) — the same cut-point as the 10-letter SAVEAHAART task — i.e. reproduced faithfully (tier V), with no tool-introduced cut-point deviation (corrected 2026-06-27; see §6.5).

**RASS (Richmond Agitation-Sedation Scale).** Developed by Sessler et al., 2002 (`sessler2002`); reliability/validity over time established by Ely et al., 2003 (`ely2003`). Reproduce the 10-point scale (+4 Combative … −5 Unarousable) verbatim. The **target band and colour zoning are a local, configurable, PADIS-informed overlay** — not part of the validated scale — and must remain visually distinct from the scale anchors so a configured target is never mistaken for a validated cut-point.

**Separation mandate.** The risk-factor tally (§2.1) is a non-validated count (tier P). It must not:
- adopt CAM-ICU or RASS visual styling, colour language, or results panel;
- be presented as a "score" without the "(not a validated score)" / "(heuristic)" qualifier the tool already carries;
- share a print block or PDF region with the CAM-ICU result in a way that implies a single validated output.

Any future UI change must preserve this separation. The instruments stay attributed and faithful (tier V); the tally stays flattened or explicitly caveated (tier P).

**Modification register.** Record here any place the tool deliberately departs from a source instrument, so reviewers can audit deviations at a glance.

| Instrument | Deviation | Tier | Disclosed where | Status |
|---|---|---|---|---|
| CAM-ICU | Pictures-ASE corrected to the validated 10-item > 2/10 task (no cut-point deviation) | V | §2.2, §6.5 | Resolved 2026-06-27 (pending CCO sign-off) |
| RASS | Configurable target band / colour zoning overlaid on the validated scale | P (overlay) | §2.3, Setup tab | Disclosed |

### 6.7 Non-device CDS design check (standing review gate)

At every scheduled and triggered review, re-verify each output still satisfies the design rubric the tool is held to — the FDA non-device CDS criteria (Cures Act §520(o)(1)(E); Jan-2026 final guidance). Two criteria bind the content design and are re-checked every cycle:

- **Supports, does not direct.** Each output offers options or complete information for the clinician to weigh, not a single push-button directive. No output instructs a specific action without surfacing alternatives and the "verify against local policy / prescriber & pharmacy review" framing.
- **Basis is independently reviewable.** For every threshold, band, cut-point, and dose, the clinician can see the citation and its tier/grade (§6.4), so they can independently review the basis rather than rely on the tool. P-tier numbers carry the "pragmatic, not validated" note; V-tier instruments carry their attribution (§6.6).

Record the outcome of this check in the review ledger (§6.2). A failed check is logged as a change-log row (§6.5) and remediated before the next release.

---

## 7. Pediatric tool (/peds/)

A sibling bedside reference for the pediatric ICU at `/peds/`, built on the same framework and held to the same rules. Clinical values are sourced and carry a clinician/pharmacy sign-off gate; pharmacologic content is off-label and limited-evidence. This section grows as the pediatric modules land — screening first.

### 7.1 Screening — arousal gate + CAPD / pCAM-ICU / psCAM-ICU

The user picks the validated screen for the child's age and developmental level; arousal is scored first as the gate.

**Arousal gate (all screens).** RASS **−4/−5** (or SBS **−2/−3**) = comatose → **"Unable to assess"**; screen once the child responds to voice (RASS ≥ −3). Same logic as the adult CAM-ICU gate (§2.2), carried into all three pediatric tools.

**CAPD (Cornell Assessment of Pediatric Delirium) — all ages (0–21 yr).** Eight-item observational nursing screen rated over the shift against age-expected behavior; each item 0–4 (total 0–32). Items 1–4 (eye contact, purposeful actions, awareness, communication) are reverse-scored (Never = 4 … Always = 0); items 5–8 (restless, inconsolable, underactive, slow to respond) are scored Never = 0 … Always = 4. **Cut point ≥ 9 = positive** (Traube 2014: sensitivity 94.1%, specificity 79.2%). **Developmental-delay caveat surfaced at the result:** specificity falls (~51% at ≥ 9) in baseline developmental delay — interpret against the child's own baseline and consider a higher cut point. The 0–32 score and positive/negative are withheld until all eight items are rated.

**pCAM-ICU (≥ 5 yr) and psCAM-ICU (6 mo–5 yr).** The CAM-ICU hierarchical algorithm, reused from the adult tool: **positive if Feature 1 AND Feature 2 AND (Feature 3 OR Feature 4)**, with the RASS arousal gate. pCAM-ICU uses verbal attention/command tasks (developmental age ≥ 5 yr); psCAM-ICU uses age-adapted observational tasks (6 mo–5 yr). The result is withheld until Features 1 and 2 (and a secondary feature) are answered.

**Citations mapped (pediatric Screening tab):** CAPD → Traube 2014 (Crit Care Med 2014;42(3):656–663; PMID 24145848; cut point 9, developmental-delay specificity 51.2%); pCAM-ICU → Smith 2011 (Crit Care Med 2011;39(1):150–157; PMID 20959783; developmental age ≥ 5 yr); psCAM-ICU → Smith 2016 (Crit Care Med 2016;44(3):592–600; PMID 26565631; 6 mo–5 yr); arousal scales → Curley 2006 (State Behavioral Scale; Pediatr Crit Care Med 2006;7(2):107–114) and Sessler 2002 / Kerson 2016 (RASS, adult + pediatric validation); screening practice → SCCM PANDEM 2022 (Pediatr Crit Care Med 2022;23(2):e74–e110).

**Sign-off status:** the CAPD scoring direction and cut point, the developmental-delay caveat, and the age/developmental boundaries that route a child to CAPD vs psCAM-ICU vs pCAM-ICU are **pending pediatric-clinician sign-off** before the pediatric tool is presented as reviewed.

### 7.2 Risk factors

A review aid listing reported associations — **not a validated predictive score** (no pediatric equivalent of PRE-DELIRIC is in routine bedside use). Factors are grouped modifiable vs patient/illness, each tagged by evidence strength; the clinician checks those that apply. No numeric score or band is computed or implied.

**Modifiable (review and minimize):** benzodiazepine exposure (the strongest, most consistent factor — dose-dependent, causal-effect estimate OR ≈ 3.3 from a marginal structural model, vs crude OR 4.4); deep sedation; anticholinergic cumulative burden; mechanical ventilation; physical restraints (partly confounded by indication); immobility / device tethering.

**Patient / illness:** young age (≤ 2 yr); developmental delay / baseline cognitive impairment; greater severity of illness; prior coma; prolonged PICU stay (both a risk marker and an outcome).

**Citations mapped (pediatric Risk tab):** Traube 2017 epidemiology & mortality (PMID 28288026 — independent predictors: age ≤ 2, developmental delay, severity, prior coma, mechanical ventilation, benzodiazepines, anticholinergics; delirium independently predicted mortality, aOR 4.39); Traube 2017 international point-prevalence (PMID 28079605, ~25%); Mody 2018 benzodiazepine causal effect (PMID 29727363 — the corrected reference; the earlier-guessed 29879008 resolves to an unrelated paper); SCCM PANDEM 2022 (PMID 35119438).

**Sign-off status:** the risk-factor list, the evidence-strength tags, and the benzodiazepine effect-size wording are **pending pediatric-clinician sign-off**.

### 7.3 Prevention bundle

The pediatric ABCDEF / PICU Liberation bundle, presented as a shift checklist with honest evidence framing: non-pharmacologic multicomponent prevention is first-line and routine pharmacologic prophylaxis is not recommended; bundle benefit is best established for mortality and care-process measures rather than a proven reduction in delirium incidence, with benzodiazepine minimization the best-supported single lever.

**Elements:** A — pain (FLACC/FACES/self-report); B — spontaneous awakening + breathing trials, protocolized titration, watch iatrogenic withdrawal (WAT-1); C — light goal-directed sedation (SBS −1 to 0), minimize benzodiazepines, prefer dexmedetomidine; D — screen ≥ each shift; E — developmentally appropriate early mobility; F — family engagement. Plus non-pharmacologic sleep/circadian protection, day–night normalization, sensory aids, and minimizing restraints and deliriogenic medications. Melatonin/pharmacologic sleep aids are noted as **not established** for pediatric delirium prevention.

**Citations mapped (pediatric Prevention tab):** SCCM PANDEM 2022 (PMID 35119438); SCCM Pediatric ICU Liberation collaborative — Ista 2023 (PMID 37125798; higher bundle utilization associated with lower mortality, not consistently lower delirium incidence — an observational collaborative, not a randomized bundle trial); RESTORE goal-directed sedation (Curley 2015, JAMA — **negative for its primary mechanical-ventilation-duration outcome**; cited only for the SBS-titration model, not an efficacy claim); PICU Up! early mobility (Choong et al., Trials 2023; **NCT04989790** — corrected from an earlier pilot-era registration); Mody 2018 benzodiazepine causal effect (PMID 29727363).

**Sign-off status:** the bundle elements, the SBS comfort-target wording, the "melatonin not established" statement, and the evidence-framing of bundle benefit are **pending pediatric-clinician sign-off**.

### 7.4 Pharmacology (Treatment + Medications)

**Framing (load-bearing):** treat the cause and apply the non-pharmacologic bundle first; drugs are adjunctive. Pharmacologic treatment of symptoms is reserved for short-term, refractory, safety-threatening agitation. All agents are **off-label** in pediatric delirium with **limited (retrospective/observational) evidence**; atypicals are generally preferred over IV haloperidol. The Medications tab opens with a prominent "not an order set — verify against formulary" banner, and every dose carries a pediatric-clinician + pharmacist sign-off gate. Doses are starting points from the literature, not orders; the numeric weight-based values must map to a current pediatric dosing reference (Lexicomp Pediatric / Harriet Lane), with the edition pinned at sign-off.

**Sedation / sleep.** Dexmedetomidine 0.2–1 mcg/kg/hr IV (preferred, delirium-sparing; loading bolus often omitted in the PICU; bradycardia/hypotension; taper to avoid rebound; off-label < 18 yr). Benzodiazepines — limit/avoid as continuous sedation (independent dose-related risk). Melatonin 0.5–3 mg (younger) up to 3–5 mg (older) for sleep/circadian support, **not** a delirium treatment.

**Antipsychotics (enteral unless noted).** Risperidone < 5 yr ~0.1 mg q12–24h, ≥ 5 yr ~0.2 mg q12–24h, ≤ 2 yr ~0.01–0.04 mg/kg/day (Campbell 2020). Quetiapine ~0.43–0.7 mg/kg/dose q8h, reported median ~1.3 mg/kg/day (Joyce 2015) — the previously-drafted unsourced "~6 mg/kg/day cap" was **removed**. Olanzapine age-banded (infants ~0.625 mg, toddlers ~1.25 mg, older ~2.5–5 mg). Haloperidol **reserve**, IV off-label: load ~0.025–0.1 mg/kg/dose, maintenance ~0.015–0.15 mg/kg/dose IV q6–8h — these are **per-dose** figures; an earlier draft's "~0.26 mg/kg/day mean" was a ~10× error (mis-reading a per-dose range maximum as a daily mean; the cited Capino mean is ~0.027 mg/kg/day) and was **corrected** before any publication.

**Monitoring (all antipsychotics).** Baseline 12-lead ECG (QTc), electrolytes, QT-drug review; act on QTc > 450–500 ms or ≥ 25% rise; watch EPS/dystonia (most with haloperidol), NMS, and metabolic effects (olanzapine/quetiapine highest).

**Citations mapped (pediatric Treatment + Medications tabs):** Capino 2020 (PMC7025750); Campbell 2020 risperidone ≤ 2 yr (PMID 31771334); Joyce 2015 quetiapine safety (PMID 26469214); Madden 2021 prescribing/outcomes (PMID 38571986); QTc-effects study (PMC7792149); pediatric ICU delirium systematic review (Pediatr Drugs 2025, PMID 40906237); Phan & Nahata dexmedetomidine (Pediatr Drugs 2008); SCCM PANDEM 2022 (PMID 35119438); plus a pinned pediatric dosing reference (Lexicomp Pediatric / Harriet Lane) for the numeric weight-based values.

**Sign-off status:** every weight-based dose, route, frequency, and maximum — and the haloperidol correction in particular — is **pending pediatric-clinician + pharmacist sign-off** and pinning to a dated dosing reference before the pediatric tool is presented as reviewed.

---

*This document describes the tool as implemented. Where the application's wording and this document differ, the in-application disclaimers and your institution's policy govern clinical use.*
