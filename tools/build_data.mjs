// Prépare les données fixes de la vitrine (onglet Explorer), embarquées dans l'appli :
// - Orphanet : les classifications des maladies rares, noms en français, gènes associés (CC BY 4.0).
// - HGNC : les familles de gènes retenues, avec leurs sous-familles et leurs gènes.
// Usage : `npm run data`. Les fichiers téléchargés restent dans tools/cache (non publiés).

import { mkdir, readFile, writeFile, access, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drugKey } from '../src/drugkey.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = join(ROOT, 'tools', 'cache');
const OUT = join(ROOT, 'public', 'data');

const ORPHADATA = 'https://www.orphadata.com/data/xml';
const HGNC = 'https://storage.googleapis.com/public-download-files/hgnc';

// Familles HGNC montrées dans la vitrine (identifiants vérifiés le 2026-11-11).
const FAMILIES = [3432, 2054, 177, 752, 516, 26, 348, 471, 862, 864, 639, 475];

// Retente un téléchargement (les serveurs des bases répondent parfois 500 ou 503 un instant), avec une pause
// de plus en plus longue : 5 s, 15 s, 45 s.
async function fetchRetry(url, options) {
  let derniere;
  for (const pause of [0, 5000, 15000, 45000]) {
    if (pause) await new Promise((r) => setTimeout(r, pause));
    try {
      const res = await fetch(url, options);
      if (res.ok || (res.status < 500 && res.status !== 429)) return res;
      derniere = new Error(`${url} : HTTP ${res.status}`);
    } catch (err) {
      derniere = err;
    }
    console.log(`nouvelle tentative pour ${url} (${derniere.message})`);
  }
  throw derniere;
}

