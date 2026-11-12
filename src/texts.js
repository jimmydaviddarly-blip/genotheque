// Traductions des termes des bases et explications en langage courant.
// Écrits en français ; l'affichage les fait passer par t() pour l'anglais (voir i18n-en.js).
import { t, pct } from './i18n.js';

export const POPULATIONS = {
  afr: 'Afrique et diaspora africaine',
  amr: 'Amériques (ascendances mixtes)',
  asj: 'Juifs ashkénazes',
  eas: 'Asie de l\'Est',
  fin: 'Finlande',
  mid: 'Moyen-Orient',
  nfe: 'Europe (hors Finlande)',
  sas: 'Asie du Sud',
  ami: 'Amish',
  remaining: 'Autres',
};

const SIGNIFICANCE = [
  [/conflicting/i, 'Avis divergents', 'mixed'],
  [/likely pathogenic/i, 'Probablement pathogène', 'bad'],
  [/pathogenic/i, 'Pathogène', 'bad'],
  [/established risk allele/i, 'Allèle de risque établi', 'risk'],
  [/likely risk allele/i, 'Allèle de risque probable', 'risk'],
  [/risk factor/i, 'Facteur de risque', 'risk'],
  [/uncertain/i, 'Signification incertaine', 'mixed'],
  [/likely benign/i, 'Probablement bénin', 'good'],
  [/benign/i, 'Bénin', 'good'],
  [/protective/i, 'Protecteur', 'good'],
  [/drug response/i, 'Réponse à un médicament', 'info'],
  [/association/i, 'Association', 'info'],
  [/affects/i, 'Modifie la fonction', 'info'],
  [/not provided|other/i, 'Non précisé', 'none'],
];

// Une mention ClinVar peut en combiner plusieurs (« Pathogenic/Likely pathogenic ») : on garde la première reconnue.
export function significance(raw) {
  for (const [re, label, tone] of SIGNIFICANCE) if (re.test(raw)) return { label, tone };
  return { label: raw || 'Non précisé', tone: 'none' };
}

export const GENE_TYPES = {
  'protein-coding': 'code une protéine',
  ncRNA: 'ARN non codant',
  pseudo: 'pseudogène (copie inactive)',
  snoRNA: 'petit ARN nucléolaire',
  snRNA: 'petit ARN nucléaire',
  rRNA: 'ARN ribosomique',
  tRNA: 'ARN de transfert',
  other: 'autre',
  unknown: 'inconnu',
};

export const EFFECTS = {
  missense_variant: 'change un acide aminé de la protéine',
  synonymous_variant: 'ne change pas la protéine',
  stop_gained: 'coupe la protéine trop tôt',
  frameshift_variant: 'décale la lecture du gène',
  splice_acceptor_variant: 'perturbe l\'épissage du gène',
  splice_donor_variant: 'perturbe l\'épissage du gène',
  intron_variant: 'situé dans un intron, partie du gène retirée avant la fabrication de la protéine',
  upstream_gene_variant: 'situé juste avant le gène',
  downstream_gene_variant: 'situé juste après le gène',
  intergenic_region: 'situé entre deux gènes',
  '3_prime_UTR_variant': 'situé dans la queue non traduite du gène',
  '5_prime_UTR_variant': 'situé dans la tête non traduite du gène',
};

export const VAR_TYPES = { snv: 'une seule lettre change', delins: 'lettres retirées et ajoutées', del: 'lettres retirées', ins: 'lettres ajoutées', mnv: 'plusieurs lettres changent' };

