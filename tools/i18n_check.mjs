// Liste les textes français de l'interface qui n'ont pas encore de traduction anglaise dans src/i18n-en.js.
// Usage : `npm run i18n` (ajouter --all pour lister aussi les textes déjà traduits).
// On relève : les appels t('…'), puis les chaînes françaises des fichiers de données passées à t() à l'affichage.
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const CODE = ['views.js', 'explore.js', 'texts.js', 'explore-data.js', 'main.js'];
const DATA = ['texts.js', 'explore-data.js', 'views.js'];

const unquote = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"');
const keys = new Set();

for (const f of CODE) {
  const src = await readFile(join(SRC, f), 'utf8');
  for (const m of src.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) keys.add(unquote(m[1]));
  for (const m of src.matchAll(/\bplural\([^,]+,\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\)/g)) { keys.add(unquote(m[1])); keys.add(unquote(m[2])); }
  for (const m of src.matchAll(/\bsection\('[^']*',\s*(?:isEn\(\) \? '((?:[^'\\]|\\.)*)' : )?'((?:[^'\\]|\\.)*)',\s*[^,]*,\s*'((?:[^'\\]|\\.)*)'\)/g)) {
    [m[1], m[2], m[3]].filter(Boolean).forEach((k) => keys.add(unquote(k)));
  }
}

// Chaînes françaises des données : au moins une lettre accentuée ou un espace, pas de HTML, de lien ni de motif.
const looksFrench = (s) => /[a-zà-ÿ]/i.test(s) && (/[àâçéèêëîïôûùüÿœ]/i.test(s) || / /.test(s))
  && !/[<>{}$]|https?:|^\s|\\d|\.json|^[A-Z0-9_ -]+$/.test(s);
for (const f of DATA) {
  const src = await readFile(join(SRC, f), 'utf8');
  for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) {
    const s = unquote(m[1]);
    if (looksFrench(s)) keys.add(s);
  }
}

const { EN } = await import(`file:///${join(SRC, 'i18n-en.js').replace(/\\/g, '/')}`);
const all = process.argv.includes('--all');
const missing = [...keys].filter((k) => all || EN[k] === undefined).sort((a, b) => a.localeCompare(b, 'fr'));
console.log(missing.map((k) => JSON.stringify(k)).join('\n'));
console.error(`${keys.size} textes relevés, ${[...keys].filter((k) => EN[k] === undefined).length} sans traduction.`);
