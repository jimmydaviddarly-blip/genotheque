// Contenu rédigé pour la vitrine : familles retenues, zones du corps, icônes.

export const FAMILIES = [
  { id: 3432, icon: 'bolt', fr: 'Kinases', text: 'Enzymes qui modifient l\'activité d\'autres protéines en leur ajoutant un groupe phosphate. Elles commandent notamment la division des cellules, et beaucoup de médicaments contre le cancer les bloquent.' },
  { id: 2054, icon: 'antenna', fr: 'Récepteurs membranaires (RCPG)', text: 'Capteurs plantés dans la membrane des cellules, qu\'ils traversent sept fois. Ils captent hormones, odeurs, lumière ou goûts. Environ un tiers des médicaments agissent sur eux.' },
  { id: 177, icon: 'channel', fr: 'Canaux ioniques', text: 'Pores qui laissent passer des ions (sodium, potassium, calcium, chlorure). Ils font battre le cœur et circuler l\'influx nerveux. La mucoviscidose touche l\'un d\'eux.' },
  { id: 752, icon: 'swap', fr: 'Transporteurs (SLC)', text: 'Protéines qui font entrer et sortir des cellules les sucres, les acides aminés, les vitamines et de nombreux médicaments.' },
  { id: 516, icon: 'body', fr: 'Homéoboîtes', text: 'Gènes chefs d\'orchestre du développement : ils dessinent le plan du corps de l\'embryon, de la tête aux membres.' },
  { id: 26, icon: 'finger', fr: 'Doigts de zinc', text: 'L\'une des plus grandes familles de gènes humains. Leurs protéines s\'accrochent à l\'ADN grâce à un atome de zinc et règlent l\'activité d\'autres gènes.' },
  { id: 348, icon: 'shield', fr: 'Anticorps (immunoglobulines)', text: 'Les gènes des anticorps. Leurs morceaux se recombinent dans chaque lymphocyte B, ce qui permet de fabriquer des millions d\'anticorps différents.' },
  { id: 471, icon: 'tag', fr: 'Marqueurs CD', text: 'Molécules à la surface des globules blancs, qui servent à les reconnaître. Le diagnostic des leucémies et des lymphomes s\'appuie sur elles.' },
  { id: 862, icon: 'pill', fr: 'Cytochromes P450', text: 'Enzymes, surtout du foie, qui transforment les médicaments et les toxines. Leurs variants expliquent en partie pourquoi un même médicament agit différemment selon les personnes.' },
  { id: 864, icon: 'spool', fr: 'Histones', text: 'Bobines autour desquelles s\'enroule l\'ADN. Leurs marques chimiques décident quels gènes restent lisibles : c\'est l\'épigénétique.' },
  { id: 639, icon: 'battery', fr: 'Chaîne respiratoire', text: 'Les complexes de la mitochondrie qui produisent l\'énergie de la cellule. Leurs défauts causent des maladies mitochondriales.' },
  { id: 475, icon: 'rna', fr: 'ARN non codants', text: 'Gènes qui ne fabriquent pas de protéine mais un ARN utile par lui-même : microARN, ARN de transfert, longs ARN régulateurs.' },
];

// Icône de chaque classement Orphanet (identifiant du fichier product3).
export const CLASS_ICONS = {
  156: 'dna', 147: 'baby', 181: 'brain', 233: 'swap', 189: 'eye', 150: 'flask', 202: 'target', 187: 'hand',
  199: 'bone', 193: 'drop', 194: 'drop', 188: 'kidney', 200: 'ear', 195: 'shield', 152: 'stomach', 198: 'pulse',
  196: 'joint', 205: 'female', 184: 'lungs', 148: 'heart', 146: 'heart', 182: 'scalpel', 183: 'liver', 209: 'face',
  185: 'kidney', 203: 'virus', 201: 'female', 197: 'tooth', 231: 'baby', 186: 'lungs', 204: 'flask', 216: 'baby', 212: 'shield',
};