export const HELP = {
  gene: 'Un gène est un passage de l\'ADN qui sert de recette, le plus souvent pour fabriquer une protéine. En général, nous en portons deux exemplaires, un de chaque parent.',
  clinvar: 'ClinVar recense les variants de ce gène que des laboratoires ont classés. « Pathogène » veut dire qu\'un lien avec une maladie est établi, pas que tous les porteurs seront malades.',
  diseases: 'Open Targets classe les maladies selon la force des preuves qui les relient au gène (études, essais, littérature), de 0 à 1. Ce score ne mesure pas un risque personnel.',
  variant: 'Un variant est une différence ponctuelle dans l\'ADN par rapport au génome de référence. La plupart n\'ont aucun effet connu sur la santé. Le numéro rs est son identifiant dans la base dbSNP.',
  freq: 'Part des chromosomes qui portent ce variant parmi les personnes analysées par gnomAD (plus de 800 000 génomes et exomes). Un variant très fréquent est rarement la cause d\'une maladie grave.',
  clinvarVariant: 'Classement par les laboratoires qui ont soumis ce variant à ClinVar. Plusieurs avis peuvent coexister, parfois pour des maladies différentes.',
  gwas: 'Les études d\'association (GWAS) comparent des milliers de personnes pour repérer les variants plus fréquents chez celles qui ont un trait donné. Une association n\'est pas une cause, et l\'effet est souvent minime.',
  orphaGenes: 'Orphanet distingue les gènes dont les mutations causent la maladie de ceux qui la modifient, y prédisposent ou sont seulement étudiés.',
  scores: 'Des programmes estiment, à partir de la séquence et de l\'évolution, si un changement d\'acide aminé risque d\'abîmer la protéine. Ce sont des prédictions : elles orientent les chercheurs mais ne remplacent pas l\'avis d\'un laboratoire. Elles ne s\'appliquent qu\'aux variants qui changent un acide aminé.',
  scoresVsClinvar: 'À noter : des laboratoires classent ce variant pathogène alors que les prédictions le jugent plutôt bénin. Les prédictions se trompent sur certains cas connus : l\'avis argumenté d\'un laboratoire passe avant.',
  tissues: 'Quantité d\'ARN de ce gène mesurée dans les organes de près de 1 000 donneurs adultes décédés (projet GTEx). Un gène très actif dans un organe y joue souvent un rôle important. L\'unité, le TPM, mesure la part de ce gène parmi un million de copies d\'ARN du tissu.',
  alphafold: 'AlphaFold, conçu par Google DeepMind, prédit la forme d\'une protéine à partir de sa seule séquence. Les couleurs indiquent la confiance du calcul : les zones orange sont souvent des parties souples, sans forme fixe.',
  go: "La Gene Ontology est le vocabulaire officiel qui décrit ce que fait un gène : les processus où il intervient (réparer l'ADN, transporter du chlore…), ce qu'il fait au niveau moléculaire (une enzyme, un canal…) et l'endroit de la cellule où on le trouve. Ne sont gardés que les termes appuyés par des expériences ou par une curation d'experts. Le nombre d'annotations dit à quel point un terme est documenté, pas son importance.",
  cohorts: 'Part des chromosomes qui portent cet allèle dans des projets qui ont analysé les gènes de milliers de personnes, classés par région du monde. Cela montre si un variant est courant ou rare selon les origines des personnes étudiées. Chaque projet a sa méthode, son nombre de participants et ses origines : les chiffres ne sont pas strictement comparables entre eux.',
  cancers: 'Les cancers auxquels ce gène est le plus souvent associé dans les bases publiques, regroupés par organe. Association ne veut pas dire cause : les formes marquées « héréditaires » sont celles qui se transmettent dans une famille, les autres sont des liens retrouvés dans les études. Le lien va de plus ou moins fort selon un score de 0 à 1 (Open Targets). Ce n\'est jamais un risque personnel : une variation de ce gène ne suffit pas à dire qu\'une personne aura un cancer.',
  pgx: 'La pharmacogénétique étudie comment nos gènes modifient l\'effet des médicaments. Le consortium CPIC publie des recommandations pour adapter la prescription. Seul un médecin peut les appliquer, après un test génétique prescrit.',
  symptoms: 'Symptômes observés chez les personnes atteintes, d\'après la Human Phenotype Ontology et Orphanet. Une personne malade n\'a pas forcément tous ces symptômes : la fréquence indique la part des malades concernés.',
  clingen: 'Des comités d\'experts de ClinGen évaluent si un gène cause vraiment une maladie, de « définitif » (preuves solides et répétées) à « réfuté ». La transmission indique comment la maladie passe des parents aux enfants.',
  string: 'Protéines qui travaillent le plus souvent avec celle de ce gène, d\'après la base STRING (expériences, bases de connaissances, publications). Plus le trait est épais, plus le lien est fiable.',
  reactome: 'Chaînes de réactions de la cellule auxquelles participe la protéine, d\'après Reactome, par exemple la réparation de l\'ADN ou la transmission d\'un signal.',
  stars: 'Les étoiles indiquent la solidité d\'un avis ClinVar : 0 sans justification, 1 avec des critères, 2 si plusieurs laboratoires sont d\'accord, 3 pour un comité d\'experts, 4 pour une recommandation officielle.',
  drugsGene: 'Médicaments autorisés ou en essai qui agissent sur la protéine fabriquée par ce gène, d\'après Open Targets (données ChEMBL). Ce n\'est pas une liste de traitements conseillés.',
  drugsDisease: 'Médicaments autorisés ou testés chez des patients atteints de cette maladie, y compris pour soulager une complication. Ce n\'est pas une liste de traitements conseillés.',
  trials: 'Essais cliniques qui recrutent en ce moment, d\'après le registre public ClinicalTrials.gov. Seul un médecin peut dire si un patient peut y participer.',
  targets: 'Gènes classés par la force des preuves qui les relient à cette maladie. Le premier est souvent le gène en cause, les suivants peuvent n\'avoir qu\'un lien indirect.',
};

