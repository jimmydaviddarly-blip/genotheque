// Appels aux bases publiques. Toutes acceptent les requêtes venues d'un navigateur (vérifié le 2026-11-10).
// Les réponses restent en mémoire le temps de la session, pour ne pas solliciter les serveurs deux fois.

import { getLang } from './i18n.js';
import { splitNotation, pickTranscripts, clinvarCandidates, rsByClinvarId, rsFromVep } from './hgvs.js';

const memo = new Map();

function fetchWithTimeout(url, opts = {}, ms = 20000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

function getJSON(url, opts = {}) {
  const { timeout, ...fetchOpts } = opts;
  const key = url + (opts.body || '');
  if (memo.has(key)) return memo.get(key);
  const p = fetchWithTimeout(url, fetchOpts, timeout).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
  memo.set(key, p);
  p.catch(() => memo.delete(key));
  return p;
}

function graphql(url, query, variables) {
  return getJSON(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
}

// NCBI limite à 3 requêtes par seconde sans clé : on les passe une par une.
let ncbiQueue = Promise.resolve();
function ncbi(url) {
  // Le NCBI demande que chaque appli s'identifie par un nom d'outil (sans donnée sur l'utilisateur).
  const run = ncbiQueue.then(() => getJSON(`${url}&tool=genotheque`));
  ncbiQueue = run.catch(() => {}).then(() => new Promise((r) => setTimeout(r, 360)));
  return run;
}

const MYGENE = 'https://mygene.info/v3';
const MYVARIANT = 'https://myvariant.info/v1';
const OT = 'https://api.platform.opentargets.org/api/v4/graphql';
const GNOMAD = 'https://gnomad.broadinstitute.org/api';
const WD = 'https://www.wikidata.org/w/api.php';
// Identifiants venus d'autres bases, vérifiés avant d'entrer dans une requête.
const isQid = (s) => /^Q\d+$/.test(s);
const isMondo = (s) => /^MONDO_\d+$/.test(s);
const digits = (s) => (/^\d+$/.test(String(s ?? '')) ? String(s) : '');
const lang = () => getLang();

// Lucene : on ne garde que les caractères d'un symbole de gène.
const cleanSymbol = (s) => s.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();

// ---------- Recherche ----------

export async function suggestGenes(text) {
  const s = cleanSymbol(text);
  const words = text.trim().replace(/[^\p{L}\p{N} -]/gu, ' ').trim();
  if (!words) return [];
  const q = !/\s/.test(text.trim()) && s
    ? `symbol:${s}^10 OR symbol:${s}*^3 OR alias:${s} OR name:${s}`
    : words;
  const url = `${MYGENE}/query?q=${encodeURIComponent(q)}&species=human&fields=symbol,name&size=8`;
  const d = await getJSON(url);
  return (d.hits || []).filter((h) => h.symbol).map((h) => ({ symbol: h.symbol, name: h.name || '' }));
}

const normMondo = (v) => (/^\d+$/.test(v) ? `MONDO_${v}` : v.replace(':', '_'));

// Le français passe par Wikidata, qui donne l'identifiant MONDO qu'utilise Open Targets.
async function diseasesFromWikidata(text) {
  const s = await getJSON(`${WD}?action=wbsearchentities&search=${encodeURIComponent(text)}&language=${lang()}&uselang=${lang()}&type=item&limit=10&format=json&origin=*`);
  const ids = (s.search || []).map((x) => x.id).filter(isQid);
  if (!ids.length) return [];
  const e = await getJSON(`${WD}?action=wbgetentities&ids=${ids.join('|')}&props=labels|descriptions|claims&languages=fr|en&format=json&origin=*`);
  return ids.map((id) => e.entities?.[id]).filter(Boolean).flatMap((ent) => {
    const mondo = ent.claims?.P5270?.[0]?.mainsnak?.datavalue?.value;
    if (!mondo) return [];
    return [{
      id: normMondo(mondo),
      name: ent.labels?.[lang()]?.value || ent.labels?.en?.value || mondo,
      detail: ent.descriptions?.[lang()]?.value || '',
    }];
  });
}

async function diseasesFromOpenTargets(text) {
  const d = await graphql(OT, `query($q:String!){ search(queryString:$q, entityNames:["disease"], page:{index:0,size:6}){ hits{ id name } } }`, { q: text });
  return (d.data?.search?.hits || []).map((h) => ({ id: h.id, name: h.name, detail: '' }));
}

export async function suggestDiseases(text) {
  const [fr, en] = await Promise.allSettled([diseasesFromWikidata(text), diseasesFromOpenTargets(text)]);
  const out = [];
  const seen = new Set();
  for (const r of [fr, en]) {
    if (r.status !== 'fulfilled') continue;
    for (const x of r.value) {
      if (seen.has(x.id)) continue;
      seen.add(x.id);
      out.push(x);
    }
  }
  if (fr.status === 'rejected' && en.status === 'rejected') throw fr.reason;
  return out.slice(0, 8);
}

// ---------- Gène ----------

export async function gene(symbol) {
  const s = cleanSymbol(symbol);
  if (!s) return null;
  const fields = 'symbol,name,summary,genomic_pos,entrezgene,ensembl.gene,uniprot.Swiss-Prot,type_of_gene,alias,MIM,HGNC';
  const d = await getJSON(`${MYGENE}/query?q=symbol:${s}&species=human&fields=${fields}&size=1`);
  const h = d.hits?.[0];
  if (!h) return null;
  const pos = Array.isArray(h.genomic_pos) ? h.genomic_pos.find((p) => /^(\d+|X|Y|MT)$/.test(p.chr)) || h.genomic_pos[0] : h.genomic_pos;
  const ens = Array.isArray(h.ensembl) ? h.ensembl[0]?.gene : h.ensembl?.gene;
  const sp = h.uniprot?.['Swiss-Prot'];
  return {
    symbol: h.symbol,
    name: h.name,
    summary: h.summary || '',
    type: h.type_of_gene || '',
    aliases: [].concat(h.alias || []),
    entrez: h.entrezgene,
    ensembl: ens || pos?.ensemblgene || '',
    uniprot: Array.isArray(sp) ? sp[0] : sp || '',
    mim: h.MIM || '',
    pos: pos ? { chr: pos.chr, start: pos.start, end: pos.end } : null,
  };
}

export async function protein(symbol) {
  const s = cleanSymbol(symbol);
  const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(`gene_exact:${s} AND organism_id:9606 AND reviewed:true`)}&fields=accession,protein_name,cc_function,length&size=1`;
  const d = await getJSON(url);
  const r = d.results?.[0];
  if (!r) return null;
  const fn = (r.comments || []).find((c) => c.commentType === 'FUNCTION');
  return {
    name: r.proteinDescription?.recommendedName?.fullName?.value || r.proteinDescription?.submissionNames?.[0]?.fullName?.value || '',
    length: r.sequence?.length,
    func: (fn?.texts?.[0]?.value || '').replace(/\s*\(PubMed:[^)]*\)/g, ''),
  };
}

const CLINVAR_CLASSES = [
  ['pathogenic', 'clinsig_pathogenic'],
  ['likely_pathogenic', 'clinsig_likely_pathogenic'],
  ['uncertain', 'clinsig_vus'],
  ['likely_benign', 'clinsig_likely_benign'],
  ['benign', 'clinsig_benign'],
];

export async function clinvarCounts(symbol) {
  const s = cleanSymbol(symbol);
  const out = {};
  for (const [key, prop] of CLINVAR_CLASSES) {
    const term = `${s}[gene] AND ${prop}[prop]`;
    const d = await ncbi(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${encodeURIComponent(term)}&retmode=json&retmax=0`);
    out[key] = Number(d.esearchresult?.count || 0);
  }
  return out;
}

