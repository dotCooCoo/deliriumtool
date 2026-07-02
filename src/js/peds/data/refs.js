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
  lin2023_liberation: {
    c: 'Lin JC, Srivastava A, Malone S, et al. Caring for critically ill children with the ICU Liberation Bundle (ABCDEF): results of the pediatric collaborative. Pediatr Crit Care Med. 2023;24(8):636–651.',
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
    c: 'Madden K, et al. Antipsychotic drug prescription in pediatric intensive care units: a 10-year U.S. retrospective database study. J Pediatr Intensive Care. 2024;13(1):46–54 (online 2021).',
    u: 'https://doi.org/10.1055/s-0041-1736523',
  },
  capino2020: {
    c: 'Capino AC, Thomas AN, Baylor S, Hughes KM, Miller JL, Johnson PN. Antipsychotic use in the prevention and treatment of intensive care unit delirium in pediatric patients. J Pediatr Pharmacol Ther. 2020;25(2):81–95.',
    u: 'https://doi.org/10.5863/1551-6776-25.2.81',
  },
  phan2008_dexmed: {
    c: 'Phan H, Nahata MC. Clinical uses of dexmedetomidine in pediatric patients. Paediatr Drugs. 2008;10(1):49–69.',
    u: 'https://doi.org/10.2165/00148581-200810010-00006',
  },
  bruni2015_melatonin: {
    c: 'Bruni O, Alonso-Alconada D, Besag F, et al. Current role of melatonin in pediatric neurology: clinical recommendations. Eur J Paediatr Neurol. 2015;19(2):122–133. (Age-banded pediatric sleep dosing; not delirium-specific.)',
    u: 'https://doi.org/10.1016/j.ejpn.2014.12.007',
  },
  peds_apsych_sr2025: {
    c: 'Cavagnero F, et al. Antipsychotic medications for delirium treatment in the pediatric intensive care unit: a systematic review. Paediatr Drugs. 2025;27(6):707-722.',
    u: 'https://doi.org/10.1007/s40272-025-00716-3',
  },
  melatonin_meta2025: {
    c: 'Tang BHY, et al. Melatonin use in the ICU: a systematic review and meta-analysis. Crit Care Med. 2025;53(9):e1714–e1724. (Adult ICU; not established for pediatric delirium prevention.)',
    u: 'https://doi.org/10.1097/CCM.0000000000006767',
  },
  picuup_kudchadkar: {
    c: 'Kudchadkar SR, et al. PICU Up! multicenter early mobility trial (protocol: Azamfirei R, et al. Trials. 2023;24(1):191). NCT04989790.',
    u: 'https://clinicaltrials.gov/study/NCT04989790',
  },
  gupta2021_capd_mv: {
    c: 'Gupta N, et al. Performance of the Cornell Assessment of Pediatric Delirium scale in mechanically ventilated children. J Pediatr Intensive Care. 2023;12(1):24–30 (online 2021). (At CAPD ≥ 9: overall specificity 44.8%; 16.5% with developmental delay.)',
    u: 'https://doi.org/10.1055/s-0041-1728784',
  },
  haldol_label: {
    c: 'Haloperidol prescribing information (boxed warnings; QTc / torsades). DailyMed, U.S. NLM.',
    u: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=8397a841-f240-4767-9dcd-781e6d3f7c7f',
  },
};
