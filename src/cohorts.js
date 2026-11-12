// Fréquence d'un allèle dans des projets de populations, telle que dbSNP la publie (domaine public).
// Les clés viennent de MyVariant.info (dbsnp.alleles[].freq). Les noms et les pays suivent la documentation
// de dbSNP ; les projets déjà montrés ailleurs (gnomAD, ExAC) et ceux dont la description n'est pas
// établie sont laissés de côté plutôt que présentés avec une étiquette incertaine.

// [clé, nom du projet, pays ou portée]
const GROUPS = [
  ['Monde', [
    ['1000g', '1000 Genomes', 'monde, plus de 2 500 personnes'],
    ['hapmap', 'HapMap', 'monde'],
    ['sgdp_prj', 'SGDP', 'monde, populations très variées'],
    ['hgdp_stanford', 'HGDP', 'monde, populations très variées'],
    ['dbgap_popfreq', 'PopFreq (NCBI)', 'agrégat de plusieurs études'],
  ]],
  ['Amérique du Nord', [
    ['topmed', 'TOPMed', 'États-Unis, origines diverses'],
    ['page_study', 'PAGE', 'États-Unis, origines diverses'],
    ['goesp', 'GO-ESP', 'États-Unis'],
  ]],
  ['Europe', [
    ['alspac', 'ALSPAC', 'Royaume-Uni'],
    ['twinsuk', 'TwinsUK', 'Royaume-Uni'],
    ['gonl', 'GoNL', 'Pays-Bas'],
    ['genome_dk', 'GenomeDK', 'Danemark'],
    ['northernsweden', 'Suède du Nord', 'Suède'],
    ['finrisk', 'FINRISK', 'Finlande'],
    ['estonian', 'Estoniens', 'Estonie'],
    ['mgp', 'MGP', 'Espagne'],
  ]],
  ['Asie et Moyen-Orient', [
    ['korea1k', 'Korea1K', 'Corée'],
    ['korean', 'KoVariome', 'Corée'],
    ['tommo', 'ToMMo', 'Japon'],
    ['vietnamese', 'Vietnamiens', 'Vietnam'],
    ['siberian', 'Sibériens', 'Sibérie'],
    ['qatari', 'Qatariens', 'Qatar'],
  ]],
];

// alleles : [{ allele, freq: { cohorte: fréquence } }] ; alt : l'allèle mesuré.
// Renvoie [{ group, items: [{ name, where, freq }] }] ou [] s'il y a moins de deux projets.
export function cohortFrequencies(alleles, alt) {
  const freq = (alleles || []).find((a) => a.allele === alt)?.freq;
  if (!freq) return [];
  const groups = GROUPS.map(([group, list]) => ({
    group,
    items: list
      .filter(([key]) => typeof freq[key] === 'number' && freq[key] >= 0 && freq[key] <= 1)
      .map(([key, name, where]) => ({ name, where, freq: freq[key] })),
  })).filter((g) => g.items.length);
  return groups.reduce((n, g) => n + g.items.length, 0) >= 2 ? groups : [];
}

// Parmi les allèles d'un variant (plusieurs variants pour un même rs), celui mesuré dans le plus de projets.
export function bestAllele(hits) {
  let best = null;
  for (const h of hits) {
    if (!h.alt) continue;
    const n = (cohortFrequencies(h.alleles, h.alt).reduce((s, g) => s + g.items.length, 0));
    if (n && (!best || n > best.n)) best = { alt: h.alt, alleles: h.alleles, n };
  }
  return best;
}