// Noms français des maladies d'une liste Open Targets, en une seule requête à Wikidata (par l'identifiant MONDO).
// En anglais, ou si Wikidata ne répond pas, la liste reste telle quelle.
export async function withFrenchDiseaseNames(result) {
  if (getLang() !== 'fr') return result;
  const ids = result.rows.map((r) => r.id).filter(isMondo);
  if (!ids.length) return result;
  const query = `SELECT ?m ?l WHERE { VALUES ?m { ${ids.map((id) => `"${id}"`).join(' ')} } ?i wdt:P5270 ?m ; rdfs:label ?l . FILTER(LANG(?l) = "fr") }`;
  try {
    const d = await getJSON(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`);
    const fr = new Map(d.results.bindings.map((b) => [b.m.value, b.l.value]));
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    return { ...result, rows: result.rows.map((r) => (fr.has(r.id) ? { ...r, label: cap(fr.get(r.id)) } : r)) };
  } catch {
    return result;
  }
}

export async function geneDiseases(ensemblId) {
  const d = await graphql(OT, `query($id:String!){ target(ensemblId:$id){ associatedDiseases(page:{index:0,size:12}){ count rows{ score disease{ id name } } } } }`, { id: ensemblId });
  const a = d.data?.target?.associatedDiseases;
  if (!a) return { count: 0, rows: [] };
  return { count: a.count, rows: a.rows.map((r) => ({ id: r.disease.id, name: r.disease.name, score: r.score })) };
}

// Cancers associés à un gène : les 100 premières associations d'Open Targets, gardées si la maladie
// relève de « cancer ou tumeur bénigne » (zone thérapeutique MONDO_0045024).
export async function geneCancers(ensemblId) {
  const d = await graphql(OT, `query($id:String!){ target(ensemblId:$id){ associatedDiseases(page:{index:0,size:100}){ rows{ score disease{ id name therapeuticAreas{ id } } } } } }`, { id: ensemblId });
  const rows = d.data?.target?.associatedDiseases?.rows || [];
  return rows
    .filter((r) => r.disease.therapeuticAreas.some((a) => a.id === 'MONDO_0045024'))
    .map((r) => ({ id: r.disease.id, name: r.disease.name, score: r.score }));
}

// Rôle d'un gène dans la cellule : termes de la Gene Ontology les plus annotés (QuickGO, EMBL-EBI), pour ce
// que fait la protéine, les processus où elle intervient et sa place dans la cellule. Seules les preuves
// expérimentales ou de curation sont gardées (pas les déductions automatiques).
const QUICKGO = 'https://www.ebi.ac.uk/QuickGO/services';
const GO_FILTER = 'taxonId=9606&goEvidence=EXP,IDA,IPI,IMP,IGI,IEP,TAS,IC&qualifier=enables,involved_in,part_of,located_in,is_active_in,contributes_to';
// Termes trop généraux pour apprendre quoi que ce soit (« liaison à une protéine », « noyau »…).
const GO_SKIP = new Set(['GO:0005515', 'GO:0042802', 'GO:0005488', 'GO:0003674', 'GO:0008150', 'GO:0005575', 'GO:0110165', 'GO:0032991', 'GO:0019899']);
export async function geneOntology(uniprot) {
  if (!/^[A-Z0-9]{6,10}$/.test(uniprot || '')) return null;
  const ask = async (aspect) => {
    const d = await getJSON(`${QUICKGO}/annotation/stats?geneProductId=${encodeURIComponent(uniprot)}&aspect=${aspect}&${GO_FILTER}`);
    const values = d?.results?.[0]?.types?.find((x) => x.type === 'goId')?.values || [];
    return values
      .filter((v) => /^GO:[0-9]{7}$/.test(v.key) && typeof v.name === 'string' && v.name && !GO_SKIP.has(v.key))
      .map((v) => ({ id: v.key, name: v.name, hits: Number(v.hits) || 0 }))
      .sort((a, b) => b.hits - a.hits);
  };
  const [process, func, place] = await Promise.all([ask('biological_process'), ask('molecular_function'), ask('cellular_component')]);
  const go = { process: process.slice(0, 6), func: func.slice(0, 5), place: place.slice(0, 5) };
  return go.process.length || go.func.length || go.place.length ? go : null;
}

// ---------- Notation d'une mutation : retrouver le numéro rs ----------

const VARIANT_VALIDATOR = 'https://rest.variantvalidator.org/VariantValidator/variantvalidator/GRCh38';
const ENSEMBL = 'https://rest.ensembl.org';
const NLM_VARIANTS = 'https://clinicaltables.nlm.nih.gov/api/variants/v4/search';

// Variations de ClinVar dont le nom contient ce texte (au plus six).
const clinvarSearch = async (terms) => clinvarCandidates(await getJSON(`${NLM_VARIANTS}?terms=${encodeURIComponent(String(terms).trim())}&maxList=6`));

// Numéro rs que ClinVar associe à chaque variation (une seule requête au NCBI pour toutes).
async function clinvarRs(ids) {
  const sures = ids.filter((id) => /^[0-9]+$/.test(id));
  if (!sures.length) return new Map();
  try {
    return rsByClinvarId(await ncbi(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=${sures.join(',')}&retmode=json`));
  } catch {
    return new Map();
  }
}