// Zones de la silhouette (repère 200 x 440) et cancers rattachés, avec leur identifiant Open Targets.
export const ORGANS = [
  { id: 'cerveau', fr: 'Cerveau', x: 96, y: 22, cancers: [['MONDO_0018177', 'Glioblastome'], ['MONDO_0021042', 'Gliome'], ['MONDO_0016642', 'Méningiome'], ['MONDO_0007959', 'Médulloblastome (enfant)']] },
  { id: 'oeil', fr: 'Œil', x: 116, y: 40, cancers: [['MONDO_0008380', 'Rétinoblastome (enfant)'], ['MONDO_0006486', 'Mélanome de l\'uvée']] },
  { id: 'tete-cou', fr: 'Bouche et gorge', x: 100, y: 62, cancers: [['MONDO_0010150', 'Carcinome épidermoïde de la tête et du cou'], ['MONDO_0015459', 'Cancer du nasopharynx']] },
  { id: 'thyroide', fr: 'Thyroïde', x: 100, y: 86, cancers: [['MONDO_0015075', 'Carcinome de la thyroïde'], ['MONDO_0015277', 'Carcinome médullaire de la thyroïde']] },
  { id: 'ganglions', fr: 'Ganglions lymphatiques', short: 'Ganglions', x: 60, y: 104, cancers: [['MONDO_0004952', 'Lymphome de Hodgkin'], ['MONDO_0018905', 'Lymphome B diffus à grandes cellules']] },
  { id: 'oesophage', fr: 'Œsophage', x: 100, y: 110, cancers: [['MONDO_0005028', 'Adénocarcinome de l\'œsophage'], ['MONDO_0005580', 'Carcinome épidermoïde de l\'œsophage']] },
  { id: 'poumon', fr: 'Poumons', x: 74, y: 128, cancers: [['MONDO_0005061', 'Adénocarcinome du poumon'], ['MONDO_0005233', 'Cancer du poumon non à petites cellules'], ['MONDO_0008433', 'Cancer du poumon à petites cellules'], ['MONDO_0005065', 'Mésothéliome (plèvre)']] },
  { id: 'sein', fr: 'Sein', x: 127, y: 130, cancers: [['MONDO_0004989', 'Carcinome du sein'], ['MONDO_0005494', 'Cancer du sein triple négatif'], ['MONDO_0016419', 'Cancer du sein héréditaire']] },
  { id: 'estomac', fr: 'Estomac', x: 118, y: 158, cancers: [['MONDO_0005036', 'Adénocarcinome de l\'estomac']] },
  { id: 'foie', fr: 'Foie', x: 78, y: 164, cancers: [['MONDO_0007256', 'Carcinome hépatocellulaire'], ['MONDO_0019087', 'Cholangiocarcinome (voies biliaires)']] },
  { id: 'surrenales', fr: 'Glandes surrénales', short: 'Surrénales', x: 140, y: 184, cancers: [['MONDO_0005072', 'Neuroblastome (enfant)'], ['MONDO_0008233', 'Phéochromocytome']] },
  { id: 'pancreas', fr: 'Pancréas', x: 100, y: 186, cancers: [['MONDO_0005184', 'Adénocarcinome canalaire du pancréas'], ['MONDO_0019954', 'Tumeur neuroendocrine du pancréas']] },
  { id: 'rein', fr: 'Reins', x: 128, y: 214, cancers: [['MONDO_0005005', 'Carcinome rénal à cellules claires'], ['MONDO_0006058', 'Néphroblastome ou tumeur de Wilms (enfant)']] },
  { id: 'colon', fr: 'Côlon et rectum', short: 'Côlon, rectum', x: 72, y: 216, cancers: [['MONDO_0005008', 'Adénocarcinome colorectal'], ['MONDO_0005835', 'Syndrome de Lynch (prédisposition)']] },
  { id: 'vessie', fr: 'Vessie', x: 100, y: 244, cancers: [['MONDO_0005611', 'Carcinome urothélial de la vessie']] },
  { id: 'genital', fr: 'Organes génitaux', x: 100, y: 274, cancers: [['MONDO_0005082', 'Adénocarcinome de la prostate'], ['MONDO_0010108', 'Tumeur germinale du testicule'], ['EFO_1001516', 'Carcinome séreux de l\'ovaire'], ['MONDO_0002447', 'Carcinome de l\'endomètre (utérus)'], ['MONDO_0002974', 'Cancer du col de l\'utérus']] },
  { id: 'peau', fr: 'Peau', x: 35, y: 248, cancers: [['MONDO_0005012', 'Mélanome de la peau'], ['MONDO_0020804', 'Carcinome basocellulaire']] },
  { id: 'sang', fr: 'Sang et moelle osseuse', short: 'Sang, moelle', x: 80, y: 318, cancers: [['MONDO_0018874', 'Leucémie aiguë myéloïde'], ['MONDO_0004967', 'Leucémie aiguë lymphoblastique'], ['MONDO_0011996', 'Leucémie myéloïde chronique'], ['MONDO_0009693', 'Myélome multiple']] },
  { id: 'os', fr: 'Os et muscles', x: 120, y: 366, cancers: [['MONDO_0009807', 'Ostéosarcome'], ['MONDO_0012817', 'Sarcome d\'Ewing'], ['MONDO_0005212', 'Rhabdomyosarcome']] },
];

