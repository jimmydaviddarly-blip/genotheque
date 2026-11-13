// Passe le cache du service worker au numéro suivant (genotheque-v21 -> genotheque-v22), pour que les
// appareils prennent les nouvelles données. Sert à la mise à jour mensuelle.
import { readFile, writeFile } from 'node:fs/promises';

const fichier = new URL('../public/sw.js', import.meta.url);
const source = await readFile(fichier, 'utf8');
const suivant = source.replace(/genotheque-v(\d+)/, (_, n) => `genotheque-v${Number(n) + 1}`);
if (suivant === source) throw new Error('Nom de cache introuvable dans public/sw.js');
await writeFile(fichier, suivant);
console.log(suivant.match(/genotheque-v\d+/)[0]);
