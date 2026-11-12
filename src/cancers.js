// Cancers associés à un gène, regroupés par organe. Open Targets donne des noms de maladies en anglais,
// classés ici par mots-clés : le premier organe dont un mot-clé correspond l'emporte, donc l'ordre compte
// (« uveal melanoma » va à l'œil avant « melanoma » à la peau).

// Termes généraux qui ne disent rien du gène : « cancer », « neoplasm »… On les écarte des regroupements.
const GENERIC = /^(cancer|neoplasm|carcinoma|adenocarcinoma|tumou?r|sarcoma|malignant (neoplasm|tumou?r)|secondary malignant neoplasm|metastatic malignant neoplasm.*|neoplastic disease|hereditary neoplastic syndrome|solid tumou?r|benign neoplasm|carcinoma in situ|cancer or benign tumou?r|disease|syndrome)$/i;
export const isGenericDisease = (name) => GENERIC.test(String(name || '').trim());

// [clé, libellé français, identifiant de la zone du corps dans l'Explorer, mots-clés]
const ORGANS = [
  ['oeil', 'Œil', 'oeil', /retinoblastoma|uveal|ocular|\beye\b/],
  ['cerveau', 'Cerveau et système nerveux', 'cerveau', /glioma|glioblastoma|brain|astrocytoma|medulloblastoma|meningioma|ependymoma|nervous system/],
  ['sein', 'Sein', 'sein', /breast|mammary/],
  ['ovaire', 'Ovaire, trompes et péritoine', 'genital', /\bovar|fallopian|female reproductive|\bperitone/],
  ['uterus', 'Utérus et col de l\'utérus', 'genital', /endometri|uterine|uterus|cervical|cervix/],
  ['prostate', 'Prostate', 'genital', /prostat/],
  ['testicule', 'Testicule', 'genital', /testic|testis|germ cell|seminoma/],
  ['pancreas', 'Pancréas', 'pancreas', /pancrea/],
  ['foie', 'Foie et voies biliaires', 'foie', /hepat|liver|bile duct|biliary|cholangio/],
  ['colon', 'Côlon et rectum', 'colon', /colo|rect(al|um)|lynch|polyposis|bowel|intestin/],
  ['estomac', 'Estomac', 'estomac', /gastric|stomach/],
  ['oesophage', 'Œsophage', 'oesophage', /esophag|oesophag/],
  ['poumon', 'Poumons et plèvre', 'poumon', /lung|bronch|pleur|mesothelioma/],
  ['rein', 'Reins', 'rein', /renal|kidney|wilms|nephro/],
  ['vessie', 'Vessie et voies urinaires', 'vessie', /bladder|urothel|urinary/],
  ['thyroide', 'Thyroïde', 'thyroide', /thyroid/],
  ['tete-cou', 'Bouche, gorge et tête', 'tete-cou', /head and neck|\boral\b|mouth|nasophar|laryn|pharyn|salivary|tongue/],
  ['peau', 'Peau', 'peau', /melanoma|skin|cutaneous|basal cell|keratinocyte/],
  ['ganglions', 'Ganglions lymphatiques', 'ganglions', /lymphoma|hodgkin|lymph node/],
  ['sang', 'Sang et moelle osseuse', 'sang', /leukemi|myeloma|myelodysplas|myeloproliferative|polycythemia|hematolog|blood/],
  ['surrenales', 'Glandes surrénales', 'surrenales', /adrenal|pheochromocytoma|paraganglioma|neuroblastoma/],
  ['os', 'Os, muscles et tissus mous', 'os', /sarcoma|osteo|ewing|\bbone\b|chondro|rhabdomyo|soft tissue/],
];
const OTHER = ['autres', 'Autres cancers et syndromes', null];

// Une forme héréditaire est celle qui se transmet dans une famille : le nom le dit en général.
const HEREDITARY = /hereditary|familial|susceptib|predisposition|syndrome/i;

// En dessous de ce score d'association (0 à 1), le lien est trop ténu pour une carte de synthèse.
export const MIN_SCORE = 0.4;
// La carte n'apparaît que si au moins un cancer atteint ce score : un seul lien à 0,43 est souvent du bruit
// (CFTR et un syndrome de mélanomes, par exemple).
const CARD_SCORE = 0.5;

export const STRENGTH = [
  [0.65, 'Lien fort', 'info'],
  [0.5, 'Lien moyen', 'none'],
  [0, 'Lien plus faible', 'none'],
];
export const strengthOf = (score) => STRENGTH.find(([min]) => score >= min);

// rows : [{ id, name, label?, score }] -> groupes triés du lien le plus fort au plus faible.
export function groupCancers(rows) {
  const groups = new Map();
  for (const r of rows) {
    // Une tumeur bénigne n'est pas un cancer : elle reste dans la liste « Maladies associées ».
    if (isGenericDisease(r.name) || r.score < MIN_SCORE || /\bbenign\b/i.test(r.name)) continue;
    const name = r.name.toLowerCase();
    const [key, label, explorer] = ORGANS.find(([, , , re]) => re.test(name)) || OTHER;
    if (!groups.has(key)) groups.set(key, { key, label, explorer, score: 0, rows: [] });
    const g = groups.get(key);
    g.score = Math.max(g.score, r.score);
    g.rows.push({ ...r, hereditary: HEREDITARY.test(r.name) });
  }
  const list = [...groups.values()];
  for (const g of list) {
    // Les noms déjà traduits en français passent devant, puis le lien le plus fort.
    g.rows.sort((a, b) => (!!b.label - !!a.label) || b.score - a.score);
    // Le même cancer peut revenir sous plusieurs noms (« Cancer du sein », « Carcinome du sein ») : on garde le premier de chaque libellé.
    const seen = new Set();
    g.rows = g.rows.filter((r) => { const k = (r.label || r.name).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  if (!list.some((g) => g.score >= CARD_SCORE)) return [];
  return list.sort((a, b) => (a.key === 'autres') - (b.key === 'autres') || b.score - a.score);
}
