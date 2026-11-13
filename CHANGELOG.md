# Historique des versions · Changelog

Les numéros suivent le principe `majeur.mineur.correctif` : un changement qui ajoute une fonction fait monter le mineur, une simple correction le correctif. Chaque version est une « release » GitHub avec son étiquette (`v0.4.0`) : on peut revenir à n'importe laquelle.

*Versions follow `major.minor.patch`. Each version is a GitHub release with its own tag, so any of them can be restored.*

## 0.7.1 · 2026-11-13

### Sous le capot (aucun changement visible dans l'appli)
- **Tests automatiques** (`npm test`, 45 tests) : reconnaissance de ce que l'on tape (numéro rs, notation d'une mutation, mots généraux), regroupement des cancers par organe, fréquences des projets de populations, dictionnaire des gènes (symboles, autres noms, fautes de frappe, complétion), noms de médicaments, traductions et typographie, cohérence des données embarquées, et un contrôle d'hygiène du dépôt (aucun caractère de contrôle caché, licence cohérente, version dans le CHANGELOG, politique de sécurité du contenu). Ils tournent avant chaque publication : une erreur les arrête.
- **Mise à jour mensuelle des données** : le 2 de chaque mois, GitHub régénère les données (Orphanet, HGNC, HPO, ClinGen, CPIC, médicaments français), les vérifie par les tests et propose le changement dans une demande de fusion à relire, sans rien publier tout seul. Rien n'est proposé quand seules les dates changent. Un téléchargement qui échoue est retenté (5, 15 puis 45 secondes), et une source indisponible garde son ancien fichier sans bloquer les autres ; l'exécution le signale.
- Les règles de recherche vivent dans leur propre fichier, pour pouvoir être testées.

## 0.7.0 · 2026-11-12

### Licence
- **Le code passe de MIT à AGPL-3.0-or-later.** Toute version modifiée proposée à d'autres, par un téléchargement ou par un site en ligne, doit rester ouverte sous la même licence, avec le nom de l'auteur et un lien vers ce dépôt. Le **nom « Génothèque », le logo et l'icône sont réservés** (voir `NOTICE.md`). Les données gardent la licence de leurs producteurs (`DATA_LICENSES.md`).
- Les versions 0.3.0 à 0.6.0, publiées la veille sous licence MIT, ont été retirées de la page Releases ; les copies déjà obtenues gardent la licence MIT sous laquelle elles ont été reçues.
- Le README met en tête l'auteur et la licence ; la page À propos et le pied de la page Infos indiquent la nouvelle licence.

## 0.6.0 · 2026-11-11

### Nouveau
- **Rôle dans la cellule** : sur la fiche d'un gène, une carte issue de la **Gene Ontology** (via QuickGO, EMBL-EBI, CC BY 4.0) liste les termes les mieux documentés : dans quels processus le gène intervient, ce qu'il fait au niveau moléculaire, où il se trouve dans la cellule. Seules les preuves expérimentales ou de curation sont gardées, les termes trop généraux (« liaison à une protéine ») sont écartés, chaque terme renvoie à sa page QuickGO. Termes en anglais (pas de version française officielle). Exemples : CFTR (transport du chlorure, canal chlorure, membrane apicale), BRCA1 (réparation de cassures double brin), TP53.
- Le compteur passe à **25 bases publiques** (accueil, aperçu de partage et images).

## 0.5.0 · 2026-11-11

### Nouveau
- **Fréquence dans d'autres projets** : sur la fiche d'un variant, une carte montre la fréquence de l'allèle dans jusqu'à 21 projets de populations, classés par région : monde (1000 Genomes, HapMap, SGDP, HGDP, PopFreq du NCBI), Amérique du Nord (TOPMed, PAGE, GO-ESP), Europe (ALSPAC, TwinsUK, GoNL, GenomeDK, FINRISK, Estonie, Suède du Nord, Espagne), Asie et Moyen-Orient (Korea1K, KoVariome, ToMMo, Vietnam, Sibérie, Qatar). Les chiffres sont ceux que dbSNP publie (domaine public), sans appel supplémentaire. Des fréquences seulement, jamais de données individuelles.
- Crédits, licences et README complétés.

