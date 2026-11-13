import * as api from './api.js';
import { suggest as suggestGenesLocal, preloadDictionary, completion } from './dictionary.js';
import { drugKey } from './drugkey.js';
import { POPULATIONS, significance, GENE_TYPES, EFFECTS, VAR_TYPES, HELP, DISCLAIMER, stageLabel, trialPhase, reviewStars, scoreReading, byOrgan, tpmLevel, HPO_CATEGORIES, symptomFrequency, CLINGEN_CLASS, MOI } from './texts.js';
import { groupCancers, isGenericDisease, strengthOf } from './cancers.js';
import { cohortFrequencies, bestAllele } from './cohorts.js';
import { RS, NOTATION, GENERAL_WORD, CANCER_WORD } from './search-rules.js';
import { t, tn, pct, plural, nf, locale, isEn, setLang, appName } from './i18n.js';
import { getTheme, getLook, setTheme, setLook, isDark } from './prefs.js';

// Tout ce qui vient d'une API passe par esc() avant d'entrer dans le HTML.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export { nf };


// ---------- Favoris (dans le téléphone) ----------

// Clé préfixée (adresse partagée avec les autres projets du compte) ; l'ancienne clé est reprise une fois.
const FAV_KEY = 'genotheque-favoris';
try {
  const old = localStorage.getItem('genes-favoris');
  if (old !== null && localStorage.getItem(FAV_KEY) === null) localStorage.setItem(FAV_KEY, old);
  localStorage.removeItem('genes-favoris');
} catch { /* stockage indisponible */ }
// Les favoris viennent du stockage du téléphone : on ne garde que des entrées bien formées.
const FAV_KINDS = ['gene', 'variant', 'maladie', 'orpha'];
function readFavs(key = FAV_KEY) {
  try {
    const list = JSON.parse(localStorage.getItem(key));
    return Array.isArray(list) ? list.filter((f) => f && typeof f.id === 'string' && typeof f.label === 'string' && FAV_KINDS.includes(f.kind)) : [];
  } catch {
    return [];
  }
}
function writeFavs(list) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch { /* stockage indisponible : favoris perdus à la fermeture */ }
}
const isFav = (kind, id) => readFavs().some((f) => f.kind === kind && f.id === id);
function toggleFav(item) {
  const list = readFavs();
  const i = list.findIndex((f) => f.kind === item.kind && f.id === item.id);
  if (i >= 0) list.splice(i, 1); else list.unshift(item);
  writeFavs(list);
  window.dispatchEvent(new Event('listschange'));
  return i < 0;
}

// Fiches consultées récemment (panneau latéral du grand écran), les huit dernières.
const RECENT_KEY = 'genotheque-recents';
function remember(item) {
  const list = readFavs(RECENT_KEY).filter((f) => !(f.kind === item.kind && f.id === item.id));
  list.unshift(item);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8))); } catch { /* stockage indisponible */ }
  window.dispatchEvent(new Event('listschange'));
}

// ---------- Briques communes ----------

export const LOADING = '<div class="loading"><span></span><span></span><span></span></div>';
export const unavailable = (src) => `<p class="muted">${esc(t('{src} : pas de réponse pour l\'instant. Réessayez plus tard.', { src }))}</p>`;

export function section(id, title, help, source) {
  return `<section class="card">
    <header class="card-head"><h2>${t(title)}</h2>${help ? `<button class="help-btn" aria-label="${t('Explication')}" data-help="${id}">?</button>` : ''}</header>
    ${help ? `<p class="help" id="help-${id}" hidden>${esc(t(help))}</p>` : ''}
    <div id="${id}">${LOADING}</div>
    ${source ? `<p class="source">${t('Source :')} ${t(source)}</p>` : ''}
  </section>`;
}

// Chaque affichage reçoit un numéro : une réponse lente d'une page quittée ne doit pas écrire dans la suivante.
let seq = 0;
export const begin = () => ++seq;
export const stale = (my) => my !== seq;

function fill(id, html, my = seq) {
  const el = document.getElementById(id);
  if (el && !stale(my)) el.innerHTML = html;
}

async function load(id, src, promise, render, my) {
  try {
    const data = await promise;
    fill(id, render(data), my);
  } catch (err) {
    console.warn(src, err);
    fill(id, unavailable(src), my);
  }
}

export const shareButton = (title) => `<button class="share" aria-label="${t('Partager')}" data-share="${esc(title)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg></button>`;

// Menu de partage du téléphone ; sinon le lien est copié. Le menu de partage et le
// presse-papiers moderne exigent HTTPS : en HTTP (essai sur le Wi-Fi), on copie à l'ancienne.
async function share(title) {
  const data = { title: `${title} · ${appName()}`, text: t('{title}, dans {app}', { title, app: appName() }), url: location.href };
  if (navigator.share) {
    try { await navigator.share(data); } catch { /* partage annulé */ }
    return;
  }
  try {
    await navigator.clipboard.writeText(location.href);
    toast(t('Lien copié'));
    return;
  } catch { /* contexte non sécurisé ou permission refusée */ }
  const area = document.createElement('textarea');
  area.value = location.href;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;opacity:0;top:0';
  document.body.append(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  toast(ok ? t('Lien copié') : t('Copie impossible : utilisez l\'adresse de la page'));
}

// Étoile contour quand la fiche n'est pas gardée, pleine quand elle l'est (remplissage par CSS).
const STAR_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>';

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}

export function pageHead({ kind, id, label, title, subtitle }) {
  const on = isFav(kind, id);
  remember({ kind, id, label: title, sub: subtitle || '' });
  return `<div class="page-head">
    <button class="back" aria-label="${t('Retour')}" data-back>‹</button>
    <div class="titles"><p class="kicker">${esc(t(label))}</p><h1>${esc(title)}</h1>${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ''}</div>
    ${shareButton(title)}
    <button class="fav ${on ? 'on' : ''}" aria-pressed="${on}" title="${t('Ajouter aux favoris')}" data-fav='${esc(JSON.stringify({ kind, id, label: title, sub: subtitle || '' }))}'>${STAR_ICON}<span>${t('Favori')}</span></button>
  </div>
  <p class="disclaimer">${esc(t(DISCLAIMER))}</p>`;
}

// Adresse externe sûre : https uniquement, et sur l'hôte attendu. Renvoie l'adresse ou ''.
export function safeUrl(u, host) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && host.test(url.hostname) ? url.href : '';
  } catch {
    return '';
  }
}

export const links = (items) => `<ul class="links">${items.filter(([, url]) => url).map(([name, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(t(name))} ↗</a></li>`).join('')}</ul>`;

// Repère « EN » sur un texte laissé en anglais ; inutile quand toute l'interface est en anglais.
export const enNoteHtml = () => (isEn() ? '' : `<span class="lang" title="${t('Texte original de la base, en anglais')}">EN</span>`);

function scoreList(rows, hrefOf, labelOf, subOf) {
  if (!rows.length) return `<p class="muted">${t('Aucune association connue.')}</p>`;
  return `<ol class="scores">${rows.map((r) => `<li><a href="${hrefOf(r)}">
      <span class="s-main"><strong>${esc(labelOf(r))}</strong>${subOf ? `<small>${esc(subOf(r))}</small>` : ''}</span>
      <span class="bar"><i style="width:${Math.round((Number(r.score) || 0) * 100)}%"></i></span><span class="num">${(Number(r.score) || 0).toFixed(2)}</span>
    </a></li>`).join('')}</ol>`;
}

function parentOf(hash) {
  const [kind, cid] = hash.replace(/^#\/?/, '').split('/');
  if (kind === 'orpha' || (kind === 'rares' && cid)) return '#/rares';
  if (['famille', 'rares', 'cancers'].includes(kind)) return '#/explorer';
  if (kind === 'aide' || kind === 'apropos') return '#/sources';
  return '#/';
}

export function bindCommon(root) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-help],[data-fav],[data-back],[data-share],[data-af],[data-lang],[data-theme-set],[data-look-set]');
    if (!el) return;
    if (el.dataset.themeSet || el.dataset.lookSet) {
      // Le bouton de l'accueil bascule entre clair et sombre ; ceux de Sources donnent aussi « Automatique ».
      if (el.dataset.themeSet === 'toggle') setTheme(isDark() ? 'light' : 'dark');
      else if (el.dataset.themeSet) setTheme(el.dataset.themeSet);
      else setLook(el.dataset.lookSet);
      // Les styles suivent seuls ; il reste à marquer le bouton choisi, sans redessiner la page.
      document.querySelectorAll('[data-theme-set]:not([data-theme-set="toggle"])').forEach((b) => pressed(b, b.dataset.themeSet === getTheme()));
      document.querySelectorAll('[data-look-set]').forEach((b) => pressed(b, b.dataset.lookSet === getLook()));
    } else if (el.dataset.lang) {
      // main.js redessine la page et les onglets dans la nouvelle langue.
      setLang(el.dataset.lang);
      window.dispatchEvent(new Event('langchange'));
    } else if (el.dataset.af) {
      show3d(el);
    } else if (el.dataset.share) {
      share(el.dataset.share);
    } else if (el.dataset.help) {
      const h = document.getElementById(`help-${el.dataset.help}`);
      if (h) h.hidden = !h.hidden;
    } else if (el.dataset.fav) {
      const on = toggleFav(JSON.parse(el.dataset.fav));
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', on);
      toast(on ? t('Ajouté aux favoris') : t('Retiré des favoris'));
    } else if ('back' in el.dataset) {
      // Arrivé par un lien partagé (LinkedIn, message…), « Retour » mène à la page parente
      // au lieu de quitter l'appli.
      if (history.state?.inApp) history.back();
      else location.hash = parentOf(location.hash);
    }
  });
}

// ---------- Recherche ----------

const EXAMPLES = [
  ['#/gene/BRCA1', 'BRCA1', 'gène'],
  ['#/gene/CFTR', 'CFTR', 'gène'],
  ['#/variant/rs429358', 'rs429358', 'variant'],
  ['#/variant/rs334', 'rs334', 'variant'],
  ['#/maladie/MONDO_0009061', 'Mucoviscidose', 'maladie'],
  ['#/maladie/MONDO_0004975', 'Maladie d\'Alzheimer', 'maladie'],
];
const SEARCH_HINT = 'BRCA1, rs429358, mucoviscidose…';

let lastQuery = '';

// Lune en clair, soleil en sombre (l'icône affichée est choisie par looks.css).
const THEME_ICON = `<svg class="ic-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>
  <svg class="ic-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>`;

// Nombre de bases distinctes de la page Sources (MyGene.info et MyVariant.info, simples relais, ne comptent pas).
const BASES = 25;

