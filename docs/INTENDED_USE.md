# Intended Use & Limitations

*Status: reference aid — unvalidated. Read before clinical use.*

---

## 1. Intended use

This tool is an **electronic bedside reference aid** for the recognition, prevention, and supportive management of **delirium in critically ill adults**. It assembles validated screening instruments (CAM-ICU, RASS), a prevention bundle (ABCDEF / ICU Liberation), a structured causative-factor review (DELIRIUM(S)), and cited reference material into a single bedside surface, and produces a printable summary for the chart-adjacent workflow.

It is intended to **support** the clinical reasoning of a qualified clinician — never to make, direct, or automate a clinical decision. The clinician's independent judgment, the institution's local protocol, and prescriber/pharmacy review govern every action. The user is expected to be able to review, and to choose not to rely on, any suggestion the tool surfaces.

## 2. Intended users

Licensed clinicians caring for adult ICU patients — intensivists and other physicians, advanced-practice providers, critical-care nurses, and clinical pharmacists — who are independently trained and credentialed in delirium assessment and ICU pharmacotherapy. It is **not** intended for patients, families, the public, students acting without supervision, or any user who would treat its output as a directive rather than a prompt for their own assessment.

## 3. Care setting

**Adult intensive care unit.** The tool is built around instruments validated in the adult ICU: CAM-ICU, RASS, and the ABCDEF bundle. The Setup defaults (e.g., RASS target 0 to −2) and the prevention/treatment content assume an ICU context.

## 4. What the tool does

- Presents the **CAM-ICU** four-feature algorithm with the RASS arousal gate, and the **RASS** scale, faithfully to their source instruments, with citations visible at the point of use.
- Offers a **count of present risk factors** as a checklist prompt, and surfaces validated ICU prediction models (E-PRE-DELIRIC at admission, PRE-DELIRIC after 24 h) as the calibrated alternatives.
- Provides **non-pharmacologic, first-line** prevention and management content (ABCDEF, sleep/orientation measures, T-A-D-A, the DELIRIUM(S) differential) as the cornerstone of care.
- Displays **generic, institution-agnostic dosing references** for agents used only for short-term control of dangerous agitation, each carrying its safety cautions and PADIS-anchored framing, explicitly labelled "cap per local protocol."
- Provides a **medication-review prompt** (a deliriogenic-agent list) to support, not replace, a pharmacist/prescriber medication review.
- Generates a **local, in-browser printable summary**. All computation runs in the browser; no patient data is transmitted or stored server-side.

## 5. What the tool does NOT do

- It does **not diagnose** delirium. A positive CAM-ICU is a **screen, not a diagnosis** — confirm clinically and exclude mimics.
- It does **not issue orders, prescriptions, or an order set**, and is not a substitute for one.
- It does **not autonomously direct** management, escalate care, or compute a validated probability, severity, or acuity score that should be acted on without independent review. Numeric outputs are prompts, not determinations (see §8).
- It does **not** acquire, process, or analyze any medical image, waveform, monitor feed, or physiologic signal; it operates only on clinician-entered observations.
- It is **not** a medical record. Entries are a session scratchpad that clears on reload and are not saved to any chart.
- It is **not** a real-time or alarm/monitoring system, and must not be used as one.

## 6. Validation status — and that clinical judgment governs

**This tool is not a validated clinical decision-support device.** The bundling, the risk-factor tally, the band cut-points, and the escalation prompts are **pragmatic and unvalidated** — they have not been prospectively calibrated or shown to improve outcomes. Where a number could imply a calibration the tool does not possess, it is labelled accordingly (heuristic / a count, not a validated score). The validated instruments it presents (CAM-ICU, RASS) carry the operating characteristics of their original validation only when used exactly as specified, in the population in which they were validated.

In every case, **the clinician's independent assessment, local protocol, and prescriber/pharmacy review take precedence over anything this tool displays.** Verify all medication decisions against current institutional policy.