// Repli : Ensembl VEP lit une notation avec transcrit et donne les numéros rs connus. Il est parfois lent
// (jusqu'à 30 s) et lit une duplication comme une insertion ailleurs : d'où le passage par ClinVar d'abord.
async function vepRs(hgvs) {
  try {
    return rsFromVep(await getJSON(`${ENSEMBL}/vep/human/hgvs/${encodeURIComponent(hgvs)}?content-type=application/json`, { timeout: 40000 }));
  } catch {
    return null; // notation refusée par Ensembl, service muet ou trop lent
  }
}

// Notation tapée -> variants possibles avec leur numéro rs.
//  - accession (NM_007294.4:c.68_69del) : lue telle quelle ;
//  - gène + c. (BRCA1 c.68_69del) : VariantValidator choisit le transcrit MANE Select ;
//  - sinon, ou si cela ne donne rien : candidats ClinVar (au plus six).
// Le numéro rs vient de ClinVar quand la variation y est, sinon d'Ensembl.
// Renvoie { mode: 'direct' | 'candidats', results: [{ hgvs, gene, protein, rs: [...], verified, effect }] }.
export async function resolveNotation(text) {
  const { kind, gene, description } = splitNotation(text);
  let found = [];
  let mode = 'candidats';
  if (kind === 'accession') {
    found = [{ hgvs: description, gene: '', protein: '' }];
    mode = 'direct';
  } else if (kind === 'gene' && /^c\./i.test(description)) {
    try {
      found = pickTranscripts(await getJSON(`${VARIANT_VALIDATOR}/${encodeURIComponent(`${gene}:${description}`)}/mane_select?content-type=application/json`));
    } catch { /* repli sur les candidats ClinVar */ }
    if (found.length) mode = 'direct';
  }
  if (mode === 'direct') {
    // ClinVar connaît-il exactement ce variant ? Une recherche sur la description normalisée.
    await Promise.all(found.map(async (f) => {
      const exact = (await clinvarSearch(f.hgvs).catch(() => [])).find((c) => c.hgvs === f.hgvs);
      if (exact) { f.clinvarId = exact.id; f.protein = f.protein || exact.protein; }
    }));
  } else {
    found = await clinvarSearch(text);
  }
  found = found.slice(0, 6);
  const rsMap = await clinvarRs(found.map((f) => f.clinvarId || f.id).filter(Boolean));
  const results = [];
  await Promise.all(found.map(async (f, i) => {
    const fromClinvar = rsMap.get(f.clinvarId || f.id);
    if (fromClinvar) { results[i] = { ...f, rs: [fromClinvar], verified: true, effect: '' }; return; }
    const vep = await vepRs(f.hgvs);
    if (vep) results[i] = { ...f, gene: f.gene || vep.gene, rs: vep.rs, verified: true, effect: vep.effect };
    else if (mode === 'direct' && kind !== 'accession') results[i] = { ...f, rs: [], verified: false, effect: '' }; // notation validée par VariantValidator
  }));
  return { mode, results: results.filter(Boolean) };
}