// Chiffres clés : comptés dans les données embarquées par `npm run data` (public/data/chiffres.json).
function figuresHtml(f) {
  const items = [
    [BASES, t('bases publiques consultées'), '#/sources'],
    [f.genes, t('gènes humains nommés (HGNC)'), '#/explorer'],
    [f.rares, t('maladies rares (Orphanet)'), '#/rares'],
    [f.symptoms, t('symptômes traduits (HPO)'), ''],
    [f.clingen, t('liens gène-maladie évalués (ClinGen)'), ''],
    [f.drugs, t('substances reliées aux médicaments français'), ''],
  ];
  return `<p class="kicker">${t('En chiffres')}</p><div class="figures">${items.map(([n, l, h]) => {
    const inner = `<strong>${nf.format(n)}</strong><small>${l}</small>`;
    return h ? `<a class="figure" href="${h}">${inner}</a>` : `<div class="figure">${inner}</div>`;
  }).join('')}</div>`;
}

// Ce que contient chaque fiche, et d'où cela vient : pour savoir d'un coup d'œil ce qu'on peut y trouver.
const GUIDE = [
  ['gène', '#/gene/ERBB2', 'ERBB2', [
    ['Identité et position', 'NCBI, Ensembl, HGNC'],
    ['Protéine, fonction et structure 3D', 'UniProt, AlphaFold'],
    ['Activité dans 54 tissus', 'GTEx'],
    ['Partenaires et voies biologiques', 'STRING, Reactome'],
    ['Variants classés par signification', 'ClinVar'],
    ['Maladies liées, avis d\'experts', 'Open Targets, ClinGen'],
    ['Médicaments qui le ciblent, marques en France', 'ChEMBL, BDPM'],
    ['Effet sur les médicaments', 'CPIC'],
  ]],
  ['variant', '#/variant/rs1801133', 'rs1801133', [
    ['Fréquence dans neuf populations', 'gnomAD v4'],
    ['Interprétations et niveau de revue', 'ClinVar'],
    ['Scores prédictifs', 'AlphaMissense, REVEL, CADD'],
    ['Associations avec des traits, p-valeur et article', 'GWAS Catalog'],
  ]],
  ['maladie', '#/maladie/MONDO_0009061', 'Mucoviscidose', [
    ['Résumé et nom français', 'Wikipédia, Wikidata'],
    ['Symptômes par fréquence', 'HPO'],
    ['Gènes en cause, avis d\'experts', 'ClinGen, Open Targets'],
    ['Médicaments et essais cliniques, dont en France', 'ChEMBL, ClinicalTrials.gov'],
  ]],
];
// Trois volets fermés : l'accueil reste léger, le détail est à un toucher.
const findGuide = () => `<section class="card guide"><h2>${t('Ce que vous trouverez')}</h2>
    ${GUIDE.map(([kind, href, ex, rows]) => `<details class="guide-block">
      <summary><strong>${t(`Fiche ${kind}`)}</strong><small>${tn(rows.length, '{n} rubrique', '{n} rubriques', { n: rows.length })}</small></summary>
      <ul>${rows.map(([what, src]) => `<li>${t(what)}<small>${esc(src)}</small></li>`).join('')}</ul>
      <a class="guide-ex" href="${href}">${t('exemple :')} ${esc(t(ex))} ›</a></details>`).join('')}
    <p class="muted small">${t('Recherche par symbole ou autre nom de gène, par rsID (rs429358) ou par nom de maladie, en français ou en anglais. Chaque carte renvoie vers la base d\'origine et chaque fiche a un lien partageable. Les données sont lues en direct : elles sont à jour, mais une base en panne laisse sa carte vide.')}</p>
  </section>`;

// Hélice d'ADN de l'accueil : deux brins sinusoïdaux et des barreaux décalés dans le temps,
// ce qui donne l'impression d'une hélice qui tourne en avançant (animations dans motion.css).
function helixSvg() {
  // Dessinée à taille fixe et assez large pour la colonne la plus large (1 120 px) plus un tour de défilement :
  // le cadre .helix-wrap la rogne, sans jamais l'étirer.
  const W = 1360, H = 56, mid = H / 2, amp = 20, period = 80;
  const wave = (sign) => Array.from({ length: W / 4 + 1 }, (_, k) => {
    const x = k * 4;
    return `${k ? 'L' : 'M'}${x} ${(mid + sign * amp * Math.sin((2 * Math.PI * x) / period)).toFixed(1)}`;
  }).join('');
  const rungs = Array.from({ length: W / 10 }, (_, k) => {
    const x = k * 10 + 5;
    const dy = amp * Math.sin((2 * Math.PI * x) / period);
    return `<line class="rung" x1="${x}" x2="${x}" y1="${(mid - Math.abs(dy)).toFixed(1)}" y2="${(mid + Math.abs(dy)).toFixed(1)}" style="animation-delay:${(-(x / period) * 4.8).toFixed(2)}s"/>`;
  }).join('');
  return `<div class="helix-wrap" aria-hidden="true"><svg class="helix" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <g class="flow">${rungs}<path class="strand s1" d="${wave(1)}"/><path class="strand s2" d="${wave(-1)}"/></g></svg></div>`;
}

// Champ de recherche avec complétion et résultats : sert à l'accueil et au panneau latéral du grand écran.
export const searchBox = (value = '') => `<label class="search"><span class="sr">${t('Rechercher')}</span>
      <input class="q" type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(t(SEARCH_HINT))}" value="${esc(value)}">
      <span class="ghost" aria-hidden="true"></span>
      <button type="button" class="complete" hidden></button>
    </label>`;

// Relie le champ de `root` à sa zone de résultats (.q-results). onQuery(q) est appelé à chaque recherche.
export function bindSearch(root, onQuery = () => {}) {
  const input = root.querySelector('.q');
  const box = root.querySelector('.q-results');
  let timer = 0;
  let token = 0;
  const run = async () => {
    const q = input.value.trim();
    const my = ++token;
    onQuery(q);
    if (q.length < 2) { box.innerHTML = ''; return; }
    if (RS.test(q)) {
      box.innerHTML = `<p class="kicker">${t('Variant')}</p><ul class="hits"><li><a href="#/variant/${esc(q.toLowerCase())}"><strong>${esc(q.toLowerCase())}</strong><small>${t('Ouvrir la fiche du variant')}</small></a></li></ul>`;
      return;
    }
    // Notation d'une mutation (c.68_69del, p.Cys61Gly, chr17:43094000…) : pas encore comprise, on le dit
    // et on dit quoi taper à la place, au lieu d'un « aucun résultat » muet.
    if (NOTATION.test(q)) {
      box.innerHTML = `<div class="notation-help"><p class="kicker">${t('Notation d\'une mutation')}</p>
        <p>${t('Cette notation (par exemple c.68_69del ou p.Cys61Gly) n\'est pas encore comprise par la recherche. Pour retrouver le variant :')}</p>
        <ul><li>${t('cherchez le nom du gène, par exemple BRCA1, puis ouvrez la liste de ses variants classés sur sa fiche ;')}</li>
        <li>${t('ou tapez son numéro rs (par exemple rs80357906), qu\'on trouve dans ClinVar ou dbSNP.')}</li></ul>
        <div class="notation-gene"></div>
        <p class="muted small">${t('Ne saisissez pas de données personnelles : ce que vous tapez est envoyé aux bases publiques.')}</p></div>`;
      // Si le nom du gène est dans la saisie (« BRCA1 c.68_69del »), on propose sa fiche.
      const word = q.match(/(?:^|[\s:])([A-Za-z][A-Za-z0-9-]{1,9})(?=[:\s]|$)/)?.[1];
      if (word) {
        suggestGenesLocal(word).then((g) => {
          const hit = g.find((x) => !x.typo && x.symbol === word.toUpperCase());
          const slot = box.querySelector('.notation-gene');
          if (hit && my === token && slot) slot.innerHTML = `<a class="open-fiche" href="#/gene/${encodeURIComponent(hit.symbol)}">${esc(t('Ouvrir la fiche du gène {symbol}', { symbol: hit.symbol }))} ›</a>`;
        }).catch(() => {});
      }
      return;
    }
    // Pour un mot général (« cancer », « tumeur »), les gènes trouvés ont seulement ce mot dans leur nom (« cancer antigen 1 ») :
    // les maladies passent donc devant, et la liste de gènes le dit.
    const general = GENERAL_WORD.test(q);
    const genes = `<div class="r-genes"><p class="kicker">${t('Gènes')}</p>${LOADING}</div>`;
    const diseases = `<div class="r-dis"><p class="kicker">${t('Maladies')}</p>${LOADING}</div>`;
    // Pour un mot de cancer, un raccourci vers les cancers classés par zone du corps.
    const toBody = general && CANCER_WORD.test(q) ? `<a class="open-fiche" href="#/cancers">${t('Explorer les cancers par zone du corps')} ›</a>` : '';
    box.innerHTML = toBody + (general ? diseases + genes : genes + diseases);
    const list = (items, href, empty) => (items.length
      ? `<ul class="hits">${items.map((x) => `<li><a href="${href(x)}"><strong>${esc(x.title)}</strong>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</a></li>`).join('')}</ul>`
      : `<p class="muted">${empty}</p>`);
    // Une réponse plus ancienne que la dernière frappe est ignorée.
    const put = (cls, kicker, html) => { if (my === token) { const el = box.querySelector(cls); if (el) el.innerHTML = `<p class="kicker">${kicker}</p>${html}`; } };
    // Le dictionnaire embarqué répond sans réseau et reconnaît autres noms et fautes de frappe ;
    // s'il n'a pas pu être chargé, on interroge MyGene.info.
    const geneSub = (x) => [x.via && `${x.typo ? t('proche de') : t('autre nom :')} ${x.via}`, !x.via && x.typo && t('orthographe proche'), x.name].filter(Boolean).join(' · ');
    const geneHtml = (g) => list(g.map((x) => ({ ...x, title: x.symbol, sub: geneSub(x) })), (x) => `#/gene/${encodeURIComponent(x.symbol)}`, t('Aucun gène trouvé.'));
    suggestGenesLocal(q)
      .then((g) => put('.r-genes', general ? t('Gènes dont le nom contient ce mot') : g.some((x) => x.typo) && !g.some((x) => !x.typo) ? t('Gènes · Vouliez-vous dire ?') : t('Gènes'), geneHtml(g)))
      .catch(() => api.suggestGenes(q)
        .then((g) => put('.r-genes', t('Gènes'), geneHtml(g)))
        .catch(() => put('.r-genes', t('Gènes'), unavailable('MyGene.info'))));
    api.suggestDiseases(q)
      .then((d) => put('.r-dis', t('Maladies'), list(d.map((x) => ({ ...x, title: x.name, sub: x.detail })), (x) => `#/maladie/${encodeURIComponent(x.id)}`, t('Aucune maladie trouvée.'))))
      .catch(() => put('.r-dis', t('Maladies'), unavailable(t('Wikidata et Open Targets'))));
  };
  // Complétion dans le champ : la fin du nom de gène s'affiche en gris après le curseur.
  // Tab, flèche droite ou le bouton à droite du champ l'acceptent.
  const ghost = root.querySelector('.ghost');
  const done = root.querySelector('.complete');
  let proposal = null;
  const showGhost = () => {
    const typed = input.value;
    proposal = input.selectionEnd === typed.length ? completion(typed) : null;
    if (proposal && input.scrollWidth > input.clientWidth) proposal = null;
    ghost.innerHTML = proposal ? `<span class="typed">${esc(typed)}</span>${esc(proposal.slice(typed.trim().length))}` : '';
    done.hidden = !proposal;
    if (proposal) {
      done.textContent = `${proposal} ›`;
      done.setAttribute('aria-label', t('Compléter avec {name}', { name: proposal }));
    }
  };
  const accept = () => {
    if (!proposal) return false;
    input.value = proposal;
    proposal = null;
    showGhost();
    clearTimeout(timer);
    run();
    input.focus();
    return true;
  };
  done.addEventListener('click', accept);
  input.addEventListener('focus', () => preloadDictionary().then(showGhost), { once: true });
  input.addEventListener('input', () => { showGhost(); clearTimeout(timer); timer = setTimeout(run, 320); });
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== done) { ghost.innerHTML = ''; done.hidden = true; } }, 150));
  input.addEventListener('keydown', (e) => {
    if ((e.key === 'Tab' || e.key === 'ArrowRight') && proposal && input.selectionEnd === input.value.length) {
      if (accept()) e.preventDefault();
    } else if (e.key === 'Enter') {
      const first = box.querySelector('a');
      if (first) location.hash = first.getAttribute('href');
    }
  });
  if (input.value.trim()) run();
  return input;
}

