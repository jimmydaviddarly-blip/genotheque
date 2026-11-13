import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Numéro de version affiché dans Infos, lu dans package.json.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Seules les bases consultées par l'appli peuvent être jointes, et aucun script venu d'ailleurs ne s'exécute.
const APIS = [
  'https://mygene.info', 'https://myvariant.info', 'https://api.platform.opentargets.org', 'https://gnomad.broadinstitute.org',
  'https://www.wikidata.org', 'https://query.wikidata.org', 'https://fr.wikipedia.org', 'https://en.wikipedia.org',
  'https://eutils.ncbi.nlm.nih.gov', 'https://rest.uniprot.org', 'https://www.ebi.ac.uk', 'https://alphafold.ebi.ac.uk',
  'https://clinicaltrials.gov', 'https://gtexportal.org', 'https://ontology.jax.org', 'https://string-db.org', 'https://reactome.org',
  // Notation d'une mutation : conversion en numéro rs.
  'https://rest.variantvalidator.org', 'https://rest.ensembl.org', 'https://clinicaltables.nlm.nih.gov',
];

function csp(dev) {
  return [
    "default-src 'self'",
    "script-src 'self'",
    // Les styles posés par le code (positions, couleurs calculées) passent par l'attribut style.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    // Vite intègre les plus petits morceaux de police directement dans la feuille de style.
    "font-src 'self' data:",
    // En développement, Vite recharge la page par une connexion ws.
    `connect-src 'self' ${APIS.join(' ')}${dev ? ' ws: wss:' : ''}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

// Thème choisi dans l'appli : chaque règle « sombre » s'applique si le téléphone est en sombre
// et que l'utilisateur n'a pas choisi le clair, ou dès qu'il a choisi le sombre (data-theme sur <html>).
const themeChoice = {
  postcssPlugin: 'theme-choice',
  AtRule: {
    media(at) {
      if (at.params.replace(/\s/g, '') !== '(prefers-color-scheme:dark)' || at.__done) return;
      at.__done = true;
      const forced = [];
      at.walkRules((rule) => {
        const sel = (prefix) => rule.selectors.map((s) => (s.startsWith(':root') ? s.replace(':root', `:root${prefix}`) : `:root${prefix} ${s}`));
        forced.push(rule.clone({ selectors: sel('[data-theme="dark"]') }));
        rule.selectors = sel(':not([data-theme="light"])');
      });
      at.after(forced);
    },
  },
};

export default defineConfig(({ command }) => ({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  css: { postcss: { plugins: [themeChoice] } },
  server: { port: 5180, strictPort: true, host: true },
  plugins: [{
    name: 'csp',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp(command === 'serve') }, injectTo: 'head-prepend' }],
  }],
}));