// ---------- Variant ----------

export async function variant(rsid) {
  const fields = 'dbsnp.rsid,dbsnp.alleles,dbsnp.gene,dbsnp.ref,dbsnp.alt,dbsnp.chrom,dbsnp.hg19,dbsnp.vartype,clinvar.rcv.clinical_significance,clinvar.rcv.review_status,clinvar.rcv.conditions.name,clinvar.gene,cadd.consequence,cadd.phred,dbnsfp.alphamissense.score,dbnsfp.revel.score,snpeff.ann.effect,snpeff.ann.genename';
  // dbNSFP donne un score par transcrit : on garde le plus élevé.
  const top = (v) => { const a = [].concat(v ?? []).filter((x) => typeof x === 'number'); return a.length ? Math.max(...a) : null; };
  const d = await getJSON(`${MYVARIANT}/query?q=${encodeURIComponent(rsid)}&fields=${fields}&size=10`);
  return (d.hits || []).map((h) => {
    const genes = [].concat(h.dbsnp?.gene || []).map((g) => g.symbol).filter(Boolean);
    const ann = [].concat(h.snpeff?.ann || [])[0];
    return {
      ref: h.dbsnp?.ref || '',
      alt: h.dbsnp?.alt || '',
      // Fréquences de chaque allèle dans les projets de populations publiés par dbSNP.
      alleles: [].concat(h.dbsnp?.alleles || []).filter((a) => a && typeof a.allele === 'string').map((a) => ({ allele: a.allele, freq: a.freq || {} })),
      chrom: h.dbsnp?.chrom || '',
      type: h.dbsnp?.vartype || '',
      genes: genes.length ? genes : [h.clinvar?.gene?.symbol || ann?.genename].filter(Boolean),
      effect: ann?.effect || '',
      scores: {
        alphamissense: top(h.dbnsfp?.alphamissense?.score),
        revel: top(h.dbnsfp?.revel?.score),
        cadd: top(h.cadd?.phred),
      },
      clinvar: [].concat(h.clinvar?.rcv || []).map((r) => ({
        sig: r.clinical_significance || '',
        review: r.review_status || '',
        cond: [].concat(r.conditions || []).map((c) => c.name).filter(Boolean).join(', '),
      })),
    };
  });
}

