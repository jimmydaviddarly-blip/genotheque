// Langue de l'interface. Le texte français sert de clé : t('Gènes liés') renvoie « Gènes liés » en français
// et sa traduction de i18n-en.js en anglais. Les variables s'écrivent {nom} : t('{n} gènes', { n }).
// `npm run i18n` liste les textes encore sans traduction.
import { EN } from './i18n-en.js';

const KEY = 'genotheque-langue';

function detect() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* stockage indisponible */ }
  return /^fr\b/i.test(navigator.language || 'fr') ? 'fr' : 'en';
}

let lang = detect();
document.documentElement.lang = lang;

export const getLang = () => lang;
export const isEn = () => lang === 'en';
export const locale = () => (lang === 'en' ? 'en-GB' : 'fr-FR');
// Le nom de l'appli perd ses accents en anglais.
export const appName = () => (lang === 'en' ? 'Genotheque' : 'Génothèque');

export function setLang(l) {
  lang = l === 'en' ? 'en' : 'fr';
  document.documentElement.lang = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* préférence perdue à la fermeture */ }
}

const missing = new Set();
export function t(fr, vars) {
  let s = fr;
  if (lang === 'en') {
    s = EN[fr];
    if (s === undefined) {
      s = fr;
      if (import.meta.env?.DEV && !missing.has(fr) && /[àâçéèêëîïôûùüœ]|\s/i.test(fr)) { missing.add(fr); console.warn('[i18n] sans traduction :', fr); }
    }
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  // Typographie française : espace fine insécable avant « ; ? ! % », insécable avant « : », dans les guillemets.
  return lang === 'fr' ? s.replace(/ ([;?!%])/g, ' $1').replace(/ :/g, ' :').replace(/« /g, '« ').replace(/ »/g, ' »') : s;
}

// Choix entre deux formes selon le nombre : plural(3, 'autre', 'autres') passe aussi par t().
export const plural = (n, one, many) => t(n > 1 ? many : one);

// Texte chiffré au singulier ou au pluriel : tn(n, '{n} gène', '{n} gènes', { … }). 0 et 1 prennent le singulier.
export const tn = (n, one, many, vars = {}) => t(n > 1 ? many : one, { n, ...vars });

// Pourcentage : « 15,7 % » en français (espace fine insécable), « 15.7% » en anglais.
export const pct = (text) => (lang === 'fr' ? `${text} %` : `${text}%`);

// Nombres et décimales au format de la langue.
export const nf = { format: (n, opts) => new Intl.NumberFormat(locale(), opts).format(n) };
