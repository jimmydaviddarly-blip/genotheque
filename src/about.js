// Page « À propos » : créateur et contact, avertissement médical, confidentialité, crédits et
// licences des données, mentions légales. En français et en anglais, comme l'aide.
import { begin, stale, esc } from './views.js';
import { getLang, locale } from './i18n.js';
import { figures } from './api.js';

const MAIL = 'studio.nebulis@gmail.com';
const REPO = 'https://github.com/jimmydaviddarly-blip/genotheque';
const a = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;
// Le lien de signalement prépare un mail sans aucune donnée personnelle : seulement la page concernée.
const report = (lang) => `mailto:${MAIL}?subject=${encodeURIComponent(lang === 'fr' ? 'Génothèque : erreur ou suggestion' : 'Genotheque: error or suggestion')}`;

const TEXT = {
  fr: {
    title: 'À propos',
    sections: (v) => [
      ['Qui fait Génothèque', [
        'Génothèque est créée par <strong>Jimmy Darly</strong>, sous le nom d\'atelier « Studio Nébulis ». C\'est un projet personnel, gratuit et non commercial, sans publicité.',
        `Contact : <a href="mailto:${MAIL}">${MAIL}</a>`,
        `Une donnée fausse, une traduction maladroite, une idée ? <a href="${report('fr')}">Écrire au studio</a> ou ${a(`${REPO}/issues`, 'ouvrir une demande sur GitHub')}.`,
        `Le code source est libre, sous licence AGPL-3.0 : ${a(REPO, 'github.com/jimmydaviddarly-blip/genotheque')}.`,
      ]],
      ['Information, pas diagnostic', [
        'Génothèque montre ce que disent des bases scientifiques publiques, à des fins d\'information et d\'apprentissage. Elle ne lit aucune donnée génétique personnelle, n\'interprète aucun résultat de test et ne calcule aucun risque. Ce n\'est pas un dispositif médical.',
        'Les classifications (ClinVar, ClinGen), les scores prédictifs (AlphaMissense, REVEL, CADD) et les recommandations de pharmacogénétique (CPIC) sont des informations générales. Ils ne s\'appliquent pas directement à une personne et peuvent être incomplets, dépassés ou contradictoires.',
        'Ne modifiez jamais un traitement, ne décidez pas d\'un test et ne tirez aucune conclusion sur votre santé ou celle d\'un proche à partir de cette appli : parlez-en à un médecin ou à un conseiller en génétique. En cas d\'urgence, appelez le 15 ou le 112.',
        'Les données sont fournies telles quelles, sans garantie d\'exactitude ni d\'actualité. Leurs producteurs n\'approuvent pas cette appli.',
      ]],
      ['Confidentialité', [
        '<strong>Ce que l\'appli garde.</strong> Rien n\'est envoyé au studio : Génothèque n\'a ni serveur, ni compte, ni cookie, ni mesure d\'audience, ni publicité. Votre langue, votre thème, vos favoris et vos fiches récentes sont enregistrés uniquement dans votre navigateur, et l\'appli est mise en cache pour fonctionner hors ligne. Ces éléments servent seulement au fonctionnement que vous demandez : aucun consentement n\'est donc demandé. Pour les effacer, supprimez les données du site dans votre navigateur ou désinstallez l\'appli.',
        '<strong>Ce que voient les autres.</strong> Quand vous cherchez un gène, un variant ou une maladie, votre appareil interroge directement des bases publiques : NCBI, MyGene et MyVariant, gnomAD, Open Targets, EMBL-EBI (UniProt, AlphaFold, GWAS Catalog), Wikipédia et Wikidata, STRING, Reactome, GTEx, ClinicalTrials.gov et le Jackson Laboratory (HPO). Quand vous tapez la notation d\'une mutation, elle est aussi envoyée à VariantValidator, à Ensembl et à la National Library of Medicine (NLM). Comme pour toute page web, ces services reçoivent votre adresse IP et le terme recherché ; la plupart sont situés aux États-Unis. Le site est hébergé par GitHub (États-Unis), qui enregistre l\'adresse IP des visiteurs pour la sécurité (' + a('https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement', 'déclaration de confidentialité de GitHub') + '). Une recherche sur une maladie peut révéler un intérêt pour votre santé, et un variant rare en dit plus encore : n\'entrez pas de données personnelles ou de résultats de test dans la recherche, et si cela vous gêne, utilisez un réseau ou un navigateur qui masque votre adresse.',
        `<strong>Vos droits.</strong> Le studio ne détient aucune donnée vous concernant. Si vous lui écrivez, il garde votre adresse et votre message le temps de vous répondre, et les supprime sur simple demande. Questions : <a href="mailto:${MAIL}">${MAIL}</a>. Vous pouvez aussi saisir la CNIL (${a('https://www.cnil.fr/', 'cnil.fr')}).`,
      ]],
      ['Crédits et licences des données', [
        'Les données restent la propriété de leurs producteurs. Elles sont présentées dans une mise en forme propre à Génothèque (tri, traduction des libellés, extraits). Aucun producteur n\'approuve ni ne cautionne cette appli.',
        `Orphadata Science : données en libre accès d'Orphanet. © INSERM 1999. Disponible sur ${a('https://sciences.orphadata.com', 'sciences.orphadata.com')}. Version des données : ${v.orphanet}. Licence ${a('https://creativecommons.org/licenses/by/4.0/deed.fr', 'CC BY 4.0')}. Classifications réorganisées pour l'affichage.`,
        `Ce service utilise la ${a('https://hpo.jax.org/', 'Human Phenotype Ontology')} (Human Phenotype Ontology Consortium) : annotations lues en direct sur le service du Jackson Laboratory, traductions françaises officielles du ${v.hpoFr}. Contenu non modifié.`,
        `HGNC, HUGO Gene Nomenclature Committee, ${a('https://www.genenames.org/', 'genenames.org')}, données du ${v.hgnc}, CC0.`,
        `Clinical Genome Resource (ClinGen), ${a('https://clinicalgenome.org/', 'clinicalgenome.org')}, fichier du ${v.clingen}, CC0.`,
        `CPIC, Clinical Pharmacogenetics Implementation Consortium, ${a('https://cpicpgx.org/', 'cpicpgx.org')}, consulté le ${v.cpic}, CC0.`,
        `Base de données publique des médicaments, ${a('https://base-donnees-publique.medicaments.gouv.fr/', 'base-donnees-publique.medicaments.gouv.fr')}, données du ${v.bdpm}. Cette réutilisation n'est ni approuvée ni cautionnée par l'ANSM, la HAS ou l'Assurance maladie.`,
        'UniProt (CC BY 4.0) ; AlphaFold DB, EMBL-EBI et Google DeepMind (CC BY 4.0) ; STRING (CC BY 4.0, réseau filtré et redessiné) ; Reactome (CC0) ; Gene Ontology Consortium, via QuickGO (EMBL-EBI, CC BY 4.0) ; Open Targets Platform (CC0) ; ChEMBL, EMBL-EBI, via Open Targets (CC BY-SA 3.0).',
        'GTEx Portal, version v8. Le projet GTEx est financé par le Common Fund du NIH Office of the Director, avec le NCI, le NHGRI, le NHLBI, le NIDA, le NIMH et le NINDS.',
        `Notation des mutations : ${a('https://variantvalidator.org/', 'VariantValidator')} (Freeman et al., Human Mutation, 2018), ${a('https://rest.ensembl.org/', 'Ensembl')} (EMBL-EBI, VEP) et ${a('https://clinicaltables.nlm.nih.gov/', 'NLM Clinical Tables')} (ClinVar, domaine public).`,
        'gnomAD v4, Broad Institute ; GWAS Catalog, NHGRI et EMBL-EBI ; NCBI Gene, dbSNP, ClinVar et ClinicalTrials.gov (domaine public, États-Unis) ; fréquences des projets de populations (1000 Genomes, HapMap, SGDP, HGDP, TOPMed, PAGE, ALSPAC, TwinsUK, GoNL, GenomeDK, FINRISK, Korea1K, KoVariome, ToMMo, Qatar…) telles que publiées par dbSNP ; MyGene.info et MyVariant.info (BioThings, Scripps Research).',
        `Scores via dbNSFP (${a('https://creativecommons.org/licenses/by-nc-nd/4.0/deed.fr', 'CC BY-NC-ND 4.0')}, usage non commercial) : AlphaMissense (Google DeepMind, CC BY 4.0), REVEL et CADD (usage non commercial).`,
        `Résumés : Wikipédia, licence ${a('https://creativecommons.org/licenses/by-sa/4.0/deed.fr', 'CC BY-SA 4.0')}, auteurs listés dans l'historique de chaque article ; Wikidata (CC0).`,
        `Logiciels : 3Dmol.js © 2014 University of Pittsburgh et contributeurs (BSD-3-Clause), avec three.js, jQuery et GLmol (MIT) ; polices Inter et Plus Jakarta Sans (SIL Open Font License 1.1). ${a('./THIRD_PARTY_NOTICES.txt', 'Textes complets des licences')}.`,
      ]],
      ['Mentions légales', [
        `Éditeur et directeur de la publication : Jimmy Darly, particulier, qui publie sous le nom d'atelier « Studio Nébulis » (nom d'usage, non une société). Contact : <a href="mailto:${MAIL}">${MAIL}</a>.`,
        'Hébergeur : GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.',
        'Code source sous licence AGPL-3.0 ; le nom, le logo et l\'icône sont réservés (voir NOTICE) ; données sous la licence de chaque base (voir ci-dessus).',
        `Accessibilité : l'appli suit les bonnes pratiques (contrastes, taille des boutons, navigation au clavier) mais n'a pas été auditée. Signalez tout obstacle à <a href="mailto:${MAIL}">${MAIL}</a>.`,
      ]],
    ],
  },
  en: {
    title: 'About',
    sections: (v) => [
      ['Who makes Genotheque', [
        'Genotheque is made by <strong>Jimmy Darly</strong>, under the studio name "Studio Nébulis". It is a personal, free and non-commercial project, with no ads.',
        `Contact: <a href="mailto:${MAIL}">${MAIL}</a>`,
        `Wrong data, an awkward translation, an idea? <a href="${report('en')}">Email the studio</a> or ${a(`${REPO}/issues`, 'open an issue on GitHub')}.`,
        `The source code is open, under the AGPL-3.0 licence: ${a(REPO, 'github.com/jimmydaviddarly-blip/genotheque')}.`,
      ]],
      ['Information, not diagnosis', [
        'Genotheque shows what public scientific databases say, for information and learning. It reads no personal genetic data, interprets no test result and computes no risk. It is not a medical device.',
        'Classifications (ClinVar, ClinGen), predictive scores (AlphaMissense, REVEL, CADD) and pharmacogenetic recommendations (CPIC) are general information. They do not apply directly to any one person and may be incomplete, out of date or contradictory.',
        'Never change a treatment, decide on a test or draw conclusions about your health or a relative\'s from this app: talk to a doctor or a genetic counsellor. In an emergency, call 112 (or your local emergency number).',
        'Data is provided as is, with no guarantee of accuracy or currency. Its producers do not endorse this app.',
      ]],
      ['Privacy', [
        '<strong>What the app keeps.</strong> Nothing is sent to the studio: Genotheque has no server, no account, no cookies, no analytics and no ads. Your language, theme, favourites and recent pages are stored only in your browser, and the app is cached so it works offline. These only serve the features you use, so no consent is asked. To erase them, clear the site data in your browser or uninstall the app.',
        '<strong>What others see.</strong> When you search for a gene, a variant or a disease, your device queries public databases directly: NCBI, MyGene and MyVariant, gnomAD, Open Targets, EMBL-EBI (UniProt, AlphaFold, GWAS Catalog), Wikipedia and Wikidata, STRING, Reactome, GTEx, ClinicalTrials.gov and the Jackson Laboratory (HPO). When you type a mutation notation, it is also sent to VariantValidator, Ensembl and the National Library of Medicine (NLM). As with any web page, these services receive your IP address and the search term; most are based in the United States. The site is hosted by GitHub (United States), which logs visitors\' IP addresses for security (' + a('https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement', 'GitHub privacy statement') + '). Searching for a disease may reveal an interest in your health, and a rare variant reveals even more: do not enter personal data or test results in the search, and if that bothers you, use a network or browser that hides your address.',
        `<strong>Your rights.</strong> The studio holds no data about you. If you write to it, it keeps your address and message only as long as needed to reply, and deletes them on request. Questions: <a href="mailto:${MAIL}">${MAIL}</a>. You can also contact the French data protection authority, the CNIL (${a('https://www.cnil.fr/en', 'cnil.fr')}).`,
      ]],
      ['Credits and data licences', [
        'Data remains the property of its producers. Genotheque presents it in its own layout (sorting, translated labels, excerpts). No producer approves or endorses this app.',
        `Orphadata Science: free access data from Orphanet. © INSERM 1999. Available on ${a('https://sciences.orphadata.com', 'sciences.orphadata.com')}. Data version: ${v.orphanet}. Licence ${a('https://creativecommons.org/licenses/by/4.0/', 'CC BY 4.0')}. Classifications reorganised for display.`,
        `This service uses the ${a('https://hpo.jax.org/', 'Human Phenotype Ontology')} (Human Phenotype Ontology Consortium): annotations read live from the Jackson Laboratory service, official French translations of ${v.hpoFr}. Content not modified.`,
        `HGNC, HUGO Gene Nomenclature Committee, ${a('https://www.genenames.org/', 'genenames.org')}, data of ${v.hgnc}, CC0.`,
        `Clinical Genome Resource (ClinGen), ${a('https://clinicalgenome.org/', 'clinicalgenome.org')}, file of ${v.clingen}, CC0.`,
        `CPIC, Clinical Pharmacogenetics Implementation Consortium, ${a('https://cpicpgx.org/', 'cpicpgx.org')}, accessed ${v.cpic}, CC0.`,
        `French public medicines database, ${a('https://base-donnees-publique.medicaments.gouv.fr/', 'base-donnees-publique.medicaments.gouv.fr')}, data of ${v.bdpm}. This reuse is neither approved nor endorsed by ANSM, HAS or Assurance maladie.`,
        'UniProt (CC BY 4.0); AlphaFold DB, EMBL-EBI and Google DeepMind (CC BY 4.0); STRING (CC BY 4.0, network filtered and redrawn); Reactome (CC0); Gene Ontology Consortium, via QuickGO (EMBL-EBI, CC BY 4.0); Open Targets Platform (CC0); ChEMBL, EMBL-EBI, via Open Targets (CC BY-SA 3.0).',
        'GTEx Portal, release v8. The Genotype-Tissue Expression (GTEx) Project was supported by the Common Fund of the Office of the Director of the National Institutes of Health, and by NCI, NHGRI, NHLBI, NIDA, NIMH and NINDS.',
        `Mutation notation: ${a('https://variantvalidator.org/', 'VariantValidator')} (Freeman et al., Human Mutation, 2018), ${a('https://rest.ensembl.org/', 'Ensembl')} (EMBL-EBI, VEP) and ${a('https://clinicaltables.nlm.nih.gov/', 'NLM Clinical Tables')} (ClinVar, public domain).`,
        'gnomAD v4, Broad Institute; GWAS Catalog, NHGRI and EMBL-EBI; NCBI Gene, dbSNP, ClinVar and ClinicalTrials.gov (public domain, United States); allele frequencies from population projects (1000 Genomes, HapMap, SGDP, HGDP, TOPMed, PAGE, ALSPAC, TwinsUK, GoNL, GenomeDK, FINRISK, Korea1K, KoVariome, ToMMo, Qatar…) as published by dbSNP; MyGene.info and MyVariant.info (BioThings, Scripps Research).',
        `Scores via dbNSFP (${a('https://creativecommons.org/licenses/by-nc-nd/4.0/', 'CC BY-NC-ND 4.0')}, non-commercial use): AlphaMissense (Google DeepMind, CC BY 4.0), REVEL and CADD (non-commercial use).`,
        `Summaries: Wikipedia, licence ${a('https://creativecommons.org/licenses/by-sa/4.0/', 'CC BY-SA 4.0')}, authors listed in each article's history; Wikidata (CC0).`,
        `Software: 3Dmol.js © 2014 University of Pittsburgh and contributors (BSD-3-Clause), with three.js, jQuery and GLmol (MIT); Inter and Plus Jakarta Sans fonts (SIL Open Font License 1.1). ${a('./THIRD_PARTY_NOTICES.txt', 'Full licence texts')}.`,
      ]],
      ['Legal notice', [
        `Publisher and editor: Jimmy Darly, private individual, publishing under the studio name "Studio Nébulis" (a trading name, not a company). Contact: <a href="mailto:${MAIL}">${MAIL}</a>.`,
        'Host: GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, United States.',
        'Source code under the AGPL-3.0 licence; the name, logo and icon are reserved (see NOTICE); data under each database\'s own licence (see above).',
        `Accessibility: the app follows good practice (contrast, button size, keyboard navigation) but has not been audited. Please report any barrier to <a href="mailto:${MAIL}">${MAIL}</a>.`,
      ]],
    ],
  },
};

export async function renderAbout(app) {
  const my = begin();
  const lang = getLang();
  const tx = TEXT[lang];
  // Dates des données embarquées (public/data/chiffres.json) au format de la langue.
  let v = {};
  try { v = (await figures()).versions || {}; } catch { /* hors ligne sans cache : dates absentes */ }
  if (stale(my)) return;
  const fmt = (d) => (d ? esc(new Date(`${d}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'long', year: 'numeric' })) : '?');
  const dates = Object.fromEntries(['orphanet', 'hpoFr', 'hgnc', 'clingen', 'cpic', 'bdpm'].map((k) => [k, fmt(v[k])]));
  app.innerHTML = `<div class="page about" lang="${lang}">
    <div class="page-head">
      <button class="back" aria-label="${lang === 'fr' ? 'Retour' : 'Back'}" data-back>‹</button>
      <div class="titles"><h1>${tx.title}</h1></div>
    </div>
    ${tx.sections(dates).map(([h, paras]) => `<section class="card"><h2>${h}</h2>${paras.map((p) => `<p class="prose">${p}</p>`).join('')}</section>`).join('')}
  </div>`;
}
