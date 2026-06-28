export const MEDS = {
  categories: [
    {
      id: 'benzo',
      label: 'Benzodiazepines',
      hdrBg: '#C2341F',
      items: [
        {
          id: 'benzo-lorazepam',
          name: 'Lorazepam (Ativan)',
          on: true,
          risk: 'high',
        },
        {
          id: 'benzo-midazolam',
          name: 'Midazolam (Versed)',
          on: true,
          risk: 'high',
        },
        {
          id: 'benzo-diazepam',
          name: 'Diazepam (Valium)',
          on: true,
          risk: 'high',
        },
        {
          id: 'benzo-clonazepam',
          name: 'Clonazepam (Klonopin)',
          on: true,
          risk: 'high',
        },
        {
          id: 'benzo-alprazolam',
          name: 'Alprazolam (Xanax)',
          on: true,
          risk: 'high',
        },
        {
          id: 'benzo-temazepam',
          name: 'Temazepam (Restoril)',
          on: true,
          risk: 'high',
        },
        {
          id: 'benzo-triazolam',
          name: 'Triazolam (Halcion)',
          on: true,
          risk: 'high',
        },
        {
          id: 'benzo-chlordiaz',
          name: 'Chlordiazepoxide (Librium)',
          on: true,
          risk: 'high',
        },
        {
          id: 'benzo-clorazepate',
          name: 'Clorazepate (Tranxene)',
          on: true,
          risk: 'high',
        },
      ],
    },
    {
      id: 'opioids',
      label: 'Opioids / Analgesics',
      hdrBg: '#E2502F',
      items: [
        {
          id: 'opi-meperidine',
          name: 'Meperidine (Demerol)',
          on: true,
          risk: 'high',
        },
        {
          id: 'opi-morphine',
          name: 'Morphine',
          on: true,
        },
        {
          id: 'opi-hydromorphone',
          name: 'Hydromorphone (Dilaudid)',
          on: true,
        },
        {
          id: 'opi-fentanyl',
          name: 'Fentanyl',
          on: true,
        },
        {
          id: 'opi-oxycodone',
          name: 'Oxycodone',
          on: true,
        },
        {
          id: 'opi-hydrocodone',
          name: 'Hydrocodone',
          on: true,
        },
        {
          id: 'opi-codeine',
          name: 'Codeine',
          on: true,
        },
        {
          id: 'opi-tramadol',
          name: 'Tramadol',
          on: true,
        },
        {
          id: 'opi-buprenorphine',
          name: 'Buprenorphine',
          on: true,
        },
        {
          id: 'opi-methadone',
          name: 'Methadone',
          on: true,
        },
      ],
    },
    {
      id: 'antichol',
      label: 'Anticholinergics',
      hdrBg: '#00147A',
      items: [
        {
          id: 'ach-diphenhydramine',
          name: 'Diphenhydramine (Benadryl)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-promethazine',
          name: 'Promethazine (Phenergan)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-hydroxyzine',
          name: 'Hydroxyzine (Vistaril/Atarax)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-oxybutynin',
          name: 'Oxybutynin (Ditropan)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-tolterodine',
          name: 'Tolterodine (Detrol)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-solifenacin',
          name: 'Solifenacin (VESIcare)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-meclizine',
          name: 'Meclizine (Antivert)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-scopolamine',
          name: 'Scopolamine',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-atropine',
          name: 'Atropine',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-glycopyrrolate',
          name: 'Glycopyrrolate',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-benztropine',
          name: 'Benztropine (Cogentin)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-trihexyphenidyl',
          name: 'Trihexyphenidyl (Artane)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-cyclobenzaprine',
          name: 'Cyclobenzaprine (Flexeril)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-methocarbamol',
          name: 'Methocarbamol (Robaxin)',
          on: true,
          risk: 'high',
        },
        {
          id: 'ach-orphenadrine',
          name: 'Orphenadrine (Norflex)',
          on: true,
          risk: 'high',
        },
      ],
    },
    {
      id: 'sedatives',
      label: 'Sedatives / Hypnotics',
      hdrBg: '#0047B8',
      items: [
        {
          id: 'sed-propofol',
          name: 'Propofol (Diprivan)',
          on: false,
        },
        {
          id: 'sed-ketamine',
          name: 'Ketamine',
          on: false,
        },
        {
          id: 'sed-phenobarbital',
          name: 'Phenobarbital',
          on: false,
        },
        {
          id: 'sed-zolpidem',
          name: 'Zolpidem (Ambien)',
          on: false,
        },
        {
          id: 'sed-eszopiclone',
          name: 'Eszopiclone (Lunesta)',
          on: false,
        },
        {
          id: 'sed-zaleplon',
          name: 'Zaleplon (Sonata)',
          on: false,
        },
        {
          id: 'sed-chloralhydrate',
          name: 'Chloral hydrate',
          on: false,
        },
      ],
    },
    {
      id: 'antipsych',
      label: 'Antipsychotics (high-dose / typical)',
      hdrBg: '#0E7C66',
      items: [
        {
          id: 'apsy-haloperidol',
          name: 'Haloperidol (high dose)',
          on: false,
        },
        {
          id: 'apsy-chlorpromazine',
          name: 'Chlorpromazine (Thorazine)',
          on: false,
        },
        {
          id: 'apsy-thioridazine',
          name: 'Thioridazine (Mellaril)',
          on: false,
        },
        {
          id: 'apsy-fluphenazine',
          name: 'Fluphenazine (Prolixin)',
          on: false,
        },
        {
          id: 'apsy-clozapine',
          name: 'Clozapine (Clozaril)',
          on: false,
        },
        {
          id: 'apsy-olanzapine',
          name: 'Olanzapine (high dose)',
          on: false,
        },
      ],
    },
    {
      id: 'antidep',
      label: 'Antidepressants / Mood (anticholinergic)',
      hdrBg: '#1E6FD0',
      items: [
        {
          id: 'adep-amitriptyline',
          name: 'Amitriptyline (Elavil)',
          on: false,
        },
        {
          id: 'adep-nortriptyline',
          name: 'Nortriptyline (Pamelor)',
          on: false,
        },
        {
          id: 'adep-imipramine',
          name: 'Imipramine (Tofranil)',
          on: false,
        },
        {
          id: 'adep-doxepin',
          name: 'Doxepin (Silenor)',
          on: false,
        },
        {
          id: 'adep-clomipramine',
          name: 'Clomipramine (Anafranil)',
          on: false,
        },
        {
          id: 'adep-lithium',
          name: 'Lithium (toxicity risk)',
          on: false,
        },
        {
          id: 'adep-paroxetine',
          name: 'Paroxetine (Paxil)',
          on: false,
        },
        {
          id: 'adep-mirtazapine',
          name: 'Mirtazapine (Remeron)',
          on: false,
        },
      ],
    },
    {
      id: 'antimicro',
      label: 'Antimicrobials',
      hdrBg: '#005CE9',
      items: [
        {
          id: 'mic-cefepime',
          name: 'Cefepime (neurotoxicity)',
          on: false,
        },
        {
          id: 'mic-imipenem',
          name: 'Imipenem / Meropenem',
          on: false,
        },
        {
          id: 'mic-ciprofloxacin',
          name: 'Ciprofloxacin',
          on: false,
        },
        {
          id: 'mic-levofloxacin',
          name: 'Levofloxacin',
          on: false,
        },
        {
          id: 'mic-moxifloxacin',
          name: 'Moxifloxacin',
          on: false,
        },
        {
          id: 'mic-acyclovir',
          name: 'Acyclovir IV (high dose)',
          on: false,
        },
        {
          id: 'mic-ganciclovir',
          name: 'Ganciclovir',
          on: false,
        },
        {
          id: 'mic-voriconazole',
          name: 'Voriconazole',
          on: false,
        },
        {
          id: 'mic-itraconazole',
          name: 'Itraconazole',
          on: false,
        },
        {
          id: 'mic-metronidazole',
          name: 'Metronidazole (IV, high dose)',
          on: false,
        },
        {
          id: 'mic-linezolid',
          name: 'Linezolid (serotonin risk)',
          on: false,
        },
        {
          id: 'mic-isoniazid',
          name: 'Isoniazid',
          on: false,
        },
        {
          id: 'mic-chloroquine',
          name: 'Chloroquine / Mefloquine',
          on: false,
        },
      ],
    },
    {
      id: 'cardiac',
      label: 'Cardiovascular / Cardiac',
      hdrBg: '#3A4654',
      items: [
        {
          id: 'car-digoxin',
          name: 'Digoxin (toxicity risk)',
          on: false,
        },
        {
          id: 'car-amiodarone',
          name: 'Amiodarone',
          on: false,
        },
        {
          id: 'car-lidocaine',
          name: 'Lidocaine (IV, high dose)',
          on: false,
        },
        {
          id: 'car-mexiletine',
          name: 'Mexiletine',
          on: false,
        },
        {
          id: 'car-clonidine',
          name: 'Clonidine',
          on: false,
        },
        {
          id: 'car-methyldopa',
          name: 'Methyldopa (Aldomet)',
          on: false,
        },
        {
          id: 'car-propranolol',
          name: 'Propranolol (lipophilic)',
          on: false,
        },
        {
          id: 'car-metoprolol',
          name: 'Metoprolol (lipophilic)',
          on: false,
        },
      ],
    },
    {
      id: 'steroids',
      label: 'Corticosteroids / Immunosuppressants',
      hdrBg: '#005CE9',
      items: [
        {
          id: 'ste-prednisone',
          name: 'Prednisone (high dose)',
          on: false,
        },
        {
          id: 'ste-methylpred',
          name: 'Methylprednisolone (high dose)',
          on: false,
        },
        {
          id: 'ste-dexamethasone',
          name: 'Dexamethasone (high dose)',
          on: false,
        },
        {
          id: 'ste-cyclosporine',
          name: 'Cyclosporine (Sandimmune)',
          on: false,
        },
        {
          id: 'ste-tacrolimus',
          name: 'Tacrolimus (Prograf)',
          on: false,
        },
        {
          id: 'ste-sirolimus',
          name: 'Sirolimus (Rapamune)',
          on: false,
        },
        {
          id: 'ste-mycophenolate',
          name: 'Mycophenolate (CellCept)',
          on: false,
        },
      ],
    },
    {
      id: 'gi',
      label: 'GI / Antiemetics / H2 Blockers',
      hdrBg: '#2C7FB8',
      items: [
        {
          id: 'gi-famotidine',
          name: 'Famotidine (high dose / renal impairment)',
          on: false,
        },
        {
          id: 'gi-cimetidine',
          name: 'Cimetidine',
          on: false,
        },
        {
          id: 'gi-ondansetron',
          name: 'Ondansetron (IV, QTc concern)',
          on: false,
        },
        {
          id: 'gi-prochlorperazine',
          name: 'Prochlorperazine (Compazine)',
          on: false,
        },
        {
          id: 'gi-droperidol',
          name: 'Droperidol',
          on: false,
        },
        {
          id: 'gi-metoclopramide',
          name: 'Metoclopramide (Reglan)',
          on: false,
        },
      ],
    },
    {
      id: 'other',
      label: 'Other / Miscellaneous',
      hdrBg: '#55616F',
      items: [
        {
          id: 'oth-baclofen',
          name: 'Baclofen (withdrawal risk)',
          on: false,
        },
        {
          id: 'oth-carisoprodol',
          name: 'Carisoprodol (Soma)',
          on: false,
        },
        {
          id: 'oth-gabapentin',
          name: 'Gabapentin (high dose)',
          on: false,
        },
        {
          id: 'oth-pregabalin',
          name: 'Pregabalin (Lyrica, high dose)',
          on: false,
        },
        {
          id: 'oth-topiramate',
          name: 'Topiramate',
          on: false,
        },
        {
          id: 'oth-levetiracetam',
          name: 'Levetiracetam (behavioral effects)',
          on: false,
        },
        {
          id: 'oth-phenytoin',
          name: 'Phenytoin (toxicity)',
          on: false,
        },
        {
          id: 'oth-valproate',
          name: 'Valproate (encephalopathy risk)',
          on: false,
        },
        {
          id: 'oth-interferons',
          name: 'Interferons',
          on: false,
        },
        {
          id: 'oth-interleukins',
          name: 'Interleukins / immunotherapy',
          on: false,
        },
        {
          id: 'oth-theophylline',
          name: 'Theophylline',
          on: false,
        },
        {
          id: 'oth-bismuth',
          name: 'Bismuth (high dose)',
          on: false,
        },
        {
          id: 'oth-disulfiram',
          name: 'Disulfiram (Antabuse)',
          on: false,
        },
        {
          id: 'oth-varenicline',
          name: 'Varenicline (Chantix)',
          on: false,
        },
      ],
    },
  ],
};

// The authored default on/off state, captured once so Reset can restore it.
const MED_DEFAULTS = MEDS.categories.map((c) => c.items.map((i) => i.on));
export function resetMeds() {
  MEDS.categories.forEach((c, ci) => c.items.forEach((i, ii) => (i.on = MED_DEFAULTS[ci][ii])));
}
