// Icône de l'appli, piste A « hélice Verre » (choisie le 2026-11-11), dans tous les formats demandés
// par les systèmes : Android (normale, adaptable, monochrome), iPhone, ordinateurs (manifeste) et favicon.
// Le dessin est défini ici ; public/icon.svg et public/favicon.svg en sont produits.
// Usage : `npm run icons`.
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const pub = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Fond indigo de l'appli, plus clair en haut à gauche (même lumière que les halos de l'accueil).
const BG = `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4255d6"/><stop offset="1" stop-color="#202a8c"/>
    </linearGradient>
  </defs>`;
// Deux brins (sarcelle et blanc) et quatre barreaux, centrés : tout tient dans le cercle de sécurité
// des icônes adaptables d'Android (rayon 40 % de la taille), même sans réduction.
const STRANDS = (w) => `<g fill="none" stroke-linecap="round" stroke-width="${w}">
    <path d="M180 92c0 82 152 82 152 164s-152 82-152 164" stroke="#5eead4"/>
    <path d="M332 92c0 82-152 82-152 164s152 82 152 164" stroke="#ffffff"/>
  </g>`;
// Position du brin de gauche à une hauteur donnée (courbes de Bézier du tracé ci-dessus) ;
// l'autre brin est son symétrique autour de x = 256.
function strandX(y) {
  const [p0, p1, p2, p3] = y <= 256 ? [[180, 92], [180, 174], [332, 174], [332, 256]] : [[332, 256], [332, 338], [180, 338], [180, 420]];
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const tm = (lo + hi) / 2;
    const yt = (1 - tm) ** 3 * p0[1] + 3 * (1 - tm) ** 2 * tm * p1[1] + 3 * (1 - tm) * tm ** 2 * p2[1] + tm ** 3 * p3[1];
    if (yt < y) lo = tm; else hi = tm;
  }
  const t = lo;
  return (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t ** 2 * p2[0] + t ** 3 * p3[0];
}
// Barreaux d'un brin à l'autre, dessinés derrière les brins, là où l'hélice est assez large.
const RUNGS = (color) => `<g stroke="${color}" stroke-width="16" stroke-linecap="round">
    ${[118, 226, 286, 394].map((y) => {
      const x = strandX(y);
      const [a, b] = [Math.min(x, 512 - x), Math.max(x, 512 - x)];
      return `<path d="M${a.toFixed(1)} ${y}H${b.toFixed(1)}"/>`;
    }).join('')}
  </g>`;
const svg = (body, { rx = 0, bg = true } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  ${bg ? `${BG}<rect width="512" height="512"${rx ? ` rx="${rx}"` : ''} fill="url(#bg)"/>` : ''}
  ${body}
</svg>
`;

// Grand format : barreaux visibles. Petit format (onglet, barre des tâches) : brins plus épais, sans barreaux.
const FULL = RUNGS('#c7d0ff') + STRANDS(34);
const SMALL = STRANDS(52);
const MONO = `${RUNGS('#fff')}<g fill="none" stroke="#fff" stroke-linecap="round" stroke-width="34">
    <path d="M180 92c0 82 152 82 152 164s-152 82-152 164"/><path d="M332 92c0 82-152 82-152 164s152 82 152 164"/>
  </g>`;

const png = (src, size, file) => sharp(Buffer.from(src), { density: 384 }).resize(size, size).png().toFile(join(pub, file));

// SVG publics : icône du manifeste (coins arrondis) et favicon vectoriel des navigateurs récents.
await writeFile(join(pub, 'icon.svg'), svg(FULL, { rx: 112 }));
await writeFile(join(pub, 'favicon.svg'), svg(SMALL, { rx: 112 }));

const jobs = [
  // « any » : forme arrondie, coins transparents (Windows, Mac, Linux, Chrome OS).
  [svg(FULL, { rx: 112 }), 192, 'icon-192.png'],
  [svg(FULL, { rx: 112 }), 512, 'icon-512.png'],
  // « maskable » : carré plein, le système découpe sa propre forme (rond, goutte, carré arrondi).
  [svg(FULL), 192, 'icon-maskable-192.png'],
  [svg(FULL), 512, 'icon-maskable-512.png'],
  // « monochrome » : silhouette blanche sur fond transparent, teintée par Android (icônes à thème).
  [svg(MONO, { bg: false }), 512, 'icon-monochrome-512.png'],
  // iPhone et iPad : carré plein, iOS arrondit lui-même.
  [svg(FULL), 180, 'apple-touch-icon.png'],
];
for (const [src, size, file] of jobs) {
  await png(src, size, file);
  console.log(file, size);
}

// favicon.ico (anciens navigateurs, raccourcis Windows) : trois tailles en PNG dans un seul fichier.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => sharp(Buffer.from(svg(SMALL, { rx: 112 })), { density: 384 }).resize(s, s).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
images.forEach((img, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(sizes[i], e);
  header.writeUInt8(sizes[i], e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(img.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += img.length;
});
await writeFile(join(pub, 'favicon.ico'), Buffer.concat([header, ...images]));
console.log('favicon.ico', sizes.join(', '));