// Sur grand écran, la recherche vit dans le panneau latéral : l'accueil n'affiche que la présentation.
const wide = () => matchMedia('(min-width: 900px)').matches;

export function renderSearch(app) {
  begin();
  app.innerHTML = `<div class="search-page">
    <div class="brand-row"><h1 class="brand">${appName()}</h1>
      <button class="theme-btn" data-theme-set="toggle" aria-label="${t('Mode clair ou sombre')}" title="${t('Mode clair ou sombre')}">${THEME_ICON}</button>
      <button class="theme-btn lang-chip" data-lang="${isEn() ? 'fr' : 'en'}" aria-label="${isEn() ? 'Français' : 'English'}" title="${isEn() ? 'Français' : 'English'}">${isEn() ? 'FR' : 'EN'}</button>
      <a class="help-link help-q" href="#/aide" aria-label="${t('Aide')}" title="${t('Aide')}">?</a></div>
    ${helixSvg()}
    <p class="lede">${t('Gènes, variants et maladies, d\'après les grandes bases publiques de génétique humaine.')}</p>
    <div class="home-search">${searchBox(lastQuery)}</div>
    <p class="trust">${t('Gratuit, sans compte ni publicité, données lues en direct dans les bases publiques. Information, pas avis médical.')}</p>
    <div class="q-results"></div>
    <div class="examples">
      <p class="kicker">${t('Exemples')}</p>
      <div class="chips">${EXAMPLES.map(([h, l, k]) => `<a class="chip" href="${h}">${esc(t(l))} <small>${t(k)}</small></a>`).join('')}</div>
      <div id="figures"></div>
      ${findGuide()}
    </div>
  </div>`;
  api.figures().then((f) => fill('figures', figuresHtml(f), seq)).catch(() => {});
  const examples = app.querySelector('.examples');
  const input = bindSearch(app.querySelector('.search-page'), (q) => { lastQuery = q; examples.hidden = q.length > 0; });
  if (!lastQuery && !wide()) input.focus();
}

// ---------- Fiche gène ----------

export async function renderGene(app, symbol) {
  const my = begin();
  app.innerHTML = LOADING;
  let g;
  try {
    g = await api.gene(symbol);
  } catch {
    if (stale(my)) return;
    app.innerHTML = `<div class="page">${unavailable('MyGene.info')}</div>`;
    return;
  }
  if (stale(my)) return;
  if (!g) {
    app.innerHTML = `<div class="page"><p class="muted">${esc(t('Aucun gène humain nommé « {name} ».', { name: symbol }))}</p><a href="#/">${t('Retour à la recherche')}</a></div>`;
    return;
  }
  const where = g.pos ? t('Chromosome {chr}, de {start} à {end} ({kb} kb)', { chr: g.pos.chr, start: nf.format(g.pos.start), end: nf.format(g.pos.end), kb: nf.format(Math.round((g.pos.end - g.pos.start) / 1000)) }) : '';
  app.innerHTML = `<div class="page">
    ${pageHead({ kind: 'gene', id: g.symbol, label: 'Gène', title: g.symbol, subtitle: g.name })}
    <section class="card">
      <header class="card-head"><h2>${t('En bref')}</h2><button class="help-btn" aria-label="${t('Explication')}" data-help="gene">?</button></header>
      <p class="help" id="help-gene" hidden>${esc(t(HELP.gene))}</p>
      <dl class="facts">
        ${where ? `<dt>${t('Position')}</dt><dd>${esc(where)}</dd>` : ''}
        ${g.type ? `<dt>${t('Type')}</dt><dd>${esc(GENE_TYPES[g.type] ? t(GENE_TYPES[g.type]) : g.type)}</dd>` : ''}
        ${g.aliases.length ? `<dt>${t('Autres noms')}</dt><dd>${esc(g.aliases.slice(0, 8).join(', '))}</dd>` : ''}
      </dl>
      ${g.summary ? `<p class="prose">${enNoteHtml()} ${esc(g.summary)}</p>` : ''}
      <p class="source">${t('Source :')} NCBI Gene, ${t('via')} MyGene.info</p>
    </section>
    ${section('g-wiki', isEn() ? 'En résumé' : 'En français', '', 'Wikipédia')}
    ${section('g-prot', 'Protéine', '', 'UniProt')}
    ${section('g-go', 'Rôle dans la cellule', HELP.go, 'Gene Ontology, via QuickGO (EMBL-EBI, CC BY 4.0)')}
    ${g.uniprot ? section('g-3d', 'La protéine en 3D', HELP.alphafold, 'AlphaFold (EMBL-EBI et Google DeepMind), licence CC BY 4.0') : ''}
    ${section('g-net', 'Partenaires de la protéine', HELP.string, 'STRING (licence CC BY 4.0)')}
    ${g.uniprot ? section('g-path', 'Voies biologiques', HELP.reactome, 'Reactome (domaine public CC0)') : ''}
    ${section('g-tissue', 'Où le gène est actif', HELP.tissues, 'GTEx v8 (Broad Institute)')}
    ${section('g-clin','Variants classés', HELP.clinvar, 'ClinVar (NCBI)')}
    ${section('g-cg', 'Maladies évaluées par des experts', HELP.clingen, 'ClinGen (domaine public CC0)')}
    ${section('g-cancers', 'Cancers liés à ce gène', HELP.cancers, 'Open Targets Platform (score d\'association de 0 à 1)')}
    ${section('g-dis', 'Maladies associées', HELP.diseases, 'Open Targets Platform')}
    ${section('g-drugs', 'Médicaments', HELP.drugsGene, 'Open Targets Platform (ChEMBL) ; noms français : base de données publique des médicaments')}
    ${section('g-pgx', 'Gène et effet des médicaments', HELP.pgx, 'CPIC (cpicpgx.org), domaine public CC0')}
    <section class="card"><header class="card-head"><h2>${t('Aller plus loin')}</h2></header>
      ${links([
        ['NCBI Gene', g.entrez && `https://www.ncbi.nlm.nih.gov/gene/${encodeURIComponent(g.entrez)}`],
        ['Ensembl', g.ensembl && `https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${encodeURIComponent(g.ensembl)}`],
        ['ClinVar', `https://www.ncbi.nlm.nih.gov/clinvar/?term=${encodeURIComponent(g.symbol + '[gene]')}`],
        ['gnomAD', g.ensembl && `https://gnomad.broadinstitute.org/gene/${encodeURIComponent(g.ensembl)}?dataset=gnomad_r4`],
        ['UniProt', g.uniprot && `https://www.uniprot.org/uniprotkb/${encodeURIComponent(g.uniprot)}`],
        ['Open Targets', g.ensembl && `https://platform.opentargets.org/target/${encodeURIComponent(g.ensembl)}`],
        ['OMIM', g.mim && `https://omim.org/entry/${encodeURIComponent(g.mim)}`],
      ])}
    </section>
  </div>`;

  load('g-prot', 'UniProt', api.protein(g.symbol), (p) => (p
    ? `<dl class="facts"><dt>${t('Nom')}</dt><dd>${esc(p.name)}</dd>${p.length ? `<dt>${t('Taille')}</dt><dd>${t('{n} acides aminés', { n: nf.format(p.length) })}</dd>` : ''}</dl>${p.func ? `<p class="prose">${enNoteHtml()} ${esc(p.func)}</p>` : ''}`
    : `<p class="muted">${t('Pas de protéine vérifiée pour ce gène.')}</p>`), my);

  loadOptional('g-go', g.uniprot ? api.geneOntology(g.uniprot) : Promise.resolve(null), goBlock, my);

  load('g-clin', 'ClinVar', api.clinvarCounts(g.symbol), (c) => {
    const rows = [
      ['Pathogènes', c.pathogenic, 'bad'],
      ['Probablement pathogènes', c.likely_pathogenic, 'bad'],
      ['Signification incertaine', c.uncertain, 'mixed'],
      ['Probablement bénins', c.likely_benign, 'good'],
      ['Bénins', c.benign, 'good'],
    ];
    const max = Math.max(1, ...rows.map((r) => r[1]));
    return `<ul class="counts">${rows.map(([l, n, tone]) => `<li><span>${t(l)}</span><span class="bar ${tone}"><i style="width:${(n / max) * 100}%"></i></span><span class="num">${nf.format(n)}</span></li>`).join('')}</ul>`;
  }, my);

  load('g-tissue', 'GTEx', api.tissueExpression(g.symbol), tissueBlock, my);
  loadOptional('g-wiki', api.geneWiki(g.entrez), wikiBlock, my);
  loadOptional('g-pgx', Promise.all([api.cpic(), api.bdpm().catch(() => null)]), ([c, fr]) => pgxBlock(c, g.symbol, fr), my);
  if (g.uniprot) load('g-3d', 'AlphaFold', api.alphafold(g.uniprot), protein3dBlock, my);
  loadOptional('g-net', api.partners(g.symbol), (p) => partnersBlock(p, g.symbol), my);
  if (g.uniprot) loadOptional('g-path', api.pathways(g.uniprot), pathwaysBlock, my);
  loadOptional('g-cg', api.clingen().then(async (c) => {
    const named = await api.withFrenchDiseaseNames({ rows: clingenRows(c, c.byGene[g.symbol]) });
    return [named.rows, c];
  }), ([rows, c]) => clingenBlock(rows, 'gene', c), my);

  if (g.ensembl) {
    loadOptional('g-cancers', api.geneCancers(g.ensembl).then(async (rows) => {
      // Noms français pour les cancers retenus seulement (une requête Wikidata de taille raisonnable).
      const keep = rows.filter((r) => !isGenericDisease(r.name) && r.score >= 0.4 && !/\bbenign\b/i.test(r.name)).slice(0, 40);
      const named = await api.withFrenchDiseaseNames({ rows: keep });
      return groupCancers(named.rows);
    }), cancersBlock, my);
    load('g-dis', 'Open Targets', api.geneDiseases(g.ensembl).then(api.withFrenchDiseaseNames).then((d) => ({ ...d, rows: d.rows.filter((r) => !isGenericDisease(r.name)) })), (d) => scoreList(d.rows, (r) => `#/maladie/${encodeURIComponent(r.id)}`, (r) => r.label || r.name)
      + (d.count > d.rows.length ? `<p class="muted">${t('{total} maladies ou caractères au total. Les {n} plus liés sont affichés.', { total: nf.format(d.count), n: d.rows.length })}</p>` : ''), my);
    load('g-drugs', 'Open Targets', withFrenchDrugs(api.targetDrugs(g.ensembl)), drugList, my);
  } else {
    fill('g-dis', `<p class="muted">${t('Pas d\'identifiant Ensembl pour ce gène.')}</p>`, my);
    fill('g-drugs', `<p class="muted">${t('Pas d\'identifiant Ensembl pour ce gène.')}</p>`, my);
  }
}

