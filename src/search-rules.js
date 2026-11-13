// Règles de reconnaissance de ce que l'on tape dans la recherche. Dans un fichier à part, sans rien
// qui touche à la page, pour pouvoir les tester (tests/search-rules.test.js).

// Numéro de variant dbSNP : rs429358.
export const RS = /^rs\d+$/i;

// Notation d'une mutation : HGVS (c.68_69del, p.Cys61Gly, NM_007294.4:c.68_69del), coordonnées
// (chr17:43094000), transcrits et protéines (NM_, NP_, NC_, NG_, XM_, ENST, ENSP).
export const NOTATION = /(^|[\s:])[cgmnr]\.\s*[\d*_(-]|(^|[\s:])p\.\s*\(?[A-Za-z]{3}\d|chr[0-9xym]+:\d|^(NM|NP|NC|NG|XM)_\d|^ENS[TP]\d/i;

// Mots généraux : ils désignent une famille de maladies, pas un gène.
export const GENERAL_WORD = /^(cancers?|tum(eu|ou)rs?|carcinomes?|sarcomes?|leuc[ée]mies?|lymphomes?|neoplasms?|maladies?|syndromes?|diseases?|disorders?)$/i;

// Parmi eux, ceux qui parlent de cancer : on propose alors les cancers par zone du corps.
export const CANCER_WORD = /^(cancers?|tum(eu|ou)rs?|carcinomes?|sarcomes?|leuc[ée]mies?|lymphomes?|neoplasms?)$/i;
