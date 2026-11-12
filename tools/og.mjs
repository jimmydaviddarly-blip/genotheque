// Image d'aperçu des liens partagés (LinkedIn, messageries), piste A « hélice et chiffres ».
// Compose une page 1200 × 630 avec les polices et couleurs de l'appli, puis la photographie avec
// Microsoft Edge sans fenêtre. Produit public/og-image-fr.png et public/og-image-en.png.
// Usage : npm run og (après npm run data, pour des chiffres à jour).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WORK = join(ROOT, 'tools', 'cache', 'og');
const EDGE = process.env.EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const W = 1200;
const H = 630;

const font = (pkg, file) => pathToFileURL(join(ROOT, 'node_modules/@fontsource-variable', pkg, 'files', file)).href;
const f = JSON.parse(await readFile(join(ROOT, 'public/data/chiffres.json'), 'utf8'));
const nb = (n, loc) => new Intl.NumberFormat(loc).format(n).replace(/\u202F|\u00A0/g, '\u2009');

const TEXT = {
  fr: {
    name: 'Génothèque', loc: 'fr-FR',
    line: 'Les bases publiques de génétique humaine, réunies',
    pills: [[25, 'bases publiques'], [f.genes, 'gènes'], [f.rares, 'maladies rares']],
    side: ['Gratuit · sans compte', 'Français · anglais'],
  },
  en: {
    name: 'Genotheque', loc: 'en-GB',
    line: 'Public human genetics databases, together',
    pills: [[25, 'public databases'], [f.genes, 'genes'], [f.rares, 'rare diseases']],
    side: ['Free · no account', 'English · French'],
  },
};

// Hélice : deux brins sinusoïdaux et des barreaux, comme sur l'accueil de l'appli.
function helix(y0, amp, period) {
  const pts = (sign) => Array.from({ length: W / 5 + 1 }, (_, k) => {
    const x = k * 5;
    return `${k ? 'L' : 'M'}${x} ${(y0 + sign * amp * Math.sin((2 * Math.PI * x) / period)).toFixed(1)}`;
  }).join('');
  const rungs = Array.from({ length: W / 16 }, (_, k) => {
    const x = k * 16 + 8;
    const dy = Math.abs(amp * Math.sin((2 * Math.PI * x) / period));
    return `<line x1="${x}" x2="${x}" y1="${(y0 - dy).toFixed(1)}" y2="${(y0 + dy).toFixed(1)}"/>`;
  }).join('');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="helix" aria-hidden="true">
    <g stroke="rgba(199,208,255,0.22)" stroke-width="2">${rungs}</g>
    <path d="${pts(1)}" fill="none" stroke="#8ea2ff" stroke-width="5" stroke-linecap="round"/>
    <path d="${pts(-1)}" fill="none" stroke="#5eead4" stroke-width="5" stroke-linecap="round"/>
  </svg>`;
}

const page = (tx) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Jakarta; src: url(${font('plus-jakarta-sans', 'plus-jakarta-sans-latin-wght-normal.woff2')}) format('woff2'); font-weight: 200 800; }
@font-face { font-family: Inter; src: url(${font('inter', 'inter-latin-wght-normal.woff2')}) format('woff2'); font-weight: 100 900; }
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
body {
  position: relative; font-family: Inter, sans-serif; color: #fff; background: #0a1022;
  background-image: radial-gradient(60% 75% at 12% 18%, #2a3a9a 0, transparent 70%), radial-gradient(55% 80% at 92% 88%, #3b2a8a 0, transparent 70%);
}
.helix { position: absolute; inset: 0; }
.head { position: absolute; left: 80px; top: 70px; }
h1 { font: 700 104px/1 Jakarta, sans-serif; letter-spacing: -3px; margin: 0; }
.line { font-size: 34px; color: #c7d0ff; margin-top: 18px; letter-spacing: -0.3px; }
.foot { position: absolute; left: 80px; right: 80px; bottom: 64px; display: flex; align-items: flex-end; gap: 18px; }
.pill { background: rgba(255,255,255,0.10); border: 1.5px solid rgba(255,255,255,0.20); border-radius: 22px; padding: 18px 26px 16px; }
.pill b { display: block; font: 700 46px/1 Jakarta, sans-serif; color: #c7d0ff; letter-spacing: -1px; }
.pill span { display: block; font-size: 22px; color: #dfe3ff; margin-top: 8px; }
.side { margin-left: auto; text-align: right; font-size: 24px; line-height: 1.45; color: #dfe3ff; }
</style></head><body>
${helix(372, 34, 150)}
<div class="head"><h1>${tx.name}</h1><div class="line">${tx.line}</div></div>
<div class="foot">
  ${tx.pills.map(([n, l]) => `<div class="pill"><b>${nb(n, tx.loc)}</b><span>${l}</span></div>`).join('')}
  <div class="side">${tx.side.join('<br>')}</div>
</div>
</body></html>`;

await mkdir(WORK, { recursive: true });
for (const [lang, tx] of Object.entries(TEXT)) {
  const html = join(WORK, `og-${lang}.html`);
  await writeFile(html, page(tx));
  const out = join(ROOT, 'public', `og-image-${lang}.png`);
  execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${W},${H}`, '--virtual-time-budget=3000', `--screenshot=${out}`, pathToFileURL(html).href], { stdio: 'ignore' });
  console.log(`og-image-${lang}.png`);
}
