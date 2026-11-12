// Produit public/THIRD_PARTY_NOTICES.txt : textes de licence des bibliothèques et polices livrées
// avec le site (la licence BSD de 3Dmol et l'OFL des polices demandent de les joindre).
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PARTS = [
  ['3Dmol.js (affichage des protéines en 3D)', 'node_modules/3dmol/LICENSE', 'node_modules/3dmol/package.json'],
  ['Inter (police)', 'node_modules/@fontsource-variable/inter/LICENSE', 'node_modules/@fontsource-variable/inter/package.json'],
  ['Plus Jakarta Sans (police)', 'node_modules/@fontsource-variable/plus-jakarta-sans/LICENSE', 'node_modules/@fontsource-variable/plus-jakarta-sans/package.json'],
];

let out = 'Génothèque : composants tiers livrés avec le site / third-party components shipped with the site\n';
for (const [name, lic, pkg] of PARTS) {
  const { version, license } = JSON.parse(await readFile(join(ROOT, pkg), 'utf8'));
  out += `\n${'='.repeat(78)}\n${name}, version ${version}, licence ${license}\n${'='.repeat(78)}\n\n`;
  out += (await readFile(join(ROOT, lic), 'utf8')).replace(/\r\n/g, '\n').trim() + '\n';
}
await writeFile(join(ROOT, 'public/THIRD_PARTY_NOTICES.txt'), out);
console.log(`THIRD_PARTY_NOTICES.txt : ${PARTS.length} composants`);
