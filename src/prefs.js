// Réglages d'affichage gardés dans le téléphone : thème (auto, clair, sombre) et style de l'Explorer.

const THEMES = ['auto', 'light', 'dark'];
const LOOKS = ['sobre', 'vif'];
const BAR = { light: '#eaf0fb', dark: '#0a1022' };

// Clés préfixées : l'adresse github.io est partagée avec les autres projets du compte.
const PREFIX = 'genotheque-';

function read(key, allowed) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return allowed.includes(v) ? v : allowed[0];
  } catch {
    return allowed[0];
  }
}
function write(key, v) {
  try { localStorage.setItem(PREFIX + key, v); } catch { /* stockage refusé : le choix vaut pour la session */ }
}

export const getTheme = () => read('theme', THEMES);
export const getLook = () => read('look', LOOKS);

export function applyPrefs() {
  const root = document.documentElement;
  const theme = getTheme();
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;
  root.dataset.look = getLook();
  // Couleur de la barre du navigateur : celle du thème choisi, sinon celle du téléphone.
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) {
    const own = m.media.includes('dark') ? 'dark' : 'light';
    m.content = BAR[theme === 'auto' ? own : theme];
  }
}

// Sombre ou clair tel qu'il s'affiche en ce moment (pour le bouton de l'accueil).
export const isDark = () => (getTheme() === 'auto' ? matchMedia('(prefers-color-scheme: dark)').matches : getTheme() === 'dark');

export function setTheme(v) { if (THEMES.includes(v)) { write('theme', v); applyPrefs(); } }
export function setLook(v) { if (LOOKS.includes(v)) { write('look', v); applyPrefs(); } }