// Icônes au trait, repère 24 x 24.
export const ICONS = {
  dna: '<path d="M7 3c0 6 10 6 10 9s-10 3-10 9M17 3c0 6-10 6-10 9s10 3 10 9M8.5 7h7M8.5 17h7"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  antenna: '<circle cx="12" cy="9" r="2.5"/><path d="M12 11.5V21M7 5a7 7 0 0 0 0 8M17 5a7 7 0 0 1 0 8"/>',
  channel: '<path d="M7 3v18M17 3v18M12 5v12M9 14l3 3 3-3"/>',
  swap: '<path d="M4 8h15l-3-3M20 16H5l3 3"/>',
  body: '<circle cx="12" cy="5" r="2.5"/><path d="M12 8v7M7 11h10M12 15l-3 6M12 15l3 6"/>',
  finger: '<path d="M9 12V5a1.5 1.5 0 0 1 3 0v6M12 10V4.5a1.5 1.5 0 0 1 3 0V11M15 10a1.5 1.5 0 0 1 3 0v3c0 5-3 8-7 8s-6-3-6-6v-2a1.5 1.5 0 0 1 3 0"/>',
  shield: '<path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  pill: '<path d="M10.5 3.5a5 5 0 0 1 7 7l-7 7a5 5 0 0 1-7-7zM7 10l7 7"/>',
  spool: '<ellipse cx="12" cy="8" rx="7" ry="3"/><path d="M5 8v8c0 1.7 3.1 3 7 3s7-1.3 7-3V8"/>',
  battery: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 11v2M7 10v4M11 10v4"/>',
  rna: '<path d="M3 12c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/>',
  brain: '<path d="M10 4a3 3 0 0 0-4 2.5A3 3 0 0 0 4 11a3 3 0 0 0 1.5 5A3 3 0 0 0 10 20zM14 4a3 3 0 0 1 4 2.5A3 3 0 0 1 20 11a3 3 0 0 1-1.5 5A3 3 0 0 1 14 20zM10 4v16M14 4v16"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  heart: '<path d="M12 20s-8-5-8-11a4 4 0 0 1 8-2 4 4 0 0 1 8 2c0 6-8 11-8 11z"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  bone: '<path d="M7 4a2 2 0 0 0-2 3 2 2 0 0 0 1.5 3L14 17.5a2 2 0 0 0 3 1.5 2 2 0 0 0 3-2 2 2 0 0 0-1.5-3L11 6.5A2 2 0 0 0 7 4z"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7 15h10"/>',
  baby: '<circle cx="12" cy="7" r="3.5"/><path d="M6 21v-3a6 6 0 0 1 12 0v3"/>',
  hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 10V4.5a1.5 1.5 0 0 1 3 0V10M14 10V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 8-6 8-2.5 0-4-1.5-5-3.5l-2-4a1.5 1.5 0 0 1 2.6-1.5L8 14"/>',
  kidney: '<path d="M14 4c-5 0-8 4-8 8s3 8 8 8c2 0 3-2 2-4-1-1.2-2-2-2-4s1-2.8 2-4c1-2 0-4-2-4z"/>',
  ear: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-6 0M10 9a2 2 0 0 1 4 0"/>',
  stomach: '<path d="M9 3v4c0 2-4 3-4 8a6 6 0 0 0 12 0c0-3 2-3 2-6"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  joint: '<circle cx="12" cy="12" r="4"/><path d="M12 2v6M12 16v6"/>',
  female: '<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>',
  lungs: '<path d="M12 3v9M12 9l-3 2M12 9l3 2M8 8c-3 1-5 5-5 10 0 2 2 3 4 2l2-1v-9M16 8c3 1 5 5 5 10 0 2-2 3-4 2l-2-1v-9"/>',
  scalpel: '<path d="M3 21l9-9M12 12l7-7 2 2-7 7z"/>',
  liver: '<path d="M3 10c0-3 4-5 9-5s9 1 9 4c0 5-6 10-12 10-3 0-6-3-6-9z"/>',
  face: '<circle cx="12" cy="12" r="9"/><path d="M9 10h.01M15 10h.01M9 15c2 1.5 4 1.5 6 0"/>',
  virus: '<circle cx="12" cy="12" r="5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M5.6 18.4l2.9-2.9M15.5 8.5l2.9-2.9"/>',
  tooth: '<path d="M7 3c-3 0-4 3-3 6 1 2 1 5 2 9 .3 2 2.7 2 3 0l1-4h4l1 4c.3 2 2.7 2 3 0 1-4 1-7 2-9 1-3 0-6-3-6-2 0-3 1-5 1S9 3 7 3z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
};