// ---------- Expression dans les organes ----------

const TISSUES_SHOWN = 8;
const tpm = (v) => (v >= 10 ? nf.format(Math.round(v)) : nf.format(v, { maximumFractionDigits: 1 }));

function tissueSummary(organs) {
  const [a, b] = organs;
  const low = (o) => t(o.organ).toLowerCase();
  if (!a || a.tpm < 1) return t('Presque éteint dans tous les organes adultes analysés. Il peut servir à un autre moment de la vie, par exemple chez l\'embryon.');
  if (a.tpm >= 10 && (!b || a.tpm >= 5 * b.tpm)) return t('Actif presque uniquement dans un organe : {organ}.', { organ: low(a) });
  const active = organs.filter((o) => o.tpm >= 10);
  if (active.length >= organs.length * 0.8) return t('Actif dans presque tout le corps.');
  return t('Actif surtout dans : {organs}.', { organs: organs.slice(0, 3).map(low).join(', ') });
}

function tissueBlock(rows) {
  if (!rows?.length) return `<p class="muted">${t('GTEx n\'a pas mesuré ce gène.')}</p>`;
  const organs = byOrgan(rows);
  const max = Math.max(1e-9, organs[0]?.tpm || 0);
  const item = (o) => `<li><span>${esc(t(o.organ))}</span><span class="bar"><i style="width:${(o.tpm / max) * 100}%"></i></span><span class="num">${tpm(o.tpm)}</span></li>`;
  return `<p class="prose"><strong>${esc(tissueSummary(organs))}</strong></p>
    <p class="muted small">${t('Niveau maximal : {v} TPM ({level}).', { v: tpm(organs[0].tpm), level: t(tpmLevel(organs[0].tpm)) })}</p>
    <ul class="counts tissues">${organs.slice(0, TISSUES_SHOWN).map(item).join('')}</ul>`
    + (organs.length > TISSUES_SHOWN ? `<details class="more"><summary>${tn(organs.length - TISSUES_SHOWN, 'Voir l\'autre organe', 'Voir les {n} autres organes')}</summary><ul class="counts tissues">${organs.slice(TISSUES_SHOWN).map(item).join('')}</ul></details>` : '');
}

// ---------- Médicaments et essais (fiches gène et maladie) ----------

const DRUGS_SHOWN = 8;

// « Voir l'autre » ou « Voir les 5 autres » sous une liste repliée.
const seeMore = (n) => tn(n, 'Voir l\'autre', 'Voir les {n} autres', { n: nf.format(n) });

// Nombre de médicaments et part autorisée, accordés au singulier comme au pluriel.
function drugCount(n, approved) {
  if (n <= 1) return t(approved ? 'Un médicament, autorisé pour cette indication.' : 'Un médicament, pas encore autorisé pour cette indication.');
  if (!approved) return t('{n} médicaments, aucun autorisé pour cette indication.', { n: nf.format(n) });
  return tn(approved, '{n} médicaments, dont un autorisé pour cette indication.', '{n} médicaments, dont {a} autorisés pour cette indication.', { n: nf.format(n), a: nf.format(approved) });
}

// Joint à la liste d'Open Targets les noms de marque vendus en France (BDPM), si le fichier est disponible.
const withFrenchDrugs = (promise) => Promise.all([promise, api.bdpm().catch(() => null)])
  .then(([rows, fr]) => Object.assign(rows.map((r) => ({ ...r, france: fr?.subs[drugKey(r.name)] || null })), { frDate: fr?.date }));

const frDate = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(locale());

const BDPM_FICHE = 'https://base-donnees-publique.medicaments.gouv.fr/extrait.php?specid=';

// « En France : Herceptin, Herzuma et 3 autres », chaque marque menant à sa fiche officielle.
function frenchBrands(list, shown = 3) {
  if (!list?.length) return '';
  const names = list.slice(0, shown).map(([brand, cis]) => `<a href="${BDPM_FICHE}${Number(cis)}" target="_blank" rel="noopener">${esc(brand.charAt(0) + brand.slice(1).toLowerCase())}</a>`);
  const more = list.length > shown ? ` ${t('et')} ${nf.format(list.length - shown)} ${plural(list.length - shown, 'autre', 'autres')}` : '';
  return `<small class="fr-brands">${t('En France :')} ${names.join(', ')}${more}</small>`;
}

function drugList(rows) {
  if (!rows.length) return `<p class="muted">${t('Aucun médicament connu, autorisé ou en essai.')}</p>`;
  const approved = rows.filter((r) => /APPROVAL|PHASE_4/.test(r.stage)).length;
  const sold = rows.filter((r) => r.france?.length).length;
  const cap = (s) => s.charAt(0) + s.slice(1).toLowerCase();
  const item = (r) => {
    const st = stageLabel(r.stage);
    return `<li><div class="drug-row"><span><a class="drug-name" href="https://platform.opentargets.org/drug/${esc(encodeURIComponent(r.id))}" target="_blank" rel="noopener"><strong>${esc(cap(r.name))}</strong></a>${r.mechanism ? `<small>${enNoteHtml()} ${esc(r.mechanism)}</small>` : ''}${frenchBrands(r.france)}</span><span class="tag ${st.tone}">${esc(st.label)}</span></div></li>`;
  };
  return `<p class="muted small">${drugCount(rows.length, approved)}${sold ? ` ${tn(sold, 'Un est commercialisé en France, pour cette maladie ou pour une autre.', '{n} sont commercialisés en France, pour cette maladie ou pour une autre.', { n: nf.format(sold) })}` : ''}</p>
    ${rows.frDate ? `<p class="muted small">${t('Noms en France : base de données publique des médicaments, données du {date}, sans approbation de l\'ANSM, de la HAS ni de l\'Assurance maladie.', { date: frDate(rows.frDate) })}</p>` : ''}
    <ul class="drugs">${rows.slice(0, DRUGS_SHOWN).map(item).join('')}</ul>`
    + (rows.length > DRUGS_SHOWN ? `<details class="more"><summary>${seeMore(rows.length - DRUGS_SHOWN)}</summary><ul class="drugs">${rows.slice(DRUGS_SHOWN).map(item).join('')}</ul></details>` : '');
}

// ---------- Wikipédia, pharmacogénétique, protéine en 3D ----------

// Comme load(), mais la carte disparaît s'il n'y a rien à montrer ou si la source ne répond pas.
export async function loadOptional(id, promise, render, my) {
  let html = '';
  try { html = render(await promise) || ''; } catch { /* source muette : on retire la carte */ }
  if (stale(my)) return;
  const el = document.getElementById(id);
  if (!el) return;
  if (html) el.innerHTML = html;
  else el.closest('.card')?.remove();
}

// Cancers liés à un gène : un groupe par organe, avec ses noms de maladies et la force du lien.
function cancersBlock(groups) {
  if (!groups?.length) return '';
  const item = (g) => {
    const names = g.rows.slice(0, 3).map((r) => `<a href="#/maladie/${encodeURIComponent(r.id)}">${esc(r.label || r.name)}</a>${r.hereditary && !/h[ée]r[ée]ditaire|hereditary|familial/i.test(r.label || r.name) ? ` <em>(${t('forme héréditaire')})</em>` : ''}`).join(' · ');
    const more = g.rows.length > 3 ? ` · ${tn(g.rows.length - 3, '+ {n} autre', '+ {n} autres', { n: g.rows.length - 3 })}` : '';
    const [, label, tone] = strengthOf(g.score);
    const title = `<strong>${esc(t(g.label))}</strong>`;
    return `<li><div class="drug-row"><span>${g.explorer ? `<a class="drug-name" href="#/cancers/${g.explorer}">${title}</a>` : title}<small>${names}${more}</small></span><span class="tag ${tone}">${t(label)}</span></div></li>`;
  };
  return `<ul class="drugs">${groups.slice(0, 8).map(item).join('')}</ul>
    <p class="muted small">${t('Ce sont des associations relevées dans les bases, pas des causes certaines ni un risque personnel.')}</p>`;
}