async function cached(name, url) {
  const file = join(CACHE, name);
  try {
    await access(file);
  } catch {
    console.log(`téléchargement ${url}`);
    const res = await fetchRetry(url);
    if (!res.ok) throw new Error(`${url} : HTTP ${res.status}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(file, 'utf8');
}

const unxml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

// ---------- Orphanet ----------

// Arbre d'une classification : chaque nœud est [code, enfants?].
function parseClassification(xml) {
  const name = xml.match(/<Classification id="\d+">\s*<OrphaNumber>\d+<\/OrphaNumber>\s*<Name lang="en">([^<]*)<\/Name>/)?.[1] || '';
  const re = /<ClassificationNode>|<\/ClassificationNode>|<OrphaCode>(\d+)<\/OrphaCode>/g;
  const top = { children: [] };
  const stack = [top];
  let m;
  while ((m = re.exec(xml))) {
    if (m[0] === '<ClassificationNode>') {
      const node = { code: 0, children: [] };
      stack.at(-1).children.push(node);
      stack.push(node);
    } else if (m[0] === '</ClassificationNode>') {
      stack.pop();
    } else if (stack.length > 1 && !stack.at(-1).code) {
      stack.at(-1).code = Number(m[1]);
    }
  }
  const pack = (n) => (n.children.length ? [n.code, n.children.map(pack)] : [n.code]);
  return { name: unxml(name), roots: top.children.map(pack) };
}

function countCodes(node, set) {
  set.add(node[0]);
  (node[1] || []).forEach((c) => countCodes(c, set));
  return set;
}

async function buildOrphanet() {
  const page = await (await fetchRetry('https://www.orphadata.com/classifications/')).text();
  const ids = [...new Set([...page.matchAll(/en_product3_(\d+)\.xml/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);
  if (!ids.length) throw new Error('aucune classification trouvée sur orphadata.com');

  const fr = await cached('fr_product1.xml', `${ORPHADATA}/fr_product1.xml`);
  const fiches = {};
  for (const chunk of fr.split('<Disorder id=').slice(1)) {
    const code = chunk.match(/<OrphaCode>(\d+)<\/OrphaCode>/)?.[1];
    const name = chunk.match(/<Name lang="fr">([^<]*)<\/Name>/)?.[1];
    if (!code || !name) continue;
    const type = chunk.match(/<DisorderType id="\d+">\s*<Name lang="fr">([^<]*)<\/Name>/)?.[1] || '';
    const omim = chunk.match(/<Source>OMIM<\/Source>\s*<Reference>(\d+)<\/Reference>/)?.[1] || '';
    fiches[code] = [unxml(name), unxml(type).replace(/\s+/g, ' '), omim, []];
  }

  // Nom anglais officiel, en 5e position, pour l'interface en anglais.
  const en = await cached('en_product1.xml', `${ORPHADATA}/en_product1.xml`);
  for (const chunk of en.split('<Disorder id=').slice(1)) {
    const code = chunk.match(/<OrphaCode>(\d+)<\/OrphaCode>/)?.[1];
    const name = chunk.match(/<Name lang="en">([^<]*)<\/Name>/)?.[1];
    if (fiches[code] && name) fiches[code][4] = unxml(name);
  }

  const genesXml = await cached('en_product6.xml', `${ORPHADATA}/en_product6.xml`);
  for (const chunk of genesXml.split('<Disorder id=').slice(1)) {
    const code = chunk.match(/<OrphaCode>(\d+)<\/OrphaCode>/)?.[1];
    if (!fiches[code]) continue;
    // [symbole, 1 si le gène cause la maladie, 0 s'il la modifie, y prédispose ou n'est qu'étudié]
    const seen = new Map();
    for (const a of chunk.split('<DisorderGeneAssociation>').slice(1)) {
      const sym = a.match(/<Symbol>([^<]+)<\/Symbol>/)?.[1];
      if (!sym) continue;
      const type = a.match(/<DisorderGeneAssociationType id="\d+">\s*<Name lang="en">([^<]*)<\/Name>/)?.[1] || '';
      const causal = /^Disease-causing/i.test(type) ? 1 : 0;
      seen.set(sym, Math.max(seen.get(sym) || 0, causal));
    }
    fiches[code][3] = [...seen].sort((a, b) => b[1] - a[1]);
  }

  await mkdir(join(OUT, 'orpha'), { recursive: true });
  const index = [];
  for (const id of ids) {
    const c = parseClassification(await cached(`en_product3_${id}.xml`, `${ORPHADATA}/en_product3_${id}.xml`));
    if (!c.roots.length) continue;
    const codes = new Set();
    c.roots.forEach((r) => countCodes(r, codes));
    const root = c.roots[0][0];
    index.push({ id, root, name: fiches[root]?.[0] || c.name, count: codes.size - 1 });
    await writeFile(join(OUT, 'orpha', `c${id}.json`), JSON.stringify(c.roots));
  }
  index.sort((a, b) => b.count - a.count);
  await writeFile(join(OUT, 'orpha', 'index.json'), JSON.stringify(index));
  await writeFile(join(OUT, 'orpha', 'fiches.json'), JSON.stringify(fiches));
  console.log(`Orphanet : ${index.length} classifications, ${Object.keys(fiches).length} fiches`);
}

// ---------- HGNC ----------

async function buildFamilies() {
  // Noms français des familles et sous-familles, traduits une fois pour toutes (tools/hgnc_familles_fr.json).
  const frNames = JSON.parse(await readFile(join(ROOT, 'tools', 'hgnc_familles_fr.json'), 'utf8'));
  const family = parseCsv(await cached('family.csv', `${HGNC}/csv/csv/genefamily_db_tables/family.csv`));
  const hierarchy = parseCsv(await cached('hierarchy.csv', `${HGNC}/csv/csv/genefamily_db_tables/hierarchy.csv`));
  const members = parseCsv(await cached('gene_has_family.csv', `${HGNC}/csv/csv/genefamily_db_tables/gene_has_family.csv`));
  const complete = await cached('hgnc_complete_set.txt', `${HGNC}/tsv/tsv/hgnc_complete_set.txt`);

  const [head, ...lines] = complete.split('\n');
  const cols = head.split('\t');
  const iId = cols.indexOf('hgnc_id');
  const iSym = cols.indexOf('symbol');
  const iName = cols.indexOf('name');
  const iStatus = cols.indexOf('status');
  const genes = new Map();
  for (const line of lines) {
    const f = line.split('\t');
    if (f[iStatus] !== 'Approved') continue;
    genes.set(f[iId].replace('HGNC:', ''), [f[iSym], f[iName]]);
  }

  const names = new Map(family.map((r) => [r.id, r.name]));
  const kids = new Map();
  for (const r of hierarchy) {
    if (!kids.has(r.parent_fam_id)) kids.set(r.parent_fam_id, []);
    kids.get(r.parent_fam_id).push(r.child_fam_id);
  }
  const direct = new Map();
  for (const r of members) {
    const g = genes.get(r.hgnc_id);
    if (!g) continue;
    if (!direct.has(r.family_id)) direct.set(r.family_id, []);
    direct.get(r.family_id).push(g);
  }

  // Nœud : { id, name, count (gènes de tout le sous-arbre), genes (membres directs), children }.
  const build = (id, seen = new Set()) => {
    seen.add(id);
    const children = (kids.get(id) || []).filter((c) => !seen.has(c)).map((c) => build(c, seen))
      .sort((a, b) => b.count - a.count);
    const own = (direct.get(id) || []).sort((a, b) => a[0].localeCompare(b[0]));
    const all = new Set(own.map((g) => g[0]));
    const collect = (n) => { n.genes.forEach((g) => all.add(g[0])); n.children.forEach(collect); };
    children.forEach(collect);
    return { id: Number(id), name: names.get(id) || '', fr: frNames[id] || '', count: all.size, genes: own, children };
  };

  await mkdir(join(OUT, 'familles'), { recursive: true });
  const index = [];
  for (const id of FAMILIES) {
    const tree = build(String(id));
    await writeFile(join(OUT, 'familles', `f${id}.json`), JSON.stringify(tree));
    index.push({ id, name: tree.name, count: tree.count });
    console.log(`HGNC ${id} ${tree.name} : ${tree.count} gènes`);
  }
  await writeFile(join(OUT, 'familles', 'index.json'), JSON.stringify(index));
}

// ---------- Dictionnaire des noms de gènes (aide à la saisie) ----------

// Chaque entrée : [symbole officiel, nom, autres noms et anciens symboles séparés par « | »].
// Les pseudogènes (copies inactives, très rarement cherchées) sont écartés pour alléger le fichier.
async function buildDictionary() {
  const complete = await cached('hgnc_complete_set.txt', `${HGNC}/tsv/tsv/hgnc_complete_set.txt`);
  const [head, ...lines] = complete.split('\n');
  const col = Object.fromEntries(head.split('\t').map((h, i) => [h, i]));
  const clean = (s) => (s || '').replace(/"/g, '');
  const entries = [];
  for (const line of lines) {
    const f = line.split('\t');
    if (f[col.status] !== 'Approved' || f[col.locus_group] === 'pseudogene') continue;
    const others = [clean(f[col.alias_symbol]), clean(f[col.prev_symbol])].filter(Boolean).join('|');
    entries.push([f[col.symbol], clean(f[col.name]).slice(0, 80), others]);
  }
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  await writeFile(join(OUT, 'dictionnaire.json'), JSON.stringify(entries));
  console.log(`Dictionnaire : ${entries.length} gènes`);
}

// ---------- Médicaments vendus en France (BDPM, ANSM) ----------

async function buildBdpm() {
  const latin = async (name) => {
    const file = join(CACHE, name);
    try { await access(file); } catch {
      const res = await fetchRetry(`https://base-donnees-publique.medicaments.gouv.fr/download/file/${name}`, { headers: { 'user-agent': 'Mozilla/5.0' } });
      if (!res.ok) throw new Error(`${name} : HTTP ${res.status}`);
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
    }
    return new TextDecoder('windows-1252').decode(await readFile(file));
  };
  // Spécialités commercialisées : CIS -> nom de marque (avant le premier chiffre ou la première virgule).
  const brands = new Map();
  for (const line of (await latin('CIS_bdpm.txt')).split(/\r?\n/)) {
    const f = line.split('\t');
    if (f.length < 7 || f[6] !== 'Commercialisée') continue;
    const brand = f[1].split(',')[0].replace(/\s+\d.*$/, '').trim();
    if (brand) brands.set(f[0], brand);
  }
  // Substances actives -> marques, en écartant l'homéopathie.
  const bySub = new Map();
  for (const line of (await latin('CIS_COMPO_bdpm.txt')).split(/\r?\n/)) {
    const f = line.split('\t');
    if (f.length < 7 || f[6] !== 'SA' || /HOM[ÉE]OPATHIQUE/i.test(f[3])) continue;
    const brand = brands.get(f[0]);
    const key = drugKey(f[3]);
    if (!brand || key.length < 4) continue;
    if (!bySub.has(key)) bySub.set(key, new Map());
    if (!bySub.get(key).has(brand)) bySub.get(key).set(brand, Number(f[0]));
  }
  // Les marques qui ne reprennent pas le nom de la substance (princeps) passent devant les génériques.
  const subs = {};
  for (const [key, m] of bySub) {
    subs[key] = [...m].sort(([a], [b]) => (drugKey(a) === key) - (drugKey(b) === key) || a.localeCompare(b, 'fr'));
  }
  // La date affichée est celle du téléchargement des fichiers, pas celle de la construction.
  const date = (await stat(join(CACHE, 'CIS_bdpm.txt'))).mtime.toISOString().slice(0, 10);
  await writeFile(join(OUT, 'bdpm.json'), JSON.stringify({ date, subs }));
  console.log(`BDPM : ${Object.keys(subs).length} substances, ${brands.size} spécialités commercialisées`);
}

