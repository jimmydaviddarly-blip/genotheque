// Page d'aide, en français et en anglais, dans la langue de l'interface.
import { begin } from './views.js';
import { getLang } from './i18n.js';

const TEXT = {
  fr: {
    title: 'Aide',
    switchTo: 'English',
    sections: [
      ['À quoi sert l\'appli', [
        'Génothèque rassemble sur une seule fiche ce que disent les grandes bases publiques de génétique humaine : NCBI, Ensembl, gnomAD, ClinVar, Orphanet, Open Targets et d\'autres.',
        'Elle sert à comprendre et à apprendre. Elle ne pose aucun diagnostic et ne lit aucune donnée génétique personnelle.',
      ]],
      ['Chercher', [
        'Un seul champ suffit. Tapez le début d\'un nom de gène : la liste se complète à mesure que vous écrivez.',
        'La fin du nom proposé s\'affiche en gris dans le champ. Touchez le bouton à droite du champ pour accepter la proposition, ou appuyez sur Tab avec un clavier.',
        'Les autres noms d\'un gène sont reconnus. HER2 mène à ERBB2, p53 à TP53. La suggestion indique le nom reconnu.',
        'Les fautes de frappe sont rattrapées : ERRB2, ERB2 ou EBRB2 proposent ERBB2, sous « Vouliez-vous dire ? » ou avec la mention « orthographe proche ».',
        'Un numéro de variant commence par rs, par exemple rs429358. Une maladie se cherche en français ou en anglais : mucoviscidose ou cystic fibrosis.',
        'La touche Entrée ouvre la première suggestion.',
      ]],
      ['Explorer', [
        'L\'onglet Explorer permet de parcourir sans savoir quoi chercher.',
        'Familles de gènes : les grandes familles (kinases, canaux ioniques, anticorps…) avec leurs sous-familles et leurs gènes.',
        'Maladies rares : les classifications officielles d\'Orphanet, par spécialité, à parcourir niveau par niveau.',
        'Cancers : touchez une zone de la silhouette pour voir les cancers de cet organe.',
      ]],
      ['Lire une fiche', [
        'Le bouton « ? » d\'une carte l\'explique en langage courant.',
        'L\'étiquette EN signale un texte laissé tel quel, en anglais, dans la base d\'origine.',
        'Les étoiles d\'un avis ClinVar, de 0 à 4, indiquent son degré de fiabilité.',
        'Les prédictions informatiques sont des estimations, pas des verdicts. L\'avis argumenté d\'un laboratoire passe avant.',
        'Les médicaments et les essais cliniques sont listés à titre d\'information. Ce ne sont pas des conseils de traitement.',
      ]],
      ['Favoris, partage, hors ligne', [
        'L\'étoile en haut d\'une fiche la garde dans l\'onglet Favoris. Les favoris restent sur ce téléphone.',
        'Le bouton Partager envoie le lien de la fiche par message ou par mail.',
        'Après une première ouverture avec connexion, l\'appli et l\'onglet Explorer fonctionnent sans réseau. Les fiches détaillées ont besoin d\'Internet.',
        'Pour l\'installer, utilisez « Ajouter à l\'écran d\'accueil » dans le menu du navigateur.',
      ]],
      ['À savoir', [
        'Information, pas diagnostic. Pour toute question sur votre santé ou celle d\'un proche, parlez-en à un médecin ou à un conseiller en génétique.',
        'Les bases sont mises à jour par leurs auteurs : une classification peut changer avec le temps.',
      ]],
    ],
  },
  en: {
    title: 'Help',
    switchTo: 'Français',
    sections: [
      ['What the app is for', [
        'Genotheque brings together, on a single page, what the major public human genetics databases say: NCBI, Ensembl, gnomAD, ClinVar, Orphanet, Open Targets and others.',
        'It is meant for understanding and learning. It makes no diagnosis and reads no personal genetic data.',
      ]],
      ['Searching', [
        'One field is enough. Start typing a gene name and suggestions appear as you type.',
        'The rest of the suggested name appears in grey in the field. Tap the button on the right of the field to complete it, or press Tab on a keyboard.',
        'Alternative names are recognised too: HER2 finds ERBB2, p53 finds TP53. The suggestion shows which name was recognised.',
        'Typos are caught: ERRB2, ERB2 or EBRB2 all suggest ERBB2, under "Did you mean?" or marked "similar spelling".',
        'A variant ID starts with rs, for example rs429358. You can search for a disease in French or English: mucoviscidose or cystic fibrosis.',
        'The Enter key opens the first suggestion.',
      ]],
      ['Browsing', [
        'The Explorer tab lets you browse without knowing what to look for.',
        'Gene families: the large families (kinases, ion channels, antibodies…) with their subfamilies and genes.',
        'Rare diseases: Orphanet\'s official classifications, by specialty, to browse level by level.',
        'Cancers: tap an area of the body outline to see the cancers of that organ.',
      ]],
      ['Reading a page', [
        'The "?" button on a card explains it in plain language.',
        'The EN label marks a text left as is, in English, from the source database.',
        'The stars on a ClinVar assessment, from 0 to 4, show how well supported it is.',
        'Computational predictions are estimates, not verdicts. A laboratory\'s documented assessment comes first.',
        'Medicines and clinical trials are listed for information. They are not treatment advice.',
      ]],
      ['Favourites, sharing, offline', [
        'The star at the top of a page keeps it in the Favourites tab. Favourites stay on this phone.',
        'The Share button sends the page link by message or email.',
        'After you first open it online, the app and the Explorer tab work offline. Detailed pages need the Internet.',
        'To install it, use "Add to Home Screen" in the browser menu.',
      ]],
      ['Good to know', [
        'Information, not diagnosis. For any question about your health or a relative\'s, talk to a doctor or a genetic counsellor.',
        'The databases are updated by their authors: a classification can change over time.',
      ]],
    ],
  },
};

export function renderHelp(app) {
  begin();
  const lang = getLang();
  const tx = TEXT[lang];
  // Le bouton bascule toute l'interface (data-lang, relié dans bindCommon), pas seulement l'aide.
  app.innerHTML = `<div class="page" lang="${lang}">
    <div class="page-head">
      <button class="back" aria-label="${lang === 'fr' ? 'Retour' : 'Back'}" data-back>‹</button>
      <div class="titles"><h1>${tx.title}</h1></div>
      <button class="lang-btn" data-lang="${lang === 'fr' ? 'en' : 'fr'}">${tx.switchTo}</button>
    </div>
    ${tx.sections.map(([h, paras]) => `<section class="card"><h2>${h}</h2>${paras.map((p) => `<p class="prose">${p}</p>`).join('')}</section>`).join('')}
  </div>`;
}