// Rôle du gène dans la cellule : trois listes de termes de la Gene Ontology (en anglais), les plus annotés d'abord.
function goBlock(go) {
  if (!go) return '';
  const part = (title, list) => (list.length ? `<h3>${t(title)}</h3>
    <ul class="gwas goterms">${list.map((x) => `<li><a href="https://www.ebi.ac.uk/QuickGO/term/${encodeURIComponent(x.id)}" target="_blank" rel="noopener"><strong>${esc(x.name)}</strong></a><small>${tn(x.hits, '{n} annotation', '{n} annotations', { n: nf.format(x.hits) })}</small></li>`).join('')}</ul>` : '');
  return `<p class="muted small">${enNoteHtml()} ${t("Termes officiels de la Gene Ontology, les mieux documentés d'abord.")}</p>
    ${part('Dans quels processus il intervient', go.process)}${part("Ce qu'il fait au niveau moléculaire", go.func)}${part('Où il se trouve dans la cellule', go.place)}`;
}

function wikiBlock(w) {
  if (!w) return '';
  return `<p class="prose">${esc(w.extract)}</p>
    ${safeUrl(w.url, /\.wikipedia\.org$/) ? `<a class="open-fiche" href="${esc(w.url)}" target="_blank" rel="noopener">${esc(t('Lire l\'article « {title} » sur Wikipédia', { title: w.title }))} ↗</a>` : ''}
    <p class="muted small">${t('Extrait de Wikipédia, texte sous licence')} <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.${isEn() ? 'en' : 'fr'}" target="_blank" rel="noopener">CC BY-SA 4.0</a>.</p>`;
}

const CPIC_LEVEL = {
  A: ['Recommandation forte', 'info', 'selon le CPIC, le génotype doit guider la prescription : dose ou médicament à adapter.'],
  B: ['Recommandation facultative', 'none', 'selon le CPIC, adapter la prescription au génotype est une option raisonnable.'],
};

function pgxBlock(c, symbol, fr) {
  const pairs = c?.genes?.[symbol];
  if (!pairs?.length) return '';
  const item = ([drug, level, , url]) => {
    const [label, tone] = CPIC_LEVEL[level] || [level, 'none'];
    const brands = fr?.subs[drugKey(drug)];
    const name = `<strong>${esc(drug.charAt(0).toUpperCase() + drug.slice(1))}</strong>`;
    const link = safeUrl(url, /(^|\.)(clinpgx|cpicpgx|pharmgkb)\.org$/);
    return `<li><div class="drug-row"><span>${link ? `<a class="drug-name" href="${esc(link)}" target="_blank" rel="noopener">${name}</a>` : name}${frenchBrands(brands, 2)}</span><span class="tag ${tone}">${esc(t(label))}</span></div></li>`;
  };
  return `<p class="prose">${esc(pairs.length > 1
    ? t('Les variants de {gene} changent la façon dont le corps réagit à ces {n} médicaments.', { gene: symbol, n: pairs.length })
    : t('Les variants de {gene} changent la façon dont le corps réagit à ce médicament.', { gene: symbol }))}</p>
    <ul class="drugs">${pairs.slice(0, 8).map(item).join('')}</ul>
    ${pairs.length > 8 ? `<details class="more"><summary>${seeMore(pairs.length - 8)}</summary><ul class="drugs">${pairs.slice(8).map(item).join('')}</ul></details>` : ''}
    <p class="muted small">${esc(t(CPIC_LEVEL.A[0]))} : ${esc(t(CPIC_LEVEL.A[2]))} ${esc(t(CPIC_LEVEL.B[0]))} : ${esc(t(CPIC_LEVEL.B[2]))}</p>
    <p class="muted small">${esc(t('Données CPIC du {date}', { date: frDate(c.date) }))}${fr?.date ? esc(t(', noms en France : base de données publique des médicaments du {date}', { date: frDate(fr.date) })) : ''}.</p>`;
}

const CONF_LEGEND = [['#0053d6', 'très fiable'], ['#65cbf3', 'fiable'], ['#ffdb13', 'peu fiable'], ['#ff7d45', 'très peu fiable']];

// Affiche la protéine à la demande (bouton « Afficher en 3D », relié dans bindCommon).
// Une page ouverte pendant une mise à jour du site demande des fichiers de l'ancienne version, qui
// n'existent plus : le navigateur dit « Failed to fetch dynamically imported module ». On recharge
// alors une fois pour passer à la nouvelle version (une seule fois, pour ne jamais boucler).
function reloadIfOutdated(err) {
  if (!(err instanceof TypeError) || !/dynamically imported|module script/i.test(err.message)) return false;
  try {
    const last = Number(sessionStorage.getItem('genotheque-reload')) || 0;
    if (Date.now() - last < 60000) return false;
    sessionStorage.setItem('genotheque-reload', String(Date.now()));
  } catch { return false; }
  location.reload();
  return true;
}

async function show3d(btn) {
  const my = seq;
  const box = document.getElementById('af-view');
  if (!box) return;
  btn.remove();
  box.hidden = false;
  box.innerHTML = LOADING;
  try {
    const { showProtein } = await import('./protein3d.js');
    if (!stale(my)) await showProtein(box, btn.dataset.af);
  } catch (err) {
    console.warn('AlphaFold', err);
    if (reloadIfOutdated(err)) return;
    if (!stale(my)) box.innerHTML = unavailable('AlphaFold');
  }
}

function protein3dBlock(m) {
  if (!m) return `<p class="muted">${t('Pas de modèle 3D disponible pour cette protéine.')}</p>`;
  return `<p class="prose">${t('Forme de la protéine prédite par l\'IA AlphaFold')}${m.length ? `, ${t('{n} acides aminés', { n: nf.format(m.length) })}` : ''}. ${t('Confiance moyenne du modèle :')} <strong>${t('{n} sur 100', { n: Math.round(m.confidence) })}</strong>.</p>
    <button class="more-btn primary" data-af="${esc(m.pdb)}">${t('Afficher en 3D (environ 1 Mo)')}</button>
    <div class="viewer3d" id="af-view" hidden></div>
    <p class="legend3d">${CONF_LEGEND.map(([c, l]) => `<span><i style="background:${c}"></i>${t(l)}</span>`).join('')}</p>
    <p class="muted small">${t('Faites glisser pour tourner, pincez pour zoomer.')}</p>`;
}

// ---------- Symptômes, ClinGen, partenaires, voies biologiques ----------

const SYMPTOM_CATS_OPEN = 3;
const SYMPTOMS_PER_CAT = 8;

// Symptômes regroupés par système, les plus fréquents d'abord ; noms français tirés des traductions officielles de HPO.
export function symptomsBlock(s, frLabels) {
  if (!s) return '';
  const label = (p) => (!isEn() && frLabels?.[p.id.replace('HP:', '')]) || p.name;
  const cats = Object.entries(s.categories)
    .map(([cat, list]) => ({
      cat,
      items: list.map((p) => ({ ...p, freq: symptomFrequency(p.metadata?.frequency) }))
        .filter((p) => p.metadata?.frequency !== 'Excluded')
        .sort((a, b) => b.freq.pct - a.freq.pct || label(a).localeCompare(label(b), locale())),
    }))
    .filter((c) => c.items.length && c.cat !== 'Inheritance')
    .sort((a, b) => b.items.length - a.items.length);
  if (!cats.length) return '';
  const total = cats.reduce((n, c) => n + c.items.length, 0);
  const catName = (c) => (isEn() ? c : HPO_CATEGORIES[c] || c);
  const block = (c) => `<h3>${esc(catName(c.cat))} <span class="num">${c.items.length}</span></h3>
    <ul class="symptoms">${c.items.slice(0, SYMPTOMS_PER_CAT).map((p) => `<li><span>${esc(label(p))}</span>${p.freq.label ? `<span class="tag ${p.freq.pct >= 80 ? 'info' : 'none'}">${esc(p.freq.label)}</span>` : ''}</li>`).join('')}</ul>
    ${c.items.length > SYMPTOMS_PER_CAT ? `<p class="muted small">${tn(c.items.length - SYMPTOMS_PER_CAT, 'et un autre symptôme', 'et {n} autres symptômes')}</p>` : ''}`;
  return `<p class="muted small">${t('{n} symptômes recensés, regroupés par système.', { n: nf.format(total) })}</p>
    ${cats.slice(0, SYMPTOM_CATS_OPEN).map(block).join('')}
    ${cats.length > SYMPTOM_CATS_OPEN ? `<details class="more"><summary>${tn(cats.length - SYMPTOM_CATS_OPEN, 'Voir l\'autre système', 'Voir les {n} autres systèmes')}</summary>${cats.slice(SYMPTOM_CATS_OPEN).map(block).join('')}</details>` : ''}
    <p class="muted small">${esc(t('Données HPO ({id}), version du service en ligne de la Human Phenotype Ontology.', { id: s.id }))}</p>`;
}

// Évaluations ClinGen, pour un gène (liste de maladies) ou une maladie (liste de gènes).
function clingenBlock(rows, mode, c) {
  if (!rows?.length) return '';
  const sorted = [...rows].sort((a, b) => (CLINGEN_CLASS[a.cls]?.[2] ?? 9) - (CLINGEN_CLASS[b.cls]?.[2] ?? 9));
  const item = (r) => {
    const [lab, tone] = CLINGEN_CLASS[r.cls] || [r.cls, 'none'];
    const title = mode === 'gene'
      ? `<a class="drug-name" href="#/maladie/${encodeURIComponent(r.mondo)}"><strong>${esc(r.label || r.disease)}</strong></a>`
      : `<a class="drug-name" href="#/gene/${encodeURIComponent(r.gene)}"><strong>${esc(r.gene)}</strong></a>`;
    const moi = MOI[r.moi] ? `<small>${t('Transmission :')} ${t(MOI[r.moi])}</small>` : '';
    return `<li><div class="drug-row"><span>${title}${moi}</span><span class="tag ${tone}">${esc(t(lab))}</span></div></li>`;
  };
  return `<ul class="drugs">${sorted.slice(0, 10).map(item).join('')}</ul>
    ${sorted.length > 10 ? `<details class="more"><summary>${seeMore(sorted.length - 10)}</summary><ul class="drugs">${sorted.slice(10).map(item).join('')}</ul></details>` : ''}
    <p class="muted small">${t('Évaluations ClinGen, fichier du {date}.', { date: frDate(c.date) })}</p>`;
}

const clingenRows = (c, idx) => (idx || []).map((i) => {
  const [gene, disease, mondo, moi, cls] = c.entries[i];
  return { gene, disease, name: disease, id: mondo, mondo, moi, cls };
});