## 0.4.1 · 2026-11-11

### Nouveau
- **Aide pour la notation d'une mutation** : quand on tape `c.68_69del`, `p.Cys61Gly`, `chr17:43094000` ou un transcrit, la recherche explique que cette notation n'est pas encore comprise et dit quoi taper à la place. Si le nom du gène est dans la saisie (`BRCA1 c.68_69del`), elle propose sa fiche.
- **Rappel sur les fiches variant** : « Fiche publique du variant : elle décrit ce que disent les bases, et rien sur votre situation personnelle. »
- **Confidentialité** : la page À propos précise de ne pas saisir de données personnelles ni de résultats de test.

## 0.4.0 · 2026-11-11

### Nouveau
- **Cancers liés à ce gène** : sur la fiche d'un gène, une carte regroupe par organe les cancers qui lui sont associés (sein, ovaire, côlon…), avec la force du lien et la mention « forme héréditaire », sans les termes généraux comme « cancer » ou « neoplasm ». Chaque organe mène à la zone du corps de l'Explorer.
- **Recherche des mots généraux** : pour « cancer », « tumeur », « carcinome »…, les maladies passent avant les gènes, et un raccourci mène aux cancers par zone du corps.
- **Bouton Favori** visible (« ☆ Favori ») avec message de confirmation, à la place d'une étoile ambiguë.
- **Chaque onglet se souvient de sa page** : depuis une fiche ouverte dans l'Explorer, on peut passer dans Favoris puis revenir à la même fiche.
- **Version ordinateur** : onglets en rail, panneau de recherche avec fiches récentes et favoris à gauche, fiche à droite sur deux colonnes.
- **Page À propos** : créateur, contact, avertissement médical, confidentialité, crédits et versions des données, mentions légales.
- **Nouvelle icône** pour tous les systèmes (Android, iPhone, Windows, Mac, Linux), image d'aperçu pour le partage, mode clair ou sombre au choix, tuiles de l'Explorer sobres ou colorées.

### Corrigé
- L'hélice de l'accueil se déformait sur une fenêtre large.
- La vue 3D disait « pas de réponse » après une mise à jour du site : l'appli se recharge maintenant d'elle-même, une fois.
- Sécurité : liens mal formés, identifiants vérifiés avant d'entrer dans une requête, adresses externes contrôlées, politique de sécurité du contenu, cache et réglages propres à l'appli.

### Connu
- La recherche ne comprend pas encore la notation d'une mutation (`c.68_69del`) : on cherche le gène ou le numéro rs.
- Certains textes des bases sont en anglais (marqués EN).

## 0.3.0 · 2026-11-11

Première publication : fiches gène, variant et maladie à partir de 24 bases publiques, Explorer (familles de gènes, maladies rares, cancers par zone du corps), recherche avec complétion des noms de gènes, favoris, partage, français et anglais, hors ligne pour l'Explorer.

---

## English

### 0.7.1 · 2026-11-13

**Under the hood (nothing changes in the app)**
- **Automated tests** (`npm test`, 45 tests): what you type is recognised correctly (rs number, mutation notation, general words), cancers are grouped by organ, population-project frequencies, the gene dictionary (symbols, aliases, typos, completion), drug names, translations and typography, consistency of the embedded data, and a repository hygiene check (no hidden control characters, consistent licence, version in the CHANGELOG, content security policy). They run before every publication: a failure stops it.
- **Monthly data update**: on the 2nd of each month, GitHub regenerates the data (Orphanet, HGNC, HPO, ClinGen, CPIC, French medicines), checks it with the tests and proposes the change in a pull request to review, publishing nothing by itself. Nothing is proposed when only dates change. A failing download is retried (5, 15 then 45 seconds), and an unavailable source keeps its previous file without blocking the others; the run reports it.
- Search rules live in their own file so they can be tested.

