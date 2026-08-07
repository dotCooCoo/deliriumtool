# Clinical Methodology & Evidence Base

**Project:** Delirium Bedside Reference Tool (deliriumtool.com)
**Scope of this document:** An account of every clinical instrument, threshold, score band, and decision rule *as actually implemented in the application*, together with the primary-source citations each maps to, so clinicians, pharmacists, and quality reviewers can audit the evidence base directly.

## Contents

- [1. Intended use, and what this tool is *not*](#1-intended-use-and-what-this-tool-is-not)
- [2. Instruments implemented](#2-instruments-implemented)
  - [2.1 Risk-factor tally (admission / q24h)](#21-risk-factor-tally-admission--q24h)
  - [2.2 CAM-ICU (Confusion Assessment Method for the ICU)](#22-cam-icu-confusion-assessment-method-for-the-icu)
  - [2.3 RASS (Richmond Agitation-Sedation Scale)](#23-rass-richmond-agitation-sedation-scale)
  - [2.4 Delirium motor subtype](#24-delirium-motor-subtype)
  - [2.5 ABCDEF / ICU Liberation prevention bundle](#25-abcdef--icu-liberation-prevention-bundle)
  - [2.6 DELIRIUM(S) mnemonic (causative-factor review)](#26-deliriums-mnemonic-causative-factor-review)
  - [2.7 Treatment algorithm](#27-treatment-algorithm)
  - [2.8 Medication tables and deliriogenic-medication list](#28-medication-tables-and-deliriogenic-medication-list)
  - [2.9 Printable bedside templates (/templates/)](#29-printable-bedside-templates-templates)
  - [2.10 Pediatric bedside card set & PICU workflow poster (/templates/)](#210-pediatric-bedside-card-set--picu-workflow-poster-templates)
  - [2.11 Emergency-department screening tool (/ed/)](#211-emergency-department-screening-tool-ed)
  - [2.12 Emergency-department bedside card set & ED workflow poster (/templates/)](#212-emergency-department-bedside-card-set--ed-workflow-poster-templates)
  - [2.13 Adult step-down / progressive-care screening tool (/stepdown/)](#213-adult-step-down--progressive-care-screening-tool-stepdown)
  - [2.14 Adult step-down bedside card set & workflow poster (/templates/)](#214-adult-step-down-bedside-card-set--workflow-poster-templates)
- [3. Citation registry](#3-citation-registry)
  - [Adult ICU tool](#adult-icu-tool)
  - [Emergency-department tool (/ed/)](#emergency-department-tool-ed)
  - [Pediatric ICU tool (/peds/)](#pediatric-icu-tool-peds)
  - [Adult step-down / progressive-care tool (/stepdown/)](#adult-step-down--progressive-care-tool-stepdown)
- [4. Known limitations](#4-known-limitations)
- [5. Questions for clinical reviewers](#5-questions-for-clinical-reviewers)
- [6. Maintenance & provenance](#6-maintenance--provenance)
  - [6.1 Adoption, licensing, and responsibility](#61-adoption-licensing-and-responsibility)
  - [6.2 Content version & change history](#62-content-version--change-history)
  - [6.3 Review cadence: source-cycle triggers](#63-review-cadence-source-cycle-triggers)
  - [6.4 Evidence-tier / grade scheme](#64-evidence-tier--grade-scheme)
  - [6.5 Clinical-content change log](#65-clinical-content-change-log)
  - [6.6 Instrument provenance & attribution](#66-instrument-provenance--attribution)
  - [6.7 Non-device CDS design principles](#67-non-device-cds-design-principles)
- [7. Pediatric tool (/peds/)](#7-pediatric-tool-peds)
  - [7.1 Screening: arousal gate + CAPD / pCAM-ICU / psCAM-ICU](#71-screening-arousal-gate--capd--pcam-icu--pscam-icu)
  - [7.2 Risk factors](#72-risk-factors)
  - [7.3 Prevention bundle](#73-prevention-bundle)
  - [7.4 Pharmacology (Treatment + Medications)](#74-pharmacology-treatment--medications)

---

## 1. Intended use, and what this tool is *not*

This is a **reference aid only**. It supports — and does not replace — clinical judgment, local protocol, and prescriber/pharmacy review. It is **not a standalone order set** and **not a validated clinical decision-support device**. All medication decisions must be verified against current institutional policy.

These statements are surfaced to the user throughout the application:

- The persistent banner above every tab reads: *"Reference aid only. This tool supports — and does not replace — clinical judgment, local protocol, and prescriber/pharmacy review. It is not a standalone order set or a validated decision-support device. Verify all medication decisions against current institutional policy."*
- Every generated PDF and printable sheet carries a footer: *"Reference aid only. These sheets support — and do not replace — clinical judgment, local protocol, and prescriber/pharmacy review. They are not a validated decision-support device or an order set. Verify all medication content against your formulary before use."*
- The Medications tab states plainly: *"No agent has FDA approval for delirium treatment."*

**Setting.** The tool is ICU-focused. It is built around CAM-ICU, RASS, and the ABCDEF/ICU Liberation bundle. The application advises: *"on the ward, use a ward-validated screen (4AT / 3D-CAM)."* The CAM-ICU, RASS, and ABCDEF elements are not validated for, and should not be transplanted unmodified onto, general-ward populations.

**Data handling.** The tool runs entirely in the browser. The assessment is a session scratchpad: it clears on reload and is never written to browser storage. Saving or handing off an assessment is an explicit JSON export. Protocol-governance settings are stored locally. No patient data is transmitted or persisted server-side.

---

## 2. Instruments implemented

Each subsection documents the instrument, the exact logic/thresholds *as implemented*, and the primary-source citation IDs (see the registry in §3 for full citations).

### 2.1 Risk-factor tally (admission / q24h)

A **count of present risk factors**. In the UI subtitle, the score caption, and the band caption, the application states that this is *"a count of present risk factors (not a validated score)"* and *"a checklist tally, not a validated prediction score."* For a validated ICU model it directs users to **E-PRE-DELIRIC** (at admission) or **PRE-DELIRIC** (after 24 h).

**Scoring:** 15 checkboxes, maximum **15 points**. Every factor scores **+1**: a flat checklist count with no weighting. (The earlier +2 on dementia was removed so a non-validated tally cannot imply a calibration it does not have; **mechanical ventilation was removed** in the 2026-07-01 revision because PADIS 2018 reports strong evidence it does not alter delirium risk and it appears in none of the cited prediction models.)

| Group | Factor (points) |
|---|---|
| Predisposing — Cognitive/Psychiatric | Dementia / cognitive impairment (+1); Prior delirium episode (+1); Depression / psychiatric history (+1) |
| Predisposing — Functional/Sensory | Visual impairment (+1); Hearing impairment (+1); Functional dependence / immobility (+1) |
| Predisposing — Demographics/Comorbidities | Age ≥ 70 (+1); Severe illness (high APACHE-II — no numeric cutoff is stated by the cited sources) (+1); Dehydration / poor nutrition (+1); Alcohol / substance use disorder (+1) |
| Precipitating | Surgery / general anesthesia (+1); Physical restraints in use (+1); Urinary catheter (+1); Metabolic abnormality (+1); Sleep / circadian disruption (+1) |

**Band boundaries and actions** (range 0–15):

| Score | Band | Guidance | Escalation logic |
|---|---|---|---|
| 0–3 | Few risk factors | Maintain baseline prevention measures | Standard prevention + routine CAM |
| 4–6 | Several risk factors | Enhanced ABCDEF bundle · monitor closely | Initiate full ABCDEF bundle |
| 7–10 | Many risk factors | Full bundle · consider geriatrics input (per local protocol) | Geriatrics suggested when score > 6 (pragmatic, non-validated threshold) |
| 11–15 | Very many risk factors | Full bundle · consider geriatrics input (per local protocol) | No score-triggered psychiatry — psychiatry is indicated by clinical features (diagnostic uncertainty, refractory agitation, comorbid psychiatric illness), not by a risk-factor count |

The band cut-points are labelled *"(heuristic)"* in the interface.

**Citations mapped (Risk tab):** `predeliric2012`, `epredeliric2015` (cited inline as the validated alternatives); supporting reference list also carries `zaal2015` (ICU risk-factor systematic review), `inouye1993`, `marcantonio1994`, `inouye_charpentier1996`, `rudolph2009` (cardiac-surgery prediction rule), `pisani2009`, `snigurska2023` (prediction-model risk-of-bias caveat), `nice_cg103`, `padis2018`. **Item-level provenance** (2026-07-01 verification): dementia/cognitive impairment, visual impairment, severe illness, dehydration/nutrition, age, alcohol use, functional dependence, surgery, restraints, urinary catheter, and metabolic abnormality map to the prediction-model sources (Inouye 1993/1996, Marcantonio 1994, PRE-/E-PRE-DELIRIC, PADIS 2018 risk-factor tables); **prior delirium episode, depression/psychiatric history, hearing impairment, and sleep/circadian disruption are clinically recognized factors carried on the strength of NICE CG103's risk-factor enumeration and (for sleep) the PADIS 2018 sleep section rather than any cited prediction model**. They are unweighted +1 prompts in an explicitly pragmatic tally. **Mechanical ventilation was removed**: PADIS 2018 states sex, opioid use, and mechanical ventilation "have been strongly shown NOT to alter the risk of delirium occurrence," and no cited model includes it. All factors count +1 (a flat checklist); the band cut-points are pragmatic, which is why the tool routes clinicians to the validated models (E-PRE-DELIRIC / PRE-DELIRIC). The geriatrics-consult threshold is likewise a pragmatic, non-validated prompt; there is no score-triggered psychiatry suggestion.

### 2.2 CAM-ICU (Confusion Assessment Method for the ICU)

Implemented as the standard four-feature algorithm with an arousal gate. Performed once per shift and with any acute mental-status change.

**Decision logic:**

1. **Level of consciousness first (two-step assessment).** The instrument's Step 1 is the RASS. The tool returns **no verdict until a RASS is documented** (the result stays "Incomplete" with a "document the RASS first" prompt). If RASS is **−4 or −5**, the result is **"Unable to assess"** (patient too sedated); the tool instructs re-assessment when RASS ≥ −3 (`camicu_manual` p.6).
2. **Feature 1: Acute onset or fluctuating course** *(required)*. Acute change from the mental-status baseline, OR **fluctuation in mental status in the past 24 hours** (e.g., on RASS/GCS or a previous delirium assessment; the worksheet's 24-hour window, not "during the day"). The baseline is anchored from family/collateral **or the H&P**, and a normal baseline may be presumed in a younger patient admitted from home with no known neurocognitive disease (`camicu_manual` p.9); **documented 24-hour fluctuation satisfies Feature 1 even when no baseline informant is available**. The two questions are an OR, so Feature 1 is never blocked on collateral (the on-page tip previously said Feature 1 "cannot be scored without" a collateral-anchored baseline, which was stricter than the instrument; corrected (see §6.5).
3. **Feature 2: Inattention** *(required)*. Letters task ("SAVEAHAART", 10 letters, ~1 every 3 s; squeeze on each "A"). **Cut-point: > 2 errors = positive** (error entry constrained to 0–10). The **Pictures ASE** alternative is the validated 10-item recognition task (show 5 pictures to memorise, then 10 recognition pictures, yes/no), **scored out of 10 with the same > 2-error cut-point**. The threshold is equivalent across modalities. (The on-screen text previously described it loosely as "5 cards," which has been corrected to the validated /10 form; cited to `camicu_worksheet`.)
4. **Feature 3: Altered level of consciousness.** **Positive if the actual RASS is anything other than alert and calm (zero)**; negative only at RASS 0; the current worksheet's operationalisation (`camicu_worksheet`; the CAM-ICU is only performed at RASS ≥ −3). Feature 3 is read directly from the RASS documented in the same panel (there is no separate control to enter), so it can never contradict the documented arousal. (The earlier descriptor form, Alert vs Vigilant/Lethargic/Stuporous, the Ely-2001 Table-1 wording, was replaced with the worksheet criterion; see §6.5/§6.6.)
5. **Feature 4: Disorganized thinking.** Four yes/no questions plus the command, worded per the worksheet: "Hold up this many fingers" (2 shown), then "Now do the same thing with the other hand" (**do not repeat the number of fingers**); the "add one more finger" variant applies **only if the patient cannot move both arms**. **Positive if combined errors > 1.**

**Result rule (displayed and enforced):** **Positive if Feature 1 AND Feature 2 AND (Feature 3 OR Feature 4)**, evaluated only once a RASS is documented (Step 1). Features 1 and 2 must both be answered before any result; if either is absent the screen is Negative; if 1 and 2 are positive but both secondary features are assessed and negative the screen is Negative; otherwise "Incomplete" until a secondary feature is assessed.

The result panel reinforces that *"A positive CAM-ICU is a screen, not a diagnosis: confirm clinically and exclude mimics,"* and provides a delirium-vs-mimics differential (dementia, depression, receptive aphasia/focal stroke, non-convulsive seizures, catatonia, intoxication/withdrawal). **ICDSC** (`icdsc_bergeron`) is the validated adult-ICU alternative screen. PADIS endorses CAM-ICU and ICDSC, and the Setup "Screening Tool" selector offers these two. CAM-ICU is validated for the adult ICU only; the pathway picker carries a prominent scope panel directing out-of-ICU users to the setting-appropriate validated tool (§4, item 2).

**Citations mapped (CAM tab):** `inouye1990` (the parent CAM), `camicu_worksheet`, `camicu_manual`, `ely2001`, `ely2003`, `sessler2002`, `icdsc_bergeron`, `dsm5tr` (the diagnostic reference standard), `hayhurst2016`, `icudelirium_monitoring`, `nice_cg103`. (CAM-ICU validation → `ely2001`; worksheet/Pictures-ASE operationalisation → `camicu_worksheet`, `icudelirium_monitoring`; baseline sources and the agitated-patient / UTA rules → `camicu_manual`; accuracy limitations → `hayhurst2016`.)

### 2.3 RASS (Richmond Agitation-Sedation Scale)

**Range:** the full **+4 to −5** scale (+4 Combative, +3 Very Agitated, +2 Agitated, +1 Restless, 0 Alert & Calm, −1 Drowsy, −2 Light Sedation, −3 Moderate Sedation, −4 Deep Sedation, −5 Unarousable).

**Target band:** **0 to −2** (light sedation; the ICU default, and the only target savable/shareable as a default). The Setup tab also offers *0 to −1 (general ward)* and a deeper *−3 to −4 (deep: indication required)* band. The deep band is **indication-gated**: selecting it reveals a required "indication for deeper sedation" field and a caution that deeper sedation is *associated with* longer ventilation, more delirium, and higher mortality (observational evidence + one small RCT; PADIS conditional, low-certainty). (RASS −2 is *light* sedation and −3 *moderate* per the scale anchors, so the earlier "−2 to −3 (moderate sedation)" label was corrected. A light −2 target is never gated.)

**Colour/zoning of the RASS strip: follows the configured target band.** Green (at target) = every RASS inside the configured band; amber (caution) = restless/agitation short of intervention and the level one step off-goal; red = marked agitation (+2/+3/+4) and over-sedation (≥ 2 levels below the band); **RASS −5 (unarousable) is always red**, regardless of the configured target, so a deep target cannot mask an over-sedated patient. For the 0 to −2 default this is green 0/−1/−2, amber +1 and −3, red +2/+3/+4 and −4/−5. The patient-RASS dropdown's ✓ TARGET markers and the printed `[TARGET]` rows are driven by the same band, so a reconfigured target stays consistent on screen and in the PDF. RASS −4/−5 also triggers the CAM-ICU "unable to assess" gate (§2.2). Per-level advisory prompts are provided and were source-aligned in the 2026-07-01 revision: agitation prompts are non-pharmacologic-first (pharmacologic control reserved for danger to the patient or staff, per PADIS 2018); reassessment intervals defer to unit protocol (no interval is source-defined); −4 states the *association* between deeper sedation and delirium/delayed extubation/mortality (PADIS 2018 observational evidence) with daily reassessment/SAT unless deeper sedation is indicated; −5 carries the instrument's stop-and-recheck directive (CAM-ICU unable to assess) with neurologic evaluation only when unresponsiveness is unexplained by sedation.

**Citations mapped:** `sessler2002` (original RASS validation), `ely2003` (RASS reliability/validity over time in ICU), with `rass_mdcalc` available in the registry as a scoring-procedure reference.

### 2.4 Delirium motor subtype

A three-option classifier (Hyperactive / Hypoactive / Mixed) with teaching notes. The percentages are the **proportion of patients *with* delirium by motor subtype** (la Cour 2022: hypoactive 50.3% / mixed 27.7% / hyperactive 22.7%). This is **not** the population prevalence of delirium (Krewulak 2018: ~31% overall, a different denominator). The on-screen and PDF wording now states this denominator explicitly and avoids the bare word "prevalence."

| Subtype | Description (proportion of delirious cases — la Cour 2022) |
|---|---|
| Hyperactive | "~23% of delirious cases, least common"; agitation, line-pulling, combativeness |
| Hypoactive | "~50% of delirious cases, most common"; somnolence, reduced responsiveness; "frequently missed and associated with poor outcomes" |
| Mixed | "~28% of delirious cases"; alternating features; "associated with the longest duration and length of stay" |

**Citations mapped (Mnemonic tab reference list):** `lacour2022` (motor-subtype distribution scoping review, the source of the proportions), `krewulak2018` (overall-prevalence meta-analysis, the distinct population denominator), `hayhurst2020` (subtype and post-critical-illness cognition). The figures are approximate, drawn from these cited reviews rather than exact single-source constants.

### 2.5 ABCDEF / ICU Liberation prevention bundle

Non-pharmacologic, first-line for all patients, documented each shift. A live completion percentage and per-letter status indicator are computed from the checked items.

| Letter | Element | Notable embedded logic |
|---|---|---|
| **A** | Assess, Prevent & Manage Pain | NRS if able to self-report; CPOT/BPS if not |
| **B** | Both SAT & SBT | Includes a full SAT/SBT safety screen and failure criteria (SAT contraindications; SAT failure → restart sedation at **half** prior dose; SBT proceed criteria SpO₂ ≥ 88% on FiO₂ ≤ 50% & PEEP ≤ 7.5 — the ABC-trial screen; SBT failure → resume full ventilatory support, half-dose sedation restart if needed; re-screen in 24 h), cited inline to `girard2008` + `icudelirium_satsbt`. (An earlier revision printed "pH > 7.15", which appears in no ABC-trial primary source — removed 2026-07-01.) |
| **C** | Choice of Analgesia & Sedation | **eCASH** framing (Vincent 2016); target RASS 0 to −2; benzodiazepines minimized, a non-benzodiazepine sedative preferred — in ventilated adults consider dexmedetomidine over propofol when light sedation, delirium reduction, or agitation preventing weaning is a priority (PADIS 2025 conditional, `padis2025`); analgesia-first; bolus over continuous infusion labelled an observational association (Kollef 1998 — PADIS classifies intermittent-vs-continuous as an evidence gap) |
| **D** | Delirium: Assess, Prevent & Manage | CAM-ICU this shift; RASS documented; precipitants addressed; family education |
| **E** | Early Mobility & Exercise | Safety screen ("reddest parameter wins") covering respiratory/cardiovascular/neuro/lines, then a 5-step progression (passive ROM → active ROM → sit/edge of bed → stand/transfer → ambulate) |
| **F** | Family Engagement & Empowerment | Presence, education, familiar objects/T-A-D-A, glasses/hearing aids, music |

A separate **Sleep & Orientation Measures** card (quiet-hours, eye mask/earplugs, orientation board, clustered cares, clock/calendar, reorientation, oral care/hydration) accompanies the bundle.

**Citations mapped (Bundle tab):** `sccm_abcdef`, `pun2019` (ICU Liberation Collaborative, >15,000 adults), `marra2017`, `balas2014`, `padis2018`, `padis2025`, `inouye1999` (HELP RCT), `hshieh2015` (non-pharm meta-analysis), `icudelirium_satsbt`, `schweickert2009` (early-mobility RCT, the element-E efficacy trial), `hodgson2014` (mobilization safety criteria, cited inline at element E), `nice_cg103`. **eCASH is cited inline to `ecash2016` (Vincent 2016, the concept paper) plus `padis2018`** (which carries the analgesia-first / light-sedation content); the bolus-over-continuous item is cited to `kollef1998` and labelled an observational association; eye mask/earplugs to `padis2018`. (An earlier revision cited eCASH to `padis2025`, which contains no eCASH or analgesia-first recommendation; corrected, see §6.5.)

### 2.6 DELIRIUM(S) mnemonic (causative-factor review)

Nine review domains, each with a "Reviewed" toggle, a prompt, and a free-text action field; a progress strip tracks domains reviewed.

| Letter | Domain | Prompt highlights |
|---|---|---|
| **D** | Drugs / Withdrawal | Deliriogenic agents; dose reduction; alcohol/benzo/opioid withdrawal — in the ICU titrate to an objective scale such as RASS; CIWA-Ar needs an awake, communicative, non-delirious patient (`asam2020`) |
| **E** | Eyes / Ears (sensory deficits) | Glasses & hearing aids; other sensory deficits (environment prompts live under Dr. DRE per the cited source) |
| **L** | Low O₂ states | SpO₂, Hgb; MI, stroke, pulmonary embolism (liver function reviews under M — Metabolic) |
| **I** | Infection | Fever, leukocytosis, cultures, occult sepsis |
| **R** | Retention | Urinary retention/constipation; bladder scan; disimpact/catheterize |
| **I** | Ictal / Seizure | Non-convulsive seizures/status; consider EEG with unexplained ↓LOC |
| **U** | Under-hydration / Nutrition | Volume/electrolytes; **parenteral thiamine promptly in at-risk patients — do not delay glucose for hypoglycemia** (ASAM 2020: either order or concurrent, `asam2020`; EFNS still advises thiamine before carbohydrate, a disclosed guideline divergence) — at-risk 100–300 mg IV daily (`espen_icu`); suspected Wernicke, guidelines diverge (low-certainty): EFNS 200 mg IV TID (`efns_wernicke`) or RCP 500 mg IV TID × 2–3 days then 250 mg taper (`rcp_wernicke`) |
| **M** | Metabolic | Na, Mg, Ca, glucose, BUN/Cr, acid-base, liver function |
| **(S)** | Subdural / Sleep | Subdural hematoma (fall/anticoagulation); sleep deprivation |

**Citations mapped:** `icudelirium_mnemonics` (the Vanderbilt DELIRIUM(S) differential), `flaherty2011`, `maldonado2018` (delirium pathophysiology), `inouye_charpentier1996` (precipitating-factor model), `asam2020` (thiamine/glucose ordering; withdrawal-scale selection), `espen_icu` / `efns_wernicke` / `rcp_wernicke` (the at-risk and divergent Wernicke thiamine regimens), plus the subtype sources `lacour2022`, `krewulak2018`, `hayhurst2020`.

### 2.7 Treatment algorithm

Applies when CAM-ICU is positive. The governing principle is *"Non-pharmacological interventions are the cornerstone of treatment. Pharmacologic therapy is reserved for patient safety concerns only."*

**Visual decision tree:** entry for the acutely agitated patient (RASS +2 to +4: the entry node states that agitation does **not** make a patient "unable to assess": CAM-ICU is still performed, a patient too agitated to participate scores inattentive, and UTA is reserved for RASS −4/−5, `camicu_manual` pp.5-6/12/20; an earlier wording implied CAM-ICU "may read unable to assess" in the agitated patient; corrected, see §6.5) → rule out/treat reversible causes (pain, hypoxia, hypoglycaemia, alcohol/benzo withdrawal, urinary retention, new deliriogenic med) → **verbal de-escalation first** → branch on CAM-ICU result (Negative → continue prevention; Unable to assess at RASS −4/−5 → re-screen when RASS ≥ −3; Positive → management) → **Dr. DRE** (Diseases, Drug removal, Remove Environmental contributors) → intensify ABCDEF → safety-risk decision determining whether short, lowest-dose pharmacotherapy is warranted.

**Working checklist (Steps 1–3):**

- **Step 1. Identify & treat the underlying cause:** electrolytes; occult infection/sepsis (CBC, cultures, UA when clinically indicated; do not attribute delirium to asymptomatic bacteriuria, `nicolle2019`); oxygenation/ventilation; retention/constipation/pain; **alcohol/benzo withdrawal titrated to an objective scale (RASS)** (*"CIWA-Ar is not validated in intubated / sedated / delirious patients"*; ASAM 2020 recommends objective scales (CAM-ICU, DDS, RASS, MINDS) in withdrawal delirium and names RASS for ICU monitoring, `asam2020`); brain imaging if focal neuro signs.
- **Step 2. Intensify non-pharmacologic measures:** full ABCDEF; family/volunteer presence; 1:1 sitter if active safety risk; geriatric/psychiatric consult.
- **Step 3. Pharmacologic (safety indication only):** antipsychotics *"have not been shown to treat or shorten delirium (MIND-USA negative; PADIS 2025: unable to recommend for or against)"*. The no-demonstrated-benefit clause is anchored to `mindusa2018` and the no-recommendation clause to `padis2025`, on screen and in the PDFs (the earlier categorical "do not treat or shorten" asserted more than the evidence: PADIS 2025's pooled estimates are equivocal, so the verb was softened on every surface; see §6.5); requires documented safety indication, baseline QTc (haloperidol caution if > 500 ms), lowest effective dose, daily reassessment for discontinuation, **no scheduled antipsychotics at discharge without a psychiatric indication**, and a "do NOT stop abruptly" list (benzodiazepines, opioids, SSRIs, steroids, antiepileptics, dexmedetomidine).

**Supporting frameworks:** **T-A-D-A** (Tolerate / Anticipate / Don't Agitate; Flaherty & Little 2011, `flaherty_little2011`); a **7-step Nurse Care Pathway** (1 Deter · 2 Detect · 3 Do (Acute) · 4–6 Daily · 7 Discharge); and a note that restraints are the last resort after de-escalation, environment, device removal, and 1:1 observation: least-restrictive option, re-evaluated per institutional policy, discontinued at the earliest possible time (`nice_ng10`; NG10 itself sets shorter review intervals for restrictive interventions rather than a daily rule, which is why the earlier "re-evaluate daily" wording was dropped).

**Citations mapped (Treatment tab):** `projectbeta` (verbal de-escalation, APA Project BETA: inline at the de-escalation node; "≥ 2 arms' lengths" per Richmond 2012), `icudelirium_mnemonics` (Dr. DRE: the mnemonic is a Vanderbilt CIBS teaching aid; it does not appear in Hayhurst 2016, to which it was previously miscited), `flaherty_little2011` (T-A-D-A), `awissi2013` (no withdrawal scale, including CIWA-Ar, is validated in ICU patients; the claim previously carried only the MDCalc scale link), `asam2020` (objective withdrawal monitoring in delirium; CIWA-Ar prerequisites), `ciwa_mdcalc` (CIWA-Ar scale reference), `nicolle2019` (asymptomatic bacteriuria in delirium: observe, work up other causes), `padis2025` / `padis2018` (antipsychotic stance and prevention), `mindusa2018` (haloperidol/ziprasidone RCT), `nice_ng10` (restraints / management of aggression), `hshieh2015`, `balas2014`.

### 2.8 Medication tables and deliriogenic-medication list

**Pharmacologic options table (safety indication only), doses as shown:**

| Drug | Typical dose | Key notes (abridged) |
|---|---|---|
| Haloperidol | 0.25–0.5 mg q4–6h PRN; lowest effective dose, cap per local protocol | Elderly more sensitive (EPS/QTc); ECG baseline; QTc caution > 500 ms; avoid Parkinson/Lewy; dementia-mortality boxed warning; IV route off-label (higher QT/Torsades); stop & escalate if NMS |
| Quetiapine | 12.5–25 mg q12h PO; lowest dose, shortest duration | Sedating; orthostatic hypotension; QTc prolongation; antipsychotic-class boxed warning |
| Dexmedetomidine | 0.2–0.7 mcg/kg/hr IV infusion — the label's ICU-sedation maintenance range (`dex_label`) | In ventilated adults: agitation precluding weaning/extubation (PADIS 2018, conditional); or where light sedation/delirium reduction is the highest priority — suggested over propofol (PADIS 2025 Rec 2). A2B RCT caveat (`a2b2025`): no extubation benefit vs propofol, more agitation and severe bradycardia — reserve the preference for the delirium/light-sedation priority. Monitor bradycardia/hypotension |
| Lorazepam *(specific use)* | Symptom-triggered per institutional withdrawal protocol | Rescue / alcohol withdrawal **only** — may worsen delirium; in delirious / intubated / sedated ICU patients monitor withdrawal with an objective scale (RASS, CAM-ICU, MINDS), not CIWA-Ar (`asam2020`, `awissi2013`) |
| Melatonin | 0.5–3 mg nightly — labelled conventional sleep dosing, **not drawn from the cited trials** (Pro-MEDIC used 4 mg; cited ICU trials 3–5 mg; PADIS 2025 makes no dose recommendation) | PADIS 2025 conditionally suggests melatonin in adult ICU patients (low certainty; may reduce delirium prevalence and improve perceived sleep) (`padis2025`); the largest RCT (Pro-MEDIC) was negative (`promedic2022`, `melatonin_meta2025`); not a treatment for established delirium. Ramelteon is named by PADIS 2025 as the FDA-regulated melatonin-receptor-agonist alternative |

These doses are **conventional / expert starting references** for short-term agitation control, **not RCT- or guideline-calibrated doses for delirium** (no agent is guideline-recommended to treat delirium): haloperidol low-dose is off-label, quetiapine 12.5–25 mg is a conservative starting fraction, and dexmedetomidine 0.2–0.7 mcg/kg/hr is a **sedative infusion for ventilated patients, not a PRN antipsychotic-equivalent**. The three are not interchangeable.

**Deliriogenic-medication review list:** **11 categories containing 103 individual agents**, each independently toggleable. The three classes with the strongest / most-actionable ICU delirium signal (**benzodiazepines, opioids, and anticholinergics**) are **enabled by default**; the rest of the list is available but **off by default (opt-in)** to reduce alert fatigue. Toggling an agent adds/removes it from the printed documents.

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

The list is explicitly framed as *"a medication-review prompt, not a list of equally harmful drugs"*: risk varies by agent, dose, route, renal/hepatic function, interactions, and temporal association. A citation-backed **higher-risk** marker (a binary flag, not an invented ordinal tier) is shown on the agents with the clearest evidence: **benzodiazepines** (PADIS), **strong anticholinergics** (AGS Beers Table 7 / Anticholinergic Cognitive Burden scale), and **meperidine** (Beers; higher neurotoxicity risk than other opioids). **Glycopyrrolate carries no higher-risk flag**: it appears in neither anchor (Beers Table 7 nor the ACB scale) and is a quaternary ammonium with minimal CNS penetration; it stays on the list as a review-prompt item only. **Dexmedetomidine is not on the list**: it is the preferred, delirium-sparing sedative (PADIS 2025 / MENDS2); its only caution (rebound on abrupt withdrawal after a prolonged infusion) lives on the treatment tab's "do NOT stop abruptly" list. **Metoclopramide** is grouped under GI / antiemetics (it is a D2 antagonist, not an anticholinergic). Renal/hepatic-accumulation cautions are included, each anchored to a source that actually carries it: meperidine: avoid, higher neurotoxicity risk (`beers2023`); morphine/hydromorphone glucuronide metabolites accumulate in renal impairment with neuroexcitatory toxicity (`dean2004_renal`; this claim is **not** in Beers and is no longer cited to it); gabapentin/pregabalin: reduce dose at CrCl < 60, stated qualitatively per Beers Table 6 (the earlier "~50%" quantifier was removed as untraceable to the cited source). Beers Criteria are noted to apply to adults ≥ 65. The AGS 2025 **Beers Alternatives** companion (`beers_alt2025`) is referenced from the card as the evidence-based "what to use instead" resource.

**Citations mapped (Medications tab):** `beers2023` (AGS Beers Criteria 2023), `beers_alt2025` (AGS 2025 Alternatives companion), `acb_boustani` (Anticholinergic Cognitive Burden scale: anchor for the anticholinergic higher-risk flag), `clegg2011` (deliriogenic-medication systematic review), `pandharipande2006` (benzodiazepine-to-delirium primary trial), `padis2025`, `padis2018`, `haldol_label` (haloperidol prescribing information), `dex_label` (Precedex prescribing information: the 0.2–0.7 mcg/kg/hr maintenance range), `quetiapine_label` (quetiapine prescribing information: QTc/orthostasis caution), `mends2` (MENDS2 dexmedetomidine vs propofol), `a2b2025` (A2B RCT), `mindusa2018`, `promedic2022` (Pro-MEDIC prophylactic-melatonin RCT), `melatonin_meta2025` (2025 ICU melatonin systematic review / meta-analysis), `dean2004_renal` (opioid metabolites in renal failure), `asam2020` (lorazepam row: withdrawal-scale selection).

**Printed SPA analgesia note:** the SPA Quick Reference's acetaminophen line is deliberately **dose-free** ("scheduled acetaminophen, dose per local order set, avoid/reduce with hepatic impairment"). PADIS 2018 recommends the adjunct without a dose, and the tool prints no analgesic regimen it cannot cite. (An earlier draft printed "650–975 mg q6h" with no source; removed.)

### 2.9 Printable bedside templates (/templates/)

The template designer produces two laminate-ready sheets: an **ICU Delirium Rounding Tool**
(per-patient landscape checklist marked with a dry-erase pen) and an **SPA Quick Reference**
(unit-level portrait poster: Sedation · Pain/Pharmacy · Activity). The designer edits protocol
configuration only (facility name, section/item selection, medication selection, sedation
target, added local-protocol lines); no assessment or patient data is entered or printed.

**Content provenance rule:** every clinical statement on the sheets **mirrors the interactive
tool's cited content**. The sheets introduce no new clinical values. The mapping:

| Sheet block | Mirrors | Citations |
|---|---|---|
| Sedation goal / target RASS | §2.3, §2.5 (eCASH light-sedation framing) | `padis2018`, `padis2025`, `icudelirium_satsbt` |
| CAM-ICU result options (incl. RASS −4/−5 unable-to-assess) | §2.2 | `camicu_worksheet`, `ely2001` |
| Delirium subtype (hyperactive / hypoactive / mixed) | §2.4 | `lacour2022`, `krewulak2018`, `hayhurst2020` |
| RASS mini-table (compact grouped rows) | §2.3 | `sessler2002`, `ely2003` |
| Causative factors — DELIRIUM(S), nine cells | §2.6 (notes shortened to card length; the thiamine dosing detail stays on the web tool, the card says only "thiamine promptly in at-risk patients — do not delay glucose") | `icudelirium_mnemonics`, `flaherty2011`, `maldonado2018` |
| Non-pharmacologic bundle (six bedside groups) | §2.5 items regrouped for bedside scanning (Reorientation / Sensory / Sleep / Mobility / Hydration & Nutrition / Engagement) | `sccm_abcdef`, `pun2019`, `marra2017`, `padis2018`, `inouye1999`, `hshieh2015` |
| Pharmacologic considerations | §2.7 Step 3 + §2.8; **doses print only when "example starting doses" is switched on** — the default defers to the local order set | `padis2025`, `mindusa2018`, `haldol_label`, `dex_label`, `mends2`, `padis2018` |
| Deliriogenic medications grid | §2.8 registry — the designer's picker toggles the same per-agent flags | `beers2023`, `padis2018`, `acb_boustani` |
| SPA columns + deeper guidance + escalation ladder | §2.5, §2.7, §2.8 statements recast as poster actions | per-column keys in `src/js/templates/data/content.js` |
| Nurse care pathway (rounding sheet, step 4) | **Local unit workflow — the only uncited section.** It carries process steps (documentation, handoff, teaching), not clinical values, is flagged "unit workflow — edit to match your local protocol" in the designer, and is fully editable/removable. | — |

**Presentation rules.** Medication names print **generic-only by default**. Brand names in
the registry are stripped for the sheet (clinical qualifiers such as routes and "high dose"
always remain) and reappear only when the unit enables "show brand names". The designer's
default medication selection mirrors the interactive tool's documented defaults: the three
classes with the strongest, most actionable ICU delirium signal (**benzodiazepines, opioids,
anticholinergics**; PADIS 2018, AGS Beers 2023/ACB, §2.8), with the rest of the shared
catalog opt-in via per-category and select-all/none controls. The printed list is a mosaic of
colour cards, one check-off square per medication, with the type size and column count
scaling to the selection so the full catalog still fits; a classic category-rows view remains
available.
The two pharmacology caution lines with the strongest bedside consequence carry a printed warning marker: benzodiazepines as withdrawal rescue only, and no antipsychotics at discharge without a psychiatric indication. The sedation-target
selector offers the interactive tool's three bands (0 to −2 light/ICU default; 0 to −1
general ward; −3 to −4 deep, which prints a "documented indication required" caveat) plus a
"no unit target" option that prints a write-in blank with a "per prescriber order" note.
This is a presentation choice, not a new clinical value. Each RASS row carries a check mark
(circle) so the current level can be marked at the bedside. "Save as
PDF" captures the on-screen sheet itself. The PDF embeds a print-resolution image of the
exact rendered sheet, so it cannot differ from the preview or the browser print output in any
way, and overlays interactive form fields at the captured elements' measured positions
(checkboxes over every check square, one mutually-exclusive radio group over the RASS
circles, text fields over the write-in blanks). The "date created" label defaults to the day
the configuration was created (editable); it and the optional "revision" label print in the
footer and suffix the PDF filename for unit version-tracking. They carry no clinical
content. Reworded lines, added lines, and
unit-authored sections are local protocol content. Like the nurse care pathway, they carry no
citation and are the unit's responsibility.

Each printed sheet carries the verbatim reference-aid disclaimer and a footer source line
naming the primary guidelines. Unit tests enforce that every citation key in the template
content resolves in the registry, that the medication defaults track the shared catalog, that
brand-name stripping preserves clinical qualifiers, and that the disclaimer text stays
verbatim (`tests/unit/templates-data.test.js`).

### 2.10 Pediatric bedside card set & PICU workflow poster (/templates/)

Two pediatric templates extend the designer: the **Peds Delirium Card Set** (landscape pages
for lamination and ring-binding: arousal gate card, screen-routing card, CAPD card,
psCAM-ICU and pCAM-ICU cards, act-on-a-positive card, prevention-bundle card, and three
pages of attention picture cards with cut guides) and the **PICU Delirium Workflow** poster
(landscape: screen → arousal gate → score → act, with the rounds reporting script).

Clinical values are **imported directly from the pediatric tool's data modules**
(`src/js/templates/data/peds-content.js` imports `src/js/peds/data/…`), so the printed cards
cannot carry different thresholds, scripts, or wording than the interactive tool: the arousal
scales and comatose floors (Curley 2006; Sessler 2002), the CAPD items, 0–4 frequency scale,
≥ 9 cut point, and developmental-delay caveat (Traube 2014; Gupta 2021), and the ps/pCAM-ICU
features, tasks, letter sequence, error thresholds, and the psCAM Feature-2 alternate
positivity path (Smith 2011; Smith 2016). The RASS row descriptions on the arousal card carry
the scale's published wording (Sessler 2002, as used on the validated pediatric assessment
card). Validated-instrument text is deliberately **not** unit-editable in the designer.

On the workflow poster, protocol lines are unit-editable like the adult sheets, but the
lines carrying validated values (the comatose floors, the age routing, and the positivity
thresholds) are locked: always printed, never editable, and interpolated from the tool's
constants so they cannot drift. The card set and the poster print as landscape Letter pages (the bedside
ring-deck format).

The attention picture cards are **original artwork** (drawn for this site as inline SVG).
The card faces are deliberately picture-only: naming the object or marking its set on the
face would cue the recognition task's answer; set membership is listed on the clinician
instructions card instead.
The validated element of the picture tasks is the procedure (ten presentations for psCAM-ICU
Feature 2; five memory pictures plus five "other" pictures for the pCAM-ICU memory-pictures
alternative), not the specific images; the instructions card notes that units may substitute
their validated picture set per local practice. Mirror tests pin the card content to the
pediatric tool's modules (`tests/unit/templates-peds.test.js`).

**Memory-pictures attention task inside the interactive tool.** The pediatric tool (`/peds/`)
runs the pCAM-ICU memory-pictures alternative to Feature 2 as an on-screen task, not only a printed
reference. Under Feature 2 it shows the five memory pictures, then steps through all ten recognition
pictures with a Seen / New control per picture, scoring errors live against each picture's set
membership: a memory picture answered "new", or a distractor answered "seen", is an error. Tapping
any picture, or the "Present to child" button, opens a large one-picture-at-a-time modal to turn
toward the bed: it walks the five memory pictures, then the ten recognition pictures where Seen / New
is picked in the modal and auto-advances (an accessible dialog: focus-trapped, Esc/arrow-key
operable). It
reuses the shared stimulus deck (`src/js/shared/stim-deck.js`) and artwork
(`src/js/templates/stim-art.js`), so the on-screen task and the printed picture cards draw the same
set and cannot drift. Both Feature-2 tasks are offered together; either the squeeze-on-A letters or
the pictures reaching the ≥ 3-error cut makes Feature 2 positive
(`src/js/peds/scoring.js`, `featurePresent` / `pictureErrors`; `tests/unit/peds-scoring.test.js`).
The card design system (`.pc-*`, `.sheet`, `.sh-*`, `.tone-*`) lives in a shared
`src/styles/cards.css` imported by both the designer and the pediatric tool.

---

### 2.11 Emergency-department screening tool (/ed/)

The ED tool implements three guideline-backed screening pathways for older
emergency-department patients: the two-step DTS → bCAM, the bCAM directly
(the ACEP ED-DEL change package's option when screening high-risk patients
only), and the 4AT. The instruments are conditionally recommended by the
Geriatric Emergency Department Guidelines 2.0 delirium chapter (Lee 2026,
recommendation 4: "4AT, bCAM, CAM-ICU, mCAM, AMT-4, or RASS may be used to
rule in or rule out delirium"; recommendation 5: the DTS "may be used to rule
out delirium"; all conditional, very-low-certainty evidence). GED 2.0 makes
no recommendation for universal screening. It notes routine screening of all
older ED adults is resource-intensive and offers validated risk scores to
identify low-risk patients and reduce universal screening; the tool's Setup
tab carries that framing verbatim.

**Two-step DTS → bCAM (Han 2013; Vanderbilt DTS/bCAM manuals v1.0; Geriatric
ED Guidelines 2014).** The Delirium Triage Screen is positive when the RASS is
anything other than 0, or the patient makes ≥2 errors spelling "LUNCH"
backwards (a missing letter is one error; refusal or inability to start is
positive; the task stops after a >15-second pause). Sensitivity 98% for both
physician and non-physician raters. A negative DTS makes delirium unlikely and, in the two-step pathway, does not require the bCAM on its own (GED 2.0 grades this rule-out very-low certainty; continue clinical evaluation if suspicion persists). A
positive DTS triggers the bCAM: Feature 1 (acute change or fluctuation, by
informant; assumed positive when no informant is available and Features 2 and
3-or-4 are positive) AND Feature 2 (months backwards December→July, >1 error
or unable; the required cardinal feature) AND (Feature 3: RASS ≠ 0, carried
over from the arousal assessment, OR Feature 4: four yes/no questions in
alternating sets plus a two-step command, ANY error positive). Physician
84%/95.8%, non-physician 78%/96.9%. RASS −4/−5 is stupor/coma: the tool
records "unable to assess" and directs reassessment, mirroring the CAM-ICU
and pediatric gates. The RASS rows carry the ED-adapted behavioral anchors
printed on the DTS/bCAM worksheets (e.g. −1 "sustained awakening to voice
>10 seconds", −4 "arousable to pain only") rather than Sessler's ICU sedation
labels, because the 0 vs −1 boundary decides DTS positivity and −3 vs −4
decides the unable gate. Both attention tasks are tap-to-count flowsheets
(tap each missed letter/month; the error count scores the rule), and stale
answers are cleared when a gate closes (leaving RASS 0 clears the LUNCH task;
a negative DTS clears the bCAM features behind it).

**4AT v1.2 (MacLullich/Ryan/Cash; free to use; SIGN 157 and NICE CG103 2023
recommend it for ED/acute settings).** Four items with the form's verbatim
anchors: alertness (0/4), AMT4 (age, date of birth, place, current year:
0/1/2), attention months-backwards (≥7 months = 0; starts but <7 = 1;
untestable = 2), acute change or fluctuating course (0/4), summing 0–12.
Bands per the form: ≥4 possible delirium ± cognitive impairment; 1–3 possible
cognitive impairment; 0 delirium unlikely (the tool carries the form's caveat
that 0 does not definitively exclude delirium when item-4 information is
incomplete). Validation: Bellelli 2014; Shenkin 2019 (randomised head-to-head
vs CAM: 4AT sensitivity 76% / specificity 94%); Tieges 2021 meta-analysis
(pooled sensitivity 0.88).

Validated instrument scripts and thresholds render verbatim from
`src/js/ed/data/instruments.js` and are pinned by golden-value tests
(`tests/unit/ed-scoring.test.js`); the act-on-a-positive content follows the
ADEPT tool (Shenvi 2020) and the ACEP ED-DEL toolkit. The intro's
epidemiology (prevalence ~8–10%, with reported estimates ranging 6–38%;
~76% missed; 6-month mortality HR ≈ 1.7) carries Han 2009/2010 for the
8–10% and missed-case figures and GED 2.0 for the 6–38% range (an earlier
"8–17%" figure appeared in none of the cited sources and was corrected;
see §6.5). The tool is de-identified by construction and
generates a local print/PDF summary only (assessor, editable assessment
time, pathway, scores, actions started, and de-identified notes). Out of
scope in this version: ED-specific risk-stratification scores (GED 2.0
recommendations 1–3), head-CT decision support (GED 2.0 recommendation 6
found insufficient evidence to recommend for or against), and agitation
pharmacotherapy; all listed for future work.

**Licensing note.** The 4AT is free to use (the4at.com; form © MacLullich,
Ryan, Cash). The DTS and bCAM flowsheets are © 2012 Vanderbilt University
("not to be reproduced without permission"; the underlying CAM algorithm is
© 2003 Hospital Elder Life Program, LLC), though the instruments and manuals
are distributed free from eddelirium.org for clinical use. The tool renders
the instruments' scripted wording for bedside fidelity; permission status for
public redistribution should be confirmed before wide promotion of this page.

### 2.12 Emergency-department bedside card set & ED workflow poster (/templates/)

Two ED templates extend the designer: the **ED Delirium Card Set** (portrait pocket cards for
lamination and ring-binding: a pathways card, a combined **Step 1 · DTS** card that carries
the RASS ladder plus the LUNCH task, the bCAM confirmatory stepper card, the 4AT single-step
card, and an act-on-a-positive card) and the **ED Delirium Workflow** poster (landscape:
screen → arousal gate → confirm → act, with the disposition hand-off script). Portrait suits
the ED instruments, whose validated forms are pocket cards/worksheets; the DTS is presented
as arousal + LUNCH on one card because the RASS score is its first step. They reuse the
pediatric card design system (`.pc-*`).

Clinical values are **imported directly from the ED tool's data modules**
(`src/js/templates/data/ed-content.js` imports `src/js/ed/data/instruments.js` and `refs.js`),
so the printed cards cannot carry different scripts, thresholds, or wording than the
interactive tool: the ED-adapted RASS behavioral anchors (Vanderbilt DTS/bCAM worksheets;
scale Sessler 2002); the DTS positivity rule (altered arousal or ≥ 2 LUNCH-backwards errors
or unable → positive; RASS 0 with 0–1 errors → negative) and its LUNCH script; the bCAM
stepper: Feature 1 (acute change / fluctuation), Feature 2 (months-backward inattention, the
required cardinal feature), Feature 3 (RASS ≠ 0), Feature 4 (the alternating question sets,
the two-step command, and the any-error rule) and the "Feature 1 + Feature 2 + (Feature 3 or
Feature 4)" positivity rule; and the 4AT four items, point values, and 0 / 1–3 / ≥ 4 bands
with the form's caveat (Han 2013; the Vanderbilt manuals; the 4AT v1.2 form). The DTS and
bCAM error thresholds and the bCAM rule string are **interpolated from the instrument
constants** so the printed cut cannot drift. Validated-instrument text is deliberately **not**
unit-editable in the designer; the act-on-a-positive lines and the workflow poster's
protocol lines are unit-editable, while the poster's locked threshold lines (the DTS/bCAM/4AT
cuts and the RASS −4/−5 unable floor) are always printed and interpolated. The bCAM
Feature-4 question set (A or B) is selectable in the designer's Your unit panel. Mirror
tests pin the card content to
the ED tool's modules (`tests/unit/templates-ed.test.js`).

### 2.13 Adult step-down / progressive-care screening tool (/stepdown/)

The step-down tool screens the verbal, monitored-but-non-intubated
(intermediate-care / progressive-care) patient, where the CAM-ICU loses
sensitivity for the mild and hypoactive delirium common on the ward. Two
sources carry that premise. Pooled across nine ICU studies (969 patients) the
CAM-ICU reached 80.0% sensitivity (95% CI 77.1–82.6) and 95.9% specificity,
but sensitivity was lower in the two studies that examined hypoactive
delirium, the most prevalent subtype; that review compared no ventilated
against non-ventilated cohorts, so it speaks to the subtype weakness rather
than the setting (Gusmão-Flores 2012). The setting evidence is Neufeld 2013:
in 91 patients aged ≥ 70 screened after general anaesthesia against a
psychiatry-trained physician's DSM-IV neuropsychiatric examination, the
CAM-ICU was 98% specific but 28% sensitive (95% CI 16–45). That cohort is
post-anaesthesia care and surgical ward rather than step-down, so it is
directional for this population, not a validation in it. It
implements the CAM-IMC as the screen, a RASS arousal gate, the Martinez
admission-risk rule, and a multicomponent non-pharmacologic prevention bundle.
The setting sits between the ICU tool (CAM-ICU) and a general acute ward, where
the ward-validated 3D-CAM or the 4AT apply (Marcantonio 2014; SIGN 157; NICE
CG103); the Setup tab carries that routing.

**CAM-IMC (Beyer 2024).** A weighted, additive 0–10 screen, positive at ≥ 3 —
the Youden-index cut-off in the validation cohort — developed and validated in
non-intubated postoperative cardiac-surgery patients in an intermediate-care
unit (sensitivity 0.96, specificity 0.94). Four elements score into the total:
acute change or fluctuating course (dichotomous, +1) and altered level of
consciousness (dichotomous, RASS ≠ 0 → +1); inattention (0–3), read as the
ten-letter word "ANANASBAUM" or "CASABLANCA" with a hand squeeze on each "A"
(one point per error, the item positive at ≥ 3 errors); and disorientation
(0–5) across five dimensions — age, date of birth, place, year, and situational
awareness — one point per error, the item positive at ≥ 2 errors. Unlike the
CAM-ICU, the point system does not gate on a positive acute-change feature:
disorientation or inattention can each drive a positive result on their own.
Applying an instrument validated in a cardiac-surgery intermediate-care cohort
to the broader step-down / progressive-care population is a scope extension the
on-page framing notes.

**RASS arousal gate (Sessler 2002; Ely 2003; ward use Han 2015; mRASS Chester
2012).** The RASS is scored first and supplies the CAM-IMC's level-of-
consciousness point: any value other than 0 is altered arousal. RASS −4/−5 is
stupor or coma — the CAM-IMC's verbal items cannot be completed, so the tool
records "unable to assess" and directs reassessment when the patient responds to
voice, mirroring the CAM-ICU and pediatric gates. The RASS anchor descriptors
are the canonical Sessler/Ely wording.

**Admission delirium risk (Martinez 2012).** A ward prediction rule for direct
admits: one point each for age ≥ 85, dependence in ≥ 5 of 6 activities of daily
living, and a psychotropic-drug subtotal ≥ 2 (antidepressant, antidementia, and
anticonvulsant score 1 each; antipsychotic scores 2; benzodiazepines were
recorded in the study but not weighted, and are not scored). The 0–3 total bands
to predicted incidence — 0 Low (~4%), 1 Intermediate (~14–23%), 2–3 High
(~43–64%), the ranges spanning the derivation and validation cohorts — and is
used to target prevention, not to diagnose. NICE CG103 anchors the
risk-factor-based prevention framing.

**Multicomponent prevention (Siddiqi 2016; Inouye 1999 HELP; Hshieh 2015; AGS
2015).** A multicomponent non-pharmacologic bundle reduced incident delirium in
non-ICU inpatients (Cochrane RR 0.69, 95% CI 0.59–0.81); the tool carries the
point estimate. Antipsychotics do not prevent delirium (Oh 2019; Neufeld 2016 —
no reduction in incidence, duration, length of stay, or mortality) and are not
supported for routine treatment (Nikooie 2019; Neufeld 2016); AGS 2015 permits
short-term, low-dose use only for severe agitation threatening the patient. The
act-on-a-positive guidance reviews deliriogenic and anticholinergic medications
first (Lisibach 2022; AGS 2015) and, for post-ICU transfers, considers
sedative/opioid withdrawal — Wang 2017 reports iatrogenic withdrawal onset 1–11
days after opioid cessation or dose reduction.

The bundle's evidence is for the bundle. Individual components should not be
read as separately established: a systematic review of non-pharmacologic sleep
interventions in non-ICU inpatients concluded there is "insufficient to low
strength of evidence that any non-pharmacologic intervention improves sleep
quality or quantity of general inpatients" (Tamrat 2014, J Gen Intern Med
2014;29:788). The sleep component is carried because it is part of the
multicomponent interventions the pooled reviews tested, not because standalone
sleep interventions have been shown to work.

Validated instrument scripts and thresholds render verbatim from
`src/js/stepdown/data/instruments.js` and are pinned by golden-value tests
(`tests/unit/templates-stepdown.test.js`). The tool is de-identified by
construction and generates a local print/PDF summary only (facility, editable
assessment time, RASS, CAM-IMC, risk, prevention, and de-identified notes). **Instruments considered and not carried.** The archive holds validated
alternatives that this tool deliberately does not implement, so the omission is a
decision rather than an oversight. The **UB-2** two-item screen and the two-step
**UB-CAM** are validated ultra-brief front doors for general medical inpatients
(Fick 2015; Marcantonio 2022), and **Nu-DESC** and the **DOS** are nurse-
observation screens validated on general wards that need no patient interview
(Bergjan 2020). The **SQiD** single informant question has been studied in
oncology inpatients (Sands 2021). Each addresses a different setting or workflow
from the one this tool screens, and carrying several instruments for the same
decision invites the wrong one being picked at the bedside; the Setup routing
note points to the ward-validated screens instead. A **CAM-ICU severity grade**
(CAM-ICU-7, Khan 2017) is likewise out of scope for the adult tool for the reason
given for the step-down tool below: severity instruments are validated separately
from the screen they extend.

Out
of scope in this version, each for a stated reason. A **CAM-IMC severity scale**
does not exist; severity instruments are built and validated separately from the
screen they extend, as the CAM-ICU-7 was for the CAM-ICU (Khan 2017, Crit Care
Med 2017;45:851), and the tool will not derive a severity score the instrument's
authors have not published. **EEG-assisted assessment** is validated for this
population — DeltaScan was evaluated prospectively across ICU and non-ICU
patients (Ditzel 2024, Am J Geriatr Psychiatry 2024;32:1093) — but it reads a
physiological signal from a device, which fails the first non-device criterion in
§6.7; a tool that ingested that signal would no longer be the kind of software
this project builds. **Post-intensive-care-syndrome follow-up** is a real and
adjacent need for the post-ICU patients this tool screens (Rousseau 2021, Crit
Care 2021;25:108; Nakanishi 2024, J Intensive Care 2024;12:2), but it is a
longitudinal outpatient pathway rather than a bedside screen, so it belongs to a
different instrument. All four sources are held in the reference archive.

### 2.14 Adult step-down bedside card set & workflow poster (/templates/)

Two step-down templates extend the designer: the **Step-Down Delirium Card Set**
(landscape cards, two per page — an arousal/RASS card with the −4/−5 unable gate,
the CAM-IMC scoring card, the Martinez admission-risk worksheet, a
prevention-bundle card, and an act-on-a-positive card) and the **Step-Down
Delirium Workflow** poster (landscape: screen → arousal gate → score → risk →
act, with a transfer/hand-off script). They reuse the pediatric card design
system (`.pc-*`).

Clinical values are **imported directly from the step-down tool's data modules**
(`src/js/templates/data/stepdown-content.js` imports
`src/js/stepdown/data/instruments.js` and `refs.js`), so the printed cards cannot
carry different scripts, thresholds, or wording than the interactive tool: the
CAM-IMC 0–10 additive score positive at ≥ 3, its five components and their
per-item cut-offs (inattention ≥ 3 errors, disorientation ≥ 2 errors); the RASS
anchors and the −4/−5 unable floor; the Martinez rule (age ≥ 85, ADL dependence
≥ 5 of 6, psychotropic subtotal ≥ 2, one point each) with its Low / Intermediate
/ High bands; and the ten-component prevention bundle (Beyer 2024; Martinez 2012;
Siddiqi 2016; AGS 2015). The cut-points and the workflow poster's locked
threshold lines (the CAM-IMC rule, the Martinez rule, and the RASS −4/−5 floor)
are **interpolated from the instrument constants** so the printed cut cannot
drift, and validated-instrument text is deliberately **not** unit-editable in the
designer; the prevention and act-on-a-positive lines and the poster's protocol
lines are unit-editable. Mirror tests pin the card content to the step-down
tool's modules (`tests/unit/templates-stepdown.test.js`).

---

## 3. Citation registry

Every source cited anywhere in the application, reproduced as each tool stores it. The adult ICU tool's registry is the primary table below; the emergency-department, pediatric, and step-down tools each add the sources their registries hold that the adult table does not already list (shared sources are not repeated). Inline citations and per-tab reference lists are generated from these registries. Identifiers in the adult table marked **† not locally archived** are cited by canonical URL only (see §4); per-source archive status for every tool is recorded in [references/INDEX.md](../references/INDEX.md).

### Adult ICU tool

| ID | Citation | DOI / URL |
|---|---|---|
| `camicu_worksheet` | Ely EW; Vanderbilt University. CAM-ICU Worksheet. ICUDelirium.org. | https://www.icudelirium.org/resource-downloads/cam-icu-worksheet |
| `camicu_manual` | Ely EW; Vanderbilt University. The Complete CAM-ICU Training Manual (rev. 2016). | https://www.icudelirium.org/resource-downloads/cam-icu-training-manual |
| `icudelirium_monitoring` | Vanderbilt CIBS Center. Monitoring Delirium in the ICU. | https://www.icudelirium.org/medical-professionals/delirium/monitoring-delirium-in-the-icu |
| `ely2001` | Ely EW, Inouye SK, Bernard GR, et al. Delirium in mechanically ventilated patients: validity and reliability of the CAM-ICU. JAMA. 2001;286(21):2703-2710. | https://doi.org/10.1001/jama.286.21.2703 |
| `inouye1990` **†** | Inouye SK, van Dyck CH, Alessi CA, Balkin S, Siegal AP, Horwitz RI. Clarifying confusion: the Confusion Assessment Method. Ann Intern Med. 1990;113(12):941-948. (The original CAM; the four-feature 1 AND 2 AND (3 OR 4) algorithm the CAM-ICU adapts.) | https://doi.org/10.7326/0003-4819-113-12-941 |
| `dsm5tr` **†** | American Psychiatric Association. Diagnostic and Statistical Manual of Mental Disorders, 5th ed, Text Revision (DSM-5-TR). Washington, DC: APA; 2022. (Delirium diagnostic criteria — the reference standard every bedside screen is validated against.) | https://doi.org/10.1176/appi.books.9780890425787 |
| `icdsc_bergeron` **†** | Bergeron N, Dubois MJ, Dumont M, Dial S, Skrobik Y. Intensive Care Delirium Screening Checklist: evaluation of a new screening tool. Intensive Care Med. 2001;27(5):859-864. (8-item checklist; ≥ 4 = positive.) | https://doi.org/10.1007/s001340100909 |
| `marcantonio2014_3dcam` | Marcantonio ER, Ngo LH, O'Connor M, et al. 3D-CAM: derivation and validation of a 3-minute diagnostic interview for CAM-defined delirium. Ann Intern Med. 2014;161(8):554-561. (The ward-validated CAM the general/step-down pathway recommends.) | https://doi.org/10.7326/M14-0865 |
| `sessler2002` **†** | Sessler CN, Gosnell MS, Grap MJ, et al. The Richmond Agitation-Sedation Scale (RASS): validity and reliability in adult ICU patients. Am J Respir Crit Care Med. 2002;166(10):1338-1344. | https://pubmed.ncbi.nlm.nih.gov/12421743/ |
| `ely2003` | Ely EW, Truman B, Shintani A, et al. Monitoring sedation status over time in ICU patients: reliability and validity of the RASS. JAMA. 2003;289(22):2983-2991. | https://doi.org/10.1001/jama.289.22.2983 |
| `hayhurst2016` | Hayhurst CJ, Pandharipande PP, Hughes CG. ICU delirium: a review of diagnosis, prevention, and treatment. Anesthesiology. 2016;125(6):1229-1241. | https://doi.org/10.1097/ALN.0000000000001378 |
| `gusmaoflores2012` | Gusmão-Flores D, Salluh JI, Chalhub RÁ, Quarantini LC. The confusion assessment method for the intensive care unit (CAM-ICU) and intensive care delirium screening checklist (ICDSC) for the diagnosis of delirium: a systematic review and meta-analysis of clinical studies. Crit Care. 2012;16(4):R115. (Nine CAM-ICU studies, 969 patients: pooled sensitivity 80.0%, specificity 95.9%; sensitivity lower in hypoactive delirium.) | https://doi.org/10.1186/cc11407 |
| `wei2008_cam` | Wei LA, Fearing MA, Sternberg EJ, Inouye SK. The Confusion Assessment Method: a systematic review of current usage. J Am Geriatr Soc. 2008;56(5):823-830. | https://doi.org/10.1111/j.1532-5415.2008.01674.x |
| `han2014_camicu_ed` | Han JH, Wilson A, Graves AJ, et al. Validation of the Confusion Assessment Method for the Intensive Care Unit in older emergency department patients. Acad Emerg Med. 2014;21(2):180-187. | https://doi.org/10.1111/acem.12309 |
| `sccm_abcdef` | Society of Critical Care Medicine. ICU Liberation Bundle (A-F). | https://sccm.org/clinical-resources/iculiberation-home/abcdef-bundles |
| `pun2019` | Pun BT, Balas MC, Barnes-Daly MA, et al. Caring for critically ill patients with the ABCDEF bundle: ICU Liberation Collaborative in over 15,000 adults. Crit Care Med. 2019;47(1):3-14. | https://doi.org/10.1097/CCM.0000000000003482 |
| `marra2017` | Marra A, Ely EW, Pandharipande PP, Patel MB. The ABCDEF bundle in critical care. Crit Care Clin. 2017;33(2):225-243. | https://doi.org/10.1016/j.ccc.2016.12.005 |
| `padis2018` | Devlin JW, Skrobik Y, Gélinas C, et al. Clinical practice guidelines for the prevention and management of pain, agitation/sedation, delirium, immobility, and sleep disruption in adult ICU patients (PADIS). Crit Care Med. 2018;46(9):e825-e873. | https://pubmed.ncbi.nlm.nih.gov/30113379/ |
| `padis2025` | Lewis K, Balas MC, Stollings JL, et al. A focused update to the PADIS guidelines. Crit Care Med. 2025;53(3):e711-e727. | https://doi.org/10.1097/CCM.0000000000006574 |
| `inouye1999` | Inouye SK, Bogardus ST Jr, Charpentier PA, et al. A multicomponent intervention to prevent delirium in hospitalized older patients (HELP). N Engl J Med. 1999;340(9):669-676. | https://doi.org/10.1056/NEJM199903043400901 |
| `hshieh2015` | Hshieh TT, Yue J, Oh E, et al. Effectiveness of multicomponent nonpharmacological delirium interventions: a meta-analysis. JAMA Intern Med. 2015;175(4):512-520. | https://doi.org/10.1001/jamainternmed.2014.7779 |
| `schweickert2009` | Schweickert WD, Pohlman MC, Pohlman AS, et al. Early physical and occupational therapy in mechanically ventilated, critically ill patients: a randomised controlled trial. Lancet. 2009;373(9678):1874-1882. (Landmark RCT: early mobility shortens delirium duration — the evidence behind bundle element E.) | https://doi.org/10.1016/S0140-6736(09)60658-9 |
| `nice_cg103` | NICE. Delirium: prevention, diagnosis and management. Clinical guideline CG103 (updated 2023). | https://www.nice.org.uk/guidance/cg103 |
| `icudelirium_satsbt` | Vanderbilt CIBS Center. Both SAT and SBT (Wake Up and Breathe). | https://www.icudelirium.org/medical-professionals/both-sat-and-sbt |
| `icudelirium_mobility` | Vanderbilt CIBS Center. Early Mobility and Exercise. | https://www.icudelirium.org/medical-professionals/early-mobility-and-exercise |
| `hodgson2014` | Hodgson CL, Stiller K, Needham DM, et al. Expert consensus and recommendations on safety criteria for active mobilization of mechanically ventilated critically ill adults. Crit Care. 2014;18(6):658. | https://ccforum.biomedcentral.com/articles/10.1186/s13054-014-0658-y |
| `icudelirium_mnemonics` | Vanderbilt CIBS Center. Terminology and Mnemonics: DELIRIUM(S) differential diagnosis. | https://www.icudelirium.org/medical-professionals/terminology-mnemonics |
| `flaherty2011` **†** | Flaherty JH. The evaluation and management of delirium among older persons. Med Clin North Am. 2011;95(3):555-577. | https://pubmed.ncbi.nlm.nih.gov/21549878/ |
| `maldonado2018` **†** | Maldonado JR. Delirium pathophysiology: an updated hypothesis of the etiology of acute brain failure. Int J Geriatr Psychiatry. 2018;33(11):1428-1457. | https://doi.org/10.1002/gps.4823 |
| `inouye_charpentier1996` | Inouye SK, Charpentier PA. Precipitating factors for delirium in hospitalized elderly persons: predictive model and interrelationship with baseline vulnerability. JAMA. 1996;275(11):852-857. | https://pubmed.ncbi.nlm.nih.gov/8596223/ |
| `lacour2022` | la Cour KN, Andersen-Ranberg NC, Weihe S, et al. Distribution of delirium motor subtypes in the ICU: a systematic scoping review. Crit Care. 2022;26:53. | https://doi.org/10.1186/s13054-022-03931-3 |
| `krewulak2018` **†** | Krewulak KD, Stelfox HT, Leigh JP, Ely EW, Fiest KM. Incidence and prevalence of delirium subtypes in an adult ICU: a systematic review and meta-analysis. Crit Care Med. 2018;46(12):2029-2035. | https://doi.org/10.1097/CCM.0000000000003402 |
| `zaal2015` **†** | Zaal IJ, Devlin JW, Peelen LM, Slooter AJC. A systematic review of risk factors for delirium in the ICU. Crit Care Med. 2015;43(1):40-47. (ICU-specific risk-factor review grading each factor.) | https://doi.org/10.1097/CCM.0000000000000625 |
| `rudolph2009` | Rudolph JL, Jones RN, Levkoff SE, et al. Derivation and validation of a preoperative prediction rule for delirium after cardiac surgery. Circulation. 2009;119(2):229-236. (Validated surgery-specific delirium prediction rule.) | https://doi.org/10.1161/CIRCULATIONAHA.108.795260 |
| `snigurska2023` | Snigurska UA, Keil MF, Chin AR, et al. Risk of bias in delirium prediction models: a systematic review. PLoS ONE. 2023;18(5):e0285527. (Even published prediction models carry substantial risk of bias — nuance for the prefer-a-validated-model framing.) | https://doi.org/10.1371/journal.pone.0285527 |
| `hayhurst2020` | Hayhurst CJ, Patel MB, McNeil JB, et al. Association of hypoactive and hyperactive delirium with cognitive function after critical illness. Crit Care Med. 2020;48(6):e480-e488. | https://doi.org/10.1097/CCM.0000000000004313 |
| `pisani2009` | Pisani MA, Kong SY, Kasl SV, et al. Days of delirium are associated with 1-year mortality in an older ICU population. Am J Respir Crit Care Med. 2009;180(11):1092-1097. | https://doi.org/10.1164/rccm.200904-0537OC |
| `beers2023` | 2023 AGS Beers Criteria Update Expert Panel. AGS 2023 updated Beers Criteria for potentially inappropriate medication use in older adults. J Am Geriatr Soc. 2023;71(7):2052-2081. | https://pubmed.ncbi.nlm.nih.gov/37139824/ |
| `clegg2011` **†** | Clegg A, Young JB. Which medications to avoid in people at risk of delirium: a systematic review. Age Ageing. 2011;40(1):23-29. (Canonical review of delirium-precipitating medications.) | https://doi.org/10.1093/ageing/afq140 |
| `pandharipande2006` **†** | Pandharipande P, Shintani A, Peterson J, et al. Lorazepam is an independent risk factor for transitioning to delirium in ICU patients. Anesthesiology. 2006;104(1):21-26. (Primary trial establishing the independent, dose-dependent benzodiazepine-to-delirium relationship.) | https://pubmed.ncbi.nlm.nih.gov/16394685/ |
| `nicolle2019` | Nicolle LE, Gupta K, Bradley SF, et al. Clinical practice guideline for the management of asymptomatic bacteriuria: 2019 update by the Infectious Diseases Society of America. Clin Infect Dis. 2019;68(10):e83-e110. (Delirium with bacteriuria but no genitourinary symptoms or systemic signs: assess for other causes and observe rather than treat.) | https://doi.org/10.1093/cid/ciy1121 |
| `haldol_label` | Haloperidol prescribing information (boxed warnings, QTc/Torsades, Parkinson/Lewy). DailyMed, U.S. NLM. | https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8397a841-f240-4767-9dcd-781e6d3f7c7f |
| `mends2` | Hughes CG, Mailloux PT, Devlin JW, et al. Dexmedetomidine or propofol for sedation in mechanically ventilated adults with sepsis (MENDS2). N Engl J Med. 2021;384(15):1424-1436. | https://doi.org/10.1056/NEJMoa2024922 |
| `promedic2022` **†** | Wibrow B, Martinez FE, Myers E, et al. Prophylactic melatonin for delirium in intensive care (Pro-MEDIC): an RCT. Intensive Care Med. 2022;48(4):414-425. | https://doi.org/10.1007/s00134-022-06638-9 |
| `melatonin_meta2025` **†** | Tang BHY, Manalo J, Chowdhury SR, et al. Melatonin use in the ICU: a systematic review and meta-analysis. Crit Care Med. 2025;53(9):e1714-e1724. (32 RCTs, n=3895; may reduce delirium / improve sleep — low certainty.) | https://doi.org/10.1097/CCM.0000000000006767 |
| `mindusa2018` | Girard TD, Exline MC, Carson SS, et al. Haloperidol and ziprasidone for treatment of delirium in critical illness (MIND-USA). N Engl J Med. 2018;379(26):2506-2516. | https://doi.org/10.1056/NEJMoa1808217 |
| `balas2014` | Balas MC, Vasilevskis EE, Olsen KM, et al. Effectiveness and safety of the ABCDE bundle. Crit Care Med. 2014;42(5):1024-1036. | https://pubmed.ncbi.nlm.nih.gov/24394627/ |
| `projectbeta` | Richmond JS, Berlin JS, Fishkind AB, et al. Verbal de-escalation of the agitated patient: consensus statement of the APA Project BETA. West J Emerg Med. 2012;13(1):17-25. | https://pmc.ncbi.nlm.nih.gov/articles/PMC3298202/ |
| `nice_ng10` **†** | NICE. Violence and aggression: short-term management in mental health, health and community settings. NG10. | https://www.nice.org.uk/guidance/ng10 |
| `inouye1993` **†** | Inouye SK, Viscoli CM, Horwitz RI, et al. A predictive model for delirium in hospitalized elderly based on admission characteristics. Ann Intern Med. 1993;119(6):474-481. | https://pubmed.ncbi.nlm.nih.gov/8357112/ |
| `marcantonio1994` **†** | Marcantonio ER, Goldman L, Mangione CM, et al. A clinical prediction rule for delirium after elective noncardiac surgery. JAMA. 1994;271(2):134-139. | https://pubmed.ncbi.nlm.nih.gov/8264068/ |
| `predeliric2012` | van den Boogaard M, Pickkers P, Slooter AJC, et al. Development and validation of PRE-DELIRIC. BMJ. 2012;344:e420. | https://doi.org/10.1136/bmj.e420 |
| `epredeliric2015` | Wassenaar A, van den Boogaard M, van Achterberg T, et al. Multinational development and validation of an early (admission) delirium prediction model for ICU patients (E-PRE-DELIRIC). Intensive Care Med. 2015;41(6):1048-1056. | https://doi.org/10.1007/s00134-015-3777-2 |
| `ciwa_mdcalc` **†** | CIWA-Ar (Clinical Institute Withdrawal Assessment for Alcohol, revised). MDCalc. | https://www.mdcalc.com/calc/1736/ciwa-ar-alcohol-withdrawal |
| `rass_mdcalc` **†** | Richmond Agitation-Sedation Scale (RASS) — scoring procedure. MDCalc. | https://www.mdcalc.com/calc/1872/richmond-agitation-sedation-scale-rass |
| `efns_wernicke` **†** | Galvin R, Bråthen G, Ivashynka A, et al. EFNS guidelines for diagnosis, therapy and prevention of Wernicke encephalopathy. Eur J Neurol. 2010;17(12):1408-1418. (Thiamine 200 mg IV TID, before carbohydrate; Level C.) | https://doi.org/10.1111/j.1468-1331.2010.03153.x |
| `rcp_wernicke` **†** | Thomson AD, Cook CCH, Touquet R, Henry JA. The Royal College of Physicians report on alcohol: guidelines for managing Wernicke's encephalopathy in the accident and emergency department. Alcohol Alcohol. 2002;37(6):513-521. (Higher-dose regimen, e.g. 500 mg IV TID × 2–3 days then taper.) | https://doi.org/10.1093/alcalc/37.6.513 |
| `espen_icu` | Singer P, Blaser AR, Berger MM, et al. ESPEN guideline on clinical nutrition in the intensive care unit. Clin Nutr. 2019;38(1):48-79. (Thiamine in refeeding / at-risk critically ill.) | https://doi.org/10.1016/j.clnu.2018.08.037 |
| `acb_boustani` **†** | Boustani M, Campbell N, Munger S, Maidment I, Fox C. Impact of anticholinergics on the aging brain (Anticholinergic Cognitive Burden scale). Aging Health. 2008;4(3):311-320. | https://doi.org/10.2217/1745509X.4.3.311 |
| `ecash2016` | Vincent JL, Shehabi Y, Walsh TS, et al. Comfort and patient-centred care without excessive sedation: the eCASH concept. Intensive Care Med. 2016;42(6):962-971. | https://doi.org/10.1007/s00134-016-4297-4 |
| `a2b2025` | Walsh TS, Aitken LM, McKenzie CA, et al. Dexmedetomidine- or clonidine-based sedation compared with propofol in critically ill patients: the A2B randomized clinical trial. JAMA. 2025;334(1):32-45. | https://doi.org/10.1001/jama.2025.7200 |
| `kollef1998` **†** | Kollef MH, Levy NT, Ahrens TS, Schaiff R, Prentice D, Sherman G. The use of continuous IV sedation is associated with prolongation of mechanical ventilation. Chest. 1998;114(2):541-548. (Observational cohort.) | https://doi.org/10.1378/chest.114.2.541 |
| `dean2004_renal` | Dean M. Opioids in renal failure and dialysis patients. J Pain Symptom Manage. 2004;28(5):497-504. | https://doi.org/10.1016/j.jpainsymman.2004.02.021 |
| `beers_alt2025` | American Geriatrics Society Beers Criteria Alternatives Panel. Alternative treatments to selected medications in the 2023 AGS Beers Criteria. J Am Geriatr Soc. 2025;73(9):2657-2677. | https://doi.org/10.1111/jgs.19500 |
| `girard2008` **†** | Girard TD, Kress JP, Fuchs BD, et al. Efficacy and safety of a paired sedation and ventilator weaning protocol for mechanically ventilated patients in intensive care (Awakening and Breathing Controlled trial): a randomised controlled trial. Lancet. 2008;371(9607):126-134. | https://pubmed.ncbi.nlm.nih.gov/18191684/ |
| `awissi2013` **†** | Awissi DK, Lebrun G, Coursin DB, Riker RR, Skrobik Y. Alcohol withdrawal and delirium tremens in the critically ill: a systematic review and commentary. Intensive Care Med. 2013;39(1):16-30. | https://pubmed.ncbi.nlm.nih.gov/23184039/ |
| `asam2020` **†** | The ASAM Clinical Practice Guideline on Alcohol Withdrawal Management. J Addict Med. 2020;14(3S):1-72. (Thiamine and glucose in either order or concurrently — do not delay glucose; objective scales (CAM-ICU, DDS, RASS, MINDS) for withdrawal delirium; CIWA-Ar not recommended in delirium.) | https://doi.org/10.1097/ADM.0000000000000668 |
| `flaherty_little2011` **†** | Flaherty JH, Little MO. Matching the environment to patients with delirium: lessons learned from the delirium room, a restraint-free environment for older hospitalized adults with delirium. J Am Geriatr Soc. 2011;59(Suppl 2):S295-S300. | https://pubmed.ncbi.nlm.nih.gov/22091576/ |
| `dex_label` | Precedex (dexmedetomidine hydrochloride) prescribing information — ICU sedation maintenance infusion 0.2-0.7 mcg/kg/hour. DailyMed, U.S. NLM. | https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=4419162d-81d4-49bd-96de-1729440bdb74 |
| `quetiapine_label` **†** | Seroquel (quetiapine fumarate) prescribing information — QTc prolongation and orthostatic hypotension. DailyMed, U.S. NLM. | https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0584dda8-bc3c-48fe-1a90-79608f78e8a0 |

*Edition/year details are reproduced as they appear in the source registry; where a source is a living web resource (e.g., the SCCM/Vanderbilt pages, NICE guidelines, DailyMed label) it carries the version/update designation the registry records and is otherwise undated.*

### Emergency-department tool (/ed/)

Sources this tool cites that are not already listed above (shared sources are not repeated; each is shown under the key this tool stores it as). Per-source archive status is in [references/INDEX.md](../references/INDEX.md).

| ID | Citation | DOI / URL |
|---|---|---|
| `han2013_dts_bcam` | Han JH, et al. Diagnosing delirium in older emergency department patients: validity and reliability of the Delirium Triage Screen and the Brief Confusion Assessment Method. Ann Emerg Med. 2013;62(5):457–465. | https://doi.org/10.1016/j.annemergmed.2013.05.003 |
| `dts_manual` | Han JH. Delirium Triage Screen (DTS) Instruction Manual, v1.0 (2015). Vanderbilt University School of Medicine; eddelirium.org. | https://eddelirium.org/delirium-assessment/assessment-instruments/ |
| `bcam_manual` | Han JH. Brief Confusion Assessment Method (bCAM) Instruction Manual, v1.0 (2015). Vanderbilt University School of Medicine; eddelirium.org. | https://eddelirium.org/delirium-assessment/assessment-instruments/ |
| `fourat_form` | MacLullich A, Ryan T, Cash H. 4AT — Assessment Test for Delirium & Cognitive Impairment, v1.2 (2011–2014). the4at.com (free to use). | https://www.the4at.com/ |
| `bellelli2014` | Bellelli G, et al. Validation of the 4AT, a new instrument for rapid delirium screening: a study in 234 hospitalised older people. Age Ageing. 2014;43(4):496–502. | https://doi.org/10.1093/ageing/afu021 |
| `shenkin2019` | Shenkin SD, et al. Delirium detection in older acute medical inpatients: a multicentre prospective comparative diagnostic test accuracy study of the 4AT and the confusion assessment method. BMC Med. 2019;17:138. | https://doi.org/10.1186/s12916-019-1367-9 |
| `tieges2021` | Tieges Z, et al. Diagnostic accuracy of the 4AT for delirium detection in older adults: systematic review and meta-analysis. Age Ageing. 2021;50(3):733–743. | https://doi.org/10.1093/ageing/afaa224 |
| `ged2_2026` | Lee S, et al. GRADE-based clinical practice guidelines for emergency department delirium risk stratification, screening, and brain imaging in older patients with suspected delirium (Geriatric ED Guidelines 2.0). Acad Emerg Med. 2026;33(2):e70167. | https://doi.org/10.1111/acem.70167 |
| `geda2014` | American College of Emergency Physicians, American Geriatrics Society, Emergency Nurses Association, Society for Academic Emergency Medicine. Geriatric Emergency Department Guidelines. 2014. | https://www.acep.org/geda/ |
| `sign157` | Scottish Intercollegiate Guidelines Network. Risk reduction and management of delirium: a national clinical guideline (SIGN 157). 2019. | https://www.sign.ac.uk/our-guidelines/risk-reduction-and-management-of-delirium/ |
| `adept2020` | Shenvi C, Kennedy M, Austin CA, Wilson MP, Gerardi M, Schneider S. Managing delirium and agitation in the older emergency department patient: the ADEPT tool. Ann Emerg Med. 2020;75(2):136–145. | https://doi.org/10.1016/j.annemergmed.2019.07.023 |
| `eddel_toolkit` | Delirium in the Older Emergency Department Patient (ED-DEL): Change Package and Toolkit. ACEP Geriatric Emergency Department Accreditation program. | https://www.acep.org/siteassets/sites/geda/media/documnets/ed-delirium-toolkit.pdf |
| `han2009` | Han JH, et al. Delirium in older emergency department patients: recognition, risk factors, and psychomotor subtypes. Acad Emerg Med. 2009;16(3):193–200. | https://doi.org/10.1111/j.1553-2712.2008.00339.x |
| `han2010` | Han JH, et al. Delirium in the emergency department: an independent predictor of death within 6 months. Ann Emerg Med. 2010;56(3):244–252. | https://doi.org/10.1016/j.annemergmed.2010.03.003 |

### Pediatric ICU tool (/peds/)

Sources this tool cites that are not already listed above (shared sources are not repeated; each is shown under the key this tool stores it as). Per-source archive status is in [references/INDEX.md](../references/INDEX.md).

| ID | Citation | DOI / URL |
|---|---|---|
| `traube2014_capd` | Traube C, et al. Cornell Assessment of Pediatric Delirium: a valid, rapid, observational tool for screening delirium in the PICU. Crit Care Med. 2014;42(3):656–663. | https://doi.org/10.1097/CCM.0b013e3182a66b76 |
| `smith2011_pcam` | Smith HAB, et al. Diagnosing delirium in critically ill children: validity and reliability of the pCAM-ICU. Crit Care Med. 2011;39(1):150–157. | https://doi.org/10.1097/CCM.0b013e3181feb489 |
| `smith2016_pscam` | Smith HAB, et al. The Preschool Confusion Assessment Method for the ICU (psCAM-ICU). Crit Care Med. 2016;44(3):592–600. | https://doi.org/10.1097/CCM.0000000000001428 |
| `curley2006_sbs` | Curley MAQ, et al. State Behavioral Scale (SBS) for infants and young children on mechanical ventilation. Pediatr Crit Care Med. 2006;7(2):107–114. | https://doi.org/10.1097/01.PCC.0000200955.40962.38 |
| `traube2017_outcomes` | Traube C, et al. Delirium and mortality in critically ill children. Crit Care Med. 2017;45(5):891–898. | https://doi.org/10.1097/CCM.0000000000002324 |
| `traube2017_prevalence` | Traube C, et al. Delirium in critically ill children: an international point prevalence study. Crit Care Med. 2017;45(4):584–590. | https://doi.org/10.1097/CCM.0000000000002250 |
| `mody2018_benzo` | Mody K, et al. Benzodiazepines and development of delirium in critically ill children: estimating the causal effect. Crit Care Med. 2018;46(9):1486–1491. | https://doi.org/10.1097/CCM.0000000000003194 |
| `pandem2022` | Smith HAB, et al. 2022 SCCM PANDEM clinical practice guidelines (pain, agitation, neuromuscular blockade, delirium, environment, early mobility) in critically ill pediatric patients. Pediatr Crit Care Med. 2022;23(2):e74–e110. | https://doi.org/10.1097/PCC.0000000000002873 |
| `lin2023_liberation` | Lin JC, Srivastava A, Malone S, et al. Caring for critically ill children with the ICU Liberation Bundle (ABCDEF): results of the pediatric collaborative. Pediatr Crit Care Med. 2023;24(8):636–651. | https://doi.org/10.1097/PCC.0000000000003262 |
| `campbell2020_risperidone` | Campbell CT, et al. Risperidone dosing for pediatric delirium in children ≤ 2 years. Ann Pharmacother. 2020;54(5):464–469. | https://doi.org/10.1177/1060028019891969 |
| `joyce2015_quetiapine` | Joyce C, et al. Safety of quetiapine in treating delirium in critically ill children. J Child Adolesc Psychopharmacol. 2015;25(9):666–670. | https://doi.org/10.1089/cap.2015.0093 |
| `madden2021_prescribing` | Madden K, et al. Antipsychotic drug prescription in pediatric intensive care units: a 10-year U.S. retrospective database study. J Pediatr Intensive Care. 2024;13(1):46–54 (online 2021). | https://doi.org/10.1055/s-0041-1736523 |
| `capino2020` | Capino AC, Thomas AN, Baylor S, Hughes KM, Miller JL, Johnson PN. Antipsychotic use in the prevention and treatment of intensive care unit delirium in pediatric patients. J Pediatr Pharmacol Ther. 2020;25(2):81–95. | https://doi.org/10.5863/1551-6776-25.2.81 |
| `phan2008_dexmed` | Phan H, Nahata MC. Clinical uses of dexmedetomidine in pediatric patients. Paediatr Drugs. 2008;10(1):49–69. | https://doi.org/10.2165/00148581-200810010-00006 |
| `bruni2015_melatonin` | Bruni O, Alonso-Alconada D, Besag F, et al. Current role of melatonin in pediatric neurology: clinical recommendations. Eur J Paediatr Neurol. 2015;19(2):122–133. (Age-banded pediatric sleep dosing; not delirium-specific.) | https://doi.org/10.1016/j.ejpn.2014.12.007 |
| `peds_apsych_sr2025` | Cavagnero F, et al. Antipsychotic medications for delirium treatment in the pediatric intensive care unit: a systematic review. Paediatr Drugs. 2025;27(6):707-722. | https://doi.org/10.1007/s40272-025-00716-3 |
| `picuup_kudchadkar` | Kudchadkar SR, et al. PICU Up! multicenter early mobility trial (protocol: Azamfirei R, et al. Trials. 2023;24(1):191). NCT04989790. | https://clinicaltrials.gov/study/NCT04989790 |
| `williams2025_picsp` | Williams CN, Pinto NP, Colville GA. Pediatric post-intensive care syndrome and current therapeutic options. Crit Care Clin. 2025;41(1):53-71. | https://doi.org/10.1016/j.ccc.2024.08.001 |
| `sandau2017_ecg` | Sandau KE, Funk M, Auerbach A, et al. Update to practice standards for electrocardiographic monitoring in hospital settings: a scientific statement from the American Heart Association. Circulation. 2017;136(19):e273-e344. | https://doi.org/10.1161/CIR.0000000000000527 |
| `gupta2021_capd_mv` | Gupta N, et al. Performance of the Cornell Assessment of Pediatric Delirium scale in mechanically ventilated children. J Pediatr Intensive Care. 2023;12(1):24–30 (online 2021). (At CAPD ≥ 9: overall specificity 44.8%; 16.5% with developmental delay.) | https://doi.org/10.1055/s-0041-1728784 |
| `kerson2016_rass` | Kerson AG, DeMaria R, Mauer E, et al. Validity of the Richmond Agitation-Sedation Scale (RASS) in critically ill children. J Intensive Care. 2016;4:65. (Pediatric RASS validation — the arousal scale the tool applies to verbal children.) | https://doi.org/10.1186/s40560-016-0189-5 |
| `schieveld2009` | Schieveld JNM, van der Valk JA, Smeets I, et al. Diagnostic considerations regarding pediatric delirium: a review and a proposal for an algorithm for pediatric intensive care units. Intensive Care Med. 2009;35(11):1843-1849. (Open access.) | https://doi.org/10.1007/s00134-009-1652-8 |
| `waak2022_picustars` | Waak M, et al. Every child, every day, back to play: the PICUstars protocol — implementation of a nurse-led PICU liberation program. BMC Pediatr. 2022;22:279. | https://doi.org/10.1186/s12887-022-03232-2 |

### Adult step-down / progressive-care tool (/stepdown/)

Sources this tool cites that are not already listed above (shared sources are not repeated; each is shown under the key this tool stores it as). Per-source archive status is in [references/INDEX.md](../references/INDEX.md).

| ID | Citation | DOI / URL |
|---|---|---|
| `beyer2024_camimc` | Beyer LP, et al. Disorientation as a delirium feature in non-intubated patients: development and evaluation of the CAM-IMC. BMC Anesthesiol 2024;24:451. | https://doi.org/10.1186/s12871-024-02849-3 |
| `han2015_rass` | Han JH, et al. The diagnostic performance of the RASS for detecting delirium in older ED patients. Acad Emerg Med 2015;22:878. | https://doi.org/10.1111/acem.12706 |
| `chester2012_mrass` | Chester JG, et al. Serial administration of a modified RASS for delirium screening. J Hosp Med 2012;7:450. | https://doi.org/10.1002/jhm.1003 |
| `kuczmarska2016` | Kuczmarska A, et al. Detection of delirium in hospitalized older general medicine patients: a comparison of the 3D-CAM and CAM-ICU. J Gen Intern Med 2016;31:297. | https://doi.org/10.1007/s11606-015-3514-0 |
| `neufeld2013_postop` | Neufeld KJ, et al. Evaluation of two delirium screening tools for detecting post-operative delirium in the elderly. Br J Anaesth 2013;111:612. | https://doi.org/10.1093/bja/aet167 |
| `marcantonio2022_ubcam` | Marcantonio ER, et al. Comparative implementation of a brief app-directed protocol for delirium identification by hospitalists, nurses, and nursing assistants. Ann Intern Med 2022;175:65. | https://doi.org/10.7326/M21-1687 |
| `rousseau2021_pics` | Rousseau AF, Prescott HC, Brett SJ, et al. Long-term outcomes after critical illness: recent insights. Crit Care 2021;25:108. | https://doi.org/10.1186/s13054-021-03535-3 |
| `nakanishi2024_picsfollowup` | Nakanishi N, Liu K, Hatakeyama J, et al. Post-intensive care syndrome follow-up system after hospital discharge: a narrative review. J Intensive Care 2024;12:2. | https://doi.org/10.1186/s40560-023-00716-w |
| `mariz2013_edimcu` | Mariz J, Santos NC, Afonso H, et al. Risk and clinical-outcome indicators of delirium in an emergency department intermediate care unit (EDIMCU): an observational prospective study. BMC Emerg Med 2013;13:2. | https://doi.org/10.1186/1471-227X-13-2 |
| `martinez2012` | Martinez JA, et al. Derivation and validation of a clinical prediction rule for delirium in patients admitted to a medical ward. BMJ Open 2012;2:e001599. | https://doi.org/10.1136/bmjopen-2012-001599 |
| `siddiqi2016` | Siddiqi N, et al. Interventions for preventing delirium in hospitalised non-ICU patients. Cochrane Database Syst Rev 2016;CD005563. | https://doi.org/10.1002/14651858.CD005563.pub3 |
| `ags2015` | American Geriatrics Society. Abstracted clinical practice guideline for postoperative delirium in older adults. J Am Geriatr Soc 2015;63:142. | https://doi.org/10.1111/jgs.13281 |
| `neufeld2016` | Neufeld KJ, et al. Antipsychotic medication for prevention and treatment of delirium in hospitalized adults: a systematic review and meta-analysis. J Am Geriatr Soc 2016;64:705. | https://doi.org/10.1111/jgs.14076 |
| `oh2019` | Oh ES, et al. Antipsychotics for preventing delirium in hospitalized adults: a systematic review. Ann Intern Med 2019;171:474. | https://doi.org/10.7326/M19-1859 |
| `nikooie2019` | Nikooie R, et al. Antipsychotics for treating delirium in hospitalized adults: a systematic review. Ann Intern Med 2019;171:485. | https://doi.org/10.7326/M19-1860 |
| `wang2017` | Wang PP, et al. Opioid-associated iatrogenic withdrawal in critically ill adult patients. Ann Intensive Care 2017;7:88. | https://doi.org/10.1186/s13613-017-0310-5 |
| `lisibach2022` | Lisibach A, et al. Quantifying anticholinergic burden and its association with delirium (comparison of 19 scales). Br J Clin Pharmacol 2022;88:4915. | https://doi.org/10.1111/bcp.15432 |

---

## 4. Known limitations

These are stated by the tool itself or follow directly from how it is implemented:

1. **The risk-factor tally is a non-validated heuristic.** It is a count of present factors, not a calibrated probability. Every factor counts **+1** (a flat checklist, no weighting), and the band boundaries are explicitly labelled heuristic. For validated ICU prediction the tool directs clinicians to **E-PRE-DELIRIC** (admission) and **PRE-DELIRIC** (after 24 h). The only score-linked escalation prompt (geriatrics above a count of 6) is pragmatic and labelled as such; there is no score-triggered psychiatry suggestion.
2. **Adult-ICU scope (a prominent panel at the pathway picker, not just prose).** CAM-ICU, RASS, and ABCDEF are validated for the **adult ICU**; **ICDSC** is the in-ICU alternative screen. They are not validated for other settings. The picker panel directs users to the setting-appropriate validated tool: **ED → bCAM (DTS → bCAM) or 4AT**; **general / step-down ward → 3D-CAM or 4AT**; **pediatric ICU → pCAM-ICU (≥ 5 yr) / psCAM-ICU (6 mo–5 yr) / CAPD (all ages)**; **pregnancy →** the adult ICU screens apply but medication safety/dosing must be adjusted. The framing is "developed and validated in the adult ICU; use the setting-appropriate tool elsewhere," not a claim that these instruments were disproven outside the ICU.
3. **CAM-ICU is a screen, not a diagnosis.** The tool flags reduced accuracy in primary neurologic injury/TBI, aphasia, and deep sedation; requires scoring against the patient's baseline; and notes that missed cases are predominantly hypoactive, hence the every-shift screening.
4. **CIWA-Ar is not validated in intubated/sedated/delirious patients.** CIWA-Ar requires an awake, communicative, non-delirious patient who can self-report; for withdrawal delirium and intubated/sedated ICU patients the tool directs monitoring with an objective structured scale (RASS, CAM-ICU, MINDS) per the institutional withdrawal protocol (`asam2020`, `awissi2013`).
5. **The deliriogenic list is a review prompt, not a risk ranking.** Of 103 agents, the strongest classes (benzodiazepines, opioids, anticholinergics) are on by default and the rest are opt-in; benzodiazepines, strong anticholinergics, and meperidine carry a citation-backed *higher-risk* flag. Actual risk still varies by agent, dose, route, organ function, interactions, and temporal association. Beers Criteria apply to adults ≥ 65.
6. **No pharmacotherapy is FDA-approved for delirium.** Antipsychotics have not been shown to treat or shorten delirium (MIND-USA negative; PADIS 2025 was unable to recommend for or against); the tool restricts them to short-term control of dangerous agitation with documented indication, QTc monitoring, daily reassessment, and no discharge continuation without a psychiatric indication. Doses shown are generic starting-point references ("cap per local protocol"), not orders.
7. **Not a record system.** The assessment is a session scratchpad that clears on reload and is not saved to any chart; the PDFs are generated locally. The tool is not a substitute for the medical record or for a sanctioned order set.
8. **Subtype figures are the proportion of delirious cases** (la Cour 2022), not population prevalence (Krewulak 2018); they are approximate, drawn from the cited reviews, and should not be quoted as exact constants.
9. **Reference-archive completeness.** A substantial minority of registry sources are cited by canonical URL but not held in the local archive; `references/INDEX.md` records the per-source archive status ("not archived" rows) and is the authoritative list, and the §3 registry marks the same sources **†**. Examples include Sessler 2002 (RASS), Inouye 1990 (the original CAM), the Pro-MEDIC main RCT (only the statistical-analysis plan and an editorial are archived), Clegg & Young 2011, and the Wernicke thiamine-dose sources (EFNS, RCP).

---

## 5. Questions for clinical reviewers

**Resolved in the current revision** (recorded in the change log, §6.5):

- **(1) Risk-factor weighting**: flattened to all +1 (the dementia +2 was removed) so the unvalidated tally cannot imply a calibration. (Whether *"high APACHE-II"* / *age ≥ 70* are the right operationalisations remains open to review.)
- **(2) Risk-band escalation**: the score-triggered psychiatry suggestion was removed (psychiatry follows clinical features, not a count). Geriatrics above 6 is kept, relabelled "pragmatic, not validated."
- **(3) CAM-ICU inattention cut-point**: the Pictures ASE wording was corrected to the validated 10-item recognition task (> 2/10), so the > 2-error cut-point is equivalent across modalities.
- **(5) Subtype wording**: restated as the *proportion of delirious cases* (la Cour 2022), explicitly distinguished from population prevalence (Krewulak 2018).
- **(6) Deliriogenic-list breadth/defaults**: higher-risk agents now flagged (benzodiazepines, strong anticholinergics, meperidine); the long tail defaults off (opt-in); dexmedetomidine delisted; metoclopramide recategorised.
- **(8) Thiamine guidance**: now cited (ESPEN at-risk range; EFNS vs RCP Wernicke regimens stated as a disclosed divergence, see §2.6).

**Addressed this revision, with residual points a reviewer may still weigh:**

- **(4) RASS target and caution zoning**. *Resolved:* the light **0 to −2** is the only savable/shareable default; the mislabeled "−2 to −3 (moderate sedation)" option was corrected to a **−3 to −4 (deep: indication required)** band that is indication-gated (required reason + association-worded caution), and RASS −5 is now always flagged danger so a deep target cannot mask over-sedation. (Whether the amber/red zoning edges are exactly right remains open to review.)
- **(7) Dosing references**. *Resolved:* labelled "conventional / expert starting references, not guideline-calibrated for delirium" (rather than attributing them to specific named sources), with the note that dexmedetomidine is a sedative infusion for ventilated patients, not a PRN antipsychotic-equivalent, so the agents are not interchangeable.
- **(9) Melatonin**. *Resolved:* kept as a low-risk sleep/circadian adjunct, not a delirium treatment; the "low-certainty ICU evidence" claim is anchored to the dedicated evidence (`promedic2022` + `melatonin_meta2025`), and (per the 2026-07-01 revision) the PADIS 2025 **conditional recommendation FOR melatonin** is now surfaced with its own `padis2025` cite (low certainty; no dose specified), the 0.5–3 mg range is labelled conventional sleep dosing not drawn from the cited trials (Pro-MEDIC used 4 mg), and ramelteon is noted as the PADIS-named alternative.
- **(10) Out-of-scope gate**. *Resolved:* a prominent (non-blocking) adult/ICU scope panel now sits at the pathway picker with setting-specific redirects (ED → bCAM/4AT; ward → 3D-CAM/4AT; peds → pCAM-ICU/psCAM-ICU/CAPD; pregnancy → adjust drug safety); ICDSC was kept as the in-ICU alternative and the Setup screening-tool selector trimmed to the two adult-ICU screens (CAM-ICU, ICDSC) so it no longer implies ward/ED validity.


## 6. Maintenance & provenance

This section describes how the source content in this repository is kept accurate and traceable: how each change is recorded, what prompts a re-check when a cited source is updated, how evidence is graded, and how the validated published instruments (CAM-ICU, RASS) are attributed and kept distinct from the tool's own checklists. It is a maintenance and provenance record for the code in this repository, not a clinical endorsement. Clinical governance for any deployment is the adopter's responsibility (§6.1).

### 6.1 Adoption, licensing, and responsibility

This project is open-source software, released under the MIT License (see `LICENSE`). Anyone may use, copy, modify, and adopt it, in whole or in part, and adapt it to their own setting.

It is provided **"as is", without warranty of any kind** (as the MIT License states). It is a **reference aid that assists — and does not replace — clinical judgment, local protocol, and prescriber/pharmacy review** (§1). It is **not a validated clinical decision-support device and is not cleared, certified, or validated for any specific clinical decision**.

**Governance is the adopter's responsibility.** Anyone who deploys this tool, or a derivative of it, for clinical use owns the clinical governance for that deployment: validating the content against current sources for their population, obtaining whatever local clinical, pharmacy, and information-governance review or sign-off their institution requires, and making their own regulatory determination for their jurisdiction and intended use. The maintainers provide the source content and its citations as reference material; they **do not sign off adopters' deployments, and take no ownership of, or responsibility for, any clinical use, decision, or outcome.** An adopter who wants a clinical sign-off can obtain one; it is theirs to arrange, and it binds their deployment, not this project.

What this repository does maintain — as engineering hygiene, not a clinical warranty — is a record of what the content is and where it comes from: the citation registry (§3), the evidence-grade scheme (§6.4), the change log (§6.5), the source-watch that flags when a cited source is updated (§6.3), and the instrument attribution that keeps the validated published instruments distinct from the tool's own checklists (§6.6).

### 6.2 Content version & change history

```
Content version : 2026.07 (content revised through 2026-07-31)
Change history  : every clinical-content change is recorded in the change log (§6.5)
Source watch    : re-checks are prompted when a cited source updates (§6.3)
```

There is no central review-and-approve gate in this repository. An adopting unit records its own review dates and approvals for its deployment (for example, in the Setup tab's protocol-version and review fields); those belong to the adopter and are not a statement about this repository's content.

### 6.3 Review cadence: source-cycle triggers

ED source watch (added with §2.11): the 4AT form version (v1.2, the4at.com),
GED Guidelines 2.0 (Lee 2026, new; watch for errata/updates), the Vanderbilt
DTS/bCAM manuals (eddelirium.org, v1.0 2015), SIGN 157, NICE CG103, and the
ADEPT tool / ACEP ED-DEL change package. Re-verify on each release that the
rendered instrument wording still matches the archived copies in
`references/ed/`.

The base cadence is an **annual full review**. In addition, any publication in the table below triggers an **out-of-cycle review** of the rows it governs, within the stated window. When a trigger fires, update the affected content *and its citation together* (per the project's hard invariant), log a change-log row (§6.5).

| Source | Governs (tool sections) | Cadence / what to watch | Action on update |
|---|---|---|---|
| **PADIS** (SCCM) — `padis2018`, `padis2025` | §2.5, §2.7, §2.8, dosing table, RASS target rationale | Irregular; full guideline 2018, focused update 2025. Watch SCCM for the next focused update or full revision | Re-review sedation/analgesia choice, antipsychotic stance, dexmedetomidine niche, and dose anchors; confirm "no recommendation for/against antipsychotics to treat delirium" still holds |
| **AGS Beers Criteria** — `beers2023` | §2.8 deliriogenic list, the ≥ 65 framing | ~Every 3 years (2023 current; next update expected ~2026 — watch JAGS) | Reconcile the 11-category / 103-agent list and anticholinergic flags against the new edition; bump the citation year |
| **CAM-ICU** — `ely2001`, `camicu_worksheet`, `camicu_manual`, `icudelirium_monitoring` | §2.2 (feature logic, SAVEAHAART, Pictures-ASE) | Instrument owned by Vanderbilt CIBS Center (Ely). Worksheet/Manual last rev. 2016. Watch icudelirium.org for worksheet/manual revisions and any change to the Pictures-ASE / ASE operationalisation | Re-verify the four-feature algorithm and cut-points are reproduced faithfully; confirm the Pictures-ASE remains the validated 10-item > 2/10 task |
| **RASS** — `sessler2002`, `ely2003` | §2.3 scale anchors, arousal gate | Scale is fixed/validated and stable; effectively no revision cadence. Watch only the procedural reference (`rass_mdcalc`) and PADIS-driven target-band guidance | Confirm the +4…−5 anchors are verbatim; the configurable target band is local, not part of the validated scale |
| **NICE** — `nice_cg103` (delirium), `nice_ng10` (violence/aggression) | §2.2, §2.5, §2.7 | NICE runs rolling surveillance; CG103 last updated 2023. Watch nice.org.uk for CG103/NG10 status changes | Re-review prevention and de-escalation/restraint content; update the "(updated YYYY)" designation |
| **FDA Clinical Decision Support guidance** (final, Jan 2026; 4-criterion non-device CDS structure) | Whole-tool design discipline; the §6.7 design principles | Watch FDA for revisions to the CDS guidance and adjacent software-function policy | Re-check against the §6.7 non-device CDS design principles (supports-not-directs; basis independently reviewable) |
| **SCCM ICU Liberation pages** — `sccm_abcdef`; **ICUDelirium.org** Vanderbilt pages | §2.5, §2.6, §2.2 | Living web resources; no fixed cadence. Check at each annual review | Re-confirm bundle elements and mnemonic content match the current pages |
| **Thiamine (ESPEN / EFNS / RCP)** | §2.6 "U" domain (at-risk 100–300 mg/day; Wernicke EFNS 200 mg TID vs RCP 500 mg TID) | Now cited: `espen_icu`, `efns_wernicke`, `rcp_wernicke`. Guidelines diverge on the Wernicke dose and the evidence is low-certainty | On update, re-confirm the divergence note still reflects current ESPEN / EFNS / RCP (and BAP) guidance |
| **Fixed trials** — `mindusa2018` (MIND-USA), `mends2` (MENDS2), `promedic2022` (Pro-MEDIC), `pun2019`, `hshieh2015` | §2.7, §2.8 | No cadence (single studies). Watch only for a practice-changing replication or pooled analysis | If superseded, log the change and re-grade the affected recommendation |

### 6.4 Evidence-tier / grade scheme

Every numeric or directive output carries a tier so a reviewer can see at a glance whether it rests on a validated instrument, a guideline, a label, or a pragmatic choice. The tier is recorded in the change log (§6.5) and should be surfaceable to the clinician (citation + grade visible, FDA non-device CDS criterion 4).

| Tier | Meaning | Examples in this tool | Maintenance rule |
|---|---|---|---|
| **V — Validated instrument** | Published, psychometrically validated, reproduced faithfully | CAM-ICU, RASS, PRE-DELIRIC / E-PRE-DELIRIC (as referrals) | Reproduce verbatim. Any deviation from the source algorithm/cut-point must be re-tiered **P** and labelled as a modification (§6.6) |
| **G — Guideline recommendation** | From a society/national guideline; carry the source's own strength/certainty where stated | PADIS, NICE CG103/NG10, AGS Beers, SCCM ABCDEF | Track the guideline's GRADE strength + certainty; re-review on each guideline revision (§6.3) |
| **R — Regulatory / label** | Drug label or regulatory guidance | Haloperidol PI (boxed warnings, QTc), FDA CDS guidance | Update when the label/guidance changes |
| **P — Pragmatic / non-validated** | Home-grown; explicitly unvalidated | Risk-factor tally (flat +1 per factor, no weighting), band cut-points 0–3 / 4–6 / 7–10 / 11–15, geriatrics-consult > 6 escalation | **Must be flattened/relabelled or carry an explicit "pragmatic, not validated" note.** A P-tier number may never be presented as a calibrated score |

**Governing rule.** Anywhere the tool emits a number that drives an action (weighted scores, escalation thresholds, cut-points), that number is **P** unless it traces to a **V** instrument or a **G/R** source. P-tier numbers stay flattened or explicitly caveated; V-tier instruments stay faithful and attributed (§6.6).

### 6.5 Clinical-content change log

The change log — one row per change to a clinical value, threshold, band, dose, instrument logic, or citation, with its source, evidence tier, and whether the in-app text was updated in the same change — is maintained separately in [CLINICAL_CHANGELOG.md](CLINICAL_CHANGELOG.md).

### 6.6 Instrument provenance & attribution

CAM-ICU and RASS are **validated, published instruments** with named authors. They must be attributed correctly and reproduced faithfully, and they must stay **visually and functionally separate** from the tool's home-grown risk-factor tally so no clinician conflates the unvalidated checklist with the validated screens.

**CAM-ICU (Confusion Assessment Method for the ICU).** Developed by E. Wesley Ely and colleagues, Vanderbilt University (CIBS Center / icudelirium.org); validated in `ely2001`. Operationalisation (worksheet, training manual, Pictures-ASE) per `camicu_worksheet`, `camicu_manual`, `icudelirium_monitoring`. Reproduce the four-feature algorithm and its cut-points without alteration. The Pictures-ASE is implemented as the validated 10-item recognition task scored `> 2/10` (20%), the same cut-point as the 10-letter SAVEAHAART task. It is reproduced faithfully (tier V), with no tool-introduced cut-point deviation (corrected 2026-06-27; see §6.5).

**RASS (Richmond Agitation-Sedation Scale).** Developed by Sessler et al., 2002 (`sessler2002`); reliability/validity over time established by Ely et al., 2003 (`ely2003`). Reproduce the 10-point scale (+4 Combative … −5 Unarousable) verbatim. The **target band and colour zoning are a local, configurable, PADIS-informed overlay**, not part of the validated scale, and must remain visually distinct from the scale anchors so a configured target is never mistaken for a validated cut-point.

**Separation mandate.** The risk-factor tally (§2.1) is a non-validated count (tier P). It must not:
- adopt CAM-ICU or RASS visual styling, colour language, or results panel;
- be presented as a "score" without the "(not a validated score)" / "(heuristic)" qualifier the tool already carries;
- share a print block or PDF region with the CAM-ICU result in a way that implies a single validated output.

Any future UI change must preserve this separation. The instruments stay attributed and faithful (tier V); the tally stays flattened or explicitly caveated (tier P).

**Modification register.** Record here any place the tool deliberately departs from a source instrument, so reviewers can audit deviations at a glance.

| Instrument | Deviation | Tier | Disclosed where | Status |
|---|---|---|---|---|
| CAM-ICU | Pictures-ASE corrected to the validated 10-item > 2/10 task (no cut-point deviation) | V | §2.2, §6.5 | Resolved 2026-06-27 |
| CAM-ICU | Feature 3 had shipped in the superseded descriptor form (Alert vs Vigilant/Lethargic/Stuporous) — an **undisclosed deviation** found in the 2026-07-01 audit; replaced with the worksheet's RASS ≠ 0 operationalisation, so no deviation remains | V | §2.2, §6.5 | Resolved 2026-07-01 |
| CAM-ICU | Verdict gating now requires a documented RASS before any result (return to the source's two-step order; previously a verdict could be produced with RASS unset) | V | §2.2, §6.5 | Resolved 2026-07-01 |
| RASS | Configurable target band / colour zoning overlaid on the validated scale | P (overlay) | §2.3, Setup tab | Disclosed |
| CAPD (peds) | The source's point-age anchor columns (NB/4 wk/6 wk/8 wk/28 wk/1 yr/2 yr) are mapped to ranges that begin at each labeled age (score-neutral; picks which inline hint shows) | P (band mapping) | §7.1, `capd.js` comment | Disclosed 2026-07-01 |

### 6.7 Non-device CDS design principles

The tool is designed to the FDA non-device Clinical Decision Support criteria (Cures Act §520(o)(1)(E); Jan-2026 final guidance) as a **voluntary design discipline** — not a regulatory determination, clearance, or claim of status. Two criteria bind the content design and are worth preserving in any derivative:

- **Supports, does not direct.** Each output offers options or complete information for the clinician to weigh, not a single push-button directive. No output instructs a specific action without surfacing alternatives and the "verify against local policy / prescriber & pharmacy review" framing.
- **Basis is independently reviewable.** For every threshold, band, cut-point, and dose, the clinician can see the citation and its tier/grade (§6.4), so they can independently review the basis rather than rely on the tool. P-tier numbers carry the "pragmatic, not validated" note; V-tier instruments carry their attribution (§6.6).

An adopter that changes the tool's inputs (e.g., ingesting a device signal), its autonomy (issuing orders or acted-upon scores), its intended use, or its distribution should make its own device/non-device determination for that change; these design principles no longer speak for a materially altered derivative.

---

## 7. Pediatric tool (/peds/)

A sibling bedside reference for the pediatric ICU at `/peds/`, built on the same framework and held to the same rules. Clinical values are sourced; pharmacologic content is off-label and limited-evidence, and any deployment is validated by the adopting unit (§6.1). This section grows as the pediatric modules are added, beginning with screening.

### 7.1 Screening: arousal gate + CAPD / pCAM-ICU / psCAM-ICU

The user picks the validated screen for the child's age and developmental level; arousal is scored first as the gate.

**Arousal gate (all screens).** RASS **−4/−5** (or SBS **−2/−3**) = comatose → **"Unable to assess"**; screen once the child responds to voice (RASS ≥ −3). Same logic as the adult CAM-ICU gate (§2.2), carried into all three pediatric tools.

**CAPD (Cornell Assessment of Pediatric Delirium), all ages (0–21 yr).** Eight-item observational nursing screen rated over the shift against age-expected behavior; each item 0–4 (total 0–32). Items 1–4 (eye contact, purposeful actions, awareness, communication) are reverse-scored (Never = 4 … Always = 0); items 5–8 (restless, inconsolable, underactive, slow to respond) are scored Never = 0 … Always = 4. **Cut point ≥ 9 = positive** (Traube 2014: sensitivity 94.1%, specificity 79.2%). **Developmental-delay caveat surfaced at the result** (matching in-app text): CAPD ≥ 9 remains positive, but specificity falls in baseline developmental delay (Traube 2014: 51.2% at ≥ 9; Gupta 2021: 44.8% overall, 16.5% with delay in ventilated children), so the result is interpreted against the child's own developmental baseline and the anchors, with experienced-clinician or pediatric-psychiatry review when needed. The tool does not advise substituting a higher cut point: reduced specificity is a false-positive problem, not a validated replacement threshold, and the ventilated-cohort ≥ 17 figure is population-specific. The 0–32 score and positive/negative are withheld until all eight items are rated. **Anchor-band mapping:** the source anchor table defines point-age columns (NB, 4 wk, 6 wk, 8 wk, 28 wk, 1 yr, 2 yr); the tool maps a developmental age to the column whose labeled age it has reached (cuts at ≈0.92 / 1.38 / 1.84 / 6.44 / 12 / 24 months), so a child at or past a labeled age sees that column's anchors. The mapping is score-neutral (it selects the inline hint only) and is recorded in the §6.6 register as a disclosed P-tier presentation choice.

**pCAM-ICU (≥ 5 yr) and psCAM-ICU (6 mo–5 yr).** The CAM-ICU hierarchical algorithm, reused from the adult tool: **positive if Feature 1 AND Feature 2 AND (Feature 3 OR Feature 4)**, with the RASS arousal gate. **Feature 3 (altered level of consciousness) is derived from the recorded RASS/SBS**: a score of 0 (alert and calm) is absent, any other assessable level present. It is shown read-only rather than entered separately, so it can never contradict the arousal score (the same operationalisation the adult CAM-ICU and ED bCAM use; guarded by a unit test). pCAM-ICU uses verbal attention/command tasks (developmental age ≥ 5 yr); Feature 2 offers the validated **memory-pictures alternative** as an interactive on-screen task (show 5 pictures to memorize, then 10 recognition pictures scored Seen/New; same ≥ 3-error cut) alongside the squeeze-on-A letters, for children who cannot squeeze (either task at threshold makes Feature 2 positive). Feature 4 carries the instrument's alternate question set and the two-step command per the pCAM instruction tool ("now do that with the other hand" **or** "add one more finger"; the pediatric instrument gives the second step as a plain alternative, unlike the adult worksheet's cannot-use-both-hands conditional; do not repeat the number of fingers). The Feature-2 letters are read in an even tone "without stopping" per the instruction tool; no per-second rate is stated by the pediatric instrument (an earlier "about one per second" instruction traced to no cited source and was removed; see §6.5). psCAM-ICU uses age-adapted observational tasks (6 mo–5 yr); its **Feature 2 implements both validated positivity paths**: (1) no eye contact on ≥ 3 of 10 presentations, or (2) eye contact on 8+ presentations but **unable to maintain sustained eye opening during at least half the assessment despite verbal prompts** (the assessor talks to the child throughout as ongoing stimulation). Feature 2 is absent only if neither path is met (Smith 2016, Fig. 2/Table 3; psCAM worksheet). The result is withheld until Features 1 and 2 (and a secondary feature) are answered.

**Citations mapped (pediatric Screening tab):** CAPD → Traube 2014 (Crit Care Med 2014;42(3):656–663; PMID 24145848; cut point 9, developmental-delay specificity 51.2%); pCAM-ICU → Smith 2011 (Crit Care Med 2011;39(1):150–157; PMID 20959783; developmental age ≥ 5 yr); psCAM-ICU → Smith 2016 (Crit Care Med 2016;44(3):592–600; PMID 26565631; 6 mo–5 yr); arousal scales → Curley 2006 (State Behavioral Scale; Pediatr Crit Care Med 2006;7(2):107–114) and Sessler 2002 / Kerson 2016 (RASS, adult + pediatric validation); screening practice → SCCM PANDEM 2022 (Pediatr Crit Care Med 2022;23(2):e74–e110).

**Adopter validation:** the CAPD scoring direction and cut point, the developmental-delay caveat, and the age/developmental boundaries that route a child to CAPD vs psCAM-ICU vs pCAM-ICU should be confirmed by the adopting unit's pediatric-clinician review before clinical use.

### 7.2 Risk factors

A review aid listing reported associations, **not a validated predictive score** (no pediatric equivalent of PRE-DELIRIC is in routine bedside use). Factors are grouped modifiable vs patient/illness, each tagged by evidence strength; the clinician checks those that apply. No numeric score or band is computed or implied.

**Modifiable (review and minimize):** benzodiazepine exposure (the strongest, most consistent factor: dose-dependent, causal-effect estimate OR ≈ 3.3 from a marginal structural model, vs crude OR 4.4); deep sedation; anticholinergic cumulative burden; mechanical ventilation; physical restraints (partly confounded by indication); immobility / device tethering.

**Patient / illness:** young age (≤ 2 yr); developmental delay / baseline cognitive impairment; greater severity of illness; prior coma; prolonged PICU stay (both a risk marker and an outcome).

**Citations mapped (pediatric Risk tab):** Traube 2017 epidemiology & mortality (PMID 28288026, independent predictors: age ≤ 2, developmental delay, severity, prior coma, mechanical ventilation, benzodiazepines, anticholinergics; delirium independently predicted mortality, aOR 4.39); Traube 2017 international point-prevalence (PMID 28079605, ~25%); Mody 2018 benzodiazepine causal effect (PMID 29727363, the corrected reference; the previously cited 29879008 resolves to an unrelated paper); SCCM PANDEM 2022 (PMID 35119438).

**Adopter validation:** the risk-factor list, the evidence-strength tags, and the benzodiazepine effect-size wording should be confirmed by the adopting unit's pediatric-clinician review before clinical use.

### 7.3 Prevention bundle

The pediatric ABCDEF / PICU Liberation bundle, presented as a shift checklist with its evidence framing: non-pharmacologic multicomponent prevention is first-line and routine pharmacologic prophylaxis is not recommended; bundle benefit is best established for mortality and care-process measures rather than a proven reduction in delirium incidence, with benzodiazepine minimization the best-supported single lever.

**Elements:** A: pain (FLACC/FACES/self-report); B: spontaneous awakening + breathing trials, protocolized titration, watch iatrogenic withdrawal (WAT-1); C: light goal-directed sedation (SBS −1 to 0), minimize benzodiazepines, prefer dexmedetomidine; D: screen ≥ each shift; E: developmentally appropriate early mobility; F: family engagement. Plus non-pharmacologic sleep/circadian protection, day–night normalization, sensory aids, and minimizing restraints and deliriogenic medications. Melatonin/pharmacologic sleep aids are noted as **not established** for pediatric delirium prevention.

**Citations mapped (pediatric Prevention tab):** SCCM PANDEM 2022 (PMID 35119438); SCCM Pediatric ICU Liberation collaborative, Lin 2023 (Lin JC et al., Pediatr Crit Care Med 2023;24(8):636–651, PMID 37125798; previously mis-attributed to "Ista E"; higher bundle utilization associated with lower mortality, not consistently lower delirium incidence; an observational collaborative, not a randomized bundle trial); RESTORE goal-directed sedation (Curley 2015, JAMA, **negative for its primary mechanical-ventilation-duration outcome**; cited only for the SBS-titration model, not an efficacy claim); PICU Up! early mobility (Kudchadkar et al., Johns Hopkins; protocol Azamfirei, Trials 2023;24:191, PMID 36918956; **NCT04989790**, previously mis-attributed to "Choong K"); Mody 2018 benzodiazepine causal effect (PMID 29727363).

**Adopter validation:** the bundle elements, the SBS comfort-target wording, the "melatonin not established" statement, and the evidence-framing of bundle benefit should be confirmed by the adopting unit's pediatric-clinician review before clinical use.

**Out of scope, and why.** Post-PICU follow-up and PICS-p rehabilitation are not carried here, mirroring the step-down exclusion in §2.13: they are an outpatient service pathway rather than bedside screening, and the model is aspirational rather than established, with few broad-population PICU follow-up programs identified to date. A unit building that pathway should start from Williams 2025 (`williams2025_picsp`), which is also the source for the tool's statement that families are themselves affected. The **A-to-H bundle** lettering, which adds good nutrition/sleep (G) and home-care planning (H), is not adopted. Williams attributes it to a single proposal paper describing what some institutions have done and presents no outcome evidence for it. PANDEM 2022 does not use lettered-bundle framing at all: it names ABCDEF three times, as background in its opening, as an open research question about whether bundled care affects delirium and long-term outcomes, and as a citation, and never mentions A-to-H. The tool's own A–F lettering follows Lin 2023, whose subject is the ICU Liberation Bundle (ABCDEF), and its unlettered sleep, day–night, sensory and deprescribing measures already cover most of what G describes.

### 7.4 Pharmacology (Treatment + Medications)

**Framing:** treat the cause and apply the non-pharmacologic bundle first; drugs are adjunctive. Pharmacologic treatment of symptoms is reserved for short-term, refractory, safety-threatening agitation. All agents are **off-label** in pediatric delirium with **limited (retrospective/observational) evidence**. In reported PICU practice the atypicals are usually chosen before IV haloperidol, a prescribing-pattern and safety-profile preference (`madden2021_prescribing`, `capino2020`), **not a guideline ranking**: PANDEM's recommendation for severe refractory manifestations names "haloperidol or atypical antipsychotics" without preferring either (`pandem2022`), and the tool labels the hierarchy accordingly. The Medications tab opens with a prominent "not an order set: verify against formulary" banner. Doses are starting points from the literature, not orders; before use they must be reconciled by the adopting unit's pediatric-clinician + pharmacist review against a current pediatric dosing reference (Lexicomp Pediatric / Harriet Lane), with the edition pinned by the adopter.

**Sedation / sleep.** Dexmedetomidine 0.2–1 mcg/kg/hr IV, cited to Phan & Nahata 2008 (`phan2008_dexmed`, within its reported 0.2–2 mcg/kg/h pediatric-ICU range) (preferred, delirium-sparing; loading bolus often omitted in the PICU; bradycardia/hypotension; taper to avoid rebound; not a substitute for analgesia (opioid-sparing at most) nor reliable amnesia; **PICU continuous sedation is off-label**, while the current label's only pediatric indication is procedural sedation of non-intubated children ≥ 1 month for non-invasive procedures, `dex_label`; the earlier unqualified "off-label < 18 yr" predated that indication and was corrected, see §6.5). Benzodiazepines: limit/avoid as continuous sedation (independent dose-related risk). Melatonin 0.5–3 mg (younger) up to 3–5 mg (older) for sleep/circadian support, **not** a delirium treatment. The mg values are general pediatric sleep dosing cited to Bruni 2015 (`bruni2015_melatonin`), and the adult-ICU meta-analysis (`melatonin_meta2025`) anchors only the evidence framing, not the pediatric numbers.

**Antipsychotics (enteral unless noted).** Risperidone, started low and titrated by age/weight band: ≤ 2 yr ~0.01–0.04 mg/kg/day (Campbell 2020, a 17-patient cohort; pharmacist verification required), < 5 yr ~0.1 mg q12–24h, ≥ 5 yr ~0.2 mg q12–24h (Capino 2020, per Kishk); **no single daily maximum is shown**. The previously displayed ~2 mg/day (Capino 2020, per Schieveld, enteral 0.1–2 mg/day) was an unqualified figure that could read as spanning infants to adolescents, so the ceiling is deferred to a named institutional protocol / formulary for the child's age and weight. Quetiapine ~0.43–0.7 mg/kg/dose q8h: **initiation ≈ 1.5 mg/kg/day divided q8h; reported median 1.3 mg/kg/day, IQR 0.4–2.3** (Joyce 2015; this single representation is used identically in the app, the report data, and here). Olanzapine age-banded (infants ~0.625 mg, toddlers ~1.25 mg, older ~2.5–5 mg; Capino 2020). Haloperidol **reserve**, IV off-label: **no generic loading or maintenance dose is shown**. IV haloperidol is gated to a current institutional pediatric agitation/delirium protocol that must specify age/weight eligibility, route, the repeat interval, a maximum cumulative loading dose and maximum daily dose, ECG/electrolyte monitoring, contraindications, and treatment of acute dystonia (`haldol_label` for the QTc/torsades warnings). The cited case series (Capino 2020) repeated ~0.025–0.1 mg/kg/dose roughly q10min for 3–4 doses (loading totals 0.09–0.25 mg/kg, one dystonia in five children); that per-dose figure is no longer displayed as a numeric instruction, because at its upper bound four repeats (0.4 mg/kg) would exceed the observed totals and the tool cannot supply the protocol's interval or cumulative cap. The previously listed "~0.015–0.15 mg/kg/dose IV q6–8h" was the observed per-dose range of a single 5-patient 2002 case series (Harrison, via Capino 2020 Table 1, ventilated children on neuromuscular blockade) that Capino itself declines to convert into a recommendation; at q6h its upper bound permits 0.60 mg/kg/day, several-fold above published institutional protocols (e.g. maintenance 0.015–0.025 mg/kg/dose q6h with a 0.45 mg/kg/day maximum, or daily-dose titration 0.05 → 0.15 mg/kg/day divided for infants and young children). Maintenance dosing is therefore deferred to the unit formulary / pediatric pharmacist with an agreed **maximum daily dose**, which the adopting unit validates before use; any future numeric range must be age/weight-banded, carry an explicit daily maximum, and pin to a dated pediatric dosing reference.

**Monitoring (all antipsychotics).** Baseline 12-lead ECG (QTc), electrolytes, QT-drug review; read the QTc against age-, sex-, rhythm- and correction-formula-appropriate limits. The AHA practice standards give the pediatric reference range the card now states: "The normal upper limit for QTc among children 11 days to 16 years of age was identified as < 450 milliseconds" (`sandau2017_ecg`). A borderline/prolonged result prompts repeat/verify ECG, electrolyte correction, and interacting-drug review; QTc ≥ 500 ms, or a clear rise from the patient's own baseline, warrants urgent prescriber/pharmacy review under the local cardiology or medication-safety protocol, which sets the stop/reduce thresholds. The ≥ 500 ms trigger follows the same statement's general finding that a QTc above 500 ms carries higher torsades risk, and its Table 6 direction to stop the causative drug at that level; the pediatric section's own ≥ 500 ms sentence is specific to congenital long-QT syndrome and is not the basis here. No numeric threshold is given for the rise from baseline: the earlier "≥ 25% rise" and the "≥ 60 ms" that replaced it were both uncited, and a search of the reference archive found no source for either. Watch EPS/dystonia (most with haloperidol), NMS, and metabolic effects (olanzapine/quetiapine highest).

**Citations mapped (pediatric Treatment + Medications tabs):** Capino 2020 (`capino2020`, PMC7025750, registered and cited inline on the haloperidol/olanzapine/risperidone dose figures); Precedex label (`dex_label`, the pediatric procedural-sedation indication and the not-established-for-pediatric-ICU-sedation statement); SCCM PANDEM 2022 (`pandem2022`, PMID 35119438; the no-agent-preference antipsychotic recommendation, cited inline on the practice-preference statements); Campbell 2020 risperidone ≤ 2 yr (PMID 31771334); Joyce 2015 quetiapine safety (PMID 26469214); Madden prescribing/outcomes (J Pediatr Intensive Care 2024;13(1):46–54, online 2021; PMID 38571986); QTc-effects study (PMC7792149); Cavagnero 2025 pediatric antipsychotic systematic review (`peds_apsych_sr2025`, PMID 40906237); Phan & Nahata dexmedetomidine (`phan2008_dexmed`, Paediatr Drugs 2008, PMID 18162008; registered and cited on the infusion dose); Bruni 2015 pediatric melatonin dosing (`bruni2015_melatonin`); plus a pinned pediatric dosing reference (Lexicomp Pediatric / Harriet Lane) for the numeric weight-based values.

**Adopter validation:** every weight-based dose, route, frequency, and maximum (and the haloperidol correction in particular) should be confirmed by the adopting unit's pediatric-clinician + pharmacist review and pinned to a dated dosing reference before clinical use.

---

*This document describes the tool as implemented. Where the application's wording and this document differ, the in-application disclaimers and your institution's policy govern clinical use.*