// Réseau de la protéine : le gène au centre, ses dix partenaires autour, trait d'autant plus épais que le lien est sûr.
function partnersBlock(list, symbol) {
  if (!list?.length) return '';
  const W = 320, H = 240, cx = W / 2, cy = H / 2, R = 92;
  const nodes = list.slice(0, 10).map((p, i, all) => {
    const a = (2 * Math.PI * i) / all.length - Math.PI / 2;
    return { ...p, x: cx + R * Math.cos(a), y: cy + R * 0.82 * Math.sin(a) };
  });
  const lines = nodes.map((n) => `<line x1="${cx}" y1="${cy}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" style="stroke-width:${(1 + 4 * n.score).toFixed(1)}"/>`).join('');
  const dots = nodes.map((n) => `<a href="#/gene/${encodeURIComponent(n.symbol)}"><circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="23"/><text x="${n.x.toFixed(1)}" y="${(n.y + 3).toFixed(1)}" text-anchor="middle"${n.symbol.length > 6 ? ` class="long"` : ''}>${esc(n.symbol)}</text></a>`).join('');
  return `<svg class="net" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('Réseau des protéines partenaires de {gene}', { gene: symbol }))}">
      <g class="net-lines">${lines}</g>
      <g class="net-center"><circle cx="${cx}" cy="${cy}" r="27"/><text x="${cx}" y="${cy + 4}" text-anchor="middle">${esc(symbol)}</text></g>
      <g class="net-nodes">${dots}</g>
    </svg>
    <p class="muted small">${t('Touchez une protéine pour ouvrir la fiche de son gène.')}</p>`;
}

function pathwaysBlock(list) {
  if (!list?.length) return '';
  const shown = list.slice(0, 8);
  return `<ul class="gwas">${shown.map((p) => `<li><a href="https://reactome.org/content/detail/${esc(encodeURIComponent(p.id))}" target="_blank" rel="noopener"><strong>${enNoteHtml()} ${esc(p.name)}</strong></a>${p.disease ? `<small>${t('Voie altérée dans une maladie')}</small>` : ''}</li>`).join('')}</ul>
    ${list.length > shown.length ? `<p class="muted small">${t('{n} voies au total. Les {k} premières sont affichées.', { n: list.length, k: shown.length })}</p>` : ''}`;
}

function trialList(tr) {
  if (!tr.total) return `<p class="muted">${t('Aucun essai ne recrute en ce moment pour cette maladie.')}</p>`;
  const list = tr.franceList.length ? tr.franceList : tr.worldList;
  return `<div class="trial-counts"><span><strong>${nf.format(tr.total)}</strong> ${t('dans le monde')}</span><span><strong>${nf.format(tr.france)}</strong> ${t('en France')}</span></div>
    <p class="kicker">${tr.franceList.length ? t('En France') : t('Dans le monde')}</p>
    <ul class="gwas">${list.map((s) => `<li><a href="https://clinicaltrials.gov/study/${esc(encodeURIComponent(s.id))}" target="_blank" rel="noopener"><strong>${enNoteHtml()} ${esc(s.title)}</strong></a>
      <small>${esc(s.id)}${trialPhase(s.phases) ? `, ${esc(trialPhase(s.phases))}` : ''}</small></li>`).join('')}</ul>`;
}

// ---------- Fiche variant ----------

function formatFreq(ac, an) {
  if (!an) return t('pas de donnée');
  if (!ac) return t('absent');
  const af = ac / an;
  if (af >= 0.01) return pct(nf.format(af * 100, { maximumFractionDigits: 1 }));
  return t('1 sur {n}', { n: nf.format(Math.round(1 / af)) });
}

function freqBlock(label, data) {
  if (!data) return '';
  const pops = (data.populations || []).filter((p) => POPULATIONS[p.id] && p.an > 0)
    .map((p) => ({ ...p, af: p.ac / p.an }))
    .sort((a, b) => b.af - a.af);
  const max = Math.max(1e-9, ...pops.map((p) => p.af));
  return `<h3>${t(label)} <span class="big">${formatFreq(data.ac, data.an)}</span></h3>
    <p class="muted small">${t('Environ {n} personnes analysées', { n: nf.format(data.an / 2) })}</p>
    <ul class="counts pops">${pops.map((p) => `<li><span>${esc(t(POPULATIONS[p.id]))}</span><span class="bar"><i style="width:${(p.af / max) * 100}%"></i></span><span class="num">${formatFreq(p.ac, p.an)}</span></li>`).join('')}</ul>`;
}

// Fréquence de l'allèle dans d'autres projets de populations (1000 Genomes, TOPMed, ALSPAC, Qatar…), par région.
function cohortsCard(hits) {
  const best = bestAllele(hits);
  if (!best) return '';
  const groups = cohortFrequencies(best.alleles, best.alt);
  const max = Math.max(1e-9, ...groups.flatMap((g) => g.items.map((i) => i.freq)));
  const fmt = (f) => (f === 0 ? t('absent') : f >= 0.01 ? pct(nf.format(f * 100, { maximumFractionDigits: 1 })) : t('1 sur {n}', { n: nf.format(Math.round(1 / f)) }));
  return `<section class="card">
    <header class="card-head"><h2>${t('Fréquence dans d\'autres projets')}</h2><button class="help-btn" aria-label="${t('Explication')}" data-help="cohorts">?</button></header>
    <p class="help" id="help-cohorts" hidden>${esc(t(HELP.cohorts))}</p>
    <p class="muted small">${t('Allèle mesuré :')} <code>${esc(best.alt)}</code></p>
    ${groups.map((g) => `<h3>${t(g.group)}</h3>
      <ul class="counts pops">${g.items.map((i) => `<li><span>${esc(t(i.name))}<small>${esc(t(i.where))}</small></span><span class="bar"><i style="width:${Math.max(1.5, (i.freq / max) * 100)}%"></i></span><span class="num">${fmt(i.freq)}</span></li>`).join('')}</ul>`).join('')}
    <p class="source">${t('Source :')} ${t('dbSNP (NCBI, domaine public) : chiffres publiés par chaque projet, via MyVariant.info')}</p>
  </section>`;
}

function clinvarBlock(hits) {
  const rows = hits.flatMap((h) => h.clinvar.map((r) => ({ ...r, alt: h.alt })));
  if (!rows.length) return `<p class="muted">${t('Ce variant n\'a pas été classé dans ClinVar.')}</p>`;
  // Regroupe les avis identiques (même classification, même maladie).
  // Pour un même avis, on garde le niveau de relecture le plus élevé.
  const seen = new Map();
  for (const r of rows) {
    const s = significance(r.sig);
    const key = s.label + '|' + r.cond;
    const stars = reviewStars(r.review);
    if (!seen.has(key) || seen.get(key).stars < stars) seen.set(key, { ...s, cond: r.cond, raw: r.sig, stars });
  }
  const order = { bad: 0, risk: 1, mixed: 2, info: 3, good: 4, none: 5 };
  const list = [...seen.values()].sort((a, b) => order[a.tone] - order[b.tone] || b.stars - a.stars);
  const starsHtml = (n) => `<span class="stars" title="${t(n > 1 ? '{n} étoiles sur 4' : '{n} étoile sur 4', { n })}" aria-label="${t(n > 1 ? '{n} étoiles sur 4' : '{n} étoile sur 4', { n })}">${'★'.repeat(n)}<i>${'★'.repeat(4 - n)}</i></span>`;
  const item = (r) => `<li><span class="clin-head"><span class="tag ${r.tone}">${esc(t(r.label))}</span>${starsHtml(r.stars)}</span><span>${r.cond && !/^not (provided|specified)$/i.test(r.cond) ? esc(r.cond) : `<span class="muted">${t('maladie non précisée')}</span>`}</span></li>`;
  const shown = 6;
  return `<ul class="clin">${list.slice(0, shown).map(item).join('')}</ul>`
    + (list.length > shown ? `<details class="more"><summary>${tn(list.length - shown, 'Voir l\'autre avis', 'Voir les {n} autres avis')}</summary><ul class="clin">${list.slice(shown).map(item).join('')}</ul></details>` : '');
}

// Vrai quand un avis ClinVar justifié dit « pathogène » alors que toutes les prédictions disent « plutôt bénin ».
function contradicts(hits, withScores) {
  const pathogenic = hits.some((h) => h.clinvar.some((r) => significance(r.sig).tone === 'bad' && reviewStars(r.review) >= 1));
  const benign = withScores.every((h) => ['alphamissense', 'revel'].every((k) => h.scores[k] == null || scoreReading(k, h.scores[k])[1] !== 'bad'))
    && withScores.some((h) => h.scores.alphamissense != null && scoreReading('alphamissense', h.scores.alphamissense)[1] === 'good');
  return pathogenic && benign;
}

// Prédictions informatiques, une ligne par allèle qui change un acide aminé.
function scoresBlock(hits) {
  const withScores = hits.filter((h) => h.scores.alphamissense != null || h.scores.revel != null || h.scores.cadd != null);
  if (!withScores.length) return '';
  const bar = (kind, name, v) => {
    if (v == null) return '';
    const [label, tone] = scoreReading(kind, v);
    return `<li><span>${name}</span><span class="bar ${tone}"><i style="width:${Math.round(v * 100)}%"></i></span><span class="num">${nf.format(v, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span class="tag ${tone}">${t(label)}</span></li>`;
  };
  // Le score CADD « phred » se lit comme un rang : 20 = parmi les 1 % de changements les plus nocifs du génome.
  const cadd = (v) => {
    if (v == null) return '';
    const pct = 100 * 10 ** (-v / 10);
    const txt = pct >= 10 ? t('comme la plupart des variants') : t('parmi les {p} % les plus nocifs', { p: pct >= 1 ? Math.round(pct) : nf.format(pct, { maximumSignificantDigits: 1 }) });
    return `<p class="small"><strong>CADD ${nf.format(v, { maximumFractionDigits: 1, minimumFractionDigits: 1 })}</strong> : ${txt}</p>`;
  };
  return `<section class="card">
    <header class="card-head"><h2>${t('Prédictions informatiques')}</h2><button class="help-btn" aria-label="${t('Explication')}" data-help="scores">?</button></header>
    <p class="help" id="help-scores" hidden>${esc(t(HELP.scores))}</p>
    ${contradicts(hits, withScores) ? `<p class="note">${esc(t(HELP.scoresVsClinvar))}</p>` : ''}
    ${withScores.map((h) => `${withScores.length > 1 ? `<p class="allele">${t('Allèle')} <code>${esc(h.alt)}</code></p>` : ''}
      <ul class="scorebars">${bar('alphamissense', 'AlphaMissense', h.scores.alphamissense)}${bar('revel', 'REVEL', h.scores.revel)}</ul>
      ${cadd(h.scores.cadd)}`).join('')}
    <p class="source">${t('Source :')} ${t('AlphaMissense, REVEL et CADD via dbNSFP (CC BY-NC-ND 4.0, usage non commercial) et MyVariant.info')}</p>
  </section>`;
}

