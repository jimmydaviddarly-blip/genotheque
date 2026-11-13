// Notation d'une mutation (HGVS) : lire ce que la personne a tapé, et lire les réponses des services qui
// la convertissent en numéro rs. Fonctions pures, sans réseau : les appels sont dans api.js, les tests
// dans tests/hgvs.test.js (avec de vraies réponses enregistrées dans tests/fixtures).

// Une notation est « complète » quand elle dit ce qui change : c.68_69del, c.743G>A, c.5266dup,
// p.Cys61Gly, p.Arg175His. On n'interroge les services qu'à ce moment-là, pas à chaque lettre tapée.
const CHANGE_C = /(del|dup|ins|inv|delins)|[ACGT]>[ACGT]|=/i;
export function isCompleteNotation(text) {
  const q = String(text || '').trim();
  const cdna = q.match(/[cgmnr]\.\s*[\d*_+\-()?]+(.*)$/i);
  if (cdna && CHANGE_C.test(cdna[1])) return true;
  return /p\.\s*\(?[A-Za-z]{3}\d+(?:[A-Za-z]{3}|=|\*|fs|ext)/i.test(q);
}

// Découpe la saisie : « NM_007294.4:c.68_69del » (accession), « BRCA1 c.68_69del » ou « BRCA1:c.68_69del »
// (gène), « c.5266dupC » (rien devant).
export function splitNotation(text) {
  const q = String(text || '').trim().replace(/\s+/g, ' ');
  if (/^(NM|NR|XM|XR|NC|NG)_\d+(\.\d+)?:\s*[cgmnrp]\./i.test(q) || /^ENS[TP]\d+(\.\d+)?:\s*[cgmnrp]\./i.test(q)) {
    return { kind: 'accession', description: q.replace(/:\s+/, ':') };
  }
  const gene = q.match(/^([A-Za-z][A-Za-z0-9-]{1,14})\s*[: ]\s*([cgmnrp]\..+)$/);
  if (gene) return { kind: 'gene', gene: gene[1].toUpperCase(), description: gene[2].replace(/\s+/g, '') };
  const nu = q.match(/^([cgmnrp]\..+)$/i);
  if (nu) return { kind: 'bare', description: nu[1].replace(/\s+/g, '') };
  return { kind: 'none', description: q };
}

// Réponse de VariantValidator : la clé de l'objet est la description normalisée sur le transcrit choisi
// (« NM_007294.4:c.68_69del »). Une notation invalide donne seulement un « flag: warning ».
export function pickTranscripts(vv) {
  if (!vv || typeof vv !== 'object') return [];
  return Object.entries(vv)
    .filter(([key, v]) => /^N[MR]_\d+\.\d+:[cn]\./.test(key) && v && typeof v === 'object')
    .map(([key, v]) => ({
      hgvs: key,
      gene: typeof v.gene_symbol === 'string' ? v.gene_symbol : '',
      protein: typeof v.hgvs_predicted_protein_consequence?.tlr === 'string' ? v.hgvs_predicted_protein_consequence.tlr : '',
    }));
}

// Un nom de variation ClinVar, tel que le publie NLM Clinical Tables :
// « NM_007294.4(BRCA1):c.68_69del (p.Glu23fs) » -> { hgvs: 'NM_007294.4:c.68_69del', gene: 'BRCA1', protein: 'p.Glu23fs' }
export function parseClinvarName(name) {
  const m = String(name || '').match(/^(N[MR]_\d+\.\d+)\(([A-Za-z0-9-]+)\):([cn]\.[^\s]+)(?:\s+\((p\.[^)]+)\))?/);
  return m ? { hgvs: `${m[1]}:${m[3]}`, gene: m[2], protein: m[4] || '' } : null;
}

// NLM Clinical Tables : [total, identifiants, champs en plus, [[identifiant ClinVar, nom], ...]]
// -> [{ id, hgvs, gene, protein }]
export function clinvarCandidates(nlm) {
  const rows = Array.isArray(nlm?.[3]) ? nlm[3] : [];
  return rows.map((r) => {
    const p = parseClinvarName(r?.[1]);
    return p && /^\d+$/.test(String(r[0])) ? { id: String(r[0]), ...p } : null;
  }).filter(Boolean);
}

// NCBI esummary (db=clinvar) : Map de l'identifiant ClinVar vers son numéro rs, lu dans les références
// croisées dbSNP de la variation. ClinVar est la source la plus sûre : il note lui-même le numéro rs.
export function rsByClinvarId(esummary) {
  const map = new Map();
  const result = esummary?.result;
  for (const id of Array.isArray(result?.uids) ? result.uids : []) {
    const refs = (result[id]?.variation_set || []).flatMap((v) => (Array.isArray(v?.variation_xrefs) ? v.variation_xrefs : []));
    const dbsnp = refs.find((x) => x?.db_source === 'dbSNP' && /^[0-9]+$/.test(String(x.db_id)));
    if (dbsnp) map.set(String(id), `rs${dbsnp.db_id}`);
  }
  return map;
}

// Réponse d'Ensembl VEP : les numéros rs d'une notation (les autres identifiants, COSV… ou CM…, sont ignorés).
export function rsFromVep(vep) {
  const first = Array.isArray(vep) ? vep[0] : null;
  if (!first) return { rs: [], gene: '', effect: '' };
  const rs = [...new Set((first.colocated_variants || []).map((c) => c && c.id).filter((id) => /^rs\d+$/.test(id || '')))];
  const gene = (first.transcript_consequences || []).find((t) => t.gene_symbol)?.gene_symbol || '';
  return { rs, gene, effect: typeof first.most_severe_consequence === 'string' ? first.most_severe_consequence : '' };
}
