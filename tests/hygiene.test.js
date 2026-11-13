// Contrôles sur le dépôt lui-même : les erreurs bêtes qui ne se voient pas à l'écran.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const racine = new URL('../', import.meta.url);
const lire = (p) => readFileSync(new URL(p, racine), 'utf8');
const fichiers = (dossier, ext) => readdirSync(new URL(dossier, racine)).filter((f) => ext.some((e) => f.endsWith(e))).map((f) => `${dossier}${f}`);

test('aucun caractère de contrôle caché dans le code', () => {
  // Un « \b » mal transmis devient le caractère n° 8 et fait taire une expression régulière sans erreur.
  const interdits = [];
  for (const f of [...fichiers('src/', ['.js', '.css']), ...fichiers('tools/', ['.mjs']), 'index.html', 'vite.config.js', 'public/sw.js']) {
    const s = lire(f);
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c < 32 && c !== 9 && c !== 10 && c !== 13) { interdits.push(`${f} : caractère ${c} à la position ${i}`); break; }
    }
  }
  assert.deepEqual(interdits, []);
});

test('la licence est cohérente partout', () => {
  assert.match(lire('LICENSE'), /GNU AFFERO GENERAL PUBLIC LICENSE\s+Version 3/);
  assert.equal(JSON.parse(lire('package.json')).license, 'AGPL-3.0-or-later');
  for (const f of ['src/about.js', 'src/views.js', 'src/i18n-en.js', 'README.md', 'DATA_LICENSES.md', 'CONTRIBUTING.md']) {
    assert.doesNotMatch(lire(f), /licence MIT|MIT licen[cs]e|MIT-licensed/i, `${f} parle encore de MIT`);
  }
});

test('le numéro de version est dans le CHANGELOG', () => {
  const { version } = JSON.parse(lire('package.json'));
  assert.ok(lire('CHANGELOG.md').includes(`## ${version} ·`), `CHANGELOG sans entrée ${version}`);
});

test('le cache du service worker a un nom valide', () => {
  assert.match(lire('public/sw.js'), /const CACHE = 'genotheque-v\d+';/);
});

test('la politique de sécurité du contenu n\'ouvre pas de porte', () => {
  const conf = lire('vite.config.js');
  assert.doesNotMatch(conf, /unsafe-eval/, 'jamais unsafe-eval');
  assert.match(conf, /object-src 'none'/);
  assert.match(conf, /script-src 'self'"/);
});

test('les identifiants externes passent par encodeURIComponent dans les liens', () => {
  // Les adresses construites avec une donnée venue d'une API doivent l'encoder.
  const v = lire('src/views.js');
  assert.doesNotMatch(v, /href="https:\/\/[^"]*\$\{(g|d|r|p|s)\.(entrez|ensembl|uniprot|mim|id|omim)\}/, 'identifiant externe non encodé dans un lien');
});