// Mantisse et exposant viennent du GWAS Catalog : on n'insère que des nombres.
const num = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : '?');
const pval = (m, e) => `${num(m)} × 10<sup>${num(e)}</sup>`;

export async function renderVariant(app, rsid) {
  const my = begin();
  const rs = rsid.toLowerCase();
  if (!RS.test(rs)) {
    app.innerHTML = `<div class="page"><p class="muted">${esc(t('« {id} » n\'est pas un identifiant rs valide.', { id: rsid }))}</p></div>`;
    return;
  }
  app.innerHTML = LOADING;
  let hits;
  try {
    hits = await api.variant(rs);
  } catch {
    if (stale(my)) return;
    app.innerHTML = `<div class="page">${unavailable('MyVariant.info')}</div>`;
    return;
  }
  if (stale(my)) return;
  if (!hits.length) {
    app.innerHTML = `<div class="page"><p class="muted">${esc(t('Aucun variant {id} dans dbSNP.', { id: rs }))}</p><a href="#/">${t('Retour à la recherche')}</a></div>`;
    return;
  }
  const genes = [...new Set(hits.flatMap((h) => h.genes))];
  const h0 = hits[0];
  const alts = [...new Set(hits.map((h) => h.alt).filter(Boolean))].join(` ${t('ou')} `);
  app.innerHTML = `<div class="page">
    ${pageHead({ kind: 'variant', id: rs, label: 'Variant', title: rs, subtitle: genes.length ? t('Gène {genes}', { genes: genes.join(', ') }) : t('Hors gène connu') })}
    <p class="disclaimer">${t('Fiche publique du variant : elle décrit ce que disent les bases sur ce variant, et rien sur votre situation personnelle.')}</p>
    <section class="card">
      <header class="card-head"><h2>${t('En bref')}</h2><button class="help-btn" aria-label="${t('Explication')}" data-help="variant">?</button></header>
      <p class="help" id="help-variant" hidden>${esc(t(HELP.variant))}</p>
      <dl class="facts">
        <dt>${t('Changement')}</dt><dd><code>${esc(h0.ref)}</code> ${t('devient')} <code>${esc(alts)}</code>${h0.type && VAR_TYPES[h0.type] ? ` (${t(VAR_TYPES[h0.type])})` : ''}</dd>
        ${h0.chrom ? `<dt>${t('Chromosome')}</dt><dd>${esc(h0.chrom)}</dd>` : ''}
        ${h0.effect ? `<dt>${t('Effet prédit')}</dt><dd>${esc(h0.effect.split('&').map((e) => (EFFECTS[e] ? t(EFFECTS[e]) : e.replace(/_/g, ' '))).join(', '))}</dd>` : ''}
        ${genes.length ? `<dt>${t('Gène')}</dt><dd>${genes.map((g) => `<a href="#/gene/${encodeURIComponent(g)}">${esc(g)}</a>`).join(', ')}</dd>` : ''}
      </dl>
      <p class="source">${t('Source :')} ${t('dbSNP et SnpEff, via MyVariant.info')}</p>
    </section>
    ${section('v-freq', 'Fréquence dans la population', HELP.freq, 'gnomAD v4')}
    ${cohortsCard(hits)}
    <section class="card">
      <header class="card-head"><h2>${t('Avis cliniques')}</h2><button class="help-btn" aria-label="${t('Explication')}" data-help="clinv">?</button></header>
      <p class="help" id="help-clinv" hidden>${esc(t(HELP.clinvarVariant))} ${esc(t(HELP.stars))}</p>
      ${clinvarBlock(hits)}
      <p class="source">${t('Source :')} ${t('ClinVar (NCBI), via MyVariant.info')}</p>
    </section>
    ${scoresBlock(hits)}
    ${section('v-gwas', 'Caractères associés', HELP.gwas, 'GWAS Catalog (EBI)')}
    <section class="card"><header class="card-head"><h2>${t('Aller plus loin')}</h2></header>
      ${links([
        ['dbSNP', `https://www.ncbi.nlm.nih.gov/snp/${rs}`],
        ['ClinVar', `https://www.ncbi.nlm.nih.gov/clinvar/?term=${rs}`],
        ['gnomAD', `https://gnomad.broadinstitute.org/variant/${rs}?dataset=gnomad_r4`],
        ['GWAS Catalog', `https://www.ebi.ac.uk/gwas/variants/${rs}`],
        ['Ensembl', `https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${rs}`],
      ])}
    </section>
  </div>`;

  load('v-freq', 'gnomAD', api.gnomadFreq(rs), (v) => {
    if (v.error) {
      return /multiple/i.test(v.error)
        ? `<p class="muted">${t('Ce numéro rs recouvre plusieurs variants dans gnomAD. Consultez le site de gnomAD pour les voir un par un.')}</p>`
        : `<p class="muted">${t('Ce variant n\'est pas présent dans gnomAD v4.')}</p>`;
    }
    return `<p class="muted small">${t('Allèle mesuré :')} <code>${esc(v.alt)}</code></p>${freqBlock('Génomes', v.genome)}${freqBlock('Exomes', v.exome)}`;
  }, my);

  load('v-gwas', 'GWAS Catalog', api.gwas(rs), (d) => {
    if (!d.rows.length) return `<p class="muted">${t('Aucune association publiée pour ce variant.')}</p>`;
    // Les études se répètent sur un même trait : on garde la plus forte par trait.
    const byTrait = new Map();
    for (const r of d.rows) if (!byTrait.has(r.trait)) byTrait.set(r.trait, r);
    const rows = [...byTrait.values()].slice(0, 10);
    return `<ul class="gwas">${rows.map((r) => `<li><strong>${enNoteHtml()} ${esc(r.trait)}</strong>
        <small>p = ${pval(r.mantissa, r.exponent)}${r.allele && r.allele !== '?' ? `, ${t('allèle')} ${esc(r.allele)}` : ''}${r.pubmed ? `, <a href="https://pubmed.ncbi.nlm.nih.gov/${esc(encodeURIComponent(r.pubmed))}/" target="_blank" rel="noopener">${esc(r.author || t('étude'))} ↗</a>` : ''}</small></li>`).join('')}</ul>
      <p class="muted">${t('{n} associations publiées au total. Les caractères les plus significatifs sont affichés.', { n: nf.format(d.total) })}</p>`;
  }, my);
}

// ---------- Fiche maladie ----------

export async function renderDisease(app, id) {
  const my = begin();
  app.innerHTML = LOADING;
  let d;
  try {
    d = await api.disease(id);
  } catch {
    if (stale(my)) return;
    app.innerHTML = `<div class="page">${unavailable('Open Targets')}</div>`;
    return;
  }
  if (!d) {
    app.innerHTML = `<div class="page"><p class="muted">${esc(t('Maladie introuvable ({id}).', { id }))}</p><a href="#/">${t('Retour à la recherche')}</a></div>`;
    return;
  }
  // Wikidata (nom français, lien Wikipédia) ne doit pas retenir la fiche : au-delà de 4 s, on s'en passe.
  const fr = await Promise.race([api.diseaseFr(d).catch(() => null), new Promise((r) => setTimeout(() => r(null), 4000))]);
  if (stale(my)) return;
  // En anglais, le nom d'Open Targets fait foi ; en français, celui de Wikidata quand il existe.
  const useFr = !isEn() && fr?.name;
  const title = useFr ? fr.name.charAt(0).toUpperCase() + fr.name.slice(1) : d.name;
  const orpha = d.orphanet || fr?.orphanet;
  app.innerHTML = `<div class="page">
    ${pageHead({ kind: 'maladie', id: d.id, label: 'Maladie', title, subtitle: useFr ? d.name : '' })}
    <section class="card">
      <header class="card-head"><h2>${t('En bref')}</h2></header>
      ${useFr && fr.detail ? `<p class="prose">${esc(fr.detail.charAt(0).toUpperCase() + fr.detail.slice(1))}.</p>` : ''}
      ${d.description ? `<p class="prose">${enNoteHtml()} ${esc(d.description)}</p>` : `<p class="muted">${t('Pas de description disponible.')}</p>`}
      <p class="source">${t('Source :')} Open Targets${useFr && fr.detail ? ', Wikidata' : ''}</p>
    </section>
    ${section('d-wiki', isEn() ? 'En résumé' : 'En français', '', 'Wikipédia')}
    ${section('d-sym', 'Symptômes', HELP.symptoms, 'Human Phenotype Ontology (JAX) et Orphanet')}
    ${section('d-cg', 'Gènes évalués par des experts', HELP.clingen, 'ClinGen (domaine public CC0)')}
    ${section('d-genes', 'Gènes liés', HELP.targets, 'Open Targets Platform')}
    ${section('d-drugs', 'Médicaments', HELP.drugsDisease, 'Open Targets Platform (ChEMBL)')}
    ${section('d-trials', 'Essais cliniques qui recrutent', HELP.trials, 'ClinicalTrials.gov')}
    <section class="card"><header class="card-head"><h2>${t('Aller plus loin')}</h2></header>
      ${links([
        ['Orphanet (maladies rares, en français)', orpha && `https://www.orpha.net/${isEn() ? 'en' : 'fr'}/disease/detail/${encodeURIComponent(orpha)}`],
        ['OMIM', d.omim && `https://omim.org/entry/${encodeURIComponent(d.omim)}`],
        ['Open Targets', `https://platform.opentargets.org/disease/${encodeURIComponent(d.id)}`],
        ['MedlinePlus Genetics', `https://medlineplus.gov/search/?query=${encodeURIComponent(d.name)}`],
      ])}
    </section>
  </div>`;
  fill('d-genes', scoreList(d.targets.rows, (r) => `#/gene/${encodeURIComponent(r.symbol)}`, (r) => r.symbol, (r) => r.name)
    + (d.targets.count > d.targets.rows.length ? `<p class="muted">${t('{total} gènes au total. Les {n} plus liés sont affichés.', { total: nf.format(d.targets.count), n: d.targets.rows.length })}</p>` : ''), my);
  load('d-drugs', 'Open Targets', withFrenchDrugs(api.diseaseDrugs(d.id)), drugList, my);
  loadOptional('d-wiki', api.diseaseWiki(fr?.qid), wikiBlock, my);
  loadOptional('d-sym', Promise.all([api.symptoms({ orphanet: orpha, omim: d.omim }), isEn() ? null : api.hpoFr().catch(() => null)]),
    ([s, frLabels]) => symptomsBlock(s, frLabels), my);
  loadOptional('d-cg', api.clingen(), (c) => clingenBlock(clingenRows(c, c.byMondo[d.id]), 'disease', c), my);
  load('d-trials', 'ClinicalTrials.gov', api.trials(d.name), trialList, my);
}

