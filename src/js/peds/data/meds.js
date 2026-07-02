/**
 * data/meds.js — the medications shown in the Medications tab, as data so the
 * "given this shift" checklist and the printed report can list the selected
 * agents and their starting doses. Doses mirror the Medications tab and carry the
 * same off-label, pharmacist-sign-off framing; sources in docs/CLINICAL_METHODOLOGY.md.
 */
export const MEDS = [
  {
    id: 'dexmed',
    group: 'Sedation & sleep',
    name: 'Dexmedetomidine',
    dose: '0.2–1 mcg/kg/hr IV infusion, titrated to a light goal',
  },
  {
    id: 'benzo',
    group: 'Sedation & sleep',
    name: 'Benzodiazepine (midazolam / lorazepam)',
    dose: 'Limit / avoid as continuous sedation',
  },
  {
    id: 'melatonin',
    group: 'Sedation & sleep',
    name: 'Melatonin',
    dose: '0.5–3 mg PO at bedtime (younger); up to 3–5 mg (older)',
  },
  {
    id: 'risperidone',
    group: 'Antipsychotic (off-label)',
    name: 'Risperidone',
    dose: '< 5 yr ~0.1 mg q12–24h; ≥ 5 yr ~0.2 mg q12–24h',
  },
  {
    id: 'quetiapine',
    group: 'Antipsychotic (off-label)',
    name: 'Quetiapine',
    dose: '~0.43–0.7 mg/kg/dose q8h (initiation ≈ 1.5 mg/kg/day; reported median 1.3 mg/kg/day)',
  },
  {
    id: 'olanzapine',
    group: 'Antipsychotic (off-label)',
    name: 'Olanzapine',
    dose: 'Infants ~0.625 mg; toddlers ~1.25 mg; older ~2.5–5 mg',
  },
  {
    id: 'haloperidol',
    group: 'Antipsychotic (off-label)',
    name: 'Haloperidol (reserve)',
    dose: 'IV load ~0.025–0.1 mg/kg/dose; maintenance ~0.015–0.15 mg/kg/dose q6–8h',
  },
];