// ---------- Pharmacogénétique (CPIC, domaine public CC0) ----------

async function buildCpic() {
  const url = 'https://api.cpicpgx.org/v1/pair_view?select=genesymbol,drugname,cpiclevel,guidelinename,guidelineurl&cpiclevel=in.(A,B)';
  const res = await fetchRetry(url);
  if (!res.ok) throw new Error(`CPIC : HTTP ${res.status}`);
  const genes = {};
  for (const p of await res.json()) {
    (genes[p.genesymbol] ||= []).push([p.drugname, p.cpiclevel, p.guidelinename || '', p.guidelineurl || '']);
  }
  for (const list of Object.values(genes)) list.sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
  await writeFile(join(OUT, 'cpic.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), genes }));
  console.log(`CPIC : ${Object.keys(genes).length} gènes`);
}

// ---------- Symptômes en français (traductions officielles de la Human Phenotype Ontology) ----------

async function buildHpoFr() {
  const tsv = await cached('hp-fr.babelon.tsv', 'https://github.com/obophenotype/hpo-translations/raw/main/babelon/hp-fr.babelon.tsv');
  const labels = {};
  for (const line of tsv.split('\n').slice(1)) {
    const f = line.split('\t');
    if (f[3] === 'rdfs:label' && f[6] && f[5] !== 'CANDIDATE') labels[f[0].replace('HP:', '')] = f[6].trim();
  }
  await writeFile(join(OUT, 'hpo_fr.json'), JSON.stringify(labels));
  console.log(`HPO : ${Object.keys(labels).length} symptômes traduits`);
}

// ---------- Liens gène-maladie évalués par des experts (ClinGen, domaine public CC0) ----------

async function buildClinGen() {
  const res = await fetchRetry('https://search.clinicalgenome.org/kb/gene-validity/download', { headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`ClinGen : HTTP ${res.status}`);
  const text = await res.text();
  const date = text.match(/FILE CREATED: (\d{4}-\d{2}-\d{2})/)?.[1] || new Date().toISOString().slice(0, 10);
  // Les en-têtes et lignes de séparation (« +++ ») précèdent les données.
  const rows = parseCsv(text.split('\n').filter((l) => !l.startsWith('"+++')).slice(3).join('\n'));
  // Chaque évaluation n'est stockée qu'une fois : [gène, maladie, MONDO, transmission, classement] ;
  // byGene et byMondo n'en gardent que les positions.
  const entries = [];
  const byGene = {};
  const byMondo = {};
  for (const r of rows) {
    const gene = r['GENE SYMBOL'];
    const mondo = (r['DISEASE ID (MONDO)'] || '').replace(':', '_');
    if (!gene || !r.CLASSIFICATION) continue;
    const i = entries.push([gene, r['DISEASE LABEL'], mondo, r.MOI, r.CLASSIFICATION]) - 1;
    (byGene[gene] ||= []).push(i);
    if (mondo) (byMondo[mondo] ||= []).push(i);
  }
  await writeFile(join(OUT, 'clingen.json'), JSON.stringify({ date, entries, byGene, byMondo }));
  console.log(`ClinGen : ${rows.length} évaluations, ${Object.keys(byGene).length} gènes`);
}

await mkdir(CACHE, { recursive: true });
const echecs = [];
for (const [nom, construire] of [['HPO', buildHpoFr], ['ClinGen', buildClinGen], ['CPIC', buildCpic], ['Médicaments (BDPM)', buildBdpm],
  ['Dictionnaire HGNC', buildDictionary], ['Familles de gènes', buildFamilies], ['Orphanet', buildOrphanet]]) {
  try {
    await construire();
  } catch (err) {
    console.error(`ÉCHEC ${nom} : ${err.message}. Le fichier précédent est gardé.`);
    echecs.push(nom);
  }
}
await buildFigures();
if (echecs.length) {
  console.error(`Sources non mises à jour : ${echecs.join(', ')}`);
  process.exitCode = 2;
}

// Chiffres clés de l'accueil, comptés dans les fichiers qui viennent d'être produits.
async function buildFigures() {
  const read = async (p) => JSON.parse(await readFile(join(OUT, p), 'utf8'));
  const figures = {
    genes: (await read('dictionnaire.json')).length,
    rares: Object.keys(await read('orpha/fiches.json')).length,
    symptoms: Object.keys(await read('hpo_fr.json')).length,
    clingen: (await read('clingen.json')).entries.length,
    drugs: Object.keys((await read('bdpm.json')).subs).length,
    // Versions des données embarquées, affichées dans « À propos » (Orphanet et la HPO demandent
    // la version ou la date des données partout où elles sont montrées).
    versions: {
      orphanet: (await readFile(join(CACHE, 'fr_product1.xml'), 'utf8')).slice(0, 600).match(/<JDBOR date="(\d{4}-\d{2}-\d{2})/)?.[1] || '',
      hpoFr: (await stat(join(CACHE, 'hp-fr.babelon.tsv'))).mtime.toISOString().slice(0, 10),
      hgnc: (await stat(join(CACHE, 'hgnc_complete_set.txt')).catch(() => null))?.mtime.toISOString().slice(0, 10) || '',
      clingen: (await read('clingen.json')).date,
      cpic: (await read('cpic.json')).date,
      bdpm: (await read('bdpm.json')).date,
    },
  };
  await writeFile(join(OUT, 'chiffres.json'), JSON.stringify(figures));
  console.log('Chiffres clés :', figures);
}