export async function gnomadFreq(rsid) {
  const q = `query($rs:String!){ variant(rsid:$rs, dataset: gnomad_r4){ variant_id ref alt genome{ ac an populations{ id ac an } } exome{ ac an populations{ id ac an } } } }`;
  const d = await graphql(GNOMAD, q, { rs: rsid });
  const v = d.data?.variant;
  if (!v) return { error: d.errors?.[0]?.message || 'absent' };
  return v;
}

export async function gwas(rsid) {
  const d = await getJSON(`https://www.ebi.ac.uk/gwas/rest/api/v2/associations?rs_id=${encodeURIComponent(rsid)}&size=40&sort=p_value&direction=asc`);
  const rows = (d._embedded?.associations || []).map((a) => ({
    trait: a.efo_traits?.[0]?.efo_trait || a.reported_trait?.[0] || '',
    mantissa: a.pvalue_mantissa,
    exponent: a.pvalue_exponent,
    allele: a.snp_allele?.[0]?.effect_allele || '',
    pubmed: a.pubmed_id,
    author: a.first_author,
  }));
  return { total: d.page?.totalElements || rows.length, rows };
}

// ---------- Maladie ----------

export async function disease(id) {
  const d = await graphql(OT, `query($id:String!){ disease(efoId:$id){ id name description synonyms{ relation terms } dbXRefs associatedTargets(page:{index:0,size:12}){ count rows{ score target{ approvedSymbol approvedName } } } } }`, { id });
  const x = d.data?.disease;
  if (!x) return null;
  const xref = (prefix) => digits((x.dbXRefs || []).find((r) => r.startsWith(prefix + ':'))?.slice(prefix.length + 1));
  return {
    id: x.id,
    name: x.name,
    description: x.description || '',
    orphanet: xref('Orphanet'),
    omim: xref('OMIM'),
    targets: {
      count: x.associatedTargets?.count || 0,
      rows: (x.associatedTargets?.rows || []).map((r) => ({ symbol: r.target.approvedSymbol, name: r.target.approvedName, score: r.score })),
    },
  };
}

// Nom et description en français, cherchés dans Wikidata par l'identifiant MONDO,
// puis Orphanet, puis OMIM : Wikidata ne porte pas toujours le premier.
export async function diseaseFr(d) {
  const tries = [
    isMondo(d.id) && `P5270=${d.id}`,
    digits(d.orphanet) && `P1550=${d.orphanet}`,
    digits(d.omim) && `P492=${d.omim}`,
  ].filter(Boolean);
  for (const t of tries) {
    const s = await getJSON(`${WD}?action=query&list=search&srsearch=${encodeURIComponent(`haswbstatement:${t}`)}&srlimit=1&format=json&origin=*`);
    const qid = s.query?.search?.[0]?.title;
    if (!isQid(qid)) continue;
    const e = await getJSON(`${WD}?action=wbgetentities&ids=${qid}&props=labels|descriptions|claims&languages=fr&format=json&origin=*`);
    const ent = e.entities?.[qid];
    if (!ent?.labels?.fr) continue;
    return {
      qid,
      name: ent.labels.fr.value,
      detail: ent.descriptions?.fr?.value || '',
      orphanet: digits(ent.claims?.P1550?.[0]?.mainsnak?.datavalue?.value),
    };
  }
  return null;
}

