/**
 * stepdown/data/refs.js — the citation registry for the step-down / progressive-care
 * tool. Each entry is { l: short inline label, c: full formatted citation, u: canonical
 * URL }. Inline "Sources:" lines and the page's Sources list both render from here, so
 * a citation is written once. Values were verified against the archived full text
 * (see references/INDEX.md → Adult Stepdown / Progressive Care Delirium).
 */
export const REFS = {
  beyer2024_camimc: {
    l: 'Beyer 2024 (CAM-IMC)',
    c: 'Beyer LP, et al. Disorientation as a delirium feature in non-intubated patients: development and evaluation of the CAM-IMC. BMC Anesthesiol 2024;24:451.',
    u: 'https://doi.org/10.1186/s12871-024-02849-3',
  },
  sessler2002_rass: {
    l: 'Sessler 2002 (RASS)',
    c: 'Sessler CN, et al. The Richmond Agitation-Sedation Scale: validity and reliability in adult ICU patients. Am J Respir Crit Care Med 2002;166:1338.',
    u: 'https://pubmed.ncbi.nlm.nih.gov/12421743/',
  },
  ely2003_rass: {
    l: 'Ely 2003 (RASS)',
    c: 'Ely EW, et al. Monitoring sedation status over time in ICU patients: reliability and validity of the RASS. JAMA 2003;289:2983.',
    u: 'https://doi.org/10.1001/jama.289.22.2983',
  },
  han2015_rass: {
    l: 'Han 2015 (RASS in the ED)',
    c: 'Han JH, et al. The diagnostic performance of the RASS for detecting delirium in older ED patients. Acad Emerg Med 2015;22:878.',
    u: 'https://doi.org/10.1111/acem.12706',
  },
  chester2012_mrass: {
    l: 'Chester 2012 (mRASS)',
    c: 'Chester JG, et al. Serial administration of a modified RASS for delirium screening. J Hosp Med 2012;7:450.',
    u: 'https://doi.org/10.1002/jhm.1003',
  },
  marcantonio2014_3dcam: {
    l: 'Marcantonio 2014 (3D-CAM)',
    c: 'Marcantonio ER, et al. 3D-CAM: derivation and validation of a 3-minute diagnostic interview for CAM-defined delirium. Ann Intern Med 2014;161:554.',
    u: 'https://doi.org/10.7326/M14-0865',
  },
  kuczmarska2016: {
    l: 'Kuczmarska 2016 (3D-CAM vs CAM-ICU)',
    c: 'Kuczmarska A, et al. Detection of delirium in hospitalized older general medicine patients: a comparison of the 3D-CAM and CAM-ICU. J Gen Intern Med 2016;31:297.',
    u: 'https://doi.org/10.1007/s11606-015-3514-0',
  },
  neufeld2013_postop: {
    l: 'Neufeld 2013 (postoperative screening)',
    c: 'Neufeld KJ, et al. Evaluation of two delirium screening tools for detecting post-operative delirium in the elderly. Br J Anaesth 2013;111:612.',
    u: 'https://doi.org/10.1093/bja/aet167',
  },
  gusmaoflores2012: {
    l: 'Gusmão-Flores 2012 (CAM-ICU meta-analysis)',
    c: 'Gusmão-Flores D, et al. The confusion assessment method for the intensive care unit (CAM-ICU) and intensive care delirium screening checklist (ICDSC) for the diagnosis of delirium: a systematic review and meta-analysis of clinical studies. Crit Care 2012;16:R115.',
    u: 'https://doi.org/10.1186/cc11407',
  },
  martinez2012: {
    l: 'Martinez 2012 (ward risk rule)',
    c: 'Martinez JA, et al. Derivation and validation of a clinical prediction rule for delirium in patients admitted to a medical ward. BMJ Open 2012;2:e001599.',
    u: 'https://doi.org/10.1136/bmjopen-2012-001599',
  },
  marcantonio2022_ubcam: {
    l: 'Marcantonio 2022 (UB-CAM implementation)',
    c: 'Marcantonio ER, et al. Comparative implementation of a brief app-directed protocol for delirium identification by hospitalists, nurses, and nursing assistants. Ann Intern Med 2022;175:65.',
    u: 'https://doi.org/10.7326/M21-1687',
  },
  siddiqi2016: {
    l: 'Siddiqi 2016 (Cochrane)',
    c: 'Siddiqi N, et al. Interventions for preventing delirium in hospitalised non-ICU patients. Cochrane Database Syst Rev 2016;CD005563.',
    u: 'https://doi.org/10.1002/14651858.CD005563.pub3',
  },
  inouye1999_help: {
    l: 'Inouye 1999 (HELP)',
    c: 'Inouye SK, et al. A multicomponent intervention to prevent delirium in hospitalized older patients. N Engl J Med 1999;340:669.',
    u: 'https://doi.org/10.1056/NEJM199903043400901',
  },
  hshieh2015: {
    l: 'Hshieh 2015 (meta-analysis)',
    c: 'Hshieh TT, et al. Effectiveness of multicomponent nonpharmacological delirium interventions: a meta-analysis. JAMA Intern Med 2015;175:512.',
    u: 'https://doi.org/10.1001/jamainternmed.2014.7779',
  },
  ags2015: {
    l: 'AGS 2015 (postoperative delirium guideline)',
    c: 'American Geriatrics Society. Abstracted clinical practice guideline for postoperative delirium in older adults. J Am Geriatr Soc 2015;63:142.',
    u: 'https://doi.org/10.1111/jgs.13281',
  },
  neufeld2016: {
    l: 'Neufeld 2016 (antipsychotics meta-analysis)',
    c: 'Neufeld KJ, et al. Antipsychotic medication for prevention and treatment of delirium in hospitalized adults: a systematic review and meta-analysis. J Am Geriatr Soc 2016;64:705.',
    u: 'https://doi.org/10.1111/jgs.14076',
  },
  oh2019: {
    l: 'Oh 2019 (antipsychotics — prevention)',
    c: 'Oh ES, et al. Antipsychotics for preventing delirium in hospitalized adults: a systematic review. Ann Intern Med 2019;171:474.',
    u: 'https://doi.org/10.7326/M19-1859',
  },
  nikooie2019: {
    l: 'Nikooie 2019 (antipsychotics — treatment)',
    c: 'Nikooie R, et al. Antipsychotics for treating delirium in hospitalized adults: a systematic review. Ann Intern Med 2019;171:485.',
    u: 'https://doi.org/10.7326/M19-1860',
  },
  wang2017: {
    l: 'Wang 2017 (iatrogenic withdrawal)',
    c: 'Wang PP, et al. Opioid-associated iatrogenic withdrawal in critically ill adult patients. Ann Intensive Care 2017;7:88.',
    u: 'https://doi.org/10.1186/s13613-017-0310-5',
  },
  lisibach2022: {
    l: 'Lisibach 2022 (anticholinergic burden)',
    c: 'Lisibach A, et al. Quantifying anticholinergic burden and its association with delirium (comparison of 19 scales). Br J Clin Pharmacol 2022;88:4915.',
    u: 'https://doi.org/10.1111/bcp.15432',
  },
  nice_cg103: {
    l: 'NICE CG103',
    c: 'National Institute for Health and Care Excellence. Delirium: prevention, diagnosis and management in hospital and long-term care. CG103 (updated 2023).',
    u: 'https://www.nice.org.uk/guidance/cg103',
  },
  sign157: {
    l: 'SIGN 157',
    c: 'Scottish Intercollegiate Guidelines Network. Risk reduction and management of delirium. SIGN 157 (2019).',
    u: 'https://www.sign.ac.uk/our-guidelines/risk-reduction-and-management-of-delirium/',
  },
};
