/**
 * data/refs.js — the pediatric citation registry. Each clinical claim links to a
 * real, verifiable primary source here; the UI renders per-tab reference lists
 * and inline superscript markers from it (see renderRefs in main.js). Citations
 * were re-validated against PubMed. `c` is the formatted citation, `u` its DOI /
 * PubMed / source URL.
 */
export const REFS = {
  traube2014_capd: {
    c: 'Traube C, et al. Cornell Assessment of Pediatric Delirium: a valid, rapid, observational tool for screening delirium in the PICU. Crit Care Med. 2014;42(3):656–663.',
    u: 'https://doi.org/10.1097/CCM.0b013e3182a66b76',
  },
  smith2011_pcam: {
    c: 'Smith HAB, et al. Diagnosing delirium in critically ill children: validity and reliability of the pCAM-ICU. Crit Care Med. 2011;39(1):150–157.',
    u: 'https://doi.org/10.1097/CCM.0b013e3181feb489',
  },
  smith2016_pscam: {
    c: 'Smith HAB, et al. The Preschool Confusion Assessment Method for the ICU (psCAM-ICU). Crit Care Med. 2016;44(3):592–600.',
    u: 'https://doi.org/10.1097/CCM.0000000000001428',
  },
  curley2006_sbs: {
    c: 'Curley MAQ, et al. State Behavioral Scale (SBS) for infants and young children on mechanical ventilation. Pediatr Crit Care Med. 2006;7(2):107–114.',
    u: 'https://doi.org/10.1097/01.PCC.0000200955.40962.38',
  },
  sessler2002_rass: {
    c: 'Sessler CN, et al. The Richmond Agitation–Sedation Scale (RASS). Am J Respir Crit Care Med. 2002;166(10):1338–1344.',
    u: 'https://pubmed.ncbi.nlm.nih.gov/12421743/',
  },
  traube2017_outcomes: {
    c: 'Traube C, et al. Delirium and mortality in critically ill children. Crit Care Med. 2017;45(5):891–898.',
    u: 'https://doi.org/10.1097/CCM.0000000000002324',
  },
  traube2017_prevalence: {
    c: 'Traube C, et al. Delirium in critically ill children: an international point prevalence study. Crit Care Med. 2017;45(4):584–590.',
    u: 'https://doi.org/10.1097/CCM.0000000000002250',
  },
  mody2018_benzo: {
    c: 'Mody K, et al. Benzodiazepines and development of delirium in critically ill children: estimating the causal effect. Crit Care Med. 2018;46(9):1486–1491.',
    u: 'https://doi.org/10.1097/CCM.0000000000003194',
  },
  pandem2022: {
    c: 'Smith HAB, et al. 2022 SCCM PANDEM clinical practice guidelines (pain, agitation, neuromuscular blockade, delirium, environment, early mobility) in critically ill pediatric patients. Pediatr Crit Care Med. 2022;23(2):e74–e110.',
    u: 'https://doi.org/10.1097/PCC.0000000000002873',
  },
  ista2023_liberation: {
    c: 'Ista E, et al. Caring for critically ill children with the ICU Liberation Bundle (ABCDEF): pediatric collaborative results. Pediatr Crit Care Med. 2023.',
    u: 'https://doi.org/10.1097/PCC.0000000000003262',
  },
  campbell2020_risperidone: {
    c: 'Campbell CT, et al. Risperidone dosing for pediatric delirium in children ≤ 2 years. Ann Pharmacother. 2020;54(5):464–469.',
    u: 'https://doi.org/10.1177/1060028019891969',
  },
  joyce2015_quetiapine: {
    c: 'Joyce C, et al. Safety of quetiapine in treating delirium in critically ill children. J Child Adolesc Psychopharmacol. 2015;25(9):666–670.',
    u: 'https://doi.org/10.1089/cap.2015.0093',
  },
  madden2021_prescribing: {
    c: 'Madden K, et al. Antipsychotic drug prescription in pediatric intensive care units: a 10-year U.S. database study. J Pediatr Intensive Care. 2021.',
    u: 'https://doi.org/10.1055/s-0041-1736523',
  },
  peds_apsych_sr2025: {
    c: 'Cavagnero F, et al. Antipsychotic medications for delirium treatment in the pediatric intensive care unit: a systematic review. Paediatr Drugs. 2025;27(6):707-722.',
    u: 'https://doi.org/10.1007/s40272-025-00716-3',
  },
  melatonin_meta2025: {
    c: 'Tang BHY, et al. Melatonin use in the ICU: a systematic review and meta-analysis. Crit Care Med. 2025;53(9):e1714–e1724. (Adult ICU; not established for pediatric delirium prevention.)',
    u: 'https://doi.org/10.1097/CCM.0000000000006767',
  },
  picuup_choong2023: {
    c: 'Choong K, et al. PICU Up! early mobility trial. NCT04989790.',
    u: 'https://clinicaltrials.gov/study/NCT04989790',
  },
  haldol_label: {
    c: 'Haloperidol prescribing information (boxed warnings; QTc / torsades). DailyMed, U.S. NLM.',
    u: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8397a841-f240-4767-9dcd-781e6d3f7c7f',
  },
};