// Code Orphanet -> identifiant MONDO (pour ouvrir l'analyse Open Targets d'une maladie rare).
export async function orphaToMondo(code) {
  if (!digits(code)) return '';
  const s = await getJSON(`${WD}?action=query&list=search&srsearch=${encodeURIComponent(`haswbstatement:P1550=${code}`)}&srlimit=1&format=json&origin=*`);
  const qid = s.query?.search?.[0]?.title;
  if (!isQid(qid)) return '';
  const e = await getJSON(`${WD}?action=wbgetentities&ids=${qid}&props=claims&format=json&origin=*`);
  const v = e.entities?.[qid]?.claims?.P5270?.[0]?.mainsnak?.datavalue?.value || '';
  const mondo = v && normMondo(v);
  return isMondo(mondo) ? mondo : '';
}

// ---------- Médicaments et essais cliniques ----------

// Phases d'Open Targets, de la plus avancée à la moins avancée.
const STAGES = ['APPROVAL', 'PHASE_4', 'PREAPPROVAL', 'PHASE_3', 'PHASE_2_3', 'PHASE_2', 'PHASE_1_2', 'PHASE_1', 'EARLY_PHASE_1', 'IND'];
const stageRank = (s) => { const i = STAGES.indexOf(s); return i < 0 ? STAGES.length : i; };

function drugRows(block) {
  const rows = (block?.rows || []).filter((r) => r.drug).map((r) => ({
    id: r.drug.id,
    name: r.drug.name,
    stage: r.maxClinicalStage || '',
    mechanism: r.drug.mechanismsOfAction?.rows?.[0]?.mechanismOfAction || '',
  }));
  // Un même médicament peut revenir plusieurs fois : on garde sa phase la plus avancée.
  const best = new Map();
  for (const r of rows) if (!best.has(r.id) || stageRank(r.stage) < stageRank(best.get(r.id).stage)) best.set(r.id, r);
  return [...best.values()].sort((a, b) => stageRank(a.stage) - stageRank(b.stage) || a.name.localeCompare(b.name));
}

const DRUG_FIELDS = 'count rows{ maxClinicalStage drug{ id name mechanismsOfAction{ rows{ mechanismOfAction } } } }';

export async function diseaseDrugs(id) {
  const d = await graphql(OT, `query($id:String!){ disease(efoId:$id){ drugAndClinicalCandidates{ ${DRUG_FIELDS} } } }`, { id });
  return drugRows(d.data?.disease?.drugAndClinicalCandidates);
}

export async function targetDrugs(ensemblId) {
  const d = await graphql(OT, `query($id:String!){ target(ensemblId:$id){ drugAndClinicalCandidates{ ${DRUG_FIELDS} } } }`, { id: ensemblId });
  return drugRows(d.data?.target?.drugAndClinicalCandidates);
}

// Essais qui recrutent en ce moment (ClinicalTrials.gov), dans le monde et en France.
export async function trials(condition) {
  const base = 'https://clinicaltrials.gov/api/v2/studies?filter.overallStatus=RECRUITING&countTotal=true&fields=NCTId,BriefTitle,Phase';
  const cond = `&query.cond=${encodeURIComponent(condition)}`;
  const [world, fr] = await Promise.all([
    getJSON(`${base}${cond}&pageSize=5`),
    getJSON(`${base}${cond}&query.locn=France&pageSize=5`),
  ]);
  const map = (d) => (d.studies || []).map((s) => ({
    id: s.protocolSection?.identificationModule?.nctId,
    title: s.protocolSection?.identificationModule?.briefTitle || '',
    phases: s.protocolSection?.designModule?.phases || [],
  })).filter((s) => s.id);
  return { total: world.totalCount || 0, france: fr.totalCount || 0, franceList: map(fr), worldList: map(world) };
}

// ---------- Expression dans les tissus (GTEx v8) ----------

const GTEX = 'https://gtexportal.org/api/v2';

export async function tissueExpression(symbol) {
  const s = cleanSymbol(symbol);
  const ref = await getJSON(`${GTEX}/reference/gene?geneId=${encodeURIComponent(s)}`);
  const gene = (ref.data || []).find((g) => g.geneSymbolUpper === s) || ref.data?.[0];
  if (!gene) return null;
  const d = await getJSON(`${GTEX}/expression/medianGeneExpression?gencodeId=${encodeURIComponent(gene.gencodeId)}&datasetId=gtex_v8`);
  return (d.data || []).map((x) => ({ tissue: x.tissueSiteDetailId, tpm: x.median }));
}

// ---------- Résumé Wikipédia en français ----------