> **Load-bearing disclaimer (verbatim, surfaced in the application):**
> *"Reference aid only. This tool supports — and does not replace — clinical judgment, local protocol, and prescriber/pharmacy review. It is not a standalone order set or a validated decision-support device. Verify all medication decisions against current institutional policy."*

## 7. Out-of-scope populations and settings

The tool has **not** been designed or validated for, and must not be transplanted unmodified onto, the following. Use a setting- and population-appropriate, locally validated instrument instead.

- **Paediatric and neonatal patients.** CAM-ICU, RASS, and the prevention/dosing content are adult instruments. (Paediatric ICU delirium has its own validated tools, e.g., CAPD/pCAM-ICU/psCAM-ICU, RASS-adapted scales — not implemented here.)
- **Pregnancy and the peripartum patient.** Drug-safety, dosing, and risk content are not adjusted for pregnancy or lactation.
- **General medical/surgical ward and step-down patients.** CAM-ICU/RASS/ABCDEF are not validated outside the ICU; on the ward, use a ward-validated screen (**4AT / 3D-CAM**), as the tool advises.
- **Peri-operative ward / PACU and procedural sedation** outside the ICU context.
- **Emergency, pre-hospital, ambulatory, long-term-care, and hospice settings.**
- Any **time-critical or autonomous** decision where a clinician cannot independently review the basis before acting.

## 8. How the outputs are to be read (numbers vs. validated instruments)

So that the tool **supports rather than directs**:

- **Validated instruments are presented faithfully.** CAM-ICU logic, the RASS scale, and PADIS-anchored dosing reflect their primary sources and carry visible citations.
- **Home-grown numbers are flattened or flagged.** The risk-factor total is a **count of present factors, not a probability**; its band boundaries and any consult/escalation suggestions are **heuristic** and qualified "per local protocol." They are options to weigh, not thresholds that command an action.
- **Every clinical value is reviewable at its source.** Each threshold, score band, criterion, and dose maps to a cited primary source so the clinician can independently check the basis and reach an independent conclusion.

## 9. Pharmacologic note

**No agent is FDA-approved to prevent or treat delirium.** Non-pharmacologic measures are first-line. Antipsychotics **do not treat or shorten delirium** (PADIS gives no recommendation for or against; MIND-USA was negative); where used, they are reserved for **short-term control of dangerous agitation** with a documented safety indication, baseline/serial QTc monitoring, the lowest effective dose, daily reassessment for discontinuation, and no continuation at discharge without a psychiatric indication. Dexmedetomidine is framed to its ventilated-patient sedation niche. All doses shown are **generic starting-point references**, not orders, and must be reconciled with the patient and local policy.

## 10. Regulatory posture (device / non-device)

This is an **internal, non-distributed reference aid**. As an internal tool that is not offered for sale or distributed as a commercial product, it is outside FDA premarket reach. Notwithstanding that, it is **built voluntarily to the FDA Non-Device Clinical Decision Support rubric** (FD&C Act §520(o)(1)(E), as amended by the 21st Century Cures Act; per the current CDS final guidance, the four-criterion structure) as a design discipline. Specifically, it is designed so that it would satisfy:

1. It does **not** acquire, process, or analyze a medical image, a signal from an in-vitro diagnostic, or a pattern/signal from a signal-acquisition system.
2. It **displays, analyzes, or prints** medical information and established clinical reference material about a patient.
3. It is intended to **support or provide recommendations** to a clinician about prevention, diagnosis, or treatment — offering options and complete, cited information rather than a single push-button directive.
4. It is intended to enable the clinician to **independently review the basis** for any recommendation (citation and evidence grade visible), so that the clinician is **not expected to rely primarily** on the tool.

Adherence to this rubric is a **self-imposed design standard, not a regulatory determination or clearance**, and does not constitute legal or regulatory advice. Any future change in distribution, intended use, or autonomy (e.g., issuing orders, computing acted-upon scores, or external release) requires a fresh device/non-device assessment before that change ships.

---

*This statement describes intended use and limitations as a design anchor for formal clinical review. Where this statement, the in-application disclaimers, and your institution's policy differ, the in-application disclaimers and local policy govern clinical use.*
