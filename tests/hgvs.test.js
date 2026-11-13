// Lecture de la notation d'une mutation et des réponses des services (réponses réelles enregistrées).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isCompleteNotation, splitNotation, pickTranscripts, parseClinvarName, clinvarCandidates, rsByClinvarId, rsFromVep } from '../src/hgvs.js';

const fixture = (nom) => JSON.parse(readFileSync(new URL(`./fixtures/${nom}`, import.meta.url), 'utf8'));

test('une notation est complète quand elle dit ce qui change', () => {
  for (const q of ['c.68_69del', 'BRCA1 c.68_69del', 'TP53:c.743G>A', 'c.5266dupC', 'c.5266dup', 'c.100_101insA', 'p.Cys61Gly',
    'p.(Arg175His)', 'p.Glu23fs', 'p.Gln1756*', 'NM_007294.4:c.68_69del', 'g.43124028_43124029del']) {
    assert.ok(isCompleteNotation(q), `devrait être complète : ${q}`);
  }
});

test('une notation en cours de frappe n\'est pas encore interrogée', () => {
  for (const q of ['c.', 'c.6', 'c.68_', 'BRCA1 c.68', 'p.', 'p.Cys', 'p.Cys6', 'brca1', 'rs429358', 'cancer', 'NM_007294.4:c.']) {
    assert.ok(!isCompleteNotation(q), `ne devrait pas être complète : ${q}`);
  }
});

test('la saisie est découpée selon ce qui la précède', () => {
  assert.deepEqual(splitNotation('NM_007294.4:c.68_69del'), { kind: 'accession', description: 'NM_007294.4:c.68_69del' });
  assert.deepEqual(splitNotation('ENST00000357654.9:c.68_69del'), { kind: 'accession', description: 'ENST00000357654.9:c.68_69del' });
  assert.deepEqual(splitNotation('brca1 c.68_69del'), { kind: 'gene', gene: 'BRCA1', description: 'c.68_69del' });
  assert.deepEqual(splitNotation('TP53:c.743G>A'), { kind: 'gene', gene: 'TP53', description: 'c.743G>A' });
  assert.deepEqual(splitNotation('c.5266dupC'), { kind: 'bare', description: 'c.5266dupC' });
  assert.equal(splitNotation('mucoviscidose').kind, 'none');
});

test('VariantValidator : le transcrit choisi, le gène et la protéine sont lus', () => {
  const [t] = pickTranscripts(fixture('vv_brca1_ok.json'));
  assert.equal(t.hgvs, 'NM_007294.4:c.68_69del');
  assert.equal(t.gene, 'BRCA1');
  assert.match(t.protein, /^NP_009225\.1:p\./);
});

test('VariantValidator : une notation invalide ne donne aucun transcrit', () => {
  assert.deepEqual(pickTranscripts(fixture('vv_invalide.json')), []);
  assert.deepEqual(pickTranscripts(null), []);
  assert.deepEqual(pickTranscripts('erreur'), []);
});

test('un nom de variation ClinVar est décomposé', () => {
  assert.deepEqual(parseClinvarName('NM_007294.4(BRCA1):c.68_69del (p.Glu23fs)'),
    { hgvs: 'NM_007294.4:c.68_69del', gene: 'BRCA1', protein: 'p.Glu23fs' });
  assert.deepEqual(parseClinvarName('NM_007294.4(BRCA1):c.5266dup (p.Gln1756fs)').hgvs, 'NM_007294.4:c.5266dup');
  assert.deepEqual(parseClinvarName('NM_000546.6(TP53):c.743G>A (p.Arg248Gln)').gene, 'TP53');
  assert.equal(parseClinvarName('NC_000017.11:g.43124028_43124029del'), null);
  assert.equal(parseClinvarName(''), null);
});

test('NLM Clinical Tables : les candidats sans gène sont tous lisibles', () => {
  const noms = fixture('nlm_c5266dup.json')[3].map((x) => x[1]);
  const lus = noms.map(parseClinvarName).filter(Boolean);
  assert.ok(lus.length >= 1);
  assert.ok(lus.every((x) => x.gene === 'BRCA1' && x.hgvs.startsWith('NM_007294.4:c.')));
});

test('Ensembl VEP : le numéro rs est extrait, avec le gène et l\'effet', () => {
  assert.deepEqual(rsFromVep(fixture('vep_brca1_rs.json')), { rs: ['rs80357914'], gene: 'BRCA1', effect: 'frameshift_variant' });
});

test('Ensembl VEP : les autres identifiants (CM, COSV) sont ignorés', () => {
  const r = rsFromVep(fixture('vep_tp53_plusieurs_ids.json'));
  assert.deepEqual(r.rs, ['rs11540652']);
  assert.equal(r.gene, 'TP53');
});

test('Ensembl VEP : une notation valide sans numéro rs donne une liste vide', () => {
  const r = rsFromVep(fixture('vep_sans_rs.json'));
  assert.deepEqual(r.rs, []);
  assert.equal(r.effect, 'frameshift_variant');
});

test('Ensembl VEP : une réponse vide ou inattendue ne casse rien', () => {
  assert.deepEqual(rsFromVep([]), { rs: [], gene: '', effect: '' });
  assert.deepEqual(rsFromVep(null), { rs: [], gene: '', effect: '' });
  assert.deepEqual(rsFromVep({ error: 'x' }), { rs: [], gene: '', effect: '' });
});

test("NLM : les candidats portent l'identifiant ClinVar", () => {
  const c = clinvarCandidates(fixture('nlm_c5266dup.json'));
  assert.ok(c.length >= 1);
  assert.ok(c.every((x) => /^[0-9]+$/.test(x.id) && x.hgvs.includes(':c.') && x.gene === 'BRCA1'));
  assert.deepEqual(clinvarCandidates(null), []);
  assert.deepEqual(clinvarCandidates([0, [], null, [['abc', 'NM_007294.4(BRCA1):c.68_69del']]]), [], 'un identifiant non numérique est refusé');
});

test("NCBI : le numéro rs vient de ClinVar, y compris pour une duplication", () => {
  const m = rsByClinvarId(fixture('esummary_clinvar_rs.json'));
  assert.equal(m.get('17677'), 'rs80357906', 'c.5266dup, que VEP lit comme une insertion ailleurs');
  assert.equal(m.get('17662'), 'rs80357914', 'c.68_69del, que MyVariant ne connaît pas');
  assert.equal(m.get('55526'), 'rs80357751');
});

test("NCBI : une réponse vide ou inattendue ne casse rien", () => {
  assert.equal(rsByClinvarId({ result: { uids: [] } }).size, 0);
  assert.equal(rsByClinvarId(null).size, 0);
  assert.equal(rsByClinvarId({ result: {} }).size, 0);
  assert.equal(rsByClinvarId({ result: { uids: ['5'], 5: { variation_set: [{ variation_xrefs: [{ db_source: 'dbSNP', db_id: 'abc' }] }] } } }).size, 0);
  assert.equal(rsByClinvarId({ result: { uids: ['5'], 5: { variation_set: [{ variation_xrefs: [{ db_source: 'OMIM', db_id: '123' }, { db_source: 'dbSNP', db_id: '456' }] }] } } }).get('5'), 'rs456');
});