// Titre de l'article Wikipédia dans la langue de l'interface (frwiki ou enwiki).
async function wikidataFrTitle(qid) {
  if (!isQid(qid)) return { title: '', claims: {} };
  const site = `${lang()}wiki`;
  const e = await getJSON(`${WD}?action=wbgetentities&ids=${qid}&props=sitelinks|claims&sitefilter=${site}&format=json&origin=*`);
  const ent = e.entities?.[qid];
  return { title: ent?.sitelinks?.[site]?.title || '', claims: ent?.claims || {} };
}

async function frSummary(title) {
  const s = await getJSON(`https://${lang()}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
  if (!s.extract || s.type === 'disambiguation') return null;
  return { title: s.title, extract: s.extract, url: s.content_urls?.mobile?.page || s.content_urls?.desktop?.page || '' };
}

// Un gène a rarement son propre article : on essaie l'élément Wikidata du gène, puis celui de sa protéine.
export async function geneWiki(entrez) {
  if (!entrez) return null;
  const s = await getJSON(`${WD}?action=query&list=search&srsearch=${encodeURIComponent(`haswbstatement:P351=${entrez}`)}&srlimit=1&format=json&origin=*`);
  const qid = s.query?.search?.[0]?.title;
  if (!qid) return null;
  const g = await wikidataFrTitle(qid);
  if (g.title) return frSummary(g.title);
  const protein = g.claims.P688?.[0]?.mainsnak?.datavalue?.value?.id;
  if (!protein) return null;
  const p = await wikidataFrTitle(protein);
  return p.title ? frSummary(p.title) : null;
}

export async function diseaseWiki(qid) {
  if (!qid) return null;
  const d = await wikidataFrTitle(qid);
  return d.title ? frSummary(d.title) : null;
}

// ---------- Structure 3D prédite (AlphaFold) ----------

export async function alphafold(uniprot) {
  if (!uniprot) return null;
  const d = await getJSON(`https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(uniprot)}`);
  const m = d?.[0];
  // Le modèle n'est téléchargé que depuis le site d'AlphaFold, en https.
  const pdb = /^https:\/\/alphafold\.ebi\.ac\.uk\//.test(m?.pdbUrl || '') ? m.pdbUrl : '';
  return pdb ? { pdb, confidence: m.globalMetricValue, length: m.sequence?.length } : null;
}

// ---------- Données embarquées : médicaments en France (BDPM) et pharmacogénétique (CPIC) ----------

const local = (path) => getJSON(`./data/${path}`);
export const bdpm = () => local('bdpm.json');
export const cpic = () => local('cpic.json');

// ---------- Symptômes (Human Phenotype Ontology, via l'API du Jackson Laboratory) ----------

// L'API attend un identifiant Orphanet ou OMIM : « ORPHA:586 », « OMIM:219700 ».
export async function symptoms({ orphanet, omim }) {
  const ids = [digits(orphanet) && `ORPHA:${orphanet}`, digits(omim) && `OMIM:${omim}`].filter(Boolean);
  for (const id of ids) {
    try {
      const d = await getJSON(`https://ontology.jax.org/api/network/annotation/${id}`);
      if (d.categories && Object.keys(d.categories).length) return { id, categories: d.categories };
    } catch { /* identifiant inconnu de HPO : on essaie le suivant */ }
  }
  return null;
}
export const hpoFr = () => local('hpo_fr.json');

// ---------- Liens gène-maladie évalués par des experts (ClinGen, embarqué) ----------

export const clingen = () => local('clingen.json');
export const figures = () => local('chiffres.json');

// ---------- Partenaires de la protéine (STRING) ----------

export async function partners(symbol) {
  const s = cleanSymbol(symbol);
  const d = await getJSON(`https://string-db.org/api/json/interaction_partners?identifiers=${encodeURIComponent(s)}&species=9606&limit=10&caller_identity=genotheque`);
  return (Array.isArray(d) ? d : []).map((p) => ({ symbol: p.preferredName_B, score: p.score })).filter((p) => p.symbol && p.symbol !== s);
}

// ---------- Voies biologiques (Reactome) ----------

export async function pathways(uniprot) {
  if (!uniprot) return [];
  const d = await getJSON(`https://reactome.org/ContentService/data/mapping/UniProt/${encodeURIComponent(uniprot)}/pathways?species=9606`);
  return (Array.isArray(d) ? d : []).map((p) => ({ id: p.stId, name: p.displayName, disease: p.isInDisease }));
}