export const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.dot}</svg>`;

// Nom court de chaque classement Orphanet, pour les tuiles.
export const CLASS_SHORT = {
  156: 'Génétiques', 147: 'Développement de l\'embryon', 181: 'Neurologiques', 233: 'Greffes', 189: 'Yeux',
  150: 'Métabolisme', 202: 'Tumeurs', 187: 'Peau', 199: 'Os', 193: 'Hormones', 194: 'Sang', 188: 'Reins',
  200: 'Oreille, nez, gorge', 195: 'Immunité', 152: 'Digestives', 198: 'Vaisseaux', 196: 'Rhumatologie',
  205: 'Gynécologie, grossesse', 184: 'Respiratoires', 148: 'Chirurgie du cœur', 146: 'Cœur', 182: 'Chirurgie abdominale',
  183: 'Foie', 209: 'Chirurgie de la face', 185: 'Urogénitales', 203: 'Infectieuses', 201: 'Infertilité', 197: 'Dents',
  231: 'Rhumatologie de l\'enfant', 186: 'Chirurgie du thorax', 204: 'Intoxications', 216: 'Malformations dues à des substances toxiques', 212: 'Allergies',
};

// Place de l'étiquette d'une zone sur la silhouette (repère élargi -40..240) :
// à droite, à gauche, au-dessus, au-dessous, puis un cran plus loin, en gardant la première
// qui ne sort pas du cadre et ne recouvre aucun autre point. Renvoie null s'il n'y en a pas.
export function labelBox(o, text = o.short || o.fr) {
  const w = Math.round(text.length * 6 + 14);
  const h = 20;
  const mid = o.x - w / 2;
  const tries = [
    [o.x + 14, o.y - h / 2], [o.x - 14 - w, o.y - h / 2],
    [mid, o.y - 16 - h], [mid, o.y + 16], [mid, o.y - 40 - h], [mid, o.y + 40],
  ];
  const fits = ([x, y]) => x >= -38 && x + w <= 238
    && ORGANS.every((p) => p === o || p.x < x - 7 || p.x > x + w + 7 || p.y < y - 7 || p.y > y + h + 7);
  const spot = tries.find(fits);
  return spot ? { x: spot[0], y: spot[1], w, h, text } : null;
}