export const DISCLAIMER = 'Information, pas diagnostic. Ces données viennent de bases scientifiques publiques. Pour toute question sur votre santé ou celle d\'un proche, parlez-en à un médecin ou à un conseiller en génétique.';

// Phase la plus avancée atteinte par un médicament (Open Targets), libellé déjà traduit.
export function stageLabel(s) {
  if (s === 'APPROVAL') return { label: t('Autorisé'), tone: 'good' };
  if (s === 'PHASE_4') return { label: t('Autorisé, suivi après mise sur le marché'), tone: 'good' };
  if (s === 'PREAPPROVAL') return { label: t('En cours d\'autorisation'), tone: 'info' };
  const m = s.match(/^(EARLY_)?PHASE_(\d)(?:_(\d))?$/);
  if (m) return { label: m[3] ? t('Essai de phase {a} ou {b}', { a: m[2], b: m[3] }) : t('Essai de phase {a}', { a: m[2] }), tone: 'mixed' };
  return { label: t('Étape inconnue'), tone: 'none' };
}

const PHASES = { EARLY_PHASE1: 'phase 1 précoce', PHASE1: 'phase 1', PHASE2: 'phase 2', PHASE3: 'phase 3', PHASE4: 'phase 4', NA: '' };
export const trialPhase = (list) => list.map((p) => (PHASES[p] === undefined ? p : t(PHASES[p]))).filter(Boolean).join(` ${t('et')} `);

// Niveau de relecture d'un avis ClinVar, de 0 à 4 étoiles (barème officiel de ClinVar).
export function reviewStars(status) {
  if (/practice guideline/i.test(status)) return 4;
  if (/expert panel/i.test(status)) return 3;
  if (/multiple submitters/i.test(status)) return 2;
  if (/criteria provided/i.test(status)) return 1;
  return 0;
}

// Seuils publiés : AlphaMissense (Cheng et al. 2023), REVEL (calibration ClinGen, Pejaver et al. 2022).
export function scoreReading(kind, v) {
  if (kind === 'alphamissense') return v >= 0.564 ? ['Plutôt pathogène', 'bad'] : v <= 0.34 ? ['Plutôt bénin', 'good'] : ['Incertain', 'mixed'];
  if (kind === 'revel') return v >= 0.644 ? ['Plutôt pathogène', 'bad'] : v <= 0.29 ? ['Plutôt bénin', 'good'] : ['Incertain', 'mixed'];
  return null;
}

// Tissus GTEx regroupés par organe (on garde la valeur la plus haute de l'organe).
// Les cellules en culture sont écartées : ce ne sont pas des tissus du corps.
const ORGAN_OF = [
  [/^Adipose/, 'Graisse'], [/^Adrenal/, 'Glandes surrénales'], [/^Artery/, 'Artères'], [/^Bladder/, 'Vessie'],
  [/^Brain_Cerebell/, 'Cervelet'], [/^Brain_Spinal/, 'Moelle épinière'], [/^Brain/, 'Cerveau'], [/^Breast/, 'Sein'],
  [/^Cervix|^Uterus|^Vagina|^Fallopian/, 'Utérus et vagin'], [/^Colon/, 'Côlon'], [/^Esophagus/, 'Œsophage'],
  [/^Heart/, 'Cœur'], [/^Kidney/, 'Reins'], [/^Liver/, 'Foie'], [/^Lung/, 'Poumons'], [/^Minor_Salivary/, 'Glandes salivaires'],
  [/^Muscle/, 'Muscles'], [/^Nerve/, 'Nerfs'], [/^Ovary/, 'Ovaires'], [/^Pancreas/, 'Pancréas'], [/^Pituitary/, 'Hypophyse'],
  [/^Prostate/, 'Prostate'], [/^Skin/, 'Peau'], [/^Small_Intestine/, 'Intestin grêle'], [/^Spleen/, 'Rate'],
  [/^Stomach/, 'Estomac'], [/^Testis/, 'Testicules'], [/^Thyroid/, 'Thyroïde'], [/^Whole_Blood/, 'Sang'],
];

