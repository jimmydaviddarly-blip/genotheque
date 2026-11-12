import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/inter';
import './style.css';
import './looks.css';
import './motion.css';

// Inclinaison 3D au toucher : la tuile penche vers le doigt (variables lues par motion.css).
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.tile, .body-card');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--tx', `${(((e.clientX - r.left) / r.width) - 0.5) * 10}deg`);
  el.style.setProperty('--ty', `${(0.5 - ((e.clientY - r.top) / r.height)) * 10}deg`);
});
// Position du doigt ou de la souris sur une tuile, pour le reflet (looks.css).
document.addEventListener('pointermove', (e) => {
  const el = e.target.closest('.tile');
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
});
import { bindCommon, renderSide, renderSearch, renderGene, renderVariant, renderDisease, renderFavs, renderSources } from './views.js';
import { renderHelp } from './help.js';
import { renderAbout } from './about.js';
import { t, appName } from './i18n.js';
import { applyPrefs } from './prefs.js';
import { renderExplore, renderFamily, renderRares, renderOrpha, renderCancers } from './explore.js';

applyPrefs();
const app = document.getElementById('app');
bindCommon(app);
// Panneau latéral du grand écran (recherche, récents, favoris) ; masqué par le CSS sur téléphone.
const side = document.getElementById('side');
let sidePanel = renderSide(side);
const wide = matchMedia('(min-width: 900px)');

const ROUTES = {
  '': renderSearch,
  gene: renderGene,
  variant: renderVariant,
  maladie: renderDisease,
  explorer: renderExplore,
  famille: renderFamily,
  rares: renderRares,
  orpha: renderOrpha,
  cancers: renderCancers,
  aide: renderHelp,
  apropos: renderAbout,
  favoris: renderFavs,
  sources: renderSources,
};
const TAB_OF = { '': 'recherche', gene: 'recherche', variant: 'recherche', maladie: 'recherche', explorer: 'explorer', famille: 'explorer', rares: 'explorer', orpha: 'explorer', cancers: 'explorer', favoris: 'favoris', sources: 'sources', aide: 'sources', apropos: 'sources' };

// Chaque page vue dans l'appli est marquée dans l'historique : le bouton Retour sait ainsi
// s'il peut revenir en arrière sans quitter l'appli (arrivée par un lien partagé) et quel onglet allumer.
let firstPage = true;
let lastTab = 'recherche';
// Dernière page vue dans chaque onglet : toucher un onglet y ramène, au lieu de repartir de sa racine.
const tabHash = {};
let pendingTab = null;
// Les fiches gène, variant et maladie gardent l'onglet d'où on les a ouvertes (Explorer, Favoris…).
const FICHES = ['gene', 'variant', 'maladie'];

function route() {
  const [kind = '', ...rest] = location.hash.replace(/^#\/?/, '').split('/');
  const id = rest.join('/');
  // Seules les routes déclarées comptent (pas « __proto__ » ni « constructor » hérités d'Object).
  const view = Object.hasOwn(ROUTES, kind) ? ROUTES[kind] : renderSearch;
  if (!history.state) {
    const tab = pendingTab || (FICHES.includes(kind) && !firstPage ? lastTab : (TAB_OF[kind] || 'recherche'));
    history.replaceState({ inApp: !firstPage, tab }, '');
  }
  pendingTab = null;
  firstPage = false;
  lastTab = history.state.tab || 'recherche';
  tabHash[lastTab] = location.hash || '#/';
  document.querySelectorAll('.tabs a').forEach((a) => {
    const on = a.dataset.tab === lastTab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  // Un lien mal encodé (« %E0%A4%A ») ne doit pas bloquer l'appli : on garde alors le texte brut.
  let arg = id;
  try { arg = decodeURIComponent(id); } catch { /* lien mal formé */ }
  view(app, arg);
  sidePanel.refresh();
  // Sur grand écran, l'accueil n'a pas son propre champ : le curseur va dans celui du panneau.
  if (kind === '' && wide.matches) sidePanel.input.focus();
}

// Libellés fixes de la page (onglets) dans la langue choisie.
function paintStatic() {
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); });
  document.querySelector('.tabs').setAttribute('aria-label', t('Navigation principale'));
  side.setAttribute('aria-label', t('Recherche'));
  document.title = appName();
}

// Toucher un onglet : on revient à la dernière page qu'on y consultait ; toucher l'onglet déjà actif
// ramène à sa page d'accueil (le lien normal).
document.querySelector('.tabs').addEventListener('click', (e) => {
  const link = e.target.closest('a[data-tab]');
  const target = link && tabHash[link.dataset.tab];
  if (!target || link.dataset.tab === lastTab) return;
  e.preventDefault();
  if (target === location.hash) { history.replaceState({ inApp: true, tab: link.dataset.tab }, ''); route(); return; }
  pendingTab = link.dataset.tab;
  location.hash = target;
});

window.addEventListener('hashchange', route);
window.addEventListener('langchange', () => { paintStatic(); sidePanel = renderSide(side); route(); });
window.addEventListener('listschange', () => sidePanel.refresh());
paintStatic();
route();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
