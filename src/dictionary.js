// Aide à l'écriture d'un nom de gène, à partir du dictionnaire HGNC embarqué (public/data/dictionnaire.json) :
// symbole officiel, autres noms (HER2 pour ERBB2), anciens symboles, mots du nom, et fautes de frappe.

let ready = null;

// Lettre doublée oubliée ou ajoutée (ERB2 pour ERBB2) : on compare aussi les noms sans lettres répétées.
const single = (s) => s.replace(/(.)\1+/g, '$1');

// Majuscules, sans espaces, tirets, points ni soulignés : « her-2 » et « HER2 » se valent.
const norm = (s) => s.toUpperCase().replace(/[\s\-._]/g, '');

function load() {
  if (!ready) {
    ready = fetch('./data/dictionnaire.json').then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    }).then((entries) => {
      const keys = []; // [clé normalisée, index de l'entrée, nom tel qu'écrit, symbole officiel ?, clé sans lettres répétées]
      entries.forEach(([sym, , others], i) => {
        keys.push([norm(sym), i, sym, true]);
        if (others) for (const o of others.split('|')) keys.push([norm(o), i, o, false]);
      });
      for (const k of keys) k.push(single(k[0]));
      return { entries, keys, lowerNames: entries.map((e) => e[1].toLowerCase()) };
    });
    ready.catch(() => { ready = null; });
  }
  return ready;
}

export const preloadDictionary = () => load().then((d) => { loaded = d; }).catch(() => {});

// Distance de Damerau-Levenshtein, arrêtée au-delà de max. Deux lettres inversées (EGRF pour EGFR),
// la faute la plus courante, ne comptent que pour une demi-faute.
function distance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  // Raccourci : sans aucune lettre commune aux deux premières places, inutile de calculer.
  if (a[0] !== b[0] && a[0] !== b[1] && a[1] !== b[0] && a[1] !== b[1]) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 0.5);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

// Complétion dans le champ : le symbole officiel le plus court qui commence par la saisie
// (ERB donne ERBB2, BRC donne BRCA1). Rien tant que le dictionnaire n'est pas chargé,
// rien si la saisie est déjà un symbole complet. Synchrone, pour suivre chaque frappe.
let loaded = null;
export function completion(text) {
  if (!loaded) {
    load().then((d) => { loaded = d; }).catch(() => {});
    return null;
  }
  const q = text.trim().toUpperCase();
  if (q.length < 2 || /[^A-Z0-9-]/.test(q)) return null;
  let best = null;
  for (const [sym] of loaded.entries) {
    const s = sym.toUpperCase();
    if (s === q) return null;
    if (s.startsWith(q) && (!best || sym.length < best.length || (sym.length === best.length && sym < best))) best = sym;
  }
  return best;
}

// Renvoie au plus `limit` suggestions : { symbol, name, via (autre nom reconnu), typo (faute corrigée) }.
export async function suggest(text, limit = 8) {
  const { entries, keys, lowerNames } = await load();
  const q = norm(text);
  if (!q) return [];
  const best = new Map(); // index -> { rank, via, typo }
  const add = (i, rank, via = null, typo = false) => {
    const cur = best.get(i);
    if (!cur || rank < cur.rank) best.set(i, { rank, via, typo });
  };

  const typed = text.trim().toUpperCase();
  for (const [k, i, raw, official] of keys) {
    // À égalité, l'autre nom écrit exactement comme la saisie (HER2 plutôt que HER-2) l'emporte.
    if (k === q) add(i, official ? 0 : raw.toUpperCase() === typed ? 0.9 : 1, official ? null : raw);
    else if (k.startsWith(q)) add(i, (official ? 2 : 3) + (k.length - q.length) / 100, official ? null : raw);
  }

  // Mots du nom anglais : « insulin », « breast cancer ».
  const words = text.toLowerCase().trim();
  if (words.length >= 3) {
    lowerNames.forEach((n, i) => {
      const at = n.indexOf(words);
      if (at === 0 || (at > 0 && /[\s(,-]/.test(n[at - 1]))) add(i, 4 + n.length / 1000);
    });
  }

  // Fautes de frappe, seulement si rien de mieux n'a été trouvé.
  if (best.size < limit && q.length >= 3) {
    const max = q.length >= 6 ? 2 : 1;
    const qs = single(q);
    for (const [k, i, raw, official, ks] of keys) {
      if (k !== q && ks === qs) add(i, 5.4 + (official ? 0 : 0.5), official ? null : raw, true);
      const d = distance(q, k, max);
      // Une faute sur un symbole officiel est plus probable qu'une faute sur un ancien nom peu connu.
      // À distance égale, on préfère un nom de même longueur que la saisie et qui garde sa première lettre
      // (on se trompe rarement sur celle-là).
      if (d <= max) {
        add(i, 5 + d + (official ? 0 : 0.5) + 0.2 * Math.abs(k.length - q.length) + (k[0] === q[0] ? 0 : 0.3),
          official ? null : raw, true);
      }
    }
  }

  return [...best].sort((a, b) => a[1].rank - b[1].rank || entries[a[0]][0].length - entries[b[0]][0].length
    || entries[a[0]][0].localeCompare(entries[b[0]][0]))
    .slice(0, limit)
    .map(([i, m]) => ({ symbol: entries[i][0], name: entries[i][1], via: m.via, typo: m.typo }));
}