export function byOrgan(rows) {
  const best = new Map();
  for (const r of rows) {
    if (/^Cells_/.test(r.tissue)) continue;
    const organ = ORGAN_OF.find(([re]) => re.test(r.tissue))?.[1];
    if (organ && (!best.has(organ) || best.get(organ) < r.tpm)) best.set(organ, r.tpm);
  }
  return [...best].map(([organ, tpm]) => ({ organ, tpm })).sort((a, b) => b.tpm - a.tpm);
}

// Niveau d'activité, en TPM (copies d'ARN par million).
export const tpmLevel = (v) => (v >= 100 ? 'très actif' : v >= 10 ? 'actif' : v >= 1 ? 'faible' : 'presque éteint');

// ---------- Symptômes (HPO) ----------

// Grands systèmes de HPO : nom anglais de l'API -> nom français.
export const HPO_CATEGORIES = {
  'Metabolism/Laboratory abnormality': 'Métabolisme et analyses biologiques', Immunology: 'Immunité', 'Nervous System': 'Système nerveux',
  Growth: 'Croissance', 'Genitourinary system': 'Appareil urinaire et génital', Ear: 'Oreille', 'Head and neck': 'Tête et cou',
  'Respiratory System': 'Respiration', 'Digestive System': 'Digestion', 'Skeletal system': 'Squelette', Limbs: 'Membres',
  'Clinical course': 'Évolution de la maladie', Cardiovascular: 'Cœur et vaisseaux', Inheritance: 'Mode de transmission',
  'Skin, Hair, and Nails': 'Peau, cheveux et ongles', Eye: 'Yeux', Musculature: 'Muscles', Endocrine: 'Hormones',
  'Blood and blood-forming tissues': 'Sang', Neoplasm: 'Tumeurs', 'Prenatal and birth': 'Grossesse et naissance', Voice: 'Voix',
  Breast: 'Seins', 'Constitutional Symptom': 'Signes généraux', 'Cellular phenotype': 'Anomalies cellulaires',
  'Thoracic cavity': 'Thorax', 'Behavior/Psychiatric': 'Comportement', 'Body fluids': 'Liquides du corps',
};

// Fréquence d'un symptôme chez les malades (catégories d'Orphanet), du plus au moins fréquent.
const HPO_FREQ = [
  ['Obligate', 'Toujours présent', 100], ['Very frequent', 'Très fréquent', 90], ['Frequent', 'Fréquent', 55],
  ['Occasional', 'Occasionnel', 17], ['Very rare', 'Très rare', 2],
];

// Renvoie { label, pct } ; les fréquences chiffrées (« 9/21 », « 40% ») sont converties en pourcentage.
export function symptomFrequency(raw) {
  const named = HPO_FREQ.find(([en]) => en === raw);
  if (named) return { label: t(named[1]), pct: named[2] };
  const frac = String(raw || '').match(/^(\d+)\/(\d+)$/);
  if (frac && Number(frac[2])) {
    const p = Math.round((100 * Number(frac[1])) / Number(frac[2]));
    return { label: pct(String(p)), pct: p };
  }
  const pc = String(raw || '').match(/^([\d.]+)\s*%$/);
  if (pc) return { label: pct(String(Math.round(Number(pc[1])))), pct: Number(pc[1]) };
  return { label: '', pct: -1 };
}

// ---------- ClinGen ----------

// Classement ClinGen du lien gène-maladie : libellé, couleur, ordre d'affichage.
export const CLINGEN_CLASS = {
  Definitive: ['Définitif', 'good', 0], Strong: ['Fort', 'good', 1], Moderate: ['Modéré', 'info', 2], Limited: ['Limité', 'mixed', 3],
  Disputed: ['Contesté', 'risk', 4], Refuted: ['Réfuté', 'bad', 5], 'No Known Disease Relationship': ['Aucun lien connu', 'none', 6],
};

// Mode de transmission dans les familles.
export const MOI = {
  AD: 'autosomique dominante', AR: 'autosomique récessive', XL: 'liée au chromosome X', MT: 'mitochondriale',
  SD: 'semi-dominante', UD: 'indéterminée',
};