// ---------- Favoris et sources ----------

const KIND_HREF = { gene: 'gene', variant: 'variant', maladie: 'maladie', orpha: 'orpha' };
const KIND_LABEL = { gene: 'Gène', variant: 'Variant', maladie: 'Maladie', orpha: 'Maladie rare' };

// ---------- Panneau latéral (grand écran, piste B) ----------

// Recherche en haut ; quand le champ est vide, fiches récentes et favoris. La fiche ouverte est marquée.
const favLink = (f) => {
  const href = `#/${KIND_HREF[f.kind]}/${encodeURIComponent(f.id)}`;
  const here = decodeURIComponentSafe(location.hash) === decodeURIComponentSafe(href);
  return `<li><a href="${href}"${here ? ' aria-current="page"' : ''}><strong>${esc(f.label)}</strong><small>${t(KIND_LABEL[f.kind])}${f.sub ? ` · ${esc(f.sub)}` : ''}</small></a></li>`;
};
function decodeURIComponentSafe(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}
const sideLists = () => {
  const recents = readFavs(RECENT_KEY);
  const favs = readFavs();
  return `${recents.length ? `<p class="kicker">${t('Consultées récemment')}</p><ul class="hits">${recents.map(favLink).join('')}</ul>` : ''}
    <p class="kicker">${t('Favoris')}</p>
    ${favs.length ? `<ul class="hits">${favs.map(favLink).join('')}</ul>` : `<p class="muted small">${t('L\'étoile en haut d\'une fiche la garde ici.')}</p>`}`;
};

export function renderSide(side) {
  side.innerHTML = `<div class="side-inner">
    <a class="side-brand" href="#/">${appName()}</a>
    ${searchBox()}
    <div class="q-results"></div>
    <div class="side-lists">${sideLists()}</div>
  </div>`;
  const lists = side.querySelector('.side-lists');
  const refresh = () => { if (!lists.hidden) lists.innerHTML = sideLists(); };
  const input = bindSearch(side, (q) => { lists.hidden = q.length > 1; refresh(); });
  return { input, refresh };
}

export function renderFavs(app) {
  begin();
  const list = readFavs();
  app.innerHTML = `<div class="page"><h1 class="page-title">${t('Favoris')}</h1>
    ${list.length
      ? `<ul class="hits">${list.map((f) => `<li><a href="#/${KIND_HREF[f.kind]}/${encodeURIComponent(f.id)}"><strong>${esc(f.label)}</strong><small>${t(KIND_LABEL[f.kind])}${f.sub ? ` · ${esc(f.sub)}` : ''}</small></a></li>`).join('')}</ul>`
      : `<p class="muted">${t('Touchez l\'étoile en haut d\'une fiche pour la retrouver ici. Les favoris restent sur ce téléphone.')}</p>`}
  </div>`;
}

const SOURCES = [
  ['NCBI Gene, dbSNP, ClinVar', 'National Center for Biotechnology Information (États-Unis)', 'Domaine public', 'https://www.ncbi.nlm.nih.gov/'],
  ['Projets de populations (1000 Genomes, TOPMed, HapMap, SGDP…)', 'chiffres publiés par chaque projet, repris par dbSNP', 'Domaine public via dbSNP', 'https://www.ncbi.nlm.nih.gov/snp/'],
  ['MyGene.info, MyVariant.info', 'BioThings, Scripps Research', 'Agrégateurs ouverts, licences des sources d\'origine', 'https://biothings.io/'],
  ['gnomAD v4', 'Broad Institute', 'Ouvert, citation demandée', 'https://gnomad.broadinstitute.org/'],
  ['GWAS Catalog', 'NHGRI et EMBL-EBI', 'Ouvert, citation demandée', 'https://www.ebi.ac.uk/gwas/'],
  ['UniProt', 'Consortium UniProt', 'CC BY 4.0', 'https://www.uniprot.org/'],
  ['Open Targets Platform', 'Open Targets', 'CC0', 'https://platform.opentargets.org/'],
  ['Wikidata', 'Wikimedia', 'CC0', 'https://www.wikidata.org/'],
  ['Wikipédia', 'Fondation Wikimedia', 'CC BY-SA 4.0, résumés affichés avec lien vers l\'article', 'https://fr.wikipedia.org/'],
  ['AlphaFold (structures 3D)', 'EMBL-EBI et Google DeepMind', 'CC BY 4.0', 'https://alphafold.ebi.ac.uk/'],
  ['Base de données publique des médicaments', 'ANSM, HAS, Assurance maladie', 'Réutilisation libre, source et date citées ; aucune caution de ces organismes', 'https://base-donnees-publique.medicaments.gouv.fr/'],
  ['CPIC (pharmacogénétique)', 'Clinical Pharmacogenetics Implementation Consortium', 'Domaine public CC0', 'https://cpicpgx.org/'],
  ['Human Phenotype Ontology (symptômes)', 'Jackson Laboratory et Monarch Initiative', 'Libre, citation et version demandées ; traductions françaises officielles', 'https://hpo.jax.org/'],
  ['ClinGen (liens gène-maladie)', 'Clinical Genome Resource, NIH', 'Domaine public CC0, attribution demandée', 'https://clinicalgenome.org/'],
  ['STRING (partenaires des protéines)', 'Consortium STRING (SIB, CPR, EMBL)', 'CC BY 4.0', 'https://string-db.org/'],
  ['Gene Ontology (rôle dans la cellule)', 'Gene Ontology Consortium, via QuickGO (EMBL-EBI)', 'CC BY 4.0', 'https://www.ebi.ac.uk/QuickGO/'],
  ['Reactome (voies biologiques)', 'Consortium Reactome', 'Domaine public CC0', 'https://reactome.org/'],
  ['GTEx (expression dans les organes)', 'Broad Institute, NIH Common Fund', 'Données ouvertes, citation demandée', 'https://gtexportal.org/'],
  ['ClinicalTrials.gov','National Library of Medicine (États-Unis)', 'Domaine public', 'https://clinicaltrials.gov/'],
  ['ChEMBL (médicaments, via Open Targets)', 'EMBL-EBI', 'CC BY-SA 3.0', 'https://www.ebi.ac.uk/chembl/'],
  ['AlphaMissense, REVEL, CADD (via dbNSFP)', 'Google DeepMind, Ioannidis et al., Université de Washington', 'Usage non commercial', 'https://www.dbnsfp.org/'],
  ['Orphanet (Orphadata)', 'Inserm', 'CC BY 4.0, classifications et gènes intégrés à l\'appli', 'https://www.orphadata.com/'],
  ['HGNC, familles de gènes', 'HUGO Gene Nomenclature Committee', 'CC0, intégré à l\'appli', 'https://www.genenames.org/'],
];

// Choix de la langue : le libellé de chaque bouton reste dans sa propre langue.
const langSwitch = () => `<div class="lang-switch" role="group" aria-label="Langue · Language">
    <button data-lang="fr" aria-pressed="${!isEn()}" class="${isEn() ? '' : 'on'}">Français</button>
    <button data-lang="en" aria-pressed="${isEn()}" class="${isEn() ? 'on' : ''}">English</button>
  </div>`;

function pressed(b, on) {
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', on);
}
const choice = (attr, current, items, label) => `<div class="lang-switch" role="group" aria-label="${esc(label)}">
    ${items.map(([v, l]) => `<button data-${attr}="${v}" aria-pressed="${v === current}" class="${v === current ? 'on' : ''}">${esc(l)}</button>`).join('')}
  </div>`;

export const lookChoice = () => choice('look-set', getLook(), [['sobre', t('Sobres')], ['vif', t('Colorées')]], t('Tuiles de l\'Explorer'));

// Thème et style de l'Explorer, gardés dans le téléphone (prefs.js).
const displayCard = () => `<section class="card"><h2>${t('Affichage')}</h2>
    <p class="kicker">${t('Thème')}</p>
    ${choice('theme-set', getTheme(), [['auto', t('Comme le téléphone')], ['light', t('Clair')], ['dark', t('Sombre')]], t('Thème'))}
    <p class="kicker">${t('Tuiles de l\'Explorer')}</p>
    ${lookChoice()}
    <p class="muted small">${t('Sobres : verre clair et pastille de couleur. Colorées : tuiles pleines, indigo pour les gènes, violet pour les maladies rares, corail pour les cancers.')}</p>
  </section>`;

export function renderSources(app) {
  begin();
  // Onglet « Infos » (route #/sources gardée pour les liens déjà partagés) : aide et réglages d'abord.
  app.innerHTML = `<div class="page"><h1 class="page-title">${t('Infos')}</h1>
    <a class="open-fiche" href="#/aide">${t('Aide à l\'utilisation')} ›</a>
    <a class="open-fiche" href="#/apropos">${t('À propos : contact, confidentialité, crédits, mentions légales')} ›</a>
    <section class="card"><h2>Langue · Language</h2>${langSwitch()}</section>
    ${displayCard()}
    <section class="card warn"><h2>${t('À savoir')}</h2><p class="prose">${esc(t(DISCLAIMER))}</p>
      <p class="prose">${t('L\'appli ne lit aucune donnée génétique personnelle et n\'envoie rien vous concernant. Les recherches partent directement de ce téléphone vers les bases ci-dessous, qui voient donc l\'adresse internet du téléphone, comme pour toute page web.')}</p>
      <p class="prose">${t('Pas de compte, pas de publicité, pas de mesure d\'audience. Les favoris restent sur ce téléphone.')}</p></section>
    <section class="card"><h2>${t('Bases consultées')}</h2>
      <ul class="sources">${SOURCES.map(([n, who, lic, url]) => `<li><a href="${url}" target="_blank" rel="noopener"><strong>${esc(t(n))}</strong></a><small>${esc(t(who))} · ${esc(t(lic))}</small></li>`).join('')}</ul>
    </section>
    <p class="muted small center">${t('Version {v}, par Jimmy Darly (Studio Nébulis) · code libre (licence AGPL-3.0)', { v: __APP_VERSION__ })}</p>
    <p class="small center"><a href="https://github.com/jimmydaviddarly-blip/genotheque" target="_blank" rel="noopener">${t('Code source et signalement d\'erreurs sur GitHub')} ↗</a></p>
  </div>`;
}