### 0.7.0 · 2026-11-12

**Licence**
- **The code moves from MIT to AGPL-3.0-or-later.** Any modified version offered to others, by download or as an online service, must stay open under the same licence, with the author's name and a link to this repository. The **name "Génothèque", the logo and the icon are reserved** (see `NOTICE.md`). Data keeps its producers' licences (`DATA_LICENSES.md`).
- Versions 0.3.0 to 0.6.0, published the day before under the MIT licence, were removed from the Releases page; copies already obtained keep the MIT licence they were received under.
- The README now leads with the author and the licence; the About page and the Info page footer state the new licence.

### 0.6.0 · 2026-11-11

**New**
- **Role in the cell**: a gene page now has a card from the **Gene Ontology** (via QuickGO, EMBL-EBI, CC BY 4.0) listing the best-documented terms: which processes the gene takes part in, what it does at the molecular level, where it sits in the cell. Only experimental or curated evidence is kept, overly generic terms ("protein binding") are dropped, and each term links to its QuickGO page. Examples: CFTR (chloride transport, chloride channel, apical membrane), BRCA1 (double-strand break repair), TP53.
- The counter now reads **25 public databases** (home page, share preview and images).

### 0.5.0 · 2026-11-11

**New**
- **Frequency in other projects**: a variant page now has a card showing the allele frequency in up to 21 population projects, grouped by region: world (1000 Genomes, HapMap, SGDP, HGDP, NCBI PopFreq), North America (TOPMed, PAGE, GO-ESP), Europe (ALSPAC, TwinsUK, GoNL, GenomeDK, FINRISK, Estonia, Northern Sweden, Spain), Asia and Middle East (Korea1K, KoVariome, ToMMo, Vietnam, Siberia, Qatar). Figures are those published by dbSNP (public domain), with no extra request. Frequencies only, never individual-level data.
- Credits, licences and README updated.

### 0.4.1 · 2026-11-11

**New**
- **Help for mutation notation**: typing `c.68_69del`, `p.Cys61Gly`, `chr17:43094000` or a transcript now explains that this notation is not understood yet and what to type instead. If the gene name is in the input (`BRCA1 c.68_69del`), the gene page is offered.
- **Reminder on variant pages**: "Public page for this variant: it describes what the databases say, and nothing about your personal situation."
- **Privacy**: the About page says not to enter personal data or test results.

### 0.4.0 · 2026-11-11

**New**
- **Cancers linked to a gene**: a gene page now groups the associated cancers by organ (breast, ovary, colon…), with the strength of the link and a "hereditary form" note, without generic terms such as "cancer" or "neoplasm". Each organ opens its body area in Explore.
- **General search words**: for "cancer", "tumour", "carcinoma"…, diseases come before genes, with a shortcut to cancers by body area.
- **A visible Favourite button** ("☆ Favourite") with a confirmation message, replacing an ambiguous star.
- **Each tab remembers its page**: open a page in Explore, switch to Favourites, come back to the same page.
- **Computer layout**: side rail, search panel with recent pages and favourites on the left, page on the right in two columns.
- **About page**: creator, contact, medical notice, privacy, credits and data versions, legal notice.
- **New icon** for every system (Android, iPhone, Windows, Mac, Linux), share preview image, light or dark theme, subtle or colourful Explore tiles.

**Fixed**
- The home-page helix stretched on a wide window.
- The 3D view said "no response" after a site update: the app now reloads itself, once.
- Security: malformed links, identifiers checked before entering a request, external addresses checked, content security policy, app-specific cache and settings.

**Known**
- Search does not yet understand mutation notation (`c.68_69del`): search for the gene or the rs number.
- Some database texts are in English (marked EN).

### 0.3.0 · 2026-11-11

First release: gene, variant and disease pages from 24 public databases, Explore (gene families, rare diseases, cancers by body area), search with gene-name completion, favourites, sharing, French and English, offline Explore.
